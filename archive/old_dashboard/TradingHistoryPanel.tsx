/**
 * 🚀 TIER 2.2: Trading History Panel
 * Trade history table with filtering and export
 */

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';

interface Trade {
  id: string;
  timestamp: number;
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  quantity: number;
  pnl: number;
  strategy: string;
  commission: number;
  status: 'FILLED' | 'PARTIAL' | 'CANCELLED';
}

const TradingHistoryPanel: React.FC = () => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [strategyFilter, setStrategyFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    const fetchTrades = async () => {
      try {
        const response = await fetch('http://localhost:3001/api/trades');
        if (!response.ok) throw new Error('Failed to fetch trades');
        
        const data = await response.json();
        setTrades(data.trades || []);
        setLoading(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        setLoading(false);
      }
    };

    fetchTrades();
    const interval = setInterval(fetchTrades, 15000); // Update every 15s
    return () => clearInterval(interval);
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...trades];

    if (strategyFilter !== 'all') {
      filtered = filtered.filter(t => t.strategy === strategyFilter);
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter(t => t.action === actionFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(t => 
        t.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.id.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Sort by timestamp descending
    filtered.sort((a, b) => b.timestamp - a.timestamp);

    setFilteredTrades(filtered.slice(0, 50)); // Show last 50 trades
  }, [trades, strategyFilter, actionFilter, searchQuery]);

  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;
  const formatDateTime = (timestamp: number) => new Date(timestamp).toLocaleString();

  const getPnLColor = (pnl: number) => {
    return pnl >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getActionBadge = (action: 'BUY' | 'SELL') => {
    return action === 'BUY' ? 
      <Badge className="bg-green-500 text-white">BUY</Badge> : 
      <Badge className="bg-red-500 text-white">SELL</Badge>;
  };

  const getStatusBadge = (status: Trade['status']) => {
    const classNames: Record<string, string> = {
      FILLED: 'bg-green-500 text-white',
      PARTIAL: 'bg-yellow-500 text-black',
      CANCELLED: 'bg-red-500 text-white'
    };
    return <Badge className={classNames[status] || 'bg-gray-500 text-white'}>{status}</Badge>;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Timestamp', 'Symbol', 'Action', 'Price', 'Quantity', 'PnL', 'Strategy', 'Commission', 'Status'];
    const csvData = filteredTrades.map(t => [
      t.id,
      formatDateTime(t.timestamp),
      t.symbol,
      t.action,
      t.price,
      t.quantity,
      t.pnl,
      t.strategy,
      t.commission,
      t.status
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `trading_history_${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const uniqueStrategies = Array.from(new Set(trades.map(t => t.strategy)));

  const totalPnL = filteredTrades.reduce((sum, t) => sum + t.pnl, 0);
  const winningTrades = filteredTrades.filter(t => t.pnl > 0).length;
  const losingTrades = filteredTrades.filter(t => t.pnl < 0).length;

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📜 Trading History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading trading history...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>📜 Trading History</CardTitle>
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
          <span>📜 Trading History</span>
          <Badge className="border border-gray-300">{filteredTrades.length} Trades</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <Input
            placeholder="Search symbol or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          
          <Select value={strategyFilter} onChange={(e) => setStrategyFilter(e.target.value)}>
            <option value="all">All Strategies</option>
            {uniqueStrategies.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </Select>

          <Select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
            <option value="all">All Actions</option>
            <option value="BUY">BUY</option>
            <option value="SELL">SELL</option>
          </Select>

          <Button onClick={exportToCSV} className="border border-gray-300 bg-white hover:bg-gray-100">
            📥 Export CSV
          </Button>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-3 bg-gray-50 rounded-lg">
          <div>
            <p className="text-xs text-gray-600">Total PnL</p>
            <p className={`text-lg font-bold ${getPnLColor(totalPnL)}`}>
              {formatCurrency(totalPnL)}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Win Rate</p>
            <p className="text-lg font-bold">
              {((winningTrades / (winningTrades + losingTrades) * 100) || 0).toFixed(1)}%
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Winning Trades</p>
            <p className="text-lg font-bold text-green-600">{winningTrades}</p>
          </div>
          <div>
            <p className="text-xs text-gray-600">Losing Trades</p>
            <p className="text-lg font-bold text-red-600">{losingTrades}</p>
          </div>
        </div>

        {/* Trades Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-100 border-b">
              <tr>
                <th className="text-left p-2">Time</th>
                <th className="text-left p-2">Symbol</th>
                <th className="text-left p-2">Action</th>
                <th className="text-right p-2">Price</th>
                <th className="text-right p-2">Qty</th>
                <th className="text-right p-2">PnL</th>
                <th className="text-left p-2">Strategy</th>
                <th className="text-left p-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredTrades.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center p-8 text-gray-500">
                    No trades found matching filters
                  </td>
                </tr>
              ) : (
                filteredTrades.map((trade) => (
                  <tr key={trade.id} className="border-b hover:bg-gray-50">
                    <td className="p-2 text-xs">{formatDateTime(trade.timestamp)}</td>
                    <td className="p-2 font-semibold">{trade.symbol}</td>
                    <td className="p-2">{getActionBadge(trade.action)}</td>
                    <td className="p-2 text-right">{formatCurrency(trade.price)}</td>
                    <td className="p-2 text-right">{trade.quantity.toFixed(4)}</td>
                    <td className={`p-2 text-right font-semibold ${getPnLColor(trade.pnl)}`}>
                      {formatCurrency(trade.pnl)}
                    </td>
                    <td className="p-2 text-xs">{trade.strategy}</td>
                    <td className="p-2">{getStatusBadge(trade.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="text-xs text-gray-500 text-center pt-2">
          Showing last {filteredTrades.length} trades
          {filteredTrades.length === 50 && ' (limited to 50 most recent)'}
        </div>
      </CardContent>
    </Card>
  );
};

export default TradingHistoryPanel;
