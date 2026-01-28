'use client';

import { useCallback, useRef } from 'react';

interface CacheEntry {
  data: any;
  timestamp: number;
  ttl: number; // in milliseconds
}

interface CacheStore {
  [key: string]: CacheEntry;
}

const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default

export function useQueryCache(ttl: number = CACHE_TTL) {
  const cacheRef = useRef<CacheStore>({});

  const getCacheKey = useCallback((sql: string, connectionId: string) => {
    return `${connectionId}:${btoa(sql)}`;
  }, []);

  const get = useCallback(
    (sql: string, connectionId: string) => {
      const key = getCacheKey(sql, connectionId);
      const entry = cacheRef.current[key];

      if (!entry) {
        console.log('[v0] Cache miss for:', key);
        return null;
      }

      const isExpired = Date.now() - entry.timestamp > entry.ttl;
      if (isExpired) {
        console.log('[v0] Cache expired for:', key);
        delete cacheRef.current[key];
        return null;
      }

      console.log('[v0] Cache hit for:', key);
      return entry.data;
    },
    [getCacheKey]
  );

  const set = useCallback(
    (sql: string, connectionId: string, data: any) => {
      const key = getCacheKey(sql, connectionId);
      cacheRef.current[key] = {
        data,
        timestamp: Date.now(),
        ttl,
      };
      console.log('[v0] Cached query result:', key);
    },
    [getCacheKey, ttl]
  );

  const clear = useCallback(() => {
    cacheRef.current = {};
    console.log('[v0] Cache cleared');
  }, []);

  const clearKey = useCallback(
    (sql: string, connectionId: string) => {
      const key = getCacheKey(sql, connectionId);
      delete cacheRef.current[key];
      console.log('[v0] Cache cleared for:', key);
    },
    [getCacheKey]
  );

  const getStats = useCallback(() => {
    return {
      size: Object.keys(cacheRef.current).length,
      entries: Object.keys(cacheRef.current),
    };
  }, []);

  return {
    get,
    set,
    clear,
    clearKey,
    getStats,
  };
}
