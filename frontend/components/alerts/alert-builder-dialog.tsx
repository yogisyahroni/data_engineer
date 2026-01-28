'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

interface AlertBuilderDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    queryId?: string; // If creating from a specific query context
    queries?: { id: string; name: string }[]; // List of available queries if no queryId provided
    onConstraintSave?: () => void;
}

export function AlertBuilderDialog({
    open,
    onOpenChange,
    queryId: initialQueryId,
    queries = [],
    onConstraintSave
}: AlertBuilderDialogProps) {
    const [name, setName] = useState('');
    const [queryId, setQueryId] = useState(initialQueryId || '');
    const [column, setColumn] = useState('');
    const [operator, setOperator] = useState('>');
    const [threshold, setThreshold] = useState('');
    const [email, setEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async () => {
        if (!name || !queryId || !column || !threshold || !email) {
            toast.error('Please fill in all fields');
            return;
        }

        try {
            setIsSubmitting(true);
            const res = await fetch('/api/alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    queryId,
                    column,
                    operator,
                    threshold: Number(threshold),
                    schedule: 'hourly', // Default for MVP
                    email
                })
            });

            if (!res.ok) throw new Error('Failed to create alert');

            toast.success('Alert created successfully');
            onOpenChange(false);
            onConstraintSave?.();

            // Reset form
            setName('');
            setThreshold('');
        } catch (error) {
            toast.error('Failed to create alert');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Create Data Alert</DialogTitle>
                    <DialogDescription>
                        Receive an email notification when your data meets specific conditions.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label>Alert Name</Label>
                        <Input
                            placeholder="e.g. Revenue Drop Warning"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {!initialQueryId && (
                        <div className="grid gap-2">
                            <Label>Source Query</Label>
                            <Select value={queryId} onValueChange={setQueryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select a query..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {queries.map(q => (
                                        <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                            <Label>Column Name</Label>
                            <Input
                                placeholder="e.g. total_revenue"
                                value={column}
                                onChange={(e) => setColumn(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <Label>Condition</Label>
                            <div className="flex gap-2">
                                <Select value={operator} onValueChange={setOperator}>
                                    <SelectTrigger className="w-[80px]">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value=">">{'>'}</SelectItem>
                                        <SelectItem value="<">{'<'}</SelectItem>
                                        <SelectItem value=">=">{'>='}</SelectItem>
                                        <SelectItem value="<=">{'<='}</SelectItem>
                                        <SelectItem value="=">{'='}</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Input
                                    type="number"
                                    placeholder="Threshold"
                                    value={threshold}
                                    onChange={(e) => setThreshold(e.target.value)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="grid gap-2">
                        <Label>Notify Email</Label>
                        <Input
                            placeholder="you@company.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            We'll verify this condition every hour.
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={isSubmitting}>
                        {isSubmitting ? 'Creating...' : 'Create Alert'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
