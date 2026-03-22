"""
P#197 FAZA 3c: Continual Learning Agent

Online learning system that adapts bot behavior based on recent trade outcomes:
1. Rolling performance windows per strategy/pair/regime
2. Automatic strategy deactivation when performance degrades
3. Confidence calibration based on recent accuracy
4. Regime transition detection and strategy switching

Designed to be called after each trade close for incremental updates.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field
from typing import Any


@dataclass
class PerformanceWindow:
    """Fixed-size rolling window of trade outcomes."""
    max_size: int = 50
    pnls: deque = field(default_factory=lambda: deque(maxlen=50))
    outcomes: deque = field(default_factory=lambda: deque(maxlen=50))  # 1=win, 0=loss

    def __post_init__(self):
        self.pnls = deque(maxlen=self.max_size)
        self.outcomes = deque(maxlen=self.max_size)

    def add(self, pnl: float):
        self.pnls.append(pnl)
        self.outcomes.append(1 if pnl > 0 else 0)

    @property
    def count(self) -> int:
        return len(self.pnls)

    @property
    def win_rate(self) -> float:
        if not self.outcomes:
            return 0.5
        return sum(self.outcomes) / len(self.outcomes)

    @property
    def total_pnl(self) -> float:
        return sum(self.pnls)

    @property
    def avg_pnl(self) -> float:
        if not self.pnls:
            return 0.0
        return sum(self.pnls) / len(self.pnls)

    @property
    def sharpe(self) -> float:
        if len(self.pnls) < 5:
            return 0.0
        import statistics
        mean = self.avg_pnl
        std = statistics.stdev(self.pnls) if len(self.pnls) > 1 else 1.0
        return mean / std if std > 0 else 0.0

    @property
    def consecutive_losses(self) -> int:
        count = 0
        for o in reversed(self.outcomes):
            if o == 0:
                count += 1
            else:
                break
        return count


class ContinualLearningAgent:
    """
    Online learning agent that adapts trading behavior.

    Tracks rolling performance per:
    - Strategy (GridV2, MomentumHTF, ensemble, etc.)
    - Pair (BTCUSDT, ETHUSDT, etc.)
    - Regime (TRENDING_UP, RANGING, etc.)
    - Strategy × Regime combination

    Provides:
    - should_trade(): Pre-trade gate based on recent performance
    - confidence_adjustment(): Adjust confidence based on accuracy
    - get_deactivated_strategies(): List strategies to disable
    """

    def __init__(
        self,
        window_size: int = 50,
        min_trades_to_judge: int = 10,
        deactivation_threshold: float = -0.30,     # WR below 30% → deactivate
        reactivation_threshold: float = 0.45,       # WR above 45% → reactivate
        max_consecutive_losses: int = 5,            # 5 losses in a row → pause
        confidence_ema_alpha: float = 0.2,
    ):
        self.window_size = window_size
        self.min_trades = min_trades_to_judge
        self.deactivation_wr = deactivation_threshold
        self.reactivation_wr = reactivation_threshold
        self.max_consec_losses = max_consecutive_losses
        self.confidence_ema_alpha = confidence_ema_alpha

        # Performance windows
        self._strategy_perf: dict[str, PerformanceWindow] = {}
        self._pair_perf: dict[str, PerformanceWindow] = {}
        self._regime_perf: dict[str, PerformanceWindow] = {}
        self._combo_perf: dict[str, PerformanceWindow] = {}  # strategy:regime

        # Deactivation state
        self._deactivated: set[str] = set()  # strategy names currently deactivated

        # Confidence calibration EMA
        self._confidence_ema: dict[str, float] = {}  # strategy -> calibrated confidence

    def _get_window(self, store: dict[str, PerformanceWindow], key: str) -> PerformanceWindow:
        if key not in store:
            store[key] = PerformanceWindow(max_size=self.window_size)
        return store[key]

    def record_trade(
        self,
        strategy: str,
        pair: str,
        regime: str,
        pnl: float,
        confidence: float = 0.0,
    ):
        """Record a completed trade for learning updates."""
        # Update all windows
        self._get_window(self._strategy_perf, strategy).add(pnl)
        self._get_window(self._pair_perf, pair).add(pnl)
        self._get_window(self._regime_perf, regime).add(pnl)
        self._get_window(self._combo_perf, f'{strategy}:{regime}').add(pnl)

        # Update confidence calibration
        actual = 1.0 if pnl > 0 else 0.0
        alpha = self.confidence_ema_alpha
        prev = self._confidence_ema.get(strategy, 0.5)
        self._confidence_ema[strategy] = alpha * actual + (1 - alpha) * prev

        # Check deactivation
        self._check_deactivation(strategy)

    def _check_deactivation(self, strategy: str):
        """Check if strategy should be deactivated or reactivated."""
        perf = self._strategy_perf.get(strategy)
        if perf is None or perf.count < self.min_trades:
            return

        if strategy in self._deactivated:
            # Check reactivation (use last 10 trades only)
            recent = list(perf.outcomes)[-10:]
            if len(recent) >= 10:
                recent_wr = sum(recent) / len(recent)
                if recent_wr >= self.reactivation_wr:
                    self._deactivated.discard(strategy)
        else:
            # Check deactivation triggers
            if perf.win_rate < self.deactivation_wr:
                self._deactivated.add(strategy)
            elif perf.consecutive_losses >= self.max_consec_losses:
                self._deactivated.add(strategy)

    def should_trade(self, strategy: str, pair: str, regime: str) -> tuple[bool, str]:
        """
        Pre-trade gate: should we take this trade?

        Returns (allowed, reason).
        """
        # Check strategy deactivation
        if strategy in self._deactivated:
            return False, f'Strategy {strategy} deactivated (WR too low)'

        # Check pair consecutive losses
        pair_perf = self._pair_perf.get(pair)
        if pair_perf and pair_perf.consecutive_losses >= self.max_consec_losses:
            return False, f'Pair {pair} has {pair_perf.consecutive_losses} consecutive losses'

        # Check strategy×regime combo
        combo = f'{strategy}:{regime}'
        combo_perf = self._combo_perf.get(combo)
        if combo_perf and combo_perf.count >= self.min_trades:
            if combo_perf.win_rate < self.deactivation_wr:
                return False, f'{combo} WR={combo_perf.win_rate:.0%} below threshold'

        return True, 'OK'

    def confidence_adjustment(self, strategy: str, raw_confidence: float) -> float:
        """
        Adjust confidence based on strategy's recent accuracy.

        If strategy has been overconfident (high confidence but low WR),
        reduce confidence. If accurate, maintain or slightly boost.
        """
        calibrated = self._confidence_ema.get(strategy, 0.5)
        perf = self._strategy_perf.get(strategy)

        if perf is None or perf.count < self.min_trades:
            return raw_confidence  # Not enough data

        # Calibration factor: how well does confidence predict outcomes?
        # If WR=52% but avg confidence was 0.70, we're overconfident
        accuracy_gap = calibrated - 0.5  # How much better than coin flip

        if accuracy_gap < 0:
            # Losing strategy — scale down confidence
            scale = max(0.5, 1.0 + accuracy_gap * 2)  # -0.25 gap → 0.50 scale
        else:
            # Winning strategy — slight boost
            scale = min(1.15, 1.0 + accuracy_gap * 0.5)  # +0.10 gap → 1.05 scale

        return raw_confidence * scale

    def get_deactivated_strategies(self) -> set[str]:
        """Return set of currently deactivated strategy names."""
        return set(self._deactivated)

    def get_strategy_health(self, strategy: str) -> dict[str, Any]:
        """Get health metrics for a strategy."""
        perf = self._strategy_perf.get(strategy)
        if perf is None:
            return {'status': 'no_data', 'trades': 0}

        return {
            'status': 'deactivated' if strategy in self._deactivated else 'active',
            'trades': perf.count,
            'win_rate': perf.win_rate,
            'total_pnl': perf.total_pnl,
            'avg_pnl': perf.avg_pnl,
            'sharpe': perf.sharpe,
            'consecutive_losses': perf.consecutive_losses,
            'calibrated_confidence': self._confidence_ema.get(strategy, 0.5),
        }

    def summary(self) -> dict[str, Any]:
        """Return full agent state summary."""
        return {
            'deactivated': list(self._deactivated),
            'strategies': {
                s: self.get_strategy_health(s)
                for s in self._strategy_perf
            },
            'pairs': {
                p: {
                    'trades': perf.count,
                    'win_rate': perf.win_rate,
                    'pnl': perf.total_pnl,
                }
                for p, perf in self._pair_perf.items()
            },
            'regimes': {
                r: {
                    'trades': perf.count,
                    'win_rate': perf.win_rate,
                    'pnl': perf.total_pnl,
                }
                for r, perf in self._regime_perf.items()
            },
        }
