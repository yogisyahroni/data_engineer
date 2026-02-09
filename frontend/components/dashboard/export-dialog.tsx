'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    FileDown,
    FileText,
    Presentation,
    Settings2,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Download,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Export format types
 */
export type ExportFormat = 'pdf' | 'pptx' | 'png' | 'jpeg';

/**
 * Page orientation
 */
export type PageOrientation = 'portrait' | 'landscape';

/**
 * Page size presets
 */
export type PageSize = 'A4' | 'Letter' | 'Legal' | 'Tabloid' | 'Custom';

/**
 * Export quality settings
 */
export type ExportQuality = 'high' | 'medium' | 'low';

/**
 * Export status
 */
export type ExportStatus = 'idle' | 'processing' | 'completed' | 'failed';

/**
 * Export options configuration
 */
export interface ExportOptions {
    /** Export format */
    format: ExportFormat;

    /** Page orientation */
    orientation: PageOrientation;

    /** Page size */
    pageSize: PageSize;

    /** Custom page dimensions (if pageSize is 'Custom') */
    customWidth?: number;

    /** Custom page height (if pageSize is 'Custom') */
    customHeight?: number;

    /** Export quality */
    quality: ExportQuality;

    /** Include filters in export */
    includeFilters: boolean;

    /** Include timestamp */
    includeTimestamp: boolean;

    /** Include data tables */
    includeDataTables: boolean;

    /** Custom title */
    title?: string;

    /** Custom subtitle */
    subtitle?: string;

    /** Footer text */
    footerText?: string;

    /** Watermark text */
    watermark?: string;

    /** Chart resolution (DPI) */
    resolution: number;

    /** Card IDs to export (empty = all) */
    cardIds?: string[];

    /** Current tab only */
    currentTabOnly?: boolean;
}

/**
 * Export job result
 */
export interface ExportJob {
    /** Export job ID */
    exportId: string;

    /** Current status */
    status: ExportStatus;

    /** Progress percentage (0-100) */
    progress: number;

    /** Download URL (when completed) */
    downloadUrl?: string;

    /** Error message (when failed) */
    error?: string;

    /** File size in bytes */
    fileSize?: number;

    /** Estimated time remaining (seconds) */
    estimatedTime?: number;
}

/**
 * Props for ExportDialog component
 */
export interface ExportDialogProps {
    /** Dialog open state */
    open: boolean;

    /** Dialog open state change handler */
    onOpenChange: (open: boolean) => void;

    /** Dashboard ID */
    dashboardId: string;

    /** Dashboard name */
    dashboardName?: string;

    /** Available card IDs */
    availableCardIds?: string[];

    /** Current tab ID (if tabs enabled) */
    currentTabId?: string;

    /** Callback to trigger export */
    onExport: (options: ExportOptions) => Promise<ExportJob>;

    /** Callback to check export status */
    onCheckStatus?: (exportId: string) => Promise<ExportJob>;

    /** Default export options */
    defaultOptions?: Partial<ExportOptions>;
}

/**
 * Default export options
 */
const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
    format: 'pdf',
    orientation: 'landscape',
    pageSize: 'A4',
    quality: 'high',
    includeFilters: true,
    includeTimestamp: true,
    includeDataTables: false,
    resolution: 300,
};

/**
 * ExportDialog Component
 * 
 * Provides comprehensive dashboard export functionality
 */
