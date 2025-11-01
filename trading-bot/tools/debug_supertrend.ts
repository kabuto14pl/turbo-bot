/**
 * 🔧 [SHARED-INFRASTRUCTURE]
 * Shared infrastructure component
 */
// Skrypt debugujący dla SuperTrend
import { calculateSuperTrend } from '../core/indicators/supertrend';
import { loadCandles } from '../infrastructure/data/csv_loader';
import { calcEMA } from '../core/indicators/ema';
import * as fs from 'fs';
import * as path from 'path';

async function debugSuperTrendStrategy() {
    console.log("=== DEBUGOWANIE STRATEGII SUPERTREND ===");
    
    // Ładowanie danych
    console.log("Ładowanie danych świecowych...");
    let candles = await loadCandles('./data/BTCUSDT/15m.csv');
    console.log(`Załadowano ${candles.length} świec 15-minutowych.`);
    
    // Ograniczenie danych dla szybszych testów
    const testLimit = 10000;
    if (candles.length > testLimit) {
        console.log(`Ograniczam dane do ${testLimit} świec dla przyspieszenia testów.`);
        candles = candles.slice(0, testLimit);
    }
    
    // Parametry strategii do testów
    const period = 7;
    const multiplier = 1.5;
    const useEma200Filter = true;
    
    // Obliczamy wskaźniki
    const highs = candles.map(c => c.high);
    const lows = candles.map(c => c.low);
    const closes = candles.map(c => c.close);
    
    // Kalkulacja SuperTrend - sprawdzenie formatu wyników
    const stResult = calculateSuperTrend(highs, lows, closes, period, multiplier);
    console.log("Format wyniku calculateSuperTrend:", typeof stResult);
    
    if (Array.isArray(stResult)) {
        console.log("Przykładowe dane (Array):", stResult.slice(0, 5));
    } else {
        console.log("Format niezgodny z oczekiwaniami");
    }
    
    // Konwersja wyniku na bardziej przydatny format
    const supertrend: number[] = [];
    const direction: number[] = [];
    
    // Upraszczamy obsługę API (niezależnie czy zwraca tablicę obiektów czy pojedynczy obiekt)
    if (Array.isArray(stResult)) {
        console.log("SuperTrend zwraca tablicę obiektów");
        for (let i = 0; i < Math.min(stResult.length, 5); i++) {
            console.log(`stResult[${i}]:`, stResult[i]);
        }
        
        for (let i = 0; i < stResult.length; i++) {
            // Sprawdzamy różne możliwe formaty wyniku
            if (typeof stResult[i] === 'object') {
                // Format obiektu z właściwościami
                const st = stResult[i] as any;
                supertrend.push(st.value || st.supertrend || 0);
                direction.push(typeof st.direction === 'string' ? 
                    (st.direction === 'up' || st.direction === 'buy' ? 1 : -1) : 
                    (st.direction || 0));
            } else {
                // Format liczby (wartość SuperTrend)
                supertrend.push(stResult[i] as any || 0);
                // W tym przypadku musimy określić kierunek na podstawie ceny i wartości SuperTrend
                direction.push(closes[i] > (stResult[i] as any) ? 1 : -1);
            }
        }
    } else {
        console.log("SuperTrend zwraca pojedynczy obiekt z tablicami");
        // Zakładamy, że mamy pojedynczy obiekt z dwoma tablicami
        const st = stResult as any;
        for (let i = 0; i < closes.length; i++) {
            supertrend.push(st.supertrend?.[i] || st.values?.[i] || 0);
            if (st.direction && Array.isArray(st.direction)) {
                direction.push(typeof st.direction[i] === 'string' ? 
                    (st.direction[i] === 'up' || st.direction[i] === 'buy' ? 1 : -1) : 
                    (st.direction[i] || 0));
            } else {
                direction.push(closes[i] > supertrend[i] ? 1 : -1);
            }
        }
    }
    
    console.log("Pierwszych 5 wartości supertrend:", supertrend.slice(0, 5));
    console.log("Pierwszych 5 wartości direction:", direction.slice(0, 5));
    
    // Obliczanie EMA200
    const ema200Values: number[] = [];
    for (let i = 0; i < candles.length; i++) {
        if (i >= 200) {
            const ema200Buffer = candles.slice(i - 199, i + 1);
            ema200Values.push(calcEMA(ema200Buffer, 200) ?? candles[i].close);
        } else {
            ema200Values.push(candles[i].close); // Placeholder gdy nie ma wystarczająco danych
        }
    }
    
    // Testowanie strategii - liczenie sygnałów
    let signalCount = 0;
    let filteredSignalCount = 0;
    let trendChangeCount = 0;
    
    for (let i = Math.max(period, 200) + 1; i < Math.min(candles.length, direction.length, supertrend.length); i++) {
        const candle = candles[i];
        const dir = direction[i];
        const prevDir = direction[i-1];
        const ema200 = ema200Values[i];
        
        // Zmiana trendu - potencjalny sygnał
        const trendChanged = dir !== prevDir;
        
        if (trendChanged) {
            trendChangeCount++;
            
            // Potencjalny sygnał LONG
            if (dir === 1) {
                signalCount++;
                // Filtr EMA200
                if (!useEma200Filter || candle.close > ema200) {
                    filteredSignalCount++;
                }
            }
            // Potencjalny sygnał SHORT
            else if (dir === -1) {
                signalCount++;
                // Filtr EMA200
                if (!useEma200Filter || candle.close < ema200) {
                    filteredSignalCount++;
                }
            }
        }
    }
    
    console.log("\n=== WYNIKI DEBUGOWANIA ===");
    console.log(`Liczba zmian trendu: ${trendChangeCount}`);
    console.log(`Liczba potencjalnych sygnałów: ${signalCount}`);
    console.log(`Liczba sygnałów po filtrze EMA200: ${filteredSignalCount}`);
    
    // Zapisanie danych do pliku CSV do analizy
    interface DebugDataItem {
        time: number;
        close: number;
        supertrend: number;
        direction: number;
        prev_direction: number | null;
        trend_changed: number;
        ema200: number | null;
        potential_signal: number;
        filtered_signal: number;
    }
    
    const debugData: DebugDataItem[] = [];
    for (let i = 0; i < Math.min(candles.length, supertrend.length, direction.length); i++) {
        if (i >= period) {
            const candle = candles[i];
            const st = supertrend[i];
            const dir = direction[i];
            const prevDir = i > 0 ? direction[i-1] : null;
            const ema200 = i >= 200 ? ema200Values[i] : null;
            const trendChanged = i > 0 && dir !== prevDir;
            
            debugData.push({
                time: candle.time,
                close: candle.close,
                supertrend: st,
                direction: dir,
                prev_direction: prevDir,
                trend_changed: trendChanged ? 1 : 0,
                ema200: ema200,
                potential_signal: trendChanged ? 1 : 0,
                filtered_signal: trendChanged && (!useEma200Filter || 
                                 (dir === 1 && ema200 !== null && candle.close > ema200) || 
                                 (dir === -1 && ema200 !== null && candle.close < ema200)) ? 1 : 0
            });
        }
    }
    
    // Zapisanie do CSV
    const header = 'time,close,supertrend,direction,prev_direction,trend_changed,ema200,potential_signal,filtered_signal\n';
    const rows = debugData.map(d => 
        `${d.time},${d.close},${d.supertrend},${d.direction},${d.prev_direction},${d.trend_changed},${d.ema200},${d.potential_signal},${d.filtered_signal}`
    );
    
    const debugDir = 'debug';
    if (!fs.existsSync(debugDir)) {
        fs.mkdirSync(debugDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(debugDir, 'supertrend_debug.csv'), header + rows.join('\n'));
    console.log(`Debug data zapisana w: ${path.join(debugDir, 'supertrend_debug.csv')}`);
}

// Uruchomienie skryptu debugującego
debugSuperTrendStrategy().catch(console.error);
