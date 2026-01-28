'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Star, Copy, Eye, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const QUERY_TEMPLATES = [
  {
    id: 1,
    title: 'Top Customers by Revenue',
    description: 'Identify your most valuable customers based on total purchase amount',
    category: 'Sales',
    queries: 3,
    popularity: 24,
    isFavorite: true,
    preview: 'SELECT customer_id, SUM(amount) as total_revenue FROM orders GROUP BY customer_id ORDER BY total_revenue DESC LIMIT 10',
  },
  {
    id: 2,
    title: 'Monthly Sales Trend',
    description: 'Track revenue trends month-over-month to identify seasonal patterns',
    category: 'Analytics',
    queries: 5,
    popularity: 18,
    isFavorite: false,
    preview: 'SELECT DATE_TRUNC(\'month\', created_at) as month, SUM(amount) as revenue FROM orders GROUP BY month ORDER BY month DESC',
  },
  {
    id: 3,
    title: 'Product Performance Analysis',
    description: 'Analyze product sales, margins, and inventory levels',
    category: 'Products',
    queries: 4,
    popularity: 12,
    isFavorite: true,
    preview: 'SELECT p.product_id, p.name, COUNT(o.id) as total_orders, SUM(o.amount) as revenue FROM products p LEFT JOIN orders o ON p.id = o.product_id',
  },
  {
    id: 4,
    title: 'Customer Churn Analysis',
    description: 'Identify inactive customers and calculate churn rate',
    category: 'CRM',
    queries: 2,
    popularity: 15,
    isFavorite: false,
    preview: 'SELECT c.customer_id, MAX(o.created_at) as last_order_date, CURRENT_DATE - MAX(o.created_at) as days_inactive FROM customers c LEFT JOIN orders o',
  },
  {
    id: 5,
    title: 'Geographic Revenue Breakdown',
    description: 'Analyze sales performance by region and country',
    category: 'Geography',
    queries: 3,
    popularity: 10,
    isFavorite: false,
    preview: 'SELECT c.country, SUM(o.amount) as revenue, COUNT(o.id) as order_count FROM customers c JOIN orders o ON c.id = o.customer_id',
  },
];

const CATEGORIES = ['All', 'Sales', 'Analytics', 'Products', 'CRM', 'Geography'];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [favorites, setFavorites] = useState(new Set(QUERY_TEMPLATES.filter(t => t.isFavorite).map(t => t.id)));

  const filteredTemplates = QUERY_TEMPLATES.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFavorite = (id: number) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(id)) {
      newFavorites.delete(id);
    } else {
      newFavorites.add(id);
    }
    setFavorites(newFavorites);
  };

  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0">
        <div className="max-w-6xl mx-auto px-6 py-6">
          <div className="flex items-center gap-4 mb-4">
            <Link href="/">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Query Templates</h1>
              <p className="text-muted-foreground mt-1">Pre-built SQL queries for common analytics tasks</p>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        
        {/* Search and Filter */}
        <div className="mb-8 space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Search templates..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Template
            </Button>
          </div>

          {/* Category Filter */}
          <div className="flex gap-2 flex-wrap">
            {CATEGORIES.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="text-xs"
              >
                {category}
              </Button>
            ))}
          </div>
        </div>

        {/* Templates Grid */}
        <div className="space-y-4">
          {filteredTemplates.length === 0 ? (
            <Card className="p-12 border border-border text-center">
              <p className="text-muted-foreground mb-4">No templates found matching your filters</p>
              <Button variant="outline" onClick={() => {
                setSearchQuery('');
                setSelectedCategory('All');
              }}>
                Clear Filters
              </Button>
            </Card>
          ) : (
            filteredTemplates.map(template => (
              <Card key={template.id} className="p-6 border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{template.title}</h3>
                      <Badge variant="outline" className="text-xs">{template.category}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{template.description}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleFavorite(template.id)}
                    className={favorites.has(template.id) ? 'text-yellow-500' : 'text-muted-foreground'}
                  >
                    <Star className="w-5 h-5" fill={favorites.has(template.id) ? 'currentColor' : 'none'} />
                  </Button>
                </div>

                {/* Query Preview */}
                <div className="mb-4 p-3 bg-muted rounded border border-border">
                  <p className="text-xs font-mono text-muted-foreground line-clamp-2">
                    {template.preview}
                  </p>
                </div>

                {/* Stats and Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>Used {template.queries} times</span>
                    <span>★ {template.popularity} likes</span>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="gap-2 bg-transparent">
                      <Eye className="w-4 h-4" />
                      View
                    </Button>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={() => {
                        // Would navigate to editor with this template
                        window.location.href = '/?template=' + template.id;
                      }}
                    >
                      <Copy className="w-4 h-4" />
                      Use Template
                    </Button>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>

        {/* Featured Templates Section */}
        <div className="mt-12 pt-12 border-t border-border">
          <h2 className="text-2xl font-bold text-foreground mb-6">Community Templates</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Shared templates from other users in your organization
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: 'Active Users Last 30 Days', category: 'Analytics', author: 'Sarah Chen' },
              { title: 'Revenue by Product Category', category: 'Sales', author: 'Michael Brown' },
              { title: 'Customer Lifetime Value', category: 'CRM', author: 'Emma Wilson' },
            ].map((template, idx) => (
              <Card key={idx} className="p-4 border border-border hover:border-primary/50 transition-colors cursor-pointer">
                <h4 className="font-semibold text-foreground mb-1">{template.title}</h4>
                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">{template.category}</Badge>
                    <span className="text-xs text-muted-foreground">by {template.author}</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
