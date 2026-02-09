'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
    RefreshCw,
    Play,
    Pause,
    Settings2,
    Clock,
    CheckCircle2,
    XCircle,
    Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useInterval } from '@/hooks/use-interval';

/**
 * Auto-refresh configuration
 */
export interface AutoRefreshConfig {
    /** Whether auto-refresh is enabled */
    enabled: boolean;

    /** Refresh interval in seconds */
    interval: number;

    /** Pause refresh on user activity */
    pauseOnUserActivity?: boolean;

    /** Show countdown timer */
    showCountdown?: boolean;

    /** Show toast notifications on refresh */
    showNotifications?: boolean;
}

/**
 * Refresh interval presets (in seconds)
 */
export const REFRESH_INTERVALS = {
    '30s': 30,
    '1m': 60,
    '5m': 300,
    '15m': 900,
    '30m': 1800,
    '1h': 3600,
} as const;

/**
 * Props for AutoRefresh component
 */
export interface AutoRefreshProps {
    /** Dashboard or resource identifier */
    resourceId: string;

    /** Callback to execute on refresh */
    onRefresh: () => Promise<void> | void;

    /** Default refresh interval in seconds */
    defaultInterval?: number;

    /** Minimum allowed interval in seconds */
    minInterval?: number;

    /** Maximum allowed interval in seconds */
    maxInterval?: number;

    /** Initial enabled state */
    defaultEnabled?: boolean;

    /** Show as compact button */
    compact?: boolean;

    /** CSS class name */
    className?: string;

    /** Storage key for persisting settings */
    storageKey?: string;
}

/**
 * AutoRefresh Component
 * 
 * Provides auto-refresh functionality with controls
 */
