import React, { useState } from 'react'
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Avatar,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper
} from '@mui/material'
import { 
  TrendingUp, 
  TrendingDown, 
  Assessment,
  Timeline,
  ShowChart
} from '@mui/icons-material'
import ProfitChart from '../components/charts/ProfitChart'
import VolumeChart from '../components/charts/VolumeChart'
import BTCChart from '../components/charts/BTCChart'

const Analytics: React.FC = () => {
  const [timeframe, setTimeframe] = useState('1d')

  // Mock analytics data based on timeframe
  const getAnalyticsData = (tf: string) => {
    const baseData = {
      overview: {
        totalTrades: 156,
        winningTrades: 108,
        losingTrades: 48,
        winRate: 69.2,
        totalPnL: 3450.80,
        avgTradeSize: 850,
        maxDrawdown: 245.60,
        sharpeRatio: 1.85
      },
      performance: {
        daily: 125.50,
        weekly: 890.20,
        monthly: 3450.80,
        yearToDate: 12890.45
      },
      symbols: [
        { symbol: 'BTCUSDT', trades: 45, pnl: 1250.80, winRate: 72.1 },
        { symbol: 'ETHUSDT', trades: 38, pnl: 890.50, winRate: 68.4 },
        { symbol: 'BNBUSDT', trades: 32, pnl: 650.30, winRate: 65.6 },
        { symbol: 'ADAUSDT', trades: 25, pnl: 445.20, winRate: 60.0 },
        { symbol: 'DOTUSDT', trades: 16, pnl: 214.00, winRate: 62.5 }
      ],
      strategies: [
        { name: 'Enhanced RSI Turbo', trades: 68, pnl: 1890.45, winRate: 71.2, status: 'active' },
        { name: 'MACD Crossover', trades: 45, pnl: 980.30, winRate: 66.7, status: 'active' },
        { name: 'Bollinger Bands', trades: 32, pnl: 456.80, winRate: 59.4, status: 'paused' },
        { name: 'Moving Average', trades: 11, pnl: 123.25, winRate: 54.5, status: 'testing' }
      ]
    }

    // Adjust data based on timeframe
    const multipliers = {
      '1h': 0.1,
      '4h': 0.4,
      '1d': 1,
      '1w': 7,
      '1m': 30
    }
    
    const multiplier = multipliers[tf as keyof typeof multipliers] || 1
    
    return {
      ...baseData,
      overview: {
        ...baseData.overview,
        totalTrades: Math.round(baseData.overview.totalTrades * multiplier),
        totalPnL: baseData.overview.totalPnL * multiplier
      }
    }
  }

  const analyticsData = getAnalyticsData(timeframe)

  const handleTimeframeChange = (newTimeframe: string) => {
    setTimeframe(newTimeframe)
    console.log('Timeframe changed to:', newTimeframe)
    // Here you would typically fetch new data from an API
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatPercent = (value: number) => `${value.toFixed(1)}%`

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Analytics & Reports
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Timeframe</InputLabel>
          <Select
            value={timeframe}
            onChange={(e) => handleTimeframeChange(e.target.value)}
            label="Timeframe"
          >
            <MenuItem value="1h">1 Hour</MenuItem>
            <MenuItem value="4h">4 Hours</MenuItem>
            <MenuItem value="1d">1 Day</MenuItem>
            <MenuItem value="1w">1 Week</MenuItem>
            <MenuItem value="1m">1 Month</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Key Metrics Overview */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total P&L
                  </Typography>
                  <Typography variant="h5" color="success.main">
                    {formatCurrency(analyticsData.overview.totalPnL)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'success.main' }}>
                  <TrendingUp />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Win Rate
                  </Typography>
                  <Typography variant="h5" color="primary.main">
                    {formatPercent(analyticsData.overview.winRate)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    {analyticsData.overview.winningTrades}/{analyticsData.overview.totalTrades} trades
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <Assessment />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Sharpe Ratio
                  </Typography>
                  <Typography variant="h5" color="info.main">
                    {analyticsData.overview.sharpeRatio}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Risk-adjusted return
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'info.main' }}>
                  <Timeline />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Max Drawdown
                  </Typography>
                  <Typography variant="h5" color="error.main">
                    {formatCurrency(analyticsData.overview.maxDrawdown)}
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Peak to trough
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'error.main' }}>
                  <TrendingDown />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} lg={6}>
          <BTCChart />
        </Grid>
        <Grid item xs={12} lg={6}>
          <ProfitChart />
        </Grid>
        <Grid item xs={12} lg={12}>
          <VolumeChart />
        </Grid>
      </Grid>

      {/* Performance Breakdown */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance by Timeframe
              </Typography>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Daily</Typography>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(analyticsData.performance.daily)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={25} 
                  color="success" 
                  sx={{ mb: 2 }}
                />
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Weekly</Typography>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(analyticsData.performance.weekly)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={45} 
                  color="success" 
                  sx={{ mb: 2 }}
                />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Monthly</Typography>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(analyticsData.performance.monthly)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={75} 
                  color="success" 
                  sx={{ mb: 2 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">Year to Date</Typography>
                  <Typography variant="body2" color="success.main">
                    {formatCurrency(analyticsData.performance.yearToDate)}
                  </Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={100} 
                  color="success"
                />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Top Performing Symbols
              </Typography>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Symbol</TableCell>
                      <TableCell align="right">Trades</TableCell>
                      <TableCell align="right">P&L</TableCell>
                      <TableCell align="right">Win Rate</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {analyticsData.symbols.map((symbol, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Avatar sx={{ width: 20, height: 20, mr: 1, fontSize: '0.6rem' }}>
                              {symbol.symbol.slice(0, 2)}
                            </Avatar>
                            {symbol.symbol}
                          </Box>
                        </TableCell>
                        <TableCell align="right">{symbol.trades}</TableCell>
                        <TableCell align="right">
                          <Typography color="success.main">
                            {formatCurrency(symbol.pnl)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip 
                            label={formatPercent(symbol.winRate)}
                            color="primary"
                            size="small"
                            variant="outlined"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Strategy Performance */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Strategy Performance Analysis
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Strategy</TableCell>
                  <TableCell align="right">Trades</TableCell>
                  <TableCell align="right">P&L</TableCell>
                  <TableCell align="right">Win Rate</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {analyticsData.strategies.map((strategy, index) => (
                  <TableRow key={index}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1 }}>
                          <ShowChart />
                        </Avatar>
                        {strategy.name}
                      </Box>
                    </TableCell>
                    <TableCell align="right">{strategy.trades}</TableCell>
                    <TableCell align="right">
                      <Typography color="success.main">
                        {formatCurrency(strategy.pnl)}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{formatPercent(strategy.winRate)}</TableCell>
                    <TableCell>
                      <Chip 
                        label={strategy.status}
                        color={
                          strategy.status === 'active' ? 'success' : 
                          strategy.status === 'paused' ? 'warning' : 'info'
                        }
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Analytics
