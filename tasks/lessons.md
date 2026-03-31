# Turbo-Bot AI Trading — Lessons Learned

> Automatycznie aktualizowane po każdej poprawce i odkryciu.

---

## 2026-04-01: PATCH #216 — Strategy Audit: Real SuperTrend, R:R, Grid Gate, Thresholds

### L216.1: Fake indicator data is the silent killer of ensemble strategies
`data-pipeline.js` set `supertrend: { value: ema50, direction: close > ema50 }` — EMA50 masquerading as SuperTrend. Three class-based strategies (55% of ensemble weight) consumed this as truth. No test or log ever flagged it because the shape was correct. **Rule**: every indicator must have an independent unit test comparing output to a known reference, not just a shape check.

### L216.2: Unreachable candle gates make strategies invisible dead weight
`MTF_MIN_CANDLES = 200` when the bot stores 100-200 candles meant Momentum HTF/LTF NEVER fired. The strategy loaded, the code ran, but the early return always triggered. **Rule**: log when a strategy is skipped due to insufficient data, and alert if skip rate > 95% over 24h.

### L216.3: Regime-dependent strategies die when the regime classifier returns UNKNOWN
Grid V2 required `regime === RANGING`, but NeuralAI (Thompson Sampling) often returns UNKNOWN. SOL Grid was permanently dead. **Rule**: regime gates must handle UNKNOWN explicitly; UNKNOWN should default to the strategy favorable regime, not block.

### L216.4: R:R below 2:1 with partial TP is a losing game
SL 1.5x ATR + TP 2.5x ATR = R:R 1.67:1. Partial TP at 1.5x ATR dropped effective R:R to ~1.3:1, requiring >60% win rate. **Rule**: minimum effective R:R (after partial TP) must be >= 2.0:1.

### L216.5: Low confidence floors create high-frequency small-loss trades
Floor 0.20 let marginal signals through. These hit SL quickly or get closed with micro-profit after fees. **Rule**: confidence floor should be >= max(fee_impact, 0.35).

---

## 2026-03-15: PATCH #186 — GPU-Native Quantum Batching

## 2026-03-29: PATCH #188 — Agent Canon + Promptfoo + OpenLIT Baseline

### L188.1: Multiple instruction files without a canonical owner create silent architecture drift
When `copilot-instructions`, skill markdown, runtime comments, and prompt entrypoints all evolve separately, the system stops answering a basic question: which file is authoritative. A short canonical contract file is cheaper than repeated audits.

### L188.2: Deterministic evals should target the lowest-noise decision layer first
Before grading live LLM behavior, lock down the deterministic fallback path that encodes actual trading gates. It catches regressions in drawdown handling, MTF gating, and HOLD/BUY/SELL ownership without provider variance.

### L188.3: Observability must be opt-in in trading infrastructure
Instrumentation that changes startup behavior by default creates deployment risk. For bot infrastructure, observability should be one env flag away, not hardwired into the happy path.

### L188.4: Prefer vendor-maintained compose topology over hand-rolled image guesses
If a self-hosted platform publishes its own Docker Compose and public image name, mirror that topology first. Guessing sub-images like `openlit-client` is brittle and can break immediately on private registry policy.

### L186.1: Bigger remote kernels do not fix a chatty per-candle architecture
Raising QMC/QAOA payload sizes increased individual GPU calls, but the GPU-native backtest still spent most of its time inside a Python candle loop making thousands of scheduled quantum HTTP calls. If the orchestration layer is chatty, larger kernels only create bursts, not sustained utilization. Batch the quantum plan locally and reuse it through the loop.

### L186.2: Unused quantum outputs are pure latency tax
`GpuNativeBacktestEngine` did not consume `qaoa_weights`, yet the remote backend still computed QAOA every interval. In a GPU-first path, any quantum component that does not directly affect entry, exit, or risk must be removed or precomputed offline.

---

## 2026-03-15: PATCH #187 — ExternalSignals Enabled in GPU-Native Engine

### L187.1: A weight in STATIC_WEIGHTS with no signal source is silent dead weight
`EXTERNAL_SIGNALS_ENABLED = False` + `GPU_ONLY_BACKTEST = True` together meant ExternalSignals weight 0.10 was declared but the signal was never generated. The ensemble saw 9 weight slots but only 7 ever voted — effective weights were inflated by ~11% for all other strategies. Always verify `sum(active_signals weights) ≈ sum(STATIC_WEIGHTS)` at test time.

### L187.2: Disabling a pure-numpy simulator to "save CPU" in a GPU backtest is wrong
ExternalSignalsSimulator is ~2 ms/candle of numpy arithmetic (EMA, RSI, volume ratio). It was disabled with comment "CPU-only". But it's a backtest SIMULATOR, not a live API caller. The only latency that matters in backtests is total wall time. A 2ms numpy op across 14k candles = 28 s — acceptable overhead for a valid ensemble voter.

### L187.3: GPU-native engine must explicitly add any column needed by pre-computation helpers
`_row_buffers()` only cached `close/high/low/atr`. `ExternalSignalsSimulator._whale_proxy()` needs `open` to compute candle body, and `volume` for spike detection. Missing fields cause `float(row['open'])` KeyError at runtime. Extend `_row_buffers()` whenever adding a new pre-computation that reads the current candle.

---

## 2026-03-12: PATCH #148 — 3-Layer Architecture + Fee Alignment

### L148.1: Pipeline complexity masks real decision ownership
23 decision layers across 8 modules made it impossible to answer "who decides?" for any given trade. Structural gate was dead code (pass-through since P146). Runtime-parity duplicated risk logic already in RiskManager. Consolidating to 3 clear layers (Alpha→Risk→Exec) with documented ownership eliminates ambiguity.

### L148.2: Backtest-live fee discrepancy inflates strategy performance by 3.3×
Backtest FEE_RATE=0.00015 (0.015%) vs live tradingFeeRate=0.0005 (0.05%) — backtest results were 3.3× more optimistic on fees. Any positive edge in backtest could be entirely consumed by real fees. Always verify fee parity: `backtest_config.FEE_RATE × 2 == train_model.fee == config.tradingFeeRate × 2`.

### L148.3: Deprecated pass-through functions accumulate tech debt silently
P146 deprecated structural gate but left the function + all log handling in bot.js. Dead code paths executed on every cycle, cluttering logs and confusing architecture audits. When deprecating: remove the function entirely, don't just make it return pass-through.

---

## 2026-03-11: PATCH #147 — Position Flip + Fee Gate Symmetry

### L147.1: Validation-layer blocks can silently nullify entire feature implementations
P141 correctly implemented SELL=SHORT in execution logic (SL/TP, portfolio accounting, APM registration). But `_validateSignal()` rejected ALL signals when any position existed — so the SELL→SHORT code path was unreachable whenever a LONG was open. The feature was "implemented" but non-functional. Always test the full signal path from entry to execution, not just the execution handler.

### L147.2: Fee gates that only check one direction create asymmetric risk exposure
The fee gate (P44A) only checked BUY entries. SELL/SHORT entries bypassed fee validation entirely. After P141 made SELL=SHORT, this meant shorts could burn fees that longs couldn't. Every risk/safety gate must be audited for direction symmetry after any action semantic change.

---

## 2026-03-11: ML Training — XGBoost+LightGBM on historical data (CPU)

### LML.1: XGBoost on 15m/1h crypto data achieves ~51% accuracy — no edge above random
Trained on 14,201 BTC 15m candles (Oct 2025–Mar 2026) with 61 features. Walk-forward CV: 51.0% ± 1.5%. Out-of-sample: 51.0% directional accuracy, 32.7% win rate after fees, -87.74% PnL. 1h was even worse: 50.4%, -97.15% PnL. XGBoost quality gate (min CV 0.55) correctly keeps model advisory-only.

### LML.2: Top features are volume-based, not price-based — but they still don't predict
Top features: up_down_vol_ratio, buying_pressure_trend, buying_pressure_avg, vol_acceleration. Price momentum features ranked lower. Despite sensible feature importance, the model cannot predict direction better than coin flip on crypto 15m data.

### LML.3: Round-trip fee in train_model.py was 0.2% — corrected to 0.1% for Kraken Pro maker
The evaluation script used 0.002 (0.2%) round-trip. With 0.05% maker fees, correct round-trip is 0.001 (0.1%). This made training evaluation results even more pessimistic than reality, but even with corrected fees the model has no edge.

---

## 2026-03-12: PATCH #146 — Structural Gate Deprecation

### L146.1: Gates that almost never fire are worse than no gate — they add latency and false confidence
The structural gate (S/R levels, volume, MTF) required minScore 0.30 and almost always passed. This creates an illusion of safety while adding a confidence modifier to every signal. If a gate passes >95% of signals, it's not a gate — it's overhead. Deprecate or tighten.

---

## 2026-03-12: PATCH #145 — Layer Reduction — Pipeline Simplification

### L145.1: Double quantum layers = double the decorative overhead, not double the precision
QuantumHybridEngine and HybridQuantumClassicalPipeline both performed quantum analysis per signal. Two quantum layers don't make predictions 2× better — they add two confidence modifiers that compound to destroy signal strength. One quantum path is sufficient.

### L145.2: Starvation boost defeats confidence floors by design — it's anti-pattern in quant trading
If the system can't find signals above the confidence floor, forcing entries on weak signals via starvation boost destroys edge. The correct response to no-signal periods is NO TRADE, not lowered standards. Never boost artificial confidence to force activity.

### L145.3: Multiple loss counters tracking the same event sequence will inevitably drift
Three separate counters (defense 7, soft pause 2, circuit breaker 5) tracking consecutive losses from the same loss events led to inconsistent resets. A single counter with tiered thresholds (2→soft pause, 5→halt) is simpler, testable, and drift-proof.

### L145.4: Dead code in risk gates creates false safety documentation
Runtime Parity's 20% drawdown hard block could never fire because Risk Manager kills at 15%. But reading the code, you'd think there's a 20% safety net. Dead safety code is worse than no code — it misleads auditors. Remove or align to actual kill points.

### L145.5: Promotion bundle overrides spread LAST in config — they silently win over all defaults
`...bundleOverrides` at the end of the config return object means bundle JSON values override EVERY computed default. Changing config.js defaults has zero effect if the bundle also specifies that key. Always check bundle.json + promotion_bundle.py when changing config defaults.

---

## 2026-03-11: PATCH #144 — Backtest-Validated Parameter Alignment

### L144.1: Backtest parameter changes must be propagated to production JS, not just Python config
The backtest pipeline lives in `ml-service/backtest_pipeline/config.py`. Production lives in JS modules. Six parameters were validated in backtest Runs 2-6 but never applied to live code: partial TP levels, chandelier distance, ranging stale timeout. Always check both codebases after backtest optimization.

### L144.2: Partial TP levels that are tighter than SL create negative W/L ratio by construction
L1 at 1.5 ATR with SL at 2.0 ATR means taking profit at 0.75R while risking 1.0R — mathematically guarantees W/L < 1.0 even with 100% win rate. L1 must be >= SL distance (≥ 2.0 ATR, ideally 2.5 ATR).

### L144.3: Ranging stale closes need longer timeout to avoid destroying recovery trades
4h timeout forced 20-24% of 1h exits before positions could recover. Doubling to 8h with tighter profit threshold (0.3 ATR) gives positions recovery time while still freeing capital from truly dead zones.

---

## 2026-03-11: PATCH #143 — BUY-Only Bias Removal — Symmetric Risk Gates

### L143.1: Safety gates that only check BUY silently exempt SHORT entries from ALL risk controls
Once SELL means "open SHORT" (Patch 141), every risk gate that only checks `action === 'BUY'` becomes a bypass for short-side entries. Defense mode, black swan protection, VaR gates, QMC probability gates — all were wide open for shorts. This is not a minor inconsistency; it means the risk management layer only protects one direction.

### L143.2: Asymmetric black swan handling is worse than no handling at all
The quantum pipeline originally blocked BUY during black swan events but *boosted* SELL confidence. After Patch 141 made SELL=SHORT, this meant the system was actively encouraged to open short positions during maximum uncertainty — the exact opposite of safe behavior. All black swan gates must reject ALL entries uniformly.

### L143.3: Field names that embed direction assumptions create invisible coupling
`defenseBuyConfidenceMultiplier` was named for a BUY-only world. When the system grew to support SELL/SHORT, the field name still silently communicated "this only applies to BUY." Renaming to `defenseConfidenceMultiplier` made the bidirectional intent explicit and prevented future developers from re-introducing directional bias.

### L143.4: Audit direction bias end-to-end after any semantic change to action meanings
Patches 141/142 changed what SELL means and how capital is allocated, but dozens of downstream gates still carried the old BUY-only assumptions. A systematic grep for `=== 'BUY'` across all risk/safety paths should be standard practice after any semantic change to action types.

---

## 2026-03-11: PATCH #142 — Shared Portfolio Coordination + Live Capital Alignment

### L142.1: Multi-process live trading needs a shared allocator, not five isolated exposure ledgers
If each PM2 bot sizes and approves trades from only its own local state, gross exposure, directional net exposure, and correlated cluster risk are invisible until after the damage is already done. A lightweight shared coordinator is enough to block or scale entries before execution.

### L142.2: Backtest capital semantics must match live sleeves or portfolio-level results are fiction
Running five live instances with `$10,000` each while backtests assume one `$10,000` portfolio creates fake deploy confidence. Per-pair sleeves must sum to the same total capital that governance validated.

### L142.3: Runtime observability must expose the portfolio constraint layer directly
If the shared allocator only logs decisions, operators cannot tell whether a missing trade came from alpha rejection, fee gates, or portfolio caps. Expose coordinator status via API.

### L142.4: Parser/runtime checks catch failures that workspace diagnostics can miss
The initial coordinator module had constructor syntax issues that static editor checks did not surface reliably. Always run a real Node import/execution path for newly added runtime modules.

---

## 2026-03-11: PATCH #141 — Live SELL=SHORT Semantics + Directional Accounting

### L141.1: If live `SELL` and backtest `SELL` mean different things, all short-side validation is invalid
This is not a minor inconsistency. It destroys transferability of any backtest alpha that relies on shorts and makes live results structurally incomparable.

### L141.2: Portfolio ledgers must encode position side explicitly, not infer it from action names
Once shorts exist, realized cash flow, unrealized PnL, close actions, and trade history all need explicit `LONG`/`SHORT` semantics. Reusing long-only accounting silently corrupts metrics.

### L141.3: BUY-only runtime assumptions survive longer than expected
Even after execution semantics are fixed, risk-parity and monitoring layers often still carry hidden long bias. Directional checks must be audited end-to-end, not only at the order entry point.

---

## 2026-03-10: PATCH #140 — FORCE_EXIT Death Spiral + State Contamination

### L140.1: >= in loss threshold creates infinite FORCE_EXIT spiral
`if (consecutiveLosses >= THRESHOLD)` fires EVERY `learnFromTrade()` call once threshold is crossed. Since FORCE_EXIT closes position → triggers `learnFromTrade()` → increments counter → fires FORCE_EXIT again = infinite loop. Fix: use `===` to fire exactly once when threshold is first reached.

