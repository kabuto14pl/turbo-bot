"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const Alerts = () => {
    const [open, setOpen] = (0, react_1.useState)(false);
    const [alertType, setAlertType] = (0, react_1.useState)('price');
    const [symbol, setSymbol] = (0, react_1.useState)('BTCUSDT');
    const [condition, setCondition] = (0, react_1.useState)('above');
    const [value, setValue] = (0, react_1.useState)('');
    const [enabled, setEnabled] = (0, react_1.useState)(true);
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
    };
    const handleCreateAlert = () => {
        console.log('Creating alert:', { alertType, symbol, condition, value, enabled });
        setOpen(false);
        // Reset form
        setValue('');
    };
    const handleEditAlert = (id) => {
        console.log('Editing alert:', id);
        // Tutaj można dodać logikę edycji alertu
    };
    const handleDeleteAlert = (id) => {
        console.log('Deleting alert:', id);
        // Tutaj można dodać logikę usuwania alertu
    };
    const getAlertIcon = (type) => {
        switch (type) {
            case 'price': return (0, jsx_runtime_1.jsx)(icons_material_1.TrendingUp, {});
            case 'volume': return (0, jsx_runtime_1.jsx)(icons_material_1.Speed, {});
            case 'strategy': return (0, jsx_runtime_1.jsx)(icons_material_1.Timeline, {});
            case 'system': return (0, jsx_runtime_1.jsx)(icons_material_1.Warning, {});
            default: return (0, jsx_runtime_1.jsx)(icons_material_1.Notifications, {});
        }
    };
    const getAlertColor = (type) => {
        switch (type) {
            case 'price': return 'primary';
            case 'volume': return 'info';
            case 'strategy': return 'warning';
            case 'system': return 'error';
            default: return 'default';
        }
    };
    const formatValue = (type, value) => {
        if (type === 'price')
            return `$${value?.toLocaleString()}`;
        if (type === 'volume')
            return `${value?.toLocaleString()}`;
        if (type === 'strategy')
            return `${value}%`;
        return value || 'N/A';
    };
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { p: 3 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", gutterBottom: true, children: "Alert Management" }), (0, jsx_runtime_1.jsx)(material_1.Button, { variant: "contained", startIcon: (0, jsx_runtime_1.jsx)(icons_material_1.Add, {}), onClick: () => setOpen(true), children: "Create Alert" })] }), (0, jsx_runtime_1.jsxs)(material_1.Grid, { container: true, spacing: 3, sx: { mb: 4 }, children: [(0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "Active Alerts" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", children: alertsData.active.length })] }), (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { bgcolor: 'primary.main' }, children: (0, jsx_runtime_1.jsx)(icons_material_1.NotificationsActive, {}) })] }) }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "Triggered Today" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", children: alertsData.triggered.filter(a => a.triggered).length })] }), (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { bgcolor: 'warning.main' }, children: (0, jsx_runtime_1.jsx)(icons_material_1.Warning, {}) })] }) }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "Price Alerts" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", children: alertsData.active.filter(a => a.type === 'price').length })] }) }) }), (0, jsx_runtime_1.jsx)(material_1.Grid, { item: true, xs: 12, md: 3, children: (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { color: "textSecondary", gutterBottom: true, children: "System Alerts" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", children: alertsData.active.filter(a => a.type === 'system').length })] }) }) })] }), (0, jsx_runtime_1.jsx)(material_1.Card, { sx: { mb: 3 }, children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Active Alerts" }), (0, jsx_runtime_1.jsx)(material_1.TableContainer, { component: material_1.Paper, children: (0, jsx_runtime_1.jsxs)(material_1.Table, { children: [(0, jsx_runtime_1.jsx)(material_1.TableHead, { children: (0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Type" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Symbol" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Condition" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Target Value" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Current Value" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Created" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Status" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Actions" })] }) }), (0, jsx_runtime_1.jsx)(material_1.TableBody, { children: alertsData.active.map((alert) => ((0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { width: 24, height: 24, mr: 1, bgcolor: `${getAlertColor(alert.type)}.main` }, children: getAlertIcon(alert.type) }), alert.type] }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: alert.symbol }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsx)(material_1.Chip, { label: alert.condition, size: "small", variant: "outlined" }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: formatValue(alert.type, alert.value) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: formatValue(alert.type, alert.currentValue) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: alert.created }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsx)(material_1.Chip, { label: alert.status, color: "success", size: "small" }) }), (0, jsx_runtime_1.jsxs)(material_1.TableCell, { children: [(0, jsx_runtime_1.jsx)(material_1.IconButton, { size: "small", color: "primary", onClick: () => handleEditAlert(alert.id), children: (0, jsx_runtime_1.jsx)(icons_material_1.Edit, {}) }), (0, jsx_runtime_1.jsx)(material_1.IconButton, { size: "small", color: "error", onClick: () => handleDeleteAlert(alert.id), children: (0, jsx_runtime_1.jsx)(icons_material_1.Delete, {}) })] })] }, alert.id))) })] }) })] }) }), (0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", gutterBottom: true, children: "Recent Triggered Alerts" }), (0, jsx_runtime_1.jsx)(material_1.TableContainer, { component: material_1.Paper, children: (0, jsx_runtime_1.jsxs)(material_1.Table, { children: [(0, jsx_runtime_1.jsx)(material_1.TableHead, { children: (0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Type" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Symbol" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Condition" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Target Value" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Triggered At" }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: "Status" })] }) }), (0, jsx_runtime_1.jsx)(material_1.TableBody, { children: alertsData.triggered.map((alert) => ((0, jsx_runtime_1.jsxs)(material_1.TableRow, { children: [(0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center' }, children: [(0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: { width: 24, height: 24, mr: 1, bgcolor: `${getAlertColor(alert.type)}.main` }, children: getAlertIcon(alert.type) }), alert.type] }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: alert.symbol }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsx)(material_1.Chip, { label: alert.condition, size: "small", variant: "outlined" }) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: formatValue(alert.type, alert.value) }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: alert.triggeredAt }), (0, jsx_runtime_1.jsx)(material_1.TableCell, { children: (0, jsx_runtime_1.jsx)(material_1.Chip, { label: alert.status, color: alert.status === 'triggered' ? 'warning' : 'success', size: "small" }) })] }, alert.id))) })] }) })] }) }), (0, jsx_runtime_1.jsxs)(material_1.Dialog, { open: open, onClose: () => setOpen(false), maxWidth: "sm", fullWidth: true, children: [(0, jsx_runtime_1.jsx)(material_1.DialogTitle, { children: "Create New Alert" }), (0, jsx_runtime_1.jsx)(material_1.DialogContent, { children: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { pt: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: true, sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Alert Type" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: alertType, onChange: (e) => setAlertType(e.target.value), label: "Alert Type", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "price", children: "Price Alert" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "volume", children: "Volume Alert" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "strategy", children: "Strategy Alert" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "system", children: "System Alert" })] })] }), (0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: true, sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Symbol" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: symbol, onChange: (e) => setSymbol(e.target.value), label: "Symbol", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "BTCUSDT", children: "BTC/USDT" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "ETHUSDT", children: "ETH/USDT" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "BNBUSDT", children: "BNB/USDT" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "ADAUSDT", children: "ADA/USDT" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "DOTUSDT", children: "DOT/USDT" })] })] }), (0, jsx_runtime_1.jsxs)(material_1.FormControl, { fullWidth: true, sx: { mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.InputLabel, { children: "Condition" }), (0, jsx_runtime_1.jsxs)(material_1.Select, { value: condition, onChange: (e) => setCondition(e.target.value), label: "Condition", children: [(0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "above", children: "Above" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "below", children: "Below" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "equals", children: "Equals" }), (0, jsx_runtime_1.jsx)(material_1.MenuItem, { value: "change", children: "% Change" })] })] }), (0, jsx_runtime_1.jsx)(material_1.TextField, { fullWidth: true, label: "Value", value: value, onChange: (e) => setValue(e.target.value), type: "number", sx: { mb: 2 } }), (0, jsx_runtime_1.jsx)(material_1.FormControlLabel, { control: (0, jsx_runtime_1.jsx)(material_1.Switch, { checked: enabled, onChange: (e) => setEnabled(e.target.checked) }), label: "Enable Alert" })] }) }), (0, jsx_runtime_1.jsxs)(material_1.DialogActions, { children: [(0, jsx_runtime_1.jsx)(material_1.Button, { onClick: () => setOpen(false), children: "Cancel" }), (0, jsx_runtime_1.jsx)(material_1.Button, { onClick: handleCreateAlert, variant: "contained", children: "Create Alert" })] })] })] }));
};
exports.default = Alerts;
