"""
TURBO-BOT Full Pipeline Backtest — CLI Runner & Reporting
Run with: python3 -m backtest_pipeline.runner
"""

import os
import sys
import json
import pandas as pd
import numpy as np
from datetime import datetime

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backtest_pipeline.engine import FullPipelineEngine
from backtest_pipeline.gpu_native_engine import GpuNativeBacktestEngine
from backtest_pipeline import config
from backtest_pipeline.quantum_backend import SUPPORTED_QUANTUM_BACKENDS
from backtest_pipeline.pair_config import (
    get_pair_overrides, get_pair_capital, get_active_pairs,
    apply_pair_overrides, restore_config, PORTFOLIO_CAPITAL,
    PAIR_CAPITAL_ALLOCATION,
)

DATA_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), 'ml-service', 'data')
# Fallback: try relative to this file
if not os.path.exists(DATA_DIR):
    DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), '..', 'results')

FAST_PROFILE_OVERRIDES = {
    'XGBOOST_RETRAIN_INTERVAL': lambda: getattr(config, 'XGBOOST_RETRAIN_INTERVAL_FAST', config.XGBOOST_RETRAIN_INTERVAL),
    'LLM_ENABLED': lambda: False,
    'SENTIMENT_ENABLED': lambda: False,
    'QAOA_WEIGHT_INTERVAL': lambda: max(getattr(config, 'QAOA_WEIGHT_INTERVAL', 30), 60),
    'QMC_SIM_INTERVAL': lambda: max(getattr(config, 'QMC_SIM_INTERVAL', 15), 30),
    'QRA_RISK_INTERVAL': lambda: max(getattr(config, 'QRA_RISK_INTERVAL', 10), 20),
}

RUNTIME_PARITY_OVERRIDES = {
    'PIPELINE_GATE_PROFILE': lambda: 'runtime_parity',
}


def build_engine(initial_capital=None, symbol='BTCUSDT', quantum_backend='simulated', quantum_backend_options=None):
    engine_cls = GpuNativeBacktestEngine if getattr(config, 'GPU_NATIVE_ENGINE', False) else FullPipelineEngine
    if engine_cls is GpuNativeBacktestEngine:
        print("  🚧 Using GPU-native experimental engine")
    return engine_cls(
        initial_capital=initial_capital,
        symbol=symbol,
        quantum_backend=quantum_backend,
        quantum_backend_options=quantum_backend_options,
    )


def _quantum_backend_short(backend):
    mapping = {
        'simulated': 'SIM',
        'remote-gpu': 'GPU',
        'hybrid-verify': 'HYB',
    }
    return mapping.get(backend, str(backend or '?')[:3].upper())


def _format_quantum_summary(summary):
    if not summary:
        return None

    backend = summary.get('backend', 'simulated')
    parts = [f"backend={backend}"]

    if summary.get('remote_enabled'):
        parts.append(f"remote={summary.get('remote_status', 'unknown')}")
        parts.append(f"calls={summary.get('remote_calls_total', 0)}")
        parts.append(f"failures={summary.get('remote_failures', 0)}")

    if summary.get('verify_enabled') and summary.get('verify_samples_total', 0) > 0:
        qmc_rate = summary.get('verify_qmc_match_rate')
        regime_rate = summary.get('verify_regime_match_rate')
        qaoa_corr = summary.get('verify_avg_qaoa_corr')
        if qmc_rate is not None:
            parts.append(f"qmc={qmc_rate * 100:.1f}%")
        if regime_rate is not None:
            parts.append(f"regime={regime_rate * 100:.1f}%")
        if qaoa_corr is not None:
            parts.append(f"qaoa={qaoa_corr}")

    return ' | '.join(parts)


def load_data(timeframe):
    """Load BTCUSDT data for given timeframe."""
    # Try multiple paths
    paths = [
        os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv'),
        os.path.join(os.path.dirname(__file__), '..', 'data', f'btcusdt_{timeframe}.csv'),
    ]
    for path in paths:
        if os.path.exists(path):
            df = pd.read_csv(path, index_col='datetime', parse_dates=True)
            return df
    print(f"❌ Data not found for {timeframe}. Tried: {paths}")
    return None


