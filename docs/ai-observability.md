# AI Tooling Runbook

## Canonical Flow

- Agent workflow contract: `AGENTS.md`
- Prompt regressions: `promptfoo/promptfooconfig.yaml`
- Local observability stack: `observability/openlit/docker-compose.yml`

## Promptfoo

Run deterministic Neuron decision regressions:

```bash
npm install
npm run ai:promptfoo:eval
```

Open the latest eval UI:

```bash
npm run ai:promptfoo:view
```

Current suite intentionally tests the fallback decision layer first, because it is deterministic and catches architectural drift before LLM-provider noise is introduced.

## OpenLIT

Start the local stack:

```bash
docker compose -f observability/openlit/docker-compose.yml up -d
```

The local compose file uses the official public image `ghcr.io/openlit/openlit:latest`.
That container already exposes the OTLP receivers on ports `4317` and `4318`, so a separate standalone collector is not required for the default local setup.

Then enable instrumentation in the bot or ML service:

```env
OPENLIT_ENABLED=true
OTEL_EXPORTER_OTLP_ENDPOINT=http://127.0.0.1:4318
OTEL_SERVICE_NAME=turbo-bot
OTEL_DEPLOYMENT_ENVIRONMENT=development
```

Open the UI at `http://127.0.0.1:3000`.

## Notes

- Node bootstrap is opt-in and safe to leave disabled.
- Python bootstrap is also opt-in and will not fail service start if OpenLIT is unavailable.
- The local collector config must stay compatible with the collector version embedded in the current OpenLIT image. If OTLP `4318` resets connections, inspect `/app/client/data/supervisor-storage/agent.log` and `/app/client/data/supervisor-storage/effective.yaml` inside the container.
- The current Node runtime mostly uses raw HTTP/provider flows, so `emitAiTelemetry()` now emits both the existing JSON log line and a short manual OTel span (`ai.telemetry.*`) to guarantee visible traces in OpenLIT.