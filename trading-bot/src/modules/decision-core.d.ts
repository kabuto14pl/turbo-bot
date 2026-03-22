/**
 * @module DecisionCore — ALPHA ENGINE (PATCH #148: 3-Layer Architecture)
 * Alpha Engine → Risk Gate (risk-manager.js) → Execution (execution-engine.js)
 */

export type DecisionSignal = {
    action?: string;
    confidence?: number;
    symbol?: string;
};

export type RuntimeConsensus = {
    action: string;
    confidence: number;
};

export type RuntimeConsensusResult = {
    consensus: RuntimeConsensus | null;
    reason: string;
};

export function buildRuntimeConsensusCandidate(input: {
    signals: Map<string, DecisionSignal>;
    ensemble: { vote: Function };
    riskManager?: unknown;
    neuralAI?: unknown;
    positionCount?: number;
}): RuntimeConsensusResult & {
    ensembleMtfBias: unknown;
    consensusSignalNames: string[];
};

export function finalizeRuntimeConsensus(input: {
    consensus: RuntimeConsensus | null;
    neuralAI?: unknown;
    neuronManager?: unknown;
    portfolio?: Record<string, unknown>;
    candlePatterns?: unknown;
    timeframeData?: unknown;
    riskManager?: unknown;
}): RuntimeConsensusResult & {
    validation: unknown;
    riskCheck: unknown;
};

export function evaluateRuntimeConsensusPath(input: {
    signals: Map<string, DecisionSignal>;
    ensemble: { vote: Function };
    riskManager?: unknown;
    neuralAI?: unknown;
    positionCount?: number;
    neuronManager?: unknown;
    portfolio?: Record<string, unknown>;
    candlePatterns?: unknown;
    timeframeData?: unknown;
}): RuntimeConsensusResult & {
    ensembleMtfBias: unknown;
    consensusSignalNames: string[];
    validation: unknown;
    riskCheck: unknown;
};