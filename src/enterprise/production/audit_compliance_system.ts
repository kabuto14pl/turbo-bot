/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🚀 [PRODUCTION-API]
 * Production enterprise component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * PHASE C.4 - Audit Logging & Compliance System
 * 
 * Comprehensive audit trail and compliance framework for regulatory
 * requirements and enterprise governance.
 * 
 * Integrates with:
 * - Phase A: Cache for high-performance logging
 * - Phase B: Memory optimization for large audit datasets
 * - Phase C.3: Monitoring system for audit alerts
 * - All trading components for complete activity tracking
 */

import { EventEmitter } from 'events';
import { createHash } from 'crypto';

// Audit Types
interface AuditConfiguration {
    // Logging settings
    logging: {
        level: 'minimal' | 'standard' | 'comprehensive' | 'full';
        retentionPeriod: number; // days
        compressionEnabled: boolean;
        encryptionEnabled: boolean;
        realTimeSync: boolean;
    };
    
    // Compliance requirements
    compliance: {
        miFIDII: boolean; // EU Markets in Financial Instruments Directive
        doddFrank: boolean; // US Dodd-Frank Act
        basel: boolean; // Basel banking regulations
        gdpr: boolean; // EU General Data Protection Regulation
        customRegulations: string[];
    };
    
    // Alert thresholds
    alerts: {
        largeTradeThreshold: number;
        unusualActivityThreshold: number;
        errorRateThreshold: number;
        complianceBreachSeverity: 'low' | 'medium' | 'high' | 'critical';
    };
    
    // Storage configuration
    storage: {
        primaryStorage: 'database' | 'file' | 'cloud';
        backupStorage: 'database' | 'file' | 'cloud';
        archiveStorage: 'database' | 'file' | 'cloud';
        compressionLevel: number;
    };
}

interface AuditEvent {
    id: string;
    timestamp: Date;
    eventType: AuditEventType;
    severity: 'info' | 'warning' | 'error' | 'critical';
    component: string;
    action: string;
    details: Record<string, any>;
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    riskLevel: 'low' | 'medium' | 'high' | 'critical';
    complianceFlags: string[];
    hash: string; // For integrity verification
}

type AuditEventType = 
    | 'trade_execution'
    | 'order_management'
    | 'risk_management'
    | 'portfolio_rebalancing'
    | 'emergency_action'
    | 'system_access'
    | 'configuration_change'
    | 'compliance_check'
    | 'data_access'
    | 'error_event'
    | 'performance_metric'
    | 'security_event';

interface TradeAuditRecord {
    tradeId: string;
    timestamp: Date;
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
    orderType: string;
    strategy: string;
    executionTime: number;
    slippage: number;
    fees: number;
    preTradeRisk: {
        portfolioVaR: number;
        positionSize: number;
        concentration: number;
    };
    postTradeRisk: {
        portfolioVaR: number;
        positionSize: number;
        concentration: number;
    };
    approvals: Array<{
        approver: string;
        timestamp: Date;
        reason: string;
    }>;
    regulatoryFlags: string[];
}

interface ComplianceReport {
    id: string;
    reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc';
    period: {
        start: Date;
        end: Date;
    };
    generatedAt: Date;
    regulatoryFramework: string;
    summary: {
        totalTrades: number;
        totalVolume: number;
        complianceBreaches: number;
        riskLimitExceeded: number;
        errorRate: number;
    };
    findings: ComplianceFinding[];
    recommendations: string[];
    attachments: string[];
    status: 'draft' | 'review' | 'approved' | 'submitted';
}

interface ComplianceFinding {
    id: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    category: 'risk_management' | 'trade_reporting' | 'client_protection' | 'market_abuse' | 'operational';
    description: string;
    evidence: string[];
    remediation: string;
    deadline: Date;
    responsible: string;
    status: 'open' | 'in_progress' | 'resolved' | 'acknowledged';
}

interface AuditQuery {
    eventTypes?: AuditEventType[];
    components?: string[];
    severity?: ('info' | 'warning' | 'error' | 'critical')[];
    dateRange?: {
        start: Date;
        end: Date;
    };
    userId?: string;
    riskLevel?: ('low' | 'medium' | 'high' | 'critical')[];
    complianceFlags?: string[];
    searchText?: string;
    limit?: number;
    offset?: number;
}

interface AuditMetrics {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<string, number>;
    eventsByComponent: Record<string, number>;
    complianceBreaches: number;
    dataIntegrityChecks: {
        total: number;
        passed: number;
        failed: number;
    };
    storageMetrics: {
        totalSize: number;
        compressionRatio: number;
        oldestRecord: Date;
        newestRecord: Date;
    };
}

// External Dependencies
interface CacheService {
    get(key: string): Promise<any>;
    set(key: string, value: any, ttl?: number): Promise<void>;
    invalidate(pattern: string): Promise<void>;
}

