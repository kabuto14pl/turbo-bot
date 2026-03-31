"""OpenLIT bootstrap helpers for Turbo-Bot Python services."""

import logging
import os

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