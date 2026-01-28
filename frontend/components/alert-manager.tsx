
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Play, CheckCircle, AlertTriangle } from 'lucide-react';
import { AlertRule } from '@/lib/services/alert-service';

// Mock data mirroring the backend service for now
const MOCK_ALERTS: Partial<AlertRule>[] = [
    {
        id: 1,
        name: 'Low Revenue Warning',
        metricColumn: 'amount',
        metricType: 'sum',
        operator: '<',
        threshold: 10000,
        emailTo: 'boss@company.com',
        lastTriggeredAt: new Date(),
    },
    {
        id: 2,
        name: 'High Traffic Alert',
        metricColumn: 'visits',
        metricType: 'count',
        operator: '>',
        threshold: 5000,
        emailTo: 'devops@company.com'
    }
];

export function AlertManager() {
    const [isChecking, setIsChecking] = useState(false);
    const [lastResult, setLastResult] = useState<any>(null);

    const handleManualCheck = async () => {
        setIsChecking(true);
        try {
            const res = await fetch('/api/scheduler/check-alerts', {
                headers: {
                    'x-cron-secret': 'schedule_secret_123' // Hardcoded for demo UI
                }
            });
            const data = await res.json();
            setLastResult(data);
        } catch (err) {
            console.error(err);
        } finally {
            setIsChecking(false);
        }
    };

    return (
        <Card className="w-full">
            <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                    <Bell className="w-5 h-5 text-primary" />
                    <CardTitle>Alerting Rules</CardTitle>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualCheck}
                    disabled={isChecking}
                >
                    <Play className="w-4 h-4 mr-2" />
                    {isChecking ? 'Checking...' : 'Run Checks Now'}
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4">
                    {MOCK_ALERTS.map((alert) => (
                        <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/20">
                            <div>
                                <div className="font-medium flex items-center gap-2">
                                    {alert.name}
                                    <span className="text-xs px-2 py-0.5 rounded bg-primary/10 text-primary">Active</span>
                                </div>
                                <div className="text-sm text-muted-foreground mt-1">
                                    If {alert.metricType}({alert.metricColumn}) {alert.operator} {alert.threshold} → Email {alert.emailTo}
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-muted-foreground">Last Triggered</div>
                                <div className="text-sm font-mono">
                                    {alert.lastTriggeredAt ? alert.lastTriggeredAt.toLocaleDateString() : 'Never'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {lastResult && (
                    <div className="mt-4 p-3 bg-muted rounded text-sm font-mono">
                        <div className="font-bold mb-2">Run Result:</div>
                        <pre>{JSON.stringify(lastResult, null, 2)}</pre>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
