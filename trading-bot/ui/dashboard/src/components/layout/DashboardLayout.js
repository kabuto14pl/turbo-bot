"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DashboardLayout = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const MobileNavigation_1 = __importDefault(require("./MobileNavigation"));
const useMediaQuery_1 = require("../hooks/useMediaQuery");
const DashboardLayout = ({ children }) => {
    const [isDarkMode, setIsDarkMode] = (0, react_1.useState)(false);
    const isMobile = (0, useMediaQuery_1.useMediaQuery)('(max-width: 768px)');
    (0, react_1.useEffect)(() => {
        // Load dark mode preference
        const saved = localStorage.getItem('darkMode');
        if (saved !== null) {
            setIsDarkMode(JSON.parse(saved));
        }
    }, []);
    (0, react_1.useEffect)(() => {
        // Apply dark mode
        document.documentElement.classList.toggle('dark', isDarkMode);
        localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
    }, [isDarkMode]);
    return ((0, jsx_runtime_1.jsxs)("div", { className: "min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200", children: [isMobile && (0, jsx_runtime_1.jsx)(MobileNavigation_1.default, {}), !isMobile && ((0, jsx_runtime_1.jsx)("div", { className: "fixed inset-y-0 left-0 w-64 bg-trading-surface shadow-lg", children: (0, jsx_runtime_1.jsx)("div", { className: "p-6", children: (0, jsx_runtime_1.jsx)("h1", { className: "text-white text-xl font-bold", children: "TradingBot Pro" }) }) })), (0, jsx_runtime_1.jsxs)("div", { className: `
        ${!isMobile ? 'ml-64' : ''}
        p-4 sm:p-6 lg:p-8
        min-h-screen
      `, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mb-6", children: [(0, jsx_runtime_1.jsx)("h2", { className: "text-2xl font-bold text-gray-900 dark:text-white", children: "Dashboard" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setIsDarkMode(!isDarkMode), className: "p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors", children: isDarkMode ? '☀️' : '🌙' })] }), children] })] }));
};
exports.DashboardLayout = DashboardLayout;
exports.default = exports.DashboardLayout;
