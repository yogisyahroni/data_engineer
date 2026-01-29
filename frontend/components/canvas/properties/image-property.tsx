'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CanvasWidget } from '../canvas-board';

interface PropertyProps {
    widget: CanvasWidget;
    onUpdate: (updates: Partial<CanvasWidget>) => void;
}

export function ImageProperty({ widget, onUpdate }: PropertyProps) {
    const url = widget.config.url || '';
    const fit = widget.config.objectFit || 'cover';

    const handleConfigChange = (key: string, val: string) => {
        onUpdate({ config: { ...widget.config, [key]: val } });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                    value={url}
                    onChange={(e) => handleConfigChange('url', e.target.value)}
                    placeholder="https://example.com/image.png"
                />
            </div>

            <div className="space-y-2">
                <Label>Object Fit</Label>
                <Select value={fit} onValueChange={(val) => handleConfigChange('objectFit', val)}>
                    <SelectTrigger>
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="cover">Cover (Fill)</SelectItem>
                        <SelectItem value="contain">Contain (Fit)</SelectItem>
                        <SelectItem value="fill">Stretch</SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
