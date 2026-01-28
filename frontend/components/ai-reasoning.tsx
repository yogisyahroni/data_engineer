'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ChevronDown, ChevronUp, Copy, AlertTriangle, Check } from 'lucide-react';
import { useState } from 'react';

interface AIReasoningProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function AIReasoning({ isOpen = true, onClose }: AIReasoningProps) {
  const [expandedSections, setExpandedSections] = useState({
    context: true,
    mapping: true,
    sql: true,
    validation: false,
  });

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-4 p-4 bg-muted/50 rounded-lg border border-border">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <span className="inline-block w-2 h-2 rounded-full bg-primary animate-pulse" />
          AI Reasoning Process
        </h3>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6">
            ×
          </Button>
        )}
      </div>

      {/* Context Retrieval */}
      <Card className="p-3 border-0 bg-background">
        <button
          onClick={() => toggleSection('context')}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-2">
            {expandedSections.context ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold text-foreground">1. Context Retrieval</span>
            <Badge variant="outline" className="text-xs">Using RAG</Badge>
          </div>
          <Check className="w-4 h-4 text-green-600" />
        </button>
        {expandedSections.context && (
          <div className="text-xs text-muted-foreground space-y-2 mt-3">
            <p>
              Found relevant tables in Kamus Data:
            </p>
            <ul className="list-disc list-inside space-y-1 ml-2">
              <li>
                <code className="bg-muted px-1 rounded">orders</code> - Transaction records
              </li>
              <li>
                <code className="bg-muted px-1 rounded">customers</code> - Customer master data
              </li>
              <li>
                <code className="bg-muted px-1 rounded">products</code> - Product information
              </li>
            </ul>
          </div>
        )}
      </Card>

      {/* Semantic Mapping */}
      <Card className="p-3 border-0 bg-background">
        <button
          onClick={() => toggleSection('mapping')}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-2">
            {expandedSections.mapping ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold text-foreground">2. Semantic Mapping</span>
            <Badge variant="outline" className="text-xs">Matched</Badge>
          </div>
          <Check className="w-4 h-4 text-green-600" />
        </button>
        {expandedSections.mapping && (
          <div className="text-xs text-muted-foreground space-y-2 mt-3">
            <p>Mapped terms to database columns:</p>
            <div className="space-y-1 ml-2">
              <div className="flex items-center gap-2">
                <code className="bg-primary/10 text-primary px-1 rounded">"top customers"</code>
                <span>→</span>
                <code className="bg-muted px-1 rounded">customers.id</code>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-primary/10 text-primary px-1 rounded">"total sales"</code>
                <span>→</span>
                <code className="bg-muted px-1 rounded">SUM(orders.amount)</code>
              </div>
              <div className="flex items-center gap-2">
                <code className="bg-primary/10 text-primary px-1 rounded">"last month"</code>
                <span>→</span>
                <code className="bg-muted px-1 rounded">DATE_TRUNC('month', orders.created_at)</code>
              </div>
            </div>
          </div>
        )}
      </Card>

      {/* SQL Generation */}
      <Card className="p-3 border-0 bg-background">
        <button
          onClick={() => toggleSection('sql')}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-2">
            {expandedSections.sql ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold text-foreground">3. SQL Generation</span>
            <Badge variant="outline" className="text-xs">Generated</Badge>
          </div>
          <Check className="w-4 h-4 text-green-600" />
        </button>
        {expandedSections.sql && (
          <div className="mt-3 bg-muted p-2 rounded text-xs font-mono overflow-x-auto">
            <div className="text-muted-foreground">
{`SELECT 
  c.customer_name,
  SUM(o.amount) as total_sales,
  COUNT(o.id) as orders_count
FROM customers c
LEFT JOIN orders o ON c.id = o.customer_id
WHERE o.created_at >= DATE_TRUNC('month', NOW())
GROUP BY c.id, c.customer_name
ORDER BY total_sales DESC
LIMIT 5`}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 w-full text-xs bg-transparent"
              onClick={() => navigator.clipboard.writeText('SELECT...')}
            >
              <Copy className="w-3 h-3 mr-1" />
              Copy SQL
            </Button>
          </div>
        )}
      </Card>

      {/* Validation */}
      <Card className="p-3 border-0 bg-background">
        <button
          onClick={() => toggleSection('validation')}
          className="w-full flex items-center justify-between mb-2"
        >
          <div className="flex items-center gap-2">
            {expandedSections.validation ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
            <span className="text-xs font-semibold text-foreground">4. Validation</span>
            <Badge variant="outline" className="text-xs">Passed</Badge>
          </div>
          <Check className="w-4 h-4 text-green-600" />
        </button>
        {expandedSections.validation && (
          <div className="text-xs text-muted-foreground space-y-2 mt-3">
            <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-xs text-green-800 dark:text-green-200">
                SQL syntax is valid for PostgreSQL dialect
              </AlertDescription>
            </Alert>
            <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-xs text-green-800 dark:text-green-200">
                All referenced columns exist in schema
              </AlertDescription>
            </Alert>
            <Alert className="border-green-200 dark:border-green-900 bg-green-50 dark:bg-green-950 p-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <AlertDescription className="text-xs text-green-800 dark:text-green-200">
                No dangerous operations (DROP, DELETE, TRUNCATE)
              </AlertDescription>
            </Alert>
          </div>
        )}
      </Card>

      {/* Feedback */}
      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground mb-2">Confidence: <span className="text-primary font-semibold">94%</span></p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="text-xs bg-transparent">
            👍 Correct
          </Button>
          <Button variant="outline" size="sm" className="text-xs bg-transparent">
            👎 Incorrect
          </Button>
          <Button variant="outline" size="sm" className="text-xs ml-auto bg-transparent">
            Edit
          </Button>
        </div>
      </div>
    </div>
  );
}
