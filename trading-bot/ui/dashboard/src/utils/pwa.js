"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pwaManager = exports.PWAManager = void 0;
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// PWA Registration and Management
class PWAManager {
    constructor() {
        this.registration = null;
    }
    async init() {
        if ('serviceWorker' in navigator) {
            try {
                this.registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });
                console.log('Service Worker registered successfully');
                // Handle updates
                this.registration.addEventListener('updatefound', () => {
                    const newWorker = this.registration?.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New version available
                                this.showUpdateNotification();
                            }
                        });
                    }
                });
            }
            catch (error) {
                console.error('Service Worker registration failed:', error);
            }
        }
    }
    showUpdateNotification() {
        if (window.confirm('New version available! Reload to update?')) {
            window.location.reload();
        }
    }
    async requestNotificationPermission() {
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            return permission === 'granted';
        }
        return false;
    }
    async subscribeToPushNotifications() {
        if (!this.registration)
            return null;
        try {
            const subscription = await this.registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(process.env.REACT_APP_VAPID_PUBLIC_KEY || '')
            });
            // Send subscription to server
            await this.sendSubscriptionToServer(subscription);
            return subscription;
        }
        catch (error) {
            console.error('Push subscription failed:', error);
            return null;
        }
    }
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }
    async sendSubscriptionToServer(subscription) {
        // Send subscription to your backend server
        await fetch('/api/push-subscription', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(subscription)
        });
    }
    async installApp() {
        // Handle app installation prompt
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            const installButton = document.getElementById('install-button');
            if (installButton) {
                installButton.style.display = 'block';
                installButton.addEventListener('click', async () => {
                    e.prompt();
                    const { outcome } = await e.userChoice;
                    console.log(`User response to the install prompt: ${outcome}`);
                    installButton.style.display = 'none';
                });
            }
        });
    }
}
exports.PWAManager = PWAManager;
exports.pwaManager = new PWAManager();
