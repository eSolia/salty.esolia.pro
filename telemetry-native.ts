/**
 * @fileoverview Native OpenTelemetry integration for Deno 2.4+
 * @description Uses Deno's built-in OpenTelemetry support when OTEL_DENO=true
 */

import {
  Counter,
  Histogram,
  metrics,
  SpanStatusCode,
  trace,
} from "npm:@opentelemetry/api@1";
import { VERSION } from "./version.ts";
import type { SpanAttributes } from "./telemetry.ts";
import { SPAN_NAMES, TELEMETRY_SERVICE } from "./telemetry.ts";

/**
 * Check if native OpenTelemetry is enabled
 * Note: Deno Deploy EA has OTEL enabled by default
 */
export const isNativeOtelEnabled = (): boolean => {
  // In Deno Deploy EA, OTEL is always enabled
  // Keep the check for local development
  const isDenoDeployEA = Deno.env.get("DENO_DEPLOYMENT_ID") !== undefined;
  return isDenoDeployEA ||
    Deno.env.get("OTEL_DENO") === "true" ||
    Deno.env.get("OTEL_DENO") === "1";
};

/**
 * Native OpenTelemetry tracer wrapper that implements the same interface
 * as the custom SaltyTracer for drop-in compatibility
 */
export class NativeSaltyTracer {
  private static instance: NativeSaltyTracer;
  private tracer: ReturnType<typeof trace.getTracer>;
  private meter: ReturnType<typeof metrics.getMeter>;
  private counters = new Map<string, Counter>();
  private histograms = new Map<string, Histogram>();

  private constructor() {
    // Use "salty" as service name - Deno Deploy EA doesn't need OTEL_SERVICE_NAME
    const serviceName = "salty";
    this.tracer = trace.getTracer(serviceName, VERSION);
    this.meter = metrics.getMeter(serviceName, VERSION);

    // Pre-create common metrics
    this.initializeMetrics();
  }

  static getInstance(): NativeSaltyTracer {
    if (!NativeSaltyTracer.instance) {
      NativeSaltyTracer.instance = new NativeSaltyTracer();
    }
    return NativeSaltyTracer.instance;
  }

  private initializeMetrics(): void {
    // Create counters for various operations
    const cryptoCounter = this.meter.createCounter("salty.crypto.operations", {
      description: "Count of cryptographic operations",
    });
    this.counters.set("crypto_operations", cryptoCounter);

    const securityCounter = this.meter.createCounter("salty.security.checks", {
      description: "Count of security checks performed",
    });
    this.counters.set("security_checks", securityCounter);

    const validationCounter = this.meter.createCounter(
      "salty.validation.operations",
      {
        description: "Count of validation operations",
      },
    );
    this.counters.set("validation_operations", validationCounter);

    const apiCounter = this.meter.createCounter("salty.api.requests", {
      description: "Count of API requests",
    });
    this.counters.set("api_requests", apiCounter);

    // Create histograms for performance tracking
    const durationHistogram = this.meter.createHistogram(
      "salty.operation.duration",
      {
        description: "Duration of operations in milliseconds",
        unit: "ms",
      },
    );
    this.histograms.set("operation_duration", durationHistogram);
  }

