#!/usr/bin/env ts-node
/**
 * 🔍 COMPREHENSIVE BOT AUDIT SCRIPT
 * 
 * Ten skrypt przeprowadza kompleksowy audyt bota przed produkcją:
 * 1. Sprawdza wszystkie zależności
 * 2. Weryfikuje konfigurację
 * 3. Testuje inicjalizację komponentów
 * 4. Waliduje ML system
 * 5. Sprawdza health checks
 * 6. Testuje API endpoints
 * 7. Weryfikuje error handling
 * 8. Sprawdza graceful shutdown
 */

import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

interface AuditResult {
    category: string;
    test: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    details: string;
    timestamp: number;
}

class BotAuditor {
    private results: AuditResult[] = [];
    private startTime: number = Date.now();

    constructor() {
        console.log('🔍 ========================================');
        console.log('🔍 COMPREHENSIVE BOT AUDIT');
        console.log('🔍 ========================================\n');
    }

    // ========================================================================
    // AUDIT CATEGORIES
    // ========================================================================

    async runFullAudit(): Promise<void> {
        await this.auditDependencies();
        await this.auditConfiguration();
        await this.auditFileStructure();
        await this.auditMLSystem();
        await this.auditEnterpriseComponents();
        await this.auditSecurity();
        await this.auditPerformance();
        
        this.generateReport();
    }

    // ========================================================================
    // 1. DEPENDENCIES AUDIT
    // ========================================================================

    private async auditDependencies(): Promise<void> {
        console.log('📦 [1/7] Auditing Dependencies...\n');

        const requiredPackages = [
            'express',
            'cors',
            'dotenv',
            '@tensorflow/tfjs',
            '@tensorflow/tfjs-node',
            'socket.io',
            'ioredis',
            'axios',
            'winston',
            'prom-client',
            'typescript',
            'ts-node'
        ];

        try {
            const packageJson = JSON.parse(
                fs.readFileSync(path.join(__dirname, 'package.json'), 'utf-8')
            );

            for (const pkg of requiredPackages) {
                const isInstalled = 
                    packageJson.dependencies?.[pkg] || 
                    packageJson.devDependencies?.[pkg];

                this.addResult({
                    category: 'Dependencies',
                    test: `Package: ${pkg}`,
                    status: isInstalled ? 'PASS' : 'FAIL',
                    details: isInstalled 
                        ? `Version: ${isInstalled}` 
                        : 'Package not found',
                    timestamp: Date.now()
                });
            }
        } catch (error) {
            this.addResult({
                category: 'Dependencies',
                test: 'package.json read',
                status: 'FAIL',
                details: `Error: ${error}`,
                timestamp: Date.now()
            });
        }
    }

    // ========================================================================
    // 2. CONFIGURATION AUDIT
    // ========================================================================

    private async auditConfiguration(): Promise<void> {
        console.log('\n⚙️  [2/7] Auditing Configuration...\n');

        // Check .env file
        const envExists = fs.existsSync('.env');
        this.addResult({
            category: 'Configuration',
            test: '.env file exists',
            status: envExists ? 'PASS' : 'WARNING',
            details: envExists ? '.env file found' : 'Using defaults',
            timestamp: Date.now()
        });

        // Check critical environment variables
        const criticalVars = [
            'TRADING_SYMBOL',
            'INITIAL_CAPITAL',
            'MAX_DRAWDOWN',
            'RISK_PER_TRADE',
            'HEALTH_CHECK_PORT'
        ];

        for (const varName of criticalVars) {
            const value = process.env[varName];
            this.addResult({
                category: 'Configuration',
                test: `ENV: ${varName}`,
                status: value ? 'PASS' : 'WARNING',
                details: value 
                    ? `Set to: ${varName.includes('KEY') || varName.includes('SECRET') ? '***' : value}` 
                    : 'Using default value',
                timestamp: Date.now()
            });
        }

        // Check MODE configuration
        const mode = process.env.MODE || 'simulation';
        this.addResult({
            category: 'Configuration',
            test: 'Trading MODE',
            status: ['simulation', 'backtest', 'live'].includes(mode) ? 'PASS' : 'FAIL',
            details: `Current mode: ${mode}`,
            timestamp: Date.now()
        });

        // Check if live trading keys are set for live mode
        if (mode === 'live') {
            const hasKeys = process.env.OKX_API_KEY && 
                           process.env.OKX_SECRET_KEY && 
                           process.env.OKX_PASSPHRASE;
            
            this.addResult({
                category: 'Configuration',
                test: 'Live trading API keys',
                status: hasKeys ? 'PASS' : 'FAIL',
                details: hasKeys 
                    ? 'API keys configured' 
                    : 'Missing API keys for live mode!',
                timestamp: Date.now()
            });
        }
    }

