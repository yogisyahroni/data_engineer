'use client';

import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, Copy, Trash2, RotateCcw } from 'lucide-react';

interface QueryHistoryEntry {
  id: string;
  query: string;
  type: 'ai' | 'sql';
  timestamp: string;
  rowsReturned: number;
  duration: number;
}

interface QueryHistoryProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectQuery?: (query: string) => void;
}

const SAMPLE_HISTORY: QueryHistoryEntry[] = [
  {
    id: '1',
    query: 'Show me top 5 customers by total sales last month',
    type: 'ai',
    timestamp: '2 minutes ago',
    rowsReturned: 5,
    duration: 234,
  },
  {
    id: '2',
    query: 'SELECT customer_name, SUM(amount) as total FROM orders WHERE DATE(created_at) >= DATE_TRUNC(...)',
    type: 'sql',
    timestamp: '15 minutes ago',
    rowsReturned: 12,
    duration: 456,
  },
  {
    id: '3',
    query: 'What are our top selling products by category',
    type: 'ai',
    timestamp: '1 hour ago',
    rowsReturned: 8,
    duration: 321,
  },
  {
    id: '4',
    query: 'SELECT * FROM customers WHERE segment = "Premium" ORDER BY created_at DESC',
    type: 'sql',
    timestamp: '2 hours ago',
    rowsReturned: 45,
    duration: 189,
  },
];

export function QueryHistory({ isOpen, onClose, onSelectQuery }: QueryHistoryProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/50">
      <div className="absolute right-0 top-0 h-full w-96 bg-card border-l border-border flex flex-col shadow-lg">
        {/* Header */}
        <div className="border-b border-border px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">Query History</h2>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            ×
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-3">
          {SAMPLE_HISTORY.map((entry) => (
            <Card key={entry.id} className="p-3 hover:bg-muted/50 transition-colors cursor-pointer border border-border">
              <div className="flex items-start justify-between mb-2">
                <Badge variant={entry.type === 'ai' ? 'default' : 'secondary'} className="text-xs">
                  {entry.type === 'ai' ? '✨ AI' : '📝 SQL'}
                </Badge>
                <span className="text-xs text-muted-foreground">{entry.timestamp}</span>
              </div>
              <p
                className="text-xs text-foreground mb-2 line-clamp-2 hover:line-clamp-none"
                onClick={() => onSelectQuery?.(entry.query)}
              >
                {entry.query}
              </p>
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{entry.rowsReturned} rows • {entry.duration}ms</span>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(entry.query);
                    }}
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectQuery?.(entry.query);
                    }}
                  >
                    <RotateCcw className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>

        {/* Footer */}
        <div className="border-t border-border px-6 py-3 flex-shrink-0">
          <Button variant="outline" size="sm" className="w-full bg-transparent">
            Clear History
          </Button>
        </div>
      </div>
    </div>
  );
}
