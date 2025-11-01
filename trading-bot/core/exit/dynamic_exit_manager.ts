/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { Position } from '../types/position';

export interface ExitLevel {
    percentage: number; // % pozycji do zamknięcia
    target: number;     // Cena docelowa (1R, 2R, etc.)
    stopLoss?: number;  // Nowy SL po osiągnięciu tego poziomu
}

export interface DynamicExitOptions {
    // Skalowanie pozycji
    scalingLevels?: ExitLevel[];
    enableScaling?: boolean;
    
    // Wyjścia czasowe
    maxHoldTime?: number; // Maksymalny czas trzymania pozycji (w świecach)
    enableTimeExit?: boolean;
    
    // Wyjścia strukturalne
    enableStructuralExit?: boolean;
    structuralLookback?: number; // Ile świec wstecz sprawdzać dla struktury
    
    // Trailing stop
    enableTrailingStop?: boolean;
    trailingStopMultiplier?: number;
    trailingStopActivation?: number; // Po jakim % zysku aktywować
    
    // Break-even
    enableBreakEven?: boolean;
    breakEvenTrigger?: number; // Po jakim % zysku przesunąć SL na BE
}

export interface ExitDecision {
    shouldExit: boolean;
    exitReason: string;
    exitPercentage: number; // 0-1, ile pozycji zamknąć
    newStopLoss?: number;
    exitType: 'SCALING' | 'TIME' | 'STRUCTURAL' | 'TRAILING' | 'BREAKEVEN' | 'NONE';
}

export class DynamicExitManager {
    private options: DynamicExitOptions;
    private position: Position;
    private entryTime: number;
    private entryPrice: number;
    private currentBar: number = 0;
    private priceHistory: number[] = [];
    private highestPrice: number = 0;
    private lowestPrice: number = 0;
    private scalingLevelsHit: Set<number> = new Set();
    private breakEvenActivated: boolean = false;
    private trailingStopActivated: boolean = false;
    private trailingStopPrice: number = 0;

    constructor(position: Position, options: DynamicExitOptions = {}) {
        this.position = position;
        this.entryTime = position.timestamp || Date.now();
        this.entryPrice = position.entryPrice || 0;
        this.highestPrice = position.entryPrice || 0;
        this.lowestPrice = position.entryPrice || 0;
        
        this.options = {
            scalingLevels: options.scalingLevels || [
                { percentage: 0.3, target: 1.0 }, // 30% pozycji przy 1R
                { percentage: 0.3, target: 2.0 }, // 30% pozycji przy 2R
                { percentage: 0.4, target: 3.0 }  // 40% pozycji przy 3R
            ],
            enableScaling: options.enableScaling !== false,
            maxHoldTime: options.maxHoldTime || 50,
            enableTimeExit: options.enableTimeExit !== false,
            enableStructuralExit: options.enableStructuralExit !== false,
            structuralLookback: options.structuralLookback || 10,
            enableTrailingStop: options.enableTrailingStop !== false,
            trailingStopMultiplier: options.trailingStopMultiplier || 1.5,
            trailingStopActivation: options.trailingStopActivation || 0.5,
            enableBreakEven: options.enableBreakEven !== false,
            breakEvenTrigger: options.breakEvenTrigger || 0.3,
        };
    }

    update(currentPrice: number, atr: number): ExitDecision {
        this.currentBar++;
        this.priceHistory.push(currentPrice);
        
        // Aktualizuj ekstrema
        if (this.position.direction === 'long') {
            this.highestPrice = Math.max(this.highestPrice, currentPrice);
        } else {
            this.lowestPrice = Math.min(this.lowestPrice, currentPrice);
        }

        // Sprawdź różne typy wyjść
        const scalingExit = this.checkScalingExit(currentPrice, atr);
        if (scalingExit.shouldExit) return scalingExit;

        const timeExit = this.checkTimeExit();
        if (timeExit.shouldExit) return timeExit;

        const structuralExit = this.checkStructuralExit(currentPrice);
        if (structuralExit.shouldExit) return structuralExit;

        const trailingExit = this.checkTrailingStop(currentPrice, atr);
        if (trailingExit.shouldExit) return trailingExit;

        const breakEvenExit = this.checkBreakEven(currentPrice);
        if (breakEvenExit.shouldExit) return breakEvenExit;

        return {
            shouldExit: false,
            exitReason: '',
            exitPercentage: 0,
            exitType: 'NONE'
        };
    }

    private checkScalingExit(currentPrice: number, atr: number): ExitDecision {
        if (!this.options.enableScaling || !this.options.scalingLevels) {
            return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
        }

        const currentProfit = this.calculateProfit(currentPrice);
        const riskAmount = atr * this.options.trailingStopMultiplier!;

        for (const level of this.options.scalingLevels) {
            if (this.scalingLevelsHit.has(level.target)) continue;

            const targetPrice = this.position.direction === 'long' 
                ? this.entryPrice + (riskAmount * level.target)
                : this.entryPrice - (riskAmount * level.target);

            if (this.position.direction === 'long' && currentPrice >= targetPrice ||
                this.position.direction === 'short' && currentPrice <= targetPrice) {
                
                this.scalingLevelsHit.add(level.target);
                
                return {
                    shouldExit: true,
                    exitReason: `Scaling out ${level.percentage * 100}% at ${level.target}R`,
                    exitPercentage: level.percentage,
                    newStopLoss: level.stopLoss,
                    exitType: 'SCALING'
                };
            }
        }

        return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
    }

