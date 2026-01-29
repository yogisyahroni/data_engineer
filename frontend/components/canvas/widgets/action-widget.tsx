'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Zap, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface ActionWidgetProps {
    widget: any;
    readOnly?: boolean;
    onUpdate: (updates: any) => void;
}

export function ActionWidget({ widget, readOnly, onUpdate }: ActionWidgetProps) {
    const [isLoading, setIsLoading] = useState(false);

    const config = widget.config || {
        label: 'Run Action',
        method: 'POST',
        url: '',
        headers: '{}',
        body: '{}',
        successMessage: 'Action triggered successfully'
    };

    const handleAction = async () => {
        if (!config.url) {
            toast.error('Trigger URL is not configured');
            return;
        }

        setIsLoading(true);
        try {
            const headers = JSON.parse(config.headers || '{}');
            const method = config.method || 'POST';
            const body = method !== 'GET' ? config.body : undefined;

            const res = await fetch(config.url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    ...headers
                },
                body: body ? body : undefined
            });

            if (!res.ok) {
                throw new Error(`Failed: ${res.status} ${res.statusText}`);
            }

            toast.success(config.successMessage || 'Action completed');
        } catch (error) {
            console.error(error);
            toast.error(error instanceof Error ? error.message : 'Action failed');
        } finally {
            setIsLoading(false);
        }
    };

    if (readOnly) {
        return (
            <div className="w-full h-full flex items-center justify-center p-2">
                <Button
                    variant="default" // Use primary color for actions
                    className="w-full h-full text-lg font-semibold shadow-md active:scale-95 transition-transform"
                    onClick={handleAction}
                    disabled={isLoading}
                >
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Zap className="mr-2 h-5 w-5 fill-current" />}
                    {config.label || 'Trigger'}
                </Button>
            </div>
        );
    }

    // Editor Mode
    return (
        <Card className="w-full h-full p-4 flex flex-col items-center justify-center bg-muted/10 relative group">
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <Popover>
                    <PopoverTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6">
                            <Settings2 className="w-4 h-4" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-80 space-y-3 p-4">
                        <h4 className="font-medium leading-none mb-2">Configure Action</h4>

                        <div className="grid gap-2">
                            <Label>Button Label</Label>
                            <Input
                                value={config.label}
                                onChange={(e) => onUpdate({ config: { ...config, label: e.target.value } })}
                            />
                        </div>

                        <div className="grid gap-2">
                            <Label>URL</Label>
                            <Input
                                placeholder="https://api.example.com/trigger"
                                value={config.url}
                                onChange={(e) => onUpdate({ config: { ...config, url: e.target.value } })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                            <div className="grid gap-2">
                                <Label>Method</Label>
                                <Select
                                    value={config.method}
                                    onValueChange={(v) => onUpdate({ config: { ...config, method: v } })}
                                >
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="POST">POST</SelectItem>
                                        <SelectItem value="GET">GET</SelectItem>
                                        <SelectItem value="PUT">PUT</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label>Success Message</Label>
                            <Input
                                value={config.successMessage}
                                onChange={(e) => onUpdate({ config: { ...config, successMessage: e.target.value } })}
                            />
                        </div>
                    </PopoverContent>
                </Popover>
            </div>

            <Button
                variant="outline"
                className="w-full h-12 dashed border-2 border-muted-foreground/20"
                disabled
            >
                <Zap className="mr-2 h-4 w-4" />
                {config.label || 'Configure Action'}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
                Click settings icon to configure
            </p>
        </Card>
    );
}
