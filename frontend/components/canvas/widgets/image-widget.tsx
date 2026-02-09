'use client';

import { CanvasWidget } from '../canvas-board';
import { ImageIcon } from 'lucide-react';
import Image from 'next/image';

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

    // Validasi URL gambar untuk mencegah error
    const isValidUrl = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('/');

    if (!isValidUrl) {
        console.warn('ImageWidget: Invalid URL provided:', src);
        return (
            <div className="w-full h-full flex flex-col items-center justify-center bg-muted/30 text-muted-foreground p-4">
                <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
                <span className="text-xs text-center">Invalid image URL: {src}</span>
            </div>
        );
    }

    return (
        <Image
            src={src}
            alt="Widget content"
            fill
            className="pointer-events-none select-none"
            style={{ objectFit: fit }}
            onError={(e) => {
                console.error('ImageWidget: Failed to load image', src, e);
            }}
        />
    );
}

