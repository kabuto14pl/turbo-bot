import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  LinearProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AccountBalance,
  Speed,
  Timeline,
  Assessment,
} from '@mui/icons-material';

// Import components and hooks
import ProfitChart from '../components/charts/ProfitChart';
import VolumeChart from '../components/charts/VolumeChart';
import CandlestickChart from '../components/charts/CandlestickChart';
// import RealTimeWidget from '../components/widgets/RealTimeWidget';
import SimpleRealTimeWidget from '../components/widgets/SimpleRealTimeWidget';
// import ProfessionalRealTimeWidget from '../components/widgets/ProfessionalRealTimeWidget';
import ActivityFeed from '../components/widgets/ActivityFeed';
import BotControlPanel from '../components/BotControlPanel';
import StrategyControlPanel from '../components/StrategyControlPanel';
import { useTradingSelectors } from '../store/tradingStore';
// import { useWebSocket } from '../hooks/useWebSocket';

const Dashboard: React.FC = () => {
  // WebSocket connection - DISABLED TEMPORARILY
  // const { connectionStatus, isConnecting } = useWebSocket({
  //   url: 'ws://localhost:9091'
  // });
  const connectionStatus = 'connected' as 'connected' | 'disconnected' | 'connecting' | 'error';
  const isConnecting = false;

  // Store selectors
  const { portfolio, strategies, systemStatus } = useTradingSelectors();

  // Calculated values from store data
  const portfolioValue = portfolio?.totalValue || 0;
  const dailyPnL = portfolio?.dailyPnL || 0;
  const dailyPnLPercent = portfolio?.dailyPnLPercent || 0;
  const totalPositions = portfolio?.positions?.length || 0;

  // System metrics from store
  const systemMetrics = [
    { label: 'System Uptime', value: systemStatus?.uptime || '0%', color: 'success' },
    { label: 'API Latency', value: `${systemStatus?.latency || 0}ms`, color: 'success' },
    { label: 'Orders/Hour', value: systemStatus?.ordersPerHour?.toString() || '0', color: 'primary' },
    { label: 'Active Strategies', value: strategies.filter((s: any) => s.status === 'active').length.toString(), color: 'primary' },
  ];

  // Loading state
  if (isConnecting) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress size={60} />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Łączenie z systemem tradingowym...
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1, p: 3 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Trading Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Real-time monitoring and analytics for your trading bot
        </Typography>
      </Box>

      {/* Connection Status Alert */}
      {connectionStatus !== 'connected' && (
        <Alert 
          severity={connectionStatus === 'error' ? 'error' : 'warning'} 
          sx={{ mb: 3 }}
        >
          {connectionStatus === 'connecting' && 'Łączenie z systemem tradingowym...'}
          {connectionStatus === 'disconnected' && 'Połączenie z systemem tradingowym zostało przerwane. Dane mogą być nieaktualne.'}
          {connectionStatus === 'error' && 'Błąd połączenia z systemem tradingowym. Sprawdź status serwera.'}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Portfolio Overview */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <AccountBalance sx={{ mr: 1, color: 'primary.main' }} />
                <Typography variant="h6">Portfolio Value</Typography>
              </Box>
              <Typography variant="h3" color="primary.main" gutterBottom>
                ${portfolioValue.toLocaleString()}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {dailyPnL >= 0 ? (
                  <TrendingUp sx={{ color: 'success.main', mr: 0.5 }} />
                ) : (
                  <TrendingDown sx={{ color: 'error.main', mr: 0.5 }} />
                )}
                <Typography
                  variant="body1"
                  color={dailyPnL >= 0 ? 'success.main' : 'error.main'}
                >
                  {dailyPnL >= 0 ? '+' : ''}${dailyPnL.toFixed(2)} ({dailyPnL >= 0 ? '+' : ''}{dailyPnLPercent}%)
                </Typography>
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Today's P&L
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Active Positions */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Assessment sx={{ mr: 1, color: 'warning.main' }} />
                <Typography variant="h6">Active Positions</Typography>
              </Box>
              <Typography variant="h3" color="warning.main" gutterBottom>
                {totalPositions}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
                <Box>
                  <Typography variant="h6" color="success.main">8</Typography>
                  <Typography variant="body2" color="text.secondary">Profitable</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" color="error.main">3</Typography>
                  <Typography variant="body2" color="text.secondary">Losing</Typography>
                </Box>
                <Box>
                  <Typography variant="h6" color="info.main">1</Typography>
                  <Typography variant="body2" color="text.secondary">Breakeven</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* System Status */}
        <Grid item xs={12} md={4}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Speed sx={{ mr: 1, color: 'info.main' }} />
                <Typography variant="h6">System Status</Typography>
                <Chip 
                  size="small" 
                  label="ONLINE" 
                  color="success" 
                  sx={{ ml: 'auto' }}
                />
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {systemMetrics.map((metric, index) => (
                  <Box key={index}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2" color="text.secondary">
                        {metric.label}
                      </Typography>
                      <Typography variant="body2" color={`${metric.color}.main`}>
                        {metric.value}
                      </Typography>
                    </Box>
                    <LinearProgress 
                      variant="determinate" 
                      value={85} 
                      color={metric.color as any}
                      sx={{ height: 4, borderRadius: 2 }}
                    />
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Real-Time Prices */}
        <Grid item xs={12} md={6}>
          <SimpleRealTimeWidget />
        </Grid>

        {/* Bot Control Panel */}
        <Grid item xs={12} md={6}>
          <BotControlPanel />
        </Grid>

        {/* Strategy Control Panel */}
        <Grid item xs={12}>
          <StrategyControlPanel />
        </Grid>

        {/* Profit Chart */}
        <Grid item xs={12} md={8}>
          <ProfitChart height={350} />
        </Grid>

        {/* Candlestick Chart */}
        <Grid item xs={12}>
          <CandlestickChart symbol="BTC/USDT" height={450} />
        </Grid>

        {/* Volume Chart */}
        <Grid item xs={12} md={6}>
          <VolumeChart height={350} />
        </Grid>

        {/* Activity Feed */}
        <Grid item xs={12} md={6}>
          <ActivityFeed />
        </Grid>

        {/* Strategy Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Strategy Performance
              </Typography>
              <List>
                {strategies.length > 0 ? strategies.map((strategy: any) => (
                  <ListItem
                    key={strategy.id}
                    sx={{
                      border: 1,
                      borderColor: 'divider',
                      borderRadius: 1,
                      mb: 1,
                      backgroundColor: 'rgba(255,255,255,0.02)',
                    }}
                  >
                    <ListItemIcon>
                      <Avatar sx={{ 
                        backgroundColor: strategy.status === 'active' ? 'success.main' : 
                                       strategy.status === 'paused' ? 'warning.main' : 'error.main',
                        width: 40,
                        height: 40
                      }}>
                        <Timeline />
                      </Avatar>
                    </ListItemIcon>
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="body1" fontWeight="bold">
                            {strategy.name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Chip
                              size="small"
                              label={strategy.status.toUpperCase()}
                              color={strategy.status === 'active' ? 'success' : 'warning'}
                              variant="outlined"
                            />
                            <Typography
                              variant="h6"
                              color={strategy.performance >= 0 ? 'success.main' : 'error.main'}
                            >
                              {strategy.performance > 0 ? '+' : ''}{strategy.performance?.toFixed(1) || '0.0'}%
                            </Typography>
                          </Box>
                        </Box>
                      }
                      secondary={`${strategy.totalTrades || 0} trades executed • ${strategy.status}`}
                    />
                  </ListItem>
                )) : (
                  <ListItem>
                    <ListItemText 
                      primary="No strategies loaded"
                      secondary="Connect to trading bot to see active strategies"
                    />
                  </ListItem>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
