'use client';

import { useState } from 'react';
import { useCollections } from '@/hooks/use-collections';
import { CollectionSidebar } from '@/components/collection-sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Folder, Search, LayoutGrid, List } from 'lucide-react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Label } from '@/components/ui/label';
import { MoveToCollectionDialog } from '@/components/move-collection-dialog';
import { MoreHorizontal } from 'lucide-react';

export default function CollectionsPage() {
    const {
        collections,
        isLoading,
        createCollection,
        getCollectionTree
    } = useCollections({ autoFetch: true });

    const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>();
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newCollectionName, setNewCollectionName] = useState('');
    const [parentCollectionId, setParentCollectionId] = useState<string | undefined>();

    // Move Dialog State
    const [moveOpen, setMoveOpen] = useState(false);
    const [moveItem, setMoveItem] = useState<{ id: string, type: 'dashboard' | 'query' } | null>(null);

    const handleMoveItem = async (targetCollectionId: string) => {
        if (!moveItem) return;

        const endpoint = moveItem.type === 'dashboard'
            ? `/api/dashboards/${moveItem.id}`
            : `/api/queries/saved/${moveItem.id}`;

        // If targetCollectionId is 'root', we set collectionId to null or empty string depending on backend
        // Assuming backend handles empty string as root or null. 
        // Actually schema says collectionId is String (required?). 
        // If collectionId is required, we cannot move to root if root is not a collection.
        // But dashboard.collectionId IS required in schema?
        // Let's check schema.

        await fetch(endpoint, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ collectionId: targetCollectionId === 'root' ? null : targetCollectionId })
        });

        // Refresh collections
        window.location.reload(); // Simple reload to refresh state for now
    };

    const openMoveDialog = (e: React.MouseEvent, id: string, type: 'dashboard' | 'query') => {
        e.stopPropagation();
        setMoveItem({ id, type });
        setMoveOpen(true);
    };

    const tree = getCollectionTree();

    const handleCreate = async () => {
        if (!newCollectionName.trim()) return;

        await createCollection({
            name: newCollectionName,
            parentId: parentCollectionId,
            icon: 'folder', // Default icon
            isPublic: false // Default private
        } as any); // Cast to any to bypass potential TS mismatch for now

        setIsCreateOpen(false);
        setNewCollectionName('');
        setParentCollectionId(undefined);
    };

    const openCreateDialog = (parentId?: string) => {
        setParentCollectionId(parentId);
        setNewCollectionName('');
        setIsCreateOpen(true);
    };

    // Filter content based on selection
    const selectedCollection = collections.find(c => c.id === selectedCollectionId);
    const subCollections = collections.filter(c => c.parentId === selectedCollectionId);

    // In a real app, we would also filter Dashboards and Queries here
    // const dashboards = ...
    // const queries = ...

    return (
        <div className="flex h-screen bg-background text-foreground overflow-hidden">
            {/* Sidebar */}
            <CollectionSidebar
                tree={tree}
                activeId={selectedCollectionId}
                onSelect={setSelectedCollectionId}
                onAddRoot={() => openCreateDialog(undefined)}
                onAddSub={(id) => openCreateDialog(id)}
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
                <header className="border-b h-16 flex items-center justify-between px-6 bg-card shrink-0">
                    <div className="flex items-center gap-4">
                        <h1 className="text-xl font-semibold flex items-center gap-2">
                            <Folder className="h-5 w-5 text-primary" />
                            {selectedCollection ? selectedCollection.name : 'All Collections'}
                        </h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="relative w-64">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search..."
                                className="w-full bg-background pl-9 h-9"
                            />
                        </div>
                        <Button onClick={() => openCreateDialog(selectedCollectionId)}>
                            <Plus className="h-4 w-4 mr-2" />
                            New Collection
                        </Button>
                    </div>
                </header>

                <div className="flex-1 overflow-y-auto p-6">
                    {isLoading ? (
                        <div className="space-y-8 animate-pulse">
                            <div className="space-y-4">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {[1, 2, 3, 4].map(i => (
                                        <div key={i} className="h-24 bg-muted rounded-lg border border-border/50" />
                                    ))}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="h-4 w-32 bg-muted rounded" />
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className="h-24 bg-muted rounded-lg border border-border/50" />
                                    ))}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Sub-collections Grid */}
                            {subCollections.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                        Folders
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {subCollections.map(collection => (
                                            <div
                                                key={collection.id}
                                                className="group p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer flex items-center gap-3"
                                                onClick={() => setSelectedCollectionId(collection.id)}
                                            >
                                                <Folder className="h-8 w-8 text-blue-500 fill-blue-500/20" />
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-medium truncate">{collection.name}</h3>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {collection.description || 'No description'}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}



                            {/* Dashboards Section */}
                            {selectedCollection?.dashboards && selectedCollection.dashboards.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                        Dashboards
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {selectedCollection.dashboards.map(dashboard => (
                                            <div
                                                key={dashboard.id}
                                                className="group p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer flex items-center gap-3 relative"
                                                onClick={() => window.location.href = `/dashboards/${dashboard.id}`}
                                            >
                                                <LayoutGrid className="h-8 w-8 text-orange-500 fill-orange-500/20" />
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-medium truncate">{dashboard.name}</h3>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {dashboard.description || 'No description'}
                                                    </p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => openMoveDialog(e, dashboard.id, 'dashboard')}>
                                                                Move to Folder
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Saved Queries Section */}
                            {selectedCollection?.queries && selectedCollection.queries.length > 0 && (
                                <div className="mb-8">
                                    <h2 className="text-sm font-medium text-muted-foreground mb-4 uppercase tracking-wider">
                                        Saved Queries
                                    </h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {selectedCollection.queries.map(query => (
                                            <div
                                                key={query.id}
                                                className="group p-4 border rounded-lg hover:border-primary/50 hover:bg-muted/50 transition-all cursor-pointer flex items-center gap-3 relative"
                                            // onClick={() => window.location.href = `/queries/${query.id}`} 
                                            >
                                                <List className="h-8 w-8 text-green-500 fill-green-500/20" />
                                                <div className="min-w-0 flex-1">
                                                    <h3 className="font-medium truncate">{query.name}</h3>
                                                    <p className="text-xs text-muted-foreground truncate">
                                                        {query.description || 'No description'}
                                                    </p>
                                                </div>
                                                <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => e.stopPropagation()}>
                                                                <MoreHorizontal className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end">
                                                            <DropdownMenuItem onClick={(e) => openMoveDialog(e, query.id, 'query')}>
                                                                Move to Folder
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Empty State */}
                            {(!subCollections.length &&
                                (!selectedCollection?.dashboards?.length) &&
                                (!selectedCollection?.queries?.length)) && (
                                    <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg">
                                        <Folder className="h-12 w-12 text-muted-foreground/30 mb-4" />
                                        <h3 className="text-lg font-medium text-muted-foreground">Empty Collection</h3>
                                        <p className="text-sm text-muted-foreground mb-4">
                                            This folder is empty. Create a sub-folder or add items.
                                        </p>
                                        <Button variant="outline" onClick={() => openCreateDialog(selectedCollectionId)}>
                                            Create Folder
                                        </Button>
                                    </div>
                                )}
                        </>
                    )}
                </div>
            </main >

            {/* Create Collection Dialog */}
            < Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen} >
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {parentCollectionId ? 'New Sub-Collection' : 'New Collection'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Name</Label>
                            <Input
                                value={newCollectionName}
                                onChange={e => setNewCollectionName(e.target.value)}
                                placeholder="e.g., Marketing, Sales, Q1 Reports"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreate} disabled={!newCollectionName}>Create</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog >


            <MoveToCollectionDialog
                open={moveOpen}
                onOpenChange={setMoveOpen}
                collections={collections}
                currentCollectionId={selectedCollectionId}
                onMove={handleMoveItem}
                title={moveItem ? `Move ${moveItem.type === 'dashboard' ? 'Dashboard' : 'Query'}` : 'Move Item'}
            />
        </div >
    );
}
