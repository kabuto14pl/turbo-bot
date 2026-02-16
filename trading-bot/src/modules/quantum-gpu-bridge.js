/**
 * ╔══════════════════════════════════════════════════════════════════════════╗
 * ║  Quantum GPU Bridge — JS ↔ Python Integration Layer                     ║
 * ║  Bridges quantum_engine_gpu.py results into bot.js trading pipeline     ║
 * ║                                                                         ║
 * ║  Data Flow:                                                             ║
 * ║    quantum_engine_gpu.py → quantum_results.json → this bridge → bot.js  ║
 * ║                                                                         ║
 * ║  Methods:                                                               ║
 * ║    1. File-based: Read quantum_results.json (primary, low-latency)      ║
 * ║    2. Process-based: Spawn Python child_process on-demand               ║
 * ║    3. API-based: POST /api/quantum/signal from scheduler                ║
 * ╚══════════════════════════════════════════════════════════════════════════╝
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFile, spawn } = require('child_process');

// ============================================================================
// Configuration
// ============================================================================
const QUANTUM_DIR = path.resolve(__dirname, '../../../quantum');
const RESULTS_FILE = path.join(QUANTUM_DIR, 'results', 'quantum_results.json');
const PYTHON_CMD = process.env.PYTHON_CMD || 'python3';
const MAX_RESULTS_AGE_MS = parseInt(process.env.QUANTUM_MAX_AGE_MS || '600000', 10); // 10 min default
const BRIDGE_VERSION = '1.0.0';

// ============================================================================
// QuantumGPUBridge
// ============================================================================
class QuantumGPUBridge {
    /**
     * Bridge between Python quantum engine and JS trading bot.
     *
     * @param {Object} options
     * @param {string} options.quantumDir - Path to quantum/ directory
     * @param {string} options.pythonCmd - Python executable
     * @param {number} options.maxAgeMs - Max results age before stale
     * @param {boolean} options.autoRun - Auto-run quantum if results stale
     * @param {Object} options.logger - Logger instance
     */
    constructor(options = {}) {
        this.quantumDir = options.quantumDir || QUANTUM_DIR;
        this.resultsFile = path.join(this.quantumDir, 'results', 'quantum_results.json');
        this.pythonCmd = options.pythonCmd || PYTHON_CMD;
        this.maxAgeMs = options.maxAgeMs || MAX_RESULTS_AGE_MS;
        this.autoRun = options.autoRun !== undefined ? options.autoRun : false;
        this.logger = options.logger || console;

        // State
        this._lastResults = null;
        this._lastReadTime = 0;
        this._lastSignal = null;
        this._apiSignal = null;       // From POST /api/quantum/signal
        this._apiSignalTime = 0;
        this._runCount = 0;
        this._errorCount = 0;
        this._lastError = null;
        this._isRunning = false;
        this._initialized = false;

        // Cache: re-read file at most every 5 seconds
        this._readCacheMs = 5000;
    }

    // ========================================================================
    // Initialization
    // ========================================================================

    /**
     * Initialize the bridge — verify quantum directory and Python.
     */
    async initialize() {
        this.logger.log('[QuantumGPU] Initializing bridge...');

        // Check quantum directory
        if (!fs.existsSync(this.quantumDir)) {
            this.logger.warn(`[QuantumGPU] Quantum directory not found: ${this.quantumDir}`);
            this.logger.warn('[QuantumGPU] Bridge will use API-based signals only');
        }

        // Check Python
        try {
            await this._checkPython();
        } catch (err) {
            this.logger.warn(`[QuantumGPU] Python check failed: ${err.message}`);
            this.logger.warn('[QuantumGPU] On-demand quantum runs disabled');
        }

        // Check results directory
        const resultsDir = path.join(this.quantumDir, 'results');
        if (!fs.existsSync(resultsDir)) {
            try {
                fs.mkdirSync(resultsDir, { recursive: true });
            } catch (e) {
                // Non-critical
            }
        }

        // Try initial read
        this._readResultsFile();

        this._initialized = true;
        this.logger.log(`[QuantumGPU] Bridge initialized (v${BRIDGE_VERSION})`);
        this.logger.log(`[QuantumGPU]   quantumDir: ${this.quantumDir}`);
        this.logger.log(`[QuantumGPU]   resultsFile: ${this.resultsFile}`);
        this.logger.log(`[QuantumGPU]   maxAge: ${this.maxAgeMs / 1000}s`);
        this.logger.log(`[QuantumGPU]   autoRun: ${this.autoRun}`);
    }

    // ========================================================================
    // Primary Interface — Get Quantum Signal
    // ========================================================================

    /**
     * Get the latest quantum trading signal.
     *
     * Priority:
     *   1. API push signal (freshest, from scheduler POST)
     *   2. File-based results (quantum_results.json)
     *   3. On-demand Python run (if autoRun enabled and results stale)
     *   4. Null (no quantum data available)
     *
     * @returns {Object|null} Quantum signal:
     *   { action: 'BUY'|'SELL'|'HOLD', confidence: 0-1, risk_level, components, metadata }
     */
    getSignal() {
        try {
            // Source 1: API push signal (freshest)
            if (this._apiSignal && (Date.now() - this._apiSignalTime) < this.maxAgeMs) {
                this._lastSignal = this._apiSignal;
                return this._apiSignal;
            }

            // Source 2: File-based results
            const fileSignal = this._getFileSignal();
            if (fileSignal) {
                this._lastSignal = fileSignal;
                return fileSignal;
            }

            // Source 3: Auto-run (async, returns cached or null)
            if (this.autoRun && !this._isRunning) {
                this._triggerAsyncRun();
            }

            // Return last known signal or null
            return this._lastSignal;

        } catch (err) {
            this._errorCount++;
            this._lastError = err.message;
            this.logger.error(`[QuantumGPU] getSignal error: ${err.message}`);
            return this._lastSignal; // Return cached signal on error
        }
    }

    /**
     * Get full quantum results (all 5 algorithms).
     * @returns {Object|null}
     */
    getFullResults() {
        this._readResultsFile();
        return this._lastResults;
    }

    /**
     * Get quantum risk assessment (from QMC).
     * @returns {Object|null}
     */
    getQuantumRisk() {
        const results = this.getFullResults();
        if (!results) return null;

        const qmc = results.qmc;
        if (!qmc || qmc.status !== 'SUCCESS') return null;

        return {
            var_95: qmc.var?.['95%'] || 0,
            var_99: qmc.var?.['99%'] || 0,
            cvar_95: qmc.cvar?.['95%'] || 0,
            risk_level: results.unified_signal?.risk_level || 'MEDIUM',
            tail_risk: qmc.tail_risk || {},
            stress_scenarios: qmc.stress_scenarios || {},
            timestamp: qmc.timestamp,
        };
    }

    /**
     * Get market regime from VQC.
     * @returns {Object|null}
     */
    getRegime() {
        const results = this.getFullResults();
        if (!results) return null;

        const vqc = results.vqc;
        if (!vqc || vqc.status !== 'SUCCESS') return null;

        return {
            regime: vqc.regime,         // 'BULLISH', 'BEARISH', 'RANGING'
            confidence: vqc.confidence,
            accuracy: vqc.accuracy,
            timestamp: vqc.timestamp,
        };
    }

    /**
     * Get price direction prediction from QSVM.
     * @returns {Object|null}
     */
    getDirectionPrediction() {
        const results = this.getFullResults();
        if (!results) return null;

        const qsvm = results.qsvm;
        if (!qsvm || qsvm.status !== 'SUCCESS') return null;

        return {
            direction: qsvm.direction,    // 'UP' or 'DOWN'
            confidence: qsvm.confidence,
            accuracy: qsvm.accuracy,
            timestamp: qsvm.timestamp,
        };
    }

    /**
     * Get portfolio optimization from QAOA.
     * @returns {Object|null}
     */
    getPortfolioOptimization() {
        const results = this.getFullResults();
        if (!results) return null;

        const qaoa = results.qaoa;
        if (!qaoa || qaoa.status !== 'SUCCESS') return null;

        return {
            optimal_weights: qaoa.optimal_weights,
            expected_return: qaoa.expected_return,
            risk: qaoa.risk,
            sharpe_ratio: qaoa.sharpe_ratio,
            timestamp: qaoa.timestamp,
        };
    }

    // ========================================================================
    // API Signal Receiver
    // ========================================================================

    /**
     * Receive quantum signal from POST /api/quantum/signal.
     * Called from server.js when the Python scheduler pushes results.
     *
     * @param {Object} signalData - Quantum signal from scheduler
     */
    receiveSignal(signalData) {
        if (!signalData || !signalData.action) {
            this.logger.warn('[QuantumGPU] Received invalid signal data');
            return;
        }

        this._apiSignal = {
            action: signalData.action,
            confidence: signalData.confidence || 0,
            risk_level: signalData.risk_level || 'MEDIUM',
            components: signalData.components || {},
            metadata: signalData.metadata || {},
            source: 'api_push',
            timestamp: signalData.timestamp || new Date().toISOString(),
        };
        this._apiSignalTime = Date.now();

        this.logger.log(`[QuantumGPU] API signal received: ${this._apiSignal.action} `
            + `(conf=${this._apiSignal.confidence.toFixed(3)}, `
            + `risk=${this._apiSignal.risk_level})`);
    }

    // ========================================================================
    // File-based Results Reading
    // ========================================================================

    _getFileSignal() {
        this._readResultsFile();

        if (!this._lastResults) return null;

        const signal = this._lastResults.unified_signal;
        if (!signal) return null;

        // Check freshness
        const timestamp = this._lastResults.metadata?.timestamp;
        if (timestamp) {
            const age = Date.now() - new Date(timestamp).getTime();
            if (age > this.maxAgeMs) {
                this.logger.debug(`[QuantumGPU] Results stale (${(age / 1000).toFixed(0)}s old)`);
                return null;
            }
        }

        return {
            action: signal.action || 'HOLD',
            confidence: signal.confidence || 0,
            risk_level: signal.risk_level || 'MEDIUM',
            raw_score: signal.raw_score || 0,
            components: signal.components || {},
            n_algorithms: signal.n_algorithms || 0,
            source: 'file',
            timestamp: this._lastResults.metadata?.timestamp,
        };
    }

    _readResultsFile() {
        // Cache: don't re-read too frequently
        if (Date.now() - this._lastReadTime < this._readCacheMs) return;

        try {
            if (!fs.existsSync(this.resultsFile)) return;

            const raw = fs.readFileSync(this.resultsFile, 'utf8');
            this._lastResults = JSON.parse(raw);
            this._lastReadTime = Date.now();
        } catch (err) {
            this.logger.debug(`[QuantumGPU] Results file read failed: ${err.message}`);
        }
    }

    // ========================================================================
    // On-demand Python Execution
    // ========================================================================

    _triggerAsyncRun() {
        if (this._isRunning) return;
        this._isRunning = true;
        this._runCount++;

        const runScript = path.join(this.quantumDir, 'run_quantum.py');
        if (!fs.existsSync(runScript)) {
            this._isRunning = false;
            return;
        }

        this.logger.log(`[QuantumGPU] Triggering on-demand quantum run #${this._runCount}`);

        const proc = spawn(this.pythonCmd, [runScript, 'run'], {
            cwd: this.quantumDir,
            stdio: ['ignore', 'pipe', 'pipe'],
            timeout: 120000, // 2 min timeout
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', (data) => { stdout += data.toString(); });
        proc.stderr.on('data', (data) => { stderr += data.toString(); });

        proc.on('close', (code) => {
            this._isRunning = false;
            if (code === 0) {
                this.logger.log(`[QuantumGPU] On-demand run completed successfully`);
                this._readResultsFile();
            } else {
                this._errorCount++;
                this._lastError = `Python exit code ${code}`;
                this.logger.error(`[QuantumGPU] On-demand run failed (code=${code})`);
                if (stderr) {
                    this.logger.error(`[QuantumGPU] stderr: ${stderr.slice(-500)}`);
                }
            }
        });

        proc.on('error', (err) => {
            this._isRunning = false;
            this._errorCount++;
            this._lastError = err.message;
            this.logger.error(`[QuantumGPU] Spawn error: ${err.message}`);
        });
    }

    _checkPython() {
        return new Promise((resolve, reject) => {
            execFile(this.pythonCmd, ['--version'], (err, stdout) => {
                if (err) {
                    reject(new Error(`Python not found: ${err.message}`));
                } else {
                    this.logger.log(`[QuantumGPU] Python: ${stdout.trim()}`);
                    resolve(stdout.trim());
                }
            });
        });
    }

    // ========================================================================
    // Status & Health
    // ========================================================================

    /**
     * Get bridge status for health checks and monitoring.
     * @returns {Object}
     */
    getStatus() {
        const resultsAge = this._lastReadTime > 0
            ? Math.round((Date.now() - this._lastReadTime) / 1000)
            : -1;

        const apiAge = this._apiSignalTime > 0
            ? Math.round((Date.now() - this._apiSignalTime) / 1000)
            : -1;

        const meta = this._lastResults?.metadata || {};

        return {
            bridge: 'QuantumGPUBridge',
            version: BRIDGE_VERSION,
            initialized: this._initialized,
            quantumDir: this.quantumDir,
            resultsExist: fs.existsSync(this.resultsFile),
            resultsAge_sec: resultsAge,
            apiSignalAge_sec: apiAge,
            lastSignal: this._lastSignal ? this._lastSignal.action : 'NONE',
            lastSignalConfidence: this._lastSignal ? this._lastSignal.confidence : 0,
            lastSignalSource: this._lastSignal ? this._lastSignal.source : 'none',
            runCount: this._runCount,
            errorCount: this._errorCount,
            lastError: this._lastError,
            isRunning: this._isRunning,
            gpuDevice: meta.gpu_device || 'unknown',
            gpuUsed: meta.gpu_used || false,
            algorithmsRun: meta.algorithms_run || 0,
        };
    }

    /**
     * Check if quantum data is healthy and fresh.
     * @returns {boolean}
     */
    isHealthy() {
        if (!this._initialized) return false;

        // Any recent signal source is healthy
        if (this._apiSignal && (Date.now() - this._apiSignalTime) < this.maxAgeMs * 2) {
            return true;
        }

        if (this._lastResults?.metadata?.timestamp) {
            const age = Date.now() - new Date(this._lastResults.metadata.timestamp).getTime();
            return age < this.maxAgeMs * 2;
        }

        return false;
    }
}

// ============================================================================
// Module Exports
// ============================================================================
module.exports = {
    QuantumGPUBridge,
    QUANTUM_DIR,
    RESULTS_FILE,
    BRIDGE_VERSION,
};
