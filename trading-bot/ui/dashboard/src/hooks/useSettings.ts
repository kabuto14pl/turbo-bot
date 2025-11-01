/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
import { useState, useCallback } from 'react';

export type Theme = 'light' | 'dark';
export type Language = 'en' | 'pl' | 'es' | 'fr' | 'de';

interface SettingsState {
  theme: Theme;
  language: Language;
  currency: string;
  timezone: string;
  autoRefresh: boolean;
  refreshInterval: number;
}

const defaultSettings: SettingsState = {
  theme: 'dark',
  language: 'en',
  currency: 'USD',
  timezone: 'UTC',
  autoRefresh: true,
  refreshInterval: 3000,
};

export const useSettings = () => {
  const [settings, setSettings] = useState<SettingsState>(() => {
    // Load from localStorage if available
    const saved = localStorage.getItem('app-settings');
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const updateSetting = useCallback(<K extends keyof SettingsState>(
    key: K,
    value: SettingsState[K]
  ) => {
    setSettings(prev => {
      const newSettings = { ...prev, [key]: value };
      // Save to localStorage
      localStorage.setItem('app-settings', JSON.stringify(newSettings));
      return newSettings;
    });
  }, []);

  const resetSettings = useCallback(() => {
    setSettings(defaultSettings);
    localStorage.removeItem('app-settings');
  }, []);

  const saveSettings = useCallback((newSettings: Partial<SettingsState>) => {
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