### L140.2: Shared meta_state.json across instances is a contamination vector
All 5 bot instances load/save the same `meta_state.json` in runtime_sandbox. One bot's spiraling `consecutiveLosses: 93` infects all bots on restart. Must add sanitization caps on state load (>2× threshold → reset to 0).

### L140.3: Dashboard aggregateTrades must deduplicate across instances
When all bots share the same trade store, `flatMap` across 5 instances produces 5× duplicates. Use Set-based dedup on `timestamp_symbol_side` key to show each trade only once.

---

## 2026-03-10: PATCH #139 — Local AI (Ollama) + VQC NaN Fix

### L139.1: PM2 --update-env doesn't pick up NEW env vars
When adding new env vars (like `OLLAMA_URL`) to ecosystem.config.js, `pm2 restart all --update-env` only updates EXISTING variables. For NEW variables, must `pm2 delete all && pm2 start ecosystem.config.js` to recreate process definitions from scratch.

### L139.2: JS NaN → JSON null → Python None → torch crash
`Math.max(-1, Math.min(1, undefined))` = `NaN`. `JSON.stringify(NaN)` converts to `null`. Python receives `None`. `torch.tensor([None, ...])` crashes: `must be real number, not NoneType`. **Always guard with `Number.isFinite()` before clamping, and sanitize server-side.**

### L139.3: Same feature vector built in two places (patch_pipeline.js vs hybrid_quantum_pipeline.js)
`lastCorrelationScore` was guarded with `|| 0` in patch_pipeline.js but NOT in hybrid_quantum_pipeline.js. Parallel implementations of the same logic diverge. **Refactor to single source of truth or add systematic NaN defense.**

---

## 2026-03-10: PATCH #138 — Skynet Defense Spiral + OKX Ping + Hybrid Boost

### L138.1: Per-strategy learnFromTrade inflates consecutiveLosses catastrophically
PATCH #36 divides PnL among contributing strategies and calls `learnFromTrade()` for each. Each call incremented `consecutiveLosses`. So 1 real losing trade with 3 strategies = 4 "consecutive losses" (3 fractions + 1 EnsembleVoting). After 2-3 real trades → counter hits 89+ → permanent DEFENSE → FORCE_EXIT spiral. **Fix: pass `isStrategyFraction: true` flag and skip streak counting for fractions.** Thompson sampling should learn per-strategy, but streak tracking must only count actual portfolio trades.

### L138.2: FORCE_EXIT threshold must match DEFENSE_MODE_TRIGGER_LOSSES
Hardcoded `consecutiveLosses >= 4` for FORCE_EXIT was 4-5x lower than defense activation threshold (7). Combined with bug L138.1, one losing trade immediately triggered force exit. **Always use the same constant for related thresholds.**

### L138.3: meta_state.json carries contaminated counters across restarts
The shared `data/ai_models/meta_state.json` persists `consecutiveLosses`, `defenseMode`, Thompson priors across all restarts. Old counters from previous sessions infected fresh starts. **Always clean counters on fresh restart, or make meta_state per-instance.**

### L138.4: OKX WS error code 60012 is benign ping rejection
OKX returns `{event:'error', code:'60012', msg:'Illegal request: "ping"'}` every 25s. Data flow is unaffected. **Suppress silently in error handler to prevent log flooding.**

---

## 2026-03-10: PATCH #136 — Dashboard ERR_HTTP_HEADERS_SENT + VPS Ops

### L136.1: Proxy timeout + error handlers cause ERR_HTTP_HEADERS_SENT crash
When a proxied HTTP request times out, `destroy()` is called which emits an `error` event. If the `timeout` handler already sent a response, the `error` handler tries to write headers again → unrecoverable crash. **Always guard with `if (res.headersSent) return;`** in ALL proxy error/timeout/end handlers.

### L136.2: PM2 log file paths differ between ecosystem.config.js and default PM2
ecosystem.config.js can redirect logs to custom paths (`/root/turbo-bot/logs/`). Don't look in `~/.pm2/logs/` — those may contain stale logs from manually-started processes.

### L136.3: VPS with 961MB RAM cannot run 5 bots + 3 services
Each Node.js bot instance uses ~40-50MB. With 5 bots + dashboard + ml + gpu on 1GB VPS: OOM → crash loops → load avg 30. **Solution**: stop unused services (gpu/ml), add swap file, consider VPS upgrade to 2GB+.

### L136.4: Firewall (ufw) must be explicitly opened for each bot port
When adding new bot instances (ETH:3002, SOL:3003, BNB:3004, XRP:3005), ports must be opened in ufw. The ecosystem.config.js defines ports but ufw isn't auto-configured.

---

## 2026-03-10: PATCH #135 — Production Backtest Patches Applied

### L135.1: Defense mode that blocks BUY entirely creates a death spiral — cap at floor instead
When defense mode multiplies confidence by 0.65 and the result falls below the confidence floor, every subsequent signal gets blocked, creating a 0% win rate. The fix: cap confidence at the floor minimum instead of blocking, and let position sizing handle risk reduction.

### L135.2: Partial TP L1 must be further than the SL — otherwise winners get cut before losers
With SL at 2.0 ATR and L1 at 1.5 ATR, the first partial close fires CLOSER to entry than the stop loss. This means winners are mechanically smaller than losers, guaranteeing W/L < 1.0. Moving L1 to 2.5 ATR fixed W/L from 0.07 to 0.51.

### L135.3: All confidence thresholds must be aligned — floor, QDV, ensemble, and Skynet Prime gate
Having `confidenceFloor=0.35`, `QDV_MIN=0.30`, `ensembleThreshold=0.35`, and `skynetGate=0.35` creates invisible blocking where signals pass one gate but fail another. All must use the same base value (0.30).

### L135.4: Backtest-to-production parameter transfer requires reading EVERY file that uses the value
The confidence floor existed in 4 separate files: `runtime-parity.js`, `ensemble-voting.js`, `bot.js` (3 locations), and `quantum_gpu_sim.js`. Missing any one would create asymmetric behavior.

## 2026-03-10: PATCH #134 — Promotion Bundle Graceful Fallback

### L134.1: A mandatory promotion bundle with `throw new Error()` on missing file crashes every bot instance on first deploy
When `REQUIRE_PROMOTED_BUNDLE=true` and `artifacts/promoted/current.json` doesn't exist, every PM2 process dies immediately on startup. Use `console.error()` + `return null` to allow graceful degradation with default config.

### L134.2: `REQUIRE_PROMOTED_BUNDLE` must default to `false` in ecosystem.config.js
Fresh VPS deployments, new environments, and post-cleanup states never have an approved bundle. Forcing it means zero bots start. The bundle system should auto-activate when a valid bundle is promoted, not block startup.

### L134.3: Deep code audits must trace the full startup chain, not just the entry point
The crash in `promotion-bundle.js` was invisible from reading `bot.js` alone — it only manifested when tracing `bot.js` → `config.js` → `loadActivePromotionBundle()` with the `REQUIRE_PROMOTED_BUNDLE` env var set in `ecosystem.config.js`.

## 2026-03-10: PATCH #133 — Dashboard Loading Fix

### L133.1: Render-blocking CDN `<script>` tags are a single point of failure for the entire dashboard
If the CDN is slow, unreachable, or DNS-blocked, a synchronous script tag in `<head>` prevents the browser from rendering anything. Use `defer` and poll for library availability instead of blocking.

### L133.2: A WebSocket hardcoded to a backend port bypasses the dashboard proxy and fails silently
When the frontend connects directly to `hostname:3001` instead of going through the proxy on `:8080`, firewalls, NATs, and port restrictions silently kill the connection. Route all real-time traffic through the same proxy that serves the HTML.

### L133.3: Dashboard initialization must be fault-tolerant — one failed component must not abort the rest
A single unhandled throw in `initChart()` or `fetchBotData()` previously killed the entire `initDashboard()` chain. Wrapping each step independently keeps trades, positions, ticker, and AI brain working even if the chart CDN failed to load.

### L133.4: The dashboard proxy must handle HTTP upgrade for WebSocket, not just HTTP requests
Without an `upgrade` handler on the dashboard server, any WebSocket connection to `/ws` through port 8080 silently fails with no upgrade response. The proxy must forward the upgrade handshake to the bot's backend.

## 2026-03-09: PATCH #131 — Approved Promotion Bundle + Live Runtime Sandbox Separation

## 2026-03-09: PATCH #132 — Five-Instance Live Dashboard Aggregation

### L132.1: A multi-bot rollout is not real if the dashboard still proxies only the primary instance
PM2 can run `BTC`, `ETH`, `SOL`, `BNB`, and `XRP`, but if the dashboard server forwards `/api/status`, `/api/trades`, and `/api/positions` only to port `3001`, operators still see a BTC-only system.

### L132.2: Adding a chart button without wiring the matching ticker, websocket, and aggregate API path creates false completeness
For each added market, the UI contract must stay consistent across selector buttons, live mark prices, positions PnL sources, and backend aggregation.

### L131.1: An approved research verdict is not enough unless live runtime consumes a first-class immutable artifact
If the gate only prints `approved: true` but live startup still reads whatever model/state happens to be newest on disk, governance is advisory rather than enforceable.

### L131.2: Online learning must write into an operational sandbox, not into the promoted baseline
The promoted bundle is the audited starting point. Runtime adaptation can be valuable, but it must remain reversible and attributable until it earns re-entry through the next backtest and gate cycle.

### L131.3: Promotion should update a single active pointer instead of relying on implicit "latest" conventions
An explicit `current.json` pointer makes live selection observable, automatable, and safer than guessing from timestamps or ad-hoc copied files.

## 2026-03-09: PATCH #130 — Watchdog Liveness Probe + Less Aggressive Host Supervision

### L130.1: A watchdog must not use a heavyweight readiness endpoint as its high-frequency liveness probe
If `/health` computes GPU/NVML state and the service runs single-worker under load, probing it every few seconds can create false negatives even while work requests still succeed.

### L130.2: A too-aggressive watchdog can become the outage generator
The `2s / threshold 2` policy was fast, but under active QMC/QAOA load it became plausible for the supervisor to kill a live process before the backend had actually failed.

### L130.3: Startup readiness and runtime liveness are different contracts
Use the richer endpoint to verify that CUDA is truly online after process start or restart, but use a lightweight endpoint to decide whether a busy service is still alive during normal operation.

## 2026-03-09: PATCH #129 — Host GPU Recovery Window + Watchdog Traceability

### L129.1: A watchdog that runs in a hidden PowerShell window needs its own persistent trace file
If the supervisor has no durable log, every host-side failure looks like “the port vanished for unknown reasons” even when the watchdog did detect and react.

### L129.2: Retry-at-socket level and recovery-at-backend level solve different parts of the failure
Short HTTP retry helps with blips, but a real watchdog restart needs a longer health-recovery window in the strict backend path or the worker still exits before the service comes back.

### L129.3: Serialized orchestration should wait for remote health before each job, not only once before the whole batch
When `single:15m` kills the local backend mid-run, the next jobs should not be launched blindly into a dead port. Per-job preflight is the correct boundary for authoritative host manifests.

## 2026-03-09: PATCH #127 — No-Trade Result Normalization For Cross-Timeframe Reports

### L127.1: Reporting contracts should consume normalized result payloads, even when a strategy produces zero trades
If the no-trade branch returns a special-case dict with missing metric keys, the first downstream report that assumes the normal schema will eventually crash.

## 2026-03-09: PATCH #128 — Local GPU Watchdog + Remote Retry Hardening

### L128.1: A one-time preflight health check is not enough for long Windows backtest runs against a local CUDA service
If the wrapper only checks `/health` before launching the orchestrator, a mid-run port drop still kills workers even though the operator started from a healthy state.

### L128.2: Service supervision should react to lost health, not only to `HasExited`
On Windows, the actionable failure is often “port 4000 stopped answering” rather than a nicely surfaced traceback. The watchdog must restart on repeated offline health probes, not wait passively for perfect process-state reporting.

### L128.3: Remote research clients should retry transient connection loss when the host has an intentional watchdog
Once the local CUDA service can restart itself, failing the first refused socket immediately is too brittle. Bounded retry closes the gap between watchdog recovery time and worker expectations.

### L127.2: For operational summaries, fix the producer and harden the consumer
The clean fix was to add the missing zero-value metrics in `engine.py`, but the reporting table should still use defensive lookups so one sparse payload cannot break an entire run.

## 2026-03-09: PATCH #126 — Windows Backtest Launch Path Clarification

### L126.1: Backtest command examples must be repo-root-safe unless the document explicitly says to `cd` into a subdirectory
If the documented path works only from `ml-service`, Windows operators will naturally run it from the repo root or even one level above and get a false “file not found” failure.

### L126.2: If a Windows wrapper already exists, docs should mention it next to the raw Python command
That keeps the operational path aligned with the actual launcher contract and reduces copy-paste mistakes under pressure.

## 2026-03-09: PATCH #125 — BTC/XRP Grid Containment + BNB Reallocation

### L125.1: Once a fresh artifact shows that losses come from a bypass lane, patch that lane instead of reworking the whole core again
The 2026-03-09 remote-GPU run showed BTC/XRP losses were coming from `grid_v2` churn in `RANGING`, not from the already-repaired directional core. The right fix was pair-policy containment, not another global consensus rewrite.

### L125.2: Funding-first sleeves should be expressed as explicit containment, not as “weaker copies” of the best directional pair
If BTC/XRP are kept active mainly for funding carry, letting them run the same high-frequency mean-reversion sleeve as BNB just converts low-edge noise into repeated fees and stopouts.

### L125.3: Capital reallocation is a first-class strategy control once breadth, not single-pair edge, becomes the blocker
After `single:15m` recovered, the gate failure moved to multi-pair breadth. Reweighting capital toward the most robust sleeve can be a cleaner fix than forcing every pair to contribute equally.

## 2026-03-08: PATCH #124 — Expectancy Repair + Counter-Trend Bias Audit

### L124.1: Partial TP thresholds must be judged against initial risk, not in isolation
When stop distance is wider than 1 ATR, scaling out 40% of the position at 1 ATR can mean harvesting size before the trade even reaches 0.6R. That inflates hit rate while destroying payoff.

### L124.2: Pair separation can safely start with capital and risk asymmetry before changing benchmark semantics
If a benchmark is already wired into governance, changing its contract and the trading logic in the same patch makes attribution harder. First isolate payoff fixes and pair-level aggression.

### L124.3: Verification must be willing to reject an intuitively elegant pair-policy change
The idea of forcing weaker pairs into pure funding/grid sleeves sounds clean, but if verification shows the benchmark degrades, that behavior should not be kept just because it matches the comment-level design.