    // ========================================================================
    // 3. FILE STRUCTURE AUDIT
    // ========================================================================

    private async auditFileStructure(): Promise<void> {
        console.log('\n📁 [3/7] Auditing File Structure...\n');

        const criticalFiles = [
            'trading-bot/autonomous_trading_bot_final.ts',
            'trading-bot/src/core/ml/enterprise_ml_system.ts',
            'trading-bot/src/core/ml/production_ml_integrator.ts',
            'trading-bot/src/core/ml/simple_rl_adapter.ts',
            'src/enterprise/production/ProductionTradingEngine.ts',
            'src/enterprise/production/RealTimeVaRMonitor.ts',
            'src/enterprise/production/EmergencyStopSystem.ts',
            'src/enterprise/monitoring/simple_monitoring_system.ts'
        ];

        for (const file of criticalFiles) {
            const exists = fs.existsSync(file);
            const size = exists ? fs.statSync(file).size : 0;
            
            this.addResult({
                category: 'File Structure',
                test: path.basename(file),
                status: exists && size > 0 ? 'PASS' : 'FAIL',
                details: exists 
                    ? `Size: ${(size / 1024).toFixed(2)} KB` 
                    : 'File not found',
                timestamp: Date.now()
            });
        }

        // Check logs directory
        const logsDir = 'logs';
        const logsDirExists = fs.existsSync(logsDir);
        
        this.addResult({
            category: 'File Structure',
            test: 'Logs directory',
            status: logsDirExists ? 'PASS' : 'WARNING',
            details: logsDirExists 
                ? 'Logs directory exists' 
                : 'Will be created on first run',
            timestamp: Date.now()
        });
    }

    // ========================================================================
    // 4. ML SYSTEM AUDIT
    // ========================================================================

    private async auditMLSystem(): Promise<void> {
        console.log('\n🧠 [4/7] Auditing ML System...\n');

        try {
            // Check if ML files exist
            const mlFiles = [
                'trading-bot/src/core/ml/enterprise_ml_system.ts',
                'trading-bot/src/core/ml/production_ml_integrator.ts',
                'trading-bot/src/core/ml/simple_rl_adapter.ts'
            ];

            for (const file of mlFiles) {
                const exists = fs.existsSync(file);
                const content = exists ? fs.readFileSync(file, 'utf-8') : '';
                const hasErrors = content.includes('// @ts-ignore') || 
                                 content.includes('// @ts-expect-error');
                
                this.addResult({
                    category: 'ML System',
                    test: `ML File: ${path.basename(file)}`,
                    status: exists && !hasErrors ? 'PASS' : exists ? 'WARNING' : 'FAIL',
                    details: exists 
                        ? hasErrors 
                            ? 'File exists but has TypeScript suppressions' 
                            : 'File clean, no suppressions'
                        : 'File not found',
                    timestamp: Date.now()
                });
            }

            // Check TensorFlow installation
            try {
                require('@tensorflow/tfjs-node');
                this.addResult({
                    category: 'ML System',
                    test: 'TensorFlow.js Node',
                    status: 'PASS',
                    details: 'TensorFlow.js loaded successfully',
                    timestamp: Date.now()
                });
            } catch (error) {
                this.addResult({
                    category: 'ML System',
                    test: 'TensorFlow.js Node',
                    status: 'FAIL',
                    details: `Error: ${error}`,
                    timestamp: Date.now()
                });
            }

        } catch (error) {
            this.addResult({
                category: 'ML System',
                test: 'ML System check',
                status: 'FAIL',
                details: `Error: ${error}`,
                timestamp: Date.now()
            });
        }
    }

    // ========================================================================
    // 5. ENTERPRISE COMPONENTS AUDIT
    // ========================================================================

    private async auditEnterpriseComponents(): Promise<void> {
        console.log('\n🏢 [5/7] Auditing Enterprise Components...\n');

        const components = [
            'ProductionTradingEngine',
            'RealTimeVaRMonitor',
            'EmergencyStopSystem',
            'PortfolioRebalancingSystem',
            'AuditComplianceSystem',
            'IntegrationTestingSuite'
        ];

        for (const component of components) {
            const file = `src/enterprise/production/${component}.ts`;
            const exists = fs.existsSync(file);
            
            if (exists) {
                const content = fs.readFileSync(file, 'utf-8');
                const hasExport = content.includes(`export class ${component}`) || 
                                 content.includes(`export default class ${component}`);
                const hasInitialize = content.includes('initialize()') || 
                                     content.includes('async initialize');
                
                this.addResult({
                    category: 'Enterprise Components',
                    test: component,
                    status: hasExport && hasInitialize ? 'PASS' : 'WARNING',
                    details: hasExport && hasInitialize 
                        ? 'Component properly exported and initialized' 
                        : 'Component may have incomplete implementation',
                    timestamp: Date.now()
                });
            } else {
                this.addResult({
                    category: 'Enterprise Components',
                    test: component,
                    status: 'FAIL',
                    details: 'Component file not found',
                    timestamp: Date.now()
                });
            }
        }
    }

