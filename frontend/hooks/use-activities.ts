'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { activityApi } from '@/lib/api/activities';
import { useWebSocket } from './use-websocket';
import type { ActivityLog, ActivityWebSocketPayload } from '@/lib/types/notifications';
import { useCallback } from 'react';

export function useActivities(limit = 20, offset = 0) {
    const queryClient = useQueryClient();

    // Query: Get user activity feed
    const { data, isLoading, error } = useQuery({
        queryKey: ['activities', 'user', limit, offset],
        queryFn: () => activityApi.getUserActivity(limit, offset),
    });

    // Handle real-time activity updates
    const handleActivityUpdate = useCallback((payload: ActivityWebSocketPayload) => {
        // Add new activity to the feed
        queryClient.setQueryData(['activities', 'user', limit, offset], (old: any) => {
            if (!old) return old;
            return {
                ...old,
                activities: [payload.activity, ...old.activities],
                total: old.total + 1,
            };
        });
    }, [queryClient, limit, offset]);

    // Connect to WebSocket for real-time updates
    useWebSocket({
        onActivity: handleActivityUpdate,
    });

    return {
        activities: data?.activities || [],
        total: data?.total || 0,
        isLoading,
        error,
    };
}

export function useWorkspaceActivities(workspaceId: string, limit = 20, offset = 0) {
    const queryClient = useQueryClient();

    // Query: Get workspace activity feed
    const { data, isLoading, error } = useQuery({
        queryKey: ['activities', 'workspace', workspaceId, limit, offset],
        queryFn: () => activityApi.getWorkspaceActivity(workspaceId, limit, offset),
        enabled: !!workspaceId,
    });

    // Handle real-time activity updates for workspace
    const handleActivityUpdate = useCallback((payload: ActivityWebSocketPayload) => {
        // Only update if activity belongs to this workspace
        if (payload.activity.workspaceId === workspaceId) {
            queryClient.setQueryData(['activities', 'workspace', workspaceId, limit, offset], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    activities: [payload.activity, ...old.activities],
                    total: old.total + 1,
                };
            });
        }
    }, [queryClient, workspaceId, limit, offset]);

    useWebSocket({
        onActivity: handleActivityUpdate,
    });

    return {
        activities: data?.activities || [],
        total: data?.total || 0,
        isLoading,
        error,
    };
}

export function useRecentActivities(limit = 50) {
    // Query: Get recent activity (admin only)
    const { data: activities = [], isLoading, error } = useQuery({
        queryKey: ['activities', 'recent', limit],
        queryFn: () => activityApi.getRecentActivity(limit),
    });

    return {
        activities,
        isLoading,
        error,
    };
}
