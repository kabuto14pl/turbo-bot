'use strict';

/**
 * @module RuntimeParity — DEPRECATED (PATCH #148)
 * 
 * Logic merged into RiskManager.applyRuntimeRiskCheck().
 * This file kept as backward-compat wrapper for resolveMlSignal().
 * 
 * applyRuntimeRiskCheck() is now a STUB — real logic lives in risk-manager.js.
 * Any code still calling the standalone function gets a pass-through;
 * the RiskManager method is the canonical implementation.
 */

const RUNTIME_PARITY_SETTINGS = {
    confidenceFloor: 0.30,
    directionalConfidenceFloor: { BUY: 0.30, SELL: 0.30 },
    directionalSizingReductionStart: { BUY: 0.10, SELL: 0.10 },
    directionalSizingReductionEnd: { BUY: 0.15, SELL: 0.15 },
    minimumDirectionalSizingFactor: { BUY: 0.30, SELL: 0.30 },
};

function resolveMlSignal(allSignals) {
    if (!allSignals || typeof allSignals.entries !== 'function') {
        return null;
    }

    let selectedSignal = null;
    for (const [name, signal] of allSignals.entries()) {
        if (!signal || (name !== 'EnterpriseML' && name !== 'PythonML')) {
            continue;
        }
        if (!selectedSignal || (signal.confidence || 0) > (selectedSignal.confidence || 0)) {
            selectedSignal = { ...signal, source: name };
        }
    }

    return selectedSignal;
}

/**
 * @deprecated PATCH #148 — Use RiskManager.applyRuntimeRiskCheck() instead.
 * Kept as stub for any legacy callers (returns approved pass-through).
 */
function applyRuntimeRiskCheck({ action, confidence, drawdown }) {
    console.warn('[DEPRECATED] applyRuntimeRiskCheck() from runtime-parity.js — use RiskManager.applyRuntimeRiskCheck()');
    return { approved: true, confidence: confidence || 0, reason: 'deprecated_passthrough' };
}

module.exports = {
    RUNTIME_PARITY_SETTINGS,
    applyRuntimeRiskCheck,
    resolveMlSignal,
};