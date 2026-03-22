# Host Promoted Bundle Deploy

This runbook prepares the minimal live runtime update needed so the VPS bot starts from the approved promoted bundle `remote_gpu_full_20260309_154224_approved`.

## Deploy Scope

Minimum live runtime files:

- `ecosystem.config.js`
- `trading-bot/src/modules/promotion-bundle.js`
- `trading-bot/src/modules/config.js`
- `trading-bot/src/modules/bot.js`
- `trading-bot/src/core/ai/adaptive_neural_engine.js`
- `trading-bot/src/core/ai/neuron_ai_manager.js`

Required promoted artifacts:

- `artifacts/promoted/current.json`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/bundle.json`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/aggregate_manifest.json`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/promotion_gate.json`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/ml-service-models/latest.json`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/ml-service-models/turbo_4h_xgb_clf_20260301_185303.json`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/ml-service-models/turbo_4h_lgb_clf_20260301_185303.pkl`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/ml-service-models/turbo_4h_xgb_reg_20260301_185303.json`
- `artifacts/promoted/remote_gpu_full_20260309_154224_approved/ml-service-models/turbo_4h_meta_20260301_185303.json`

Optional governance files if the host should also be able to write future bundles locally:

- `ml-service/backtest_pipeline/promotion_bundle.py`
- `ml-service/backtest_pipeline/remote_gpu_promotion_gate.py`
- `run-remote-gpu-promotion-gate.ps1`

## Manual Transfer Example

Run these from the local repo root on the machine that has SSH access to the VPS:

```bash
rsync -av ecosystem.config.js root@64.226.70.149:/root/turbo-bot/ecosystem.config.js
rsync -av trading-bot/src/modules/promotion-bundle.js root@64.226.70.149:/root/turbo-bot/trading-bot/src/modules/promotion-bundle.js
rsync -av trading-bot/src/modules/config.js root@64.226.70.149:/root/turbo-bot/trading-bot/src/modules/config.js
rsync -av trading-bot/src/modules/bot.js root@64.226.70.149:/root/turbo-bot/trading-bot/src/modules/bot.js
rsync -av trading-bot/src/core/ai/adaptive_neural_engine.js root@64.226.70.149:/root/turbo-bot/trading-bot/src/core/ai/adaptive_neural_engine.js
rsync -av trading-bot/src/core/ai/neuron_ai_manager.js root@64.226.70.149:/root/turbo-bot/trading-bot/src/core/ai/neuron_ai_manager.js
rsync -av artifacts/promoted/current.json root@64.226.70.149:/root/turbo-bot/artifacts/promoted/current.json
rsync -av artifacts/promoted/remote_gpu_full_20260309_154224_approved/ root@64.226.70.149:/root/turbo-bot/artifacts/promoted/remote_gpu_full_20260309_154224_approved/
```

If you also want host-side bundle governance tools:

```bash
rsync -av ml-service/backtest_pipeline/promotion_bundle.py root@64.226.70.149:/root/turbo-bot/ml-service/backtest_pipeline/promotion_bundle.py
rsync -av ml-service/backtest_pipeline/remote_gpu_promotion_gate.py root@64.226.70.149:/root/turbo-bot/ml-service/backtest_pipeline/remote_gpu_promotion_gate.py
rsync -av run-remote-gpu-promotion-gate.ps1 root@64.226.70.149:/root/turbo-bot/run-remote-gpu-promotion-gate.ps1
```

## Host Validation Before PM2 Restart

Run on the VPS after transfer:

```bash
cd /root/turbo-bot
test -f artifacts/promoted/current.json
test -f artifacts/promoted/remote_gpu_full_20260309_154224_approved/bundle.json
grep -n 'REQUIRE_PROMOTED_BUNDLE\|PROMOTED_BUNDLE_POINTER' ecosystem.config.js
node - <<'NODE'
const config = require('./trading-bot/src/modules/config').loadConfig();
console.log(JSON.stringify({
  bundleId: config.promotedBundle && config.promotedBundle.bundleId,
  stateFile: config.stateFile,
  requirePromotedBundle: config.requirePromotedBundle,
}, null, 2));
NODE
```

Expected result:

- `bundleId` = `remote_gpu_full_20260309_154224_approved`
- `requirePromotedBundle` = `true`
- `stateFile` points into `artifacts/runtime_sandbox/remote_gpu_full_20260309_154224_approved/`

## Why These Files Matter

- `ecosystem.config.js` forces PM2 to require an approved bundle pointer.
- `promotion-bundle.js` resolves the active pointer and exports the runtime bundle environment.
- `config.js` merges bundle overrides and exposes bundle-aware state paths.
- `bot.js` consumes the bundle-aware state location.
- `adaptive_neural_engine.js` and `neuron_ai_manager.js` keep operational learning in the runtime sandbox instead of mutating the promoted baseline.
- `artifacts/promoted/...` is the immutable approved baseline consumed by live runtime.