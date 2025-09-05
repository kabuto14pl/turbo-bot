"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_router_dom_1 = require("react-router-dom");
const material_1 = require("@mui/material");
const react_hot_toast_1 = require("react-hot-toast");
const tradingStore_1 = require("./store/tradingStore");
// Components
const Layout_1 = __importDefault(require("./components/Layout"));
const Dashboard_1 = __importDefault(require("./pages/Dashboard"));
const Portfolio_1 = __importDefault(require("./pages/Portfolio"));
const Trading_1 = __importDefault(require("./pages/Trading"));
const Analytics_1 = __importDefault(require("./pages/Analytics"));
const Settings_1 = __importDefault(require("./pages/Settings"));
const Alerts_1 = __importDefault(require("./pages/Alerts"));
// Services - commented out temporarily
// import { useWebSocket } from './hooks/useWebSocket'
// import { useNotifications } from './hooks/useNotifications'
// AppContent component with real-time features
function AppContent() {
    // Enable real-time features - DISABLED TEMPORARILY
    // useWebSocket()
    // useNotifications()
    (0, react_1.useEffect)(() => {
        // Set page title
        document.title = 'Trading Bot Dashboard';
        // Add viewport meta tag for mobile responsiveness
        const viewport = document.querySelector('meta[name=viewport]');
        if (viewport) {
            viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
        }
    }, []);
    return ((0, jsx_runtime_1.jsxs)(material_1.Box, { sx: { display: 'flex', minHeight: '100vh' }, children: [(0, jsx_runtime_1.jsx)(Layout_1.default, { children: (0, jsx_runtime_1.jsxs)(react_router_dom_1.Routes, { children: [(0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/dashboard", replace: true }) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/dashboard", element: (0, jsx_runtime_1.jsx)(Dashboard_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/portfolio", element: (0, jsx_runtime_1.jsx)(Portfolio_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/trading", element: (0, jsx_runtime_1.jsx)(Trading_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/analytics", element: (0, jsx_runtime_1.jsx)(Analytics_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/alerts", element: (0, jsx_runtime_1.jsx)(Alerts_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "/settings", element: (0, jsx_runtime_1.jsx)(Settings_1.default, {}) }), (0, jsx_runtime_1.jsx)(react_router_dom_1.Route, { path: "*", element: (0, jsx_runtime_1.jsx)(react_router_dom_1.Navigate, { to: "/dashboard", replace: true }) })] }) }), (0, jsx_runtime_1.jsx)(react_hot_toast_1.Toaster, { position: "top-right", toastOptions: {
                    duration: 4000,
                    style: {
                        background: '#363636',
                        color: '#fff',
                    }
                } })] }));
}
function App() {
    return ((0, jsx_runtime_1.jsx)(tradingStore_1.TradingProvider, { children: (0, jsx_runtime_1.jsx)(AppContent, {}) }));
}
exports.default = App;
