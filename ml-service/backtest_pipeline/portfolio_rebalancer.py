"""
P#200g: Dynamic Portfolio Rebalancer

Weekly Sharpe-weighted capital reallocation across pairs.
Operates at the orchestrator level (above individual pair engines).

Usage:
    rebalancer = PortfolioRebalancer(pairs, base_allocations)
    for each trade: rebalancer.record_pnl(pair, pnl)
    for each rebalance check: new_alloc = rebalancer.maybe_rebalance(candle_idx)
"""

import statistics
from typing import Optional


class PortfolioRebalancer:
    """
    Dynamic portfolio rebalancer — adjusts capital allocation per pair
    based on rolling Sharpe ratio performance.

    Floor: 5% minimum per pair (prevent zero allocation)
    Cap: 50% maximum per pair (prevent concentration risk)
    Rebalance frequency: configurable (default = weekly on 15m = 672 candles)
    """

    def __init__(self, pairs, base_allocations, rebalance_interval=672):
        """
        Args:
            pairs: list of pair symbols
            base_allocations: dict {pair: fraction} — initial/fallback allocation
            rebalance_interval: candles between rebalance checks (672 = 1 week on 15m)
        """
        self.pairs = list(pairs)
        self.base = dict(base_allocations)
        self.current = dict(base_allocations)
        self.rebalance_interval = rebalance_interval
        self.last_rebalance = 0
        self.rebalance_count = 0

        # Rolling PnL per pair (last 100 trades)
        self._pnls: dict[str, list[float]] = {p: [] for p in pairs}

        # History of allocation changes
        self.history: list[dict] = []

    def record_pnl(self, pair: str, pnl: float):
        """Record a completed trade PnL for a pair."""
        if pair not in self._pnls:
            self._pnls[pair] = []
        self._pnls[pair].append(pnl)
        # Keep last 100 trades per pair
        if len(self._pnls[pair]) > 100:
            self._pnls[pair] = self._pnls[pair][-100:]

    def maybe_rebalance(self, candle_idx: int) -> Optional[dict]:
        """
        Check if rebalance is due and compute new allocations.

        Returns new allocation dict if rebalanced, None otherwise.
        """
        if candle_idx - self.last_rebalance < self.rebalance_interval:
            return None

        self.last_rebalance = candle_idx

        # Compute rolling Sharpe per pair
        sharpes = {}
        for pair in self.pairs:
            pnls = self._pnls.get(pair, [])
            if len(pnls) < 5:
                sharpes[pair] = 0.5  # Default neutral — not enough data
                continue
            mean = sum(pnls) / len(pnls)
            std = statistics.stdev(pnls) if len(pnls) > 1 else 1.0
            sharpes[pair] = mean / std if std > 0 else 0

        # Sharpe-weighted allocation
        # Use max(0.1, sharpe) to prevent negative allocation for losing pairs
        total_sharpe = sum(max(0.1, s) for s in sharpes.values())
        if total_sharpe <= 0:
            return None  # Can't rebalance — all pairs equally bad

        new_alloc = {}
        for pair in self.pairs:
            raw = max(0.1, sharpes[pair]) / total_sharpe
            # Floor: 5% minimum — always keep exposure
            # Cap: 50% maximum — prevent concentration
            new_alloc[pair] = max(0.05, min(0.50, raw))

        # Normalize to sum = 1.0
        total = sum(new_alloc.values())
        if total > 0:
            new_alloc = {k: round(v / total, 4) for k, v in new_alloc.items()}

        # Store
        self.current = new_alloc
        self.rebalance_count += 1
        self.history.append({
            'candle_idx': candle_idx,
            'sharpes': dict(sharpes),
            'allocation': dict(new_alloc),
        })

        return new_alloc

    def get_allocation(self, pair: str) -> float:
        """Get current allocation for a pair."""
        return self.current.get(pair, self.base.get(pair, 0.0))

    def get_stats(self) -> dict:
        """Return rebalancer statistics."""
        return {
            'rebalance_count': self.rebalance_count,
            'current_allocation': dict(self.current),
            'base_allocation': dict(self.base),
            'pairs_tracked': len(self.pairs),
            'trades_per_pair': {p: len(pnls) for p, pnls in self._pnls.items()},
            'last_rebalance_idx': self.last_rebalance,
            'history_length': len(self.history),
        }
