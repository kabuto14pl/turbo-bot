// ============================================================================
//  README.md - DOKUMENTACJA PROFESJONALNEGO SYSTEMU OPTYMALIZACJI
//  Ten plik zawiera dokumentację i przykłady użycia zaawansowanych narzędzi
//  do optymalizacji strategii tradingowych.
// ============================================================================

# Profesjonalny System Optymalizacji Strategii Tradingowych

Ten pakiet zawiera zaawansowane narzędzia do optymalizacji, testowania i analizy strategii tradingowych, zaprojektowane zgodnie z profesjonalnymi standardami branżowymi.

## Główne cechy

- **Zaawansowane metryki oceny strategii** - wykraczające poza standardowy Sharpe Ratio
- **Analiza wrażliwości parametrów** - badanie wpływu zmian poszczególnych parametrów na wyniki
- **Walidacja krzyżowa strategii** - wykrywanie i zapobieganie overfittingowi
- **Wielokryterialna optymalizacja** - możliwość optymalizacji pod kątem wielu metryk jednocześnie
- **Wizualizacja wyników** - interaktywne wykresy i raporty do analizy
- **Symulacje Monte Carlo** - badanie stabilności strategii w różnych warunkach rynkowych

## Moduły systemu

### 1. Extended Metrics (`analytics/extended_metrics.ts`)

Rozszerzone metryki do oceny strategii tradingowych, w tym:

- **Sharpe Ratio** - klasyczna miara relacji zysku do zmienności
- **Sortino Ratio** - uwzględnia tylko negatywną zmienność (downside risk)
- **Calmar Ratio** - relacja zysku do maksymalnego drawdownu
- **Expectancy** - oczekiwana wartość transakcji
- **Profit Factor** - stosunek zysków do strat
- **Recovery Factor** - zdolność strategii do odrabiania strat
- **Drawdown Statistics** - szczegółowa analiza spadków kapitału

```typescript
import { calculateExtendedMetrics } from './analytics/extended_metrics';

// Obliczenie rozszerzonych metryk dla strategii
const metrics = calculateExtendedMetrics(trades);
console.log(`Sharpe Ratio: ${metrics.sharpeRatio}`);
console.log(`Sortino Ratio: ${metrics.sortinoRatio}`);
console.log(`Calmar Ratio: ${metrics.calmarRatio}`);
console.log(`Max Drawdown: ${metrics.maxDrawdown * 100}%`);
```

### 2. Parameter Sensitivity Analysis (`analytics/parameter_sensitivity.ts`)

Analiza wpływu zmian poszczególnych parametrów na wyniki strategii:

```typescript
import { analyzeParameterSensitivity, generateSensitivityVisualization } from './analytics/parameter_sensitivity';

// Konfiguracja analizy wrażliwości dla parametru RSI Period
const config = {
  paramName: 'rsiPeriod',
  range: { min: 5, max: 25, step: 1 },
  otherParams: { overbought: 70, oversold: 30 },
  strategyName: 'RSITurbo',
  backtestFn: async (params) => {
    // Funkcja wykonująca backtest dla danych parametrów
    // i zwracająca wyniki
  }
};

// Wykonanie analizy
const result = await analyzeParameterSensitivity(config);

// Generowanie wizualizacji
generateSensitivityVisualization(result, './results', 'RSITurbo');
```

### 3. Cross Validation (`analytics/cross_validation.ts`)

Walidacja krzyżowa do oceny stabilności strategii i zapobiegania overfittingowi:

```typescript
import { runCrossValidation } from './analytics/cross_validation';

// Konfiguracja walidacji krzyżowej
const config = {
  startDate: new Date('2022-01-01'),
  endDate: new Date('2022-12-31'),
  folds: 5,
  strategyName: 'SuperTrend',
  strategyParams: { period: 10, multiplier: 3 },
  backtestFn: async (params, startDate, endDate) => {
    // Funkcja wykonująca backtest dla danych parametrów i zakresu dat
    // i zwracająca wyniki
  }
};

// Wykonanie walidacji krzyżowej
const results = await runCrossValidation(config, './results');
```

### 4. Professional Optimizer (`analytics/professional_optimizer.ts`)

Zaawansowany optymalizator strategii z możliwością optymalizacji pod kątem wielu metryk:

```typescript
import { optimizeStrategy, OptimizationMetric } from './analytics/professional_optimizer';

// Konfiguracja optymalizacji
const config = {
  strategyName: 'SuperTrend',
  parameterSpace: {
    'period': { min: 5, max: 20, step: 1 },
    'multiplier': { min: 1, max: 5, step: 0.5 }
  },
  primaryMetric: OptimizationMetric.BALANCED_METRIC,
  secondaryMetrics: [
    OptimizationMetric.SHARPE_RATIO,
    OptimizationMetric.CALMAR_RATIO
  ],
  walkForward: {
    enabled: true,
    inSampleSize: 30, // 30 dni
    outSampleSize: 10, // 10 dni
    windowCount: 3
  },
  backtestFn: async (params) => {
    // Funkcja wykonująca backtest dla danych parametrów
    // i zwracająca wyniki
  },
  maxIterations: 100,
  resultsDir: './results'
};

// Uruchomienie optymalizacji
await optimizeStrategy(config);
```

### 5. Optimization Visualizer (`analytics/optimization_visualizer.ts`)

Wizualizacja wyników optymalizacji w postaci interaktywnych wykresów HTML:

```typescript
import { generateOptimizationVisualizations } from './analytics/optimization_visualizer';

// Generowanie wizualizacji wyników optymalizacji
generateOptimizationVisualizations(results, './results', 'SuperTrend');
```

## Przykłady użycia

Pełne przykłady użycia systemu można znaleźć w pliku `examples/advanced_optimizer_example.ts`.

## Najlepsze praktyki optymalizacji strategii

1. **Użyj wielu metryk** - nie optymalizuj tylko pod kątem jednej metryki (np. Sharpe Ratio)
2. **Wykonaj walidację krzyżową** - aby uniknąć overfittingu
3. **Analizuj wrażliwość parametrów** - aby zrozumieć, które parametry mają największy wpływ
4. **Testuj na różnych instrumentach i timeframe'ach** - aby potwierdzić uniwersalność strategii
5. **Wykorzystaj symulacje Monte Carlo** - aby zbadać stabilność strategii w różnych warunkach rynkowych
6. **Uwzględnij koszty transakcyjne** - aby uzyskać realistyczne wyniki
7. **Przeprowadź walk-forward testing** - aby symulować rzeczywiste warunki rynkowe

## Rozwijanie systemu

System można rozbudować o:

- Dodatkowe metryki i algorytmy optymalizacji
- Integrację z API giełd do testowania na żywo
- Rozbudowę systemu raportowania i wizualizacji
- Implementację modeli uczenia maszynowego do optymalizacji parametrów
