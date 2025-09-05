import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Avatar
} from '@mui/material';
import { 
  CheckCircle, 
  Error, 
  Warning, 
  TrendingUp, 
  TrendingDown,
  AccountBalance
} from '@mui/icons-material';

interface ActivityItem {
  id: string;
  type: 'trade' | 'alert' | 'system' | 'profit' | 'loss';
  message: string;
  timestamp: Date;
  amount?: number;
  symbol?: string;
  status: 'success' | 'error' | 'warning' | 'info';
}

interface ActivityFeedProps {
  maxItems?: number;
  refreshInterval?: number;
}

const ActivityFeed: React.FC<ActivityFeedProps> = ({ 
  maxItems = 10, 
  refreshInterval = 5000 
}) => {
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  // Mock activity generator
  const generateMockActivity = (): ActivityItem => {
    const types: ActivityItem['type'][] = ['trade', 'alert', 'system', 'profit', 'loss'];
    const symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT', 'ADA/USDT'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    const messages = {
      trade: [
        'Buy order executed successfully',
        'Sell order filled at market price',
        'Stop loss triggered',
        'Take profit reached',
        'Position opened for'
      ],
      alert: [
        'Price alert triggered for',
        'Volume spike detected on',
        'RSI oversold signal for',
        'MACD crossover on',
        'Support level broken for'
      ],
      system: [
        'Bot restarted successfully',
        'Strategy parameters updated',
        'Connection to exchange restored',
        'Risk management triggered',
        'Auto-balancing activated'
      ],
      profit: [
        'Profit target achieved on',
        'Successful scalp trade on',
        'Grid trade completed for',
        'Arbitrage opportunity captured on'
      ],
      loss: [
        'Stop loss executed for',
        'Market volatility caused loss on',
        'Position closed at loss for'
      ]
    };

    const symbol = symbols[Math.floor(Math.random() * symbols.length)];
    const messageTemplates = messages[type];
    const message = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
    
    let status: ActivityItem['status'];
    let amount: number | undefined;

    switch (type) {
      case 'profit':
        status = 'success';
        amount = Math.random() * 500 + 50;
        break;
      case 'loss':
        status = 'error';
        amount = -(Math.random() * 200 + 20);
        break;
      case 'alert':
        status = 'warning';
        break;
      case 'system':
        status = 'info';
        break;
      default:
        status = Math.random() > 0.7 ? 'success' : 'info';
        amount = type === 'trade' ? (Math.random() - 0.5) * 300 : undefined;
    }

    return {
      id: Math.random().toString(36).substr(2, 9),
      type,
      message: `${message} ${symbol}`,
      timestamp: new Date(),
      amount,
      symbol,
      status
    };
  };

  useEffect(() => {
    // Generate initial activities
    const initialActivities = Array.from({ length: 5 }, () => generateMockActivity());
    setActivities(initialActivities);

    // Set up interval for new activities
    const interval = setInterval(() => {
      const newActivity = generateMockActivity();
      setActivities(prev => [newActivity, ...prev.slice(0, maxItems - 1)]);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [maxItems, refreshInterval]);

  const getIcon = (type: ActivityItem['type'], status: ActivityItem['status']) => {
    const iconProps = { fontSize: 'small' as const };
    
    switch (type) {
      case 'profit':
        return <TrendingUp {...iconProps} color="success" />;
      case 'loss':
        return <TrendingDown {...iconProps} color="error" />;
      case 'trade':
        return <AccountBalance {...iconProps} color="primary" />;
      default:
        switch (status) {
          case 'success':
            return <CheckCircle {...iconProps} color="success" />;
          case 'error':
            return <Error {...iconProps} color="error" />;
          case 'warning':
            return <Warning {...iconProps} color="warning" />;
          default:
            return <CheckCircle {...iconProps} color="primary" />;
        }
    }
  };

  const getStatusColor = (status: ActivityItem['status']) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      default: return 'primary';
    }
  };

  const formatAmount = (amount: number) => {
    const sign = amount >= 0 ? '+' : '';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  };

  const formatTime = (timestamp: Date) => {
    return timestamp.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Activity Feed
          </Typography>
          <Chip 
            size="small" 
            label={`${activities.length} events`}
            variant="outlined"
          />
        </Box>
        
        <List sx={{ maxHeight: 400, overflowY: 'auto', p: 0 }}>
          {activities.map((activity, index) => (
            <ListItem
              key={activity.id}
              sx={{
                px: 0,
                py: 1,
                borderBottom: index < activities.length - 1 ? 1 : 0,
                borderColor: 'divider',
                animation: index === 0 ? 'fadeIn 0.5s ease-in' : 'none',
                '@keyframes fadeIn': {
                  from: { opacity: 0, transform: 'translateY(-10px)' },
                  to: { opacity: 1, transform: 'translateY(0)' }
                }
              }}
            >
              <ListItemIcon sx={{ minWidth: 40 }}>
                <Avatar sx={{ 
                  width: 32, 
                  height: 32, 
                  backgroundColor: 'transparent',
                  border: 1,
                  borderColor: `${getStatusColor(activity.status)}.main`
                }}>
                  {getIcon(activity.type, activity.status)}
                </Avatar>
              </ListItemIcon>
              
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ flexGrow: 1 }}>
                      {activity.message}
                    </Typography>
                    {activity.amount && (
                      <Chip
                        size="small"
                        label={formatAmount(activity.amount)}
                        color={activity.amount >= 0 ? 'success' : 'error'}
                        variant="outlined"
                      />
                    )}
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {formatTime(activity.timestamp)}
                  </Typography>
                }
              />
            </ListItem>
          ))}
        </List>
        
        <Box sx={{ mt: 2, textAlign: 'center' }}>
          <Typography variant="caption" color="text.secondary">
            Real-time activity monitoring
          </Typography>
        </Box>
      </CardContent>
    </Card>
  );
};

export default ActivityFeed;
