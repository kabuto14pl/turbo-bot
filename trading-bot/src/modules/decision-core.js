'use strict';

/**
 * @module DecisionCore — ALPHA ENGINE
 * 
 * 3-LAYER ARCHITECTURE (PATCH #148):
 *   Alpha Engine (this module) → Risk Gate (risk-manager.js) → Execution (execution-engine.js)
 * 
 * Alpha Engine responsibilities:
 *   - Ensemble voting (weighted consensus from all signal sources)
 *   - MTF bias computation (NeuralAI regime → directional bias)
 *   - MTF pattern confluence (H1/H4 candle pattern boosts)
 *   - Defense mode sizing (confidence cap after consecutive losses)
 *   - NeuronAI Prime validation (LLM reasoning gate)
 * 
 * OUTPUT: finalized consensus { action, confidence, price } or null (blocked)
 */

const DECISION_CORE_SETTINGS = {
    trendScore: 25,
    defenseConfidenceMultiplier: 0.65,
    defenseConfidenceCap: 0.55,
    h1PatternThreshold: 0.35,
    h1PatternMultiplier: 1.5,
    h4PatternThreshold: 0.45,
    h4PatternMultiplier: 0.75,
    patternPenaltyFloor: 0.15,
};

function buildEnsembleMtfBias(neuralAI) {
    if (!neuralAI || !neuralAI.isReady) return null;

    const regime = neuralAI.currentRegime;
    let direction = 'NEUTRAL';
    let score = 0;

    if (regime === 'TRENDING_UP') {
        direction = 'BULLISH';
        score = DECISION_CORE_SETTINGS.trendScore;
    } else if (regime === 'TRENDING_DOWN') {
        direction = 'BEARISH';
        score = -DECISION_CORE_SETTINGS.trendScore;
    }

    return {
        direction,
        score,
        confidenceMultiplier: Math.abs(score) >= 20 ? 1.15 : 1.0,
        confluence: null,
        regime,
    };
}

function getConsensusSignalNames(signals, action) {
    if (!signals || !action || action === 'HOLD') return [];

    const names = [];
    for (const [name, signal] of signals) {
        if (signal && signal.action === action) names.push(name);
    }
    return names;
}

function applyDefenseModeSizing(consensus, neuralAI) {
    if (!consensus || !neuralAI || !neuralAI.isReady) return consensus;
    if (!neuralAI.defenseMode) return consensus;
    if (consensus.action !== 'BUY' && consensus.action !== 'SELL') return consensus;

    consensus.confidence = Math.min(
        consensus.confidence * DECISION_CORE_SETTINGS.defenseConfidenceMultiplier,
        DECISION_CORE_SETTINGS.defenseConfidenceCap,
    );

    return consensus;
}

function applyMtfPatternConfluence(consensus, candlePatterns, timeframeData) {
    if (!consensus || consensus.action === 'HOLD') return consensus;
    if (!candlePatterns || !timeframeData) return consensus;

    const h1Data = timeframeData.h1 || timeframeData['1h'];
    if (h1Data && h1Data.length >= 12) {
        const h1Patterns = candlePatterns.confirmsEntry(
            h1Data,
            consensus.action,
            DECISION_CORE_SETTINGS.h1PatternThreshold,
        );

        if (h1Patterns.confirmed) {
            consensus.confidence = Math.min(
                0.95,
                consensus.confidence + h1Patterns.boost * DECISION_CORE_SETTINGS.h1PatternMultiplier,
            );
            consensus._mtfPatternBoost = h1Patterns.boost * DECISION_CORE_SETTINGS.h1PatternMultiplier;
            consensus._mtfPatterns = h1Patterns.patterns;
        } else if (h1Patterns.boost < -0.05) {
            consensus.confidence = Math.max(
                DECISION_CORE_SETTINGS.patternPenaltyFloor,
                consensus.confidence + h1Patterns.boost,
            );
            consensus._mtfPatternPenalty = h1Patterns.boost;
            consensus._mtfPatterns = h1Patterns.patterns;
        }
    }

    const h4Data = timeframeData.h4 || timeframeData['4h'];
    if (h4Data && h4Data.length >= 12) {
        const h4Patterns = candlePatterns.confirmsEntry(
            h4Data,
            consensus.action,
            DECISION_CORE_SETTINGS.h4PatternThreshold,
        );

        if (h4Patterns.confirmed && h4Patterns.boost > 0.05) {
            consensus.confidence = Math.min(
                0.95,
                consensus.confidence + h4Patterns.boost * DECISION_CORE_SETTINGS.h4PatternMultiplier,
            );
            consensus._mtfPattern4h = h4Patterns.patterns;
        }
    }

    return consensus;
}

