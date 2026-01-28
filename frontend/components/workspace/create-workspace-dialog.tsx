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
import { useToast } from '@/hooks/use-toast';

interface CreateWorkspaceDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onWorkspaceCreated?: (workspace: any) => void;
}

export function CreateWorkspaceDialog({
    open,
    onOpenChange,
    onWorkspaceCreated,
}: CreateWorkspaceDialogProps) {
    const [name, setName] = useState('');
    const [slug, setSlug] = useState('');
    const [loading, setLoading] = useState(false);
    const { toast } = useToast();

    const handleNameChange = (value: string) => {
        setName(value);
        // Auto-generate slug from name
        const autoSlug = value
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)/g, '');
        setSlug(autoSlug);
    };

    const handleCreate = async () => {
        if (!name.trim() || !slug.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Name and slug are required',
                variant: 'destructive',
            });
            return;
        }

        setLoading(true);
        try {
            const response = await fetch('/api/workspaces', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, slug }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to create workspace');
            }

            const workspace = await response.json();
            toast({
                title: 'Success',
                description: 'Workspace created successfully',
            });

            setName('');
            setSlug('');
            onWorkspaceCreated?.(workspace);
        } catch (error: any) {
            toast({
                title: 'Error',
                description: error.message,
                variant: 'destructive',
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create New Workspace</DialogTitle>
                    <DialogDescription>
                        Create a workspace to organize your dashboards and team members.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="workspace-name">Workspace Name</Label>
                        <Input
                            id="workspace-name"
                            placeholder="My Team Workspace"
                            value={name}
                            onChange={(e) => handleNameChange(e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="workspace-slug">Slug</Label>
                        <Input
                            id="workspace-slug"
                            placeholder="my-team-workspace"
                            value={slug}
                            onChange={(e) => setSlug(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            URL: /workspace/{slug || 'your-slug'}
                        </p>
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleCreate} disabled={loading}>
                        {loading ? 'Creating...' : 'Create Workspace'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
