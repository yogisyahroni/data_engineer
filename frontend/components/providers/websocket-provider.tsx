'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { useWebSocket } from '@/hooks/use-websocket';

/**
 * WebSocketProvider - Initializes global WebSocket connection
 * 
 * This component establishes a WebSocket connection ONLY after user is authenticated.
 * It handles:
 * - Auto-connect on mount (only if session exists)
 * - Auto-reconnect on connection loss
 * - Real-time message routing (notifications, activity, system)
 */
export function WebSocketProvider({ children }: { children: React.ReactNode }) {
    const { status } = useSession();

    const [token, setToken] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (status === 'authenticated') {
            fetch('/api/auth/token')
                .then(res => res.json())
                .then(data => {
                    if (data.token) {
                        setToken(data.token);
                    }
                })
                .catch(err => console.error('Failed to fetch WS token:', err));
        } else {
            setToken(undefined);
        }
    }, [status]);

    // CRITICAL FIX: Only initialize WebSocket when status is EXACTLY 'authenticated' AND token is available
    const isAuthenticated = status === 'authenticated' && !!token;

    useWebSocket({
        enabled: isAuthenticated,
        autoReconnect: true,
        reconnectInterval: 3000,
        token: token,
    });

    return <>{children}</>;
}