interface MonitoringSystemIntegration {
    recordMetric(name: string, value: number, tags?: Record<string, string>): void;
    sendAlert(alert: { level: string; message: string; component: string; metadata?: any }): Promise<void>;
}

interface DatabaseConnection {
    query(sql: string, params?: any[]): Promise<any[]>;
    insert(table: string, data: any): Promise<string>;
    update(table: string, data: any, where: string): Promise<number>;
    transaction(operations: Array<() => Promise<any>>): Promise<any[]>;
}

/**
 * Audit Logging & Compliance System
 * 
 * Provides comprehensive audit trail and compliance framework:
 * - Complete activity logging with integrity verification
 * - Regulatory compliance reporting (MiFID II, Dodd-Frank, Basel)
 * - Real-time compliance monitoring
 * - Automated compliance report generation
 * - Data retention and archival management
 */
export class AuditComplianceSystem extends EventEmitter {
    private config: AuditConfiguration;
    private cacheService: CacheService;
    private monitoringSystem: MonitoringSystemIntegration;
    private database: DatabaseConnection;
    
    private auditBuffer: AuditEvent[] = [];
    private tradeAuditBuffer: TradeAuditRecord[] = [];
    private isLogging: boolean = false;
    private flushInterval: NodeJS.Timeout | null = null;
    private lastIntegrityCheck: Date | null = null;
    
    private auditMetrics: AuditMetrics = {
        totalEvents: 0,
        eventsByType: {} as Record<AuditEventType, number>,
        eventsBySeverity: {},
        eventsByComponent: {},
        complianceBreaches: 0,
        dataIntegrityChecks: {
            total: 0,
            passed: 0,
            failed: 0
        },
        storageMetrics: {
            totalSize: 0,
            compressionRatio: 0,
            oldestRecord: new Date(),
            newestRecord: new Date()
        }
    };

    constructor(
        config: AuditConfiguration,
        cacheService: CacheService,
        monitoringSystem: MonitoringSystemIntegration,
        database: DatabaseConnection
    ) {
        super();
        
        this.config = config;
        this.cacheService = cacheService;
        this.monitoringSystem = monitoringSystem;
        this.database = database;
        
        this.validateConfiguration();
        this.initializeAuditTables();
    }

    /**
     * Initialize Audit & Compliance System
     */
    public async initialize(): Promise<void> {
        try {
            console.log('📋 Initializing Audit & Compliance System...');
            
            // Load existing audit metrics
            await this.loadAuditMetrics();
            
            // Setup audit infrastructure
            await this.setupAuditInfrastructure();
            
            // Start logging services
            await this.startAuditLogging();
            
            // Schedule compliance checks
            await this.scheduleComplianceChecks();
            
            console.log('✅ Audit & Compliance System initialized successfully');
            
            // Log initialization event
            await this.logAuditEvent({
                eventType: 'system_access',
                severity: 'info',
                component: 'AuditComplianceSystem',
                action: 'system_initialization',
                details: {
                    configLevel: this.config.logging.level,
                    complianceFrameworks: this.getEnabledComplianceFrameworks(),
                    retentionPeriod: this.config.logging.retentionPeriod
                },
                riskLevel: 'low',
                complianceFlags: []
            });
            
            this.monitoringSystem.recordMetric('audit_system.initialization', 1, {
                logging_level: this.config.logging.level,
                compliance_frameworks: this.getEnabledComplianceFrameworks().length.toString()
            });
            
            this.emit('initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize Audit & Compliance System:', error);
            
            await this.monitoringSystem.sendAlert({
                level: 'critical',
                message: `Audit system initialization failed: ${(error as Error).message}`,
                component: 'AuditComplianceSystem'
            });
            
            throw error;
        }
    }

    /**
     * Log Audit Event
     */
    public async logAuditEvent(eventData: Omit<AuditEvent, 'id' | 'timestamp' | 'hash'>): Promise<string> {
        try {
            const auditEvent: AuditEvent = {
                id: this.generateAuditId(),
                timestamp: new Date(),
                hash: '',
                ...eventData
            };
            
            // Generate integrity hash
            auditEvent.hash = this.generateIntegrityHash(auditEvent);
            
            // Add to buffer
            this.auditBuffer.push(auditEvent);
            
            // Update metrics
            this.updateAuditMetrics(auditEvent);
            
            // Check compliance flags
            await this.checkComplianceFlags(auditEvent);
            
            // Immediate flush for critical events
            if (auditEvent.severity === 'critical' || auditEvent.riskLevel === 'critical') {
                await this.flushAuditBuffer();
            }
            
            // Real-time sync if enabled
            if (this.config.logging.realTimeSync) {
                await this.flushAuditBuffer();
            }
            
            this.emit('audit_event_logged', auditEvent);
            
            return auditEvent.id;
            
        } catch (error) {
            console.error('❌ Failed to log audit event:', error);
            
            // Try to log the error itself (recursive protection)
            if (eventData.eventType !== 'error_event') {
                await this.logAuditEvent({
                    eventType: 'error_event',
                    severity: 'error',
                    component: 'AuditComplianceSystem',
                    action: 'audit_logging_failed',
                    details: {
                        originalEvent: eventData,
                        error: (error as Error).message
                    },
                    riskLevel: 'medium',
                    complianceFlags: ['audit_failure']
                });
            }
            
            throw error;
        }
    }

