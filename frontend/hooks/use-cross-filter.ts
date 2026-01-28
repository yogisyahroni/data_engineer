'use client';

import { create } from 'zustand';

interface CrossFilterStore {
    activeFilters: Record<string, any>;
    setFilter: (key: string, value: any) => void;
    clearFilters: () => void;
}

/**
 * Cross-Filtering Orchestrator (Industrial Power BI Standard)
 * Allows clicking a chart segment to filter all other dashboard components.
 */
export const useCrossFilter = create<CrossFilterStore>((set) => ({
    activeFilters: {},
    setFilter: (key: string, value: any) =>
        set((state: CrossFilterStore) => ({
            activeFilters: { ...state.activeFilters, [key]: value }
        })),
    clearFilters: () => set({ activeFilters: {} }),
}));
