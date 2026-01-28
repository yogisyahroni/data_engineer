'use client';

import { useMemo } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface TableVisualizationProps {
    data: Record<string, any>[];
    columns?: string[];
    showTotals?: boolean;
    condensed?: boolean;
    highlightColumn?: string;
    sortColumn?: string;
    sortDirection?: 'asc' | 'desc';
    maxRows?: number;
}

export function TableVisualization({
    data,
    columns,
    showTotals = false,
    condensed = false,
    highlightColumn,
    sortColumn,
    sortDirection = 'desc',
    maxRows = 10,
}: TableVisualizationProps) {
    // Determine columns to display
    const displayColumns = useMemo(() => {
        if (columns && columns.length > 0) return columns;
        if (data && data.length > 0) return Object.keys(data[0]);
        return [];
    }, [columns, data]);

    // Sort and limit data
    const processedData = useMemo(() => {
        if (!data || data.length === 0) return [];

        let result = [...data];

        // Sort if column specified
        if (sortColumn && displayColumns.includes(sortColumn)) {
            result.sort((a, b) => {
                const aVal = a[sortColumn];
                const bVal = b[sortColumn];

                if (typeof aVal === 'number' && typeof bVal === 'number') {
                    return sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
                }

                const comparison = String(aVal).localeCompare(String(bVal));
                return sortDirection === 'asc' ? comparison : -comparison;
            });
        }

        return result.slice(0, maxRows);
    }, [data, sortColumn, sortDirection, displayColumns, maxRows]);

    // Calculate totals for numeric columns
    const totals = useMemo(() => {
        if (!showTotals || !data || data.length === 0) return null;

        const result: Record<string, number | null> = {};

        displayColumns.forEach((col) => {
            const firstValue = data[0][col];
            if (typeof firstValue === 'number') {
                result[col] = data.reduce((sum, row) => sum + (row[col] || 0), 0);
            } else {
                result[col] = null;
            }
        });

        return result;
    }, [showTotals, data, displayColumns]);

    // Format cell value
    const formatCell = (value: any, column: string) => {
        if (value === null || value === undefined) {
            return <span className="text-muted-foreground italic">—</span>;
        }

        if (typeof value === 'boolean') {
            return value ? '✓' : '✗';
        }

        if (typeof value === 'number') {
            // Check for currency columns
            const currencyColumns = ['amount', 'total', 'price', 'sales', 'revenue', 'cost', 'value'];
            const isCurrency = currencyColumns.some((c) => column.toLowerCase().includes(c));

            if (isCurrency) {
                return (
                    <span className="font-medium text-emerald-400">
                        ${value.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </span>
                );
            }

            // Check for percentage columns
            if (column.toLowerCase().includes('percent') || column.toLowerCase().includes('rate')) {
                return `${value.toFixed(1)}%`;
            }

            return value.toLocaleString();
        }

        // Format dates
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}/.test(value)) {
            return new Date(value).toLocaleDateString();
        }

        return String(value);
    };

    // Format column header
    const formatHeader = (column: string) => {
        return column
            .replace(/_/g, ' ')
            .replace(/\b\w/g, (c) => c.toUpperCase());
    };

    if (!data || data.length === 0) {
        return (
            <Card className="p-8 bg-card border-border flex items-center justify-center">
                <p className="text-sm text-muted-foreground">No data available</p>
            </Card>
        );
    }

    return (
        <Card className="bg-card border-border overflow-hidden">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow className="bg-muted/50">
                            {displayColumns.map((column) => (
                                <TableHead
                                    key={column}
                                    className={`font-semibold ${condensed ? 'py-2 px-3' : 'py-3 px-4'}`}
                                >
                                    {formatHeader(column)}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {processedData.map((row, rowIndex) => (
                            <TableRow
                                key={rowIndex}
                                className="hover:bg-muted/30 transition-colors"
                            >
                                {displayColumns.map((column) => (
                                    <TableCell
                                        key={column}
                                        className={`${condensed ? 'py-2 px-3' : 'py-3 px-4'} ${highlightColumn === column ? 'font-semibold' : ''
                                            }`}
                                    >
                                        {formatCell(row[column], column)}
                                    </TableCell>
                                ))}
                            </TableRow>
                        ))}

                        {/* Totals row */}
                        {totals && (
                            <TableRow className="bg-muted/30 font-semibold">
                                {displayColumns.map((column, index) => (
                                    <TableCell key={column} className={condensed ? 'py-2 px-3' : 'py-3 px-4'}>
                                        {index === 0 ? 'Total' : totals[column] !== null ? formatCell(totals[column], column) : ''}
                                    </TableCell>
                                ))}
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Footer */}
            <div className="px-4 py-2 border-t border-border text-xs text-muted-foreground">
                Showing {processedData.length} of {data.length} rows
            </div>
        </Card>
    );
}
