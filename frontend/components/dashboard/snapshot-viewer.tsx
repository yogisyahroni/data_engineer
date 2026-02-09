'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
    History,
    Save,
    RotateCcw,
    Trash2,
    MoreHorizontal,
    Clock,
    User,
    FileText,
    Download,
    GitCompare,
    CheckCircle2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

/**
 * Dashboard snapshot data structure
 */
export interface DashboardSnapshot {
    /** Unique snapshot identifier */
    id: string;

    /** Dashboard ID this snapshot belongs to */
    dashboardId: string;

    /** Snapshot name */
    name: string;

    /** Optional description */
    description?: string;

    /** Timestamp when snapshot was created */
    timestamp: string;

    /** User who created the snapshot */
    userId: string;

    /** Username for display */
    userName?: string;

    /** Snapshot data */
    data: {
        /** Dashboard cards */
        cards: any[];

        /** Layout configuration */
        layout: any[];

        /** Active filters */
        filters: any[];

        /** Dashboard tabs (if applicable) */
        tabs?: any[];

        /** Additional metadata */
        [key: string]: any;
    };

    /** Snapshot metadata */
    metadata: {
        /** Number of cards */
        cardCount: number;

        /** Number of filters */
        filterCount: number;

        /** Dashboard version */
        version: string;

        /** Additional metadata */
        [key: string]: any;
    };
}

/**
 * Props for SnapshotViewer component
 */
export interface SnapshotViewerProps {
    /** Dashboard identifier */
    dashboardId: string;

    /** Available snapshots */
    snapshots: DashboardSnapshot[];

    /** Callback to save a new snapshot */
    onSaveSnapshot: (name: string, description?: string) => Promise<void>;

    /** Callback to restore a snapshot */
    onRestoreSnapshot: (snapshotId: string) => Promise<void>;

    /** Callback to delete a snapshot */
    onDeleteSnapshot: (snapshotId: string) => Promise<void>;

    /** Optional callback to compare snapshots */
    onCompareSnapshots?: (snapshot1Id: string, snapshot2Id: string) => void;

    /** Optional callback to download snapshot */
    onDownloadSnapshot?: (snapshotId: string) => void;

    /** Whether user can create snapshots */
    canCreate?: boolean;

    /** Whether user can delete snapshots */
    canDelete?: boolean;

    /** Whether user can restore snapshots */
    canRestore?: boolean;

    /** Loading state */
    isLoading?: boolean;

    /** CSS class name */
    className?: string;
}

/**
 * SnapshotViewer Component
 * 
 * Manages dashboard snapshots and history
 */
