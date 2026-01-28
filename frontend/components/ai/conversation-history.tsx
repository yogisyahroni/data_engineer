
'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageSquare, CalendarClock, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

export interface HistoryItem {
    id: string;
    prompt: string;
    timestamp: number;
}

interface ConversationHistoryProps {
    items: HistoryItem[];
    selectedId?: string;
    onSelect: (id: string) => void;
    onDelete: (id: string, e: React.MouseEvent) => void;
}

export function ConversationHistory({ items, selectedId, onSelect, onDelete }: ConversationHistoryProps) {
    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-40 text-muted-foreground p-4 text-center">
                <MessageSquare className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-sm">No history yet</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-full">
            <div className="flex flex-col gap-1 p-2">
                {items.map((item) => (
                    <div
                        key={item.id}
                        onClick={() => onSelect(item.id)}
                        className={cn(
                            "group flex flex-col gap-1 p-3 rounded-lg cursor-pointer transition-colors border border-transparent hover:bg-accent/50",
                            selectedId === item.id ? "bg-accent border-border" : ""
                        )}
                    >
                        <div className="flex items-start justify-between gap-2">
                            <span className="text-sm font-medium line-clamp-2 leading-snug">
                                {item.prompt}
                            </span>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 text-muted-foreground hover:text-destructive"
                                onClick={(e) => onDelete(item.id, e)}
                            >
                                <Trash2 className="w-3 h-3" />
                            </Button>
                        </div>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <CalendarClock className="w-3 h-3" />
                            <span>{formatDistanceToNow(item.timestamp, { addSuffix: true })}</span>
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