def print_results(results, verbose=True):
    """Print formatted results."""
    tf = results.get('timeframe', '?')
    
    print(f"\n{'═'*90}")
    print(f"  TURBO-BOT v6.0.0 — FULL PIPELINE BACKTEST — {tf}")
    print(f"{'═'*90}")
    
    if results.get('error'):
        print(f"  ❌ ERROR: {results['error']}")
        return
        
    if results.get('total_trades', 0) == 0:
        print(f"  ⚠️  No trades generated")
        q_line = _format_quantum_summary(results.get('quantum_summary'))
        if q_line:
            print(f"  ⚛️  {q_line}")
        if results.get('blocked_reasons'):
            print(f"\n  Blocked reasons:")
            for reason, count in sorted(results['blocked_reasons'].items(), 
                                       key=lambda x: -x[1])[:10]:
                print(f"    {count:>5}× {reason}")
        return
    
    # === CORE METRICS ===
    emoji = '✅' if results['net_profit'] > 0 else '❌'
    print(f"\n  {emoji} NET RESULT: ${results['net_profit']:>+10.2f} "
          f"({results['total_return_pct']:>+.2f}%)")
    print(f"  📊 Data: {results['data_candles']} candles, {results['data_days']} days")
    print(f"  📅 Range: {results['data_range']}")
    
    print(f"\n  {'─'*70}")
    print(f"  {'Metric':<25} {'Value':>15}  {'Metric':<25} {'Value':>15}")
    print(f"  {'─'*70}")
    print(f"  {'Total Trades':<25} {results['total_trades']:>15}  "
          f"{'Trades/Day':<25} {results['trades_per_day']:>15.1f}")
    print(f"  {'Win Rate':<25} {results['win_rate']:>14.1f}%  "
          f"{'Profit Factor':<25} {results['profit_factor']:>15.3f}")
    print(f"  {'Sharpe Ratio':<25} {results['sharpe_ratio']:>15.3f}  "
          f"{'Max Drawdown':<25} {results['max_drawdown']:>14.2f}%")
    print(f"  {'Avg Win':<25} ${results['avg_win']:>14.2f}  "
          f"{'Avg Loss':<25} ${results['avg_loss']:>14.2f}")
    print(f"  {'W/L Ratio':<25} {results['win_loss_ratio']:>15.2f}  "
          f"{'Avg Hold (h)':<25} {results['avg_hold_hours']:>15.1f}")
    print(f"  {'Largest Win':<25} ${results['largest_win']:>14.2f}  "
          f"{'Largest Loss':<25} ${results['largest_loss']:>14.2f}")
    print(f"  {'Total Fees':<25} ${results['total_fees']:>14.2f}  "
          f"{'Fees % of PnL':<25} {results['fees_pct_of_pnl']:>14.1f}%")
    print(f"  {'Wasted Winners':<25} {results['wasted_winners']:>15}  "
          f"{'Wasted %':<25} {results['wasted_pct']:>14.1f}%")
    
    # === DIRECTIONAL ===
    print(f"\n  📈 LONG:  {results['long_trades']:>4} trades | "
          f"WR={results['long_win_rate']:>5.1f}% | PnL=${results['long_pnl']:>+10.2f}")
    print(f"  📉 SHORT: {results['short_trades']:>4} trades | "
          f"WR={results['short_win_rate']:>5.1f}% | PnL=${results['short_pnl']:>+10.2f}")
    
    # === EXIT REASONS ===
    print(f"\n  🚪 EXIT REASONS:")
    exit_r = results.get('exit_reasons', {})
    total_exits = sum(exit_r.values()) if exit_r else 1
    for reason, count in sorted(exit_r.items(), key=lambda x: -x[1]):
        pct = count / total_exits * 100
        print(f"    {reason:<18} {count:>5} ({pct:>5.1f}%)")
    
    # === PHASE EXITS ===
    if results.get('phase_exits'):
        print(f"\n  🔄 TRAIL PHASE AT EXIT:")
        for phase, count in sorted(results['phase_exits'].items()):
            print(f"    {phase:<18} {count:>5}")
    
    # === REGIME ANALYSIS ===
    if results.get('regime_trades'):
        print(f"\n  🌡️  REGIME PERFORMANCE:")
        print(f"  {'Regime':<20} {'Trades':>7} {'WR':>7} {'PnL':>12}")
        print(f"  {'─'*50}")
        for regime, data in sorted(results['regime_trades'].items()):
            emoji_r = '✅' if data['pnl'] > 0 else '❌'
            print(f"  {emoji_r} {regime:<18} {data['count']:>7} "
                  f"{data['win_rate']:>6.1f}% ${data['pnl']:>+10.2f}")
    
    if not verbose:
        return
    
    # === REGIME DISTRIBUTION ===
    if results.get('regime_distribution'):
        print(f"\n  📊 REGIME DISTRIBUTION:")
        for regime, pct in results['regime_distribution'].items():
            bar = '█' * int(pct / 2)
            print(f"    {regime:<20} {pct:>5.1f}% {bar}")
    
    # === COMPONENT STATS ===
    print(f"\n  {'═'*70}")
    print(f"  🧩 COMPONENT IMPACT ANALYSIS")
    print(f"  {'═'*70}")
    
    # Ensemble
    ens = results.get('ensemble_stats', {})
    print(f"\n  📊 ENSEMBLE VOTING:")
    print(f"    Consensus rate:   {ens.get('consensus_rate', 0):>6.1f}%")
    print(f"    Conflicts:        {ens.get('conflicts', 0):>6}")
    if ens.get('current_weights'):
        print(f"    Final weights:    ", end='')
        for name, w in sorted(ens['current_weights'].items(), key=lambda x: -x[1]):
            print(f"{name}={w:.2f} ", end='')
        print()
    
    # Quantum
    q = results.get('quantum_stats', {})
    q_summary = results.get('quantum_summary', {})
    print(f"\n  ⚛️  QUANTUM PIPELINE:")
    print(f"    Backend:          {q_summary.get('backend', q.get('backend', results.get('quantum_backend', 'simulated')))}")
    print(f"    QDV pass rate:    {q.get('qdv_pass_rate', 0):>6.1f}%")
    print(f"    QDV verified:     {q.get('qdv_verified', 0):>6}")
    print(f"    QDV rejected:     {q.get('qdv_rejected', 0):>6}")
    print(f"    QMC bullish:      {q.get('qmc_bullish', 0):>6}")
    print(f"    QMC bearish:      {q.get('qmc_bearish', 0):>6}")
    print(f"    Last QRA risk:    {q.get('last_qra_score', 0):>6}")
    if q_summary.get('remote_enabled'):
        print(f"    Remote URL:       {q_summary.get('remote_url')}")
        print(f"    Remote status:    {q_summary.get('remote_status', 'unknown')}")
        print(f"    Remote calls:     QMC={q.get('remote_qmc_calls', 0)} QAOA={q.get('remote_qaoa_calls', 0)} VQC={q.get('remote_vqc_calls', 0)}")
        print(f"    Remote failures:  {q_summary.get('remote_failures', 0):>6}")
        print(f"    Remote fail rate: {q_summary.get('remote_failure_rate', 0):>6.2%}")
        print(f"    Avg remote ms:    QMC={q_summary.get('remote_avg_qmc_ms')} QAOA={q_summary.get('remote_avg_qaoa_ms')} VQC={q_summary.get('remote_avg_vqc_ms')}")
    if q_summary.get('verify_enabled') and q_summary.get('verify_samples_total', 0) > 0:
        print(f"    Verify sample:    {q_summary.get('verify_sample_rate', 0):>6.2f}")
        print(f"    Verify QMC:       {q.get('verify_qmc_match_rate', 0):>6.2%} ({q.get('verify_qmc_samples', 0)} samples)")
        print(f"    Verify Regime:    {q.get('verify_regime_match_rate', 0):>6.2%} ({q.get('verify_regime_samples', 0)} samples)")
        print(f"    Verify QAOA:      {q.get('verify_avg_qaoa_corr', 0)} ({q.get('verify_qaoa_samples', 0)} samples)")
    
    # ML
    ml = results.get('ml_stats', {})
    print(f"\n  🧠 ML SYSTEM:")
    print(f"    Accuracy:         {ml.get('overall_accuracy', 0):>6.1f}%")
    print(f"    Recent accuracy:  {ml.get('recent_accuracy', 0):>6.1f}%")
    print(f"    Hard vetoes:      {ml.get('veto_hard', 0):>6}")
    print(f"    Soft vetoes:      {ml.get('veto_soft', 0):>6}")
    
    # PATCH #58: XGBoost stats
    xgb = results.get('xgboost_stats', {})
    if xgb:
        print(f"\n  🚀 XGBOOST ML (PATCH #58):")
        print(f"    Engine:           {xgb.get('engine', 'N/A'):>12}")
        print(f"    Accuracy:         {xgb.get('overall_accuracy', 0):>6.1f}%")
        print(f"    Recent accuracy:  {xgb.get('recent_accuracy', 0):>6.1f}%")
        print(f"    Retrain count:    {xgb.get('retrain_count', 0):>6}")
        print(f"    Features:         {xgb.get('features_count', 0):>6}")
        print(f"    GPU requested:    {xgb.get('gpu_requested', xgb.get('gpu_enabled', False))}")
        print(f"    GPU enabled:      {xgb.get('gpu_enabled', False)}")
        if xgb.get('cv_scores'):
            print(f"    CV scores:        {xgb['cv_scores']}")
        if xgb.get('top_features'):
            top = list(xgb['top_features'].items())[:5]
            print(f"    Top features:     {', '.join(f'{k}={v:.3f}' for k,v in top)}")
    
    # PATCH #58: LLM stats
    llm = results.get('llm_stats', {})
    if llm:
        print(f"\n  🤖 LLM OVERRIDE (PATCH #58):")
        print(f"    Enabled:          {llm.get('enabled', False)}")
        print(f"    Available:        {llm.get('is_available', False)}")
        print(f"    Agreement rate:   {llm.get('agreement_rate', 0):>6.1f}%")
        print(f"    Vetoes:           {llm.get('vetoes', 0):>6}")
        print(f"    Boosts:           {llm.get('boosts', 0):>6}")
        print(f"    Fallback used:    {llm.get('fallback_used', 0):>6}")
        print(f"    Cache hits:       {llm.get('cache_hits', 0):>6}")
    
    # PATCH #58: Sentiment stats
    sent = results.get('sentiment_stats', {})
    if sent:
        print(f"\n  💭 SENTIMENT (PATCH #58):")
        print(f"    Avg sentiment:    {sent.get('avg_sentiment', 0):>+7.4f}")
        print(f"    Signal boosts:    {sent.get('signal_boosts', 0):>6}")
        print(f"    Signal dampens:   {sent.get('signal_dampens', 0):>6}")
        print(f"    Vetoes:           {sent.get('vetoes', 0):>6}")
        if sent.get('regime_distribution'):
            print(f"    Regime dist:      ", end='')
            for regime, pct in sorted(sent['regime_distribution'].items()):
                if pct > 0:
                    print(f"{regime}={pct:.0f}% ", end='')
            print()
    
    # PATCH #59: Entry Quality stats
    eq = results.get('entry_quality_stats', {})
    if eq:
        print(f"\n  📍 ENTRY QUALITY FILTER (PATCH #59):")
        print(f"    S/R boosts:       {eq.get('sr_boosts', 0):>6}")
        print(f"    S/R penalties:    {eq.get('sr_penalties', 0):>6}")
        print(f"    S/R blocks:       {eq.get('sr_blocks', 0):>6}")
        print(f"    Volume confirms:  {eq.get('volume_confirms', 0):>6}")
        print(f"    MTF aligns:       {eq.get('mtf_aligns', 0):>6}")
        print(f"    MTF conflicts:    {eq.get('mtf_conflicts', 0):>6}")
        total_eval = eq.get('total_evaluated', 0)
        if total_eval > 0:
            boost_rate = eq.get('sr_boosts', 0) / total_eval * 100
            block_rate = eq.get('sr_blocks', 0) / total_eval * 100
            print(f"    Boost rate:       {boost_rate:>5.1f}%")
            print(f"    Block rate:       {block_rate:>5.1f}%")
    
    # PATCH #62: Price Action stats
    pa = results.get('price_action_stats', {})
    if pa:
        print(f"\n  🎯 PRICE ACTION ENGINE (PATCH #62):")
        print(f"    Total analyzed:   {pa.get('total_analyzed', 0):>6}")
        print(f"    Pullback entries: {pa.get('pullback_entries', 0):>6}")
        print(f"    Rejection entries:{pa.get('rejection_entries', 0):>6}")
        print(f"    Breakout entries: {pa.get('breakout_entries', 0):>6}")
        print(f"    No-pattern:       {pa.get('no_pa_entries', 0):>6}")
        print(f"    S/R boosts:       {pa.get('sr_boosts', 0):>6}")
        print(f"    S/R rejections:   {pa.get('sr_rejections', 0):>6}")
        print(f"    Bullish struct:   {pa.get('bullish_structure', 0):>6}")
        print(f"    Bearish struct:   {pa.get('bearish_structure', 0):>6}")
        print(f"    Ranging struct:   {pa.get('ranging_structure', 0):>6}")
        total_pa = pa.get('total_analyzed', 0)
        if total_pa > 0:
            pullback_rate = pa.get('pullback_entries', 0) / total_pa * 100
            rejection_rate = pa.get('rejection_entries', 0) / total_pa * 100
            print(f"    PA-pattern rate:  {(pullback_rate + rejection_rate):>5.1f}%")
    
    # PATCH #63: Long trend filter stats
    long_filtered = results.get('long_trend_filtered', 0)
    if long_filtered > 0:
        print(f"\n  📊 LONG TREND FILTER (PATCH #63):")
        print(f"    Longs penalized:  {long_filtered:>6}")
    
    # NeuronAI
    n = results.get('neuron_stats', {})
    print(f"\n  🤖 NEURON AI:")
    print(f"    Overrides:        {n.get('overrides', 0):>6}")
    print(f"    Loss streak max:  {n.get('loss_streak_max', 0):>6}")
    print(f"    Evolutions:       {n.get('evolution_count', 0):>6}")
    print(f"    Risk multiplier:  {n.get('risk_multiplier', 1):>6.3f}")
    print(f"    Aggression:       {n.get('aggression', 1):>6.3f}")
    print(f"    Conf threshold:   {n.get('confidence_threshold', 0.35):>6.3f}")
    if n.get('prime_rejections'):
        print(f"    PRIME rejections:")
        for rule, count in n['prime_rejections'].items():
            if count > 0:
                print(f"      {rule:<20} {count:>5}")
    
    # QPM
    print(f"\n  🎯 QPM (Quantum Position Manager):")
    print(f"    SL/TP adjustments: {results.get('qpm_adjustments', 0):>5}")
    print(f"    Partials executed: {results.get('partials_executed', 0):>5}")
    print(f"    Avg health score:  {results.get('avg_health_score', 0):>5.1f}")
    
    # PATCH #65: Signal-level metrics
    signal_count = results.get('signal_count', 0)
    if signal_count > 0:
        print(f"\n  📊 SIGNAL-LEVEL ANALYSIS (PATCH #65):")
        print(f"    Unique signals:   {signal_count:>6}")
        print(f"    Signal WR:        {results.get('signal_win_rate', 0):>5.1f}%")
        print(f"    Signal W/L:       {results.get('signal_wl_ratio', 0):>6.2f}")
        print(f"    Sig avg win:      ${results.get('signal_avg_win', 0):>+9.2f}")
        print(f"    Sig avg loss:     ${results.get('signal_avg_loss', 0):>9.2f}")
        print(f"    Trades/signal:    {results.get('total_trades', 0) / max(signal_count, 1):>6.1f}")
    
    # PATCH #65: Momentum gate stats
    mom_checked = results.get('momentum_gate_checked', 0)
    mom_tightened = results.get('momentum_gate_tightened', 0)
    if mom_checked > 0:
        print(f"\n  ⚡ MOMENTUM GATE (PATCH #65):")
        print(f"    Positions checked: {mom_checked:>5}")
        print(f"    SL tightened:      {mom_tightened:>5} ({mom_tightened/max(mom_checked,1)*100:.0f}%)")
    
    # PATCH #65: RANGING micro-scalp stats
    ranging_opened = results.get('ranging_trades_opened', 0)
    if ranging_opened > 0:
        print(f"\n  📊 RANGING MICRO-SCALP (PATCH #65):")
        print(f"    Ranging entries:   {ranging_opened:>5}")
    
    # PATCH #66: Pre-entry momentum stats
    pre_entry_blocked = results.get('pre_entry_momentum_blocked', 0)
    if pre_entry_blocked > 0:
        print(f"\n  ⚡ PRE-ENTRY MOMENTUM (PATCH #66):")
        print(f"    Entries blocked:   {pre_entry_blocked:>5}")
    
    # PATCH #67: Grid Ranging stats
    grid_trades_count = results.get('grid_trades', 0)
    if grid_trades_count > 0:
        print(f"\n  🔲 GRID RANGING STRATEGY (PATCH #67):")
        print(f"    Grid trades:       {grid_trades_count:>5}")
    
    # PATCH #67: Volatility Pause stats
    vol_pause_triggered = results.get('volatility_pause_triggered', 0)
    vol_pause_active = results.get('volatility_pause_active', False)
    consec_losses = results.get('consecutive_losses_final', 0)
    if vol_pause_triggered > 0 or consec_losses > 0:
        print(f"\n  ⏸️  VOLATILITY PAUSE (PATCH #67):")
        print(f"    Times triggered:   {vol_pause_triggered:>5}")
        print(f"    Currently active:  {'YES' if vol_pause_active else 'NO':>5}")
        print(f"    Consec losses end: {consec_losses:>5}")
    
    # PATCH #67: L3 Partial stats
    l3_exits = results.get('exit_reasons', {}).get('PARTIAL_L3', 0)
    if l3_exits > 0:
        print(f"\n  💰 L3 PARTIAL (PATCH #67):")
        print(f"    L3 takes:          {l3_exits:>5}")
    
    # PATCH #68: RANGING Bypass + Dynamic SL + Adaptive Sizing
    if results.get('ranging_bypass_enabled', False):
        print(f"\n  🔓 RANGING BYPASS (PATCH #68):")
        print(f"    Grid trades:       {results.get('grid_trades', 0):>5}")
        print(f"    RANGING trades:    {results.get('ranging_trades_opened', 0):>5}")
    if results.get('dynamic_sl_enabled', False):
        print(f"\n  🎯 DYNAMIC SL (PATCH #68):")
        print(f"    Avg SL loss:       ${abs(results.get('avg_loss', 0)):>7.2f}")
    adaptive_mult = results.get('adaptive_size_mult_final', 1.0)
    if adaptive_mult != 1.0:
        print(f"\n  📊 ADAPTIVE SIZING (PATCH #68):")
        print(f"    Final multiplier:  {adaptive_mult:>5.3f}")
    
    # Blocked
    if results.get('blocked_reasons'):
        print(f"\n  🚫 BLOCKED TRADES ({results.get('total_blocked', 0)} total):")
        for reason, count in sorted(results['blocked_reasons'].items(), 
                                   key=lambda x: -x[1])[:8]:
            print(f"    {count:>5}× {reason}")


