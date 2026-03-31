"""OpenLIT bootstrap helpers for Turbo-Bot Python services."""

import json
import logging
import os
from contextlib import contextmanager

logger = logging.getLogger(__name__)
_OPENLIT_INITIALIZED = False


def _env_enabled(name: str, default: str = "false") -> bool:
    return os.getenv(name, default).strip().lower() in {"1", "true", "yes", "on"}


def bootstrap_openlit(application_name: str) -> bool:
    global _OPENLIT_INITIALIZED

    if _OPENLIT_INITIALIZED or not _env_enabled("OPENLIT_ENABLED"):
        return False

    try:
        import openlit
    except ImportError:
        logger.warning("OpenLIT bootstrap skipped: package not installed")
        return False

    try:
        openlit.init(
            environment=os.getenv("OTEL_DEPLOYMENT_ENVIRONMENT", os.getenv("ENVIRONMENT", "development")),
            application_name=application_name,
            service_name=os.getenv("OTEL_SERVICE_NAME", application_name),
            otlp_endpoint=os.getenv("OTEL_EXPORTER_OTLP_ENDPOINT"),
            disable_batch=_env_enabled("OPENLIT_DISABLE_BATCH"),
            capture_message_content=_env_enabled("OPENLIT_CAPTURE_MESSAGE_CONTENT"),
            collect_gpu_stats=_env_enabled("OPENLIT_COLLECT_GPU_STATS"),
            collect_system_metrics=_env_enabled("OPENLIT_COLLECT_SYSTEM_METRICS"),
        )
        _OPENLIT_INITIALIZED = True
        logger.info("OpenLIT enabled for %s", application_name)
        return True
    except Exception as exc:
        logger.warning("OpenLIT bootstrap failed: %s", exc)
        return False


def _safe_attr(value):
    """Convert a value to an OTel-safe attribute type."""
    if isinstance(value, (str, int, float, bool)):
        return value
    try:
        return json.dumps(value, default=str)
    except Exception:
        return str(value)


def emit_ai_telemetry(event_name: str, payload: dict = None):
    """Emit a lightweight OTel span for an AI telemetry event."""
    if not _OPENLIT_INITIALIZED:
        return
    try:
        from opentelemetry import trace
        tracer = trace.get_tracer("turbo-bot-ml-telemetry")
        with tracer.start_as_current_span(f"ai.telemetry.{event_name}") as span:
            span.set_attribute("ai.event.name", event_name)
            span.set_attribute("ai.service.name",
                               os.getenv("OTEL_SERVICE_NAME", "turbo-bot-ml-service"))
            for k, v in (payload or {}).items():
                attr = _safe_attr(v)
                if attr is not None:
                    span.set_attribute(f"ai.payload.{k}", attr)
    except Exception:
        pass  # telemetry must never break runtime


@contextmanager
def ai_span(span_name: str, attributes: dict = None):
    """Context-manager that wraps a block in a named OTel span."""
    if not _OPENLIT_INITIALIZED:
        yield None
        return
    try:
        from opentelemetry import trace
        from opentelemetry.trace import StatusCode
        tracer = trace.get_tracer("turbo-bot-ml-telemetry")
        with tracer.start_as_current_span(span_name) as span:
            for k, v in (attributes or {}).items():
                span.set_attribute(f"ai.{k}", _safe_attr(v))
            try:
                yield span
                span.set_status(StatusCode.OK)
            except Exception as exc:
                span.set_status(StatusCode.ERROR, str(exc))
                span.record_exception(exc)
                raise
    except ImportError:
        yield None