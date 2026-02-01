'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Sparkles,
    Loader2,
    Copy,
    Check,
    Play,
    AlertCircle,
    CheckCircle2,
    Database,
} from 'lucide-react';
import { useGenerateQuery } from '@/hooks/use-semantic';
import { useDataSources } from '@/hooks/use-data-sources';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface QueryBuilderAIProps {
    className?: string;
    onQueryGenerated?: (sql: string) => void;
}

export function QueryBuilderAI({ className, onQueryGenerated }: QueryBuilderAIProps) {
    const [prompt, setPrompt] = React.useState('');
    const [dataSourceId, setDataSourceId] = React.useState<string>('');
    const [copied, setCopied] = React.useState(false);
    const router = useRouter();

    // Hooks
    const { generateQuery, isGenerating, generatedQuery, error } = useGenerateQuery();
    const { data: dataSources, isLoading: isLoadingDataSources } = useDataSources();

    // Set default data source
    React.useEffect(() => {
        if (dataSources?.data && dataSources.data.length > 0 && !dataSourceId) {
            setDataSourceId(dataSources.data[0].id);
        }
    }, [dataSources, dataSourceId]);

    const handleGenerate = () => {
        if (!prompt.trim() || !dataSourceId || isGenerating) return;

        generateQuery({
            prompt: prompt.trim(),
            dataSourceId,
        });

        if (onQueryGenerated && generatedQuery?.generatedSql) {
            onQueryGenerated(generatedQuery.generatedSql);
        }
    };

    const handleCopy = async () => {
        if (!generatedQuery?.generatedSql) return;

        try {
            await navigator.clipboard.writeText(generatedQuery.generatedSql);
            setCopied(true);
            toast.success('SQL copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy SQL');
        }
    };

    const handleExecute = () => {
        if (!generatedQuery?.generatedSql) return;

        // Navigate to query editor with pre-filled SQL
        router.push(`/query-builder?sql=${encodeURIComponent(generatedQuery.generatedSql)}`);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleGenerate();
        }
    };

    return (
        <Card
            className={cn(
                'flex flex-col gap-4 p-6 bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-600/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h3 className="text-base font-semibold">AI Query Generator</h3>
                    <p className="text-xs text-muted-foreground">
                        Describe your query in natural language
                    </p>
                </div>
            </div>

            {/* Data Source Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">Data Source</label>
                <Select value={dataSourceId} onValueChange={setDataSourceId} disabled={isLoadingDataSources}>
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                        <SelectValue placeholder="Select a data source" />
                    </SelectTrigger>
                    <SelectContent>
                        {isLoadingDataSources ? (
                            <div className="p-2">
                                <Skeleton className="h-8 w-full" />
                            </div>
                        ) : dataSources?.data && dataSources.data.length > 0 ? (
                            dataSources.data.map((ds) => (
                                <SelectItem key={ds.id} value={ds.id}>
                                    <div className="flex items-center gap-2">
                                        <Database className="w-3 h-3" />
                                        <span>{ds.name}</span>
                                        <Badge variant="outline" className="ml-auto text-[9px]">
                                            {ds.type}
                                        </Badge>
                                    </div>
                                </SelectItem>
                            ))
                        ) : (
                            <div className="p-2 text-xs text-muted-foreground">
                                No data sources available
                            </div>
                        )}
                    </SelectContent>
                </Select>
            </div>

            {/* Prompt Input */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Describe Your Query
                </label>
                <div className="relative">
                    <Textarea
                        placeholder="e.g., Show me the top 10 customers by total revenue in the last 6 months"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        onKeyDown={handleKeyDown}
                        className="min-h-[100px] resize-none bg-background/50 backdrop-blur-sm"
                        disabled={isGenerating}
                    />
                </div>
                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                    <span>Press Cmd/Ctrl+Enter to generate</span>
                    <span>{prompt.length} characters</span>
                </div>
            </div>

            {/* Generate Button */}
            <Button
                onClick={handleGenerate}
                disabled={!prompt.trim() || !dataSourceId || isGenerating}
                className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating SQL...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Query
                    </>
                )}
            </Button>

            {/* Generated SQL */}
            {generatedQuery && (
                <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {/* Validation Status */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {generatedQuery.isValid ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        Valid SQL Query
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                    <span className="text-xs font-medium text-destructive">
                                        Invalid SQL
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px]">
                                {generatedQuery.tokensUsed} tokens
                            </Badge>
                            {generatedQuery.cost > 0 && (
                                <Badge variant="outline" className="text-[9px]">
                                    ${generatedQuery.cost.toFixed(4)}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* SQL Display */}
                    <div className="relative group">
                        <div
                            className={cn(
                                'p-4 rounded-lg border-2 bg-muted/50 backdrop-blur-sm transition-all duration-300',
                                generatedQuery.isValid
                                    ? 'border-emerald-500/30 hover:border-emerald-500/50'
                                    : 'border-destructive/30 hover:border-destructive/50'
                            )}
                        >
                            <pre className="text-xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                                {generatedQuery.generatedSql}
                            </pre>
                        </div>

                        {/* Action Buttons */}
                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                variant="secondary"
                                size="icon"
                                className="h-7 w-7"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <Check className="w-3 h-3" />
                                ) : (
                                    <Copy className="w-3 h-3" />
                                )}
                            </Button>
                        </div>
                    </div>

                    {/* Error Message */}
                    {generatedQuery.error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-xs text-destructive">{generatedQuery.error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {generatedQuery.isValid && (
                        <div className="flex gap-2">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={handleExecute}
                            >
                                <Play className="w-4 h-4 mr-2" />
                                Execute Query
                            </Button>
                            <Button
                                variant="outline"
                                onClick={handleCopy}
                            >
                                {copied ? (
                                    <>
                                        <Check className="w-4 h-4 mr-2" />
                                        Copied
                                    </>
                                ) : (
                                    <>
                                        <Copy className="w-4 h-4 mr-2" />
                                        Copy SQL
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            )}

            {/* Error State */}
            {error && !generatedQuery && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in-0">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-destructive">
                                Failed to generate query
                            </p>
                            <p className="text-xs text-destructive/80 mt-1">{error.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Suggested Prompts */}
            {!generatedQuery && !isGenerating && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setPrompt('Show top 10 customers by revenue')}
                        >
                            Top customers
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() =>
                                setPrompt('Calculate monthly sales trend for the last 12 months')
                            }
                        >
                            Monthly sales trend
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => setPrompt('Find products with low stock levels')}
                        >
                            Low stock products
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