def print_trades_table(results):
    """Print full trade-by-trade analysis table."""
    trades = results.get('trades_list', [])
    if not trades:
        print("  No trades to display.")
        return
    
    print(f"\n{'═'*140}")
    print(f"  📋 FULL TRADE-BY-TRADE ANALYSIS ({len(trades)} trades)")
    print(f"{'═'*140}")
    print(f"  {'#':>3} {'Side':<5} {'Entry Time':<20} {'Exit Time':<20} "
          f"{'Entry$':>10} {'Exit$':>10} {'Net PnL':>10} {'Ret%':>8} "
          f"{'Reason':<12} {'Hold(h)':>7} {'MaxR':>6} {'Ph':>3} {'Regime':<15} {'Conf':>5}")
    print(f"  {'─'*137}")
    
    running_pnl = 0
    for t in trades:
        running_pnl += t['net_pnl']
        emoji = '✅' if t['net_pnl'] > 0 else ('⚪' if abs(t['net_pnl']) < 1 else '❌')
        print(f"  {emoji}{t['id']:>2} {t['side']:<5} {t['entry_time'][:19]:<20} {t['exit_time'][:19]:<20} "
              f"${t['entry_price']:>9.2f} ${t['exit_price']:>9.2f} ${t['net_pnl']:>+9.2f} "
              f"{t['return_pct']:>+7.3f}% {t['reason']:<12} {t['hold_hours']:>7.2f} "
              f"{t['max_r']:>6.3f} {t['phase']:>3} {t['regime']:<15} {t['confidence']:>5.3f}")
    
    print(f"  {'─'*137}")
    print(f"  {'':>3} {'':5} {'':20} {'TOTAL':>20} "
          f"{'':>10} {'':>10} ${running_pnl:>+9.2f}")
    
    # Summary by exit reason
    print(f"\n  📊 PnL BY EXIT REASON:")
    reason_pnl = {}
    reason_count = {}
    for t in trades:
        r = t['reason']
        reason_pnl[r] = reason_pnl.get(r, 0) + t['net_pnl']
        reason_count[r] = reason_count.get(r, 0) + 1
    
    for r, pnl in sorted(reason_pnl.items(), key=lambda x: -x[1]):
        avg = pnl / reason_count[r]
        emoji = '✅' if pnl > 0 else '❌'
        print(f"    {emoji} {r:<15} {reason_count[r]:>3} trades  ${pnl:>+10.2f}  (avg ${avg:>+8.2f})")
    
    # Summary by regime
    print(f"\n  📊 PnL BY REGIME:")
    regime_pnl = {}
    regime_count = {}
    for t in trades:
        r = t['regime']
        regime_pnl[r] = regime_pnl.get(r, 0) + t['net_pnl']
        regime_count[r] = regime_count.get(r, 0) + 1
    
    for r, pnl in sorted(regime_pnl.items(), key=lambda x: -x[1]):
        avg = pnl / regime_count[r]
        emoji = '✅' if pnl > 0 else '❌'
        print(f"    {emoji} {r:<20} {regime_count[r]:>3} trades  ${pnl:>+10.2f}  (avg ${avg:>+8.2f})")
    
    # Top winners and losers
    sorted_trades = sorted(trades, key=lambda x: x['net_pnl'])
    print(f"\n  🏆 TOP 5 WINNERS:")
    for t in sorted_trades[-5:][::-1]:
        if t['net_pnl'] > 0:
            print(f"    #{t['id']:>2} {t['side']:<5} ${t['net_pnl']:>+9.2f} "
                  f"{t['reason']:<12} {t['regime']:<15} MaxR={t['max_r']:.3f}")
    
    print(f"\n  💀 TOP 5 LOSERS:")
    for t in sorted_trades[:5]:
        if t['net_pnl'] < 0:
            print(f"    #{t['id']:>2} {t['side']:<5} ${t['net_pnl']:>+9.2f} "
                  f"{t['reason']:<12} {t['regime']:<15} MaxR={t['max_r']:.3f}")
    
    # Wasted winners (reached R >= 1.0 but closed at loss)
    wasted = [t for t in trades if t['max_r'] >= 1.0 and t['net_pnl'] <= 0]
    if wasted:
        print(f"\n  ⚠️  WASTED WINNERS ({len(wasted)} trades reached R≥1.0 but closed at loss):")
        for t in wasted:
            print(f"    #{t['id']:>2} {t['side']:<5} MaxR={t['max_r']:.3f} → ${t['net_pnl']:>+9.2f} "
                  f"{t['reason']:<12} {t['regime']}")


