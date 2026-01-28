'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Dashboard, DashboardCard, VisualizationConfig } from '@/lib/types';

interface UseDashboardsOptions {
    collectionId?: string;
    autoFetch?: boolean;
}

interface CreateDashboardInput {
    name: string;
    description?: string;
    collectionId?: string;
    tags?: string[];
}

interface AddCardInput {
    queryId: string;
    position: { x: number; y: number; w: number; h: number };
    visualizationConfig?: VisualizationConfig;
    title?: string;
    type?: 'visualization' | 'text';
}

export function useDashboards(options: UseDashboardsOptions = {}) {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [activeDashboard, setActiveDashboard] = useState<Dashboard | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Mock data for initial load
    const MOCK_DASHBOARDS: Dashboard[] = [
        {
            id: 'd1',
            name: 'Sales Overview',
            description: 'Key sales metrics and KPIs',
            collectionId: 'c1',
            userId: 'user1',
            isPublic: false,
            filters: [],
            tags: ['sales', 'priority'],
            createdAt: new Date(),
            updatedAt: new Date(),
            cards: []
        },
        {
            id: 'd2',
            name: 'System Health',
            description: 'Server and infrastructure monitoring',
            collectionId: 'c2',
            userId: 'user1',
            isPublic: true,
            filters: [],
            tags: ['ops', 'monitoring'],
            createdAt: new Date(),
            updatedAt: new Date(),
            cards: []
        }
    ];

    const fetchDashboards = useCallback(async () => {
        setIsLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            setDashboards((prev) => (prev.length > 0 ? prev : MOCK_DASHBOARDS));
            setError(null);
        } catch (err) {
            setError('Failed to fetch dashboards');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchDashboard = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 300));
            const dashboard = dashboards.find((d) => d.id === id) || MOCK_DASHBOARDS.find(d => d.id === id);
            if (dashboard) {
                setActiveDashboard(dashboard);
                setError(null);
            } else {
                setError('Dashboard not found');
            }
        } catch (err) {
            setError('Failed to fetch dashboard');
        } finally {
            setIsLoading(false);
        }
    }, [dashboards]);

    const createDashboard = useCallback(async (input: CreateDashboardInput) => {
        setIsLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            const newDashboard: Dashboard = {
                id: `d_${Date.now()}`,
                ...input,
                collectionId: input.collectionId || 'default',
                userId: 'user1',
                isPublic: false,
                filters: [],
                cards: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                tags: input.tags || []
            };
            setDashboards((prev) => [...prev, newDashboard]);
            return { success: true, data: newDashboard };
        } catch (err) {
            return { success: false, error: 'Failed to create dashboard' };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateDashboard = useCallback(async (id: string, updates: Partial<Dashboard>) => {
        setIsLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            setDashboards((prev) =>
                prev.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date() } : d))
            );
            if (activeDashboard?.id === id) {
                setActiveDashboard((prev) => (prev ? { ...prev, ...updates, updatedAt: new Date() } : prev));
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Failed to update dashboard' };
        } finally {
            setIsLoading(false);
        }
    }, [activeDashboard]);

    const deleteDashboard = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            await new Promise((resolve) => setTimeout(resolve, 500));
            setDashboards((prev) => prev.filter((d) => d.id !== id));
            if (activeDashboard?.id === id) {
                setActiveDashboard(null);
            }
            return { success: true };
        } catch (err) {
            return { success: false, error: 'Failed to delete dashboard' };
        } finally {
            setIsLoading(false);
        }
    }, [activeDashboard]);
    const addCard = useCallback((dashboardId: string, card: AddCardInput) => {
        const newCard: DashboardCard = {
            id: `card_${Date.now()}`,
            dashboardId,
            queryId: card.queryId,
            position: card.position,
            visualizationConfig: card.visualizationConfig,
            title: card.title || 'New Visualization',
            type: card.type || 'visualization',
        };

        setDashboards((prev) =>
            prev.map((d) =>
                d.id === dashboardId ? { ...d, cards: [...d.cards, newCard] } : d
            )
        );

        if (activeDashboard?.id === dashboardId) {
            setActiveDashboard((prev) =>
                prev ? { ...prev, cards: [...prev.cards, newCard] } : prev
            );
        }

        return newCard;
    }, [activeDashboard]);

    // Remove card from dashboard (local state update)
    const removeCard = useCallback((dashboardId: string, cardId: string) => {
        setDashboards((prev) =>
            prev.map((d) =>
                d.id === dashboardId
                    ? { ...d, cards: d.cards.filter((c) => c.id !== cardId) }
                    : d
            )
        );

        if (activeDashboard?.id === dashboardId) {
            setActiveDashboard((prev) =>
                prev
                    ? { ...prev, cards: prev.cards.filter((c) => c.id !== cardId) }
                    : prev
            );
        }
    }, [activeDashboard]);

    // Update card position (for drag & drop)
    const updateCardPosition = useCallback(
        (dashboardId: string, cardId: string, position: { x: number; y: number; w: number; h: number }) => {
            setDashboards((prev) =>
                prev.map((d) =>
                    d.id === dashboardId
                        ? {
                            ...d,
                            cards: d.cards.map((c) =>
                                c.id === cardId ? { ...c, position } : c
                            ),
                        }
                        : d
                )
            );

            if (activeDashboard?.id === dashboardId) {
                setActiveDashboard((prev) =>
                    prev
                        ? {
                            ...prev,
                            cards: prev.cards.map((c) =>
                                c.id === cardId ? { ...c, position } : c
                            ),
                        }
                        : prev
                );
            }
        },
        [activeDashboard]
    );

    // Duplicate dashboard
    const duplicateDashboard = useCallback(async (id: string) => {
        const original = dashboards.find((d) => d.id === id);
        if (!original) return { success: false, error: 'Dashboard not found' };

        return createDashboard({
            name: `${original.name} (Copy)`,
            description: original.description,
            collectionId: original.collectionId,
            tags: original.tags,
        });
    }, [dashboards, createDashboard]);

    // Auto-fetch on mount
    useEffect(() => {
        if (options.autoFetch !== false) {
            fetchDashboards();
        }
    }, [fetchDashboards, options.autoFetch]);

    return {
        // State
        dashboards,
        activeDashboard,
        isLoading,
        error,

        // Actions
        refetch: fetchDashboards,
        fetchDashboard,
        createDashboard,
        updateDashboard,
        deleteDashboard,
        duplicateDashboard,

        // Card management
        addCard,
        removeCard,
        updateCardPositions: (dashboardId: string, cards: DashboardCard[]) => {
            setDashboards((prev) =>
                prev.map((d) =>
                    d.id === dashboardId ? { ...d, cards } : d
                )
            );

            if (activeDashboard?.id === dashboardId) {
                setActiveDashboard((prev) =>
                    prev ? { ...prev, cards } : prev
                );
            }
        },

        // Selection
        selectDashboard: setActiveDashboard,
    };
}
