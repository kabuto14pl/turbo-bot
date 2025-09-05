import React, { useState, useEffect } from 'react';
import { ResponsiveGrid, ResponsiveWidget } from './ResponsiveGrid';
import MobileNavigation from './MobileNavigation';
import { useMediaQuery } from '../hooks/useMediaQuery';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    // Load dark mode preference
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) {
      setIsDarkMode(JSON.parse(saved));
    }
  }, []);

  useEffect(() => {
    // Apply dark mode
    document.documentElement.classList.toggle('dark', isDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      {/* Mobile Navigation */}
      {isMobile && <MobileNavigation />}
      
      {/* Desktop Sidebar */}
      {!isMobile && (
        <div className="fixed inset-y-0 left-0 w-64 bg-trading-surface shadow-lg">
          {/* Sidebar content */}
          <div className="p-6">
            <h1 className="text-white text-xl font-bold">TradingBot Pro</h1>
          </div>
        </div>
      )}
      
      {/* Main Content */}
      <div className={`
        ${!isMobile ? 'ml-64' : ''}
        p-4 sm:p-6 lg:p-8
        min-h-screen
      `}>
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h2>
          <button
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
          >
            {isDarkMode ? '☀️' : '🌙'}
          </button>
        </div>
        
        {/* Content */}
        {children}
      </div>
    </div>
  );
};

export default DashboardLayout;