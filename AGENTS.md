# Turbo-Bot Agent Operating Manual

This file is the canonical local source of truth for agent workflow, skills, prompt evaluation, and AI observability.

## Mission

- Optimize for real trading expectancy, not decorative complexity.
- Treat architectural clarity as a production requirement.
- Fix root causes before adding new control layers.
- Verify every meaningful change with code checks, tests, logs, or backtests.

## Canonical Sources

- `AGENTS.md`: workflow contract and operating rules.
- `skills/*.md`: role definitions and execution patterns.
- `.github/prompts/*.prompt.md`: reusable prompt entrypoints that mirror the skill set.
- `promptfoo/*`: prompt and decision regression suite.
- `observability/openlit/*`: local self-hosted AI observability stack.

If two files disagree, prefer this order: `AGENTS.md` -> runtime code -> prompts -> historical docs.

## Decision Ownership

- `trading-bot/src/modules/bot.js` is the runtime orchestrator.
- `trading-bot/src/core/ai/neuron_ai_manager.js` is the autonomous decision layer over ensemble, ML, and market context.
- `trading-bot/src/core/ai/megatron_system.js` handles operator chat, routing, and provider failover.
- `ml-service/ml_service.py` is the Python ML validation and prediction surface.

Avoid reintroducing multiple files that each claim to be the sole "brain" of the system.

## Skill Routing

Use these files as the stable skill map:

- `#00-meta-orchestrator`
- `#01-skill-router`
- `#02-skynet-architect`
- `#03-quantum-engineer`
- `#04-execution-optimizer`
- `#05-risk-quant`
- `#06-prompt-engineer`
- `#07-trading-strategist`
- `#08-code-reviewer`
- `#09-system-debugger`
- `#10-performance-memory`
- `#11-backtest-validator`

## Minimum Workflow

1. Start with meta-orchestration and decide which skills are actually needed.
2. Inspect the live code path before changing prompts or instructions.
3. Keep prompt changes coupled to an eval in `promptfoo/` when behavior matters.
4. Keep observability opt-in via environment flags so local development is not slowed down by default.
5. Update `PATCHES.md` and `tasks/lessons.md` after material fixes.

## Promptfoo Contract

- `promptfoo/prompts/` stores reusable prompt templates.
- `promptfoo/providers/` stores local JS providers for deterministic evals.
- `promptfoo/tests/` stores regression cases.
- Main entrypoint: `promptfoo/promptfooconfig.yaml`.

Default local command:

```bash
npm run ai:promptfoo:eval
```

## OpenLIT Contract

- Local stack files live in `observability/openlit/`.
- Node bootstrap lives in `trading-bot/src/core/observability/openlit_bootstrap.js`.
- Python bootstrap lives in `ml-service/openlit_config.py`.
- Runtime instrumentation is disabled unless `OPENLIT_ENABLED=true`.

Recommended local variables:

```env
OPENLIT_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
OTEL_SERVICE_NAME=turbo-bot
OTEL_DEPLOYMENT_ENVIRONMENT=development
```

## Guardrails

- Do not add parallel instruction systems when a canonical file can be updated.
- Do not add prompt tooling without at least one deterministic regression case.
- Do not enable tracing by default in production configs without explicit env wiring.
- Do not change decision semantics without auditing fee gates, drawdown gates, and direction symmetry.