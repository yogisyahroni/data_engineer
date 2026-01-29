'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Rnd } from 'react-rnd';
import { useResizeObserver } from 'usehooks-ts';
import { Loader2, GripHorizontal, Trash2, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { TextWidget, ImageWidget, ChartWidget, MetricWidget, FilterWidget } from './widgets';

export type CanvasWidget = {
    id: string;
    type: string;
    x: number;
    y: number;
    width: number;
    height: number;
    zIndex: number;
    config: any;
};

// Actual widget renderer mapping
const WidgetRenderer = ({ widget, readOnly, onUpdate }: { widget: CanvasWidget, readOnly?: boolean, onUpdate: (updates: any) => void }) => {
    const commonProps = { widget, readOnly, onUpdate };

    switch (widget.type) {
        case 'text':
            return <TextWidget {...commonProps} />;
        case 'image':
            return <ImageWidget {...commonProps} />;
        case 'chart':
            return <ChartWidget {...commonProps} />;
        case 'metric':
            return <MetricWidget {...commonProps} />;
        case 'filter':
            return <FilterWidget {...commonProps} />;
        case 'divider':
            return <div className="w-full h-full flex items-center justify-center"><div className="w-full h-px bg-border" /></div>;
        default:
            return (
                <div className="w-full h-full flex items-center justify-center bg-muted/20 border border-dashed rounded-md text-muted-foreground text-xs">
                    {widget.type} widget
                </div>
            );
    }
};

interface CanvasBoardProps {
    widgets: CanvasWidget[];
    layout: 'free' | 'grid';
    gridSize: number;
    readOnly?: boolean;
    onUpdateWidget: (id: string, updates: Partial<CanvasWidget>) => void;
    onDeleteWidget: (id: string) => void;
    onSelectWidget: (id: string | null) => void;
    selectedWidgetId: string | null;
}

export function CanvasBoard({
    widgets,
    layout,
    gridSize,
    readOnly = false,
    onUpdateWidget,
    onDeleteWidget,
    onSelectWidget,
    selectedWidgetId
}: CanvasBoardProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [draggingId, setDraggingId] = useState<string | null>(null);

    const handleDragStop = (id: string, d: { x: number; y: number }) => {
        setDraggingId(null);
        onUpdateWidget(id, { x: d.x, y: d.y });
    };

    const handleResizeStop = (id: string, ref: HTMLElement, position: { x: number; y: number }) => {
        onUpdateWidget(id, {
            width: parseInt(ref.style.width),
            height: parseInt(ref.style.height),
            x: position.x,
            y: position.y
        });
    };

    return (
        <div
            ref={containerRef}
            className="relative w-full h-full overflow-auto bg-slate-50/50 dark:bg-slate-950/50"
            onClick={(e) => {
                if (e.target === containerRef.current) {
                    onSelectWidget(null);
                }
            }}
        >
            {/* Grid Background */}
            {!readOnly && (
                <div
                    className="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]"
                    style={{
                        backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
                        backgroundSize: `${gridSize}px ${gridSize}px`
                    }}
                />
            )}

            <div className="min-h-[2000px] min-w-[2000px] relative">
                {widgets.map((widget) => {
                    const isSelected = selectedWidgetId === widget.id;
                    const isDragging = draggingId === widget.id;

                    return (
                        <Rnd
                            key={widget.id}
                            size={{ width: widget.width, height: widget.height }}
                            position={{ x: widget.x, y: widget.y }}
                            onDragStart={() => {
                                if (!readOnly) {
                                    setDraggingId(widget.id);
                                    onSelectWidget(widget.id);
                                }
                            }}
                            onDragStop={(e, d) => handleDragStop(widget.id, d)}
                            onResizeStart={() => !readOnly && onSelectWidget(widget.id)}
                            onResizeStop={(e, direction, ref, delta, position) =>
                                handleResizeStop(widget.id, ref, position)
                            }
                            disableDragging={readOnly}
                            enableResizing={!readOnly}
                            minWidth={50}
                            minHeight={20}
                            bounds="parent"
                            dragGrid={layout === 'grid' ? [gridSize, gridSize] : [1, 1]}
                            resizeGrid={layout === 'grid' ? [gridSize, gridSize] : [1, 1]}
                            className={cn(
                                "group bg-background border rounded-md transition-all duration-200",
                                // Remove border when reading only or not selected to make it look clean
                                !readOnly && "border-border hover:border-primary/50",
                                isSelected ? "ring-2 ring-primary border-primary z-50 shadow-lg" : "shadow-sm",
                                isDragging ? "shadow-xl opacity-90 cursor-grabbing" : !readOnly && "cursor-grab",
                                readOnly && "cursor-default border-transparent shadow-none bg-transparent"
                            )}
                            style={{ zIndex: isSelected ? 50 : widget.zIndex }}
                        >
                            {/* Selection Handles & Toolbar (Visible only when selected and not readOnly) */}
                            {isSelected && !readOnly && !isDragging && (
                                <>
                                    <div className="absolute -top-8 left-0 flex items-center gap-1 bg-primary text-primary-foreground px-2 py-1 rounded-t-md text-xs shadow-md">
                                        <GripHorizontal className="w-3 h-3" />
                                        <span className="font-mono">
                                            {Math.round(widget.x)},{Math.round(widget.y)}
                                        </span>
                                    </div>
                                    <div className="absolute -top-8 right-0 flex items-center gap-1">
                                        <Button
                                            variant="destructive"
                                            size="icon"
                                            className="h-6 w-6 rounded-none rounded-t-sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onDeleteWidget(widget.id);
                                            }}
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                </>
                            )}

                            {/* Widget Content */}
                            <div className="w-full h-full overflow-hidden relative">
                                <WidgetRenderer
                                    widget={widget}
                                    readOnly={readOnly}
                                    onUpdate={(updates) => onUpdateWidget(widget.id, updates)}
                                />

                                {/* Overlay to prevent interaction with iframe/charts while dragging */}
                                {!readOnly && !isSelected && (
                                    <div className="absolute inset-0 z-10" />
                                )}
                            </div>
                        </Rnd>
                    );
                })}
            </div>
        </div>
    );
}
