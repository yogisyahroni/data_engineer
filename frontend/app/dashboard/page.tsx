'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Code, 
  Sparkles, 
  Database, 
  BarChart3, 
  Brain, 
  Shield, 
  Zap,
  ArrowRight,
  CheckCircle2,
  Users,
  TrendingUp,
  Clock
} from 'lucide-react';

const FEATURES = [
  {
    icon: Code,
    title: 'Dual-Engine Workspace',
    description: 'Write SQL manually or use natural language AI prompts seamlessly.',
  },
  {
    icon: Brain,
    title: 'AI-Powered Query Generation',
    description: 'Intelligent SQL generation with context awareness and business logic.',
  },
  {
    icon: Database,
    title: 'Schema Discovery',
    description: 'Auto-detect tables, columns, and metadata with intelligent suggestions.',
  },
  {
    icon: BarChart3,
    title: 'Smart Visualizations',
    description: 'AI recommends optimal charts based on your data types.',
  },
  {
    icon: Shield,
    title: 'Enterprise Security',
    description: 'AES-256 encryption, RLS, and read-only database access.',
  },
  {
    icon: Zap,
    title: 'RAG Architecture',
    description: 'Retrieval-Augmented Generation for accurate, contextual queries.',
  },
];

const RECENT_QUERIES = [
  {
    id: 1,
    title: 'Top 5 Customers by Sales',
    type: 'ai',
    timestamp: '2 hours ago',
    rows: 5,
  },
  {
    id: 2,
    title: 'Monthly Revenue Trend',
    type: 'sql',
    timestamp: '4 hours ago',
    rows: 12,
  },
  {
    id: 3,
    title: 'Product Performance Analysis',
    type: 'ai',
    timestamp: '1 day ago',
    rows: 8,
  },
];

const STATS = [
  {
    label: 'Queries Executed',
    value: '1,234',
    icon: TrendingUp,
    change: '+12%',
  },
  {
    label: 'Connected Tables',
    value: '24',
    icon: Database,
    change: '3 new',
  },
  {
    label: 'Team Members',
    value: '5',
    icon: Users,
    change: '1 active',
  },
  {
    label: 'Avg Query Time',
    value: '234ms',
    icon: Clock,
    change: '-15%',
  },
];

export default function DashboardPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-bold">
                IE
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">InsightEngine AI</h1>
                <p className="text-sm text-muted-foreground">Welcome back! 👋</p>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href="/onboarding">
                <Button variant="outline">Setup Guide</Button>
              </Link>
              <Link href="/">
                <Button className="gap-2">
                  <Sparkles className="w-4 h-4" />
                  Start Query
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-12">
          {STATS.map((stat) => {
            const IconComponent = stat.icon;
            return (
              <Card key={stat.label} className="p-6 border border-border hover:border-primary/50 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <IconComponent className="w-5 h-5 text-primary" />
                  <Badge variant="outline" className="text-xs">{stat.change}</Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{stat.label}</p>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </Card>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="mb-12">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-2">Powerful Features</h2>
            <p className="text-muted-foreground">Everything you need for intelligent data analysis</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((feature) => {
              const IconComponent = feature.icon;
              return (
                <Card key={feature.title} className="p-6 border border-border hover:border-primary/50 transition-all hover:shadow-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <IconComponent className="w-5 h-5 text-primary flex-shrink-0" />
                    <h3 className="font-semibold text-foreground">{feature.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Recent Queries */}
        <div className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">Recent Queries</h2>
              <p className="text-muted-foreground">Your latest analysis</p>
            </div>
            <Link href="/metadata">
              <Button variant="outline" className="gap-2 bg-transparent">
                View All
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
          <div className="space-y-3">
            {RECENT_QUERIES.map((query) => (
              <Card key={query.id} className="p-4 border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors cursor-pointer">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-foreground">{query.title}</h3>
                      <Badge variant={query.type === 'ai' ? 'default' : 'secondary'} className="text-xs">
                        {query.type === 'ai' ? '✨ AI' : '📝 SQL'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{query.timestamp}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{query.rows} rows</span>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-2xl font-bold text-foreground mb-6">Quick Links</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Link href="/">
              <Card className="p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                <Code className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1">Query Editor</h3>
                <p className="text-xs text-muted-foreground">Write SQL or use AI prompts</p>
              </Card>
            </Link>
            <Link href="/metadata">
              <Card className="p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                <Database className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1">Metadata Editor</h3>
                <p className="text-xs text-muted-foreground">Configure Kamus Data</p>
              </Card>
            </Link>
            <Link href="/settings">
              <Card className="p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                <Brain className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1">AI Providers</h3>
                <p className="text-xs text-muted-foreground">Connect OpenAI, Gemini...</p>
              </Card>
            </Link>
            <Link href="/onboarding">
              <Card className="p-6 border border-border hover:border-primary/50 hover:shadow-lg transition-all cursor-pointer h-full">
                <CheckCircle2 className="w-6 h-6 text-primary mb-4" />
                <h3 className="font-semibold text-foreground mb-1">Setup Guide</h3>
                <p className="text-xs text-muted-foreground">Complete onboarding</p>
              </Card>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
