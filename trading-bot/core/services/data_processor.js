"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DataProcessor = void 0;
const aggregate_csv_1 = require("../../tools/aggregate_csv");
const MultiTFJoiner_1 = require("../utils/MultiTFJoiner");
const IndicatorProvider_1 = require("../indicators/IndicatorProvider");
/**
 * Serwis odpowiedzialny za przygotowanie i przetwarzanie danych rynkowych.
 * Wyodrębnia logikę z main.ts i centralizuje operacje na danych.
 */
class DataProcessor {
    constructor() {
        this.indicatorProvider = new IndicatorProvider_1.IndicatorProvider();
    }
    /**
     * Batch precompute wskaźników dla wszystkich rynków/timeframe/wskaźników.
     */
    precomputeIndicators(requests) {
        this.indicatorProvider.precomputeAll(requests);
    }
    /**
     * Udostępnia IndicatorProvider do strategii
     */
    getIndicatorProvider() {
        return this.indicatorProvider;
    }
    /**
     * Przygotowuje dane rynkowe dla wszystkich symboli.
     */
    prepareMarketData(candles15m, symbols) {
        console.log(`[DATA PROCESSOR] Przygotowuję dane rynkowe dla ${symbols.length} symboli`);
        const allSingleMarkets = [];
        for (const symbol of symbols) {
            console.log(`[DATA PROCESSOR] Przetwarzam symbol: ${symbol}`);
            // Klonujemy świece, aby uniknąć modyfikacji oryginalnej tablicy
            const candles15 = JSON.parse(JSON.stringify(candles15m));
            // Generowanie wyższych TF z 15m
            console.log(`[DATA PROCESSOR] Agreguję dane do wyższych timeframe'ów`);
            const candles1h = (0, aggregate_csv_1.aggregateCandles)(candles15, 60);
            const candles4h = (0, aggregate_csv_1.aggregateCandles)(candles15, 240);
            const candles1d = (0, aggregate_csv_1.aggregateCandles)(candles15, 1440);
            console.log(`[DATA PROCESSOR] Utworzono: ${candles1h.length} H1, ${candles4h.length} H4, ${candles1d.length} D1`);
            allSingleMarkets.push({
                symbol,
                candles: candles15,
                h1: candles1h,
                h4: candles4h,
                d1: candles1d
            });
        }
        return allSingleMarkets;
    }
    /**
     * Łączy świece z różnych timeframe'ów według timestamp.
     */
    joinTimeframes(market) {
        return (0, MultiTFJoiner_1.joinCandlesByTimestamp)(market.candles, market.h1, market.h4, market.d1);
    }
    /**
     * Liczy wskaźniki dla rynku (do dalszej refaktoryzacji, docelowo przez IndicatorProvider)
     */
    calculateIndicators(market) {
        // TODO: refaktoryzacja – pobieranie wskaźników przez IndicatorProvider
        // return this.indicatorProvider.calculateAllIndicators(...)
        return {};
    }
    /**
     * Przygotowuje kompletny zestaw danych dla jednej świecy.
     */
    prepareCandleData(market, candleIndex, joinedCandles) {
        const ctx = joinedCandles[candleIndex];
        if (!ctx.m15) {
            throw new Error(`Brak danych M15 dla indeksu ${candleIndex}`);
        }
        const indicators = this.calculateIndicators(market);
        return {
            context: ctx,
            indicators,
            currentPrice: ctx.m15.close,
            timestamp: ctx.m15.time
        };
    }
    /**
     * Waliduje dane wejściowe.
     */
    validateData(candles15m, symbols) {
        if (!candles15m || candles15m.length === 0) {
            throw new Error('Brak danych świecowych');
        }
        if (!symbols || symbols.length === 0) {
            throw new Error('Brak symboli do przetworzenia');
        }
        console.log(`[DATA PROCESSOR] Walidacja: ${candles15m.length} świec, ${symbols.length} symboli`);
    }
    /**
     * Pobiera statystyki danych.
     */
    getDataStats(markets) {
        const totalCandles = markets.reduce((sum, market) => sum + market.candles.length, 0);
        const symbols = markets.map(m => m.symbol);
        const timeframes = {
            m15: markets[0]?.candles.length || 0,
            h1: markets[0]?.h1.length || 0,
            h4: markets[0]?.h4.length || 0,
            d1: markets[0]?.d1.length || 0
        };
        return { totalCandles, symbols, timeframes };
    }
}
exports.DataProcessor = DataProcessor;
