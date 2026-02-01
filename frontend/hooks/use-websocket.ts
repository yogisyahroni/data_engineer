'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import type {
    WebSocketMessage,
    WebSocketState,
    NotificationWebSocketPayload,
    ActivityWebSocketPayload,
    SystemWebSocketPayload,
} from '@/lib/types/notifications';

interface UseWebSocketOptions {
    onNotification?: (payload: NotificationWebSocketPayload) => void;
    onActivity?: (payload: ActivityWebSocketPayload) => void;
    onSystem?: (payload: SystemWebSocketPayload) => void;
    onConnect?: () => void;
    onDisconnect?: () => void;
    onError?: (error: Event) => void;
    autoReconnect?: boolean;
    reconnectInterval?: number;
}

export function useWebSocket(options: UseWebSocketOptions = {}) {
    const {
        onNotification,
        onActivity,
        onSystem,
        onConnect,
        onDisconnect,
        onError,
        autoReconnect = true,
        reconnectInterval = 3000,
    } = options;

    const [state, setState] = useState<WebSocketState>({
        connected: false,
        connecting: false,
    });

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const maxReconnectAttempts = 10;

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        setState(prev => ({ ...prev, connecting: true, error: undefined }));

        try {
            // Get WebSocket URL from environment or construct from current location
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}/api/v1/ws`;

            const ws = new WebSocket(wsUrl);

            ws.onopen = () => {
                console.log('[WebSocket] Connected');
                setState({ connected: true, connecting: false });
                reconnectAttemptsRef.current = 0;
                onConnect?.();
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);

                    switch (message.type) {
                        case 'notification':
                            onNotification?.(message.payload as NotificationWebSocketPayload);
                            break;
                        case 'activity':
                            onActivity?.(message.payload as ActivityWebSocketPayload);
                            break;
                        case 'system':
                            onSystem?.(message.payload as SystemWebSocketPayload);
                            break;
                        default:
                            console.warn('[WebSocket] Unknown message type:', message.type);
                    }
                } catch (error) {
                    console.error('[WebSocket] Failed to parse message:', error);
                }
            };

            ws.onerror = (error) => {
                console.error('[WebSocket] Error:', error);
                setState(prev => ({
                    ...prev,
                    error: 'WebSocket connection error',
                }));
                onError?.(error);
            };

            ws.onclose = () => {
                console.log('[WebSocket] Disconnected');
                setState({ connected: false, connecting: false });
                wsRef.current = null;
                onDisconnect?.();

                // Auto-reconnect
                if (autoReconnect && reconnectAttemptsRef.current < maxReconnectAttempts) {
                    reconnectAttemptsRef.current++;
                    const delay = Math.min(reconnectInterval * reconnectAttemptsRef.current, 30000);
                    console.log(`[WebSocket] Reconnecting in ${delay}ms (attempt ${reconnectAttemptsRef.current})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, delay);
                }
            };

            wsRef.current = ws;
        } catch (error) {
            console.error('[WebSocket] Connection error:', error);
            setState({
                connected: false,
                connecting: false,
                error: error instanceof Error ? error.message : 'Failed to connect',
            });
        }
    }, [autoReconnect, reconnectInterval, onConnect, onDisconnect, onError, onNotification, onActivity, onSystem]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        setState({ connected: false, connecting: false });
    }, []);

    const send = useCallback((message: any) => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify(message));
        } else {
            console.warn('[WebSocket] Cannot send message: not connected');
        }
    }, []);

    // Connect on mount
    useEffect(() => {
        connect();

        return () => {
            disconnect();
        };
    }, [connect, disconnect]);

    return {
        ...state,
        connect,
        disconnect,
        send,
    };
}
