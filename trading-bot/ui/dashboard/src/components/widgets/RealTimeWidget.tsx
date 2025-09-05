import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Chip, 
  CircularProgress,
  Avatar 
} from '@mui/material';
import { TrendingUp, TrendingDown, SwapHoriz } from '@mui/icons-material';
// import { useTradingSelectors } from '../../store/tradingStore';

interface RealTimeData {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdate: Date;
}

interface RealTimeWidgetProps {
  symbols?: string[];
  refreshInterval?: number;
}

const RealTimeWidget: React.FC<RealTimeWidgetProps> = ({ 
  symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'], 
  refreshInterval = 5000  // Zwiększona częstotliwość do 5 sekund
}) => {
  const [data, setData] = useState<RealTimeData[]>([]);
  const [loading, setLoading] = useState(true);

  // Nie używamy prices ze store - używamy mock data
  // const { prices } = useTradingSelectors();

  useEffect(() => {
    // Initial load
    const initialData = symbols.map(symbol => {
      const basePrice = symbol.includes('BTC') ? 45000 : 
                       symbol.includes('ETH') ? 2800 : 450;
      
      return {
        symbol,
        price: Math.round(basePrice * 100) / 100,
        change: 0,
        changePercent: 0,
        volume: Math.round(Math.random() * 1000000),
        lastUpdate: new Date()
      };
    });
    
    setData(initialData);
    setLoading(false);

    // Set up interval for real-time updates
    const interval = setInterval(() => {
      const now = new Date();
      
      const newData = symbols.map(symbol => {
        const basePrice = symbol.includes('BTC') ? 45000 : 
                         symbol.includes('ETH') ? 2800 : 450;
        
        // Bardziej realistyczne zmiany cen - mniejsze wahania
        const variation = (Math.random() - 0.5) * 0.005; // ±0.25% variation
        const price = basePrice * (1 + variation);
        const change = basePrice * variation;
        const changePercent = variation * 100;
        
        return {
          symbol,
          price: Math.round(price * 100) / 100,
          change: Math.round(change * 100) / 100,
          changePercent: Math.round(changePercent * 100) / 100,
          volume: Math.round(Math.random() * 1000000),
          lastUpdate: now
        };
      });

      setData(newData);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [symbols, refreshInterval]);

  const formatPrice = (price: number, symbol: string) => {
    if (symbol.includes('BTC')) return `$${price.toLocaleString()}`;
    if (symbol.includes('ETH')) return `$${price.toLocaleString()}`;
    return `$${price.toFixed(2)}`;
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  const getTrendIcon = (change: number) => {
    if (change > 0) return <TrendingUp sx={{ fontSize: 16 }} />;
    if (change < 0) return <TrendingDown sx={{ fontSize: 16 }} />;
    return <SwapHoriz sx={{ fontSize: 16 }} />;
  };

  const getTrendColor = (change: number) => {
    if (change > 0) return 'success.main';
    if (change < 0) return 'error.main';
    return 'text.secondary';
  };

  if (loading) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
            <CircularProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Live Prices
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary">
              {data.length > 0 ? `Updated ${data[0].lastUpdate.toLocaleTimeString()}` : 'Loading...'}
            </Typography>
            <Chip 
              size="small" 
              label="LIVE" 
              color="success" 
              variant="outlined"
            />
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {data.map((item, index) => (
            <Box 
              key={index}
              sx={{ 
                display: 'flex', 
                alignItems: 'center',
                p: 1,
                borderRadius: 1,
                backgroundColor: 'rgba(255,255,255,0.05)',
                transition: 'all 0.3s ease'
              }}
            >
              <Avatar 
                sx={{ 
                  width: 32, 
                  height: 32, 
                  mr: 2,
                  backgroundColor: getTrendColor(item.change),
                  fontSize: 12
                }}
              >
                {item.symbol.split('/')[0].slice(0, 2)}
              </Avatar>
              
              <Box sx={{ flexGrow: 1 }}>
                <Typography variant="body2" fontWeight="bold">
                  {item.symbol}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Vol: {formatVolume(item.volume)}
                </Typography>
              </Box>
              
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="body1" fontWeight="bold">
                  {formatPrice(item.price, item.symbol)}
                </Typography>
                <Box sx={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'flex-end',
                  color: getTrendColor(item.change)
                }}>
                  {getTrendIcon(item.change)}
                  <Typography variant="caption" sx={{ ml: 0.5 }}>
                    {item.changePercent > 0 ? '+' : ''}{item.changePercent.toFixed(2)}%
                  </Typography>
                </Box>
              </Box>
            </Box>
          ))}
        </Box>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Last update: {data[0]?.lastUpdate.toLocaleTimeString()}
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default RealTimeWidget;
