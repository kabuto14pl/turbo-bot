#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import statistics
from typing import Any, Dict, List


def load_report(report_path: str) -> Dict[str, Any]:
    if not os.path.exists(report_path):
        raise FileNotFoundError(report_path)
    with open(report_path, 'r', encoding='utf-8') as handle:
        return json.load(handle)


def summarize(report: Dict[str, Any], min_qmc: float, min_regime: float, min_qaoa_corr: float) -> Dict[str, Any]:
    summary = report.get('summary', {})
    samples: List[Dict[str, Any]] = report.get('samples', [])

    qmc_rate = float(summary.get('qmc_direction_match_rate') or 0.0)
    regime_rate = float(summary.get('regime_match_rate') or 0.0)
    qaoa_corr = summary.get('avg_qaoa_weight_corr')
    qaoa_corr = None if qaoa_corr is None else float(qaoa_corr)

    verdicts = []
    verdicts.append(('QMC direction', qmc_rate, min_qmc, qmc_rate >= min_qmc))
    verdicts.append(('Regime match', regime_rate, min_regime, regime_rate >= min_regime))
    if qaoa_corr is not None:
        verdicts.append(('QAOA corr', qaoa_corr, min_qaoa_corr, qaoa_corr >= min_qaoa_corr))

    passed = sum(1 for _, _, _, ok in verdicts if ok)
    total = len(verdicts)
    overall = 'PASS' if total > 0 and passed == total else 'WARN' if passed >= max(1, total - 1) else 'FAIL'

    remote_regime_confidences = [
        float(sample['remote_regime_confidence'])
        for sample in samples
        if sample.get('remote_regime_confidence') is not None
    ]
    avg_regime_conf = statistics.mean(remote_regime_confidences) if remote_regime_confidences else None

    mismatches = [
        {
            'timestamp': sample.get('timestamp'),
            'simulator_outlook': sample.get('simulator_outlook'),
            'simulator_regime': sample.get('simulator_regime'),
            'remote_qmc_bias': sample.get('remote_qmc_bias'),
            'remote_qmc_prob_positive': sample.get('remote_qmc_prob_positive'),
            'remote_regime': sample.get('remote_regime'),
            'qaoa_weight_corr': sample.get('qaoa_weight_corr'),
        }
        for sample in samples
        if sample.get('simulator_outlook') != sample.get('remote_qmc_bias')
        or (sample.get('simulator_regime') is not None and sample.get('simulator_regime') != sample.get('remote_regime'))
        or sample.get('remote_regime') is None
    ]

    return {
        'overall': overall,
        'contract': report.get('contract'),
        'remote_url': report.get('remote_url'),
        'csv': report.get('csv'),
        'sample_count': int(summary.get('sample_count') or 0),
        'qmc_direction_match_rate': qmc_rate,
        'regime_match_rate': regime_rate,
        'avg_qaoa_weight_corr': qaoa_corr,
        'avg_remote_var_proxy': summary.get('avg_remote_var_proxy'),
        'avg_remote_regime_confidence': avg_regime_conf,
        'verdicts': verdicts,
        'mismatch_count': len(mismatches),
        'mismatch_examples': mismatches[:5],
    }


def print_summary(analysis: Dict[str, Any]) -> None:
    print('=== Quantum Fidelity Report Analysis ===')
    print(f"Overall verdict: {analysis['overall']}")
    print(f"Contract: {analysis['contract']}")
    print(f"Remote URL: {analysis['remote_url']}")
    print(f"CSV: {analysis['csv']}")
    print(f"Samples: {analysis['sample_count']}")
    print(f"QMC direction match: {analysis['qmc_direction_match_rate'] * 100:.1f}%")
    print(f"Regime match: {analysis['regime_match_rate'] * 100:.1f}%")
    print(f"Avg QAOA corr: {analysis['avg_qaoa_weight_corr']}")
    print(f"Avg remote regime confidence: {analysis['avg_remote_regime_confidence']}")
    print(f"Mismatch count: {analysis['mismatch_count']}")
    print('Checks:')
    for label, value, threshold, ok in analysis['verdicts']:
        print(f"- {label}: value={value} threshold={threshold} status={'OK' if ok else 'FAIL'}")

    if analysis['mismatch_examples']:
        print('Mismatch examples:')
        for item in analysis['mismatch_examples']:
            print(json.dumps(item, ensure_ascii=True))


def main() -> int:
    parser = argparse.ArgumentParser(description='Analyze a quantum fidelity replay JSON report')
    parser.add_argument('--report', required=True, help='Path to quantum fidelity replay JSON report')
    parser.add_argument('--min-qmc-match', type=float, default=0.70)
    parser.add_argument('--min-regime-match', type=float, default=0.70)
    parser.add_argument('--min-qaoa-corr', type=float, default=0.60)
    args = parser.parse_args()

    try:
        report = load_report(args.report)
        analysis = summarize(report, args.min_qmc_match, args.min_regime_match, args.min_qaoa_corr)
    except Exception as exc:
        print(f'ERROR: {exc}')
        return 1

    print_summary(analysis)
    return 0 if analysis['overall'] != 'FAIL' else 2


if __name__ == '__main__':
    raise SystemExit(main())