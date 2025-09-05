import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip
} from '@mui/material';

interface BTCChartProps {
  height?: number;
}

const BTCChart: React.FC<BTCChartProps> = ({ height = 300 }) => {
  const [interval, setInterval] = useState('1d');

  // Mock BTC price data based on interval
  const generateMockData = (intervalType: string) => {
    const dataPoints = intervalType === '1m' ? 60 : intervalType === '1h' ? 24 : 30;
    const basePrice = 43500;
    const data = [];
    
    for (let i = 0; i < dataPoints; i++) {
      const variance = (Math.random() - 0.5) * 2000; // ±1000 USDT variance
      const price = basePrice + variance + (Math.sin(i / 5) * 500); // Add some trend
      data.push({
        time: i,
        price: Math.max(40000, Math.min(47000, price)), // Keep within realistic range
        volume: Math.random() * 1000000 + 500000
      });
    }
    
    return data;
  };

  const [chartData] = useState(generateMockData(interval));

  const handleIntervalChange = (newInterval: string) => {
    setInterval(newInterval);
    console.log('BTC Chart interval changed to:', newInterval);
    // In real app, this would fetch new data
  };

  const currentPrice = chartData[chartData.length - 1]?.price || 43500;
  const previousPrice = chartData[chartData.length - 2]?.price || 43400;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;

  const maxPrice = Math.max(...chartData.map(d => d.price));
  const minPrice = Math.min(...chartData.map(d => d.price));

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              BTC/USDT Chart
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h4" color={priceChange >= 0 ? 'success.main' : 'error.main'}>
                ${currentPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Typography>
              <Chip
                label={`${priceChange >= 0 ? '+' : ''}${priceChange.toFixed(2)} (${priceChangePercent.toFixed(2)}%)`}
                color={priceChange >= 0 ? 'success' : 'error'}
                size="small"
              />
            </Box>
          </Box>
          
          <FormControl size="small" sx={{ minWidth: 100 }}>
            <InputLabel>Interval</InputLabel>
            <Select
              value={interval}
              onChange={(e) => handleIntervalChange(e.target.value)}
              label="Interval"
            >
              <MenuItem value="1m">1m</MenuItem>
              <MenuItem value="5m">5m</MenuItem>
              <MenuItem value="15m">15m</MenuItem>
              <MenuItem value="1h">1h</MenuItem>
              <MenuItem value="4h">4h</MenuItem>
              <MenuItem value="1d">1d</MenuItem>
              <MenuItem value="1w">1w</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* Chart Area */}
        <Box sx={{ 
          backgroundColor: 'rgba(255,255,255,0.05)',
          p: 2,
          borderRadius: 2,
          height: height
        }}>
          <svg width="100%" height="100%" viewBox="0 0 800 260">
            {/* Grid */}
            <defs>
              <pattern id="btcGrid" width="50" height="26" patternUnits="userSpaceOnUse">
                <path d="M 50 0 L 0 0 0 26" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#btcGrid)" />
            
            {/* Price Line */}
            {chartData.map((point, index) => {
              const x = (index / (chartData.length - 1)) * 760 + 20;
              const normalizedPrice = ((point.price - minPrice) / (maxPrice - minPrice)) * 200 + 30;
              const y = 260 - normalizedPrice;
              
              return (
                <g key={index}>
                  {/* Price line */}
                  {index > 0 && (
                    <line
                      x1={(index - 1) / (chartData.length - 1) * 760 + 20}
                      y1={260 - (((chartData[index - 1].price - minPrice) / (maxPrice - minPrice)) * 200 + 30)}
                      x2={x}
                      y2={y}
                      stroke="#ffa726"
                      strokeWidth="2"
                    />
                  )}
                  
                  {/* Data points */}
                  <circle
                    cx={x}
                    cy={y}
                    r="3"
                    fill="#ffa726"
                    opacity="0.8"
                  />
                </g>
              );
            })}
            
            {/* Price labels */}
            <text x="20" y="20" fill="#888" fontSize="12">High: ${maxPrice.toFixed(0)}</text>
            <text x="20" y="250" fill="#888" fontSize="12">Low: ${minPrice.toFixed(0)}</text>
            <text x="680" y="140" fill="#888" fontSize="12">BTC/USDT</text>
          </svg>
        </Box>

        {/* Chart Info */}
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mt: 2 }}>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              24h High
            </Typography>
            <Typography variant="h6" color="success.main">
              ${maxPrice.toFixed(0)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              24h Low
            </Typography>
            <Typography variant="h6" color="error.main">
              ${minPrice.toFixed(0)}
            </Typography>
          </Box>
          <Box sx={{ textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Volume
            </Typography>
            <Typography variant="h6">
              {(chartData[chartData.length - 1]?.volume / 1000000).toFixed(2)}M
            </Typography>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
};

export default BTCChart;
