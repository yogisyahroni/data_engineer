'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { useUsageStats, useRequestHistory } from '@/hooks/use-ai-usage';
import { BarChart3, TrendingUp, DollarSign, Zap, Activity, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AIUsageDashboardProps {
    period?: 'daily' | 'weekly' | 'monthly' | 'all';
    className?: string;
}

export function AIUsageDashboard({ period = 'monthly', className }: AIUsageDashboardProps) {
    const { data: stats, isLoading: statsLoading } = useUsageStats({ period });
    const { data: history, isLoading: historyLoading } = useRequestHistory({ limit: 10 });

    if (statsLoading) {
        return (
            <div className={cn('space-y-6', className)}>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    {[...Array(4)].map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-2">
                                <Skeleton className="h-4 w-24" />
                            </CardHeader>
                            <CardContent>
                                <Skeleton className="h-8 w-32" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <Card className={className}>
                <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                        <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">No usage data available</p>
                    </div>
                </CardContent>
            </Card>
        );
    }

    const formatCost = (cost: number) => `$${cost.toFixed(4)}`;
    const formatNumber = (num: number) => num.toLocaleString();

    return (
        <div className={cn('space-y-6', className)}>
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {/* Total Requests */}
                <Card className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border-blue-500/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Total Requests</CardTitle>
                            <Activity className="w-4 h-4 text-blue-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats.totalRequests)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            {(stats.successRate * 100).toFixed(1)}% success rate
                        </p>
                    </CardContent>
                </Card>

                {/* Total Tokens */}
                <Card className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border-purple-500/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Total Tokens</CardTitle>
                            <Zap className="w-4 h-4 text-purple-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatNumber(stats.totalTokens)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Avg: {formatNumber(Math.round(stats.totalTokens / stats.totalRequests))} per request
                        </p>
                    </CardContent>
                </Card>

                {/* Total Cost */}
                <Card className="bg-gradient-to-br from-green-500/10 to-green-600/5 border-green-500/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
                            <DollarSign className="w-4 h-4 text-green-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{formatCost(stats.totalCost)}</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Avg: {formatCost(stats.totalCost / stats.totalRequests)} per request
                        </p>
                    </CardContent>
                </Card>

                {/* Avg Duration */}
                <Card className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border-orange-500/20">
                    <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-sm font-medium">Avg Duration</CardTitle>
                            <TrendingUp className="w-4 h-4 text-orange-500" />
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.avgDuration.toFixed(0)}ms</div>
                        <p className="text-xs text-muted-foreground mt-1">
                            Response time
                        </p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* By Provider */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Usage by Provider</CardTitle>
                        <CardDescription>Breakdown by AI provider</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(stats.byProvider).map(([provider, data]) => {
                                const percentage = (data.requests / stats.totalRequests) * 100;
                                return (
                                    <div key={provider} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium capitalize">{provider}</span>
                                            <span className="text-muted-foreground">
                                                {formatNumber(data.requests)} ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{formatNumber(data.tokens)} tokens</span>
                                            <span>{formatCost(data.cost)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>

                {/* By Type */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Usage by Type</CardTitle>
                        <CardDescription>Breakdown by request type</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {Object.entries(stats.byType).map(([type, data]) => {
                                const percentage = (data.requests / stats.totalRequests) * 100;
                                return (
                                    <div key={type} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium capitalize">{type}</span>
                                            <span className="text-muted-foreground">
                                                {formatNumber(data.requests)} ({percentage.toFixed(1)}%)
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-green-500 to-emerald-600 transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{formatNumber(data.tokens)} tokens</span>
                                            <span>{formatCost(data.cost)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Top Models */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Top Models</CardTitle>
                    <CardDescription>Most used AI models</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-2">
                        {stats.topModels.slice(0, 5).map((model, index) => (
                            <div
                                key={`${model.provider}-${model.model}`}
                                className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-600/20 text-sm font-semibold">
                                        {index + 1}
                                    </div>
                                    <div>
                                        <div className="font-medium text-sm">{model.model}</div>
                                        <div className="text-xs text-muted-foreground capitalize">{model.provider}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-medium">{formatNumber(model.requests)} requests</div>
                                    <div className="text-xs text-muted-foreground">
                                        {formatNumber(model.tokens)} tokens · {formatCost(model.cost)}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CardContent>
            </Card>

            {/* Daily Trends */}
            {stats.dailyTrends && stats.dailyTrends.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Daily Trends</CardTitle>
                        <CardDescription>Usage over time</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {stats.dailyTrends.slice(-7).map((trend) => {
                                const maxRequests = Math.max(...stats.dailyTrends.map(t => t.requests));
                                const percentage = (trend.requests / maxRequests) * 100;

                                return (
                                    <div key={trend.date} className="space-y-1">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="font-medium">
                                                {new Date(trend.date).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                })}
                                            </span>
                                            <span className="text-muted-foreground">
                                                {formatNumber(trend.requests)} requests
                                            </span>
                                        </div>
                                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all"
                                                style={{ width: `${percentage}%` }}
                                            />
                                        </div>
                                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                                            <span>{formatNumber(trend.tokens)} tokens</span>
                                            <span>{formatCost(trend.cost)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Recent Requests */}
            {history && history.data.length > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-base">Recent Requests</CardTitle>
                        <CardDescription>Latest AI requests</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-2">
                            {history.data.map((request) => (
                                <div
                                    key={request.id}
                                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <Badge
                                                variant={request.status === 'success' ? 'default' : 'destructive'}
                                                className="text-xs"
                                            >
                                                {request.status}
                                            </Badge>
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {request.requestType}
                                            </span>
                                            <span className="text-xs text-muted-foreground">·</span>
                                            <span className="text-xs text-muted-foreground capitalize">
                                                {request.provider}
                                            </span>
                                        </div>
                                        <div className="text-sm font-medium truncate">{request.model}</div>
                                    </div>
                                    <div className="text-right ml-4">
                                        <div className="text-sm font-medium">{formatNumber(request.totalTokens)} tokens</div>
                                        <div className="text-xs text-muted-foreground">
                                            {formatCost(request.estimatedCost)}
                                            {request.durationMs && ` · ${request.durationMs}ms`}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}
