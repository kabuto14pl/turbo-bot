"""
TURBO-BOT — SKYNET BRAIN: Iterative Backtest Learning Loop
============================================================
PATCH #61 — The system that LEARNS from its own backtest results.

Architecture:
  1. Run backtest with current config
  2. Analyze results → identify weak spots
  3. Generate parameter adjustments (evidence-based)
  4. Apply adjustments to config
  5. Run next iteration → compare
  6. Keep best config, revert if worse
  7. Repeat until convergence or max_iterations

This replaces manual "run → read → tweak → run again" with
automated intelligent optimization.

Key principles:
  - Never change more than 3 params per iteration (isolate effects)
  - Always compare to previous best (not just previous run)
  - Revert destructive changes immediately
  - Log every decision with reasoning
  - Stop when improvement < 0.5% for 3 consecutive iterations
"""

import os
import sys
import json
import copy
import time
import warnings
from datetime import datetime

# Suppress XGBoost warnings
warnings.filterwarnings('ignore', category=UserWarning, module='xgboost')

sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from backtest_pipeline.engine import FullPipelineEngine
from backtest_pipeline.runner import load_data, print_results
from backtest_pipeline import config


# ============================================================================
# SCORING FUNCTION — What we optimize for
# ============================================================================
def score_results(results):
    """
    Single composite score from backtest results.
    Higher = better. Balances profitability, risk, and quality.
    
    Components (weights) — PATCH #65 Signal-Aware:
      - Profit Factor (25%): PF 1.0 = score 50, PF 2.0 = score 100
      - Net Return (30%): -5% = 0, 0% = 50, +5% = 100
      - Max Drawdown (15%): 15% = 0, 5% = 75, 0% = 100
      - Signal Win Rate (15%): 40% = 0, 60% = 50, 80% = 100 (PATCH #65: signal-level!)
      - Signal W/L (10%): 0 = 0, 0.5 = 50, 1.0 = 100 (new: signal-level W/L)
      - Trade Count (5%): penalty if < 10 or > 100
    
    PATCH #65 changes:
      - Replaced trade-level WR (10%) with signal-level WR (15%)
      - Added signal-level W/L ratio (10%) — the REAL profitability indicator
      - Removed Sharpe (was 10%) — too volatile with few trades
      - PF weight 30%→25% to make room for signal metrics
    """
    if not results or results.get('error') or results.get('total_trades', 0) < 3:
        return 0.0
    
    pf = results.get('profit_factor', 0)
    ret = results.get('total_return_pct', -100)
    dd = results.get('max_drawdown', 100)
    trades = results.get('total_trades', 0)
    
    # Signal-level metrics (PATCH #65)
    signal_wr = results.get('signal_win_rate', results.get('win_rate', 50))
    signal_wl = results.get('signal_wl_ratio', results.get('win_loss_ratio', 0))
    
    # PF score (25%)
    pf_score = min(100, max(0, pf * 50))
    
    # Return score (30%)
    ret_score = min(100, max(0, (ret + 5) * 10))
    
    # DD score (15%) — inverted (lower DD = better)
    dd_score = min(100, max(0, (15 - dd) * 6.67))
    
    # Signal Win Rate score (15%) — SIGNAL-LEVEL (not trade-level)
    # 40% = 0, 60% = 50, 80% = 100
    swr_score = min(100, max(0, (signal_wr - 40) * 2.5))
    
    # Signal W/L ratio score (10%) — the REAL quality metric
    # 0 = 0, 0.5 = 50, 1.0 = 100, 1.5 = 125 (capped at 100)
    swl_score = min(100, max(0, signal_wl * 100))
    
    # Trade count score (5%)
    if trades < 5:
        trade_score = trades * 10
    elif trades < 10:
        trade_score = 50 + (trades - 5) * 10
    elif trades <= 60:
        trade_score = 100
    elif trades <= 100:
        trade_score = 100 - (trades - 60) * 1.5
    else:
        trade_score = max(0, 40 - (trades - 100) * 0.5)
    
    composite = (
        pf_score * 0.25 +
        ret_score * 0.30 +
        dd_score * 0.15 +
        swr_score * 0.15 +
        swl_score * 0.10 +
        trade_score * 0.05
    )
    
    return round(composite, 2)


