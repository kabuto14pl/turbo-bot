"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
// Mock candlestick data for BTC/USDT
const mockCandleData = [
    { time: '09:00', open: 44800, high: 45200, low: 44600, close: 45100, volume: 1250 },
    { time: '09:15', open: 45100, high: 45300, low: 44900, close: 44950, volume: 890 },
    { time: '09:30', open: 44950, high: 45400, low: 44800, close: 45350, volume: 1560 },
    { time: '09:45', open: 45350, high: 45600, low: 45200, close: 45480, volume: 920 },
    { time: '10:00', open: 45480, high: 45700, low: 45300, close: 45650, volume: 1340 },
    { time: '10:15', open: 45650, high: 45800, low: 45400, close: 45420, volume: 760 },
    { time: '10:30', open: 45420, high: 45500, low: 45100, close: 45280, volume: 1100 },
    { time: '10:45', open: 45280, high: 45450, low: 45000, close: 45180, volume: 980 },
];
const CandlestickChart = ({ symbol = 'BTC/USDT', data = mockCandleData, height = 400 }) => {
    const [timeframe, setTimeframe] = (0, react_1.useState)('15m');
    const formatPrice = (value) => {
        return `$${value.toLocaleString()}`;
    };
    const formatVolume = (value) => {
        return `${(value / 1000).toFixed(1)}K`;
    };
    const currentPrice = data[data.length - 1]?.close || 0;
    const previousPrice = data[data.length - 2]?.close || 0;
    const priceChange = currentPrice - previousPrice;
    const priceChangePercent = (priceChange / previousPrice) * 100;
    // Calculate price range for scaling
    const allPrices = data.flatMap(d => [d.open, d.high, d.low, d.close]);
    const minPrice = Math.min(...allPrices);
    const maxPrice = Math.max(...allPrices);
    const priceRange = maxPrice - minPrice;
    return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }, children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "h6", gutterBottom: true, children: [symbol, " Price Chart"] }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', gap: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h5", fontWeight: "bold", children: formatPrice(currentPrice) }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body1", color: priceChange >= 0 ? 'success.main' : 'error.main', sx: { display: 'flex', alignItems: 'center' }, children: [priceChange >= 0 ? '+' : '', formatPrice(priceChange), "(", priceChange >= 0 ? '+' : '', priceChangePercent.toFixed(2), "%)"] })] })] }), (0, jsx_runtime_1.jsxs)(material_1.ToggleButtonGroup, { value: timeframe, exclusive: true, onChange: (_, newTimeframe) => newTimeframe && setTimeframe(newTimeframe), size: "small", children: [(0, jsx_runtime_1.jsx)(material_1.ToggleButton, { value: "5m", children: "5m" }), (0, jsx_runtime_1.jsx)(material_1.ToggleButton, { value: "15m", children: "15m" }), (0, jsx_runtime_1.jsx)(material_1.ToggleButton, { value: "1h", children: "1h" }), (0, jsx_runtime_1.jsx)(material_1.ToggleButton, { value: "4h", children: "4h" }), (0, jsx_runtime_1.jsx)(material_1.ToggleButton, { value: "1d", children: "1d" })] })] }), (0, jsx_runtime_1.jsx)(material_1.Box, { sx: {
                        backgroundColor: 'rgba(255,255,255,0.05)',
                        p: 2,
                        borderRadius: 2,
                        height: height || 400
                    }, children: (0, jsx_runtime_1.jsxs)("svg", { width: "100%", height: "100%", viewBox: "0 0 800 360", children: [(0, jsx_runtime_1.jsx)("defs", { children: (0, jsx_runtime_1.jsx)("pattern", { id: "chartGrid", width: "40", height: "30", patternUnits: "userSpaceOnUse", children: (0, jsx_runtime_1.jsx)("path", { d: "M 40 0 L 0 0 0 30", fill: "none", stroke: "rgba(255,255,255,0.1)", strokeWidth: "0.5" }) }) }), (0, jsx_runtime_1.jsx)("rect", { width: "100%", height: "300", fill: "url(#chartGrid)" }), data.map((candle, index) => {
                                const x = (index / (data.length - 1)) * 760 + 20;
                                const candleWidth = 12;
                                // Scale prices to chart height
                                const high = 280 - ((candle.high - minPrice) / priceRange * 260);
                                const low = 280 - ((candle.low - minPrice) / priceRange * 260);
                                const open = 280 - ((candle.open - minPrice) / priceRange * 260);
                                const close = 280 - ((candle.close - minPrice) / priceRange * 260);
                                const isGreen = candle.close >= candle.open;
                                const bodyTop = Math.min(open, close);
                                const bodyHeight = Math.abs(close - open);
                                return ((0, jsx_runtime_1.jsxs)("g", { children: [(0, jsx_runtime_1.jsx)("line", { x1: x, y1: high, x2: x, y2: low, stroke: isGreen ? "#4caf50" : "#f44336", strokeWidth: 1 }), (0, jsx_runtime_1.jsx)("rect", { x: x - candleWidth / 2, y: bodyTop, width: candleWidth, height: Math.max(bodyHeight, 1), fill: isGreen ? "#4caf50" : "#f44336", stroke: isGreen ? "#4caf50" : "#f44336", strokeWidth: 1, opacity: isGreen ? 0.8 : 1 }), (0, jsx_runtime_1.jsx)("rect", { x: x - 6, y: 320, width: 12, height: Math.min((candle.volume / Math.max(...data.map(d => d.volume))) * 30, 30), fill: "rgba(33, 150, 243, 0.5)" })] }, index));
                            }), (0, jsx_runtime_1.jsx)("text", { x: "5", y: "25", fill: "#888", fontSize: "12", children: formatPrice(maxPrice) }), (0, jsx_runtime_1.jsx)("text", { x: "5", y: "150", fill: "#888", fontSize: "12", children: formatPrice((maxPrice + minPrice) / 2) }), (0, jsx_runtime_1.jsx)("text", { x: "5", y: "275", fill: "#888", fontSize: "12", children: formatPrice(minPrice) }), data.map((candle, index) => {
                                if (index % 2 === 0) {
                                    const x = (index / (data.length - 1)) * 760 + 20;
                                    return ((0, jsx_runtime_1.jsx)("text", { x: x, y: "375", textAnchor: "middle", fill: "#888", fontSize: "10", children: candle.time }, index));
                                }
                                return null;
                            })] }) }), (0, jsx_runtime_1.jsxs)(material_1.Box, { sx: {
                        display: 'flex',
                        justifyContent: 'space-between',
                        mt: 2,
                        p: 2,
                        backgroundColor: 'rgba(255,255,255,0.03)',
                        borderRadius: 1
                    }, children: [(0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", color: "text.secondary", children: ["\uD83D\uDCCA ", data.length, " candles (", timeframe, ")"] }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", color: "text.secondary", children: ["\uD83D\uDCC8 Range: ", formatPrice(minPrice), " - ", formatPrice(maxPrice)] }), (0, jsx_runtime_1.jsxs)(material_1.Typography, { variant: "body2", color: "text.secondary", children: ["\uD83D\uDCE6 Volume: ", formatVolume(data.reduce((sum, d) => sum + d.volume, 0))] })] })] }) }));
};
exports.default = CandlestickChart;
