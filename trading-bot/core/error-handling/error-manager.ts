/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🚨 COMPREHENSIVE ERROR MANAGEMENT SYSTEM
 * Advanced error handling, retry mechanisms, and edge case management
 */

import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// ERROR TYPES & INTERFACES
// ============================================================================

export enum ErrorType {
    NETWORK_ERROR = 'NETWORK_ERROR',
    API_RATE_LIMIT = 'API_RATE_LIMIT',
    DATA_VALIDATION = 'DATA_VALIDATION',
    STRATEGY_EXECUTION = 'STRATEGY_EXECUTION',
    OPTIMIZATION_FAILURE = 'OPTIMIZATION_FAILURE',
    SYSTEM_RESOURCE = 'SYSTEM_RESOURCE',
    MARKET_DATA_ERROR = 'MARKET_DATA_ERROR',
    AUTHENTICATION = 'AUTHENTICATION',
    TIMEOUT = 'TIMEOUT',
    UNKNOWN = 'UNKNOWN'
}

export enum ErrorSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM', 
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL'
}

export interface TradingError {
    id: string;
    type: ErrorType;
    severity: ErrorSeverity;
    message: string;
    stack?: string;
    context: Record<string, any>;
    timestamp: Date;
    retryCount: number;
    maxRetries: number;
    recoveryAction?: string;
    resolved: boolean;
}

export interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    jitter: boolean;
    retryCondition?: (error: Error) => boolean;
}

export interface CircuitBreakerConfig {
    failureThreshold: number;
    resetTimeout: number;
    monitoringPeriod: number;
}

// ============================================================================
// ADVANCED ERROR MANAGER
// ============================================================================

export class AdvancedErrorManager extends EventEmitter {
    private errors: Map<string, TradingError> = new Map();
    private retryConfigs: Map<ErrorType, RetryConfig> = new Map();
    private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
    private errorCounts: Map<ErrorType, number> = new Map();
    private logFile: string;

    constructor() {
        super();
        this.logFile = path.join(process.cwd(), 'logs', 'error-manager.log');
        this.initializeRetryConfigs();
        this.initializeCircuitBreakers();
    }

    /**
     * Initialize retry configurations for different error types
     */
    private initializeRetryConfigs(): void {
        // Network errors - aggressive retry
        this.retryConfigs.set(ErrorType.NETWORK_ERROR, {
            maxRetries: 5,
            baseDelay: 1000,
            maxDelay: 30000,
            backoffMultiplier: 2,
            jitter: true,
            retryCondition: (error) => !error.message.includes('ENOTFOUND')
        });

        // API Rate limits - respectful retry (fast for testing)
        this.retryConfigs.set(ErrorType.API_RATE_LIMIT, {
            maxRetries: 3,
            baseDelay: process.env.NODE_ENV === 'test' ? 100 : 60000, // Fast for tests
            maxDelay: process.env.NODE_ENV === 'test' ? 1000 : 300000,
            backoffMultiplier: 2,
            jitter: false,
            retryCondition: () => true
        });

        // Data validation - no retry
        this.retryConfigs.set(ErrorType.DATA_VALIDATION, {
            maxRetries: 0,
            baseDelay: 0,
            maxDelay: 0,
            backoffMultiplier: 1,
            jitter: false
        });

        // Strategy execution - limited retry
        this.retryConfigs.set(ErrorType.STRATEGY_EXECUTION, {
            maxRetries: 2,
            baseDelay: 500,
            maxDelay: 5000,
            backoffMultiplier: 1.5,
            jitter: true
        });

        // Optimization failures - moderate retry
        this.retryConfigs.set(ErrorType.OPTIMIZATION_FAILURE, {
            maxRetries: 3,
            baseDelay: 2000,
            maxDelay: 15000,
            backoffMultiplier: 2,
            jitter: true
        });

        // System resource - immediate retry
        this.retryConfigs.set(ErrorType.SYSTEM_RESOURCE, {
            maxRetries: 2,
            baseDelay: 100,
            maxDelay: 1000,
            backoffMultiplier: 1.2,
            jitter: false
        });

        // Timeout errors - quick retry
        this.retryConfigs.set(ErrorType.TIMEOUT, {
            maxRetries: 3,
            baseDelay: 500,
            maxDelay: 5000,
            backoffMultiplier: 1.5,
            jitter: true
        });

        // Unknown errors - minimal retry
        this.retryConfigs.set(ErrorType.UNKNOWN, {
            maxRetries: 1,
            baseDelay: 1000,
            maxDelay: 2000,
            backoffMultiplier: 1,
            jitter: false
        });
    }

