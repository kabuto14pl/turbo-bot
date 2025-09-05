"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AlertCustomization = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("react");
const outline_1 = require("@heroicons/react/24/outline");
const AlertCustomization = () => {
    const [drawdownThreshold, setDrawdownThreshold] = (0, react_1.useState)(5);
    const [profitTarget, setProfitTarget] = (0, react_1.useState)(15);
    const [riskLevel, setRiskLevel] = (0, react_1.useState)('MEDIUM');
    const [enablePushNotifications, setEnablePushNotifications] = (0, react_1.useState)(true);
    const [enableEmailAlerts, setEnableEmailAlerts] = (0, react_1.useState)(false);
    const [updating, setUpdating] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        loadAlertSettings();
    }, []);
    const loadAlertSettings = async () => {
        try {
            const response = await fetch('http://localhost:9093/api/alerts');
            const data = await response.json();
            if (response.ok) {
                setDrawdownThreshold(data.drawdownThreshold || 5);
                setProfitTarget(data.profitTarget || 15);
                setRiskLevel(data.riskLevel || 'MEDIUM');
                setEnablePushNotifications(data.notifications?.push || true);
                setEnableEmailAlerts(data.notifications?.email || false);
            }
        }
        catch (error) {
            console.error('Failed to load alert settings:', error);
        }
    };
    const updateAlertSetting = async (setting, value) => {
        setUpdating(true);
        try {
            const response = await fetch('http://localhost:9093/api/alerts/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ [setting]: value })
            });
            const data = await response.json();
            if (data.success) {
                console.log(`✅ ${setting} updated successfully`);
            }
            else {
                console.error(`❌ Failed to update ${setting}:`, data.message);
            }
        }
        catch (error) {
            console.error(`❌ Failed to update ${setting}:`, error);
        }
        finally {
            setUpdating(false);
        }
    };
    const handleDrawdownChange = (value) => {
        setDrawdownThreshold(value);
        updateAlertSetting('drawdownThreshold', value);
    };
    const handleProfitTargetChange = (value) => {
        setProfitTarget(value);
        updateAlertSetting('profitTarget', value);
    };
    const handleRiskLevelChange = (value) => {
        setRiskLevel(value);
        updateAlertSetting('riskLevel', value);
    };
    const riskLevels = [
        { value: 'LOW', label: 'Conservative', color: 'bg-green-500' },
        { value: 'MEDIUM', label: 'Moderate', color: 'bg-yellow-500' },
        { value: 'HIGH', label: 'Aggressive', color: 'bg-red-500' }
    ];
    return ((0, jsx_runtime_1.jsxs)("div", { className: "space-y-6 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-3", children: [(0, jsx_runtime_1.jsx)(outline_1.BellIcon, { className: "h-6 w-6 text-trading-blue" }), (0, jsx_runtime_1.jsx)("h3", { className: "text-xl font-bold text-gray-900 dark:text-white", children: "Alert Settings" })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: "Drawdown Alert Threshold" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)(outline_1.ExclamationTriangleIcon, { className: "h-4 w-4 text-trading-red" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-lg font-bold text-trading-red", children: [drawdownThreshold, "%"] })] })] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "3", max: "10", step: "0.5", value: drawdownThreshold, onChange: (e) => handleDrawdownChange(Number(e.target.value)), className: "w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider", style: {
                            background: `linear-gradient(to right, #ff1744 0%, #ff1744 ${((drawdownThreshold - 3) / 7) * 100}%, #e5e7eb ${((drawdownThreshold - 3) / 7) * 100}%, #e5e7eb 100%)`
                        }, disabled: updating }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-xs text-gray-500", children: [(0, jsx_runtime_1.jsx)("span", { children: "3% (Conservative)" }), (0, jsx_runtime_1.jsx)("span", { children: "10% (Aggressive)" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between items-center", children: [(0, jsx_runtime_1.jsx)("label", { className: "text-sm font-medium text-gray-700 dark:text-gray-300", children: "Profit Target" }), (0, jsx_runtime_1.jsxs)("div", { className: "flex items-center space-x-2", children: [(0, jsx_runtime_1.jsx)(outline_1.CheckCircleIcon, { className: "h-4 w-4 text-trading-green" }), (0, jsx_runtime_1.jsxs)("span", { className: "text-lg font-bold text-trading-green", children: [profitTarget, "%"] })] })] }), (0, jsx_runtime_1.jsx)("input", { type: "range", min: "10", max: "30", step: "1", value: profitTarget, onChange: (e) => handleProfitTargetChange(Number(e.target.value)), className: "w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700", style: {
                            background: `linear-gradient(to right, #00c853 0%, #00c853 ${((profitTarget - 10) / 20) * 100}%, #e5e7eb ${((profitTarget - 10) / 20) * 100}%, #e5e7eb 100%)`
                        }, disabled: updating }), (0, jsx_runtime_1.jsxs)("div", { className: "flex justify-between text-xs text-gray-500", children: [(0, jsx_runtime_1.jsx)("span", { children: "10% (Conservative)" }), (0, jsx_runtime_1.jsx)("span", { children: "30% (Aggressive)" })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsx)("label", { className: "block text-sm font-medium text-gray-700 dark:text-gray-300", children: "Overall Risk Level" }), (0, jsx_runtime_1.jsx)("div", { className: "grid grid-cols-3 gap-2", children: riskLevels.map(level => ((0, jsx_runtime_1.jsx)("button", { onClick: () => handleRiskLevelChange(level.value), disabled: updating, className: `
                px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${riskLevel === level.value
                                ? `${level.color} text-white shadow-lg scale-105`
                                : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'} ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `, children: (0, jsx_runtime_1.jsxs)("div", { className: "text-center", children: [(0, jsx_runtime_1.jsx)("div", { className: "font-bold", children: level.value }), (0, jsx_runtime_1.jsx)("div", { className: "text-xs opacity-90", children: level.label })] }) }, level.value))) })] }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-4 border-t border-gray-200 dark:border-gray-600 pt-6", children: [(0, jsx_runtime_1.jsx)("h4", { className: "font-medium text-gray-900 dark:text-white", children: "Notification Preferences" }), (0, jsx_runtime_1.jsxs)("div", { className: "space-y-3", children: [(0, jsx_runtime_1.jsxs)("label", { className: "flex items-center space-x-3 cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: enablePushNotifications, onChange: (e) => setEnablePushNotifications(e.target.checked), className: "w-4 h-4 text-trading-blue bg-gray-100 border-gray-300 rounded focus:ring-trading-blue dark:focus:ring-trading-blue dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: "Push Notifications" })] }), (0, jsx_runtime_1.jsxs)("label", { className: "flex items-center space-x-3 cursor-pointer", children: [(0, jsx_runtime_1.jsx)("input", { type: "checkbox", checked: enableEmailAlerts, onChange: (e) => setEnableEmailAlerts(e.target.checked), className: "w-4 h-4 text-trading-blue bg-gray-100 border-gray-300 rounded focus:ring-trading-blue dark:focus:ring-trading-blue dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600" }), (0, jsx_runtime_1.jsx)("span", { className: "text-sm text-gray-700 dark:text-gray-300", children: "Email Alerts" })] })] })] }), (0, jsx_runtime_1.jsxs)("div", { className: "flex space-x-3 pt-4", children: [(0, jsx_runtime_1.jsx)("button", { className: "flex-1 px-4 py-2 bg-trading-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-medium", children: "Save Settings" }), (0, jsx_runtime_1.jsx)("button", { className: "px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors", children: "Reset" })] })] }));
};
exports.AlertCustomization = AlertCustomization;
exports.default = exports.AlertCustomization;
