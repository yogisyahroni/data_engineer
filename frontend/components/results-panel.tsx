'use client';

import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Copy, ChevronUp, ChevronDown, ArrowUpDown, Search, Loader2, LayoutGrid, Table as TableIcon, Grid3X3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { AddToDashboardDialog } from '@/components/dashboard/add-to-dashboard-dialog';
import { VisualizationConfig } from '@/lib/types';
import dynamic from 'next/dynamic';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { ConnectFeedDialog } from '@/components/query-results/connect-feed-dialog';
import { Plug } from 'lucide-react';

import { StatusBadge } from '@/components/catalog/status-badge';

const SpreadsheetView = dynamic(
  () => import('./query-results/spreadsheet-view'),
  { ssr: false }
);

interface ResultsPanelProps {
  data: Record<string, any>[] | null;
  columns: string[] | null;
  rowCount: number;
  executionTime: number;
  error?: string | null;
  sql?: string;
  aiPrompt?: string;
  connectionId?: string;
  queryId?: string;
  certificationStatus?: 'draft' | 'verified' | 'deprecated';
  visualizationConfig?: Partial<VisualizationConfig>;
  pagination?: {
    page: number;
    pageSize: number;
    totalRows: number;
  };
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

type SortDirection = 'asc' | 'desc' | null;
type SortConfig = { column: string; direction: SortDirection };

export function ResultsPanel({
  data,
  columns,
  rowCount,
  executionTime,
  isLoading = false,
  error = null,
  sql = '',
  aiPrompt,
  connectionId = 'db1',
  queryId,
  certificationStatus,
  visualizationConfig,
  pagination,
  onPageChange,
  onPageSizeChange,
}: ResultsPanelProps) {
  const [sortConfig, setSortConfig] = useState<SortConfig>({ column: '', direction: null });
  const [searchQuery, setSearchQuery] = useState('');
  const [localPage, setLocalPage] = useState(1); // Fallback if no server pagination
  const [isPinDialogOpen, setIsPinDialogOpen] = useState(false);
  const [isConnectDialogOpen, setIsConnectDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'table' | 'spreadsheet'>('table');

  // Use server pagination if available, else local
  const currentPage = pagination?.page || localPage;
  const rowsPerPage = pagination?.pageSize || 50;
  const totalCount = pagination?.totalRows || rowCount;

  // Handle sorting
  const handleSort = (column: string) => {
    setSortConfig((prev) => {
      if (prev.column === column) {
        // Cycle through: asc -> desc -> null
        if (prev.direction === 'asc') return { column, direction: 'desc' };
        if (prev.direction === 'desc') return { column: '', direction: null };
      }
      return { column, direction: 'asc' };
    });
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    if (!data) return [];

    let result = [...data];

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter((row) =>
        Object.values(row).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Sort
    if (sortConfig.column && sortConfig.direction) {
      result.sort((a, b) => {
        const aVal = a[sortConfig.column];
        const bVal = b[sortConfig.column];

        if (aVal === null || aVal === undefined) return 1;
        if (bVal === null || bVal === undefined) return -1;

        let comparison = 0;
        if (typeof aVal === 'number' && typeof bVal === 'number') {
          comparison = aVal - bVal;
        } else {
          comparison = String(aVal).localeCompare(String(bVal));
        }

        return sortConfig.direction === 'asc' ? comparison : -comparison;
      });
    }

    return result;
  }, [data, searchQuery, sortConfig]);

  // Pagination logic
  // If server pagination is active, 'data' is ALREADY the current page.
  // If client-side (legacy), we slice it.
  const isServerSide = !!pagination;

  const paginatedData = useMemo(() => {
    if (isServerSide) {
      // Data is already paginated by server
      return processedData;
    }
    // Client-side pagination
    return processedData.slice(
      (currentPage - 1) * rowsPerPage,
      currentPage * rowsPerPage
    );
  }, [processedData, isServerSide, currentPage, rowsPerPage]);

  const totalPages = Math.ceil((isServerSide ? totalCount : processedData.length) / rowsPerPage);

  // Copy results to clipboard
  const handleCopy = async () => {
    if (!data) return;
    const text = data.map((row) => Object.values(row).join('\t')).join('\n');
    await navigator.clipboard.writeText(text);
  };

  // Export as CSV
  const handleExport = () => {
    if (!data || !columns) return;

    const csvContent = [
      columns.join(','),
      ...data.map((row) =>
        columns.map((col) => {
          const value = row[col];
          // Escape quotes and wrap in quotes if contains comma
          const strValue = String(value ?? '');
          if (strValue.includes(',') || strValue.includes('"')) {
            return `"${strValue.replace(/"/g, '""')}"`;
          }
          return strValue;
        }).join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `query-results-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Format cell value for display
  const formatCellValue = (value: any, column: string): React.ReactNode => {
    if (value === null || value === undefined) {
      return <span className="text-muted-foreground italic">null</span>;
    }

    // Detect and format numbers as currency if column name suggests it
    if (typeof value === 'number') {
      const currencyColumns = ['amount', 'total', 'price', 'sales', 'revenue', 'cost'];
      const isCurrency = currencyColumns.some((c) => column.toLowerCase().includes(c));
      if (isCurrency) {
        return (
          <span className="font-semibold text-emerald-400">
            ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
          </span>
        );
      }
      return <span className="font-mono">{value.toLocaleString()}</span>;
    }

    // Format dates
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
      return <span className="text-muted-foreground">{value}</span>;
    }

    // Format booleans
    if (typeof value === 'boolean') {
      return (
        <Badge variant={value ? 'default' : 'secondary'} className="text-xs">
          {value ? 'true' : 'false'}
        </Badge>
      );
    }

    return String(value);
  };

  // Get sort icon
  const getSortIcon = (column: string) => {
    if (sortConfig.column !== column) {
      return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    }
    if (sortConfig.direction === 'asc') {
      return <ChevronUp className="w-3 h-3 text-primary" />;
    }
    return <ChevronDown className="w-3 h-3 text-primary" />;
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="bg-background h-full flex flex-col">
        <div className="border-b border-border px-6 py-4 bg-card">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-4 w-24 mt-2" />
        </div>
        <div className="flex-1 p-6 space-y-3">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="bg-background h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto">
            <span className="text-3xl">⚠️</span>
          </div>
          <h3 className="text-lg font-semibold text-foreground">Query Error</h3>
          <p className="text-sm text-muted-foreground">{error}</p>
          <code className="block text-xs bg-muted p-3 rounded-lg text-left overflow-auto max-h-32">
            {error}
          </code>
        </div>
      </div>
    );
  }

  // Empty state
  if (!data || data.length === 0) {
    return (
      <div className="bg-background h-full flex flex-col items-center justify-center p-8">
        <div className="max-w-md text-center space-y-4">
          <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Search className="w-10 h-10 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">No Results</h3>
          <p className="text-sm text-muted-foreground">
            Execute a query to see results here. Try the SQL editor or ask AI to help you write a query.
          </p>
        </div>
      </div>
    );
  }

  const displayColumns = columns || Object.keys(data[0] || {});

  return (
    <div className="bg-background h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-border px-6 py-4 bg-card flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Query Results</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {processedData.length.toLocaleString()} of {totalCount.toLocaleString()} rows
              {searchQuery && ' (filtered)'}
            </p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search results..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                if (onPageChange) onPageChange(1);
                else setLocalPage(1);
              }}
              className="pl-9 h-8 w-48 text-sm"
              data-testid="search-results-input"
            />
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 text-green-600 border-green-200 hover:bg-green-50 dark:hover:bg-green-900/10" onClick={() => setIsConnectDialogOpen(true)}>
            <Plug className="w-4 h-4" />
            <span className="hidden sm:inline">Connect</span>
          </Button>
          <Button variant="outline" size="sm" className="gap-2 border-primary/20 text-primary hover:bg-primary/5" onClick={() => setIsPinDialogOpen(true)} data-testid="pin-to-dashboard-button">
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden sm:inline">Pin to Dashboard</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleCopy} data-testid="copy-results-button">
            <Copy className="w-4 h-4" />
            <span className="hidden sm:inline">Copy</span>
          </Button>
          <Button variant="ghost" size="sm" className="gap-2" onClick={handleExport} data-testid="export-results-button">
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </Button>

          <div className="h-6 w-px bg-border mx-2" />

          <ToggleGroup type="single" value={viewMode} onValueChange={(v) => v && setViewMode(v as any)} className="border rounded-md">
            <ToggleGroupItem value="table" size="sm" aria-label="Table View" className="h-8 px-2">
              <TableIcon className="w-4 h-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="spreadsheet" size="sm" aria-label="Spreadsheet View" className="h-8 px-2">
              <Grid3X3 className="w-4 h-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>

        <AddToDashboardDialog
          isOpen={isPinDialogOpen}
          onOpenChange={setIsPinDialogOpen}
          sql={sql}
          aiPrompt={aiPrompt}
          connectionId={connectionId}
          visualizationConfig={visualizationConfig}
        />

        <ConnectFeedDialog
          isOpen={isConnectDialogOpen}
          onOpenChange={setIsConnectDialogOpen}
          queryId={queryId}
        />
      </div>



      {/* Table or Spreadsheet */}
      <div className="flex-1 overflow-auto" data-testid="results-table-container">
        {viewMode === 'table' ? (
          <Table>
            <TableHeader className="sticky top-0 bg-card border-b border-border z-10">
              <TableRow>
                <TableHead className="w-12 text-center text-xs font-medium text-muted-foreground">
                  #
                </TableHead>
                {displayColumns.map((column) => (
                  <TableHead
                    key={column}
                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                    onClick={() => handleSort(column)}
                    data-testid={`column-head-${column}`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{column}</span>
                      {getSortIcon(column)}
                    </div>
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody data-testid="results-table-body">
              {paginatedData.map((row, rowIndex) => (
                <TableRow
                  key={rowIndex}
                  className="hover:bg-muted/30 transition-colors"
                  data-testid={`result-row-${rowIndex}`}
                >
                  <TableCell className="text-center font-mono text-xs text-muted-foreground">
                    {(currentPage - 1) * rowsPerPage + rowIndex + 1}
                  </TableCell>
                  {displayColumns.map((column) => (
                    <TableCell key={column} className="text-sm">
                      {formatCellValue(row[column], column)}
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <SpreadsheetView
            data={processedData}
            columns={displayColumns}
          />
        )}
      </div>

      {/* Footer with Pagination */}
      <div className="border-t border-border px-6 py-3 bg-card flex items-center justify-between flex-shrink-0">
        <span className="text-xs text-muted-foreground">
          Showing {((currentPage - 1) * rowsPerPage) + 1}-
          {Math.min(currentPage * rowsPerPage, totalCount)} of{' '}
          {totalCount.toLocaleString()} rows
        </span>

        <div className="flex items-center gap-4">
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newPage = Math.max(1, currentPage - 1);
                  if (onPageChange) onPageChange(newPage);
                  else setLocalPage(newPage);
                }}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground px-2">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  const newPage = Math.min(totalPages, currentPage + 1);
                  if (onPageChange) onPageChange(newPage);
                  else setLocalPage(newPage);
                }}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          )}

          <span className="font-mono text-xs text-muted-foreground">
            {executionTime > 0 ? `${executionTime}ms` : '—'}
          </span>
        </div>
      </div>
    </div >
  );
}
