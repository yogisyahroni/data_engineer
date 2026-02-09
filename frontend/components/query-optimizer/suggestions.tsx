"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
    AlertTriangle,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock,
    Database,
    FileText,
    Layers,
    Lightbulb,
    TrendingUp,
    Zap,
    Info,
} from "lucide-react"

// Types
interface PerformanceMetrics {
    planningTime?: number
    executionTime?: number
    totalCost?: number
    actualRows?: number
    estimatedRows?: number
    accuracy?: number
}

interface PlanIssue {
    type: string
    severity: string
    title: string
    description: string
    table?: string
    column?: string
    impact: string
}

interface PlanRecommendation {
    id: string
    type: string
    priority: string
    title: string
    description: string
    action: string
    example?: string
    benefit: string
}

interface QueryPlanAnalysis {
    query: string
    databaseType: string
    executionPlan: any
    planText: string
    performanceMetrics?: PerformanceMetrics
    issues: PlanIssue[]
    recommendations: PlanRecommendation[]
    estimatedCost: number
    estimatedRows: number
    analyzedAt: string
}

interface OptimizationSuggestion {
    type: string
    severity: string
    title: string
    description: string
    original: string
    optimized: string
    impact: string
    example: string
}

interface QueryAnalysisResult {
    query: string
    suggestions: OptimizationSuggestion[]
    performanceScore: number
    complexityLevel: string
    estimatedImprovement: string
}

interface CombinedAnalysis {
    query: string
    staticAnalysis: QueryAnalysisResult
    planAnalysis: QueryPlanAnalysis | null
    explainAvailable: boolean
    errorMessage?: string
}

interface QueryOptimizerSuggestionsProps {
    analysis: CombinedAnalysis
    onApplySuggestion?: (recommendation: PlanRecommendation | OptimizationSuggestion) => void
}

