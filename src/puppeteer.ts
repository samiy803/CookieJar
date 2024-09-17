import puppeteer, { Browser, Page, TimeoutError } from "puppeteer";

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
        headless: true,
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

export async function pulse(page: Page) {
    // Refresh the page. This will keep the session alive
    await page.reload();
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