"use strict";
/**
 * 🔧 [PRODUCTION-CONFIG]
 * Production configuration component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * ⚙️ SIMPLE CONFIGURATION MANAGER
 * Lightweight configuration for modular architecture
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConfigurationManager = void 0;
class ConfigurationManager {
    constructor() {
        this.config = this.loadConfig();
    }
    static getInstance() {
        if (!this.instance) {
            this.instance = new ConfigurationManager();
        }
        return this.instance;
    }
    loadConfig() {
        const env = process.env;
        return {
            environment: env.NODE_ENV || 'development',
            version: '4.0.4',
            port: parseInt(env.PORT || '3000'),
            host: env.HOST || (env.CODESPACES ? '0.0.0.0' : 'localhost'),
            isCodespace: !!env.CODESPACES,
            cache: {
                enabled: env.CACHE_ENABLED !== 'false',
                ttl: parseInt(env.CACHE_TTL || '3600')
            },
            monitoring: {
                enabled: env.MONITORING_ENABLED !== 'false',
                port: parseInt(env.MONITORING_PORT || '9090')
            },
            ml: {
                enabled: env.ML_ENABLED !== 'false'
            }
        };
    }
    getConfig() {
        return { ...this.config };
    }
}
exports.ConfigurationManager = ConfigurationManager;
