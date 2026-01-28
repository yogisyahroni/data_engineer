'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Trash2,
  Copy,
  Share2,
  MoreVertical,
  Calendar,
  Users,
  TrendingUp,
  Search,
  Pin,
  Play,
  FileCode,
  Sparkles,
  Eye,
  Loader2,
  Menu,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSavedQueries } from '@/hooks/use-saved-queries';
import type { SavedQuery } from '@/lib/types';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';
import { EditQueryDialog } from '@/components/saved-queries/edit-query-dialog';
import { Edit } from 'lucide-react';

export default function SavedQueriesPage() {
  const { open: openSidebar } = useSidebar();
  const {
    queries,
    isLoading,
    error,
    fetchQueries,
    deleteQuery,
    pinQuery,
    updateQuery,
  } = useSavedQueries({ autoFetch: true });

  const [editingQuery, setEditingQuery] = useState<SavedQuery | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'name'>('recent');
  const [activeTab, setActiveTab] = useState('all');

  // Filter and sort queries
  const filteredQueries = queries
    .filter((query) => {
      const matchesSearch =
        query.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        query.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        query.tags?.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()));

      if (activeTab === 'pinned') return matchesSearch && query.pinned;
      if (activeTab === 'ai') return matchesSearch && !!query.aiPrompt;
      return matchesSearch;
    })
    .sort((a, b) => {
      if (sortBy === 'recent') {
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      }
      if (sortBy === 'popular') {
        return (b.views || 0) - (a.views || 0);
      }
      if (sortBy === 'name') {
        return a.name.localeCompare(b.name);
      }
      return 0;
    });

  // Format date
  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Handle delete with confirmation
  const handleDelete = (queryId: string, queryName: string) => {
    const confirmed = window.confirm(`Delete "${queryName}"? This action cannot be undone.`);
    if (confirmed) {
      deleteQuery(queryId);
    }
  };

  // Copy SQL to clipboard
  const handleCopySQL = async (sql: string) => {
    await navigator.clipboard.writeText(sql);
  };

  return (
    <SidebarLayout>
      <div className="flex-1 overflow-y-auto bg-background">
        {/* Header */}
        <header className="border-b border-border bg-card sticky top-0 z-10">
          <div className="max-w-6xl mx-auto px-6 py-5">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                className="md:hidden"
                onClick={() => openSidebar()}
              >
                <Menu className="w-5 h-5" />
              </Button>
              <Link href="/">
                <Button variant="ghost" size="icon" className="shrink-0">
                  <ArrowLeft className="w-4 h-4" />
                </Button>
              </Link>
              <div className="flex-1">
                <h1 className="text-2xl font-bold text-foreground">Saved Queries</h1>
                <p className="text-sm text-muted-foreground mt-0.5">
                  {queries.length} saved quer{queries.length !== 1 ? 'ies' : 'y'}
                </p>
              </div>
              <Link href="/">
                <Button className="gap-2">
                  <FileCode className="w-4 h-4" />
                  New Query
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="max-w-6xl mx-auto px-6 py-6">
          {/* Search and Filter */}
          <div className="mb-6 flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search queries by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="px-3 py-2 border border-border rounded-md bg-background text-sm min-w-[140px]"
            >
              <option value="recent">Most Recent</option>
              <option value="popular">Most Views</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="bg-muted">
              <TabsTrigger value="all" className="gap-2">
                All
                <Badge variant="secondary" className="ml-1 text-xs">
                  {queries.length}
                </Badge>
              </TabsTrigger>
              <TabsTrigger value="pinned" className="gap-2">
                <Pin className="w-3 h-3" />
                Pinned
              </TabsTrigger>
              <TabsTrigger value="ai" className="gap-2">
                <Sparkles className="w-3 h-3" />
                AI Generated
              </TabsTrigger>
            </TabsList>

            {/* Query List */}
            <TabsContent value={activeTab} className="space-y-3">
              {isLoading ? (
                [...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-32 w-full rounded-lg" />
                ))
              ) : filteredQueries.length === 0 ? (
                <Card className="p-12 text-center">
                  <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                    <FileCode className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    {searchQuery ? 'No queries found' : 'No saved queries yet'}
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    {searchQuery
                      ? 'Try adjusting your search terms'
                      : 'Save your first query from the editor to see it here'}
                  </p>
                  {!searchQuery && (
                    <Link href="/">
                      <Button className="gap-2">
                        <FileCode className="w-4 h-4" />
                        Create Your First Query
                      </Button>
                    </Link>
                  )}
                </Card>
              ) : (
                filteredQueries.map((query) => (
                  <Card
                    key={query.id}
                    className="p-5 border border-border hover:border-primary/30 transition-all group"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Header */}
                        <div className="flex items-center gap-2 mb-2">
                          {query.pinned && (
                            <Pin className="w-3.5 h-3.5 text-primary fill-primary" />
                          )}
                          <h3 className="text-base font-semibold text-foreground truncate">
                            {query.name}
                          </h3>
                          {query.aiPrompt && (
                            <Badge variant="secondary" className="text-xs gap-1">
                              <Sparkles className="w-3 h-3" />
                              AI
                            </Badge>
                          )}
                        </div>

                        {/* Description */}
                        {query.description && (
                          <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                            {query.description}
                          </p>
                        )}

                        {/* Tags */}
                        {query.tags && query.tags.length > 0 && (
                          <div className="flex gap-1.5 flex-wrap mb-3">
                            {query.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Metadata */}
                        <div className="flex gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(query.updatedAt)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Eye className="w-3 h-3" />
                            {query.views || 0} views
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Link href={`/?id=${query.id}&sql=${encodeURIComponent(query.sql)}`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <Play className="w-4 h-4" />
                          </Button>
                        </Link>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/?id=${query.id}&sql=${encodeURIComponent(query.sql)}`}>
                                <Play className="w-4 h-4 mr-2" />
                                Open in Editor
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCopySQL(query.sql)}>
                              <Copy className="w-4 h-4 mr-2" />
                              Copy SQL
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingQuery(query);
                                setIsEditDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4 mr-2" />
                              Edit Details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => pinQuery(query.id)}>
                              <Pin className="w-4 h-4 mr-2" />
                              {query.pinned ? 'Unpin' : 'Pin'}
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Share2 className="w-4 h-4 mr-2" />
                              Share
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => handleDelete(query.id, query.name)}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* SQL Preview */}
                    <div className="mt-3 pt-3 border-t border-border">
                      <code className="text-xs font-mono text-muted-foreground line-clamp-1 block">
                        {query.sql}
                      </code>
                    </div>
                  </Card>
                ))
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <EditQueryDialog
        open={isEditDialogOpen}
        onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditingQuery(null);
        }}
        query={editingQuery}
        onSave={async (id, updates) => {
          await updateQuery(id, updates);
        }}
      />
    </SidebarLayout>
  );
}
