"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Trash, ShieldCheck } from "lucide-react";

interface QualityRule {
    id?: string;
    column: string;
    ruleType: 'NOT_NULL' | 'UNIQUE' | 'RANGE' | 'REGEX';
    value?: string;
    severity: 'WARN' | 'FAIL';
    description?: string;
}

interface QualityBuilderProps {
    rules: QualityRule[];
    onChange: (rules: QualityRule[]) => void;
    availableColumns?: string[]; // Optional: for autocomplete
}

export function QualityBuilder({ rules, onChange, availableColumns = [] }: QualityBuilderProps) {
    const addRule = () => {
        const newRule: QualityRule = {
            column: '',
            ruleType: 'NOT_NULL',
            severity: 'WARN',
            value: ''
        };
        onChange([...rules, newRule]);
    };

    const removeRule = (index: number) => {
        const newRules = [...rules];
        newRules.splice(index, 1);
        onChange(newRules);
    };

    const updateRule = (index: number, key: keyof QualityRule, value: any) => {
        const newRules = [...rules];
        newRules[index] = { ...newRules[index], [key]: value };
        onChange(newRules);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                    Define expectations for your data. Rows failing these rules will be flagged or rejected.
                </div>
                <Button type="button" variant="secondary" size="sm" onClick={addRule}>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Add Rule
                </Button>
            </div>

            <div className="space-y-3">
                {rules.map((rule, index) => (
                    <Card key={index} className="relative">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="font-semibold text-sm flex items-center gap-2">
                                <span className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 px-2 py-0.5 rounded text-xs">{index + 1}</span>
                                Quality Rule
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeRule(index)}>
                                <Trash className="h-3 w-3" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 text-sm space-y-3">
                            <div className="flex gap-2">
                                {/* Column Selector / Input */}
                                <div className="w-1/3">
                                    <Input
                                        placeholder="Column Name"
                                        value={rule.column}
                                        onChange={(e) => updateRule(index, 'column', e.target.value)}
                                        className="h-8"
                                        list={`columns-${index}`}
                                    />
                                    {availableColumns.length > 0 && (
                                        <datalist id={`columns-${index}`}>
                                            {availableColumns.map(c => <option key={c} value={c} />)}
                                        </datalist>
                                    )}
                                </div>

                                {/* Rule Type */}
                                <div className="w-1/4">
                                    <Select value={rule.ruleType} onValueChange={(v: any) => updateRule(index, 'ruleType', v)}>
                                        <SelectTrigger className="h-8"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="NOT_NULL">Not Null</SelectItem>
                                            <SelectItem value="UNIQUE">Unique</SelectItem>
                                            <SelectItem value="RANGE">Range</SelectItem>
                                            <SelectItem value="REGEX">Regex Pattern</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* Value (Conditional) */}
                                <div className="flex-1">
                                    {(rule.ruleType === 'RANGE' || rule.ruleType === 'REGEX') ? (
                                        <Input
                                            placeholder={rule.ruleType === 'RANGE' ? "Min,Max (e.g. 0,100)" : "Regex Pattern"}
                                            value={rule.value || ''}
                                            onChange={(e) => updateRule(index, 'value', e.target.value)}
                                            className="h-8"
                                        />
                                    ) : (
                                        <Input disabled className="h-8 bg-muted" placeholder="No parameters needed" />
                                    )}
                                </div>

                                {/* Severity */}
                                <div className="w-24">
                                    <Select value={rule.severity} onValueChange={(v: any) => updateRule(index, 'severity', v)}>
                                        <SelectTrigger className={`h-8 border-l-4 ${rule.severity === 'FAIL' ? 'border-l-destructive' : 'border-l-yellow-500'}`}>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="WARN">Warn</SelectItem>
                                            <SelectItem value="FAIL">Fail Job</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}

                {rules.length === 0 && (
                    <div className="text-center p-8 border border-dashed rounded text-muted-foreground text-sm">
                        No quality rules defined.
                    </div>
                )}
            </div>
        </div>
    );
}