export function SnapshotViewer({
    dashboardId,
    snapshots,
    onSaveSnapshot,
    onRestoreSnapshot,
    onDeleteSnapshot,
    onCompareSnapshots,
    onDownloadSnapshot,
    canCreate = true,
    canDelete = true,
    canRestore = true,
    isLoading = false,
    className,
}: SnapshotViewerProps) {
    const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
    const [restoreSnapshotId, setRestoreSnapshotId] = useState<string | null>(null);
    const [deleteSnapshotId, setDeleteSnapshotId] = useState<string | null>(null);
    const [selectedSnapshots, setSelectedSnapshots] = useState<string[]>([]);

    /**
     * Handle save new snapshot
     */
    const handleSaveSnapshot = useCallback(
        async (name: string, description?: string) => {
            try {
                await onSaveSnapshot(name, description);
                toast.success('Snapshot saved successfully');
                setIsSaveDialogOpen(false);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to save snapshot';
                toast.error(message);
            }
        },
        [onSaveSnapshot]
    );

    /**
     * Handle restore snapshot
     */
    const handleRestoreSnapshot = useCallback(
        async (snapshotId: string) => {
            try {
                await onRestoreSnapshot(snapshotId);
                toast.success('Snapshot restored successfully');
                setRestoreSnapshotId(null);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to restore snapshot';
                toast.error(message);
            }
        },
        [onRestoreSnapshot]
    );

    /**
     * Handle delete snapshot
     */
    const handleDeleteSnapshot = useCallback(
        async (snapshotId: string) => {
            try {
                await onDeleteSnapshot(snapshotId);
                toast.success('Snapshot deleted');
                setDeleteSnapshotId(null);
            } catch (error) {
                const message = error instanceof Error ? error.message : 'Failed to delete snapshot';
                toast.error(message);
            }
        },
        [onDeleteSnapshot]
    );

    /**
     * Toggle snapshot selection for comparison
     */
    const toggleSnapshotSelection = useCallback((snapshotId: string) => {
        setSelectedSnapshots((prev) => {
            if (prev.includes(snapshotId)) {
                return prev.filter((id) => id !== snapshotId);
            }
            if (prev.length >= 2) {
                toast.warning('You can only compare 2 snapshots at a time');
                return prev;
            }
            return [...prev, snapshotId];
        });
    }, []);

    /**
     * Compare selected snapshots
     */
    const handleCompareSnapshots = useCallback(() => {
        if (selectedSnapshots.length !== 2) {
            toast.error('Please select exactly 2 snapshots to compare');
            return;
        }

        if (onCompareSnapshots) {
            onCompareSnapshots(selectedSnapshots[0], selectedSnapshots[1]);
            setSelectedSnapshots([]);
        } else {
            toast.info('Snapshot comparison not available');
        }
    }, [selectedSnapshots, onCompareSnapshots]);

    // Sort snapshots by timestamp (newest first)
    const sortedSnapshots = useMemo(() => {
        return [...snapshots].sort(
            (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
    }, [snapshots]);

    // Snapshot to restore
    const restoreSnapshot = snapshots.find((s) => s.id === restoreSnapshotId);
    const deleteSnapshot = snapshots.find((s) => s.id === deleteSnapshotId);

    return (
        <div className={cn('flex flex-col gap-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <History className="h-5 w-5 text-muted-foreground" />
                    <div>
                        <h3 className="text-lg font-semibold">Snapshot History</h3>
                        <p className="text-sm text-muted-foreground">
                            {snapshots.length} snapshot{snapshots.length !== 1 ? 's' : ''} saved
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    {selectedSnapshots.length === 2 && onCompareSnapshots && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleCompareSnapshots}
                            className="gap-2"
                        >
                            <GitCompare className="h-4 w-4" />
                            Compare
                        </Button>
                    )}

                    {canCreate && (
                        <Button
                            onClick={() => setIsSaveDialogOpen(true)}
                            size="sm"
                            className="gap-2"
                        >
                            <Save className="h-4 w-4" />
                            Save Snapshot
                        </Button>
                    )}
                </div>
            </div>

            <Separator />

            {/* Snapshot list */}
            <ScrollArea className="h-[500px] pr-4">
                {sortedSnapshots.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12 text-center">
                        <History className="h-12 w-12 text-muted-foreground/50 mb-4" />
                        <h4 className="text-lg font-medium text-muted-foreground">No snapshots yet</h4>
                        <p className="text-sm text-muted-foreground mt-2">
                            Save your first snapshot to preserve the current state
                        </p>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {sortedSnapshots.map((snapshot) => (
                            <SnapshotCard
                                key={snapshot.id}
                                snapshot={snapshot}
                                isSelected={selectedSnapshots.includes(snapshot.id)}
                                onSelect={toggleSnapshotSelection}
                                onRestore={() => setRestoreSnapshotId(snapshot.id)}
                                onDelete={() => setDeleteSnapshotId(snapshot.id)}
                                onDownload={onDownloadSnapshot}
                                canRestore={canRestore}
                                canDelete={canDelete}
                                canCompare={!!onCompareSnapshots}
                            />
                        ))}
                    </div>
                )}
            </ScrollArea>

            {/* Save snapshot dialog */}
            <SaveSnapshotDialog
                open={isSaveDialogOpen}
                onOpenChange={setIsSaveDialogOpen}
                onSave={handleSaveSnapshot}
            />

            {/* Restore confirmation dialog */}
            <AlertDialog
                open={!!restoreSnapshotId}
                onOpenChange={(open) => !open && setRestoreSnapshotId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Restore Snapshot?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will replace the current dashboard with the snapshot{' '}
                            <strong>{restoreSnapshot?.name}</strong>. Your current changes will be lost unless
                            you save a snapshot first.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => restoreSnapshotId && handleRestoreSnapshot(restoreSnapshotId)}
                        >
                            Restore
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Delete confirmation dialog */}
            <AlertDialog
                open={!!deleteSnapshotId}
                onOpenChange={(open) => !open && setDeleteSnapshotId(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Snapshot?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete the snapshot{' '}
                            <strong>{deleteSnapshot?.name}</strong>? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteSnapshotId && handleDeleteSnapshot(deleteSnapshotId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

/**
 * Individual snapshot card
 */
function SnapshotCard({
    snapshot,
    isSelected,
    onSelect,
    onRestore,
    onDelete,
    onDownload,
    canRestore,
    canDelete,
    canCompare,
}: {
    snapshot: DashboardSnapshot;
    isSelected: boolean;
    onSelect: (id: string) => void;
    onRestore: () => void;
    onDelete: () => void;
    onDownload?: (id: string) => void;
    canRestore: boolean;
    canDelete: boolean;
    canCompare: boolean;
}) {
    const timeAgo = useMemo(() => {
        try {
            return formatDistanceToNow(new Date(snapshot.timestamp), { addSuffix: true });
        } catch {
            return 'Unknown time';
        }
    }, [snapshot.timestamp]);

    return (
        <div
            className={cn(
                'group relative p-4 border rounded-lg bg-card hover:border-primary/50 transition-colors cursor-pointer',
                isSelected && 'border-primary bg-primary/5'
            )}
            onClick={() => canCompare && onSelect(snapshot.id)}
        >
            {/* Selection indicator */}
            {canCompare && (
                <div className="absolute top-3 left-3">
                    <div
                        className={cn(
                            'h-5 w-5 rounded border-2 flex items-center justify-center transition-colors',
                            isSelected
                                ? 'bg-primary border-primary'
                                : 'border-muted-foreground group-hover:border-primary'
                        )}
                    >
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-primary-foreground" />}
                    </div>
                </div>
            )}

            {/* Content */}
            <div className={cn('grid gap-3', canCompare && 'ml-8')}>
                {/* Header */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h4 className="font-medium leading-none">{snapshot.name}</h4>
                        {snapshot.description && (
                            <p className="text-sm text-muted-foreground mt-1.5">{snapshot.description}</p>
                        )}
                    </div>

                    {/* Actions menu */}
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            {canRestore && (
                                <DropdownMenuItem onClick={onRestore}>
                                    <RotateCcw className="h-4 w-4 mr-2" />
                                    Restore
                                </DropdownMenuItem>
                            )}
                            {onDownload && (
                                <DropdownMenuItem onClick={() => onDownload(snapshot.id)}>
                                    <Download className="h-4 w-4 mr-2" />
                                    Download
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onClick={onDelete} className="text-destructive">
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                {/* Metadata */}
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5" />
                        <span>{timeAgo}</span>
                    </div>

                    {snapshot.userName && (
                        <div className="flex items-center gap-1.5">
                            <User className="h-3.5 w-3.5" />
                            <span>{snapshot.userName}</span>
                        </div>
                    )}

                    <div className="flex items-center gap-1.5">
                        <FileText className="h-3.5 w-3.5" />
                        <span>{snapshot.metadata.cardCount} cards</span>
                    </div>
                </div>

                {/* Version badge */}
                {snapshot.metadata.version && (
                    <Badge variant="outline" className="w-fit text-xs">
                        v{snapshot.metadata.version}
                    </Badge>
                )}
            </div>
        </div>
    );
}

/**
 * Dialog for saving a new snapshot
 */
function SaveSnapshotDialog({
    open,
    onOpenChange,
    onSave,
}: {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSave: (name: string, description?: string) => Promise<void>;
}) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const handleSubmit = useCallback(
        async (e: React.FormEvent) => {
            e.preventDefault();

            if (!name.trim()) {
                toast.error('Snapshot name is required');
                return;
            }

            setIsSaving(true);

            try {
                await onSave(name.trim(), description.trim() || undefined);
                setName('');
                setDescription('');
            } finally {
                setIsSaving(false);
            }
        },
        [name, description, onSave]
    );

    // Auto-generate default name
    const generateDefaultName = useCallback(() => {
        const now = new Date();
        const dateStr = now.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
        const timeStr = now.toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
        });
        return `Snapshot - ${dateStr} at ${timeStr}`;
    }, []);

    // Set default name when dialog opens
    React.useEffect(() => {
        if (open && !name) {
            setName(generateDefaultName());
        }
    }, [open, name, generateDefaultName]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <form onSubmit={handleSubmit}>
                    <DialogHeader>
                        <DialogTitle>Save Snapshot</DialogTitle>
                        <DialogDescription>
                            Create a snapshot of the current dashboard state
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="grid gap-2">
                            <Label htmlFor="snapshot-name">Name *</Label>
                            <Input
                                id="snapshot-name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Snapshot name"
                                autoFocus
                                required
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="snapshot-description">Description</Label>
                            <Textarea
                                id="snapshot-description"
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Optional description of what this snapshot represents"
                                rows={3}
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={isSaving}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isSaving}>
                            {isSaving ? 'Saving...' : 'Save Snapshot'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