# ============================================================================
# DIAGNOSTIC RULES — Identify what's wrong and propose fixes
# ============================================================================
def diagnose_results(results, prev_best=None, tried_changes=None):
    """
    Analyze results and return list of (param, old_val, new_val, reason) tuples.
    Maximum 3 changes per iteration to isolate effects.
    Skips changes that were already tried and failed.
    """
    if not results or results.get('error'):
        return []
    
    if tried_changes is None:
        tried_changes = set()
    
    def already_tried(param, old_val, new_val):
        """Check if this change direction was already tried."""
        direction = 'up' if new_val > old_val else 'down'
        return (param, direction) in tried_changes
    
    changes = []
    
    pf = results.get('profit_factor', 0)
    wr = results.get('win_rate', 0)
    wl = results.get('win_loss_ratio', 0)
    dd = results.get('max_drawdown', 100)
    trades = results.get('total_trades', 0)
    ret = results.get('total_return_pct', -100)
    fees_pct = results.get('fees_pct_of_pnl', 0)
    avg_win = results.get('avg_win', 0)
    avg_loss = abs(results.get('avg_loss', -1))
    exit_reasons = results.get('exit_reasons', {})
    tp_exits = exit_reasons.get('TP', 0)
    sl_exits = exit_reasons.get('SL', 0)
    be_exits = exit_reasons.get('BE', 0)
    total_exits = sum(exit_reasons.values()) if exit_reasons else 1
    tp_pct = tp_exits / total_exits * 100
    sl_pct = sl_exits / total_exits * 100
    be_pct = be_exits / total_exits * 100
    
    # Phase distribution
    phase_exits = results.get('phase_exits', {})
    phase_1_pct = phase_exits.get('phase_1', 0) / max(trades, 1) * 100
    
    # Long vs Short
    long_wr = results.get('long_win_rate', 50)
    short_wr = results.get('short_win_rate', 50)
    long_pnl = results.get('long_pnl', 0)
    short_pnl = results.get('short_pnl', 0)
    
    # ============================================================
    # RULE 1: 0% TP exits → TP too far, need partials or lower TP
    # ============================================================
    if tp_pct < 5 and config.TP_ATR_MULT > 1.5:
        # Check if partials are disabled
        if config.PARTIAL_ATR_L1_PCT == 0:
            # Re-enable partials as primary profit capture
            new_val = 0.40
            if not already_tried('PARTIAL_ATR_L1_PCT', config.PARTIAL_ATR_L1_PCT, new_val):
                changes.append(('PARTIAL_ATR_L1_PCT', config.PARTIAL_ATR_L1_PCT, new_val,
                    'TP never hit (0%) — re-enable L1 partial at 40% for profit capture'))
            new_val = 1.0
            if not already_tried('PARTIAL_ATR_L1_MULT', config.PARTIAL_ATR_L1_MULT, new_val) and len(changes) < 3:
                changes.append(('PARTIAL_ATR_L1_MULT', config.PARTIAL_ATR_L1_MULT, new_val,
                    'Set L1 trigger to 1.0 ATR (reachable — 23% reach Phase 3)'))
            new_val = 0.30
            if not already_tried('PARTIAL_ATR_L2_PCT', config.PARTIAL_ATR_L2_PCT, new_val) and len(changes) < 3:
                changes.append(('PARTIAL_ATR_L2_PCT', config.PARTIAL_ATR_L2_PCT, new_val,
                    'Enable L2 partial at 30% for 1.5 ATR level'))
        elif config.TP_ATR_MULT > 2.0:
            new_val = max(1.5, config.TP_ATR_MULT - 0.5)
            if not already_tried('TP_ATR_MULT', config.TP_ATR_MULT, new_val):
                changes.append(('TP_ATR_MULT', config.TP_ATR_MULT, new_val,
                    f'TP exits {tp_pct:.0f}% — lower TP from {config.TP_ATR_MULT} ATR'))
    
    if len(changes) >= 3:
        return changes[:3]
    
    # ============================================================
    # RULE 1b: W/L very low (< 0.3) with high partial rate
    # → partial trigger too early, avg win too small
    # ============================================================
    partial_exits = exit_reasons.get('PARTIAL_L1', 0) + exit_reasons.get('PARTIAL_L2', 0)
    partial_pct = partial_exits / total_exits * 100
    if wl < 0.30 and partial_pct > 20 and len(changes) < 3:
        # Try: move L1 trigger further out (bigger partial wins)
        if config.PARTIAL_ATR_L1_MULT < 2.0:
            new_val = min(2.0, config.PARTIAL_ATR_L1_MULT + 0.5)
            if not already_tried('PARTIAL_ATR_L1_MULT', config.PARTIAL_ATR_L1_MULT, new_val):
                changes.append(('PARTIAL_ATR_L1_MULT', config.PARTIAL_ATR_L1_MULT, new_val,
                    f'W/L {wl:.2f} with {partial_pct:.0f}% partials — L1 too early, move to {new_val} ATR'))
        # Also try: reduce SL multiplier to reduce avg loss
        if config.SL_ATR_MULT > 1.5 and len(changes) < 3:
            new_val = max(1.5, config.SL_ATR_MULT - 0.25)
            if not already_tried('SL_ATR_MULT', config.SL_ATR_MULT, new_val):
                changes.append(('SL_ATR_MULT', config.SL_ATR_MULT, new_val,
                    f'Avg loss ${avg_loss:.0f} too large — tighten SL to {new_val} ATR'))
    
    if len(changes) >= 3:
        return changes[:3]
    
    # ============================================================
    # RULE 2: Too many Phase 1 exits → price barely moves
    # ============================================================
    if phase_1_pct > 50 and len(changes) < 3:
        if config.PHASE_1_MIN_R > 0.5:
            new_val = max(0.5, config.PHASE_1_MIN_R - 0.3)
            if not already_tried('PHASE_1_MIN_R', config.PHASE_1_MIN_R, new_val):
                changes.append(('PHASE_1_MIN_R', config.PHASE_1_MIN_R, new_val,
                    f'Phase 1 exits {phase_1_pct:.0f}% — lower Phase 1 threshold for earlier trail'))
    
    # ============================================================
    # RULE 3: Fees too high (> 30% of PnL)
    # ============================================================
    if fees_pct > 30 and len(changes) < 3:
        if config.FEE_GATE_MULTIPLIER < 3.0:
            new_val = min(3.0, config.FEE_GATE_MULTIPLIER + 0.5)
            if not already_tried('FEE_GATE_MULTIPLIER', config.FEE_GATE_MULTIPLIER, new_val):
                changes.append(('FEE_GATE_MULTIPLIER', config.FEE_GATE_MULTIPLIER, new_val,
                    f'Fees {fees_pct:.0f}% of PnL — raise fee gate for better trades'))
    
    # ============================================================
    # RULE 4: Max DD too high (> 10%)
    # ============================================================
    if dd > 10 and len(changes) < 3:
        if config.RISK_PER_TRADE > 0.008:
            new_val = max(0.008, config.RISK_PER_TRADE * 0.75)
            if not already_tried('RISK_PER_TRADE', config.RISK_PER_TRADE, new_val):
                changes.append(('RISK_PER_TRADE', config.RISK_PER_TRADE, new_val,
                    f'Max DD {dd:.1f}% — reduce risk per trade'))
    
    # ============================================================
    # RULE 5: WR < 45% → confidence floor too low, bad signals pass
    # ============================================================
    if wr < 45 and len(changes) < 3:
        if config.CONFIDENCE_FLOOR < 0.35:
            new_val = min(0.40, config.CONFIDENCE_FLOOR + 0.03)
            if not already_tried('CONFIDENCE_FLOOR', config.CONFIDENCE_FLOOR, new_val):
                changes.append(('CONFIDENCE_FLOOR', config.CONFIDENCE_FLOOR, new_val,
                    f'Win rate {wr:.1f}% — raise confidence floor to filter weak signals'))
    
    # ============================================================
    # RULE 6: W/L ratio < 0.5 → avg win too small vs avg loss
    # ============================================================
    if wl < 0.5 and len(changes) < 3:
        if config.TRAILING_DISTANCE_ATR > 1.0:
            new_val = max(1.0, config.TRAILING_DISTANCE_ATR - 0.25)
            if not already_tried('TRAILING_DISTANCE_ATR', config.TRAILING_DISTANCE_ATR, new_val):
                changes.append(('TRAILING_DISTANCE_ATR', config.TRAILING_DISTANCE_ATR, new_val,
                    f'W/L {wl:.2f} — tighten trailing to lock more profit'))
    
    # ============================================================
    # RULE 7: Long side catastrophic (WR < 40% or PnL < -70% total)
    # ============================================================
    if long_wr < 40 and abs(long_pnl) > abs(short_pnl) * 2 and len(changes) < 3:
        if config.ENSEMBLE_THRESHOLD_NORMAL < 0.35:
            new_val = min(0.35, config.ENSEMBLE_THRESHOLD_NORMAL + 0.03)
            if not already_tried('ENSEMBLE_THRESHOLD_NORMAL', config.ENSEMBLE_THRESHOLD_NORMAL, new_val):
                changes.append(('ENSEMBLE_THRESHOLD_NORMAL', config.ENSEMBLE_THRESHOLD_NORMAL, new_val,
                    f'Long WR {long_wr:.0f}% catastrophic — raise ensemble threshold'))
    
    # ============================================================
    # RULE 8: Too few trades (< 15) → thresholds too high
    # ============================================================
    if trades < 15 and len(changes) < 3:
        if config.ENSEMBLE_THRESHOLD_NORMAL > 0.20:
            new_val = max(0.15, config.ENSEMBLE_THRESHOLD_NORMAL - 0.03)
            if not already_tried('ENSEMBLE_THRESHOLD_NORMAL', config.ENSEMBLE_THRESHOLD_NORMAL, new_val):
                changes.append(('ENSEMBLE_THRESHOLD_NORMAL', config.ENSEMBLE_THRESHOLD_NORMAL, new_val,
                    f'Only {trades} trades — lower threshold for more signals'))
    
    # ============================================================
    # RULE 9: BE exits dominate (> 50%) → breakeven too aggressive
    # ============================================================
    if be_pct > 50 and len(changes) < 3:
        if config.PHASE_2_BE_R < 1.5:
            new_val = min(1.5, config.PHASE_2_BE_R + 0.2)
            if not already_tried('PHASE_2_BE_R', config.PHASE_2_BE_R, new_val):
                changes.append(('PHASE_2_BE_R', config.PHASE_2_BE_R, new_val,
                    f'BE exits {be_pct:.0f}% — delay breakeven trigger to let trades breathe'))
    
    # ============================================================
    # RULE 10: Reduce partial L1 percentage if wins too small
    # ============================================================
    if avg_win < avg_loss * 0.3 and config.PARTIAL_ATR_L1_PCT > 0.20 and len(changes) < 3:
        new_val = max(0.20, config.PARTIAL_ATR_L1_PCT - 0.10)
        if not already_tried('PARTIAL_ATR_L1_PCT', config.PARTIAL_ATR_L1_PCT, new_val):
            changes.append(('PARTIAL_ATR_L1_PCT', config.PARTIAL_ATR_L1_PCT, new_val,
                f'Avg win ${avg_win:.0f} < 30% of avg loss ${avg_loss:.0f} — reduce L1 partial size'))
    
    # ============================================================
    # RULE 11: Try lowering TP if still > 2.0 and no TP exits
    # ============================================================
    if tp_pct < 3 and config.TP_ATR_MULT > 2.0 and len(changes) < 3:
        new_val = max(1.5, config.TP_ATR_MULT - 0.5)
        if not already_tried('TP_ATR_MULT', config.TP_ATR_MULT, new_val):
            changes.append(('TP_ATR_MULT', config.TP_ATR_MULT, new_val,
                f'TP exits {tp_pct:.0f}% still — lower TP to {new_val} ATR'))
    
    # ============================================================
    # RULE 12: Try increasing L2 percentage for more profit capture
    # ============================================================
    if config.PARTIAL_ATR_L2_PCT > 0 and config.PARTIAL_ATR_L2_PCT < 0.40 and len(changes) < 3:
        l2_exits = exit_reasons.get('PARTIAL_L2', 0)
        if l2_exits > 0 and wl < 0.5:
            new_val = min(0.50, config.PARTIAL_ATR_L2_PCT + 0.10)
            if not already_tried('PARTIAL_ATR_L2_PCT', config.PARTIAL_ATR_L2_PCT, new_val):
                changes.append(('PARTIAL_ATR_L2_PCT', config.PARTIAL_ATR_L2_PCT, new_val,
                    f'L2 exits {l2_exits} but W/L {wl:.2f} — increase L2 to capture more profit'))
    
    # ============================================================
    # RULE 13 (PATCH #62): PA blocking too many trades
    # ============================================================
    blocked = results.get('blocked_reasons', {})
    pa_blocks = sum(v for k, v in blocked.items() if k.startswith('PA blocked'))
    sr_blocks = sum(v for k, v in blocked.items() if k.startswith('EQ-SR blocked'))
    total_blocked = results.get('total_blocked', 0)
    
    if trades < 20 and pa_blocks > 10 and len(changes) < 3:
        # PA too restrictive — lower the gate
        if config.PA_MIN_SCORE > 0.15:
            new_val = max(0.15, config.PA_MIN_SCORE - 0.05)
            if not already_tried('PA_MIN_SCORE', config.PA_MIN_SCORE, new_val):
                changes.append(('PA_MIN_SCORE', config.PA_MIN_SCORE, new_val,
                    f'PA blocked {pa_blocks} trades — loosen PA gate'))
    
    if trades < 20 and sr_blocks > 10 and len(changes) < 3:
        if config.PA_GATE_MIN_SCORE > 0.20:
            new_val = max(0.15, config.PA_GATE_MIN_SCORE - 0.05)
            if not already_tried('PA_GATE_MIN_SCORE', config.PA_GATE_MIN_SCORE, new_val):
                changes.append(('PA_GATE_MIN_SCORE', config.PA_GATE_MIN_SCORE, new_val,
                    f'S/R blocked {sr_blocks} trades — loosen S/R gate'))
    
    # ============================================================
    # RULE 14 (PATCH #62): PA-filtered trades have better WR
    # → tighten PA gate for quality
    # ============================================================
    pa_stats = results.get('price_action_stats', {})
    pa_analyzed = pa_stats.get('total_analyzed', 0)
    no_pa = pa_stats.get('no_pa_entries', 0)
    
    if wr > 60 and pf < 1.0 and pa_analyzed > 0 and no_pa / max(pa_analyzed, 1) > 0.40 and len(changes) < 3:
        # Many entries without PA pattern — tighten to force PA patterns
        if config.PA_MIN_SCORE < 0.40:
            new_val = min(0.45, config.PA_MIN_SCORE + 0.05)
            if not already_tried('PA_MIN_SCORE', config.PA_MIN_SCORE, new_val):
                changes.append(('PA_MIN_SCORE', config.PA_MIN_SCORE, new_val,
                    f'WR {wr:.0f}% but PF<1 — tighten PA gate to filter no-pattern entries'))
    
    # ============================================================
    # RULE 15 (PATCH #63): Phase 3 trail too tight — kills winners
    # If many Phase 3 exits with small profits → widen trail
    # ============================================================
    phase3_exits = phase_exits.get('phase_3', 0)
    phase3_pct = phase3_exits / max(trades, 1) * 100
    if wl < 0.40 and phase3_pct > 20 and len(changes) < 3:
        current_p3 = getattr(config, 'PHASE3_TRAIL_ATR', 0.5)
        if current_p3 < 1.5:
            new_val = min(1.5, current_p3 + 0.25)
            if not already_tried('PHASE3_TRAIL_ATR', current_p3, new_val):
                changes.append(('PHASE3_TRAIL_ATR', current_p3, new_val,
                    f'Phase 3 exits {phase3_pct:.0f}% with W/L {wl:.2f} — widen Phase 3 trail to {new_val} ATR'))
    
    # ============================================================
    # RULE 16 (PATCH #63): L2 never triggers — L2 mult too far out
    # ============================================================
    l2_exits = exit_reasons.get('PARTIAL_L2', 0)
    l1_exits = exit_reasons.get('PARTIAL_L1', 0)
    if l1_exits > 3 and l2_exits == 0 and len(changes) < 3:
        current_l2 = config.PARTIAL_ATR_L2_MULT
        if current_l2 > 1.5:
            new_val = max(1.5, current_l2 - 0.5)
            if not already_tried('PARTIAL_ATR_L2_MULT', current_l2, new_val):
                changes.append(('PARTIAL_ATR_L2_MULT', current_l2, new_val,
                    f'L1 triggers ({l1_exits}) but L2 never (0) — lower L2 mult to {new_val} ATR'))
    
    # ============================================================
    # RULE 17 (PATCH #63): Long trend filter too aggressive
    # ============================================================
    long_filtered = results.get('long_trend_filtered', 0)
    if trades < 20 and long_filtered > 10 and len(changes) < 3:
        current_pen = getattr(config, 'LONG_COUNTER_TREND_PENALTY', 0.80)
        if current_pen < 0.90:
            new_val = min(0.95, current_pen + 0.05)
            if not already_tried('LONG_COUNTER_TREND_PENALTY', current_pen, new_val):
                changes.append(('LONG_COUNTER_TREND_PENALTY', current_pen, new_val,
                    f'Long filter blocked {long_filtered} trades — soften penalty'))
    
    # ============================================================
    # RULE 18 (PATCH #65): Momentum gate tuning
    # If momentum gate tightens many trades but signal_wl still low
    # → gate is working but threshold may need adjustment
    # ============================================================
    mom_checked = results.get('momentum_gate_checked', 0)
    mom_tightened = results.get('momentum_gate_tightened', 0)
    signal_wl_val = results.get('signal_wl_ratio', 0)
    
    if mom_checked > 0 and len(changes) < 3:
        tighten_rate = mom_tightened / max(mom_checked, 1)
        if tighten_rate > 0.70:
            # Too many trades get tightened → min_r too high
            current_min_r = getattr(config, 'MOMENTUM_GATE_MIN_R', 0.40)
            if current_min_r > 0.25:
                new_val = max(0.25, current_min_r - 0.10)
                if not already_tried('MOMENTUM_GATE_MIN_R', current_min_r, new_val):
                    changes.append(('MOMENTUM_GATE_MIN_R', current_min_r, new_val,
                        f'Momentum gate tightens {tighten_rate*100:.0f}% of trades — lower threshold'))
        elif tighten_rate < 0.20 and signal_wl_val < 0.50:
            # Not enough tightening, signal_wl still bad → raise min_r
            current_min_r = getattr(config, 'MOMENTUM_GATE_MIN_R', 0.40)
            if current_min_r < 0.60:
                new_val = min(0.60, current_min_r + 0.10)
                if not already_tried('MOMENTUM_GATE_MIN_R', current_min_r, new_val):
                    changes.append(('MOMENTUM_GATE_MIN_R', current_min_r, new_val,
                        f'Momentum gate only tightens {tighten_rate*100:.0f}% but signal W/L {signal_wl_val:.2f} — raise threshold'))
    
    # ============================================================
    # RULE 19 (PATCH #65): RANGING trades performance
    # If RANGING trades perform poorly → adjust ranging SL/TP
    # ============================================================
    regime_trades_data = results.get('regime_trades', {})
    ranging_data = regime_trades_data.get('RANGING', {})
    ranging_count = ranging_data.get('count', 0)
    ranging_wr = ranging_data.get('win_rate', 0)
    
    if ranging_count > 3 and ranging_wr < 40 and len(changes) < 3:
        current_ranging_sl = getattr(config, 'RANGING_SL_ATR_MULT', 1.0)
        if current_ranging_sl > 0.75:
            new_val = max(0.75, current_ranging_sl - 0.25)
            if not already_tried('RANGING_SL_ATR_MULT', current_ranging_sl, new_val):
                changes.append(('RANGING_SL_ATR_MULT', current_ranging_sl, new_val,
                    f'RANGING WR {ranging_wr:.0f}% — tighten ranging SL to {new_val} ATR'))
    
    # ============================================================
    # RULE 20 (PATCH #65): Signal W/L tuning
    # If signal_wl < 0.5 → need bigger wins per signal or smaller losses
    # ============================================================
    if signal_wl_val < 0.50 and signal_wl_val > 0 and len(changes) < 3:
        # Try widening L2 trigger for bigger per-signal wins
        if config.PARTIAL_ATR_L2_MULT < 2.5:
            new_val = min(2.5, config.PARTIAL_ATR_L2_MULT + 0.25)
            if not already_tried('PARTIAL_ATR_L2_MULT', config.PARTIAL_ATR_L2_MULT, new_val):
                changes.append(('PARTIAL_ATR_L2_MULT', config.PARTIAL_ATR_L2_MULT, new_val,
                    f'Signal W/L {signal_wl_val:.2f} < 0.50 — widen L2 for bigger wins per signal'))
    
    # ============================================================
    # RULE 21 (PATCH #66): Pre-entry momentum too restrictive
    # ============================================================
    pre_entry_blocked = results.get('pre_entry_momentum_blocked', 0)
    if trades < 15 and pre_entry_blocked > 10 and len(changes) < 3:
        current_min = getattr(config, 'PRE_ENTRY_MOMENTUM_MIN_ALIGNED', 2)
        if current_min > 1:
            new_val = current_min - 1
            if not already_tried('PRE_ENTRY_MOMENTUM_MIN_ALIGNED', current_min, new_val):
                changes.append(('PRE_ENTRY_MOMENTUM_MIN_ALIGNED', current_min, new_val,
                    f'Pre-entry momentum blocked {pre_entry_blocked} — loosen to {new_val} aligned'))
    
    # ============================================================
    # RULE 22 (PATCH #66): Bollinger MR RANGING tuning
    # ============================================================
    if ranging_count > 3 and ranging_wr > 0 and ranging_wr < 35 and len(changes) < 3:
        current_bb = getattr(config, 'BOLLINGER_MR_BB_LOW', 0.10)
        if current_bb > 0.05:
            new_val = max(0.05, current_bb - 0.03)
            if not already_tried('BOLLINGER_MR_BB_LOW', current_bb, new_val):
                changes.append(('BOLLINGER_MR_BB_LOW', current_bb, new_val,
                    f'RANGING WR {ranging_wr:.0f}% — tighten BB entry level'))
    
    # ============================================================
    # RULE 23 (PATCH #66): L1 partial too large kills avg win
    # ============================================================
    l1_exits_count = exit_reasons.get('PARTIAL_L1', 0)
    if avg_win < 15 and l1_exits_count > 5 and config.PARTIAL_ATR_L1_PCT > 0.25 and len(changes) < 3:
        new_val = max(0.25, config.PARTIAL_ATR_L1_PCT - 0.10)
        if not already_tried('PARTIAL_ATR_L1_PCT', config.PARTIAL_ATR_L1_PCT, new_val):
            changes.append(('PARTIAL_ATR_L1_PCT', config.PARTIAL_ATR_L1_PCT, new_val,
                f'Avg win ${avg_win:.0f} with {l1_exits_count} L1 exits — reduce L1 to {new_val*100:.0f}%'))
    
    # ============================================================
    # RULE 24 (PATCH #67): Grid Ranging tuning
    # If grid trades lose → tighten BB bounds or widen SL/TP
    # ============================================================
    grid_trades_count = results.get('grid_trades', 0)
    if grid_trades_count > 3 and len(changes) < 3:
        # Estimate grid WR from RANGING regime data
        ranging_grid_wr = ranging_data.get('win_rate', 50)
        if ranging_grid_wr < 40:
            current_bb_low = getattr(config, 'GRID_BB_LOW', 0.20)
            if current_bb_low > 0.10:
                new_val = max(0.10, current_bb_low - 0.05)
                if not already_tried('GRID_BB_LOW', current_bb_low, new_val):
                    changes.append(('GRID_BB_LOW', current_bb_low, new_val,
                        f'Grid WR {ranging_grid_wr:.0f}% — tighten BB entry to {new_val}'))
        elif ranging_grid_wr > 65 and grid_trades_count < 15:
            current_bb_low = getattr(config, 'GRID_BB_LOW', 0.20)
            if current_bb_low < 0.30:
                new_val = min(0.30, current_bb_low + 0.05)
                if not already_tried('GRID_BB_LOW', current_bb_low, new_val):
                    changes.append(('GRID_BB_LOW', current_bb_low, new_val,
                        f'Grid WR {ranging_grid_wr:.0f}% high but few trades — widen BB entry'))
    
    # ============================================================
    # RULE 25 (PATCH #67): Volatility Pause tuning
    # If pause triggers too often → raise loss streak threshold
    # ============================================================
    vol_pause_triggered = results.get('volatility_pause_triggered', 0)
    if vol_pause_triggered > 0 and len(changes) < 3:
        if vol_pause_triggered > 5 and ret > -3:
            current_streak = getattr(config, 'VOLATILITY_PAUSE_LOSS_STREAK', 3)
            if current_streak < 5:
                new_val = min(5, current_streak + 1)
                if not already_tried('VOLATILITY_PAUSE_LOSS_STREAK', current_streak, new_val):
                    changes.append(('VOLATILITY_PAUSE_LOSS_STREAK', current_streak, new_val,
                        f'Vol pause triggered {vol_pause_triggered}× — raise streak to {new_val}'))
        elif vol_pause_triggered == 0 and dd > 10:
            current_streak = getattr(config, 'VOLATILITY_PAUSE_LOSS_STREAK', 3)
            if current_streak > 2:
                new_val = max(2, current_streak - 1)
                if not already_tried('VOLATILITY_PAUSE_LOSS_STREAK', current_streak, new_val):
                    changes.append(('VOLATILITY_PAUSE_LOSS_STREAK', current_streak, new_val,
                        f'DD {dd:.1f}% with 0 vol pauses — lower streak to {new_val}'))
    
    # ============================================================
    # RULE 26 (PATCH #67): L3 partial tuning
    # If L3 triggers but avg win still low → L3 mult too close
    # ============================================================
    l3_exits = exit_reasons.get('PARTIAL_L3', 0)
    if l3_exits > 0 and wl < 0.40 and len(changes) < 3:
        current_l3_mult = getattr(config, 'PARTIAL_ATR_L3_MULT', 2.5)
        if current_l3_mult < 3.5:
            new_val = min(3.5, current_l3_mult + 0.5)
            if not already_tried('PARTIAL_ATR_L3_MULT', current_l3_mult, new_val):
                changes.append(('PARTIAL_ATR_L3_MULT', current_l3_mult, new_val,
                    f'L3 triggers ({l3_exits}) but W/L {wl:.2f} — push L3 out to {new_val} ATR'))
    
    # ============================================================
    # RULE 27 (PATCH #67): Contrarian sentiment tuning
    # If contrarian boosts lead to losses → reduce boost
    # ============================================================
    sent_boosts = results.get('sentiment_stats', {}).get('signal_boosts', 0)
    sent_dampens = results.get('sentiment_stats', {}).get('signal_dampens', 0)
    if sent_boosts > 5 and pf < 0.8 and len(changes) < 3:
        current_buy_boost = getattr(config, 'SENTIMENT_CONTRARIAN_BUY_BOOST', 1.15)
        if current_buy_boost > 1.05:
            new_val = max(1.05, current_buy_boost - 0.05)
            if not already_tried('SENTIMENT_CONTRARIAN_BUY_BOOST', current_buy_boost, new_val):
                changes.append(('SENTIMENT_CONTRARIAN_BUY_BOOST', current_buy_boost, new_val,
                    f'Contrarian boosts {sent_boosts} but PF {pf:.3f} — reduce buy boost'))
    
    # ============================================================
    # RULE 28 (PATCH #68): RANGING confidence floor tuning
    # If grid trades lose → raise RANGING floor; if few grid trades → lower it
    # ============================================================
    grid_trades_p68 = results.get('grid_trades', 0)
    if len(changes) < 3:
        if grid_trades_p68 > 5:
            ranging_grid_wr = ranging_data.get('win_rate', 50)
            if ranging_grid_wr < 35:
                current_floor = getattr(config, 'RANGING_CONFIDENCE_FLOOR', 0.12)
                if current_floor < 0.20:
                    new_val = min(0.20, current_floor + 0.03)
                    if not already_tried('RANGING_CONFIDENCE_FLOOR', current_floor, new_val):
                        changes.append(('RANGING_CONFIDENCE_FLOOR', current_floor, new_val,
                            f'Grid WR {ranging_grid_wr:.0f}% losing — raise RANGING floor'))
        elif grid_trades_p68 == 0 and trades < 20:
            current_floor = getattr(config, 'RANGING_CONFIDENCE_FLOOR', 0.12)
            if current_floor > 0.08:
                new_val = max(0.08, current_floor - 0.02)
                if not already_tried('RANGING_CONFIDENCE_FLOOR', current_floor, new_val):
                    changes.append(('RANGING_CONFIDENCE_FLOOR', current_floor, new_val,
                        f'0 grid trades — lower RANGING floor to {new_val}'))
    
    # ============================================================
    # RULE 29 (PATCH #68): Dynamic SL tuning
    # If avg SL loss still too high → tighten dynamic SL multipliers
    # ============================================================
    if avg_loss > 35 and sl_pct > 30 and len(changes) < 3:
        current_down_short = getattr(config, 'DYNAMIC_SL_TRENDING_DOWN_SHORT', 1.25)
        if current_down_short > 1.0:
            new_val = max(1.0, current_down_short - 0.15)
            if not already_tried('DYNAMIC_SL_TRENDING_DOWN_SHORT', current_down_short, new_val):
                changes.append(('DYNAMIC_SL_TRENDING_DOWN_SHORT', current_down_short, new_val,
                    f'Avg SL ${avg_loss:.0f} too high — tighten TDOWN SHORT SL to {new_val}'))
    
    # ============================================================
    # RULE 30 (PATCH #68): Adaptive sizing tuning
    # If adaptive sizing causes too much draw-up → cap multiplier lower
    # ============================================================
    adaptive_mult = results.get('adaptive_size_mult_final', 1.0)
    if adaptive_mult > 1.3 and dd > 8 and len(changes) < 3:
        current_max = getattr(config, 'ADAPTIVE_SIZING_MAX_MULT', 1.50)
        if current_max > 1.20:
            new_val = max(1.20, current_max - 0.10)
            if not already_tried('ADAPTIVE_SIZING_MAX_MULT', current_max, new_val):
                changes.append(('ADAPTIVE_SIZING_MAX_MULT', current_max, new_val,
                    f'Adaptive sizing mult {adaptive_mult:.2f} with DD {dd:.1f}% — cap lower'))
    
    # ============================================================
    # RULE 31 (PATCH #68): Grid cooldown tuning
    # If grid trades are profitable but few → reduce cooldown
    # ============================================================
    if grid_trades_p68 > 0 and grid_trades_p68 < 10 and len(changes) < 3:
        ranging_grid_wr_r31 = ranging_data.get('win_rate', 50)
        if ranging_grid_wr_r31 > 55:
            current_cd = getattr(config, 'GRID_COOLDOWN_CANDLES', 8)
            if current_cd > 4:
                new_val = max(4, current_cd - 2)
                if not already_tried('GRID_COOLDOWN_CANDLES', current_cd, new_val):
                    changes.append(('GRID_COOLDOWN_CANDLES', current_cd, new_val,
                        f'Grid WR {ranging_grid_wr_r31:.0f}% profitable but only {grid_trades_p68} trades — reduce cooldown'))
    
    return changes[:3]


