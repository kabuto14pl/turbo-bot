# Runtime / Backtest Audit — 2026-03-08

## Executive summary

This audit closes the gap between the live modular runtime and the canonical backtest in four areas that materially affected trust in results:

1. Live trade-close learning reached Skynet and ML, but not the Neuron executive layer.
2. The live Neuron path expected `mlSignal`, but `bot.js` never injected it into `llmState`.
3. The canonical backtest ran materially richer gates than the live runtime, so raw backtest expectancy overstated live behavior.
4. Live deployment was still BTC-first in practice, while the requested operating universe is BTC, ETH, SOL, BNB, and XRP.

## Confirmed pre-fix gaps

### 1. Neuron executive learning was disconnected in live runtime

- Live close detection in `trading-bot/src/modules/bot.js::_detectAndLearnFromCloses()` learned into `AdaptiveNeuralEngine` and ML only.
- `trading-bot/src/core/ai/neuron_ai_manager.js::learnFromTrade()` existed, but had no live call site.

Impact:

- The executive layer kept making decisions without being updated by real profit and loss outcomes from live closes.

### 2. `mlSignal` contract was broken between live runtime and Neuron fallback logic

- `trading-bot/src/core/ai/neuron_ai_manager.js::_fallbackDecision()` consumes `state.mlSignal` heavily.
- The live LLM state builder in `trading-bot/src/modules/bot.js` did not pass `mlSignal` at all.

Impact:

- Strong ML alignment paths in Neuron fallback could not trigger from the real live state even though the code path already existed.

### 3. Backtest was richer than runtime

Live runtime primary path:

- ensemble consensus
- simplified PRIME gate
- simple risk check
- execution

Canonical backtest path:

- ensemble consensus
- Neuron simulator decision
- QDV verification
- LLM override validator
- sentiment modifier
- entry quality filter
- price action gate
- long-trend and pair-specific direction filters
- news filter
- pre-entry momentum gate
- execution

Impact:

- Backtest and live were not behaviorally identical, so expectancy and trade count could drift materially.

### 4. Live runtime was still effectively single-symbol-first

- `trading-bot/src/modules/config.js` exposed both `symbol` and `symbols`.
- `trading-bot/src/modules/data-pipeline.js` still fetched around `config.symbol` only.
- `trading-bot/src/modules/execution-engine.js` was already symbol-aware.
- `ecosystem.config.js` still launched a single bot process.

Impact:

- The safest production expansion path was not an in-process multi-symbol rewrite, but multiple single-symbol live instances.

### 5. Backtest pair policy still practically sidelined part of the requested universe

- `ml-service/backtest_pipeline/runner.py` already supported BTC, ETH, SOL, BNB, and XRP.
- `ml-service/backtest_pipeline/pair_config.py` still contained funding-only or hard directional suppression for BTC, ETH, and XRP, plus extra BNB long blocking.

Impact:

- The requested five-pair universe was not actually being tested or traded as a fully active set.

## Implemented remediation path

### Runtime fixes

- Wire live trade-close learning into `NeuronAIManager.learnFromTrade()`.
- Inject resolved ML state into live `llmState`.
- Normalize Neuron prompt state around the active symbol instead of BTC-specific wording.
- Centralize the live runtime risk-check contract in a reusable parity helper.

### Backtest fixes

- Introduce an explicit `runtime_parity` gate profile that reproduces the live-style PRIME plus risk-check contract.
- Preserve `full_pipeline` as an opt-in research profile instead of silently deleting richer research gates.
- Keep all five requested pairs active in pair allocation and remove pair-level directional kill switches.

### Deployment fixes

- Prepare five PM2 live instances, one per symbol, with isolated ports and instance ids.
- Keep the BTC instance name as `turbo-bot` for operational backward compatibility.

## Verification targets

- Jest parity test compares runtime executive decision and backtest runtime-parity decision on the same snapshot.
- Quality suite validates the new `mlSignal` handoff contract.
- Multi-pair backtest runs on BTC, ETH, SOL, BNB, and XRP with no pair removed from active allocation.

## Stage 2 findings — active logic vs mentions

### Strategies are genuinely active in both paths

- Live runtime really executes `AdvancedAdaptive`, `RSITurbo`, `SuperTrend`, `MACrossover`, and `MomentumPro` through `trading-bot/src/modules/strategy-runner.js`.
- Canonical backtest really executes the same family in `ml-service/backtest_pipeline/strategies.py`.
- Backtest also has `BollingerMR` as a real additional RANGING-only strategy, which is not present in the live main runtime path.

### Candle-pattern logic is real, not decorative

