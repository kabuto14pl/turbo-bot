// ============================================================================
//  simple_optimizer.ts - Prosty skrypt optymalizacyjny
//  Ten plik uruchamia optymalizację RSITurbo wykorzystując istniejące funkcje
// ============================================================================

import { TestConfig } from '../main';
import { runTest } from '../main';
import { loadCandles } from '../infrastructure/data/csv_loader';
import * as path from 'path';
import * as fs from 'fs';

/**
 * Główna funkcja do przeprowadzenia prostej optymalizacji
 */
async function runSimpleOptimization() {
    console.log('Ładowanie danych świecowych...');
    let candles15m = await loadCandles('./data/BTCUSDT/15m.csv');
    console.log(`Załadowano ${candles15m.length} świec 15-minutowych.`);

    // Określamy zakresy parametrów do przetestowania
    const rsiPeriods = [10, 14, 20];
    const rsiEntryLongs = [20, 25, 30, 35];
    const rsiEntryShorts = [65, 70, 75, 80];
    
    // Tablica na wyniki
    const results: any[] = [];
    
    // ID dla całej optymalizacji
    const optimizationId = `rsi_optimization_${Date.now()}`;
    const outputDir = path.join('results', optimizationId);
    fs.mkdirSync(outputDir, { recursive: true });
    
    console.log(`\n=== ROZPOCZYNAM OPTYMALIZACJĘ: ${optimizationId} ===`);
    console.log(`Testuję ${rsiPeriods.length * rsiEntryLongs.length * rsiEntryShorts.length} kombinacji parametrów.`);
    
    // Pętla optymalizacyjna - testujemy wszystkie kombinacje
    for (const rsiPeriod of rsiPeriods) {
        for (const rsiEntryLong of rsiEntryLongs) {
            for (const rsiEntryShort of rsiEntryShorts) {
                // Tworzymy konfigurację dla tego konkretnego testu
                const testConfig: TestConfig = {
                    id: `RSITurbo_${rsiPeriod}_${rsiEntryLong}_${rsiEntryShort}_${Date.now()}`,
                    initialCapital: 10000,
                    riskConfig: {
                        maxDrawdown: 0.20,
                        maxDailyDrawdown: 0.10,
                    },
                    simulationConfig: {
                        commissionBps: 4,
                        slippageBps: 2,
                    },
                    strategies: [
                        {
                            name: "RSITurbo",
                            params: { 
                                rsiPeriod, 
                                rsiEntryLong, 
                                rsiEntryShort 
                            }
                        }
                    ],
                    symbols: ['BTCUSDT'],
                };
                
                console.log(`\nTestuję parametry: RSI(${rsiPeriod}) EntryLong(${rsiEntryLong}) EntryShort(${rsiEntryShort})`);
                
                // Uruchamiamy test z tą konfiguracją
                const stats = await runTest(testConfig, candles15m);
                
                // Zapisujemy wyniki
                results.push({
                    params: { rsiPeriod, rsiEntryLong, rsiEntryShort },
                    stats
                });
                
                console.log(`Zakończono test. Sharpe Ratio: ${stats.sharpeRatio?.toFixed(4) || 'N/A'}, PnL: ${stats.totalPnl?.toFixed(2) || 'N/A'}`);
            }
        }
    }
    
    // Sortujemy wyniki po Sharpe Ratio (od najlepszego)
    results.sort((a, b) => (b.stats.sharpeRatio || 0) - (a.stats.sharpeRatio || 0));
    
    // Zapisujemy podsumowanie do pliku
    const summaryPath = path.join(outputDir, 'optimization_summary.csv');
    const summaryHeader = 'rsiPeriod,rsiEntryLong,rsiEntryShort,sharpeRatio,sortinoRatio,totalPnl,maxDrawdown,winRate,tradeCount\n';
    const summaryRows = results.map(r => {
        const { rsiPeriod, rsiEntryLong, rsiEntryShort } = r.params;
        const s = r.stats;
        return `${rsiPeriod},${rsiEntryLong},${rsiEntryShort},${s.sharpeRatio || 0},${s.sortinoRatio || 0},${s.totalPnl || 0},${s.maxDrawdown || 0},${s.winRate || 0},${s.tradeCount || 0}`;
    });
    fs.writeFileSync(summaryPath, summaryHeader + summaryRows.join('\n'));
    
    // Wyświetlamy top 5 najlepszych konfiguracji
    console.log('\n=== TOP 5 NAJLEPSZYCH KONFIGURACJI ===');
    for (let i = 0; i < Math.min(5, results.length); i++) {
        const r = results[i];
        const { rsiPeriod, rsiEntryLong, rsiEntryShort } = r.params;
        const s = r.stats;
        console.log(`${i+1}. RSI(${rsiPeriod}) EntryLong(${rsiEntryLong}) EntryShort(${rsiEntryShort}) - Sharpe: ${s.sharpeRatio?.toFixed(4) || 'N/A'}, PnL: ${s.totalPnl?.toFixed(2) || 'N/A'}`);
    }
    
    console.log(`\n=== OPTYMALIZACJA ZAKOŃCZONA ===`);
    console.log(`Szczegółowe wyniki zapisane w: ${summaryPath}`);
    
    return results[0]; // Zwracamy najlepszą konfigurację
}

// Uruchamiamy optymalizację
runSimpleOptimization().catch(console.error);
