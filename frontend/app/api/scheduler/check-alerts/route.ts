import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { ConnectorFactory } from '@/lib/connectors/connector-factory';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 're_123456789'); // Valid key needed in .env

export const dynamic = 'force-dynamic'; // Ensure no caching for status checks

export async function GET(req: NextRequest) {
    // 1. Auth Check (Basic for Scheduler)
    // In production, verify a "CRON_SECRET" header to prevent public access
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        // Return 401 if CRON_SECRET is set but not matched
        // If CRON_SECRET is not set in env, we allow it for DEV testing (with warning)
        if (process.env.CRON_SECRET) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
    }

    try {
        // 2. Fetch Active Alerts
        // Optimization: In real world, filter by "nextRunAt" or similar schedule logic
        const alerts = await db.alert.findMany({
            where: { isActive: true },
            include: { query: { include: { connection: true } } }
        });

        const results = [];

        for (const alert of alerts) {
            try {
                if (!alert.query) {
                    throw new Error('Associated query not found');
                }

                // 3. Execute Query
                const connector = ConnectorFactory.create({
                    type: alert.query.connection.type as any,
                    host: alert.query.connection.host || undefined,
                    port: alert.query.connection.port || undefined,
                    database: alert.query.connection.database,
                    username: alert.query.connection.username || undefined,
                    password: alert.query.connection.password || undefined, // Decrypt in real app
                    options: {} // Add any specific connector options
                });

                // Run query
                // Note: We might want to limit rows or just run the aggregation
                const queryResult = await connector.executeQuery(alert.query.sql);

                if (!queryResult.rows || queryResult.rows.length === 0) {
                    throw new Error('No data returned from query');
                }

                // 4. Check Condition
                // Get value from the first row and specified column
                const firstRow = queryResult.rows[0];
                const value = Number(firstRow[alert.column]);

                if (isNaN(value)) {
                    throw new Error(`Column '${alert.column}' is not a number: ${firstRow[alert.column]}`);
                }

                let triggered = false;
                switch (alert.operator) {
                    case '>': triggered = value > alert.threshold; break;
                    case '<': triggered = value < alert.threshold; break;
                    case '>=': triggered = value >= alert.threshold; break;
                    case '<=': triggered = value <= alert.threshold; break;
                    case '=': triggered = value === alert.threshold; break;
                    case '!=': triggered = value !== alert.threshold; break;
                }

                // 5. Action
                let status = 'OK';
                if (triggered) {
                    status = 'TRIGGERED';

                    // Send Email
                    // Only send if not just triggered? Or every time? 
                    // For now: Always send if triggered to ensure visibility
                    if (process.env.RESEND_API_KEY) {
                        await resend.emails.send({
                            from: 'InsightEngine <alerts@yourdomain.com>', // Needs verified domain
                            to: alert.email.split(','),
                            subject: `[Alert] ${alert.name} Triggered`,
                            html: `
                                <h1>Alert Triggered: ${alert.name}</h1>
                                <p><strong>Condition:</strong> ${alert.column} ${alert.operator} ${alert.threshold}</p>
                                <p><strong>Current Value:</strong> ${value}</p>
                                <p><strong>Query:</strong> ${alert.query.name}</p>
                                <hr/>
                                <p>Run at: ${new Date().toISOString()}</p>
                            `
                        });
                    } else {
                        console.log('[MOCK EMAIL] Alert Triggered:', alert.name, 'Value:', value);
                    }

                    // Webhook Trigger (Phase 27)
                    if (alert.webhookUrl) {
                        try {
                            const headers = (alert.webhookHeaders as Record<string, string>) || { 'Content-Type': 'application/json' };

                            // Check if configured headers lack Content-Type, default to JSON
                            if (!Object.keys(headers).some(k => k.toLowerCase() === 'content-type')) {
                                headers['Content-Type'] = 'application/json';
                            }

                            const response = await fetch(alert.webhookUrl, {
                                method: 'POST',
                                headers: headers,
                                body: JSON.stringify({
                                    event: 'alert_triggered',
                                    alertId: alert.id,
                                    alertName: alert.name,
                                    timestamp: new Date().toISOString(),
                                    condition: {
                                        column: alert.column,
                                        operator: alert.operator,
                                        threshold: alert.threshold,
                                        actualValue: value
                                    },
                                    query: {
                                        id: alert.query.id,
                                        name: alert.query.name
                                    }
                                })
                            });

                            if (!response.ok) {
                                console.error(`Webhook failed: ${response.status} ${response.statusText}`);
                            }
                        } catch (webhookError) {
                            console.error('Webhook execution error:', webhookError);
                            // We don't fail the entire alert process for a webhook failure, but catch it here
                        }
                    }
                }

                // 6. Update History & State
                await db.alertHistory.create({
                    data: {
                        alertId: alert.id,
                        status,
                        value,
                        message: triggered ? 'Threshold met' : 'Within limits'
                    }
                });

                await db.alert.update({
                    where: { id: alert.id },
                    data: {
                        lastRunAt: new Date(),
                        lastStatus: status
                    }
                });

                results.push({ id: alert.id, status, value });

            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';

                await db.alertHistory.create({
                    data: {
                        alertId: alert.id,
                        status: 'ERROR',
                        message
                    }
                });

                await db.alert.update({
                    where: { id: alert.id },
                    data: { lastRunAt: new Date(), lastStatus: 'ERROR' }
                });

                results.push({ id: alert.id, status: 'ERROR', error: message });
            }
        }

        return NextResponse.json({ success: true, processed: results.length, results });

    } catch (error) {
        return NextResponse.json(
            { success: false, error: error instanceof Error ? error.message : 'Fatal Scheduler Error' },
            { status: 500 }
        );
    }
}