def export_trades_csv(results, filepath=None):
    """Export all trades to CSV for external analysis."""
    trades = results.get('trades_list', [])
    if not trades:
        return None
    
    if filepath is None:
        os.makedirs(RESULTS_DIR, exist_ok=True)
        filepath = os.path.join(
            RESULTS_DIR,
            f'trades_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
        )
    
    import csv
    with open(filepath, 'w', newline='') as f:
        writer = csv.DictWriter(f, fieldnames=trades[0].keys())
        writer.writeheader()
        writer.writerows(trades)
    
    print(f"\n  💾 Trades CSV exported: {filepath}")
    return filepath


def load_pair_data(symbol, timeframe):
    """Load data for any trading pair."""
    paths = [
        os.path.join(DATA_DIR, f'{symbol.lower()}_{timeframe}.csv'),
        os.path.join(os.path.dirname(__file__), '..', 'data', f'{symbol.lower()}_{timeframe}.csv'),
    ]
    for path in paths:
        if os.path.exists(path):
            df = pd.read_csv(path, index_col='datetime', parse_dates=True)
            return df
    return None


def run_multi_pair(timeframe='15m', verbose=True, show_trades=False, use_pair_config=True, quantum_backend='simulated', quantum_backend_options=None):
    """Run backtest on all available pairs with P#71 per-pair config overrides."""
    if use_pair_config:
        pairs = get_active_pairs()  # Only pairs with capital > 0
    else:
        pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
    all_results = {}
    
    # P#70: Use fast XGBoost retrain for multi-pair (2.5× faster)
    original_retrain = config.XGBOOST_RETRAIN_INTERVAL
    fast_interval = getattr(config, 'XGBOOST_RETRAIN_INTERVAL_FAST', 2000)
    config.XGBOOST_RETRAIN_INTERVAL = fast_interval
    
    print(f"\n{'═'*90}")
    if use_pair_config:
        print(f"  🌍 MULTI-PAIR BACKTEST — P#72 Adaptive+Funding+Grid — {len(pairs)} pairs — {timeframe}")
        print(f"  💰 Portfolio: ${PORTFOLIO_CAPITAL:,} | Allocation: "
              f"{', '.join(f'{p[:3]}={PAIR_CAPITAL_ALLOCATION[p]*100:.0f}%' for p in pairs)}")
    else:
        print(f"  🌍 MULTI-PAIR BACKTEST — {len(pairs)} pairs — {timeframe}")
    print(f"{'═'*90}")
    
    for symbol in pairs:
        df = load_pair_data(symbol, timeframe)
        if df is None:
            print(f"\n  ⚠️  {symbol}: No data available")
            continue
        
        # P#69: Apply pair-specific config overrides
        originals = {}
        pair_capital = config.INITIAL_CAPITAL  # default
        if use_pair_config:
            originals = apply_pair_overrides(symbol)
            pair_capital = get_pair_capital(symbol)
            overrides = get_pair_overrides(symbol)
            if overrides.get('PAIR_BLACKLISTED', False):
                print(f"\n  🚫 {symbol}: BLACKLISTED — skipped")
                restore_config(originals)
                continue
        
        print(f"\n{'─'*80}")
        print(f"  🔄 {symbol} — {len(df)} candles — Capital: ${pair_capital:,.0f}")
        if use_pair_config and overrides:
            key_overrides = {k: v for k, v in overrides.items() 
                          if k not in ('PAIR_BLACKLISTED',)}
            if key_overrides:
                print(f"  ⚙️  Overrides: {', '.join(f'{k}={v}' for k, v in list(key_overrides.items())[:5])}")
        print(f"{'─'*80}")
        
        engine = build_engine(
            initial_capital=pair_capital,
            symbol=symbol,
            quantum_backend=quantum_backend,
            quantum_backend_options=quantum_backend_options,
        )
        results = engine.run(df, timeframe)
        results['symbol'] = symbol
        results['pair_capital'] = pair_capital
        results['quantum_backend'] = quantum_backend
        all_results[symbol] = results
        
        # P#69: Restore config after each pair
        if use_pair_config:
            restore_config(originals)
        
        if results.get('error'):
            print(f"  ❌ {symbol}: {results['error']}")
            continue
        
        trades = results.get('total_trades', 0)
        pf = results.get('profit_factor', 0)
        wr = results.get('win_rate', 0)
        ret = results.get('total_return_pct', 0)
        dd = results.get('max_drawdown', 0)
        emoji = '✅' if results.get('net_profit', 0) > 0 else '❌'
        print(f"  {emoji} {symbol}: {trades} trades | PF {pf:.3f} | WR {wr:.1f}% | "
              f"Return {ret:+.2f}% | MaxDD {dd:.1f}%")
        q_line = _format_quantum_summary(results.get('quantum_summary'))
        if q_line:
            print(f"  ⚛️  {q_line}")
        
        # P#69: Show BNB direction filter stats
        if symbol == 'BNBUSDT':
            bnb_blocked = results.get('bnb_long_blocked', 0)
            bnb_passed = results.get('bnb_long_passed', 0)
            if bnb_blocked > 0 or bnb_passed > 0:
                print(f"  📊 BNB Filter: {bnb_blocked} LONGs blocked, {bnb_passed} LONGs passed")
        
        # P#70: Show BTC direction filter stats
        if symbol == 'BTCUSDT':
            btc_blocked = results.get('btc_long_blocked', 0)
            if btc_blocked > 0:
                print(f"  📊 BTC Filter: {btc_blocked} LONGs blocked (SHORT-only mode)")
        
        # P#71: Show Funding Rate, Grid V2, News Filter stats
        fr_stats = results.get('funding_arb_stats', {})
        if fr_stats.get('funding_collected', 0) != 0 or fr_stats.get('positions_opened', 0) > 0:
            fr_pnl = results.get('funding_arb_pnl', 0)
            print(f"  💰 Funding Arb: ${fr_pnl:+.2f} | {fr_stats.get('positions_opened',0)} positions | "
                  f"{fr_stats.get('settlements_processed',0)} settlements")
        
        grid2_stats = results.get('grid_v2_stats', {})
        if grid2_stats.get('total_trades', 0) > 0:
            g2_trades = results.get('grid_v2_trades', 0)
            print(f"  🔲 Grid V2: {g2_trades} trades | WR {grid2_stats.get('win_rate',0):.1f}% | "
                  f"PnL ${grid2_stats.get('net_pnl',0):+.2f}")
        
        news_stats = results.get('news_filter_stats', {})
        n_events = news_stats.get('total_events_detected', 0)
        if n_events > 0 or results.get('news_blocked', 0) > 0:
            print(f"  📰 News Filter: {results.get('news_blocked',0)} blocked | "
                  f"{n_events} events | {news_stats.get('events_by_type',{})}")
    
    # Aggregate summary
    if len(all_results) > 1:
        # P#70: Restore XGBoost retrain interval
        config.XGBOOST_RETRAIN_INTERVAL = original_retrain
        
        print(f"\n{'═'*90}")
        print(f"  📊 MULTI-PAIR SUMMARY {'(P#72 Adaptive+Funding+Grid)' if use_pair_config else ''}")
        print(f"{'═'*90}")
        print(f"  {'Symbol':<10} {'QB':>4} {'Rmt':>7} {'QChk':>8} {'Capital':>8} {'Trades':>7} {'WR':>7} {'PF':>7} {'Return':>9} "
              f"{'MaxDD':>7} {'NetPnL':>10}")
        print(f"  {'─'*104}")
        
        total_trades = 0
        total_pnl = 0
        total_funding = 0
        total_gv2 = 0
        total_news_blocked = 0
        total_capital = 0
        
        for symbol, r in all_results.items():
            if r.get('error'):
                continue
            t = r.get('total_trades', 0)
            total_trades += t
            pnl = r.get('net_profit', 0)
            fr_pnl = r.get('funding_arb_pnl', 0)
            combined_pnl = pnl + fr_pnl  # P#72: Total PnL = directional + funding
            total_pnl += combined_pnl
            total_funding += fr_pnl
            gv2 = r.get('grid_v2_trades', 0)
            total_gv2 += gv2
            nb = r.get('news_blocked', 0)
            total_news_blocked += nb
            cap = r.get('pair_capital', config.INITIAL_CAPITAL)
            total_capital += cap
            emoji = '✅' if combined_pnl > 0 else '❌'
            combined_return = (combined_pnl / cap * 100) if cap > 0 else 0
            q_summary = r.get('quantum_summary', {})
            q_backend = _quantum_backend_short(q_summary.get('backend', r.get('quantum_backend', 'simulated')))
            remote_status = str(q_summary.get('remote_status', 'n/a')).upper()[:7]
            if q_summary.get('verify_enabled') and q_summary.get('verify_qmc_match_rate') is not None:
                q_check = f"{q_summary.get('verify_qmc_match_rate', 0) * 100:.0f}%"
            elif q_summary.get('remote_enabled'):
                q_check = f"{q_summary.get('remote_failures', 0)}F"
            else:
                q_check = '-'
            print(f"  {emoji} {symbol:<8} {q_backend:>4} {remote_status:>7} {q_check:>8} ${cap:>6,.0f} {t:>7} {r.get('win_rate',0):>6.1f}% "
                  f"{r.get('profit_factor',0):>7.3f} {combined_return:>+8.2f}% "
                  f"{r.get('max_drawdown',0):>6.1f}% ${combined_pnl:>+9.2f}")
        
        print(f"  {'─'*104}")
        emoji_t = '✅' if total_pnl > 0 else '❌'
        portfolio_return = (total_pnl / total_capital * 100) if total_capital > 0 else 0
        print(f"  {emoji_t} {'TOTAL':<8} {'':>4} {'':>7} {'':>8} ${total_capital:>6,.0f} {total_trades:>7} {'':>7} {'':>7} "
              f"{portfolio_return:>+8.2f}% {'':>7} ${total_pnl:>+9.2f}")
    
    return all_results


