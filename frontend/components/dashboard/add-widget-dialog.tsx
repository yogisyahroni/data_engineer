'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Search, Plus, LayoutGrid, FileText } from 'lucide-react';
import { useSavedQueries } from '@/hooks/use-saved-queries';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddWidgetDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddQuery: (queryId: string) => void;
    onCreateNew: () => void;
}

export function AddWidgetDialog({
    open,
    onOpenChange,
    onAddQuery,
    onCreateNew,
}: AddWidgetDialogProps) {
    const { queries } = useSavedQueries({ autoFetch: open }); // Fetch when open
    const [selectedQueryId, setSelectedQueryId] = useState<string>('');

    const handleAddExisting = () => {
        if (selectedQueryId) {
            onAddQuery(selectedQueryId);
            onOpenChange(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>Add Widget to Dashboard</DialogTitle>
                    <DialogDescription>
                        Choose a data source for your new widget
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
                    {/* Option 1: Existing Query */}
                    <Card className="p-4 cursor-pointer hover:border-primary border-2 border-transparent hover:bg-muted/5 transition-all space-y-4"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Search className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Select Saved Query</h3>
                                <p className="text-sm text-muted-foreground">Pick from your library</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <Select value={selectedQueryId} onValueChange={setSelectedQueryId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Search saved queries..." />
                                </SelectTrigger>
                                <SelectContent>
                                    <ScrollArea className="h-48">
                                        {queries.length === 0 ? (
                                            <div className="p-2 text-center text-xs text-muted-foreground">No saved queries found</div>
                                        ) : (
                                            queries.map(q => (
                                                <SelectItem key={q.id} value={q.id}>{q.name}</SelectItem>
                                            ))
                                        )}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                            <Button
                                onClick={handleAddExisting}
                                disabled={!selectedQueryId}
                                className="w-full"
                                size="sm"
                            >
                                Add Selected
                            </Button>
                        </div>
                    </Card>

                    {/* Option 2: Create New */}
                    <Card
                        className="p-4 cursor-pointer hover:border-primary border-2 border-transparent hover:bg-muted/5 transition-all flex flex-col justify-between"
                        onClick={() => {
                            onOpenChange(false);
                            onCreateNew();
                        }}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Plus className="w-5 h-5 text-primary" />
                            </div>
                            <div>
                                <h3 className="font-semibold">Create New Query</h3>
                                <p className="text-sm text-muted-foreground">Write SQL or ask AI</p>
                            </div>
                        </div>

                        <div className="mt-4">
                            <div className="text-xs text-muted-foreground mb-4">
                                Opens the query builder. You can save and add it immediately.
                            </div>
                            <Button variant="outline" className="w-full pointer-events-none">
                                Open Builder
                            </Button>
                        </div>
                    </Card>
                </div>
            </DialogContent>
        </Dialog>
    );
}
