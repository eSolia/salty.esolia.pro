/**
 * @fileoverview Custom OpenTelemetry integration for detailed tracing
 * @description Adds custom spans to track internal operations in EA's trace view
 */

import { VERSION } from "./version.ts";

/**
 * Telemetry service names for span organization
 */
export const TELEMETRY_SERVICE = {
  CRYPTO: "salty-crypto",
  SECURITY: "salty-security",
  VALIDATION: "salty-validation",
  API: "salty-api",
} as const;

/**
 * Custom span names for detailed tracking
 */
export const SPAN_NAMES = {
  // Crypto operations
  KEY_DERIVATION: "crypto.key-derivation",
  ENCRYPT_OPERATION: "crypto.encrypt",
  DECRYPT_OPERATION: "crypto.decrypt",

  // Security operations
  RATE_LIMIT_CHECK: "security.rate-limit-check",
  API_KEY_VALIDATION: "security.api-key-validation",
  INPUT_SANITIZATION: "security.input-sanitization",
  SUSPICIOUS_ACTIVITY_CHECK: "security.suspicious-activity-check",

  // Validation operations
  REQUEST_VALIDATION: "validation.request-validation",
  BODY_PARSING: "validation.body-parsing",
  ENVIRONMENT_CHECK: "validation.environment-check",

  // API operations
  API_REQUEST_HANDLER: "api.request-handler",
  RESPONSE_CREATION: "api.response-creation",
} as const;

/**
 * Span attributes for better categorization
 */
export interface SpanAttributes {
  [key: string]: string | number | boolean | undefined;
}

/**
 * Custom tracer wrapper for Salty operations
 */
export class SaltyTracer {
  private static instance: SaltyTracer;

  private constructor() {}

  static getInstance(): SaltyTracer {
    if (!SaltyTracer.instance) {
      SaltyTracer.instance = new SaltyTracer();
    }
    return SaltyTracer.instance;
  }

  /**
   * Create and execute a traced operation
   * @param spanName - Name of the span
   * @param operation - Function to execute within the span
   * @param attributes - Additional attributes for the span
   * @returns Result of the operation
   */
  async trace<T>(
    spanName: string,
    operation: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ): Promise<T> {
    const startTime = performance.now();

    // Add common attributes
    const spanAttributes = {
      "salty.version": VERSION,
      "salty.operation": spanName,
      ...attributes,
    };

    try {
      // Execute the operation
      const result = await operation();

      // Calculate duration
      const duration = performance.now() - startTime;

      // Log the span completion (since we can't directly access OTel API in Deno Deploy)
      this.logSpan(spanName, "completed", duration, spanAttributes);

      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      // Log the span error
      this.logSpan(spanName, "error", duration, {
        ...spanAttributes,
        "error.message": error instanceof Error ? error.message : String(error),
        "error.type": error instanceof Error
          ? error.constructor.name
          : "Unknown",
      });

      throw error;
    }
  }

  /**
   * Create a synchronous traced operation
   * @param spanName - Name of the span
   * @param operation - Function to execute within the span
   * @param attributes - Additional attributes for the span
   * @returns Result of the operation
   */
  traceSync<T>(
    spanName: string,
    operation: () => T,
    attributes: SpanAttributes = {},
  ): T {
    const startTime = performance.now();

    const spanAttributes = {
      "salty.version": VERSION,
      "salty.operation": spanName,
      ...attributes,
    };

    try {
      const result = operation();
      const duration = performance.now() - startTime;

      this.logSpan(spanName, "completed", duration, spanAttributes);
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;

      this.logSpan(spanName, "error", duration, {
        ...spanAttributes,
        "error.message": error instanceof Error ? error.message : String(error),
        "error.type": error instanceof Error
          ? error.constructor.name
          : "Unknown",
      });

      throw error;
    }
  }

  /**
   * Log span information in a format that EA can potentially pick up
   * @param spanName - Name of the span
   * @param status - Status of the span
   * @param duration - Duration in milliseconds
   * @param attributes - Span attributes
   */
  private logSpan(
    spanName: string,
    status: "completed" | "error",
    duration: number,
    attributes: SpanAttributes,
  ): void {
    // Create a structured log entry that follows OpenTelemetry conventions
    const spanLog = {
      timestamp: new Date().toISOString(),
      span: {
        name: spanName,
        status,
        duration_ms: Math.round(duration * 1000) / 1000, // Round to 3 decimal places
        attributes,
      },
      telemetry: {
        type: "span",
        service: this.getServiceFromSpanName(spanName),
      },
    };

    // Log in a format that might be picked up by EA's telemetry
    console.log(`[SPAN] ${JSON.stringify(spanLog)}`);
  }

