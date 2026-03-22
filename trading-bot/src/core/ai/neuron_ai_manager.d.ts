export class NeuronAIManager {
    constructor();
    isReady: boolean;
    validateEnsembleConsensus(consensus: { action: string; confidence: number }, state: unknown): {
        approved: boolean;
        reason: string;
    };
    recordEnsembleVeto(consensus: { action: string; confidence: number }, reason: string): void;
}