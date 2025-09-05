import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface ProfitDataPoint {
  date: string;
  profit: number;
  cumulative: number;
}

interface ProfitChartProps {
  data?: ProfitDataPoint[];
  height?: number;
}

// Mock data for demonstration
const mockData: ProfitDataPoint[] = [
  { date: '09:00', profit: 150, cumulative: 150 },
  { date: '10:00', profit: -80, cumulative: 70 },
  { date: '11:00', profit: 220, cumulative: 290 },
  { date: '12:00', profit: 180, cumulative: 470 },
  { date: '13:00', profit: -120, cumulative: 350 },
  { date: '14:00', profit: 300, cumulative: 650 },
  { date: '15:00', profit: 95, cumulative: 745 },
  { date: '16:00', profit: -45, cumulative: 700 },
];

const ProfitChart: React.FC<ProfitChartProps> = ({ data = mockData }) => {
  const formatCurrency = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  const latestProfit = data[data.length - 1];
  const totalProfit = latestProfit?.cumulative || 0;
  const lastTrade = latestProfit?.profit || 0;

  // Calculate some basic stats
  const maxProfit = Math.max(...data.map(d => d.cumulative));
  const minProfit = Math.min(...data.map(d => d.cumulative));
  const totalTrades = data.length;
  const profitableTrades = data.filter(d => d.profit > 0).length;
  const winRate = (profitableTrades / totalTrades) * 100;

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Profit/Loss Chart
        </Typography>
        
        {/* Summary Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color={totalProfit >= 0 ? 'success.main' : 'error.main'}>
              {formatCurrency(totalProfit)}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Total P&L
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography 
              variant="h5" 
              color={lastTrade >= 0 ? 'success.main' : 'error.main'}
            >
              {lastTrade >= 0 ? '+' : ''}{formatCurrency(lastTrade)}
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Last Trade
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="primary.main">
              {winRate.toFixed(1)}%
            </Typography>
            <Typography variant="subtitle2" color="text.secondary">
              Win Rate
            </Typography>
          </Box>
        </Box>

        {/* Chart Visualization */}
        <Box sx={{ 
          backgroundColor: 'rgba(255,255,255,0.05)',
          p: 3,
          borderRadius: 2,
          position: 'relative',
          height: 300
        }}>
          {/* SVG Chart */}
          <svg width="100%" height="100%" viewBox="0 0 800 260">
            {/* Grid lines */}
            <defs>
              <pattern id="grid" width="40" height="26" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            
            {/* Data visualization */}
            {data.map((point, index) => {
              const x = (index / (data.length - 1)) * 760 + 20;
              const normalizedCumulative = ((point.cumulative - minProfit) / (maxProfit - minProfit)) * 200 + 30;
              const y = 260 - normalizedCumulative;
              
              return (
                <g key={index}>
                  {/* Cumulative line */}
                  {index > 0 && (
                    <line
                      x1={(index - 1) / (data.length - 1) * 760 + 20}
                      y1={260 - (((data[index - 1].cumulative - minProfit) / (maxProfit - minProfit)) * 200 + 30)}
                      x2={x}
                      y2={y}
                      stroke="#4caf50"
                      strokeWidth="3"
                    />
                  )}
                  
                  {/* Data points */}
                  <circle
                    cx={x}
                    cy={y}
                    r="4"
                    fill={point.profit >= 0 ? "#4caf50" : "#f44336"}
                    stroke="white"
                    strokeWidth="2"
                  />
                  
                  {/* Trade bars */}
                  <rect
                    x={x - 8}
                    y={point.profit >= 0 ? y - 15 : y + 5}
                    width="16"
                    height={Math.abs(point.profit) * 0.1}
                    fill={point.profit >= 0 ? "rgba(76, 175, 80, 0.6)" : "rgba(244, 67, 54, 0.6)"}
                  />
                </g>
              );
            })}
            
            {/* Labels */}
            <text x="20" y="20" fill="#888" fontSize="12">High: {formatCurrency(maxProfit)}</text>
            <text x="20" y="250" fill="#888" fontSize="12">Low: {formatCurrency(minProfit)}</text>
          </svg>
          
          {/* Legend */}
          <Box sx={{ 
            position: 'absolute', 
            bottom: 10, 
            right: 20,
            display: 'flex',
            gap: 2,
            backgroundColor: 'rgba(0,0,0,0.7)',
            p: 1,
            borderRadius: 1
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 3, backgroundColor: '#4caf50' }} />
              <Typography variant="caption">Cumulative</Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Box sx={{ width: 12, height: 3, backgroundColor: '#f44336' }} />
              <Typography variant="caption">Individual</Typography>
            </Box>
          </Box>
        </Box>

        {/* Additional Stats */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 2,
          p: 2,
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            📊 {totalTrades} total trades
          </Typography>
          <Typography variant="body2" color="success.main">
            ✅ {profitableTrades} profitable
          </Typography>
          <Typography variant="body2" color="error.main">
            ❌ {totalTrades - profitableTrades} losses
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ProfitChart;
