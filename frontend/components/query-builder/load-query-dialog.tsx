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
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Search,
    FolderOpen,
    Calendar,
    Tag,
    Database,
    AlertCircle,
    Loader2,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { SavedVisualQuery } from '@/lib/query-builder/types';

interface LoadQueryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    onLoad: (query: SavedVisualQuery) => void;
}

export function LoadQueryDialog({
    open,
    onOpenChange,
    workspaceId,
    onLoad,
}: LoadQueryDialogProps) {
    const [queries, setQueries] = useState<SavedVisualQuery[]>([]);
    const [filteredQueries, setFilteredQueries] = useState<SavedVisualQuery[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedQuery, setSelectedQuery] = useState<SavedVisualQuery | null>(null);

    useEffect(() => {
        if (open) {
            fetchQueries();
        }
    }, [open, workspaceId]);

    useEffect(() => {
        // Filter queries based on search
        if (!searchQuery.trim()) {
            setFilteredQueries(queries);
        } else {
            const query = searchQuery.toLowerCase();
            setFilteredQueries(
                queries.filter(
                    (q) =>
                        q.name.toLowerCase().includes(query) ||
                        q.description?.toLowerCase().includes(query) ||
                        q.tags?.some((tag) => tag.toLowerCase().includes(query))
                )
            );
        }
    }, [searchQuery, queries]);

    const fetchQueries = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(
                `/api/visual-queries?workspace_id=${workspaceId}`
            );

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to load queries');
            }

            const data = await response.json();
            setQueries(data.queries || []);
            setFilteredQueries(data.queries || []);
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            toast.error('Failed to load queries: ' + message);
        } finally {
            setLoading(false);
        }
    };

    const handleLoad = (query: SavedVisualQuery) => {
        onLoad(query);
        onOpenChange(false);
        toast.success(`Loaded query: ${query.name}`);
    };

    const handleQueryClick = (query: SavedVisualQuery) => {
        setSelectedQuery(selectedQuery?.id === query.id ? null : query);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[80vh]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FolderOpen className="h-5 w-5" />
                        Load Saved Query
                    </DialogTitle>
                    <DialogDescription>
                        Select a previously saved query to load into the workspace.
                    </DialogDescription>
                </DialogHeader>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search queries by name, description, or tags..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                    />
                </div>

                {/* Query List */}
                <ScrollArea className="h-[400px] pr-4">
                    {loading ? (
                        <div className="space-y-3">
                            {[...Array(3)].map((_, idx) => (
                                <div key={idx} className="space-y-2 p-4 border rounded-md">
                                    <Skeleton className="h-5 w-2/3" />
                                    <Skeleton className="h-4 w-full" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex items-start gap-3 p-4 border border-destructive/50 rounded-md bg-destructive/5">
                            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                            <div className="flex-1 space-y-1">
                                <p className="text-sm font-medium text-destructive">
                                    Failed to Load Queries
                                </p>
                                <p className="text-sm text-muted-foreground">{error}</p>
                            </div>
                        </div>
                    ) : filteredQueries.length === 0 ? (
                        <div className="text-center py-12">
                            <FolderOpen className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                            <p className="text-sm text-muted-foreground">
                                {searchQuery
                                    ? 'No queries match your search'
                                    : 'No saved queries found'}
                            </p>
                            {searchQuery && (
                                <Button
                                    variant="link"
                                    size="sm"
                                    onClick={() => setSearchQuery('')}
                                    className="mt-2"
                                >
                                    Clear search
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {filteredQueries.map((query) => (
                                <div
                                    key={query.id}
                                    className={`p-4 border rounded-md cursor-pointer transition-colors ${selectedQuery?.id === query.id
                                            ? 'border-primary bg-primary/5'
                                            : 'hover:bg-muted/50'
                                        }`}
                                    onClick={() => handleQueryClick(query)}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-2">
                                        <h4 className="font-medium">{query.name}</h4>
                                        <Button
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleLoad(query);
                                            }}
                                            className="h-7"
                                        >
                                            Load
                                        </Button>
                                    </div>

                                    {/* Description */}
                                    {query.description && (
                                        <p className="text-sm text-muted-foreground mb-2">
                                            {query.description}
                                        </p>
                                    )}

                                    {/* Tags */}
                                    {query.tags && query.tags.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {query.tags.map((tag) => (
                                                <Badge
                                                    key={tag}
                                                    variant="outline"
                                                    className="text-xs"
                                                >
                                                    <Tag className="h-3 w-3 mr-1" />
                                                    {tag}
                                                </Badge>
                                            ))}
                                        </div>
                                    )}

                                    {/* Stats */}
                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                        <div className="flex items-center gap-1">
                                            <Database className="h-3 w-3" />
                                            <span>
                                                {query.config.tables.length} tables,{' '}
                                                {query.config.joins.length} joins
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <Calendar className="h-3 w-3" />
                                            <span>
                                                {format(
                                                    new Date(query.updatedAt),
                                                    'MMM d, yyyy'
                                                )}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Expanded Details */}
                                    {selectedQuery?.id === query.id && (
                                        <div className="mt-3 pt-3 border-t space-y-2">
                                            <p className="text-xs font-medium text-muted-foreground">
                                                Configuration Details:
                                            </p>
                                            <div className="grid grid-cols-3 gap-2 text-xs">
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Columns:
                                                    </span>{' '}
                                                    <span className="font-medium">
                                                        {query.config.columns.length}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Filters:
                                                    </span>{' '}
                                                    <span className="font-medium">
                                                        {query.config.filters.conditions.length}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Aggregations:
                                                    </span>{' '}
                                                    <span className="font-medium">
                                                        {query.config.aggregations.length}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Group By:
                                                    </span>{' '}
                                                    <span className="font-medium">
                                                        {query.config.groupBy.length}
                                                    </span>
                                                </div>
                                                <div>
                                                    <span className="text-muted-foreground">
                                                        Limit:
                                                    </span>{' '}
                                                    <span className="font-medium">
                                                        {query.config.limit}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
}
