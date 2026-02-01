'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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
import { Sparkles, Play, Save, Copy, Check, AlertCircle, CheckCircle, Calculator } from 'lucide-react';
import { useGenerateFormula } from '@/hooks/use-semantic';
import { toast } from 'sonner';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface FormulaEditorProps {
    dataSourceId?: string;
    onSaveFormula?: (formula: string, name: string, description: string) => void;
    className?: string;
}

const EXAMPLE_PROMPTS = [
    'Calculate profit margin as (revenue - cost) / revenue * 100',
    'Create a metric for customer lifetime value',
    'Calculate year-over-year growth percentage',
    'Create a rolling 7-day average for sales',
];

const AGGREGATION_FUNCTIONS = [
    'SUM', 'AVG', 'COUNT', 'MIN', 'MAX',
    'MEDIAN', 'STDDEV', 'VARIANCE',
];

const OPERATORS = ['+', '-', '*', '/', '(', ')'];

export function FormulaEditor({ dataSourceId, onSaveFormula, className }: FormulaEditorProps) {
    const [prompt, setPrompt] = React.useState('');
    const [formulaName, setFormulaName] = React.useState('');
    const [formulaDescription, setFormulaDescription] = React.useState('');
    const [generatedFormula, setGeneratedFormula] = React.useState('');
    const [copied, setCopied] = React.useState(false);
    const [selectedFunction, setSelectedFunction] = React.useState('');

    const { generateFormula, isGenerating, generatedFormula: data, error } = useGenerateFormula();

    // Update generated formula when data changes
    React.useEffect(() => {
        if (data?.generatedFormula) {
            setGeneratedFormula(data.generatedFormula);
        }
    }, [data]);

    const handleGenerate = () => {
        if (!prompt.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        generateFormula({
            prompt: prompt.trim(),
            dataSourceId,
            context: {},
        });
    };

    const handleInsertFunction = (func: string) => {
        setGeneratedFormula((prev) => prev + func + '()');
        setSelectedFunction('');
    };

    const handleCopy = async () => {
        if (!generatedFormula) return;

        try {
            await navigator.clipboard.writeText(generatedFormula);
            setCopied(true);
            toast.success('Formula copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy formula');
        }
    };

    const handleSave = () => {
        if (!generatedFormula || !formulaName.trim()) {
            toast.error('Please provide formula name');
            return;
        }

        if (onSaveFormula) {
            onSaveFormula(generatedFormula, formulaName, formulaDescription);
            toast.success('Formula saved to virtual metrics');

            // Reset form
            setFormulaName('');
            setFormulaDescription('');
            setPrompt('');
        } else {
            toast.info('Save formula handler not provided');
        }
    };

    const isValid = generatedFormula && !error;

    return (
        <Card
            className={cn(
                'flex flex-col h-full bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50',
                className
            )}
        >
            {/* Header */}
            <div className="flex items-center gap-2 p-4 border-b border-border/50">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center">
                    <Calculator className="w-4 h-4 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-sm font-semibold">Formula Editor</h3>
                    <p className="text-[10px] text-muted-foreground">
                        AI-powered metric creation
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4 overflow-auto">
                {/* Natural Language Input */}
                <div className="space-y-2">
                    <label className="text-xs font-medium text-muted-foreground">
                        Describe your metric in plain English
                    </label>
                    <Textarea
                        placeholder="e.g., Calculate profit margin as (revenue - cost) / revenue * 100"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                        className="min-h-[80px] resize-none"
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
                    disabled={isGenerating || !prompt.trim()}
                    className="w-full"
                >
                    {isGenerating ? (
                        <>
                            <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                            Generating...
                        </>
                    ) : (
                        <>
                            <Sparkles className="w-4 h-4 mr-2" />
                            Generate Formula
                        </>
                    )}
                </Button>

                {/* Formula Display */}
                {(generatedFormula || isGenerating || error) && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-medium text-muted-foreground">
                                Generated Formula
                            </label>

                            {/* Validation Status */}
                            {generatedFormula && (
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

                        {/* Formula Input */}
                        {isGenerating ? (
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-full" />
                                <Skeleton className="h-4 w-3/4" />
                            </div>
                        ) : error ? (
                            <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20">
                                <p className="text-xs text-destructive">
                                    {error.message || 'Failed to generate formula'}
                                </p>
                            </div>
                        ) : generatedFormula ? (
                            <div className="space-y-2">
                                <div className="relative group">
                                    <Textarea
                                        value={generatedFormula}
                                        onChange={(e) => setGeneratedFormula(e.target.value)}
                                        className="font-mono text-xs min-h-[100px]"
                                        placeholder="Formula will appear here..."
                                    />

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

                                {/* Function Helper */}
                                <div className="flex items-center gap-2">
                                    <Select value={selectedFunction} onValueChange={handleInsertFunction}>
                                        <SelectTrigger className="w-[140px] h-7 text-xs">
                                            <SelectValue placeholder="Insert function" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {AGGREGATION_FUNCTIONS.map((func) => (
                                                <SelectItem key={func} value={func} className="text-xs">
                                                    {func}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    <div className="flex gap-1">
                                        {OPERATORS.map((op) => (
                                            <Button
                                                key={op}
                                                variant="outline"
                                                size="sm"
                                                className="h-7 w-7 p-0 text-xs"
                                                onClick={() => setGeneratedFormula((prev) => prev + op)}
                                            >
                                                {op}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
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
                            </div>
                        )}
                    </div>
                )}

                {/* Formula Metadata */}
                {generatedFormula && (
                    <div className="space-y-3 pt-2 border-t border-border/50">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Metric Name *
                            </label>
                            <Input
                                placeholder="e.g., Profit Margin"
                                value={formulaName}
                                onChange={(e) => setFormulaName(e.target.value)}
                                className="h-8 text-xs"
                                maxLength={100}
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Description (Optional)
                            </label>
                            <Textarea
                                placeholder="Brief description of what this metric calculates..."
                                value={formulaDescription}
                                onChange={(e) => setFormulaDescription(e.target.value)}
                                className="min-h-[60px] resize-none text-xs"
                                maxLength={200}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Actions */}
            {generatedFormula && (
                <div className="p-4 border-t border-border/50 flex gap-2">
                    <Button
                        variant="default"
                        size="sm"
                        onClick={handleSave}
                        disabled={!isValid || !formulaName.trim()}
                        className="flex-1"
                    >
                        <Save className="w-3 h-3 mr-1" />
                        Save to Virtual Metrics
                    </Button>
                </div>
            )}
        </Card>
    );
}
