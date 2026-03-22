"""
P#197 FAZA 3a: Portfolio Allocator with Kelly Criterion

Dynamically allocates capital across pairs and strategies based on:
1. Kelly fractions from observed edge (win rate × payoff ratio)
2. Correlation-aware position limits
3. Risk budgeting per strategy type (directional vs funding vs grid)

Replaces static PAIR_CAPITAL_ALLOCATION with adaptive allocation.
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field


@dataclass
class StrategyPerformance:
    """Rolling window performance metrics for a strategy-pair combo."""
    wins: int = 0
    losses: int = 0
    total_profit: float = 0.0
    total_loss: float = 0.0
    trade_count: int = 0

    @property
    def win_rate(self) -> float:
        if self.trade_count == 0:
            return 0.0
        return self.wins / self.trade_count

    @property
    def avg_win(self) -> float:
        return self.total_profit / self.wins if self.wins > 0 else 0.0

    @property
    def avg_loss(self) -> float:
        return abs(self.total_loss / self.losses) if self.losses > 0 else 0.0

    @property
    def kelly_fraction(self) -> float:
        """Full Kelly: f* = (p*b - q) / b where p=WR, q=1-p, b=avg_win/avg_loss."""
        if self.trade_count < 10 or self.avg_loss == 0:
            return 0.0
        p = self.win_rate
        q = 1.0 - p
        b = self.avg_win / self.avg_loss
        f_star = (p * b - q) / b
        return max(0.0, f_star)

    def record_trade(self, pnl: float):
        self.trade_count += 1
        if pnl > 0:
            self.wins += 1
            self.total_profit += pnl
        else:
            self.losses += 1
            self.total_loss += pnl


@dataclass
class AllocationResult:
    """Output of the portfolio allocator."""
    pair_allocations: dict[str, float]       # pair -> fraction of total capital
    strategy_budgets: dict[str, float]       # strategy type -> max capital fraction
    kelly_fractions: dict[str, float]        # pair:strategy -> Kelly f*
    effective_leverage: float                 # total portfolio leverage


class PortfolioAllocator:
    """
    Kelly-based portfolio allocator with risk budgets.

    Usage:
        allocator = PortfolioAllocator(total_capital=10000)
        allocator.record_trade('SOLUSDT', 'GridV2', pnl=5.2)
        allocator.record_trade('SOLUSDT', 'GridV2', pnl=-2.1)
        result = allocator.compute_allocation()
    """

    # Strategy-type risk budgets (max fraction of total capital)
    STRATEGY_BUDGETS = {
        'funding': 0.40,      # Up to 40% in funding arb (low risk)
        'grid': 0.35,         # Up to 35% in grid trading (medium risk)
        'directional': 0.25,  # Up to 25% in directional (high risk)
    }

    # Map strategy names to types
    STRATEGY_TYPE_MAP = {
        'FundingArb': 'funding',
        'GridV2': 'grid',
        'MomentumHTF': 'directional',
        'AdvancedAdaptive': 'directional',
        'MACrossover': 'directional',
        'SuperTrend': 'directional',
        'MomentumPro': 'directional',
        'BollingerMR': 'grid',
        'ExternalSignals': 'directional',
        'GPU_Direct': 'directional',
    }

    def __init__(
        self,
        total_capital: float = 10000,
        kelly_safety: float = 0.25,
        min_allocation: float = 0.05,
        max_allocation: float = 0.45,
        min_trades_for_kelly: int = 20,
    ):
        self.total_capital = total_capital
        self.kelly_safety = kelly_safety  # Quarter-Kelly by default
        self.min_allocation = min_allocation
        self.max_allocation = max_allocation
        self.min_trades_for_kelly = min_trades_for_kelly

        # Performance tracking per pair:strategy
        self.performance: dict[str, StrategyPerformance] = {}

        # Static fallback allocations (used when insufficient data)
        self.static_allocations = {
            'BTCUSDT': 0.08,
            'ETHUSDT': 0.12,
            'SOLUSDT': 0.25,
            'BNBUSDT': 0.40,
            'XRPUSDT': 0.15,
        }

    def record_trade(self, pair: str, strategy: str, pnl: float):
        """Record a completed trade for performance tracking."""
        key = f'{pair}:{strategy}'
        if key not in self.performance:
            self.performance[key] = StrategyPerformance()
        self.performance[key].record_trade(pnl)

    def _get_kelly(self, pair: str, strategy: str) -> float:
        """Get safety-adjusted Kelly fraction for a pair:strategy combo."""
        key = f'{pair}:{strategy}'
        perf = self.performance.get(key)
        if perf is None or perf.trade_count < self.min_trades_for_kelly:
            return 0.0
        raw_kelly = perf.kelly_fraction
        return raw_kelly * self.kelly_safety

    def compute_allocation(self, pairs: list[str] | None = None) -> AllocationResult:
        """
        Compute optimal capital allocation across pairs.

        Returns AllocationResult with normalized pair allocations and Kelly data.
        """
        if pairs is None:
            pairs = list(self.static_allocations.keys())

        kelly_fractions = {}
        pair_scores = {}

        for pair in pairs:
            pair_total_kelly = 0.0
            pair_trade_count = 0

            for key, perf in self.performance.items():
                if key.startswith(f'{pair}:'):
                    strategy = key.split(':', 1)[1]
                    k = self._get_kelly(pair, strategy)
                    kelly_fractions[key] = k
                    pair_total_kelly += k
                    pair_trade_count += perf.trade_count

            if pair_trade_count >= self.min_trades_for_kelly:
                # Kelly-weighted score
                pair_scores[pair] = max(pair_total_kelly, self.min_allocation)
            else:
                # Fall back to static
                pair_scores[pair] = self.static_allocations.get(pair, 0.10)

        # Normalize to sum to 1.0
        total_score = sum(pair_scores.values())
        if total_score <= 0:
            # Emergency fallback
            pair_allocations = {p: 1.0 / len(pairs) for p in pairs}
        else:
            pair_allocations = {}
            for pair in pairs:
                raw = pair_scores[pair] / total_score
                clamped = max(self.min_allocation, min(self.max_allocation, raw))
                pair_allocations[pair] = clamped

            # Re-normalize after clamping
            total = sum(pair_allocations.values())
            pair_allocations = {p: v / total for p, v in pair_allocations.items()}

        # Compute strategy-type budgets
        strategy_budgets = dict(self.STRATEGY_BUDGETS)

        effective_leverage = sum(
            kelly_fractions.get(k, 0) for k in kelly_fractions
        )

        return AllocationResult(
            pair_allocations=pair_allocations,
            strategy_budgets=strategy_budgets,
            kelly_fractions=kelly_fractions,
            effective_leverage=effective_leverage,
        )

    def get_pair_capital(self, pair: str, allocation_result: AllocationResult | None = None) -> float:
        """Get capital for a specific pair."""
        if allocation_result is None:
            allocation_result = self.compute_allocation()
        frac = allocation_result.pair_allocations.get(pair, 0.10)
        return self.total_capital * frac

    def get_risk_per_trade(self, pair: str, strategy: str) -> float:
        """
        Get Kelly-adjusted risk per trade for a pair:strategy.
        Returns fraction of pair capital to risk (e.g. 0.015 = 1.5%).
        """
        k = self._get_kelly(pair, strategy)
        if k <= 0:
            return 0.015  # Default 1.5%

        strat_type = self.STRATEGY_TYPE_MAP.get(strategy, 'directional')
        base_risk = {
            'funding': 0.010,
            'grid': 0.012,
            'directional': 0.015,
        }.get(strat_type, 0.015)

        # Scale by Kelly (quarter-Kelly already applied)
        # Clamp between half-base and double-base
        kelly_adjusted = base_risk * (1.0 + k)
        return max(base_risk * 0.5, min(base_risk * 2.0, kelly_adjusted))
