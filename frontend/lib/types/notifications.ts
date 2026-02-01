// Notification Types
export interface Notification {
    id: string;
    userId: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error' | 'system';
    isRead: boolean;
    createdAt: Date;
}

export interface CreateNotificationInput {
    userId: string;
    title: string;
    message: string;
    type?: 'info' | 'success' | 'warning' | 'error' | 'system';
}

export interface NotificationResponse {
    notifications: Notification[];
    total: number;
    limit: number;
    offset: number;
}

export interface UnreadCountResponse {
    count: number;
}

// Activity Log Types
export interface ActivityLog {
    id: string;
    userId: string;
    workspaceId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    description: string; // Human-readable description of the activity
    metadata?: Record<string, any>;
    createdAt: Date;
}

export interface ActivityFeedResponse {
    activities: ActivityLog[];
    total: number;
    limit: number;
    offset: number;
}

export interface LogActivityInput {
    userId: string;
    workspaceId?: string;
    action: string;
    entityType: string;
    entityId?: string;
    description: string;
    metadata?: Record<string, any>;
}

// Scheduler Job Types
export interface SchedulerJob {
    id: string;
    name: string;
    schedule: string; // Cron expression
    status: 'active' | 'paused' | 'error';
    lastRun?: Date;
    nextRun?: Date;
    lastError?: string;
    config?: Record<string, any>;
    createdAt: Date;
    updatedAt: Date;
}

export interface CreateSchedulerJobInput {
    name: string;
    schedule: string;
    status?: 'active' | 'paused';
    config?: Record<string, any>;
}

export interface UpdateSchedulerJobInput {
    name?: string;
    schedule?: string;
    status?: 'active' | 'paused' | 'error';
    config?: Record<string, any>;
}

export interface SchedulerJobsResponse {
    jobs: SchedulerJob[];
}

// WebSocket Message Types
export interface WebSocketMessage {
    type: 'notification' | 'activity' | 'system';
    userId: string;
    payload: any;
}

export interface NotificationWebSocketPayload {
    notification: Notification;
}

export interface ActivityWebSocketPayload {
    activity: ActivityLog;
}

export interface SystemWebSocketPayload {
    message: string;
    level: 'info' | 'warning' | 'error';
}

// WebSocket Connection State
export interface WebSocketState {
    connected: boolean;
    connecting: boolean;
    error?: string;
}

// WebSocket Stats
export interface WebSocketStats {
    connectedUsers: string[];
    totalConnections: number;
    timestamp: Date;
}