# ============================================================================
# CONFIG MODIFIER — Apply and revert parameter changes
# ============================================================================
def apply_changes(changes):
    """
    Apply parameter changes to config module.
    Returns dict of old values for rollback.
    """
    old_values = {}
    for param, old_val, new_val, reason in changes:
        old_values[param] = getattr(config, param)
        setattr(config, param, new_val)
    return old_values


def revert_changes(old_values):
    """Revert config to old values."""
    for param, val in old_values.items():
        setattr(config, param, val)


def apply_best_config(best_config):
    """Apply a full config snapshot."""
    for param, val in best_config.items():
        setattr(config, param, val)


def snapshot_config():
    """Capture current config values for all tunable params."""
    tunable = [
        'RISK_PER_TRADE', 'MAX_POSITION_VALUE_PCT', 'FEE_RATE', 'FEE_GATE_MULTIPLIER',
        'SL_ATR_MULT', 'TP_ATR_MULT', 'SL_CLAMP_MIN', 'SL_CLAMP_MAX',
        'TP_CLAMP_MIN', 'TP_CLAMP_MAX',
        'PHASE_1_MIN_R', 'PHASE_2_BE_R', 'PHASE_3_LOCK_R', 'PHASE_4_LOCK_R',
        'PHASE_5_CHANDELIER_R', 'TRAILING_DISTANCE_ATR',
        # PATCH #63: Parameterized trail distances
        'PHASE3_TRAIL_ATR', 'PHASE4_TRAIL_ATR',
        'PARTIAL_ATR_L1_PCT', 'PARTIAL_ATR_L1_MULT',
        'PARTIAL_ATR_L2_PCT', 'PARTIAL_ATR_L2_MULT',
        'PARTIAL_ATR_L3_PCT', 'PARTIAL_ATR_L3_MULT',
        'ENSEMBLE_THRESHOLD_NORMAL', 'ENSEMBLE_THRESHOLD_STRONG',
        'ENSEMBLE_THRESHOLD_CONFLICT',
        'CONFIDENCE_FLOOR', 'CONFIDENCE_CLAMP_MIN', 'CONFIDENCE_CLAMP_MAX',
        'QDV_MIN_CONFIDENCE', 'QDV_STARVATION_CYCLES',
        'BE_PROFIT_BUFFER_ATR',
        # PATCH #62: Price Action params
        'PA_MIN_SCORE', 'PA_GATE_MIN_SCORE', 'PA_BOOST_THRESHOLD',
        # PATCH #63: Long trend filter
        'LONG_COUNTER_TREND_PENALTY',
        # PATCH #65: Momentum gate + RANGING micro-scalp
        'MOMENTUM_GATE_CANDLES', 'MOMENTUM_GATE_MIN_R', 'MOMENTUM_GATE_SL_TIGHTEN',
        'RANGING_SL_ATR_MULT', 'RANGING_TP_ATR_MULT',
        # PATCH #66: Pre-entry momentum + LONG filter + Bollinger MR
        'PRE_ENTRY_MOMENTUM_CANDLES', 'PRE_ENTRY_MOMENTUM_MIN_ALIGNED',
        'LONG_EMA_SLOPE_MIN',
        'BOLLINGER_MR_RSI_LOW', 'BOLLINGER_MR_RSI_HIGH',
        'BOLLINGER_MR_BB_LOW', 'BOLLINGER_MR_BB_HIGH',
        'BOLLINGER_MR_VOL_MIN', 'BOLLINGER_MR_MAX_ADX',
        # PATCH #67: Grid Ranging + Volatility Pause + L3 + Contrarian
        'GRID_RANGING_ENABLED', 'GRID_BB_LOW', 'GRID_BB_HIGH',
        'GRID_MAX_ADX', 'GRID_SL_ATR_MULT', 'GRID_TP_ATR_MULT',
        'GRID_RISK_MULT', 'GRID_COOLDOWN_CANDLES',
        'VOLATILITY_PAUSE_ENABLED', 'VOLATILITY_PAUSE_LOSS_STREAK',
        'VOLATILITY_PAUSE_SIZE_MULT', 'VOLATILITY_PAUSE_RECOVERY_WINS',
        'SENTIMENT_CONTRARIAN', 'SENTIMENT_CONTRARIAN_BUY_BOOST',
        'SENTIMENT_CONTRARIAN_SELL_BOOST',
        'PARTIAL_ATR_L3_PCT', 'PARTIAL_ATR_L3_MULT',
        # PATCH #68: RANGING bypass + Dynamic SL + Adaptive sizing
        'RANGING_CONFIDENCE_FLOOR', 'RANGING_BYPASS_ENABLED',
        'RANGING_GRID_CONFIDENCE_BOOST',
        'DYNAMIC_SL_ENABLED', 'DYNAMIC_SL_TRENDING_DOWN_SHORT',
        'DYNAMIC_SL_TRENDING_DOWN_LONG', 'DYNAMIC_SL_TRENDING_UP_LONG',
        'DYNAMIC_SL_TRENDING_UP_SHORT', 'DYNAMIC_SL_RANGING',
        'ADAPTIVE_SIZING_ENABLED', 'ADAPTIVE_SIZING_WIN_MULT',
        'ADAPTIVE_SIZING_LOSS_MULT', 'ADAPTIVE_SIZING_MAX_MULT',
        'ADAPTIVE_SIZING_MIN_MULT', 'ADAPTIVE_SIZING_RESET_AFTER',
        # P#69: Per-pair config overrides
        'BNB_DIRECTION_FILTER_ENABLED', 'BNB_LONG_MIN_CONFIDENCE',
        # P#70: BTC direction filter + BNB SHORT floor
        'BTC_DIRECTION_FILTER_ENABLED', 'BTC_LONG_BLOCK_ALL',
    ]
    return {p: getattr(config, p) for p in tunable if hasattr(config, p)}


