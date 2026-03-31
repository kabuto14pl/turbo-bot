#!/bin/bash
set -e

CLICKHOUSE_DATABASE="${CLICKHOUSE_DATABASE:-default}"

clickhouse-client --query "CREATE DATABASE IF NOT EXISTS ${CLICKHOUSE_DATABASE}"

clickhouse-client --database="${CLICKHOUSE_DATABASE}" --query "
CREATE TABLE IF NOT EXISTS otel_traces (
    Timestamp DateTime64(9),
    TraceId String,
    SpanId String,
    ParentSpanId String,
    TraceState String,
    SpanName LowCardinality(String),
    SpanKind LowCardinality(String),
    ServiceName LowCardinality(String),
    ResourceAttributes Map(LowCardinality(String), String),
    ScopeName String,
    ScopeVersion String,
    SpanAttributes Map(LowCardinality(String), String),
    Duration UInt64,
    StatusCode LowCardinality(String),
    StatusMessage String,
    Events Nested (
        Timestamp DateTime64(9),
        Name LowCardinality(String),
        Attributes Map(LowCardinality(String), String)
    ),
    Links Nested (
        TraceId String,
        SpanId String,
        TraceState String,
        Attributes Map(LowCardinality(String), String)
    )
) ENGINE = MergeTree
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, SpanName, Timestamp)
TTL toDateTime(Timestamp) + toIntervalDay(30)
SETTINGS ttl_only_drop_parts = 1
"

clickhouse-client --database="${CLICKHOUSE_DATABASE}" --query "
CREATE TABLE IF NOT EXISTS otel_logs (
    Timestamp DateTime64(9),
    TraceId String,
    SpanId String,
    SeverityText LowCardinality(String),
    SeverityNumber UInt8,
    ServiceName LowCardinality(String),
    Body String,
    ResourceAttributes Map(LowCardinality(String), String),
    LogAttributes Map(LowCardinality(String), String)
) ENGINE = MergeTree
PARTITION BY toDate(Timestamp)
ORDER BY (ServiceName, Timestamp)
TTL toDateTime(Timestamp) + toIntervalDay(30)
SETTINGS ttl_only_drop_parts = 1
"

clickhouse-client --database="${CLICKHOUSE_DATABASE}" --query "
CREATE TABLE IF NOT EXISTS otel_metrics_gauge (
    ResourceAttributes Map(LowCardinality(String), String),
    ScopeName String,
    ScopeVersion String,
    MetricName String,
    MetricDescription String,
    Attributes Map(LowCardinality(String), String),
    StartTimeUnix DateTime64(9),
    TimeUnix DateTime64(9),
    Value Float64
) ENGINE = MergeTree
PARTITION BY toDate(TimeUnix)
ORDER BY (MetricName, TimeUnix)
TTL toDateTime(TimeUnix) + toIntervalDay(30)
SETTINGS ttl_only_drop_parts = 1
"

clickhouse-client --database="${CLICKHOUSE_DATABASE}" --query "
CREATE TABLE IF NOT EXISTS otel_metrics_sum (
    ResourceAttributes Map(LowCardinality(String), String),
    ScopeName String,
    ScopeVersion String,
    MetricName String,
    MetricDescription String,
    Attributes Map(LowCardinality(String), String),
    StartTimeUnix DateTime64(9),
    TimeUnix DateTime64(9),
    Value Float64,
    Flags UInt32
) ENGINE = MergeTree
PARTITION BY toDate(TimeUnix)
ORDER BY (MetricName, TimeUnix)
TTL toDateTime(TimeUnix) + toIntervalDay(30)
SETTINGS ttl_only_drop_parts = 1
"