def run_single(timeframe='15m', verbose=True, show_trades=False, quantum_backend='simulated', quantum_backend_options=None):
    """Run backtest on single timeframe."""
    df = load_data(timeframe)
    if df is None:
        return None
    
    print(f"\n🔄 Running full pipeline backtest on {timeframe}...")
    print(f"   {len(df)} candles, {df.index[0]} → {df.index[-1]}")

    engine = build_engine(quantum_backend=quantum_backend, quantum_backend_options=quantum_backend_options)
    results = engine.run(df, timeframe)
    results['quantum_backend'] = quantum_backend
    
    print_results(results, verbose=verbose)
    
    if show_trades:
        print_trades_table(results)
        export_trades_csv(results)
    
    return results


def run_walk_forward(timeframe='15m', train_pct=0.70, use_pair_config=True, quantum_backend='simulated', quantum_backend_options=None):
    """
    P#70: Walk-forward validation — train on first X% of data, test on remaining.
    Validates that edge persists in unseen data (not just curve-fitted).
    
    Args:
        timeframe: Candle timeframe
        train_pct: Percentage of data for training (default 70%)
        use_pair_config: Use per-pair config overrides
    """
    if use_pair_config:
        pairs = get_active_pairs()
    else:
        pairs = ['BTCUSDT', 'ETHUSDT', 'SOLUSDT', 'BNBUSDT', 'XRPUSDT']
    
    print(f"\n{'═'*90}")
    print(f"  🔬 WALK-FORWARD VALIDATION — Train {train_pct*100:.0f}% / Test {(1-train_pct)*100:.0f}%")
    print(f"{'═'*90}")
    
    # P#70: Use fast XGBoost retrain for walk-forward (much faster)
    original_retrain = config.XGBOOST_RETRAIN_INTERVAL
    fast_interval = getattr(config, 'XGBOOST_RETRAIN_INTERVAL_FAST', 2000)
    config.XGBOOST_RETRAIN_INTERVAL = fast_interval
    
    all_train = {}
    all_test = {}
    
    for symbol in pairs:
        df = load_pair_data(symbol, timeframe)
        if df is None:
            continue
        
        # Apply pair overrides
        originals = {}
        pair_capital = config.INITIAL_CAPITAL
        if use_pair_config:
            originals = apply_pair_overrides(symbol)
            pair_capital = get_pair_capital(symbol)
            overrides = get_pair_overrides(symbol)
            if overrides.get('PAIR_BLACKLISTED', False):
                restore_config(originals)
                continue
        
        # Split data
        split_idx = int(len(df) * train_pct)
        df_train = df.iloc[:split_idx].copy()
        df_test = df.iloc[split_idx:].copy()
        
        print(f"\n{'─'*80}")
        print(f"  📊 {symbol} — Total: {len(df)} candles")
        print(f"     TRAIN: {len(df_train)} candles ({df_train.index[0]} → {df_train.index[-1]})")
        print(f"     TEST:  {len(df_test)} candles ({df_test.index[0]} → {df_test.index[-1]})")
        print(f"{'─'*80}")
        
        # Run TRAIN period
        engine_train = build_engine(
            initial_capital=pair_capital,
            symbol=symbol,
            quantum_backend=quantum_backend,
            quantum_backend_options=quantum_backend_options,
        )
        results_train = engine_train.run(df_train, timeframe)
        results_train['symbol'] = symbol
        results_train['pair_capital'] = pair_capital
        results_train['quantum_backend'] = quantum_backend
        all_train[symbol] = results_train
        
        # Run TEST period  
        engine_test = build_engine(
            initial_capital=pair_capital,
            symbol=symbol,
            quantum_backend=quantum_backend,
            quantum_backend_options=quantum_backend_options,
        )
        results_test = engine_test.run(df_test, timeframe)
        results_test['symbol'] = symbol
        results_test['pair_capital'] = pair_capital
        results_test['quantum_backend'] = quantum_backend
        all_test[symbol] = results_test
        
        if use_pair_config:
            restore_config(originals)
        
        # Print comparison
        for label, r in [('TRAIN', results_train), ('TEST', results_test)]:
            if r.get('error'):
                print(f"  ❌ {label}: {r['error']}")
                continue
            t = r.get('total_trades', 0)
            pf = r.get('profit_factor', 0)
            wr = r.get('win_rate', 0)
            ret = r.get('total_return_pct', 0)
            dd = r.get('max_drawdown', 0)
            pnl = r.get('net_profit', 0)
            fr_pnl = r.get('funding_arb_pnl', 0)
            combined = pnl + fr_pnl
            emoji = '✅' if combined > 0 else '❌'
            fund_str = f" (Fund ${fr_pnl:+.2f})" if fr_pnl != 0 else ""
            print(f"  {emoji} {label:>5}: {t:>3} trades | PF {pf:.3f} | WR {wr:.1f}% | "
                  f"Return {ret:+.2f}% | MaxDD {dd:.1f}% | ${combined:+.2f}{fund_str}")
            q_line = _format_quantum_summary(r.get('quantum_summary'))
            if q_line:
                print(f"         ⚛️  {q_line}")
    
    # Summary comparison table
    if all_train and all_test:
        # P#70: Restore XGBoost retrain interval
        config.XGBOOST_RETRAIN_INTERVAL = original_retrain
        
        print(f"\n{'═'*90}")
        print(f"  📊 WALK-FORWARD SUMMARY — Train vs Test")
        print(f"{'═'*90}")
        print(f"  {'Symbol':<10} {'Period':>6} {'QB':>4} {'Rmt':>7} {'QChk':>8} {'Trades':>7} {'WR':>7} {'PF':>7} "
              f"{'Return':>9} {'MaxDD':>7} {'NetPnL':>10}")
        print(f"  {'─'*96}")
        
        for symbol in pairs:
            if symbol not in all_train or symbol not in all_test:
                continue
            for label, results in [('TRAIN', all_train[symbol]), ('TEST', all_test[symbol])]:
                if results.get('error'):
                    continue
                pnl = results.get('net_profit', 0)
                fr_pnl = results.get('funding_arb_pnl', 0)
                combined = pnl + fr_pnl
                emoji = '✅' if combined > 0 else '❌'
                combined_return = combined / results.get('pair_capital', config.INITIAL_CAPITAL) * 100 if results.get('pair_capital') else 0
                q_summary = results.get('quantum_summary', {})
                q_backend = _quantum_backend_short(q_summary.get('backend', results.get('quantum_backend', 'simulated')))
                remote_status = str(q_summary.get('remote_status', 'n/a')).upper()[:7]
                if q_summary.get('verify_enabled') and q_summary.get('verify_qmc_match_rate') is not None:
                    q_check = f"{q_summary.get('verify_qmc_match_rate', 0) * 100:.0f}%"
                elif q_summary.get('remote_enabled'):
                    q_check = f"{q_summary.get('remote_failures', 0)}F"
                else:
                    q_check = '-'
                print(f"  {emoji} {symbol if label=='TRAIN' else '':>8} {label:>6} "
                      f"{q_backend:>4} {remote_status:>7} {q_check:>8} "
                      f"{results.get('total_trades',0):>7} "
                      f"{results.get('win_rate',0):>6.1f}% "
                      f"{results.get('profit_factor',0):>7.3f} "
                      f"{combined_return:>+8.2f}% "
                      f"{results.get('max_drawdown',0):>6.1f}% "
                      f"${combined:>+9.2f}")
        
        # Validation verdict
        print(f"\n  🔬 VALIDATION VERDICT:")
        for symbol in pairs:
            if symbol not in all_train or symbol not in all_test:
                continue
            train_pf = all_train[symbol].get('profit_factor', 0)
            test_pf = all_test[symbol].get('profit_factor', 0)
            train_ret = all_train[symbol].get('total_return_pct', 0)
            test_ret = all_test[symbol].get('total_return_pct', 0)
            # P#72: Include funding in return comparison
            train_fr = all_train[symbol].get('funding_arb_pnl', 0)
            test_fr = all_test[symbol].get('funding_arb_pnl', 0)
            train_cap = all_train[symbol].get('pair_capital', config.INITIAL_CAPITAL)
            test_cap = all_test[symbol].get('pair_capital', config.INITIAL_CAPITAL)
            train_combined_ret = ((all_train[symbol].get('net_profit', 0) + train_fr) / train_cap * 100) if train_cap else 0
            test_combined_ret = ((all_test[symbol].get('net_profit', 0) + test_fr) / test_cap * 100) if test_cap else 0
            
            # P#72: Funding-only pairs use combined return for verdict
            is_funding_only = all_test[symbol].get('total_trades', 0) == 0 and test_fr > 0
            
            if is_funding_only:
                # Funding-only: judge by whether funding income is positive in test
                if test_combined_ret > 5:
                    verdict = "✅ ROBUST — Funding income strong in test period"
                elif test_combined_ret > 0:
                    verdict = "⚠️  MARGINAL — Some funding income in test"
                else:
                    verdict = "❌ CURVE-FIT — Funding negative in test"
                pf_info = f"Return {train_combined_ret:+.1f}%→{test_combined_ret:+.1f}%"
            elif test_pf >= 1.0 and test_combined_ret > 0:
                verdict = "✅ ROBUST — Edge persists in test period"
                pf_info = f"PF {train_pf:.3f}→{test_pf:.3f}"
            elif test_pf >= 0.8 and test_pf >= train_pf * 0.5:
                verdict = "⚠️  MARGINAL — Edge weakens but present"
                pf_info = f"PF {train_pf:.3f}→{test_pf:.3f}"
            elif test_combined_ret > 0:
                verdict = "⚠️  MARGINAL — Directional weak, funding helps"
                pf_info = f"PF {train_pf:.3f}→{test_pf:.3f}, Fund ${test_fr:+.0f}"
            else:
                verdict = "❌ CURVE-FIT — Edge does NOT persist"
                pf_info = f"PF {train_pf:.3f}→{test_pf:.3f}"
            
            print(f"     {symbol}: {verdict} ({pf_info})")
    
    return all_train, all_test


