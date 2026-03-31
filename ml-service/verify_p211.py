#!/usr/bin/env python3
"""Verify P#211 config changes are loaded correctly."""
from backtest_pipeline.pair_config import PAIR_OVERRIDES, PAIR_CAPITAL_ALLOCATION

print("=== Capital Allocation ===")
for k, v in PAIR_CAPITAL_ALLOCATION.items():
    print(f"  {k}: {v*100:.0f}% (${v*10000:.0f})")
print(f"  Total: {sum(PAIR_CAPITAL_ALLOCATION.values())*100:.0f}%")
print()

for pair in ["SOLUSDT", "BNBUSDT", "XRPUSDT"]:
    cfg = PAIR_OVERRIDES.get(pair, {})
    print(f"=== {pair} Grid V2 ===")
    print(f"  ENABLED: {cfg.get('GRID_V2_ENABLED', False)}")
    print(f"  TIMEFRAMES: {cfg.get('GRID_V2_ALLOWED_TIMEFRAMES', [])}")
    print(f"  TP_ATR: {cfg.get('GRID_V2_TP_ATR', 'default')}")
    print(f"  SL_ATR: {cfg.get('GRID_V2_SL_ATR', 'default')}")
    print(f"  RISK: {cfg.get('GRID_V2_RISK_PER_TRADE', 'default')}")
    print(f"  COOLDOWN: {cfg.get('GRID_V2_COOLDOWN', 'default')}")
    print(f"  MAX_TRADES: {cfg.get('GRID_V2_MAX_TRADES', 'default')}")
    print()
