'use client';

import { useMemo } from 'react';
import {
    Folder,
    ChevronRight,
    ChevronDown,
    MoreHorizontal,
    Plus,
    Lock,
    Globe,
    Settings
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

interface CollectionTreeItemProps {
    item: any;
    level: number;
    activeId?: string;
    onSelect: (id: string) => void;
    onAddSub: (id: string) => void;
    expandedIds: Set<string>;
    toggleExpand: (id: string) => void;
}

function CollectionTreeItem({
    item,
    level,
    activeId,
    onSelect,
    onAddSub,
    expandedIds,
    toggleExpand
}: CollectionTreeItemProps) {
    const isExpanded = expandedIds.has(item.id);
    const hasChildren = item.children && item.children.length > 0;
    const isActive = activeId === item.id;

    return (
        <div className="space-y-1">
            <div
                className={cn(
                    "group flex items-center gap-2 py-1.5 px-2 rounded-md transition-colors cursor-pointer",
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                )}
                style={{ paddingLeft: `${level * 12 + 8}px` }}
                onClick={() => onSelect(item.id)}
            >
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(item.id);
                    }}
                    className="p-0.5 hover:bg-muted rounded"
                >
                    {hasChildren ? (
                        isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                        <div className="w-3.5 h-3.5" />
                    )}
                </button>

                <Folder className={cn("w-4 h-4", isActive ? "text-primary fill-primary/10" : "text-muted-foreground")} />

                <span className="text-sm font-medium truncate flex-1">{item.name}</span>

                {!item.isPublic && <Lock className="w-3 h-3 opacity-50" />}
                {item.isPublic && <Globe className="w-3 h-3 opacity-50 text-blue-500" />}

                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                        variant="ghost"
                        size="icon"
                        className="w-6 h-6"
                        onClick={(e) => {
                            e.stopPropagation();
                            onAddSub(item.id);
                        }}
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="w-6 h-6"
                                onClick={(e) => e.stopPropagation()}
                            >
                                <MoreHorizontal className="w-3 h-3" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2">
                                <Settings className="w-4 h-4" />
                                Collection Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive gap-2">
                                <MoreHorizontal className="w-4 h-4" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            </div>

            {isExpanded && hasChildren && (
                <div className="space-y-1">
                    {item.children.map((child: any) => (
                        <CollectionTreeItem
                            key={child.id}
                            item={child}
                            level={level + 1}
                            activeId={activeId}
                            onSelect={onSelect}
                            onAddSub={onAddSub}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

interface CollectionSidebarProps {
    tree: any[];
    activeId?: string;
    onSelect: (id: string) => void;
    onAddRoot: () => void;
    onAddSub: (parentId: string) => void;
}

import { useState as useReactState } from 'react';

export function CollectionSidebar({
    tree,
    activeId,
    onSelect,
    onAddRoot,
    onAddSub
}: CollectionSidebarProps) {
    const [expandedIds, setExpandedIds] = useReactState<Set<string>>(new Set());

    const toggleExpand = (id: string) => {
        const next = new Set(expandedIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setExpandedIds(next);
    };

    return (
        <div className="flex flex-col h-full bg-card border-r border-border w-64 overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-sm font-semibold tracking-tight uppercase text-muted-foreground">Collections</h2>
                <Button variant="ghost" size="icon" className="w-7 h-7" onClick={onAddRoot}>
                    <Plus className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
                {tree.length === 0 ? (
                    <div className="p-4 text-center">
                        <p className="text-xs text-muted-foreground italic">No collections yet</p>
                    </div>
                ) : (
                    tree.map((item) => (
                        <CollectionTreeItem
                            key={item.id}
                            item={item}
                            level={0}
                            activeId={activeId}
                            onSelect={onSelect}
                            onAddSub={onAddSub}
                            expandedIds={expandedIds}
                            toggleExpand={toggleExpand}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
