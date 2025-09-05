"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StrategySelector = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const outline_1 = require("@heroicons/react/24/outline");
const StrategySelector = () => {
    const [selectedStrategy, setSelectedStrategy] = (0, react_1.useState)('RSITurbo');
    const [comparisonStrategy, setComparisonStrategy] = (0, react_1.useState)('SuperTrend');
    const [isDropdownOpen, setIsDropdownOpen] = (0, react_1.useState)(false);
    const strategies = [
        { id: 'RSITurbo', name: 'RSI Turbo', performance: 15.2, sharpe: 1.4, drawdown: 3.2, status: 'active' },
        { id: 'SuperTrend', name: 'SuperTrend', performance: 12.8, sharpe: 1.2, drawdown: 4.1, status: 'active' },
        { id: 'MACD', name: 'MACD Cross', performance: 9.5, sharpe: 0.9, drawdown: 5.5, status: 'inactive' },
        { id: 'BollingerBands', name: 'Bollinger Bands', performance: 11.2, sharpe: 1.1, drawdown: 4.8, status: 'active' }
    ];
    const StrategyCard = ({ strategy, label, isActive = false }) => ((0, jsx_runtime_1.jsxs)("div", { className: `
      p-4 rounded-lg border-2 transition-all
      ${isActive
            ? 'border-trading-blue bg-blue-50 dark:bg-blue-900/20'
            : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'}
    `, children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center mb-2", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm font-medium text-gray-600 dark:text-gray-400", children: label }), (0, jsx_runtime_1.jsx)("span", { className: `
          px-2 py-1 rounded-full text-xs font-medium
          ${strategy.status === 'active'
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'}
        `, children: strategy.status })] }), (0, jsx_runtime_1.jsx)("h3", { className: "font-bold text-lg text-gray-900 dark:text-white mb-3", children: strategy.name }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-2", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Performance" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center", children: [strategy.performance > 0 ? ((0, jsx_runtime_1.jsx)(outline_1.ArrowTrendingUpIcon, { className: "h-4 w-4 text-trading-green mr-1" })) : ((0, jsx_runtime_1.jsx)(outline_1.ArrowTrendingDownIcon, { className: "h-4 w-4 text-trading-red mr-1" })), (0, jsx_runtime_1.jsxs)("span", { className: `font-medium ${strategy.performance > 0 ? 'text-trading-green' : 'text-trading-red'}`, children: [strategy.performance > 0 ? '+' : '', strategy.performance, "%"] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Sharpe Ratio" }), (0, jsx_runtime_1.jsx)("span", { className: "font-medium text-gray-900 dark:text-white", children: strategy.sharpe })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-600 dark:text-gray-400", children: "Max Drawdown" }), (0, jsx_runtime_1.jsxs)("span", { className: "font-medium text-trading-red", children: [strategy.drawdown, "%"] })] })] })] }));
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6", children: [(0, jsx_runtime_1.jsxs)("div", { className: "relative", children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2", children: "Active Strategy" }), (0, jsx_runtime_1.jsxs)("button", { onClick: () => setIsDropdownOpen(!isDropdownOpen), className: "w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-trading-blue focus:border-trading-blue focus:ring-2 focus:ring-trading-blue/20 transition-all", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-gray-900 dark:text-white", children: strategies.find(s => s.id === selectedStrategy)?.name }), (0, jsx_runtime_1.jsx)(outline_1.ChevronDownIcon, { className: `h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}` })] }), isDropdownOpen && ((0, jsx_runtime_1.jsx)("div", { className: "absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg", children: strategies.map(strategy => ((0, jsx_runtime_1.jsx)("button", { onClick: () => {
                                setSelectedStrategy(strategy.id);
                                setIsDropdownOpen(false);
                            }, className: "w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors", children: (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("span", { className: "text-gray-900 dark:text-white", children: strategy.name }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsxs)("span", { className: `text-sm font-medium ${strategy.performance > 0 ? 'text-trading-green' : 'text-trading-red'}`, children: [strategy.performance > 0 ? '+' : '', strategy.performance, "%"] }), (0, jsx_runtime_1.jsx)("span", { className: `
                      px-2 py-1 rounded-full text-xs
                      ${strategy.status === 'active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                                                    : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'}
                    `, children: strategy.status })] })] }) }, strategy.id))) }))] }), (0, jsx_runtime_1.jsxs)("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-4", children: [(0, jsx_runtime_1.jsx)(StrategyCard, { strategy: strategies.find(s => s.id === selectedStrategy), label: "Active Strategy", isActive: true }), (0, jsx_runtime_1.jsx)(StrategyCard, { strategy: strategies.find(s => s.id === comparisonStrategy), label: "Comparison" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex flex-wrap gap-2", children: [(0, jsx_runtime_1.jsx)("button", { className: "px-4 py-2 bg-trading-blue text-white rounded-lg hover:bg-blue-700 transition-colors", children: "Switch Strategy" }), (0, jsx_runtime_1.jsx)("button", { className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors", children: "View Backtest" }), (0, jsx_runtime_1.jsx)("button", { className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors", children: "Clone & Modify" })] })] }));
};
exports.StrategySelector = StrategySelector;
exports.default = exports.StrategySelector;
