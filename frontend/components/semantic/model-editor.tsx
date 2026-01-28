'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Link2, Calculator, EyeOff, Trash2 } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CreateRelationshipDialog } from './create-relationship-dialog';
import { CreateCalculatedFieldDialog } from './create-calculated-field-dialog';
import { ColumnDisplaySettings } from './column-display-settings';
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';

interface ModelEditorProps {
    connectionId: string;
}

interface VirtualRelationship {
    id: string;
    fromTable: string;
    fromColumn: string;
    toTable: string;
    toColumn: string;
    type: 'one-to-one' | 'one-to-many' | 'many-to-many';
}

interface CalculatedField {
    id: string;
    name: string;
    expression: string;
    description?: string;
    type: 'column' | 'measure';
    dataType: 'number' | 'string' | 'date' | 'boolean';
}

interface ColumnDisplaySetting {
    tableName: string;
    columnName: string;
    displayName: string;
    isHidden: boolean;
}

/**
 * Model Editor (Power BI-style Semantic Layer)
 * 
 * Allows users to:
 * 1. Define virtual relationships between tables
 * 2. Create calculated columns/measures
 * 3. Hide columns from end users
 * 4. Set display names/aliases
 */
export function ModelEditor({ connectionId }: ModelEditorProps) {
    const [activeTab, setActiveTab] = useState('relationships');
    const [schema, setSchema] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadSchema();
    }, [connectionId]);

    const loadSchema = async () => {
        try {
            const res = await fetch(`/api/connections/${connectionId}/schema`);
            if (res.ok) {
                const data = await res.json();
                setSchema(data);
            }
        } catch (error) {
            console.error('Failed to load schema', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="p-4">Loading schema...</div>;
    }

    return (
        <div className="flex flex-col h-full">
            <div className="border-b p-4">
                <h2 className="text-2xl font-bold">Semantic Model</h2>
                <p className="text-sm text-muted-foreground mt-1">
                    Define relationships, calculated fields, and business logic
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4 w-fit">
                    <TabsTrigger value="relationships">
                        <Link2 className="h-4 w-4 mr-2" />
                        Relationships
                    </TabsTrigger>
                    <TabsTrigger value="calculated">
                        <Calculator className="h-4 w-4 mr-2" />
                        Calculated Fields
                    </TabsTrigger>
                    <TabsTrigger value="display">
                        <EyeOff className="h-4 w-4 mr-2" />
                        Display Settings
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="relationships" className="flex-1 p-4">
                    <RelationshipsPanel connectionId={connectionId} tables={schema?.tables || []} />
                </TabsContent>

                <TabsContent value="calculated" className="flex-1 p-4">
                    <CalculatedFieldsPanel connectionId={connectionId} />
                </TabsContent>

                <TabsContent value="display" className="flex-1 p-4">
                    <DisplaySettingsPanel connectionId={connectionId} tables={schema?.tables || []} />
                </TabsContent>
            </Tabs>
        </div>
    );
}

function RelationshipsPanel({ connectionId, tables }: { connectionId: string; tables: any[] }) {
    const [relationships, setRelationships] = useState<VirtualRelationship[]>([]);
    const [showDialog, setShowDialog] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRelationships();
    }, [connectionId]);

    const loadRelationships = async () => {
        try {
            const res = await fetch(`/api/semantic/relationships?connectionId=${connectionId}`);
            if (res.ok) {
                const data = await res.json();
                setRelationships(data);
            }
        } catch (error) {
            console.error('Failed to load relationships', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (relationship: any) => {
        const res = await fetch('/api/semantic/relationships', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...relationship, connectionId })
        });
        if (res.ok) {
            await loadRelationships();
        } else {
            throw new Error('Failed to create relationship');
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this relationship?')) return;
        const res = await fetch(`/api/semantic/relationships/${id}`, { method: 'DELETE' });
        if (res.ok) {
            await loadRelationships();
            toast.success('Relationship deleted');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Virtual Relationships</h3>
                <Button onClick={() => setShowDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Relationship
                </Button>
            </div>

            {relationships.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground">
                            No relationships defined yet. Virtual relationships allow the AI to perform JOINs
                            even when foreign keys don't exist in your database.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>From</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>To</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {relationships.map(rel => (
                                    <TableRow key={rel.id}>
                                        <TableCell className="font-mono text-sm">
                                            {rel.fromTable}.{rel.fromColumn}
                                        </TableCell>
                                        <TableCell>{rel.type}</TableCell>
                                        <TableCell className="font-mono text-sm">
                                            {rel.toTable}.{rel.toColumn}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(rel.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <CreateRelationshipDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                connectionId={connectionId}
                tables={tables}
                onSave={handleCreate}
            />
        </div>
    );
}

function CalculatedFieldsPanel({ connectionId }: { connectionId: string }) {
    const [fields, setFields] = useState<CalculatedField[]>([]);
    const [showDialog, setShowDialog] = useState(false);

    useEffect(() => {
        // TODO: Load from API
        setFields([]);
    }, [connectionId]);

    const handleCreate = async (field: any) => {
        // TODO: Save to API
        toast.success('Calculated field created (API not wired yet)');
        setFields(prev => [...prev, { ...field, id: Math.random().toString() }]);
    };

    const handleDelete = (id: string) => {
        setFields(prev => prev.filter(f => f.id !== id));
        toast.success('Calculated field deleted');
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Calculated Columns & Measures</h3>
                <Button onClick={() => setShowDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    New Calculation
                </Button>
            </div>

            {fields.length === 0 ? (
                <Card>
                    <CardContent className="p-6">
                        <p className="text-sm text-muted-foreground">
                            Create business logic metrics like "Total Revenue", "Profit Margin", etc.
                            without modifying your database.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Name</TableHead>
                                    <TableHead>Type</TableHead>
                                    <TableHead>Expression</TableHead>
                                    <TableHead className="w-[100px]">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.map(field => (
                                    <TableRow key={field.id}>
                                        <TableCell className="font-semibold">{field.name}</TableCell>
                                        <TableCell>
                                            {field.type === 'measure' ? 'Measure' : 'Column'}
                                        </TableCell>
                                        <TableCell className="font-mono text-xs">
                                            {field.expression}
                                        </TableCell>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => handleDelete(field.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            <CreateCalculatedFieldDialog
                open={showDialog}
                onOpenChange={setShowDialog}
                connectionId={connectionId}
                onSave={handleCreate}
            />
        </div>
    );
}

function DisplaySettingsPanel({ connectionId, tables }: { connectionId: string; tables: any[] }) {
    const [settings, setSettings] = useState<ColumnDisplaySetting[]>([]);

    const handleSave = async (newSettings: ColumnDisplaySetting[]) => {
        // TODO: Save to API
        setSettings(newSettings);
        toast.success('Display settings saved (API not wired yet)');
    };

    return (
        <ColumnDisplaySettings
            connectionId={connectionId}
            tables={tables}
            settings={settings}
            onSave={handleSave}
        />
    );
}