    /**
     * Initialize circuit breakers for critical components
     */
    private initializeCircuitBreakers(): void {
        const components = [
            'market-data-feed',
            'trading-execution', 
            'strategy-engine',
            'optimization-service',
            'risk-manager'
        ];

        components.forEach(component => {
            this.circuitBreakers.set(component, {
                state: 'CLOSED',
                failureCount: 0,
                lastFailureTime: null,
                config: {
                    failureThreshold: 5,
                    resetTimeout: 60000, // 1 minute
                    monitoringPeriod: 300000 // 5 minutes
                }
            });
        });
    }

    /**
     * Handle and categorize errors with automatic retry logic
     */
    async handleError(
        error: Error, 
        context: Record<string, any> | null | undefined,
        component?: string
    ): Promise<TradingError> {
        // Handle null/undefined context gracefully
        const safeContext = context || {};
        
        const tradingError = this.categorizeError(error, safeContext);
        
        // Log error
        this.logError(tradingError);
        
        // Update circuit breaker if component specified
        if (component) {
            this.updateCircuitBreaker(component, tradingError);
        }
        
        // Store error
        this.errors.set(tradingError.id, tradingError);
        
        // Update error counts
        const currentCount = this.errorCounts.get(tradingError.type) || 0;
        this.errorCounts.set(tradingError.type, currentCount + 1);
        
        // Emit error event
        this.emit('error', tradingError);
        
        // Check if critical error pattern
        this.checkCriticalPatterns(tradingError);
        
        return tradingError;
    }

    /**
     * Categorize error and determine severity
     */
    private categorizeError(error: Error, context: Record<string, any>): TradingError {
        let type = ErrorType.UNKNOWN;
        let severity = ErrorSeverity.MEDIUM;

        // System critical failures
        if (error.message.toLowerCase().includes('critical') ||
            error.message.toLowerCase().includes('fatal') ||
            context.severity === 'CRITICAL') {
            type = ErrorType.SYSTEM_RESOURCE;
            severity = ErrorSeverity.CRITICAL;
        }
        
        // Strategy execution (check before timeout/network to be more specific)
        else if (error.message.includes('strategy') ||
            error.message.includes('Strategy execution') ||
            error.message.includes('signal') ||
            context.component === 'strategy') {
            type = ErrorType.STRATEGY_EXECUTION;
            severity = ErrorSeverity.HIGH;
        }
        
        // Network-related errors
        else if (error.message.includes('ECONNREFUSED') || 
            error.message.includes('ENOTFOUND') ||
            error.message.includes('timeout') ||
            error.message.includes('network')) {
            type = ErrorType.NETWORK_ERROR;
            severity = ErrorSeverity.HIGH;
        }
        
        // API Rate limiting
        else if (error.message.includes('rate limit') ||
                 error.message.includes('too many requests') ||
                 error.message.includes('429')) {
            type = ErrorType.API_RATE_LIMIT;
            severity = ErrorSeverity.MEDIUM;
        }
        
        // Data validation
        else if (error.message.includes('validation') ||
                 error.message.includes('invalid data') ||
                 error.message.includes('schema')) {
            type = ErrorType.DATA_VALIDATION;
            severity = ErrorSeverity.LOW;
        }
        
        // Strategy execution
        else if (error.message.includes('strategy') ||
                 error.message.includes('signal') ||
                 context.component === 'strategy') {
            type = ErrorType.STRATEGY_EXECUTION;
            severity = ErrorSeverity.HIGH;
        }
        
        // Optimization failures
        else if (error.message.includes('optimization') ||
                 error.message.includes('optuna') ||
                 error.message.includes('hyperparameter')) {
            type = ErrorType.OPTIMIZATION_FAILURE;
            severity = ErrorSeverity.MEDIUM;
        }
        
        // System resource issues
        else if (error.message.includes('memory') ||
                 error.message.includes('CPU') ||
                 error.message.includes('disk space')) {
            type = ErrorType.SYSTEM_RESOURCE;
            severity = ErrorSeverity.CRITICAL;
        }
        
        // Market data errors
        else if (error.message.includes('market data') ||
                 error.message.includes('price feed') ||
                 context.component === 'market-data') {
            type = ErrorType.MARKET_DATA_ERROR;
            severity = ErrorSeverity.HIGH;
        }
        
        // Authentication errors
        else if (error.message.includes('unauthorized') ||
                 error.message.includes('authentication') ||
                 error.message.includes('401')) {
            type = ErrorType.AUTHENTICATION;
            severity = ErrorSeverity.CRITICAL;
        }
        
        // Timeout errors
        else if (error.message.includes('timeout') ||
                 error.message.includes('ETIMEDOUT')) {
            type = ErrorType.TIMEOUT;
            severity = ErrorSeverity.MEDIUM;
        }

        const retryConfig = this.retryConfigs.get(type) || this.retryConfigs.get(ErrorType.UNKNOWN) || {
            maxRetries: 0,
            baseDelay: 1000,
            maxDelay: 1000,
            backoffMultiplier: 1,
            jitter: false
        };

        return {
            id: this.generateErrorId(),
            type,
            severity,
            message: error.message,
            stack: error.stack,
            context,
            timestamp: new Date(),
            retryCount: 0,
            maxRetries: retryConfig.maxRetries,
            recoveryAction: this.getRecoveryAction(type),
            resolved: false
        };
    }

