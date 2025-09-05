"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSettings = void 0;
const react_1 = require("react");
const defaultSettings = {
    theme: 'dark',
    language: 'en',
    currency: 'USD',
    timezone: 'UTC',
    autoRefresh: true,
    refreshInterval: 3000,
};
const useSettings = () => {
    const [settings, setSettings] = (0, react_1.useState)(() => {
        // Load from localStorage if available
        const saved = localStorage.getItem('app-settings');
        return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
    });
    const updateSetting = (0, react_1.useCallback)((key, value) => {
        setSettings(prev => {
            const newSettings = { ...prev, [key]: value };
            // Save to localStorage
            localStorage.setItem('app-settings', JSON.stringify(newSettings));
            return newSettings;
        });
    }, []);
    const resetSettings = (0, react_1.useCallback)(() => {
        setSettings(defaultSettings);
        localStorage.removeItem('app-settings');
    }, []);
    const saveSettings = (0, react_1.useCallback)((newSettings) => {
        setSettings(prev => {
            const updated = { ...prev, ...newSettings };
            localStorage.setItem('app-settings', JSON.stringify(updated));
            return updated;
        });
    }, []);
    return {
        settings,
        updateSetting,
        resetSettings,
        saveSettings,
    };
};
exports.useSettings = useSettings;
