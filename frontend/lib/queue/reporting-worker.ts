
import { Worker, Job } from 'bullmq';
import { redis } from '../db/redis';
import { db } from '../db';
import puppeteer from 'puppeteer';
import { nanoid } from 'nanoid';

// Mock Email Service
async function sendEmail(to: string, subject: string, attachmentPath: string) {
    console.log(`[Email Mock] Sending to ${to}`);
    console.log(`[Email Mock] Subject: ${subject}`);
    console.log(`[Email Mock] Attachment: ${attachmentPath}`);
    // In real app, use Resend or Nodemailer
}

export const reportingWorker = new Worker('reporting-jobs', async (job: Job) => {
    console.log(`[ReportingWorker] Checking for due reports...`);

    // 1. Find Due Schedules
    const now = new Date();
    const schedules = await db.reportSchedule.findMany({
        where: {
            isActive: true,
            nextRunAt: { lte: now }
        },
        include: { dashboard: true }
    });

    console.log(`[ReportingWorker] Found ${schedules.length} due reports.`);

    for (const schedule of schedules) {
        try {
            console.log(`[ReportingWorker] Processing schedule ${schedule.id} for Dashboard ${schedule.dashboard.name}`);

            // 2. Generate Share Token (Temporary)
            const token = nanoid(10);
            await db.shareLink.create({
                data: {
                    token,
                    resourceType: 'DASHBOARD',
                    dashboardId: schedule.dashboardId,
                    expiresAt: new Date(Date.now() + 1000 * 60 * 60) // 1 hour
                }
            });

            // 3. Generate PDF via Puppeteer
            const browser = await puppeteer.launch({ headless: 'new' });
            const page = await browser.newPage();

            // Adjust viewport for best capture
            await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 2 });

            const shareUrl = `http://localhost:3000/share/${token}`;
            await page.goto(shareUrl, { waitUntil: 'networkidle0' });

            // Wait for charts to render (rough heuristic)
            await page.waitForSelector('.dashboard-grid', { timeout: 10000 });
            await new Promise(r => setTimeout(r, 2000)); // Extra buffer for animations

            const pdfPath = `./temp-reports/${schedule.id}-${Date.now()}.pdf`;

            // Ensure temp dir exists (logic omitted for brevity)

            await page.pdf({
                path: pdfPath,
                format: 'A4',
                printBackground: true
            });

            await browser.close();

            // 4. Send Email
            await sendEmail(schedule.email, `Daily Report: ${schedule.dashboard.name}`, pdfPath);

            // 5. Update Schedule
            const nextRun = calculateNextRun(schedule.frequency);
            await db.reportSchedule.update({
                where: { id: schedule.id },
                data: {
                    lastRunAt: new Date(),
                    nextRunAt: nextRun
                }
            });

        } catch (error) {
            console.error(`[ReportingWorker] Error processing schedule ${schedule.id}:`, error);
        }
    }

}, {
    connection: redis || { host: 'localhost', port: 6379 }
});


function calculateNextRun(frequency: string): Date {
    const now = new Date();
    const next = new Date(now);

    if (frequency === "DAILY") {
        next.setDate(now.getDate() + 1);
        next.setHours(9, 0, 0, 0);
    } else if (frequency === "WEEKLY") {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1) + 7;
        next.setDate(diff);
        next.setHours(9, 0, 0, 0);
    } else if (frequency === "MONTHLY") {
        next.setMonth(now.getMonth() + 1);
        next.setDate(1);
        next.setHours(9, 0, 0, 0);
    }
    return next;
}