export function ExportDialog({
    open,
    onOpenChange,
    dashboardId,
    dashboardName = 'Dashboard',
    availableCardIds = [],
    currentTabId,
    onExport,
    onCheckStatus,
    defaultOptions,
}: ExportDialogProps) {
    // State
    const [options, setOptions] = useState<ExportOptions>({
        ...DEFAULT_EXPORT_OPTIONS,
        ...defaultOptions,
    });
    const [exportJob, setExportJob] = useState<ExportJob | null>(null);
    const [isExporting, setIsExporting] = useState(false);

    /**
     * Update option
     */
    const updateOption = useCallback(
        <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => {
            setOptions((prev) => ({ ...prev, [key]: value }));
        },
        []
    );

    /**
     * Handle export
     */
    const handleExport = useCallback(async () => {
        setIsExporting(true);
        setExportJob(null);

        try {
            const job = await onExport(options);
            setExportJob(job);

            // Start polling if status check is available
            if (job.status === 'processing' && onCheckStatus) {
                startPolling(job.exportId);
            } else if (job.status === 'completed') {
                toast.success('Export completed!');
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Export failed';
            toast.error(message);
            setIsExporting(false);
        }
    }, [options, onExport, onCheckStatus]);

    /**
     * Start polling for export status
     */
    const startPolling = useCallback(
        (exportId: string) => {
            if (!onCheckStatus) return;

            const pollInterval = setInterval(async () => {
                try {
                    const job = await onCheckStatus(exportId);
                    setExportJob(job);

                    if (job.status === 'completed') {
                        clearInterval(pollInterval);
                        setIsExporting(false);
                        toast.success('Export completed!');
                    } else if (job.status === 'failed') {
                        clearInterval(pollInterval);
                        setIsExporting(false);
                        toast.error(`Export failed: ${job.error}`);
                    }
                } catch (error) {
                    clearInterval(pollInterval);
                    setIsExporting(false);
                    toast.error('Failed to check export status');
                }
            }, 2000); // Poll every 2 seconds

            // Cleanup on unmount
            return () => clearInterval(pollInterval);
        },
        [onCheckStatus]
    );

    /**
     * Download file
     */
    const handleDownload = useCallback(() => {
        if (!exportJob?.downloadUrl) return;

        // Trigger download
        const link = document.createElement('a');
        link.href = exportJob.downloadUrl;
        link.download = `${dashboardName}_export.${options.format}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        toast.success('Download started');
    }, [exportJob, dashboardName, options.format]);

    /**
     * Reset state when dialog closes
     */
    useEffect(() => {
        if (!open) {
            setExportJob(null);
            setIsExporting(false);
        }
    }, [open]);

    // Determine if we can export
    const canExport = !isExporting && exportJob?.status !== 'processing';

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <FileDown className="h-5 w-5" />
                        Export Dashboard
                    </DialogTitle>
                    <DialogDescription>
                        Export "{dashboardName}" as PDF or PowerPoint presentation
                    </DialogDescription>
                </DialogHeader>

                {/* Export status or configuration */}
                {exportJob && exportJob.status !== 'idle' ? (
                    <ExportStatus job={exportJob} onDownload={handleDownload} />
                ) : (
                    <ExportConfiguration
                        options={options}
                        onUpdateOption={updateOption}
                        availableCardIds={availableCardIds}
                        currentTabId={currentTabId}
                    />
                )}

                <DialogFooter>
                    {exportJob?.status === 'completed' ? (
                        <>
                            <Button variant="outline" onClick={() => onOpenChange(false)}>
                                Close
                            </Button>
                            <Button onClick={handleDownload} className="gap-2">
                                <Download className="h-4 w-4" />
                                Download
                            </Button>
                        </>
                    ) : (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                disabled={isExporting}
                            >
                                Cancel
                            </Button>
                            <Button onClick={handleExport} disabled={!canExport} className="gap-2">
                                {isExporting ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FileDown className="h-4 w-4" />
                                        Generate Export
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

/**
 * Export configuration form
 */
function ExportConfiguration({
    options,
    onUpdateOption,
    availableCardIds,
    currentTabId,
}: {
    options: ExportOptions;
    onUpdateOption: <K extends keyof ExportOptions>(key: K, value: ExportOptions[K]) => void;
    availableCardIds: string[];
    currentTabId?: string;
}) {
    return (
        <Tabs defaultValue="basic" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Basic</TabsTrigger>
                <TabsTrigger value="content">Content</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
            </TabsList>

            {/* Basic tab */}
            <TabsContent value="basic" className="space-y-4 mt-4">
                {/* Format */}
                <div className="grid gap-2">
                    <Label htmlFor="format">Format</Label>
                    <Select
                        value={options.format}
                        onValueChange={(value) => onUpdateOption('format', value as ExportFormat)}
                    >
                        <SelectTrigger id="format">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="pdf">
                                <div className="flex items-center gap-2">
                                    <FileText className="h-4 w-4" />
                                    PDF Document
                                </div>
                            </SelectItem>
                            <SelectItem value="pptx">
                                <div className="flex items-center gap-2">
                                    <Presentation className="h-4 w-4" />
                                    PowerPoint (PPTX)
                                </div>
                            </SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Orientation */}
                <div className="grid gap-2">
                    <Label htmlFor="orientation">Orientation</Label>
                    <Select
                        value={options.orientation}
                        onValueChange={(value) => onUpdateOption('orientation', value as PageOrientation)}
                    >
                        <SelectTrigger id="orientation">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="portrait">Portrait</SelectItem>
                            <SelectItem value="landscape">Landscape</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Page size */}
                <div className="grid gap-2">
                    <Label htmlFor="pageSize">Page Size</Label>
                    <Select
                        value={options.pageSize}
                        onValueChange={(value) => onUpdateOption('pageSize', value as PageSize)}
                    >
                        <SelectTrigger id="pageSize">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="A4">A4 (210 × 297 mm)</SelectItem>
                            <SelectItem value="Letter">Letter (8.5 × 11 in)</SelectItem>
                            <SelectItem value="Legal">Legal (8.5 × 14 in)</SelectItem>
                            <SelectItem value="Tabloid">Tabloid (11 × 17 in)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Quality */}
                <div className="grid gap-2">
                    <Label htmlFor="quality">Quality</Label>
                    <Select
                        value={options.quality}
                        onValueChange={(value) => onUpdateOption('quality', value as ExportQuality)}
                    >
                        <SelectTrigger id="quality">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="high">High (Best quality, larger file)</SelectItem>
                            <SelectItem value="medium">Medium (Balanced)</SelectItem>
                            <SelectItem value="low">Low (Smaller file)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </TabsContent>

            {/* Content tab */}
            <TabsContent value="content" className="space-y-4 mt-4">
                {/* Title */}
                <div className="grid gap-2">
                    <Label htmlFor="title">Custom Title</Label>
                    <Input
                        id="title"
                        value={options.title || ''}
                        onChange={(e) => onUpdateOption('title', e.target.value)}
                        placeholder="Dashboard title (optional)"
                    />
                </div>

                {/* Subtitle */}
                <div className="grid gap-2">
                    <Label htmlFor="subtitle">Subtitle</Label>
                    <Input
                        id="subtitle"
                        value={options.subtitle || ''}
                        onChange={(e) => onUpdateOption('subtitle', e.target.value)}
                        placeholder="Optional subtitle"
                    />
                </div>

                <Separator />

                {/* Include options */}
                <div className="space-y-3">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="includeFilters" className="cursor-pointer">
                            Include Filters
                        </Label>
                        <Switch
                            id="includeFilters"
                            checked={options.includeFilters}
                            onCheckedChange={(checked) => onUpdateOption('includeFilters', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="includeTimestamp" className="cursor-pointer">
                            Include Timestamp
                        </Label>
                        <Switch
                            id="includeTimestamp"
                            checked={options.includeTimestamp}
                            onCheckedChange={(checked) => onUpdateOption('includeTimestamp', checked)}
                        />
                    </div>

                    <div className="flex items-center justify-between">
                        <Label htmlFor="includeDataTables" className="cursor-pointer">
                            Include Data Tables
                        </Label>
                        <Switch
                            id="includeDataTables"
                            checked={options.includeDataTables}
                            onCheckedChange={(checked) => onUpdateOption('includeDataTables', checked)}
                        />
                    </div>

                    {currentTabId && (
                        <div className="flex items-center justify-between">
                            <Label htmlFor="currentTabOnly" className="cursor-pointer">
                                Current Tab Only
                            </Label>
                            <Switch
                                id="currentTabOnly"
                                checked={options.currentTabOnly}
                                onCheckedChange={(checked) => onUpdateOption('currentTabOnly', checked)}
                            />
                        </div>
                    )}
                </div>
            </TabsContent>

            {/* Advanced tab */}
            <TabsContent value="advanced" className="space-y-4 mt-4">
                {/* Resolution */}
                <div className="grid gap-2">
                    <Label htmlFor="resolution">Chart Resolution (DPI)</Label>
                    <Select
                        value={String(options.resolution)}
                        onValueChange={(value) => onUpdateOption('resolution', Number(value))}
                    >
                        <SelectTrigger id="resolution">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="150">150 DPI (Screen)</SelectItem>
                            <SelectItem value="300">300 DPI (Print quality)</SelectItem>
                            <SelectItem value="600">600 DPI (High quality)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Footer text */}
                <div className="grid gap-2">
                    <Label htmlFor="footerText">Footer Text</Label>
                    <Input
                        id="footerText"
                        value={options.footerText || ''}
                        onChange={(e) => onUpdateOption('footerText', e.target.value)}
                        placeholder="Optional footer text"
                    />
                </div>

                {/* Watermark */}
                <div className="grid gap-2">
                    <Label htmlFor="watermark">Watermark</Label>
                    <Input
                        id="watermark"
                        value={options.watermark || ''}
                        onChange={(e) => onUpdateOption('watermark', e.target.value)}
                        placeholder="Optional watermark text"
                    />
                </div>
            </TabsContent>
        </Tabs>
    );
}

/**
 * Export status display
 */
function ExportStatus({
    job,
    onDownload,
}: {
    job: ExportJob;
    onDownload: () => void;
}) {
    return (
        <div className="space-y-4 py-6">
            {/* Status icon and message */}
            <div className="flex flex-col items-center gap-4">
                {job.status === 'processing' && (
                    <>
                        <Loader2 className="h-16 w-16 animate-spin text-primary" />
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Generating Export...</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {job.estimatedTime
                                    ? `Estimated time: ${job.estimatedTime}s`
                                    : 'This may take a minute'}
                            </p>
                        </div>
                    </>
                )}

                {job.status === 'completed' && (
                    <>
                        <CheckCircle2 className="h-16 w-16 text-green-600" />
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Export Complete!</h3>
                            <p className="text-sm text-muted-foreground mt-1">
                                {job.fileSize && `File size: ${formatFileSize(job.fileSize)}`}
                            </p>
                        </div>
                    </>
                )}

                {job.status === 'failed' && (
                    <>
                        <AlertCircle className="h-16 w-16 text-destructive" />
                        <div className="text-center">
                            <h3 className="text-lg font-semibold">Export Failed</h3>
                            <p className="text-sm text-muted-foreground mt-1">{job.error}</p>
                        </div>
                    </>
                )}
            </div>

            {/* Progress bar */}
            {job.status === 'processing' && (
                <div className="space-y-2">
                    <Progress value={job.progress} className="h-2" />
                    <p className="text-xs text-center text-muted-foreground">{job.progress}%</p>
                </div>
            )}

            {/* Download button for completed */}
            {job.status === 'completed' && (
                <Button onClick={onDownload} className="w-full gap-2" size="lg">
                    <Download className="h-4 w-4" />
                    Download File
                </Button>
            )}
        </div>
    );
}

/**
 * Format file size
 */
function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