export function AutoRefresh({
    resourceId,
    onRefresh,
    defaultInterval = 300, // 5 minutes
    minInterval = 30,
    maxInterval = 3600,
    defaultEnabled = false,
    compact = false,
    className,
    storageKey = 'dashboard-auto-refresh',
}: AutoRefreshProps) {
    // State
    const [config, setConfig] = useState<AutoRefreshConfig>(() => {
        // Try to load from localStorage
        if (typeof window !== 'undefined' && storageKey) {
            const stored = localStorage.getItem(`${storageKey}-${resourceId}`);
            if (stored) {
                try {
                    return JSON.parse(stored);
                } catch (e) {
                    console.error('Failed to parse stored refresh config:', e);
                }
            }
        }

        return {
            enabled: defaultEnabled,
            interval: defaultInterval,
            pauseOnUserActivity: false,
            showCountdown: true,
            showNotifications: false,
        };
    });

    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [nextRefresh, setNextRefresh] = useState<Date | null>(null);
    const [countdown, setCountdown] = useState<number>(0);
    const [refreshError, setRefreshError] = useState<string | null>(null);

    // Persist config to localStorage
    useEffect(() => {
        if (typeof window !== 'undefined' && storageKey) {
            localStorage.setItem(`${storageKey}-${resourceId}`, JSON.stringify(config));
        }
    }, [config, resourceId, storageKey]);

    /**
     * Execute refresh
     */
    const executeRefresh = useCallback(async () => {
        if (isRefreshing) return;

        setIsRefreshing(true);
        setRefreshError(null);

        try {
            await onRefresh();
            setLastRefresh(new Date());
            setNextRefresh(new Date(Date.now() + config.interval * 1000));

            if (config.showNotifications) {
                toast.success('Dashboard refreshed');
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Refresh failed';
            setRefreshError(errorMessage);
            toast.error(`Refresh failed: ${errorMessage}`);
        } finally {
            setIsRefreshing(false);
        }
    }, [isRefreshing, onRefresh, config.interval, config.showNotifications]);

    /**
     * Manual refresh
     */
    const handleManualRefresh = useCallback(() => {
        executeRefresh();
    }, [executeRefresh]);

    /**
     * Toggle auto-refresh
     */
    const toggleAutoRefresh = useCallback(() => {
        setConfig((prev) => {
            const newEnabled = !prev.enabled;

            if (newEnabled) {
                setNextRefresh(new Date(Date.now() + prev.interval * 1000));
                toast.success('Auto-refresh enabled');
            } else {
                setNextRefresh(null);
                toast.info('Auto-refresh disabled');
            }

            return { ...prev, enabled: newEnabled };
        });
    }, []);

    /**
     * Update interval
     */
    const updateInterval = useCallback((newInterval: number) => {
        if (newInterval < minInterval || newInterval > maxInterval) {
            toast.error(`Interval must be between ${minInterval}s and ${maxInterval}s`);
            return;
        }

        setConfig((prev) => ({ ...prev, interval: newInterval }));

        if (config.enabled) {
            setNextRefresh(new Date(Date.now() + newInterval * 1000));
        }
    }, [minInterval, maxInterval, config.enabled]);

    /**
     * Update config
     */
    const updateConfig = useCallback((updates: Partial<AutoRefreshConfig>) => {
        setConfig((prev) => ({ ...prev, ...updates }));
    }, []);

    // Set up auto-refresh interval
    useInterval(
        executeRefresh,
        config.enabled ? config.interval * 1000 : null
    );

    // Update countdown
    useEffect(() => {
        if (!config.enabled || !config.showCountdown || !nextRefresh) {
            setCountdown(0);
            return;
        }

        const interval = setInterval(() => {
            const remaining = Math.max(0, Math.floor((nextRefresh.getTime() - Date.now()) / 1000));
            setCountdown(remaining);
        }, 1000);

        return () => clearInterval(interval);
    }, [config.enabled, config.showCountdown, nextRefresh]);

    // Format countdown
    const countdownText = useMemo(() => {
        if (countdown === 0) return null;

        const minutes = Math.floor(countdown / 60);
        const seconds = countdown % 60;

        if (minutes > 0) {
            return `${minutes}m ${seconds}s`;
        }
        return `${seconds}s`;
    }, [countdown]);

    // Format last refresh
    const lastRefreshText = useMemo(() => {
        if (!lastRefresh) return 'Never';

        const now = new Date();
        const diff = Math.floor((now.getTime() - lastRefresh.getTime()) / 1000);

        if (diff < 60) return `${diff}s ago`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
        return `${Math.floor(diff / 3600)}h ago`;
    }, [lastRefresh]);

    if (compact) {
        return (
            <div className={cn('flex items-center gap-2', className)}>
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="h-8 w-8"
                    title="Refresh now"
                >
                    <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
                </Button>

                {config.enabled && countdownText && (
                    <Badge variant="outline" className="text-xs">
                        {countdownText}
                    </Badge>
                )}

                <RefreshSettingsPopover
                    config={config}
                    onUpdateConfig={updateConfig}
                    onUpdateInterval={updateInterval}
                    intervals={REFRESH_INTERVALS}
                />
            </div>
        );
    }

    return (
        <div className={cn('flex items-center gap-3 p-3 bg-muted/30 border rounded-lg', className)}>
            {/* Status indicator */}
            <div className="flex items-center gap-2">
                {refreshError ? (
                    <XCircle className="h-4 w-4 text-destructive" />
                ) : lastRefresh ? (
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                ) : (
                    <Clock className="h-4 w-4 text-muted-foreground" />
                )}

                <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-medium">
                        {isRefreshing ? 'Refreshing...' : 'Auto-Refresh'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                        Last: {lastRefreshText}
                    </span>
                </div>
            </div>

            <Separator orientation="vertical" className="h-10" />

            {/* Controls */}
            <div className="flex items-center gap-2">
                {/* Play/Pause */}
                <Button
                    variant={config.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={toggleAutoRefresh}
                    className="gap-2"
                >
                    {config.enabled ? (
                        <>
                            <Pause className="h-3.5 w-3.5" />
                            Pause
                        </>
                    ) : (
                        <>
                            <Play className="h-3.5 w-3.5" />
                            Start
                        </>
                    )}
                </Button>

                {/* Manual refresh */}
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleManualRefresh}
                    disabled={isRefreshing}
                    className="gap-2"
                >
                    <RefreshCw className={cn('h-3.5 w-3.5', isRefreshing && 'animate-spin')} />
                    Refresh
                </Button>

                {/* Interval selector */}
                <Select
                    value={String(config.interval)}
                    onValueChange={(value) => updateInterval(Number(value))}
                >
                    <SelectTrigger className="w-24 h-8">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        {Object.entries(REFRESH_INTERVALS).map(([label, value]) => (
                            <SelectItem key={value} value={String(value)}>
                                {label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>

                {/* Settings */}
                <RefreshSettingsPopover
                    config={config}
                    onUpdateConfig={updateConfig}
                    onUpdateInterval={updateInterval}
                    intervals={REFRESH_INTERVALS}
                />
            </div>

            {/* Countdown */}
            {config.enabled && config.showCountdown && countdownText && (
                <>
                    <Separator orientation="vertical" className="h-10" />
                    <Badge variant="secondary" className="gap-1.5">
                        <Clock className="h-3 w-3" />
                        Next: {countdownText}
                    </Badge>
                </>
            )}
        </div>
    );
}

/**
 * Settings popover for auto-refresh
 */
function RefreshSettingsPopover({
    config,
    onUpdateConfig,
    onUpdateInterval,
    intervals,
}: {
    config: AutoRefreshConfig;
    onUpdateConfig: (updates: Partial<AutoRefreshConfig>) => void;
    onUpdateInterval: (interval: number) => void;
    intervals: Record<string, number>;
}) {
    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <Settings2 className="h-4 w-4" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Auto-Refresh Settings</h4>
                        <p className="text-sm text-muted-foreground">
                            Configure refresh behavior
                        </p>
                    </div>

                    <div className="grid gap-3">
                        {/* Refresh interval */}
                        <div className="grid gap-2">
                            <Label htmlFor="refresh-interval">Refresh Interval</Label>
                            <Select
                                value={String(config.interval)}
                                onValueChange={(value) => onUpdateInterval(Number(value))}
                            >
                                <SelectTrigger id="refresh-interval">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(intervals).map(([label, value]) => (
                                        <SelectItem key={value} value={String(value)}>
                                            {label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <Separator />

                        {/* Show countdown */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-countdown" className="cursor-pointer">
                                Show Countdown
                            </Label>
                            <Switch
                                id="show-countdown"
                                checked={config.showCountdown}
                                onCheckedChange={(checked) =>
                                    onUpdateConfig({ showCountdown: checked })
                                }
                            />
                        </div>

                        {/* Show notifications */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="show-notifications" className="cursor-pointer">
                                Show Notifications
                            </Label>
                            <Switch
                                id="show-notifications"
                                checked={config.showNotifications}
                                onCheckedChange={(checked) =>
                                    onUpdateConfig({ showNotifications: checked })
                                }
                            />
                        </div>

                        {/* Pause on activity */}
                        <div className="flex items-center justify-between">
                            <Label htmlFor="pause-on-activity" className="cursor-pointer flex flex-col gap-1">
                                <span>Pause on Activity</span>
                                <span className="text-xs font-normal text-muted-foreground">
                                    Pause when user is interacting
                                </span>
                            </Label>
                            <Switch
                                id="pause-on-activity"
                                checked={config.pauseOnUserActivity}
                                onCheckedChange={(checked) =>
                                    onUpdateConfig({ pauseOnUserActivity: checked })
                                }
                            />
                        </div>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

/**
 * Hook to manage auto-refresh state
 */
export function useAutoRefresh(
    onRefresh: () => Promise<void> | void,
    options?: {
        defaultInterval?: number;
        defaultEnabled?: boolean;
    }
) {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
    const [error, setError] = useState<Error | null>(null);

    const refresh = useCallback(async () => {
        setIsRefreshing(true);
        setError(null);

        try {
            await onRefresh();
            setLastRefresh(new Date());
        } catch (err) {
            setError(err instanceof Error ? err : new Error('Refresh failed'));
            throw err;
        } finally {
            setIsRefreshing(false);
        }
    }, [onRefresh]);

    return {
        isRefreshing,
        lastRefresh,
        error,
        refresh,
    };
}
