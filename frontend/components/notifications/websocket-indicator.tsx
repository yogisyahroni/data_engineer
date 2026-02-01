'use client';

import * as React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useWebSocket } from '@/hooks/use-websocket';
import { cn } from '@/lib/utils';

interface WebSocketIndicatorProps {
    className?: string;
    showLabel?: boolean;
}

export function WebSocketIndicator({ className, showLabel = false }: WebSocketIndicatorProps) {
    const { connected, connecting, error } = useWebSocket();

    const getStatus = () => {
        if (connected) return { label: 'Connected', color: 'bg-green-500', icon: Wifi };
        if (connecting) return { label: 'Connecting...', color: 'bg-yellow-500', icon: Wifi };
        if (error) return { label: 'Error', color: 'bg-red-500', icon: WifiOff };
        return { label: 'Disconnected', color: 'bg-gray-500', icon: WifiOff };
    };

    const status = getStatus();
    const Icon = status.icon;

    if (showLabel) {
        return (
            <Badge
                variant="outline"
                className={cn('flex items-center gap-2', className)}
            >
                <div className={cn('w-2 h-2 rounded-full', status.color, connected && 'animate-pulse')} />
                <Icon className="w-3 h-3" />
                <span className="text-xs">{status.label}</span>
            </Badge>
        );
    }

    return (
        <TooltipProvider>
            <Tooltip>
                <TooltipTrigger asChild>
                    <div className={cn('relative inline-flex items-center', className)}>
                        <div
                            className={cn(
                                'w-2 h-2 rounded-full',
                                status.color,
                                connected && 'animate-pulse'
                            )}
                        />
                    </div>
                </TooltipTrigger>
                <TooltipContent>
                    <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{status.label}</span>
                    </div>
                    {error && (
                        <p className="text-xs text-muted-foreground mt-1">{error}</p>
                    )}
                </TooltipContent>
            </Tooltip>
        </TooltipProvider>
    );
}
