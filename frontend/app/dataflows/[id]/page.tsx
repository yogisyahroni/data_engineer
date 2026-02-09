'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Play, Plus, Box, ArrowDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function DataflowDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const [dataflow, setDataflow] = useState<any>(null);
    const [isRunning, setIsRunning] = useState(false);

    // In real implementation, this would fetch from /api/dataflows/[id]
    // Since we didn't implement GET [id] yet, just stubbing or reusing list
    // Ideally update `api/dataflows` to handle [id] or query params, but standard is `api/dataflows/[id]`

    useEffect(() => {
        // Mock fetch for MVP speed
        toast.info("Detail implementation pending full API. Use List for now.");
    }, []);

    const handleRun = async () => {
        setIsRunning(true);
        try {
            const { id } = await params;
            const res = await fetch(`/api/dataflows/${id}/run`, { method: 'POST' });
            if (res.ok) toast.success('Dataflow started');
            else toast.error('Failed to start');
        } catch (e) {
            toast.error('Error');
        } finally {
            setIsRunning(false);
        }
    };

    return (
        <div className="p-8 space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pipeline Details</h1>
                    <p className="text-muted-foreground">{id}</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline"><Plus className="mr-2 h-4 w-4" /> Add Step</Button>
                    <Button onClick={handleRun} disabled={isRunning}>
                        <Play className="mr-2 h-4 w-4" /> {isRunning ? 'Running...' : 'Run Now'}
                    </Button>
                </div>
            </div>

            <div className="flex flex-col items-center space-y-4 py-8">
                <Card className="w-full max-w-2xl border-dashed">
                    <CardHeader>
                        <CardTitle className="text-center">Visual Editor Placeholder</CardTitle>
                        <CardDescription className="text-center">
                            For this MVP, please create steps via API or seed.
                            <br />
                            Visual Drag-and-Drop ETL editor is planned for Phase 12.2.1.
                        </CardDescription>
                    </CardHeader>
                </Card>
            </div>
        </div>
    );
}
