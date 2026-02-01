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
    CheckCircle2,
    Plus,
    X,
} from 'lucide-react';
import { useGenerateFormula } from '@/hooks/use-semantic';
import { toast } from 'sonner';

interface FormulaEditorAIProps {
    className?: string;
    availableColumns?: string[];
    onFormulaGenerated?: (formula: string) => void;
}

export function FormulaEditorAI({
    className,
    availableColumns: externalColumns,
    onFormulaGenerated,
}: FormulaEditorAIProps) {
    const [description, setDescription] = React.useState('');
    const [selectedColumns, setSelectedColumns] = React.useState<string[]>([]);
    const [customColumn, setCustomColumn] = React.useState('');
    const [copied, setCopied] = React.useState(false);

    // Hooks
    const { generateFormula, isGenerating, generatedFormula, error } = useGenerateFormula();

    // Default columns if none provided
    const defaultColumns = [
        'revenue',
        'cost',
        'quantity',
        'price',
        'discount',
        'tax',
        'total',
        'profit',
    ];
    const availableColumns = externalColumns || defaultColumns;

    const handleGenerate = () => {
        if (!description.trim() || selectedColumns.length === 0 || isGenerating) return;

        generateFormula({
            description: description.trim(),
            availableColumns: selectedColumns,
        });

        if (onFormulaGenerated && generatedFormula?.generatedFormula) {
            onFormulaGenerated(generatedFormula.generatedFormula);
        }
    };

    const handleAddColumn = (column: string) => {
        if (!selectedColumns.includes(column)) {
            setSelectedColumns([...selectedColumns, column]);
        }
    };

    const handleRemoveColumn = (column: string) => {
        setSelectedColumns(selectedColumns.filter((c) => c !== column));
    };

    const handleAddCustomColumn = () => {
        if (customColumn.trim() && !selectedColumns.includes(customColumn.trim())) {
            setSelectedColumns([...selectedColumns, customColumn.trim()]);
            setCustomColumn('');
        }
    };

    const handleCopy = async () => {
        if (!generatedFormula?.generatedFormula) return;

        try {
            await navigator.clipboard.writeText(generatedFormula.generatedFormula);
            setCopied(true);
            toast.success('Formula copied to clipboard');
            setTimeout(() => setCopied(false), 2000);
        } catch (error) {
            toast.error('Failed to copy formula');
        }
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
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-600/20 flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-purple-500" />
                </div>
                <div>
                    <h3 className="text-base font-semibold">AI Formula Generator</h3>
                    <p className="text-xs text-muted-foreground">
                        Describe the calculation you need
                    </p>
                </div>
            </div>

            {/* Description Input */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Formula Description
                </label>
                <Textarea
                    placeholder="e.g., Calculate profit margin as a percentage"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="min-h-[80px] resize-none bg-background/50 backdrop-blur-sm"
                    disabled={isGenerating}
                />
                <div className="flex items-center justify-between text-[10px] text-muted-foreground px-1">
                    <span>Press Cmd/Ctrl+Enter to generate</span>
                    <span>{description.length} characters</span>
                </div>
            </div>

            {/* Available Columns */}
            <div className="flex flex-col gap-2">
                <label className="text-xs font-medium text-muted-foreground">
                    Available Columns
                </label>
                <div className="flex flex-wrap gap-2">
                    {availableColumns.map((column) => (
                        <Button
                            key={column}
                            variant={selectedColumns.includes(column) ? 'default' : 'outline'}
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() =>
                                selectedColumns.includes(column)
                                    ? handleRemoveColumn(column)
                                    : handleAddColumn(column)
                            }
                        >
                            {column}
                            {selectedColumns.includes(column) && (
                                <X className="w-3 h-3 ml-1" />
                            )}
                        </Button>
                    ))}
                </div>

                {/* Custom Column Input */}
                <div className="flex gap-2">
                    <input
                        type="text"
                        placeholder="Add custom column..."
                        value={customColumn}
                        onChange={(e) => setCustomColumn(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                                e.preventDefault();
                                handleAddCustomColumn();
                            }
                        }}
                        className="flex-1 h-8 px-3 text-xs rounded-md border border-input bg-background/50 backdrop-blur-sm"
                    />
                    <Button
                        size="sm"
                        variant="outline"
                        className="h-8"
                        onClick={handleAddCustomColumn}
                        disabled={!customColumn.trim()}
                    >
                        <Plus className="w-3 h-3" />
                    </Button>
                </div>
            </div>

            {/* Selected Columns */}
            {selectedColumns.length > 0 && (
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-medium text-muted-foreground">
                        Selected Columns ({selectedColumns.length})
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {selectedColumns.map((column) => (
                            <Badge
                                key={column}
                                variant="secondary"
                                className="pl-2 pr-1 py-1 text-xs"
                            >
                                {column}
                                <button
                                    onClick={() => handleRemoveColumn(column)}
                                    className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </Badge>
                        ))}
                    </div>
                </div>
            )}

            {/* Generate Button */}
            <Button
                onClick={handleGenerate}
                disabled={!description.trim() || selectedColumns.length === 0 || isGenerating}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700"
            >
                {isGenerating ? (
                    <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Generating Formula...
                    </>
                ) : (
                    <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Generate Formula
                    </>
                )}
            </Button>

            {/* Generated Formula */}
            {generatedFormula && (
                <div className="flex flex-col gap-3 animate-in fade-in-0 slide-in-from-bottom-4 duration-500">
                    {/* Validation Status */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {generatedFormula.isValid ? (
                                <>
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                        Valid Formula
                                    </span>
                                </>
                            ) : (
                                <>
                                    <AlertCircle className="w-4 h-4 text-destructive" />
                                    <span className="text-xs font-medium text-destructive">
                                        Invalid Formula
                                    </span>
                                </>
                            )}
                        </div>
                        <div className="flex items-center gap-1">
                            <Badge variant="outline" className="text-[9px]">
                                {generatedFormula.tokensUsed} tokens
                            </Badge>
                            {generatedFormula.cost > 0 && (
                                <Badge variant="outline" className="text-[9px]">
                                    ${generatedFormula.cost.toFixed(4)}
                                </Badge>
                            )}
                        </div>
                    </div>

                    {/* Formula Display */}
                    <div className="relative group">
                        <div
                            className={cn(
                                'p-4 rounded-lg border-2 bg-muted/50 backdrop-blur-sm transition-all duration-300',
                                generatedFormula.isValid
                                    ? 'border-purple-500/30 hover:border-purple-500/50'
                                    : 'border-destructive/30 hover:border-destructive/50'
                            )}
                        >
                            <pre className="text-sm font-mono overflow-x-auto whitespace-pre-wrap break-words">
                                {generatedFormula.generatedFormula}
                            </pre>
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
                    {generatedFormula.error && (
                        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
                            <p className="text-xs text-destructive">{generatedFormula.error}</p>
                        </div>
                    )}

                    {/* Action Buttons */}
                    {generatedFormula.isValid && (
                        <Button variant="outline" onClick={handleCopy}>
                            {copied ? (
                                <>
                                    <Check className="w-4 h-4 mr-2" />
                                    Copied
                                </>
                            ) : (
                                <>
                                    <Copy className="w-4 h-4 mr-2" />
                                    Copy Formula
                                </>
                            )}
                        </Button>
                    )}
                </div>
            )}

            {/* Error State */}
            {error && !generatedFormula && (
                <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20 animate-in fade-in-0">
                    <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-destructive flex-shrink-0 mt-0.5" />
                        <div>
                            <p className="text-xs font-medium text-destructive">
                                Failed to generate formula
                            </p>
                            <p className="text-xs text-destructive/80 mt-1">{error.message}</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Suggested Examples */}
            {!generatedFormula && !isGenerating && (
                <div className="flex flex-col gap-2">
                    <p className="text-xs text-muted-foreground">Try these examples:</p>
                    <div className="flex flex-wrap gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                                setDescription('Calculate profit margin percentage');
                                setSelectedColumns(['revenue', 'cost']);
                            }}
                        >
                            Profit margin %
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                                setDescription('Calculate total with tax');
                                setSelectedColumns(['price', 'quantity', 'tax']);
                            }}
                        >
                            Total with tax
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-xs h-7"
                            onClick={() => {
                                setDescription('Calculate discount amount');
                                setSelectedColumns(['price', 'discount']);
                            }}
                        >
                            Discount amount
                        </Button>
                    </div>
                </div>
            )}
        </Card>
    );
}
