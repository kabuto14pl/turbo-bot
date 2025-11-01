/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🛡️ ADVANCED STOP LOSS MANAGER
 * Zaawansowany system zarządzania trailing stop i dynamicznym TP/SL
 */

import { Logger } from '../../infrastructure/logging/logger';

export interface TrailingStopConfig {
    initialStopLossPercent: number;
    trailingStepPercent: number;
    minimumTrailingPercent: number;
    maxStopLossPercent: number;
    enableDynamicTP: boolean;
    volatilityAdjustment: boolean;
}

export interface PositionData {
    id: string;
    symbol: string;
    direction: 'long' | 'short';
    entryPrice: number;
    currentPrice: number;
    size: number;
    openTime: Date;
    unrealizedPnL: number;
    highestPrice?: number;  // Dla long pozycji
    lowestPrice?: number;   // Dla short pozycji
}

export interface StopLossData {
    currentStopLoss: number;
    currentTakeProfit: number;
    trailingActive: boolean;
    lastUpdatePrice: number;
    maxProfitPercent: number;
    adjustmentCount: number;
}

export class AdvancedStopLossManager {
    private readonly logger: Logger;
    private readonly config: TrailingStopConfig;
    private positionStops: Map<string, StopLossData> = new Map();

    constructor(config: TrailingStopConfig, logger: Logger) {
        this.config = config;
        this.logger = logger;
    }

    /**
     * 🎯 Inicjalizuj stop loss dla nowej pozycji
     */
    initializeStopLoss(position: PositionData): StopLossData {
        const { entryPrice, direction } = position;
        const stopLossDistance = entryPrice * (this.config.initialStopLossPercent / 100);
        
        let initialStopLoss: number;
        let initialTakeProfit: number;

        if (direction === 'long') {
            initialStopLoss = entryPrice - stopLossDistance;
            initialTakeProfit = entryPrice + (stopLossDistance * 2); // 1:2 Risk-Reward
        } else {
            initialStopLoss = entryPrice + stopLossDistance;
            initialTakeProfit = entryPrice - (stopLossDistance * 2);
        }

        const stopData: StopLossData = {
            currentStopLoss: initialStopLoss,
            currentTakeProfit: initialTakeProfit,
            trailingActive: false,
            lastUpdatePrice: entryPrice,
            maxProfitPercent: 0,
            adjustmentCount: 0
        };

        this.positionStops.set(position.id, stopData);
        
        this.logger.info(`🛡️ Initialized stop loss for ${position.symbol} ${direction}`, {
            entryPrice,
            stopLoss: initialStopLoss,
            takeProfit: initialTakeProfit
        });

        return stopData;
    }

    /**
     * 📈 Aktualizuj trailing stop na podstawie bieżącej ceny
     */
    updateTrailingStop(position: PositionData, volatility: number = 0): StopLossData | null {
        const stopData = this.positionStops.get(position.id);
        if (!stopData) {
            this.logger.warn(`No stop data found for position ${position.id}`);
            return null;
        }

        const { currentPrice, direction, entryPrice } = position;
        let updated = false;

        // Oblicz aktualny profit
        const profitPercent = direction === 'long' 
            ? ((currentPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - currentPrice) / entryPrice) * 100;

        // Aktualizuj maksymalny profit
        if (profitPercent > stopData.maxProfitPercent) {
            stopData.maxProfitPercent = profitPercent;
        }

        // Aktywuj trailing stop jeśli jesteśmy na zysku
        if (profitPercent > this.config.minimumTrailingPercent && !stopData.trailingActive) {
            stopData.trailingActive = true;
            this.logger.info(`🎯 Trailing stop activated for ${position.symbol}`);
        }

        if (stopData.trailingActive) {
            updated = this.adjustTrailingStop(position, stopData, volatility);
        }

        // Dynamiczne TP jeśli włączone
        if (this.config.enableDynamicTP) {
            this.adjustDynamicTakeProfit(position, stopData, volatility);
        }

        if (updated) {
            stopData.adjustmentCount++;
            this.logger.info(`📊 Stop loss updated for ${position.symbol}`, {
                newStopLoss: stopData.currentStopLoss,
                newTakeProfit: stopData.currentTakeProfit,
                profitPercent: profitPercent.toFixed(2),
                adjustmentCount: stopData.adjustmentCount
            });
        }

        return stopData;
    }

