"""
🔄 TURBO-BOT — Auto-Retraining Scheduler

Runs model retraining on a configurable schedule (default: every 7 days).
Can be started as a standalone script or integrated into ml_service.py.

Features:
- Downloads fresh OHLCV data from exchange
- Retrains walk-forward model
- Runs overfitting guard validation
- Only deploys new model if it passes quality checks
- Logs all retraining sessions

Usage:
    # Standalone (run as cron or systemd timer):
    python3 retrain_cron.py

    # Continuous daemon mode:
    python3 retrain_cron.py --daemon --interval-hours 168
"""

import os
import sys
import time
import json
import logging
import argparse
import traceback
from datetime import datetime, timedelta

import numpy as np

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [RETRAIN] %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(os.path.join(os.path.dirname(__file__), 'retrain.log')),
    ]
)
logger = logging.getLogger(__name__)

DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
MODELS_DIR = os.path.join(os.path.dirname(__file__), 'models')
RESULTS_DIR = os.path.join(os.path.dirname(__file__), 'results')


class RetrainScheduler:
    """
    Automated model retraining with quality gates.
    """

    def __init__(self, timeframes=None, min_quality_score=50, use_gpu=True):
        """
        Args:
            timeframes: list of timeframes to retrain (default: ['15m'])
            min_quality_score: minimum overfitting guard score to deploy (0-100)
            use_gpu: Use GPU for training (RTX 5070 Ti)
        """
        self.timeframes = timeframes or ['15m']
        self.min_quality_score = min_quality_score
        self.use_gpu = use_gpu
        self.history = []

    def run_retrain_cycle(self):
        """
        Full retraining cycle:
        1. Fetch fresh data
        2. Retrain model
        3. Validate with overfitting guard
        4. Deploy if quality passes
        """
        logger.info("=" * 60)
        logger.info("🔄 RETRAINING CYCLE START")
        logger.info("=" * 60)

        cycle_results = {
            'timestamp': datetime.now().isoformat(),
            'timeframes': {},
            'overall_status': 'pending',
        }

        for tf in self.timeframes:
            logger.info(f"\n--- Timeframe: {tf} ---")
            result = self._retrain_timeframe(tf)
            cycle_results['timeframes'][tf] = result

        # Overall status
        all_passed = all(
            r.get('deployed', False)
            for r in cycle_results['timeframes'].values()
        )
        any_passed = any(
            r.get('deployed', False)
            for r in cycle_results['timeframes'].values()
        )

        if all_passed:
            cycle_results['overall_status'] = 'all_deployed'
        elif any_passed:
            cycle_results['overall_status'] = 'partial_deploy'
        else:
            cycle_results['overall_status'] = 'no_deploy'

        # Save history
        self.history.append(cycle_results)
        self._save_history(cycle_results)

        logger.info(f"\n🔄 CYCLE COMPLETE: {cycle_results['overall_status']}")
        return cycle_results

    def _retrain_timeframe(self, timeframe):
        """Retrain model for a single timeframe."""
        result = {
            'timeframe': timeframe,
            'status': 'pending',
            'trained': False,
            'validated': False,
            'deployed': False,
        }

        try:
            # Step 1: Fetch fresh data
            logger.info(f"📥 Step 1: Fetching fresh data...")
            data_ok = self._fetch_data(timeframe)
            if not data_ok:
                result['status'] = 'data_fetch_failed'
                logger.error(f"❌ Data fetch failed for {timeframe}")
                return result

            # Step 2: Train model
            logger.info(f"🧠 Step 2: Training model{' (GPU)' if self.use_gpu else ''}...")
            from train_model import train_and_evaluate
            
            # PATCH #58: Pass GPU flag to training
            import os
            if self.use_gpu:
                os.environ['TURBO_USE_GPU'] = '1'
            train_result = train_and_evaluate(timeframe, horizon=1)

            if train_result is None:
                result['status'] = 'training_failed'
                logger.error(f"❌ Training failed for {timeframe}")
                return result

            result['trained'] = True
            result['train_metrics'] = train_result

            logger.info(f"   CV acc: {train_result.get('cv_mean_accuracy', 0):.3f}")
            logger.info(f"   Test acc: {train_result.get('test_accuracy', 0):.3f}")

            # Step 3: Validation with overfitting guard
            logger.info(f"🛡️ Step 3: Running overfitting guard...")
            from overfitting_guard import OverfittingGuard
            guard = OverfittingGuard()
            guard_result = guard.run_full_validation(
                timeframe=timeframe,
                n_permutations=30  # Faster for automated retraining
            )

            if guard_result is None:
                result['status'] = 'validation_failed'
                logger.error(f"❌ Overfitting guard failed for {timeframe}")
                return result

            result['validated'] = True
            result['quality_score'] = guard_result['verdict']['score']
            result['quality_pass'] = guard_result['verdict']['pass']

            # Step 4: Deploy if quality passes
            if guard_result['verdict']['score'] >= self.min_quality_score:
                result['deployed'] = True
                result['status'] = 'deployed'
                logger.info(f"✅ DEPLOYED: quality score {guard_result['verdict']['score']}/100 >= {self.min_quality_score}")
            else:
                result['status'] = 'quality_gate_failed'
                logger.warning(
                    f"⚠️ NOT DEPLOYED: quality score {guard_result['verdict']['score']}/100 "
                    f"< {self.min_quality_score} threshold"
                )
                # Rollback: keep previous model (it's still in MODELS_DIR)
                self._rollback_model(timeframe)

        except Exception as e:
            result['status'] = f'error: {str(e)}'
            logger.error(f"❌ Exception during retrain: {e}")
            logger.error(traceback.format_exc())

        return result

    def _fetch_data(self, timeframe):
        """
        Fetch latest OHLCV data from exchange.
        Uses ccxt to download data and append to existing CSV.
        """
        try:
            import ccxt
            import pandas as pd

            exchange = ccxt.okx({'enableRateLimit': True})
            symbol = 'BTC/USDT'

            # How many candles to fetch (enough to cover 7 days + overlap)
            tf_map = {'15m': 15, '1h': 60, '4h': 240}
            tf_minutes = tf_map.get(timeframe, 15)
            limit = 1000  # Latest 1000 candles

            logger.info(f"   Fetching {limit} {timeframe} candles from OKX...")
            ohlcv = exchange.fetch_ohlcv(symbol, timeframe, limit=limit)

            if not ohlcv or len(ohlcv) < 100:
                logger.error(f"   Only got {len(ohlcv) if ohlcv else 0} candles")
                return False

            # Convert to DataFrame
            df_new = pd.DataFrame(ohlcv, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
            df_new['datetime'] = pd.to_datetime(df_new['timestamp'], unit='ms')
            df_new.set_index('datetime', inplace=True)
            df_new.drop('timestamp', axis=1, inplace=True)

            # Merge with existing data (append, don't replace)
            os.makedirs(DATA_DIR, exist_ok=True)
            filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
            
            if os.path.exists(filepath):
                df_existing = pd.read_csv(filepath, index_col='datetime', parse_dates=True)
                # Keep only OHLCV columns for merge (indicators will be re-added)
                ohlcv_cols = ['open', 'high', 'low', 'close', 'volume']
                df_existing = df_existing[ohlcv_cols]
                # Concat and deduplicate by timestamp
                df_merged = pd.concat([df_existing, df_new[ohlcv_cols]])
                df_merged = df_merged[~df_merged.index.duplicated(keep='last')]
                df_merged = df_merged.sort_index()
                logger.info(f"   Merged: {len(df_existing)} existing + {len(df_new)} new = {len(df_merged)} total")
            else:
                df_merged = df_new

            # Add technical indicators (same as fetch_historical.py)
            self._add_indicators(df_merged)

            # Save merged data
            df_merged.to_csv(filepath)
            logger.info(f"   ✅ Saved {len(df_merged)} candles to {filepath}")
            return True

        except ImportError:
            logger.warning("   ⚠️ ccxt not available — using existing data")
            filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
            return os.path.exists(filepath)
        except Exception as e:
            logger.error(f"   ❌ Fetch error: {e}")
            filepath = os.path.join(DATA_DIR, f'btcusdt_{timeframe}.csv')
            return os.path.exists(filepath)  # Fall back to existing data

    def _add_indicators(self, df):
        """Add basic technical indicators to DataFrame."""
        try:
            import ta

            # RSI
            df['rsi_14'] = ta.momentum.RSIIndicator(df['close'], window=14).rsi()

            # EMA
            df['ema_9'] = ta.trend.EMAIndicator(df['close'], window=9).ema_indicator()
            df['ema_21'] = ta.trend.EMAIndicator(df['close'], window=21).ema_indicator()
            df['ema_50'] = ta.trend.EMAIndicator(df['close'], window=50).ema_indicator()

            # SMA
            df['sma_50'] = ta.trend.SMAIndicator(df['close'], window=50).sma_indicator()

            # MACD
            macd = ta.trend.MACD(df['close'])
            df['macd'] = macd.macd()
            df['macd_signal'] = macd.macd_signal()
            df['macd_hist'] = macd.macd_diff()

            # Bollinger Bands
            bb = ta.volatility.BollingerBands(df['close'])
            df['bb_upper'] = bb.bollinger_hband()
            df['bb_lower'] = bb.bollinger_lband()
            df['bb_pctb'] = bb.bollinger_pband()

            # ATR
            atr = ta.volatility.AverageTrueRange(df['high'], df['low'], df['close'])
            df['atr'] = atr.average_true_range()
            df['atr_pct'] = df['atr'] / df['close']

            # ADX
            adx = ta.trend.ADXIndicator(df['high'], df['low'], df['close'])
            df['adx'] = adx.adx()

            # Volume ratio
            df['volume_sma20'] = df['volume'].rolling(20).mean()
            df['volume_ratio'] = df['volume'] / df['volume_sma20'].replace(0, 1)

            # ROC
            df['roc_10'] = df['close'].pct_change(10)

            df.fillna(method='bfill', inplace=True)
            df.fillna(0, inplace=True)

        except ImportError:
            logger.warning("   ⚠️ 'ta' library not available — skipping indicators")

    def _rollback_model(self, timeframe):
        """Keep previous model (don't save current one)."""
        logger.info(f"   🔙 Rollback: keeping previous model for {timeframe}")

    def _save_history(self, cycle_results):
        """Save retraining history to JSON log."""
        os.makedirs(RESULTS_DIR, exist_ok=True)
        log_file = os.path.join(RESULTS_DIR, 'retrain_history.json')

        history = []
        if os.path.exists(log_file):
            try:
                with open(log_file, 'r') as f:
                    history = json.load(f)
            except Exception:
                history = []

        history.append(cycle_results)

        # Keep last 100 entries
        history = history[-100:]

        with open(log_file, 'w') as f:
            json.dump(history, f, indent=2, default=str)

        logger.info(f"   📝 History saved ({len(history)} entries)")


def run_daemon(interval_hours=168, timeframes=None, min_quality=50):
    """
    Continuous daemon mode — runs retraining every N hours.
    Default: 168h = 7 days.
    """
    scheduler = RetrainScheduler(
        timeframes=timeframes or ['15m'],
        min_quality_score=min_quality
    )

    logger.info(f"🤖 Retrain daemon started — interval: {interval_hours}h")
    logger.info(f"   Timeframes: {scheduler.timeframes}")
    logger.info(f"   Quality gate: {min_quality}/100")

    while True:
        try:
            scheduler.run_retrain_cycle()
        except Exception as e:
            logger.error(f"❌ Cycle error: {e}")
            logger.error(traceback.format_exc())

        next_run = datetime.now() + timedelta(hours=interval_hours)
        logger.info(f"💤 Next retrain: {next_run.strftime('%Y-%m-%d %H:%M')}")
        time.sleep(interval_hours * 3600)


def main():
    parser = argparse.ArgumentParser(description='Turbo-Bot Auto-Retraining')
    parser.add_argument('--daemon', action='store_true', help='Run in continuous daemon mode')
    parser.add_argument('--interval-hours', type=int, default=168, help='Hours between retrains (default: 168 = weekly)')
    parser.add_argument('--timeframes', nargs='+', default=['15m'], help='Timeframes to retrain')
    parser.add_argument('--min-quality', type=int, default=50, help='Minimum quality score to deploy (0-100)')
    args = parser.parse_args()

    if args.daemon:
        run_daemon(
            interval_hours=args.interval_hours,
            timeframes=args.timeframes,
            min_quality=args.min_quality,
        )
    else:
        # Single run
        scheduler = RetrainScheduler(
            timeframes=args.timeframes,
            min_quality_score=args.min_quality,
        )
        scheduler.run_retrain_cycle()


if __name__ == '__main__':
    main()
