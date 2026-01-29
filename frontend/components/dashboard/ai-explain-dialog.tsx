'use client';

import { useState, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Copy } from 'lucide-react';
import { toast } from 'sonner';

interface AIExplainDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    data: any[];
}

export function AIExplainDialog({ open, onOpenChange, title, data }: AIExplainDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [insights, setInsights] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (open && data.length > 0) {
            fetchInsights();
        }
    }, [open]);

    const fetchInsights = async () => {
        setIsLoading(true);
        setError(null);
        setInsights([]);

        try {
            const response = await fetch('/api/ai/explain', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    data: data,
                    context: `Analyze the dataset for "${title}". Focus on trends, outliers, and key takeaways.`
                })
            });

            const result = await response.json();

            if (!response.ok) throw new Error(result.error || 'Failed to generate insights');

            setInsights(result.insights || []);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const copyToClipboard = () => {
        const text = insights.join('\n\n');
        navigator.clipboard.writeText(text);
        toast.success('Insights copied to clipboard');
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-purple-600">
                        <Sparkles className="h-5 w-5" />
                        AI Insights: {title}
                    </DialogTitle>
                    <DialogDescription>
                        Smart analysis powered by Gemini Engine.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center p-8 space-y-4">
                            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                            <p className="text-sm text-muted-foreground animate-pulse">Analyzing data patterns...</p>
                        </div>
                    ) : error ? (
                        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                            {error}
                            <Button variant="link" onClick={fetchInsights} className="ml-2">Retry</Button>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                            {insights.length > 0 ? (
                                insights.map((insight, i) => (
                                    <div key={i} className="flex gap-3 text-sm leading-relaxed p-3 rounded-lg bg-muted/30 border border-border/50">
                                        <span className="flex-shrink-0 font-bold text-purple-500">#{i + 1}</span>
                                        <p>{insight}</p>
                                    </div>
                                ))
                            ) : (
                                <p className="text-muted-foreground text-center">No insights generated.</p>
                            )}
                        </div>
                    )}
                </div>

                {!isLoading && !error && insights.length > 0 && (
                    <div className="flex justify-end">
                        <Button variant="outline" size="sm" onClick={copyToClipboard} className="gap-2">
                            <Copy className="h-4 w-4" />
                            Copy Insights
                        </Button>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
