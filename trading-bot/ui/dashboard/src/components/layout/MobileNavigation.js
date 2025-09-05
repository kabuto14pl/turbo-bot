"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileNavigation = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const react_2 = require("@headlessui/react");
const outline_1 = require("@heroicons/react/24/outline");
const react_router_dom_1 = require("react-router-dom");
const MobileNavigation = () => {
    const [isOpen, setIsOpen] = (0, react_1.useState)(false);
    const navigate = (0, react_router_dom_1.useNavigate)();
    const menuItems = [
        { icon: outline_1.ChartBarIcon, label: 'Dashboard', path: '/dashboard' },
        { icon: outline_1.WalletIcon, label: 'Portfolio', path: '/portfolio' },
        { icon: outline_1.BellIcon, label: 'Alerts', path: '/alerts' },
        { icon: outline_1.CogIcon, label: 'Settings', path: '/settings' },
    ];
    return ((0, jsx_runtime_1.jsxs)(jsx_runtime_1.Fragment, { children: [(0, jsx_runtime_1.jsxs)("div", { className: "lg:hidden flex items-center justify-between p-4 bg-trading-dark shadow-lg", children: [(0, jsx_runtime_1.jsx)("h1", { className: "text-white font-bold text-lg", children: "TradingBot Pro" }), (0, jsx_runtime_1.jsx)("button", { onClick: () => setIsOpen(!isOpen), className: "text-white p-2 hover:bg-gray-700 rounded-lg transition-colors", children: isOpen ? (0, jsx_runtime_1.jsx)(outline_1.XMarkIcon, { className: "h-6 w-6" }) : (0, jsx_runtime_1.jsx)(outline_1.Bars3Icon, { className: "h-6 w-6" }) })] }), (0, jsx_runtime_1.jsx)(react_2.Transition, { show: isOpen, children: (0, jsx_runtime_1.jsxs)("div", { className: "lg:hidden fixed inset-0 z-50", children: [(0, jsx_runtime_1.jsx)(react_2.Transition.Child, { enter: "transition-opacity ease-linear duration-300", enterFrom: "opacity-0", enterTo: "opacity-100", leave: "transition-opacity ease-linear duration-300", leaveFrom: "opacity-100", leaveTo: "opacity-0", children: (0, jsx_runtime_1.jsx)("div", { className: "fixed inset-0 bg-black/50", onClick: () => setIsOpen(false) }) }), (0, jsx_runtime_1.jsx)(react_2.Transition.Child, { enter: "transition ease-in-out duration-300 transform", enterFrom: "-translate-x-full", enterTo: "translate-x-0", leave: "transition ease-in-out duration-300 transform", leaveFrom: "translate-x-0", leaveTo: "-translate-x-full", children: (0, jsx_runtime_1.jsxs)("div", { className: "fixed inset-y-0 left-0 w-64 bg-trading-surface shadow-xl", children: [(0, jsx_runtime_1.jsx)("div", { className: "p-6 border-b border-gray-600", children: (0, jsx_runtime_1.jsx)("h2", { className: "text-white text-xl font-bold", children: "Navigation" }) }), (0, jsx_runtime_1.jsx)("div", { className: "p-4 space-y-2", children: menuItems.map((item) => ((0, jsx_runtime_1.jsxs)("button", { onClick: () => {
                                                navigate(item.path);
                                                setIsOpen(false);
                                            }, className: "w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors", children: [(0, jsx_runtime_1.jsx)(item.icon, { className: "h-6 w-6" }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium", children: item.label })] }, item.path))) })] }) })] }) })] }));
};
exports.MobileNavigation = MobileNavigation;
exports.default = exports.MobileNavigation;