  /**
   * Determine service name from span name
   * @param spanName - Name of the span
   * @returns Service name
   */
  private getServiceFromSpanName(spanName: string): string {
    if (spanName.startsWith("crypto.")) return TELEMETRY_SERVICE.CRYPTO;
    if (spanName.startsWith("security.")) return TELEMETRY_SERVICE.SECURITY;
    if (spanName.startsWith("validation.")) return TELEMETRY_SERVICE.VALIDATION;
    if (spanName.startsWith("api.")) return TELEMETRY_SERVICE.API;
    return "salty-unknown";
  }

  /**
   * Add custom attributes to the current span context (if available)
   * @param attributes - Attributes to add
   */
  addSpanAttributes(attributes: SpanAttributes): void {
    // In EA, this might be picked up by the tracing system
    console.log(`[SPAN_ATTRIBUTES] ${JSON.stringify(attributes)}`);
  }

  /**
   * Create a traced version of a function
   * @param spanName - Name of the span
   * @param fn - Function to wrap
   * @param getAttributes - Function to extract attributes from arguments
   * @returns Traced version of the function
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
   * Record a custom metric
   * @param name - Metric name
   * @param value - Metric value
   * @param attributes - Metric attributes
   */
  recordMetric(
    name: string,
    value: number,
    attributes: SpanAttributes = {},
  ): void {
    const metricLog = {
      timestamp: new Date().toISOString(),
      metric: {
        name,
        value,
        attributes: {
          "salty.version": VERSION,
          ...attributes,
        },
      },
      telemetry: {
        type: "metric",
      },
    };

    console.log(`[METRIC] ${JSON.stringify(metricLog)}`);
  }

  /**
   * Record a custom event
   * @param name - Event name
   * @param attributes - Event attributes
   */
  recordEvent(name: string, attributes: SpanAttributes = {}): void {
    const eventLog = {
      timestamp: new Date().toISOString(),
      event: {
        name,
        attributes: {
          "salty.version": VERSION,
          ...attributes,
        },
      },
      telemetry: {
        type: "event",
      },
    };

    console.log(`[EVENT] ${JSON.stringify(eventLog)}`);
  }
}

/**
 * Export singleton instance
 */
export const tracer = SaltyTracer.getInstance();

/**
 * Convenience functions for common tracing patterns
 */
export const TracingHelpers = {
  /**
   * Trace a crypto operation
   */
  traceCrypto: <T>(
    operation: "encrypt" | "decrypt" | "key-derivation",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) =>
    tracer.trace(
      operation === "key-derivation"
        ? SPAN_NAMES.KEY_DERIVATION
        : operation === "encrypt"
        ? SPAN_NAMES.ENCRYPT_OPERATION
        : SPAN_NAMES.DECRYPT_OPERATION,
      fn,
      { "crypto.operation": operation, ...attributes },
    ),

  /**
   * Trace a security check
   */
  traceSecurity: <T>(
    operation:
      | "rate-limit"
      | "api-key"
      | "input-sanitization"
      | "suspicious-activity",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) =>
    tracer.trace(
      operation === "rate-limit"
        ? SPAN_NAMES.RATE_LIMIT_CHECK
        : operation === "api-key"
        ? SPAN_NAMES.API_KEY_VALIDATION
        : operation === "input-sanitization"
        ? SPAN_NAMES.INPUT_SANITIZATION
        : SPAN_NAMES.SUSPICIOUS_ACTIVITY_CHECK,
      fn,
      { "security.operation": operation, ...attributes },
    ),

  /**
   * Trace a validation operation
   */
  traceValidation: <T>(
    operation: "request" | "body-parsing" | "environment",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) =>
    tracer.trace(
      operation === "request"
        ? SPAN_NAMES.REQUEST_VALIDATION
        : operation === "body-parsing"
        ? SPAN_NAMES.BODY_PARSING
        : SPAN_NAMES.ENVIRONMENT_CHECK,
      fn,
      { "validation.operation": operation, ...attributes },
    ),

  /**
   * Trace an API operation
   */
  traceAPI: <T>(
    operation: "request-handler" | "response-creation",
    fn: () => Promise<T> | T,
    attributes: SpanAttributes = {},
  ) =>
    tracer.trace(
      operation === "request-handler"
        ? SPAN_NAMES.API_REQUEST_HANDLER
        : SPAN_NAMES.RESPONSE_CREATION,
      fn,
      { "api.operation": operation, ...attributes },
    ),
};
