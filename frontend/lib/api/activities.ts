import type {
    ActivityLog,
    ActivityFeedResponse,
} from '@/lib/types/notifications';

const API_BASE = '/api/v1';

export const activityApi = {
    // Get user activity feed (paginated)
    getUserActivity: async (limit = 20, offset = 0): Promise<ActivityFeedResponse> => {
        const res = await fetch(`${API_BASE}/activity?limit=${limit}&offset=${offset}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch user activity');
        }
        return res.json();
    },

    // Get workspace activity feed (paginated)
    getWorkspaceActivity: async (workspaceId: string, limit = 20, offset = 0): Promise<ActivityFeedResponse> => {
        const res = await fetch(`${API_BASE}/activity/workspace/${workspaceId}?limit=${limit}&offset=${offset}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch workspace activity');
        }
        return res.json();
    },

    // Get recent activity (admin only)
    getRecentActivity: async (limit = 50): Promise<ActivityLog[]> => {
        const res = await fetch(`${API_BASE}/activity/recent?limit=${limit}`);
        if (!res.ok) {
            const error = await res.json();
            throw new Error(error.error || 'Failed to fetch recent activity');
        }
        const data = await res.json();
        return data.activities || [];
    },
};
