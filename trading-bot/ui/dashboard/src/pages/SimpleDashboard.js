"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const material_1 = require("@mui/material");
const SimpleDashboard = () => {
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { p: 3 }, children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h4", gutterBottom: true, children: "Trading Bot Dashboard" }), (0, jsx_runtime_1.jsx)(material_1.Card, { sx: { mt: 2 }, children: (0, jsx_runtime_1.jsxs)(material_1.CardContent, { children: [(0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "h6", children: "System Status: Online" }), (0, jsx_runtime_1.jsx)(material_1.Typography, { variant: "body1", sx: { mt: 1 }, children: "Dashboard jest gotowy do dzia\u0142ania!" })] }) })] }));
};
exports.default = SimpleDashboard;
