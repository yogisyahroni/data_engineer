'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Save, X, Tag } from 'lucide-react';
import { toast } from 'sonner';
import { VisualQueryConfig } from '@/lib/query-builder/types';

interface SaveQueryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    config: VisualQueryConfig;
    workspaceId: string;
    existingQueryId?: string;
    existingName?: string;
    existingDescription?: string;
    existingTags?: string[];
}

export function SaveQueryDialog({
    open,
    onOpenChange,
    config,
    workspaceId,
    existingQueryId,
    existingName = '',
    existingDescription = '',
    existingTags = [],
}: SaveQueryDialogProps) {
    const [name, setName] = useState(existingName);
    const [description, setDescription] = useState(existingDescription);
    const [tagInput, setTagInput] = useState('');
    const [tags, setTags] = useState<string[]>(existingTags);
    const [saving, setSaving] = useState(false);

    const isUpdate = !!existingQueryId;

    const handleAddTag = () => {
        const trimmed = tagInput.trim();
        if (trimmed && !tags.includes(trimmed)) {
            setTags([...tags, trimmed]);
            setTagInput('');
        }
    };

    const handleRemoveTag = (tag: string) => {
        setTags(tags.filter((t) => t !== tag));
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleAddTag();
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error('Query name is required');
            return;
        }

        setSaving(true);

        try {
            const endpoint = isUpdate
                ? `/api/visual-queries/${existingQueryId}`
                : '/api/visual-queries';

            const method = isUpdate ? 'PUT' : 'POST';

            const response = await fetch(endpoint, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.trim(),
                    description: description.trim() || undefined,
                    tags: tags.length > 0 ? tags : undefined,
                    config,
                    workspace_id: workspaceId,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to save query');
            }

            const result = await response.json();

            toast.success(
                isUpdate
                    ? 'Query updated successfully'
                    : `Query saved successfully (ID: ${result.id})`
            );

            onOpenChange(false);

            // Reset form if creating new
            if (!isUpdate) {
                setName('');
                setDescription('');
                setTags([]);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            toast.error('Failed to save query: ' + message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Save className="h-5 w-5" />
                        {isUpdate ? 'Update Query' : 'Save Query'}
                    </DialogTitle>
                    <DialogDescription>
                        {isUpdate
                            ? 'Update the saved query with current configuration.'
                            : 'Save this visual query for future use.'}
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Query Name */}
                    <div className="space-y-2">
                        <Label htmlFor="query-name">
                            Query Name <span className="text-destructive">*</span>
                        </Label>
                        <Input
                            id="query-name"
                            placeholder="e.g., Monthly Sales Report"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            disabled={saving}
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-2">
                        <Label htmlFor="query-description">Description</Label>
                        <Textarea
                            id="query-description"
                            placeholder="Describe what this query does..."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            disabled={saving}
                            rows={3}
                        />
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label htmlFor="query-tags">Tags</Label>
                        <div className="flex gap-2">
                            <Input
                                id="query-tags"
                                placeholder="Add a tag and press Enter..."
                                value={tagInput}
                                onChange={(e) => setTagInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                disabled={saving}
                            />
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={handleAddTag}
                                disabled={!tagInput.trim() || saving}
                            >
                                <Tag className="h-4 w-4" />
                            </Button>
                        </div>

                        {tags.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                                {tags.map((tag) => (
                                    <Badge key={tag} variant="secondary" className="gap-1">
                                        {tag}
                                        <button
                                            onClick={() => handleRemoveTag(tag)}
                                            className="ml-1 rounded-sm hover:bg-muted p-0.5"
                                            disabled={saving}
                                        >
                                            <X className="h-3 w-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Query Statistics */}
                    <div className="pt-2 border-t">
                        <p className="text-xs text-muted-foreground mb-2">
                            Query Configuration:
                        </p>
                        <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Tables</span>
                                <span className="font-medium">{config.tables.length}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Joins</span>
                                <span className="font-medium">{config.joins.length}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Columns</span>
                                <span className="font-medium">{config.columns.length}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Filters</span>
                                <span className="font-medium">
                                    {config.filters.conditions.length}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Aggregations</span>
                                <span className="font-medium">
                                    {config.aggregations.length}
                                </span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-muted-foreground">Group By</span>
                                <span className="font-medium">{config.groupBy.length}</span>
                            </div>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={saving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {isUpdate ? 'Update' : 'Save'} Query
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