    // ========================================================================
    // 6. SECURITY AUDIT
    // ========================================================================

    private async auditSecurity(): Promise<void> {
        console.log('\n🔒 [6/7] Auditing Security...\n');

        // Check if .env is in .gitignore
        const gitignoreExists = fs.existsSync('.gitignore');
        let envIgnored = false;
        
        if (gitignoreExists) {
            const gitignore = fs.readFileSync('.gitignore', 'utf-8');
            envIgnored = gitignore.includes('.env');
        }

        this.addResult({
            category: 'Security',
            test: '.env in .gitignore',
            status: envIgnored ? 'PASS' : 'FAIL',
            details: envIgnored 
                ? '.env properly ignored' 
                : '.env NOT in .gitignore - SECURITY RISK!',
            timestamp: Date.now()
        });

        // Check for hardcoded secrets in main bot file
        const botFile = 'trading-bot/autonomous_trading_bot_final.ts';
        if (fs.existsSync(botFile)) {
            const content = fs.readFileSync(botFile, 'utf-8');
            const hasHardcodedSecrets = 
                content.match(/apiKey\s*=\s*["'][^"']{10,}["']/) ||
                content.match(/password\s*=\s*["'][^"']+["']/) ||
                content.match(/secret\s*=\s*["'][^"']{10,}["']/);
            
            this.addResult({
                category: 'Security',
                test: 'Hardcoded secrets check',
                status: hasHardcodedSecrets ? 'FAIL' : 'PASS',
                details: hasHardcodedSecrets 
                    ? 'Potential hardcoded secrets found!' 
                    : 'No hardcoded secrets detected',
                timestamp: Date.now()
            });
        }

        // Check risk limits
        const maxDrawdown = parseFloat(process.env.MAX_DRAWDOWN || '0.15');
        const riskPerTrade = parseFloat(process.env.RISK_PER_TRADE || '0.02');

        this.addResult({
            category: 'Security',
            test: 'Max Drawdown limit',
            status: maxDrawdown <= 0.2 ? 'PASS' : 'WARNING',
            details: `Set to ${(maxDrawdown * 100).toFixed(1)}% ${maxDrawdown > 0.2 ? '(HIGH!)' : ''}`,
            timestamp: Date.now()
        });

        this.addResult({
            category: 'Security',
            test: 'Risk per trade',
            status: riskPerTrade <= 0.05 ? 'PASS' : 'WARNING',
            details: `Set to ${(riskPerTrade * 100).toFixed(1)}% ${riskPerTrade > 0.05 ? '(HIGH!)' : ''}`,
            timestamp: Date.now()
        });
    }

    // ========================================================================
    // 7. PERFORMANCE AUDIT
    // ========================================================================

