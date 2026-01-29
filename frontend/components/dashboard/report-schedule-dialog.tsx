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
import { toast } from 'sonner';
import { CalendarClock, Loader2 } from 'lucide-react';

interface ReportScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    dashboardId: string;
}

export function ReportScheduleDialog({
    open,
    onOpenChange,
    dashboardId
}: ReportScheduleDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [frequency, setFrequency] = useState('WEEKLY');
    const [email, setEmail] = useState('');
    const [format, setFormat] = useState('PDF');

    const handleSave = async () => {
        if (!email) {
            toast.error('Please enter an email address');
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`/api/dashboards/${dashboardId}/schedule`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    frequency,
                    email,
                    format
                })
            });

            if (!response.ok) throw new Error('Failed to save schedule');

            toast.success('Report schedule saved');
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to schedule report');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <CalendarClock className="h-5 w-5" />
                        Schedule Report
                    </DialogTitle>
                    <DialogDescription>
                        Automatically send this dashboard to your email.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="frequency">Frequency</Label>
                        <Select value={frequency} onValueChange={setFrequency}>
                            <SelectTrigger id="frequency">
                                <SelectValue placeholder="Select frequency" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="DAILY">Daily (9:00 AM)</SelectItem>
                                <SelectItem value="WEEKLY">Weekly (Monday 9:00 AM)</SelectItem>
                                <SelectItem value="MONTHLY">Monthly (1st of month)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="email">Recipients</Label>
                        <Input
                            id="email"
                            placeholder="user@example.com (comma separated)"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="format">Format</Label>
                        <Select value={format} onValueChange={setFormat}>
                            <SelectTrigger id="format">
                                <SelectValue placeholder="Select format" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="PDF">PDF Document</SelectItem>
                                <SelectItem value="PNG">PNG Image</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isLoading}>
                        {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Schedule
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
