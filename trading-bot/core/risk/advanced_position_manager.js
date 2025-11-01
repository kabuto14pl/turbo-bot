"use strict";
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
/**
 * 🏛️ ADVANCED POSITION MANAGER
 * Zaawansowany system zarządzania pozycjami z inteligentnym TP/SL
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdvancedPositionManager = void 0;
const advanced_stop_loss_1 = require("./advanced_stop_loss");
class AdvancedPositionManager {
    constructor(config, stopLossConfig, logger) {
        this.activePositions = new Map();
        this.positionHistory = [];
        this.lastRebalance = new Date();
        this.config = config;
        this.logger = logger;
        this.stopLossManager = new advanced_stop_loss_1.AdvancedStopLossManager(stopLossConfig, logger);
    }
    /**
     * 🚀 Otwórz nową pozycję
     */
    async openPosition(id, symbol, direction, entryPrice, size, strategy, riskPercent) {
        // Sprawdź limity ryzyka
        if (!this.canOpenPosition(riskPercent, strategy)) {
            this.logger.warn(`❌ Cannot open position: risk limits exceeded`, {
                symbol,
                strategy,
                requestedRisk: riskPercent,
                currentTotalRisk: this.getTotalRisk()
            });
            return false;
        }
        // Sprawdź korelację
        if (!this.checkCorrelationLimits(symbol, strategy)) {
            this.logger.warn(`❌ Cannot open position: correlation limits exceeded`, {
                symbol,
                strategy
            });
            return false;
        }
        // Stwórz pozycję
        const position = {
            id,
            symbol,
            direction,
            entryPrice,
            currentPrice: entryPrice,
            size,
            openTime: new Date(),
            unrealizedPnL: 0,
            strategy,
            stopLossData: this.stopLossManager.initializeStopLoss({
                id,
                symbol,
                direction,
                entryPrice,
                currentPrice: entryPrice,
                size,
                openTime: new Date(),
                unrealizedPnL: 0
            }),
            lastUpdate: new Date(),
            riskPercent,
            correlationGroup: this.getCorrelationGroup(symbol)
        };
        this.activePositions.set(id, position);
        this.logger.info(`🚀 Position opened successfully`, {
            id,
            symbol,
            direction,
            entryPrice,
            size,
            strategy,
            riskPercent
        });
        // Sprawdź czy potrzeba rebalancingu
        await this.checkRebalanceNeed();
        return true;
    }
    /**
     * 🔄 Aktualizuj pozycje z nowymi cenami
     */
    async updatePositions(marketData) {
        const positionsToClose = [];
        this.activePositions.forEach((position, positionId) => {
            const newPrice = marketData[position.symbol];
            if (!newPrice)
                return;
            // Aktualizuj cenę
            position.currentPrice = newPrice;
            position.lastUpdate = new Date();
            // Oblicz PnL
            if (position.direction === 'long') {
                position.unrealizedPnL = (newPrice - position.entryPrice) * position.size;
                position.highestPrice = Math.max(position.highestPrice || newPrice, newPrice);
            }
            else {
                position.unrealizedPnL = (position.entryPrice - newPrice) * position.size;
                position.lowestPrice = Math.min(position.lowestPrice || newPrice, newPrice);
            }
            // Aktualizuj trailing stop
            const volatility = this.calculateVolatility(position.symbol);
            this.stopLossManager.updateTrailingStop({
                id: position.id,
                symbol: position.symbol,
                direction: position.direction,
                entryPrice: position.entryPrice,
                currentPrice: newPrice,
                size: position.size,
                openTime: position.openTime,
                unrealizedPnL: position.unrealizedPnL,
                highestPrice: position.highestPrice,
                lowestPrice: position.lowestPrice
            }, volatility);
            // Sprawdź exit conditions
            const exitCheck = this.stopLossManager.shouldExitPosition({
                id: position.id,
                symbol: position.symbol,
                direction: position.direction,
                entryPrice: position.entryPrice,
                currentPrice: newPrice,
                size: position.size,
                openTime: position.openTime,
                unrealizedPnL: position.unrealizedPnL
            });
            if (exitCheck.shouldExit) {
                positionsToClose.push(positionId);
                this.logger.info(`🎯 Position marked for closure: ${exitCheck.reason}`, {
                    positionId,
                    symbol: position.symbol,
                    exitType: exitCheck.exitType,
                    pnl: position.unrealizedPnL
                });
            }
        });
        // Zamknij pozycje
        for (const positionId of positionsToClose) {
            await this.closePosition(positionId, 'AUTO_EXIT');
        }
    }
    /**
     * 🏁 Zamknij pozycję
     */
    async closePosition(positionId, reason) {
        const position = this.activePositions.get(positionId);
        if (!position) {
            this.logger.warn(`Position ${positionId} not found for closure`);
            return false;
        }
        // Przenieś do historii
        this.positionHistory.push({
            ...position,
            lastUpdate: new Date()
        });
        // Usuń z aktywnych
        this.activePositions.delete(positionId);
        this.stopLossManager.removeStopLossData(positionId);
        this.logger.info(`🏁 Position closed`, {
            positionId,
            symbol: position.symbol,
            direction: position.direction,
            pnl: position.unrealizedPnL,
            reason,
            duration: Date.now() - position.openTime.getTime()
        });
        return true;
    }
    /**
     * 🔍 Sprawdź czy można otworzyć pozycję
     */
    canOpenPosition(riskPercent, strategy) {
        // Sprawdź maksymalną liczbę pozycji
        if (this.activePositions.size >= this.config.maxPositions) {
            return false;
        }
        // Sprawdź ryzyko na transakcję
        if (riskPercent > this.config.maxRiskPerTrade) {
            return false;
        }
        // Sprawdź całkowite ryzyko
        const currentTotalRisk = this.getTotalRisk();
        if (currentTotalRisk + riskPercent > this.config.maxTotalRisk) {
            return false;
        }
        return true;
    }
    /**
     * 🔗 Sprawdź limity korelacji
     */
    checkCorrelationLimits(symbol, strategy) {
        const correlationGroup = this.getCorrelationGroup(symbol);
        if (!correlationGroup)
            return true;
        const sameGroupPositions = Array.from(this.activePositions.values())
            .filter(p => p.correlationGroup === correlationGroup);
        const sameGroupRisk = sameGroupPositions.reduce((sum, p) => sum + p.riskPercent, 0);
        return sameGroupRisk < this.config.correlationThreshold;
    }
    /**
     * 🏷️ Pobierz grupę korelacji dla symbolu
     */
    getCorrelationGroup(symbol) {
        // Grupowanie par walutowych według korelacji
        const correlationGroups = {
            'major_crypto': ['BTCUSDT', 'ETHUSDT', 'BNBUSDT'],
            'alt_crypto': ['ADAUSDT', 'DOTUSDT', 'LINKUSDT', 'AVAXUSDT'],
            'stable_crypto': ['USDCUSDT', 'BUSDUSDT', 'TUSDUSDT']
        };
        for (const [group, symbols] of Object.entries(correlationGroups)) {
            if (symbols.includes(symbol)) {
                return group;
            }
        }
        return undefined;
    }
    /**
     * 📊 Oblicz całkowite ryzyko portfela
     */
    getTotalRisk() {
        return Array.from(this.activePositions.values())
            .reduce((sum, position) => sum + position.riskPercent, 0);
    }
    /**
     * 📈 Oblicz volatility dla symbolu
     */
    calculateVolatility(symbol) {
        // Uproszony sposób - w rzeczywistości użyj historycznych danych
        const volatilityMap = {
            'BTCUSDT': 0.03,
            'ETHUSDT': 0.04,
            'BNBUSDT': 0.05,
            'ADAUSDT': 0.06,
            'DOTUSDT': 0.07
        };
        return volatilityMap[symbol] || 0.05;
    }
    /**
     * ⚖️ Sprawdź potrzebę rebalancingu
     */
    async checkRebalanceNeed() {
        const now = new Date();
        const hoursSinceLastRebalance = (now.getTime() - this.lastRebalance.getTime()) / (1000 * 60 * 60);
        if (hoursSinceLastRebalance < 4)
            return; // Rebalansuj maksymalnie co 4 godziny
        const metrics = this.getPortfolioMetrics();
        // Sprawdź czy któraś strategia ma zbyt duży udział
        const maxStrategyRisk = Math.max(...Object.values(metrics.riskDistribution));
        if (maxStrategyRisk > this.config.rebalanceThreshold) {
            await this.rebalancePortfolio();
            this.lastRebalance = now;
        }
    }
    /**
     * ⚖️ Rebalansuj portfel
     */
    async rebalancePortfolio() {
        this.logger.info('🔄 Starting portfolio rebalancing');
        const metrics = this.getPortfolioMetrics();
        // Znajdź pozycje do zmniejszenia (największe ryzyko)
        const positionsByRisk = Array.from(this.activePositions.values())
            .sort((a, b) => b.riskPercent - a.riskPercent);
        // Logika rebalancingu - zmniejsz największe pozycje
        for (const position of positionsByRisk.slice(0, 3)) {
            if (position.riskPercent > this.config.maxRiskPerTrade * 0.8) {
                // W rzeczywistej implementacji: zmniejsz rozmiar pozycji
                this.logger.info(`📉 Position ${position.id} marked for size reduction`);
            }
        }
        this.logger.info('✅ Portfolio rebalancing completed', metrics);
    }
    /**
     * 📊 Pobierz metryki portfela
     */
    getPortfolioMetrics() {
        const positions = Array.from(this.activePositions.values());
        const totalRisk = this.getTotalRisk();
        const totalPnL = positions.reduce((sum, p) => sum + p.unrealizedPnL, 0);
        const largestPosition = Math.max(...positions.map(p => p.riskPercent), 0);
        // Rozkład ryzyka według strategii
        const riskDistribution = {};
        for (const position of positions) {
            riskDistribution[position.strategy] = (riskDistribution[position.strategy] || 0) + position.riskPercent;
        }
        // Ryzyko korelacji
        const correlationRisk = this.calculateCorrelationRisk();
        // Portfolio heat (stress level)
        const portfolioHeat = Math.min(totalRisk / this.config.maxTotalRisk, 1);
        return {
            totalPositions: positions.length,
            totalRisk,
            totalUnrealizedPnL: totalPnL,
            largestPosition,
            riskDistribution,
            correlationRisk,
            portfolioHeat
        };
    }
    /**
     * 🔗 Oblicz ryzyko korelacji
     */
    calculateCorrelationRisk() {
        const groupRisks = {};
        this.activePositions.forEach((position) => {
            const group = position.correlationGroup || 'other';
            groupRisks[group] = (groupRisks[group] || 0) + position.riskPercent;
        });
        const maxGroupRisk = Math.max(...Object.values(groupRisks), 0);
        return maxGroupRisk / this.config.correlationThreshold;
    }
    /**
     * 📋 Pobierz aktywne pozycje
     */
    getActivePositions() {
        return Array.from(this.activePositions.values());
    }
    /**
     * 📈 Pobierz statystyki trailing stop
     */
    getTrailingStopStatistics() {
        return this.stopLossManager.getStatistics();
    }
    /**
     * 🎯 Pobierz pozycję według ID
     */
    getPosition(positionId) {
        return this.activePositions.get(positionId);
    }
    /**
     * 📊 Pobierz historię pozycji
     */
    getPositionHistory(limit = 100) {
        return this.positionHistory.slice(-limit);
    }
}
exports.AdvancedPositionManager = AdvancedPositionManager;
