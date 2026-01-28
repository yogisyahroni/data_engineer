'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { History, RotateCcw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { toast } from 'sonner';

interface QueryVersion {
    id: string;
    sql: string;
    changeLog?: string;
    createdAt: string;
    user: { name: string; image?: string };
}

export function VersionHistorySheet({ queryId, onRevert }: { queryId: string, onRevert?: () => void }) {
    const [versions, setVersions] = useState<QueryVersion[]>([]);
    const [loading, setLoading] = useState(false);
    const [isOpen, setIsOpen] = useState(false);

    const fetchVersions = async () => {
        setLoading(true);
        try {
            // Using the path we set up: /api/queries/saved/[id]/versions
            // Note: I moved it to the correct folder in step 4143
            const res = await fetch(`/api/queries/saved/${queryId}/versions`);
            if (res.ok) {
                const data = await res.json();
                setVersions(data.versions);
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (isOpen) fetchVersions();
    }, [isOpen, queryId]);

    const handleRevert = async (version: QueryVersion) => {
        if (!confirm('Are you sure you want to revert to this version? Current changes will be overwritten.')) return;

        try {
            const res = await fetch(`/api/queries/saved/${queryId}/versions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ versionId: version.id }) // calls the 'revert' logic
            });

            if (res.ok) {
                toast.success('Query reverted successfully');
                setIsOpen(false);
                onRevert?.(); // Callback to reload query editor
            } else {
                toast.error('Failed to revert');
            }
        } catch (e) {
            toast.error('Network error');
        }
    };

    return (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                    <History className="h-4 w-4" />
                    History
                </Button>
            </SheetTrigger>
            <SheetContent>
                <SheetHeader>
                    <SheetTitle>Version History</SheetTitle>
                </SheetHeader>
                <ScrollArea className="h-[calc(100vh-100px)] mt-4 pr-4">
                    {loading ? (
                        <div className="text-center text-sm">Loading...</div>
                    ) : versions.length === 0 ? (
                        <div className="text-center text-sm text-muted-foreground">No history available</div>
                    ) : (
                        <div className="space-y-4">
                            {versions.map((ver, i) => (
                                <div key={ver.id} className="border rounded-md p-3 text-sm space-y-2 relative">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="font-semibold">Version {versions.length - i}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {formatDistanceToNow(new Date(ver.createdAt))} ago by {ver.user.name}
                                            </p>
                                        </div>
                                        <Button variant="ghost" size="icon" onClick={() => handleRevert(ver)}>
                                            <RotateCcw className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <div className="bg-muted p-2 rounded font-mono text-xs overflow-x-auto max-h-32">
                                        {ver.sql}
                                    </div>
                                    {ver.changeLog && (
                                        <p className="text-xs text-muted-foreground italic">{ver.changeLog}</p>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </SheetContent>
        </Sheet>
    );
}
