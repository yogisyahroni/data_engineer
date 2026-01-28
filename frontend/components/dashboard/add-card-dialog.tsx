'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSavedQueries } from '@/hooks/use-saved-queries'; // Assumed existing or will create
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Search, Database } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AddCardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAddQuery: (queryId: string, name: string) => void;
    onAddText: (title: string, content: string) => void;
}

export function AddCardDialog({ open, onOpenChange, onAddQuery, onAddText }: AddCardDialogProps) {
    const { queries, isLoading } = useSavedQueries();
    const [activeTab, setActiveTab] = useState('query');
    const [searchTerm, setSearchTerm] = useState('');

    // Text card state
    const [textTitle, setTextTitle] = useState('');
    const [textContent, setTextContent] = useState('');

    const filteredQueries = queries?.filter(q =>
        q.name.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] h-[500px] flex flex-col">
                <DialogHeader>
                    <DialogTitle>Add to Dashboard</DialogTitle>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col min-h-0">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="query">Saved Query</TabsTrigger>
                        <TabsTrigger value="text">Text / Markdown</TabsTrigger>
                    </TabsList>

                    {/* Query Tab */}
                    <TabsContent value="query" className="flex-1 flex flex-col min-h-0 space-y-4 mt-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search saved queries..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <ScrollArea className="flex-1 border rounded-md p-2">
                            {isLoading ? (
                                <div className="flex items-center justify-center h-20">
                                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                </div>
                            ) : filteredQueries.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                                    <Database className="h-8 w-8 mb-2 opacity-50" />
                                    <span className="text-sm">No queries found</span>
                                </div>
                            ) : (
                                <div className="grid gap-2">
                                    {filteredQueries.map((query) => (
                                        <div
                                            key={query.id}
                                            className="flex items-center justify-between p-3 rounded-lg border hover:bg-accent/50 cursor-pointer transition-colors group"
                                            onClick={() => {
                                                onAddQuery(query.id, query.name);
                                                onOpenChange(false);
                                            }}
                                        >
                                            <div className="flex flex-col gap-1">
                                                <span className="font-medium text-sm">{query.name}</span>
                                                <span className="text-xs text-muted-foreground truncate max-w-[300px]">
                                                    {query.description || 'No description'}
                                                </span>
                                            </div>
                                            <Button size="sm" variant="ghost" className="opacity-0 group-hover:opacity-100 h-8">
                                                Add
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </TabsContent>

                    {/* Text Tab */}
                    <TabsContent value="text" className="flex-1 space-y-4 mt-4 flex flex-col">
                        <div className="space-y-2">
                            <Label>Card Title</Label>
                            <Input
                                placeholder="e.g. Dashboard Notes"
                                value={textTitle}
                                onChange={(e) => setTextTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2 flex-1 flex flex-col">
                            <Label>Content (Markdown supported)</Label>
                            <textarea
                                className="flex-1 w-full min-h-[150px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none p-4 font-mono"
                                placeholder="## Summary&#10;&#10;- Insight 1&#10;- Insight 2"
                                value={textContent}
                                onChange={(e) => setTextContent(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end">
                            <Button
                                onClick={() => {
                                    onAddText(textTitle, textContent);
                                    onOpenChange(false);
                                }}
                                disabled={!textTitle}
                            >
                                Add Text Card
                            </Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
