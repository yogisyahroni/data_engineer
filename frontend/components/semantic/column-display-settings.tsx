'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Eye, EyeOff } from 'lucide-react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ColumnDisplaySetting {
    tableName: string;
    columnName: string;
    displayName: string;
    isHidden: boolean;
    description?: string;
}

interface ColumnDisplaySettingsProps {
    connectionId: string;
    tables: { name: string; columns: { name: string; type: string }[] }[];
    settings: ColumnDisplaySetting[];
    onSave: (settings: ColumnDisplaySetting[]) => Promise<void>;
}

export function ColumnDisplaySettings({
    connectionId,
    tables,
    settings,
    onSave
}: ColumnDisplaySettingsProps) {
    const [search, setSearch] = useState('');
    const [localSettings, setLocalSettings] = useState<ColumnDisplaySetting[]>(settings);
    const [saving, setSaving] = useState(false);

    // Build complete column list from tables
    const allColumns: ColumnDisplaySetting[] = tables.flatMap(table =>
        table.columns.map(col => {
            const existing = localSettings.find(
                s => s.tableName === table.name && s.columnName === col.name
            );
            return existing || {
                tableName: table.name,
                columnName: col.name,
                displayName: col.name,
                isHidden: false
            };
        })
    );

    const filteredColumns = allColumns.filter(col =>
        col.tableName.toLowerCase().includes(search.toLowerCase()) ||
        col.columnName.toLowerCase().includes(search.toLowerCase()) ||
        col.displayName.toLowerCase().includes(search.toLowerCase())
    );

    const updateSetting = (tableName: string, columnName: string, updates: Partial<ColumnDisplaySetting>) => {
        setLocalSettings(prev => {
            const existing = prev.find(s => s.tableName === tableName && s.columnName === columnName);
            if (existing) {
                return prev.map(s =>
                    s.tableName === tableName && s.columnName === columnName
                        ? { ...s, ...updates }
                        : s
                );
            } else {
                return [...prev, { tableName, columnName, displayName: columnName, isHidden: false, ...updates }];
            }
        });
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(localSettings);
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search columns..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9"
                    />
                </div>
                <Button onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving...' : 'Save Changes'}
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Column Display Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-[200px]">Table</TableHead>
                                <TableHead className="w-[200px]">Column Name</TableHead>
                                <TableHead>Display Name</TableHead>
                                <TableHead className="w-[100px]">Visible</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredColumns.map((col) => {
                                const setting = localSettings.find(
                                    s => s.tableName === col.tableName && s.columnName === col.columnName
                                ) || col;

                                return (
                                    <TableRow key={`${col.tableName}.${col.columnName}`}>
                                        <TableCell className="font-mono text-xs">{col.tableName}</TableCell>
                                        <TableCell className="font-mono text-xs">{col.columnName}</TableCell>
                                        <TableCell>
                                            <Input
                                                value={setting.displayName}
                                                onChange={(e) =>
                                                    updateSetting(col.tableName, col.columnName, {
                                                        displayName: e.target.value
                                                    })
                                                }
                                                className="h-8"
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={!setting.isHidden}
                                                onCheckedChange={(checked) =>
                                                    updateSetting(col.tableName, col.columnName, {
                                                        isHidden: !checked
                                                    })
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                    {filteredColumns.length === 0 && (
                        <div className="text-center py-8 text-muted-foreground">
                            No columns found
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
