// ==========================================
// 🐛 TURBO CONSOLE LOG - DEMO
// ==========================================

/**
 * INSTRUKCJA UŻYCIA:
 * 
 * 1. SZYBKI LOG ZMIENNEJ:
 *    - Zaznacz zmienną (np. portfolio)
 *    - Naciśnij: Ctrl+Alt+L
 *    - Automatycznie wstawia console.log z emoji!
 * 
 * 2. COMMENT/UNCOMMENT LOGS:
 *    - Ctrl+Alt+C - zakomentuj wszystkie logi
 *    - Ctrl+Alt+U - odkomentuj wszystkie logi
 * 
 * 3. DELETE ALL LOGS:
 *    - Ctrl+Alt+D - usuń wszystkie console.log
 */

// PRZYKŁAD - Debugowanie strategii:
export class StrategyDebugExample {
    async analyzeMarket(candles: any[], indicators: any) {
        // Zaznacz "candles" poniżej i naciśnij Ctrl+Alt+L
        const lastCandle = candles[candles.length - 1];
        
        // Zaznacz "indicators" i naciśnij Ctrl+Alt+L
        const rsi = indicators.rsi;
        const macd = indicators.macd;
        
        // Zaznacz "signal" i naciśnij Ctrl+Alt+L
        const signal = this.generateSignal(rsi, macd);
        
        // Zaznacz "confidence" i naciśnij Ctrl+Alt+L
        const confidence = signal.confidence;
        
        return signal;
    }
    
    generateSignal(rsi: number, macd: number) {
        // Zaznacz "buySignal" i naciśnij Ctrl+Alt+L
        const buySignal = rsi < 30 && macd > 0;
        
        // Zaznacz "sellSignal" i naciśnij Ctrl+Alt+L
        const sellSignal = rsi > 70 && macd < 0;
        
        return {
            action: buySignal ? 'BUY' : sellSignal ? 'SELL' : 'HOLD',
            confidence: Math.abs(50 - rsi) / 50
        };
    }
}

// PO DEBUGOWANIU:
// Ctrl+Alt+D - usuwa WSZYSTKIE console.log z tego pliku!

/**
 * 💡 TIPS:
 * 
 * 1. Używaj podczas rozwoju nowych strategii
 * 2. Ctrl+Alt+C przed commitem (zakomentuj logi)
 * 3. Ctrl+Alt+D przed produkcją (usuń logi)
 * 4. W settings: "turboConsoleLog.logMessagePrefix" = "🤖 BOT"
 */
