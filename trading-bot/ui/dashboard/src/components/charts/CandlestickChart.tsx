import React, { useState } from 'react';
import { Card, CardContent, Typography, Box, ToggleButton, ToggleButtonGroup } from '@mui/material';

interface CandleData {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface CandlestickChartProps {
  symbol?: string;
  data?: CandleData[];
  height?: number;
}

// Mock candlestick data for BTC/USDT
const mockCandleData: CandleData[] = [
  { time: '09:00', open: 44800, high: 45200, low: 44600, close: 45100, volume: 1250 },
  { time: '09:15', open: 45100, high: 45300, low: 44900, close: 44950, volume: 890 },
  { time: '09:30', open: 44950, high: 45400, low: 44800, close: 45350, volume: 1560 },
  { time: '09:45', open: 45350, high: 45600, low: 45200, close: 45480, volume: 920 },
  { time: '10:00', open: 45480, high: 45700, low: 45300, close: 45650, volume: 1340 },
  { time: '10:15', open: 45650, high: 45800, low: 45400, close: 45420, volume: 760 },
  { time: '10:30', open: 45420, high: 45500, low: 45100, close: 45280, volume: 1100 },
  { time: '10:45', open: 45280, high: 45450, low: 45000, close: 45180, volume: 980 },
];

const CandlestickChart: React.FC<CandlestickChartProps> = ({ 
  symbol = 'BTC/USDT', 
  data = mockCandleData, 
  height = 400 
}) => {
  const [timeframe, setTimeframe] = useState('15m');

  const formatPrice = (value: number) => {
    return `$${value.toLocaleString()}`;
  };

  const formatVolume = (value: number) => {
    return `${(value / 1000).toFixed(1)}K`;
  };

  const currentPrice = data[data.length - 1]?.close || 0;
  const previousPrice = data[data.length - 2]?.close || 0;
  const priceChange = currentPrice - previousPrice;
  const priceChangePercent = (priceChange / previousPrice) * 100;

  // Calculate price range for scaling
  const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const priceRange = maxPrice - minPrice;

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {symbol} Price Chart
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Typography variant="h5" fontWeight="bold">
                {formatPrice(currentPrice)}
              </Typography>
              <Typography 
                variant="body1" 
                color={priceChange >= 0 ? 'success.main' : 'error.main'}
                sx={{ display: 'flex', alignItems: 'center' }}
              >
                {priceChange >= 0 ? '+' : ''}{formatPrice(priceChange)} 
                ({priceChange >= 0 ? '+' : ''}{priceChangePercent.toFixed(2)}%)
              </Typography>
            </Box>
          </Box>
          
          <ToggleButtonGroup
            value={timeframe}
            exclusive
            onChange={(_, newTimeframe) => newTimeframe && setTimeframe(newTimeframe)}
            size="small"
          >
            <ToggleButton value="5m">5m</ToggleButton>
            <ToggleButton value="15m">15m</ToggleButton>
            <ToggleButton value="1h">1h</ToggleButton>
            <ToggleButton value="4h">4h</ToggleButton>
            <ToggleButton value="1d">1d</ToggleButton>
          </ToggleButtonGroup>
        </Box>

        {/* Chart Container */}
        <Box sx={{ 
          backgroundColor: 'rgba(255,255,255,0.05)',
          p: 2,
          borderRadius: 2,
          height: height || 400
        }}>
          <svg width="100%" height="100%" viewBox="0 0 800 360">
            {/* Grid */}
            <defs>
              <pattern id="chartGrid" width="40" height="30" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 30" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="300" fill="url(#chartGrid)" />
            
            {/* Candlesticks */}
            {data.map((candle, index) => {
              const x = (index / (data.length - 1)) * 760 + 20;
              const candleWidth = 12;
              
              // Scale prices to chart height
              const high = 280 - ((candle.high - minPrice) / priceRange * 260);
              const low = 280 - ((candle.low - minPrice) / priceRange * 260);
              const open = 280 - ((candle.open - minPrice) / priceRange * 260);
              const close = 280 - ((candle.close - minPrice) / priceRange * 260);
              
              const isGreen = candle.close >= candle.open;
              const bodyTop = Math.min(open, close);
              const bodyHeight = Math.abs(close - open);
              
              return (
                <g key={index}>
                  {/* Wick */}
                  <line
                    x1={x}
                    y1={high}
                    x2={x}
                    y2={low}
                    stroke={isGreen ? "#4caf50" : "#f44336"}
                    strokeWidth={1}
                  />
                  
                  {/* Body */}
                  <rect
                    x={x - candleWidth / 2}
                    y={bodyTop}
                    width={candleWidth}
                    height={Math.max(bodyHeight, 1)}
                    fill={isGreen ? "#4caf50" : "#f44336"}
                    stroke={isGreen ? "#4caf50" : "#f44336"}
                    strokeWidth={1}
                    opacity={isGreen ? 0.8 : 1}
                  />
                  
                  {/* Volume bar */}
                  <rect
                    x={x - 6}
                    y={320}
                    width={12}
                    height={Math.min((candle.volume / Math.max(...data.map(d => d.volume))) * 30, 30)}
                    fill="rgba(33, 150, 243, 0.5)"
                  />
                </g>
              );
            })}
            
            {/* Price labels */}
            <text x="5" y="25" fill="#888" fontSize="12">{formatPrice(maxPrice)}</text>
            <text x="5" y="150" fill="#888" fontSize="12">{formatPrice((maxPrice + minPrice) / 2)}</text>
            <text x="5" y="275" fill="#888" fontSize="12">{formatPrice(minPrice)}</text>
            
            {/* Time labels */}
            {data.map((candle, index) => {
              if (index % 2 === 0) {
                const x = (index / (data.length - 1)) * 760 + 20;
                return (
                  <text key={index} x={x} y="375" textAnchor="middle" fill="#888" fontSize="10">
                    {candle.time}
                  </text>
                );
              }
              return null;
            })}
          </svg>
        </Box>

        {/* Chart Stats */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          mt: 2,
          p: 2,
          backgroundColor: 'rgba(255,255,255,0.03)',
          borderRadius: 1
        }}>
          <Typography variant="body2" color="text.secondary">
            📊 {data.length} candles ({timeframe})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📈 Range: {formatPrice(minPrice)} - {formatPrice(maxPrice)}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            📦 Volume: {formatVolume(data.reduce((sum, d) => sum + d.volume, 0))}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default CandlestickChart;
