"""
P#197 FAZA 3b: Delta-Neutral Funding Engine

Enhanced funding rate arbitrage with:
1. Dynamic capital sizing based on rate magnitude vs fees
2. Cross-pair rotation — shift funding capital to highest-rate pairs
3. Rate forecasting using exponential moving average of historical rates
4. Correlation-aware exposure limits

Wraps existing FundingRateArbitrage with portfolio-level coordination.
"""

from __future__ import annotations

import math
from collections import deque
from dataclasses import dataclass, field


@dataclass
class FundingOpportunity:
    """A funding opportunity for a specific pair."""
    pair: str
    current_rate: float
    ema_rate: float
    fee_cost: float       # Round-trip fees for allocated capital
    expected_pnl: float   # Expected net PnL per settlement
    edge_ratio: float     # expected_pnl / fee_cost
    allocated_capital: float


class DeltaNeutralEngine:
    """
    Portfolio-level funding rate coordinator.

    Manages funding arb across all pairs with dynamic capital allocation
    based on rate attractiveness and cross-pair correlation limits.

    Usage:
        engine = DeltaNeutralEngine(total_funding_budget=3000)
        engine.update_rate('BTCUSDT', 0.0003)
        engine.update_rate('ETHUSDT', 0.0001)
        allocations = engine.compute_allocations()
    """

    # Pairs highly correlated in funding rates (reduce combined exposure)
    CORRELATION_GROUPS = {
        'crypto_major': ['BTCUSDT', 'ETHUSDT'],    # BTC/ETH rates move together
        'crypto_alt': ['SOLUSDT', 'BNBUSDT', 'XRPUSDT'],  # Alt rates partially correlated
    }
    MAX_GROUP_EXPOSURE = 0.60  # Max 60% of funding budget in one correlation group

    def __init__(
        self,
        total_funding_budget: float = 3000.0,
        fee_rate: float = 0.00075,      # 0.075% per side
        min_edge_ratio: float = 2.0,     # Expected PnL must be 2× fees
        ema_alpha: float = 0.3,          # EMA smoothing for rate forecasting
        rate_history_len: int = 50,      # Keep last 50 settlement rates
        min_rate: float = 0.0001,        # 0.01% per 8h settlement
        max_pair_allocation: float = 0.40,  # Max 40% of budget to one pair
    ):
        self.total_funding_budget = total_funding_budget
        self.fee_rate = fee_rate
        self.min_edge_ratio = min_edge_ratio
        self.ema_alpha = ema_alpha
        self.rate_history_len = rate_history_len
        self.min_rate = min_rate
        self.max_pair_allocation = max_pair_allocation

        # Per-pair state
        self._current_rates: dict[str, float] = {}
        self._ema_rates: dict[str, float] = {}
        self._rate_history: dict[str, deque] = {}
        self._cumulative_pnl: dict[str, float] = {}

    def update_rate(self, pair: str, rate: float):
        """Update the latest funding rate observation for a pair."""
        self._current_rates[pair] = rate

        if pair not in self._rate_history:
            self._rate_history[pair] = deque(maxlen=self.rate_history_len)
            self._ema_rates[pair] = rate
            self._cumulative_pnl[pair] = 0.0

        self._rate_history[pair].append(rate)

        # Update EMA
        alpha = self.ema_alpha
        self._ema_rates[pair] = alpha * rate + (1 - alpha) * self._ema_rates[pair]

    def record_funding_pnl(self, pair: str, pnl: float):
        """Record realized funding PnL for a pair."""
        self._cumulative_pnl[pair] = self._cumulative_pnl.get(pair, 0) + pnl

    def _compute_opportunity(self, pair: str, capital: float) -> FundingOpportunity:
        """Evaluate funding opportunity for a pair given tentative capital."""
        rate = self._current_rates.get(pair, 0)
        ema = self._ema_rates.get(pair, 0)

        # Use conservative rate estimate: min of current and EMA
        effective_rate = min(abs(rate), abs(ema))

        # Fees: 4× fee_rate per round trip (open spot + perp, close both)
        fee_cost = capital * self.fee_rate * 4

        # Expected PnL per settlement
        expected_pnl = capital * effective_rate

        edge_ratio = expected_pnl / fee_cost if fee_cost > 0 else 0

        return FundingOpportunity(
            pair=pair,
            current_rate=rate,
            ema_rate=ema,
            fee_cost=fee_cost,
            expected_pnl=expected_pnl,
            edge_ratio=edge_ratio,
            allocated_capital=capital,
        )

    def compute_allocations(self, pairs: list[str] | None = None) -> dict[str, FundingOpportunity]:
        """
        Compute optimal funding capital allocation across pairs.

        Returns dict of pair -> FundingOpportunity with allocated capital.
        Only includes pairs that meet the minimum edge threshold.
        """
        if pairs is None:
            pairs = list(self._current_rates.keys())

        if not pairs:
            return {}

        # Score each pair by EMA rate attractiveness
        pair_scores: dict[str, float] = {}
        for pair in pairs:
            ema = abs(self._ema_rates.get(pair, 0))
            if ema < self.min_rate:
                continue
            # Score = EMA rate (higher = more attractive)
            pair_scores[pair] = ema

        if not pair_scores:
            return {}

        # Allocate proportionally to score, respecting limits
        total_score = sum(pair_scores.values())
        raw_allocations: dict[str, float] = {}
        for pair, score in pair_scores.items():
            raw = (score / total_score) * self.total_funding_budget
            capped = min(raw, self.total_funding_budget * self.max_pair_allocation)
            raw_allocations[pair] = capped

        # Apply correlation group limits
        for group_name, group_pairs in self.CORRELATION_GROUPS.items():
            group_total = sum(raw_allocations.get(p, 0) for p in group_pairs)
            max_group = self.total_funding_budget * self.MAX_GROUP_EXPOSURE
            if group_total > max_group:
                scale = max_group / group_total
                for p in group_pairs:
                    if p in raw_allocations:
                        raw_allocations[p] *= scale

        # Re-normalize to budget
        total_allocated = sum(raw_allocations.values())
        if total_allocated > self.total_funding_budget:
            scale = self.total_funding_budget / total_allocated
            raw_allocations = {p: v * scale for p, v in raw_allocations.items()}

        # Evaluate each with allocated capital and filter by edge
        results: dict[str, FundingOpportunity] = {}
        for pair, capital in raw_allocations.items():
            opp = self._compute_opportunity(pair, capital)
            if opp.edge_ratio >= self.min_edge_ratio:
                results[pair] = opp

        return results

    def get_rate_trend(self, pair: str) -> str:
        """Get rate trend direction for a pair."""
        history = self._rate_history.get(pair)
        if not history or len(history) < 5:
            return 'UNKNOWN'
        recent = list(history)[-5:]
        if all(r > 0 for r in recent):
            avg_recent = sum(recent[-3:]) / 3
            avg_older = sum(recent[:2]) / 2
            if avg_recent > avg_older * 1.2:
                return 'RISING'
            return 'STABLE_POSITIVE'
        elif all(r < 0 for r in recent):
            return 'NEGATIVE'
        return 'MIXED'

    def summary(self) -> dict:
        """Return summary of current funding engine state."""
        return {
            'total_budget': self.total_funding_budget,
            'active_pairs': len(self._current_rates),
            'cumulative_pnl': dict(self._cumulative_pnl),
            'ema_rates': dict(self._ema_rates),
            'total_cumulative_pnl': sum(self._cumulative_pnl.values()),
        }
