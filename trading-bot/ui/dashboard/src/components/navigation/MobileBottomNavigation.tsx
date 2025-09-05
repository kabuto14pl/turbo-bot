import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ChartBarIcon,
  WalletIcon,
  BellIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import {
  HomeIcon as HomeIconSolid,
  ChartBarIcon as ChartBarIconSolid,
  WalletIcon as WalletIconSolid,
  BellIcon as BellIconSolid,
  Cog6ToothIcon as Cog6ToothIconSolid
} from '@heroicons/react/24/solid';

export const MobileBottomNavigation: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { 
      path: '/dashboard', 
      label: 'Home', 
      icon: HomeIcon, 
      iconSolid: HomeIconSolid 
    },
    { 
      path: '/analytics', 
      label: 'Analytics', 
      icon: ChartBarIcon, 
      iconSolid: ChartBarIconSolid 
    },
    { 
      path: '/portfolio', 
      label: 'Portfolio', 
      icon: WalletIcon, 
      iconSolid: WalletIconSolid 
    },
    { 
      path: '/alerts', 
      label: 'Alerts', 
      icon: BellIcon, 
      iconSolid: BellIconSolid 
    },
    { 
      path: '/settings', 
      label: 'Settings', 
      icon: Cog6ToothIcon, 
      iconSolid: Cog6ToothIconSolid 
    }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="grid grid-cols-5 h-16">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const IconComponent = isActive ? item.iconSolid : item.icon;
          
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`
                flex flex-col items-center justify-center space-y-1 
                transition-all duration-200 ease-in-out
                ${isActive 
                  ? 'text-trading-blue' 
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                }
              `}
            >
              <IconComponent className={`h-6 w-6 transition-transform ${isActive ? 'scale-110' : ''}`} />
              <span className={`text-xs font-medium ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-8 h-1 bg-trading-blue rounded-b-full" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default MobileBottomNavigation;