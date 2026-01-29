'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanvasWidget } from '../canvas-board';

interface PropertyProps {
    widget: CanvasWidget;
    onUpdate: (updates: Partial<CanvasWidget>) => void;
}

export function MetricProperty({ widget, onUpdate }: PropertyProps) {
    const { label, value, trend, trendValue } = widget.config;

    const handleConfigChange = (key: string, val: string) => {
        onUpdate({ config: { ...widget.config, [key]: val } });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Label</Label>
                <Input
                    value={label || ''}
                    onChange={(e) => handleConfigChange('label', e.target.value)}
                    placeholder="e.g. Total Revenue"
                />
            </div>

            <div className="space-y-2">
                <Label>Value</Label>
                <Input
                    value={value || ''}
                    onChange={(e) => handleConfigChange('value', e.target.value)}
                    placeholder="e.g. $520.4k"
                />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div className="space-y-2">
                    <Label>Trend</Label>
                    <Select value={trend || 'neutral'} onValueChange={(val) => handleConfigChange('trend', val)}>
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="up">Up (Green)</SelectItem>
                            <SelectItem value="down">Down (Red)</SelectItem>
                            <SelectItem value="neutral">Neutral</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2">
                    <Label>Trend Value</Label>
                    <Input
                        value={trendValue || ''}
                        onChange={(e) => handleConfigChange('trendValue', e.target.value)}
                        placeholder="e.g. +12%"
                    />
                </div>
            </div>

        </div>
    );
}