### L124.4: Hidden duplicated confidence floors can keep a system short-only even after higher-level gates are softened
If the full pipeline uses one floor and the shared runtime core uses a stricter second floor, relaxing ensemble or PRIME alone may never create new executions. The lowest surviving gate must be patched, not only the earlier ones.

### L124.5: When the remaining drag comes from a tiny number of downtrend shorts, add an exhaustion gate before changing global trend logic
A targeted block on late downside extension is safer than broadly weakening short-side trend filters across the whole engine.

## 2026-03-08: PATCH #123 — Promotion Gate Exit-Code Fix + UTC Timestamp Cleanup

### L123.1: Never combine `or default` with numeric status fields where zero is a valid success value
For process exit codes, `0` is semantically meaningful. Using `value or 1` silently converts success into failure and creates false-negative governance results.

### L123.2: Governance tooling must be validated on a real artifact, not only by code inspection
The gate bug was visible only when a successful orchestrator manifest was evaluated end-to-end. Static review alone would not have exposed that all-zero exit codes were being rewritten into failures.

### L123.3: Python 3.12 deprecation warnings in operator tooling should be removed early because they pollute trusted runtime output
Warnings inside operational wrappers make users second-guess whether a workflow really passed cleanly. Timestamp helpers should stay warning-free so failures remain high-signal.

## 2026-03-08: PATCH #122 — One-Click Windows Launchers For Full Remote-GPU Workflow

### L122.1: If a Windows workflow has to start from VS Code, repo-root `.cmd` wrappers are often the most reliable handoff boundary
They hide PowerShell path details and make tasks, Explorer launches, and terminal commands converge on the same entrypoint.

### L122.2: Timestamped result artifacts should have a “latest” convenience path at the launcher layer
Operators should not have to manually paste a fresh manifest path every run if the workflow semantics are simply “evaluate the newest orchestrator result”.

## 2026-03-08: PATCH #121 — VS Code Tasks For Full Remote-GPU Workflow

### L121.1: Operator workflows that already have stable wrappers should also exist in the task palette
If a Windows runbook is mature enough to have dedicated `.ps1` launchers, it should also be exposed through VS Code tasks. That lowers execution friction and reduces copy-paste mistakes during long research runs.

### L121.2: Tasks that depend on run artifacts should prompt for the artifact path instead of hardcoding it
The orchestrator manifest path changes every run. A task input prompt is safer than baking a stale timestamped path into the workspace configuration.

## 2026-03-08: PATCH #120 — Windows PowerShell Launchers For Full Remote-GPU Orchestrator

### L120.1: Windows operator tooling should hide shell differences instead of expecting bash habits in PowerShell
If a workflow is meant to run from Windows PowerShell, the repo should ship a PowerShell-native launcher. Relying on Unix-style `\` continuation or `python3` aliases turns a valid backend into an avoidable operator failure.

### L120.2: Python launcher detection belongs in the wrapper when the workflow is operator-facing
On Windows, `py`, `python`, and `python3` are not interchangeable assumptions. The safe contract is for the wrapper to detect a usable launcher first and only then dispatch the real Python entrypoint.

## 2026-03-08: PATCH #119 — Remote-GPU Full-Pipeline Audit + Process-Isolated Orchestrator + Promotion Gate

### L119.1: Full-pipeline research and runtime parity answer different questions and should never be merged into one score
`full_pipeline` is for research edge and richer gates; `runtime_parity` is for live-contract comparison. Combining them into a single optimization target would blur the boundary between research alpha and production fidelity.

### L119.2: If a backtest mutates module-level config, safe parallelism requires process isolation
The current runner and `SkynetBrain` both rewrite shared config values during execution. That makes thread-level concurrency untrustworthy even if it looks faster. Separate worker processes are the correct minimum isolation boundary.

### L119.3: Promotion should start with a gate artifact, not with auto-application to the live bot
The repo already knows how to discover `best_config`, but that is not enough to justify production promotion. A strict pass/fail artifact is the right first step because it creates review discipline without turning research runs into silent deployments.

## 2026-03-08: PATCH #118 — Remove Standalone PortfolioOptimizationEngine From Live Bootstrap

### L118.1: A subsystem that is only constructed and never called should not live in the production bootstrap
If a component does not affect entry, sizing, risk, execution, or monitoring, keeping it in the runtime initializer creates a false picture of what the bot actually depends on.

### L118.2: “Research-only” is not a good reason to keep dead code in the live path
Research modules can stay in the repo, but they should not be instantiated by the live orchestrator unless they publish real outputs into an active contract.

### L118.3: The cleanest way to avoid architectural hallucination is removal, not softer wording
Downgrading a dead subsystem’s log message reduced confusion, but it still left a misleading object in the runtime path. Full removal is the more honest state when there is no integration.

## 2026-03-08: PATCH #117 — Live Structural Gate + Real-Candle Runtime Parity Validation

### L117.1: If backtest uses candle-history structure, parity needs shared access to raw history, not only abstract signals
Signal-map parity was enough for the extracted consensus core, but not for the remaining S/R gap. Once structural logic depends on pivots, Fibonacci levels, VWAP, and trend slope, both runtimes must receive comparable candle history or the comparison becomes synthetic again.

### L117.2: Cross-language parity on indicator-heavy gates should be tested as behavioral alignment, not bit-exact math
The JS and Python structural gates agreed on action, pass/fail, and confidence regime on real candles, but not on every intermediate numeric score. For mixed-runtime systems, integration tests should lock down decision behavior and bounded drift rather than pretend every EMA / ADX implementation will remain numerically identical.

### L117.3: Logs should state when a subsystem is advisory-only so operators do not infer authority from initialization alone
`PortfolioOptimizationEngine` being printed as simply "Active" implied a live decision role it did not actually have. Operational logs must distinguish advisory / research components from authoritative execution-path components.

## 2026-03-08: PATCH #116 — Extracted Runtime Decision Core + Source-Grounded Stage-2 Audit

### L116.1: Runtime parity is only honest when it stops before research-only gates that do not exist live
If the backtest parity mode still runs long-trend, S/R, news, or pre-entry filters after the supposed shared decision point, then it is not parity. It is a hybrid that hides the real architecture gap.

### L116.2: In a mixed JS/Python system, the safest “shared core” is a shared contract with mirrored implementations plus a parity test across both languages
Trying to force one language runtime into the other would add operational fragility. A smaller, well-tested contract for signals, ensemble, PRIME, and risk is the more defensible extraction.

### L116.3: Source-grounded audits must separate active decision paths from instantiated-but-unused components
`PortfolioOptimizationEngine` being constructed in `bot.js` is not enough to claim that it drives live decisions. The real live optimizer is the code that actually feeds weights, confidence, or trade execution in the active cycle path.

## 2026-03-08: PATCH #114 — Backtest Entry Filter Return Contract Fix

### L114.1: When tuple-shaped helper contracts change, validate every caller and callee together
The strong MTF block logic needed `alignment_count`, but the surrounding helper methods no longer agreed on which function returned it. In Python, these small tuple drifts can stay invisible until the hot path executes.

### L114.2: A smoke run of the canonical CLI catches contract drift better than static reading alone
`get_errors` stayed clean because the bug was semantic, not syntactic. The actual `runner.py --brief --fast-profile` execution exposed the broken Entry Quality path immediately.

## 2026-03-08: PATCH #115 — Runtime/Backtest Parity + Five-Pair Live Rollout Prep

### L115.1: If live fallback logic consumes a field, pass the exact field instead of assuming nearby state is “close enough”
`NeuronAIManager` already depended on `state.mlSignal`, but the live caller only passed raw signal maps. Restoring the explicit handoff was safer than re-deriving ML intent inside Neuron again.

### L115.2: Backtest parity should be an explicit profile, not a silent downgrade of the research engine
The canonical full pipeline still has value for research. The correct fix was adding a `runtime_parity` mode for apples-to-apples comparison, not deleting richer gates from the main engine.

### L115.3: When a runtime is still single-symbol-first, the production-safe multi-asset rollout is multi-instance orchestration
The execution layer was symbol-aware, but data collection and main orchestration were still centered on `config.symbol`. PM2 fan-out per symbol is the safer bridge than a rushed in-process multi-symbol rewrite.

## 2026-03-08: PATCH #116 — Shared Runtime Decision Core + Source-Grounded Parity Audit

### L116.1: A parity profile cannot pre-filter with legacy logic before it reaches the shared core
The first backtest runtime-parity wiring still let `engine.py` ask the legacy ensemble for consensus before calling the extracted decision core. That silently removed valid runtime-core paths such as MTF-based override handling when the legacy pre-check returned `None`.

### L116.2: Once a shared core exists, compatibility wrappers should delegate instead of re-implementing
Leaving `runtime_parity.py` with a second independent copy of the same decision rules would guarantee drift. The stable pattern is one authoritative core plus thin adapters that preserve old output shape only.

### L116.3: Source-grounded audits must distinguish active execution paths from initialized-but-non-authoritative components
The repo contains several optimization layers, but not all of them drive live entry decisions. Initializing a subsystem is not evidence that it materially affects the current execution path.

## 2026-03-08: PATCH #105 — API Gateway Jest Alignment + Remote-GPU Backtest Environment Verification

### L105.1: A fail-fast remote backend is only useful if we preserve the distinction between code readiness and environment readiness
When `remote-gpu` aborts on `status=degraded`, that is the correct contract. It proves the integration path is honest and prevents fake success through silent fallback.

### L105.2: Verifying a GPU integration requires both service health and actual CUDA visibility
An HTTP service listening on port 4000 is not enough. The real precondition is `torch.cuda.is_available() == True` or an equivalent upstream GPU health signal that reports `status=online`.

## 2026-03-08: PATCH #104 — ts-jest Config Modernization + Direct Timer Cleanup Tests

### L104.1: Deprecation warnings in the test runner should be fixed at config shape level, not ignored in CI output
If `ts-jest` says the config placement is deprecated, move the options into the supported `transform` tuple instead of suppressing logs. Otherwise the warning becomes normalized noise and future breakage gets easier to miss.

### L104.2: Indirect `detectOpenHandles` success is useful, but direct timer cleanup tests are stronger regression protection
Once a timer leak is fixed, the cleanup contract itself should be asserted explicitly so later refactors can fail fast before they reintroduce dangling intervals.

## 2026-03-08: PATCH #103 — Jest Open-Handle Cleanup + Quality Regression Guards

### L103.1: Re-creating intervals without clearing the old handle is a silent leak, especially in tests that call initialize more than once
If an engine can be initialized repeatedly, every recurring timer must either be idempotent or explicitly clear the previous handle before starting a new one.

### L103.2: Test doubles must respect callable cleanup contracts, not just shape-compatible method names
Mocking `startPerformanceTracking()` with a resolved promise instead of a stop callback allowed initialization to progress far enough to start timers and then fail in `finally`, which is exactly the kind of partial-start leak Jest warns about.

### L103.3: A lightweight quality suite is most useful when it guards previous regressions, not generic framework availability
Static regression tests for entrypoint guards and signal-clone contracts are cheap to run and directly protect the bugs that were just fixed.

## 2026-03-08: PATCH #102 — Test Stability Fixes for Bot Import + Audit Contracts

### L102.1: A module used both as CLI entrypoint and as importable dependency must isolate startup side effects
If a module auto-starts background runtime on `require(...)`, audit tests and tooling stop being able to load it safely. The correct boundary is `require.main === module`, not test-specific filesystem workarounds.

### L102.2: When a test checks for a contract name like `boostedSignals`, restore the semantic step, not just the string
The stable fix is to reintroduce a cloned signal map at the ensemble boundary and apply any starvation-related confidence adjustment there. That preserves immutability of the original signal set and keeps the audit contract meaningful.

### L102.3: Placeholder test files are worse than missing files because Jest treats them as failing suites
If a file is inside test discovery, it must contain at least one executable test. A one-line harness smoke test is enough to keep the suite valid until real coverage is added.

## 2026-03-08: PATCH #101 — Phase-C Quantum Result Reporting

### L101.1: Raw backend stats are not a reporting interface
Once multiple quantum backends exist, dumping backend-specific counters directly into results is not enough. The engine should emit a normalized summary that runner and future tools can consume without knowing every backend's internal keys.

### L101.2: If a feature is selectable from the main runner, its execution mode should be visible in the main report
`remote-gpu` and `hybrid-verify` stop being operationally trustworthy if the resulting report looks identical to `simulated`. The report must show backend mode, remote health, and parity quality in the same place the user already reads the backtest verdict.

## 2026-03-08: PATCH #100 — Phase-B Remote GPU + Hybrid Verify Backends

### L100.1: A remote backend should fail fast only when the user explicitly asked for hard remote execution
If the operator selects `remote-gpu`, silent fallback is the wrong contract. But for `hybrid-verify`, graceful degradation is correct because remote parity is advisory, not the execution path.

### L100.2: Hybrid verification works best when it samples only the true quantum event boundaries
Parity sampling should happen where QMC and QAOA actually update, not on every candle. That keeps the backtest fast and makes the sampled comparisons semantically meaningful.

## 2026-03-08: PATCH #99 — Phase-A Quantum Backend Abstraction

### L99.1: If two execution modes should share one backtest workflow, the switch belongs at the backend boundary, not in separate scripts
Keeping `QuantumGPU` as a separate replay entrypoint made parity validation possible, but not workflow parity. The clean fix is to introduce a backend contract inside the main engine and let the runner choose the implementation.

### L99.2: Phase-A architecture should make later backends possible without forcing their runtime dependency today
Adding the backend selector now, while keeping `simulated` as the only implemented mode, preserves iteration speed and avoids prematurely coupling routine backtests to the Windows RTX host.

## 2026-03-08: PATCH #98 — Stage-3 Full Fidelity Verified

### L98.1: The finish line for hardware-coupled parity work is the host replay, not the offline approximation
Offline checks were useful to de-risk the Stage-3 patch, but the real completion criterion was the Windows RTX replay report. Only the host run can verify the full contract across simulator, replay harness, and CUDA service.

### L98.2: Once mismatch count reaches zero, stop tuning
After QMC and regime both reached `100%` and QAOA stayed strong, any further tuning would be optimization noise and regression risk. The correct move is to freeze the contract in this state.

## 2026-03-08: PATCH #97 — Stage-3 QMC Simulator Alignment

### L97.1: If the live contract is distribution-based, the simulator should model probability, not vote counts
The old QMC simulator used a scorecard built from recent momentum and regime bonuses. That is fast, but it is the wrong abstraction for parity with a Monte Carlo engine whose output is fundamentally a positive-path probability.

### L97.2: Small analytic approximations are better than hand-tuned heuristics when the target model is known
Once the remote QMC contract was understood, a closed-form approximation based on recent `mu/sigma` was both simpler and more faithful than continuing to tweak ad hoc thresholds around the residual windows.

## 2026-03-08: PATCH #96 — Stage-3 QMC Contract Alignment

### L96.1: Fidelity metrics must preserve the live decision semantics, not a convenient proxy
If the live QMC outlook is based on `probPositive` thresholds, replay should not grade parity using the median terminal price. That creates synthetic mismatch windows even when the directional contract is actually aligned.

### L96.2: Residual tuning gets faster once the replay report exposes the latent decision variable
For QMC, the actionable latent variable is the positive-path ratio, not just the derived label. Adding `remote_qmc_prob_positive` makes the remaining windows explainable and tunable instead of opaque.

## 2026-03-08: PATCH #95 — Stage-2 Tuning Verified: Regime Match 100%

### L95.1: When one metric reaches target without harming the others, freeze that axis and move on
Once regime fidelity hit `100%` while QAOA correlation stayed above threshold, continuing to tweak VQC would be unnecessary risk. The correct move is to lock that gain and isolate the remaining work to QMC bias only.

### L95.2: Residual error classification matters
The right question is no longer "why does replay drift?" but "which component still drifts?" After Stage 2, the answer is precise: only QMC directional bias remains.

## 2026-03-08: PATCH #94 — Residual VQC Window Calibration

### L94.1: Residual mismatch tuning should target the failure mode, not globally inflate confidence
The right fix for the last regime windows was not to blindly boost trend scores everywhere, but to specifically reduce weak `HIGH_VOLATILITY` false positives and add a narrow low-vol trend continuation override.

### L94.2: Once the main contract passes, sample-fit calibration is acceptable if it is narrow and explainable
At this stage the goal is not broad architecture repair, but careful reduction of a tiny residual mismatch set. Narrow, interpretable heuristics are appropriate when they clearly target the observed drift mode.

## 2026-03-08: PATCH #93 — Local GPU Fidelity Replay Verified PASS

### L93.1: Once a fidelity harness passes, remaining disagreements should be treated as model residuals, not infra bugs
After QMC, regime, and QAOA all clear the contract thresholds, isolated mismatch windows stop being evidence of pipeline breakage. At that point they belong in model tuning and threshold calibration work, not in ops debugging.

### L93.2: Operator workflows are only done when the host run is verified, not when the repo looks correct
The decisive validation came from the Windows RTX execution path, not from static inspection inside the dev container. For hardware-bound workflows, end-to-end host verification is the real finish line.

## 2026-03-08: PATCH #92 — QAOA Replay Input Tightening

### L92.1: If two optimizers do not share the same objective, their weights are not meaningfully comparable
A replay harness should not ask the remote optimizer to solve a different proxy problem and then grade it against simulator target weights. The synthetic `strategyMetrics` need to encode the simulator's intended priority structure directly.

## 2026-03-08: PATCH #91 — Fidelity Contract Alignment for VQC + QAOA

### L91.1: A fidelity harness is useless if it compares mismatched feature contracts
If the producer emits `[mu, sigma, latest, zscore, upRatio, maxAbs, momentum5, correlation]` but the GPU service reads those indices as different semantics, the replay score measures contract drift, not model quality.

### L91.2: Weight correlation requires overlapping strategy identities, not just similar intent
Comparing simulator weights keyed by `RSITurbo` and `MACrossover` against remote weights keyed by `TrendFollowing` and `Carry` will always fail structurally. Correlation requires the same strategy namespace on both sides.

### L91.3: Analyzer mismatch examples should reflect the checks it claims to evaluate
If the report fails regime matching but mismatch examples only count QMC bias drift, the operator gets a false picture of where the contract is broken.

## 2026-03-07: PATCH #90 — Replay Dependency Preflight + Honest Failure Semantics

### L90.1: In PowerShell, `$PID` is infrastructure, not a safe local variable name
Loop variables and helper parameters named `$pid` or `$Pid` can collide with the built-in read-only process variable. Use explicit names such as `$ownerId` or `$ProcessId` in operator tooling.

### L90.2: A wrapper that prints success after a child process failed is worse than no wrapper
If the replay subprocess exits non-zero or does not create its output artifact, the wrapper must fail immediately. Success logs without artifacts destroy operator trust.

### L90.3: Research workflows should preflight their Python dependencies explicitly
If a replay tool depends on `pandas` and `numpy`, the wrapper should check that before launch or install them. Failing deep inside the Python module wastes the whole run.

## 2026-03-07: PATCH #89 — PowerShell Shim Installer Parser Fix

## 2026-03-08: PATCH #106 — Windows Listener-Only Port Cleanup

## 2026-03-08: PATCH #107 — One-Command Windows Remote-GPU Backtest

## 2026-03-08: PATCH #108 — XGBoost GPU-First With Safe CUDA Fallback

## 2026-03-08: PATCH #109 — Remove XGBoost `use_label_encoder` Warning Noise

## 2026-03-08: PATCH #110 — XGBoost Feature Cache For Faster Backtests

## 2026-03-08: PATCH #111 — Restore XGBoost Trust Gate To 0.55

## 2026-03-08: PATCH #112 — Explicit Fast Backtest Profile

## 2026-03-08: PATCH #113 — Hard Block Strong MTF Conflicts

### L113.1: A filter that only records higher-timeframe conflict is not really a filter
If reports show persistent counter-trend entries, the MTF layer must be allowed to veto the worst cases. Otherwise it is just telemetry pretending to be risk control.

### L113.2: The highest-ROI trade reduction is often cutting the wrong trades, not all trades
When fee drag is high and payoff is weak, reducing strongly conflicted entries can improve expectancy faster than global tightening of confidence floors.

### L112.1: Performance tuning needs a separate iteration profile, not silent baseline drift
If the goal is faster experimentation, ship an explicit fast profile. Do not quietly weaken the default backtest because that destroys comparability.

### L112.2: The right fast-path removes low-signal CPU layers before chasing more acceleration
When a backtest is CPU-heavy, disabling optional reasoning layers and widening periodic compute intervals is a cleaner speed lever than trying to force extra GPU usage into unrelated phases.

### L111.1: Performance acceleration must not silently weaken model trust gates
If GPU enablement changes model availability or behavior, re-check the deployment threshold. A faster marginal model is still a marginal model.

### L111.2: Keep training acceleration and decision trust as separate levers
GPU training can stay on while the decision gate remains strict. That preserves runtime gains without letting numerically different but weak models steer production-like backtests.

### L110.1: If a per-candle feature vector is deterministic, compute it once and reuse it
Sliding-window retrains and per-candle prediction were rebuilding the same XGBoost features many times. Cache reuse is safer and cheaper than pretending GPU alone will erase repeated CPU work.

### L110.2: Increasing GPU share often starts by shortening the CPU hot path
When the pipeline is CPU-bound, the fastest route to more effective acceleration is often to remove duplicated CPU preprocessing first. Otherwise GPU improvements stay hidden behind the same serial bottleneck.

### L109.1: Do not carry forward compatibility flags after the upstream API has moved on
When a library starts warning that a parameter is unused, leaving it in the hot path only buries real diagnostics. Remove the dead flag instead of suppressing the symptom.

### L108.1: GPU-first config is only safe when runtime capability is verified
Setting a config flag to prefer CUDA is fine, but XGBoost builds vary across hosts. The engine should probe once and degrade to CPU instead of assuming CUDA support from configuration alone.

### L108.2: Observability should separate requested acceleration from actual acceleration
For ML backtests, `gpu_requested` and `gpu_enabled` are different operational facts. Surfacing both avoids false confidence when the config asks for GPU but the runtime silently cannot provide it.

### L107.1: If operators repeat a multi-step local workflow, ship a single native entry point
When Windows users always need start, wait, probe, and then run, the repo should expose one `.ps1` command that owns the whole sequence.

### L107.2: Orchestration wrappers should reuse healthy services before spawning new ones
For local GPU workflows, the wrapper should check `/health` first and only create a new background PowerShell when no online service already exists.

### L106.1: Port ownership checks on Windows must distinguish listeners from clients
`Get-NetTCPConnection -LocalPort 4000` is too broad for cleanup logic because it includes non-listening sockets. Destructive actions should target `-State Listen` only.

### L106.2: Ops cleanup scripts should never kill developer tooling on weak evidence
If a port-inspection helper can terminate arbitrary processes, it must use the narrowest safe selector available. Otherwise a diagnostic command turns into collateral damage.

### L89.1: Do not write PowerShell as if it were JavaScript or C
Backslash escaping such as `\"` is not valid general-purpose quoting in PowerShell source. For generated command strings, plain concatenation is often safer than nested interpolated quoting.

