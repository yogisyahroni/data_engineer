'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { CanvasWidget } from '../canvas-board';
import { TextProperty } from './text-property';
import { ImageProperty } from './image-property';
import { ChartProperty } from './chart-property';
import { MetricProperty } from './metric-property';
import { FilterProperty } from './filter-property';

interface PropertyPanelProps {
    widget: CanvasWidget | null;
    onUpdate: (updates: Partial<CanvasWidget>) => void;
}

export function PropertyPanel({ widget, onUpdate }: PropertyPanelProps) {
    if (!widget) {
        return (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-4 text-center">
                <p className="text-sm">Select a widget to edit properties</p>
            </div>
        );
    }

    const renderSpecificProperties = () => {
        switch (widget.type) {
            case 'text':
                return <TextProperty widget={widget} onUpdate={onUpdate} />;
            case 'image':
                return <ImageProperty widget={widget} onUpdate={onUpdate} />;
            case 'chart':
                return <ChartProperty widget={widget} onUpdate={onUpdate} />;
            case 'metric':
                return <MetricProperty widget={widget} onUpdate={onUpdate} />;
            case 'filter':
                return <FilterProperty widget={widget} onUpdate={onUpdate} />;
            default:
                return <p className="text-xs text-muted-foreground italic">No specific properties for this widget type.</p>;
        }
    };

    return (
        <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b bg-muted/20">
                <h3 className="font-semibold text-sm capitalize">{widget.type} Widget</h3>
                <p className="text-xs text-muted-foreground font-mono truncate">{widget.id}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                {/* Visual Properties */}
                <div className="space-y-4 pb-6 border-b">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Layout</h4>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <Label className="text-xs">X Position</Label>
                            <Input
                                type="number"
                                value={Math.round(widget.x)}
                                onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Y Position</Label>
                            <Input
                                type="number"
                                value={Math.round(widget.y)}
                                onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Width</Label>
                            <Input
                                type="number"
                                value={Math.round(widget.width)}
                                onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 0 })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Height</Label>
                            <Input
                                type="number"
                                value={Math.round(widget.height)}
                                onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 0 })}
                                className="h-8"
                            />
                        </div>
                        <div className="space-y-1">
                            <Label className="text-xs">Z-Index</Label>
                            <Input
                                type="number"
                                value={widget.zIndex}
                                onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) || 0 })}
                                className="h-8"
                            />
                        </div>
                    </div>
                </div>

                {/* Specific Properties */}
                <div className="space-y-4">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Configuration</h4>
                    {renderSpecificProperties()}
                </div>
            </div>
        </div>
    );
}