- Live runtime uses real candlestick pattern detection in `trading-bot/src/modules/candle-patterns.js`.
- Those patterns are consumed in two live places:
	- strategy confirmation inside `trading-bot/src/modules/strategy-runner.js`
	- higher-timeframe confirmation in the extracted runtime decision path now centralized in `trading-bot/src/modules/decision-core.js`
- Backtest also uses real candle-pattern logic through `ml-service/backtest_pipeline/strategies.py` and feature extraction in `ml-service/backtest_pipeline/xgboost_ml.py`.

### Support/resistance is active in backtest, but still not symmetrical in live runtime

- Backtest actively uses support/resistance in two real gates:
	- `ml-service/backtest_pipeline/sr_filter.py`
	- `ml-service/backtest_pipeline/price_action.py`
- Those modules materially change pass/block decisions and confidence in the canonical backtest path.
- No equivalent support/resistance or price-action gate is currently wired into the live main runtime decision path in `trading-bot/src/modules/bot.js`.

Implication:

- Any claim that live and backtest are fully identical on S/R or structural price-action usage would be false.
- Stage 2 parity therefore extracts and validates the truly shared decision core only: signal map, ensemble consensus, PRIME validation, and runtime risk gating.

### Optimization is real, but not every optimizer in the repo drives live decisions

- Live adaptive optimization is real in `trading-bot/src/core/ai/adaptive_neural_engine.js`:
	- `getOptimalStrategyWeights()` feeds live ensemble voting
	- `learnFromTrade(...)` records realized outcomes
	- `globalParamEvolution()` mutates `evolvedConfig`
- Backtest optimization is real in the canonical runner:
	- periodic `xgboost_ml.maybe_retrain(...)`
	- `ensemble.update_weights(...)`
	- `neuron.learn_from_trade(...)`
	- `ml.learn_from_trade(...)`
- The offline research optimizer in `ml-service/backtest_pipeline/skynet_brain.py` is real, but it is a separate tuning loop rather than the main per-candle runtime path.
- `PortfolioOptimizationEngine` is instantiated in live `bot.js`, but that object is not what currently drives the live entry decision core. The materially active live optimizers are the adaptive neural engine and the quantum pipeline layers.

## Stage 2 implementation

- Extracted live runtime consensus logic into `trading-bot/src/modules/decision-core.js`.
- Added a matching backtest runtime consensus core in `ml-service/backtest_pipeline/decision_core.py`.
- Rewired live `bot.js` to use the extracted consensus candidate/finalization helpers.
- Rewired backtest `runtime_parity` mode in `ml-service/backtest_pipeline/engine.py` to use the extracted runtime consensus core instead of the richer research-only neuron path.
- Upgraded parity coverage so Jest now compares:
	- real live `EnsembleVoting` + PRIME + risk path
	- against the extracted backtest runtime decision core on the same signal set.

## Operational note

Repository instructions for this workspace explicitly forbid deploying patches from the agent through VPS commands. This audit therefore includes the live rollout configuration in local source, but not a remote deployment step.

## Stage 2 — Source-grounded findings after extracting the shared decision core

### Shared decision core now exists on both sides

- Live runtime now routes consensus through `trading-bot/src/modules/decision-core.js`.
- The backtest runtime-parity path now routes through `ml-service/backtest_pipeline/decision_core.py`.
- `ml-service/backtest_pipeline/engine.py` no longer relies on a separate pre-vote legacy gate before invoking the runtime-parity core, which removes an early behavioral divergence.
- `ml-service/backtest_pipeline/runtime_parity.py` is now only a compatibility wrapper over the extracted Python decision core instead of a second independent implementation.

### Strategies are genuinely active in live runtime

Confirmed from active code paths:

- `trading-bot/src/modules/strategy-runner.js::runAll()` executes the live strategy set.
- The active live strategies are:
	- `AdvancedAdaptive`
	- `RSITurbo`
	- `SuperTrend`
	- `MACrossover`
	- `MomentumPro`

This is not documentation-only or dead code; the signals are fed into the live ensemble path in `trading-bot/src/modules/bot.js`.

### Strategy adaptation and optimization are genuinely active

Confirmed live optimization paths:

- `trading-bot/src/modules/ensemble-voting.js` consumes dynamic weights from `getOptimalStrategyWeights()` when a weight provider is connected.
- `trading-bot/src/core/ai/adaptive_neural_engine.js` actively exposes and updates:
	- `getOptimalStrategyWeights()`
	- `learnFromTrade(...)`
	- `globalParamEvolution()`
	- `evolvedConfig`

Confirmed backtest optimization paths:

- `ml-service/backtest_pipeline/engine.py` actively calls:
	- `self.xgb_ml.maybe_retrain(...)`
	- `self.ensemble.update_weights(...)`
	- `self.neuron.learn_from_trade(...)`
	- `self.ml.learn_from_trade(...)`

Conclusion:

- The system does perform real adaptive tuning in both runtime and backtest.
- However, the exact optimization mechanisms are not identical across the two environments.

### Candle patterns are genuinely active in both runtime and backtest

Confirmed live candle-pattern usage:

- `trading-bot/src/modules/candle-patterns.js` implements the actual pattern engine.
- `trading-bot/src/modules/strategy-runner.js` applies candle confirmation inside live strategy evaluation.
- `trading-bot/src/modules/bot.js` applies extra higher-timeframe pattern confirmation before final execution.

Confirmed backtest candle-pattern usage:

- `ml-service/backtest_pipeline/strategies.py` imports `CandlePatternEngine` and uses pattern-confirmed logic inside multiple strategies.

Conclusion:

- Candle formations are not cosmetic mentions; they materially affect both runtime and backtest decisions.

### Support/resistance is active in backtest, but not in the live main decision path

Confirmed active backtest S/R usage:

- `ml-service/backtest_pipeline/sr_filter.py` implements live gating logic around support/resistance, volume, and MTF.
- `ml-service/backtest_pipeline/price_action.py` builds and scores S/R zones and entry timing around them.
- `ml-service/backtest_pipeline/engine.py` invokes both layers in the full research pipeline.

Confirmed live asymmetry:

- The live main path in `trading-bot/src/modules/bot.js` routes through strategies, ML veto, ensemble, MTF pattern confirmation, PRIME, and risk checks.
- A source search over `trading-bot/src/modules/**` did not identify an equivalent active support/resistance or price-action gate in the main runtime decision path.

Conclusion:

- Backtest currently uses explicit structural S/R filters.
- Live runtime currently does not use an equivalent explicit S/R gate in the main decision path.
- This remains a real parity gap and should be treated as such, not explained away.

### Portfolio optimization status in live runtime

- `trading-bot/src/modules/bot.js` initializes `PortfolioOptimizationEngine`.
- A direct usage search did not show that standalone engine participating in the live entry-decision path.
- The actively used live optimization around trading decisions is instead centered on:
	- `AdaptiveNeuralEngine`
	- `QuantumHybridEngine`
	- `QuantumPositionManager`

Conclusion:

- The live bot does contain real optimization, but not every optimization-class present in the repo is part of the authoritative execution path.

## Stage 3 — Structural parity closure after the shared decision core extraction

### Live runtime now has an explicit structural gate in the authoritative path

- Added `trading-bot/src/modules/structural-gate.js` and wired it into `trading-bot/src/modules/decision-core.js`.
- The live runtime final path now applies a history-aware structural score before PRIME and runtime risk checks.
- The score combines:
	- support/resistance proximity from pivot-like levels, Fibonacci retracement, and round-number structure
	- volume / VWAP confirmation
	- macro trend alignment from EMA / SMA / ADX state

This does not make live runtime identical to the full research pipeline, but it closes the previously documented absence of any explicit structural gate in the authoritative live entry path.

### Runtime-parity backtest now sees the same kind of candle context as live

- Added `ml-service/backtest_pipeline/structural_gate.py`.
- `ml-service/backtest_pipeline/decision_core.py` now applies the same structural-gate contract used in live runtime.
- `ml-service/backtest_pipeline/engine.py` now passes current-inclusive candle history into the runtime-parity core.

This matters because live runtime evaluates decisions with the newest candle already appended to local history. The parity path must see the same current candle or any structural comparison is shifted by one bar.

### Real-candle parity validation now exists in addition to synthetic signal-map parity

- Added offline fixture `trading-bot/src/__fixtures__/btcusdt-15m-runtime-parity.json` sourced from public BTCUSDT 15m candles.
- `trading-bot/src/runtime-parity.test.ts` now compares JS and Python runtime cores on that real history.
- The real-candle test validates:
	- identical final action
	- identical structural pass/fail outcome
	- bounded drift in confidence / structural score between JS and Python implementations

Conclusion:

- Parity is now stronger than “same signals in, same vote out”.
- The shared runtime path now includes a real structural-history step on both sides.
- Remaining differences should be treated as bounded cross-language indicator drift unless they cross action or gate thresholds.

### Portfolio optimizer status is now explicit instead of implied

- `bot.js` still initializes `PortfolioOptimizationEngine`, but the log message now states that it is research/advisory only and not entry-authoritative.

Conclusion:

- The repo still contains multiple optimization layers.
- The authoritative live entry path is now clearer both in code and in operator-visible logs.