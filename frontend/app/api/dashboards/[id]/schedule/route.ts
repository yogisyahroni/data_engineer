import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { z } from "zod";

const scheduleSchema = z.object({
    frequency: z.enum(["DAILY", "WEEKLY", "MONTHLY"]),
    email: z.string().min(1),
    format: z.enum(["PDF", "PNG"])
});

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const json = await req.json();
        const body = scheduleSchema.parse(json);

        // Check if dashboard exists
        const dashboard = await db.dashboard.findUnique({
            where: { id: params.id }
        });

        if (!dashboard) {
            return NextResponse.json({ error: "Dashboard not found" }, { status: 404 });
        }

        // Create Schedule
        const schedule = await db.reportSchedule.create({
            data: {
                dashboardId: params.id,
                frequency: body.frequency,
                email: body.email,
                format: body.format,
                isActive: true,
                // Calculate next run based on frequency
                nextRunAt: calculateNextRun(body.frequency)
            }
        });

        return NextResponse.json(schedule);
    } catch (error: any) {
        console.error("[Schedule API]", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

function calculateNextRun(frequency: string): Date {
    const now = new Date();
    const next = new Date(now);

    if (frequency === "DAILY") {
        next.setDate(now.getDate() + 1);
        next.setHours(9, 0, 0, 0); // 9 AM tomorrow
    } else if (frequency === "WEEKLY") {
        // Next Monday
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1) + 7;
        next.setDate(diff);
        next.setHours(9, 0, 0, 0);
    } else if (frequency === "MONTHLY") {
        // 1st of next month
        next.setMonth(now.getMonth() + 1);
        next.setDate(1);
        next.setHours(9, 0, 0, 0);
    }

    return next;
}
