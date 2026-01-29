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
    isMobileView?: boolean;
}

export function DashboardGrid({
    cards,
    queriesData = {},
    isEditing,
    onLayoutChange,
    onRemoveCard,
    onChartClick,
    onDrillThrough,
    isMobileView = false
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

    // Force mobile layout if isMobileView is true or width is small
    const isMobile = isMobileView || width < 768;

    // Convert our cards to RGL layout format
    const layouts = {
        lg: cards.map(c => ({
            i: c.id,
            x: isMobile ? 0 : c.position.x,
            y: isMobile ? c.position.y * 10 : c.position.y, // Multiply to ensure order if needed, or RGL handles it
            w: isMobile ? 12 : c.position.w, // Full width in mobile
            h: c.position.h,
            minW: isMobile ? 12 : 3,
            minH: 4
        }))
    };

    return (
        <div ref={containerRef} className={`w-full min-h-[500px] ${isMobile ? 'mobile-grid' : ''}`}>
            {/* @ts-ignore - Responsive types are flaky with isDraggable in some versions */}
            <Responsive
                className="layout"
                layouts={layouts}
                breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
                cols={{ lg: 12, md: 10, sm: 6, xs: 1, xxs: 1 }}
                rowHeight={30}
                width={width}
                isDraggable={isEditing && !isMobile}
                isResizable={isEditing && !isMobile}
                onLayoutChange={onLayoutChange}
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
                            {isEditing && !isMobile && (
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
        </div >
    );
}
