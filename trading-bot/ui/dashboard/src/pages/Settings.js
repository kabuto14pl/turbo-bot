"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const useSettings_1 = require("../hooks/useSettings");
function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return ((0, jsx_runtime_1.jsx)("div", { hidden: value !== index, ...other, children: value === index && (0, jsx_runtime_1.jsx)(material_1.Box, { sx: { p: 3 }, children: children }) }));
}
const Settings = () => {
    const [tabValue, setTabValue] = (0, react_1.useState)(0);
    const { settings: appSettings, updateSetting, resetSettings, saveSettings } = (0, useSettings_1.useSettings)();
    const [settings, setSettings] = (0, react_1.useState)({
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
    });
    const handleTabChange = (_event, newValue) => {
        setTabValue(newValue);
    };
    const handleSettingChange = (key, value) => {
        setSettings(prev => ({ ...prev, [key]: value }));
        // Update app settings for UI-related settings
        if (['theme', 'language', 'currency', 'timezone', 'autoRefresh', 'refreshInterval'].includes(key)) {
            updateSetting(key, value);
        }
    };
    const handleSave = () => {
        console.log('Saving settings:', settings);
        // Save UI settings to localStorage
        saveSettings({
            theme: settings.theme,
            language: settings.language,
            currency: settings.currency,
            timezone: settings.timezone,
            autoRefresh: settings.autoRefresh,
            refreshInterval: settings.refreshInterval,
        });
        alert('Settings saved successfully!');
    };
    const handleReset = () => {
        console.log('Resetting settings to defaults');
        resetSettings();
        // Reset local settings to defaults
        setSettings(prev => ({
            ...prev,
            theme: 'dark',
            language: 'en',
            currency: 'USD',
            timezone: 'UTC',
            autoRefresh: true,
            refreshInterval: 3000,
        }));
        alert('Settings reset to defaults!');
    };
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { p: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", gutterBottom: true, children: "Application Settings" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Button, { variant: "outlined", startIcon: (0, jsx_runtime_1.jsx)(icons_material_1.Refresh, {}), onClick: handleReset, sx: { mr: 2 }, children: "Reset" }), (0, jsx_runtime_1.jsx)(material_1.Button, { variant: "contained", startIcon: (0, jsx_runtime_1.jsx)(icons_material_1.Save, {}), onClick: handleSave, children: "Save Changes" })] })] }), (0, jsx_runtime_1.jsx)(material_1.Alert, { severity: "info", sx: { mb: 3 }, children: "Changes to trading settings will take effect immediately. API changes require bot restart." }), (0, jsx_runtime_1.jsxs)(material_1.Card, { children: [(0, jsx_runtime_1.jsxs)(material_1.Tabs, { value: tabValue, onChange: handleTabChange, sx: { borderBottom: 1, borderColor: 'divider' }, children: [(0, jsx_runtime_1.jsx)(material_1.Tab, { label: "Trading" }), (0, jsx_runtime_1.jsx)(material_1.Tab, { label: "Risk Management" }), (0, jsx_runtime_1.jsx)(material_1.Tab, { label: "API & Security" }), (0, jsx_runtime_1.jsx)(material_1.Tab, { label: "Notifications" }), (0, jsx_runtime_1.jsx)(material_1.Tab, { label: "Interface" }), (0, jsx_runtime_1.jsx)(material_1.Tab, { label: "Performance" })] }), (0, jsx_runtime_1.jsx)(TabPanel, { value: tabValue, index: 0, children: (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Default Trading Parameters" }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Default Trade Amount (USDT)", value: settings.defaultAmount, onChange: (e) => handleSettingChange('defaultAmount', e.target.value), sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Stop Loss (%)", value: settings.stopLoss, onChange: (e) => handleSettingChange('stopLoss', e.target.value), sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Take Profit (%)", value: settings.takeProfit, onChange: (e) => handleSettingChange('takeProfit', e.target.value), sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Max Open Positions", value: settings.maxOpenPositions, onChange: (e) => handleSettingChange('maxOpenPositions', e.target.value), type: "number", sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.autoTrading, onChange: (e) => handleSettingChange('autoTrading', e.target.checked) }), label: "Enable Auto Trading" })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Daily Limits" }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Max Daily Loss (USDT)", value: settings.maxDailyLoss, onChange: (e) => handleSettingChange('maxDailyLoss', e.target.value), sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "textSecondary", sx: { mb: 2 }, children: "Trading will automatically stop if daily loss limit is reached." })] }) }) })] }) }), (0, jsx_runtime_1.jsx)(TabPanel, { value: tabValue, index: 1, children: (0, jsx_runtime_1.jsx)(material_1.Grid, { container: true, spacing: 3, children: (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Risk Management Parameters" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mb: 4 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { gutterBottom: true, children: ["Risk Per Trade: ", settings.riskPerTrade, "%"] }), (0, jsx_runtime_1.jsx)(material_1.Slider, { value: settings.riskPerTrade, onChange: (_e, value) => handleSettingChange('riskPerTrade', value), min: 0.5, max: 5, step: 0.1, marks: [
                                                            { value: 0.5, label: '0.5%' },
                                                            { value: 2, label: '2%' },
                                                            { value: 5, label: '5%' }
                                                        ] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mb: 4 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { gutterBottom: true, children: ["Max Drawdown: ", settings.maxDrawdown, "%"] }), (0, jsx_runtime_1.jsx)(material_1.Slider, { value: settings.maxDrawdown, onChange: (_e, value) => handleSettingChange('maxDrawdown', value), min: 5, max: 25, step: 1, marks: [
                                                            { value: 5, label: '5%' },
                                                            { value: 10, label: '10%' },
                                                            { value: 25, label: '25%' }
                                                        ] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mb: 4 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { gutterBottom: true, children: ["Portfolio Heat: ", settings.portfolioHeat, "%"] }), (0, jsx_runtime_1.jsx)(material_1.Slider, { value: settings.portfolioHeat, onChange: (_e, value) => handleSettingChange('portfolioHeat', value), min: 10, max: 50, step: 5, marks: [
                                                            { value: 10, label: '10%' },
                                                            { value: 20, label: '20%' },
                                                            { value: 50, label: '50%' }
                                                        ] })] })] }) }) }) }) }), (0, jsx_runtime_1.jsx)(TabPanel, { value: tabValue, index: 2, children: (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Exchange API Settings" }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "API Key", value: settings.apiKey, onChange: (e) => handleSettingChange('apiKey', e.target.value), type: "password", sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "API Secret", value: settings.apiSecret, onChange: (e) => handleSettingChange('apiSecret', e.target.value), type: "password", sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.testMode, onChange: (e) => handleSettingChange('testMode', e.target.checked) }), label: "Test Mode (Paper Trading)" })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsxs)(material_1.Alert, { severity: "warning", children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Security Notice" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", children: "\u2022 Never share your API keys with anyone \u2022 Enable IP whitelisting on your exchange \u2022 Use test mode for initial setup \u2022 Regularly rotate your API keys" })] }) })] }) }), (0, jsx_runtime_1.jsx)(TabPanel, { value: tabValue, index: 3, children: (0, jsx_runtime_1.jsx)(material_1.Grid, { container: true, spacing: 3, children: (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Notification Preferences" }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.emailNotifications, onChange: (e) => handleSettingChange('emailNotifications', e.target.checked) }), label: "Email Notifications", sx: { display: 'block', mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.pushNotifications, onChange: (e) => handleSettingChange('pushNotifications', e.target.checked) }), label: "Push Notifications", sx: { display: 'block', mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.priceAlerts, onChange: (e) => handleSettingChange('priceAlerts', e.target.checked) }), label: "Price Alerts", sx: { display: 'block', mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.systemAlerts, onChange: (e) => handleSettingChange('systemAlerts', e.target.checked) }), label: "System Alerts", sx: { display: 'block' } })] }) }) }) }) }), (0, jsx_runtime_1.jsx)(TabPanel, { value: tabValue, index: 4, children: (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "User Interface" }), (0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: true, sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Theme" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: settings.theme, onChange: (e) => handleSettingChange('theme', e.target.value), label: "Theme", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "light", children: "Light" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "dark", children: "Dark" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "auto", children: "Auto" })] })] }), (0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: true, sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Language" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: settings.language, onChange: (e) => handleSettingChange('language', e.target.value), label: "Language", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "en", children: "English" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "pl", children: "Polski" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "es", children: "Espa\u00F1ol" })] })] }), (0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: true, sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Currency" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: settings.currency, onChange: (e) => handleSettingChange('currency', e.target.value), label: "Currency", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "USD", children: "USD" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "EUR", children: "EUR" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "PLN", children: "PLN" })] })] }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.autoRefresh, onChange: (e) => handleSettingChange('autoRefresh', e.target.checked) }), label: "Auto Refresh" })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Data Refresh" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { mb: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { gutterBottom: true, children: ["Refresh Interval: ", settings.refreshInterval, "ms"] }), (0, jsx_runtime_1.jsx)(material_1.Slider, { value: settings.refreshInterval, onChange: (_e, value) => handleSettingChange('refreshInterval', value), min: 1000, max: 10000, step: 1000, marks: [
                                                                { value: 1000, label: '1s' },
                                                                { value: 3000, label: '3s' },
                                                                { value: 10000, label: '10s' }
                                                            ] })] })] }) }) })] }) }), (0, jsx_runtime_1.jsx)(TabPanel, { value: tabValue, index: 5, children: (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsx)(material_1.Card, { variant: "outlined", children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Performance Settings" }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Max Log Entries", value: settings.maxLogEntries, onChange: (e) => handleSettingChange('maxLogEntries', e.target.value), type: "number", sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Cache Size (MB)", value: settings.cacheSize, onChange: (e) => handleSettingChange('cacheSize', e.target.value), type: "number", sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: settings.enableDebugMode, onChange: (e) => handleSettingChange('enableDebugMode', e.target.checked) }), label: "Enable Debug Mode" })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 6, children: (0, jsx_runtime_1.jsxs)(material_1.Alert, { severity: "info", children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Performance Tips" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", children: "\u2022 Lower refresh intervals improve responsiveness but use more resources \u2022 Increase cache size if you experience slow loading \u2022 Debug mode provides detailed logs but impacts performance" })] }) })] }) })] })] }));
};
exports.default = Settings;
