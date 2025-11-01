/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared trading bot infrastructure
 */
import { aggregateCandles } from '../../tools/aggregate_csv';
import { joinCandlesByTimestamp } from '../utils/MultiTFJoiner';
import { Candle } from '../indicators/multi_timeframe_synchronizer';
import { MarketContext } from '../types/market_context';
import { IndicatorService } from './indicator_service';
import { IndicatorSet } from '../indicators/indicator_set';
import { IndicatorProvider, IndicatorRequest } from '../indicators/IndicatorProvider';

/**
 * Serwis odpowiedzialny za przygotowanie i przetwarzanie danych rynkowych.
 * Wyodrębnia logikę z main.ts i centralizuje operacje na danych.
 */
export class DataProcessor {
    private indicatorProvider: IndicatorProvider;

    constructor() {
        this.indicatorProvider = new IndicatorProvider();
    }

    /**
     * Batch precompute wskaźników dla wszystkich rynków/timeframe/wskaźników.
     */
    precomputeIndicators(requests: IndicatorRequest[]): void {
        this.indicatorProvider.precomputeAll(requests);
    }

    /**
     * Udostępnia IndicatorProvider do strategii
     */
    getIndicatorProvider(): IndicatorProvider {
        return this.indicatorProvider;
    }

    /**
     * Przygotowuje dane rynkowe dla wszystkich symboli.
     */
    prepareMarketData(
        candles15m: Candle[],
        symbols: string[]
    ): MarketContext[] {
        console.log(`[DATA PROCESSOR] Przygotowuję dane rynkowe dla ${symbols.length} symboli`);
        
        const allSingleMarkets: MarketContext[] = [];
        
        for (const symbol of symbols) {
            console.log(`[DATA PROCESSOR] Przetwarzam symbol: ${symbol}`);
            
            // Klonujemy świece, aby uniknąć modyfikacji oryginalnej tablicy
            const candles15 = JSON.parse(JSON.stringify(candles15m));

            // Generowanie wyższych TF z 15m
            console.log(`[DATA PROCESSOR] Agreguję dane do wyższych timeframe'ów`);
            const candles1h = aggregateCandles(candles15, 60) as Candle[];
            const candles4h = aggregateCandles(candles15, 240) as Candle[];
            const candles1d = aggregateCandles(candles15, 1440) as Candle[];
            
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
    joinTimeframes(market: MarketContext): any[] {
        return joinCandlesByTimestamp(market.candles, market.h1, market.h4, market.d1);
    }

    /**
     * Liczy wskaźniki dla rynku (do dalszej refaktoryzacji, docelowo przez IndicatorProvider)
     */
    calculateIndicators(market: MarketContext): IndicatorSet {
        // TODO: refaktoryzacja – pobieranie wskaźników przez IndicatorProvider
        // return this.indicatorProvider.calculateAllIndicators(...)
        return {} as IndicatorSet;
    }

    /**
     * Przygotowuje kompletny zestaw danych dla jednej świecy.
     */
    prepareCandleData(
        market: MarketContext,
        candleIndex: number,
        joinedCandles: any[]
    ): {
        context: any;
        indicators: IndicatorSet;
        currentPrice: number;
        timestamp: number;
    } {
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
    validateData(candles15m: Candle[], symbols: string[]): void {
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
    getDataStats(markets: MarketContext[]): {
        totalCandles: number;
        symbols: string[];
        timeframes: { m15: number; h1: number; h4: number; d1: number };
    } {
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