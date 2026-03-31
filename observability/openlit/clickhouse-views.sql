-- Turbo-Bot AI Observability — ClickHouse Analytical Views
-- Run once after stack init: docker exec turbo-bot-openlit-clickhouse clickhouse-client --user=default --password=OPENLIT --multiquery < clickhouse-views.sql

-- View 1: AI Decision Summary
CREATE VIEW IF NOT EXISTS default.v_ai_decisions AS
SELECT
    SpanName,
    ServiceName,
    SpanAttributes['ai.decision.action'] AS action,
    SpanAttributes['ai.decision.confidence'] AS confidence,
    SpanAttributes['ai.decision.source'] AS source,
    SpanAttributes['ai.decision.isOverride'] AS is_override,
    SpanAttributes['ai.llm.provider'] AS llm_provider,
    SpanAttributes['ai.llm.latencyMs'] AS llm_latency_ms,
    Duration / 1000000 AS duration_ms,
    Timestamp
FROM default.otel_traces
WHERE SpanName IN ('neuron.makeDecision', 'llm.router.call', 'llm.provider.github', 'llm.provider.openai', 'llm.provider.claude', 'llm.provider.ollama')
ORDER BY Timestamp DESC;

-- View 2: Trading Cycle Overview
CREATE VIEW IF NOT EXISTS default.v_trading_cycles AS
SELECT
    TraceId,
    SpanName,
    SpanAttributes['ai.cycle.consensus'] AS consensus,
    SpanAttributes['ai.cycle.confidence'] AS confidence,
    SpanAttributes['ai.cycle.positionCount'] AS positions,
    SpanAttributes['ai.cycle.number'] AS cycle_number,
    Duration / 1000000 AS duration_ms,
    Timestamp
FROM default.otel_traces
WHERE SpanName = 'trading.cycle'
ORDER BY Timestamp DESC;

-- View 3: Ensemble + Quantum per cycle
CREATE VIEW IF NOT EXISTS default.v_ensemble_quantum AS
SELECT
    TraceId,
    SpanName,
    SpanAttributes['ai.payload.action'] AS action,
    SpanAttributes['ai.payload.confidence'] AS confidence,
    SpanAttributes['ai.payload.regime'] AS regime,
    SpanAttributes['ai.payload.signalCount'] AS signal_count,
    SpanAttributes['ai.payload.hasWeightRecommendation'] AS quantum_active,
    Timestamp
FROM default.otel_traces
WHERE SpanName IN ('ai.telemetry.ensemble_vote', 'ai.telemetry.quantum_boost')
ORDER BY Timestamp DESC;

-- View 4: LLM Provider Performance
CREATE VIEW IF NOT EXISTS default.v_llm_performance AS
SELECT
    SpanName,
    SpanAttributes['ai.llm.provider'] AS provider,
    SpanAttributes['ai.llm.model'] AS model,
    SpanAttributes['ai.llm.status'] AS status,
    SpanAttributes['ai.llm.responseLength'] AS response_length,
    Duration / 1000000 AS duration_ms,
    StatusCode,
    Timestamp
FROM default.otel_traces
WHERE SpanName LIKE 'llm.%'
ORDER BY Timestamp DESC;

-- View 5: ML Service Predictions
CREATE VIEW IF NOT EXISTS default.v_ml_predictions AS
SELECT
    SpanAttributes['ai.payload.direction'] AS direction,
    SpanAttributes['ai.payload.confidence'] AS confidence,
    SpanAttributes['ai.payload.should_trade'] AS should_trade,
    SpanAttributes['ai.payload.inference_ms'] AS inference_ms,
    SpanAttributes['ai.payload.regime'] AS regime,
    SpanAttributes['ai.payload.model_trained'] AS model_trained,
    Timestamp
FROM default.otel_traces
WHERE SpanName = 'ai.telemetry.ml_prediction'
ORDER BY Timestamp DESC;

-- View 6: Trade Learning & Evolution
CREATE VIEW IF NOT EXISTS default.v_trade_learning AS
SELECT
    SpanAttributes['ai.payload.pnl'] AS pnl,
    SpanAttributes['ai.payload.totalPnL'] AS total_pnl,
    SpanAttributes['ai.payload.winRate'] AS win_rate,
    SpanAttributes['ai.payload.riskMultiplier'] AS risk_multiplier,
    SpanAttributes['ai.payload.outcome'] AS outcome,
    SpanAttributes['ai.payload.strategy'] AS strategy,
    Timestamp
FROM default.otel_traces
WHERE SpanName = 'ai.telemetry.neuron_learn_trade'
ORDER BY Timestamp DESC;

-- Useful ad-hoc queries:
-- Full trace tree for latest cycle:
-- SELECT SpanName, TraceId, SpanId, ParentSpanId, Duration/1000000 as ms FROM otel_traces WHERE TraceId = (SELECT TraceId FROM otel_traces WHERE SpanName='trading.cycle' ORDER BY Timestamp DESC LIMIT 1) ORDER BY Timestamp;
--
-- Span count by type (last 24h):
-- SELECT SpanName, count() FROM otel_traces WHERE Timestamp > now() - INTERVAL 24 HOUR GROUP BY SpanName ORDER BY count() DESC;
--
-- Average cycle duration:
-- SELECT avg(Duration/1000000) as avg_ms, max(Duration/1000000) as max_ms FROM otel_traces WHERE SpanName='trading.cycle';
