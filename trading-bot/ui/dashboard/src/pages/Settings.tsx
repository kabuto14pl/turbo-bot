import React, { useState } from 'react'
import { 
  Typography, 
  Box, 
  Grid, 
  Card, 
  CardContent, 
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Button,
  Alert,
  Tabs,
  Tab,
  Slider
} from '@mui/material'
import { 
  Save,
  Refresh
} from '@mui/icons-material'
import { useSettings } from '../hooks/useSettings'

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

const Settings: React.FC = () => {
  const [tabValue, setTabValue] = useState(0)
  const { settings: appSettings, updateSetting, resetSettings, saveSettings } = useSettings()
  const [settings, setSettings] = useState({
    // Trading Settings
    defaultAmount: '1000',
    maxDailyLoss: '500',
    stopLoss: '2.0',
    takeProfit: '3.0',
    maxOpenPositions: '5',
    autoTrading: true,
    
    // Risk Management
    riskPerTrade: 2,
    maxDrawdown: 10,
    portfolioHeat: 20,
    
    // API Settings
    apiKey: '••••••••••••••••',
    apiSecret: '••••••••••••••••',
    testMode: true,
    
    // Notifications
    emailNotifications: true,
    pushNotifications: true,
    priceAlerts: true,
    systemAlerts: true,
    
    // UI Settings
    theme: appSettings.theme,
    language: appSettings.language,
    currency: appSettings.currency,
    timezone: appSettings.timezone,
    autoRefresh: appSettings.autoRefresh,
    refreshInterval: appSettings.refreshInterval,
    
    // Performance
    maxLogEntries: 10000,
    enableDebugMode: false,
    cacheSize: 500
  })

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue)
  }

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }))
    
    // Update app settings for UI-related settings
    if (['theme', 'language', 'currency', 'timezone', 'autoRefresh', 'refreshInterval'].includes(key)) {
      updateSetting(key as any, value)
    }
  }

  const handleSave = () => {
    console.log('Saving settings:', settings)
    // Save UI settings to localStorage
    saveSettings({
      theme: settings.theme as any,
      language: settings.language as any,
      currency: settings.currency,
      timezone: settings.timezone,
      autoRefresh: settings.autoRefresh,
      refreshInterval: settings.refreshInterval,
    })
    alert('Settings saved successfully!')
  }

  const handleReset = () => {
    console.log('Resetting settings to defaults')
    resetSettings()
    // Reset local settings to defaults
    setSettings(prev => ({
      ...prev,
      theme: 'dark',
      language: 'en',
      currency: 'USD',
      timezone: 'UTC',
      autoRefresh: true,
      refreshInterval: 3000,
    }))
    alert('Settings reset to defaults!')
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" gutterBottom>
          Application Settings
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={handleReset}
            sx={{ mr: 2 }}
          >
            Reset
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            onClick={handleSave}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Alert severity="info" sx={{ mb: 3 }}>
        Changes to trading settings will take effect immediately. API changes require bot restart.
      </Alert>

      <Card>
        <Tabs value={tabValue} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Trading" />
          <Tab label="Risk Management" />
          <Tab label="API & Security" />
          <Tab label="Notifications" />
          <Tab label="Interface" />
          <Tab label="Performance" />
        </Tabs>

        {/* Trading Settings */}
        <TabPanel value={tabValue} index={0}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Default Trading Parameters
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Default Trade Amount (USDT)"
                    value={settings.defaultAmount}
                    onChange={(e) => handleSettingChange('defaultAmount', e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Stop Loss (%)"
                    value={settings.stopLoss}
                    onChange={(e) => handleSettingChange('stopLoss', e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Take Profit (%)"
                    value={settings.takeProfit}
                    onChange={(e) => handleSettingChange('takeProfit', e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Max Open Positions"
                    value={settings.maxOpenPositions}
                    onChange={(e) => handleSettingChange('maxOpenPositions', e.target.value)}
                    type="number"
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoTrading}
                        onChange={(e) => handleSettingChange('autoTrading', e.target.checked)}
                      />
                    }
                    label="Enable Auto Trading"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Daily Limits
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Max Daily Loss (USDT)"
                    value={settings.maxDailyLoss}
                    onChange={(e) => handleSettingChange('maxDailyLoss', e.target.value)}
                    sx={{ mb: 2 }}
                  />

                  <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                    Trading will automatically stop if daily loss limit is reached.
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Risk Management */}
        <TabPanel value={tabValue} index={1}>
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Risk Management Parameters
                  </Typography>
                  
                  <Box sx={{ mb: 4 }}>
                    <Typography gutterBottom>Risk Per Trade: {settings.riskPerTrade}%</Typography>
                    <Slider
                      value={settings.riskPerTrade}
                      onChange={(_e, value) => handleSettingChange('riskPerTrade', value)}
                      min={0.5}
                      max={5}
                      step={0.1}
                      marks={[
                        { value: 0.5, label: '0.5%' },
                        { value: 2, label: '2%' },
                        { value: 5, label: '5%' }
                      ]}
                    />
                  </Box>

                  <Box sx={{ mb: 4 }}>
                    <Typography gutterBottom>Max Drawdown: {settings.maxDrawdown}%</Typography>
                    <Slider
                      value={settings.maxDrawdown}
                      onChange={(_e, value) => handleSettingChange('maxDrawdown', value)}
                      min={5}
                      max={25}
                      step={1}
                      marks={[
                        { value: 5, label: '5%' },
                        { value: 10, label: '10%' },
                        { value: 25, label: '25%' }
                      ]}
                    />
                  </Box>

                  <Box sx={{ mb: 4 }}>
                    <Typography gutterBottom>Portfolio Heat: {settings.portfolioHeat}%</Typography>
                    <Slider
                      value={settings.portfolioHeat}
                      onChange={(_e, value) => handleSettingChange('portfolioHeat', value)}
                      min={10}
                      max={50}
                      step={5}
                      marks={[
                        { value: 10, label: '10%' },
                        { value: 20, label: '20%' },
                        { value: 50, label: '50%' }
                      ]}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* API & Security */}
        <TabPanel value={tabValue} index={2}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Exchange API Settings
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="API Key"
                    value={settings.apiKey}
                    onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                    type="password"
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="API Secret"
                    value={settings.apiSecret}
                    onChange={(e) => handleSettingChange('apiSecret', e.target.value)}
                    type="password"
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.testMode}
                        onChange={(e) => handleSettingChange('testMode', e.target.checked)}
                      />
                    }
                    label="Test Mode (Paper Trading)"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Alert severity="warning">
                <Typography variant="h6" gutterBottom>
                  Security Notice
                </Typography>
                <Typography variant="body2">
                  • Never share your API keys with anyone
                  • Enable IP whitelisting on your exchange
                  • Use test mode for initial setup
                  • Regularly rotate your API keys
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Notifications */}
        <TabPanel value={tabValue} index={3}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Notification Preferences
                  </Typography>
                  
                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.emailNotifications}
                        onChange={(e) => handleSettingChange('emailNotifications', e.target.checked)}
                      />
                    }
                    label="Email Notifications"
                    sx={{ display: 'block', mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.pushNotifications}
                        onChange={(e) => handleSettingChange('pushNotifications', e.target.checked)}
                      />
                    }
                    label="Push Notifications"
                    sx={{ display: 'block', mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.priceAlerts}
                        onChange={(e) => handleSettingChange('priceAlerts', e.target.checked)}
                      />
                    }
                    label="Price Alerts"
                    sx={{ display: 'block', mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.systemAlerts}
                        onChange={(e) => handleSettingChange('systemAlerts', e.target.checked)}
                      />
                    }
                    label="System Alerts"
                    sx={{ display: 'block' }}
                  />
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Interface */}
        <TabPanel value={tabValue} index={4}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    User Interface
                  </Typography>
                  
                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Theme</InputLabel>
                    <Select
                      value={settings.theme}
                      onChange={(e) => handleSettingChange('theme', e.target.value)}
                      label="Theme"
                    >
                      <MenuItem value="light">Light</MenuItem>
                      <MenuItem value="dark">Dark</MenuItem>
                      <MenuItem value="auto">Auto</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Language</InputLabel>
                    <Select
                      value={settings.language}
                      onChange={(e) => handleSettingChange('language', e.target.value)}
                      label="Language"
                    >
                      <MenuItem value="en">English</MenuItem>
                      <MenuItem value="pl">Polski</MenuItem>
                      <MenuItem value="es">Español</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel>Currency</InputLabel>
                    <Select
                      value={settings.currency}
                      onChange={(e) => handleSettingChange('currency', e.target.value)}
                      label="Currency"
                    >
                      <MenuItem value="USD">USD</MenuItem>
                      <MenuItem value="EUR">EUR</MenuItem>
                      <MenuItem value="PLN">PLN</MenuItem>
                    </Select>
                  </FormControl>

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.autoRefresh}
                        onChange={(e) => handleSettingChange('autoRefresh', e.target.checked)}
                      />
                    }
                    label="Auto Refresh"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Data Refresh
                  </Typography>
                  
                  <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom>
                      Refresh Interval: {settings.refreshInterval}ms
                    </Typography>
                    <Slider
                      value={settings.refreshInterval}
                      onChange={(_e, value) => handleSettingChange('refreshInterval', value)}
                      min={1000}
                      max={10000}
                      step={1000}
                      marks={[
                        { value: 1000, label: '1s' },
                        { value: 3000, label: '3s' },
                        { value: 10000, label: '10s' }
                      ]}
                    />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </TabPanel>

        {/* Performance */}
        <TabPanel value={tabValue} index={5}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Card variant="outlined">
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Performance Settings
                  </Typography>
                  
                  <TextField
                    fullWidth
                    label="Max Log Entries"
                    value={settings.maxLogEntries}
                    onChange={(e) => handleSettingChange('maxLogEntries', e.target.value)}
                    type="number"
                    sx={{ mb: 2 }}
                  />

                  <TextField
                    fullWidth
                    label="Cache Size (MB)"
                    value={settings.cacheSize}
                    onChange={(e) => handleSettingChange('cacheSize', e.target.value)}
                    type="number"
                    sx={{ mb: 2 }}
                  />

                  <FormControlLabel
                    control={
                      <Switch
                        checked={settings.enableDebugMode}
                        onChange={(e) => handleSettingChange('enableDebugMode', e.target.checked)}
                      />
                    }
                    label="Enable Debug Mode"
                  />
                </CardContent>
              </Card>
            </Grid>

            <Grid item xs={12} md={6}>
              <Alert severity="info">
                <Typography variant="h6" gutterBottom>
                  Performance Tips
                </Typography>
                <Typography variant="body2">
                  • Lower refresh intervals improve responsiveness but use more resources
                  • Increase cache size if you experience slow loading
                  • Debug mode provides detailed logs but impacts performance
                </Typography>
              </Alert>
            </Grid>
          </Grid>
        </TabPanel>
      </Card>
    </Box>
  )
}

export default Settings
