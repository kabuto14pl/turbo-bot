import React, { useState } from 'react'
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Tooltip,
  LinearProgress,
  Avatar
} from '@mui/material'
import { 
  TrendingUp, 
  TrendingDown, 
  AccountBalance,
  Refresh
} from '@mui/icons-material'
import { useTradingSelectors } from '../store/tradingStore'

interface ExtendedPosition {
  symbol: string;
  quantity: number;
  averagePrice: number;
  currentPrice: number;
  pnl: number;
  pnlPercent: number;
}

interface ExtendedPortfolio {
  totalValue: number;
  cash: number;
  dailyPnL: number;
  dailyPnLPercent: number;
  positions: ExtendedPosition[];
}

const Portfolio: React.FC = () => {
  const { portfolio } = useTradingSelectors()
  const [loading, setLoading] = useState(false)

  // Mock portfolio data if none available
  const mockPortfolio: ExtendedPortfolio = {
    totalValue: 45780.50,
    cash: 12450.00,
    dailyPnL: 1250.80,
    dailyPnLPercent: 2.81,
    positions: [
      { symbol: 'BTCUSDT', quantity: 0.5, averagePrice: 42000, currentPrice: 43500, pnl: 750, pnlPercent: 3.57 },
      { symbol: 'ETHUSDT', quantity: 8.2, averagePrice: 2800, currentPrice: 2850, pnl: 410, pnlPercent: 1.79 },
      { symbol: 'BNBUSDT', quantity: 15, averagePrice: 420, currentPrice: 435, pnl: 225, pnlPercent: 3.57 },
      { symbol: 'ADAUSDT', quantity: 2500, averagePrice: 0.85, currentPrice: 0.88, pnl: 75, pnlPercent: 3.53 }
    ]
  }

  const currentPortfolio: ExtendedPortfolio = (portfolio as unknown as ExtendedPortfolio) || mockPortfolio

  const handleRefresh = () => {
    setLoading(true)
    setTimeout(() => setLoading(false), 1000)
  }

  const formatCurrency = (value: number) => `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const formatPercent = (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Portfolio Management
        </Typography>
        <Tooltip title="Refresh portfolio data">
          <IconButton onClick={handleRefresh} disabled={loading}>
            <Refresh />
          </IconButton>
        </Tooltip>
      </Box>

      {loading && <LinearProgress sx={{ mb: 2 }} />}

      {/* Portfolio Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Portfolio Value
                  </Typography>
                  <Typography variant="h5">
                    {formatCurrency(currentPortfolio.totalValue)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <AccountBalance />
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
                    Daily P&L
                  </Typography>
                  <Typography 
                    variant="h5" 
                    color={currentPortfolio.dailyPnL >= 0 ? 'success.main' : 'error.main'}
                  >
                    {formatCurrency(currentPortfolio.dailyPnL)}
                  </Typography>
                  <Typography variant="body2" color={currentPortfolio.dailyPnL >= 0 ? 'success.main' : 'error.main'}>
                    {formatPercent(currentPortfolio.dailyPnLPercent)}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: currentPortfolio.dailyPnL >= 0 ? 'success.main' : 'error.main' }}>
                  {currentPortfolio.dailyPnL >= 0 ? <TrendingUp /> : <TrendingDown />}
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Available Cash
              </Typography>
              <Typography variant="h5">
                {formatCurrency(currentPortfolio.cash)}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                {((currentPortfolio.cash / currentPortfolio.totalValue) * 100).toFixed(1)}% of portfolio
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Active Positions
              </Typography>
              <Typography variant="h5">
                {currentPortfolio.positions?.length || 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Across multiple pairs
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Positions Table */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Current Positions
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Symbol</TableCell>
                  <TableCell align="right">Quantity</TableCell>
                  <TableCell align="right">Avg Price</TableCell>
                  <TableCell align="right">Current Price</TableCell>
                  <TableCell align="right">Market Value</TableCell>
                  <TableCell align="right">P&L</TableCell>
                  <TableCell align="right">P&L %</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {currentPortfolio.positions?.map((position, index) => {
                  const marketValue = position.quantity * position.currentPrice
                  return (
                    <TableRow key={index}>
                      <TableCell component="th" scope="row">
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Avatar sx={{ width: 24, height: 24, mr: 1, fontSize: '0.7rem' }}>
                            {position.symbol.slice(0, 2)}
                          </Avatar>
                          {position.symbol}
                        </Box>
                      </TableCell>
                      <TableCell align="right">{position.quantity}</TableCell>
                      <TableCell align="right">{formatCurrency(position.averagePrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(position.currentPrice)}</TableCell>
                      <TableCell align="right">{formatCurrency(marketValue)}</TableCell>
                      <TableCell align="right">
                        <Typography color={(position as any).pnl >= 0 ? 'success.main' : 'error.main'}>
                          {formatCurrency((position as any).pnl)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Chip 
                          label={formatPercent((position as any).pnlPercent)}
                          color={(position as any).pnl >= 0 ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Portfolio
