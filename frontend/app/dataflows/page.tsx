'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Play, Database, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogTrigger, DialogTitle, DialogDescription, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

export default function DataflowsPage() {
    const [dataflows, setDataflows] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const router = useRouter();

    // Form State
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetch('/api/dataflows')
            .then(res => res.json())
            .then(data => {
                if (data.success) setDataflows(data.dataflows);
                setIsLoading(false);
            });
    }, []);

    const handleCreate = async () => {
        if (!name) return;
        try {
            const res = await fetch('/api/dataflows', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description, steps: [] })
            });

            if (res.ok) {
                const data = await res.json();
                toast.success('Dataflow created');
                router.push(`/dataflows/${data.dataflow.id}`);
            }
        } catch (e) {
            toast.error('Failed to create');
        }
    };

    return (
        <div className="p-8 space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Dataflows (ETL)</h1>
                    <p className="text-muted-foreground mt-2">
                        Automate your data transformation and materialization pipelines.
                    </p>
                </div>
                <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="mr-2 h-4 w-4" /> New Dataflow</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Dataflow</DialogTitle>
                            <DialogDescription>Define a new data pipeline.</DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                            <div className="grid gap-2">
                                <Label>Name</Label>
                                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Daily Sales Rollup" />
                            </div>
                            <div className="grid gap-2">
                                <Label>Description</Label>
                                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What does this pipeline do?" />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total Pipelines</CardTitle>
                        <Database className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{dataflows.length}</div>
                    </CardContent>
                </Card>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pipelines</CardTitle>
                </CardHeader>
                <CardContent>
                    {isLoading ? <div>Loading...</div> : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Schedule</TableHead>
                                    <TableHead>Steps</TableHead>
                                    <TableHead>Last Run</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {dataflows.map(df => (
                                    <TableRow key={df.id}>
                                        <TableCell>
                                            <div className="flex flex-col">
                                                <span className="font-medium">{df.name}</span>
                                                <span className="text-xs text-muted-foreground">{df.description}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>{df.schedule || 'Manual'}</TableCell>
                                        <TableCell>{df._count.steps}</TableCell>
                                        <TableCell>
                                            {df.runs[0] ? (
                                                <Badge variant={df.runs[0].status === 'FAILED' ? 'destructive' : 'default'}>
                                                    {df.runs[0].status}
                                                </Badge>
                                            ) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Link href={`/dataflows/${df.id}`}>
                                                <Button size="sm" variant="outline">
                                                    Edit <ArrowRight className="ml-2 h-4 w-4" />
                                                </Button>
                                            </Link>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
