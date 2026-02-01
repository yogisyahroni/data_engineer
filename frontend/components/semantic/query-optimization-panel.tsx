'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
    AlertTriangle,
    AlertCircle,
    Info,
    CheckCircle2,
    TrendingUp,
    Code,
    ArrowRight,
} from 'lucide-react';
import { useAnalyzeQuery } from '@/hooks/use-analyze-query';
import type { QueryAnalysisResult, OptimizationSuggestion } from '@/lib/types/semantic';
import { toast } from 'sonner';

interface QueryOptimizationPanelProps {
    query: string;
    onApplyOptimization?: (optimizedQuery: string) => void;
    className?: string;
}

const SEVERITY_CONFIG = {
    high: {
        icon: AlertTriangle,
        color: 'text-red-500',
        bgColor: 'bg-red-500/10',
        borderColor: 'border-red-500/20',
        variant: 'destructive' as const,
    },
    medium: {
        icon: AlertCircle,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/20',
        variant: 'default' as const,
    },
    low: {
        icon: Info,
        color: 'text-blue-500',
        bgColor: 'bg-blue-500/10',
        borderColor: 'border-blue-500/20',
        variant: 'secondary' as const,
    },
};

const COMPLEXITY_CONFIG = {
    low: { color: 'text-green-500', label: 'Low Complexity' },
    medium: { color: 'text-yellow-500', label: 'Medium Complexity' },
    high: { color: 'text-red-500', label: 'High Complexity' },
};

export function QueryOptimizationPanel({
    query,
    onApplyOptimization,
    className,
}: QueryOptimizationPanelProps) {
    const { analyzeQuery, analysis, isAnalyzing, error } = useAnalyzeQuery();
    const [selectedSuggestion, setSelectedSuggestion] = React.useState<number | null>(null);

    React.useEffect(() => {
        if (query && query.trim().length > 10) {
            analyzeQuery(query);
        }
    }, [query, analyzeQuery]);

    const handleApplyOptimization = (suggestion: OptimizationSuggestion) => {
        if (onApplyOptimization) {
            onApplyOptimization(suggestion.optimized);
            toast.success('Optimization applied to query');
        }
    };

    if (!query || query.trim().length === 0) {
        return null;
    }

    return (
        <Card className={cn('p-4 space-y-4', className)}>
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">Query Optimization</h3>
                        <p className="text-[10px] text-muted-foreground">
                            AI-powered performance suggestions
                        </p>
                    </div>
                </div>
            </div>

            {/* Loading State */}
            {isAnalyzing && (
                <div className="space-y-3">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-20 w-full" />
                </div>
            )}

            {/* Error State */}
            {error && (
                <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                    <p className="text-xs text-destructive">
                        {error.message || 'Failed to analyze query'}
                    </p>
                </div>
            )}

            {/* Analysis Results */}
            {analysis && !isAnalyzing && (
                <div className="space-y-4">
                    {/* Performance Score */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium">Performance Score</span>
                            <span className="text-xs font-bold">{analysis.performanceScore}/100</span>
                        </div>
                        <Progress value={analysis.performanceScore} className="h-2" />
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                            <span>
                                {COMPLEXITY_CONFIG[analysis.complexityLevel].label}
                            </span>
                            <span>{analysis.estimatedImprovement}</span>
                        </div>
                    </div>

                    {/* Suggestions */}
                    {analysis.suggestions.length > 0 ? (
                        <div className="space-y-2">
                            <h4 className="text-xs font-semibold">
                                Optimization Suggestions ({analysis.suggestions.length})
                            </h4>
                            <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {analysis.suggestions.map((suggestion, index) => {
                                    const config = SEVERITY_CONFIG[suggestion.severity];
                                    const Icon = config.icon;
                                    const isSelected = selectedSuggestion === index;

                                    return (
                                        <div
                                            key={index}
                                            className={cn(
                                                'p-3 rounded-md border transition-all cursor-pointer',
                                                config.bgColor,
                                                config.borderColor,
                                                isSelected && 'ring-2 ring-primary'
                                            )}
                                            onClick={() =>
                                                setSelectedSuggestion(isSelected ? null : index)
                                            }
                                        >
                                            {/* Suggestion Header */}
                                            <div className="flex items-start gap-2">
                                                <Icon className={cn('w-4 h-4 mt-0.5', config.color)} />
                                                <div className="flex-1 space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs font-semibold">
                                                            {suggestion.title}
                                                        </span>
                                                        <Badge
                                                            variant={config.variant}
                                                            className="h-4 px-1.5 text-[9px]"
                                                        >
                                                            {suggestion.severity}
                                                        </Badge>
                                                        <Badge
                                                            variant="outline"
                                                            className="h-4 px-1.5 text-[9px]"
                                                        >
                                                            {suggestion.type}
                                                        </Badge>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        {suggestion.description}
                                                    </p>
                                                    <p className="text-[10px] text-green-600 dark:text-green-400">
                                                        💡 {suggestion.impact}
                                                    </p>
                                                </div>
                                            </div>

                                            {/* Before/After Comparison */}
                                            {isSelected && (
                                                <div className="mt-3 space-y-2 border-t pt-3">
                                                    {/* Original */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <Code className="w-3 h-3 text-red-500" />
                                                            <span className="text-[10px] font-medium text-red-500">
                                                                Current (Problematic)
                                                            </span>
                                                        </div>
                                                        <pre className="p-2 rounded bg-muted/50 text-[10px] font-mono overflow-x-auto">
                                                            {suggestion.original}
                                                        </pre>
                                                    </div>

                                                    {/* Arrow */}
                                                    <div className="flex justify-center">
                                                        <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                                    </div>

                                                    {/* Optimized */}
                                                    <div className="space-y-1">
                                                        <div className="flex items-center gap-1">
                                                            <CheckCircle2 className="w-3 h-3 text-green-500" />
                                                            <span className="text-[10px] font-medium text-green-500">
                                                                Recommended
                                                            </span>
                                                        </div>
                                                        <pre className="p-2 rounded bg-muted/50 text-[10px] font-mono overflow-x-auto">
                                                            {suggestion.optimized}
                                                        </pre>
                                                    </div>

                                                    {/* Example */}
                                                    <div className="space-y-1">
                                                        <span className="text-[10px] font-medium text-muted-foreground">
                                                            Example:
                                                        </span>
                                                        <p className="text-[10px] text-muted-foreground italic">
                                                            {suggestion.example}
                                                        </p>
                                                    </div>

                                                    {/* Apply Button */}
                                                    {onApplyOptimization && (
                                                        <Button
                                                            size="sm"
                                                            className="w-full h-7 text-xs"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleApplyOptimization(suggestion);
                                                            }}
                                                        >
                                                            Apply This Optimization
                                                        </Button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 rounded-md bg-green-500/10 border border-green-500/20 text-center">
                            <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-green-500" />
                            <p className="text-xs font-semibold text-green-600 dark:text-green-400">
                                Query is already optimized!
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-1">
                                No optimization suggestions found
                            </p>
                        </div>
                    )}
                </div>
            )}
        </Card>
    );
}
