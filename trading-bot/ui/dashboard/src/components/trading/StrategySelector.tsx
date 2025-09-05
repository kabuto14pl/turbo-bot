import React, { useState } from 'react';
import { ChevronDownIcon, ArrowTrendingUpIcon, ArrowTrendingDownIcon } from '@heroicons/react/24/outline';

interface Strategy {
  id: string;
  name: string;
  performance: number;
  sharpe: number;
  drawdown: number;
  status: 'active' | 'inactive';
}

export const StrategySelector: React.FC = () => {
  const [selectedStrategy, setSelectedStrategy] = useState<string>('RSITurbo');
  const [comparisonStrategy, setComparisonStrategy] = useState<string>('SuperTrend');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const strategies: Strategy[] = [
    { id: 'RSITurbo', name: 'RSI Turbo', performance: 15.2, sharpe: 1.4, drawdown: 3.2, status: 'active' },
    { id: 'SuperTrend', name: 'SuperTrend', performance: 12.8, sharpe: 1.2, drawdown: 4.1, status: 'active' },
    { id: 'MACD', name: 'MACD Cross', performance: 9.5, sharpe: 0.9, drawdown: 5.5, status: 'inactive' },
    { id: 'BollingerBands', name: 'Bollinger Bands', performance: 11.2, sharpe: 1.1, drawdown: 4.8, status: 'active' }
  ];

  const StrategyCard: React.FC<{ strategy: Strategy; label: string; isActive?: boolean }> = ({ 
    strategy, 
    label, 
    isActive = false 
  }) => (
    <div className={`
      p-4 rounded-lg border-2 transition-all
      ${isActive 
        ? 'border-trading-blue bg-blue-50 dark:bg-blue-900/20' 
        : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
      }
    `}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</span>
        <span className={`
          px-2 py-1 rounded-full text-xs font-medium
          ${strategy.status === 'active' 
            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
          }
        `}>
          {strategy.status}
        </span>
      </div>
      
      <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">{strategy.name}</h3>
      
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Performance</span>
          <div className="flex items-center">
            {strategy.performance > 0 ? (
              <ArrowTrendingUpIcon className="h-4 w-4 text-trading-green mr-1" />
            ) : (
              <ArrowTrendingDownIcon className="h-4 w-4 text-trading-red mr-1" />
            )}
            <span className={`font-medium ${strategy.performance > 0 ? 'text-trading-green' : 'text-trading-red'}`}>
              {strategy.performance > 0 ? '+' : ''}{strategy.performance}%
            </span>
          </div>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Sharpe Ratio</span>
          <span className="font-medium text-gray-900 dark:text-white">{strategy.sharpe}</span>
        </div>
        
        <div className="flex justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Max Drawdown</span>
          <span className="font-medium text-trading-red">{strategy.drawdown}%</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Strategy Selector */}
      <div className="relative">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Active Strategy
        </label>
        <button
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm hover:border-trading-blue focus:border-trading-blue focus:ring-2 focus:ring-trading-blue/20 transition-all"
        >
          <span className="text-gray-900 dark:text-white">
            {strategies.find(s => s.id === selectedStrategy)?.name}
          </span>
          <ChevronDownIcon className={`h-5 w-5 text-gray-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown */}
        {isDropdownOpen && (
          <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg">
            {strategies.map(strategy => (
              <button
                key={strategy.id}
                onClick={() => {
                  setSelectedStrategy(strategy.id);
                  setIsDropdownOpen(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 first:rounded-t-lg last:rounded-b-lg transition-colors"
              >
                <div className="flex justify-between items-center">
                  <span className="text-gray-900 dark:text-white">{strategy.name}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`text-sm font-medium ${strategy.performance > 0 ? 'text-trading-green' : 'text-trading-red'}`}>
                      {strategy.performance > 0 ? '+' : ''}{strategy.performance}%
                    </span>
                    <span className={`
                      px-2 py-1 rounded-full text-xs
                      ${strategy.status === 'active' 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-400'
                      }
                    `}>
                      {strategy.status}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* A/B Comparison Panel */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <StrategyCard 
          strategy={strategies.find(s => s.id === selectedStrategy)!}
          label="Active Strategy"
          isActive={true}
        />
        <StrategyCard 
          strategy={strategies.find(s => s.id === comparisonStrategy)!}
          label="Comparison"
        />
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        <button className="px-4 py-2 bg-trading-blue text-white rounded-lg hover:bg-blue-700 transition-colors">
          Switch Strategy
        </button>
        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          View Backtest
        </button>
        <button className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors">
          Clone & Modify
        </button>
      </div>
    </div>
  );
};

export default StrategySelector;