# ============================================================================
# SKYNET BRAIN — Main Iterative Loop
# ============================================================================
class SkynetBrain:
    """
    Iterative backtest optimization engine.
    
    Usage:
        brain = SkynetBrain(max_iterations=10, timeframe='15m')
        best_results, history = brain.run()
        
        # P#70: Per-pair optimization
        brain = SkynetBrain(max_iterations=8, symbol='SOLUSDT')
        best_results, history = brain.run()
    """
    
    def __init__(self, max_iterations=10, timeframe='15m',
                 convergence_threshold=0.5, convergence_patience=3,
                 verbose=True, symbol=None):
        self.max_iterations = max_iterations
        self.timeframe = timeframe
        self.convergence_threshold = convergence_threshold
        self.convergence_patience = convergence_patience
        self.verbose = verbose
        self.symbol = symbol  # P#70: None = BTC default, else specific pair
        
        # History
        self.history = []
        self.best_score = 0
        self.best_results = None
        self.best_config = None
        self.best_iteration = 0
        self.no_improvement_count = 0
        
        # Memory: track which changes were tried and failed
        self.tried_changes = set()  # (param, direction) pairs that didn't help
        
    def run(self):
        """
        Main loop: Run → Analyze → Adjust → Repeat.
        
        Returns:
            (best_results, history)
        """
        # P#70: Per-pair support — load pair-specific data + apply overrides
        from .runner import load_pair_data
        from .pair_config import apply_pair_overrides, restore_config, get_pair_capital
        
        pair_originals = {}
        pair_capital = None
        
        if self.symbol and self.symbol != 'BTCUSDT':
            df = load_pair_data(self.symbol, self.timeframe)
            # Apply pair-specific overrides
            pair_originals = apply_pair_overrides(self.symbol)
            pair_capital = get_pair_capital(self.symbol)
        else:
            df = load_data(self.timeframe)
            self.symbol = self.symbol or 'BTCUSDT'
        
        if df is None:
            print(f"❌ No data found for {self.symbol}!")
            if pair_originals:
                restore_config(pair_originals)
            return None, []
        
        print(f"\n{'═'*90}")
        print(f"  🧠 SKYNET BRAIN — Iterative Backtest Learning Loop")
        print(f"  🎯 Symbol: {self.symbol}" + (f" | Capital: ${pair_capital:,.0f}" if pair_capital else ""))
        print(f"  ⚙️  Max iterations: {self.max_iterations}")
        print(f"  📊 Timeframe: {self.timeframe}")
        print(f"  📈 Data: {len(df)} candles")
        print(f"  🎯 Convergence: {self.convergence_threshold}% improvement for {self.convergence_patience} rounds")
        print(f"{'═'*90}")
        
        try:
            return self._run_loop(df, pair_capital)
        finally:
            # Always restore config after per-pair Brain run
            if pair_originals:
                restore_config(pair_originals)
    
    def _run_loop(self, df, pair_capital=None):
        """Inner optimization loop."""
        for iteration in range(1, self.max_iterations + 1):
            print(f"\n{'─'*90}")
            print(f"  🔄 ITERATION {iteration}/{self.max_iterations} — {self.symbol}")
            print(f"{'─'*90}")
            
            # Capture config before run
            config_snapshot = snapshot_config()
            
            # Run backtest
            t0 = time.time()
            
            # Speed optimization: increase XGBoost retrain interval during loop
            # Normal: 200 candles → 70 retrains on 14k data. Brain: 1000 → 14 retrains
            original_retrain = getattr(config, 'XGBOOST_RETRAIN_INTERVAL', 200)
            config.XGBOOST_RETRAIN_INTERVAL = max(1000, original_retrain)
            
            engine = FullPipelineEngine(
                initial_capital=pair_capital,
                symbol=self.symbol
            )
            results = engine.run(df, self.timeframe)
            
            config.XGBOOST_RETRAIN_INTERVAL = original_retrain  # Restore
            elapsed = time.time() - t0
            
            if results.get('error'):
                print(f"  ❌ Error: {results['error']}")
                break
            
            # Score results
            current_score = score_results(results)
            
            # Quick summary
            trades = results.get('total_trades', 0)
            pf = results.get('profit_factor', 0)
            wr = results.get('win_rate', 0)
            wl = results.get('win_loss_ratio', 0)
            dd = results.get('max_drawdown', 0)
            ret = results.get('total_return_pct', 0)
            tp_exits = results.get('exit_reasons', {}).get('TP', 0)
            
            print(f"\n  📊 Results: {trades} trades | PF {pf:.3f} | WR {wr:.1f}% | "
                  f"W/L {wl:.2f} | DD {dd:.1f}% | Return {ret:+.2f}%")
            print(f"  🎯 SCORE: {current_score:.1f}/100 | TP exits: {tp_exits} | "
                  f"Time: {elapsed:.1f}s")
            
            # Record history
            entry = {
                'iteration': iteration,
                'score': current_score,
                'trades': trades,
                'pf': pf,
                'wr': wr,
                'wl': wl,
                'dd': dd,
                'return_pct': ret,
                'tp_exits': tp_exits,
                'config': config_snapshot,
                'timestamp': datetime.now().isoformat(),
            }
            
            # Check if this is the best
            improvement = current_score - self.best_score
            
            if current_score > self.best_score:
                self.best_score = current_score
                self.best_results = results
                self.best_config = config_snapshot
                self.best_iteration = iteration
                self.no_improvement_count = 0
                entry['status'] = 'NEW_BEST'
                print(f"  ✅ NEW BEST! Score {current_score:.1f} "
                      f"(+{improvement:.1f} from previous best)")
            else:
                self.no_improvement_count += 1
                entry['status'] = 'NO_IMPROVEMENT'
                print(f"  ⚠️  No improvement ({current_score:.1f} vs best {self.best_score:.1f})")
                
                # PATCH #62 FIX: Remember which changes from PREVIOUS iteration failed
                # The changes that CAUSED this bad result were applied at the end of
                # the previous iteration — stored in self.history[-1]['changes']
                if self.history:
                    prev_entry = self.history[-1]
                    for param, old_val, new_val, reason in prev_entry.get('changes', []):
                        direction = 'up' if new_val > old_val else 'down'
                        self.tried_changes.add((param, direction))
                        print(f"  🚫 Marked failed: {param} {direction}")
                
                # Revert to best config
                if self.best_config:
                    apply_best_config(self.best_config)
                    print(f"  ↩️  Reverted to best config (iteration {self.best_iteration})")
            
            self.history.append(entry)
            
            # Check convergence
            if self.no_improvement_count >= self.convergence_patience:
                print(f"\n  🏁 CONVERGED — No improvement for {self.convergence_patience} "
                      f"consecutive iterations")
                break
            
            # Last iteration — don't diagnose
            if iteration >= self.max_iterations:
                break
            
            # Diagnose and generate changes for next iteration
            changes = diagnose_results(results, self.best_results, self.tried_changes)
            
            if not changes:
                print(f"  ℹ️  No changes suggested — system is at local optimum")
                self.no_improvement_count += 1
                if self.no_improvement_count >= self.convergence_patience:
                    break
                continue
            
            # Apply changes
            entry['changes'] = [(p, o, n, r) for p, o, n, r in changes]
            entry['changes_params'] = [(p, 'up' if n > o else 'down') for p, o, n, r in changes]
            
            print(f"\n  🔧 ADJUSTMENTS FOR NEXT ITERATION:")
            for param, old_val, new_val, reason in changes:
                print(f"     {param}: {old_val} → {new_val}")
                print(f"       └─ {reason}")
            
            old_values = apply_changes(changes)
        
        # Final report
        self._print_final_report()
        
        # Save results
        self._save_results()
        
        return self.best_results, self.history
    
    
    def _print_final_report(self):
        """Print comprehensive final report."""
        print(f"\n{'═'*90}")
        print(f"  🏆 SKYNET BRAIN — FINAL REPORT")
        print(f"{'═'*90}")
        
        print(f"\n  Iterations run:     {len(self.history)}")
        print(f"  Best iteration:     #{self.best_iteration}")
        print(f"  Best score:         {self.best_score:.1f}/100")
        
        if self.best_results:
            r = self.best_results
            print(f"\n  Best results:")
            print(f"    Trades:       {r.get('total_trades', 0)}")
            print(f"    PF:           {r.get('profit_factor', 0):.3f}")
            print(f"    WR:           {r.get('win_rate', 0):.1f}%")
            print(f"    W/L:          {r.get('win_loss_ratio', 0):.2f}")
            print(f"    MaxDD:        {r.get('max_drawdown', 0):.2f}%")
            print(f"    Return:       {r.get('total_return_pct', 0):+.2f}%")
            print(f"    Sharpe:       {r.get('sharpe_ratio', 0):.3f}")
            print(f"    TP exits:     {r.get('exit_reasons', {}).get('TP', 0)}")
        
        if self.best_config:
            print(f"\n  Best config values:")
            important = ['RISK_PER_TRADE', 'TP_ATR_MULT', 'SL_ATR_MULT',
                         'PARTIAL_ATR_L1_PCT', 'PARTIAL_ATR_L1_MULT',
                         'PARTIAL_ATR_L2_PCT', 'PARTIAL_ATR_L2_MULT',
                         'TRAILING_DISTANCE_ATR', 'PHASE3_TRAIL_ATR', 'PHASE4_TRAIL_ATR',
                         'PHASE_1_MIN_R', 'PHASE_2_BE_R',
                         'CONFIDENCE_FLOOR', 'ENSEMBLE_THRESHOLD_NORMAL',
                         'FEE_GATE_MULTIPLIER', 'LONG_COUNTER_TREND_PENALTY']
            for k in important:
                if k in self.best_config:
                    print(f"    {k}: {self.best_config[k]}")
        
        # Evolution table
        print(f"\n  📈 EVOLUTION:")
        print(f"  {'Iter':>4} {'Score':>7} {'PF':>7} {'WR':>6} {'W/L':>6} "
              f"{'DD':>6} {'Ret':>7} {'TP':>4} {'Status':<15}")
        print(f"  {'─'*70}")
        for h in self.history:
            status_emoji = '✅' if h['status'] == 'NEW_BEST' else '⚠️ '
            print(f"  {h['iteration']:>4} {h['score']:>7.1f} {h['pf']:>7.3f} "
                  f"{h['wr']:>5.1f}% {h['wl']:>6.2f} {h['dd']:>5.1f}% "
                  f"{h['return_pct']:>+6.2f}% {h['tp_exits']:>4} "
                  f"{status_emoji} {h['status']}")
    
    def _save_results(self):
        """Save iteration history and best config."""
        results_dir = os.path.join(os.path.dirname(__file__), '..', 'results')
        os.makedirs(results_dir, exist_ok=True)
        
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        
        # Save history
        history_file = os.path.join(results_dir, f'skynet_brain_{timestamp}.json')
        save_data = {
            'best_iteration': self.best_iteration,
            'best_score': self.best_score,
            'best_config': self.best_config,
            'iterations': self.history,
            'timeframe': self.timeframe,
        }
        with open(history_file, 'w') as f:
            json.dump(save_data, f, indent=2, default=str)
        print(f"\n  💾 Results saved: {history_file}")
        
        # Apply best config to module (for next manual run)
        if self.best_config:
            apply_best_config(self.best_config)
            print(f"  ✅ Best config applied to module (active for next run)")


