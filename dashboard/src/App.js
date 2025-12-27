"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const TradingDashboard_1 = __importDefault(require("../TradingDashboard"));
require("./index.css");
function App() {
    return ((0, jsx_runtime_1.jsx)("div", { className: "min-h-screen bg-gray-100 p-4", children: (0, jsx_runtime_1.jsx)(TradingDashboard_1.default, {}) }));
}
exports.default = App;
