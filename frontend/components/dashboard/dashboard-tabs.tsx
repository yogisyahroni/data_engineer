'use client';

import React, { useState, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Dashboard tab configuration
 */
export interface DashboardTab {
    /** Unique tab identifier */
    id: string;

    /** Tab display name */
    name: string;

    /** Optional tab description */
    description?: string;

    /** Card IDs belonging to this tab */
    cardIds: string[];

    /** Optional icon name */
    icon?: string;

    /** Tab order/position */
    order: number;

    /** Whether this is the default tab */
    isDefault?: boolean;
}

/**
 * Props for DashboardTabs component
 */
export interface DashboardTabsProps {
    /** Available tabs */
    tabs: DashboardTab[];

    /** Currently active tab ID */
    activeTabId: string;

    /** Callback when tab changes */
    onTabChange: (tabId: string) => void;

    /** Callback when adding a new tab */
    onAddTab?: (tab: Omit<DashboardTab, 'id' | 'order'>) => void;

    /** Callback when removing a tab */
    onRemoveTab?: (tabId: string) => void;

    /** Callback when renaming a tab */
    onRenameTab?: (tabId: string, newName: string, newDescription?: string) => void;

    /** Callback when reordering tabs */
    onReorderTabs?: (tabs: DashboardTab[]) => void;

    /** Whether tabs are editable */
    editable?: boolean;

    /** Show card count badges */
    showCardCount?: boolean;

    /** Maximum number of tabs allowed */
    maxTabs?: number;

    /** CSS class name */
    className?: string;

    /** Children to render in tab content */
    children?: React.ReactNode;
}

/**
 * DashboardTabs Component
 * 
 * Provides multi-page/tabbed dashboard functionality
 */
export function DashboardTabs({
    tabs,
    activeTabId,
    onTabChange,
    onAddTab,
    onRemoveTab,
    onRenameTab,
    onReorderTabs,
    editable = false,
    showCardCount = true,
    maxTabs = 10,
    className,
    children,
}: DashboardTabsProps) {
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
    const [editingTab, setEditingTab] = useState<DashboardTab | null>(null);

    /**
     * Handle add new tab
     */
    const handleAddTab = useCallback(
        (name: string, description?: string) => {
            if (!onAddTab) return;

            if (tabs.length >= maxTabs) {
                toast.error(`Maximum of ${maxTabs} tabs allowed`);
                return;
            }

            onAddTab({
                name: name.trim(),
                description: description?.trim(),
                cardIds: [],
            });

            toast.success(`Tab "${name}" created`);
            setIsAddDialogOpen(false);
        },
        [onAddTab, tabs.length, maxTabs]
    );

    /**
     * Handle rename tab
     */
    const handleRenameTab = useCallback(
        (tabId: string, newName: string, newDescription?: string) => {
            if (!onRenameTab) return;

            onRenameTab(tabId, newName.trim(), newDescription?.trim());
            toast.success('Tab updated');
            setIsEditDialogOpen(false);
            setEditingTab(null);
        },
        [onRenameTab]
    );

    /**
     * Handle remove tab
     */
    const handleRemoveTab = useCallback(
        (tabId: string) => {
            if (!onRemoveTab) return;

            const tab = tabs.find((t) => t.id === tabId);
            if (!tab) return;

            if (tab.isDefault) {
                toast.error('Cannot delete the default tab');
                return;
            }

            if (tab.cardIds.length > 0) {
                toast.error(
                    `Cannot delete tab with ${tab.cardIds.length} cards. Move or delete cards first.`
                );
                return;
            }

            onRemoveTab(tabId);
            toast.success(`Tab "${tab.name}" deleted`);
        },
        [onRemoveTab, tabs]
    );

    /**
     * Open edit dialog for tab
     */
    const openEditDialog = useCallback((tab: DashboardTab) => {
        setEditingTab(tab);
        setIsEditDialogOpen(true);
    }, []);

    // Get active tab
    const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

    return (
        <div className={cn('w-full', className)}>
            <Tabs value={activeTabId} onValueChange={onTabChange}>
                <div className="flex items-center justify-between border-b bg-muted/30">
                    <TabsList className="h-12 bg-transparent border-0 rounded-none">
                        {tabs.map((tab) => (
                            <div key={tab.id} className="relative group">
                                <TabsTrigger
                                    value={tab.id}
                                    className={cn(
                                        'relative h-12 px-4 rounded-none border-b-2 border-transparent',
                                        'data-[state=active]:border-primary data-[state=active]:bg-transparent',
                                        'hover:bg-muted/50 transition-colors'
                                    )}
                                >
                                    {editable && onReorderTabs && (
                                        <GripVertical className="h-3.5 w-3.5 mr-2 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                    )}

                                    <span className="font-medium">{tab.name}</span>

                                    {showCardCount && tab.cardIds.length > 0 && (
                                        <Badge variant="secondary" className="ml-2 text-xs">
                                            {tab.cardIds.length}
                                        </Badge>
                                    )}
                                </TabsTrigger>

                                {/* Tab actions dropdown */}
                                {editable && (
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className={cn(
                                                    'absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6',
                                                    'opacity-0 group-hover:opacity-100 transition-opacity'
                                                )}
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <MoreHorizontal className="h-3.5 w-3.5" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => openEditDialog(tab)}>
                                                <Pencil className="h-4 w-4 mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleRemoveTab(tab.id)}
                                                className="text-destructive"
                                                disabled={tab.isDefault || tab.cardIds.length > 0}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                )}
                            </div>
                        ))}
                    </TabsList>

                    {/* Add tab button */}
                    {editable && onAddTab && tabs.length < maxTabs && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAddDialogOpen(true)}
                            className="gap-2 mr-2"
                        >
                            <Plus className="h-4 w-4" />
                            Add Tab
                        </Button>
                    )}
                </div>

                {/* Tab content */}
                {tabs.map((tab) => (
                    <TabsContent key={tab.id} value={tab.id} className="mt-0">
                        {children}
                    </TabsContent>
                ))}
            </Tabs>

            {/* Add Tab Dialog */}
            <AddTabDialog
                open={isAddDialogOpen}
                onOpenChange={setIsAddDialogOpen}
                onAdd={handleAddTab}
            />

            {/* Edit Tab Dialog */}
            {editingTab && (
                <EditTabDialog
                    open={isEditDialogOpen}
                    onOpenChange={setIsEditDialogOpen}
                    tab={editingTab}
                    onSave={handleRenameTab}
                />
            )}
        </div>
    );
}

