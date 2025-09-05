"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.useNotifications = void 0;
const react_1 = require("react");
const useNotifications = () => {
    (0, react_1.useEffect)(() => {
        // Request notification permission
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().then((permission) => {
                console.log('Notification permission:', permission);
            });
        }
        // Service worker for push notifications
        if ('serviceWorker' in navigator && 'PushManager' in window) {
            navigator.serviceWorker.ready.then((_registration) => {
                console.log('Service Worker ready for push notifications');
                // TODO: Setup push subscription
            });
        }
    }, []);
    const sendNotification = (title, options) => {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(title, {
                icon: '/icons/icon-192x192.png',
                badge: '/icons/icon-192x192.png',
                ...options,
            });
        }
    };
    return {
        sendNotification,
        isSupported: 'Notification' in window,
        permission: typeof Notification !== 'undefined' ? Notification.permission : 'denied',
    };
};
exports.useNotifications = useNotifications;