    private checkTimeExit(): ExitDecision {
        if (!this.options.enableTimeExit || !this.options.maxHoldTime) {
            return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
        }

        if (this.currentBar >= this.options.maxHoldTime) {
            return {
                shouldExit: true,
                exitReason: `Time-based exit after ${this.options.maxHoldTime} bars`,
                exitPercentage: 1.0,
                exitType: 'TIME'
            };
        }

        return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
    }

    private checkStructuralExit(currentPrice: number): ExitDecision {
        if (!this.options.enableStructuralExit || this.priceHistory.length < this.options.structuralLookback!) {
            return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
        }

        const lookback = this.options.structuralLookback!;
        const recentPrices = this.priceHistory.slice(-lookback);
        
        if (this.position.direction === 'long') {
            // Sprawdź czy cena spadła pod ostatni lokalny dołek
            const recentLow = Math.min(...recentPrices.slice(0, -1));
            if (currentPrice < recentLow) {
                return {
                    shouldExit: true,
                    exitReason: 'Structural exit: price below recent low',
                    exitPercentage: 1.0,
                    exitType: 'STRUCTURAL'
                };
            }
        } else {
            // Sprawdź czy cena wzrosła ponad ostatni lokalny szczyt
            const recentHigh = Math.max(...recentPrices.slice(0, -1));
            if (currentPrice > recentHigh) {
                return {
                    shouldExit: true,
                    exitReason: 'Structural exit: price above recent high',
                    exitPercentage: 1.0,
                    exitType: 'STRUCTURAL'
                };
            }
        }

        return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
    }

    private checkTrailingStop(currentPrice: number, atr: number): ExitDecision {
        if (!this.options.enableTrailingStop) {
            return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
        }

        const currentProfit = this.calculateProfit(currentPrice);
        const profitPercentage = Math.abs(currentProfit) / (this.entryPrice * (this.position.size || 1));

        // Aktywuj trailing stop po osiągnięciu progu
        if (!this.trailingStopActivated && profitPercentage >= this.options.trailingStopActivation!) {
            this.trailingStopActivated = true;
            this.trailingStopPrice = this.position.direction === 'long'
                ? currentPrice - (atr * this.options.trailingStopMultiplier!)
                : currentPrice + (atr * this.options.trailingStopMultiplier!);
        }

        // Aktualizuj trailing stop
        if (this.trailingStopActivated) {
            const newTrailingStop = this.position.direction === 'long'
                ? currentPrice - (atr * this.options.trailingStopMultiplier!)
                : currentPrice + (atr * this.options.trailingStopMultiplier!);

            if (this.position.direction === 'long') {
                this.trailingStopPrice = Math.max(this.trailingStopPrice, newTrailingStop);
            } else {
                this.trailingStopPrice = Math.min(this.trailingStopPrice, newTrailingStop);
            }

            // Sprawdź czy trailing stop został osiągnięty
            if (this.position.direction === 'long' && currentPrice <= this.trailingStopPrice ||
                this.position.direction === 'short' && currentPrice >= this.trailingStopPrice) {
                
                return {
                    shouldExit: true,
                    exitReason: 'Trailing stop hit',
                    exitPercentage: 1.0,
                    exitType: 'TRAILING'
                };
            }
        }

        return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
    }

    private checkBreakEven(currentPrice: number): ExitDecision {
        if (!this.options.enableBreakEven || this.breakEvenActivated) {
            return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
        }

        const currentProfit = this.calculateProfit(currentPrice);
        const profitPercentage = Math.abs(currentProfit) / (this.entryPrice * (this.position.size || 1));

        if (profitPercentage >= this.options.breakEvenTrigger!) {
            this.breakEvenActivated = true;
            return {
                shouldExit: false,
                exitReason: 'Break-even activated',
                exitPercentage: 0,
                newStopLoss: this.entryPrice, // Przesuń SL na cenę wejścia
                exitType: 'BREAKEVEN'
            };
        }

        return { shouldExit: false, exitReason: '', exitPercentage: 0, exitType: 'NONE' };
    }

    private calculateProfit(currentPrice: number): number {
        if (this.position.direction === 'long') {
            return (currentPrice - this.entryPrice) * (this.position.size || 1);
        } else {
            return (this.entryPrice - currentPrice) * (this.position.size || 1);
        }
    }

    // Metody pomocnicze
    getCurrentStopLoss(): number | undefined {
        if (this.breakEvenActivated) {
            return this.entryPrice;
        }
        if (this.trailingStopActivated) {
            return this.trailingStopPrice;
        }
        return undefined;
    }

    getScalingLevelsHit(): number[] {
        return Array.from(this.scalingLevelsHit);
    }

    isBreakEvenActivated(): boolean {
        return this.breakEvenActivated;
    }

    isTrailingStopActivated(): boolean {
        return this.trailingStopActivated;
    }
} 