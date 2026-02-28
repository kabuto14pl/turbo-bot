#!/usr/bin/env node
/**
 * PRE-DEPLOY VALIDATION SCRIPT
 * Uruchom PRZED każdym deploy'em na VPS:
 *   node scripts/pre-deploy-check.js
 *
 * Sprawdza:
 * 1. Składnię JS (node --check) wszystkich core plików
 * 2. Czy krytyczne eksporty istnieją
 * 3. Czy FORCE_ENTRY jest w valid command types (BUG #1)
 * 4. Czy state paths istnieją
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const PASS = '\u2705';
const FAIL = '\u274C';
const WARN = '\u26A0\uFE0F';
let errors = 0;
let warnings = 0;

function check(label, condition, severity = 'error') {
    if (condition) {
        console.log(`  ${PASS} ${label}`);
    } else if (severity === 'warn') {
        console.log(`  ${WARN} ${label}`);
        warnings++;
    } else {
        console.log(`  ${FAIL} ${label}`);
        errors++;
    }
}

console.log('\n PRE-DEPLOY VALIDATION\n');

// ─── 1. Syntax Check ────────────────────────────────────────────────────
console.log('Syntax Check:');

// Real paths in this repo structure
const coreFiles = [
    'trading-bot/src/modules/bot.js',
    'trading-bot/src/core/ai/adaptive_neural_engine.js',
    'trading-bot/src/core/ai/neuron_ai_manager.js',
    'trading-bot/src/core/ai/hybrid_quantum_pipeline.js',
    'trading-bot/src/core/ai/quantum_optimizer.js',
    'trading-bot/src/core/ai/quantum_gpu_sim.js',
    'trading-bot/src/core/ai/quantum_position_manager.js',
    'trading-bot/src/core/ai/megatron_system.js',
    'trading-bot/src/core/ml/enterprise_ml_system.js',
    'trading-bot/src/core/ml/simple_rl_adapter.js',
    'trading-bot/src/modules/ml-integration.js',
    'trading-bot/src/modules/execution-engine.js',
    'trading-bot/src/modules/risk-manager.js',
    'trading-bot/src/modules/ensemble-voting.js',
    'trading-bot/src/modules/strategy-runner.js',
];

for (const file of coreFiles) {
    const absPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(absPath)) {
        check(`${file} -- file exists`, false);
        continue;
    }
    try {
        execSync(`node --check "${absPath}"`, { stdio: 'pipe' });
        check(`${file} -- syntax OK`, true);
    } catch (e) {
        check(`${file} -- syntax ERROR: ${e.stderr?.toString().trim()}`, false);
    }
}

// ─── 2. Module Exports Check ────────────────────────────────────────────
console.log('\nModule Exports:');
const requiredExports = {
    'trading-bot/src/modules/risk-manager.js': ['RiskManager'],
    'trading-bot/src/modules/ensemble-voting.js': ['EnsembleVoting'],
    'trading-bot/src/modules/execution-engine.js': ['ExecutionEngine'],
    'trading-bot/src/modules/strategy-runner.js': ['StrategyRunner'],
};

for (const [file, exps] of Object.entries(requiredExports)) {
    const absPath = path.join(__dirname, '..', file);
    if (!fs.existsSync(absPath)) continue;
    try {
        const mod = require(absPath);
        for (const exp of exps) {
            check(`${file} exports ${exp}`, typeof mod[exp] === 'function');
        }
    } catch (e) {
        check(`${file} -- require() failed: ${e.message}`, false);
    }
}

// ─── 3. Critical Bug Checks ────────────────────────────────────────────
console.log('\nCritical Bug Guards:');

// BUG #1: Check if FORCE_ENTRY is handled in adaptive_neural_engine.js (positionCommand validTypes)
const skynetPath = path.join(__dirname, '..', 'trading-bot/src/core/ai/adaptive_neural_engine.js');
if (fs.existsSync(skynetPath)) {
    const skynetCode = fs.readFileSync(skynetPath, 'utf8');
    check(
        'BUG #1: FORCE_ENTRY in valid command types',
        skynetCode.includes("'FORCE_ENTRY'") || skynetCode.includes('"FORCE_ENTRY"'),
        'warn'
    );
}

// BUG #14: Check if SCALE_IN has risk validation
const botPath = path.join(__dirname, '..', 'trading-bot/src/modules/bot.js');
if (fs.existsSync(botPath)) {
    const botCode = fs.readFileSync(botPath, 'utf8');
    // Find the actual SCALE_IN handler (rawAction === 'SCALE_IN') not comments
    const handlerIdx = botCode.indexOf("rawAction === 'SCALE_IN'");
    if (handlerIdx > -1) {
        const scaleInSection = botCode.substring(handlerIdx, handlerIdx + 1200);
        check(
            'BUG #14: SCALE_IN has risk manager check',
            scaleInSection.includes('maxExposure') || scaleInSection.includes('checkMaxDrawdown'),
            'warn'
        );
    }
}

// ─── 4. Data Directory ──────────────────────────────────────────────────
console.log('\nData Directory:');
const dataDir = path.join(__dirname, '..', 'data');
check('data/ directory exists', fs.existsSync(dataDir));
if (fs.existsSync(dataDir)) {
    const aiModelsDir = path.join(dataDir, 'ai_models');
    check('data/ai_models/ exists', fs.existsSync(aiModelsDir), 'warn');
}

// ─── 5. Environment ────────────────────────────────────────────────────
console.log('\nEnvironment:');
const envPath = path.join(__dirname, '..', '.env');
check('.env file exists', fs.existsSync(envPath), 'warn');

// ─── Summary ────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(50));
if (errors > 0) {
    console.log(`\n${FAIL} DEPLOY BLOCKED: ${errors} error(s), ${warnings} warning(s)`);
    console.log('Fix all errors before deploying to VPS!\n');
    process.exit(1);
} else if (warnings > 0) {
    console.log(`\n${WARN} DEPLOY OK (with caveats): 0 errors, ${warnings} warning(s)`);
    console.log('Warnings should be addressed in next PATCH.\n');
    process.exit(0);
} else {
    console.log(`\n${PASS} ALL CHECKS PASSED -- safe to deploy\n`);
    process.exit(0);
}
