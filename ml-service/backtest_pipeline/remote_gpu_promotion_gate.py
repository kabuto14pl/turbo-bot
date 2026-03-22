"""Promotion gate for remote-GPU full-pipeline backtest artifacts.

This script evaluates orchestrator output and decides whether the current
research run is strong enough to be considered a candidate for manual live
parameter promotion.

It does not deploy anything.
"""

from __future__ import annotations

import argparse
import json
import math
from datetime import UTC, datetime
from pathlib import Path

if __package__ in (None, ''):
    from promotion_bundle import DEFAULT_BUNDLE_ROOT, create_promoted_bundle
else:
    from .promotion_bundle import DEFAULT_BUNDLE_ROOT, create_promoted_bundle


def load_manifest(path: Path) -> dict:
    return json.loads(path.read_text(encoding='utf-8'))


def find_job(manifest: dict, spec: str) -> dict | None:
    for job in manifest.get('jobs', []):
        if (job.get('job') or {}).get('spec') == spec:
            return job
    return None


def evaluate_gate(manifest: dict, args) -> dict:
    findings = []
    approved = True

    for job in manifest.get('jobs', []):
        spec = (job.get('job') or {}).get('spec', 'unknown')
        raw_exit_code = job.get('exit_code', 1)
        exit_code = int(raw_exit_code) if raw_exit_code is not None else 1
        summary = job.get('summary') or {}
        remote_status = str(summary.get('remote_status', 'unknown'))
        remote_failures = int(summary.get('remote_failures', 0) or 0)
        backend = summary.get('backend')

        if exit_code != 0:
            approved = False
            findings.append(f'{spec}: process exited with code {exit_code}')
        if backend and backend != 'remote-gpu':
            approved = False
            findings.append(f'{spec}: backend={backend}, expected remote-gpu')
        if args.require_remote_online and remote_status != 'online':
            approved = False
            findings.append(f'{spec}: remote_status={remote_status}, expected online')
        if remote_failures > args.max_remote_failures:
            approved = False
            findings.append(f'{spec}: remote_failures={remote_failures} > {args.max_remote_failures}')

    single_15m = find_job(manifest, 'single:15m')
    if single_15m and single_15m.get('summary'):
        summary = single_15m['summary']
        if float(summary.get('sharpe_ratio', 0.0) or 0.0) < args.min_single_sharpe:
            approved = False
            findings.append(
                f"single:15m sharpe {summary.get('sharpe_ratio')} < {args.min_single_sharpe}"
            )
        if float(summary.get('max_drawdown', 100.0) or 100.0) > args.max_single_drawdown:
            approved = False
            findings.append(
                f"single:15m max_drawdown {summary.get('max_drawdown')} > {args.max_single_drawdown}"
            )
        if float(summary.get('profit_factor', 0.0) or 0.0) < args.min_single_profit_factor:
            approved = False
            findings.append(
                f"single:15m profit_factor {summary.get('profit_factor')} < {args.min_single_profit_factor}"
            )
        if float(summary.get('net_profit', 0.0) or 0.0) <= 0:
            approved = False
            findings.append('single:15m net_profit <= 0')
    else:
        approved = False
        findings.append('single:15m result missing from manifest')

    multi_15m = find_job(manifest, 'multi:15m')
    if multi_15m and multi_15m.get('summary'):
        summary = multi_15m['summary']
        total_pairs = int(summary.get('total_pairs', 0) or 0)
        positive_pairs = int(summary.get('positive_pairs', 0) or 0)
        if float(summary.get('total_net_profit', 0.0) or 0.0) <= 0:
            approved = False
            findings.append('multi:15m total_net_profit <= 0')
        required_positive_pairs = max(1, math.ceil(total_pairs * args.min_multi_positive_pair_ratio))
        if positive_pairs < required_positive_pairs:
            approved = False
            findings.append(
                f'multi:15m positive_pairs {positive_pairs}/{total_pairs} < required {required_positive_pairs}'
            )
    else:
        approved = False
        findings.append('multi:15m result missing from manifest')

    walkforward_15m = find_job(manifest, 'walkforward:15m')
    if walkforward_15m and walkforward_15m.get('summary'):
        summary = walkforward_15m['summary']
        total_pairs = int(summary.get('total_pairs', 0) or 0)
        positive_test_pairs = int(summary.get('positive_test_pairs', 0) or 0)
        if float(summary.get('total_test_net_profit', 0.0) or 0.0) <= 0:
            approved = False
            findings.append('walkforward:15m total_test_net_profit <= 0')
        required_positive_pairs = max(1, math.ceil(total_pairs * args.min_walkforward_positive_pair_ratio))
        if positive_test_pairs < required_positive_pairs:
            approved = False
            findings.append(
                f'walkforward:15m positive_test_pairs {positive_test_pairs}/{total_pairs} < required {required_positive_pairs}'
            )
    else:
        approved = False
        findings.append('walkforward:15m result missing from manifest')

    return {
        'approved': approved,
        'findings': findings,
        'evaluated_at': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        'manifest_path': args.manifest,
        'criteria': {
            'require_remote_online': args.require_remote_online,
            'max_remote_failures': args.max_remote_failures,
            'min_single_sharpe': args.min_single_sharpe,
            'max_single_drawdown': args.max_single_drawdown,
            'min_single_profit_factor': args.min_single_profit_factor,
            'min_multi_positive_pair_ratio': args.min_multi_positive_pair_ratio,
            'min_walkforward_positive_pair_ratio': args.min_walkforward_positive_pair_ratio,
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description='Evaluate whether a remote-gpu full-pipeline run is strong enough for manual live promotion review')
    parser.add_argument('manifest', help='Path to aggregate_manifest.json from remote_gpu_full_orchestrator.py')
    parser.add_argument('--require-remote-online', action='store_true', default=True)
    parser.add_argument('--max-remote-failures', type=int, default=0)
    parser.add_argument('--min-single-sharpe', type=float, default=1.2)
    parser.add_argument('--max-single-drawdown', type=float, default=15.0)
    parser.add_argument('--min-single-profit-factor', type=float, default=1.05)
    parser.add_argument('--min-multi-positive-pair-ratio', type=float, default=0.60)
    parser.add_argument('--min-walkforward-positive-pair-ratio', type=float, default=0.50)
    parser.add_argument('--write-bundle', action='store_true', help='Write an immutable promoted bundle when the manifest is approved')
    parser.add_argument('--activate-bundle', action='store_true', help='Update artifacts/promoted/current.json to point at the approved bundle')
    parser.add_argument('--bundle-root', default=str(DEFAULT_BUNDLE_ROOT), help='Directory where promoted bundles are written')
    parser.add_argument('--output', default=None, help='Optional JSON output path')
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    manifest_path = Path(args.manifest)
    result = evaluate_gate(load_manifest(manifest_path), args)

    if result['approved'] and (args.write_bundle or args.activate_bundle):
        result['bundle'] = create_promoted_bundle(
            manifest_path,
            result,
            bundle_root=Path(args.bundle_root),
            activate=args.activate_bundle,
        )

    if args.output:
        Path(args.output).write_text(json.dumps(result, indent=2), encoding='utf-8')

    print(json.dumps(result, indent=2))
    return 0 if result['approved'] else 2


if __name__ == '__main__':
    raise SystemExit(main())