'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notificationApi } from '@/lib/api/notifications';
import { useWebSocket } from './use-websocket';
import { toast } from 'sonner';
import type { Notification, NotificationWebSocketPayload } from '@/lib/types/notifications';
import { useCallback, useEffect } from 'react';

export function useNotifications(limit = 20, offset = 0) {
    const queryClient = useQueryClient();

    // Query: Get notifications
    const { data, isLoading, error } = useQuery({
        queryKey: ['notifications', limit, offset],
        queryFn: () => notificationApi.getNotifications(limit, offset),
    });

    // Query: Get unread count
    const { data: unreadCountData } = useQuery({
        queryKey: ['notifications', 'unread-count'],
        queryFn: notificationApi.getUnreadCount,
        refetchInterval: 30000, // Refetch every 30s as fallback
    });

    // Handle real-time notification updates
    const handleNotificationUpdate = useCallback((payload: NotificationWebSocketPayload) => {
        // Add new notification to the list
        queryClient.setQueryData(['notifications', limit, offset], (old: any) => {
            if (!old) return old;
            return {
                ...old,
                notifications: [payload.notification, ...old.notifications],
                total: old.total + 1,
            };
        });

        // Update unread count
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });

        // Show toast for new notification
        toast(payload.notification.title, {
            description: payload.notification.message,
            duration: 5000,
        });
    }, [queryClient, limit, offset]);

    // Connect to WebSocket for real-time updates
    useWebSocket({
        onNotification: handleNotificationUpdate,
    });

    // Mutation: Mark as read
    const markAsReadMutation = useMutation({
        mutationFn: notificationApi.markAsRead,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });

            // Optimistically update notification
            queryClient.setQueryData(['notifications', limit, offset], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    notifications: old.notifications.map((n: Notification) =>
                        n.id === id ? { ...n, isRead: true } : n
                    ),
                };
            });

            // Update unread count
            queryClient.setQueryData(['notifications', 'unread-count'], (old: any) => {
                if (!old) return old;
                return { count: Math.max(0, old.count - 1) };
            });
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.error('Failed to mark notification as read');
        },
    });

    // Mutation: Mark all as read
    const markAllAsReadMutation = useMutation({
        mutationFn: notificationApi.markAllAsRead,
        onMutate: async () => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });

            // Optimistically update all notifications
            queryClient.setQueryData(['notifications', limit, offset], (old: any) => {
                if (!old) return old;
                return {
                    ...old,
                    notifications: old.notifications.map((n: Notification) => ({
                        ...n,
                        isRead: true,
                    })),
                };
            });

            // Update unread count to 0
            queryClient.setQueryData(['notifications', 'unread-count'], { count: 0 });
        },
        onSuccess: () => {
            toast.success('All notifications marked as read');
        },
        onError: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.error('Failed to mark all as read');
        },
    });

    // Mutation: Delete notification
    const deleteNotificationMutation = useMutation({
        mutationFn: notificationApi.deleteNotification,
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['notifications'] });

            const previousData = queryClient.getQueryData(['notifications', limit, offset]);

            // Optimistically remove notification
            queryClient.setQueryData(['notifications', limit, offset], (old: any) => {
                if (!old) return old;
                const notification = old.notifications.find((n: Notification) => n.id === id);
                return {
                    ...old,
                    notifications: old.notifications.filter((n: Notification) => n.id !== id),
                    total: old.total - 1,
                };
            });

            return { previousData };
        },
        onError: (error, variables, context) => {
            if (context?.previousData) {
                queryClient.setQueryData(['notifications', limit, offset], context.previousData);
            }
            toast.error('Failed to delete notification');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
        },
    });

    // Mutation: Delete all read notifications
    const deleteReadNotificationsMutation = useMutation({
        mutationFn: notificationApi.deleteReadNotifications,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['notifications'] });
            toast.success('Read notifications deleted');
        },
        onError: () => {
            toast.error('Failed to delete read notifications');
        },
    });

    return {
        notifications: data?.notifications || [],
        total: data?.total || 0,
        unreadCount: unreadCountData?.count || 0,
        isLoading,
        error,
        markAsRead: markAsReadMutation.mutate,
        markAllAsRead: markAllAsReadMutation.mutate,
        deleteNotification: deleteNotificationMutation.mutate,
        deleteReadNotifications: deleteReadNotificationsMutation.mutate,
    };
}

// Hook for unread notifications only
export function useUnreadNotifications() {
    const queryClient = useQueryClient();

    const { data: notifications = [], isLoading } = useQuery({
        queryKey: ['notifications', 'unread'],
        queryFn: notificationApi.getUnreadNotifications,
    });

    // Handle real-time updates
    const handleNotificationUpdate = useCallback((payload: NotificationWebSocketPayload) => {
        queryClient.setQueryData(['notifications', 'unread'], (old: Notification[] = []) => {
            return [payload.notification, ...old];
        });
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] });
    }, [queryClient]);

    useWebSocket({
        onNotification: handleNotificationUpdate,
    });

    return {
        notifications,
        isLoading,
    };
}
