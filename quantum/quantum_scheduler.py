#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════╗
║  Quantum Trading Scheduler                                               ║
║  APScheduler-based periodic execution of quantum analysis                ║
║  Supports: interval, cron, and on-demand triggers                        ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import time
import signal
import logging
import threading
from pathlib import Path
from datetime import datetime

logger = logging.getLogger('quantum_gpu.scheduler')

# Add parent to path
sys.path.insert(0, str(Path(__file__).parent))


class QuantumScheduler:
    """
    Manages periodic execution of the quantum trading engine.
    
    Features:
      - Configurable interval (default: 5 minutes)
      - Graceful shutdown handling (SIGINT, SIGTERM)
      - Result caching and staleness detection
      - Health monitoring
      - Lock to prevent overlapping runs
    """

    def __init__(self, interval_minutes=None, bot_api_url=None):
        self.interval_minutes = interval_minutes or int(
            os.environ.get('QUANTUM_INTERVAL_MIN', '5')
        )
        self.bot_api_url = bot_api_url or os.environ.get(
            'BOT_API_URL', 'http://localhost:3001'
        )
        self.push_results = os.environ.get('QUANTUM_PUSH_RESULTS', 'true').lower() == 'true'

        self.engine = None
        self.fetcher = None
        self.scheduler = None
        self.is_running = False
        self.run_count = 0
        self.last_run_time = None
        self.last_error = None
        self._lock = threading.Lock()
        self._stop_event = threading.Event()

    def initialize(self):
        """Initialize engine and data fetcher."""
        from data_fetcher import DataFetcher
        from quantum_engine_gpu import QuantumTradingEngine

        config = self._load_config()
        self.engine = QuantumTradingEngine(config=config)
        self.fetcher = DataFetcher()

        logger.info(f'[SCHEDULER] Initialized — interval={self.interval_minutes}min, '
                    f'push={self.push_results}, bot_api={self.bot_api_url}')

    def _load_config(self):
        """Load quantum engine configuration from env or config file."""
        config_path = Path(__file__).parent / 'quantum_config.json'
        if config_path.exists():
            try:
                with open(config_path) as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f'Config load failed: {e}')

        # Defaults (adjusted for GPU if available)
        return {
            'qaoa_n_assets': int(os.environ.get('QAOA_N_ASSETS', '5')),
            'qaoa_p_layers': int(os.environ.get('QAOA_P_LAYERS', '4')),
            'qaoa_max_iter': int(os.environ.get('QAOA_MAX_ITER', '200')),
            'qaoa_shots': int(os.environ.get('QAOA_SHOTS', '4096')),
            'vqc_n_qubits': int(os.environ.get('VQC_N_QUBITS', '6')),
            'vqc_n_layers': int(os.environ.get('VQC_N_LAYERS', '3')),
            'vqc_max_iter': int(os.environ.get('VQC_MAX_ITER', '150')),
            'vqc_shots': int(os.environ.get('VQC_SHOTS', '2048')),
            'qsvm_n_qubits': int(os.environ.get('QSVM_N_QUBITS', '4')),
            'qsvm_shots': int(os.environ.get('QSVM_SHOTS', '2048')),
            'qgan_n_qubits': int(os.environ.get('QGAN_N_QUBITS', '4')),
            'qgan_n_epochs': int(os.environ.get('QGAN_N_EPOCHS', '50')),
            'qmc_n_scenarios': int(os.environ.get('QMC_N_SCENARIOS', '5000')),
            'qmc_n_qubits': int(os.environ.get('QMC_N_QUBITS', '8')),
            'qmc_shots': int(os.environ.get('QMC_SHOTS', '8192')),
        }

    def run_once(self):
        """Execute a single quantum analysis cycle."""
        if not self._lock.acquire(blocking=False):
            logger.warning('[SCHEDULER] Previous run still in progress — skipping')
            return None

        try:
            self.run_count += 1
            t0 = time.time()
            logger.info(f'[SCHEDULER] Starting run #{self.run_count}...')

            # Fetch data
            df = self.fetcher.fetch(force=True)
            if df is None or len(df) < 30:
                logger.error('[SCHEDULER] Insufficient data — skipping')
                self.last_error = 'Insufficient data'
                return None

            features, labels, prices = self.fetcher.get_features(df)

            # Get portfolio value from bot API
            portfolio_value = self._get_portfolio_value()

            # Run quantum engine
            results = self.engine.run_full_analysis(
                features, labels, prices,
                portfolio_value=portfolio_value
            )

            # Push results to bot (optional)
            if self.push_results:
                self._push_to_bot(results)

            elapsed = time.time() - t0
            self.last_run_time = datetime.utcnow()
            self.last_error = None

            signal_info = results.get('unified_signal', {})
            logger.info(f'[SCHEDULER] Run #{self.run_count} complete: '
                        f'Signal={signal_info.get("action", "HOLD")}, '
                        f'Confidence={signal_info.get("confidence", 0):.3f}, '
                        f'Time={elapsed:.2f}s')

            return results

        except Exception as e:
            self.last_error = str(e)
            logger.error(f'[SCHEDULER] Run #{self.run_count} failed: {e}')
            import traceback
            logger.debug(traceback.format_exc())
            return None

        finally:
            self._lock.release()

    def start(self):
        """Start the periodic scheduler."""
        if self.engine is None:
            self.initialize()

        self.is_running = True

        # Register signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

        # Try APScheduler first
        try:
            from apscheduler.schedulers.blocking import BlockingScheduler
            from apscheduler.triggers.interval import IntervalTrigger

            self.scheduler = BlockingScheduler()
            self.scheduler.add_job(
                self.run_once,
                IntervalTrigger(minutes=self.interval_minutes),
                id='quantum_analysis',
                name='Quantum Trading Analysis',
                max_instances=1,
                misfire_grace_time=60,
            )

            # Run immediately, then on schedule
            logger.info(f'[SCHEDULER] Starting with APScheduler (every {self.interval_minutes} min)')
            self.run_once()
            self.scheduler.start()

        except ImportError:
            logger.info('[SCHEDULER] APScheduler not available — using simple loop')
            self._simple_loop()

    def _simple_loop(self):
        """Fallback: simple sleep loop."""
        interval_sec = self.interval_minutes * 60

        while not self._stop_event.is_set():
            self.run_once()
            self._stop_event.wait(timeout=interval_sec)

        logger.info('[SCHEDULER] Loop stopped')

    def stop(self):
        """Stop the scheduler."""
        self.is_running = False
        self._stop_event.set()

        if self.scheduler:
            try:
                self.scheduler.shutdown(wait=False)
            except Exception:
                pass

        logger.info('[SCHEDULER] Stopped')

    def _signal_handler(self, signum, frame):
        """Handle SIGINT/SIGTERM for graceful shutdown."""
        logger.info(f'[SCHEDULER] Signal {signum} received — shutting down')
        self.stop()

    def _get_portfolio_value(self):
        """Get current portfolio value from bot API."""
        try:
            import requests
            resp = requests.get(f'{self.bot_api_url}/api/portfolio', timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                return float(data.get('totalValue', data.get('balance', 10000)))
        except Exception:
            pass
        return 10000.0  # Default

    def _push_to_bot(self, results):
        """Push quantum results to bot API."""
        try:
            import requests
            signal_data = results.get('unified_signal', {})
            payload = {
                'source': 'quantum_gpu',
                'action': signal_data.get('action', 'HOLD'),
                'confidence': signal_data.get('confidence', 0),
                'risk_level': signal_data.get('risk_level', 'MEDIUM'),
                'components': signal_data.get('components', {}),
                'metadata': results.get('metadata', {}),
                'timestamp': datetime.utcnow().isoformat(),
            }

            resp = requests.post(
                f'{self.bot_api_url}/api/quantum/signal',
                json=payload,
                timeout=10
            )

            if resp.status_code in (200, 201):
                logger.info('[SCHEDULER] Results pushed to bot API')
            else:
                logger.warning(f'[SCHEDULER] Bot API push failed: {resp.status_code}')

        except Exception as e:
            logger.debug(f'[SCHEDULER] Push to bot failed (non-critical): {e}')

    def get_status(self):
        """Return scheduler status."""
        return {
            'scheduler': 'QuantumScheduler',
            'is_running': self.is_running,
            'interval_minutes': self.interval_minutes,
            'run_count': self.run_count,
            'last_run': self.last_run_time.isoformat() if self.last_run_time else None,
            'last_error': self.last_error,
            'push_enabled': self.push_results,
            'bot_api_url': self.bot_api_url,
            'engine_status': self.engine.get_status() if self.engine else 'not initialized',
        }


if __name__ == '__main__':
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(Path(__file__).parent / 'logs' / 'scheduler.log'),
        ]
    )

    # Ensure log directory exists
    (Path(__file__).parent / 'logs').mkdir(parents=True, exist_ok=True)

    scheduler = QuantumScheduler()
    scheduler.start()
