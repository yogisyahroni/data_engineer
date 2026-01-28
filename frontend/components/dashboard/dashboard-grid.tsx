'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Responsive } from 'react-grid-layout';
import { DashboardCard } from './dashboard-card';
import { DashboardCard as DashboardCardType, VisualizationConfig } from '@/lib/types';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

interface DashboardGridProps {
    cards: DashboardCardType[];
    queriesData?: Record<string, any>; // Map queryId -> result data
    isEditing: boolean;
    onLayoutChange: (layout: any) => void;
    onRemoveCard: (cardId: string) => void;
    onChartClick?: (params: any, cardId: string) => void;
    onDrillThrough?: (cardId: string) => void;
}

export function DashboardGrid({
    cards,
    queriesData = {},
    isEditing,
    onLayoutChange,
    onRemoveCard,
    onChartClick,
    onDrillThrough
}: DashboardGridProps) {
    // We need to mount only after client-side hydration for RGL
    const [mounted, setMounted] = useState(false);
    const [width, setWidth] = useState(1200);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        setMounted(true);

        // Initial width
        if (containerRef.current) {
            setWidth(containerRef.current.offsetWidth);
        }

        // Resize Observer
        const observer = new ResizeObserver((entries) => {
            for (const entry of entries) {
                setWidth(entry.contentRect.width);
            }
        });

        if (containerRef.current) {
            observer.observe(containerRef.current);
        }

        return () => {
            observer.disconnect();
        };
    }, []);

    if (!mounted) return <div ref={containerRef} className="w-full h-full" />;

    // Convert our cards to RGL layout format
    const layouts = {
        lg: cards.map(c => ({
            i: c.id,
            x: c.position.x,
            y: c.position.y,
            w: c.position.w,
            h: c.position.h,
            minW: 3,
            minH: 4
        }))
    };
    return (
        <div ref={containerRef} className="w-full min-h-[500px]">
            {/* @ts-ignore - Responsive types are flaky with isDraggable in some versions */}
            <Responsive
            // ... props ...
            >
                {cards.map((card) => {
                    const queryId = card.queryId;
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    const queryResult = queryId && queriesData[queryId] ? queriesData[queryId].data : undefined;
                    const isLoading = queryId && queriesData[queryId] ? queriesData[queryId].isLoading : false;
                    const queryName = queryId && queriesData[queryId] ? queriesData[queryId].name : undefined;

                    // If data is ready, we might need configuration from query OR dashboard override
                    const config = card.visualizationConfig || (queryId && queriesData[queryId] ? queriesData[queryId].config : undefined);

                    return (
                        <div key={card.id} className="relative group bg-card border rounded-lg shadow-sm overflow-hidden">
                            {/* Edit Overlay for Dragging */}
                            {isEditing && (
                                <div className="card-drag-handle absolute inset-0 z-50 cursor-move bg-white/5 border-2 border-dashed border-primary hover:bg-primary/5 transition-colors rounded-lg flex items-center justify-center opacity-0 hover:opacity-100">
                                    <span className="text-primary font-medium bg-background px-3 py-1 rounded shadow-sm">Drag to Move</span>
                                </div>
                            )}

                            <DashboardCard
                                card={{
                                    ...card,
                                    title: card.title || queryName || 'Untitled Card',
                                    type: card.type || (card.queryId ? 'visualization' : 'text'),
                                    data: queryResult, // Inject data from parent state
                                    visualizationConfig: config,
                                    // query object might be needed if deep nested config
                                }}
                                isEditing={isEditing}
                                onRemove={isEditing ? onRemoveCard : undefined}
                                className={isEditing ? 'pointer-events-none' : ''}
                                onChartClick={onChartClick}
                                onDrillThrough={onDrillThrough}
                            />
                        </div>
                    );
                })}
            </Responsive>
        </div>
    );
}
