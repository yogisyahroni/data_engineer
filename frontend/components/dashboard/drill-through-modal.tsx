'use client';

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { ResultsTable } from '@/components/query-results/results-table';
import { ScrollArea } from '@/components/ui/scroll-area';

interface DrillThroughModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: string;
    data: any[];
    isLoading?: boolean;
}

export function DrillThroughModal({
    open,
    onOpenChange,
    title,
    data,
    isLoading
}: DrillThroughModalProps) {
    // ResultTable expects simple string array for columns if data is array of objects
    const columns = React.useMemo(() => {
        if (!data || data.length === 0) return [];
        return Object.keys(data[0]);
    }, [data]);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[90vw] h-[80vh] flex flex-col p-0 gap-0">
                <DialogHeader className="p-4 border-b flex-shrink-0">
                    <DialogTitle>Underlying Data: {title}</DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-hidden bg-muted/5 relative">
                    <div className="absolute inset-0 p-4">
                        <ResultsTable
                            data={data}
                            columns={columns}
                            rowCount={data.length}
                            isLoading={isLoading || false}
                        />
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
