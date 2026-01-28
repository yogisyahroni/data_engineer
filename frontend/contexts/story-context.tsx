'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { Story, StoryPage, StoryCard, StoryFilter } from '@/lib/types';

interface StoryContextType {
  stories: Story[];
  currentStory: Story | null;
  currentPageIndex: number;
  addStory: (story: Story) => void;
  updateStory: (id: string, updates: Partial<Story>) => void;
  deleteStory: (id: string) => void;
  loadStory: (id: string) => void;
  addPage: (page: StoryPage) => void;
  updatePage: (pageId: string, updates: Partial<StoryPage>) => void;
  removePage: (pageId: string) => void;
  addCardToPage: (pageId: string, card: StoryCard) => void;
  updateCard: (pageId: string, cardId: string, updates: Partial<StoryCard>) => void;
  removeCard: (pageId: string, cardId: string) => void;
  setCurrentPage: (index: number) => void;
  applyFilter: (filterId: string, value: any) => void;
  getFilteredResults: (queryResults: any[]) => any[];
}

const StoryContext = createContext<StoryContextType | undefined>(undefined);

export function StoryProvider({ children }: { children: React.ReactNode }) {
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);

  const addStory = useCallback((story: Story) => {
    setStories((prev) => [...prev, story]);
  }, []);

  const updateStory = useCallback((id: string, updates: Partial<Story>) => {
    setStories((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
    );
    if (currentStory?.id === id) {
      setCurrentStory((prev) => (prev ? { ...prev, ...updates } : null));
    }
  }, [currentStory?.id]);

  const deleteStory = useCallback((id: string) => {
    setStories((prev) => prev.filter((s) => s.id !== id));
    if (currentStory?.id === id) {
      setCurrentStory(null);
    }
  }, [currentStory?.id]);

  const loadStory = useCallback((id: string) => {
    const story = stories.find((s) => s.id === id);
    if (story) {
      setCurrentStory(story);
      setCurrentPageIndex(0);
    }
  }, [stories]);

  const addPage = useCallback((page: StoryPage) => {
    if (!currentStory) return;
    const updatedStory = {
      ...currentStory,
      pages: [...currentStory.pages, page],
    };
    updateStory(currentStory.id, { pages: updatedStory.pages });
  }, [currentStory, updateStory]);

  const updatePage = useCallback(
    (pageId: string, updates: Partial<StoryPage>) => {
      if (!currentStory) return;
      const updatedPages = currentStory.pages.map((p) =>
        p.id === pageId ? { ...p, ...updates } : p
      );
      updateStory(currentStory.id, { pages: updatedPages });
    },
    [currentStory, updateStory]
  );

  const removePage = useCallback(
    (pageId: string) => {
      if (!currentStory) return;
      const updatedPages = currentStory.pages.filter((p) => p.id !== pageId);
      updateStory(currentStory.id, { pages: updatedPages });
    },
    [currentStory, updateStory]
  );

  const addCardToPage = useCallback(
    (pageId: string, card: StoryCard) => {
      if (!currentStory) return;
      const updatedPages = currentStory.pages.map((p) =>
        p.id === pageId ? { ...p, cards: [...p.cards, card] } : p
      );
      updateStory(currentStory.id, { pages: updatedPages });
    },
    [currentStory, updateStory]
  );

  const updateCard = useCallback(
    (pageId: string, cardId: string, updates: Partial<StoryCard>) => {
      if (!currentStory) return;
      const updatedPages = currentStory.pages.map((p) =>
        p.id === pageId
          ? {
              ...p,
              cards: p.cards.map((c) =>
                c.id === cardId ? { ...c, ...updates } : c
              ),
            }
          : p
      );
      updateStory(currentStory.id, { pages: updatedPages });
    },
    [currentStory, updateStory]
  );

  const removeCard = useCallback(
    (pageId: string, cardId: string) => {
      if (!currentStory) return;
      const updatedPages = currentStory.pages.map((p) =>
        p.id === pageId
          ? { ...p, cards: p.cards.filter((c) => c.id !== cardId) }
          : p
      );
      updateStory(currentStory.id, { pages: updatedPages });
    },
    [currentStory, updateStory]
  );

  const setCurrentPage = useCallback((index: number) => {
    if (currentStory && index >= 0 && index < currentStory.pages.length) {
      setCurrentPageIndex(index);
    }
  }, [currentStory]);

  const applyFilter = useCallback(
    (filterId: string, value: any) => {
      if (!currentStory) return;
      const updatedFilters = currentStory.filters.map((f) =>
        f.id === filterId ? { ...f, selectedValue: value } : f
      );
      updateStory(currentStory.id, { filters: updatedFilters });
    },
    [currentStory, updateStory]
  );

  const getFilteredResults = useCallback(
    (queryResults: any[]) => {
      if (!currentStory || currentStory.filters.length === 0) {
        return queryResults;
      }

      return queryResults.filter((row) => {
        return currentStory.filters.every((filter) => {
          if (!filter.selectedValue) return true;

          const rowValue = row[filter.column];
          if (filter.type === 'select') {
            return rowValue === filter.selectedValue;
          } else if (filter.type === 'multi-select') {
            return Array.isArray(filter.selectedValue)
              ? filter.selectedValue.includes(rowValue)
              : rowValue === filter.selectedValue;
          } else if (filter.type === 'range') {
            const [min, max] = filter.selectedValue;
            return rowValue >= min && rowValue <= max;
          } else if (filter.type === 'date-range') {
            const [startDate, endDate] = filter.selectedValue;
            return rowValue >= startDate && rowValue <= endDate;
          }
          return true;
        });
      });
    },
    [currentStory]
  );

  return (
    <StoryContext.Provider
      value={{
        stories,
        currentStory,
        currentPageIndex,
        addStory,
        updateStory,
        deleteStory,
        loadStory,
        addPage,
        updatePage,
        removePage,
        addCardToPage,
        updateCard,
        removeCard,
        setCurrentPage,
        applyFilter,
        getFilteredResults,
      }}
    >
      {children}
    </StoryContext.Provider>
  );
}

export function useStory() {
  const context = useContext(StoryContext);
  if (!context) {
    throw new Error('useStory must be used within StoryProvider');
  }
  return context;
}
