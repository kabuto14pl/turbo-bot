# 🔧 [DEVELOPMENT-TOOL]
# Python development tool for optimization and metrics
from scipy.stats import skew, kurtosis
import optuna
import json
import sys
import random
import datetime

# TODO: Podłącz swój silnik backtestu tutaj
# from your_backtest_module import run_backtest

def run_backtest(strategy, params, interval):
    # MOCK: generuj losowe transakcje
    trades = []
    for _ in range(random.randint(10, 100)):
        entry = random.uniform(50000, 60000)
        exit = entry + random.uniform(-5000, 5000)
        pnl = exit - entry
        trades.append({
            "date": str(datetime.date(2025, random.randint(1,12), random.randint(1,28))),
            "entry_price": entry,
            "exit_price": exit,
            "pnl": pnl
        })
    pnl_series = [t["pnl"] for t in trades]
    stats = {
        "net_profit": sum(pnl_series),
        "total_trades": len(trades),
        "winning_trades": sum(1 for p in pnl_series if p > 0),
        "losing_trades": sum(1 for p in pnl_series if p < 0),
        "avg_profit": sum(p for p in pnl_series if p > 0) / max(1, sum(1 for p in pnl_series if p > 0)),
        "avg_loss": sum(p for p in pnl_series if p < 0) / max(1, sum(1 for p in pnl_series if p < 0)),
        "max_profit": max(pnl_series) if pnl_series else 0,
        "max_loss": min(pnl_series) if pnl_series else 0,
        "profit_factor": abs(sum(p for p in pnl_series if p > 0) / sum(p for p in pnl_series if p < 0)) if sum(p for p in pnl_series if p < 0) != 0 else 0,
        "expectancy": sum(pnl_series) / len(pnl_series) if pnl_series else 0,
        "skew": float(skew(pnl_series)) if len(pnl_series) > 2 else 0,
        "kurtosis": float(kurtosis(pnl_series)) if len(pnl_series) > 2 else 0,
        "pnl_series": pnl_series,
        "top_profit_trades": sorted(trades, key=lambda t: t["pnl"], reverse=True)[:5],
        "top_loss_trades": sorted(trades, key=lambda t: t["pnl"])[:5],
        "interval": interval
    }
    return stats

def get_param_space(strategy, trial):
    if strategy == "RSITurbo":
        return {
            'rsi': trial.suggest_int('rsi', 10, 30),
            'oversold': trial.suggest_int('oversold', 20, 40),
            'overbought': trial.suggest_int('overbought', 60, 80),
            'atr_mul': trial.suggest_float('atr_mul', 1.0, 3.0),
        }
    elif strategy == "SuperTrend":
        return {
            'period': trial.suggest_int('period', 7, 21),
            'multiplier': trial.suggest_float('multiplier', 2.0, 5.0),
        }
    elif strategy == "MACrossover":
        return {
            'fast': trial.suggest_int('fast', 5, 20),
            'slow': trial.suggest_int('slow', 21, 50),
        }
    elif strategy == "MomentumConfirm":
        return {
            'macdFast': trial.suggest_int('macdFast', 8, 20),
            'macdSlow': trial.suggest_int('macdSlow', 30, 50),
            'macdSignal': trial.suggest_int('macdSignal', 5, 15),
        }
    elif strategy == "MomentumPro":
        return {
            'rocPeriod': trial.suggest_int('rocPeriod', 5, 20),
            'rsiPeriod': trial.suggest_int('rsiPeriod', 10, 20),
            'overbought': trial.suggest_int('overbought', 60, 80),
            'oversold': trial.suggest_int('oversold', 20, 40),
        }
    elif strategy == "EnhancedRSITurbo":
        return {
            'rsiPeriod': trial.suggest_int('rsiPeriod', 10, 20),
            'overbought': trial.suggest_int('overbought', 60, 80),
            'oversold': trial.suggest_int('oversold', 20, 40),
            'rsiSmoothing': trial.suggest_int('rsiSmoothing', 1, 5),
            'trendFilter': trial.suggest_int('trendFilter', 0, 2),
        }
    elif strategy == "AdvancedAdaptive":
        return {
            'rsiPeriod': trial.suggest_int('rsiPeriod', 10, 20),
            'rsiOversold': trial.suggest_int('rsiOversold', 20, 40),
            'rsiOverbought': trial.suggest_int('rsiOverbought', 60, 80),
            'emaShortPeriod': trial.suggest_int('emaShortPeriod', 10, 50),
            'emaLongPeriod': trial.suggest_int('emaLongPeriod', 100, 300),
            'adxPeriod': trial.suggest_int('adxPeriod', 10, 20),
            'atrPeriod': trial.suggest_int('atrPeriod', 10, 20),
            'atrMultiplier': trial.suggest_float('atrMultiplier', 1.0, 3.0),
        }
    else:
        raise ValueError(f"Unknown strategy: {strategy}")

def objective(trial):
    strategy = sys.argv[1]
    interval = sys.argv[2] if len(sys.argv) > 2 else 'm15'
    params = get_param_space(strategy, trial)
    stats = run_backtest(strategy, params, interval)
    for k, v in stats.items():
        if k != "pnl_series":
            trial.set_user_attr(k, v)
    return stats['expectancy'] if 'expectancy' in stats else stats['net_profit']

if __name__ == '__main__':
    strategy = sys.argv[1]
    interval = sys.argv[2] if len(sys.argv) > 2 else 'm15'
    study = optuna.create_study(direction='maximize')
    study.optimize(objective, n_trials=100)
    best = study.best_trial
    output = {
      "strategy": strategy,
      "interval": interval,
      "best_params": best.params,
      "best_sharpe": best.value,
      "net_profit": best.user_attrs["net_profit"],
      "total_trades": best.user_attrs["total_trades"],
      "winning_trades": best.user_attrs["winning_trades"],
      "losing_trades": best.user_attrs["losing_trades"],
      "avg_profit": best.user_attrs["avg_profit"],
      "avg_loss": best.user_attrs["avg_loss"],
      "max_profit": best.user_attrs["max_profit"],
      "max_loss": best.user_attrs["max_loss"],
      "profit_factor": best.user_attrs["profit_factor"],
      "expectancy": best.user_attrs["expectancy"],
      "skew": best.user_attrs["skew"],
      "kurtosis": best.user_attrs["kurtosis"],
      "top_profit_trades": best.user_attrs["top_profit_trades"],
      "top_loss_trades": best.user_attrs["top_loss_trades"]
    }
    print(json.dumps(output, indent=2)) 