/**
 * 🚀 TIER 2.2: Strategy Performance Panel
 * Multi-strategy comparison, win rates, PnL analysis
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StrategyData {
  name: string;
  totalTrades: number;
  winRate: number;
  totalPnL: number;
  avgWin: number;
  avgLoss: number;
  lastSignal: {
    action: 'BUY' | 'SELL' | 'HOLD';
    confidence: number;
    timestamp: number;
  } | null;
  isActive: boolean;
}

const StrategyPerformancePanel: React.FC = () => {
  const [strategies, setStrategies] = useState<StrategyData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStrategies = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/signals');
        if (!response.ok) throw new Error('Failed to fetch strategy data');
        
        const data = await response.json();
        setStrategies(data.strategies || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchStrategies();
    const interval = setInterval(fetchStrategies, 10000); // Update every 10s
    return () => clearInterval(interval);
  }, []);

  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 0.6) return 'bg-green-500';
    if (winRate >= 0.5) return 'bg-blue-500';
    if (winRate >= 0.4) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getSignalBadge = (signal: StrategyData['lastSignal']) => {
    if (!signal) return <Badge className="border border-gray-300">No Signal</Badge>;
    
    const classNameMap: Record<string, string> = {
      'buy': 'bg-green-500 text-white',
      'sell': 'bg-red-500 text-white',
      'hold': 'bg-gray-500 text-white'
    };
    
    return (
      <Badge className={classNameMap[signal.action.toLowerCase()] || 'bg-gray-500 text-white'}>
        {signal.action} ({formatPercent(signal.confidence)})
      </Badge>
    );
  };

  // Prepare data for bar chart
  const chartData = strategies.map(s => ({
    name: s.name,
    winRate: s.winRate * 100,
    totalTrades: s.totalTrades
  }));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>⚡ Strategy Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading strategy data...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>⚡ Strategy Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-red-500">Error: {error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>⚡ Strategy Performance</span>
          <Badge className="border border-gray-300">{strategies.filter(s => s.isActive).length} Active</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Win Rate Comparison Chart */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Win Rate Comparison</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis domain={[0, 100]} />
              <Tooltip 
                formatter={(value, name) => {
                  if (name === 'winRate') return [`${Number(value).toFixed(2)}%`, 'Win Rate'];
                  return [value, name];
                }}
              />
              <Legend />
              <Bar dataKey="winRate" fill="#10b981" name="Win Rate %" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Strategy Details Table */}
        <div>
          <h3 className="text-sm font-semibold mb-3">Strategy Details</h3>
          <div className="space-y-3">
            {strategies.map((strategy) => (
              <div 
                key={strategy.name} 
                className={`p-4 rounded-lg border ${strategy.isActive ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{strategy.name}</h4>
                    {strategy.isActive && <Badge className="bg-green-500 text-white">Active</Badge>}
                  </div>
                  {getSignalBadge(strategy.lastSignal)}
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-gray-600">Total Trades</p>
                    <p className="font-semibold">{strategy.totalTrades}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Win Rate</p>
                    <div className="flex items-center gap-2">
                      <p className="font-semibold">{formatPercent(strategy.winRate)}</p>
                      <div className={`w-2 h-2 rounded-full ${getWinRateColor(strategy.winRate)}`}></div>
                    </div>
                  </div>
                  <div>
                    <p className="text-gray-600">Total PnL</p>
                    <p className={`font-semibold ${getPnLColor(strategy.totalPnL)}`}>
                      {formatCurrency(strategy.totalPnL)}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mt-3 pt-3 border-t text-sm">
                  <div>
                    <p className="text-gray-600">Avg Win</p>
                    <p className="font-semibold text-green-600">{formatCurrency(strategy.avgWin)}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Avg Loss</p>
                    <p className="font-semibold text-red-600">{formatCurrency(strategy.avgLoss)}</p>
                  </div>
                </div>

                {strategy.lastSignal && (
                  <div className="mt-3 pt-3 border-t text-xs text-gray-500">
                    Last signal: {new Date(strategy.lastSignal.timestamp).toLocaleString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Performance Summary */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-3">📊 Overall Summary</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Total Trades (All Strategies)</p>
              <p className="text-xl font-bold">
                {strategies.reduce((sum, s) => sum + s.totalTrades, 0)}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Combined Win Rate</p>
              <p className="text-xl font-bold">
                {formatPercent(
                  strategies.reduce((sum, s) => sum + (s.winRate * s.totalTrades), 0) /
                  strategies.reduce((sum, s) => sum + s.totalTrades, 0) || 0
                )}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Total PnL (All Strategies)</p>
              <p className={`text-xl font-bold ${getPnLColor(strategies.reduce((sum, s) => sum + s.totalPnL, 0))}`}>
                {formatCurrency(strategies.reduce((sum, s) => sum + s.totalPnL, 0))}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-gray-600">Best Performer</p>
              <p className="text-xl font-bold">
                {strategies.length > 0 ? 
                  strategies.reduce((best, s) => s.totalPnL > best.totalPnL ? s : best).name :
                  'N/A'
                }
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default StrategyPerformancePanel;
