'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import {
    Upload,
    File,
    FileText,
    FileSpreadsheet,
    Code,
    Check,
    X,
    AlertCircle,
    Loader2,
    ChevronRight,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

/**
 * Types
 */

export type FileType = 'csv' | 'excel' | 'json';

export type ImportColumn = {
    name: string;
    index: number;
    detectedType: string;
    sampleValues: string[];
    nullCount: number;
    selected: boolean;
    mappedName?: string;
};

export type ImportPreview = {
    columns: ImportColumn[];
    rows: string[][];
    totalRows: number;
    sampleSize: number;
    hasHeader: boolean;
    sheets?: Array<{ name: string; rowCount: number }>;
    activeSheet?: string;
};

export type ImportOptions = {
    // CSV options
    delimiter?: string;
    hasHeader?: boolean;
    skipRows?: number;

    // Excel options
    sheetName?: string;
    sheetIndex?: number;

    // JSON options
    rootPath?: string;
    flattenNested?: boolean;
    arrayStrategy?: 'json' | 'first' | 'ignore';

    // Common options
    maxRows?: number;
    detectTypes?: boolean;
    trimWhitespace?: boolean;
};

export interface FileUploaderProps {
    /** Accepted file types */
    acceptedFileTypes?: FileType[];

    /** Maximum file size in MB */
    maxFileSize?: number;

    /** Callback when file preview is ready */
    onPreview?: (file: File, preview: ImportPreview) => void;

    /** Callback when import is confirmed */
    onImport: (file: File, options: ImportOptions, columnMapping: Record<string, string>) => Promise<void>;

    /** Show advanced options */
    showAdvanced?: boolean;
}

/**
 * File Uploader Component
 */
