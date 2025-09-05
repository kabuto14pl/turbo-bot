"use strict";
/**
 * 🔌 REAL-TIME SOCKET.IO HOOK 2025
 * Enhanced WebSocket connection with automatic reconnection
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSocketIO = void 0;
const react_1 = require("react");
const socket_io_client_1 = require("socket.io-client");
const useSocketIO = (options = {}) => {
    const { url = 'http://localhost:9092', autoConnect = true, reconnectionAttempts = 5, reconnectionDelay = 1000, enableMetrics = true, enableAlerts = true, enableStrategies = true } = options;
    const [state, setState] = (0, react_1.useState)({
        connected: false,
        connecting: false,
        error: null,
        lastUpdate: null,
        metrics: null,
        alerts: []
    });
    const socketRef = (0, react_1.useRef)(null);
    const reconnectTimeoutRef = (0, react_1.useRef)(null);
    const [reconnectAttempts, setReconnectAttempts] = (0, react_1.useState)(0);
    const connect = (0, react_1.useCallback)(() => {
        if (socketRef.current?.connected) {
            return;
        }
        setState(prev => ({ ...prev, connecting: true, error: null }));
        try {
            socketRef.current = (0, socket_io_client_1.io)(url, {
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
        }
        catch (error) {
            console.error('❌ Failed to create socket connection:', error);
            setState(prev => ({
                ...prev,
                connected: false,
                connecting: false,
                error: error instanceof Error ? error.message : 'Connection failed'
            }));
        }
    }, [url, reconnectionAttempts, reconnectAttempts, enableMetrics, enableAlerts, enableStrategies]);
    const scheduleReconnect = (0, react_1.useCallback)(() => {
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
    const disconnect = (0, react_1.useCallback)(() => {
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
    const emit = (0, react_1.useCallback)((event, data) => {
        if (socketRef.current?.connected) {
            socketRef.current.emit(event, data);
            return true;
        }
        return false;
    }, []);
    const toggleStrategy = (0, react_1.useCallback)((strategyName, action) => {
        return emit('strategy_toggle', { strategyName, action });
    }, [emit]);
    const clearAlerts = (0, react_1.useCallback)(() => {
        setState(prev => ({ ...prev, alerts: [] }));
    }, []);
    // Auto-connect on mount
    (0, react_1.useEffect)(() => {
        if (autoConnect) {
            connect();
        }
        return () => {
            disconnect();
        };
    }, [autoConnect, connect, disconnect]);
    // Cleanup on unmount
    (0, react_1.useEffect)(() => {
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
exports.useSocketIO = useSocketIO;
exports.default = exports.useSocketIO;
