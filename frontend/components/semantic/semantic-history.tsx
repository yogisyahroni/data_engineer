'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    MessageSquare,
    FileCode,
    Calculator,
    Lightbulb,
    CalendarClock,
    Trash2,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { useSemanticRequests } from '@/hooks/use-semantic';
import { formatDistanceToNow } from 'date-fns';
import type { SemanticOperationType } from '@/lib/types/semantic';

interface SemanticHistoryProps {
    selectedId?: string;
    onSelect: (id: string) => void;
    onDelete?: (id: string) => void;
    className?: string;
}

export function SemanticHistory({
    selectedId,
    onSelect,
    onDelete,
    className,
}: SemanticHistoryProps) {
    const [typeFilter, setTypeFilter] = React.useState<SemanticOperationType | 'all'>('all');
    const [page, setPage] = React.useState(0);
    const limit = 20;

    // Hooks
    const { data, isLoading } = useSemanticRequests({
        type: typeFilter === 'all' ? undefined : typeFilter,
        limit,
        offset: page * limit,
    });

    const getTypeIcon = (type: SemanticOperationType) => {
        switch (type) {
            case 'chat':
                return <MessageSquare className="w-3 h-3" />;
            case 'query':
                return <FileCode className="w-3 h-3" />;
            case 'formula':
                return <Calculator className="w-3 h-3" />;
            case 'explain':
                return <Lightbulb className="w-3 h-3" />;
        }
    };

    const getTypeColor = (type: SemanticOperationType) => {
        switch (type) {
            case 'chat':
                return 'text-blue-500 bg-blue-500/10 border-blue-500/20';
            case 'query':
                return 'text-green-500 bg-green-500/10 border-green-500/20';
            case 'formula':
                return 'text-purple-500 bg-purple-500/10 border-purple-500/20';
            case 'explain':
                return 'text-amber-500 bg-amber-500/10 border-amber-500/20';
        }
    };

    const totalPages = data ? Math.ceil(data.total / limit) : 0;

    // Empty state
    if (!isLoading && (!data || data.data.length === 0)) {
        return (
            <div
                className={cn(
                    'flex flex-col h-full bg-card/50 backdrop-blur-lg border-l border-border/50',
                    className
                )}
            >
                {/* Header */}
                <div className="p-4 border-b border-border/50">
                    <h3 className="text-sm font-semibold">History</h3>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                        Your AI requests
                    </p>
                </div>

                {/* Filter */}
                <div className="p-3 border-b border-border/50">
                    <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                        <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Types</SelectItem>
                            <SelectItem value="chat">Chat</SelectItem>
                            <SelectItem value="query">Query</SelectItem>
                            <SelectItem value="formula">Formula</SelectItem>
                            <SelectItem value="explain">Explain</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Empty State */}
                <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
                    <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                        <MessageSquare className="w-6 h-6 text-muted-foreground/50" />
                    </div>
                    <p className="text-xs text-muted-foreground">No history yet</p>
                    <p className="text-[10px] text-muted-foreground/70 mt-1">
                        Start using AI features to see your history
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            className={cn(
                'flex flex-col h-full bg-card/50 backdrop-blur-lg border-l border-border/50',
                className
            )}
        >
            {/* Header */}
            <div className="p-4 border-b border-border/50">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="text-sm font-semibold">History</h3>
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                            {data?.total || 0} requests
                        </p>
                    </div>
                </div>
            </div>

            {/* Filter */}
            <div className="p-3 border-b border-border/50">
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as typeof typeFilter)}>
                    <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="chat">Chat</SelectItem>
                        <SelectItem value="query">Query</SelectItem>
                        <SelectItem value="formula">Formula</SelectItem>
                        <SelectItem value="explain">Explain</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* History List */}
            <ScrollArea className="flex-1">
                <div className="flex flex-col gap-1 p-2">
                    {/* Loading skeleton */}
                    {isLoading && (
                        <>
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="p-3 space-y-2">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            ))}
                        </>
                    )}

                    {/* History items */}
                    {data?.data.map((request) => (
                        <div
                            key={request.id}
                            onClick={() => onSelect(request.id)}
                            className={cn(
                                'group flex flex-col gap-2 p-3 rounded-lg cursor-pointer transition-all duration-200 border border-transparent hover:bg-accent/50',
                                selectedId === request.id ? 'bg-accent border-border' : ''
                            )}
                        >
                            {/* Type Badge & Delete */}
                            <div className="flex items-center justify-between gap-2">
                                <Badge
                                    variant="outline"
                                    className={cn('h-5 px-1.5 text-[9px]', getTypeColor(request.type))}
                                >
                                    {getTypeIcon(request.type)}
                                    <span className="ml-1 capitalize">{request.type}</span>
                                </Badge>
                                {onDelete && (
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(request.id);
                                        }}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                )}
                            </div>

                            {/* Prompt */}
                            <p className="text-xs font-medium line-clamp-2 leading-snug">
                                {request.prompt}
                            </p>

                            {/* Metadata */}
                            <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
                                <div className="flex items-center gap-1">
                                    <CalendarClock className="w-2.5 h-2.5" />
                                    <span>
                                        {formatDistanceToNow(new Date(request.createdAt), {
                                            addSuffix: true,
                                        })}
                                    </span>
                                </div>
                                {request.tokensUsed > 0 && (
                                    <>
                                        <span className="text-muted-foreground/50">•</span>
                                        <span>{request.tokensUsed} tokens</span>
                                    </>
                                )}
                                {request.cost > 0 && (
                                    <>
                                        <span className="text-muted-foreground/50">•</span>
                                        <span>${request.cost.toFixed(4)}</span>
                                    </>
                                )}
                            </div>

                            {/* Validation Badge */}
                            {(request.type === 'query' || request.type === 'formula') && (
                                <Badge
                                    variant={request.isValid ? 'default' : 'destructive'}
                                    className="h-4 px-1.5 text-[8px] w-fit"
                                >
                                    {request.isValid ? '✓ Valid' : '✗ Invalid'}
                                </Badge>
                            )}
                        </div>
                    ))}
                </div>
            </ScrollArea>

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="p-3 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setPage(Math.max(0, page - 1))}
                            disabled={page === 0}
                        >
                            <ChevronLeft className="w-3 h-3 mr-1" />
                            Prev
                        </Button>
                        <span className="text-[10px] text-muted-foreground">
                            Page {page + 1} of {totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={() => setPage(Math.min(totalPages - 1, page + 1))}
                            disabled={page >= totalPages - 1}
                        >
                            Next
                            <ChevronRight className="w-3 h-3 ml-1" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
