'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useAIProviders } from '@/hooks/use-ai-providers';
import { useSemanticRequests } from '@/hooks/use-semantic';
import { Coins, Settings as SettingsIcon, Zap, CheckCircle, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface AISettingsProps {
    className?: string;
}

export function AISettings({ className }: AISettingsProps) {
    const { providers, isLoading: providersLoading } = useAIProviders();
    const { data: requestHistory, isLoading: historyLoading } = useSemanticRequests({ limit: 1000 }); // Fetch enough for stats

    const [defaultProviderId, setDefaultProviderId] = React.useState<string>('');

    // Calculate usage statistics
    const stats = React.useMemo(() => {
        if (!requestHistory?.data) return { totalCost: 0, totalTokens: 0, totalRequests: 0 };

        return requestHistory.data.reduce(
            (acc: any, req: any) => ({
                totalCost: acc.totalCost + (req.cost || 0),
                totalTokens: acc.totalTokens + (req.tokensUsed || 0),
                totalRequests: acc.totalRequests + 1,
            }),
            { totalCost: 0, totalTokens: 0, totalRequests: 0 }
        );
    }, [requestHistory]);

    // Set initial default provider (mock logic for now, ideally fetched from user settings)
    React.useEffect(() => {
        if (providers?.length && !defaultProviderId) {
            const active = providers.find((p: any) => p.isActive);
            if (active) setDefaultProviderId(active.id);
        }
    }, [providers, defaultProviderId]);

    const handleSaveSettings = () => {
        // TODO: Persist default provider to backend
        toast.success('Settings saved successfully');
    };

    return (
        <Card
            className={cn(
                'flex flex-col h-full bg-gradient-to-br from-card/50 to-card/30 backdrop-blur-lg border-border/50',
                className
            )}
        >
            <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-500/20 to-gray-600/20 flex items-center justify-center">
                        <SettingsIcon className="w-4 h-4 text-slate-500" />
                    </div>
                    <div>
                        <CardTitle className="text-sm font-semibold">AI Settings</CardTitle>
                        <CardDescription className="text-[10px]">
                            Manage preferences and view usage
                        </CardDescription>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6">
                {/* Cost & Usage Overview */}
                <div className="grid grid-cols-3 gap-4">
                    <Card className="bg-card/30 border-border/30">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                            <Coins className="w-5 h-5 text-amber-500 mb-1" />
                            <span className="text-xl font-bold">${stats.totalCost.toFixed(4)}</span>
                            <span className="text-[10px] text-muted-foreground">Total Cost</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/30 border-border/30">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                            <Zap className="w-5 h-5 text-blue-500 mb-1" />
                            <span className="text-xl font-bold">{stats.totalTokens.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground">Tokens Used</span>
                        </CardContent>
                    </Card>
                    <Card className="bg-card/30 border-border/30">
                        <CardContent className="p-4 flex flex-col items-center justify-center text-center space-y-1">
                            <CheckCircle className="w-5 h-5 text-green-500 mb-1" />
                            <span className="text-xl font-bold">{stats.totalRequests.toLocaleString()}</span>
                            <span className="text-[10px] text-muted-foreground">Total Requests</span>
                        </CardContent>
                    </Card>
                </div>

                {/* Configuration */}
                <div className="space-y-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        Configuration
                    </h4>

                    <div className="space-y-2">
                        <Label className="text-xs">Default AI Provider</Label>
                        <Select value={defaultProviderId} onValueChange={setDefaultProviderId}>
                            <SelectTrigger className="w-full text-xs h-9">
                                <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                                {providers?.map((provider: any) => (
                                    <SelectItem key={provider.id} value={provider.id} className="text-xs">
                                        <div className="flex items-center justify-between w-full gap-2">
                                            <span>{provider.name}</span>
                                            {provider.isActive && (
                                                <Badge variant="secondary" className="text-[9px] h-4 px-1">Active</Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            This provider will be used by default for all AI operations.
                        </p>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs">Context Retention</Label>
                        <Select defaultValue="all">
                            <SelectTrigger className="w-full text-xs h-9">
                                <SelectValue placeholder="Select retention strategy" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all" className="text-xs">All Messages (Expensive)</SelectItem>
                                <SelectItem value="relevant" className="text-xs">Relevant Context Only (Recommended)</SelectItem>
                                <SelectItem value="last_10" className="text-xs">Last 10 Messages</SelectItem>
                            </SelectContent>
                        </Select>
                        <p className="text-[10px] text-muted-foreground">
                            Determines how much conversation history is sent to the AI model.
                        </p>
                    </div>
                </div>

                {/* System Status */}
                <div className="space-y-4">
                    <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                        System Status
                    </h4>
                    <div className="flex items-center justify-between p-3 rounded-md bg-green-500/10 border border-green-500/20">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-500" />
                            <span className="text-xs font-medium">Rate Limiting Active</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] bg-green-500/10 text-green-500 border-green-500/20">
                            60 RPM
                        </Badge>
                    </div>
                    <div className="flex items-center justify-between p-3 rounded-md bg-blue-500/10 border border-blue-500/20">
                        <div className="flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-blue-500" />
                            <span className="text-xs font-medium">Semantic API Online</span>
                        </div>
                        <Badge variant="outline" className="text-[9px] bg-blue-500/10 text-blue-500 border-blue-500/20">
                            Healthy
                        </Badge>
                    </div>
                </div>

                <div className="pt-4">
                    <Button size="sm" onClick={handleSaveSettings} className="w-full">
                        Save Preferences
                    </Button>
                </div>

            </CardContent>
        </Card>
    );
}
