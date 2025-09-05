import React, { useState } from 'react'
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Tabs,
  Tab,
  Alert
} from '@mui/material'
import { 
  PlayArrow, 
  Stop
} from '@mui/icons-material'
import { useTradingSelectors } from '../store/tradingStore'

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div hidden={value !== index} {...other}>
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

const Trading: React.FC = () => {
  const { systemStatus } = useTradingSelectors()
  const [tabValue, setTabValue] = useState(0)
  const [selectedStrategy, setSelectedStrategy] = useState('EnhancedRSITurbo')
  const [tradeAmount, setTradeAmount] = useState('1000')
  const [stopLoss, setStopLoss] = useState('2.0')
  const [takeProfit, setTakeProfit] = useState('3.0')
  const [autoTrading, setAutoTrading] = useState(true)

  // Mock data for demonstration
  const mockStrategies = [
    { id: 'EnhancedRSITurbo', name: 'Enhanced RSI Turbo', status: 'active', pnl: 1250.80, trades: 24, winRate: 68.2 },
    { id: 'MACDCrossover', name: 'MACD Crossover', status: 'paused', pnl: 890.50, trades: 18, winRate: 72.1 },
    { id: 'BollingerBands', name: 'Bollinger Bands', status: 'active', pnl: 445.20, trades: 12, winRate: 58.3 }
  ]

  const mockRecentTrades = [
    { time: '10:45:23', symbol: 'BTCUSDT', side: 'BUY', amount: 0.1, price: 43500, pnl: 125.50, status: 'closed' },
    { time: '10:42:15', symbol: 'ETHUSDT', side: 'SELL', amount: 2.5, price: 2850, pnl: -45.20, status: 'closed' },
    { time: '10:38:07', symbol: 'BNBUSDT', side: 'BUY', amount: 5, price: 435, pnl: 85.75, status: 'open' },
  ]

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleStartStrategy = () => {
    console.log('Starting strategy:', selectedStrategy)
    // Implementation here
  }

  const handleStopStrategy = () => {
    console.log('Stopping strategy:', selectedStrategy)
    // Implementation here
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Trading Interface
      </Typography>

      {/* System Status Alert */}
      <Alert 
        severity={systemStatus?.status === 'online' ? 'success' : 'warning'} 
        sx={{ mb: 3 }}
        icon={systemStatus?.status === 'online' ? <PlayArrow /> : <Stop />}
      >
        Trading System Status: {systemStatus?.status === 'online' ? 'ACTIVE' : 'INACTIVE'} - 
        Auto-trading is {autoTrading ? 'ENABLED' : 'DISABLED'}
      </Alert>

      {/* Main Trading Tabs */}
      <Card>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Strategy Control" />
          <Tab label="Manual Trading" />
          <Tab label="Active Orders" />
          <Tab label="Trade History" />
        </Tabs>

        {/* Strategy Control Tab */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            {/* Strategy Selection */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Strategy Configuration
                  </Typography>
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Select Strategy</InputLabel>
                    <Select
                      value={selectedStrategy}
                      onChange={(e) => setSelectedStrategy(e.target.value)}
                      label="Select Strategy"
                    >
                      {mockStrategies.map((strategy) => (
                        <MenuItem key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <TextField
                    fullWidth
                    label="Trade Amount (USDT)"
                    value={tradeAmount}
                    onChange={(e) => setTradeAmount(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Stop Loss (%)"
                    value={stopLoss}
                    onChange={(e) => setStopLoss(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Take Profit (%)"
                    value={takeProfit}
                    onChange={(e) => setTakeProfit(e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={autoTrading}
                        onChange={(e) => setAutoTrading(e.target.checked)}
                      />
                    }
                    label="Enable Auto Trading"
                    sx={{ mb: 2 }}
                  />

                  <Box sx={{ display: 'flex', gap: 2 }}>
                    <Button
                      variant="contained"
                      color="success"
                      startIcon={<PlayArrow />}
                      onClick={handleStartStrategy}
                      fullWidth
                    >
                      Start Strategy
                    </Button>
                    <Button
                      variant="contained"
                      color="error"
                      startIcon={<Stop />}
                      onClick={handleStopStrategy}
                      fullWidth
                    >
                      Stop Strategy
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>

            {/* Strategy Performance */}
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Strategy Performance
                  </Typography>
                  
                  {mockStrategies.map((strategy) => (
                    <Box key={strategy.id} sx={{ mb: 2, p: 2, border: 1, borderColor: 'grey.300', borderRadius: 1 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                        <Typography variant="subtitle1">{strategy.name}</Typography>
                        <Chip 
                          label={strategy.status} 
                          color={strategy.status === 'active' ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                      <Grid container spacing={2}>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="textSecondary">P&L</Typography>
                          <Typography 
                            variant="h6" 
                            color={strategy.pnl >= 0 ? 'success.main' : 'error.main'}
                          >
                            {formatCurrency(strategy.pnl)}
                          </Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="textSecondary">Trades</Typography>
                          <Typography variant="h6">{strategy.trades}</Typography>
                        </Grid>
                        <Grid item xs={4}>
                          <Typography variant="body2" color="textSecondary">Win Rate</Typography>
                          <Typography variant="h6">{strategy.winRate}%</Typography>
                        </Grid>
                      </Grid>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Manual Trading Tab */}
        <TabPanel value={tabValue} index={1}>
          <Typography variant="h6" gutterBottom>
            Manual Trading Controls
          </Typography>
          <Alert severity="info" sx={{ mb: 2 }}>
            Manual trading functionality will be available once the trading system is connected.
          </Alert>
        </TabPanel>

        {/* Active Orders Tab */}
        <TabPanel value={tabValue} index={2}>
          <Typography variant="h6" gutterBottom>
            Active Orders
          </Typography>
          <Alert severity="info">
            No active orders at the moment.
          </Alert>
        </TabPanel>

        {/* Trade History Tab */}
        <TabPanel value={tabValue} index={3}>
          <Typography variant="h6" gutterBottom>
            Recent Trades
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Time</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Side</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell align="right">Price</TableCell>
                  <TableCell align="right">P&L</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mockRecentTrades.map((trade, index) => (
                  <TableRow key={index}>
                    <TableCell>{trade.time}</TableCell>
                    <TableCell>{trade.symbol}</TableCell>
                    <TableCell>
                      <Chip 
                        label={trade.side} 
                        color={trade.side === 'BUY' ? 'success' : 'error'}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">{trade.amount}</TableCell>
                    <TableCell align="right">{formatCurrency(trade.price)}</TableCell>
                    <TableCell align="right">
                      <Typography color={trade.pnl >= 0 ? 'success.main' : 'error.main'}>
                        {formatCurrency(trade.pnl)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={trade.status} 
                        color={trade.status === 'closed' ? 'default' : 'primary'}
                        size="small"
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>
      </Card>
    </Box>
  )
}

export default Trading
