'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Grid3x3, LayoutGrid, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { useWorkspace } from '@/hooks/use-workspace';

interface Canvas {
    id: string;
    name: string;
    description: string | null;
    layout: string;
    gridSize: number;
    createdAt: string;
    updatedAt: string;
    creator: {
        id: string;
        name: string | null;
        email: string;
    };
    _count: {
        widgets: number;
    };
}

export default function CanvasPage() {
    const router = useRouter();
    const { workspaceId } = useWorkspace();
    const [canvases, setCanvases] = useState<Canvas[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateDialog, setShowCreateDialog] = useState(false);
    const [creating, setCreating] = useState(false);

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [layout, setLayout] = useState<'free' | 'grid'>('free');

    useEffect(() => {
        if (workspaceId) {
            setLoading(true);
            fetch(`/api/canvas?workspaceId=${workspaceId}`)
                .then(async res => {
                    if (!res.ok) throw new Error('Failed to load canvases');
                    const data = await res.json();
                    setCanvases(data.canvases || []);
                })
                .catch((error: any) => {
                    toast.error(error.message || 'Failed to load canvases');
                })
                .finally(() => {
                    setLoading(false);
                });
        }
    }, [workspaceId]);

    const handleCreate = async () => {
        if (!workspaceId) return;

        if (!name.trim()) {
            toast.error('Canvas name is required');
            return;
        }

        setCreating(true);
        try {
            const res = await fetch('/api/canvas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    description,
                    layout,
                    gridSize: layout === 'grid' ? 8 : undefined,
                    workspaceId: workspaceId
                }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Failed to create canvas');
            }

            const data = await res.json();
            toast.success('Canvas created successfully');

            // Reset form
            setName('');
            setDescription('');
            setLayout('free');
            setShowCreateDialog(false);

            // Navigate to new canvas
            router.push(`/canvas/${data.canvas.id}`);
        } catch (error: any) {
            toast.error(error.message || 'Failed to create canvas');
        } finally {
            setCreating(false);
        }
    };

    const filteredCanvases = canvases.filter(canvas =>
        canvas.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        canvas.description?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="flex flex-col h-full">
            {/* Header */}
            <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="container py-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">Canvas</h1>
                            <p className="text-muted-foreground">
                                Create data stories with flexible layouts
                            </p>
                        </div>
                        <Button onClick={() => setShowCreateDialog(true)}>
                            <Plus className="w-4 h-4 mr-2" />
                            New Canvas
                        </Button>
                    </div>

                    {/* Search */}
                    <div className="mt-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                            <Input
                                placeholder="Search canvases..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
                <div className="container py-6">
                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[1, 2, 3, 4, 5, 6].map((i) => (
                                <Card key={i} className="animate-pulse">
                                    <CardHeader>
                                        <div className="h-6 bg-muted rounded w-3/4"></div>
                                        <div className="h-4 bg-muted rounded w-1/2 mt-2"></div>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="h-32 bg-muted rounded"></div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    ) : filteredCanvases.length === 0 ? (
                        <div className="text-center py-12">
                            <Grid3x3 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <h3 className="text-lg font-semibold mb-2">
                                {searchQuery ? 'No canvases found' : 'No canvases yet'}
                            </h3>
                            <p className="text-muted-foreground mb-4">
                                {searchQuery
                                    ? 'Try adjusting your search query'
                                    : 'Get started by creating your first canvas'}
                            </p>
                            {!searchQuery && (
                                <Button onClick={() => setShowCreateDialog(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Create Canvas
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {filteredCanvases.map((canvas) => (
                                <Card
                                    key={canvas.id}
                                    className="cursor-pointer hover:shadow-lg transition-shadow"
                                    onClick={() => router.push(`/canvas/${canvas.id}`)}
                                >
                                    <CardHeader>
                                        <div className="flex items-start justify-between">
                                            <div className="flex-1">
                                                <CardTitle className="line-clamp-1">
                                                    {canvas.name}
                                                </CardTitle>
                                                <CardDescription className="line-clamp-2 mt-1">
                                                    {canvas.description || 'No description'}
                                                </CardDescription>
                                            </div>
                                            {canvas.layout === 'grid' ? (
                                                <LayoutGrid className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                                            ) : (
                                                <Grid3x3 className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
                                            )}
                                        </div>
                                    </CardHeader>
                                    <CardContent>
                                        {/* Preview Placeholder */}
                                        <div className="aspect-video bg-muted rounded-lg flex items-center justify-center mb-4">
                                            <div className="text-center">
                                                <Grid3x3 className="w-8 h-8 mx-auto text-muted-foreground/50 mb-2" />
                                                <p className="text-xs text-muted-foreground">
                                                    {canvas._count.widgets} widget{canvas._count.widgets !== 1 ? 's' : ''}
                                                </p>
                                            </div>
                                        </div>

                                        {/* Meta */}
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <div className="flex items-center">
                                                <Calendar className="w-3 h-3 mr-1" />
                                                {formatDate(canvas.updatedAt)}
                                            </div>
                                            <div className="truncate ml-2">
                                                {canvas.creator.name || canvas.creator.email}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* Create Dialog */}
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New Canvas</DialogTitle>
                        <DialogDescription>
                            Build a data story with mixed content and flexible layouts
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 mt-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                placeholder="Q1 Sales Review"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !creating) {
                                        handleCreate();
                                    }
                                }}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Description (Optional)</Label>
                            <Textarea
                                id="description"
                                placeholder="Quarterly performance analysis with key insights..."
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                rows={3}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Layout Mode</Label>
                            <div className="grid grid-cols-2 gap-3">
                                <button
                                    className={`p-4 border-2 rounded-lg transition-colors ${layout === 'free'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                    onClick={() => setLayout('free')}
                                >
                                    <Grid3x3 className="w-6 h-6 mx-auto mb-2" />
                                    <div className="text-sm font-medium">Free-form</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Pixel-perfect positioning
                                    </div>
                                </button>

                                <button
                                    className={`p-4 border-2 rounded-lg transition-colors ${layout === 'grid'
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                        }`}
                                    onClick={() => setLayout('grid')}
                                >
                                    <LayoutGrid className="w-6 h-6 mx-auto mb-2" />
                                    <div className="text-sm font-medium">Snap to Grid</div>
                                    <div className="text-xs text-muted-foreground mt-1">
                                        Auto-aligned objects
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6">
                        <Button
                            variant="outline"
                            onClick={() => setShowCreateDialog(false)}
                            disabled={creating}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={creating}>
                            {creating ? 'Creating...' : 'Create Canvas'}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
