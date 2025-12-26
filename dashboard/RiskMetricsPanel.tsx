/**
 * 🚀 TIER 2.2: Risk Metrics Panel - Advanced Risk Analytics Display
 * VaR, Kelly Criterion, Monte Carlo visualization
 */

import React from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

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

interface PortfolioData {
  totalValue: number;
  drawdown: number;
  sharpeRatio: number;
}

interface RiskMetricsPanelProps {
  varMetrics: VaRMetrics | null;
  kellyMetrics: KellyMetrics | null;
  portfolio: PortfolioData | null;
}

const RiskMetricsPanel: React.FC<RiskMetricsPanelProps> = ({
  varMetrics,
  kellyMetrics,
  portfolio
}) => {
  const formatPercent = (value: number) => `${(value * 100).toFixed(2)}%`;
  const formatCurrency = (value: number) => `$${value.toFixed(2)}`;

  const getVaRColor = (var_value: number) => {
    if (var_value < 0.03) return 'bg-green-500';
    if (var_value < 0.05) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getKellyColorClass = (fraction: number) => {
    if (fraction < 0.01) return 'bg-red-500 text-white';
    if (fraction < 0.05) return 'bg-yellow-500 text-black';
    if (fraction > 0.3) return 'bg-orange-500 text-white';
    return 'bg-green-500 text-white';
  };

  const getDrawdownSeverity = (drawdown: number) => {
    const absDrawdown = Math.abs(drawdown);
    if (absDrawdown < 0.05) return { color: 'text-green-600', label: 'Low Risk' };
    if (absDrawdown < 0.10) return { color: 'text-yellow-600', label: 'Moderate' };
    if (absDrawdown < 0.15) return { color: 'text-orange-600', label: 'High Risk' };
    return { color: 'text-red-600', label: 'Critical' };
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>📊 Advanced Risk Analytics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Value at Risk (VaR) */}
        {varMetrics && (
          <div>
            <h3 className="text-sm font-semibold mb-3 flex items-center justify-between">
              <span>Value at Risk (VaR)</span>
              <Badge className="border border-gray-300">{formatPercent(varMetrics.confidence)} Confidence</Badge>
            </h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Parametric VaR</span>
                  <span className="font-semibold">{formatPercent(varMetrics.parametric)}</span>
                </div>
                <Progress 
                  value={Math.min(100, (varMetrics.parametric / 0.10) * 100)}
                  className={getVaRColor(varMetrics.parametric)}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Historical VaR</span>
                  <span className="font-semibold">{formatPercent(varMetrics.historical)}</span>
                </div>
                <Progress 
                  value={Math.min(100, (varMetrics.historical / 0.10) * 100)}
                  className={getVaRColor(varMetrics.historical)}
                />
              </div>

              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">Monte Carlo VaR</span>
                  <span className="font-semibold">{formatPercent(varMetrics.monteCarlo)}</span>
                </div>
                <Progress 
                  value={Math.min(100, (varMetrics.monteCarlo / 0.10) * 100)}
                  className={getVaRColor(varMetrics.monteCarlo)}
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-2">
              Last updated: {new Date(varMetrics.timestamp).toLocaleTimeString()}
            </p>
          </div>
        )}

        {/* Kelly Criterion */}
        {kellyMetrics && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3">💰 Kelly Criterion</h3>
            
            <div className="space-y-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm text-gray-600">Optimal Position Size</span>
                  <Badge className={getKellyColorClass(kellyMetrics.adjustedFraction)}>
                    {formatPercent(kellyMetrics.adjustedFraction)}
                  </Badge>
                </div>
                <div className="text-xs text-gray-500">
                  Full Kelly: {formatPercent(kellyMetrics.optimalFraction)} × 0.25 safety
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-gray-600">Win Rate</p>
                  <p className="font-semibold">{formatPercent(kellyMetrics.winRate)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Win/Loss Ratio</p>
                  <p className="font-semibold">
                    {(kellyMetrics.avgWin / kellyMetrics.avgLoss).toFixed(2)}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Win</p>
                  <p className="font-semibold text-green-600">{formatCurrency(kellyMetrics.avgWin)}</p>
                </div>
                <div>
                  <p className="text-gray-600">Avg Loss</p>
                  <p className="font-semibold text-red-600">{formatCurrency(kellyMetrics.avgLoss)}</p>
                </div>
              </div>
            </div>

            {kellyMetrics.adjustedFraction < 0.01 && (
              <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                ⚠️ Low Kelly fraction suggests reducing position sizes
              </div>
            )}

            {kellyMetrics.optimalFraction < 0 && (
              <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-800">
                🚨 Negative Kelly - Strategy may be losing edge!
              </div>
            )}
          </div>
        )}

        {/* Portfolio Risk Summary */}
        {portfolio && (
          <div className="pt-4 border-t">
            <h3 className="text-sm font-semibold mb-3">🛡️ Portfolio Risk</h3>
            
            <div className="space-y-3">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm text-gray-600">Current Drawdown</span>
                  <span className={`text-sm font-semibold ${getDrawdownSeverity(portfolio.drawdown).color}`}>
                    {formatPercent(portfolio.drawdown)}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Progress 
                    value={Math.min(100, (Math.abs(portfolio.drawdown) / 0.30) * 100)}
                    className="flex-1"
                  />
                  <Badge className="border border-gray-300 text-xs">
                    {getDrawdownSeverity(portfolio.drawdown).label}
                  </Badge>
                </div>
              </div>

              <div className="bg-blue-50 p-3 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Sharpe Ratio</span>
                  <span className="text-lg font-bold text-blue-600">
                    {portfolio.sharpeRatio.toFixed(2)}
                  </span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {portfolio.sharpeRatio > 2 ? 'Excellent' : 
                   portfolio.sharpeRatio > 1 ? 'Good' : 
                   portfolio.sharpeRatio > 0 ? 'Acceptable' : 'Poor'} risk-adjusted returns
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Risk Alerts Summary */}
        <div className="pt-4 border-t">
          <h3 className="text-sm font-semibold mb-2">🚨 Risk Status</h3>
          <div className="space-y-2">
            {varMetrics && varMetrics.parametric > 0.05 && (
              <div className="text-xs p-2 bg-red-50 text-red-700 rounded">
                High VaR detected - Consider reducing exposure
              </div>
            )}
            {portfolio && Math.abs(portfolio.drawdown) > 0.15 && (
              <div className="text-xs p-2 bg-red-50 text-red-700 rounded">
                Critical drawdown level - Emergency stop may trigger
              </div>
            )}
            {kellyMetrics && kellyMetrics.adjustedFraction < 0.01 && (
              <div className="text-xs p-2 bg-yellow-50 text-yellow-700 rounded">
                Kelly suggests minimal position sizing
              </div>
            )}
            {(!varMetrics || varMetrics.parametric <= 0.05) && 
             (!portfolio || Math.abs(portfolio.drawdown) <= 0.15) &&
             (!kellyMetrics || kellyMetrics.adjustedFraction >= 0.01) && (
              <div className="text-xs p-2 bg-green-50 text-green-700 rounded">
                ✅ All risk metrics within acceptable ranges
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RiskMetricsPanel;
