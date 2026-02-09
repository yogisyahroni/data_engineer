'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Copy, CheckCheck, AlertCircle, Code2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { VisualQueryConfig } from '@/lib/query-builder/types';

interface SQLPreviewProps {
    config: VisualQueryConfig;
    connectionId: string;
}

export function SQLPreview({ config, connectionId }: SQLPreviewProps) {
    const [sql, setSQL] = useState<string>('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        generateSQL();
    }, [config, connectionId]);

    const generateSQL = async () => {
        // Check if config has minimal requirements
        if (config.tables.length === 0) {
            setSQL('-- Select tables to start building your query');
            setError(null);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/visual-queries/generate-sql', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    connection_id: connectionId,
                    config,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Failed to generate SQL');
            }

            const data = await response.json();
            setSQL(data.sql || '');
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            setSQL('-- Error generating SQL: ' + message);
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            toast.success('SQL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy SQL');
        }
    };

    const getComplexityBadge = () => {
        let complexity = 0;
        if (config.tables.length > 1) complexity += 1;
        if (config.joins.length > 0) complexity += 1;
        if (config.filters.conditions.length > 0) complexity += 1;
        if (config.aggregations.length > 0) complexity += 1;
        if (config.groupBy.length > 0) complexity += 1;
        if (config.having.conditions.length > 0) complexity += 1;

        if (complexity === 0) return null;
        if (complexity <= 2)
            return (
                <Badge variant="outline" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Simple
                </Badge>
            );
        if (complexity <= 4)
            return (
                <Badge variant="secondary" className="gap-1">
                    <Sparkles className="h-3 w-3" />
                    Moderate
                </Badge>
            );
        return (
            <Badge variant="default" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Complex
            </Badge>
        );
    };

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Code2 className="h-4 w-4" />
                        Generated SQL
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {getComplexityBadge()}
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleCopy}
                            disabled={loading || error !== null || sql.startsWith('--')}
                            className="h-8"
                        >
                            {copied ? (
                                <CheckCheck className="h-4 w-4 text-green-500" />
                            ) : (
                                <Copy className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-4 w-5/6" />
                    </div>
                ) : error ? (
                    <div className="flex items-start gap-3 p-4 border border-destructive/50 rounded-md bg-destructive/5">
                        <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
                        <div className="flex-1 space-y-1">
                            <p className="text-sm font-medium text-destructive">
                                SQL Generation Error
                            </p>
                            <p className="text-sm text-muted-foreground">{error}</p>
                        </div>
                    </div>
                ) : (
                    <pre className="relative p-4 bg-muted rounded-md overflow-x-auto text-sm font-mono leading-relaxed">
                        <code className="text-foreground">{sql}</code>
                    </pre>
                )}

                {!loading && !error && config.tables.length > 0 && (
                    <div className="mt-3 pt-3 border-t">
                        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                            <div className="flex justify-between">
                                <span>Tables:</span>
                                <span className="font-medium">{config.tables.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Joins:</span>
                                <span className="font-medium">{config.joins.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Columns:</span>
                                <span className="font-medium">{config.columns.length}</span>
                            </div>
                            <div className="flex justify-between">
                                <span>Filters:</span>
                                <span className="font-medium">
                                    {config.filters.conditions.length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Aggregations:</span>
                                <span className="font-medium">
                                    {config.aggregations.length}
                                </span>
                            </div>
                            <div className="flex justify-between">
                                <span>Group By:</span>
                                <span className="font-medium">{config.groupBy.length}</span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