    /**
     * Log Trade Audit Record
     */
    public async logTradeAudit(tradeData: TradeAuditRecord): Promise<void> {
        try {
            // Add to trade audit buffer
            this.tradeAuditBuffer.push(tradeData);
            
            // Create corresponding audit event
            await this.logAuditEvent({
                eventType: 'trade_execution',
                severity: this.assessTradeSeverity(tradeData),
                component: 'TradingEngine',
                action: 'trade_executed',
                details: {
                    tradeId: tradeData.tradeId,
                    symbol: tradeData.symbol,
                    side: tradeData.side,
                    quantity: tradeData.quantity,
                    price: tradeData.price,
                    strategy: tradeData.strategy,
                    executionTime: tradeData.executionTime,
                    slippage: tradeData.slippage,
                    riskChange: {
                        varBefore: tradeData.preTradeRisk.portfolioVaR,
                        varAfter: tradeData.postTradeRisk.portfolioVaR,
                        varChange: tradeData.postTradeRisk.portfolioVaR - tradeData.preTradeRisk.portfolioVaR
                    }
                },
                riskLevel: this.assessTradeRiskLevel(tradeData),
                complianceFlags: tradeData.regulatoryFlags
            });
            
            // Check large trade reporting requirements
            await this.checkLargeTradeReporting(tradeData);
            
            console.log(`📊 Trade audit logged: ${tradeData.tradeId}`);
            
        } catch (error) {
            console.error('❌ Failed to log trade audit:', error);
            throw error;
        }
    }

    /**
     * Query Audit Events
     */
    public async queryAuditEvents(query: AuditQuery): Promise<AuditEvent[]> {
        try {
            console.log('🔍 Querying audit events...');
            
            // Build SQL query
            const { sql, params } = this.buildAuditQuery(query);
            
            // Execute query
            const results = await this.database.query(sql, params);
            
            // Verify integrity of returned records
            const verifiedResults = await this.verifyRecordIntegrity(results);
            
            console.log(`📋 Retrieved ${verifiedResults.length} audit events`);
            
            this.monitoringSystem.recordMetric('audit_system.query', 1, {
                result_count: verifiedResults.length.toString(),
                query_type: query.eventTypes?.join(',') || 'all'
            });
            
            return verifiedResults;
            
        } catch (error) {
            console.error('❌ Audit query failed:', error);
            
            await this.logAuditEvent({
                eventType: 'error_event',
                severity: 'warning',
                component: 'AuditComplianceSystem',
                action: 'audit_query_failed',
                details: {
                    query,
                    error: (error as Error).message
                },
                riskLevel: 'low',
                complianceFlags: []
            });
            
            throw error;
        }
    }

    /**
     * Generate Compliance Report
     */
    public async generateComplianceReport(
        reportType: 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'annual' | 'ad_hoc',
        period: { start: Date; end: Date },
        regulatoryFramework: string
    ): Promise<ComplianceReport> {
        try {
            console.log(`📊 Generating ${reportType} compliance report for ${regulatoryFramework}...`);
            
            const reportId = this.generateReportId(reportType, regulatoryFramework);
            
            // Gather compliance data
            const complianceData = await this.gatherComplianceData(period, regulatoryFramework);
            
            // Analyze for compliance findings
            const findings = await this.analyzeComplianceFindings(complianceData, regulatoryFramework);
            
            // Generate recommendations
            const recommendations = await this.generateComplianceRecommendations(findings);
            
            const report: ComplianceReport = {
                id: reportId,
                reportType,
                period,
                generatedAt: new Date(),
                regulatoryFramework,
                summary: {
                    totalTrades: complianceData.trades.length,
                    totalVolume: complianceData.totalVolume,
                    complianceBreaches: findings.filter(f => f.severity === 'high' || f.severity === 'critical').length,
                    riskLimitExceeded: complianceData.riskLimitExceeded,
                    errorRate: complianceData.errorRate
                },
                findings,
                recommendations,
                attachments: [],
                status: 'draft'
            };
            
            // Save report
            await this.saveComplianceReport(report);
            
            // Log report generation
            await this.logAuditEvent({
                eventType: 'compliance_check',
                severity: findings.some(f => f.severity === 'critical') ? 'critical' : 'info',
                component: 'AuditComplianceSystem',
                action: 'compliance_report_generated',
                details: {
                    reportId,
                    reportType,
                    regulatoryFramework,
                    findingsCount: findings.length,
                    criticalFindings: findings.filter(f => f.severity === 'critical').length
                },
                riskLevel: findings.some(f => f.severity === 'critical') ? 'critical' : 'low',
                complianceFlags: [regulatoryFramework.toLowerCase()]
            });
            
            console.log(`✅ Compliance report generated: ${reportId}`);
            console.log(`   Findings: ${findings.length} (${findings.filter(f => f.severity === 'critical').length} critical)`);
            
            this.emit('compliance_report_generated', report);
            
            return report;
            
        } catch (error) {
            console.error('❌ Failed to generate compliance report:', error);
            
            await this.logAuditEvent({
                eventType: 'error_event',
                severity: 'error',
                component: 'AuditComplianceSystem',
                action: 'compliance_report_failed',
                details: {
                    reportType,
                    regulatoryFramework,
                    error: (error as Error).message
                },
                riskLevel: 'medium',
                complianceFlags: ['report_failure']
            });
            
            throw error;
        }
    }

