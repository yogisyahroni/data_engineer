'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collection } from '@/lib/types/batch3';

interface MoveToCollectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    collections: Collection[];
    currentCollectionId?: string;
    onMove: (targetCollectionId: string) => Promise<void>;
    title?: string;
}

export function MoveToCollectionDialog({
    open,
    onOpenChange,
    collections,
    currentCollectionId,
    onMove,
    title = "Move Item"
}: MoveToCollectionDialogProps) {
    const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
    const [isMoving, setIsMoving] = useState(false);

    const handleMove = async () => {
        if (!selectedCollectionId) return;
        setIsMoving(true);
        try {
            await onMove(selectedCollectionId);
            onOpenChange(false);
        } catch (error) {
            console.error("Move failed:", error);
        } finally {
            setIsMoving(false);
        }
    };

    // Flatten the tree or just list all collections linear for now for simplicity
    // Ideally we show a tree selector, but a flat list with indentation is easier to implement quickly with Select
    // We can filter out the current collection to avoid no-op moves, but moving to same collection is harmless.

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>{title}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>Select Destination Folder</Label>
                        <Select value={selectedCollectionId} onValueChange={setSelectedCollectionId}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a collection..." />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="root">No Folder (Root)</SelectItem>
                                {collections.map(c => (
                                    <SelectItem key={c.id} value={c.id}>
                                        {c.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleMove} disabled={!selectedCollectionId || isMoving}>
                        {isMoving ? 'Moving...' : 'Move'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
