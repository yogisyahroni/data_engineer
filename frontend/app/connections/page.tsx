'use client';

import { useState } from 'react';
import { useConnections } from '@/hooks/use-connections';
import { AddConnectionDialog } from '@/components/add-connection-dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Database,
    RefreshCcw,
    MoreVertical,
    Trash2,
    Settings,
    Zap,
    Check,
    X,
    Loader2,
    ArrowLeft,
    Server,
    Menu,
} from 'lucide-react';
import Link from 'next/link';
import { SidebarLayout } from '@/components/sidebar-layout';
import { useSidebar } from '@/contexts/sidebar-context';

export default function ConnectionsPage() {
    const { open: openSidebar } = useSidebar();
    // TODO: Get real userId from Auth
    const userId = 'user_123';
    const {
        connections,
        isLoading,
        isTestingConnection,
        error,
        refetch,
        testConnection,
        deleteConnection
    } = useConnections({ userId });

    const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({});
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [connectionToDelete, setConnectionToDelete] = useState<{ id: string; name: string } | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Handle test connection
    const handleTestConnection = async (id: string) => {
        setTestResults((prev) => ({ ...prev, [id]: { success: false, message: 'Testing...' } }));
        const result = await testConnection(id);
        setTestResults((prev) => ({ ...prev, [id]: result }));

        // Clear after 5 seconds
        setTimeout(() => {
            setTestResults((prev) => {
                const next = { ...prev };
                delete next[id];
                return next;
            });
        }, 5000);
    };

    // Handle delete connection
    const handleDeleteConnection = async () => {
        if (!connectionToDelete) return;

        setIsDeleting(true);
        await deleteConnection(connectionToDelete.id);
        setIsDeleting(false);
        setDeleteDialogOpen(false);
        setConnectionToDelete(null);
    };

    // Get database type icon/color
    const getDbTypeStyle = (type: string) => {
        const styles: Record<string, { bg: string; text: string }> = {
            postgres: { bg: 'bg-blue-500/10', text: 'text-blue-500' },
            mysql: { bg: 'bg-orange-500/10', text: 'text-orange-500' },
            sqlite: { bg: 'bg-green-500/10', text: 'text-green-500' },
            snowflake: { bg: 'bg-cyan-500/10', text: 'text-cyan-500' },
            bigquery: { bg: 'bg-yellow-500/10', text: 'text-yellow-500' },
        };
        return styles[type] || { bg: 'bg-muted', text: 'text-muted-foreground' };
    };

    return (
        <SidebarLayout>
            <div className="flex flex-col h-full bg-background overflow-hidden">
                {/* Header */}
                <div className="border-b border-border bg-card px-8 py-6">
                    <div className="flex items-center gap-4 mb-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="md:hidden"
                            onClick={() => openSidebar()}
                        >
                            <Menu className="w-5 h-5" />
                        </Button>
                        <Link href="/">
                            <Button variant="ghost" size="icon">
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        </Link>
                        <div className="flex-1">
                            <h1 className="text-2xl font-bold tracking-tight">Database Connections</h1>
                            <p className="text-muted-foreground text-sm mt-0.5">
                                Manage your database connections and settings
                            </p>
                        </div>
                        <AddConnectionDialog />
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto p-8">
                    {error && (
                        <div className="bg-destructive/10 text-destructive p-4 rounded-lg mb-6 flex items-center gap-2">
                            <X className="w-4 h-4" />
                            {error}
                        </div>
                    )}

                    {isLoading && connections.length === 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {[...Array(3)].map((_, i) => (
                                <Skeleton key={i} className="h-40 w-full rounded-lg" />
                            ))}
                        </div>
                    ) : connections.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 px-4">
                            <div className="w-20 h-20 rounded-full bg-muted flex items-center justify-center mb-6">
                                <Database className="w-10 h-10 text-muted-foreground" />
                            </div>
                            <h3 className="text-xl font-semibold text-foreground mb-2">No connections yet</h3>
                            <p className="text-muted-foreground text-center max-w-md mb-6">
                                Connect to a database to start querying your data with SQL or AI-powered prompts
                            </p>
                            <AddConnectionDialog />
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {connections.map((conn) => {
                                const dbStyle = getDbTypeStyle(conn.type);
                                const testResult = testResults[conn.id];

                                return (
                                    <Card key={conn.id} className="hover:shadow-lg transition-all group">
                                        <CardHeader className="flex flex-row items-start justify-between pb-3">
                                            <div className="flex items-center gap-3">
                                                <div className={`w-10 h-10 rounded-lg ${dbStyle.bg} flex items-center justify-center`}>
                                                    <Server className={`w-5 h-5 ${dbStyle.text}`} />
                                                </div>
                                                <div>
                                                    <CardTitle className="text-base font-medium">{conn.name}</CardTitle>
                                                    <p className="text-xs text-muted-foreground mt-0.5">
                                                        {conn.type.toUpperCase()}
                                                    </p>
                                                </div>
                                            </div>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleTestConnection(conn.id)}>
                                                        <Zap className="w-4 h-4 mr-2" />
                                                        Test Connection
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem>
                                                        <Settings className="w-4 h-4 mr-2" />
                                                        Edit Settings
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem
                                                        className="text-destructive"
                                                        onClick={() => {
                                                            setConnectionToDelete({ id: conn.id, name: conn.name });
                                                            setDeleteDialogOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" />
                                                        Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </CardHeader>
                                        <CardContent className="pt-0">
                                            <div className="space-y-3">
                                                <div className="text-sm text-muted-foreground">
                                                    <span className="font-mono text-xs">{conn.host || 'localhost'}:{conn.port || 5432}</span>
                                                    <span className="mx-2">•</span>
                                                    <span>{conn.database}</span>
                                                </div>

                                                <div className="flex items-center justify-between">
                                                    <Badge
                                                        variant={conn.isActive ? 'default' : 'secondary'}
                                                        className="text-xs"
                                                    >
                                                        {conn.isActive ? (
                                                            <>
                                                                <Check className="w-3 h-3 mr-1" />
                                                                Active
                                                            </>
                                                        ) : (
                                                            'Inactive'
                                                        )}
                                                    </Badge>

                                                    {testResult && (
                                                        <Badge
                                                            variant={testResult.success ? 'default' : 'destructive'}
                                                            className="text-xs"
                                                        >
                                                            {testResult.success ? (
                                                                <>
                                                                    <Check className="w-3 h-3 mr-1" />
                                                                    Connected
                                                                </>
                                                            ) : (
                                                                <>
                                                                    <X className="w-3 h-3 mr-1" />
                                                                    Failed
                                                                </>
                                                            )}
                                                        </Badge>
                                                    )}
                                                </div>

                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full gap-2"
                                                    onClick={() => handleTestConnection(conn.id)}
                                                    disabled={isTestingConnection}
                                                >
                                                    {isTestingConnection ? (
                                                        <>
                                                            <Loader2 className="w-3 h-3 animate-spin" />
                                                            Testing...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <Zap className="w-3 h-3" />
                                                            Test Connection
                                                        </>
                                                    )}
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Delete Confirmation Dialog */}
                <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Connection</AlertDialogTitle>
                            <AlertDialogDescription>
                                Are you sure you want to delete "{connectionToDelete?.name}"? This action cannot be undone.
                                All saved queries using this connection will be affected.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                                onClick={handleDeleteConnection}
                                disabled={isDeleting}
                                className="bg-destructive hover:bg-destructive/90"
                            >
                                {isDeleting ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete'
                                )}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </SidebarLayout>
    );
}