    /**
     * Check Data Integrity
     */
    public async checkDataIntegrity(): Promise<{ passed: number; failed: number; details: any[] }> {
        try {
            console.log('🔒 Checking audit data integrity...');
            
            const startTime = Date.now();
            let passed = 0;
            let failed = 0;
            const details: any[] = [];
            
            // Get all audit events for integrity check
            const events = await this.database.query(
                'SELECT * FROM audit_events ORDER BY timestamp DESC LIMIT 10000'
            );
            
            for (const event of events) {
                const expectedHash = this.generateIntegrityHash(event);
                
                if (event.hash === expectedHash) {
                    passed++;
                } else {
                    failed++;
                    details.push({
                        eventId: event.id,
                        timestamp: event.timestamp,
                        expectedHash,
                        actualHash: event.hash,
                        issue: 'hash_mismatch'
                    });
                }
            }
            
            const checkTime = Date.now() - startTime;
            this.lastIntegrityCheck = new Date();
            
            // Update metrics
            this.auditMetrics.dataIntegrityChecks.total += events.length;
            this.auditMetrics.dataIntegrityChecks.passed += passed;
            this.auditMetrics.dataIntegrityChecks.failed += failed;
            
            // Log integrity check results
            await this.logAuditEvent({
                eventType: 'security_event',
                severity: failed > 0 ? 'warning' : 'info',
                component: 'AuditComplianceSystem',
                action: 'data_integrity_check',
                details: {
                    totalChecked: events.length,
                    passed,
                    failed,
                    checkTime,
                    failureRate: failed / events.length
                },
                riskLevel: failed > events.length * 0.01 ? 'high' : 'low', // 1% threshold
                complianceFlags: failed > 0 ? ['data_integrity_failure'] : []
            });
            
            if (failed > 0) {
                await this.monitoringSystem.sendAlert({
                    level: 'warning',
                    message: `Data integrity check found ${failed} corrupted audit records`,
                    component: 'AuditComplianceSystem',
                    metadata: { passed, failed, details }
                });
            }
            
            console.log(`✅ Integrity check completed: ${passed} passed, ${failed} failed (${checkTime}ms)`);
            
            return { passed, failed, details };
            
        } catch (error) {
            console.error('❌ Data integrity check failed:', error);
            throw error;
        }
    }

