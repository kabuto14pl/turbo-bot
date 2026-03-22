# Remote-GPU Full Pipeline Audit — 2026-03-08

## Scope

This audit answers three operational questions for the current codebase:

1. Can full backtests be combined in parallel safely if we only care about `remote-gpu` and `full_pipeline`?
2. What does the current backtest stack produce beyond headline PnL?
3. Can backtest outputs be promoted directly into the real bot without an additional gate?

## Current state

### Full backtest is real, but it is not the same thing as runtime parity

- The canonical engine remains `full_pipeline` by default in [ml-service/backtest_pipeline/config.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/config.py#L131).
- `runtime_parity` is a separate profile intended for live-contract comparison, not for research optimization.
- Therefore, any promotion path that treats `full_pipeline` as if it were already live-equivalent would be methodologically wrong.

### Remote GPU is an execution backend, not a second backtest engine

- `remote-gpu` is implemented in [ml-service/backtest_pipeline/quantum_backend.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/quantum_backend.py#L233-L269).
- In that mode the backtest still runs inside the canonical Python engine.
- Only selected quantum components are offloaded to the remote/local CUDA service:
  - QMC override
  - QAOA weight optimization
  - VQC sampling / telemetry
- This means `remote-gpu` is one backtest pipeline with out-of-process quantum calls, not two parallel backtests.

### Parallel execution is not safe inside one shared Python process

The canonical runner mutates module-level config during execution:

- [ml-service/backtest_pipeline/runner.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/runner.py#L540-L543) changes `XGBOOST_RETRAIN_INTERVAL`.
- [ml-service/backtest_pipeline/runner.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/runner.py#L554-L559) applies and restores per-pair overrides.
- [ml-service/backtest_pipeline/skynet_brain.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/skynet_brain.py#L635-L649) mutates the shared `config` module directly.

Conclusion:

- Thread-level or async parallelism inside one interpreter is not trustworthy for full backtest execution.
- Safe parallelization must isolate jobs into separate processes.

## What the backtest actually gives us

The canonical runner is not just a PnL printer. It exposes full diagnostics in [ml-service/backtest_pipeline/runner.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/runner.py#L95-L430), including:

- net result, return, Sharpe, max drawdown, profit factor, fees
- long/short split
- exit reasons and phase exits
- regime performance and regime distribution
- ensemble stats
- quantum stats and normalized `quantum_summary`
- ML / XGBoost / LLM / sentiment stats
- entry-quality and price-action stats
- Neuron stats
- signal-level metrics
- blocked reasons

This is enough to support a real promotion gate, but only if the gate keeps research results separate from live-parity validation.

## Research-to-live drift findings

### Drift 1: live config surface is much thinner than backtest config surface

Live config in [trading-bot/src/modules/config.js](/workspaces/turbo-bot-local/trading-bot/src/modules/config.js) exposes only a small generic shell:

- symbol / symbols
- timeframe
- initial capital
- max drawdown
- risk per trade
- fee rate
- a few infra flags

Backtest config in [ml-service/backtest_pipeline/config.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/config.py#L120-L520) carries a much wider parameter surface:

- ensemble thresholds
- runtime parity thresholds
- defense-mode knobs
- QDV gates
- partial TP ladder
- ranging/grid/news/funding parameters
- dynamic SL / adaptive sizing flags
- XGBoost / LLM / sentiment settings

Conclusion:

- There is no single unified parameter source between research and live runtime.
- Any automatic promotion step would currently promote into an incomplete live configuration model.

### Drift 2: some logically equivalent thresholds are duplicated, not shared

Example:

- backtest runtime-parity thresholds live in [ml-service/backtest_pipeline/config.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/config.py#L129-L136)
- live runtime-parity thresholds live separately in [trading-bot/src/modules/runtime-parity.js](/workspaces/turbo-bot-local/trading-bot/src/modules/runtime-parity.js#L3-L8)

They are currently aligned, but they are still two sources of truth.

### Drift 3: some live runtime risk and defense parameters do not match backtest defaults

Examples:

- backtest `RISK_PER_TRADE = 0.015` in [ml-service/backtest_pipeline/config.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/config.py#L100-L120)
- live `riskPerTrade` default is `0.02` in [trading-bot/src/modules/config.js](/workspaces/turbo-bot-local/trading-bot/src/modules/config.js#L18-L20)
- live `RiskManager` also hardcodes `baseRisk = 0.02` in [trading-bot/src/modules/risk-manager.js](/workspaces/turbo-bot-local/trading-bot/src/modules/risk-manager.js#L67-L75)
- backtest fee rate is `0.00015` in [ml-service/backtest_pipeline/config.py](/workspaces/turbo-bot-local/ml-service/backtest_pipeline/config.py#L100-L120)
- live config default fee is `0.001` in [trading-bot/src/modules/config.js](/workspaces/turbo-bot-local/trading-bot/src/modules/config.js#L31-L32)

Conclusion:

- Even before model logic is compared, the economic assumptions already drift.

### Drift 4: some live execution parameters are still hardcoded in runtime modules

Example:

- `QuantumPositionManager` bootstrap values in [trading-bot/src/modules/bot.js](/workspaces/turbo-bot-local/trading-bot/src/modules/bot.js#L329-L336) are explicitly “backtest proven”, but they are still embedded directly in the live bootstrap.

Conclusion:

- The real bot does consume backtest conclusions.
- But that promotion happens through manual code changes and comments, not through a controlled config promotion artifact.

## Critical recommendation

### What should happen next

1. Run `full_pipeline + remote-gpu` in isolated processes only.
2. Keep `runtime_parity` as a separate validation lane.
3. Introduce a promotion gate that reads backtest artifacts but does not auto-deploy to live.

### What should not happen next

1. Do not merge `full_pipeline` and `runtime_parity` into one composite score.
2. Do not add thread-level parallelism to the current runner.
3. Do not auto-apply `SkynetBrain` `best_config` to the real bot without an explicit approval gate.

## Operational note

The dev container could not reach `http://127.0.0.1:4000/health` directly during this audit, so remote GPU availability could not be re-verified from inside the container.

However, the last operator run in terminal context completed with exit code `0` via `start-local-gpu-and-run-backtest.ps1`, and that script hard-fails if the CUDA service is not online or if the `remote-gpu` backtest fails.

Conclusion:

- Remote GPU is operationally validated by the last successful operator run.
- The missing piece is not GPU availability, but safe orchestration and promotion discipline around the full research pipeline.