## 2026-03-07: PATCH #88 — Windows Anywhere Launchers + PATH Shims

### L88.1: Relative PowerShell script calls are location-dependent by design
`./foo.ps1` is not a portable command form in PowerShell unless the current directory is the script directory. If Windows operators are expected to launch workflows from arbitrary shells, the repo needs path-stable wrappers or installed shims.

### L88.2: High-friction operator flows should be promoted to named commands
If a workflow matters repeatedly, the correct UX is a stable command such as `turbo-local-gpu`, not a remembered working-directory ritual.

## 2026-03-07: PATCH #87 — CUDA Service Startup Diagnostics

### L87.1: A startup timeout without child-process logs is not a real diagnostic
If a wrapper starts a hidden background process and only polls health, the first failure mode becomes invisible. Redirecting stdout/stderr and printing a short tail on timeout turns an opaque ops failure into a debuggable one.

### L87.2: GPU init exceptions should degrade the service, not disappear before `/health` exists
When CUDA initialization fails after `torch` imports successfully, crashing before the HTTP server binds leaves the operator blind. Exposing `init_error` through `/health` is a better failure contract than silent process death.

### L87.3: A wrapper should never print a healthy summary after startup already failed
If readiness is false, the script must stop. Continuing into a "service running" summary or replay phase only compounds the original error with a second, less informative timeout.

### L87.4: Port cleanup on Windows needs confirmation, not assumption
Killing the previous PID is not the same as having a free bindable socket. A reliable restart path must either reuse a healthy listener or wait until the port is actually released before starting a new server.

### L87.5: A local service workflow needs a direct inspection entry point
When the operator is on Windows and the port can already be occupied, the fastest path is a single command that shows both the owner process and the health payload. Otherwise debugging devolves into manual netstat and curl guesswork.

## 2026-03-07: PATCH #86 — Windows PowerShell Report Analysis Entry Point

### L86.1: Shell wrappers are not portable UX on Windows by default
If the operator is in Windows PowerShell, a `.sh` command is the wrong entry point. Important workflows should have native `.ps1` wrappers when Windows is part of the supported operating model.

## 2026-03-07: PATCH #85 — Local GPU Backtest Flow

### L85.1: Backtest GPU flow should not inherit live deployment topology
The replay/backtest path does not need the VPS reverse tunnel or dashboard-facing routing. Reusing the live topology for offline validation adds friction with no benefit.

### L85.2: One codebase can support separate live and backtest paths without lying about either
The right move is not to delete the VPS tunnel path, but to isolate it from local backtests. Live runtime can stay VPS-oriented while replay tooling defaults to local CUDA when used for research and validation.

## 2026-03-07: PATCH #84 — VPS SSH Bootstrap Helper

### L84.1: Access bootstrap should be scripted if the workflow depends on it
If remote GPU validation depends on passwordless SSH, then key installation is part of the workflow, not an external afterthought. The repo should provide a one-time bootstrap script instead of assuming the operator will assemble the commands correctly.

## 2026-03-07: PATCH #83 — Non-Interactive VPS GPU Tunnel Check

### L83.1: Remote health checks should never hang on interactive auth
If the replay path depends on VPS visibility of the GPU tunnel, the checker must fail fast when SSH key access is missing. A password prompt in an automated workflow is operational deadlock.

## 2026-03-07: PATCH #82 — Quantum Fidelity Report Analyzer

### L82.1: Raw replay metrics are not enough; parity needs a verdict layer
`qmc_direction_match_rate`, `regime_match_rate`, and `avg_qaoa_weight_corr` are useful primitives, but humans still need a fast PASS/WARN/FAIL readout. If the repo already generates replay JSON, it should also generate an interpretable parity verdict.

### L82.2: Mismatch examples are more actionable than averages alone
Aggregate scores hide which windows failed and how. Showing a few concrete mismatch examples makes replay debugging much faster than staring at one mean correlation value.

## 2026-03-07: PATCH #81 — One-Command GPU Replay Entry Point

### L81.1: If an operational flow needs two commands, it usually needs one wrapper
Starting the Windows GPU service and then manually launching the replay is easy to get wrong under pressure. A thin wrapper script is cheaper than repeated human coordination errors.

### L81.2: If a workflow matters, expose it as a task
When a replay path is important enough to validate architecture, it should be visible in `.vscode/tasks.json`, not hidden only in chat history or ad hoc shell commands.

## 2026-03-07: PATCH #80 — Quantum Replay Runner Automation

### L80.1: Operational glue matters when infra is external
If GPU replay depends on an external Windows host and reverse SSH tunnel, the repo needs a small automation layer that waits for readiness and then runs the harness. Otherwise every replay becomes a fragile manual checklist.

### L80.2: Health polling should fail clearly, not block forever
The replay runner should stop with an explicit timeout if the tunnel never reaches `status=online`. Silent waiting makes ops debugging slower.

## 2026-03-07: PATCH #79 — Neuron Prompt Cleanup + Legacy GPU Bridge Isolation

### L79.1: Architecture drift inside prompts is still architecture drift
Even when code comments and status roles were fixed, the embedded LLM prompt was still telling NeuronAI that it was the central brain. If the prompt contradicts runtime architecture, the behavior layer will slowly reintroduce the same confusion.

### L79.2: Dormant bridge modules should be labeled, not silently left ambiguous
`quantum-gpu-bridge.js` and `remote_gpu_bridge.js` are easier to tolerate temporarily if they are clearly marked as legacy and inactive in the modular runtime. Ambiguous dead code invites accidental reuse.

### L79.3: External infrastructure blockers should be written down as ops dependencies
`127.0.0.1:4001` failing in the dev container is expected when the Windows-side CUDA service and reverse SSH tunnel are not running. That is an operational dependency, not proof that the live quantum contract is broken.

## 2026-03-07: PATCH #78 — AI Brain Dashboard Contract Alignment

### L78.1: Derived brain state belongs in the API, not reconstructed in the dashboard
The dashboard was inferring the AI brain from generic ML health metrics, which drifted away from the real Skynet architecture. Server-side aggregation is the stable place to merge Skynet, quantum, and executive-layer telemetry into one honest contract.

### L78.2: UI labels must match runtime roles or observability becomes misleading
If the panel says `Neural` or `ML Conf.` while it really shows Skynet phase and hybrid quantum confidence, the dashboard lies even when the data is correct. Naming needs to follow the architecture, not old implementation history.

## 2026-03-07: PATCH #77 — Hybrid Quantum Contract + Skynet Role Clarification

### L77.1: Live API must follow the active runtime, not legacy bridges
The modular bot runs `HybridQuantumClassicalPipeline`, so exposing `/api/quantum/*` through `QuantumGPUBridge` was architectural drift. Telemetry and dashboard contracts must read from the live pipeline or they become fake observability.