def run_all_timeframes(quantum_backend='simulated', quantum_backend_options=None):
    """Run backtest on all timeframes and print comparison."""
    all_results = {}
    
    for tf in ['15m', '1h', '4h']:
        result = run_single(tf, verbose=True, quantum_backend=quantum_backend, quantum_backend_options=quantum_backend_options)
        if result and not result.get('error'):
            all_results[tf] = result

    if len(all_results) > 1:
        print(f"\n{'═'*100}")
        print(f"  📊 CROSS-TIMEFRAME COMPARISON")
        print(f"{'═'*100}")
        print(f"  {'TF':<6} {'QB':>4} {'Rmt':>7} {'QChk':>8} {'Trades':>7} {'WR':>7} {'PF':>7} {'Sharpe':>8} "
              f"{'Return':>9} {'MaxDD':>7} {'W/L':>6}")
        print(f"  {'─'*104}")
        
        for tf, r in all_results.items():
            emoji = '✅' if r['net_profit'] > 0 else '❌'
            q_summary = r.get('quantum_summary', {})
            q_backend = _quantum_backend_short(q_summary.get('backend', r.get('quantum_backend', 'simulated')))
            remote_status = str(q_summary.get('remote_status', 'n/a')).upper()[:7]
            wl_ratio = r.get('win_loss_ratio', 0)
            if q_summary.get('verify_enabled') and q_summary.get('verify_qmc_match_rate') is not None:
                q_check = f"{q_summary.get('verify_qmc_match_rate', 0) * 100:.0f}%"
            elif q_summary.get('remote_enabled'):
                q_check = f"{q_summary.get('remote_failures', 0)}F"
            else:
                q_check = '-'
            print(f"  {emoji} {tf:<4} {q_backend:>4} {remote_status:>7} {q_check:>8} {r['total_trades']:>7} "
                  f"{r['win_rate']:>6.1f}% {r['profit_factor']:>7.3f} "
                  f"{r['sharpe_ratio']:>8.3f} {r['total_return_pct']:>+8.2f}% "
                  f"{r['max_drawdown']:>6.2f}% {wl_ratio:>6.2f}")
    
    # Save results
    os.makedirs(RESULTS_DIR, exist_ok=True)
    results_file = os.path.join(
        RESULTS_DIR,
        f'full_pipeline_{datetime.now().strftime("%Y%m%d_%H%M%S")}.json'
    )
    with open(results_file, 'w') as f:
        json.dump(all_results, f, indent=2, default=str)
    print(f"\n💾 Results saved: {results_file}")
    
    return all_results


