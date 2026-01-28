
import { Client } from 'pg';
import { connectionService } from '@/lib/services/connection-service';
import { aggregationService } from '@/lib/services/aggregation-service';
import { auditService } from '@/lib/services/audit-service';

export interface AlertRule {
    id: number;
    connectionId: string;
    table: string;
    metricColumn: string;
    metricType: 'count' | 'sum' | 'avg' | 'min' | 'max';
    operator: '>' | '<' | '=' | '!=';
    threshold: number;
    emailTo: string;
    name: string;
    segment: string;
    lastTriggeredAt?: Date;
}

export class AlertService {

    /**
     * Main Worker: Checks all active alerts.
     * Typically called by Cron Job / API Scheduler.
     */
    async checkAllAlerts() {
        console.log('[AlertService] Starting check job...');

        // 1. Fetch Active Alerts (Mocked for now as we might not have DB table setup in this env)
        // In production: SELECT * FROM alerts WHERE active = TRUE
        const alerts: AlertRule[] = [
            // Mock Alert for testing without DB table
            {
                id: 1,
                connectionId: 'db-1', // Assuming this connection exists in mocks
                table: 'orders',
                metricColumn: 'amount',
                metricType: 'sum',
                operator: '<',
                threshold: 10000,
                emailTo: 'boss@company.com',
                name: 'Low Revenue Warning',
                segment: 'Consumer'
            }
        ];

        // TODO: Fetch real alerts from Postgres if available
        // const realAlerts = await this.fetchFromDB();

        const results = [];

        for (const alert of alerts) {
            try {
                // 2. Evaluate Condition
                const isTriggered = await this.evaluateAlert(alert);

                if (isTriggered) {
                    // 3. Trigger Notification
                    await this.sendNotification(alert);
                    results.push({ id: alert.id, status: 'TRIGGERED' });
                } else {
                    results.push({ id: alert.id, status: 'OK' });
                }
            } catch (err) {
                console.error(`[AlertService] Failed to check alert ${alert.id}`, err);
                results.push({ id: alert.id, status: 'ERROR', error: err });
            }
        }

        return results;
    }

    private async evaluateAlert(alert: AlertRule): Promise<boolean> {
        // Reuse Aggregation Service! (DRY Principle)
        const result = await aggregationService.executeAggregation({
            connectionId: alert.connectionId,
            table: alert.table,
            dimensions: [], // Global accumulation (no group by)
            metrics: [{ column: alert.metricColumn, type: alert.metricType }],
            limit: 1,
            context: { segment: alert.segment } // Enforce RLS of the creator
        });

        if (!result.success || !result.data || result.data.length === 0) {
            throw new Error(`Failed to fetch metric: ${result.error}`);
        }

        // Extract value
        // AggregationService returns keys like "sum_amount"
        const key = `${alert.metricType}_${alert.metricColumn}`;
        // Handle "count_*" special case
        const effectiveKey = key === 'count_*' ? 'count_*' : key.toUpperCase() === key ? key : key.toLowerCase(); // Check casing? Aggregation usually returns keys as asked or lowercase.

        // Let's look at AggregationService logic: 
        // It selects: `COUNT(*) as "${label}"` or `${TYPE}("${col}") as "${label}"`
        // If no label provided, it uses `${type}_${column}`.
        const expectedLabel = `${alert.metricType}_${alert.metricColumn}`;

        const row = result.data[0];
        const value = Object.values(row)[0] as number; // Simplest way if only 1 metric

        console.log(`[AlertService] Checking ${alert.name}: ${value} ${alert.operator} ${alert.threshold}`);

        switch (alert.operator) {
            case '>': return Number(value) > alert.threshold;
            case '<': return Number(value) < alert.threshold;
            case '=': return Number(value) == alert.threshold;
            case '!=': return Number(value) != alert.threshold;
            default: return false;
        }
    }

    private async sendNotification(alert: AlertRule) {
        // Mock Email Send
        console.log(`📧 [EMAIL SENT] To: ${alert.emailTo} | Subject: ALERT ${alert.name} Triggered!`);

        // Audit Logic
        auditService.log({ tenantId: 'system', userId: 'alert-bot', role: 'admin' }, {
            action: 'EXPORT', // Misusing EXPORT as ALERT_TRIGGER for now
            resource: `Alert: ${alert.name}`,
            details: `Threshold breached. Email sent to ${alert.emailTo}`,
            status: 'SUCCESS'
        });

        // TODO: Update last_triggered_at in DB
    }
}

export const alertService = new AlertService();
