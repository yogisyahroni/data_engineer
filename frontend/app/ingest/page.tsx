'use client';

import { useState } from 'react';
import { SidebarLayout } from '@/components/sidebar-layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Upload, FileText, CheckCircle2, Loader2, AlertCircle, ArrowRight, Table as TableIcon, Database, ShieldCheck, ChevronRight } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';

type IngestStep = 'upload' | 'preview' | 'ingesting' | 'complete';

export default function IngestPage() {
    const [step, setStep] = useState<IngestStep>('upload');
    const [file, setFile] = useState<File | null>(null);
    const [previewData, setPreviewData] = useState<{ headers: { name: string; type: string }[]; rows: any[] } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState<{ tableName: string; rowCount: number } | null>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (!selectedFile) return;

        setFile(selectedFile);
        setIsProcessing(true);

        const formData = new FormData();
        formData.append('file', selectedFile);

        try {
            const res = await fetch('/api/ingest/preview', {
                method: 'POST',
                body: formData,
            });
            const data = await res.json();
            if (data.error) throw new Error(data.error);

            setPreviewData(data);
            setStep('preview');
        } catch (error: any) {
            toast.error(error.message);
            setFile(null);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStartIngestion = async () => {
        if (!file) return;

        setStep('ingesting');
        setProgress(20);

        const formData = new FormData();
        formData.append('file', file);

        try {
            const timer = setInterval(() => setProgress(prev => Math.min(prev + 10, 90)), 500);

            const response = await fetch('/api/ingest', {
                method: 'POST',
                body: formData,
            });

            clearInterval(timer);
            const data = await response.json();
            setProgress(100);

            if (data.success) {
                setResult({ tableName: data.tableName, rowCount: data.rowCount });
                setStep('complete');
                toast.success('Data ingested successfully!');
            } else {
                throw new Error(data.error || 'Ingestion failed');
            }
        } catch (error: any) {
            toast.error(error.message);
            setStep('preview');
            setProgress(0);
        }
    };

    return (
        <SidebarLayout>
            <div className="flex flex-col h-full bg-background overflow-hidden font-sans">
                {/* Header */}
                <div className="border-b border-border bg-card px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">Data Ingestion Engine</h1>
                            <p className="text-muted-foreground text-sm mt-0.5">Project flat files into optimized SQL tables with AI validation.</p>
                        </div>
                        {/* Stepper UI */}
                        <div className="flex items-center gap-4 bg-muted/30 px-4 py-2 rounded-full border border-border/50">
                            <StepIndicator active={step === 'upload'} done={['preview', 'ingesting', 'complete'].includes(step)} label="Upload" />
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                            <StepIndicator active={step === 'preview'} done={['ingesting', 'complete'].includes(step)} label="Preview" />
                            <ChevronRight className="w-3 h-3 text-muted-foreground/30" />
                            <StepIndicator active={step === 'ingesting' || step === 'complete'} done={step === 'complete'} label="Ingest" />
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-auto p-8 max-w-6xl mx-auto w-full space-y-8 pb-20">

                    {step === 'upload' && (
                        <Card className="border-dashed border-2 border-primary/20 bg-primary/[0.01] hover:bg-primary/[0.02] transition-colors p-20 flex flex-col items-center justify-center text-center space-y-6 animate-in fade-in zoom-in-95 duration-500">
                            <div className="w-20 h-20 rounded-3xl bg-primary/5 flex items-center justify-center border border-primary/10 shadow-inner rotate-3 hover:rotate-0 transition-transform duration-500">
                                <Upload className="w-10 h-10 text-primary opacity-60" />
                            </div>
                            <div className="space-y-2">
                                <h3 className="text-xl font-bold tracking-tight">Supply your data source</h3>
                                <p className="text-muted-foreground text-sm max-w-sm mx-auto">Upload .xlsx or .csv files. Our engine will analyze the schema and suggest optimized data types.</p>
                            </div>
                            <input type="file" id="file-upload" className="hidden" accept=".csv,.xlsx" onChange={handleFileChange} disabled={isProcessing} />
                            <Button size="lg" className="rounded-xl px-8 shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95" onClick={() => document.getElementById('file-upload')?.click()} disabled={isProcessing}>
                                {isProcessing ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</> : "Select Source File"}
                            </Button>
                        </Card>
                    )}

                    {step === 'preview' && previewData && (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-secondary/10 rounded-lg"><TableIcon className="w-5 h-5 text-secondary" /></div>
                                    <div>
                                        <h3 className="font-bold">Schema Projection</h3>
                                        <p className="text-xs text-muted-foreground">Detected {previewData.headers.length} columns and suggested data types.</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="rounded-xl" onClick={() => setStep('upload')}>Back</Button>
                                    <Button className="rounded-xl shadow-lg shadow-primary/20" onClick={handleStartIngestion}>Confirm & Ingest</Button>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-card/50 border-border/50">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="p-2 bg-primary/10 rounded-lg"><FileText className="w-4 h-4 text-primary" /></div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Filename</p>
                                            <p className="text-sm font-semibold truncate max-w-[150px]">{file?.name}</p>
                                        </div>
                                    </CardContent>
                                </Card>
                                <Card className="bg-card/50 border-border/50">
                                    <CardContent className="p-4 flex items-center gap-4">
                                        <div className="p-2 bg-green-500/10 rounded-lg"><ShieldCheck className="w-4 h-4 text-green-500" /></div>
                                        <div>
                                            <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Health</p>
                                            <p className="text-sm font-semibold text-green-500 text-sm">Ready</p>
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card className="overflow-hidden border-border/50 shadow-xl bg-card/60 backdrop-blur-md">
                                <Table>
                                    <TableHeader className="bg-muted/50">
                                        <TableRow>
                                            {previewData.headers.map((h, i) => (
                                                <TableHead key={i} className="py-4">
                                                    <div className="flex flex-col gap-1">
                                                        <span className="text-foreground font-bold text-xs">{h.name}</span>
                                                        <Badge variant="outline" className="text-[8px] h-4 py-0 w-fit bg-secondary/10 text-secondary border-secondary/20 tracking-tighter">{h.type}</Badge>
                                                    </div>
                                                </TableHead>
                                            ))}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {previewData.rows.map((row, i) => (
                                            <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                                                {previewData.headers.map((h, j) => (
                                                    <TableCell key={j} className="text-xs font-mono opacity-80">{String(row[h.name])}</TableCell>
                                                ))}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                <div className="p-4 border-t border-border/50 bg-muted/20 text-center">
                                    <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">Showing first 5 rows of sample projection</p>
                                </div>
                            </Card>
                        </div>
                    )}

                    {step === 'ingesting' && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-8 animate-in fade-in duration-500">
                            <div className="relative">
                                <div className="w-24 h-24 rounded-full border-4 border-primary/10 flex items-center justify-center">
                                    <Database className="w-10 h-10 text-primary animate-pulse" />
                                </div>
                                <div className="absolute inset-0 w-24 h-24 rounded-full border-t-4 border-primary animate-spin" />
                            </div>
                            <div className="w-full max-w-md space-y-3">
                                <Progress value={progress} className="h-2" />
                                <div className="flex justify-between text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                                    <span>Projecting Data...</span>
                                    <span>{progress}%</span>
                                </div>
                            </div>
                            <p className="text-muted-foreground text-sm animate-pulse">AI is transforming your file into a queryable SQL table.</p>
                        </div>
                    )}

                    {step === 'complete' && result && (
                        <Card className="max-w-xl mx-auto border-green-500/20 bg-green-500/[0.02] shadow-2xl shadow-green-500/5 animate-in zoom-in-95 duration-500">
                            <CardHeader className="text-center pb-2">
                                <div className="mx-auto w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-500" />
                                </div>
                                <CardTitle className="text-2xl font-bold text-green-600">Successfully Ingested</CardTitle>
                                <CardDescription>Your data is ready for analysis and logical modeling.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4">
                                <div className="bg-background/80 rounded-2xl p-6 border border-border/50 space-y-4">
                                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Table Name</span>
                                        <Badge variant="outline" className="font-mono text-xs py-1 px-3">{result.tableName}</Badge>
                                    </div>
                                    <div className="flex items-center justify-between border-b border-border/50 pb-3">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Row Count</span>
                                        <span className="text-sm font-bold">{result.rowCount.toLocaleString()} rows</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground uppercase font-bold tracking-widest">Status</span>
                                        <span className="text-xs font-bold text-green-500 flex items-center gap-1">
                                            <ShieldCheck className="w-3 h-3" /> PERSISTED
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Button variant="outline" className="flex-1 rounded-xl" onClick={() => { setStep('upload'); setFile(null); setResult(null); }}>Start Over</Button>
                                    <Button className="flex-1 rounded-xl bg-green-600 hover:bg-green-700 shadow-lg shadow-green-500/20" onClick={() => window.location.href = '/'}>
                                        Open Query Editor
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </SidebarLayout>
    );
}

function StepIndicator({ active, done, label }: { active: boolean, done: boolean, label: string }) {
    return (
        <div className="flex items-center gap-2">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-300 ${done ? 'bg-green-500 text-white shadow-lg shadow-green-500/20' :
                    active ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20 scale-110' :
                        'bg-muted-foreground/20 text-muted-foreground'
                }`}>
                {done ? <CheckCircle2 className="w-3 h-3" /> : active ? <div className="w-1.5 h-1.5 rounded-full bg-white" /> : null}
            </div>
            <span className={`text-[10px] uppercase tracking-widest font-bold transition-all duration-300 ${active ? 'text-foreground' : 'text-muted-foreground/40'
                }`}>{label}</span>
        </div>
    );
}