export function QueryOptimizerSuggestions({
    analysis,
    onApplySuggestion,
}: QueryOptimizerSuggestionsProps) {
    const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set())
    const [expandedRecommendations, setExpandedRecommendations] = useState<Set<number>>(new Set())

    const toggleIssue = (index: number) => {
        const newExpanded = new Set(expandedIssues)
        if (newExpanded.has(index)) {
            newExpanded.delete(index)
        } else {
            newExpanded.add(index)
        }
        setExpandedIssues(newExpanded)
    }

    const toggleRecommendation = (index: number) => {
        const newExpanded = new Set(expandedRecommendations)
        if (newExpanded.has(index)) {
            newExpanded.delete(index)
        } else {
            newExpanded.add(index)
        }
        setExpandedRecommendations(newExpanded)
    }

    const getSeverityColor = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "critical":
            case "high":
                return "destructive"
            case "warning":
            case "medium":
                return "default"
            default:
                return "secondary"
        }
    }

    const getSeverityIcon = (severity: string) => {
        switch (severity.toLowerCase()) {
            case "critical":
            case "high":
                return <AlertTriangle className="h-4 w-4" />
            case "warning":
            case "medium":
                return <Info className="h-4 w-4" />
            default:
                return <CheckCircle2 className="h-4 w-4" />
        }
    }

    return (
        <div className="space-y-4">
            {/* Performance Summary */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Performance Overview
                    </CardTitle>
                    <CardDescription>Query analysis results and performance metrics</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {/* Performance Score */}
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Performance Score</p>
                            <div className="flex items-center gap-2">
                                <div className="text-2xl font-bold">{analysis.staticAnalysis.performanceScore}/100</div>
                                <Badge variant={analysis.staticAnalysis.performanceScore >= 70 ? "default" : "destructive"}>
                                    {analysis.staticAnalysis.performanceScore >= 70 ? "Good" : "Needs Improvement"}
                                </Badge>
                            </div>
                        </div>

                        {/* Complexity Level */}
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Complexity</p>
                            <Badge variant="outline" className="text-base">
                                {analysis.staticAnalysis.complexityLevel.toUpperCase()}
                            </Badge>
                        </div>

                        {/* Estimated Improvement */}
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Potential Improvement</p>
                            <div className="text-lg font-semibold text-green-600">
                                {analysis.staticAnalysis.estimatedImprovement}
                            </div>
                        </div>

                        {/* Database Type */}
                        <div className="space-y-1">
                            <p className="text-sm text-muted-foreground">Database</p>
                            <div className="flex items-center gap-2">
                                <Database className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{analysis.planAnalysis?.databaseType || "Unknown"}</span>
                            </div>
                        </div>
                    </div>

                    {/* Execution Metrics (if available) */}
                    {analysis.planAnalysis?.performanceMetrics && (
                        <>
                            <Separator className="my-4" />
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {analysis.planAnalysis.performanceMetrics.planningTime !== undefined && (
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Planning Time</p>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {analysis.planAnalysis.performanceMetrics.planningTime.toFixed(2)} ms
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {analysis.planAnalysis.performanceMetrics.executionTime !== undefined && (
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Execution Time</p>
                                        <div className="flex items-center gap-1">
                                            <Clock className="h-3 w-3 text-muted-foreground" />
                                            <span className="text-sm font-medium">
                                                {analysis.planAnalysis.performanceMetrics.executionTime.toFixed(2)} ms
                                            </span>
                                        </div>
                                    </div>
                                )}
                                {analysis.planAnalysis.estimatedRows !== undefined && (
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Estimated Rows</p>
                                        <span className="text-sm font-medium">
                                            {analysis.planAnalysis.estimatedRows.toLocaleString()}
                                        </span>
                                    </div>
                                )}
                                {analysis.planAnalysis.estimatedCost !== undefined && (
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Estimated Cost</p>
                                        <span className="text-sm font-medium">
                                            {analysis.planAnalysis.estimatedCost.toFixed(2)}
                                        </span>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Main Content Tabs */}
            <Tabs defaultValue="issues" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="issues" className="flex items-center gap-2">
                        <AlertTriangle className="h-4 w-4" />
                        Issues ({analysis.planAnalysis?.issues.length || 0})
                    </TabsTrigger>
                    <TabsTrigger value="recommendations" className="flex items-center gap-2">
                        <Lightbulb className="h-4 w-4" />
                        Recommendations (
                        {(analysis.planAnalysis?.recommendations.length || 0) + (analysis.staticAnalysis.suggestions.length || 0)})
                    </TabsTrigger>
                    <TabsTrigger value="plan" className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        Execution Plan
                    </TabsTrigger>
                </TabsList>

                {/* Issues Tab */}
                <TabsContent value="issues" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Detected Issues</CardTitle>
                            <CardDescription>Performance issues found in the query execution plan</CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analysis.planAnalysis && analysis.planAnalysis.issues.length > 0 ? (
                                <ScrollArea className="h-[400px] pr-4">
                                    <div className="space-y-3">
                                        {analysis.planAnalysis.issues.map((issue, index) => (
                                            <Collapsible key={index} open={expandedIssues.has(index)}>
                                                <Card className="border-l-4 border-l-destructive">
                                                    <CollapsibleTrigger
                                                        className="w-full"
                                                        onClick={() => toggleIssue(index)}
                                                    >
                                                        <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex items-start gap-3 flex-1">
                                                                    {getSeverityIcon(issue.severity)}
                                                                    <div className="text-left flex-1">
                                                                        <CardTitle className="text-base">{issue.title}</CardTitle>
                                                                        <div className="flex items-center gap-2 mt-1">
                                                                            <Badge variant={getSeverityColor(issue.severity)}>
                                                                                {issue.severity.toUpperCase()}
                                                                            </Badge>
                                                                            {issue.table && (
                                                                                <Badge variant="outline">
                                                                                    <Database className="h-3 w-3 mr-1" />
                                                                                    {issue.table}
                                                                                </Badge>
                                                                            )}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {expandedIssues.has(index) ? (
                                                                    <ChevronDown className="h-5 w-5" />
                                                                ) : (
                                                                    <ChevronRight className="h-5 w-5" />
                                                                )}
                                                            </div>
                                                        </CardHeader>
                                                    </CollapsibleTrigger>
                                                    <CollapsibleContent>
                                                        <CardContent className="pt-0">
                                                            <div className="space-y-3">
                                                                <div>
                                                                    <p className="text-sm font-medium mb-1">Description:</p>
                                                                    <p className="text-sm text-muted-foreground">{issue.description}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-sm font-medium mb-1">Performance Impact:</p>
                                                                    <p className="text-sm text-destructive">{issue.impact}</p>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </CollapsibleContent>
                                                </Card>
                                            </Collapsible>
                                        ))}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <Alert>
                                    <CheckCircle2 className="h-4 w-4" />
                                    <AlertTitle>No Issues Found</AlertTitle>
                                    <AlertDescription>
                                        {analysis.explainAvailable
                                            ? "Your query execution plan looks good! No major performance issues detected."
                                            : "EXPLAIN analysis not available for this database type."}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Recommendations Tab */}
                <TabsContent value="recommendations" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Optimization Recommendations</CardTitle>
                            <CardDescription>Suggested improvements to enhance query performance</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ScrollArea className="h-[400px] pr-4">
                                <div className="space-y-4">
                                    {/* EXPLAIN-based Recommendations */}
                                    {analysis.planAnalysis && analysis.planAnalysis.recommendations.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <Zap className="h-4 w-4" />
                                                Database-Specific Recommendations
                                            </h3>
                                            {analysis.planAnalysis.recommendations.map((rec, index) => (
                                                <Collapsible key={`plan-${index}`} open={expandedRecommendations.has(index)}>
                                                    <Card className="border-l-4 border-l-blue-500">
                                                        <CollapsibleTrigger
                                                            className="w-full"
                                                            onClick={() => toggleRecommendation(index)}
                                                        >
                                                            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                                                                <div className="flex items-start justify-between">
                                                                    <div className="flex items-start gap-3 flex-1">
                                                                        <Lightbulb className="h-4 w-4 text-blue-500 flex-shrink-0 mt-1" />
                                                                        <div className="text-left flex-1">
                                                                            <CardTitle className="text-base">{rec.title}</CardTitle>
                                                                            <div className="flex items-center gap-2 mt-1">
                                                                                <Badge
                                                                                    variant={rec.priority === "high" ? "default" : "outline"}
                                                                                >
                                                                                    {rec.priority.toUpperCase()} PRIORITY
                                                                                </Badge>
                                                                                <Badge variant="secondary">{rec.type}</Badge>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    {expandedRecommendations.has(index) ? (
                                                                        <ChevronDown className="h-5 w-5" />
                                                                    ) : (
                                                                        <ChevronRight className="h-5 w-5" />
                                                                    )}
                                                                </div>
                                                            </CardHeader>
                                                        </CollapsibleTrigger>
                                                        <CollapsibleContent>
                                                            <CardContent className="pt-0">
                                                                <div className="space-y-3">
                                                                    <div>
                                                                        <p className="text-sm font-medium mb-1">Description:</p>
                                                                        <p className="text-sm text-muted-foreground">{rec.description}</p>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium mb-1">Suggested Action:</p>
                                                                        <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                                            {rec.action}
                                                                        </pre>
                                                                    </div>
                                                                    <div>
                                                                        <p className="text-sm font-medium mb-1">Expected Benefit:</p>
                                                                        <p className="text-sm text-green-600 font-medium">{rec.benefit}</p>
                                                                    </div>
                                                                    {onApplySuggestion && (
                                                                        <Button
                                                                            size="sm"
                                                                            onClick={() => onApplySuggestion(rec)}
                                                                            className="mt-2"
                                                                        >
                                                                            Apply Suggestion
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </CollapsibleContent>
                                                    </Card>
                                                </Collapsible>
                                            ))}
                                        </div>
                                    )}

                                    {/* Static Analysis Recommendations */}
                                    {analysis.staticAnalysis.suggestions.length > 0 && (
                                        <div className="space-y-3">
                                            <h3 className="text-sm font-semibold flex items-center gap-2">
                                                <FileText className="h-4 w-4" />
                                                Pattern-Based Suggestions
                                            </h3>
                                            {analysis.staticAnalysis.suggestions.map((suggestion, index) => (
                                                <Card key={`static-${index}`} className="border-l-4 border-l-yellow-500">
                                                    <CardHeader>
                                                        <div className="flex items-start gap-3">
                                                            <Lightbulb className="h-4 w-4 text-yellow-500 flex-shrink-0 mt-1" />
                                                            <div className="flex-1">
                                                                <CardTitle className="text-base">{suggestion.title}</CardTitle>
                                                                <div className="flex items-center gap-2 mt-1">
                                                                    <Badge variant={getSeverityColor(suggestion.severity)}>
                                                                        {suggestion.severity.toUpperCase()}
                                                                    </Badge>
                                                                    <Badge variant="outline">{suggestion.type}</Badge>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </CardHeader>
                                                    <CardContent className="space-y-3">
                                                        <div>
                                                            <p className="text-sm font-medium mb-1">Description:</p>
                                                            <p className="text-sm text-muted-foreground">{suggestion.description}</p>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium mb-1">Current Pattern:</p>
                                                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                                {suggestion.original}
                                                            </pre>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium mb-1">Suggested Improvement:</p>
                                                            <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                                                                {suggestion.optimized}
                                                            </pre>
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-medium mb-1">Expected Impact:</p>
                                                            <p className="text-sm text-green-600 font-medium">{suggestion.impact}</p>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </div>
                                    )}

                                    {/* No Recommendations */}
                                    {(!analysis.planAnalysis || analysis.planAnalysis.recommendations.length === 0) &&
                                        analysis.staticAnalysis.suggestions.length === 0 && (
                                            <Alert>
                                                <CheckCircle2 className="h-4 w-4" />
                                                <AlertTitle>Query is Well Optimized</AlertTitle>
                                                <AlertDescription>
                                                    No optimization recommendations found. Your query is already following best practices!
                                                </AlertDescription>
                                            </Alert>
                                        )}
                                </div>
                            </ScrollArea>
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Execution Plan Tab */}
                <TabsContent value="plan">
                    <Card>
                        <CardHeader>
                            <CardTitle>Query Execution Plan</CardTitle>
                            <CardDescription>
                                {analysis.explainAvailable
                                    ? `EXPLAIN output from ${analysis.planAnalysis?.databaseType || "database"}`
                                    : "EXPLAIN analysis not available"}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {analysis.planAnalysis?.planText ? (
                                <ScrollArea className="h-[400px]">
                                    <pre className="text-xs bg-muted p-4 rounded overflow-x-auto">
                                        {analysis.planAnalysis.planText}
                                    </pre>
                                </ScrollArea>
                            ) : (
                                <Alert>
                                    <Info className="h-4 w-4" />
                                    <AlertTitle>Execution Plan Not Available</AlertTitle>
                                    <AlertDescription>
                                        {analysis.errorMessage ||
                                            "EXPLAIN analysis is not supported for this database type or connection."}
                                    </AlertDescription>
                                </Alert>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
