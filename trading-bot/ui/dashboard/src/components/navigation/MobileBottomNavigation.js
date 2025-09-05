"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileBottomNavigation = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_router_dom_1 = require("react-router-dom");
const outline_1 = require("@heroicons/react/24/outline");
const solid_1 = require("@heroicons/react/24/solid");
const MobileBottomNavigation = () => {
    const navigate = (0, react_router_dom_1.useNavigate)();
    const location = (0, react_router_dom_1.useLocation)();
    const navItems = [
        {
            path: '/dashboard',
            label: 'Home',
            icon: outline_1.HomeIcon,
            iconSolid: solid_1.HomeIcon
        },
        {
            path: '/analytics',
            label: 'Analytics',
            icon: outline_1.ChartBarIcon,
            iconSolid: solid_1.ChartBarIcon
        },
        {
            path: '/portfolio',
            label: 'Portfolio',
            icon: outline_1.WalletIcon,
            iconSolid: solid_1.WalletIcon
        },
        {
            path: '/alerts',
            label: 'Alerts',
            icon: outline_1.BellIcon,
            iconSolid: solid_1.BellIcon
        },
        {
            path: '/settings',
            label: 'Settings',
            icon: outline_1.Cog6ToothIcon,
            iconSolid: solid_1.Cog6ToothIcon
        }
    ];
    return ((0, jsx_runtime_1.jsx)("div", { className: "md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg", children: (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-5 h-16", children: navItems.map((item) => {
                const isActive = location.pathname === item.path;
                const IconComponent = isActive ? item.iconSolid : item.icon;
                return ((0, jsx_runtime_1.jsxs)("button", { onClick: () => navigate(item.path), className: `
                flex flex-col items-center justify-center space-y-1 
                transition-all duration-200 ease-in-out
                ${isActive
                        ? 'text-trading-blue'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}
              `, children: [(0, jsx_runtime_1.jsx)(IconComponent, { className: `h-6 w-6 transition-transform ${isActive ? 'scale-110' : ''}` }), (0, jsx_runtime_1.jsx)("span", { className: `text-xs font-medium ${isActive ? 'font-semibold' : ''}`, children: item.label }), isActive && ((0, jsx_runtime_1.jsx)("div", { className: "absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-trading-blue rounded-b-full" }))] }, item.path));
            }) }) }));
};
exports.MobileBottomNavigation = MobileBottomNavigation;
exports.default = exports.MobileBottomNavigation;
