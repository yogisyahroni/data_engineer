
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash, Plus, ArrowDown, ArrowUp } from "lucide-react";

interface TransformationStep {
    type: string;
    field?: string;
    fields?: string[];
    targetType?: string;
    operator?: string;
    value?: any;
    pattern?: string;
    replacement?: string;
    uniqueKeys?: string[];
}

interface TransformationBuilderProps {
    steps: TransformationStep[];
    onChange: (steps: TransformationStep[]) => void;
}

export function TransformationBuilder({ steps, onChange }: TransformationBuilderProps) {
    const addStep = (type: string) => {
        const newStep: TransformationStep = { type };
        if (type === 'CAST') { newStep.field = ''; newStep.targetType = 'string'; }
        if (type === 'DROP' || type === 'KEEP') { newStep.fields = []; }
        if (type === 'FILTER') { newStep.field = ''; newStep.operator = 'eq'; newStep.value = ''; }
        if (type === 'DEDUPLICATE') { newStep.uniqueKeys = []; }
        if (type === 'REPLACE') { newStep.field = ''; newStep.pattern = ''; newStep.replacement = ''; }
        if (type === 'DEFAULT_VALUE') { newStep.field = ''; newStep.value = ''; }

        onChange([...steps, newStep]);
    };

    const removeStep = (index: number) => {
        const newSteps = [...steps];
        newSteps.splice(index, 1);
        onChange(newSteps);
    };

    const updateStep = (index: number, key: string, value: any) => {
        const newSteps = [...steps];
        newSteps[index] = { ...newSteps[index], [key]: value };
        onChange(newSteps);
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" size="sm" onClick={() => addStep('CAST')}>+ Cast Type</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addStep('FILTER')}>+ Filter Row</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addStep('DROP')}>+ Drop Col</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addStep('DEDUPLICATE')}>+ Dedupe</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addStep('REPLACE')}>+ Replace</Button>
                <Button type="button" variant="secondary" size="sm" onClick={() => addStep('DEFAULT_VALUE')}>+ Clean Null</Button>
            </div>

            <div className="space-y-3">
                {steps.map((step, index) => (
                    <Card key={index} className="relative">
                        <CardHeader className="py-3 px-4 flex flex-row items-center justify-between space-y-0 pb-2">
                            <div className="font-semibold text-sm flex items-center gap-2">
                                <span className="bg-primary/10 text-primary px-2 py-0.5 rounded text-xs">{index + 1}</span>
                                {step.type}
                            </div>
                            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground hover:text-destructive" onClick={() => removeStep(index)}>
                                <Trash className="h-3 w-3" />
                            </Button>
                        </CardHeader>
                        <CardContent className="px-4 pb-3 pt-0 text-sm space-y-2">
                            {/* Dynamic Fields based on Type */}

                            {step.type === 'CAST' && (
                                <div className="flex gap-2">
                                    <Input placeholder="Column Name" value={step.field} onChange={(e) => updateStep(index, 'field', e.target.value)} className="h-8" />
                                    <span className="self-center">&rarr;</span>
                                    <Select value={step.targetType} onValueChange={(v) => updateStep(index, 'targetType', v)}>
                                        <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="string">String</SelectItem>
                                            <SelectItem value="number">Number</SelectItem>
                                            <SelectItem value="boolean">Boolean</SelectItem>
                                            <SelectItem value="date">Date</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {step.type === 'FILTER' && (
                                <div className="flex gap-2 items-center">
                                    <Input placeholder="Column" value={step.field} onChange={(e) => updateStep(index, 'field', e.target.value)} className="h-8 w-1/3" />
                                    <Select value={step.operator} onValueChange={(v) => updateStep(index, 'operator', v)}>
                                        <SelectTrigger className="h-8 w-1/4"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="eq">=</SelectItem>
                                            <SelectItem value="neq">!=</SelectItem>
                                            <SelectItem value="gt">&gt;</SelectItem>
                                            <SelectItem value="lt">&lt;</SelectItem>
                                            <SelectItem value="contains">Contains</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <Input placeholder="Value" value={step.value} onChange={(e) => updateStep(index, 'value', e.target.value)} className="h-8 flex-1" />
                                </div>
                            )}

                            {step.type === 'DROP' && (
                                <div>
                                    <Input
                                        placeholder="Columns to drop (comma separated)"
                                        value={step.fields?.join(', ')}
                                        onChange={(e) => updateStep(index, 'fields', e.target.value.split(',').map(s => s.trim()))}
                                        className="h-8"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">e.g. password, temp_id</p>
                                </div>
                            )}

                            {step.type === 'DEDUPLICATE' && (
                                <div>
                                    <Input
                                        placeholder="Unique Keys (comma separated)"
                                        value={step.uniqueKeys?.join(', ')}
                                        onChange={(e) => updateStep(index, 'uniqueKeys', e.target.value.split(',').map(s => s.trim()))}
                                        className="h-8"
                                    />
                                    <p className="text-xs text-muted-foreground mt-1">Combine checks e.g. email, status (A row is duplicate if ALL match)</p>
                                </div>
                            )}

                            {step.type === 'REPLACE' && (
                                <div className="grid grid-cols-3 gap-2">
                                    <Input placeholder="Column" value={step.field} onChange={(e) => updateStep(index, 'field', e.target.value)} className="h-8" />
                                    <Input placeholder="Regex/Pattern" value={step.pattern} onChange={(e) => updateStep(index, 'pattern', e.target.value)} className="h-8" />
                                    <Input placeholder="Replacement" value={step.replacement} onChange={(e) => updateStep(index, 'replacement', e.target.value)} className="h-8" />
                                </div>
                            )}

                            {step.type === 'DEFAULT_VALUE' && (
                                <div className="flex gap-2">
                                    <Input placeholder="Column" value={step.field} onChange={(e) => updateStep(index, 'field', e.target.value)} className="h-8 w-1/2" />
                                    <Input placeholder="Value (if null)" value={step.value} onChange={(e) => updateStep(index, 'value', e.target.value)} className="h-8 w-1/2" />
                                </div>
                            )}

                        </CardContent>
                    </Card>
                ))}
                {steps.length === 0 && (
                    <div className="text-center p-8 border border-dashed rounded text-muted-foreground text-sm">
                        No transformations added. Data will be loaded as-is.
                    </div>
                )}
            </div>
        </div>
    );
}
