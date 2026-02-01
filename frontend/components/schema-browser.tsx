'use client';

import { useState, useMemo, useEffect } from 'react';
import { X, Database, Table, AlertCircle, Search, ChevronDown, ChevronRight, Key, Link } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import type { SchemaInfo } from '@/hooks/use-connections';

interface SchemaBrowserProps {
  onClose: () => void;
  schema?: SchemaInfo | null;
  isLoading?: boolean;
  connectionName?: string;
}

// Fallback mock schema when no real schema is available
// Fallback when no schema
const EMPTY_SCHEMA: SchemaInfo = {
  tables: [],
  lastSyncedAt: new Date(),
};

export function SchemaBrowser({
  onClose,
  schema,
  isLoading = false,
  connectionName = 'Default Connection',
}: SchemaBrowserProps) {
  const [mounted, setMounted] = useState(false);
  const [expandedTables, setExpandedTables] = useState<Set<string>>(new Set(['orders']));
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Use provided schema or empty
  const schemaData = schema || EMPTY_SCHEMA;

  // Filter tables based on search
  const filteredTables = useMemo(() => {
    if (!searchQuery) return schemaData.tables;
    const query = searchQuery.toLowerCase();
    return schemaData.tables.filter(
      (table) =>
        table.name.toLowerCase().includes(query) ||
        table.columns.some((col) => col.name.toLowerCase().includes(query))
    );
  }, [schemaData.tables, searchQuery]);

  // Toggle table expansion
  const toggleTable = (tableName: string) => {
    setExpandedTables((prev) => {
      const next = new Set(prev);
      if (next.has(tableName)) {
        next.delete(tableName);
      } else {
        next.add(tableName);
      }
      return next;
    });
  };

  // Get type badge color
  const getTypeColor = (type: string): string => {
    const lowerType = type.toLowerCase();
    if (lowerType.includes('int') || lowerType.includes('numeric') || lowerType.includes('decimal')) {
      return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    }
    if (lowerType.includes('varchar') || lowerType.includes('text') || lowerType.includes('char')) {
      return 'bg-green-500/10 text-green-400 border-green-500/20';
    }
    if (lowerType.includes('timestamp') || lowerType.includes('date') || lowerType.includes('time')) {
      return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    }
    if (lowerType.includes('bool')) {
      return 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    }
    if (lowerType.includes('uuid')) {
      return 'bg-pink-500/10 text-pink-400 border-pink-500/20';
    }
    if (lowerType.includes('json')) {
      return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
    return 'bg-muted text-muted-foreground';
  };

  // Format row count
  const formatRowCount = (count: number): string => {
    if (count >= 1000000) return `${(count / 1000000).toFixed(1)}M`;
    if (count >= 1000) return `${(count / 1000).toFixed(1)}K`;
    return count.toString();
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-card overflow-hidden">
        <div className="border-b border-border px-6 py-4 flex-shrink-0">
          <Skeleton className="h-5 w-32 mb-2" />
          <Skeleton className="h-3 w-24" />
        </div>
        <div className="flex-1 px-6 py-4 space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-card overflow-hidden">
      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tables and columns..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-8 text-sm"
          />
        </div>

        {/* Database Info */}
        <Card className="p-3 bg-primary/5 border-primary/30">
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-4 h-4 text-primary" />
            <p className="text-xs font-semibold text-foreground">{connectionName}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {schemaData.tables.length} tables • Updated {mounted ? new Date(schemaData.lastSyncedAt).toLocaleTimeString() : '--:--'}
          </p>
        </Card>

        {/* Tables */}
        {filteredTables.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No tables match your search</p>
          </div>
        ) : (
          filteredTables.map((table) => (
            <div key={table.name} className="border border-border rounded-lg overflow-hidden">
              {/* Table Header */}
              <button
                onClick={() => toggleTable(table.name)}
                className="w-full p-3 bg-muted/50 hover:bg-muted flex items-center gap-3 transition-colors"
              >
                {expandedTables.has(table.name) ? (
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                )}
                <Table className="w-4 h-4 text-primary flex-shrink-0" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-foreground">{table.name}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatRowCount(table.rowCount)} rows
                </span>
              </button>

              {/* Columns List */}
              {expandedTables.has(table.name) && (
                <div className="bg-background border-t border-border divide-y divide-border/50">
                  {/* Columns */}
                  {table.columns.map((col) => {
                    const fk = table.foreignKeys?.find(k => k.column === col.name);

                    return (
                      <div key={col.name} className="px-3 py-2.5 hover:bg-muted/30 transition-colors group/col">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1.5 min-w-[120px] flex-1">
                            {col.isPrimary && (
                              <Key className="w-3 h-3 text-amber-500 shrink-0" />
                            )}
                            {fk && (
                              <div className="group/fk relative">
                                <Link className="w-3 h-3 text-blue-500 shrink-0" />
                                <div className="absolute left-0 bottom-full mb-1 hidden group-hover/fk:block bg-popover text-popover-foreground text-[10px] px-2 py-1 rounded border shadow-sm whitespace-nowrap z-50">
                                  References {fk.referencedTable}.{fk.referencedColumn}
                                </div>
                              </div>
                            )}
                            <code className="text-xs font-mono text-foreground font-semibold truncate hover:text-primary cursor-pointer">
                              {col.name}
                            </code>
                          </div>
                          <Badge
                            variant="outline"
                            className={`text-[10px] h-4 font-mono px-1 ${getTypeColor(col.type)}`}
                          >
                            {col.type}
                          </Badge>
                        </div>

                        {/* Distribution Preview (Pseudo-stats for now) */}
                        <div className="mt-1.5 flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden flex">
                            <div className="h-full bg-primary/40 rounded-full" style={{ width: '45%' }} />
                          </div>
                          <span className="text-[10px] text-muted-foreground tabular-nums">45%</span>
                        </div>

                        {col.description && (
                          <p className="text-[11px] text-muted-foreground mt-1 pl-4 leading-normal">
                            {col.description}
                          </p>
                        )}
                      </div>
                    )
                  })}

                  {/* Relationships Section */}
                  {table.foreignKeys && table.foreignKeys.length > 0 && (
                    <div className="px-3 py-2 bg-muted/10 border-t border-border/50">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">Relationships</p>
                      <div className="space-y-1">
                        {table.foreignKeys.map((fk, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Link className="w-3 h-3 opacity-50" />
                            <span className="font-mono">{fk.column}</span>
                            <span className="opacity-50">→</span>
                            <span className="font-mono text-primary">{fk.referencedTable}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-2 border-t border-border/50 bg-muted/20">
                    <Button variant="ghost" size="sm" className="w-full h-7 text-xs text-primary hover:text-primary hover:bg-primary/5">
                      <Database className="w-3 h-3 mr-2" />
                      View Sample Data
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {/* Tips */}
        <Card className="p-3 bg-amber-500/5 border-amber-500/20">
          <div className="flex gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-medium text-amber-200 mb-1">Tip</p>
              <p className="text-xs text-muted-foreground">
                Hover over the <Link className="w-3 h-3 inline-block mx-0.5 text-blue-500" /> icon to see relationship details.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