# ============================================================================
# CLI
# ============================================================================
def main():
    import argparse
    parser = argparse.ArgumentParser(description='Skynet Brain — Iterative Backtest Loop')
    parser.add_argument('--iterations', '-n', type=int, default=10,
                       help='Max iterations (default: 10)')
    parser.add_argument('--timeframe', '-t', default='15m',
                       help='Timeframe (15m, 1h, 4h)')
    parser.add_argument('--patience', '-p', type=int, default=3,
                       help='Convergence patience (default: 3)')
    parser.add_argument('--symbol', '-s', default=None,
                       help='Symbol to optimize (e.g. SOLUSDT, BNBUSDT). Default: BTCUSDT')
    parser.add_argument('--trades', action='store_true',
                       help='Show full trade-by-trade analysis + CSV export')
    args = parser.parse_args()
    
    symbol_label = args.symbol or 'BTCUSDT'
    print("╔══════════════════════════════════════════════════════════════╗")
    print("║  TURBO-BOT v6.0.0 — SKYNET BRAIN                          ║")
    print(f"║  PATCH #70 — Per-Pair Brain ({symbol_label})              ║")
    print("╚══════════════════════════════════════════════════════════════╝")
    
    brain = SkynetBrain(
        max_iterations=args.iterations,
        timeframe=args.timeframe,
        convergence_patience=args.patience,
        symbol=args.symbol,
    )
    
    best_results, history = brain.run()
    
    # Print best results in full
    if best_results:
        print(f"\n\n{'═'*90}")
        print(f"  📋 BEST ITERATION FULL RESULTS")
        print(f"{'═'*90}")
        print_results(best_results, verbose=True)
        
        # PATCH #64: Always print trade table + export CSV
        from backtest_pipeline.runner import print_trades_table, export_trades_csv
        print_trades_table(best_results)
        export_trades_csv(best_results)


if __name__ == '__main__':
    main()
