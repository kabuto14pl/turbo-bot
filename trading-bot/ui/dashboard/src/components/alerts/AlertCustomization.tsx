import React, { useState, useEffect } from 'react';
import { BellIcon, ExclamationTriangleIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

export const AlertCustomization: React.FC = () => {
  const [drawdownThreshold, setDrawdownThreshold] = useState(5);
  const [profitTarget, setProfitTarget] = useState(15);
  const [riskLevel, setRiskLevel] = useState('MEDIUM');
  const [enablePushNotifications, setEnablePushNotifications] = useState(true);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(false);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
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
    } catch (error) {
      console.error('Failed to load alert settings:', error);
    }
  };

  const updateAlertSetting = async (setting: string, value: any) => {
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
      } else {
        console.error(`❌ Failed to update ${setting}:`, data.message);
      }
    } catch (error) {
      console.error(`❌ Failed to update ${setting}:`, error);
    } finally {
      setUpdating(false);
    }
  };

  const handleDrawdownChange = (value: number) => {
    setDrawdownThreshold(value);
    updateAlertSetting('drawdownThreshold', value);
  };

  const handleProfitTargetChange = (value: number) => {
    setProfitTarget(value);
    updateAlertSetting('profitTarget', value);
  };

  const handleRiskLevelChange = (value: string) => {
    setRiskLevel(value);
    updateAlertSetting('riskLevel', value);
  };

  const riskLevels = [
    { value: 'LOW', label: 'Conservative', color: 'bg-green-500' },
    { value: 'MEDIUM', label: 'Moderate', color: 'bg-yellow-500' },
    { value: 'HIGH', label: 'Aggressive', color: 'bg-red-500' }
  ];

  return (
    <div className="space-y-6 p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg">
      <div className="flex items-center space-x-3">
        <BellIcon className="h-6 w-6 text-trading-blue" />
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Alert Settings</h3>
      </div>
      
      {/* Drawdown Threshold */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Drawdown Alert Threshold
          </label>
          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="h-4 w-4 text-trading-red" />
            <span className="text-lg font-bold text-trading-red">{drawdownThreshold}%</span>
          </div>
        </div>
        
        <input
          type="range"
          min="3"
          max="10"
          step="0.5"
          value={drawdownThreshold}
          onChange={(e) => handleDrawdownChange(Number(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 slider"
          style={{
            background: `linear-gradient(to right, #ff1744 0%, #ff1744 ${((drawdownThreshold - 3) / 7) * 100}%, #e5e7eb ${((drawdownThreshold - 3) / 7) * 100}%, #e5e7eb 100%)`
          }}
          disabled={updating}
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>3% (Conservative)</span>
          <span>10% (Aggressive)</span>
        </div>
      </div>

      {/* Profit Target */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Profit Target
          </label>
          <div className="flex items-center space-x-2">
            <CheckCircleIcon className="h-4 w-4 text-trading-green" />
            <span className="text-lg font-bold text-trading-green">{profitTarget}%</span>
          </div>
        </div>
        
        <input
          type="range"
          min="10"
          max="30"
          step="1"
          value={profitTarget}
          onChange={(e) => handleProfitTargetChange(Number(e.target.value))}
          className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
          style={{
            background: `linear-gradient(to right, #00c853 0%, #00c853 ${((profitTarget - 10) / 20) * 100}%, #e5e7eb ${((profitTarget - 10) / 20) * 100}%, #e5e7eb 100%)`
          }}
          disabled={updating}
        />
        
        <div className="flex justify-between text-xs text-gray-500">
          <span>10% (Conservative)</span>
          <span>30% (Aggressive)</span>
        </div>
      </div>

      {/* Risk Level */}
      <div className="space-y-3">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Overall Risk Level
        </label>
        <div className="grid grid-cols-3 gap-2">
          {riskLevels.map(level => (
            <button
              key={level.value}
              onClick={() => handleRiskLevelChange(level.value)}
              disabled={updating}
              className={`
                px-4 py-3 rounded-lg text-sm font-medium transition-all
                ${riskLevel === level.value 
                  ? `${level.color} text-white shadow-lg scale-105`
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                } ${updating ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              `}
            >
              <div className="text-center">
                <div className="font-bold">{level.value}</div>
                <div className="text-xs opacity-90">{level.label}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Notification Preferences */}
      <div className="space-y-4 border-t border-gray-200 dark:border-gray-600 pt-6">
        <h4 className="font-medium text-gray-900 dark:text-white">Notification Preferences</h4>
        
        <div className="space-y-3">
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enablePushNotifications}
              onChange={(e) => setEnablePushNotifications(e.target.checked)}
              className="w-4 h-4 text-trading-blue bg-gray-100 border-gray-300 rounded focus:ring-trading-blue dark:focus:ring-trading-blue dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Push Notifications</span>
          </label>
          
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableEmailAlerts}
              onChange={(e) => setEnableEmailAlerts(e.target.checked)}
              className="w-4 h-4 text-trading-blue bg-gray-100 border-gray-300 rounded focus:ring-trading-blue dark:focus:ring-trading-blue dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Email Alerts</span>
          </label>
        </div>
      </div>

      {/* Save Settings */}
      <div className="flex space-x-3 pt-4">
        <button className="flex-1 px-4 py-2 bg-trading-blue text-white rounded-lg hover:bg-blue-700 transition-colors font-medium">
          Save Settings
        </button>
        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Reset
        </button>
      </div>
    </div>
  );
};

export default AlertCustomization;