"""Promotion bundle helpers for approved remote-GPU research artifacts.

The promotion bundle is an immutable handoff contract between the Python
research pipeline and the live JS bot. It snapshots the approved manifest,
the gate verdict, the latest ML model files that were available at promotion
time, and the runtime sandbox paths that live learning should use.
"""

from __future__ import annotations

import json
import shutil
from datetime import UTC, datetime
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_BUNDLE_ROOT = REPO_ROOT / 'artifacts' / 'promoted'
DEFAULT_RUNTIME_SANDBOX_ROOT = REPO_ROOT / 'artifacts' / 'runtime_sandbox'
DEFAULT_AI_MODEL_DIR = REPO_ROOT / 'data' / 'ai_models'
DEFAULT_NEURON_STATE_PATH = REPO_ROOT / 'trading-bot' / 'data' / 'neuron_ai_state.json'
DEFAULT_NEURON_LOG_PATH = REPO_ROOT / 'trading-bot' / 'data' / 'neuron_ai_decisions.log'


def _repo_relative(path: Path) -> str:
    try:
        return path.resolve().relative_to(REPO_ROOT).as_posix()
    except ValueError:
        return path.resolve().as_posix()


def _load_json(path: Path) -> dict[str, Any]:
    return json.loads(path.read_text(encoding='utf-8'))


def _resolve_existing_path(raw_path: str | None, *, relative_root: Path) -> Path | None:
    if not raw_path:
        return None

    candidate = Path(raw_path)
    candidates = []
    if candidate.is_absolute():
        candidates.append(candidate)
    else:
        candidates.append((relative_root / candidate).resolve())
        candidates.append((REPO_ROOT / candidate).resolve())
        candidates.append((relative_root.parent / candidate).resolve())

    for item in candidates:
        if item.exists():
            return item

    return None


def _copy_file(src: Path, dest: Path) -> Path:
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(src, dest)
    return dest


def _build_runtime_paths(bundle_id: str) -> dict[str, Any]:
    sandbox_root = DEFAULT_RUNTIME_SANDBOX_ROOT / bundle_id
    return {
        'base_runtime': {
            'ai_model_dir': _repo_relative(DEFAULT_AI_MODEL_DIR),
            'neuron_state_file': _repo_relative(DEFAULT_NEURON_STATE_PATH),
            'neuron_log_file': _repo_relative(DEFAULT_NEURON_LOG_PATH),
        },
        'sandbox': {
            'root': _repo_relative(sandbox_root),
            'state_file': _repo_relative(sandbox_root / 'bot_state.json'),
            'ai_model_dir': _repo_relative(sandbox_root / 'ai_models'),
            'neuron_state_file': _repo_relative(sandbox_root / 'neuron_ai_state.json'),
            'neuron_log_file': _repo_relative(sandbox_root / 'neuron_ai_decisions.log'),
        },
    }


def _copy_latest_ml_snapshot(bundle_dir: Path) -> dict[str, Any] | None:
    latest_json = REPO_ROOT / 'ml-service' / 'models' / 'latest.json'
    if not latest_json.exists():
        return None

    latest = _load_json(latest_json)
    model_dir = bundle_dir / 'ml-service-models'
    copied_files: dict[str, str] = {}
    meta_payload: dict[str, Any] | None = None

    for key in ('xgb_clf', 'lgb_clf', 'xgb_reg', 'meta'):
        source = _resolve_existing_path(latest.get(key), relative_root=latest_json.parent)
        if not source:
            continue
        copied = _copy_file(source, model_dir / source.name)
        copied_files[key] = _repo_relative(copied)
        if key == 'meta':
            meta_payload = _load_json(source)

    copied_latest = _copy_file(latest_json, model_dir / 'latest.json')

    return {
        'snapshot_latest_json': _repo_relative(copied_latest),
        'files': copied_files,
        'timestamp': latest.get('timestamp'),
        'training_meta': meta_payload,
    }


def create_promoted_bundle(
    manifest_path: Path,
    gate_result: dict[str, Any],
    *,
    bundle_root: Path | None = None,
    activate: bool = False,
) -> dict[str, Any]:
    bundle_root = (bundle_root or DEFAULT_BUNDLE_ROOT).resolve()
    bundle_root.mkdir(parents=True, exist_ok=True)

    run_id = manifest_path.parent.name
    bundle_id = f'{run_id}_approved'
    bundle_dir = bundle_root / bundle_id
    bundle_dir.mkdir(parents=True, exist_ok=True)

    manifest_copy = _copy_file(manifest_path.resolve(), bundle_dir / 'aggregate_manifest.json')
    gate_copy = bundle_dir / 'promotion_gate.json'
    gate_copy.write_text(json.dumps(gate_result, indent=2), encoding='utf-8')

    manifest = _load_json(manifest_path.resolve())
    runtime_paths = _build_runtime_paths(bundle_id)
    ml_snapshot = _copy_latest_ml_snapshot(bundle_dir)

    approved_jobs = []
    for job in manifest.get('jobs', []):
        approved_jobs.append({
            'spec': (job.get('job') or {}).get('spec'),
            'summary': job.get('summary') or {},
            'elapsed_s': job.get('elapsed_s'),
        })

    bundle = {
        'schema_version': 1,
        'bundle_id': bundle_id,
        'status': 'approved',
        'promoted_at': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        'source': {
            'run_id': run_id,
            'manifest_path': _repo_relative(manifest_copy),
            'remote_url': manifest.get('remote_url'),
            'mode': manifest.get('mode'),
            'max_parallel': manifest.get('max_parallel'),
        },
        'gate': {
            'approved': gate_result.get('approved', False),
            'findings': gate_result.get('findings', []),
            'criteria': gate_result.get('criteria', {}),
            'result_path': _repo_relative(gate_copy),
        },
        'research': {
            'approved_jobs': approved_jobs,
            'created_at': manifest.get('created_at'),
        },
        'ml_snapshot': ml_snapshot,
        'live': {
            'config_overrides': {
                'timeframe': '15m',
                'maxDrawdown': float(gate_result.get('criteria', {}).get('max_single_drawdown', 15.0)) / 100.0,
                'tradingFeeRate': 0.0005,  # PATCH #145: Kraken Pro 0.05% maker tier
            },
            **runtime_paths,
        },
    }

    bundle_path = bundle_dir / 'bundle.json'
    bundle_path.write_text(json.dumps(bundle, indent=2), encoding='utf-8')

    bundle_info = {
        'written': True,
        'bundle_id': bundle_id,
        'bundle_path': _repo_relative(bundle_path),
        'activated': False,
    }

    if activate:
        pointer_path = bundle_root / 'current.json'
        pointer_payload = {
            'bundle_id': bundle_id,
            'bundle_path': _repo_relative(bundle_path),
            'activated_at': datetime.now(UTC).isoformat().replace('+00:00', 'Z'),
        }
        pointer_path.write_text(json.dumps(pointer_payload, indent=2), encoding='utf-8')
        bundle_info['activated'] = True
        bundle_info['pointer_path'] = _repo_relative(pointer_path)

    return bundle_info