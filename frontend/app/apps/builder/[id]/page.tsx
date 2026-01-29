
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Loader2, Save, Eye } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import Link from 'next/link';

// Components (will be created next)
import AppSettingsTab from './settings-tab';
import AppPagesTab from './pages-tab';

export interface DataApp {
    id: string;
    name: string;
    slug: string;
    description?: string;
    isPublished: boolean;
    logoUrl?: string;
    themeConfig?: any;
    updatedAt: string;
    pages?: AppPage[];
}

export interface AppPage {
    id: string;
    title: string;
    slug: string;
    type: 'DASHBOARD' | 'URL' | 'MARKDOWN';
    order: number;
    isHidden: boolean;
    dashboardId?: string;
    dashboard?: { name: string };
    externalUrl?: string;
}

export default function AppBuilderPage() {
    const params = useParams();
    const router = useRouter();
    const { toast } = useToast();
    const id = params.id as string;

    const [app, setApp] = useState<DataApp | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchApp = async () => {
        try {
            const res = await fetch(`/api/apps/${id}`);
            if (!res.ok) throw new Error('Failed to fetch app');
            const data = await res.json();
            setApp(data);
        } catch (error) {
            toast({
                title: 'Error',
                description: 'Failed to load app details',
                variant: 'destructive',
            });
            router.push('/apps');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id) fetchApp();
    }, [id]);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!app) return <div>App not found</div>;

    return (
        <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <header className="border-b bg-background px-6 py-4 flex justify-between items-center sticky top-0 z-10">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" asChild>
                        <Link href="/apps">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold">{app.name}</h1>
                        <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <span className="font-mono bg-slate-100 dark:bg-slate-800 px-1 rounded">/apps/{app.slug}</span>
                            {app.isPublished ? (
                                <span className="text-green-600 font-medium px-1.5 py-0.5 bg-green-100 rounded-full text-[10px]">Published</span>
                            ) : (
                                <span className="text-slate-500 font-medium px-1.5 py-0.5 bg-slate-100 rounded-full text-[10px]">Draft</span>
                            )}
                        </div>
                    </div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                        <Link href={`/apps/public/${app.slug}`} target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview App
                        </Link>
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-auto p-6">
                <div className="max-w-5xl mx-auto space-y-6">
                    <Tabs defaultValue="pages" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                            <TabsTrigger value="pages">Pages & Navigation</TabsTrigger>
                            <TabsTrigger value="settings">Settings & Branding</TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            <TabsContent value="pages" className="mt-0">
                                <AppPagesTab app={app} onUpdate={fetchApp} />
                            </TabsContent>

                            <TabsContent value="settings" className="mt-0">
                                <AppSettingsTab app={app} onUpdate={fetchApp} />
                            </TabsContent>
                        </div>
                    </Tabs>
                </div>
            </main>
        </div>
    );
}