function buildPrimeValidationState(portfolio, neuralAI) {
    const currentPortfolio = { ...(portfolio || {}) };
    if (currentPortfolio.drawdownPct === undefined) {
        currentPortfolio.drawdownPct = currentPortfolio.drawdown || 0;
    }

    return {
        portfolio: currentPortfolio,
        mtfBias: neuralAI ? {
            direction: neuralAI.currentRegime === 'TRENDING_UP'
                ? 'BULLISH'
                : neuralAI.currentRegime === 'TRENDING_DOWN'
                    ? 'BEARISH'
                    : 'NEUTRAL',
            score: (neuralAI.currentRegime === 'TRENDING_UP' || neuralAI.currentRegime === 'TRENDING_DOWN')
                ? DECISION_CORE_SETTINGS.trendScore
                : 0,
        } : {},
    };
}

// PATCH #146→#148: Structural gate fully removed (was deprecated pass-through since P146)

function buildRuntimeConsensusCandidate({ signals, ensemble, riskManager, neuralAI, positionCount }) {
    if (!signals || signals.size === 0 || !ensemble) {
        return {
            consensus: null,
            ensembleMtfBias: buildEnsembleMtfBias(neuralAI),
            consensusSignalNames: [],
        };
    }

    const ensembleMtfBias = buildEnsembleMtfBias(neuralAI);
    let consensus = ensemble.vote(signals, riskManager, ensembleMtfBias);

    if (consensus && consensus.action !== 'HOLD') {
        consensus = applyDefenseModeSizing(consensus, neuralAI);
    }

    return {
        consensus,
        ensembleMtfBias,
        consensusSignalNames: consensus ? getConsensusSignalNames(signals, consensus.action) : [],
    };
}

function finalizeRuntimeConsensus({
    consensus,
    neuralAI,
    neuronManager,
    portfolio,
    candlePatterns,
    timeframeData,
    riskManager,
}) {
    if (!consensus || consensus.action === 'HOLD') {
        return {
            consensus: null,
            validation: null,
            riskCheck: null,
            reason: 'no_consensus',
        };
    }

    // ── ALPHA: MTF pattern confluence ──
    applyMtfPatternConfluence(consensus, candlePatterns, timeframeData);

    // ── RISK GATE: NeuronAI Prime validation ──
    let validation = null;
    if (neuronManager && neuronManager.isReady) {
        const validationState = buildPrimeValidationState(portfolio, neuralAI);
        validation = neuronManager.validateEnsembleConsensus(consensus, validationState);
        if (!validation.approved) {
            return {
                consensus: null,
                validation,
                riskCheck: null,
                reason: validation.reason,
            };
        }
    }

    // ── RISK GATE: Runtime risk check (confidence floor + drawdown sizing) ──
    const currentPortfolio = portfolio || {};
    const drawdown = currentPortfolio.drawdown || currentPortfolio.drawdownPct || 0;
    const riskCheck = riskManager
        ? riskManager.applyRuntimeRiskCheck({ action: consensus.action, confidence: consensus.confidence, drawdown })
        : { approved: true, confidence: consensus.confidence, reason: 'no_risk_manager' };

    if (!riskCheck.approved) {
        return {
            consensus: null,
            validation,
            riskCheck,
            reason: riskCheck.reason,
        };
    }

    consensus.confidence = riskCheck.confidence;

    return {
        consensus,
        validation,
        riskCheck,
        reason: 'approved',
    };
}

function evaluateRuntimeConsensusPath({
    signals,
    ensemble,
    riskManager,
    neuralAI,
    positionCount,
    neuronManager,
    portfolio,
    candlePatterns,
    timeframeData,
}) {
    const candidate = buildRuntimeConsensusCandidate({
        signals,
        ensemble,
        riskManager,
        neuralAI,
        positionCount,
    });

    const finalized = finalizeRuntimeConsensus({
        consensus: candidate.consensus,
        neuralAI,
        neuronManager,
        portfolio,
        candlePatterns,
        timeframeData,
        riskManager,
    });

    return {
        ...candidate,
        ...finalized,
    };
}

module.exports = {
    DECISION_CORE_SETTINGS,
    applyDefenseModeSizing,
    applyMtfPatternConfluence,
    buildEnsembleMtfBias,
    buildPrimeValidationState,
    buildRuntimeConsensusCandidate,
    evaluateRuntimeConsensusPath,
    finalizeRuntimeConsensus,
    getConsensusSignalNames,
};