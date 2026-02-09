'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card as CardUI } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Eye } from 'lucide-react';

interface Page {
  id: string;
  title: string;
  subtitle?: string;
  narrative?: string;
  cards: Card[];
}

interface Card {
  id: string;
  title: string;
  type: 'chart' | 'metric' | 'text';
  content?: any;
}

export default function StoryBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const [pages, setPages] = useState<Page[]>([
    {
      id: 'page_1',
      title: 'Overview',
      subtitle: 'Q1 2024 Performance Summary',
      narrative: 'This story explores our Q1 performance across all key metrics...',
      cards: [],
    },
  ]);

  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showAddCard, setShowAddCard] = useState(false);

  const currentPage = pages[currentPageIndex];

  const addNewPage = () => {
    const newPage: Page = {
      id: `page_${Date.now()}`,
      title: `Page ${pages.length + 1}`,
      cards: [],
    };
    setPages([...pages, newPage]);
    setCurrentPageIndex(pages.length);
  };

  const updatePageTitle = (title: string) => {
    const updated = [...pages];
    updated[currentPageIndex].title = title;
    setPages(updated);
  };

  const updatePageNarrative = (narrative: string) => {
    const updated = [...pages];
    updated[currentPageIndex].narrative = narrative;
    setPages(updated);
  };

  const addCardToPage = (type: 'chart' | 'metric' | 'text') => {
    const updated = [...pages];
    const newCard: Card = {
      id: `card_${Date.now()}`,
      title: `${type.charAt(0).toUpperCase() + type.slice(1)} ${updated[currentPageIndex].cards.length + 1}`,
      type,
    };
    updated[currentPageIndex].cards.push(newCard);
    setPages(updated);
    setShowAddCard(false);
  };

  const removePage = (index: number) => {
    if (pages.length === 1) {
      alert('You must have at least one page');
      return;
    }
    const updated = pages.filter((_, i) => i !== index);
    setPages(updated);
    if (currentPageIndex >= updated.length) {
      setCurrentPageIndex(updated.length - 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="border-b border-border bg-card px-6 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <Input
                placeholder="Story Title"
                defaultValue="Sales Performance Q1 2024"
                className="text-lg font-bold"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2 bg-transparent">
                <Eye className="w-4 h-4" />
                Preview
              </Button>
              <Button className="gap-2">
                <Save className="w-4 h-4" />
                Save Story
              </Button>
            </div>
          </div>
        </div>

        <div className="flex">
          {/* Pages Sidebar */}
          <div className="w-64 border-r border-border bg-card overflow-y-auto max-h-[calc(100vh-73px)]">
            <div className="p-4 space-y-3">
              <h3 className="font-semibold text-sm text-foreground">Pages</h3>
              {pages.map((page, index) => (
                <div key={page.id}>
                  <button
                    onClick={() => setCurrentPageIndex(index)}
                    className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${currentPageIndex === index
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                      }`}
                  >
                    <div className="text-sm font-medium">{page.title}</div>
                    <div className="text-xs opacity-75">{page.cards.length} cards</div>
                  </button>
                  {pages.length > 1 && (
                    <button
                      onClick={() => removePage(index)}
                      className="ml-auto text-xs text-destructive hover:underline"
                    >
                      Delete
                    </button>
                  )}
                </div>
              ))}

              <Button
                onClick={addNewPage}
                variant="outline"
                size="sm"
                className="w-full gap-2 mt-4 bg-transparent"
              >
                <Plus className="w-4 h-4" />
                Add Page
              </Button>
            </div>
          </div>

          {/* Main Editor */}
          <div className="flex-1 overflow-y-auto max-h-[calc(100vh-73px)]">
            {currentPage && (
              <div className="p-8 space-y-8">
                {/* Page Metadata */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Page Title</Label>
                    <Input
                      value={currentPage.title}
                      onChange={(e) => updatePageTitle(e.target.value)}
                      className="mt-1 text-xl font-bold"
                    />
                  </div>

                  <div>
                    <Label className="text-sm font-medium">Page Description</Label>
                    <textarea
                      value={currentPage.narrative || ''}
                      onChange={(e) => updatePageNarrative(e.target.value)}
                      placeholder="Add context and narrative for this page..."
                      className="w-full border border-border rounded-lg p-3 bg-muted text-foreground resize-none min-h-24"
                    />
                  </div>
                </div>

                {/* Cards Section */}
                <div>
                  <h3 className="font-semibold text-lg text-foreground mb-4">
                    Visualizations & Insights
                  </h3>

                  {currentPage.cards.length === 0 ? (
                    <CardUI className="p-8 text-center border-dashed">
                      <p className="text-muted-foreground mb-4">No cards added yet</p>
                      <Button
                        onClick={() => setShowAddCard(!showAddCard)}
                        className="gap-2"
                      >
                        <Plus className="w-4 h-4" />
                        Add Card
                      </Button>
                    </CardUI>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {currentPage.cards.map((card) => (
                        <CardUI key={card.id} className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h3 className="font-medium text-foreground">
                              {card.title}
                            </h3>
                            <span className="text-xs bg-muted px-2 py-1 rounded">
                              {card.type}
                            </span>
                          </div>
                          <div className="aspect-video bg-muted rounded flex items-center justify-center text-muted-foreground">
                            Click to edit
                          </div>
                        </CardUI>
                      ))}
                    </div>
                  )}

                  {showAddCard && (
                    <CardUI className="p-4 mt-4 border-dashed space-y-2">
                      <p className="text-sm font-medium text-foreground">
                        Select card type:
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addCardToPage('chart')}
                        >
                          Chart
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addCardToPage('metric')}
                        >
                          Metric
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => addCardToPage('text')}
                        >
                          Text
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setShowAddCard(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </CardUI>
                  )}

                  {!showAddCard && currentPage.cards.length > 0 && (
                    <Button
                      onClick={() => setShowAddCard(true)}
                      variant="outline"
                      className="mt-4 gap-2"
                    >
                      <Plus className="w-4 h-4" />
                      Add Card
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
