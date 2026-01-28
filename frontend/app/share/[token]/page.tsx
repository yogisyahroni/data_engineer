'use client';

import { useState, useEffect } from 'react';
import { notFound } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function PublicSharePage({ params }: { params: { token: string } }) {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    const [isLocked, setIsLocked] = useState(false);

    const fetchData = async (pwd?: string) => {
        setLoading(true);
        setError('');
        try {
            const headers: any = {};
            if (pwd) headers['x-share-password'] = pwd;

            const res = await fetch(`/api/share/${params.token}`, { headers });

            if (res.status === 403) {
                setIsLocked(true);
                setLoading(false);
                return;
            }

            if (!res.ok) {
                const json = await res.json();
                setError(json.error || 'Failed to load');
                setLoading(false);
                return;
            }

            const json = await res.json();
            setData(json);
            setIsLocked(false);
        } catch (e) {
            setError('Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [params.token]);

    const handleUnlock = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData(password);
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (isLocked) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <Card className="w-full max-w-sm">
                    <CardHeader className="text-center">
                        <div className="mx-auto bg-gray-100 p-3 rounded-full mb-2 w-fit">
                            <Lock className="h-6 w-6 text-gray-600" />
                        </div>
                        <CardTitle>Protected Content</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleUnlock} className="space-y-4">
                            <Input
                                type="password"
                                placeholder="Enter Password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                            <Button type="submit" className="w-full">Unlock</Button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-gray-50">
                <div className="text-center text-red-500">
                    <h1 className="text-2xl font-bold">Error</h1>
                    <p>{error}</p>
                </div>
            </div>
        );
    }

    // Render Resource (Minimalist)
    // Identify if it's dashboard or query based on API response
    // For MVP, simplistic JSON dump or basic layout
    return (
        <div className="min-h-screen bg-white">
            <div className="border-b px-6 py-4 flex items-center justify-between">
                <h1 className="text-xl font-bold">{data.data.name}</h1>
                <span className="text-xs text-muted-foreground">Powered by InsightEngine</span>
            </div>
            <div className="p-6">
                {/* 
                   In a real integration, we'd reuse <DashboardGrid> or <QueryResultTable> 
                   components here, but passing "readOnly" props.
                */}
                <div className="grid gap-4">
                    {data.type === 'DASHBOARD' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {(data.data.cards || []).map((card: any) => (
                                <Card key={card.id} className="h-64 flex items-center justify-center text-muted-foreground border-dashed">
                                    {card.title || 'Chart Placeholder'}
                                </Card>
                            ))}
                            {(!data.data.cards || data.data.cards.length === 0) && (
                                <p>Empty Dashboard</p>
                            )}
                        </div>
                    )}

                    {data.type === 'QUERY' && (
                        <div className="bg-gray-100 p-4 rounded font-mono text-sm overflow-auto">
                            {data.data.sql}
                            {/* Render Table Result here */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
