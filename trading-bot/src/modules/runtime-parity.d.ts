export type MlSignal = {
    action?: string;
    confidence?: number;
    symbol?: string;
    source?: string;
};

export type RuntimeRiskCheckResult = {
    approved: boolean;
    confidence: number;
    reason: string;
};

export function resolveMlSignal(allSignals: Map<string, MlSignal> | null | undefined): MlSignal | null;

export function applyRuntimeRiskCheck(input: {
    action: string;
    confidence: number;
    drawdown: number;
}): RuntimeRiskCheckResult;

export const RUNTIME_PARITY_SETTINGS: {
    confidenceFloor: number;
    buyDrawdownBlock: number;
    buySizingReductionStart: number;
    buySizingReductionEnd: number;
    minimumBuySizingFactor: number;
};