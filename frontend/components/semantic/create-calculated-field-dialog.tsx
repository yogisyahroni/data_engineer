'use client';

import { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
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
import { validateExpression } from '@/lib/semantic/expression-validator';

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
    modelId?: string;
    existingMetrics?: string[];
    onSave: (field: CalculatedField) => Promise<void>;
}

export function CreateCalculatedFieldDialog({
    open,
    onOpenChange,
    connectionId,
    modelId,
    existingMetrics = [],
    onSave
}: CreateCalculatedFieldDialogProps) {
    const [name, setName] = useState('');
    const [expression, setExpression] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<'column' | 'measure'>('measure');
    const [dataType, setDataType] = useState<'number' | 'string' | 'date' | 'boolean'>('number');
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);
    const [aiPrompt, setAiPrompt] = useState('');
    const [showAiPrompt, setShowAiPrompt] = useState(false);

    const handleSave = async () => {
        if (!name || !expression) {
            toast.error('Name and expression are required');
            return;
        }

        // Validate Expression
        const validation = validateExpression(expression, existingMetrics);
        if (!validation.valid) {
            toast.error(validation.error || 'Invalid expression');
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

    const handleGenerateWithAI = async () => {
        if (!modelId) {
            toast.error('Model ID is required for AI generation');
            return;
        }

        if (!aiPrompt.trim()) {
            toast.error('Please describe the metric you want to create');
            return;
        }

        setGenerating(true);
        try {
            const res = await fetch('/api/ai/generate-formula', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompt: aiPrompt,
                    modelId
                })
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to generate formula');
            }

            const data = await res.json();
            setExpression(data.expression);
            if (data.explanation) {
                setDescription(data.explanation);
            }
            toast.success('Formula generated successfully');
            setShowAiPrompt(false);
            setAiPrompt('');
        } catch (error: any) {
            toast.error(error.message || 'Failed to generate formula');
        } finally {
            setGenerating(false);
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
                        <div className="flex items-center justify-between">
                            <Label htmlFor="expression">Expression (SQL)</Label>
                            {modelId && (
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setShowAiPrompt(!showAiPrompt)}
                                    className="h-7 text-xs"
                                >
                                    <Sparkles className="w-3 h-3 mr-1" />
                                    Generate with AI
                                </Button>
                            )}
                        </div>

                        {showAiPrompt && (
                            <div className="p-3 bg-muted/50 rounded-lg border border-border space-y-2">
                                <Label htmlFor="ai-prompt" className="text-xs">Describe your metric</Label>
                                <Input
                                    id="ai-prompt"
                                    placeholder="e.g., profit margin as percentage"
                                    value={aiPrompt}
                                    onChange={(e) => setAiPrompt(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && !generating) {
                                            handleGenerateWithAI();
                                        }
                                    }}
                                    className="text-sm"
                                />
                                <Button
                                    type="button"
                                    size="sm"
                                    onClick={handleGenerateWithAI}
                                    disabled={generating}
                                    className="w-full h-7 text-xs"
                                >
                                    {generating ? (
                                        <>
                                            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            Generating...
                                        </>
                                    ) : (
                                        <>
                                            <Sparkles className="w-3 h-3 mr-1" />
                                            Generate
                                        </>
                                    )}
                                </Button>
                            </div>
                        )}

                        <Textarea
                            id="expression"
                            placeholder="e.g., SUM(amount * quantity)"
                            value={expression}
                            onChange={(e) => setExpression(e.target.value)}
                            rows={4}
                            className="font-mono text-sm"
                        />
                        <p className="text-xs text-muted-foreground">
                            Use SQL syntax. Variables: {'${MetricName}'}. Examples: SUM(price * quantity), ({'${Revenue}'} - {'${Cost}'})
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
