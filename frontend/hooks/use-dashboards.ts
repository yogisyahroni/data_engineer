'use client';

import { useState, useCallback, useEffect } from 'react';
import type { Dashboard, DashboardCard, VisualizationConfig } from '@/lib/types';
import { dashboardService, CreateDashboardInput, UpdateDashboardInput } from '@/lib/services/dashboard-service';

interface UseDashboardsOptions {
    collectionId?: string;
    autoFetch?: boolean;
}

export interface AddCardInput {
    queryId: string;
    position: { x: number; y: number; w: number; h: number };
    visualizationConfig?: VisualizationConfig;
    title?: string;
    type?: 'visualization' | 'text' | 'ai-text';
}

export function useDashboards(options: UseDashboardsOptions = {}) {
    const [dashboards, setDashboards] = useState<Dashboard[]>([]);
    const [activeDashboard, setActiveDashboard] = useState<Dashboard | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchDashboards = useCallback(async () => {
        setIsLoading(true);
        try {
            const data = await dashboardService.getAll();
            setDashboards(data);
            setError(null);
        } catch (err: any) {
            setError(err.message || 'Failed to fetch dashboards');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchDashboard = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            const dashboard = await dashboardService.getById(id);
            if (dashboard) {
                setActiveDashboard(dashboard);
                setError(null);
            } else {
                setError('Dashboard not found');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to fetch dashboard');
        } finally {
            setIsLoading(false);
        }
    }, []);

    const createDashboard = useCallback(async (input: CreateDashboardInput) => {
        setIsLoading(true);
        try {
            const newDashboard = await dashboardService.create(input);
            setDashboards((prev) => [...prev, newDashboard]);
            return { success: true, data: newDashboard };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to create dashboard' };
        } finally {
            setIsLoading(false);
        }
    }, []);

    const updateDashboard = useCallback(async (id: string, updates: UpdateDashboardInput) => {
        setIsLoading(true);
        try {
            // Optimistic update
            setDashboards((prev) =>
                prev.map((d) => (d.id === id ? { ...d, ...updates, updatedAt: new Date() } : d))
            );

            const updatedDashboard = await dashboardService.update(id, updates);

            // Re-sync with server response to be sure
            setDashboards((prev) =>
                prev.map((d) => (d.id === id ? updatedDashboard : d))
            );

            if (activeDashboard?.id === id) {
                setActiveDashboard(updatedDashboard);
            }
            return { success: true, data: updatedDashboard };
        } catch (err: any) {
            // Revert optimistic update needed? For MVP we just show error
            return { success: false, error: err.message || 'Failed to update dashboard' };
        } finally {
            setIsLoading(false);
        }
    }, [activeDashboard]);

    const deleteDashboard = useCallback(async (id: string) => {
        setIsLoading(true);
        try {
            await dashboardService.delete(id);
            setDashboards((prev) => prev.filter((d) => d.id !== id));
            if (activeDashboard?.id === id) {
                setActiveDashboard(null);
            }
            return { success: true };
        } catch (err: any) {
            return { success: false, error: err.message || 'Failed to delete dashboard' };
        } finally {
            setIsLoading(false);
        }
    }, [activeDashboard]);

    const addCard = useCallback(async (dashboardId: string, card: AddCardInput) => {
        // We need to find the dashboard first to append the card
        const dashboard = dashboards.find(d => d.id === dashboardId) || (activeDashboard?.id === dashboardId ? activeDashboard : null);

        if (!dashboard) return null;

        const newCard: DashboardCard = {
            id: `card_${Date.now()}`, // Temp ID, backend should sanitize or we let backend generate
            dashboardId,
            queryId: card.queryId,
            position: card.position,
            visualizationConfig: card.visualizationConfig,
            title: card.title || 'New Visualization',
            type: card.type || 'visualization',
        };

        const updatedCards = [...dashboard.cards, newCard];

        // Use the general update function to persist changes
        const result = await updateDashboard(dashboardId, { cards: updatedCards });

        if (result.success && result.data) {
            // Return the specific card from the updated dashboard (backend might generate ID)
            // For now we return our optimistic card or find the one we added
            return newCard;
        }
        return null;
    }, [dashboards, activeDashboard, updateDashboard]);

    // Remove card from dashboard
    const removeCard = useCallback(async (dashboardId: string, cardId: string) => {
        const dashboard = dashboards.find(d => d.id === dashboardId) || (activeDashboard?.id === dashboardId ? activeDashboard : null);
        if (!dashboard) return;

        const updatedCards = dashboard.cards.filter(c => c.id !== cardId);
        await updateDashboard(dashboardId, { cards: updatedCards });
    }, [dashboards, activeDashboard, updateDashboard]);

    // Update card position (for drag & drop)
    const updateCardPosition = useCallback(
        async (dashboardId: string, cardId: string, position: { x: number; y: number; w: number; h: number }) => {
            const dashboard = dashboards.find(d => d.id === dashboardId) || (activeDashboard?.id === dashboardId ? activeDashboard : null);
            if (!dashboard) return;

            const updatedCards = dashboard.cards.map((c) =>
                c.id === cardId ? { ...c, position } : c
            );

            // Debounce or just call update? 
            // For MVP dragging, we might want to update local state fast and verify late.
            // But updateDashboard calls API immediately.
            // Optimization: Update local state immediately, then trigger API save.

            // LOCAL STATE UPDATE (Optimistic)
            setDashboards((prev) =>
                prev.map((d) =>
                    d.id === dashboardId ? { ...d, cards: updatedCards } : d
                )
            );
            if (activeDashboard?.id === dashboardId) {
                setActiveDashboard((prev) => prev ? { ...prev, cards: updatedCards } : prev);
            }

            // TODO: Debounce this API call in a real app
            await dashboardService.update(dashboardId, { cards: updatedCards });
        },
        [dashboards, activeDashboard]
    );
    // Note: updateCardPosition in the original hook was synchronous local only. 
    // We upgraded it to async but we should probably keep the signature or handle the promise.

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
        updateCardPositions: async (dashboardId: string, cards: DashboardCard[]) => {
            await updateDashboard(dashboardId, { cards });
        },

        // Selection
        selectDashboard: setActiveDashboard,
    };
}
