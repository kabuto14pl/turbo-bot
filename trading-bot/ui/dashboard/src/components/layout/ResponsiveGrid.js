"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ResponsiveWidget = exports.ResponsiveGrid = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const ResponsiveGrid = ({ children, className = '' }) => {
    return ((0, jsx_runtime_1.jsx)("div", { className: `
      grid gap-4
      grid-cols-1 
      sm:grid-cols-2 
      lg:grid-cols-3 
      xl:grid-cols-4
      2xl:grid-cols-5
      ${className}
    `, children: children }));
};
exports.ResponsiveGrid = ResponsiveGrid;
const ResponsiveWidget = ({ children, colSpan = 1, className = '' }) => {
    const colSpanClasses = {
        1: 'col-span-1',
        2: 'col-span-1 sm:col-span-2 lg:col-span-1 xl:col-span-2',
        3: 'col-span-1 sm:col-span-2 lg:col-span-3',
        4: 'col-span-full lg:col-span-3 xl:col-span-4'
    };
    return ((0, jsx_runtime_1.jsx)("div", { className: `
      bg-white dark:bg-trading-surface 
      rounded-xl shadow-md hover:shadow-lg
      p-4 sm:p-6
      border border-gray-200 dark:border-gray-700
      transition-all duration-200
      ${colSpanClasses[colSpan]}
      ${className}
    `, children: children }));
};
exports.ResponsiveWidget = ResponsiveWidget;
exports.default = { ResponsiveGrid: exports.ResponsiveGrid, ResponsiveWidget: exports.ResponsiveWidget };
