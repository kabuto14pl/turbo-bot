import { useEffect, useRef, useState } from 'react';
import { toast } from 'react-hot-toast';
import { useTradingStore } from '../store/tradingStore';
import { tradingApi, checkApiHealth } from '../services/api';
import type { Portfolio, Trade, Strategy, PriceData, SystemStatus, Alert } from '../store/tradingStore';

export interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export const useWebSocket = (config: WebSocketConfig = {}) => {
  const {
    url = 'ws://localhost:9091',
    reconnectInterval = 3000,
    maxReconnectAttempts = 5
  } = config;

  const ws = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout>();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected' | 'error'>('disconnected');

  // Store actions
  const {
    setPortfolio,
    addTrade,
    updateStrategy,
    updatePrice,
    setSystemStatus,
    addAlert
  } = useTradingStore();

  // Load initial data from API
  const loadInitialData = async () => {
    try {
      console.log('🔄 Loading initial data from API...');

      // Check API health first
      const isHealthy = await checkApiHealth();
      if (!isHealthy) {
        console.warn('⚠️ API health check failed, using WebSocket only');
        return;
      }

      // Load all data in parallel
      const [
        portfolio,
        trades,
        strategies,
        systemStatus,
        alerts,
        marketData
      ] = await Promise.allSettled([
        tradingApi.getPortfolio(),
        tradingApi.getTrades(20),
        tradingApi.getStrategies(),
        tradingApi.getSystemStatus(),
        tradingApi.getAlerts(10),
        tradingApi.getMarketData(['BTC/USDT', 'ETH/USDT', 'BNB/USDT'])
      ]);

      // Update store with successful results
      if (portfolio.status === 'fulfilled' && portfolio.value) {
        setPortfolio(portfolio.value);
        console.log('✅ Portfolio data loaded');
      }

      if (trades.status === 'fulfilled' && trades.value) {
        trades.value.forEach((trade: Trade) => addTrade(trade));
        console.log('✅ Trade history loaded');
      }

      if (strategies.status === 'fulfilled' && strategies.value) {
        strategies.value.forEach((strategy: Strategy) => updateStrategy(strategy));
        console.log('✅ Strategies loaded');
      }

      if (systemStatus.status === 'fulfilled' && systemStatus.value) {
        setSystemStatus(systemStatus.value);
        console.log('✅ System status loaded');
      }

      if (alerts.status === 'fulfilled' && alerts.value) {
        alerts.value.forEach((alert: Alert) => addAlert(alert));
        console.log('✅ Alerts loaded');
      }

      if (marketData.status === 'fulfilled' && marketData.value) {
        Object.entries(marketData.value).forEach(([symbol, data]: [string, any]) => {
          updatePrice({
            symbol,
            price: data.price,
            change24h: data.change24h,
            volume24h: data.volume24h,
            timestamp: Date.now()
          });
        });
        console.log('✅ Market data loaded');
      }

      toast.success('Initial data loaded successfully');

    } catch (error) {
      console.error('❌ Failed to load initial data:', error);
      toast.error('Failed to load some data from API');
    }
  };

  const connect = () => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      return;
    }

    setConnectionStatus('connecting');

    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log('🔗 WebSocket connected to trading bot');
        setConnectionStatus('connected');
        setReconnectAttempts(0);
        toast.success('Connected to trading bot');

        // Request initial data
        sendMessage({ type: 'request_initial_data' });
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          handleMessage(data);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.current.onclose = (event) => {
        console.log('❌ WebSocket disconnected:', event.code, event.reason);
        setConnectionStatus('disconnected');
        
        if (!event.wasClean && reconnectAttempts < maxReconnectAttempts) {
          scheduleReconnect();
        } else {
          toast.error('Disconnected from trading bot');
        }
      };

      ws.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        toast.error('Connection error');
      };

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionStatus('error');
      toast.error('Failed to connect to trading bot');
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    reconnectTimeoutRef.current = setTimeout(() => {
      console.log(`🔄 Reconnecting... (attempt ${reconnectAttempts + 1}/${maxReconnectAttempts})`);
      setReconnectAttempts(prev => prev + 1);
      connect();
    }, reconnectInterval);
  };

  const handleMessage = (data: any) => {
    switch (data.type) {
      case 'portfolio_update':
        const portfolio: Portfolio = {
          totalValue: data.payload.totalValue,
          dailyPnL: data.payload.dailyPnL,
          dailyPnLPercent: data.payload.dailyPnLPercent,
          positions: data.payload.positions,
          availableBalance: data.payload.availableBalance,
          lastUpdate: new Date(data.payload.timestamp)
        };
        setPortfolio(portfolio);
        break;

      case 'trade_update':
        const trade: Trade = {
          id: data.payload.id,
          symbol: data.payload.symbol,
          side: data.payload.side,
          amount: data.payload.amount,
          price: data.payload.price,
          timestamp: new Date(data.payload.timestamp),
          strategy: data.payload.strategy,
          pnl: data.payload.profit,
          status: 'completed'
        };
        addTrade(trade);
        
        // Show notification for significant trades
        if (Math.abs(trade.pnl || 0) > 100) {
          toast.success(
            `${trade.side.toUpperCase()} ${trade.symbol}: ${trade.pnl && trade.pnl > 0 ? '+' : ''}$${(trade.pnl || 0).toFixed(2)}`,
            { duration: 3000 }
          );
        }
        break;

      case 'strategy_update':
        const strategy: Strategy = {
          id: data.payload.id,
          name: data.payload.name,
          status: data.payload.status,
          performance: data.payload.performance,
          totalTrades: data.payload.trades || 0,
          winRate: data.payload.volume || 0,
          symbol: data.payload.symbol || 'BTCUSDT',
          params: {}
        };
        updateStrategy(strategy);
        break;

      case 'price_update':
        const price: PriceData = {
          symbol: data.payload.symbol,
          price: data.payload.price,
          change24h: data.payload.change,
          volume24h: data.payload.volume,
          timestamp: data.payload.timestamp || Date.now()
        };
        updatePrice(price);
        break;

      case 'system_status':
        const systemStatus: SystemStatus = {
          status: data.payload.status,
          uptime: data.payload.uptime,
          latency: data.payload.apiLatency || 0,
          ordersPerHour: data.payload.ordersPerHour,
          activePairs: data.payload.activePairs || 0,
          connectedExchanges: data.payload.connectedExchanges || [],
          lastUpdate: new Date(data.payload.timestamp)
        };
        setSystemStatus(systemStatus);
        break;

      case 'alert':
        const alert: Alert = {
          id: data.payload.id || Date.now().toString(),
          type: data.payload.type,
          message: data.payload.message,
          level: data.payload.level || 'info',
          timestamp: new Date(data.payload.timestamp),
          read: false
        };
        addAlert(alert);
        
        // Show toast for critical alerts
        if (alert.level === 'error') {
          toast.error(alert.message);
        } else if (alert.level === 'warning') {
          toast(alert.message, { icon: '⚠️' });
        }
        break;

      case 'initial_data':
        // Handle bulk initial data
        if (data.payload.portfolio) {
          setPortfolio({
            ...data.payload.portfolio,
            lastUpdate: new Date(data.payload.portfolio.timestamp)
          });
        }
        
        if (data.payload.strategies) {
          data.payload.strategies.forEach((strategyData: any) => {
            updateStrategy({
              ...strategyData,
              lastActive: new Date(strategyData.lastActive)
            });
          });
        }
        
        if (data.payload.recentTrades) {
          data.payload.recentTrades.forEach((tradeData: any) => {
            addTrade({
              ...tradeData,
              timestamp: new Date(tradeData.timestamp)
            });
          });
        }
        
        toast.success('Data synchronized successfully');
        break;

      default:
        console.log('Unknown message type:', data.type);
    }
  };

  const sendMessage = (message: any) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message:', message);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    
    if (ws.current) {
      ws.current.close(1000, 'Manual disconnect');
      ws.current = null;
    }
    
    setConnectionStatus('disconnected');
  };

  // Auto-connect on mount
  useEffect(() => {
    // Load initial data from API first
    loadInitialData();
    
    // Then connect to WebSocket for real-time updates
    connect();
    
    return () => {
      disconnect();
    };
  }, [url]);

  // Public API
  return {
    connectionStatus,
    reconnectAttempts,
    connect,
    disconnect,
    sendMessage,
    loadInitialData,
    isConnected: connectionStatus === 'connected',
    isConnecting: connectionStatus === 'connecting',
    isDisconnected: connectionStatus === 'disconnected',
    hasError: connectionStatus === 'error'
  };
};
