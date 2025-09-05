#!/usr/bin/env ts-node
/**
 * 🔒 SECURE CONFIGURATION MANAGER
 * Production-ready secrets management and environment configuration
 * Replaces hardcoded values with secure, encrypted configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// ============================================================================
// CONFIGURATION INTERFACES
// ============================================================================

export interface TradingCredentials {
    binanceApiKey: string;
    binanceSecret: string;
    coinbaseApiKey?: string;
    coinbaseSecret?: string;
    coinbasePassphrase?: string;
}

export interface DatabaseConfig {
    url: string;
    ssl: boolean;
    poolSize: number;
    timeout: number;
}

export interface SecurityConfig {
    encryptionKey: string;
    vaultEndpoint?: string;
    gdprComplianceMode: 'strict' | 'standard' | 'development';
    dataRetentionDays: number;
    logEncryption: boolean;
}

export interface ProductionConfig {
    environment: 'development' | 'staging' | 'production';
    trading: TradingCredentials;
    database: DatabaseConfig;
    security: SecurityConfig;
    monitoring: {
        prometheusEndpoint?: string;
        grafanaEndpoint?: string;
        alertmanagerEndpoint?: string;
    };
    limits: {
        maxCapital: number;
        maxDrawdown: number;
        maxConcurrentOrders: number;
        apiRateLimit: number;
    };
}

// ============================================================================
// SECURE CONFIGURATION MANAGER
// ============================================================================

export class SecureConfigManager {
    private static instance: SecureConfigManager;
    private config: ProductionConfig | null = null;
    private encryptionKey: Buffer | null = null;

    private constructor() {}

    public static getInstance(): SecureConfigManager {
        if (!SecureConfigManager.instance) {
            SecureConfigManager.instance = new SecureConfigManager();
        }
        return SecureConfigManager.instance;
    }

    /**
     * Initialize secure configuration with environment validation
     */
    public async initialize(): Promise<void> {
        try {
            this.validateEnvironmentVariables();
            await this.initializeEncryption();
            this.config = await this.loadConfiguration();
            
            console.log(`🔒 Secure configuration loaded for environment: ${this.config.environment}`);
            
            if (this.config.environment === 'production') {
                await this.validateProductionRequirements();
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            throw new SecurityError(`Failed to initialize secure configuration: ${errorMessage}`);
        }
    }

    /**
     * Validate all required environment variables
     */
    private validateEnvironmentVariables(): void {
        const required = {
            // Core environment
            NODE_ENV: 'Environment mode (development/staging/production)',
            
            // Database
            DATABASE_URL: 'Database connection string',
            
            // Security
            ENCRYPTION_KEY: 'Encryption key for sensitive data',
            GDPR_COMPLIANCE_MODE: 'GDPR compliance level',
            DATA_RETENTION_DAYS: 'Data retention period in days',
            
            // Trading (only for production/staging)
            ...(process.env.NODE_ENV !== 'development' && {
                BINANCE_API_KEY: 'Binance API key',
                BINANCE_SECRET: 'Binance API secret'
            }),
            
            // Production-only requirements
            ...(process.env.NODE_ENV === 'production' && {
                VAULT_ENDPOINT: 'HashiCorp Vault endpoint',
                PROMETHEUS_ENDPOINT: 'Prometheus monitoring endpoint',
                LOG_ENCRYPTION_ENABLED: 'Log encryption flag'
            })
        };

        const missing: string[] = [];
        const invalid: string[] = [];

        Object.entries(required).forEach(([envVar, description]) => {
            const value = process.env[envVar];
            
            if (!value) {
                missing.push(`${envVar} (${description})`);
                return;
            }

            // Validate specific formats
            switch (envVar) {
                case 'NODE_ENV':
                    if (!['development', 'staging', 'production'].includes(value)) {
                        invalid.push(`${envVar}: must be development, staging, or production`);
                    }
                    break;
                    
                case 'GDPR_COMPLIANCE_MODE':
                    if (!['strict', 'standard', 'development'].includes(value)) {
                        invalid.push(`${envVar}: must be strict, standard, or development`);
                    }
                    break;
                    
                case 'DATA_RETENTION_DAYS':
                    const days = parseInt(value);
                    if (isNaN(days) || days < 1 || days > 2555) { // 7 years max
                        invalid.push(`${envVar}: must be a number between 1 and 2555`);
                    }
                    break;
                    
                case 'DATABASE_URL':
                    if (!value.match(/^(postgres|mysql|sqlite):\/\/.+/)) {
                        invalid.push(`${envVar}: invalid database URL format`);
                    }
                    break;
            }
        });

        if (missing.length > 0) {
            throw new ConfigurationError(
                `Missing required environment variables:\n${missing.map(v => `  - ${v}`).join('\n')}`
            );
        }

        if (invalid.length > 0) {
            throw new ConfigurationError(
                `Invalid environment variable values:\n${invalid.map(v => `  - ${v}`).join('\n')}`
            );
        }
    }

    /**
     * Initialize encryption for sensitive data
     */
    private async initializeEncryption(): Promise<void> {
        const encryptionKey = process.env.ENCRYPTION_KEY!;
        
        if (encryptionKey.length < 32) {
            throw new SecurityError('ENCRYPTION_KEY must be at least 32 characters long');
        }
        
        this.encryptionKey = crypto.scryptSync(encryptionKey, 'salt', 32);
    }

    /**
     * Load and validate configuration
     */
    private async loadConfiguration(): Promise<ProductionConfig> {
        const environment = process.env.NODE_ENV as 'development' | 'staging' | 'production';
        
        return {
            environment,
            
            trading: await this.loadTradingCredentials(),
            
            database: {
                url: process.env.DATABASE_URL!,
                ssl: environment === 'production',
                poolSize: parseInt(process.env.DB_POOL_SIZE!) || 10,
                timeout: parseInt(process.env.DB_TIMEOUT!) || 30000
            },
            
            security: {
                encryptionKey: process.env.ENCRYPTION_KEY!,
                vaultEndpoint: process.env.VAULT_ENDPOINT,
                gdprComplianceMode: process.env.GDPR_COMPLIANCE_MODE as any,
                dataRetentionDays: parseInt(process.env.DATA_RETENTION_DAYS!),
                logEncryption: environment === 'production' || process.env.LOG_ENCRYPTION_ENABLED === 'true'
            },
            
            monitoring: {
                prometheusEndpoint: process.env.PROMETHEUS_ENDPOINT,
                grafanaEndpoint: process.env.GRAFANA_ENDPOINT,
                alertmanagerEndpoint: process.env.ALERTMANAGER_ENDPOINT
            },
            
            limits: {
                maxCapital: parseInt(process.env.MAX_CAPITAL!) || 100000,
                maxDrawdown: parseFloat(process.env.MAX_DRAWDOWN!) || 0.15,
                maxConcurrentOrders: parseInt(process.env.MAX_CONCURRENT_ORDERS!) || 10,
                apiRateLimit: parseInt(process.env.API_RATE_LIMIT!) || 1000
            }
        };
    }

    /**
     * Load trading credentials securely
     */
    private async loadTradingCredentials(): Promise<TradingCredentials> {
        const environment = process.env.NODE_ENV!;
        
        // Development mode - use mock credentials
        if (environment === 'development') {
            return {
                binanceApiKey: 'dev_mock_api_key',
                binanceSecret: 'dev_mock_secret'
            };
        }
        
        // Production/Staging - load from vault or environment
        if (process.env.VAULT_ENDPOINT) {
            return await this.loadCredentialsFromVault();
        }
        
        // Fallback to environment variables (less secure)
        return {
            binanceApiKey: process.env.BINANCE_API_KEY!,
            binanceSecret: process.env.BINANCE_SECRET!,
            coinbaseApiKey: process.env.COINBASE_API_KEY,
            coinbaseSecret: process.env.COINBASE_SECRET,
            coinbasePassphrase: process.env.COINBASE_PASSPHRASE
        };
    }

    /**
     * Load credentials from HashiCorp Vault (production)
     */
    private async loadCredentialsFromVault(): Promise<TradingCredentials> {
        // TODO: Implement actual Vault integration
        // For now, fallback to environment variables
        console.warn('🚧 Vault integration not yet implemented, using environment variables');
        
        return {
            binanceApiKey: process.env.BINANCE_API_KEY!,
            binanceSecret: process.env.BINANCE_SECRET!,
            coinbaseApiKey: process.env.COINBASE_API_KEY,
            coinbaseSecret: process.env.COINBASE_SECRET,
            coinbasePassphrase: process.env.COINBASE_PASSPHRASE
        };
    }

    /**
     * Validate production-specific requirements
     */
    private async validateProductionRequirements(): Promise<void> {
        const config = this.config!;
        
        // Security validations
        if (config.security.gdprComplianceMode !== 'strict') {
            throw new ComplianceError('Production environment requires GDPR compliance mode: strict');
        }
        
        if (!config.security.logEncryption) {
            throw new SecurityError('Production environment requires log encryption');
        }
        
        if (config.limits.maxCapital > 1000000) {
            console.warn('⚠️  High capital limit in production - ensure proper risk management');
        }
        
        // Monitoring validations
        if (!config.monitoring.prometheusEndpoint) {
            console.warn('⚠️  No Prometheus endpoint configured for production monitoring');
        }
    }

    /**
     * Get current configuration
     */
    public getConfig(): ProductionConfig {
        if (!this.config) {
            throw new ConfigurationError('Configuration not initialized. Call initialize() first.');
        }
        return this.config;
    }

    /**
     * Encrypt sensitive data
     */
    public encryptSensitiveData(data: string): string {
        if (!this.encryptionKey) {
            throw new SecurityError('Encryption not initialized');
        }
        
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        
        return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
    }

    /**
     * Decrypt sensitive data
     */
    public decryptSensitiveData(encryptedData: string): string {
        if (!this.encryptionKey) {
            throw new SecurityError('Encryption not initialized');
        }
        
        const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
        
        const iv = Buffer.from(ivHex, 'hex');
        const authTag = Buffer.from(authTagHex, 'hex');
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
        decipher.setAuthTag(authTag);
        
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        
        return decrypted;
    }

    /**
     * Check if running in production
     */
    public isProduction(): boolean {
        return this.getConfig().environment === 'production';
    }

    /**
     * Check if running in development
     */
    public isDevelopment(): boolean {
        return this.getConfig().environment === 'development';
    }

    /**
     * Get safe configuration for logging (without secrets)
     */
    public getSafeConfigForLogging(): any {
        const config = this.getConfig();
        
        return {
            environment: config.environment,
            database: {
                ...config.database,
                url: this.maskConnectionString(config.database.url)
            },
            security: {
                ...config.security,
                encryptionKey: '[REDACTED]',
                vaultEndpoint: config.security.vaultEndpoint ? '[CONFIGURED]' : '[NOT_CONFIGURED]'
            },
            trading: {
                binanceApiKey: config.trading.binanceApiKey ? '[CONFIGURED]' : '[NOT_CONFIGURED]',
                binanceSecret: '[REDACTED]',
                coinbaseApiKey: config.trading.coinbaseApiKey ? '[CONFIGURED]' : '[NOT_CONFIGURED]'
            },
            limits: config.limits
        };
    }

    /**
     * Mask connection strings for logging
     */
    private maskConnectionString(url: string): string {
        return url.replace(/:\/\/([^:]+):([^@]+)@/, '://***:***@');
    }
}

// ============================================================================
// CUSTOM ERROR CLASSES
// ============================================================================

export class ConfigurationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ConfigurationError';
    }
}

export class SecurityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SecurityError';
    }
}

export class ComplianceError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ComplianceError';
    }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const secureConfig = SecureConfigManager.getInstance();
