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
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar
} from '@mui/material'
import { 
  Add,
  Notifications,
  NotificationsActive,
  Delete,
  Edit,
  Warning,
  TrendingUp,
  Speed,
  Timeline
} from '@mui/icons-material'

const Alerts: React.FC = () => {
  const [open, setOpen] = useState(false)
  const [alertType, setAlertType] = useState('price')
  const [symbol, setSymbol] = useState('BTCUSDT')
  const [condition, setCondition] = useState('above')
  const [value, setValue] = useState('')
  const [enabled, setEnabled] = useState(true)

  // Mock alerts data
  const alertsData = {
    active: [
      {
        id: 1,
        type: 'price',
        symbol: 'BTCUSDT',
        condition: 'above',
        value: 45000,
        currentValue: 43500,
        status: 'active',
        created: '2025-08-24 10:30',
        triggered: false
      },
      {
        id: 2,
        type: 'volume',
        symbol: 'ETHUSDT',
        condition: 'above',
        value: 50000,
        currentValue: 45000,
        status: 'active',
        created: '2025-08-24 09:15',
        triggered: false
      },
      {
        id: 3,
        type: 'strategy',
        symbol: 'Portfolio',
        condition: 'drawdown',
        value: 5,
        currentValue: 2.1,
        status: 'active',
        created: '2025-08-24 08:00',
        triggered: false
      }
    ],
    triggered: [
      {
        id: 4,
        type: 'price',
        symbol: 'BNBUSDT',
        condition: 'below',
        value: 430,
        currentValue: 425,
        status: 'triggered',
        created: '2025-08-24 07:45',
        triggered: true,
        triggeredAt: '2025-08-24 11:20'
      },
      {
        id: 5,
        type: 'system',
        symbol: 'Trading Bot',
        condition: 'offline',
        value: null,
        currentValue: 'online',
        status: 'resolved',
        created: '2025-08-23 15:30',
        triggered: true,
        triggeredAt: '2025-08-23 16:15'
      }
    ]
  }

  const handleCreateAlert = () => {
    console.log('Creating alert:', { alertType, symbol, condition, value, enabled })
    setOpen(false)
    // Reset form
    setValue('')
  }

  const handleEditAlert = (id: number) => {
    console.log('Editing alert:', id)
    // Tutaj można dodać logikę edycji alertu
  }

  const handleDeleteAlert = (id: number) => {
    console.log('Deleting alert:', id)
    // Tutaj można dodać logikę usuwania alertu
  }

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'price': return <TrendingUp />
      case 'volume': return <Speed />
      case 'strategy': return <Timeline />
      case 'system': return <Warning />
      default: return <Notifications />
    }
  }

  const getAlertColor = (type: string) => {
    switch (type) {
      case 'price': return 'primary'
      case 'volume': return 'info'
      case 'strategy': return 'warning'
      case 'system': return 'error'
      default: return 'default'
    }
  }

  const formatValue = (type: string, value: any) => {
    if (type === 'price') return `$${value?.toLocaleString()}`
    if (type === 'volume') return `${value?.toLocaleString()}`
    if (type === 'strategy') return `${value}%`
    return value || 'N/A'
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Alert Management
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpen(true)}
        >
          Create Alert
        </Button>
      </Box>

      {/* Alert Summary Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Active Alerts
                  </Typography>
                  <Typography variant="h4">
                    {alertsData.active.length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  <NotificationsActive />
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
                    Triggered Today
                  </Typography>
                  <Typography variant="h4">
                    {alertsData.triggered.filter(a => a.triggered).length}
                  </Typography>
                </Box>
                <Avatar sx={{ bgcolor: 'warning.main' }}>
                  <Warning />
                </Avatar>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Price Alerts
              </Typography>
              <Typography variant="h4">
                {alertsData.active.filter(a => a.type === 'price').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                System Alerts
              </Typography>
              <Typography variant="h4">
                {alertsData.active.filter(a => a.type === 'system').length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Active Alerts */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Active Alerts
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Target Value</TableCell>
                  <TableCell>Current Value</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alertsData.active.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: `${getAlertColor(alert.type)}.main` }}>
                          {getAlertIcon(alert.type)}
                        </Avatar>
                        {alert.type}
                      </Box>
                    </TableCell>
                    <TableCell>{alert.symbol}</TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.condition}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatValue(alert.type, alert.value)}</TableCell>
                    <TableCell>{formatValue(alert.type, alert.currentValue)}</TableCell>
                    <TableCell>{alert.created}</TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.status}
                        color="success"
                        size="small"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        size="small" 
                        color="primary"
                        onClick={() => handleEditAlert(alert.id)}
                      >
                        <Edit />
                      </IconButton>
                      <IconButton 
                        size="small" 
                        color="error"
                        onClick={() => handleDeleteAlert(alert.id)}
                      >
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Triggered Alerts */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Recent Triggered Alerts
          </Typography>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Type</TableCell>
                  <TableCell>Symbol</TableCell>
                  <TableCell>Condition</TableCell>
                  <TableCell>Target Value</TableCell>
                  <TableCell>Triggered At</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {alertsData.triggered.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ width: 24, height: 24, mr: 1, bgcolor: `${getAlertColor(alert.type)}.main` }}>
                          {getAlertIcon(alert.type)}
                        </Avatar>
                        {alert.type}
                      </Box>
                    </TableCell>
                    <TableCell>{alert.symbol}</TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.condition}
                        size="small"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>{formatValue(alert.type, alert.value)}</TableCell>
                    <TableCell>{alert.triggeredAt}</TableCell>
                    <TableCell>
                      <Chip 
                        label={alert.status}
                        color={alert.status === 'triggered' ? 'warning' : 'success'}
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

      {/* Create Alert Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Alert</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Alert Type</InputLabel>
              <Select
                value={alertType}
                onChange={(e) => setAlertType(e.target.value)}
                label="Alert Type"
              >
                <MenuItem value="price">Price Alert</MenuItem>
                <MenuItem value="volume">Volume Alert</MenuItem>
                <MenuItem value="strategy">Strategy Alert</MenuItem>
                <MenuItem value="system">System Alert</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Symbol</InputLabel>
              <Select
                value={symbol}
                onChange={(e) => setSymbol(e.target.value)}
                label="Symbol"
              >
                <MenuItem value="BTCUSDT">BTC/USDT</MenuItem>
                <MenuItem value="ETHUSDT">ETH/USDT</MenuItem>
                <MenuItem value="BNBUSDT">BNB/USDT</MenuItem>
                <MenuItem value="ADAUSDT">ADA/USDT</MenuItem>
                <MenuItem value="DOTUSDT">DOT/USDT</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>Condition</InputLabel>
              <Select
                value={condition}
                onChange={(e) => setCondition(e.target.value)}
                label="Condition"
              >
                <MenuItem value="above">Above</MenuItem>
                <MenuItem value="below">Below</MenuItem>
                <MenuItem value="equals">Equals</MenuItem>
                <MenuItem value="change">% Change</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Value"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              type="number"
              sx={{ mb: 2 }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                />
              }
              label="Enable Alert"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateAlert} variant="contained">Create Alert</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

export default Alerts
