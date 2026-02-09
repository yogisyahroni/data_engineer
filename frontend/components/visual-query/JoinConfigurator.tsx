"use client";

import * as React from "react";
import { Plus, Trash2, ArrowRightLeft } from "lucide-react";
import { useQueryBuilderStore } from "@/stores/useQueryBuilderStore";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { JoinType } from "@/types/visual-query";
import { Label } from "@/components/ui/label";

export function JoinConfigurator() {
    const { config, tableSchemas, addJoin, removeJoin, updateJoin } = useQueryBuilderStore();
    const tables = config.tables;

    const handleAddJoin = () => {
        // Default to first two tables if available
        if (tables.length < 2) return;
        addJoin({
            type: 'INNER',
            leftTable: tables[0].name,
            rightTable: tables[1].name,
            leftColumn: '',
            rightColumn: ''
        });
    };

    const getColumns = (tableName: string) => {
        return tableSchemas[tableName]?.columns || [];
    };

    if (tables.length < 2) {
        return null;
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h3 className="text-md font-medium flex items-center gap-2">
                    <ArrowRightLeft className="h-4 w-4" />
                    Join Configuration
                </h3>
                <Button onClick={handleAddJoin} size="sm" variant="outline">
                    <Plus className="mr-2 h-4 w-4" /> Add Join
                </Button>
            </div>

            {config.joins.length === 0 ? (
                <div className="text-sm text-muted-foreground italic">
                    No joins configured. Queries with multiple tables effectively perform a cross join or require joins.
                </div>
            ) : (
                <div className="grid gap-4">
                    {config.joins.map((join, index) => (
                        <Card key={index}>
                            <CardContent className="p-4 flex flex-col gap-4 md:flex-row md:items-end">
                                <div className="grid w-full gap-2">
                                    <Label>Left Table</Label>
                                    <Select
                                        value={join.leftTable}
                                        onValueChange={(val) => updateJoin(index, { ...join, leftTable: val, leftColumn: '' })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select table" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tables.map(t => (
                                                <SelectItem key={t.name} value={t.name}>{t.name} ({t.alias})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid w-full gap-2">
                                    <Label>Join Type</Label>
                                    <Select
                                        value={join.type}
                                        onValueChange={(val) => updateJoin(index, { ...join, type: val as JoinType })}
                                    >
                                        <SelectTrigger className="w-[100px]">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['INNER', 'LEFT', 'RIGHT', 'FULL'].map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid w-full gap-2">
                                    <Label>Right Table</Label>
                                    <Select
                                        value={join.rightTable}
                                        onValueChange={(val) => updateJoin(index, { ...join, rightTable: val, rightColumn: '' })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select table" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {tables.map(t => (
                                                <SelectItem key={t.name} value={t.name}>{t.name} ({t.alias})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="flex w-full items-center gap-2 md:w-auto">
                                    <div className="grid w-full gap-2 min-w-[150px]">
                                        <Label>Left Column</Label>
                                        <Select
                                            value={join.leftColumn}
                                            onValueChange={(val) => updateJoin(index, { ...join, leftColumn: val })}
                                            disabled={!join.leftTable}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Column" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getColumns(join.leftTable).map(c => (
                                                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <span className="mb-2 text-muted-foreground">=</span>
                                    <div className="grid w-full gap-2 min-w-[150px]">
                                        <Label>Right Column</Label>
                                        <Select
                                            value={join.rightColumn}
                                            onValueChange={(val) => updateJoin(index, { ...join, rightColumn: val })}
                                            disabled={!join.rightTable}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Column" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {getColumns(join.rightTable).map(c => (
                                                    <SelectItem key={c.name} value={c.name}>{c.name}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="mb-0.5 text-destructive"
                                    onClick={() => removeJoin(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
