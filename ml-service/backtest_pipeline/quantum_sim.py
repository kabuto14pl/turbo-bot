"""
TURBO-BOT Full Pipeline Backtest — Quantum Pipeline Simulation
Simulates QMC, QAOA, VQC, QRA, QDV without actual quantum circuits.
Uses statistical approximations matching production behavior.
"""

import math

import numpy as np
from . import config


class QuantumPipelineSimulator:
    """
    Simulates HybridQuantumClassicalPipeline behavior:
      - QMC: Monte Carlo scenario simulation → bullish/bearish/neutral
      - QAOA: Strategy weight optimization → adjusted ensemble weights
      - VQC: Regime classification → regime probabilities (handled by RegimeDetector)
      - QRA: Risk analysis → risk score 0-100
      - QDV: Decision verification gate
      - QFM: Quantum Feature Mapping → 8 extra features (simulated)
    """
    
    def __init__(self):
        self.cycle_count = 0
        self.last_qmc_result = None
        self.last_qra_score = 50
        self.last_qaoa_weights = None
        self.qmc_bullish_count = 0
        self.qmc_bearish_count = 0
        self.verified_count = 0
        self.rejected_count = 0
        self.starvation_counter = 0
        
    def process_cycle(self, row, history_df, regime, signals, portfolio_value):
        """
        Run quantum pipeline for current cycle.
        
        Returns:
            dict: {qmc_outlook, qra_risk_score, qaoa_weights, qdv_verified,
                   sl_adjust, tp_adjust, quantum_confidence_boost}
        """
        self.cycle_count += 1
        result = {
            'qmc_outlook': 'NEUTRAL',
            'qmc_var': 0.0,
            'qra_risk_score': 50,
            'qaoa_weights': None,
            'qdv_verified': True,
            'sl_adjust': 1.0,
            'tp_adjust': 1.0,
            'quantum_confidence_boost': 0.0,
        }
        
        # === QRA Risk Analysis (every 10 cycles) ===
        if self.cycle_count % config.QRA_RISK_INTERVAL == 0:
            result['qra_risk_score'] = self._simulate_qra(row, history_df, regime)
            self.last_qra_score = result['qra_risk_score']
        else:
            result['qra_risk_score'] = self.last_qra_score
            
        # === QMC Scenario Simulation (every 15 cycles) ===
        if self.cycle_count % config.QMC_SIM_INTERVAL == 0:
            qmc = self._simulate_qmc(row, history_df, regime)
            result['qmc_outlook'] = qmc['outlook']
            result['qmc_var'] = qmc['var']
            self.last_qmc_result = qmc
        elif self.last_qmc_result:
            result['qmc_outlook'] = self.last_qmc_result['outlook']
            result['qmc_var'] = self.last_qmc_result['var']
            
        # === QAOA Weight Optimization (every 30 cycles) ===
        if self.cycle_count % config.QAOA_WEIGHT_INTERVAL == 0:
            result['qaoa_weights'] = self._simulate_qaoa(signals, regime)
            self.last_qaoa_weights = result['qaoa_weights']
        elif self.last_qaoa_weights:
            result['qaoa_weights'] = self.last_qaoa_weights
            
        # === Apply adjustments ===
        # QRA-based SL adjustment
        if result['qra_risk_score'] > config.QRA_HIGH_RISK_THRESHOLD:
            result['sl_adjust'] = config.QRA_SL_TIGHTEN_FACTOR
            
        # QMC-based TP adjustment
        if result['qmc_outlook'] == 'BULLISH':
            result['tp_adjust'] = config.QMC_BULLISH_TP_BOOST
            result['quantum_confidence_boost'] = 0.05
        elif result['qmc_outlook'] == 'BEARISH':
            result['tp_adjust'] = config.QMC_BEARISH_TP_SHRINK
            result['quantum_confidence_boost'] = -0.05
            
        return result
    
    def verify_decision(self, consensus, confidence, regime, qra_score):
        """
        QDV — Quantum Decision Verification gate.
        
        Returns:
            dict: {verified: bool, reason: str}
        """
        # Confidence floor
        # P#201c: Use min(QDV_MIN_CONFIDENCE, pair CONFIDENCE_FLOOR) so pair-level
        # overrides (e.g. BNB 0.15) aren't blocked by the global QDV threshold (0.25)
        _qdv_floor = min(config.QDV_MIN_CONFIDENCE, getattr(config, 'CONFIDENCE_FLOOR', config.QDV_MIN_CONFIDENCE))
        if confidence < _qdv_floor:
            self.rejected_count += 1
            self.starvation_counter += 1
            return {'verified': False, 'reason': f'Confidence {confidence:.2f} < {_qdv_floor}'}
        
        # Starvation fallback — force trade after too many idle cycles
        if self.starvation_counter >= config.QDV_STARVATION_CYCLES:
            self.starvation_counter = 0
            self.verified_count += 1
            return {'verified': True, 'reason': 'Starvation fallback — forced trade'}
        
        # High risk score blocks
        if qra_score > 85 and confidence < 0.60:
            self.rejected_count += 1
            self.starvation_counter += 1
            return {'verified': False, 'reason': f'High QRA risk {qra_score} with low confidence'}
        
        # Ranging regime with low confidence
        # PATCH #65: Allow RANGING entries when micro-scalp is enabled
        # P#202a: RANGING sub-floor respects pair CONFIDENCE_FLOOR (was hardcoded 0.25)
        #   BNB has pair floor=0.15 but this check blocked 133 signals at 0.25
        _ranging_sub_floor = max(_qdv_floor, 0.12)  # At least 0.12 to avoid noise
        if regime == 'RANGING' and confidence < 0.40:
            ranging_enabled = getattr(config, 'RANGING_TRADE_ENABLED', False)
            if not ranging_enabled:
                self.rejected_count += 1
                self.starvation_counter += 1
                return {'verified': False, 'reason': 'Ranging regime with low confidence'}
            elif confidence < _ranging_sub_floor:
                # Even with micro-scalp, below pair floor is blocked
                self.rejected_count += 1
                self.starvation_counter += 1
                return {'verified': False, 'reason': 'Ranging micro-scalp: confidence too low'}
        
        self.verified_count += 1
        self.starvation_counter = 0
        return {'verified': True, 'reason': 'Passed all QDV checks'}
    
    def _simulate_qmc(self, row, history_df, regime):
        """
        Simulate QMC Monte Carlo scenarios.
        Uses a fast analytic approximation of the production 5-step QMC contract.
        """
        close = row['close']
        close_series = history_df['close'].astype(float)
        log_returns = np.log(close_series / close_series.shift(1)).dropna().to_numpy()

        if len(log_returns) == 0:
            return {
                'outlook': 'NEUTRAL',
                'var': round(close * 0.01 * 1.645, 2),
                'bullish_prob': 0.5,
            }

        mu = float(np.mean(log_returns))
        sigma = float(np.std(log_returns, ddof=1)) if len(log_returns) > 1 else 0.0

        horizon_steps = 5
        drift = (mu - 0.5 * sigma * sigma) * horizon_steps
        diffusion = sigma * math.sqrt(horizon_steps)
        bullish_prob = 0.5 if diffusion < 1e-12 else self._normal_cdf(drift / diffusion)

        if bullish_prob > 0.60:
            outlook = 'BULLISH'
            self.qmc_bullish_count += 1
        elif bullish_prob < 0.40:
            outlook = 'BEARISH'
            self.qmc_bearish_count += 1
        else:
            outlook = 'NEUTRAL'

        atr = row.get('atr', None)
        if atr is None or not np.isfinite(atr) or atr <= 0:
            vol = max(sigma, 1e-4)
        else:
            vol = atr / close
        var_1d = close * vol * 1.645  # 95% VaR

        return {
            'outlook': outlook,
            'var': round(var_1d, 2),
            'bullish_prob': round(float(bullish_prob), 4),
        }

    def _normal_cdf(self, x):
        return 0.5 * (1.0 + math.erf(x / math.sqrt(2.0)))
    
    def _simulate_qra(self, row, history_df, regime):
        """
        Simulate QRA Risk Analysis.
        Returns risk score 0-100 (higher = more risky).
        """
        close = row['close']
        atr = row.get('atr', close * 0.01)
        volume_ratio = row.get('volume_ratio', 1.0)
        atr_pct = row.get('atr_pct', 0.01)
        rsi = row.get('rsi_14', 50)
        
        risk = 30  # Base risk
        
        # Volatility contribution
        if atr_pct > 0.02:
            risk += 20
        elif atr_pct > 0.015:
            risk += 10
            
        # Volume spike risk
        if volume_ratio > 3.0:
            risk += 15
        elif volume_ratio > 2.0:
            risk += 8
            
        # RSI extreme risk
        if rsi > 80 or rsi < 20:
            risk += 15
        elif rsi > 70 or rsi < 30:
            risk += 5
            
        # Regime risk
        if regime == 'HIGH_VOLATILITY':
            risk += 20
        elif regime == 'RANGING':
            risk += 5
            
        # Recent drawdown check
        if len(history_df) >= 20:
            max_close = history_df['close'].iloc[-20:].max()
            dd = (max_close - close) / max_close
            if dd > 0.05:
                risk += 15
            elif dd > 0.02:
                risk += 5
                
        return min(100, max(0, int(risk)))
    
    def _simulate_qaoa(self, signals, regime):
        """
        Simulate QAOA strategy weight optimization.
        Adjusts weights based on which strategies are aligned with regime.
        """
        base_weights = dict(config.STATIC_WEIGHTS)
        
        # Boost strategies aligned with regime
        for name, sig in signals.items():
            if name not in base_weights:
                continue
            action = sig.get('action', 'HOLD')
            conf = sig.get('confidence', 0)
            
            if regime in ('TRENDING_UP', 'TRENDING_DOWN'):
                # In trends, boost trend-following strategies
                if name in ('SuperTrend', 'MACrossover', 'MomentumPro'):
                    if action != 'HOLD' and conf > 0.40:
                        base_weights[name] *= 1.20
                # Reduce mean-reversion in trends
                if name == 'RSITurbo':
                    base_weights[name] *= 0.85
            elif regime == 'RANGING':
                # In ranging, boost mean-reversion
                if name == 'RSITurbo':
                    base_weights[name] *= 1.25
                # Reduce trend-following
                if name in ('SuperTrend', 'MACrossover'):
                    base_weights[name] *= 0.80
                    
        # Normalize
        total = sum(base_weights.values())
        if total > 0:
            base_weights = {k: v / total for k, v in base_weights.items()}
            
        return base_weights
    
    def get_stats(self):
        """Get quantum pipeline statistics."""
        total_decisions = self.verified_count + self.rejected_count
        return {
            'total_cycles': self.cycle_count,
            'qmc_bullish': self.qmc_bullish_count,
            'qmc_bearish': self.qmc_bearish_count,
            'qdv_verified': self.verified_count,
            'qdv_rejected': self.rejected_count,
            'qdv_pass_rate': round(self.verified_count / max(total_decisions, 1) * 100, 1),
            'last_qra_score': self.last_qra_score,
        }
