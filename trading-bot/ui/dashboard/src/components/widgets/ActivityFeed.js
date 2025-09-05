"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const ActivityFeed = ({ maxItems = 10, refreshInterval = 5000 }) => {
    const [activities, setActivities] = (0, react_1.useState)([]);
    // Mock activity generator
    const generateMockActivity = () => {
        const types = ['trade', 'alert', 'system', 'profit', 'loss'];
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
        let status;
        let amount;
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
    (0, react_1.useEffect)(() => {
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
    const getIcon = (type, status) => {
        const iconProps = { fontSize: 'small' };
        switch (type) {
            case 'profit':
                return (0, jsx_runtime_1.jsx)(icons_material_1.TrendingUp, { ...iconProps, color: "success" });
            case 'loss':
                return (0, jsx_runtime_1.jsx)(icons_material_1.TrendingDown, { ...iconProps, color: "error" });
            case 'trade':
                return (0, jsx_runtime_1.jsx)(icons_material_1.AccountBalance, { ...iconProps, color: "primary" });
            default:
                switch (status) {
                    case 'success':
                        return (0, jsx_runtime_1.jsx)(icons_material_1.CheckCircle, { ...iconProps, color: "success" });
                    case 'error':
                        return (0, jsx_runtime_1.jsx)(icons_material_1.Error, { ...iconProps, color: "error" });
                    case 'warning':
                        return (0, jsx_runtime_1.jsx)(icons_material_1.Warning, { ...iconProps, color: "warning" });
                    default:
                        return (0, jsx_runtime_1.jsx)(icons_material_1.CheckCircle, { ...iconProps, color: "primary" });
                }
        }
    };
    const getStatusColor = (status) => {
        switch (status) {
            case 'success': return 'success';
            case 'error': return 'error';
            case 'warning': return 'warning';
            default: return 'primary';
        }
    };
    const formatAmount = (amount) => {
        const sign = amount >= 0 ? '+' : '';
        return `${sign}$${Math.abs(amount).toFixed(2)}`;
    };
    const formatTime = (timestamp) => {
        return timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };
    return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", sx: { flexGrow: 1 }, children: "Activity Feed" }), (0, jsx_runtime_1.jsx)(material_1.Chip, { size: "small", label: `${activities.length} events`, variant: "outlined" })] }), (0, jsx_runtime_1.jsx)(material_1.List, { sx: { maxHeight: 400, overflowY: 'auto', p: 0 }, children: activities.map((activity, index) => ((0, jsx_runtime_1.jsxs)(material_1.ListItem, { sx: {
                            px: 0,
                            py: 1,
                            borderBottom: index < activities.length - 1 ? 1 : 0,
                            borderColor: 'divider',
                            animation: index === 0 ? 'fadeIn 0.5s ease-in' : 'none',
                            '@keyframes fadeIn': {
                                from: { opacity: 0, transform: 'translateY(-10px)' },
                                to: { opacity: 1, transform: 'translateY(0)' }
                            }
                        }, children: [(0, jsx_runtime_1.jsx)(material_1.ListItemIcon, { sx: { minWidth: 40 }, children: (0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: {
                                        width: 32,
                                        height: 32,
                                        backgroundColor: 'transparent',
                                        border: 1,
                                        borderColor: `${getStatusColor(activity.status)}.main`
                                    }, children: getIcon(activity.type, activity.status) }) }), (0, jsx_runtime_1.jsx)(material_1.ListItemText, { primary: (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", sx: { flexGrow: 1 }, children: activity.message }), activity.amount && ((0, jsx_runtime_1.jsx)(material_1.Chip, { size: "small", label: formatAmount(activity.amount), color: activity.amount >= 0 ? 'success' : 'error', variant: "outlined" }))] }), secondary: (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", color: "text.secondary", children: formatTime(activity.timestamp) }) })] }, activity.id))) }), (0, jsx_runtime_1.jsx)(material_1.Box, { sx: { mt: 2, textAlign: 'center' }, children: (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", color: "text.secondary", children: "Real-time activity monitoring" }) })] }) }));
};
exports.default = ActivityFeed;
