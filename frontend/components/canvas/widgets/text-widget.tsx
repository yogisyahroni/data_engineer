'use client';

import { useState, useRef, useEffect } from 'react';
import { CanvasWidget } from '../canvas-board';

interface WidgetProps {
    widget: CanvasWidget;
    readOnly?: boolean;
    onUpdate?: (updates: any) => void;
}

export function TextWidget({ widget, readOnly, onUpdate }: WidgetProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(widget.config.content || '');
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        setContent(widget.config.content || '');
    }, [widget.config.content]);

    const handleBlur = () => {
        setIsEditing(false);
        if (content !== widget.config.content) {
            onUpdate?.({ config: { ...widget.config, content } });
        }
    };

    if (isEditing && !readOnly) {
        return (
            <textarea
                ref={textareaRef}
                className="w-full h-full p-2 resize-none bg-background text-foreground border-none outline-none focus:ring-0"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onBlur={handleBlur}
                autoFocus
                onMouseDown={(e) => e.stopPropagation()} // Allow clicking into textarea without dragging
            />
        );
    }

    return (
        <div
            className="w-full h-full p-2 prose prose-sm dark:prose-invert max-w-none overflow-auto"
            onDoubleClick={() => !readOnly && setIsEditing(true)}
        >
            {/* Simple markdown rendering for now, could upgrade to a proper parser later */}
            {content ? (
                <div dangerouslySetInnerHTML={{ __html: parseMarkdown(content) }} />
            ) : (
                <div className="text-muted-foreground italic select-none">Double click to add text...</div>
            )}
        </div>
    );
}

// Basic markdown parser placeholder (replace with unified/remark later if needed)
function parseMarkdown(text: string) {
    return text
        .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-2">$1</h1>')
        .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mb-2">$1</h2>')
        .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mb-1">$1</h3>')
        .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
        .replace(/\*(.*)\*/gim, '<em>$1</em>')
        .replace(/\n/gim, '<br />');
}
