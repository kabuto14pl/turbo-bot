#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════════════╗
║  Quantum Trading Engine — CLI Entrypoint                                 ║
║  Modes: single-run, scheduled, diagnostics, status                       ║
╚══════════════════════════════════════════════════════════════════════════╝
"""

import os
import sys
import json
import argparse
import logging
from pathlib import Path

# Add quantum directory to path
QUANTUM_DIR = Path(__file__).parent
sys.path.insert(0, str(QUANTUM_DIR))


def setup_logging(level='INFO'):
    """Configure logging with file + console handlers."""
    log_dir = QUANTUM_DIR / 'logs'
    log_dir.mkdir(parents=True, exist_ok=True)

    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format='%(asctime)s [%(name)s] %(levelname)s: %(message)s',
        handlers=[
            logging.StreamHandler(),
            logging.FileHandler(log_dir / 'quantum_engine.log'),
        ]
    )


def cmd_run(args):
    """Single quantum analysis run."""
    from data_fetcher import DataFetcher
    from quantum_engine_gpu import QuantumTradingEngine

    print('\n🔮 Quantum Trading Engine — Single Run')
    print('=' * 60)

    fetcher = DataFetcher(
        symbol=args.symbol,
        timeframe=args.timeframe,
        lookback=args.lookback,
    )
    df = fetcher.fetch(force=True)

    if df is None or len(df) < 30:
        print('❌ ERROR: Insufficient data')
        sys.exit(1)

    features, labels, prices = fetcher.get_features(df)
    print(f'📊 Data: {len(df)} candles, {features.shape[1]} features')
    print(f'💰 Latest price: ${prices[-1]:.2f}')

    engine = QuantumTradingEngine()
    results = engine.run_full_analysis(
        features, labels, prices,
        portfolio_value=args.portfolio_value,
    )

    # Print summary
    sig = results.get('unified_signal', {})
    meta = results.get('metadata', {})

    print(f'\n{"=" * 60}')
    print(f'  📡 Signal:     {sig.get("action", "HOLD")}')
    print(f'  📈 Confidence: {sig.get("confidence", 0):.1%}')
    print(f'  ⚠️  Risk:      {sig.get("risk_level", "UNKNOWN")}')
    print(f'  🧠 Algorithms: {meta.get("algorithms_run", 0)}/5')
    print(f'  🖥️  GPU:       {meta.get("gpu_device", "CPU")}')
    print(f'  ⏱️  Time:      {meta.get("total_elapsed_sec", 0):.2f}s')

    for algo in ['qaoa', 'vqc', 'qsvm', 'qgan', 'qmc']:
        r = results.get(algo, {})
        status = r.get('status', 'N/A')
        t = r.get('elapsed_sec', 0)
        icon = '✅' if status == 'SUCCESS' else '❌'
        extra = ''
        if algo == 'vqc':
            extra = f' regime={r.get("regime", "?")}'
        elif algo == 'qsvm':
            extra = f' dir={r.get("direction", "?")}'
        elif algo == 'qmc':
            extra = f' VaR95={r.get("var", {}).get("95%", "?")}'
        elif algo == 'qaoa':
            extra = f' sharpe={r.get("sharpe_ratio", 0):.3f}'
        print(f'  {icon} {algo.upper():6s}: {status:25s} ({t:.2f}s){extra}')

    print(f'{"=" * 60}')
    print(f'  Results saved: {QUANTUM_DIR / "results" / "quantum_results.json"}')

    if args.output:
        with open(args.output, 'w') as f:
            json.dump(results, f, indent=2, default=str)
        print(f'  Output: {args.output}')


def cmd_schedule(args):
    """Start scheduled quantum analysis."""
    from quantum_scheduler import QuantumScheduler

    print(f'\n🔮 Quantum Trading Scheduler — Every {args.interval} min')
    print('=' * 60)
    print('Press Ctrl+C to stop\n')

    scheduler = QuantumScheduler(
        interval_minutes=args.interval,
        bot_api_url=args.bot_api,
    )
    scheduler.start()


def cmd_diagnostics(args):
    """Run GPU diagnostics."""
    print('\n🔧 GPU Diagnostics')
    print('=' * 60)

    try:
        from gpu_diagnostics import run_full_diagnostics
        report = run_full_diagnostics()
        print(f'\nFull report: {QUANTUM_DIR / "results" / "gpu_diagnostics.json"}')
    except ImportError:
        # Inline quick diagnostics
        print('\n1. PyTorch CUDA:')
        try:
            import torch
            if torch.cuda.is_available():
                print(f'   ✅ GPU: {torch.cuda.get_device_name(0)}')
                print(f'   ✅ VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB')
            else:
                print('   ⚠️ CUDA not available')
        except ImportError:
            print('   ❌ PyTorch not installed')

        print('\n2. Qiskit:')
        try:
            import qiskit
            print(f'   ✅ Version: {qiskit.__version__}')
        except ImportError:
            print('   ❌ Not installed')

        print('\n3. cuQuantum:')
        try:
            import cuquantum
            print(f'   ✅ Available')
        except ImportError:
            print('   ⚠️ Not available (CPU fallback)')


def cmd_status(args):
    """Check engine and results status."""
    print('\n📊 Quantum Engine Status')
    print('=' * 60)

    results_file = QUANTUM_DIR / 'results' / 'quantum_results.json'
    if results_file.exists():
        try:
            with open(results_file) as f:
                results = json.load(f)
            meta = results.get('metadata', {})
            sig = results.get('unified_signal', {})
            print(f'  Last run:    {meta.get("timestamp", "unknown")}')
            print(f'  Signal:      {sig.get("action", "N/A")}')
            print(f'  Confidence:  {sig.get("confidence", 0):.1%}')
            print(f'  Risk Level:  {sig.get("risk_level", "N/A")}')
            print(f'  GPU:         {meta.get("gpu_device", "N/A")}')
            print(f'  Algorithms:  {meta.get("algorithms_run", 0)}/5')

            # File age
            import os
            age_sec = time.time() - os.path.getmtime(results_file)
            if age_sec < 60:
                age_str = f'{age_sec:.0f}s ago'
            elif age_sec < 3600:
                age_str = f'{age_sec / 60:.0f} min ago'
            else:
                age_str = f'{age_sec / 3600:.1f} hours ago'
            print(f'  Results age: {age_str}')
        except Exception as e:
            print(f'  Error reading results: {e}')
    else:
        print('  No results file found — run quantum analysis first')
        print(f'  Expected: {results_file}')

    # Data status
    data_file = QUANTUM_DIR / 'data' / 'btc_ohlcv.csv'
    if data_file.exists():
        import os
        size = os.path.getsize(data_file)
        print(f'  Data file:   {data_file} ({size / 1024:.1f} KB)')
    else:
        print('  Data file:   Not found')


def main():
    parser = argparse.ArgumentParser(
        description='GPU-Accelerated Quantum Trading Engine',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python run_quantum.py run                           # Single analysis
  python run_quantum.py run --symbol ETH/USDT         # Different symbol
  python run_quantum.py schedule --interval 5          # Every 5 min
  python run_quantum.py diagnostics                    # GPU check
  python run_quantum.py status                         # Check last results
        """
    )
    parser.add_argument('--log-level', default='INFO',
                        choices=['DEBUG', 'INFO', 'WARNING', 'ERROR'])

    subparsers = parser.add_subparsers(dest='command', help='Command to execute')

    # run command
    p_run = subparsers.add_parser('run', help='Single quantum analysis run')
    p_run.add_argument('--symbol', default='BTC/USDT', help='Trading pair')
    p_run.add_argument('--timeframe', default='5m', help='Candle timeframe')
    p_run.add_argument('--lookback', type=int, default=200, help='Number of candles')
    p_run.add_argument('--portfolio-value', type=float, default=10000.0,
                        help='Current portfolio value')
    p_run.add_argument('--output', '-o', help='Output JSON file path')

    # schedule command
    p_sched = subparsers.add_parser('schedule', help='Start periodic scheduler')
    p_sched.add_argument('--interval', type=int, default=5,
                          help='Interval in minutes')
    p_sched.add_argument('--bot-api', default='http://localhost:3001',
                          help='Bot API URL')

    # diagnostics command
    subparsers.add_parser('diagnostics', help='Run GPU diagnostics')

    # status command
    subparsers.add_parser('status', help='Check engine status')

    args = parser.parse_args()
    setup_logging(args.log_level)

    if args.command == 'run':
        cmd_run(args)
    elif args.command == 'schedule':
        cmd_schedule(args)
    elif args.command == 'diagnostics':
        cmd_diagnostics(args)
    elif args.command == 'status':
        cmd_status(args)
    else:
        parser.print_help()


if __name__ == '__main__':
    import time
    main()
