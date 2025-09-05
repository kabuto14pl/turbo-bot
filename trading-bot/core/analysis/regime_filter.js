"use strict";
// ============================================================================
//  regime_filter.ts – MARKET REGIME DETECTION & EVENT-BASED SIGNAL FILTERING
//  Automatyczne wyciszanie sygnałów przed/po ważnych wydarzeniach makro
//  Redukcja wielkości pozycji w okresach wysokiej volatilności
// ============================================================================
Object.defineProperty(exports, "__esModule", { value: true });
exports.RegimeFilter = void 0;
exports.createProductionRegimeFilter = createProductionRegimeFilter;
exports.createConservativeRegimeFilter = createConservativeRegimeFilter;
class RegimeFilter {
    constructor(config, logger) {
        this.economicEvents = [];
        this.suppressionActive = false;
        this.suppressionEndTime = null;
        this.config = config;
        this.logger = logger;
        this.initializeEconomicCalendar();
    }
    /**
     * MAIN FILTER METHOD
     * Sprawdza wszystkie warunki i zwraca decyzję o filtracji
     */
    shouldFilterSignal(signal, botState) {
        const currentTime = new Date(botState.timestamp);
        // 1. EVENT-BASED FILTERING
        if (this.config.enableEventFiltering) {
            const eventFilter = this.checkEventSuppression(currentTime);
            if (!eventFilter.allowed) {
                return eventFilter;
            }
        }
        // 2. VOLATILITY-BASED FILTERING
        if (this.config.enableVolatilityFiltering) {
            const volatilityFilter = this.checkVolatilityRegime(botState);
            if (volatilityFilter.sizeMultiplier < 1.0) {
                this.logger.warn(`Volatility filter activated: ${volatilityFilter.reason}`);
                return volatilityFilter;
            }
        }
        // 3. TREND-BASED FILTERING
        if (this.config.enableTrendFiltering) {
            const trendFilter = this.checkTrendRegime(botState);
            if (!trendFilter.allowed) {
                return trendFilter;
            }
        }
        // 4. MARKET HOURS FILTERING
        const marketHoursFilter = this.checkMarketHours(currentTime);
        if (!marketHoursFilter.allowed) {
            return marketHoursFilter;
        }
        return {
            allowed: true,
            sizeMultiplier: 1.0,
            reason: 'No filtering applied'
        };
    }
    /**
     * EVENT SUPPRESSION LOGIC
     * ±10 min przed CPI, ±5 min po ważnych wydarzeniach
     */
    checkEventSuppression(currentTime) {
        for (const event of this.economicEvents) {
            const timeDiff = event.date.getTime() - currentTime.getTime();
            const minutesDiff = Math.abs(timeDiff) / (1000 * 60);
            // Pre-event suppression (10 minutes before high impact events)
            if (timeDiff > 0 && minutesDiff <= event.suppressionMinutes) {
                return {
                    allowed: false,
                    sizeMultiplier: 0.0,
                    reason: `Pre-event suppression: ${event.name} in ${minutesDiff.toFixed(1)} minutes`,
                    suppressUntil: new Date(event.date.getTime() + (5 * 60 * 1000)) // 5 min post-event
                };
            }
            // Post-event suppression (5 minutes after)
            if (timeDiff < 0 && minutesDiff <= 5) {
                return {
                    allowed: false,
                    sizeMultiplier: event.sizeReduction,
                    reason: `Post-event suppression: ${event.name} ${minutesDiff.toFixed(1)} minutes ago`
                };
            }
            // Reduced size during medium impact events
            if (event.impact === 'medium' && minutesDiff <= 15) {
                return {
                    allowed: true,
                    sizeMultiplier: 0.5,
                    reason: `Reduced size due to ${event.name}`
                };
            }
        }
        return { allowed: true, sizeMultiplier: 1.0, reason: 'No economic events' };
    }
    /**
     * VOLATILITY REGIME DETECTION
     * ATR-based volatility measurement with adaptive position sizing
     */
    checkVolatilityRegime(botState) {
        const atr = botState.indicators.m15.atr;
        const price = botState.marketData.lastPrice;
        const volatilityPct = (atr / price) * 100;
        // High volatility threshold (e.g., >3% daily ATR)
        if (volatilityPct > this.config.volatilityThreshold) {
            const reductionFactor = Math.min(volatilityPct / this.config.volatilityThreshold, this.config.maxPositionReduction);
            const sizeMultiplier = 1.0 - (reductionFactor - 1.0) * 0.5;
            return {
                allowed: true,
                sizeMultiplier: Math.max(sizeMultiplier, 0.2), // Minimum 20% size
                reason: `High volatility detected: ${volatilityPct.toFixed(2)}% ATR`
            };
        }
        // Low volatility (normal conditions)
        return {
            allowed: true,
            sizeMultiplier: 1.0,
            reason: `Normal volatility: ${volatilityPct.toFixed(2)}% ATR`
        };
    }
    /**
     * TREND STRENGTH FILTERING
     * ADX-based trend detection
     */
    checkTrendRegime(botState) {
        const adx = botState.indicators.m15.adx;
        // Weak trend - reduce counter-trend signals
        if (adx < this.config.trendStrengthThreshold) {
            // Check if signal is counter-trend
            const ema9 = botState.indicators.m15.ema_9;
            const ema21 = botState.indicators.m15.ema_21;
            const trend = ema9 > ema21 ? 'bullish' : 'bearish';
            return {
                allowed: true,
                sizeMultiplier: 0.7, // Reduced size in weak trends
                reason: `Weak trend detected: ADX ${adx.toFixed(1)} (trend: ${trend})`
            };
        }
        return {
            allowed: true,
            sizeMultiplier: 1.0,
            reason: `Strong trend: ADX ${adx.toFixed(1)}`
        };
    }
    /**
     * MARKET HOURS FILTERING
     * Reduced activity podczas Asian session, przed US open
     */
    checkMarketHours(currentTime) {
        const hour = currentTime.getUTCHours();
        // Asian session (low liquidity)
        if (hour >= 0 && hour <= 6) {
            return {
                allowed: true,
                sizeMultiplier: 0.5,
                reason: 'Asian session - reduced liquidity'
            };
        }
        // Pre-US market (7-13 UTC)
        if (hour >= 7 && hour <= 13) {
            return {
                allowed: true,
                sizeMultiplier: 1.0,
                reason: 'European session - normal activity'
            };
        }
        // US session (14-22 UTC) - highest activity
        if (hour >= 14 && hour <= 22) {
            return {
                allowed: true,
                sizeMultiplier: 1.0,
                reason: 'US session - peak activity'
            };
        }
        // Late US/Early Asian overlap
        return {
            allowed: true,
            sizeMultiplier: 0.7,
            reason: 'Late session - reduced activity'
        };
    }
    /**
     * ECONOMIC CALENDAR INITIALIZATION
     * Hard-coded major events (można rozszerzyć o API integration)
     */
    initializeEconomicCalendar() {
        const now = new Date();
        const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        // Przykładowe wydarzenia (w realnym systemie - API integration)
        this.economicEvents = [
            {
                name: 'US CPI Release',
                date: new Date(nextMonth.getTime() + 15 * 24 * 60 * 60 * 1000), // 15th of next month
                impact: 'high',
                currency: 'USD',
                suppressionMinutes: 10,
                sizeReduction: 0.3
            },
            {
                name: 'FOMC Meeting',
                date: new Date(nextMonth.getTime() + 20 * 24 * 60 * 60 * 1000), // 20th of next month
                impact: 'high',
                currency: 'USD',
                suppressionMinutes: 15,
                sizeReduction: 0.2
            },
            {
                name: 'NFP Release',
                date: this.getNextFirstFriday(now),
                impact: 'high',
                currency: 'USD',
                suppressionMinutes: 10,
                sizeReduction: 0.4
            },
            {
                name: 'ECB Rate Decision',
                date: new Date(nextMonth.getTime() + 25 * 24 * 60 * 60 * 1000),
                impact: 'medium',
                currency: 'EUR',
                suppressionMinutes: 5,
                sizeReduction: 0.5
            }
        ];
        this.logger.info(`Loaded ${this.economicEvents.length} economic events for filtering`);
    }
    /**
     * UTILITY: Get next first Friday (NFP release day)
     */
    getNextFirstFriday(date) {
        const nextMonth = new Date(date.getFullYear(), date.getMonth() + 1, 1);
        const firstFriday = new Date(nextMonth);
        // Find first Friday of the month
        while (firstFriday.getDay() !== 5) {
            firstFriday.setDate(firstFriday.getDate() + 1);
        }
        // NFP releases at 8:30 AM EST (13:30 UTC)
        firstFriday.setUTCHours(13, 30, 0, 0);
        return firstFriday;
    }
    /**
     * UPDATE ECONOMIC CALENDAR
     * Wywołaj periodic refresh z external API
     */
    updateEconomicCalendar(events) {
        this.economicEvents = events;
        this.logger.info(`Updated economic calendar with ${events.length} events`);
    }
    /**
     * GET ACTIVE SUPPRESSIONS
     * Dla monitoring/debugging
     */
    getActiveSuppressions() {
        const now = new Date();
        return this.economicEvents.filter(event => {
            const timeDiff = Math.abs(event.date.getTime() - now.getTime()) / (1000 * 60);
            return timeDiff <= event.suppressionMinutes;
        });
    }
    /**
     * FORCE SUPPRESSION
     * Manual override dla unexpected events
     */
    forceSuppression(minutes, reason) {
        this.suppressionActive = true;
        this.suppressionEndTime = new Date(Date.now() + minutes * 60 * 1000);
        this.logger.warn(`Manual suppression activated for ${minutes} minutes: ${reason}`);
    }
    /**
     * CLEAR SUPPRESSION
     */
    clearSuppression() {
        this.suppressionActive = false;
        this.suppressionEndTime = null;
        this.logger.info('Signal suppression cleared');
    }
}
exports.RegimeFilter = RegimeFilter;
/**
 * FACTORY FUNCTION - Standard Configuration
 */
function createProductionRegimeFilter(logger) {
    const config = {
        enableEventFiltering: true,
        enableVolatilityFiltering: true,
        enableTrendFiltering: true,
        volatilityThreshold: 3.0, // 3% daily ATR
        trendStrengthThreshold: 25, // ADX threshold
        maxPositionReduction: 0.5 // Max 50% reduction
    };
    return new RegimeFilter(config, logger);
}
/**
 * FACTORY FUNCTION - Conservative Configuration
 */
function createConservativeRegimeFilter(logger) {
    const config = {
        enableEventFiltering: true,
        enableVolatilityFiltering: true,
        enableTrendFiltering: true,
        volatilityThreshold: 2.0, // More sensitive
        trendStrengthThreshold: 30, // Higher threshold
        maxPositionReduction: 0.7 // More aggressive reduction
    };
    return new RegimeFilter(config, logger);
}
