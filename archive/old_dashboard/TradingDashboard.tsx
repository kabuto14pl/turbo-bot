/**
 * 🚀 TIER 2.2: Enterprise Trading Dashboard - Main Component
 * Real-time portfolio monitoring with advanced risk analytics
 */

import React, { useState, useEffect, useCallback } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import RiskMetricsPanel from './RiskMetricsPanel';
import StrategyPerformancePanel from './StrategyPerformancePanel';
import TradingHistoryPanel from './TradingHistoryPanel';
import MonitoringPanel from './MonitoringPanel';

interface PortfolioData {
  totalValue: number;
  unrealizedPnL: number;
  realizedPnL: number;
  drawdown: number;
  sharpeRatio: number;
  winRate: number;
  totalTrades: number;
  timestamp: number;
}

type Timeframe = '5m' | '15m' | '30m' | '1h';

interface VaRMetrics {
  parametric: number;
  historical: number;
  monteCarlo: number;
  confidence: number;
  timestamp: number;
}

interface KellyMetrics {
  optimalFraction: number;
  adjustedFraction: number;
  winRate: number;
  avgWin: number;
  avgLoss: number;
}

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  components: {
    strategies: boolean;
    monitoring: boolean;
    riskManager: boolean;
    portfolio: boolean;
  };
}

