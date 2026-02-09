'use client';

import React, { useMemo, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { DrillPath, DrillLevel, canDrillUp, canDrillDown, getBreadcrumbTrail } from '@/lib/drill-config';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
    Breadcrumb,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbList,
    BreadcrumbPage,
    BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import {
    ChevronLeft,
    ChevronRight,
    Home,
    RotateCcw,
    ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * Props for DrillNavigation component
 */
export interface DrillNavigationProps {
    /** Current drill path */
    drillPath: DrillPath;

    /** Callback when navigating back one level */
    onNavigateBack?: () => void;

    /** Callback when navigating forward one level */
    onNavigateForward?: () => void;

    /** Callback when navigating to specific level */
    onNavigateToLevel?: (levelIndex: number) => void;

    /** Callback when resetting to root */
    onReset?: () => void;

    /** Show level values in breadcrumb */
    showValues?: boolean;

    /** Show navigation buttons */
    showButtons?: boolean;

    /** Show reset button */
    showResetButton?: boolean;

    /** Compact mode (smaller UI) */
    compact?: boolean;

    /** CSS class name */
    className?: string;

    /** Sync with URL parameters */
    syncWithUrl?: boolean;

    /** URL parameter name for drill level */
    urlLevelParam?: string;

    /** URL parameter name for drill value */
    urlValueParam?: string;
}

/**
 * DrillNavigation Component
 * 
 * Provides navigation UI for drill-through functionality
 * Includes breadcrumb trail, back/forward buttons, and reset capability
 */
export function DrillNavigation({
    drillPath,
    onNavigateBack,
    onNavigateForward,
    onNavigateToLevel,
    onReset,
    showValues = true,
    showButtons = true,
    showResetButton = true,
    compact = false,
    className,
    syncWithUrl = false,
    urlLevelParam = 'drill_level',
    urlValueParam = 'drill_value',
}: DrillNavigationProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const breadcrumbTrail = useMemo(
        () => getBreadcrumbTrail(drillPath),
        [drillPath]
    );

    const canGoBack = useMemo(
        () => canDrillUp(drillPath),
        [drillPath]
    );

    const canGoForward = useMemo(
        () => canDrillDown(drillPath),
        [drillPath]
    );

    /**
     * Update URL parameters when drill level changes
     */
    const updateUrlParams = useCallback(
        (levelIndex: number, value?: any) => {
            if (!syncWithUrl) return;

            const params = new URLSearchParams(searchParams.toString());

            if (levelIndex === 0) {
                // Root level - remove drill params
                params.delete(urlLevelParam);
                params.delete(urlValueParam);
            } else {
                params.set(urlLevelParam, String(levelIndex));
                if (value !== undefined) {
                    params.set(urlValueParam, String(value));
                }
            }

            router.push(`?${params.toString()}`, { scroll: false });
        },
        [syncWithUrl, searchParams, router, urlLevelParam, urlValueParam]
    );

    /**
     * Handle navigate back
     */
    const handleNavigateBack = useCallback(() => {
        if (!canGoBack) {
            toast.error('Already at the root level');
            return;
        }

        const previousLevel = drillPath.currentLevel - 1;
        updateUrlParams(previousLevel, drillPath.levels[previousLevel]?.value);

        if (onNavigateBack) {
            onNavigateBack();
        } else {
            toast.info(`Navigated back to ${drillPath.levels[previousLevel]?.name || 'previous level'}`);
        }
    }, [canGoBack, drillPath, updateUrlParams, onNavigateBack]);

    /**
     * Handle navigate forward
     */
    const handleNavigateForward = useCallback(() => {
        if (!canGoForward) {
            toast.error('Already at the deepest level');
            return;
        }

        const nextLevel = drillPath.currentLevel + 1;
        updateUrlParams(nextLevel, drillPath.levels[nextLevel]?.value);

        if (onNavigateForward) {
            onNavigateForward();
        } else {
            toast.info(`Navigated forward to ${drillPath.levels[nextLevel]?.name || 'next level'}`);
        }
    }, [canGoForward, drillPath, updateUrlParams, onNavigateForward]);

    /**
     * Handle navigate to specific level
     */
    const handleNavigateToLevel = useCallback(
        (levelIndex: number) => {
            if (levelIndex < 0 || levelIndex >= drillPath.levels.length) {
                toast.error('Invalid drill level');
                return;
            }

            if (levelIndex === drillPath.currentLevel) {
                return; // Already at this level
            }

            updateUrlParams(levelIndex, drillPath.levels[levelIndex]?.value);

            if (onNavigateToLevel) {
                onNavigateToLevel(levelIndex);
            } else {
                toast.info(`Navigated to ${drillPath.levels[levelIndex]?.name}`);
            }
        },
        [drillPath, updateUrlParams, onNavigateToLevel]
    );

    /**
     * Handle reset to root
     */
    const handleReset = useCallback(() => {
        updateUrlParams(0);

        if (onReset) {
            onReset();
        } else {
            handleNavigateToLevel(0);
            toast.success('Reset to root level');
        }
    }, [updateUrlParams, onReset, handleNavigateToLevel]);

    // Don't render if only one level and at root
    if (drillPath.levels.length <= 1 && drillPath.currentLevel === 0) {
        return null;
    }

    return (
        <div
            className={cn(
                'flex items-center gap-3 p-3 bg-muted/30 border-b border-border',
                compact && 'p-2 gap-2',
                className
            )}
        >
            {/* Navigation Buttons */}
            {showButtons && (
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size={compact ? 'sm' : 'default'}
                        disabled={!canGoBack}
                        onClick={handleNavigateBack}
                        className={cn('gap-1.5', compact && 'h-7 px-2')}
                        title="Go back one level"
                    >
                        <ChevronLeft className={cn('h-4 w-4', compact && 'h-3 w-3')} />
                        {!compact && 'Back'}
                    </Button>

                    <Button
                        variant="ghost"
                        size={compact ? 'sm' : 'default'}
                        disabled={!canGoForward}
                        onClick={handleNavigateForward}
                        className={cn('gap-1.5', compact && 'h-7 px-2')}
                        title="Go forward one level"
                    >
                        {!compact && 'Forward'}
                        <ChevronRight className={cn('h-4 w-4', compact && 'h-3 w-3')} />
                    </Button>

                    {showResetButton && drillPath.currentLevel > 0 && (
                        <>
                            <div className="w-px h-4 bg-border mx-1" />
                            <Button
                                variant="ghost"
                                size={compact ? 'sm' : 'default'}
                                onClick={handleReset}
                                className={cn('gap-1.5', compact && 'h-7 px-2')}
                                title="Reset to root"
                            >
                                {compact ? (
                                    <RotateCcw className="h-3 w-3" />
                                ) : (
                                    <>
                                        <Home className="h-4 w-4" />
                                        Reset
                                    </>
                                )}
                            </Button>
                        </>
                    )}
                </div>
            )}

            {/* Breadcrumb Trail */}
            <Breadcrumb className="flex-1">
                <BreadcrumbList>
                    {breadcrumbTrail.map((level, index) => {
                        const isLast = index === breadcrumbTrail.length - 1;
                        const isCurrent = index === drillPath.currentLevel;

                        return (
                            <React.Fragment key={level.id}>
                                <BreadcrumbItem>
                                    {isLast ? (
                                        <BreadcrumbPage
                                            className={cn(
                                                'flex items-center gap-2',
                                                compact && 'text-xs'
                                            )}
                                        >
                                            <span className="font-medium">{level.name}</span>
                                            {showValues && level.value && (
                                                <Badge
                                                    variant="secondary"
                                                    className={cn(
                                                        'font-normal',
                                                        compact && 'text-xs px-1.5 py-0'
                                                    )}
                                                >
                                                    {String(level.value)}
                                                </Badge>
                                            )}
                                            {isCurrent && (
                                                <Badge
                                                    variant="default"
                                                    className={cn(
                                                        'ml-1',
                                                        compact && 'text-xs px-1.5 py-0'
                                                    )}
                                                >
                                                    Current
                                                </Badge>
                                            )}
                                        </BreadcrumbPage>
                                    ) : (
                                        <BreadcrumbLink
                                            onClick={() => handleNavigateToLevel(index)}
                                            className={cn(
                                                'cursor-pointer hover:underline flex items-center gap-2',
                                                compact && 'text-xs'
                                            )}
                                        >
                                            {index === 0 && (
                                                <Home className={cn('h-3.5 w-3.5', compact && 'h-3 w-3')} />
                                            )}
                                            <span>{level.name}</span>
                                            {showValues && level.value && (
                                                <Badge
                                                    variant="outline"
                                                    className={cn(
                                                        'font-normal',
                                                        compact && 'text-xs px-1 py-0'
                                                    )}
                                                >
                                                    {String(level.value)}
                                                </Badge>
                                            )}
                                        </BreadcrumbLink>
                                    )}
                                </BreadcrumbItem>

                                {!isLast && (
                                    <BreadcrumbSeparator className={compact ? 'text-xs' : ''} />
                                )}
                            </React.Fragment>
                        );
                    })}
                </BreadcrumbList>
            </Breadcrumb>

            {/* Drill Path Info */}
            {!compact && drillPath.levels.length > 1 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>
                        Level {drillPath.currentLevel + 1} of {drillPath.levels.length}
                    </span>
                </div>
            )}
        </div>
    );
}

/**
 * Lightweight breadcrumb-only variant
 */
export function DrillBreadcrumb({
    drillPath,
    onNavigateToLevel,
    showValues = true,
    className,
}: Pick<
    DrillNavigationProps,
    'drillPath' | 'onNavigateToLevel' | 'showValues' | 'className'
>) {
    return (
        <DrillNavigation
            drillPath={drillPath}
            onNavigateToLevel={onNavigateToLevel}
            showValues={showValues}
            showButtons={false}
            showResetButton={false}
            compact={true}
            className={className}
        />
    );
}

/**
 * Hook to sync drill state with URL
 */
export function useDrillUrlSync(
    drillPath: DrillPath,
    options?: {
        levelParam?: string;
        valueParam?: string;
    }
) {
    const searchParams = useSearchParams();
    const router = useRouter();

    const levelParam = options?.levelParam || 'drill_level';
    const valueParam = options?.valueParam || 'drill_value';

    /**
     * Get drill state from URL
     */
    const getDrillStateFromUrl = useCallback(() => {
        const level = searchParams.get(levelParam);
        const value = searchParams.get(valueParam);

        if (level === null) return null;

        return {
            level: parseInt(level, 10),
            value: value || undefined,
        };
    }, [searchParams, levelParam, valueParam]);

    /**
     * Set drill state to URL
     */
    const setDrillStateToUrl = useCallback(
        (level: number, value?: any) => {
            const params = new URLSearchParams(searchParams.toString());

            if (level === 0) {
                params.delete(levelParam);
                params.delete(valueParam);
            } else {
                params.set(levelParam, String(level));
                if (value !== undefined) {
                    params.set(valueParam, String(value));
                } else {
                    params.delete(valueParam);
                }
            }

            router.push(`?${params.toString()}`, { scroll: false });
        },
        [searchParams, router, levelParam, valueParam]
    );

    return {
        getDrillStateFromUrl,
        setDrillStateToUrl,
    };
}
