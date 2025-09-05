"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const icons_material_1 = require("@mui/icons-material");
const RealTimeWidget = ({ symbols = ['BTC/USDT', 'ETH/USDT', 'BNB/USDT'], refreshInterval = 5000 // Zwiększona częstotliwość do 5 sekund
 }) => {
    const [data, setData] = (0, react_1.useState)([]);
    const [loading, setLoading] = (0, react_1.useState)(true);
    // Nie używamy prices ze store - używamy mock data
    // const { prices } = useTradingSelectors();
    (0, react_1.useEffect)(() => {
        // Initial load
        const initialData = symbols.map(symbol => {
            const basePrice = symbol.includes('BTC') ? 45000 :
                symbol.includes('ETH') ? 2800 : 450;
            return {
                symbol,
                price: Math.round(basePrice * 100) / 100,
                change: 0,
                changePercent: 0,
                volume: Math.round(Math.random() * 1000000),
                lastUpdate: new Date()
            };
        });
        setData(initialData);
        setLoading(false);
        // Set up interval for real-time updates
        const interval = setInterval(() => {
            const now = new Date();
            const newData = symbols.map(symbol => {
                const basePrice = symbol.includes('BTC') ? 45000 :
                    symbol.includes('ETH') ? 2800 : 450;
                // Bardziej realistyczne zmiany cen - mniejsze wahania
                const variation = (Math.random() - 0.5) * 0.005; // ±0.25% variation
                const price = basePrice * (1 + variation);
                const change = basePrice * variation;
                const changePercent = variation * 100;
                return {
                    symbol,
                    price: Math.round(price * 100) / 100,
                    change: Math.round(change * 100) / 100,
                    changePercent: Math.round(changePercent * 100) / 100,
                    volume: Math.round(Math.random() * 1000000),
                    lastUpdate: now
                };
            });
            setData(newData);
        }, refreshInterval);
        return () => clearInterval(interval);
    }, [symbols, refreshInterval]);
    const formatPrice = (price, symbol) => {
        if (symbol.includes('BTC'))
            return `$${price.toLocaleString()}`;
        if (symbol.includes('ETH'))
            return `$${price.toLocaleString()}`;
        return `$${price.toFixed(2)}`;
    };
    const formatVolume = (volume) => {
        if (volume >= 1000000)
            return `${(volume / 1000000).toFixed(1)}M`;
        if (volume >= 1000)
            return `${(volume / 1000).toFixed(1)}K`;
        return volume.toString();
    };
    const getTrendIcon = (change) => {
        if (change > 0)
            return (0, jsx_runtime_1.jsx)(icons_material_1.TrendingUp, { sx: { fontSize: 16 } });
        if (change < 0)
            return (0, jsx_runtime_1.jsx)(icons_material_1.TrendingDown, { sx: { fontSize: 16 } });
        return (0, jsx_runtime_1.jsx)(icons_material_1.SwapHoriz, { sx: { fontSize: 16 } });
    };
    const getTrendColor = (change) => {
        if (change > 0)
            return 'success.main';
        if (change < 0)
            return 'error.main';
        return 'text.secondary';
    };
    if (loading) {
        return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsx)(material_1.Box, { sx: { display: 'flex', justifyContent: 'center', p: 2 }, children: (0, jsx_runtime_1.jsx)(material_1.CircularProgress, {}) }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", sx: { flexGrow: 1 }, children: "Live Prices" }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', gap: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "caption", color: "text.secondary", children: data.length > 0 ? `Updated ${data[0].lastUpdate.toLocaleTimeString()}` : 'Loading...' }), (0, jsx_runtime_1.jsx)(material_1.Chip, { size: "small", label: "LIVE", color: "success", variant: "outlined" })] })] }), (0, jsx_runtime_1.jsx)(material_1.Box, { sx: { display: 'flex', flexDirection: 'column', gap: 2 }, children: data.map((item, index) => ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                            display: 'flex',
                            alignItems: 'center',
                            p: 1,
                            borderRadius: 1,
                            backgroundColor: 'rgba(255,255,255,0.05)',
                            transition: 'all 0.3s ease'
                        }, children: [(0, jsx_runtime_1.jsx)(material_1.Avatar, { sx: {
                                    width: 32,
                                    height: 32,
                                    mr: 2,
                                    backgroundColor: getTrendColor(item.change),
                                    fontSize: 12
                                }, children: item.symbol.split('/')[0].slice(0, 2) }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { flexGrow: 1 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", fontWeight: "bold", children: item.symbol }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", color: "text.secondary", children: ["Vol: ", formatVolume(item.volume)] })] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { textAlign: 'right' }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body1", fontWeight: "bold", children: formatPrice(item.price, item.symbol) }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-end',
                                            color: getTrendColor(item.change)
                                        }, children: [getTrendIcon(item.change), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", sx: { ml: 0.5 }, children: [item.changePercent > 0 ? '+' : '', item.changePercent.toFixed(2), "%"] })] })] })] }, index))) }), (0, jsx_runtime_1.jsx)(material_1.Box, { sx: { mt: 2, textAlign: 'center' }, children: (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "caption", color: "text.secondary", children: ["Last update: ", data[0]?.lastUpdate.toLocaleTimeString()] }) })] }) }));
};
exports.default = RealTimeWidget;
