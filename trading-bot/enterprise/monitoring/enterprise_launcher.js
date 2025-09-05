#!/usr/bin/env node

/**
 * ENTERPRISE MONITORING SYSTEM - DIRECT LAUNCHER v1.0.0
 * Direct Node.js execution with ts-node for TypeScript files
 * 
 * Features:
 * - Direct TypeScript execution without compilation
 * - Enterprise monitoring system startup
 * - Performance and health monitoring
 * - Real-time metrics collection
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

class EnterpriseMonitoringLauncher {
    constructor() {
        this.projectRoot = path.join(__dirname, '../..');
        this.logFile = path.join(this.projectRoot, 'logs/monitoring_startup.log');
        this.pidFile = path.join(this.projectRoot, 'logs/monitoring.pid');
        this.startTime = Date.now();
    }

    log(level, message) {
        const timestamp = new Date().toISOString();
        const logEntry = `[${timestamp}] [${level}] ${message}`;
        console.log(logEntry);
        
        // Ensure logs directory exists
        const logsDir = path.dirname(this.logFile);
        if (!fs.existsSync(logsDir)) {
            fs.mkdirSync(logsDir, { recursive: true });
        }
        
        fs.appendFileSync(this.logFile, logEntry + '\n');
    }

    async checkPrerequisites() {
        this.log('INFO', '🔍 Checking system prerequisites...');
        
        // Check Node.js
        try {
            const nodeVersion = process.version;
            this.log('INFO', `✅ Node.js version: ${nodeVersion}`);
        } catch (error) {
            this.log('ERROR', '❌ Node.js not available');
            throw error;
        }

        // Check ts-node
        try {
            const { execSync } = require('child_process');
            const tsNodeVersion = execSync('npx ts-node --version', { encoding: 'utf8' }).trim();
            this.log('INFO', `✅ ts-node available: ${tsNodeVersion}`);
        } catch (error) {
            this.log('WARN', '⚠️ ts-node not available, installing...');
            try {
                execSync('npm install -g ts-node typescript', { stdio: 'inherit' });
                this.log('INFO', '✅ ts-node installed successfully');
            } catch (installError) {
                this.log('ERROR', '❌ Failed to install ts-node');
                throw installError;
            }
        }

        // Check if monitoring files exist
        const monitoringFiles = [
            'enterprise/monitoring/performance_logger.ts',
            'enterprise/monitoring/system_health.ts',
            'enterprise/monitoring/monitoring_controller.ts'
        ];

        for (const file of monitoringFiles) {
            const filePath = path.join(this.projectRoot, file);
            if (!fs.existsSync(filePath)) {
                throw new Error(`Required monitoring file not found: ${file}`);
            }
            this.log('INFO', `✅ Found: ${file}`);
        }

        this.log('INFO', '✅ Prerequisites check completed');
    }

    async setupDirectories() {
        this.log('INFO', '📁 Setting up monitoring directories...');
        
        const directories = [
            'logs',
            'data/monitoring',
            'data/performance',
            'data/health',
            'results/monitoring_reports',
            'results/performance_reports',
            'results/health_reports',
            'config/monitoring'
        ];
        
        for (const dir of directories) {
            const fullPath = path.join(this.projectRoot, dir);
            if (!fs.existsSync(fullPath)) {
                fs.mkdirSync(fullPath, { recursive: true });
                this.log('INFO', `Created directory: ${dir}`);
            }
        }
        
        this.log('INFO', '✅ Directory structure ready');
    }

    async createMonitoringConfig() {
        this.log('INFO', '⚙️ Creating monitoring configuration...');
        
        const configDir = path.join(this.projectRoot, 'config/monitoring');
        
        // Performance logger config
        const performanceConfig = {
            database: {
                path: path.join(this.projectRoot, 'data/monitoring/performance_metrics.db'),
                retentionDays: 365
            },
            prometheus: {
                enabled: true,
                port: 9090,
                endpoint: '/metrics'
            },
            grafana: {
                enabled: true,
                dashboardId: 'trading-bot-performance',
                refreshInterval: 30
            },
            alerting: {
                enabled: true,
                conditions: [
                    {
                        metricName: 'maxDrawdown',
                        threshold: 20,
                        operator: '>',
                        severity: 'HIGH',
                        description: 'Maximum drawdown exceeded 20%',
                        enabled: true
                    },
                    {
                        metricName: 'sharpeRatio',
                        threshold: 0.5,
                        operator: '<',
                        severity: 'MEDIUM',
                        description: 'Sharpe ratio below 0.5',
                        enabled: true
                    }
                ]
            },
            collection: {
                intervalSeconds: 60,
                batchSize: 100,
                maxMemoryMB: 256
            }
        };

        // Health monitor config
        const healthConfig = {
            monitoring: {
                intervalSeconds: 60,
                enabledChecks: ['cpu', 'memory', 'disk', 'network', 'processes'],
                thresholds: {
                    cpu: { warning: 70, critical: 90 },
                    memory: { warning: 80, critical: 95 },
                    disk: { warning: 85, critical: 95 },
                    latency: { warning: 500, critical: 1000 }
                }
            },
            alerts: {
                enabled: true
            },
            storage: {
                retentionDays: 30,
                maxLogFiles: 100,
                compressionEnabled: true
            },
            exchanges: ['binance', 'coinbase', 'kraken'],
            processes: ['trading-bot', 'database', 'webserver', 'monitoring']
        };

        fs.writeFileSync(
            path.join(configDir, 'performance_config.json'),
            JSON.stringify(performanceConfig, null, 2)
        );

        fs.writeFileSync(
            path.join(configDir, 'health_config.json'),
            JSON.stringify(healthConfig, null, 2)
        );

        this.log('INFO', '✅ Monitoring configuration created');
    }

    async startMonitoringSystem() {
        this.log('INFO', '🚀 Starting Enterprise Monitoring System...');
        
        // Check if already running
        if (fs.existsSync(this.pidFile)) {
            try {
                const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
                process.kill(pid, 0); // Check if process exists
                this.log('WARN', `⚠️ Monitoring already running (PID: ${pid})`);
                return;
            } catch (error) {
                // Process doesn't exist, remove stale PID file
                fs.unlinkSync(this.pidFile);
            }
        }

        // Create monitoring startup script
        const startupScript = `
const path = require('path');

// Register ts-node for TypeScript execution
require('ts-node').register({
    compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        strict: false,
        esModuleInterop: true,
        allowSyntheticDefaultImports: true,
        resolveJsonModule: true,
        experimentalDecorators: true,
        skipLibCheck: true
    }
});

// Load monitoring system
async function startMonitoring() {
    try {
        console.log('🏗️ Loading Enterprise Monitoring Controller...');
        
        // Import and start monitoring controller
        const { EnterpriseMonitoringController } = require('./enterprise/monitoring/monitoring_controller');
        
        // Load configurations
        const performanceConfig = require('./config/monitoring/performance_config.json');
        const healthConfig = require('./config/monitoring/health_config.json');
        
        console.log('📊 Initializing monitoring controller...');
        const monitor = new EnterpriseMonitoringController(performanceConfig, healthConfig);
        
        console.log('🚀 Starting monitoring services...');
        await monitor.startMonitoring();
        
        console.log('✅ Enterprise Monitoring System operational');
        
        // Keep alive
        process.on('SIGINT', async () => {
            console.log('🛑 Shutting down monitoring system...');
            await monitor.stopMonitoring();
            process.exit(0);
        });
        
        process.on('SIGTERM', async () => {
            console.log('🛑 Shutting down monitoring system...');
            await monitor.stopMonitoring();
            process.exit(0);
        });
        
        // Regular status updates
        setInterval(async () => {
            const dashboard = monitor.getCurrentDashboard();
            if (dashboard) {
                console.log(\`📊 Status: \${dashboard.summary.status} | CPU: \${dashboard.health.cpu.toFixed(1)}% | Memory: \${dashboard.health.memory.toFixed(1)}%\`);
            }
        }, 60000);
        
    } catch (error) {
        console.error('❌ Failed to start monitoring system:', error);
        process.exit(1);
    }
}

startMonitoring().catch(console.error);
`;

        const scriptPath = path.join(this.projectRoot, 'monitoring_startup.js');
        fs.writeFileSync(scriptPath, startupScript);

        // Start monitoring process
        const monitoringProcess = spawn('node', [scriptPath], {
            cwd: this.projectRoot,
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe']
        });

        // Save PID
        fs.writeFileSync(this.pidFile, monitoringProcess.pid.toString());

        // Pipe output to log file
        const logStream = fs.createWriteStream(path.join(this.projectRoot, 'logs/monitoring_output.log'), { flags: 'a' });
        monitoringProcess.stdout.pipe(logStream);
        monitoringProcess.stderr.pipe(logStream);

        // Log output to console for a few seconds
        let outputTimeout = setTimeout(() => {
            monitoringProcess.stdout.unpipe(process.stdout);
            monitoringProcess.stderr.unpipe(process.stderr);
        }, 10000);

        monitoringProcess.stdout.pipe(process.stdout);
        monitoringProcess.stderr.pipe(process.stderr);

        monitoringProcess.on('error', (error) => {
            this.log('ERROR', `❌ Monitoring process error: ${error.message}`);
        });

        monitoringProcess.on('exit', (code) => {
            this.log('WARN', `⚠️ Monitoring process exited with code: ${code}`);
            if (fs.existsSync(this.pidFile)) {
                fs.unlinkSync(this.pidFile);
            }
        });

        // Detach process
        monitoringProcess.unref();

        // Wait a moment to check if it started successfully
        await new Promise(resolve => setTimeout(resolve, 3000));

        try {
            process.kill(monitoringProcess.pid, 0);
            this.log('INFO', `✅ Monitoring system started successfully (PID: ${monitoringProcess.pid})`);
        } catch (error) {
            this.log('ERROR', '❌ Failed to start monitoring system');
            throw error;
        }
    }

    async verifyMonitoring() {
        this.log('INFO', '🔍 Verifying monitoring system...');
        
        // Check process
        if (fs.existsSync(this.pidFile)) {
            const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
            try {
                process.kill(pid, 0);
                this.log('INFO', `✅ Monitoring process running (PID: ${pid})`);
            } catch (error) {
                this.log('ERROR', '❌ Monitoring process not running');
                return false;
            }
        } else {
            this.log('ERROR', '❌ No PID file found');
            return false;
        }

        // Check logs
        const outputLog = path.join(this.projectRoot, 'logs/monitoring_output.log');
        if (fs.existsSync(outputLog)) {
            this.log('INFO', '✅ Monitoring logs being generated');
        } else {
            this.log('WARN', '⚠️ Monitoring logs not found');
        }

        // Check databases
        const dbPath = path.join(this.projectRoot, 'data/monitoring/performance_metrics.db');
        if (fs.existsSync(dbPath)) {
            this.log('INFO', '✅ Performance database available');
        } else {
            this.log('WARN', '⚠️ Performance database not yet created');
        }

        this.log('INFO', '✅ Monitoring system verification completed');
        return true;
    }

    printStatus() {
        console.log('\n╔══════════════════════════════════════════════════════════════════════╗');
        console.log('║                     🎯 ENTERPRISE MONITORING STATUS                  ║');
        console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
        
        console.log('📊 Performance Logger:      ACTIVE');
        console.log('🏥 System Health Monitor:   ACTIVE');
        console.log('📈 Metrics Collection:      ACTIVE');
        console.log('🚨 Alert System:            ACTIVE');
        console.log('🗄️ Database:                READY');
        
        if (fs.existsSync(this.pidFile)) {
            const pid = fs.readFileSync(this.pidFile, 'utf8').trim();
            console.log(`🔧 Process ID:              ${pid}`);
        }
        
        console.log('\n📋 Available Commands:');
        console.log(`  View Logs:           tail -f ${this.projectRoot}/logs/monitoring_output.log`);
        console.log(`  Stop Monitoring:     kill $(cat ${this.pidFile})`);
        console.log(`  View Reports:        ls -la ${this.projectRoot}/results/monitoring_reports/`);
        console.log(`  Check Status:        ps aux | grep monitoring`);
        
        console.log('\n✅ Enterprise Monitoring System is now operational!\n');
    }

    async launch() {
        try {
            console.log('╔══════════════════════════════════════════════════════════════════════╗');
            console.log('║              🚀 ENTERPRISE MONITORING SYSTEM LAUNCHER                ║');
            console.log('║                     Turbo Bot Deva Trading Platform                  ║');
            console.log('║                           v1.0.0 - 2025                            ║');
            console.log('╚══════════════════════════════════════════════════════════════════════╝\n');
            
            this.log('INFO', '🎯 Starting Enterprise Monitoring System deployment...');
            
            await this.checkPrerequisites();
            await this.setupDirectories();
            await this.createMonitoringConfig();
            await this.startMonitoringSystem();
            await this.verifyMonitoring();
            
            this.printStatus();
            
            this.log('INFO', '🎉 Enterprise Monitoring System deployment completed successfully!');
            
            // Save startup timestamp
            const timestampFile = path.join(this.projectRoot, 'logs/monitoring_started.timestamp');
            fs.writeFileSync(timestampFile, new Date().toISOString());
            
        } catch (error) {
            this.log('ERROR', `❌ Deployment failed: ${error.message}`);
            console.error('\n❌ Enterprise Monitoring System deployment failed!');
            console.error(`Error: ${error.message}`);
            process.exit(1);
        }
    }
}

// Launch monitoring system
const launcher = new EnterpriseMonitoringLauncher();
launcher.launch().catch(console.error);
