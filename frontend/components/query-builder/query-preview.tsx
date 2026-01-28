'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Play, Save, Copy, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { SQLGenerator } from '@/lib/query-builder/sql-generator';
import { QueryBuilderState } from '@/lib/query-builder/types';
import { toast } from 'sonner';

interface QueryPreviewProps {
    state: QueryBuilderState;
    onSave?: (sql: string) => void;
}

export function QueryPreview({ state, onSave }: QueryPreviewProps) {
    const [sql, setSql] = useState('');
    const [isExecuting, setIsExecuting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        try {
            if (state.table && state.columns.length > 0) {
                const generated = SQLGenerator.generate(state);
                const validation = SQLGenerator.validate(generated);

                if (validation.valid) {
                    setSql(generated);
                    setError(null);
                } else {
                    setSql(generated);
                    setError(validation.error || 'Invalid SQL');
                }
            } else {
                setSql('');
                setError(null);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Failed to generate SQL';
            setError(message);
            setSql('');
        }
    }, [state]);

    const handleExecute = async () => {
        if (!sql || error) return;

        try {
            setIsExecuting(true);
            setError(null);

            const res = await fetch('/api/queries/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sql,
                    connectionId: state.connectionId,
                    page: 1,
                    pageSize: 100,
                }),
            });

            const data = await res.json();

            if (data.success) {
                setResult(data);
                toast.success(`Query executed successfully (${data.rowCount} rows)`);
            } else {
                setError(data.error || 'Query execution failed');
                toast.error(data.error || 'Query execution failed');
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Unknown error';
            setError(message);
            toast.error(message);
        } finally {
            setIsExecuting(false);
        }
    };

    const handleCopy = async () => {
        if (!sql) return;

        try {
            await navigator.clipboard.writeText(sql);
            setCopied(true);
            toast.success('SQL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            toast.error('Failed to copy SQL');
        }
    };

    return (
        <div className="space-y-4">
            {/* SQL Preview Card */}
            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle className="text-base">SQL Preview</CardTitle>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onSave && sql && onSave(sql)}
                                disabled={!sql || !onSave}
                            >
                                <Save className="h-4 w-4 mr-2" />
                                Save
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleCopy}
                                disabled={!sql}
                            >
                                {copied ? (
                                    <CheckCircle2 className="h-4 w-4 mr-2" />
                                ) : (
                                    <Copy className="h-4 w-4 mr-2" />
                                )}
                                {copied ? 'Copied!' : 'Copy'}
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleExecute}
                                disabled={!sql || !!error || isExecuting}
                            >
                                {isExecuting ? (
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <Play className="h-4 w-4 mr-2" />
                                )}
                                Run Query
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {!sql ? (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Select a table and columns to generate SQL
                        </p>
                    ) : (
                        <pre className="bg-muted p-4 rounded-md overflow-x-auto text-sm font-mono">
                            {sql}
                        </pre>
                    )}

                    {error && (
                        <Alert variant="destructive" className="mt-4">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                </CardContent>
            </Card>

            {/* Results Card */}
            {result && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">
                            Results ({result.rowCount} rows in {result.executionTime}ms)
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        {result.columns?.map((col: string) => (
                                            <th
                                                key={col}
                                                className="text-left p-2 font-medium text-muted-foreground"
                                            >
                                                {col}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.data?.slice(0, 100).map((row: any, index: number) => (
                                        <tr key={index} className="border-b last:border-0">
                                            {result.columns?.map((col: string) => (
                                                <td key={col} className="p-2">
                                                    {row[col] !== null && row[col] !== undefined
                                                        ? String(row[col])
                                                        : <span className="text-muted-foreground italic">null</span>}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {result.data && result.data.length > 100 && (
                            <p className="text-xs text-muted-foreground text-center mt-4">
                                Showing first 100 of {result.rowCount} rows
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
