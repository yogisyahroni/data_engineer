"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { VisualQueryBuilder } from "@/components/visual-query/VisualQueryBuilder";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { connectionsApi } from "@/lib/api/connections";
import { Connection } from "@/types";
import { Loader2, Database } from "lucide-react";
import { toast } from "sonner";

function NewVisualQueryPageContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const connectionIdParam = searchParams.get("connectionId");

    const [connections, setConnections] = React.useState<Connection[]>([]);
    const [loading, setLoading] = React.useState(false);
    const [selectedConnectionId, setSelectedConnectionId] = React.useState<string | null>(connectionIdParam);

    React.useEffect(() => {
        if (!selectedConnectionId) return;
        const fetchConnections = async () => {
            setLoading(true);
            try {
                const data = await connectionsApi.list();
                setConnections(data);
            } catch (error) {
                toast.error("Failed to load connections");
                console.error(error);
            } finally {
                setLoading(false);
            }
        };

        fetchConnections();
    }, [selectedConnectionId]);

    const handleSelectConnection = (id: string) => {
        setSelectedConnectionId(id);
        router.replace(`/visual-queries/new?connectionId=${id}`);
    };

    if (selectedConnectionId) {
        return (
            <div className="container mx-auto py-6 space-y-6">
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold tracking-tight">New Visual Query</h1>
                    <Button variant="outline" onClick={() => {
                        setSelectedConnectionId(null);
                        router.replace('/visual-queries/new');
                    }}>
                        Change Connection
                    </Button>
                </div>
                <VisualQueryBuilder connectionId={selectedConnectionId} />
            </div>
        );
    }

    return (
        <div className="container mx-auto py-10 max-w-4xl">
            <Card>
                <CardHeader>
                    <CardTitle>Select Data Source</CardTitle>
                    <CardDescription>
                        Choose a database connection to start building your query.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : connections.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            No connections found. Please create a connection first.
                        </div>
                    ) : (
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {connections.map((conn) => (
                                <Card
                                    key={conn.id}
                                    className="cursor-pointer hover:bg-slate-50 transition-colors border-2 hover:border-primary/50"
                                    onClick={() => handleSelectConnection(conn.id)}
                                >
                                    <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <Database className="h-5 w-5 text-primary" />
                                        </div>
                                        <div>
                                            <CardTitle className="text-base">{conn.name}</CardTitle>
                                            <CardDescription className="capitalize">{conn.type}</CardDescription>
                                        </div>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default function NewVisualQueryPage() {
    return (
        <Suspense fallback={<div className="flex items-center justify-center min-h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <NewVisualQueryPageContent />
        </Suspense>
    );
}