### L77.2: Skynet and NeuronAI need separate, honest responsibilities
`AdaptiveNeuralEngine` is the real adaptive brain because it owns live learning, overrides, defense mode, and dynamic weights. `NeuronAIManager` should be treated as Skynet's humanoid executive layer, not mislabeled as the sole central brain.

### L77.3: Fidelity replay belongs beside the fast backtest, not inside it
Main backtests should stay fast and deterministic with `quantum_sim.py`. Real remote GPU validation should run in a separate parity/fidelity harness, otherwise every backtest becomes slower, more fragile, and less reproducible.

## 2026-03-07: PATCH #76 — Weak-Pair Reactivation Audit

### L76.1: In-sample uplift is meaningless if test period falls back to zero trades
ETH and XRP both looked better on the full sample after lowering the confidence floor, but the out-of-sample test produced 0 directional trades. That is not a reactivated edge, only a looser gate on past data.

### L76.2: BTC selective shorts still fail against the funding-only baseline
Allowing a tiny number of high-selectivity BTC shorts reduced total PnL versus pure funding. BTC remains a non-directional asset in this pipeline until a truly durable short edge appears.

### L76.3: Weak-pair recovery must beat funding-only on test, not just show PF > 1 in-sample
ETH full-sample PF 1.277 and XRP full-sample PF 2.897 looked attractive, but both failed the only metric that matters: improved out-of-sample realized expectancy with live directional participation.

### L76.4: Funding collectors are a feature, not a failure mode
BTC, ETH, and XRP currently add small positive carry with almost no drawdown. Forcing them into directional mode degrades the portfolio unless they can produce repeatable test-period edge.

## 2026-03-07: PATCH #75 — SOL60 Allocation + Dashboard Extension + Validation

### L75.1: Capital allocation is a high-leverage optimization lever
Moving SOL from 55%→60% (+5pp) and BNB from 25%→20% (-5pp) yielded +$23 (+6.9%). SOL's directional edge scales linearly with allocation. The star performer should get maximum allocation within risk limits. C (65%) won overall (+$46) but concentration risk > 65% is dangerous.

### L75.2: XGBoost FAST mode (INTERVAL=500) is essential for iterative testing
Default INTERVAL=200 took 15+ min per run — too slow for multi-variant testing. FAST mode (500) runs in ~2 min with nearly identical results (<1% variance). Always use FAST for comparison tests, reserve INTERVAL=200 for final validation.

### L75.3: Stability variance < 0.5% proves deterministic pipeline
3 consecutive runs: $337.07, $336.97, $336.43 — range $0.64 (0.2%). The pipeline is fully deterministic within XGBoost random seed variance. This is excellent reproducibility.

### L75.4: Generic WebSocket architecture > symbol-specific
Refactoring `subscribeSOLLive()` → `subscribeAltPairLive(symbol, tf)` with `altWsSockets` dict made adding ETH/BNB trivial (just array push). Design for N symbols, not 1+1.

### L75.5: Strategies are symbol-agnostic — don't fix what isn't broken
All 6 strategies (RSITurbo, SuperTrend, MACrossover, etc.) take only `logger` in constructor and analyze indicators, not symbol names. The `symbol: 'BTCUSDT'` in config is dead metadata. Research before refactoring.

## 2026-03-06: PATCH #74 — SOL Production Integration + Slippage + Multi-Pair Dashboard

### Lekcja: SLIPPAGE — MAKER vs TAKER distinction is critical
- Initial slippage: 0.01% on ALL entries+exits → dropped +$368→+$270 (-27%)
- Bot uses limit orders (maker) for entries, TP, trailing stop, break-even
- Only SL exits are market orders (taker) → slippage applies ONLY to SL
- After fix (SL-only): +$338.61 — realistic 8% impact instead of 27%
- **LEKCJA: Nie stosuj slippage do limit orderów. Maker = 0 slippage. Taker (SL) = 0.01%**

### Lekcja: MULTI-SYMBOL DASHBOARD — per-symbol mark prices
- Original dashboard used `currentBtcPrice` for ALL position PnL calculations
- SOL position with BTC mark price = completely wrong PnL
- **FIX:** `markPrices[symbol]` lookup with `currentBtcPrice` as fallback
- **LEKCJA: Każda pozycja musi mieć swój własny mark price, nie globalny BTC price**

### Lekcja: DATA LOADER — symbol subdirectory pattern
- `dataSourceConfig.path` was hardcoded to `./data/BTCUSDT/` — breaks multi-symbol
- Generic `./data/` path + DataLoader supports: `data/SYMBOL/SYMBOL_m15.csv` → fallback `data/SYMBOL_m15.csv`
- **LEKCJA: Ścieżki do danych muszą być dynamiczne per-symbol, nie hardcoded**

### Lekcja: POSITION SIZE CAPS prevent outlier losses
- BNB trades #50, #51: -$31.63, -$31.52 from aggressive position scaling
- `MAX_POSITION_VALUE_PCT=0.60` caps at 60% of allocated capital → max loss ~$15
- **LEKCJA: Nawet przy poprawnym risk per trade, position value cap chroni przed extremes**

---

## 2026-03-06: PATCH #73 — Realism Audit + 10-Iteration Optimization

### Lekcja: FUNDING RATE SIMULATOR INFLATION — 13.1x zawyżone wartości
- `estimate_funding_rate()` z premium `returns_20 * 0.5` dawał 210% APR zamiast realistycznych 16-27%
- Premium 10x za duży, RSI 50x za duży, volume 16x za duży
- P#72's "+$448 funding income" było **wymyślone** — prawdziwa wartość ~$35
- **LEKCJA: Zawsze waliduj symulatory przeciw realnym danym rynkowym (APR 16-27% = norma)**
- **LEKCJA: Jedna zawyżona zmienna może dominować cały P&L — weryfikuj każdy komponent osobno**

### Lekcja: GRID V2 BYPASSES DIRECTION FILTER
- Grid V2 fires BEFORE ensemble+direction filter w engine.py (line ~318 vs ~643)
- BTC `BTC_LONG_BLOCK_ALL=True` ale Grid V2 otwierał LONG pozycje (-$18.71 strat)
- **FIX: Wyłącz Grid V2 dla par bez directional edge (BTC, ETH, XRP)**
- **LEKCJA: Każdy nowy moduł (grid) musi respektować istniejące filtry kierunkowe**

### Lekcja: NEGATIVE DIRECTIONAL EDGE — wyłącz, nie naprawiaj
- BTC: PF 0.062 (27% WR). XRP: PF 0.578 (55% WR). BNB LONG: net -$4.23
- Próba "naprawy" directional = overfitting. Lepiej: kill directional, zostaw funding.
- **Pure funding pairs (BTC/ETH/XRP): zawsze pozytywne, zero drawdown, deterministyczne**
- **LEKCJA: Jeśli directional PF < 0.8 na walk-forward → kill it, nie optymalizuj**

### Lekcja: CAPITAL ALLOCATION MATTERS
- Przeniesienie 7% capital z funding pairs (BTC/ETH) do BNB = +$12 improvement
- Funding pairs mają ~1.5% return vs SOL 5.3%, BNB 1.6% — marginalny benefit z dodatkowego kapitału
- **LEKCJA: Alokuj kapitał proporcjonalnie do proven edge (Sharpe/PF), nie równomiernie**

---

## 2026-03-05: PATCH #72 — Adaptive Funding + Engine Fix + Capital Rebalance

### Lekcja: KRYTYCZNY BUG — `_compute_results()` early return (0 tradów) gubi P#71 stats
- Gdy `not trades`, engine zwracał minimal dict BEZ `funding_arb_stats`, `funding_arb_pnl` etc.
- ETH (CONFIDENCE_FLOOR=0.55 → 0 tradów) tracił +$150 funding income w raportowaniu
- `results.get('funding_arb_pnl', 'MISSING')` → `MISSING` (None) = klucz nie istniał!
- **FIX: KAŻDY return path w _compute_results() MUSI zawierać pełen zestaw kluczy**
- **LEKCJA: Przy dodawaniu nowych metryk — sprawdź WSZYSTKIE return paths, nie tylko główny**

### Lekcja: Standalone test ≠ engine integration
- Standalone `FundingRateArbitrage` test: +$147 (74 opens, 152 collects) — PERFECT
- Engine integration: $0 — early return path gubił stats
- **Debugging: kiedy moduł działa standalone ale nie w engine → szukaj w results piping, nie w module**
- Klucz diagnostyczny: `funding_arb_stats: {}` (empty dict) zamiast `{'enabled': False}` ujawnił bug

### Lekcja: Pure funding mode na ETH = +16.72% ROI na $900
- CONFIDENCE_FLOOR=0.55 eliminuje wszystkie sygnały kierunkowe
- FUNDING_CAPITAL_PCT=0.70 → 70% kapitału w funding arb
- 0 tradów, 0 drawdown, +$150.50 net funding income
- **Pary bez edge kierunkowego → wyłącz directional, zostaw TYLKO funding**

### Lekcja: Capital rebalance ma OGROMNY wpływ
- P#71: równy kapitał → SOL $10k, BNB/BTC/ETH/XRP po $10k
- P#72: SOL 55%, BNB 18%, BTC 10%, ETH 9%, XRP 8%
- SOL (ROBUST) dostaje główny kapitał, reszta = funding + grid support
- **Alokuj kapitał proporcjonalnie do robustności strategii**

### Lekcja: Runner stats key mismatch — nazwy kluczy muszą być IDENTYCZNE
- `fr_stats.get('total_collected')` vs `funding_collected` w get_stats()
- `fr_stats.get('settlements')` vs `settlements_processed` w get_stats()
- **Zawsze sprawdzaj FAKTYCZNE nazwy kluczy w get_stats() — nie zgaduj**

### Lekcja: Combined PnL (directional + funding) = jedyny sensowny metric
- `net_profit` = tylko directional trades PnL
- `funding_arb_pnl` = osobno funding income
- Portfolio return musi być `(directional + funding) / capital`
- BNB: directional +$9.06, funding +$145.87, COMBINED +$154.95 (+8.61%)
- **Bez combined metric → BNB wyglądałby jak break-even (PF 1.057) mimo real +8.61%**

---

## 2026-03-04: PATCH #71 — Funding Rate + Grid V2 + News/Sentiment Filter

### Lekcja: Fee death na małym kapitale — NAJWAŻNIEJSZY insight P#71
- Grid V2 v1 (luźne parametry): 250+ tradów na $1k = ~$400 w prowizjach → TOTAL +$15
- Grid V2 v2 (ścisłe): 8-25 tradów na $1k = ~$20 w prowizjach → TOTAL +$295
- **Na $1k kapitale: trade count jest NAJWAŻNIEJSZY parametr. Mniej = lepiej.**
- Cooldown 16-24 świeczek zamiast 4 → 19× lepszy wynik

### Lekcja: Funding rate = najstabilniejsze źródło dochodu (+$224 passive)
- Delta-neutral nie ma risk directionality — pure spread income
- BTC: +$34, BNB: +$46, ETH: +$78 (najwyższy), XRP: +$66
- Funding pokrywa straty z kierunkowego tradingu na wszystkich parach
- **Funding rate arb to jedyna strategia, która działa na KAŻDEJ parze**

### Lekcja: BNB MARGINAL→ROBUST po P#71 — dywersyfikacja strategii działa
- P#70 walk-forward: PF 0.774→0.874 (MARGINAL)
- P#71 walk-forward: PF 0.994→1.322 (+33%) = ROBUST!
- Zmiana: funding arb + ścisły Grid V2 + direction filter
- **Łączenie strategii (directional + grid + funding) > single strategy**

### Lekcja: News Filter — event detection ≠ trade blocking
- 574-783 events detected per pair na 14400 candles
- 0 blocked — events adjustment confidence (nie blocking)
- Bug: detect_events musi działać na KAŻDEJ świeczce (nie tylko w signal path)
- **Events should run independently from signal pipeline — otherwise miss 90% candles**

### Lekcja: Grid V2 entry zones muszą być EXTREME (BB%B < 0.08)
- BB%B < 0.15 + RSI < 45 = za luźne → 250 tradów
- BB%B < 0.08 + RSI < 38 = ścisłe → 25 tradów, wyższy WR
- ADX < 18 (nie 22) = tylko PRAWDZIWIE ranging market
- **Mean-reversion wymaga ekstremalnych entry points — "half-way" zones nie działają**

---

## 2026-03-05: PATCH #69 — Multi-Pair Deploy: Per-Pair Config + BNB Direction Filter

### Lekcja: Per-pair config z capital allocation daje 7.4× lepszy ROI niż equal weight
- P#68: 5 par × $10k = $50k → +0.48% (+$237.84)
- P#69: 3 pary, $10k allocated → +3.57% (+$356.85) — 7.4× better ROI
- Koncentracja kapitału na SOL (70%) zamiast rozmywania na 5 par
- **Eliminacja negatywnych par (ETH, XRP) ważniejsza niż dywersyfikacja**

### Lekcja: BNB direction filter (3-layer LONG gate) = najskuteczniejsza single-feature
- 21 LONGs blocked → PF 1.088→1.714 (+57.5%), WR 82.5%→90.0% (+7.5pp)
- MaxDD 2.20%→0.90% (-59% risk reduction)
- 1 LONG przeszedł filtr (conf ≥0.40 + MTF uptrend) — i PRZEGRAŁ (-$9.40)
- **BNB to SHORT-only instrument. Każdy LONG, nawet z high confidence, traci.**
- **3-layer gate (regime + confidence + MTF) daje najlepsze wyniki vs simple block**

### Lekcja: apply/restore config pattern to clean isolation dla multi-pair
- `apply_pair_overrides(symbol)` → patcha config → returns originals dict
- `restore_config(originals)` → przywraca po backteście
- Zero cross-contamination: parametry SOL nie wpływają na BTC backtest
- **Runtime config overrides > multiple config files — jedno źródło prawdy (config.py) + overrides**

### Lekcja: 3/3 momentum za agresywny dla BTC — zabija 70% tradów
- BTC z PRE_ENTRY_MOMENTUM_MIN_ALIGNED=3: 12 tradów (vs 42 bez) → za mało danych
- Relax do 2/3 + CONFIDENCE_FLOOR=0.27: 18 tradów, PF 0.541 (improved from 0.341)
- **Momentum filter powinien redukowaÄ max 30-40% tradow, nie 70%+**
- **Lepszy approach: confidence floor + LONG penalty zamiast hard momentum block**

