
'use client';

import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileSpreadsheet, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function DataBlender() {
    const [isUploading, setIsUploading] = useState(false);
    const [uploadedTable, setUploadedTable] = useState<string | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Basic Validation
        if (!file.name.endsWith('.csv')) {
            toast.error('Only CSV files are supported for now.');
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });

            const data = await res.json();

            if (!data.success) {
                throw new Error(data.error || 'Upload failed');
            }

            setUploadedTable(data.tableName);
            toast.success(`File uploaded! Table created: ${data.tableName}`);

        } catch (err) {
            console.error(err);
            toast.error('Failed to blend data. Check console.');
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Card className="w-full border-dashed border-2">
            <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                    <FileSpreadsheet className="w-5 h-5 text-green-600" />
                    Data Blender (Power Query)
                </CardTitle>
            </CardHeader>
            <CardContent>
                {!uploadedTable ? (
                    <div className="flex flex-col items-center justify-center p-6 space-y-4 text-center">
                        <div className="p-4 bg-muted rounded-full">
                            <Upload className="w-8 h-8 text-muted-foreground" />
                        </div>
                        <div className="space-y-1">
                            <p className="font-medium">Upload Excel/CSV to Blend</p>
                            <p className="text-xs text-muted-foreground">
                                Drag and drop or click to upload.
                                We will import it as a temporary SQL table.
                            </p>
                        </div>
                        <div className="relative">
                            <Button disabled={isUploading}>
                                {isUploading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                {isUploading ? 'Blending...' : 'Select File'}
                            </Button>
                            <input
                                type="file"
                                accept=".csv"
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                onChange={handleFileChange}
                                disabled={isUploading}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center p-6 space-y-4 bg-green-50/50 rounded-lg border border-green-100">
                        <div className="p-2 bg-green-100 rounded-full">
                            <Check className="w-6 h-6 text-green-600" />
                        </div>
                        <div className="text-center">
                            <p className="font-semibold text-green-900">Data Blended Successfully!</p>
                            <p className="text-sm text-green-700 mt-1">
                                Your file is now available as a SQL Table.
                            </p>
                        </div>
                        <div className="bg-white p-2 px-4 rounded border font-mono text-sm">
                            {uploadedTable}
                        </div>
                        <div className="text-xs text-muted-foreground max-w-xs text-center">
                            Try asking:
                            <span className="italic block mt-1">"Analyze revenue from {uploadedTable}"</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => setUploadedTable(null)}>
                            Upload Another
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
