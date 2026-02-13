/**
 * 🚨 KROK 5: Monitoring System Dashboard Panel
 * Real-time monitoring metrics, alerts, and ML retrain statistics
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  TrendingUp, 
  Zap,
  Bell,
  RefreshCw,
  Server,
  Database
} from 'lucide-react';

interface MonitoringSummary {
  performance: {
    total_trades: number;
    win_rate: number;
    sharpe_ratio: number;
    current_drawdown: number;
    consecutive_losses: number;
    monitoring_active: boolean;
  };
  ml_retrain: {
    total_retrains: number;
    success_rate: number;
    avg_performance_change: number;
    last_retrain: number;
  };
  metrics: {
    trading: {
      total_pnl: number;
      avg_pnl_per_trade: number;
      profit_factor: number;
    };
    ml: {
      avg_confidence: number;
      accuracy: number;
      prediction_latency_ms: number;
    };
    risk: {
      max_drawdown: number;
      var_95: number;
      volatility: number;
    };
    system: {
      memory_mb: number;
      cpu_percent: number;
      uptime_hours: number;
    };
  };
  alerts: {
    total_sent: number;
    by_level: {
      INFO?: number;
      WARNING?: number;
      CRITICAL?: number;
      EMERGENCY?: number;
    };
    channels_enabled: {
      email: boolean;
      webhook: boolean;
      sms: boolean;
    };
  };
  health: {
    overall_status: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY' | 'CRITICAL';
    components: {
      ml_system: string;
      strategy_engine: string;
      risk_manager: string;
      portfolio_manager: string;
      ensemble_voting: string;
    };
    dependencies: {
      okx_api: string;
      database: string;
      cache: string;
      websocket: string;
    };
  };
}

interface AlertItem {
  level: 'INFO' | 'WARNING' | 'CRITICAL' | 'EMERGENCY';
  title: string;
  message: string;
  timestamp: number;
  channels: string[];
}

interface HealthStatusData {
  overall_status: string;
  components: Record<string, string>;
  dependencies: Record<string, string>;
  recommendations: string[];
  bot_status: string;
  bot_uptime: number;
}

const MonitoringPanel: React.FC = () => {
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [health, setHealth] = useState<HealthStatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const API_BASE = 'http://64.226.70.149:3001'; // VPS production endpoint

  // Fetch monitoring summary
  const fetchMonitoringSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/monitoring/summary`);
      if (!response.ok) throw new Error('Failed to fetch monitoring summary');
      const data = await response.json();
      setSummary(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  // Fetch alert history
  const fetchAlerts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/monitoring/alerts?limit=10`);
      if (!response.ok) throw new Error('Failed to fetch alerts');
      const data = await response.json();
      setAlerts(data.alerts || []);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    }
  };

  // Fetch health status
  const fetchHealth = async () => {
    try {
      const response = await fetch(`${API_BASE}/health`);
      if (!response.ok) throw new Error('Failed to fetch health status');
      const data = await response.json();
      setHealth(data);
    } catch (err) {
      console.error('Failed to fetch health:', err);
    }
  };

  // Initial load
  useEffect(() => {
    const fetchAll = async () => {
      setLoading(true);
      await Promise.all([
        fetchMonitoringSummary(),
        fetchAlerts(),
        fetchHealth()
      ]);
      setLoading(false);
    };

    fetchAll();

    // Refresh every 10 seconds
    const interval = setInterval(fetchAll, 10000);
    return () => clearInterval(interval);
  }, []);

  // Helper functions
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-500';
      case 'DEGRADED': return 'text-yellow-500';
      case 'UNHEALTHY': return 'text-orange-500';
      case 'CRITICAL': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'HEALTHY': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'DEGRADED': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'UNHEALTHY': return <XCircle className="h-5 w-5 text-orange-500" />;
      case 'CRITICAL': return <XCircle className="h-5 w-5 text-red-500" />;
      default: return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getAlertColor = (level: string) => {
    switch (level) {
      case 'INFO': return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'WARNING': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'CRITICAL': return 'bg-orange-50 border-orange-200 text-orange-800';
      case 'EMERGENCY': return 'bg-red-50 border-red-200 text-red-800';
      default: return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const formatTimestamp = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('pl-PL', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-500" />
        <AlertDescription className="text-red-800">
          Błąd połączenia z systemem monitoringu: {error}
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          System Monitoringu
        </h2>
        {summary?.performance.monitoring_active && (
          <div className="flex items-center gap-2 text-green-600">
            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="text-sm font-medium">Aktywny</span>
          </div>
        )}
      </div>

      {/* Overall Health Status */}
      {health && (
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Server className="h-5 w-5" />
              Status Systemu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              {getStatusIcon(health.overall_status)}
              <div>
                <p className={`text-lg font-bold ${getStatusColor(health.overall_status)}`}>
                  {health.overall_status}
                </p>
                <p className="text-sm text-gray-500">
                  Uptime: {Math.floor(health.bot_uptime / 3600)}h {Math.floor((health.bot_uptime % 3600) / 60)}m
                </p>
              </div>
            </div>

            {/* Components Status */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              {Object.entries(health.components).map(([name, status]) => (
                <div key={name} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                  {getStatusIcon(status)}
                  <div>
                    <p className="text-xs font-medium capitalize">{name.replace(/_/g, ' ')}</p>
                    <p className={`text-xs ${getStatusColor(status)}`}>{status}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Dependencies Status */}
            <div className="border-t pt-3">
              <p className="text-sm font-medium mb-2 flex items-center gap-1">
                <Database className="h-4 w-4" />
                Zależności
              </p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                {Object.entries(health.dependencies).map(([name, status]) => (
                  <div key={name} className="flex items-center gap-1 text-xs">
                    {getStatusIcon(status)}
                    <span className="capitalize">{name.replace(/_/g, ' ')}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Recommendations */}
            {health.recommendations && health.recommendations.length > 0 && (
              <div className="mt-3 p-2 bg-yellow-50 rounded border border-yellow-200">
                <p className="text-xs font-medium text-yellow-800 mb-1">Rekomendacje:</p>
                {health.recommendations.map((rec, idx) => (
                  <p key={idx} className="text-xs text-yellow-700">• {rec}</p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Performance Metrics */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Win Rate */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <TrendingUp className="h-4 w-4" />
                Win Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {(summary.performance.win_rate * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {summary.performance.total_trades} transakcji
              </p>
            </CardContent>
          </Card>

          {/* Sharpe Ratio */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Sharpe Ratio
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {summary.performance.sharpe_ratio.toFixed(2)}
              </p>
              <p className={`text-xs mt-1 ${summary.performance.sharpe_ratio >= 1.5 ? 'text-green-600' : 'text-yellow-600'}`}>
                {summary.performance.sharpe_ratio >= 1.5 ? 'Doskonały' : 'Wymaga poprawy'}
              </p>
            </CardContent>
          </Card>

          {/* Drawdown */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" />
                Drawdown
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`text-2xl font-bold ${summary.performance.current_drawdown > 0.10 ? 'text-red-500' : 'text-green-500'}`}>
                {(summary.performance.current_drawdown * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Max: {(summary.metrics.risk.max_drawdown * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>

          {/* ML Confidence */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-1">
                <Zap className="h-4 w-4" />
                ML Confidence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {(summary.metrics.ml.avg_confidence * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Dokładność: {(summary.metrics.ml.accuracy * 100).toFixed(1)}%
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ML Retrain Statistics */}
      {summary?.ml_retrain && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5" />
              Statystyki Auto-Retrain ML
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-sm text-gray-500">Całkowite retrain</p>
                <p className="text-xl font-bold">{summary.ml_retrain.total_retrains}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Sukces</p>
                <p className="text-xl font-bold text-green-600">
                  {(summary.ml_retrain.success_rate * 100).toFixed(0)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Śr. poprawa</p>
                <p className={`text-xl font-bold ${summary.ml_retrain.avg_performance_change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {summary.ml_retrain.avg_performance_change >= 0 ? '+' : ''}
                  {(summary.ml_retrain.avg_performance_change * 100).toFixed(1)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Ostatni retrain</p>
                <p className="text-sm font-medium">
                  {summary.ml_retrain.last_retrain ? formatTimestamp(summary.ml_retrain.last_retrain) : 'N/A'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Alert Statistics & Recent Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Alert Statistics */}
        {summary?.alerts && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Statystyki Alertów
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-gray-500">Całkowite alerty</p>
                  <p className="text-2xl font-bold">{summary.alerts.total_sent}</p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {Object.entries(summary.alerts.by_level).map(([level, count]) => (
                    <div key={level} className="p-2 bg-gray-50 rounded">
                      <p className="text-xs text-gray-500">{level}</p>
                      <p className="text-lg font-bold">{count}</p>
                    </div>
                  ))}
                </div>

                <div className="border-t pt-3">
                  <p className="text-sm font-medium mb-2">Kanały aktywne:</p>
                  <div className="flex gap-2">
                    {summary.alerts.channels_enabled.email && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded">Email</span>
                    )}
                    {summary.alerts.channels_enabled.webhook && (
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs rounded">Webhook</span>
                    )}
                    {summary.alerts.channels_enabled.sms && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded">SMS</span>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Recent Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Ostatnie Alerty
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {alerts.length > 0 ? (
                alerts.map((alert, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 rounded border ${getAlertColor(alert.level)}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs mt-1">{alert.message}</p>
                      </div>
                      <span className="text-xs font-medium ml-2">{alert.level}</span>
                    </div>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs opacity-75">
                        {formatTimestamp(alert.timestamp)}
                      </span>
                      <div className="flex gap-1">
                        {alert.channels.map((channel, cidx) => (
                          <span key={cidx} className="text-xs opacity-75">
                            {channel}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  Brak alertów
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Metrics */}
      {summary?.metrics && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Metryki Systemowe
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total PnL</p>
                <p className={`text-lg font-bold ${summary.metrics.trading.total_pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  ${summary.metrics.trading.total_pnl.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Profit Factor</p>
                <p className="text-lg font-bold">{summary.metrics.trading.profit_factor.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">VaR 95%</p>
                <p className="text-lg font-bold">{(summary.metrics.risk.var_95 * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Volatility</p>
                <p className="text-lg font-bold">{(summary.metrics.risk.volatility * 100).toFixed(2)}%</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Memory</p>
                <p className="text-lg font-bold">{summary.metrics.system.memory_mb.toFixed(0)} MB</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">CPU</p>
                <p className="text-lg font-bold">{summary.metrics.system.cpu_percent.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonitoringPanel;
