import { createStudy, Trial } from 'optuna-ts';
import { runTest, TestConfig } from '../main';
import { loadCandles } from '../infrastructure/data/csv_loader';
import * as fs from 'fs';

// Lista strategii i ich domyślnych parametrów do optymalizacji
const strategies = [
  {
    name: 'RSITurbo',
    paramSpace: (trial: Trial) => ({
      rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
      overbought: trial.suggestInt('overbought', 60, 80),
      oversold: trial.suggestInt('oversold', 20, 40),
      atrMultiplier: trial.suggestFloat('atrMultiplier', 1.0, 3.0),
      stopLossAtr: trial.suggestFloat('stopLossAtr', 1.0, 2.5),
    })
  },
  {
    name: 'SuperTrend',
    paramSpace: (trial: Trial) => ({
      period: trial.suggestInt('period', 7, 20),
      multiplier: trial.suggestFloat('multiplier', 1.0, 5.0),
      atrMultiplier: trial.suggestFloat('atrMultiplier', 1.0, 3.0),
    })
  },
  {
    name: 'MACrossover',
    paramSpace: (trial: Trial) => ({
      fastPeriod: trial.suggestInt('fastPeriod', 5, 20),
      slowPeriod: trial.suggestInt('slowPeriod', 21, 100),
    })
  },
  {
    name: 'MomentumConfirm',
    paramSpace: (trial: Trial) => ({
      macdFast: trial.suggestInt('macdFast', 8, 20),
      macdSlow: trial.suggestInt('macdSlow', 21, 50),
      macdSignal: trial.suggestInt('macdSignal', 5, 15),
    })
  },
  {
    name: 'MomentumPro',
    paramSpace: (trial: Trial) => ({
      rocPeriod: trial.suggestInt('rocPeriod', 5, 20),
      rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
      overbought: trial.suggestInt('overbought', 60, 80),
      oversold: trial.suggestInt('oversold', 20, 40),
    })
  },
  {
    name: 'EnhancedRSITurbo',
    paramSpace: (trial: Trial) => ({
      rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
      overbought: trial.suggestInt('overbought', 60, 80),
      oversold: trial.suggestInt('oversold', 20, 40),
      rsiSmoothing: trial.suggestInt('rsiSmoothing', 1, 5),
      trendFilter: trial.suggestInt('trendFilter', 0, 2),
    })
  },
  {
    name: 'AdvancedAdaptive',
    paramSpace: (trial: Trial) => ({
      rsiPeriod: trial.suggestInt('rsiPeriod', 10, 20),
      rsiOversold: trial.suggestInt('rsiOversold', 20, 40),
      rsiOverbought: trial.suggestInt('rsiOverbought', 60, 80),
      emaShortPeriod: trial.suggestInt('emaShortPeriod', 10, 50),
      emaLongPeriod: trial.suggestInt('emaLongPeriod', 100, 300),
      adxPeriod: trial.suggestInt('adxPeriod', 10, 20),
      atrPeriod: trial.suggestInt('atrPeriod', 10, 20),
      atrMultiplier: trial.suggestFloat('atrMultiplier', 1.0, 3.0),
    })
  }
];

const intervals = [
  { name: 'm15', file: 'data/BTCUSDT/15m.csv' },
  { name: '1h', file: 'data/BTCUSDT/1h.csv' },
  { name: '4h', file: 'data/BTCUSDT/4h.csv' },
  { name: '1d', file: 'data/BTCUSDT/1d.csv' },
];

const resultsSummary: any[] = [];

async function objectiveFactory(strategyName: string, paramSpace: (trial: Trial) => any, candles: any[], interval: string) {
  return async (trial: Trial) => {
    const params = paramSpace(trial);
    const testConfig: TestConfig = {
      id: `optuna_${strategyName}_${interval}_${Date.now()}`,
      strategies: [
        {
          name: strategyName,
          params: params
        }
      ],
      initialCapital: 10000,
      riskConfig: {
        maxDrawdown: 0.2,
        maxDailyDrawdown: 0.1
      },
      simulationConfig: {
        commissionBps: 2,
        slippageBps: 1
      },
      symbols: ['BTCUSDT']
    };
    const stats = await runTest(testConfig, candles);
    // Zwracamy Sharpe Ratio jako metrykę optymalizacji
    return stats.sharpeRatio || 0;
  };
}

export async function runOptunaBayesianOptimization() {
  for (const strategy of strategies) {
    for (const interval of intervals) {
      console.log(`\n=== Optymalizacja: ${strategy.name} | Interwał: ${interval.name} ===`);
      const candles = await loadCandles(interval.file);
      const study = await createStudy({
        direction: 'maximize',
        sampler: 'TPESampler',
        pruner: 'MedianPruner',
      });
      const objective = await objectiveFactory(strategy.name, strategy.paramSpace, candles, interval.name);
      await study.optimize(objective, 100, 2); // np. 100 prób, 2 równolegle
      // Po optymalizacji pobierz najlepsze parametry i statystyki
      const bestParams = study.bestParams;
      // Uruchom test z najlepszymi parametrami, by zebrać podsumowanie
      const testConfig: TestConfig = {
        id: `summary_${strategy.name}_${interval.name}_${Date.now()}`,
        strategies: [
          {
            name: strategy.name,
            params: bestParams
          }
        ],
        initialCapital: 10000,
        riskConfig: {
          maxDrawdown: 0.2,
          maxDailyDrawdown: 0.1
        },
        simulationConfig: {
          commissionBps: 2,
          slippageBps: 1
        },
        symbols: ['BTCUSDT']
      };
      const stats = await runTest(testConfig, candles);
      resultsSummary.push({
        strategy: strategy.name,
        interval: interval.name,
        bestParams,
        initialCapital: testConfig.initialCapital,
        profit: stats.netProfit || 0,
        trades: stats.trades || 0,
        sharpe: stats.sharpeRatio || 0
      });
      console.log(`Najlepsze parametry:`, bestParams);
      console.log(`Podsumowanie: Kapitał startowy: ${testConfig.initialCapital}, Zysk: ${stats.netProfit}, Liczba transakcji: ${stats.trades}, Sharpe: ${stats.sharpeRatio}`);
    }
  }
  // Zapisz zbiorcze podsumowanie do pliku JSON
  fs.writeFileSync('optuna_summary.json', JSON.stringify(resultsSummary, null, 2), 'utf-8');
  console.log('\n=== Zbiorcze podsumowanie zapisane do optuna_summary.json ===');
} 