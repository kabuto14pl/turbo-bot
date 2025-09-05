import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

interface VolumeDataPoint {
  strategy: string;
  volume: number;
  trades: number;
}

interface VolumeChartProps {
  data?: VolumeDataPoint[];
  height?: number;
}

// Mock data for demonstration
const mockData: VolumeDataPoint[] = [
  { strategy: 'RSI Pro', volume: 12500, trades: 28 },
  { strategy: 'MACD Dynamic', volume: 9800, trades: 22 },
  { strategy: 'Momentum Plus', volume: 15200, trades: 35 },
  { strategy: 'Scalping Ultra', volume: 6700, trades: 45 },
  { strategy: 'Trend Master', volume: 11300, trades: 19 },
  { strategy: 'Grid Trading', volume: 8900, trades: 31 },
];

const VolumeChart: React.FC<VolumeChartProps> = ({ data = mockData }) => {
  const formatCurrency = (value: number) => {
    return `$${(value / 1000).toFixed(1)}k`;
  };

  const totalVolume = data.reduce((sum, item) => sum + item.volume, 0);
  const totalTrades = data.reduce((sum, item) => sum + item.trades, 0);
  const topStrategy = data.reduce((max, item) => item.volume > max.volume ? item : max, data[0]);
  const maxVolume = Math.max(...data.map(d => d.volume));

  const colors = ['#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Strategy Volume
        </Typography>
        
        {/* Summary Stats */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 3 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="primary.main">
              {formatCurrency(totalVolume)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Volume
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h5" color="success.main">
              {totalTrades}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Trades
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="h6" color="warning.main">
              {topStrategy?.strategy || 'N/A'}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Top Strategy
            </Typography>
          </Box>
        </Box>

        {/* Chart Visualization */}
        <Box sx={{ 
          backgroundColor: 'rgba(255,255,255,0.05)',
          p: 2,
          borderRadius: 2,
          height: 300
        }}>
          <svg width="100%" height="100%" viewBox="0 0 800 260">
            {/* Chart bars */}
            {data.map((item, index) => {
              const barWidth = 800 / data.length - 20;
              const x = (index * (800 / data.length)) + 10;
              const barHeight = (item.volume / maxVolume) * 200;
              const y = 260 - barHeight - 30;
              const color = colors[index % colors.length];
              
              return (
                <g key={index}>
                  {/* Bar */}
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barHeight}
                    fill={color}
                    opacity={0.8}
                    rx="4"
                  />
                  
                  {/* Volume label */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fill="#fff"
                    fontSize="10"
                  >
                    {formatCurrency(item.volume)}
                  </text>
                  
                  {/* Strategy name */}
                  <text
                    x={x + barWidth / 2}
                    y={250}
                    textAnchor="middle"
                    fill="#888"
                    fontSize="10"
                    transform={`rotate(-45 ${x + barWidth / 2} 250)`}
                  >
                    {item.strategy}
                  </text>
                  
                  {/* Trade count */}
                  <text
                    x={x + barWidth / 2}
                    y={y + barHeight / 2}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="bold"
                  >
                    {item.trades}
                  </text>
                </g>
              );
            })}
            
            {/* Y-axis labels */}
            <text x="5" y="20" fill="#888" fontSize="12">{formatCurrency(maxVolume)}</text>
            <text x="5" y="140" fill="#888" fontSize="12">{formatCurrency(maxVolume / 2)}</text>
            <text x="5" y="240" fill="#888" fontSize="12">$0</text>
          </svg>
        </Box>

        {/* Strategy Details */}
        <Box sx={{ 
          mt: 2,
          maxHeight: 150,
          overflowY: 'auto'
        }}>
          {data.map((item, index) => (
            <Box key={index} sx={{ 
              display: 'flex', 
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1,
              px: 2,
              mb: 1,
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderRadius: 1,
              borderLeft: 4,
              borderLeftColor: colors[index % colors.length]
            }}>
              <Typography variant="body2" fontWeight="500">{item.strategy}</Typography>
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body2" color="primary.main">
                  {formatCurrency(item.volume)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {item.trades} trades
                </Typography>
              </Box>
            </Box>
          ))}
        </Box>
      </CardContent>
    </Card>
  );
};

export default VolumeChart;
