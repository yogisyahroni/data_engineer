'use client';

import { useState } from 'react';
import { useCollections } from '@/hooks/use-collections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Plus, MoreHorizontal, Folder, FolderOpen, Trash2 } from 'lucide-react';

interface CollectionsSidebarProps {
  onSelectCollection?: (collectionId: string) => void;
  selectedCollectionId?: string;
}

export function CollectionsSidebar({
  onSelectCollection,
  selectedCollectionId,
}: CollectionsSidebarProps) {
  const { collections, isLoading, createCollection, deleteCollection } = useCollections({
    autoFetch: true,
  });
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  const handleCreateCollection = async () => {
    if (newCollectionName.trim()) {
      await createCollection({
        name: newCollectionName,
        icon: '📁',
        isPublic: false,
      });
      setNewCollectionName('');
      setShowNewCollection(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="border-b border-border px-4 py-3 flex-shrink-0">
        <h3 className="text-sm font-semibold text-foreground mb-3">Collections</h3>
        <Button
          size="sm"
          className="w-full gap-2"
          onClick={() => setShowNewCollection(true)}
        >
          <Plus className="w-4 h-4" />
          New Collection
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-muted/5 animate-pulse">
                <div className="w-4 h-4 rounded bg-muted/40" />
                <div className="h-4 w-24 bg-muted/40 rounded" />
              </div>
            ))}
          </div>
        ) : collections.length === 0 ? (
          <div className="px-4 py-2 text-xs text-muted-foreground">
            No collections yet
          </div>
        ) : (
          <div className="space-y-1 p-2">
            {collections.map((collection) => (
              <div
                key={collection.id}
                className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${selectedCollectionId === collection.id
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                  }`}
                onClick={() => onSelectCollection?.(collection.id)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <span className="text-lg flex-shrink-0">{collection.icon}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{collection.name}</p>
                    {collection.description && (
                      <p className="text-xs opacity-75 truncate">
                        {collection.description}
                      </p>
                    )}
                  </div>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="w-8 h-8">
                      <MoreHorizontal className="w-4 h-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => deleteCollection(collection.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Collection Dialog */}
      {showNewCollection && (
        <div className="border-t border-border p-3 space-y-2">
          <Input
            placeholder="Collection name..."
            value={newCollectionName}
            onChange={(e) => setNewCollectionName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreateCollection();
              }
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => {
                setShowNewCollection(false);
                setNewCollectionName('');
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="flex-1"
              onClick={handleCreateCollection}
              disabled={!newCollectionName.trim()}
            >
              Create
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
