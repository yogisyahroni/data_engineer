
'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, Menu, Layout, Link as LinkIcon, FileText } from 'lucide-react';
import { AppDashboardView } from '@/components/apps/app-dashboard-view';

interface PublicApp {
    id: string;
    name: string;
    description?: string;
    logoUrl?: string;
    themeConfig?: any;
    pages: PublicPage[];
}

interface PublicPage {
    id: string;
    title: string;
    slug: string;
    type: 'DASHBOARD' | 'URL' | 'MARKDOWN';
    icon?: string;
    externalUrl?: string;
    dashboardId?: string;
}

export default function PublicAppPage() {
    const params = useParams();
    const slug = params.slug as string;
    const [app, setApp] = useState<PublicApp | null>(null);
    const [loading, setLoading] = useState(true);
    const [activePageSlug, setActivePageSlug] = useState<string>('');
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (slug) fetchApp();
    }, [slug]);

    const fetchApp = async () => {
        try {
            const res = await fetch(`/api/apps/public/${slug}`);
            if (!res.ok) {
                if (res.status === 401) {
                    // Redirect to login or show login message
                    window.location.href = `/api/auth/signin?callbackUrl=${window.location.href}`;
                    return;
                }
                throw new Error('App not found');
            }
            const data = await res.json();
            setApp(data);
            if (data.pages.length > 0) {
                setActivePageSlug(data.pages[0].slug);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const activePage = app?.pages.find(p => p.slug === activePageSlug);

    if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="animate-spin" /></div>;
    if (!app) return <div className="h-screen flex items-center justify-center text-muted-foreground">App not found or access denied.</div>;

    // Theme overrides
    const themeStyle = app.themeConfig ? {
        '--primary': app.themeConfig.primaryColor,
        // Add more theme vars here if needed
    } as React.CSSProperties : {};

    return (
        <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900" style={themeStyle}>
            {/* Sidebar */}
            <aside
                className={cn(
                    "fixed inset-y-0 left-0 z-50 w-64 bg-background border-r transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0",
                    !sidebarOpen && "-translate-x-full lg:hidden"
                )}
            >
                <div className="flex flex-col h-full">
                    {/* App Header */}
                    <div className="h-16 flex items-center px-6 border-b">
                        {app.logoUrl ? (
                            <img src={app.logoUrl} alt={app.name} className="h-8 w-auto max-w-[150px] object-contain" />
                        ) : (
                            <span className="font-bold text-lg">{app.name}</span>
                        )}
                    </div>

                    {/* Navigation */}
                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        {app.pages.map(page => (
                            <button
                                key={page.id}
                                onClick={() => {
                                    setActivePageSlug(page.slug);
                                    if (window.innerWidth < 1024) setSidebarOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    activePageSlug === page.slug
                                        ? "bg-primary/10 text-primary"
                                        : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
                                )}
                            >
                                {page.type === 'DASHBOARD' && <Layout className="h-4 w-4" />}
                                {page.type === 'URL' && <LinkIcon className="h-4 w-4" />}
                                {page.type === 'MARKDOWN' && <FileText className="h-4 w-4" />}
                                {page.title}
                            </button>
                        ))}
                    </div>

                    {/* Powered By */}
                    <div className="border-t p-4">
                        <div className="text-xs text-center text-muted-foreground">
                            Powered by <strong>InsightEngine</strong>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                {/* Mobile Header */}
                <header className="lg:hidden h-16 flex items-center px-4 border-b bg-background">
                    <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)}>
                        <Menu className="h-5 w-5" />
                    </Button>
                    <span className="font-bold ml-4">{app.name}</span>
                </header>

                <main className="flex-1 overflow-hidden relative">
                    {activePage ? (
                        <div className="h-full w-full">
                            {/* Page Content Renderer */}
                            {activePage.type === 'URL' && activePage.externalUrl ? (
                                <div className="w-full h-full p-4 lg:p-8">
                                    <iframe
                                        src={activePage.externalUrl}
                                        className="w-full h-full border-0 rounded-lg shadow-sm bg-background"
                                        title={activePage.title}
                                    />
                                </div>
                            ) : activePage.type === 'DASHBOARD' && activePage.dashboardId ? (
                                <AppDashboardView dashboardId={activePage.dashboardId} />
                            ) : (
                                <div className="prose dark:prose-invert max-w-none p-4 lg:p-8">
                                    <h1>{activePage.title}</h1>
                                    {activePage.type === 'MARKDOWN' ? (
                                        <p>Markdown content support coming soon.</p>
                                    ) : (
                                        <p>Content configuration missing.</p>
                                    )}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                            Select a page from the menu.
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
