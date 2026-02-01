'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
    AlertCircle,
    FileText,
    Database,
    BarChart3,
} from 'lucide-react';
import { useExplainData } from '@/hooks/use-semantic';
import { toast } from 'sonner';
import type { ExplainDataRequest } from '@/lib/types/semantic';

interface DataExplainerProps {
    className?: string;
}

export function DataExplainer({ className }: DataExplainerProps) {
    const [type, setType] = React.useState<'data' | 'query' | 'chart'>('data');
    const [prompt, setPrompt] = React.useState('');
    const [context, setContext] = React.useState('{}');
    const [copied, setCopied] = React.useState(false);

    // Hooks
    const { explainData, isExplaining, explanation, error } = useExplainData();

    const handleExplain = () => {
        if (!prompt.trim() || isExplaining) return;

        let parsedContext: Record<string, any> = {};
        try {
            parsedContext = JSON.parse(context);
        } catch (e) {
            toast.error('Invalid JSON in context');
            return;
        }

        explainData({
            type,
            prompt: prompt.trim(),
            context: parsedContext,
        });
    };

    const handleCopy = async () => {
        if (!explanation?.response) return;

        try {
            await navigator.clipboard.writeText(explanation.response);
            setCopied(true);
            toast.success('Explanation copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy explanation');
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            handleExplain();
        }
    };

    const getTypeIcon = () => {
        switch (type) {
            case 'data':
                return <Database className="w-4 h-4" />;
            case 'query':
                return <FileText className="w-4 h-4" />;
            case 'chart':
                return <BarChart3 className="w-4 h-4" />;
        }
    };

    const getTypeColor = () => {
        switch (type) {
            case 'data':
                return 'from-blue-500/20 to-cyan-600/20';
            case 'query':
                return 'from-green-500/20 to-emerald-600/20';
            case 'chart':
                return 'from-orange-500/20 to-amber-600/20';
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
                <div
                    className={cn(
                        'w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center',
                        getTypeColor()
                    )}
                >
                    <Sparkles className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                    <h3 className="text-base font-semibold">AI Data Explainer</h3>
                    <p className="text-xs text-muted-foreground">
                        Get AI-powered insights and explanations
                    </p>
                </div>
            </div>

            {/* Type Selector */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    What would you like to explain?
                </label>
                <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                    <SelectTrigger className="bg-background/50 backdrop-blur-sm">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="data">
                            <div className="flex items-center gap-2">
                                <Database className="w-3 h-3" />
                                <span>Data Analysis</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="query">
                            <div className="flex items-center gap-2">
                                <FileText className="w-3 h-3" />
                                <span>Query Explanation</span>
                            </div>
                        </SelectItem>
                        <SelectItem value="chart">
                            <div className="flex items-center gap-2">
                                <BarChart3 className="w-3 h-3" />
                                <span>Chart Insights</span>
                            </div>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Prompt Input */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    What would you like to know?
                </label>
                <Textarea
                    placeholder={
                        type === 'data'
                            ? 'e.g., What insights can you find in this sales data?'
                            : type === 'query'
                                ? 'e.g., Explain what this SQL query does'
                                : 'e.g., What trends do you see in this chart?'
                    }
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[80px] resize-none bg-background/50 backdrop-blur-sm"
                    disabled={isExplaining}
                />
            </div>

            {/* Context Input */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Context (JSON)
                </label>
                <Textarea
                    placeholder='{"table": "sales", "columns": ["date", "revenue", "region"]}'
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    className="min-h-[60px] font-mono text-xs resize-none bg-background/50 backdrop-blur-sm"
                    disabled={isExplaining}
                />
                <p className="text-[10px] text-muted-foreground px-1">
                    Provide additional context as JSON (optional)
                </p>
            </div>

            {/* Explain Button */}
            <Button
                onClick={handleExplain}
                disabled={!prompt.trim() || isExplaining}
                className="w-full bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700"
            >
                {isExplaining ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Analyzing...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Get Explanation
                    </>
                )}
            </Button>

            {/* Explanation */}
            {explanation && (
                <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {/* Metadata */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {getTypeIcon()}
                            <span className="text-xs font-medium capitalize">{type} Explanation</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px]">
                                {explanation.tokensUsed} tokens
                            </Badge>
                            {explanation.cost > 0 && (
                                <Badge variant="outline" className="text-[9px]">
                                    ${explanation.cost.toFixed(4)}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Explanation Display */}
                    <div className="relative group">
                        <div className="p-4 rounded-lg border-2 border-blue-500/30 bg-muted/50 backdrop-blur-sm hover:border-blue-500/50 transition-all duration-300">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                    {explanation.response}
                                </p>
                            </div>
                        </div>

                        {/* Copy Button */}
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
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
                    {explanation.error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-xs text-destructive">{explanation.error}</p>
                        </div>
                    )}

                    {/* Copy Button */}
                    <Button variant="outline" onClick={handleCopy}>
                        {copied ? (
                            <>
                                <Check className="w-4 h-4 mr-2" />
                                Copied
                            </>
                        ) : (
                            <>
                                <Copy className="w-4 h-4 mr-2" />
                                Copy Explanation
                            </>
                        )}
                    </Button>
                </div>
            )}

            {/* Error State */}
            {error && !explanation && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in-0">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-destructive">
                                Failed to generate explanation
                            </p>
                            <p className="text-xs text-destructive/80 mt-1">{error.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Suggested Examples */}
            {!explanation && !isExplaining && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                        {type === 'data' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() =>
                                        setPrompt('What are the key trends in this sales data?')
                                    }
                                >
                                    Key trends
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setPrompt('Identify any anomalies or outliers')}
                                >
                                    Find anomalies
                                </Button>
                            </>
                        )}
                        {type === 'query' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setPrompt('Explain this query in simple terms')}
                                >
                                    Simplify query
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setPrompt('How can I optimize this query?')}
                                >
                                    Optimize query
                                </Button>
                            </>
                        )}
                        {type === 'chart' && (
                            <>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setPrompt('What story does this chart tell?')}
                                >
                                    Chart story
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="text-xs h-7"
                                    onClick={() => setPrompt('What insights can I share?')}
                                >
                                    Key insights
                                </Button>
                            </>
                        )}
                    </div>
                </div>
            )}
        </Card>
    );
}
