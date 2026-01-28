'use client';

import { useState } from 'react';
import { useSavedQueries } from '@/hooks/use-saved-queries';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Star, MoreHorizontal, Trash2, Copy, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SavedQueriesListProps {
  collectionId?: string;
  onQuerySelect?: (queryId: string, sql: string) => void;
}

export function SavedQueriesList({ collectionId, onQuerySelect }: SavedQueriesListProps) {
  const { queries, isLoading, deleteQuery, pinQuery } = useSavedQueries({
    collectionId,
    autoFetch: true,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Loading queries...
      </div>
    );
  }

  if (queries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-32 gap-2">
        <p className="text-muted-foreground">No saved queries yet</p>
        <p className="text-xs text-muted-foreground">Create a query above and save it</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {queries.map((query) => (
        <div
          key={query.id}
          className="border border-border rounded-lg p-4 hover:bg-muted/50 transition-colors group"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm text-foreground truncate">
                  {query.name}
                </h4>
                {query.pinned && (
                  <Star className="w-4 h-4 fill-yellow-400 text-yellow-400 flex-shrink-0" />
                )}
              </div>
              {query.description && (
                <p className="text-xs text-muted-foreground mb-2 line-clamp-2">
                  {query.description}
                </p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-muted-foreground">
                  {query.views} views
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(query.updatedAt), {
                    addSuffix: true,
                  })}
                </span>
                {query.tags && query.tags.length > 0 && (
                  <div className="flex gap-1">
                    {query.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs py-0">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onQuerySelect?.(query.id, query.sql)}
                >
                  <Play className="w-4 h-4 mr-2" />
                  Execute
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    navigator.clipboard.writeText(query.sql);
                  }}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy SQL
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => pinQuery(query.id)}>
                  <Star className="w-4 h-4 mr-2" />
                  {query.pinned ? 'Unpin' : 'Pin'}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteQuery(query.id)}
                  className="text-destructive"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* SQL Preview */}
          <div className="mt-3 bg-muted p-2 rounded text-xs font-mono text-foreground overflow-x-auto max-h-12 line-clamp-2">
            {query.sql}
          </div>
        </div>
      ))}
    </div>
  );
}
