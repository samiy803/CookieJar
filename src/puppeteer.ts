import puppeteer, { Browser, Page, TimeoutError } from "puppeteer";
import { client } from "./mongodb";
import { ObjectId } from "mongodb";

export const DESIRED_COOKIES = process.env.COOKIE_FILTER?.split(",") || [];

interface Cookie {
    name: string;
    value: string;
    domain: string;
    path: string;
    httpOnly: boolean;
    secure: boolean;
    expires: number;
    size: number;
}

export interface Cookies {
    _id: string;
    createdAt: number;
    lastUpdated: number | null;
    [key: string]: Cookie | number | null | string;
}

export async function startPuppeteer(cookies: Cookies, endpoint?: string) {
    endpoint = endpoint || process.env.DEFAULT_PUPPETEER_ENDPOINT;
    if (!endpoint) {
        throw new Error("No endpoint provided");
    }
    const browser = await puppeteer.launch({
        headless: process.env.NODE_ENV === "production",
        defaultViewport: null,
        args: ["--start-maximized"],
    });
    const page = await browser.newPage();
    await page.setCookie(
        ...Object.keys(cookies)
            .filter((key) => key !== "createdAt" && key !== "lastUpdated" && key !== "_id")
            .map((key) => cookies[key] as Cookie)
    );
    await page.goto(endpoint);
    try {
        await page.waitForNavigation();
    } catch (e) {
        if (e instanceof TimeoutError) {
            console.error("[puppeteer]: Timeout error. Continuing...");
        } else {
            console.error("[puppeteer]: Unknown error. Continuing...");
            console.error(e);
        }
    }
    return {
        browser,
        page,
    }
}

export async function stopPuppeteer(browser: Browser) {
    await browser.close();
}

export async function pulse(page: Page, doc_id: ObjectId) {
    // Refresh the page. This will keep the session alive
    await page.reload();
    const new_cookies = await page.cookies();
    console.log("[puppeteer]: Pulled new cookies");
    const desiredCookies = new_cookies.filter((cookie) => {
        return DESIRED_COOKIES.includes(cookie.name);
    });
    console.log(`[puppeteer]: Found ${desiredCookies.length} desired cookies`);
    console.log(`[puppeteer]: Desired cookies: ${desiredCookies.map((cookie) => cookie.name).join(", ")}`);
    if (desiredCookies.length !== DESIRED_COOKIES.length) {
        console.error("[puppeteer]: Did not find all desired cookies. Exiting...");
        return;
    }
    console.log("[puppeteer]: Found all desired cookies");
    const document = desiredCookies.reduce((acc, cookie) => {
        acc[cookie.name] = cookie;
        acc["lastUpdated"] = Date.now();
        return acc;
    }, {} as { [key: string]: Cookie | number | null });
    console.log("[puppeteer]: Updating cookie in database");
    const db = client.db("prod");
    const collection = db.collection("cookies");
    collection.updateOne({ _id: doc_id }, { $set: document });
    console.log("[puppeteer]: Updated cookie in database");
    try {
        await page.waitForNavigation();
    } catch (e) {
        if (e instanceof TimeoutError) {
            console.error("[puppeteer]: Timeout error. Continuing...");
        } else {
            console.error("[puppeteer]: Unknown error. Continuing...");
            console.error(e);
        }
    }
    // If this doesn't work, try to click some UI elements
}