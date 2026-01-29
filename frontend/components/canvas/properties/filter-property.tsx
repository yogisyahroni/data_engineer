'use client';

import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanvasWidget } from '../canvas-board';

interface PropertyProps {
    widget: CanvasWidget;
    onUpdate: (updates: Partial<CanvasWidget>) => void;
}

export function FilterProperty({ widget, onUpdate }: PropertyProps) {
    const filterType = widget.config.filterType || 'date';

    const handleChange = (val: string) => {
        onUpdate({ config: { ...widget.config, filterType: val } });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Filter Type</Label>
                <Select value={filterType} onValueChange={handleChange}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="date">Date Range</SelectItem>
                        <SelectItem value="category">Category Selection</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <p className="text-xs text-muted-foreground">
                Drag this widget to position the global filter control. It will apply to all compatible charts on this canvas.
            </p>
        </div>
    );
}
