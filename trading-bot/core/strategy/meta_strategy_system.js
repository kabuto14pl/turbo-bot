"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetaStrategySystem = void 0;
const market_regime_detector_1 = require("../analysis/market_regime_detector");
const portfolio_optimizer_1 = require("../portfolio/portfolio_optimizer");
const risk_manager_1 = require("../risk/risk_manager");
const kelly_calculator_1 = require("../risk/kelly_calculator");
const market_calendar_1 = require("../analysis/market_calendar");
const session_manager_1 = require("../analysis/session_manager");
const meta_model_1 = require("./meta_model");
class MetaStrategySystem {
    constructor(strategies, config = {}, logger) {
        this.logger = logger;
        this.strategies = strategies;
        this.config = {
            minSignalConfidence: 0.2,
            maxCorrelation: 0.7,
            maxPortfolioAllocation: 0.3,
            rebalanceInterval: 6 * 60 * 60 * 1000,
            useKellyCriterion: true,
            useMetaModel: true,
            ...config
        };
        this.regimeDetector = new market_regime_detector_1.MarketRegimeDetector({}, logger);
        this.portfolioOptimizer = new portfolio_optimizer_1.PortfolioOptimizer({}, logger);
        this.riskManager = new risk_manager_1.RiskManager(logger);
        this.kellyCalculator = new kelly_calculator_1.KellyCalculator({}, logger);
        this.marketCalendar = new market_calendar_1.MarketCalendar({}, logger);
        this.sessionManager = new session_manager_1.SessionManager({}, logger);
        this.metaModel = new meta_model_1.MetaModel({}, logger);
    }
    async run(state) {
        // Sprawdź warunki makro i sesyjne
        if (!this.shouldTrade(state)) {
            return [];
        }
        // Aktualizuj reżim i wagi
        const regime = this.regimeDetector.detectRegime(state);
        const weights = await this.portfolioOptimizer.optimizeWeights(this.getStrategyPerformances(), regime, {
            volume24h: state.marketData.volume24h,
            volatility: state.marketData.volatility24h,
            timestamp: state.timestamp
        });
        // Zbierz i normalizuj sygnały
        const normalizedSignals = await this.collectAndNormalizeSignals(state);
        // Agreguj sygnały
        const aggregatedSignals = this.aggregateSignals(normalizedSignals, weights, state);
        // Zastosuj meta-model jeśli włączony
        const finalSignals = this.config.useMetaModel
            ? await this.applyMetaModel(aggregatedSignals, state)
            : aggregatedSignals;
        // Zarządzaj pozycjami i ryzykiem
        return this.managePositionsAndRisk(finalSignals, state);
    }
    shouldTrade(state) {
        // Sprawdź kalendarz ekonomiczny
        const calendar = state.marketContext?.calendar;
        if (calendar) {
            const event = calendar.getNextEvent();
            if (event && event.timestamp - state.timestamp < 15 * 60 * 1000) {
                this.logger.info('Trading wstrzymany - zbliżające się wydarzenie', event);
                return false;
            }
        }
        // Sprawdź sesję handlową
        const sessionManager = state.marketContext?.sessionManager;
        if (sessionManager) {
            const session = sessionManager.getCurrentSession();
            if (!session?.isActive) {
                this.logger.info('Trading wstrzymany - nieaktywna sesja', session);
                return false;
            }
        }
        return true;
    }
    async collectAndNormalizeSignals(state) {
        const allSignals = await Promise.all(this.strategies.map(strategy => strategy.generateSignal
            ? strategy.generateSignal(state)
            : Promise.resolve([])));
        return allSignals
            .flat()
            .filter(signal => signal.confidence >= this.config.minSignalConfidence)
            .map(signal => ({
            ...signal,
            confidence: this.normalizeConfidence(signal.confidence)
        }));
    }
    normalizeConfidence(confidence) {
        // Normalizuj do przedziału [-1, 1]
        return Math.max(-1, Math.min(1, confidence * 2 - 1));
    }
    aggregateSignals(signals, weights, state) {
        const aggregated = new Map();
        for (const signal of signals) {
            const key = `${signal.type}_${signal.metadata?.strategy}`;
            const weight = weights.get(signal.metadata?.strategy || '') || 0;
            if (!aggregated.has(key)) {
                aggregated.set(key, {
                    ...signal,
                    confidence: signal.confidence * weight
                });
            }
            else {
                const existing = aggregated.get(key);
                existing.confidence += signal.confidence * weight;
            }
        }
        return Array.from(aggregated.values())
            .filter(signal => Math.abs(signal.confidence) >= this.config.minSignalConfidence);
    }
    async applyMetaModel(signals, state) {
        const features = this.prepareMetaModelFeatures(signals, state);
        const predictions = await this.metaModel.predict(features);
        return signals.map((signal, i) => ({
            ...signal,
            confidence: predictions[i]
        }));
    }
    prepareMetaModelFeatures(signals, state) {
        return signals.map(signal => [
            signal.confidence,
            signal.indicators.rsi || 0,
            signal.indicators.adx || 0,
            signal.indicators.atr || 0,
            state.marketData.volume24h,
            state.marketData.volatility24h
        ]);
    }
    managePositionsAndRisk(signals, state) {
        const finalSignals = [];
        let totalRisk = 0;
        for (const signal of signals) {
            // Oblicz optymalną wielkość pozycji
            const size = this.calculatePositionSize(signal, state);
            if (size <= 0)
                continue;
            // Sprawdź korelacje i limity alokacji
            if (!this.checkCorrelationAndAllocation(signal, finalSignals, state)) {
                continue;
            }
            // Dostosuj stop-loss i take-profit
            const { stopLoss, takeProfit } = this.calculateExitLevels(signal, state);
            finalSignals.push({
                ...signal,
                size,
                stopLoss,
                takeProfit,
                orderType: 'OCO' // One-Cancels-Other order
            });
            totalRisk += this.calculateSignalRisk(signal, state);
        }
        return finalSignals;
    }
    calculatePositionSize(signal, state) {
        if (this.config.useKellyCriterion) {
            return this.kellyCalculator.calculateSize(signal, state, state.indicators.m15.atr || 0);
        }
        // Fixed-fraction based on ATR
        const atr = state.indicators.m15.atr || 0;
        const riskPerTrade = state.equity * 0.01; // 1% risk
        return (riskPerTrade / atr) * state.prices.m15.close;
    }
    checkCorrelationAndAllocation(signal, existingSignals, state) {
        // Sprawdź korelację z istniejącymi pozycjami
        for (const existing of existingSignals) {
            const correlation = this.calculateCorrelation(signal, existing);
            if (correlation > this.config.maxCorrelation) {
                const totalAllocation = this.calculateTotalAllocation(existingSignals, state);
                if (totalAllocation > this.config.maxPortfolioAllocation) {
                    return false;
                }
            }
        }
        return true;
    }
    calculateCorrelation(signal1, signal2) {
        // Implementacja obliczania korelacji między sygnałami
        // na podstawie ich indykatorów i historycznych zachowań
        return 0.5; // Przykładowa wartość
    }
    calculateTotalAllocation(signals, state) {
        return signals.reduce((total, signal) => total + (signal.size || 0) * state.prices.m15.close / state.equity, 0);
    }
    calculateExitLevels(signal, state) {
        const atr = state.indicators.m15.atr || 0;
        const price = signal.price;
        if (signal.type === 'ENTER_LONG') {
            return {
                stopLoss: price - (atr * 2),
                takeProfit: price + (atr * 3)
            };
        }
        else {
            return {
                stopLoss: price + (atr * 2),
                takeProfit: price - (atr * 3)
            };
        }
    }
    calculateSignalRisk(signal, state) {
        const stopLossRisk = Math.abs((signal.stopLoss - signal.price) / signal.price);
        return (signal.size * stopLossRisk) / state.equity;
    }
    getStrategyPerformances() {
        // TODO: Implementacja zbierania historycznych wyników strategii
        return new Map();
    }
}
exports.MetaStrategySystem = MetaStrategySystem;
