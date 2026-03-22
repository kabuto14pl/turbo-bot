'use strict';

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../../..');
const DEFAULT_POINTER_PATH = path.join(REPO_ROOT, 'artifacts', 'promoted', 'current.json');
const DEFAULT_BASE_AI_MODEL_DIR = path.join(REPO_ROOT, 'data', 'ai_models');
const DEFAULT_BASE_NEURON_STATE_PATH = path.join(REPO_ROOT, 'trading-bot', 'data', 'neuron_ai_state.json');
const DEFAULT_BASE_NEURON_LOG_PATH = path.join(REPO_ROOT, 'trading-bot', 'data', 'neuron_ai_decisions.log');

function readJson(filePath) {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function resolveRepoPath(rawPath) {
    if (!rawPath) return null;
    return path.isAbsolute(rawPath) ? rawPath : path.resolve(REPO_ROOT, rawPath);
}

function applyRuntimeEnv(bundleInfo) {
    if (!bundleInfo) return;
    process.env.TURBO_BUNDLE_ACTIVE_ID = bundleInfo.bundleId;
    process.env.TURBO_BUNDLE_AI_MODEL_DIR = bundleInfo.runtimePaths.aiModelDir;
    process.env.TURBO_BUNDLE_BASE_AI_MODEL_DIR = bundleInfo.basePaths.aiModelDir;
    process.env.TURBO_BUNDLE_NEURON_STATE_PATH = bundleInfo.runtimePaths.neuronStateFile;
    process.env.TURBO_BUNDLE_BASE_NEURON_STATE_PATH = bundleInfo.basePaths.neuronStateFile;
    process.env.TURBO_BUNDLE_NEURON_LOG_PATH = bundleInfo.runtimePaths.neuronLogFile;
    process.env.TURBO_BUNDLE_STATE_FILE = bundleInfo.runtimePaths.stateFile;
}

function loadActivePromotionBundle(options) {
    const strict = !!(options && options.strict);
    const explicitBundlePath = resolveRepoPath(process.env.PROMOTED_BUNDLE_PATH || '');
    const pointerPath = resolveRepoPath(process.env.PROMOTED_BUNDLE_POINTER || DEFAULT_POINTER_PATH);

    let bundlePath = null;
    if (explicitBundlePath && fs.existsSync(explicitBundlePath)) {
        bundlePath = explicitBundlePath;
    } else if (pointerPath && fs.existsSync(pointerPath)) {
        const pointer = readJson(pointerPath);
        bundlePath = resolveRepoPath(pointer.bundle_path || pointer.bundlePath || '');
    }

    if (!bundlePath || !fs.existsSync(bundlePath)) {
        if (strict) {
            console.error('[BUNDLE] WARNING: Promoted bundle is required but no active bundle was found.');
            console.error('[BUNDLE] Bot will start in default mode. Run the promotion gate to create artifacts/promoted/current.json.');
        }
        return null;
    }

    let bundle;
    try {
        bundle = readJson(bundlePath);
    } catch (parseErr) {
        console.error('[BUNDLE] Failed to parse bundle JSON at ' + bundlePath + ':', parseErr.message);
        if (strict) return null;
        return null;
    }
    if (!bundle || bundle.status !== 'approved') {
        console.error('[BUNDLE] Active promoted bundle is invalid or not approved: ' + bundlePath);
        if (strict) return null;
        return null;
    }

    const live = bundle.live || {};
    const sandbox = live.sandbox || {};
    const baseRuntime = live.base_runtime || {};

    const bundleInfo = {
        bundleId: bundle.bundle_id,
        bundlePath,
        pointerPath: pointerPath && fs.existsSync(pointerPath) ? pointerPath : null,
        configOverrides: live.config_overrides || {},
        runtimePaths: {
            stateFile: resolveRepoPath(sandbox.state_file),
            aiModelDir: resolveRepoPath(sandbox.ai_model_dir),
            neuronStateFile: resolveRepoPath(sandbox.neuron_state_file),
            neuronLogFile: resolveRepoPath(sandbox.neuron_log_file),
            sandboxRoot: resolveRepoPath(sandbox.root),
        },
        basePaths: {
            aiModelDir: resolveRepoPath(baseRuntime.ai_model_dir) || DEFAULT_BASE_AI_MODEL_DIR,
            neuronStateFile: resolveRepoPath(baseRuntime.neuron_state_file) || DEFAULT_BASE_NEURON_STATE_PATH,
            neuronLogFile: resolveRepoPath(baseRuntime.neuron_log_file) || DEFAULT_BASE_NEURON_LOG_PATH,
        },
        raw: bundle,
    };

    applyRuntimeEnv(bundleInfo);
    return bundleInfo;
}

module.exports = { loadActivePromotionBundle };