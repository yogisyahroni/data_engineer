'use client';

import { useWebSocket } from '@/hooks/use-websocket';

/**
 * WebSocketProvider - Initializes global WebSocket connection
 * 
 * This component establishes a WebSocket connection on app load
 * and maintains it throughout the user's session. It handles:
 * - Auto-connect on mount
 * - Auto-reconnect on connection loss
 * - Real-time message routing (notifications, activity, system)
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    // Initialize WebSocket connection globally
    useWebSocket();

    return <>{children}</>;
}
