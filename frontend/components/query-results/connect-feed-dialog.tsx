
'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Check, RefreshCw, Trash2, Plug } from 'lucide-react';
import { toast } from 'sonner';

interface ConnectFeedDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    queryId: string | undefined;
}

export function ConnectFeedDialog({ isOpen, onOpenChange, queryId }: ConnectFeedDialogProps) {
    const [isLoading, setIsLoading] = useState(false);
    const [feeds, setFeeds] = useState<any[]>([]);
    const [copied, setCopied] = useState(false);

    // Fetch existing feeds on open
    useEffect(() => {
        if (isOpen && queryId) {
            fetchFeeds();
        }
    }, [isOpen, queryId]);

    const fetchFeeds = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/queries/${queryId}/feeds`);
            if (res.ok) {
                const data = await res.json();
                setFeeds(data);
            }
        } catch (err) {
            console.error("Failed to fetch feeds", err);
        } finally {
            setIsLoading(false);
        }
    };

    const createFeed = async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/queries/${queryId}/feeds`, {
                method: 'POST',
                body: JSON.stringify({ name: "Excel Live Feed", format: "csv" })
            });

            if (!res.ok) throw new Error("Failed to create feed");

            const newFeed = await res.json();
            setFeeds([newFeed, ...feeds]);
            toast.success("Live Link Generated");
        } catch (err) {
            toast.error("Failed to generate link");
        } finally {
            setIsLoading(false);
        }
    };

    const deleteFeed = async (feedId: string) => {
        try {
            const res = await fetch(`/api/feeds/${feedId}`, { method: 'DELETE' });
            if (res.ok) {
                setFeeds(feeds.filter(f => f.id !== feedId));
                toast.success("Link Revoked");
            }
        } catch (err) {
            toast.error("Failed to revoke link");
        }
    };

    const getFeedUrl = (token: string) => {
        // Use window.location.origin to get the base URL
        if (typeof window === 'undefined') return '';
        return `${window.location.origin}/api/public/feed/${token}`;
    };

    const handleCopy = (url: string) => {
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        toast.success("URL copied to clipboard");
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plug className="w-5 h-5 text-green-600" />
                        Connect to External Tools
                    </DialogTitle>
                    <DialogDescription>
                        Generate a secure link to pull this query's data directly into Excel, Google Sheets, or Power BI.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-4">
                    {!queryId ? (
                        <div className="text-center p-4 bg-muted rounded-md text-sm">
                            ⚠️ You must <strong>Save</strong> this query first before generating a live link.
                        </div>
                    ) : (
                        <>
                            {feeds.length === 0 ? (
                                <div className="text-center py-8 border-2 border-dashed rounded-lg">
                                    <p className="text-sm text-muted-foreground mb-4">No live links active.</p>
                                    <Button onClick={createFeed} disabled={isLoading}>
                                        {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                        Generate Live Link
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {feeds.map(feed => (
                                        <div key={feed.id} className="border rounded-lg p-3 space-y-3 bg-muted/20">
                                            <div className="flex items-center justify-between">
                                                <Label className="font-medium text-sm">Live CSV Feed (Excel Compatible)</Label>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-6 w-6 text-destructive hover:bg-destructive/10"
                                                    onClick={() => deleteFeed(feed.id)}
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </Button>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Input
                                                    readOnly
                                                    value={getFeedUrl(feed.token)}
                                                    className="font-mono text-xs h-8 bg-background"
                                                />
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="h-8 w-8 p-0"
                                                    onClick={() => handleCopy(getFeedUrl(feed.token))}
                                                >
                                                    {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                                </Button>
                                            </div>
                                            <div className="text-xs text-muted-foreground bg-blue-50/50 dark:bg-blue-900/10 p-2 rounded">
                                                <strong>How to use in Excel:</strong>
                                                <ol className="list-decimal pl-4 mt-1 space-y-1">
                                                    <li>Go to <strong>Data</strong> tab</li>
                                                    <li>Select <strong>Get Data &gt; From Web</strong></li>
                                                    <li>Paste the URL above</li>
                                                </ol>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