    /**
     * 🔄 Dostosuj trailing stop
     */
    private adjustTrailingStop(
        position: PositionData, 
        stopData: StopLossData, 
        volatility: number
    ): boolean {
        const { currentPrice, direction } = position;
        const trailingStep = this.config.trailingStepPercent / 100;
        
        // Dostosuj step na podstawie volatility jeśli włączone
        let adjustedStep = trailingStep;
        if (this.config.volatilityAdjustment && volatility > 0) {
            adjustedStep = trailingStep * (1 + volatility);
        }

        let newStopLoss = stopData.currentStopLoss;
        let updated = false;

        if (direction === 'long') {
            // Dla long pozycji - przesuwaj stop loss w górę
            const potentialNewStop = currentPrice - (currentPrice * adjustedStep);
            if (potentialNewStop > stopData.currentStopLoss) {
                newStopLoss = potentialNewStop;
                updated = true;
            }
        } else {
            // Dla short pozycji - przesuwaj stop loss w dół
            const potentialNewStop = currentPrice + (currentPrice * adjustedStep);
            if (potentialNewStop < stopData.currentStopLoss) {
                newStopLoss = potentialNewStop;
                updated = true;
            }
        }

        if (updated) {
            stopData.currentStopLoss = newStopLoss;
            stopData.lastUpdatePrice = currentPrice;
        }

        return updated;
    }

    /**
     * 🎯 Dostosuj dynamiczny take profit
     */
    private adjustDynamicTakeProfit(
        position: PositionData, 
        stopData: StopLossData, 
        volatility: number
    ): void {
        const { currentPrice, direction, entryPrice } = position;
        
        // Oblicz nowy TP na podstawie aktualnego trendu i volatility
        const profitPercent = direction === 'long' 
            ? ((currentPrice - entryPrice) / entryPrice) * 100
            : ((entryPrice - currentPrice) / entryPrice) * 100;

        // Jeśli jesteśmy mocno na zysku, przesuwaj TP dalej
        if (profitPercent > 3) {
            const extension = volatility > 0.02 ? 1.5 : 1.2; // Większa ekstensja dla wyższej volatility
            const newTPDistance = Math.abs(stopData.currentTakeProfit - entryPrice) * extension;
            
            if (direction === 'long') {
                stopData.currentTakeProfit = entryPrice + newTPDistance;
            } else {
                stopData.currentTakeProfit = entryPrice - newTPDistance;
            }
        }
    }

    /**
     * 🔍 Sprawdź czy pozycja powinna zostać zamknięta
     */
    shouldExitPosition(position: PositionData): {
        shouldExit: boolean;
        reason: string;
        exitType: 'STOP_LOSS' | 'TAKE_PROFIT' | 'NONE';
    } {
        const stopData = this.positionStops.get(position.id);
        if (!stopData) {
            return { shouldExit: false, reason: 'No stop data', exitType: 'NONE' };
        }

        const { currentPrice, direction } = position;

        // Sprawdź stop loss
        if (direction === 'long' && currentPrice <= stopData.currentStopLoss) {
            return {
                shouldExit: true,
                reason: `Stop loss hit: ${currentPrice} <= ${stopData.currentStopLoss}`,
                exitType: 'STOP_LOSS'
            };
        }

        if (direction === 'short' && currentPrice >= stopData.currentStopLoss) {
            return {
                shouldExit: true,
                reason: `Stop loss hit: ${currentPrice} >= ${stopData.currentStopLoss}`,
                exitType: 'STOP_LOSS'
            };
        }

        // Sprawdź take profit
        if (direction === 'long' && currentPrice >= stopData.currentTakeProfit) {
            return {
                shouldExit: true,
                reason: `Take profit hit: ${currentPrice} >= ${stopData.currentTakeProfit}`,
                exitType: 'TAKE_PROFIT'
            };
        }

        if (direction === 'short' && currentPrice <= stopData.currentTakeProfit) {
            return {
                shouldExit: true,
                reason: `Take profit hit: ${currentPrice} <= ${stopData.currentTakeProfit}`,
                exitType: 'TAKE_PROFIT'
            };
        }

        return { shouldExit: false, reason: 'Within limits', exitType: 'NONE' };
    }

    /**
     * 📊 Pobierz dane stop loss dla pozycji
     */
    getStopLossData(positionId: string): StopLossData | null {
        return this.positionStops.get(positionId) || null;
    }

    /**
     * 🗑️ Usuń dane stop loss (po zamknięciu pozycji)
     */
    removeStopLossData(positionId: string): void {
        this.positionStops.delete(positionId);
    }

    /**
     * 📈 Pobierz statystyki trailing stop
     */
    getStatistics(): {
        activePositions: number;
        trailingActiveCount: number;
        averageAdjustments: number;
        maxProfitTracked: number;
    } {
        const positions = Array.from(this.positionStops.values());
        const trailingActive = positions.filter(p => p.trailingActive);
        const totalAdjustments = positions.reduce((sum, p) => sum + p.adjustmentCount, 0);
        const maxProfit = Math.max(...positions.map(p => p.maxProfitPercent), 0);

        return {
            activePositions: positions.length,
            trailingActiveCount: trailingActive.length,
            averageAdjustments: positions.length > 0 ? totalAdjustments / positions.length : 0,
            maxProfitTracked: maxProfit
        };
    }
}
