'use client';

import { CanvasWidget } from '../canvas-board';
import { ImageIcon } from 'lucide-react';

interface WidgetProps {
    widget: CanvasWidget;
    readOnly?: boolean;
}

export function ImageWidget({ widget, readOnly }: WidgetProps) {
    const src = widget.config.url;
    const fit = widget.config.objectFit || 'cover';

    if (!src) {
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-4">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs text-center">No image selected. Configure in properties.</span>
            </div>
        );
    }

    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt="Widget content"
            className="w-full h-full pointer-events-none select-none"
            style={{ objectFit: fit }}
        />
    );
}