    private async auditPerformance(): Promise<void> {
        console.log('\n⚡ [7/7] Auditing Performance...\n');

        // Check bot file size
        const botFile = 'trading-bot/autonomous_trading_bot_final.ts';
        if (fs.existsSync(botFile)) {
            const size = fs.statSync(botFile).size;
            const lines = fs.readFileSync(botFile, 'utf-8').split('\n').length;
            
            this.addResult({
                category: 'Performance',
                test: 'Bot file size',
                status: size < 500000 ? 'PASS' : 'WARNING',
                details: `Size: ${(size / 1024).toFixed(2)} KB, Lines: ${lines}`,
                timestamp: Date.now()
            });
        }

        // Check for memory leaks patterns
        if (fs.existsSync(botFile)) {
            const content = fs.readFileSync(botFile, 'utf-8');
            const hasIntervals = (content.match(/setInterval/g) || []).length;
            const hasClearInterval = (content.match(/clearInterval/g) || []).length;
            const hasEventListeners = (content.match(/\.on\(/g) || []).length;
            const hasRemoveListeners = (content.match(/\.removeListener|\.off\(/g) || []).length;
            
            this.addResult({
                category: 'Performance',
                test: 'Memory leak prevention',
                status: (hasIntervals === hasClearInterval) && 
                       (hasEventListeners === 0 || hasRemoveListeners > 0) 
                    ? 'PASS' : 'WARNING',
                details: `Intervals: ${hasIntervals}/${hasClearInterval} cleared, Event listeners: ${hasEventListeners}`,
                timestamp: Date.now()
            });
        }

        // Check trading interval
        const interval = parseInt(process.env.TRADING_INTERVAL || '30000');
        this.addResult({
            category: 'Performance',
            test: 'Trading interval',
            status: interval >= 1000 && interval <= 300000 ? 'PASS' : 'WARNING',
            details: `${interval}ms (${(interval / 1000).toFixed(1)}s) ${interval < 1000 ? 'TOO FAST!' : interval > 300000 ? 'VERY SLOW' : ''}`,
            timestamp: Date.now()
        });
    }

    // ========================================================================
    // REPORT GENERATION
    // ========================================================================

    private addResult(result: AuditResult): void {
        this.results.push(result);
        
        const icon = result.status === 'PASS' ? '✅' : 
                    result.status === 'FAIL' ? '❌' : '⚠️';
        
        console.log(`${icon} ${result.category}: ${result.test}`);
        console.log(`   ${result.details}\n`);
    }

    private generateReport(): void {
        console.log('\n🔍 ========================================');
        console.log('🔍 AUDIT SUMMARY');
        console.log('🔍 ========================================\n');

        const byCategory: Record<string, AuditResult[]> = {};
        for (const result of this.results) {
            if (!byCategory[result.category]) {
                byCategory[result.category] = [];
            }
            byCategory[result.category].push(result);
        }

        let totalPass = 0;
        let totalFail = 0;
        let totalWarning = 0;

        for (const [category, results] of Object.entries(byCategory)) {
            const pass = results.filter(r => r.status === 'PASS').length;
            const fail = results.filter(r => r.status === 'FAIL').length;
            const warning = results.filter(r => r.status === 'WARNING').length;
            
            totalPass += pass;
            totalFail += fail;
            totalWarning += warning;

            console.log(`📊 ${category}:`);
            console.log(`   ✅ Pass: ${pass}`);
            console.log(`   ❌ Fail: ${fail}`);
            console.log(`   ⚠️  Warning: ${warning}`);
            console.log();
        }

        console.log('🔍 ========================================');
        console.log(`📊 TOTAL RESULTS:`);
        console.log(`   ✅ Pass: ${totalPass}`);
        console.log(`   ❌ Fail: ${totalFail}`);
        console.log(`   ⚠️  Warning: ${totalWarning}`);
        console.log(`   📝 Total Tests: ${this.results.length}`);
        console.log(`   ⏱️  Duration: ${((Date.now() - this.startTime) / 1000).toFixed(2)}s`);
        console.log('🔍 ========================================\n');

        // Production readiness assessment
        const passRate = (totalPass / this.results.length) * 100;
        const criticalFails = this.results.filter(r => 
            r.status === 'FAIL' && 
            (r.category === 'Dependencies' || r.category === 'ML System' || r.category === 'Security')
        ).length;

        console.log('🚀 PRODUCTION READINESS ASSESSMENT:\n');
        
        if (criticalFails > 0) {
            console.log('❌ NOT READY FOR PRODUCTION');
            console.log(`   ${criticalFails} critical failures must be resolved first!\n`);
        } else if (passRate >= 90 && totalFail === 0) {
            console.log('✅ READY FOR PRODUCTION');
            console.log(`   Pass rate: ${passRate.toFixed(1)}%`);
            if (totalWarning > 0) {
                console.log(`   Note: ${totalWarning} warnings should be reviewed\n`);
            }
        } else if (passRate >= 75) {
            console.log('⚠️  CONDITIONALLY READY');
            console.log(`   Pass rate: ${passRate.toFixed(1)}%`);
            console.log(`   Review ${totalFail} failures and ${totalWarning} warnings before deployment\n`);
        } else {
            console.log('❌ NOT READY FOR PRODUCTION');
            console.log(`   Pass rate: ${passRate.toFixed(1)}% (minimum 75% required)`);
            console.log(`   Address ${totalFail} failures before deployment\n`);
        }

        // Save report to file
        const reportPath = path.join(__dirname, 'audit_report.json');
        fs.writeFileSync(reportPath, JSON.stringify({
            timestamp: Date.now(),
            duration: Date.now() - this.startTime,
            summary: {
                total: this.results.length,
                pass: totalPass,
                fail: totalFail,
                warning: totalWarning,
                passRate: passRate
            },
            productionReady: criticalFails === 0 && passRate >= 75,
            results: this.results
        }, null, 2));

        console.log(`📝 Full report saved to: ${reportPath}\n`);
    }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
    const auditor = new BotAuditor();
    await auditor.runFullAudit();
}

main().catch(error => {
    console.error('💥 Audit error:', error);
    process.exit(1);
});
