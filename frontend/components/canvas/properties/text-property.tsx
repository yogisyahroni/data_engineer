'use client';

import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CanvasWidget } from '../canvas-board';

interface PropertyProps {
    widget: CanvasWidget;
    onUpdate: (updates: Partial<CanvasWidget>) => void;
}

export function TextProperty({ widget, onUpdate }: PropertyProps) {
    const content = widget.config.content || '';

    const handleChange = (val: string) => {
        onUpdate({ config: { ...widget.config, content: val } });
    };

    return (
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Content (Markdown)</Label>
                <Textarea
                    value={content}
                    onChange={(e) => handleChange(e.target.value)}
                    rows={10}
                    className="font-mono text-xs"
                    placeholder="# Hello World"
                />
            </div>
        </div>
    );
}
