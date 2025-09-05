import React, { useState } from 'react';
import { Transition } from '@headlessui/react';
import { 
  Bars3Icon, 
  XMarkIcon,
  ChartBarIcon,
  WalletIcon,
  CogIcon,
  BellIcon
} from '@heroicons/react/24/outline';
import { useNavigate } from 'react-router-dom';

export const MobileNavigation: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const menuItems = [
    { icon: ChartBarIcon, label: 'Dashboard', path: '/dashboard' },
    { icon: WalletIcon, label: 'Portfolio', path: '/portfolio' },
    { icon: BellIcon, label: 'Alerts', path: '/alerts' },
    { icon: CogIcon, label: 'Settings', path: '/settings' },
  ];

  return (
    <>
      {/* Mobile header */}
      <div className="lg:hidden flex items-center justify-between p-4 bg-trading-dark shadow-lg">
        <h1 className="text-white font-bold text-lg">TradingBot Pro</h1>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="text-white p-2 hover:bg-gray-700 rounded-lg transition-colors"
        >
          {isOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
        </button>
      </div>

      {/* Mobile menu overlay */}
      <Transition show={isOpen}>
        <div className="lg:hidden fixed inset-0 z-50">
          <Transition.Child
            enter="transition-opacity ease-linear duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="transition-opacity ease-linear duration-300"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsOpen(false)} />
          </Transition.Child>
          
          <Transition.Child
            enter="transition ease-in-out duration-300 transform"
            enterFrom="-translate-x-full"
            enterTo="translate-x-0"
            leave="transition ease-in-out duration-300 transform"
            leaveFrom="translate-x-0"
            leaveTo="-translate-x-full"
          >
            <div className="fixed inset-y-0 left-0 w-64 bg-trading-surface shadow-xl">
              {/* Header */}
              <div className="p-6 border-b border-gray-600">
                <h2 className="text-white text-xl font-bold">Navigation</h2>
              </div>
              
              {/* Navigation items */}
              <div className="p-4 space-y-2">
                {menuItems.map((item) => (
                  <button
                    key={item.path}
                    onClick={() => {
                      navigate(item.path);
                      setIsOpen(false);
                    }}
                    className="w-full flex items-center space-x-3 p-3 text-gray-300 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <item.icon className="h-6 w-6" />
                    <span className="font-medium">{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </Transition.Child>
        </div>
      </Transition>
    </>
  );
};

export default MobileNavigation;