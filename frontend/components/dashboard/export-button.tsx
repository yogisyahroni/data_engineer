'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { FileDown, FileText, Presentation, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
    ExportDialog,
    type ExportOptions,
    type ExportJob,
    type ExportFormat,
} from './export-dialog';

/**
 * Props for ExportButton component
 */
export interface ExportButtonProps {
    /** Dashboard ID */
    dashboardId: string;

    /** Dashboard name */
    dashboardName?: string;

    /** Available card IDs */
    availableCardIds?: string[];

    /** Current tab ID */
    currentTabId?: string;

    /** Callback to trigger export */
    onExport: (options: ExportOptions) => Promise<ExportJob>;

    /** Callback to check export status */
    onCheckStatus?: (exportId: string) => Promise<ExportJob>;

    /** Show quick export options */
    showQuickExport?: boolean;

    /** Button variant */
    variant?: 'default' | 'outline' | 'ghost';

    /** Button size */
    size?: 'default' | 'sm' | 'lg' | 'icon';

    /** CSS class name */
    className?: string;
}

/**
 * ExportButton Component
 * 
 * Provides quick access to export functionality
 */
export function ExportButton({
    dashboardId,
    dashboardName,
    availableCardIds,
    currentTabId,
    onExport,
    onCheckStatus,
    showQuickExport = true,
    variant = 'outline',
    size = 'default',
    className,
}: ExportButtonProps) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [quickExportFormat, setQuickExportFormat] = useState<ExportFormat | null>(null);

    /**
     * Handle quick export
     */
    const handleQuickExport = async (format: ExportFormat) => {
        setQuickExportFormat(format);

        // Open dialog with pre-selected format
        setIsDialogOpen(true);
    };

    if (showQuickExport) {
        return (
            <>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant={variant} size={size} className={cn('gap-2', className)}>
                            <FileDown className="h-4 w-4" />
                            Export
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleQuickExport('pdf')}>
                            <FileText className="h-4 w-4 mr-2" />
                            Export as PDF
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleQuickExport('pptx')}>
                            <Presentation className="h-4 w-4 mr-2" />
                            Export as PowerPoint
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => setIsDialogOpen(true)}>
                            <Download className="h-4 w-4 mr-2" />
                            Advanced Export...
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>

                <ExportDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    dashboardId={dashboardId}
                    dashboardName={dashboardName}
                    availableCardIds={availableCardIds}
                    currentTabId={currentTabId}
                    onExport={onExport}
                    onCheckStatus={onCheckStatus}
                    defaultOptions={
                        quickExportFormat ? { format: quickExportFormat } : undefined
                    }
                />
            </>
        );
    }

    return (
        <>
            <Button
                variant={variant}
                size={size}
                className={cn('gap-2', className)}
                onClick={() => setIsDialogOpen(true)}
            >
                <FileDown className="h-4 w-4" />
                Export
            </Button>

            <ExportDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                dashboardId={dashboardId}
                dashboardName={dashboardName}
                availableCardIds={availableCardIds}
                currentTabId={currentTabId}
                onExport={onExport}
                onCheckStatus={onCheckStatus}
            />
        </>
    );
}
