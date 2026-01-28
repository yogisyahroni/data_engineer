'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Bell, Activity, ArrowRight } from 'lucide-react';
import { AlertBuilderDialog } from '@/components/alerts/alert-builder-dialog';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';

interface Alert {
    id: string;
    name: string;
    column: string;
    operator: string;
    threshold: number;
    schedule: string;
    lastStatus: string | null;
    lastRunAt: string | null;
    query: {
        name: string;
    };
    isActive: boolean;
}

export default function AlertsPage() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [queries, setQueries] = useState<{ id: string; name: string }[]>([]);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [alertsRes, queriesRes] = await Promise.all([
                fetch('/api/alerts'),
                fetch('/api/queries/saved?type=all') // Assuming this endpoint exists or similar
            ]);

            if (alertsRes.ok) {
                const data = await alertsRes.json();
                setAlerts(data.alerts || []);
            }

            if (queriesRes.ok) {
                const data = await queriesRes.json();
                // Adapt based on actual API response structure
                setQueries(data.queries || []);
            }
        } catch (error) {
            console.error('Failed to fetch data', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Data Alerts</h1>
                    <p className="text-muted-foreground mt-2">
                        Receive notifications when your metrics cross specific thresholds.
                    </p>
                </div>
                <Button onClick={() => setIsDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" /> Create Alert
                </Button>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
                        <Bell className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{alerts.filter(a => a.isActive).length}</div>
                        <p className="text-xs text-muted-foreground">
                            Monitoring your data
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Triggered Recently</CardTitle>
                        <Activity className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">
                            {alerts.filter(a => a.lastStatus === 'TRIGGERED').length}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            In the last run
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Your Alerts</CardTitle>
                    <CardDescription>
                        Manage your data monitoring rules.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <div className="py-8 text-center text-muted-foreground">Loading alerts...</div>
                    ) : alerts.length === 0 ? (
                        <div className="py-12 text-center border-dashed border rounded-lg bg-muted/20">
                            <h3 className="text-lg font-medium">No alerts created yet</h3>
                            <p className="text-muted-foreground mt-2 mb-4">
                                Create your first alert to start monitoring your data.
                            </p>
                            <Button variant="outline" onClick={() => setIsDialogOpen(true)}>
                                Create Alert
                            </Button>
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Query</TableHead>
                                    <TableHead>Condition</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Last Run</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {alerts.map((alert) => (
                                    <TableRow key={alert.id}>
                                        <TableCell className="font-medium">{alert.name}</TableCell>
                                        <TableCell>{alert.query?.name || 'Deleted Query'}</TableCell>
                                        <TableCell>
                                            <Badge variant="outline">
                                                {alert.column} {alert.operator} {alert.threshold}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <Badge
                                                variant={
                                                    alert.lastStatus === 'TRIGGERED' ? 'destructive' :
                                                        alert.lastStatus === 'OK' ? 'default' : 'secondary'
                                                }
                                            >
                                                {alert.lastStatus || 'Pending'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-muted-foreground text-sm">
                                            {alert.lastRunAt
                                                ? formatDistanceToNow(new Date(alert.lastRunAt), { addSuffix: true })
                                                : 'Never'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="sm">
                                                Edit
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>

            <AlertBuilderDialog
                open={isDialogOpen}
                onOpenChange={(open) => {
                    setIsDialogOpen(open);
                    if (!open) fetchData(); // Refresh on close
                }}
                queries={queries}
            />
        </div>
    );
}
