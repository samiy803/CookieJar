import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import { getClient } from "./mongodb";
import { Cookies, pulse, startPuppeteer } from "./puppeteer";
import { ToadScheduler, SimpleIntervalJob, Task } from 'toad-scheduler';

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;
const client = getClient(process.env.MONGODB_URI);

const DESIRED_COOKIES = process.env.COOKIE_FILTER?.split(",");
if (!DESIRED_COOKIES) {
    console.error("[server]: No desired cookies found. Exiting...");
    process.exit(1);
}

app.locals.activeSessions = new Map();
app.locals.scheduler = new ToadScheduler();

app.use(express.json())

app.post("/add-cookie", (req: Request, res: Response) => {
    console.log("[server]: Received request to add cookie");
    const { cookies } = req.body;
    if (!cookies || !Array.isArray(cookies)) {
        return res.status(400).json({ message: "Invalid input" });
    }

    const desiredCookies = cookies.filter((cookie) => {
        return DESIRED_COOKIES.includes(cookie.name);
    });

    if (desiredCookies.length !== DESIRED_COOKIES.length) {
        console.log(`[server]: Received ${cookies.length} cookies, but did not find the desired cookies`);
        return res.status(400).json({ message: "Invalid input" });
    }
    console.log("[server]: Adding cookie to database");
    const db = client.db("prod");
    const collection = db.collection("cookies");
    const document = desiredCookies.reduce((acc, cookie) => {
        acc[cookie.name] = cookie;
        acc["createdAt"] = Date.now();
        acc["lastUpdated"] = null;
        return acc;
    }, {});
    collection.insertOne(document);
    console.log("[server]: Starting puppeteer instance");
    startPuppeteer(document as unknown as Cookies).then(({ page, browser }) => {
        app.locals.activeSessions.set(document._id, { page, browser });
    });
    console.log("[server]: Added cookie to database and started puppeteer instance");
    console.log("[scheduler]: Adding job to pulse every 5 minutes");
    const task = new Task(`pulse-${document._id}`, async () => {
        const session = app.locals.activeSessions.get(document._id);
        if (!session) {
            console.log("[scheduler]: Session not found. Stopping task.");
            return;
        }
        console.log("[scheduler]: Pulsing session");
        await pulse(session.page);
    });
    const job = new SimpleIntervalJob({ seconds: 300, runImmediately: true }, task);
    app.locals.scheduler.addSimpleIntervalJob(job);
    return res.status(200).json({ message: "Success" });
});


app.listen(port, async () => {
    console.log(`[server]: Server is running at http://localhost:${port}`);

    console.log("[mongodb]: Connecting to MongoDB...");
    await client.connect();
    console.log("[mongodb]: Connected to MongoDB");

    // Pull the database into memory, and start a puppeteer instance for each data point
    // Will only work for small data (e.g. 100 rows)
    const db = client.db("prod");
    const collection = db.collection("cookies");
    const cursor = collection.find();
    const count = await collection.countDocuments();
    console.log(`[mongodb]: Found ${count} documents.`);
    const documents = await cursor.toArray();
    if (documents.length === 0) {
        console.log("[mongodb]: No documents found. Waiting for requests...");
        return;
    }
    console.log("[puppeteer]: Starting puppeteer instances...");
    let i = 0;
    for (const document of documents) {
        for (const cookie of DESIRED_COOKIES) {
            if (!document[cookie]) {
                console.log("[puppeteer]: Skipping document without necessary cookies");
                console.log(document);
                continue;
            }
        }
        const { page, browser } = await startPuppeteer(document as unknown as Cookies);
        app.locals.activeSessions.set(document._id, { page, browser });

        console.log("[scheduler]: Adding job to pulse every 5 minutes, staggered by 10 seconds");
        const task = new Task(`pulse-${document._id}`, async () => {
            const session = app.locals.activeSessions.get(document._id);
            if (!session) {
                console.log("[scheduler]: Session not found. Stopping task.");
                return;
            }
            console.log("[scheduler]: Pulsing session");
            await pulse(session.page);
        });
        const job = new SimpleIntervalJob({ seconds: 300, runImmediately: true }, task);
        setTimeout(() => {
            app.locals.scheduler.addSimpleIntervalJob(job);
        }, i * 10000);
    }
});