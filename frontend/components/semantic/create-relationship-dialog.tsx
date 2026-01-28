'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

interface VirtualRelationship {
    id?: string;
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface CreateRelationshipDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    connectionId: string;
    tables: { name: string; columns: { name: string }[] }[];
    onSave: (relationship: VirtualRelationship) => Promise<void>;
}

export function CreateRelationshipDialog({
    open,
    onOpenChange,
    connectionId,
    tables,
    onSave
}: CreateRelationshipDialogProps) {
    const [fromTable, setFromTable] = useState('');
    const [fromColumn, setFromColumn] = useState('');
    const [toTable, setToTable] = useState('');
    const [toColumn, setToColumn] = useState('');
    const [type, setType] = useState<'one-to-one' | 'one-to-many' | 'many-to-many'>('one-to-many');
    const [saving, setSaving] = useState(false);

    const fromTableColumns = tables.find(t => t.name === fromTable)?.columns || [];
    const toTableColumns = tables.find(t => t.name === toTable)?.columns || [];

    const handleSave = async () => {
        if (!fromTable || !fromColumn || !toTable || !toColumn) {
            toast.error('All fields are required');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                fromTable,
                fromColumn,
                toTable,
                toColumn,
                type
            });
            toast.success('Relationship created');
            onOpenChange(false);
            // Reset form
            setFromTable('');
            setFromColumn('');
            setToTable('');
            setToColumn('');
            setType('one-to-many');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create relationship');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create Virtual Relationship</DialogTitle>
                    <DialogDescription>
                        Define how tables relate to each other, even without physical foreign keys.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {/* From Table */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="from-table">From Table</Label>
                            <Select value={fromTable} onValueChange={setFromTable}>
                                <SelectTrigger id="from-table">
                                    <SelectValue placeholder="Select table" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tables.map(table => (
                                        <SelectItem key={table.name} value={table.name}>
                                            {table.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="from-column">Column</Label>
                            <Select value={fromColumn} onValueChange={setFromColumn} disabled={!fromTable}>
                                <SelectTrigger id="from-column">
                                    <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                    {fromTableColumns.map(col => (
                                        <SelectItem key={col.name} value={col.name}>
                                            {col.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Relationship Type */}
                    <div className="space-y-2">
                        <Label htmlFor="rel-type">Relationship Type</Label>
                        <Select value={type} onValueChange={(v: any) => setType(v)}>
                            <SelectTrigger id="rel-type">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="one-to-one">One-to-One</SelectItem>
                                <SelectItem value="one-to-many">One-to-Many</SelectItem>
                                <SelectItem value="many-to-many">Many-to-Many</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {/* To Table */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="to-table">To Table</Label>
                            <Select value={toTable} onValueChange={setToTable}>
                                <SelectTrigger id="to-table">
                                    <SelectValue placeholder="Select table" />
                                </SelectTrigger>
                                <SelectContent>
                                    {tables.map(table => (
                                        <SelectItem key={table.name} value={table.name}>
                                            {table.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="to-column">Column</Label>
                            <Select value={toColumn} onValueChange={setToColumn} disabled={!toTable}>
                                <SelectTrigger id="to-column">
                                    <SelectValue placeholder="Select column" />
                                </SelectTrigger>
                                <SelectContent>
                                    {toTableColumns.map(col => (
                                        <SelectItem key={col.name} value={col.name}>
                                            {col.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Creating...' : 'Create Relationship'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