  /**
   * Create and execute a traced operation using native OpenTelemetry
   */
  trace<T>(
    spanName: string,
    operation: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ): Promise<T> {
    return this.tracer.startActiveSpan(spanName, async (span) => {
      // Add common attributes
      span.setAttributes({
        "salty.version": VERSION,
        "salty.operation": spanName,
        "service.name": this.getServiceFromSpanName(spanName),
        ...attributes,
      });

      const startTime = performance.now();

      try {
        const result = await operation();

        // Record success metrics
        const duration = performance.now() - startTime;
        this.recordOperationMetrics(spanName, "success", duration);

        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        return result;
      } catch (error) {
        const duration = performance.now() - startTime;

        // Record error metrics
        this.recordOperationMetrics(spanName, "error", duration);

        span.recordException(error as Error);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : String(error),
        });
        span.end();

        throw error;
      }
    });
  }

  /**
   * Create a synchronous traced operation
   */
  traceSync<T>(
    spanName: string,
    operation: () => T,
    attributes: SpanAttributes = {},
  ): T {
    const span = this.tracer.startSpan(spanName);

    span.setAttributes({
      "salty.version": VERSION,
      "salty.operation": spanName,
      "service.name": this.getServiceFromSpanName(spanName),
      ...attributes,
    });

    const startTime = performance.now();

    try {
      const result = operation();

      const duration = performance.now() - startTime;
      this.recordOperationMetrics(spanName, "success", duration);

      span.setStatus({ code: SpanStatusCode.OK });
      span.end();

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      this.recordOperationMetrics(spanName, "error", duration);

      span.recordException(error as Error);
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : String(error),
      });
      span.end();

      throw error;
    }
  }

  /**
   * Add custom attributes to the current span context
   */
  addSpanAttributes(attributes: SpanAttributes): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.setAttributes(attributes);
    }
  }

  /**
   * Create a traced version of a function
   */
  wrapFunction<TArgs extends unknown[], TReturn>(
    spanName: string,
    fn: (...args: TArgs) => Promise<TReturn> | TReturn,
    getAttributes?: (...args: TArgs) => SpanAttributes,
  ) {
    return (...args: TArgs): Promise<TReturn> => {
      const attributes = getAttributes ? getAttributes(...args) : {};
      return this.trace(spanName, () => fn(...args), attributes);
    };
  }

  /**
   * Record a custom metric using native OpenTelemetry
   */
  recordMetric(
    name: string,
    value: number,
    attributes: SpanAttributes = {},
  ): void {
    // Try to use existing counter or create a new one
    let counter = this.counters.get(name);
    if (!counter) {
      counter = this.meter.createCounter(name, {
        description: `Custom metric: ${name}`,
      });
      this.counters.set(name, counter);
    }

    counter.add(value, {
      "salty.version": VERSION,
      ...attributes,
    });
  }

  /**
   * Record a custom event
   */
  recordEvent(name: string, attributes: SpanAttributes = {}): void {
    const span = trace.getActiveSpan();
    if (span) {
      span.addEvent(name, {
        "salty.version": VERSION,
        ...attributes,
      });
    } else {
      // If no active span, create a short-lived span just for the event
      const eventSpan = this.tracer.startSpan(`event.${name}`);
      eventSpan.addEvent(name, {
        "salty.version": VERSION,
        ...attributes,
      });
      eventSpan.end();
    }
  }

  /**
   * Record operation metrics
   */
  private recordOperationMetrics(
    spanName: string,
    status: "success" | "error",
    duration: number,
  ): void {
    const service = this.getServiceFromSpanName(spanName);
    const attributes = {
      "operation": spanName,
      "service": service,
      "status": status,
    };

    // Record operation count
    if (spanName.startsWith("crypto.")) {
      this.counters.get("crypto_operations")?.add(1, attributes);
    } else if (spanName.startsWith("security.")) {
      this.counters.get("security_checks")?.add(1, attributes);
    } else if (spanName.startsWith("validation.")) {
      this.counters.get("validation_operations")?.add(1, attributes);
    } else if (spanName.startsWith("api.")) {
      this.counters.get("api_requests")?.add(1, attributes);
    }

    // Record duration
    this.histograms.get("operation_duration")?.record(duration, attributes);
  }

  /**
   * Determine service name from span name
   */
  private getServiceFromSpanName(spanName: string): string {
    if (spanName.startsWith("crypto.")) return TELEMETRY_SERVICE.CRYPTO;
    if (spanName.startsWith("security.")) return TELEMETRY_SERVICE.SECURITY;
    if (spanName.startsWith("validation.")) return TELEMETRY_SERVICE.VALIDATION;
    if (spanName.startsWith("api.")) return TELEMETRY_SERVICE.API;
    return "salty-unknown";
  }
}

/**
 * Factory function to get the appropriate tracer based on environment
 */
export async function getTracer() {
  if (isNativeOtelEnabled()) {
    return NativeSaltyTracer.getInstance();
  }
  // Fall back to custom tracer if native OTel is not enabled
  const { tracer } = await import("./telemetry.ts");
  return tracer;
}

/**
 * Convenience functions that work with both custom and native tracers
 */
export const TracingHelpers = {
  traceCrypto: async <T>(
    operation: "encrypt" | "decrypt" | "key-derivation",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) => {
    const tracer = await getTracer();
    return tracer.trace(
      operation === "key-derivation"
        ? SPAN_NAMES.KEY_DERIVATION
        : operation === "encrypt"
        ? SPAN_NAMES.ENCRYPT_OPERATION
        : SPAN_NAMES.DECRYPT_OPERATION,
      fn,
      { "crypto.operation": operation, ...attributes },
    );
  },

  traceSecurity: async <T>(
    operation:
      | "rate-limit"
      | "api-key"
      | "input-sanitization"
      | "suspicious-activity",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) => {
    const tracer = await getTracer();
    return tracer.trace(
      operation === "rate-limit"
        ? SPAN_NAMES.RATE_LIMIT_CHECK
        : operation === "api-key"
        ? SPAN_NAMES.API_KEY_VALIDATION
        : operation === "input-sanitization"
        ? SPAN_NAMES.INPUT_SANITIZATION
        : SPAN_NAMES.SUSPICIOUS_ACTIVITY_CHECK,
      fn,
      { "security.operation": operation, ...attributes },
    );
  },

  traceValidation: async <T>(
    operation: "request" | "body-parsing" | "environment",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) => {
    const tracer = await getTracer();
    return tracer.trace(
      operation === "request"
        ? SPAN_NAMES.REQUEST_VALIDATION
        : operation === "body-parsing"
        ? SPAN_NAMES.BODY_PARSING
        : SPAN_NAMES.ENVIRONMENT_CHECK,
      fn,
      { "validation.operation": operation, ...attributes },
    );
  },

  traceAPI: async <T>(
    operation: "request-handler" | "response-creation",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) => {
    const tracer = await getTracer();
    return tracer.trace(
      operation === "request-handler"
        ? SPAN_NAMES.API_REQUEST_HANDLER
        : SPAN_NAMES.RESPONSE_CREATION,
      fn,
      { "api.operation": operation, ...attributes },
    );
  },
};
