import { BotState, StrategySignal } from '../types/strategy';

export interface AbstractStrategy {
    // Podstawowe właściwości
    readonly name: string;
    readonly description: string;
    readonly defaultWeight: number;
    weight: number;

    // Metody zarządzania wagą
    setWeight(weight: number): void;
    getWeight(): number;

    // Główna metoda generowania sygnałów
    run(state: BotState): Promise<StrategySignal[]>;

    // Metody konfiguracyjne
    validateConfig(): boolean;
    getRequiredIndicators(): string[];
    getRequiredTimeframes(): string[];
}