/**
 * Dialog for adding a new tab
 */
function AddTabDialog({
    open,
    onOpenChange,
    onAdd,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onAdd: (name: string, description?: string) => void;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (!name.trim()) {
                toast.error('Tab name is required');
                return;
            }

            onAdd(name, description);
            setName('');
            setDescription('');
        },
        [name, description, onAdd]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Add New Tab</DialogTitle>
                        <DialogDescription>
                            Create a new tab to organize your dashboard cards.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="tab-name">Name *</Label>
                            <Input
                                id="tab-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="e.g., Sales Overview"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="tab-description">Description</Label>
                            <Textarea
                                id="tab-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description for this tab"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Create Tab</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Dialog for editing an existing tab
 */
function EditTabDialog({
    open,
    onOpenChange,
    tab,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    tab: DashboardTab;
    onSave: (tabId: string, newName: string, newDescription?: string) => void;
}) {
    const [name, setName] = useState(tab.name);
    const [description, setDescription] = useState(tab.description || '');

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();

            if (!name.trim()) {
                toast.error('Tab name is required');
                return;
            }

            onSave(tab.id, name, description);
        },
        [name, description, tab.id, onSave]
    );

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Edit Tab</DialogTitle>
                        <DialogDescription>
                            Update the tab name and description.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="edit-tab-name">Name *</Label>
                            <Input
                                id="edit-tab-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Tab name"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="edit-tab-description">Description</Label>
                            <Textarea
                                id="edit-tab-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancel
                        </Button>
                        <Button type="submit">Save Changes</Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Hook to manage dashboard tabs state
 */
export function useDashboardTabs(initialTabs: DashboardTab[] = []) {
    const [tabs, setTabs] = useState<DashboardTab[]>(initialTabs);
    const [activeTabId, setActiveTabId] = useState<string>(
        initialTabs.find((t) => t.isDefault)?.id || initialTabs[0]?.id || ''
    );

    const addTab = useCallback((tab: Omit<DashboardTab, 'id' | 'order'>) => {
        const newTab: DashboardTab = {
            ...tab,
            id: `tab-${Date.now()}`,
            order: tabs.length,
        };
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
    }, [tabs.length]);

    const removeTab = useCallback((tabId: string) => {
        setTabs((prev) => {
            const filtered = prev.filter((t) => t.id !== tabId);
            if (activeTabId === tabId && filtered.length > 0) {
                setActiveTabId(filtered[0].id);
            }
            return filtered;
        });
    }, [activeTabId]);

    const renameTab = useCallback((tabId: string, newName: string, newDescription?: string) => {
        setTabs((prev) =>
            prev.map((t) =>
                t.id === tabId ? { ...t, name: newName, description: newDescription } : t
            )
        );
    }, []);

    const reorderTabs = useCallback((newTabs: DashboardTab[]) => {
        setTabs(newTabs.map((t, index) => ({ ...t, order: index })));
    }, []);

    const addCardToTab = useCallback((tabId: string, cardId: string) => {
        setTabs((prev) =>
            prev.map((t) =>
                t.id === tabId && !t.cardIds.includes(cardId)
                    ? { ...t, cardIds: [...t.cardIds, cardId] }
                    : t
            )
        );
    }, []);

    const removeCardFromTab = useCallback((tabId: string, cardId: string) => {
        setTabs((prev) =>
            prev.map((t) =>
                t.id === tabId ? { ...t, cardIds: t.cardIds.filter((id) => id !== cardId) } : t
            )
        );
    }, []);

    const getActiveTab = useCallback(() => {
        return tabs.find((t) => t.id === activeTabId);
    }, [tabs, activeTabId]);

    return {
        tabs,
        activeTabId,
        setActiveTabId,
        addTab,
        removeTab,
        renameTab,
        reorderTabs,
        addCardToTab,
        removeCardFromTab,
        getActiveTab,
    };
}
