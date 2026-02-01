'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Play, Save, Copy, Check, AlertCircle, CheckCircle } from 'lucide-react';
import { useGenerateQuery } from '@/hooks/use-semantic';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface QueryBuilderProps {
    onExecuteQuery?: (sql: string) => void;
    onSaveQuery?: (sql: string, prompt: string) => void;
    className?: string;
}

const EXAMPLE_PROMPTS = [
    'Show top 10 customers by revenue',
    'List all active users from last 30 days',
    'Calculate average order value by month',
    'Find products with low stock levels',
];

export function QueryBuilder({ onExecuteQuery, onSaveQuery, className }: QueryBuilderProps) {
    const [prompt, setPrompt] = React.useState('');
    const [generatedSQL, setGeneratedSQL] = React.useState('');
    const [copied, setCopied] = React.useState(false);

    const { mutate: generateQuery, isPending, data, error } = useGenerateQuery();

    // Update generated SQL when data changes
    React.useEffect(() => {
        if (data?.generatedQuery) {
            setGeneratedSQL(data.generatedQuery);
        }
    }, [data]);

    const handleGenerate = () => {
        if (!prompt.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        generateQuery({ prompt: prompt.trim() });
    };

    const handleCopy = async () => {
        if (!generatedSQL) return;

        try {
            await navigator.clipboard.writeText(generatedSQL);
            setCopied(true);
            toast.success('SQL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy SQL');
        }
    };

    const handleExecute = () => {
        if (!generatedSQL) {
            toast.error('No query to execute');
            return;
        }

        if (onExecuteQuery) {
            onExecuteQuery(generatedSQL);
            toast.success('Query executed');
        } else {
            toast.info('Execute query handler not provided');
        }
    };

    const handleSave = () => {
        if (!generatedSQL || !prompt) {
            toast.error('No query to save');
            return;
        }

        if (onSaveQuery) {
            onSaveQuery(generatedSQL, prompt);
            toast.success('Query saved to collection');
        } else {
            toast.info('Save query handler not provided');
        }
    };

    const isValid = generatedSQL && !error;

    return (
        <Card
            className={cn(
                'flex flex-col h-full bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-border/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center">
                    <Sparkles className="w-4 h-4 text-purple-500" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold">AI Query Builder</h3>
                    <p className="text-[10px] text-muted-foreground">
                        Natural language to SQL
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4 overflow-auto">
                {/* Natural Language Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                        Describe your query in plain English
                    </label>
                    <Textarea
                        placeholder="e.g., Show me all customers who made purchases in the last 30 days..."
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[100px] resize-none"
                        maxLength={500}
                    />
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-muted-foreground">
                            {prompt.length}/500 characters
                        </p>

                        {/* Example Prompts */}
                        <div className="flex gap-1">
                            {EXAMPLE_PROMPTS.slice(0, 2).map((example, i) => (
                                <Button
                                    key={i}
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-[10px]"
                                    onClick={() => setPrompt(example)}
                                >
                                    Example {i + 1}
                                </Button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Generate Button */}
                <Button
                    onClick={handleGenerate}
                    disabled={isPending || !prompt.trim()}
                    className="w-full"
                >
                    {isPending ? (
                        <>
                            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate SQL
                        </>
                    )}
                </Button>

                {/* SQL Preview */}
                {(generatedSQL || isPending || error) && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">
                                Generated SQL
                            </label>

                            {/* Validation Status */}
                            {generatedSQL && (
                                <Badge
                                    variant={isValid ? 'default' : 'destructive'}
                                    className="h-5 text-[10px]"
                                >
                                    {isValid ? (
                                        <>
                                            <CheckCircle className="w-3 h-3 mr-1" />
                                            Valid
                                        </>
                                    ) : (
                                        <>
                                            <AlertCircle className="w-3 h-3 mr-1" />
                                            Invalid
                                        </>
                                    )}
                                </Badge>
                            )}
                        </div>

                        {/* SQL Display */}
                        {isPending ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                                <Skeleton className="h-4 w-5/6" />
                            </div>
                        ) : error ? (
                            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                                <p className="text-xs text-destructive">
                                    {error.message || 'Failed to generate query'}
                                </p>
                            </div>
                        ) : generatedSQL ? (
                            <div className="relative group">
                                <SyntaxHighlighter
                                    language="sql"
                                    style={oneDark as any}
                                    customStyle={{
                                        margin: 0,
                                        borderRadius: '0.375rem',
                                        fontSize: '0.75rem',
                                        lineHeight: '1.25rem',
                                    }}
                                >
                                    {generatedSQL}
                                </SyntaxHighlighter>

                                {/* Copy Button */}
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={handleCopy}
                                >
                                    {copied ? (
                                        <Check className="w-3 h-3" />
                                    ) : (
                                        <Copy className="w-3 h-3" />
                                    )}
                                </Button>
                            </div>
                        ) : null}

                        {/* Metadata */}
                        {data && (
                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                                {data.tokensUsed !== undefined && (
                                    <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                                        {data.tokensUsed} tokens
                                    </Badge>
                                )}
                                {data.cost !== undefined && data.cost > 0 && (
                                    <Badge variant="outline" className="h-4 px-1.5 text-[9px]">
                                        ${data.cost.toFixed(4)}
                                    </Badge>
                                )}
                                {data.generationTime && (
                                    <span>{data.generationTime}ms</span>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Actions */}
            {generatedSQL && (
                <div className="p-4 border-t border-border/50 flex gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleExecute}
                        disabled={!isValid}
                        className="flex-1"
                    >
                        <Play className="w-3 h-3 mr-1" />
                        Execute Query
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSave}
                        disabled={!isValid}
                        className="flex-1"
                    >
                        <Save className="w-3 h-3 mr-1" />
                        Save to Collection
                    </Button>
                </div>
            )}
        </Card>
    );
}
