'use client';

import { CanvasWidget } from '../canvas-board';
import { Calendar, Filter } from 'lucide-react';

interface WidgetProps {
    widget: CanvasWidget;
    readOnly?: boolean;
}

export function FilterWidget({ widget, readOnly }: WidgetProps) {
    const type = widget.config.filterType || 'date';

    return (
        <div className="w-full h-full flex items-center justify-center p-2 bg-card border rounded-md shadow-sm">
            {type === 'date' ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground w-full justify-center">
                    <Calendar className="w-4 h-4" />
                    <span>Last 30 Days</span>
                </div>
            ) : (
                <div className="flex items-center gap-2 text-sm text-muted-foreground w-full justify-center">
                    <Filter className="w-4 h-4" />
                    <span>Category: All</span>
                </div>
            )}
        </div>
    );
}
