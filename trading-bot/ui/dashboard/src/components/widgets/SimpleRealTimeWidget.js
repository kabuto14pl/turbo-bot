"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const material_1 = require("@mui/material");
const SimpleRealTimeWidget = () => {
    const [loading, setLoading] = (0, react_1.useState)(true);
    (0, react_1.useEffect)(() => {
        setLoading(false);
    }, []);
    if (loading) {
        return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsx)(material_1.CardContent, { children: (0, jsx_runtime_1.jsx)(material_1.Box, { sx: { display: 'flex', justifyContent: 'center', p: 2 }, children: (0, jsx_runtime_1.jsx)(material_1.CircularProgress, {}) }) }) }));
    }
    return ((0, jsx_runtime_1.jsx)(material_1.Card, { children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', alignItems: 'center', mb: 2 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", sx: { flexGrow: 1 }, children: "Live Prices" }), (0, jsx_runtime_1.jsx)(material_1.Chip, { size: "small", label: "LIVE", color: "success", variant: "outlined" })] }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body2", color: "text.secondary", children: "Price data will be loaded here" })] }) }));
};
exports.default = SimpleRealTimeWidget;