const TradingDashboard: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioData | null>(null);
  const [varMetrics, setVarMetrics] = useState<VaRMetrics | null>(null);
  const [kellyMetrics, setKellyMetrics] = useState<KellyMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [portfolioHistory, setPortfolioHistory] = useState<PortfolioData[]>([]);
  const [wsConnected, setWsConnected] = useState(false);
  const [alerts, setAlerts] = useState<string[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>('15m'); // 🌐 TIMEFRAME SELECTOR

  // WebSocket connection for real-time updates
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001/ws');
    
    ws.onopen = () => {
      console.log('✅ WebSocket connected to trading bot');
      setWsConnected(true);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'portfolio_update':
          setPortfolio(data.payload);
          setPortfolioHistory(prev => [...prev.slice(-100), data.payload]);
          break;
        case 'var_update':
          setVarMetrics(data.payload);
          checkVaRAlerts(data.payload);
          break;
        case 'kelly_update':
          setKellyMetrics(data.payload);
          checkKellyAlerts(data.payload);
          break;
        case 'health_update':
          setHealthStatus(data.payload);
          break;
        case 'alert':
          setAlerts(prev => [...prev.slice(-5), data.message]);
          break;
      }
    };

    ws.onerror = (error) => {
      console.error('❌ WebSocket error:', error);
      setWsConnected(false);
    };

    ws.onclose = () => {
      console.log('🔌 WebSocket disconnected');
      setWsConnected(false);
      // Attempt reconnection after 5 seconds
      setTimeout(() => window.location.reload(), 5000);
    };

    return () => ws.close();
  }, []);

  // Polling fallback if WebSocket fails
  useEffect(() => {
    if (wsConnected) return;

    const fetchData = async () => {
      try {
        const [portfolioRes, healthRes] = await Promise.all([
          fetch('http://localhost:3001/api/portfolio'),
          fetch('http://localhost:3001/health')
        ]);

        const portfolioData = await portfolioRes.json();
        const healthData = await healthRes.json();

        setPortfolio(portfolioData);
        setHealthStatus(healthData);
        setPortfolioHistory(prev => [...prev.slice(-100), portfolioData]);
      } catch (error) {
        console.error('❌ Failed to fetch data:', error);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [wsConnected]);

  const checkVaRAlerts = useCallback((metrics: VaRMetrics) => {
    const varThreshold = 0.05; // 5% daily VaR limit
    
    if (metrics.parametric > varThreshold) {
      setAlerts(prev => [
        ...prev.slice(-4),
        `⚠️ Parametric VaR (${(metrics.parametric * 100).toFixed(2)}%) exceeds ${varThreshold * 100}% threshold`
      ]);
    }
    
    if (metrics.historical > varThreshold) {
      setAlerts(prev => [
        ...prev.slice(-4),
        `⚠️ Historical VaR (${(metrics.historical * 100).toFixed(2)}%) exceeds ${varThreshold * 100}% threshold`
      ]);
    }
  }, []);

  const checkKellyAlerts = useCallback((metrics: KellyMetrics) => {
    if (metrics.adjustedFraction < 0.01) {
      setAlerts(prev => [
        ...prev.slice(-4),
        `⚠️ Kelly Criterion suggests reducing position size (${(metrics.adjustedFraction * 100).toFixed(2)}%)`
      ]);
    }
    
    if (metrics.optimalFraction < 0) {
      setAlerts(prev => [
        ...prev.slice(-4),
        `🚨 Negative Kelly fraction - strategy losing edge!`
      ]);
    }
  }, []);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(value);
  };

  const formatPercent = (value: number) => {
    return `${(value * 100).toFixed(2)}%`;
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50';
      case 'degraded': return 'text-yellow-600 bg-yellow-50';
      case 'unhealthy': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              🚀 Autonomous Trading Bot - Enterprise Dashboard
            </h1>
            <div className="flex items-center gap-4 mt-2">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${wsConnected ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {wsConnected ? '🟢 Live Connection' : '🔴 Polling Mode'}
              </div>
              {healthStatus && (
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getHealthColor(healthStatus.status)}`}>
                  Status: {healthStatus.status.toUpperCase()}
                </div>
              )}
              {healthStatus && (
                <div className="text-sm text-gray-600">
                  Uptime: {Math.floor(healthStatus.uptime / 3600)}h {Math.floor((healthStatus.uptime % 3600) / 60)}m
                </div>
              )}
            </div>
          </div>

          {/* 🌐 TIMEFRAME SELECTOR - TradingView Style */}
          <div className="flex gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-200">
            <span className="text-sm text-gray-600 my-auto mr-2">Interwał:</span>
            {(['5m', '15m', '30m', '1h'] as Timeframe[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setSelectedTimeframe(tf)}
                className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                  selectedTimeframe === tf
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="mb-6 space-y-2">
          {alerts.map((alert, index) => (
            <Alert key={index} variant="destructive">
              <AlertDescription>{alert}</AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Tabs Navigation */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          <TabsTrigger value="overview">Przegląd</TabsTrigger>
          <TabsTrigger value="monitoring">🚨 Monitoring</TabsTrigger>
          <TabsTrigger value="risk">Ryzyko</TabsTrigger>
          <TabsTrigger value="strategies">Strategie</TabsTrigger>
          <TabsTrigger value="history">Historia</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Main Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Portfolio Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Portfolio Performance - {selectedTimeframe.toUpperCase()}</CardTitle>
              </CardHeader>
              <CardContent>
            {portfolio && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div>
                  <p className="text-sm text-gray-600">Total Value</p>
                  <p className="text-2xl font-bold">{formatCurrency(portfolio.totalValue)}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Unrealized PnL</p>
                  <p className={`text-2xl font-bold ${portfolio.unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(portfolio.unrealizedPnL)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Realized PnL</p>
                  <p className={`text-2xl font-bold ${portfolio.realizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(portfolio.realizedPnL)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Win Rate</p>
                  <p className="text-2xl font-bold">{formatPercent(portfolio.winRate)}</p>
                </div>
              </div>
            )}
            
            {portfolioHistory.length > 0 && (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={portfolioHistory}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                  />
                  <YAxis tickFormatter={(val) => `$${(val / 1000).toFixed(1)}k`} />
                  <Tooltip 
                    labelFormatter={(ts) => new Date(ts).toLocaleString()}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Legend />
                  <Line type="monotone" dataKey="totalValue" stroke="#8884d8" name="Total Value" />
                  <Line type="monotone" dataKey="unrealizedPnL" stroke="#82ca9d" name="Unrealized PnL" />
                  <Line type="monotone" dataKey="realizedPnL" stroke="#ffc658" name="Realized PnL" />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Risk Metrics */}
        <RiskMetricsPanel 
          varMetrics={varMetrics}
          kellyMetrics={kellyMetrics}
          portfolio={portfolio}
        />
      </div>

      {/* Strategy Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <StrategyPerformancePanel />
        <TradingHistoryPanel />
      </div>

      {/* Drawdown Chart */}
      {portfolioHistory.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Drawdown Analysis - {selectedTimeframe.toUpperCase()}</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={portfolioHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="timestamp" 
                  tickFormatter={(ts) => new Date(ts).toLocaleTimeString()}
                />
                <YAxis 
                  tickFormatter={(val) => formatPercent(val)}
                  domain={[-0.3, 0]}
                />
                <Tooltip 
                  labelFormatter={(ts) => new Date(ts).toLocaleString()}
                  formatter={(value: number) => formatPercent(value)}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="drawdown" 
                  stroke="#ff4444" 
                  name="Current Drawdown"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </TabsContent>

      {/* Monitoring Tab - NEW! */}
      <TabsContent value="monitoring">
        <MonitoringPanel />
      </TabsContent>

      {/* Risk Tab */}
      <TabsContent value="risk">
        <RiskMetricsPanel 
          varMetrics={varMetrics} 
          kellyMetrics={kellyMetrics}
          portfolio={portfolio}
        />
      </TabsContent>

      {/* Strategies Tab */}
      <TabsContent value="strategies">
        <StrategyPerformancePanel />
      </TabsContent>

      {/* History Tab */}
      <TabsContent value="history">
        <TradingHistoryPanel />
      </TabsContent>
    </Tabs>
    </div>
  );
};

export default TradingDashboard;