def build_quantum_backend_options(args):
    return {
        'remote_url': args.gpu_url,
        'timeout_s': args.gpu_timeout_s,
        'verify_sample_rate': args.quantum_verify_sample_rate,
    }


def apply_fast_profile():
    originals = {}
    for attr, value_factory in FAST_PROFILE_OVERRIDES.items():
        originals[attr] = getattr(config, attr)
        setattr(config, attr, value_factory())

    print("\n⚡ Fast profile enabled:")
    print(f"   XGBoost retrain interval: {config.XGBOOST_RETRAIN_INTERVAL}")
    print(f"   LLM enabled: {config.LLM_ENABLED}")
    print(f"   Sentiment enabled: {config.SENTIMENT_ENABLED}")
    print(f"   Quantum intervals: QMC={config.QMC_SIM_INTERVAL} QAOA={config.QAOA_WEIGHT_INTERVAL} QRA={config.QRA_RISK_INTERVAL}")
    return originals


def restore_config_values(originals):
    for attr, value in originals.items():
        setattr(config, attr, value)


def apply_runtime_parity_profile():
    originals = {}
    for attr, value_factory in RUNTIME_PARITY_OVERRIDES.items():
        originals[attr] = getattr(config, attr)
        setattr(config, attr, value_factory())

    print("\n⚖️ Runtime parity profile enabled:")
    print(f"   Gate profile: {config.PIPELINE_GATE_PROFILE}")
    print(f"   Confidence floor: {config.RUNTIME_PARITY_CONFIDENCE_FLOOR}")
    return originals


