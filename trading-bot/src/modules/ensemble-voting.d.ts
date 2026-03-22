export class EnsembleVoting {
    constructor();
    vote(signals: Map<string, { action?: string; confidence?: number; symbol?: string }>, riskManager?: unknown, mtfBias?: unknown): {
        action: string;
        confidence: number;
    } | null;
}