    /**
     * Execute operation with retry logic
     */
    async executeWithRetry<T>(
        operation: () => Promise<T>,
        errorType: ErrorType,
        context: Record<string, any> = {},
        component?: string
    ): Promise<T> {
        const retryConfig = this.retryConfigs.get(errorType);
        if (!retryConfig) {
            console.error(`No retry config found for error type: ${errorType}`);
            console.error('Available configs:', Array.from(this.retryConfigs.keys()));
            throw new Error(`No retry config found for error type: ${errorType}`);
        }

        let lastError: Error;
        let delay = retryConfig.baseDelay;

        for (let attempt = 0; attempt <= retryConfig.maxRetries; attempt++) {
            try {
                // Check circuit breaker
                if (component && !this.isCircuitBreakerClosed(component)) {
                    throw new Error(`Circuit breaker open for component: ${component}`);
                }

                const result = await operation();
                
                // Success - reset circuit breaker
                if (component) {
                    this.resetCircuitBreaker(component);
                }
                
                return result;
            } catch (error) {
                lastError = error as Error;
                
                // Handle the error
                const tradingError = await this.handleError(lastError, {
                    ...context,
                    attempt,
                    component
                });

                // Check if we should retry
                if (attempt === retryConfig.maxRetries) {
                    break;
                }

                if (retryConfig.retryCondition && !retryConfig.retryCondition(lastError)) {
                    break;
                }

                // Calculate delay with backoff and jitter
                const currentDelay = Math.min(delay, retryConfig.maxDelay);
                const jitterDelay = retryConfig.jitter ? 
                    currentDelay * (0.5 + Math.random() * 0.5) : currentDelay;

                console.log(`Retrying operation after ${jitterDelay}ms (attempt ${attempt + 1}/${retryConfig.maxRetries})`);
                await this.sleep(jitterDelay);

                delay *= retryConfig.backoffMultiplier;
                tradingError.retryCount++;
            }
        }

        // All retries exhausted - return the categorized error instead of throwing
        const finalError = await this.handleError(lastError!, {
            ...context,
            finalAttempt: true,
            component
        });
        
        throw finalError;
    }

    /**
     * Check for critical error patterns
     */
    private checkCriticalPatterns(error: TradingError): void {
        const criticalPatterns = [
            // High frequency of API rate limits
            { type: ErrorType.API_RATE_LIMIT, threshold: 10, timeWindow: 300000 },
            // Multiple network errors
            { type: ErrorType.NETWORK_ERROR, threshold: 15, timeWindow: 600000 },
            // System resource issues
            { type: ErrorType.SYSTEM_RESOURCE, threshold: 3, timeWindow: 60000 },
            // Authentication failures
            { type: ErrorType.AUTHENTICATION, threshold: 2, timeWindow: 120000 }
        ];

        criticalPatterns.forEach(pattern => {
            const recentErrors = this.getRecentErrors(pattern.type, pattern.timeWindow);
            if (recentErrors.length >= pattern.threshold) {
                this.emit('criticalPattern', {
                    type: pattern.type,
                    count: recentErrors.length,
                    timeWindow: pattern.timeWindow
                });
            }
        });
    }

    /**
     * Get recent errors of specific type within time window
     */
    private getRecentErrors(type: ErrorType, timeWindow: number): TradingError[] {
        const cutoff = new Date(Date.now() - timeWindow);
        return Array.from(this.errors.values()).filter(
            error => error.type === type && error.timestamp > cutoff
        );
    }

    /**
     * Circuit breaker operations
     */
    private updateCircuitBreaker(component: string, error: TradingError): void {
        const breaker = this.circuitBreakers.get(component);
        if (!breaker) return;

        if (error.severity === ErrorSeverity.HIGH || error.severity === ErrorSeverity.CRITICAL) {
            breaker.failureCount++;
            breaker.lastFailureTime = new Date();

            if (breaker.failureCount >= breaker.config.failureThreshold) {
                breaker.state = 'OPEN';
                console.warn(`Circuit breaker OPENED for component: ${component}`);
                this.emit('circuitBreakerOpen', { component, breaker });
            }
        }
    }