def main():
    import argparse
    parser = argparse.ArgumentParser(description='Turbo-Bot Full Pipeline Backtest')
    parser.add_argument('--timeframe', '-t', default=None, 
                       help='Single timeframe (15m, 1h, 4h)')
    parser.add_argument('--all', action='store_true', 
                       help='Run on all timeframes')
    parser.add_argument('--multi', action='store_true',
                       help='Run on all available pairs (BTC, ETH, SOL, BNB, XRP)')
    parser.add_argument('--walkforward', action='store_true',
                       help='P#70: Walk-forward validation (70/30 train/test split)')
    parser.add_argument('--brief', action='store_true',
                       help='Brief output (no component stats)')
    parser.add_argument('--trades', action='store_true',
                       help='Show full trade-by-trade analysis + CSV export')
    parser.add_argument('--quantum-backend', default='simulated', choices=SUPPORTED_QUANTUM_BACKENDS,
                       help='Quantum backend mode: simulated (Phase A), remote-gpu/hybrid-verify reserved for Phase B')
    parser.add_argument('--gpu-url', default=None,
                       help='Remote QuantumGPU base URL for remote-gpu or hybrid-verify, e.g. http://127.0.0.1:4000')
    parser.add_argument('--gpu-timeout-s', type=float, default=5.0,
                       help='Remote QuantumGPU request timeout in seconds')
    parser.add_argument('--quantum-verify-sample-rate', type=float, default=0.10,
                       help='Hybrid verify sample rate in [0,1] for remote parity sampling')
    parser.add_argument('--fast-profile', action='store_true',
                       help='Faster single-run profile: disables LLM/sentiment, uses fast XGBoost retrain, and lowers quantum call cadence')
    parser.add_argument('--runtime-parity', action='store_true',
                       help='Use live-runtime-equivalent gating profile for decision parity checks')
    args = parser.parse_args()
    quantum_backend_options = build_quantum_backend_options(args)
    
    print("╔══════════════════════════════════════════════════════════════════╗")
    print("║  TURBO-BOT v6.0.0 — FULL PIPELINE BACKTEST ENGINE                ║")
    print("║  PATCH #72 — Capital Rebalance + Adaptive Grid + ETH Pure       ║")
    print("╚══════════════════════════════════════════════════════════════════╝")
    
    originals = {}
    if args.fast_profile:
        originals.update(apply_fast_profile())
    if args.runtime_parity:
        originals.update(apply_runtime_parity_profile())
    try:
        if args.walkforward:
            run_walk_forward(args.timeframe or '15m', train_pct=0.70,
                            use_pair_config=True, quantum_backend=args.quantum_backend,
                            quantum_backend_options=quantum_backend_options)
        elif args.multi:
            run_multi_pair(args.timeframe or '15m', verbose=not args.brief, 
                           show_trades=args.trades, quantum_backend=args.quantum_backend,
                           quantum_backend_options=quantum_backend_options)
        elif args.all or args.timeframe is None:
            run_all_timeframes(quantum_backend=args.quantum_backend, quantum_backend_options=quantum_backend_options)
        else:
            run_single(args.timeframe, verbose=not args.brief, show_trades=args.trades,
                      quantum_backend=args.quantum_backend, quantum_backend_options=quantum_backend_options)
    finally:
        if originals:
            restore_config_values(originals)


if __name__ == '__main__':
    main()
