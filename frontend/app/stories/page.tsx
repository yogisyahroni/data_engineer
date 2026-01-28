'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Eye, Edit2, Trash2, Share2, Clock, Menu } from 'lucide-react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';

interface StoryListItem {
  id: string;
  name: string;
  description?: string;
  pages: number;
  views: number;
  createdAt: string;
  lastModified: string;
  isPublished: boolean;
}

const SAMPLE_STORIES: StoryListItem[] = [
  {
    id: 'story_1',
    name: 'Sales Performance Q1 2024',
    description: 'Comprehensive analysis of Q1 sales metrics by region',
    pages: 5,
    views: 234,
    createdAt: '2024-01-15',
    lastModified: '2024-01-20',
    isPublished: true,
  },
  {
    id: 'story_2',
    name: 'Customer Churn Analysis',
    description: 'Deep dive into customer retention patterns',
    pages: 3,
    views: 156,
    createdAt: '2024-01-10',
    lastModified: '2024-01-18',
    isPublished: true,
  },
];

export default function StoriesPage() {
  const { open: openSidebar } = useSidebar();
  const [searchQuery, setSearchQuery] = useState('');
  const [stories, setStories] = useState<StoryListItem[]>(SAMPLE_STORIES);
  const [filterPublished, setFilterPublished] = useState<'all' | 'published' | 'draft'>(
    'all'
  );

  const filteredStories = stories.filter((story) => {
    const matchesSearch = story.name
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesPublished =
      filterPublished === 'all' ||
      (filterPublished === 'published' && story.isPublished) ||
      (filterPublished === 'draft' && !story.isPublished);
    return matchesSearch && matchesPublished;
  });

  return (
    <SidebarLayout>
      <div className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-8">
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden"
              onClick={() => openSidebar()}
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Stories</h1>
              <p className="text-muted-foreground">
                Create narrative-driven data stories to explore and share insights
              </p>
            </div>
          </div>

          {/* Actions Bar */}
          <div className="flex gap-4 mb-6 flex-wrap items-center">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search stories..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setFilterPublished('all')}>
                All
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFilterPublished('published')}>
                Published
              </Button>
              <Button variant="outline" size="sm" onClick={() => setFilterPublished('draft')}>
                Drafts
              </Button>
            </div>

            <Link href="/stories/new">
              <Button className="gap-2">
                <Plus className="w-4 h-4" />
                New Story
              </Button>
            </Link>
          </div>

          {/* Stories Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStories.map((story) => (
              <Card
                key={story.id}
                className="overflow-hidden hover:shadow-lg transition-shadow"
              >
                <div className="aspect-video bg-gradient-to-br from-primary/10 to-accent/10 flex items-center justify-center">
                  <span className="text-4xl">{story.pages}</span>
                </div>

                <div className="p-6 space-y-4">
                  <div>
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-semibold text-foreground line-clamp-2">
                        {story.name}
                      </h3>
                      {story.isPublished && (
                        <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900">
                          Published
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2">
                      {story.description || 'No description'}
                    </p>
                  </div>

                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {story.views} views
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {story.pages} pages
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2 border-t border-border">
                    <Link href={`/stories/${story.id}`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 bg-transparent"
                      >
                        <Eye className="w-3 h-3" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/stories/${story.id}/edit`} className="flex-1">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 bg-transparent"
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                    </Link>
                    <Button variant="ghost" size="sm" className="gap-2">
                      <Share2 className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {filteredStories.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">No stories found</p>
              <Link href="/stories/new">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create your first story
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </SidebarLayout>
  );
}