    private isCircuitBreakerClosed(component: string): boolean {
        const breaker = this.circuitBreakers.get(component);
        if (!breaker) return true;

        if (breaker.state === 'CLOSED') return true;
        if (breaker.state === 'OPEN') {
            // Check if enough time has passed to try reset
            if (breaker.lastFailureTime && 
                Date.now() - breaker.lastFailureTime.getTime() > breaker.config.resetTimeout) {
                breaker.state = 'HALF_OPEN';
                console.info(`Circuit breaker HALF-OPEN for component: ${component}`);
            }
            return false;
        }
        if (breaker.state === 'HALF_OPEN') return true;
        
        return false;
    }

    private resetCircuitBreaker(component: string): void {
        const breaker = this.circuitBreakers.get(component);
        if (!breaker) return;

        if (breaker.state !== 'CLOSED') {
            breaker.state = 'CLOSED';
            breaker.failureCount = 0;
            breaker.lastFailureTime = null;
            console.info(`Circuit breaker CLOSED for component: ${component}`);
            this.emit('circuitBreakerClosed', { component, breaker });
        }
    }

    /**
     * Get recovery action for error type
     */
    private getRecoveryAction(type: ErrorType): string {
        const actions: Record<ErrorType, string> = {
            [ErrorType.NETWORK_ERROR]: 'Check network connectivity and retry',
            [ErrorType.API_RATE_LIMIT]: 'Reduce API call frequency and implement backoff',
            [ErrorType.DATA_VALIDATION]: 'Validate input data format and schema',
            [ErrorType.STRATEGY_EXECUTION]: 'Review strategy parameters and market conditions',
            [ErrorType.OPTIMIZATION_FAILURE]: 'Adjust optimization parameters or algorithm',
            [ErrorType.SYSTEM_RESOURCE]: 'Free up system resources or scale infrastructure',
            [ErrorType.MARKET_DATA_ERROR]: 'Verify market data source and connection',
            [ErrorType.AUTHENTICATION]: 'Refresh authentication tokens or credentials',
            [ErrorType.TIMEOUT]: 'Increase timeout limits or optimize operation',
            [ErrorType.UNKNOWN]: 'Investigate error details and implement specific handling'
        };

        return actions[type] || actions[ErrorType.UNKNOWN];
    }

    /**
     * Utility methods
     */
    private generateErrorId(): string {
        return `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    private logError(error: TradingError): void {
        const logEntry = {
            timestamp: error.timestamp.toISOString(),
            id: error.id,
            type: error.type,
            severity: error.severity,
            message: error.message,
            context: error.context
        };

        // Ensure logs directory exists
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }

        // Write to log file
        fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    }

    /**
     * Public API methods
     */
    public getErrorStats(): ErrorStats {
        const total = this.errors.size;
        const byType: Record<string, number> = {};
        const bySeverity: Record<string, number> = {};
        let resolved = 0;

        this.errors.forEach(error => {
            byType[error.type] = (byType[error.type] || 0) + 1;
            bySeverity[error.severity] = (bySeverity[error.severity] || 0) + 1;
            if (error.resolved) resolved++;
        });

        return {
            total,
            resolved,
            unresolved: total - resolved,
            byType,
            bySeverity,
            circuitBreakers: Object.fromEntries(
                Array.from(this.circuitBreakers.entries()).map(([key, value]) => [
                    key, 
                    { state: value.state, failureCount: value.failureCount }
                ])
            )
        };
    }

    public resolveError(errorId: string): boolean {
        const error = this.errors.get(errorId);
        if (error) {
            error.resolved = true;
            return true;
        }
        return false;
    }

    public getCircuitBreakerStatus(): Record<string, any> {
        return Object.fromEntries(
            Array.from(this.circuitBreakers.entries()).map(([key, value]) => [
                key,
                {
                    state: value.state,
                    failureCount: value.failureCount,
                    lastFailureTime: value.lastFailureTime,
                    config: value.config
                }
            ])
        );
    }
}

// ============================================================================
// SUPPORTING INTERFACES
// ============================================================================

interface CircuitBreakerState {
    state: 'OPEN' | 'CLOSED' | 'HALF_OPEN';
    failureCount: number;
    lastFailureTime: Date | null;
    config: CircuitBreakerConfig;
}

interface ErrorStats {
    total: number;
    resolved: number;
    unresolved: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    circuitBreakers: Record<string, any>;
}

// Export singleton instance
export const errorManager = new AdvancedErrorManager();