    /**
     * Archive Old Records
     */
    public async archiveOldRecords(): Promise<{ archived: number; deleted: number }> {
        try {
            console.log('📦 Archiving old audit records...');
            
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - this.config.logging.retentionPeriod);
            
            // Move old records to archive storage
            const oldRecords = await this.database.query(
                'SELECT * FROM audit_events WHERE timestamp < ?',
                [cutoffDate]
            );
            
            let archived = 0;
            let deleted = 0;
            
            if (oldRecords.length > 0) {
                // Archive records based on storage configuration
                if (this.config.storage.archiveStorage === 'file') {
                    await this.archiveToFile(oldRecords);
                    archived = oldRecords.length;
                } else {
                    // Move to archive table
                    await this.database.transaction([
                        () => this.database.query(
                            'INSERT INTO audit_events_archive SELECT * FROM audit_events WHERE timestamp < ?',
                            [cutoffDate]
                        ),
                        () => this.database.query(
                            'DELETE FROM audit_events WHERE timestamp < ?',
                            [cutoffDate]
                        )
                    ]);
                    archived = oldRecords.length;
                }
                
                deleted = oldRecords.length;
                
                // Log archival
                await this.logAuditEvent({
                    eventType: 'system_access',
                    severity: 'info',
                    component: 'AuditComplianceSystem',
                    action: 'records_archived',
                    details: {
                        archived,
                        deleted,
                        cutoffDate,
                        retentionPeriod: this.config.logging.retentionPeriod
                    },
                    riskLevel: 'low',
                    complianceFlags: []
                });
            }
            
            console.log(`✅ Archival completed: ${archived} archived, ${deleted} deleted`);
            
            return { archived, deleted };
            
        } catch (error) {
            console.error('❌ Records archival failed:', error);
            throw error;
        }
    }

    /**
     * Get Audit Metrics
     */
    public getAuditMetrics(): AuditMetrics {
        return { ...this.auditMetrics };
    }

    /**
     * Stop Audit Logging
     */
    public async stopAuditLogging(): Promise<void> {
        try {
            console.log('🛑 Stopping audit logging...');
            
            this.isLogging = false;
            
            // Stop flush interval
            if (this.flushInterval) {
                clearInterval(this.flushInterval);
                this.flushInterval = null;
            }
            
            // Final flush of buffers
            await this.flushAuditBuffer();
            await this.flushTradeAuditBuffer();
            
            // Log shutdown
            await this.logAuditEvent({
                eventType: 'system_access',
                severity: 'info',
                component: 'AuditComplianceSystem',
                action: 'audit_logging_stopped',
                details: {
                    finalMetrics: this.auditMetrics
                },
                riskLevel: 'low',
                complianceFlags: []
            });
            
            console.log('✅ Audit logging stopped');
            
            this.emit('audit_logging_stopped');
            
        } catch (error) {
            console.error('❌ Failed to stop audit logging:', error);
            throw error;
        }
    }

    // Private Implementation Methods

    private validateConfiguration(): void {
        if (this.config.logging.retentionPeriod <= 0) {
            throw new Error('Retention period must be positive');
        }
        
        if (!['minimal', 'standard', 'comprehensive', 'full'].includes(this.config.logging.level)) {
            throw new Error('Invalid logging level');
        }
        
        console.log('✅ Audit configuration validated');
    }

    private async initializeAuditTables(): Promise<void> {
        try {
            // Create audit events table
            await this.database.query(`
                CREATE TABLE IF NOT EXISTS audit_events (
                    id VARCHAR(255) PRIMARY KEY,
                    timestamp DATETIME NOT NULL,
                    event_type VARCHAR(100) NOT NULL,
                    severity VARCHAR(20) NOT NULL,
                    component VARCHAR(100) NOT NULL,
                    action VARCHAR(100) NOT NULL,
                    details JSON,
                    user_id VARCHAR(100),
                    session_id VARCHAR(100),
                    ip_address VARCHAR(50),
                    user_agent TEXT,
                    risk_level VARCHAR(20) NOT NULL,
                    compliance_flags JSON,
                    hash VARCHAR(64) NOT NULL,
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_event_type (event_type),
                    INDEX idx_component (component),
                    INDEX idx_severity (severity)
                )
            `);
            
            // Create trade audit table
            await this.database.query(`
                CREATE TABLE IF NOT EXISTS trade_audit (
                    trade_id VARCHAR(255) PRIMARY KEY,
                    timestamp DATETIME NOT NULL,
                    symbol VARCHAR(20) NOT NULL,
                    side VARCHAR(10) NOT NULL,
                    quantity DECIMAL(20,8) NOT NULL,
                    price DECIMAL(20,8) NOT NULL,
                    order_type VARCHAR(20) NOT NULL,
                    strategy VARCHAR(100) NOT NULL,
                    execution_time INT NOT NULL,
                    slippage DECIMAL(10,6) NOT NULL,
                    fees DECIMAL(20,8) NOT NULL,
                    pre_trade_risk JSON,
                    post_trade_risk JSON,
                    approvals JSON,
                    regulatory_flags JSON,
                    INDEX idx_timestamp (timestamp),
                    INDEX idx_symbol (symbol),
                    INDEX idx_strategy (strategy)
                )
            `);
            
            // Create compliance reports table
            await this.database.query(`
                CREATE TABLE IF NOT EXISTS compliance_reports (
                    id VARCHAR(255) PRIMARY KEY,
                    report_type VARCHAR(20) NOT NULL,
                    period_start DATETIME NOT NULL,
                    period_end DATETIME NOT NULL,
                    generated_at DATETIME NOT NULL,
                    regulatory_framework VARCHAR(100) NOT NULL,
                    summary JSON,
                    findings JSON,
                    recommendations JSON,
                    status VARCHAR(20) NOT NULL,
                    INDEX idx_report_type (report_type),
                    INDEX idx_regulatory_framework (regulatory_framework),
                    INDEX idx_generated_at (generated_at)
                )
            `);
            
            console.log('✅ Audit database tables initialized');
            
        } catch (error) {
            console.error('❌ Failed to initialize audit tables:', error);
            throw error;
        }
    }

    private async loadAuditMetrics(): Promise<void> {
        try {
            const cached = await this.cacheService.get('audit_metrics');
            if (cached) {
                this.auditMetrics = { ...this.auditMetrics, ...cached };
                console.log('📊 Loaded audit metrics from cache');
            }
        } catch (error) {
            console.error('❌ Failed to load audit metrics:', error);
        }
    }

    private async setupAuditInfrastructure(): Promise<void> {
        console.log('🔧 Setting up audit infrastructure...');
        
        // Initialize event type counters
        const eventTypes: AuditEventType[] = [
            'trade_execution', 'order_management', 'risk_management', 'portfolio_rebalancing',
            'emergency_action', 'system_access', 'configuration_change', 'compliance_check',
            'data_access', 'error_event', 'performance_metric', 'security_event'
        ];
        
        for (const eventType of eventTypes) {
            if (!(eventType in this.auditMetrics.eventsByType)) {
                this.auditMetrics.eventsByType[eventType] = 0;
            }
        }
        
        console.log('✅ Audit infrastructure ready');
    }

    private async startAuditLogging(): Promise<void> {
        this.isLogging = true;
        
        // Start buffer flush interval
        this.flushInterval = setInterval(async () => {
            if (this.auditBuffer.length > 0 || this.tradeAuditBuffer.length > 0) {
                await this.flushAuditBuffer();
                await this.flushTradeAuditBuffer();
            }
        }, 5000); // Flush every 5 seconds
        
        console.log('✅ Audit logging started');
    }

    private async scheduleComplianceChecks(): Promise<void> {
        // Schedule daily compliance checks
        setInterval(async () => {
            try {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const today = new Date();
                
                for (const framework of this.getEnabledComplianceFrameworks()) {
                    await this.generateComplianceReport('daily', 
                        { start: yesterday, end: today }, framework);
                }
            } catch (error) {
                console.error('❌ Scheduled compliance check failed:', error);
            }
        }, 24 * 60 * 60 * 1000); // Daily
        
        console.log('⏰ Compliance checks scheduled');
    }

    private async flushAuditBuffer(): Promise<void> {
        if (this.auditBuffer.length === 0) return;
        
        try {
            const events = [...this.auditBuffer];
            this.auditBuffer = [];
            
            // Batch insert audit events
            const values = events.map(event => [
                event.id, event.timestamp, event.eventType, event.severity,
                event.component, event.action, JSON.stringify(event.details),
                event.userId, event.sessionId, event.ipAddress, event.userAgent,
                event.riskLevel, JSON.stringify(event.complianceFlags), event.hash
            ]);
            
            await this.database.query(`
                INSERT INTO audit_events (
                    id, timestamp, event_type, severity, component, action, details,
                    user_id, session_id, ip_address, user_agent, risk_level, compliance_flags, hash
                ) VALUES ${values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
            `, values.flat());
            
            // Cache metrics update
            await this.cacheService.set('audit_metrics', this.auditMetrics, 3600);
            
        } catch (error) {
            console.error('❌ Failed to flush audit buffer:', error);
            // Put events back in buffer for retry
            this.auditBuffer.unshift(...this.auditBuffer);
        }
    }

    private async flushTradeAuditBuffer(): Promise<void> {
        if (this.tradeAuditBuffer.length === 0) return;
        
        try {
            const trades = [...this.tradeAuditBuffer];
            this.tradeAuditBuffer = [];
            
            // Batch insert trade audit records
            const values = trades.map(trade => [
                trade.tradeId, trade.timestamp, trade.symbol, trade.side,
                trade.quantity, trade.price, trade.orderType, trade.strategy,
                trade.executionTime, trade.slippage, trade.fees,
                JSON.stringify(trade.preTradeRisk), JSON.stringify(trade.postTradeRisk),
                JSON.stringify(trade.approvals), JSON.stringify(trade.regulatoryFlags)
            ]);
            
            await this.database.query(`
                INSERT INTO trade_audit (
                    trade_id, timestamp, symbol, side, quantity, price, order_type, strategy,
                    execution_time, slippage, fees, pre_trade_risk, post_trade_risk,
                    approvals, regulatory_flags
                ) VALUES ${values.map(() => '(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').join(',')}
            `, values.flat());
            
        } catch (error) {
            console.error('❌ Failed to flush trade audit buffer:', error);
            // Put trades back in buffer for retry
            this.tradeAuditBuffer.unshift(...this.tradeAuditBuffer);
        }
    }

    // Helper methods

    private generateAuditId(): string {
        return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private generateReportId(reportType: string, framework: string): string {
        return `report_${reportType}_${framework}_${Date.now()}`;
    }

    private generateIntegrityHash(event: Omit<AuditEvent, 'hash'>): string {
        const data = JSON.stringify({
            id: event.id,
            timestamp: event.timestamp.toISOString(),
            eventType: event.eventType,
            component: event.component,
            action: event.action,
            details: event.details
        });
        
        return createHash('sha256').update(data).digest('hex');
    }

    private getEnabledComplianceFrameworks(): string[] {
        const frameworks: string[] = [];
        
        if (this.config.compliance.miFIDII) frameworks.push('MiFID II');
        if (this.config.compliance.doddFrank) frameworks.push('Dodd-Frank');
        if (this.config.compliance.basel) frameworks.push('Basel');
        if (this.config.compliance.gdpr) frameworks.push('GDPR');
        
        frameworks.push(...this.config.compliance.customRegulations);
        
        return frameworks;
    }

    private updateAuditMetrics(event: AuditEvent): void {
        this.auditMetrics.totalEvents++;
        this.auditMetrics.eventsByType[event.eventType] = 
            (this.auditMetrics.eventsByType[event.eventType] || 0) + 1;
        this.auditMetrics.eventsBySeverity[event.severity] = 
            (this.auditMetrics.eventsBySeverity[event.severity] || 0) + 1;
        this.auditMetrics.eventsByComponent[event.component] = 
            (this.auditMetrics.eventsByComponent[event.component] || 0) + 1;
        
        if (event.complianceFlags.length > 0) {
            this.auditMetrics.complianceBreaches++;
        }
    }

    private async checkComplianceFlags(event: AuditEvent): Promise<void> {
        // Check for compliance violations based on event details
        if (event.severity === 'critical' || event.riskLevel === 'critical') {
            await this.monitoringSystem.sendAlert({
                level: 'critical',
                message: `Critical audit event: ${event.action}`,
                component: 'AuditComplianceSystem',
                metadata: {
                    eventId: event.id,
                    eventType: event.eventType,
                    component: event.component,
                    complianceFlags: event.complianceFlags
                }
            });
        }
    }

    private assessTradeSeverity(trade: TradeAuditRecord): 'info' | 'warning' | 'error' | 'critical' {
        // Assess trade size vs portfolio
        if (trade.quantity * trade.price > this.config.alerts.largeTradeThreshold) {
            return 'warning';
        }
        
        // Check regulatory flags
        if (trade.regulatoryFlags.some(flag => flag.includes('violation'))) {
            return 'critical';
        }
        
        return 'info';
    }

    private assessTradeRiskLevel(trade: TradeAuditRecord): 'low' | 'medium' | 'high' | 'critical' {
        const riskIncrease = trade.postTradeRisk.portfolioVaR - trade.preTradeRisk.portfolioVaR;
        
        if (riskIncrease > 0.01) return 'critical'; // 1% VaR increase
        if (riskIncrease > 0.005) return 'high'; // 0.5% VaR increase
        if (riskIncrease > 0.002) return 'medium'; // 0.2% VaR increase
        return 'low';
    }

    private async checkLargeTradeReporting(trade: TradeAuditRecord): Promise<void> {
        const tradeValue = trade.quantity * trade.price;
        
        if (tradeValue > this.config.alerts.largeTradeThreshold) {
            await this.logAuditEvent({
                eventType: 'compliance_check',
                severity: 'warning',
                component: 'TradingEngine',
                action: 'large_trade_detected',
                details: {
                    tradeId: trade.tradeId,
                    tradeValue,
                    threshold: this.config.alerts.largeTradeThreshold,
                    reportingRequired: true
                },
                riskLevel: 'medium',
                complianceFlags: ['large_trade_reporting']
            });
        }
    }

    private buildAuditQuery(query: AuditQuery): { sql: string; params: any[] } {
        let sql = 'SELECT * FROM audit_events WHERE 1=1';
        const params: any[] = [];
        
        if (query.eventTypes && query.eventTypes.length > 0) {
            sql += ` AND event_type IN (${query.eventTypes.map(() => '?').join(',')})`;
            params.push(...query.eventTypes);
        }
        
        if (query.components && query.components.length > 0) {
            sql += ` AND component IN (${query.components.map(() => '?').join(',')})`;
            params.push(...query.components);
        }
        
        if (query.severity && query.severity.length > 0) {
            sql += ` AND severity IN (${query.severity.map(() => '?').join(',')})`;
            params.push(...query.severity);
        }
        
        if (query.dateRange) {
            sql += ' AND timestamp BETWEEN ? AND ?';
            params.push(query.dateRange.start, query.dateRange.end);
        }
        
        if (query.userId) {
            sql += ' AND user_id = ?';
            params.push(query.userId);
        }
        
        if (query.searchText) {
            sql += ' AND (action LIKE ? OR JSON_EXTRACT(details, "$.description") LIKE ?)';
            params.push(`%${query.searchText}%`, `%${query.searchText}%`);
        }
        
        sql += ' ORDER BY timestamp DESC';
        
        if (query.limit) {
            sql += ' LIMIT ?';
            params.push(query.limit);
            
            if (query.offset) {
                sql += ' OFFSET ?';
                params.push(query.offset);
            }
        }
        
        return { sql, params };
    }

    private async verifyRecordIntegrity(records: any[]): Promise<AuditEvent[]> {
        const verifiedRecords: AuditEvent[] = [];
        
        for (const record of records) {
            const expectedHash = this.generateIntegrityHash(record);
            
            if (record.hash === expectedHash) {
                verifiedRecords.push(record as AuditEvent);
            } else {
                // Log integrity violation
                await this.logAuditEvent({
                    eventType: 'security_event',
                    severity: 'critical',
                    component: 'AuditComplianceSystem',
                    action: 'data_integrity_violation',
                    details: {
                        corruptedEventId: record.id,
                        expectedHash,
                        actualHash: record.hash
                    },
                    riskLevel: 'critical',
                    complianceFlags: ['data_integrity_violation']
                });
            }
        }
        
        return verifiedRecords;
    }

    private async gatherComplianceData(period: { start: Date; end: Date }, framework: string): Promise<any> {
        // Gather relevant compliance data based on framework
        const trades = await this.database.query(
            'SELECT * FROM trade_audit WHERE timestamp BETWEEN ? AND ?',
            [period.start, period.end]
        );
        
        const auditEvents = await this.database.query(
            'SELECT * FROM audit_events WHERE timestamp BETWEEN ? AND ? AND JSON_CONTAINS(compliance_flags, ?)',
            [period.start, period.end, JSON.stringify([framework.toLowerCase()])]
        );
        
        return {
            trades,
            auditEvents,
            totalVolume: trades.reduce((sum: number, trade: any) => sum + (trade.quantity * trade.price), 0),
            riskLimitExceeded: auditEvents.filter((e: any) => e.event_type === 'risk_management').length,
            errorRate: auditEvents.filter((e: any) => e.severity === 'error').length / auditEvents.length
        };
    }

    private async analyzeComplianceFindings(data: any, framework: string): Promise<ComplianceFinding[]> {
        const findings: ComplianceFinding[] = [];
        
        // Analyze based on framework requirements
        if (framework === 'MiFID II') {
            // Check best execution requirements
            const poorExecutions = data.trades.filter((trade: any) => trade.slippage > 0.005);
            if (poorExecutions.length > 0) {
                findings.push({
                    id: `mifid_${Date.now()}_1`,
                    severity: 'medium',
                    category: 'trade_reporting',
                    description: `${poorExecutions.length} trades with high slippage (>0.5%) may indicate best execution violations`,
                    evidence: poorExecutions.map((t: any) => t.trade_id),
                    remediation: 'Review execution algorithms and market data feeds',
                    deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
                    responsible: 'Trading Operations',
                    status: 'open'
                });
            }
        }
        
        // Add more framework-specific analysis...
        
        return findings;
    }

    private async generateComplianceRecommendations(findings: ComplianceFinding[]): Promise<string[]> {
        const recommendations: string[] = [];
        
        if (findings.some(f => f.category === 'trade_reporting')) {
            recommendations.push('Implement enhanced trade execution monitoring');
            recommendations.push('Review and update best execution policies');
        }
        
        if (findings.some(f => f.severity === 'critical')) {
            recommendations.push('Conduct immediate investigation of critical findings');
            recommendations.push('Implement additional risk controls');
        }
        
        return recommendations;
    }

    private async saveComplianceReport(report: ComplianceReport): Promise<void> {
        await this.database.query(`
            INSERT INTO compliance_reports (
                id, report_type, period_start, period_end, generated_at,
                regulatory_framework, summary, findings, recommendations, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            report.id, report.reportType, report.period.start, report.period.end,
            report.generatedAt, report.regulatoryFramework,
            JSON.stringify(report.summary), JSON.stringify(report.findings),
            JSON.stringify(report.recommendations), report.status
        ]);
    }

    private async archiveToFile(records: any[]): Promise<void> {
        // Simplified file archival - in production would use proper file storage
        const archiveData = {
            archivedAt: new Date(),
            recordCount: records.length,
            records: this.config.logging.compressionEnabled ? 
                'compressed_data' : records // Would implement actual compression
        };
        
        await this.cacheService.set(
            `archive_${Date.now()}`, 
            archiveData, 
            365 * 24 * 60 * 60 // 1 year
        );
    }
}

export default AuditComplianceSystem;
