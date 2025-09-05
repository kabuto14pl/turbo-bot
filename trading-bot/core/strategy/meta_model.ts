import { Logger } from '../../infrastructure/logging/logger';

interface MetaModelConfig {
    learningRate: number;
    minConfidence: number;
    maxConfidence: number;
    useAdaptiveWeights: boolean;
    historyWindow: number;
}

export class MetaModel {
    private readonly config: MetaModelConfig;
    private readonly logger: Logger;
    private weights: number[] = [];
    private history: Array<{
        features: number[];
        actual: number;
        predicted: number;
        timestamp: number;
    }> = [];

    constructor(
        config: Partial<MetaModelConfig> = {},
        logger: Logger
    ) {
        this.logger = logger;
        this.config = {
            learningRate: 0.01,
            minConfidence: 0.2,
            maxConfidence: 0.8,
            useAdaptiveWeights: true,
            historyWindow: 1000,
            ...config
        };
    }

    async predict(features: number[][]): Promise<number[]> {
        if (features.length === 0) return [];

        // Inicjalizuj wagi jeśli potrzeba
        if (this.weights.length === 0) {
            this.initializeWeights(features[0].length);
        }

        // Przewiduj dla każdego wektora cech
        const predictions = features.map(feature => {
            const prediction = this.predictSingle(feature);
            return this.normalizeConfidence(prediction);
        });

        // Zaloguj predykcje
        this.logger.info('[MetaModel] Predictions', {
            count: predictions.length,
            min: Math.min(...predictions),
            max: Math.max(...predictions),
            avg: predictions.reduce((a, b) => a + b, 0) / predictions.length
        });

        return predictions;
    }

    async update(
        features: number[],
        actual: number,
        timestamp: number
    ): Promise<void> {
        if (this.weights.length === 0) {
            this.initializeWeights(features.length);
        }

        // Przewiduj i oblicz błąd
        const predicted = this.predictSingle(features);
        const error = actual - predicted;

        // Aktualizuj wagi
        if (this.config.useAdaptiveWeights) {
            this.updateWeights(features, error);
        }

        // Dodaj do historii
        this.history.push({
            features,
            actual,
            predicted,
            timestamp
        });

        // Zachowaj tylko ostatnie N wyników
        while (this.history.length > this.config.historyWindow) {
            this.history.shift();
        }

        // Zaloguj aktualizację
        this.logger.info('[MetaModel] Updated', {
            error,
            weights: this.weights,
            historySize: this.history.length
        });
    }

    private initializeWeights(size: number): void {
        // Inicjalizuj wagi z małymi losowymi wartościami
        this.weights = Array(size).fill(0).map(() => Math.random() * 0.1);
    }

    private predictSingle(features: number[]): number {
        // Oblicz ważoną sumę cech
        return features.reduce(
            (sum, feature, i) => sum + feature * this.weights[i],
            0
        );
    }

    private updateWeights(features: number[], error: number): void {
        // Gradient descent
        for (let i = 0; i < this.weights.length; i++) {
            this.weights[i] += this.config.learningRate * error * features[i];
        }
    }

    private normalizeConfidence(value: number): number {
        // Normalizuj do przedziału [minConfidence, maxConfidence]
        const normalized = Math.tanh(value);
        const range = this.config.maxConfidence - this.config.minConfidence;
        return this.config.minConfidence + (normalized + 1) * range / 2;
    }
} 