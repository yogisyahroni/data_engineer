'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Share2, Filter } from 'lucide-react';

interface Page {
  id: string;
  title: string;
  subtitle?: string;
  narrative?: string;
  cards: any[];
}

const SAMPLE_PAGES: Page[] = [
  {
    id: 'page_1',
    title: 'Sales Overview',
    subtitle: 'Q1 2024 Performance Summary',
    narrative:
      'This quarter showed strong growth across all regions. Total sales increased by 23% compared to Q4 2023. Key drivers include new product launches and expanded market penetration in the Asia-Pacific region.',
    cards: [
      {
        id: 'card_1',
        title: 'Total Sales Revenue',
        type: 'metric',
      },
      {
        id: 'card_2',
        title: 'Sales by Region',
        type: 'chart',
      },
      {
        id: 'card_3',
        title: 'Growth Trend',
        type: 'chart',
      },
    ],
  },
  {
    id: 'page_2',
    title: 'Regional Analysis',
    subtitle: 'Deep dive into regional performance',
    narrative:
      'North America continues to be our strongest market, contributing 45% of total revenue. Europe is showing steady growth at 8% quarter-over-quarter, while APAC emerged as our fastest-growing region with 34% growth.',
    cards: [
      {
        id: 'card_4',
        title: 'Revenue by Region',
        type: 'chart',
      },
      {
        id: 'card_5',
        title: 'Market Share Distribution',
        type: 'chart',
      },
    ],
  },
  {
    id: 'page_3',
    title: 'Customer Insights',
    subtitle: 'Customer acquisition and retention metrics',
    narrative:
      'We acquired 1,250 new customers this quarter with a 78% onboarding success rate. Customer retention improved to 92%, up from 89% last quarter. Average customer lifetime value increased by 15%.',
    cards: [
      {
        id: 'card_6',
        title: 'New Customers',
        type: 'metric',
      },
      {
        id: 'card_7',
        title: 'Retention Rate',
        type: 'metric',
      },
      {
        id: 'card_8',
        title: 'Customer Cohort Analysis',
        type: 'chart',
      },
    ],
  },
];

export default function StoryViewerPage({ params }: { params: { id: string } }) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showFilters, setShowFilters] = useState(false);

  const currentPage = SAMPLE_PAGES[currentPageIndex];

  const goToPreviousPage = () => {
    if (currentPageIndex > 0) {
      setCurrentPageIndex(currentPageIndex - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPageIndex < SAMPLE_PAGES.length - 1) {
      setCurrentPageIndex(currentPageIndex + 1);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Sales Performance Q1 2024
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                Comprehensive analysis of Q1 sales metrics by region
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-2 bg-transparent"
                onClick={() => setShowFilters(!showFilters)}
              >
                <Filter className="w-4 h-4" />
                Filters
              </Button>
              <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                <Share2 className="w-4 h-4" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b border-border bg-card px-4 md:px-6 py-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground">
                  Region
                </label>
                <select className="mt-2 w-full border border-border rounded-lg p-2 bg-background text-foreground">
                  <option>All Regions</option>
                  <option>North America</option>
                  <option>Europe</option>
                  <option>Asia-Pacific</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Product Category
                </label>
                <select className="mt-2 w-full border border-border rounded-lg p-2 bg-background text-foreground">
                  <option>All Categories</option>
                  <option>Software</option>
                  <option>Hardware</option>
                  <option>Services</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">
                  Date Range
                </label>
                <select className="mt-2 w-full border border-border rounded-lg p-2 bg-background text-foreground">
                  <option>Q1 2024</option>
                  <option>Q4 2023</option>
                  <option>Full Year 2023</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 md:px-6 py-8">
        {currentPage && (
          <div className="space-y-8">
            {/* Page Header */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">
                  Page {currentPageIndex + 1} of {SAMPLE_PAGES.length}
                </Badge>
              </div>
              <h2 className="text-4xl font-bold text-foreground">
                {currentPage.title}
              </h2>
              {currentPage.subtitle && (
                <p className="text-lg text-muted-foreground">
                  {currentPage.subtitle}
                </p>
              )}
            </div>

            {/* Narrative Section */}
            {currentPage.narrative && (
              <Card className="p-6 bg-muted/50 border-l-4 border-primary">
                <p className="text-foreground leading-relaxed">
                  {currentPage.narrative}
                </p>
              </Card>
            )}

            {/* Visualizations Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {currentPage.cards.map((card) => (
                <Card key={card.id} className="overflow-hidden">
                  <div className="aspect-video bg-gradient-to-br from-primary/5 to-accent/5 flex items-center justify-center flex-col space-y-2">
                    <div className="text-center">
                      <p className="font-semibold text-foreground">
                        {card.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {card.type === 'chart' ? 'Chart' : 'Metric'} Visualization
                      </p>
                    </div>
                  </div>
                  <div className="p-4 border-t border-border">
                    <Button variant="ghost" size="sm" className="text-xs">
                      Drill Down
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-12 flex items-center justify-between border-t border-border pt-8">
          <Button
            onClick={goToPreviousPage}
            disabled={currentPageIndex === 0}
            variant="outline"
            className="gap-2 bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          <div className="flex gap-2">
            {SAMPLE_PAGES.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPageIndex(index)}
                className={`w-10 h-10 rounded-lg transition-colors ${
                  currentPageIndex === index
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border text-foreground hover:bg-muted'
                }`}
              >
                {index + 1}
              </button>
            ))}
          </div>

          <Button
            onClick={goToNextPage}
            disabled={currentPageIndex === SAMPLE_PAGES.length - 1}
            className="gap-2"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </main>
    </div>
  );
}
