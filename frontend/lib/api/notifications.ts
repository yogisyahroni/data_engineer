import type {
    Notification,
    NotificationResponse,
    UnreadCountResponse,
    CreateNotificationInput,
} from '@/lib/types/notifications';

const API_BASE = '/api/v1';

export const notificationApi = {
    // Get user notifications (paginated)
    getNotifications: async (limit = 20, offset = 0): Promise<NotificationResponse> => {
        const res = await fetch(`${API_BASE}/notifications?limit=${limit}&offset=${offset}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch notifications');
        }
        return res.json();
    },

    // Get unread notifications
    getUnreadNotifications: async (): Promise<Notification[]> => {
        const res = await fetch(`${API_BASE}/notifications/unread`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch unread notifications');
        }
        return res.json();
    },

    // Get unread count
    getUnreadCount: async (): Promise<UnreadCountResponse> => {
        const res = await fetch(`${API_BASE}/notifications/unread-count`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch unread count');
        }
        return res.json();
    },

    // Mark notification as read
    markAsRead: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
            method: 'PUT',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to mark notification as read');
        }
        return res.json();
    },

    // Mark all as read
    markAllAsRead: async (): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/notifications/read-all`, {
            method: 'PUT',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to mark all as read');
        }
        return res.json();
    },

    // Delete notification
    deleteNotification: async (id: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/notifications/${id}`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete notification');
        }
        return res.json();
    },

    // Delete all read notifications
    deleteReadNotifications: async (): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/notifications/read`, {
            method: 'DELETE',
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to delete read notifications');
        }
        return res.json();
    },

    // Create notification (admin only)
    createNotification: async (data: CreateNotificationInput): Promise<Notification> => {
        const res = await fetch(`${API_BASE}/notifications`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to create notification');
        }
        return res.json();
    },

    // Broadcast system notification (admin only)
    broadcastSystemNotification: async (title: string, message: string): Promise<{ message: string }> => {
        const res = await fetch(`${API_BASE}/notifications/broadcast`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, message }),
        });
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to broadcast notification');
        }
        return res.json();
    },
};
