"use strict";
/**
 * 🔗 SIMPLE SYSTEM INTEGRATION COORDINATOR
 *
 * Simplified integration coordinator for testing purposes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SystemIntegrationCoordinator = void 0;
const events_1 = require("events");
class SystemIntegrationCoordinator extends events_1.EventEmitter {
    constructor() {
        super();
        this.components = new Map();
        this.isRunning = false;
        console.log('[INTEGRATION] Simple System Integration Coordinator initialized');
    }
    registerComponent(name, component) {
        this.components.set(name, component);
        console.log(`[INTEGRATION] Component registered: ${name}`);
    }
    getComponent(name) {
        return this.components.get(name);
    }
    async start() {
        if (this.isRunning) {
            console.log('[INTEGRATION] Already running');
            return;
        }
        this.isRunning = true;
        console.log('[INTEGRATION] Starting system integration...');
        // Setup event listeners between components
        for (const [name, component] of this.components) {
            if (component && typeof component.on === 'function') {
                component.on('*', (event) => {
                    console.log(`[INTEGRATION] Event from ${name}:`, event.type || 'unknown');
                });
            }
        }
        console.log('[INTEGRATION] ✅ System integration started');
    }
    async stop() {
        if (!this.isRunning) {
            console.log('[INTEGRATION] Not running');
            return;
        }
        this.isRunning = false;
        console.log('[INTEGRATION] Stopping system integration...');
        // Clean up event listeners
        this.removeAllListeners();
        console.log('[INTEGRATION] ✅ System integration stopped');
    }
    isIntegrationRunning() {
        return this.isRunning;
    }
    getComponentNames() {
        return Array.from(this.components.keys());
    }
    getComponentCount() {
        return this.components.size;
    }
    // Health check for all components
    async healthCheck() {
        const health = {};
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.isServerRunning === 'function') {
                    health[name] = component.isServerRunning();
                }
                else if (component && typeof component.isRunning === 'function') {
                    health[name] = component.isRunning();
                }
                else {
                    health[name] = !!component;
                }
            }
            catch (error) {
                health[name] = false;
            }
        }
        return health;
    }
    // Basic coordination functions
    async processSystemEvent(event) {
        console.log(`[INTEGRATION] Processing system event: ${event.type || 'unknown'}`);
        // Broadcast to all components
        for (const [name, component] of this.components) {
            try {
                if (component && typeof component.emit === 'function') {
                    component.emit('system_event', event);
                }
            }
            catch (error) {
                console.warn(`[INTEGRATION] Failed to send event to ${name}:`, error);
            }
        }
    }
    // Simple status reporting
    getStatus() {
        return {
            running: this.isRunning,
            components: this.getComponentNames(),
            componentCount: this.getComponentCount(),
            timestamp: Date.now()
        };
    }
}
exports.SystemIntegrationCoordinator = SystemIntegrationCoordinator;