export function FileUploader({
    acceptedFileTypes = ['csv', 'excel', 'json'],
    maxFileSize = 100,
    onPreview,
    onImport,
    showAdvanced = true,
}: FileUploaderProps) {
    // State
    const [file, setFile] = useState<File | null>(null);
    const [fileType, setFileType] = useState<FileType | null>(null);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [preview, setPreview] = useState<ImportPreview | null>(null);
    const [options, setOptions] = useState<ImportOptions>({
        hasHeader: true,
        detectTypes: true,
        trimWhitespace: true,
        delimiter: ',',
    });
    const [step, setStep] = useState<'upload' | 'configure' | 'preview' | 'mapping'>('upload');
    const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});

    // Dropzone
    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        accept: {
            'text/csv': ['.csv'],
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
            'application/vnd.ms-excel': ['.xls'],
            'application/json': ['.json'],
        },
        maxSize: maxFileSize * 1024 * 1024,
        multiple: false,
        onDrop: handleFileDrop,
    });

    /**
     * Handle file drop
     */
    function handleFileDrop(acceptedFiles: File[]) {
        if (acceptedFiles.length === 0) return;

        const droppedFile = acceptedFiles[0];
        const ext = droppedFile.name.split('.').pop()?.toLowerCase();

        let type: FileType | null = null;
        if (ext === 'csv') type = 'csv';
        else if (ext === 'xlsx' || ext === 'xls') type = 'excel';
        else if (ext === 'json') type = 'json';

        if (!type || !acceptedFileTypes.includes(type)) {
            toast.error(`File type .${ext} is not supported`);
            return;
        }

        setFile(droppedFile);
        setFileType(type);
        setStep('configure');
    }

    /**
     * Handle generate preview
     */
    async function handleGeneratePreview() {
        if (!file) return;

        setIsUploading(true);
        setUploadProgress(0);

        try {
            // Simulate upload progress
            const progressInterval = setInterval(() => {
                setUploadProgress((prev) => Math.min(prev + 10, 90));
            }, 100);

            // Call API to generate preview
            const formData = new FormData();
            formData.append('file', file);
            formData.append('options', JSON.stringify(options));

            const response = await fetch(`/api/import/${fileType}/preview`, {
                method: 'POST',
                body: formData,
            });

            clearInterval(progressInterval);

            if (!response.ok) {
                throw new Error('Failed to generate preview');
            }

            const data = await response.json();
            setPreview(data);
            setUploadProgress(100);

            // Initialize column mapping
            const mapping: Record<string, string> = {};
            data.columns.forEach((col: ImportColumn) => {
                mapping[col.name] = col.name;
            });
            setColumnMapping(mapping);

            if (onPreview) {
                onPreview(file, data);
            }

            setStep('preview');
            toast.success('Preview generated successfully');
        } catch (error: any) {
            toast.error(`Preview failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    }

    /**
     * Handle import
     */
    async function handleImport() {
        if (!file) return;

        setIsUploading(true);
        try {
            await onImport(file, options, columnMapping);
            toast.success('Import completed successfully');
            handleReset();
        } catch (error: any) {
            toast.error(`Import failed: ${error.message}`);
        } finally {
            setIsUploading(false);
        }
    }

    /**
     * Handle reset
     */
    function handleReset() {
        setFile(null);
        setFileType(null);
        setPreview(null);
        setUploadProgress(0);
        setStep('upload');
        setColumnMapping({});
    }

    /**
     * Update option
     */
    function updateOption<K extends keyof ImportOptions>(key: K, value: ImportOptions[K]) {
        setOptions((prev) => ({ ...prev, [key]: value }));
    }

    /**
     * Render based on step
     */
    return (
        <div className="space-y-4">
            {/* Step Indicator */}
            <div className="flex items-center gap-2">
                <StepIndicator step={1} active={step === 'upload'} completed={step !== 'upload'} label="Upload" />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <StepIndicator step={2} active={step === 'configure'} completed={step === 'preview' || step === 'mapping'} label="Configure" />
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <StepIndicator step={3} active={step === 'preview' || step === 'mapping'} completed={false} label="Preview & Import" />
            </div>

            {/* Upload Step */}
            {step === 'upload' && (
                <Card
                    {...getRootProps()}
                    className={cn(
                        'p-12 border-2 border-dashed cursor-pointer transition-colors',
                        isDragActive ? 'border-primary bg-primary/5' : 'border-muted-foreground/25'
                    )}
                >
                    <input {...getInputProps()} />
                    <div className="flex flex-col items-center gap-4 text-center">
                        <Upload className="h-12 w-12 text-muted-foreground" />
                        <div>
                            <p className="text-lg font-semibold">
                                {isDragActive ? 'Drop file here' : 'Drag & drop file here'}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                                or click to browse
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {acceptedFileTypes.includes('csv') && (
                                <Badge variant="outline">CSV</Badge>
                            )}
                            {acceptedFileTypes.includes('excel') && (
                                <Badge variant="outline">Excel</Badge>
                            )}
                            {acceptedFileTypes.includes('json') && (
                                <Badge variant="outline">JSON</Badge>
                            )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Maximum file size: {maxFileSize}MB
                        </p>
                    </div>
                </Card>
            )}

            {/* Configure Step */}
            {step === 'configure' && file && (
                <Card className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-3">
                            {fileType === 'csv' && <FileText className="h-8 w-8 text-green-500" />}
                            {fileType === 'excel' && <FileSpreadsheet className="h-8 w-8 text-blue-500" />}
                            {fileType === 'json' && <Code className="h-8 w-8 text-purple-500" />}
                            <div>
                                <p className="font-semibold">{file.name}</p>
                                <p className="text-sm text-muted-foreground">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                            </div>
                        </div>

                        <Separator />

                        {/* File-specific options */}
                        {fileType === 'csv' && (
                            <CSVOptions options={options} onUpdate={updateOption} />
                        )}
                        {fileType === 'excel' && (
                            <ExcelOptions options={options} onUpdate={updateOption} preview={preview} />
                        )}
                        {fileType === 'json' && (
                            <JSONOptions options={options} onUpdate={updateOption} />
                        )}

                        {/* Progress */}
                        {isUploading && (
                            <div className="space-y-2">
                                <Progress value={uploadProgress} />
                                <p className="text-sm text-muted-foreground text-center">
                                    {uploadProgress}% - Generating preview...
                                </p>
                            </div>
                        )}

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleReset}>
                                Cancel
                            </Button>
                            <Button onClick={handleGeneratePreview} disabled={isUploading} className="flex-1">
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Generating Preview...
                                    </>
                                ) : (
                                    'Generate Preview'
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}

            {/* Preview Step */}
            {(step === 'preview' || step === 'mapping') && preview && (
                <Card className="p-6">
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-lg">Data Preview</h3>
                                <p className="text-sm text-muted-foreground">
                                    {preview.totalRows} rows × {preview.columns.length} columns
                                </p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setStep('mapping')}>
                                Configure Columns
                            </Button>
                        </div>

                        {/* Preview Table */}
                        <ScrollArea className="h-[400px] border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        {preview.columns.map((col) => (
                                            <TableHead key={col.index}>
                                                <div className="space-y-1">
                                                    <div className="font-semibold">{col.name}</div>
                                                    <Badge variant="secondary" className="text-xs">
                                                        {col.detectedType}
                                                    </Badge>
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {preview.rows.map((row, idx) => (
                                        <TableRow key={idx}>
                                            {row.map((cell, cellIdx) => (
                                                <TableCell key={cellIdx} className="font-mono text-xs">
                                                    {cell || <span className="text-muted-foreground italic">null</span>}
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </ScrollArea>

                        <div className="flex gap-2">
                            <Button variant="outline" onClick={handleReset}>
                                Cancel
                            </Button>
                            <Button onClick={handleImport} disabled={isUploading} className="flex-1">
                                {isUploading ? (
                                    <>
                                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        Importing...
                                    </>
                                ) : (
                                    `Import ${preview.totalRows} Rows`
                                )}
                            </Button>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
}

/**
 * Step Indicator
 */
function StepIndicator({
    step,
    active,
    completed,
    label,
}: {
    step: number;
    active: boolean;
    completed: boolean;
    label: string;
}) {
    return (
        <div className="flex items-center gap-2">
            <div
                className={cn(
                    'h-8 w-8 rounded-full flex items-center justify-center text-sm font-semibold',
                    active && 'bg-primary text-primary-foreground',
                    completed && 'bg-green-500 text-white',
                    !active && !completed && 'bg-muted text-muted-foreground'
                )}
            >
                {completed ? <Check className="h-4 w-4" /> : step}
            </div>
            <span className={cn('text-sm font-medium', active && 'text-primary')}>
                {label}
            </span>
        </div>
    );
}

/**
 * CSV Options Component
 */
function CSVOptions({
    options,
    onUpdate,
}: {
    options: ImportOptions;
    onUpdate: <K extends keyof ImportOptions>(key: K, value: ImportOptions[K]) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                    <Label>Delimiter</Label>
                    <Select
                        value={options.delimiter}
                        onValueChange={(value) => onUpdate('delimiter', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value=",">Comma (,)</SelectItem>
                            <SelectItem value=";">Semicolon (;)</SelectItem>
                            <SelectItem value="\t">Tab</SelectItem>
                            <SelectItem value="|">Pipe (|)</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Skip Rows</Label>
                    <Input
                        type="number"
                        min="0"
                        value={options.skipRows || 0}
                        onChange={(e) => onUpdate('skipRows', parseInt(e.target.value))}
                    />
                </div>
            </div>
            <div className="flex items-center gap-2">
                <Checkbox
                    id="hasHeader"
                    checked={options.hasHeader}
                    onCheckedChange={(checked) => onUpdate('hasHeader', Boolean(checked))}
                />
                <Label htmlFor="hasHeader">First row is header</Label>
            </div>
        </div>
    );
}

/**
 * Excel Options Component
 */
function ExcelOptions({
    options,
    onUpdate,
    preview,
}: {
    options: ImportOptions;
    onUpdate: <K extends keyof ImportOptions>(key: K, value: ImportOptions[K]) => void;
    preview: ImportPreview | null;
}) {
    return (
        <div className="space-y-3">
            {preview?.sheets && preview.sheets.length > 0 && (
                <div className="space-y-2">
                    <Label>Sheet</Label>
                    <Select
                        value={options.sheetName || preview.activeSheet}
                        onValueChange={(value) => onUpdate('sheetName', value)}
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            {preview.sheets.map((sheet, idx) => (
                                <SelectItem key={idx} value={sheet.name}>
                                    {sheet.name} ({sheet.rowCount} rows)
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}
            <div className="flex items-center gap-2">
                <Checkbox
                    id="hasHeaderExcel"
                    checked={options.hasHeader}
                    onCheckedChange={(checked) => onUpdate('hasHeader', Boolean(checked))}
                />
                <Label htmlFor="hasHeaderExcel">First row is header</Label>
            </div>
        </div>
    );
}

/**
 * JSON Options Component
 */
function JSONOptions({
    options,
    onUpdate,
}: {
    options: ImportOptions;
    onUpdate: <K extends keyof ImportOptions>(key: K, value: ImportOptions[K]) => void;
}) {
    return (
        <div className="space-y-3">
            <div className="space-y-2">
                <Label>Root Path (optional)</Label>
                <Input
                    placeholder="e.g., data.items"
                    value={options.rootPath || ''}
                    onChange={(e) => onUpdate('rootPath', e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2">
                <Checkbox
                    id="flattenNested"
                    checked={options.flattenNested !== false}
                    onCheckedChange={(checked) => onUpdate('flattenNested', Boolean(checked))}
                />
                <Label htmlFor="flattenNested">Flatten nested objects</Label>
            </div>
        </div>
    );
}
