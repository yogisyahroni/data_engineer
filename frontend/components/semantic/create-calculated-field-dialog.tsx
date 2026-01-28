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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface CalculatedField {
    id?: string;
    name: string;
    expression: string;
    description?: string;
    type: 'column' | 'measure';
    dataType: 'number' | 'string' | 'date' | 'boolean';
}

interface CreateCalculatedFieldDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    connectionId: string;
    onSave: (field: CalculatedField) => Promise<void>;
}

export function CreateCalculatedFieldDialog({
    open,
    onOpenChange,
    connectionId,
    onSave
}: CreateCalculatedFieldDialogProps) {
    const [name, setName] = useState('');
    const [expression, setExpression] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'column' | 'measure'>('measure');
    const [dataType, setDataType] = useState<'number' | 'string' | 'date' | 'boolean'>('number');
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name || !expression) {
            toast.error('Name and expression are required');
            return;
        }

        setSaving(true);
        try {
            await onSave({
                name,
                expression,
                description,
                type,
                dataType
            });
            toast.success('Calculated field created');
            onOpenChange(false);
            // Reset form
            setName('');
            setExpression('');
            setDescription('');
            setType('measure');
            setDataType('number');
        } catch (error: any) {
            toast.error(error.message || 'Failed to create calculated field');
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Create Calculated Field</DialogTitle>
                    <DialogDescription>
                        Define custom business logic without modifying your database.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="field-name">Name</Label>
                        <Input
                            id="field-name"
                            placeholder="e.g., Total Revenue"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="field-type">Type</Label>
                            <Select value={type} onValueChange={(v: any) => setType(v)}>
                                <SelectTrigger id="field-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="column">Calculated Column</SelectItem>
                                    <SelectItem value="measure">Measure (Aggregation)</SelectItem>
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-muted-foreground">
                                {type === 'column' ? 'Computed per row' : 'Aggregated across rows'}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="data-type">Data Type</Label>
                            <Select value={dataType} onValueChange={(v: any) => setDataType(v)}>
                                <SelectTrigger id="data-type">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="number">Number</SelectItem>
                                    <SelectItem value="string">Text</SelectItem>
                                    <SelectItem value="date">Date</SelectItem>
                                    <SelectItem value="boolean">Boolean</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="expression">Expression (SQL)</Label>
                        <Textarea
                            id="expression"
                            placeholder="e.g., SUM(amount * quantity)"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            rows={4}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use SQL syntax. Examples: SUM(price * quantity), CONCAT(first_name, ' ', last_name)
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description (Optional)</Label>
                        <Input
                            id="description"
                            placeholder="Business logic explanation"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Creating...' : 'Create Field'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
