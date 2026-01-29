'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
    LayoutGrid,
    Grid3x3,
    Save,
    ChevronLeft,
    Plus,
    Loader2,
    Type,
    Image as ImageIcon,
    BarChart3,
    Hash,
    Filter,
    Minus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { toast } from 'sonner';
import { CanvasBoard, CanvasWidget } from '@/components/canvas/canvas-board';
import { PropertyPanel } from '@/components/canvas/properties/property-panel';
import { useDebounce } from 'usehooks-ts';
import Link from 'next/link';

interface Canvas {
    id: string;
    name: string;
    description: string | null;
    layout: 'free' | 'grid';
    gridSize: number;
    workspaceId: string;
}

export default function CanvasEditorPage() {
    const params = useParams();
    const router = useRouter();
    const canvasId = params.id as string;

    const [canvas, setCanvas] = useState<Canvas | null>(null);
    const [widgets, setWidgets] = useState<CanvasWidget[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);

    // Initial load
    useEffect(() => {
        if (!canvasId) return;
        fetchCanvas();
    }, [canvasId]);

    const fetchCanvas = async () => {
        try {
            const res = await fetch(`/api/canvas/${canvasId}`);
            if (!res.ok) throw new Error('Failed to load canvas');

            const data = await res.json();
            setCanvas(data.canvas);
            setWidgets(data.canvas.widgets || []);
        } catch (error: any) {
            toast.error(error.message);
            router.push('/canvas'); // Redirect to list on error
        } finally {
            setLoading(false);
        }
    };

    // Update canvas metadata (layout/grid)
    const updateCanvas = async (updates: Partial<Canvas>) => {
        if (!canvas) return;

        // Optimistic update
        setCanvas({ ...canvas, ...updates });

        try {
            await fetch(`/api/canvas/${canvasId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch (error) {
            toast.error('Failed to update canvas settings');
            fetchCanvas(); // Revert
        }
    };

    // Add Widget
    const addWidget = async (type: string) => {
        const defaults = {
            width: 300,
            height: 200,
            x: 50,
            y: 50,
            zIndex: widgets.length + 1,
            config: type === 'text' ? { content: '## New Text' } : {}
        };

        if (type === 'divider') {
            defaults.height = 20;
            defaults.width = 400;
        }

        try {
            // Optimistic
            const tempId = 'temp-' + Date.now();
            const newWidget: CanvasWidget = {
                id: tempId,
                type,
                ...defaults,
                config: defaults.config
            };

            setWidgets([...widgets, newWidget]);
            setSelectedWidgetId(tempId);

            const res = await fetch(`/api/canvas/${canvasId}/widgets`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type,
                    ...defaults
                })
            });

            if (!res.ok) throw new Error('Failed to create widget');

            const { widget } = await res.json();
            // Replace temp widget with real one
            setWidgets(prev => prev.map(w => w.id === tempId ? widget : w));
            setSelectedWidgetId(widget.id);

        } catch (error) {
            toast.error('Failed to add widget');
            setWidgets(prev => prev.filter(w => !w.id.startsWith('temp-')));
        }
    };

    // Update Widget
    const updateWidget = async (id: string, updates: Partial<CanvasWidget>) => {
        // Optimistic update
        setWidgets(prev => prev.map(w => w.id === id ? { ...w, ...updates } : w));

        // We debounced specific updates like position in the board component?
        // Actually, for direct API calls we should probably debounce here or rely on the board to call us only on 'stop' events.
        // The board calls this on DragStop/ResizeStop, so it's efficient enough.

        try {
            // We need to strip out fields that are local-only or strictly typed
            // but our API accepts partial updates.
            await fetch(`/api/canvas/${canvasId}/widgets/${id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updates)
            });
        } catch (error) {
            console.error('Update failed', error);
            // Silent fail or toast? Toast might span.
        }
    };

    // Delete Widget
    const deleteWidget = async (id: string) => {
        if (!confirm('Are you sure you want to delete this widget?')) return;

        setWidgets(prev => prev.filter(w => w.id !== id));
        setSelectedWidgetId(null);

        try {
            await fetch(`/api/canvas/${canvasId}/widgets/${id}`, {
                method: 'DELETE'
            });
        } catch (error) {
            toast.error('Failed to delete widget');
            fetchCanvas(); // Revert
        }
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!canvas) return null;

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Toolbar */}
            <div className="h-14 border-b flex items-center justify-between px-4 bg-background z-50">
                <div className="flex items-center gap-4">
                    <Link href="/canvas" className="text-muted-foreground hover:text-foreground">
                        <ChevronLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-sm font-semibold">{canvas.name}</h1>
                        <p className="text-xs text-muted-foreground">
                            {widgets.length} items • {canvas.layout === 'grid' ? 'Grid' : 'Free-form'}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <div className="flex bg-muted rounded-md p-1 mr-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => addWidget('text')}
                            title="Add Text"
                        >
                            <Type className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => addWidget('image')}
                            title="Add Image"
                        >
                            <ImageIcon className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => addWidget('chart')}
                            title="Add Chart"
                        >
                            <BarChart3 className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => addWidget('metric')}
                            title="Add Metric"
                        >
                            <Hash className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => addWidget('filter')}
                            title="Add Filter"
                        >
                            <Filter className="w-4 h-4" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => addWidget('divider')}
                            title="Add Divider"
                        >
                            <Minus className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="h-4 w-px bg-border mx-2" />

                    <div className="flex items-center gap-1">
                        <Toggle
                            pressed={canvas.layout === 'free'}
                            onPressedChange={() => updateCanvas({ layout: 'free' })}
                            size="sm"
                            aria-label="Free-form layout"
                        >
                            <Grid3x3 className="h-4 w-4" />
                        </Toggle>
                        <Toggle
                            pressed={canvas.layout === 'grid'}
                            onPressedChange={() => updateCanvas({ layout: 'grid' })}
                            size="sm"
                            aria-label="Snap to Grid"
                        >
                            <LayoutGrid className="h-4 w-4" />
                        </Toggle>
                    </div>
                </div>
            </div>

            {/* Main Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Canvas Area */}
                <div className="flex-1 relative">
                    <CanvasBoard
                        widgets={widgets}
                        layout={canvas.layout}
                        gridSize={canvas.gridSize}
                        onUpdateWidget={updateWidget}
                        onDeleteWidget={deleteWidget}
                        onSelectWidget={setSelectedWidgetId}
                        selectedWidgetId={selectedWidgetId}
                    />
                </div>

                {/* Right Sidebar (Property Panel - Skeleton for now) */}
                {/* Right Sidebar (Property Panel) */}
                {selectedWidgetId && (
                    <div className="w-80 border-l bg-background overflow-hidden relative z-40 shadow-xl">
                        {widgets.find(w => w.id === selectedWidgetId) && (
                            <PropertyPanel
                                widget={widgets.find(w => w.id === selectedWidgetId)!}
                                onUpdate={(updates) => updateWidget(selectedWidgetId, updates)}
                            />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
