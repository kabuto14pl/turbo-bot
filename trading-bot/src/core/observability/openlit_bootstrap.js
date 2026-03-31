'use strict';

let openlitInitialized = false;

function getOtelApi() {
    try {
        return require('@opentelemetry/api');
    } catch (_error) {
        return null;
    }
}

function isEnabled() {
    return /^(1|true|yes|on)$/i.test(process.env.OPENLIT_ENABLED || 'false');
}

function getOpenlitModule() {
    const moduleValue = require('openlit');
    return moduleValue && moduleValue.default ? moduleValue.default : moduleValue;
}

function bootstrapOpenLIT(options = {}) {
    if (openlitInitialized || !isEnabled()) {
        return false;
    }

    try {
        const Openlit = getOpenlitModule();
        Openlit.init({
            applicationName: options.applicationName || process.env.OTEL_SERVICE_NAME || 'turbo-bot',
            environment: options.environment || process.env.OTEL_DEPLOYMENT_ENVIRONMENT || process.env.NODE_ENV || 'development',
            otlpEndpoint: options.otlpEndpoint || process.env.OTEL_EXPORTER_OTLP_ENDPOINT,
            disableBatch: /^(1|true|yes|on)$/i.test(process.env.OPENLIT_DISABLE_BATCH || 'false'),
            traceContent: /^(1|true|yes|on)$/i.test(process.env.OPENLIT_CAPTURE_MESSAGE_CONTENT || 'false'),
        });
        openlitInitialized = true;
        console.log('[OPENLIT] Node observability enabled for ' + (options.applicationName || process.env.OTEL_SERVICE_NAME || 'turbo-bot'));
        return true;
    } catch (error) {
        console.warn('[OPENLIT] Node bootstrap skipped: ' + error.message);
        return false;
    }
}

function toAttributeValue(value) {
    if (value === null || value === undefined) {
        return undefined;
    }

    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        return value;
    }

    try {
        return JSON.stringify(value);
    } catch (_error) {
        return String(value);
    }
}

function emitAiTelemetrySpan(eventName, payload) {
    const otelApi = getOtelApi();
    if (!otelApi) {
        return;
    }

    try {
        const tracer = otelApi.trace.getTracer('turbo-bot-ai-telemetry');
        const span = tracer.startSpan('ai.telemetry.' + eventName);
        const attributes = {
            'ai.event.name': eventName,
            'ai.service.name': process.env.OTEL_SERVICE_NAME || 'turbo-bot',
        };

        const payloadJson = toAttributeValue(payload);
        if (payloadJson !== undefined) {
            attributes['ai.payload.json'] = payloadJson;
        }

        for (const [key, value] of Object.entries(payload || {})) {
            const attributeValue = toAttributeValue(value);
            if (attributeValue !== undefined) {
                attributes['ai.payload.' + key] = attributeValue;
            }
        }

        span.setAttributes(attributes);
        span.addEvent('ai.telemetry.emit', attributes);
        span.end();
    } catch (_error) {
        // Telemetry spans should never break the trading runtime.
    }
}

function emitAiTelemetry(eventName, payload = {}) {
    if (!isEnabled()) {
        return;
    }

    const record = {
        ts: new Date().toISOString(),
        event: eventName,
        service: process.env.OTEL_SERVICE_NAME || 'turbo-bot',
        payload,
    };

    emitAiTelemetrySpan(eventName, payload);
    console.log('[AI TELEMETRY] ' + JSON.stringify(record));
}

/**
 * Run an async function inside a named OTel span.
 * Creates parent-child trace trees when nested.
 * @param {string} spanName - Span name (e.g. 'neuron.makeDecision')
 * @param {Object} attributes - Initial span attributes
 * @param {Function} fn - async (span) => result
 * @returns {Promise<*>} result of fn
 */
async function withAiSpan(spanName, attributes, fn) {
    const otelApi = getOtelApi();
    if (!otelApi || !isEnabled()) {
        return fn(null);
    }

    const tracer = otelApi.trace.getTracer('turbo-bot-ai-telemetry');
    return tracer.startActiveSpan(spanName, async (span) => {
        try {
            const attrs = { 'ai.service.name': process.env.OTEL_SERVICE_NAME || 'turbo-bot' };
            for (const [key, value] of Object.entries(attributes || {})) {
                const v = toAttributeValue(value);
                if (v !== undefined) {
                    attrs['ai.' + key] = v;
                }
            }
            span.setAttributes(attrs);
            const result = await fn(span);
            span.setStatus({ code: otelApi.SpanStatusCode.OK });
            return result;
        } catch (error) {
            span.setStatus({ code: otelApi.SpanStatusCode.ERROR, message: error.message });
            span.recordException(error);
            throw error;
        } finally {
            span.end();
        }
    });
}

module.exports = {
    bootstrapOpenLIT,
    emitAiTelemetry,
    withAiSpan,
};