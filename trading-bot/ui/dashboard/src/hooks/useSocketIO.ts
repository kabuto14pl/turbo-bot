/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔌 REAL-TIME SOCKET.IO HOOK 2025
 * Enhanced WebSocket connection with automatic reconnection
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

interface SocketState {
    connected: boolean;
    connecting: boolean;
    error: string | null;
    lastUpdate: Date | null;
    metrics: any;
    alerts: any[];
}

interface UseSocketIOOptions {
    url?: string;
    autoConnect?: boolean;
    reconnectionAttempts?: number;
    reconnectionDelay?: number;
    enableMetrics?: boolean;
    enableAlerts?: boolean;
    enableStrategies?: boolean;
}

export const useSocketIO = (options: UseSocketIOOptions = {}) => {
    const {
        url = 'http://localhost:9092',
        autoConnect = true,
        reconnectionAttempts = 5,
        reconnectionDelay = 1000,
        enableMetrics = true,
        enableAlerts = true,
        enableStrategies = true
    } = options;

    const [state, setState] = useState<SocketState>({
        connected: false,
        connecting: false,
        error: null,
        lastUpdate: null,
        metrics: null,
        alerts: []
    });

    const socketRef = useRef<Socket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const [reconnectAttempts, setReconnectAttempts] = useState(0);

    const connect = useCallback(() => {
        if (socketRef.current?.connected) {
            return;
        }

        setState(prev => ({ ...prev, connecting: true, error: null }));

        try {
            socketRef.current = io(url, {
                autoConnect: false,
                reconnection: false, // We handle reconnection manually
                timeout: 5000,
                forceNew: true
            });

            const socket = socketRef.current;

            // Connection events
            socket.on('connect', () => {
                console.log('🚀 Socket.IO connected successfully');
                setState(prev => ({
                    ...prev,
                    connected: true,
                    connecting: false,
                    error: null,
                    lastUpdate: new Date()
                }));
                setReconnectAttempts(0);

                // Subscribe to channels
                if (enableMetrics) {
                    socket.emit('subscribe_metrics');
                }
                if (enableAlerts) {
                    socket.emit('subscribe_alerts');
                }
                if (enableStrategies) {
                    socket.emit('subscribe_strategies');
                }
            });

            socket.on('disconnect', (reason) => {
                console.log('📡 Socket.IO disconnected:', reason);
                setState(prev => ({
                    ...prev,
                    connected: false,
                    connecting: false,
                    error: `Disconnected: ${reason}`
                }));

                // Attempt reconnection if not manual disconnect
                if (reason !== 'io client disconnect' && reconnectAttempts < reconnectionAttempts) {
                    scheduleReconnect();
                }
            });

            socket.on('connect_error', (error) => {
                console.error('❌ Socket.IO connection error:', error);
                setState(prev => ({
                    ...prev,
                    connected: false,
                    connecting: false,
                    error: error.message
                }));

                if (reconnectAttempts < reconnectionAttempts) {
                    scheduleReconnect();
                }
            });

            // Data events
            socket.on('metrics_update', (data) => {
                setState(prev => ({
                    ...prev,
                    metrics: data,
                    lastUpdate: new Date()
                }));
            });

            socket.on('new_alert', (alert) => {
                setState(prev => ({
                    ...prev,
                    alerts: [alert, ...prev.alerts.slice(0, 9)], // Keep last 10 alerts
                    lastUpdate: new Date()
                }));
            });

            socket.on('strategy_update', (strategyData) => {
                // Emit custom event for strategy updates
                window.dispatchEvent(new CustomEvent('strategy_update', { detail: strategyData }));
            });

            socket.on('connection_established', (data) => {
                console.log('🎯 Socket.IO connection established:', data);
            });

            // Connect the socket
            socket.connect();

        } catch (error) {
            console.error('❌ Failed to create socket connection:', error);
            setState(prev => ({
                ...prev,
                connected: false,
                connecting: false,
                error: error instanceof Error ? error.message : 'Connection failed'
            }));
        }
    }, [url, reconnectionAttempts, reconnectAttempts, enableMetrics, enableAlerts, enableStrategies]);

    const scheduleReconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
        }

        const delay = reconnectionDelay * Math.pow(2, reconnectAttempts); // Exponential backoff
        
        console.log(`🔄 Scheduling reconnect in ${delay}ms (attempt ${reconnectAttempts + 1}/${reconnectionAttempts})`);
        
        reconnectTimeoutRef.current = setTimeout(() => {
            setReconnectAttempts(prev => prev + 1);
            connect();
        }, delay);
    }, [reconnectionDelay, reconnectAttempts, reconnectionAttempts, connect]);

    const disconnect = useCallback(() => {
        if (reconnectTimeoutRef.current) {
            clearTimeout(reconnectTimeoutRef.current);
            reconnectTimeoutRef.current = null;
        }

        if (socketRef.current) {
            socketRef.current.disconnect();
            socketRef.current = null;
        }

        setState(prev => ({
            ...prev,
            connected: false,
            connecting: false,
            error: null
        }));
        setReconnectAttempts(0);
    }, []);

    const emit = useCallback((event: string, data?: any) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
            return true;
        }
        return false;
    }, []);

    const toggleStrategy = useCallback((strategyName: string, action: 'start' | 'stop' | 'pause') => {
        return emit('strategy_toggle', { strategyName, action });
    }, [emit]);

    const clearAlerts = useCallback(() => {
        setState(prev => ({ ...prev, alerts: [] }));
    }, []);

    // Auto-connect on mount
    useEffect(() => {
        if (autoConnect) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    return {
        // Connection state
        connected: state.connected,
        connecting: state.connecting,
        error: state.error,
        lastUpdate: state.lastUpdate,
        reconnectAttempts,
        
        // Data
        metrics: state.metrics,
        alerts: state.alerts,
        
        // Actions
        connect,
        disconnect,
        emit,
        toggleStrategy,
        clearAlerts,
        
        // Socket instance (for advanced usage)
        socket: socketRef.current
    };
};

export default useSocketIO;
