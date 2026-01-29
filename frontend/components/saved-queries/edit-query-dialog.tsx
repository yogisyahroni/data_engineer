'use client';

import { useState, useEffect } from 'react';
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
import { X, Plus, Loader2 } from 'lucide-react';
import type { SavedQuery } from '@/lib/types';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface EditQueryDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    query: SavedQuery | null;
    onSave: (id: string, updates: Partial<SavedQuery>) => Promise<void>;
}

export function EditQueryDialog({
    open,
    onOpenChange,
    query,
    onSave,
}: EditQueryDialogProps) {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [isSaving, setIsSaving] = useState(false);

    const [status, setStatus] = useState<'draft' | 'verified' | 'deprecated'>('draft');
    const [glossary, setGlossary] = useState('');

    // Initialize form when query changes
    useEffect(() => {
        if (query) {
            setName(query.name);
            setDescription(query.description || '');
            setTags(query.tags || []);
            setStatus(query.certificationStatus || 'draft');
            setGlossary(query.businessGlossary || '');
        }
    }, [query]);

    const handleAddTag = () => {
        if (newTag.trim() && !tags.includes(newTag.trim())) {
            setTags([...tags, newTag.trim()]);
            setNewTag('');
        }
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter((tag) => tag !== tagToRemove));
    };

    const handleSave = async () => {
        if (!query) return;

        try {
            setIsSaving(true);
            await onSave(query.id, {
                name,
                description,
                tags,
                certificationStatus: status,
                businessGlossary: glossary,
            });
            onOpenChange(false);
        } catch (error) {
            console.error('Failed to save query:', error);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>Edit Query & Governance</DialogTitle>
                    <DialogDescription>
                        Manage query details, tags, and certification status.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="governance">Governance</TabsTrigger>
                    </TabsList>

                    <div className="py-4">
                        <TabsContent value="details" className="space-y-4 m-0">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Query Name"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    placeholder="Describe what this query does..."
                                    className="resize-none h-20"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tags</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {tags.map((tag) => (
                                        <Badge key={tag} variant="secondary">
                                            {tag}
                                            <button
                                                onClick={() => removeTag(tag)}
                                                className="ml-1 hover:text-destructive focus:outline-none"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        </Badge>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        value={newTag}
                                        onChange={(e) => setNewTag(e.target.value)}
                                        placeholder="Add tag..."
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                e.preventDefault();
                                                handleAddTag();
                                            }
                                        }}
                                    />
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        onClick={handleAddTag}
                                        disabled={!newTag.trim()}
                                    >
                                        <Plus className="w-4 h-4" />
                                    </Button>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Press Enter to add a tag
                                </p>
                            </div>
                        </TabsContent>

                        <TabsContent value="governance" className="space-y-4 m-0">
                            <div className="space-y-2">
                                <Label htmlFor="status">Certification Status</Label>
                                <Select
                                    value={status}
                                    onValueChange={(value: 'draft' | 'verified' | 'deprecated') => setStatus(value)}
                                >
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">Draft (Experimental)</SelectItem>
                                        <SelectItem value="verified">Verified (Official)</SelectItem>
                                        <SelectItem value="deprecated">Deprecated (Do not use)</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-xs text-muted-foreground">
                                    Verified queries appear with a badge in the Catalog.
                                </p>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="glossary">Business Glossary</Label>
                                <Textarea
                                    id="glossary"
                                    value={glossary}
                                    onChange={(e) => setGlossary(e.target.value)}
                                    placeholder="Explain the business logic, exclusions, and data sources in detail..."
                                    className="resize-none h-40"
                                />
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={isSaving}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={isSaving || !name.trim()}>
                        {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