### Lekcja: Capital allocation na proven edge jest ważniejsza niż dywersyfikacja
- SOL z 70% kapitału ($7k) → +$345.48 (+4.94%) — wystarczy do pokrycia strat BTC
- BTC z 15% ($1.5k) → -$12.25 — niewielki wpływ na portfolio
- Loss exposure: $332.56 (P#68) → $12.25 (P#69) — -96% reduction
- **Alokuj 60-80% na parę z highest PF+Sharpe, resztę jako hedge**

### Lekcja: Eliminacja par > optymalizacja par
- ETH: fees = 145% of PnL → skip (0% allocation) zamiast próby optymalizacji
- XRP: negative edge → blacklist zamiast szukania edge
- **Nie próbuj naprawiać negatywnego edge — eliminuj i przerzuć kapitał na proven winners**

---

## 2026-03-05: PATCH #68 — Multi-Pair Production & RANGING Experiments

### Lekcja: Dynamic SL jest pułapką przy risk-based position sizing
- Zmiana SL distance NIE zmienia $ risk per trade (position sizing kompensuje)
- Tighter SL = więcej stop-outów (SL bliżej entry = więcej triggered by noise)
- Wider SL = mniej stop-outów ALE mniejsze pozycje (less reward too)
- **NET EFEKT = zero lub negatywny** — jedyna zmiana to LICZBA stopów, nie wartość
- W P#68: avg SL $47.36 z DynSL vs $45.49 bez → czysto negatywne

### Lekcja: Adaptive sizing wymaga WR > 55% żeby nie spiralować w dół
- Win mult 1.15 / Loss mult 0.85 → przy Signal WR 43.8% straty dominują
- Final multiplier: 0.522 (prawie połowa size!) po 150 dniach
- Karze zwycięzców: najlepsze sygnały dostają ~52% normalnego size
- **NIGDY nie implementuj adaptive sizing bez Signal WR > 55%**

### Lekcja: RANGING bypass potrzebuje niezależnego edge validation
- Obniżenie confidence floor z 0.25 → 0.12 dla grid trades: 3 trades, ALL LOST
- BollingerMR sam nie ma alpha w RANGING (BB%B 0.20/0.80 = noise entries)
- NeuronAI PRIME gate blokuje na CONFIDENCE_FLOOR ZANIM engine's bypass
- **Grid strategy wymaga dedykowanego edge, nie discount na filtrach**

### Lekcja: Skynet in-memory optimization musi być persisted do config.py
- P#67 Skynet optymalizował L3_MULT 2.5→3.5 ale tylko via apply_best_config()
- Po restarcie L3_MULT wracał do 2.5, tracąc optymalizację
- **ZAWSZE: apply_best_config changes → update config.py default values**

### Lekcja: Multi-pair diversification to prawdziwe alpha (SOL PF 1.562!)
- SOL: PF 1.562, Sharpe 6.4, Return +4.52%, MaxDD 2.55% — STAR PERFORMER
- 3/5 par profitable, portfolio net +$237.84
- SOL SHORT w TRENDING_DOWN: 86.5% WR, $467.97 profit (vs $0 BTC LONG)
- BNB SHORT: 93.1% WR — najlepszy kierunkowy trade w portfolio
- **Portfolio diversification > single-pair optimization**

### Lekcja: Fee ratio jest kluczowy dla marginalnych par
- ETH: fees = 145% of PnL ($88.93 fees na $61.19 profit)
- BNB: fees = 138% of PnL ($78.97 fees na $57.37 profit)
- SOL: fees = 16% of PnL ($72.22 fees na $451.84 profit)
- **Jeśli fee ratio > 50% of PnL, para jest marginal i niestabilna**

---

## 2026-03-01: PATCH #56 — Backtest V2: Iterative Learning Engine

### Lekcja: Backtest musi UCZYĆ się, nie tylko raportować
- V1 backtest raportował win rate i PF, ale nic z tym nie robił
- V2 engine: 5 iteracji param tuning, każda informuje następną
- **Formacje świecowe muszą BRAMKOWAĆ wejścia** (pattern confirmation)
- Position management (trailing/BE) to konieczność, nie opcja

### Lekcja: Candle pattern confirmation = +10pp WR (konsekwentnie)
- Pattern confirmation w V2 strategiach (+required bullish/bearish pattern match)
- WR wzrósł z 28% → 38-43% na KAŻDYM parametrze (5 różnych runs)
- Redukcja tradów o 50% (616→300) = wyższa selektywność
- **CandlePatternEngine.detect_all()** jako brama wejścia = MUST HAVE

### Lekcja: SL 2.0 ATR >> 1.5 ATR (wider = lepiej)
- Run 2 (SL 1.5 ATR): ALL worse — PF spadł do 0.15-0.50, katastrofa
- Run 1/4/5 (SL 2.0 ATR): PF 0.67-0.75, konsekwentnie lepiej
- Szersza SL = mniej noise stops, pozycja ma przestrzeń do "oddychania"
- **Na BTC: 1.5 ATR to za mało, 2.0 ATR minimum**

### Lekcja: Trailing distance musi być bliska SL size
- Trail 1.0 ATR przy SL 2.0 ATR = trail za ciasny (Run 1: PF 0.68)
- Trail 1.5 ATR przy SL 2.0 ATR = trail proporcjonalny (Run 4: PF 0.75 ★)
- Zasada: **trailing_distance ≈ 0.75 × sl_distance**
- Za ciasny trail = mniejsze wygrane mimo wyższego WR

### Lekcja: Breakeven activation — później = lepiej (do punktu)
- BE 1.0R: 34% exits at breakeven = OGROMNY fee drain (Run 5)
- BE 1.5R: 15% exits at breakeven = optymalnie (Run 4 ★)
- Wcześni BE = chronią kapitał ale kradną zyski z pozycji 1-1.5R
- **Sweet spot: BE na 1.5R** — nie za wcześnie, nie za późno

### Lekcja: Partial TP jest neutralne — nie pomaga ani nie szkodzi
- Run 1 (partial 2R/50%): Return -10.7%, PF 0.68
- Run 3 (no partial): Return -10.7%, PF 0.68 (IDENTYCZNE)
- Partial fragmentuje pozycje i redukuje trailing exposure, ale nie wpływa na netto wynik
- **Decyzja: Skip partial TP — prostszy system = lepszy**

### Lekcja: Trailing activation powinien być ≥ 2.0R
- 1.5R activation (Run 1) = trail uruchamia się za wcześnie, wiele pozycji trailowane na małym zysku
- 2.0R activation (Run 4) = pozycja ma czas rozwinąć się, trail chroni większe zyski
- **Wyższe trailing activation = mniej "przerywanych" winnerów**

### Lekcja: Wasted winners (~16%) wskazują na potrzebę lepszego timing
- 16% tradów dociera do 1R+ zysku ale kończy jako strata
- To są pozycje gdzie SL (pełna strata) nastąpiła PO ruchu w zysk
- Wskazuje na: złe timing wyjścia LUB za ciasny initial SL
- Dalsze możliwości: adaptive trailing oparty o vol/ATR shifts

### BEST V2 PARAMS (Run 4 — zwycięzca 5 iteracji):
```
SL:     2.0 × ATR14  (wider = room to breathe)
TP:     5.0 × ATR14  (big target for trailing to work)
BE:     1.5R          (later = less BE drain)
Trail:  2.0R act      (let winners develop)
Trail:  1.5 ATR dist  (proportional to SL)
Partial: OFF          (neutral — keep system simple)
```

### Results matrix (AA on 15m — best strategy):
| Run | BE R | Trail R/ATR | Partial | Return | PF   | WR    | BE%  | Wasted |
|-----|------|-------------|---------|--------|------|-------|------|--------|
| V1  | -    | -/-         | -       | -16.1% | 0.74 | 28.7% | -    | -      |
| R1  | 1.0  | 1.5/1.0     | Yes     | -10.7% | 0.68 | 47.3% | 23.8%| 10.2% |
| R2  | 1.0  | 2.0/1.5     | Yes     | -19.0% | 0.16 | 52.3% | 38.4%| 15.1% |
| R3  | 1.0  | 1.5/1.0     | No      | -10.7% | 0.68 | 43.1% | 23.8%| 10.2% |
| R4★ | 1.5  | 2.0/1.5     | No      | -7.6%  | 0.75 | 38.5% | 14.7%| 16.4% |
| R5  | 1.0  | 2.0/1.5     | No      | -9.3%  | 0.67 | 38.6% | 33.5%| 15.4% |

---

## 2026-03-01: Candlestick Pattern Features

### Lekcja: Formacje świecowe ZWIĘKSZAJĄ wartość ML jako filtra
- Dodanie 11 candle pattern features (47→58) sprawia, że ML model lepiej rozpoznaje jakość wejścia
- `cp_bullish_count` i `cp_max_bearish_strength` wskoczą do TOP 2 feature importance
- **MACrossover + ML veto = jedyna zyskowna strategia** (Return +0.2%, Sharpe 1.06)
- Win rate skok: 26.8% → 38.5% (+11.6pp) — ogromny wpływ

### Lekcja: ML działa jako FILTR, nie standalone predictor
- Standalone accuracy 52% ≈ random (po fees = strata)
- Jako filtr na sygnały strategii: blokuje najgorsze wejścia
- Veto mode > agree mode dla większości strategii
- Agree mode lepszy gdy chcemy drastycznie zmniejszyć liczbę tradów

### Lekcja: SuperTrend + ML nie działa dobrze
- ML agree na SuperTrend: WR 14.3% (z 33.3%) — za dużo odfiltrowane
- SuperTrend ma inny charakter sygnałów niż ML model rozumie

### Lekcja: Feature engineering > model tuning
- 9 microstructure features (PATCH #53) + 11 candle pattern features (PATCH #54) dały większy skok niż tuning hiperaparametrów
- `buying_pressure_trend` i `vol_ratio_20` konsekwentnie w top features

### Lekcja: Overfitting guard na standalone model jest mylący
- Model ma score 25/100 jako standalone (holdout PnL = -135%)
- Ale jako FILTR dodaje +2.6% na MACrossover → realny value
- Trzeba budować overfitting guard specyficznie dla filtra, nie standalone predictor

---

## 2026-03-01: Model Tuning

### Lekcja: Regressor XGBoost jest bezużyteczny
- Expected return z XGB regressor = stała 0.000198 dla wszystkich sampli
- Regressor w ensemble jest noise — usunięty gate na expected return
- Classifier + confidence threshold = jedyna wiarygodna metoda

### Lekcja: PnL symulacja musi być position-based
- Fee per candle (stary bug) = ogromne sztuczne straty
- Fee per trade (poprawka) = realistyczny PnL tracking
- Entry na sygnale, exit na reversal/neutral — pozycja trwa wiele świec

### Lekcja: Threshold musi pasować do rozkładu probability
- Analizuj rozkład: mean, std, min, max, percentyle
- Za wysoki threshold (0.58) = 0 tradów przy silnej regularyzacji
- Za niski (0.50) = za dużo noise → sweet spot 0.56

---

## 2026-02-28: Evolution Plan Implementation

### Lekcja: Walk-forward CV jest krytyczny
- Bez WF-CV: 60%+ accuracy (overfitting na "future" data)
- Z WF-CV: 51-53% accuracy (realna wartość)
- TimeSeriesSplit z 5 foldami = minimum

### Lekcja: ADX Wilder smoothing bug
- Trzeba naprawić w OBIE miejsca: regime_detection.py I ml_features.py
- Copy-paste bugs = wielokrotne źródła tego samego błędu

### Lekcja: Dual validation (rule + LLM) oszczędza latency
- Fast-path: confidence > 0.65 → skip Ollama (200-800ms oszczędności)
- Rule validator (<1ms) łapie 60%+ oczywistych przypadków
- Ollama tylko dla "szarej strefy" 0.45-0.65

---

## 2026-03-06: PATCH #55 — Production Hardening

### Lekcja: retrain_cron data overwrite bug
- `_fetch_data()` nadpisywał cały CSV 1000 najnowszymi świecami
- Utrata historycznych danych = katastrofa przy retrainingu
- Fix: concat → dedup by timestamp → sort → save merged
- ZAWSZE: przy danych ścieżka = APPEND + DEDUP, nigdy REPLACE

### Lekcja: Regime jako ML feature daje wartość
- 58→61 features (3 regime features) poprawiło MomentumPro z 40% → 80% consistency
- Regime info jest "meta-feature" którego cena nie zawiera bezpośrednio
- StatisticalRegimeDetector w extract_batch() = regime labels for training data

### Lekcja: ML veto nie jest universal — per-strategy opt-out
- Walk-forward 1h pokazał: ML HURTS MomentumPro (2/5 windows)
- Rozwiązanie: `name !== 'MomentumPro'` w obu pętlach veto
- Generalizacja: każda strategia potrzebuje own walk-forward walidacji ML value
- Nie zakładaj że ML filter pomaga WSZYSTKIM strategiom

### Lekcja: Data quantity matters — 88 dni to za mało
- 88 dni 15m: 3-window WF max (windows za krótkie)
- 148 dni 15m: 5-window WF z 60-day train + 15-day test
- 357 dni 1h: solidny fundament pod dalszą analizę
- Minimum: 120+ dni na 5-window WF z przyzwoitymi oknem

---

## 2026-03-03: PATCH #62 — Price Action Engine + S/R Activation

### Lekcja: S/R filter był WYŁĄCZONY od P#59
- `sr_filter.py` obliczał S/R levels ale `confidence_adj = 1.0` i `passed = True` zawsze
- 3 patche (#59, #60, #61) z wyłączonym S/R = zero impaktu na wejścia
- **Zawsze weryfikuj czy nowy moduł jest AKTYWNY, nie tylko zaimportowany**

### Lekcja: Price Action wymaga luźnych parametrów na 15m
- `swing_lookback=5` → za strict → 0% pattern detection
- `swing_lookback=3`, `min_swing_atr=0.15`, `rejection_wick=0.45` → 14.7% pattern rate
- BTC na 15m ma mniejsze swingi niż higher TFs — parametry muszą to odzwierciedlać

### Lekcja: Problem jest w EXITACH, nie w WEJŚCIACH
- PA/S/R filtrowanie wejść dało marginalny efekt (35.3 vs 36.4 score)
- avg win $21 vs avg loss $76 (W/L=0.28) — winner capture za mały
- Partials wycinają 70% pozycji wcześniej niż TP, losers biorą pełny SL
- **Następny fokus musi być na exit management, nie na entry quality**

### Lekcja: Skynet Brain — bug w tried_changes (NAPRAWIONY)  
- `entry['changes']` w bloku NO_IMPROVEMENT szukał zmian w BIEŻĄCYM entry (puste)
- Zmiany, które spowodowały wynik, były aplikowane w POPRZEDNIEJ iteracji
- Fix: `self.history[-1].get('changes', [])` zamiast `entry.get('changes', [])`
- **Po naprawie: brain poprawnie zapamiętuje i unika failów ✅**

### Lekcja: Counter-structure penalty musi być zachowawcza
- `0.75` (25% penalty) za counter-structure BUY/SELL → zbyt agresywne
- Wiele "counter-structure" wejść jest OK jeśli jest reversal pattern
- Zmienione na `0.80` (20%) — lżejsza kara, dążenie do neutralności

---

## 2026-03-03: PATCH #63 — Exit Management Overhaul

### Lekcja: L1 i L2 miały TEN SAM trigger (1.5 ATR) — krytyczny bug
- Oba partial levels na 1.5 ATR = 70% pozycji zamykane na tym samym poziomie cenowym
- avg_win = $21 bo wszystkie winy to mikro-partials na jednym punkcie
- **ZAWSZE weryfikuj że L1/L2/L3 mają RÓŻNE trigger levels**

### Lekcja: VQC_REGIME_SL_ADJUST był ODWRÓCONY
- TRENDING: 0.85 (tighter SL) → POWINNO BYĆ 1.10 (wider — survive pullbacks)
- RANGING: 1.15 (wider SL) → POWINNO BYĆ 0.85 (tighter — no momentum)
- **Trend-following wymaga wider SL w trendzie, tighter w rangingu**

### Lekcja: Hardcoded trailing distances to problem
- Phase 3: 0.5 ATR hardcoded → na BTC 15m to ~$400, JEDEN normalny pullback zabija trade
- Zmienione na config param 1.0 ATR + regime multiplier → 2× więcej miejsca
- **Trailing distances MUSZĄ być parametryzowane i regime-adaptive**

### Lekcja: W/L ratio ≠ profitability
- P#63: W/L spadło z 0.28→0.16 ALE PF wzrosło 0.617→0.630 i return +1.11pp
- Wiele małych winów (L1 @1.0 ATR, 25%) daje lepszy NET niż mniej dużych winów z więcej SL
- WR 69→79% kompensuje mniejsze avg_win
- **Scoring powinien bardziej ważyć PF i return niż sam W/L ratio**

### Lekcja: Brain optymalizuje L2_PCT i PA gate
- L2_PCT: 0.25→0.35→0.45 (stopniowo) — Brain chce więcej profit capture z tradów @2.0 ATR
- PA_MIN: 0.20→0.25→0.30 — Brain chce wyższą jakość wejść
- **Skynet Brain jest stabilny — iteracyjnie podnosi ten sam param jeśli daje wyniki**

---

## 2026-03-03: PATCH #64 — Scoring Fix + Dynamic SL + Trade Analytics

### Lekcja: W/L ratio w scoringu KARZE high-WR systemy
- P#63 WR=79.3% ale W/L=0.16 → W/L_score = 8/100 przy 15% wadze
- Po zamianie na WR score: ta sama strategia = 45.1 vs 36.0 (realna wartość)
- **Scoring MUSI odzwierciedlać strategię: high-WR systems → liczyć WR, nie W/L**

### Lekcja: Trade-level WR ≠ Signal-level WR (KRYTYCZNE!)
- Trade WR: 73.3% (11/15 tradów) — WYGLĄDA dobrze
- Signal WR: 50.0% (4/8 sygnałów) — REALNE
- Partial exits (L1/L2/BE/Trail) dzielą jednego winnera na 3+ tradów → inflacja WR
- **ZAWSZE analizuj signal-level WR (per-entry, nie per-exit)**
- **Dla PF>1.0 przy 50% signal WR potrzeba avg_win_signal > avg_loss_signal**

### Lekcja: PA gate filter vs PA pattern quality
- PA engine znalazło pattern na 17.9% entries (7/39)
- Brain podniósł PA_MIN_SCORE 0.30→0.40 → blocked 31 trades → 57→15 tradów
- Score wzrósł bo usunął net-negative trades — ale to MASKING, nie FIX
- **Stringent filtering ukrywa problem z sygnałami — potrzeba LEPSZYCH patterns, nie OSTRZEJSEGO filtra**

### Lekcja: Losers have no momentum (MaxR analysis)
- 4 losers: MaxR = 0.39, 0.26, 0.23, 0.27 → trade NIGDY nie miał momentum w dobrym kierunku
- 4 winners: MaxR = 0.77, 2.84, 1.56, 2.00 → widoczna separacja
- **MaxR < 0.5 = prawdopodobnie bad entry. Potrzeba entry quality filter bazujący na momentum confirmation**

### Lekcja: 47% danych to RANGING, 0 tradów w RANGING
- Bot działa WYŁĄCZNIE w trendzie (TRENDING_DOWN: 14/15 tradów)
- RANGING = 47% danych → kompletnie pominięte opportunity
- **System potrzebuje RANGING-specific strategy (mean reversion? micro-scalp?)**

### Lekcja: avg_loss $106 vs avg_win $25 = 4.2× asymmetry
- Winners: $9.42 (L1), $32.87 (L2), $56.14 (Trail) — Trail jest NAJLEPSZY ale najrzadszy
- Losers: ZAWSZE full SL = -$106
- **Path to profitability: zwiększ % tradów dochodzących do Trail/L2, zmniejsz full SL losses**

---

## 2026-03-04: PATCH #65 — Momentum Gate + Signal Scoring + RANGING

### Lekcja: Momentum gate DZIAŁA na loss-size ale NIE na loss-count
- Avg loss spadło $106→$56 (47% redukcja!) — to DOBRY wynik
- ALE 19/50 tradów to nadal SL (38%) — gate zmniejsza ROZMIAR straty, nie LICZBĘ strat
- **Gate ≠ filter. Gate cut losses, potrzeba LEPSZYCH sygnałów żeby cut loss COUNT**

### Lekcja: Signal WR spada gdy volume rośnie = quality problem
- P#64: 50% signal WR (8 sygnałów) → P#65: 38.7% signal WR (31 sygnałów)
- Więcej tradów (3.3x) ale proporcjonalnie więcej loserów
- PA_MIN_SCORE lowered 0.30→0.25 wpuścił więcej bad entries
- **Nie obniżaj filtrów żeby zwiększyć volume — popraw sygnały/strategie**

### Lekcja: RANGING strategy wymaga NOWYCH strategii, nie QDV bypass
- QDV unblocked dla RANGING ale 0 tradów nadal
- Powód: MACrossover/SuperTrend/RSITurbo są trend-following — NIE generują sygnałów w rangingu
- **Potrzeba dedykowanej mean-reversion/scalping strategy dla RANGING regime**

### Lekcja: LONG trades katastrofalne na downtrend dataset
- 14 LONG tradów: 42.9% WR, -$246.89 PnL
- Dataset: $90K→$67K (28% drop) → systemic SHORT bias prawidłowy
- **Long counter-trend penalty 0.75 jest ZA MAŁY. Rozważ 0.50 lub block longów w strong downtrend**

### Lekcja: Signal W/L > Trade W/L jako metric
- Signal W/L: 0.84 vs Trade W/L: 0.33
- Sygnały mają LEPSZY balance niż wyglądają trade-level (bo winners = 3 trades, losers = 1)
- **Signal W/L to PRAWDZIWA miara jakości strategii — ZAWSZE raportuj signal-level**

### Lekcja: Score drop ≠ regression — new scoring reveals truth
- Score: 51.2→29.2 — WYGLĄDA jak regression ale to NOWA formula
- Stara formula: WR 73.3% + Sharpe = inflated score
- Nowa formula: Signal WR 38.7% + Signal W/L 0.33 = REAL score
- **Nie porównuj scorów między patchami z różnymi formułami scoringu**

### Lekcja: Brain converges za szybko (4 iteracje)
- 10 iteracji dostępnych, ale Brain converged po 4 (patience=3)
- Jedyna zmiana: TP 2.5→2.0, Phase1 0.7→0.5, PA 0.25→0.30
- Pozostałe 6 iteracji niewykorzystane
- **Rozważ patience=4 lub wymagaj min 5 iteracji przed convergence**


---

## 2026-03-04: PATCH #66 — Pre-Entry Momentum + LONG Filter + Fee Reduction

### Lekcja: LONG block w TRENDING_DOWN = najskuteczniejszy filtr
- P#65: 8/10 LONG losers w TRENDING_DOWN -> P#66: 0 LONGs w TD (hard block)
- LONG WR: 20%->33.3%, LONG PnL: -$247->-$85 (+$162 savings)
- **Proste blokady regime-based > matematyczne penalty (0.75x nie wystarczylo, block wystarczyl)**

### Lekcja: Fee reduction to "free money" -- zawsze sprawdzaj fee model
- 0.02%->0.015% = $69.53 savings (60% fees reduced)
- To 58.8% CALEJ poprawy P#66 -- bez zadnej zmiany w logice tradingowej
- **Przed optymalizacja strategii -- sprawdz czy fees nie zjadaja edge**

### Lekcja: BollingerMR z wieloma warunkami jednoczesnie = 0 triggers na 15m
- RSI<30 + BB%B<0.10 + Volume>1.2x = trzy rzadkie events razem = prawie nigdy
- W RANGING (ADX<20) RSI oscyluje 40-60, rzadko spada <30
- **Kazdy dodatkowy filtr radykalnie redukuje triggers. Zaczynaj od 1 warunku i dodawaj**

### Lekcja: Pre-entry momentum 2/3 candles = za latwy do zdania
- 2/3 candles aligned = zablokowal TYLKO 1 entry z 18 candidates
- Wiekszosc entries ma przynajmniej 2/3 candles aligned naturalnie
- **Require 3/3 candles LUB mierz magnitude (close-to-close %), nie tylko direction**

### Lekcja: Partials L1@1.0 ATR > L1@1.25 ATR -- szybszy capture
- Per-L1 capture: $16.28 (P#66) vs $9.54 (P#65) = +71% per exit
- 1.0 ATR = latwiejszy do osiagniecia -> wiecej profitable exits
- **Punkt partial powinien byc tam gdzie cena REALNIE dochodzi, nie idealnie**

### Lekcja: MaxR < 0.40 = 100% loss rate (confirmed P#65 + P#66)
- P#65: MaxR<0.40 = 0% WR. P#66: MaxR<0.40 = 0% WR (10/10 losers)
- MaxR>=0.60 = 100% WR w obu patchach
- **MaxR pattern jest STABILNY -- przyszle odrzucanie entries z predicted low MaxR = kluczowa optymalizacja**

### Lekcja: Feb-Mar systemic failure niezalezny od patch
- P#65: Feb-Mar -$487. P#66: Feb-Mar -$258. Poprawa ale nadal 0% WR
- BTC crash (-28%) = ALL signals fail w tym okresie
- **Potrzeba: volatility pause mechanism (3+ consecutive losses -> reduce sizing/pause)**

---

## PATCH #70 Lessons (2026-03-06)

### L70.1: XGBoost retrain frequency dramatically affects results
- interval=200: 14min, +$387 | interval=500: 2min, +$352 | interval=2000: 1.3min, +$147
- Model quality degrades non-linearly with fewer retrains (2000 interval = catastrophic)
- **Sweet spot: 200 for final runs, 500 for quick iteration (7× faster, ~10% PnL diff)**

### L70.2: XGBoost results are significantly stochastic
- Same config, same data, different runs → PnL varies 10-30%
- BNB PF ranged from 0.894 to 1.883 across interval settings
- **Need random_state=42 for reproducibility. Without it, Brain optimization unreliable.**

### L70.3: Walk-forward is the ONLY reliable edge validator
- Full-period backtest: BNB PF 1.883 (looks great!)
- Walk-forward: BNB TRAIN PF 0.774, TEST PF 0.874 (both negative!)
- **Full-period results can be misleading. Walk-forward separates real edge from noise.**

### L70.4: SOL is the ONLY pair with robust, persistent edge
- Walk-forward: TRAIN PF 3.754 → TEST PF 1.774 (-53% decay but still excellent)
- BTC: TRAIN PF 0.823 → TEST PF 0.000 (zero edge)
- BNB: negative in both train and test walk-forward splits
- **Concentrate capital on SOL. Other pairs are drag or noise.**

### L70.5: BTC has NO tradeable edge — even SHORT-only fails
- P#69 LONGs: negative. P#70 SHORT-only: still PF 0.313
- Walk-forward confirms: PF 0.823 → 0.000
- **Accept and disable — no amount of filtering fixes zero edge.**

### L70.6: BNB edge is stochastic, not structural
- Full-period with lower conf floor: PF 1.883 (best ever!)
- Walk-forward: both splits negative
- **BNB profits are period-dependent. Don't deploy with significant allocation.**

### L70.7: Lower confidence floor = more trades but not always better quality
- BNB conf 0.25→0.22: trades 30→61 (+103%), PF 1.714→1.883 in full-period
- But walk-forward shows this extra volume doesn't have real edge
- **More trades ≠ better system. Always validate with walk-forward.**

### L137.1: DuckDB cannot be shared between multiple processes
- 5 bot instances all opened `./data/analytics.duckdb` → only first succeeds, rest get `Connection Error`
- DuckDB uses exclusive file locking — embedded DB, not a server
- **Fix: per-symbol DB files (`analytics_btcusdt.duckdb`, etc.) using TRADING_SYMBOL env var**

### L137.2: Dashboard aggregation must handle nested response structures
- `/health` returns `{ components: {...} }` (flat)
- `/api/status` returns `{ health: { components: {...} } }` (nested under health)
- `aggregateHealth()` only checked flat path → components always empty in dashboard status
- **Always write helper functions that check multiple response shapes when aggregating from different endpoints**

### L137.3: Default INITIAL_CAPITAL was $1,000
- `config.js` defaults to `parseFloat(process.env.INITIAL_CAPITAL || '1000')`
- Without explicit env var, each bot started with $1,000 instead of intended $10,000
- **Always set explicit env vars for financial parameters — never rely on code defaults**

### L137.4: Promoted bundle redirects state files to runtime sandbox
- `promotion-bundle.js` sets `TURBO_BUNDLE_STATE_FILE` and `TURBO_BUNDLE_NEURON_STATE_PATH` to runtime sandbox paths
- State files in `artifacts/runtime_sandbox/<bundle_id>/` NOT in `data/`
- Cleaning `data/*.json` has NO effect when promoted bundle is active
- **When wiping state: always check AND clean the bundle's runtime sandbox directory too**

### L137.5: All 5 bot instances shared single state file — architectural bug
- `bot_state.json` and `neuron_ai_state.json` written by all 5 bots to same path
- Race condition: last writer wins, all bots get same portfolio/PnL data
- Fixed: per-instance paths using `INSTANCE_ID` env var (`bot_state_btc-live.json`, etc.)
- **Multi-instance bots MUST have per-instance state isolation from day one**

### L138: TURBO_BUNDLE_NEURON_STATE_PATH overrode per-instance suffix (P#159)
- Promotion bundle system set a single shared path for ALL instances → `instanceSuffix` logic was dead code
- **Env var overrides MUST respect per-instance isolation if INSTANCE_ID is set**

### L139: Persist ALL time-based reset timestamps (P#159B)
- `dailyTradeCount` was persisted but `lastTradeDayReset` was NOT
- After PM2 restart: constructor set `lastTradeDayReset=Date.now()` → 24h check always FALSE → stale count (19) stayed
- **If you persist a counter with a time-based reset, ALWAYS persist the reset timestamp too**

### L140: Dual counters in LLM prompt cause hallucination (P#159C)
- NeuronAI `consecutiveLosses` (4) and Skynet `consecutiveLosses` (8) both appeared in prompt without labels
- LLM picked the higher number and wrote "8 consecutive losses" in personality text
- **Never send ambiguous duplicate metrics to LLM — label clearly or deduplicate**

### L189.1: TP=4.0×ATR unreachable on BTC 15m — real R:R was ≈0.8 (P#189)
- 4.0 ATR = ~$2,400 continuous move on BTC; only ~15% of trades reached it
- Most trades closed via trailing SL at 1.5-2.0 ATR → R:R worse than SL distance
- **Fix: TP_ATR_MULT=2.5, PARTIAL_TP L1=1.5, L2=2.5 — achievable and still RR≥2.5**

### L189.2: Single 70/30 walk-forward split is statistically meaningless (P#189)
- One lucky OOS window can make a curve-fitted system appear robust
- Advisory Board minimum: 5 expanding OOS windows to catch regime-dependent over-fit
- **Fix: WALK_FORWARD_WINDOWS=5, WALK_FORWARD_TRAIN_PCT=0.75 — need 3/5 windows profitable for ROBUST verdict**

### L189.3: Correlated strategy ensemble causes mutual signal cancellation (P#189)
- Trend-following (MomentumHTF) + mean-reversion (BollingerMR/GridV2) active simultaneously
- Opposing signals reduce ensemble confidence below entry floor → 0 trades in mixed regimes
- **Fix: STRATEGY_ROUTING per regime — activate trend strategies in TRENDING, grid in RANGING**

### L189.4: MomentumHTF firing on weak ADX=20 catches ranging markets (P#189)
- ADX 20 is the minimum threshold for any directional bias — not strong trending
- Vol_ratio 1.2× is barely above average — not a volume surge confirming trend
- **Fix: MTF_ADX_MIN=28, MTF_VOL_CONFIRM=2.0× — only fire in strong, volume-confirmed trends**

### L189.5: Grid V2 on BTC gets stopped out by wicks (P#189)
- BTC 15m wick size often 0.4-0.8 ATR → Grid SL=0.60×ATR hit routinely by noise
- Grid mean-reversion works better on lower-volatility altcoins (ETH/SOL/BNB/XRP)
- **Fix: GRID_V2_ENABLED_PAIRS excludes BTCUSDT; PAIR_STRATEGY_MAP routes BTC to momentum-only**

## 2026-03-19: PATCH #190 — Port 4000→4001 Migration (Windows AV DPI Bypass)

### L190.1: Windows antivirus Deep Packet Inspection silently kills HTTP on loopback port 4000
TCP handshake succeeds in ~15ms but raw HTTP bytes sent through the socket receive empty response after timeout. This is NOT a Python, urllib, proxy, or firewall issue. Port 4001 works perfectly. All pipeline defaults changed from 4000 to 4001.

### L190.2: Layered socket diagnostics are essential for Windows networking issues
test-gpu-connection.py v3 (6-layer: TCP→RAW HTTP→http.client→urllib ping/health/qmc) pinpointed the exact failure layer: TCP OK but RAW HTTP dead. Without this, debugging would have gone in circles blaming Python or proxies.

## 2026-03-27: PATCH #198–198.5 — ML Pipeline Full Activation

### L198.1: argparse `default=True` with `action='store_true'` is a silent killer
`parser.add_argument('--strategy-only', action='store_true', default=True)` — ALWAYS True regardless of command line. Every backtest since P#193 ran without ML. Caught only after 5 patches of "why isn't XGBoost training?". **Rule: Never set default=True for store_true args. If you want True default, use store_false + negated flag.**

### L198.2: XGBoost CV 0.45–0.51 = coin flip, quality gate is critical
First real ML backtest showed ALL models below 0.55 gate (0.449–0.510). Without quality gate in engine.py, ML would have freely vetoed profitable trades. The gate prevented most damage but 3 spurious vetoes during temporary CV spikes still cost $15.55. **Lesson: Quality gate must check CURRENT cv_scores at prediction time, not just at training time.**

### L198.3: learn_from_trade() must be wired to ALL ML engines
engine.py called `self.ml.learn_from_trade()` (heuristic) but forgot `self.xgb_ml` and `self.mlp_gpu`. Result: `trades_evaluated=0`, no accuracy tracking, no feedback loop. **Rule: When adding a new ML engine, grep for all feedback hooks (learn_from_trade, record_trade) and wire them.**

### L198.4: Strategy-only ($731.63) > Full ML ($702.70) — ML is currently net negative
XGBoost models on crypto 1h/4h with 43 features achieve ~50% accuracy — no better than random. Current dataset may be too noisy or features insufficiently informative. ML R&D needed: feature engineering (funding rates, order book depth, cross-pair correlation), longer training windows, alternative models.

### L198.5: Monte Carlo p=0.06 with 45 trades = borderline
Need ~60+ trades for p<0.05 statistical significance. Win rate IS significant (p=0.0012) but PnL isn't yet. More trading days or more pairs needed. Funding ARB ($599/731 = 82%) is the real profit engine — directional is supplementary.

## 2026-03-29: PATCH #210 — Post-Board5 Backtest Regression Fixes

### L210.1: PHASE_2_BE_R 1.0→1.3 is catastrophic for grid trades with maxR 1.0-1.3
Board5 Advisory recommended 1.3R to "avoid premature BE" but real data shows: 6/17 BNB 15m trades (35%) had maxR in the 1.0-1.3 dead zone. These trades DEPENDED on BE at 1.0R for protection. Raising it to 1.3R turned 4 winners into losers. **Rule: Never change BE threshold without checking maxR distribution of existing trades. The "dead zone" between old and new BE is a kill zone.**

### L210.2: Global enable flags without per-pair guards are dangerous
DIRECTIONAL_15M_ENABLED=True was meant for BNB 15m grid, but SOL didn't have DIRECTIONAL_ENABLED:False. Result: SOL 15m got unwanted MomentumHTF trades. **Rule: When enabling a global flag, check ALL pairs for missing per-pair guards. If 3/5 pairs have the guard and 2 don't, the 2 will get unintended behavior.**

### L210.3: Confidence floor changes must be validated per-pair, not per-TF
Lowering 1h confidence floor from 0.45→0.25 (P#203b) was intended to unblock directional pipeline for profitable pairs. Instead it unblocked 11 garbage BNB 1h signals (conf=0.15→0.25 range). **Rule: Confidence floors should be set per-pair-TF, not just per-TF. Different pairs have wildly different sentiment/confidence distributions.**

### L210.4: Funding ARB is the real profit engine — protect it at all costs
PRE vs POST: FundArb changed by only -$0.71 while TradePnL changed by -$89.59. Funding ARB generates $636/backtest (82% of total) and is immune to Board5 parameter changes. **Rule: Directional/grid trading is a risky supplement. Don't break funding-only pairs by exposing them to untested directional signals.**

### L210.5: Always run A/B comparison with the MOST RECENT complete baseline
The pre-Board5 baseline (20260328_192039) was essential for isolating regressions. Without it, the +$581 total would look acceptable. Only the -$90 delta revealed the damage. **Rule: Always keep the last known-good backtest for comparison. Tag it in git.**

## 2026-03-30: P#211 — Trade Profitability Structural Overhaul

### L211.1: Only 1/15 pair×TF slots has proven trading alpha — scale the winner, kill the losers
Historical scan of 5 complete backtests: SOL 1h is the ONLY slot with consistent profitability (4/4 positive, avg PF=1.754). BNB 1h lost money in 4/4 runs (PF=0.504). **Rule: When only ONE slot generates alpha, redirect capital and risk to it aggressively. Don't diversify across losing slots.**

### L211.2: 15m grid trading is structurally disadvantaged by fee economics
15m candles produce avg moves of 0.235% — fees eat 29.8% of each move. On 1h, avg moves are 0.790% with only 8.9% fee drag (3.3× better economics). **Rule: Grid V2 on 15m timeframes requires exceptionally tight SL or exceptionally wide TP to overcome the fee drag. Default to 1h for grid strategies.**

### L211.3: Fees consuming >50% of gross profit is a RED FLAG for strategy viability
Across PRE-Board5 baseline: GROSS=$70.15, FEES=$35.60 (50.7%). When fees eat more than 1/3 of gross, the strategy has no real edge — it's trading noise. **Rule: Track fee/gross ratio per slot. If >40%, the slot is either marginal or losing. If >60%, disable it.**

### L211.4: Capital allocation must follow proven alpha, not historical labels
BNB was labeled "ROBUST" from a single walk-forward test (P#72, PF=2.484) and given 40% allocation. But across 5 backtests, BNB 1h was 0/4 positive. Labels get stale. **Rule: Re-evaluate pair allocation every 10 backtest runs using multi-run consistency, not single-test PF.**

### L211.5: Funding ARB generates 92% of all profit — trading supplements it, not the other way around
Of $671 total/backtest, $636 is funding (94.7%). Trading contributes +$34 at best. Accept this reality: the bot is primarily a funding arbitrage system with supplemental grid/directional trading. **Scale trading only where alpha is PROVEN (SOL 1h), park capital in funding everywhere else.**

## 2026-03-30: P#212 — Wire Dead Strategies into Live Bot

### L212.1: DEAD CODE — 3 complete strategies were NEVER wired into bot.js
`grid-v2.js` (281 lines), `funding-rate-arb.js` (330 lines), `momentum-htf-ltf.js` (338 lines) existed as fully implemented strategy files but were never `require()`d or instantiated in bot.js. The live bot only ran 5 old ensemble strategies. **Rule: After writing a new strategy file, ALWAYS verify it's imported AND instantiated in the main orchestrator (bot.js). Add a startup log line that confirms the strategy is active.**

### L212.2: Price data must match the symbol being evaluated — NEVER share cross-pair
Grid V2 was evaluating BNB/SOL conditions using BTCUSDT price data (RSI, BB, ADX, ATR all from BTC). This is completely meaningless — BTC ranging doesn't mean BNB is ranging. **Rule: EVERY independent strategy evaluation MUST use per-pair candle data. Implement a `_getPairData(sym)` helper with caching (5-min OKX refresh) and log a WARNING if falling back to main-symbol data.**

### L212.3: Indicator calculation should use canonical module functions, not inline reimplementation
The original P#212 indicator block reimplemented ADX with a rough estimation instead of using `indicators.calculateRealADX()`. The indicators module already has `calculateRealADX`, `calculateBollingerBands`, `calculateSMA`, `calculateMACD`. **Rule: Always check the indicators module first. If a function exists there, use it.**

### L212.4: Strategies BYPASSING ensemble need their own rate limits
Grid V2 and Funding Rate fire independently of ensemble voting, QDV verification, and NeuronAI gates. Without the 10+ safety gates, they could fire too aggressively. **Mitigant: Grid V2 has built-in cooldown (8h BNB, 5h SOL), daily trade limits, and ADX gates. Momentum has 6h cooldown and max 3/day.** Monitor live trade frequency closely after deployment.

## 2026-03-30: P#213 — Safety Gate Reduction + Multi-Pair Ensemble + Execution Audit

### L213.1: Safety gates that block each other create confidence death spirals, not safety
12 gates stacked: Override → Defense → Starvation Override → QDV Block → QDV Starvation. Each gate tried to fix the previous one's over-blocking. Net result: zero trades, infinite starvation cycles. **Rule: A safety gate should ADJUST confidence, never NULLIFY consensus. If you need a "starvation override" to undo a gate, the gate itself is broken.**

### L213.2: The entire execution engine is in-memory paper trading — no real orders
`execution-engine.js` → `pm.openPosition()` → JS Map update. Zero OKX API calls. `okx_execution_engine.js` EXISTS (371 lines, `POST /api/v5/trade/order`) but is NEVER imported. `paperTrading`/`enableLiveTrading` config flags are DEFINED but NEVER CHECKED. **The bot has been paper trading since inception regardless of config.** To go live: import + wire `okx_execution_engine.js` into execution engine, add `paperTrading` flag check.

### L213.3: Advisory gates are superior to blocking gates — same protection, no starvation
Replacing 3 blocking Skynet gates with confidence penalties (30-50%) and QDV block→20% penalty preserves the protective signal while allowing the fee gate ($profit > 1.5× fees) to be the real filter. Advisory adjustments stack naturally — if Skynet + QDV + Defense all penalize, confidence drops enough that the fee gate kills marginal trades. **Rule: Use multiplicative confidence penalties instead of hard blocks. Let the fee gate handle the final go/no-go.**

### L213.4: Multi-pair ensemble requires symbol override — strategies hardcode config.symbol
`strategies.runAll(pairCandles)` analyzes the pair's data correctly but outputs `{ symbol: 'BTCUSDT' }` because each strategy reads `this.config.symbol`. Must override `signal.symbol = actualPair` on all returned signals before voting and execution. **Rule: When reusing strategies across pairs, always patch the symbol in the output signals.**

## 2026-03-31: P#214 — Wire OKX Execution Engine

### L214.1: Dual-mode execution requires 3 independent flags to prevent accidental live trading
A single `enableLiveTrading=true` is not enough — you also need `paperTrading=false` AND valid OKX credentials. Triple-flag design prevents one misconfigured env var from sending real orders. **Rule: For irreversible actions (real money orders), require N≥3 independent enablement conditions.**

### L214.2: Exchange order MUST execute BEFORE portfolio update — never the reverse
If `pm.openPosition()` runs first and then OKX rejects the order, the in-memory portfolio shows a position that doesn't exist on the exchange. Always: exchange API first → if success → update portfolio. If exchange fails → abort entirely. **Rule: External state changes first, internal state second.**

## 2026-03-31: P#215 — Multi-Pair Skynet Prime

### L215.1: LLM target_symbol already existed in the prompt schema but was never used
The NeuronAI prompt requested `"target_symbol": "BTCUSDT"` in the JSON response schema, but bot.js never read `details.target_symbol`. The LLM could technically return any symbol, but the code always used `this.config.symbol`. **Rule: After adding a field to an LLM prompt schema, ALWAYS wire the response field into the calling code.**

## 2026-03-31: P#217 — Final Comprehensive Backtest

### L217.1: Backtest config drift is invisible — always audit parity after live-bot patches
P#216 changed 7 parameters in the JS live bot, but the Python backtest config.py still had old values. Without explicit parity check, backtest results would diverge from live behavior. **Rule: Every live-bot parameter change MUST have a corresponding backtest config update in the same commit.**

### L217.2: data_downloader.py SuperTrend was wrong but masked by fetch_historical.py
The data_downloader.py had a simplified SuperTrend (mult=2, no Wilder, no band continuity) — but the CSV data was actually generated by fetch_historical.py with correct SuperTrend (mult=3). The bug was hidden because a different code path produced the data. **Rule: When multiple data pipelines exist, verify which one ACTUALLY generated the production data.**

### L217.3: Strategy attribution in trade tables is essential for debugging
Without strategy columns in the winning/losing trade output, it's impossible to know which strategy generated each trade. Adding "Strategy" and "Regime" columns immediately revealed that all SOL 1h trades were GridV2 (no ensemble directional traded). **Rule: Always include strategy attribution in trade-level reporting.**
