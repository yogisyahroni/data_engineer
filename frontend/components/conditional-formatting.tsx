'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Palette } from 'lucide-react';

export interface FormattingRule {
    column: string;
    operator: 'gt' | 'lt' | 'eq' | 'contains';
    value: string | number;
    color: string;
}

interface ConditionalFormattingProps {
    columns: string[];
    rules: FormattingRule[];
    onUpdateRules: (rules: FormattingRule[]) => void;
}

/**
 * Industrial UI for defining cell-level logic (e.g., Red if < $1M)
 * Found in Tableau / Power BI advanced formatting panes.
 */
export function ConditionalFormatting({ columns, rules, onUpdateRules }: ConditionalFormattingProps) {
    const addRule = () => {
        const newRule: FormattingRule = { column: columns[0] || '', operator: 'gt', value: '', color: '#ef4444' };
        onUpdateRules([...rules, newRule]);
    };

    return (
        <Card className="p-4 bg-muted/30 border-dashed">
            <div className="flex items-center gap-2 mb-4">
                <Palette className="w-4 h-4 text-primary" />
                <h4 className="text-sm font-semibold text-foreground">Conditional Formatting</h4>
            </div>

            <div className="space-y-3">
                {rules.map((rule, idx) => (
                    <div key={idx} className="flex gap-2 items-end">
                        <div className="flex-1 space-y-1">
                            <Label className="text-[10px]">Column</Label>
                            <Select
                                value={rule.column}
                                onValueChange={(v) => {
                                    const next = [...rules];
                                    next[idx].column = v;
                                    onUpdateRules(next);
                                }}
                            >
                                <SelectTrigger className="h-8 text-xs">
                                    <SelectValue placeholder="Select col" />
                                </SelectTrigger>
                                <SelectContent>
                                    {columns.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        {/* More operator logic would go here in full implementation */}
                    </div>
                ))}

                <button
                    onClick={addRule}
                    className="text-xs text-primary hover:underline font-medium"
                >
                    + Add formatting rule
                </button>
            </div>
        </Card>
    );
}
