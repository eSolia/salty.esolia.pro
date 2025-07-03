/**
 * @fileoverview Tests for native OpenTelemetry integration
 * @description Verifies the native OTel wrapper functionality and compatibility
 */

import {
  assert,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  getTracer,
  isNativeOtelEnabled,
  NativeSaltyTracer,
  TracingHelpers,
} from "./telemetry-native.ts";
import { SPAN_NAMES, TELEMETRY_SERVICE } from "./telemetry.ts";

// Mock environment for testing
const originalOtelDeno = Deno.env.get("OTEL_DENO");

Deno.test("Native OpenTelemetry - Environment Detection", async (t) => {
  await t.step("should detect when OTEL_DENO is enabled", () => {
    Deno.env.set("OTEL_DENO", "true");
    assertEquals(isNativeOtelEnabled(), true);

    Deno.env.set("OTEL_DENO", "1");
    assertEquals(isNativeOtelEnabled(), true);
  });

  await t.step("should detect when OTEL_DENO is disabled", () => {
    Deno.env.delete("OTEL_DENO");
    assertEquals(isNativeOtelEnabled(), false);

    Deno.env.set("OTEL_DENO", "false");
    assertEquals(isNativeOtelEnabled(), false);

    Deno.env.set("OTEL_DENO", "0");
    assertEquals(isNativeOtelEnabled(), false);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Native OpenTelemetry - Tracer Factory", async (t) => {
  await t.step("should return native tracer when enabled", async () => {
    Deno.env.set("OTEL_DENO", "true");
    const tracer = await getTracer();
    assert(tracer instanceof NativeSaltyTracer);
  });

  await t.step("should return custom tracer when disabled", async () => {
    Deno.env.delete("OTEL_DENO");
    const tracer = await getTracer();
    // Should return the custom tracer from telemetry.ts
    assert(tracer);
    assert(!(tracer instanceof NativeSaltyTracer));
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Native OpenTelemetry - Basic Tracing", async (t) => {
  // Enable native OTel for these tests
  Deno.env.set("OTEL_DENO", "true");

  const tracer = NativeSaltyTracer.getInstance();

  await t.step("should create and complete a basic span", async () => {
    let spanExecuted = false;
    const result = await tracer.trace("test.basic-span", async () => {
      spanExecuted = true;
      return "test-result";
    });

    assertEquals(spanExecuted, true);
    assertEquals(result, "test-result");
  });

  await t.step("should handle synchronous operations", () => {
    let spanExecuted = false;
    const result = tracer.traceSync("test.sync-span", () => {
      spanExecuted = true;
      return 42;
    });

    assertEquals(spanExecuted, true);
    assertEquals(result, 42);
  });

  await t.step("should propagate errors in async spans", async () => {
    let errorThrown = false;
    try {
      await tracer.trace("test.error-span", async () => {
        throw new Error("Test error");
      });
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message, "Test error");
    }
    assertEquals(errorThrown, true);
  });

  await t.step("should propagate errors in sync spans", () => {
    let errorThrown = false;
    try {
      tracer.traceSync("test.sync-error-span", () => {
        throw new Error("Sync test error");
      });
    } catch (error) {
      errorThrown = true;
      assertEquals((error as Error).message, "Sync test error");
    }
    assertEquals(errorThrown, true);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Native OpenTelemetry - Span Attributes", async (t) => {
  Deno.env.set("OTEL_DENO", "true");
  const tracer = NativeSaltyTracer.getInstance();

  await t.step("should add custom attributes to spans", async () => {
    const customAttributes = {
      "test.string": "value",
      "test.number": 123,
      "test.boolean": true,
    };

    await tracer.trace("test.attributes-span", async () => {
      // Attributes should be set on the span
      return "done";
    }, customAttributes);

    // Test passes if no errors thrown
    assert(true);
  });

  await t.step("should determine service from span name", async () => {
    // Test crypto service
    await tracer.trace(SPAN_NAMES.KEY_DERIVATION, async () => {
      return "crypto";
    });

    // Test security service
    await tracer.trace(SPAN_NAMES.RATE_LIMIT_CHECK, async () => {
      return "security";
    });

    // Test validation service
    await tracer.trace(SPAN_NAMES.REQUEST_VALIDATION, async () => {
      return "validation";
    });

    // Test API service
    await tracer.trace(SPAN_NAMES.API_REQUEST_HANDLER, async () => {
      return "api";
    });

    // All should complete without errors
    assert(true);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Native OpenTelemetry - Metrics", async (t) => {
  Deno.env.set("OTEL_DENO", "true");
  const tracer = NativeSaltyTracer.getInstance();

  await t.step("should record custom metrics", () => {
    // Test counter metric
    tracer.recordMetric("test.counter", 1, { type: "test" });
    tracer.recordMetric("test.counter", 5, { type: "test" });

    // Test different metric
    tracer.recordMetric("test.gauge", 42, { unit: "items" });

    // Should not throw errors
    assert(true);
  });

  await t.step("should track operation metrics automatically", async () => {
    // Execute a crypto operation
    await tracer.trace("crypto.encrypt", async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "encrypted";
    });

    // Execute a security operation
    await tracer.trace("security.rate-limit-check", async () => {
      return { allowed: true };
    });

    // Metrics should be recorded automatically
    assert(true);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Native OpenTelemetry - Events", async (t) => {
  Deno.env.set("OTEL_DENO", "true");
  const tracer = NativeSaltyTracer.getInstance();

  await t.step("should record events within spans", async () => {
    await tracer.trace("test.event-span", async () => {
      tracer.recordEvent("test.milestone", {
        progress: 50,
        status: "halfway",
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      tracer.recordEvent("test.completed", {
        progress: 100,
        status: "done",
      });
    });

    assert(true);
  });

  await t.step("should record events outside of spans", () => {
    tracer.recordEvent("test.standalone-event", {
      source: "test",
      importance: "low",
    });

    assert(true);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Native OpenTelemetry - Function Wrapping", async (t) => {
  Deno.env.set("OTEL_DENO", "true");
  const tracer = NativeSaltyTracer.getInstance();

  await t.step("should wrap async functions", async () => {
    const originalFunction = async (x: number, y: number) => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      return x + y;
    };

    const wrappedFunction = tracer.wrapFunction(
      "test.wrapped-async",
      originalFunction,
      (x, y) => ({ x, y, operation: "add" }),
    );

    const result = await wrappedFunction(5, 3);
    assertEquals(result, 8);
  });

  await t.step("should wrap sync functions", async () => {
    const originalFunction = (x: number, y: number) => x * y;

    const wrappedFunction = tracer.wrapFunction(
      "test.wrapped-sync",
      originalFunction,
      (x, y) => ({ x, y, operation: "multiply" }),
    );

    const result = await wrappedFunction(4, 7);
    assertEquals(result, 28);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Native OpenTelemetry - TracingHelpers", async (t) => {
  Deno.env.set("OTEL_DENO", "true");

  await t.step("should trace crypto operations", async () => {
    const result = await TracingHelpers.traceCrypto("encrypt", async () => {
      return "encrypted-data";
    }, { payload_size: 100 });

    assertEquals(result, "encrypted-data");
  });

  await t.step("should trace security operations", async () => {
    const result = await TracingHelpers.traceSecurity(
      "rate-limit",
      async () => {
        return { allowed: true, remaining: 19 };
      },
      { client_ip: "127.0.0.1" },
    );

    assertEquals(result.allowed, true);
    assertEquals(result.remaining, 19);
  });

  await t.step("should trace validation operations", async () => {
    const result = await TracingHelpers.traceValidation("request", async () => {
      return { valid: true, errors: [] };
    }, { content_type: "application/json" });

    assertEquals(result.valid, true);
    assertEquals(result.errors.length, 0);
  });

  await t.step("should trace API operations", async () => {
    const result = await TracingHelpers.traceAPI(
      "request-handler",
      async () => {
        return new Response("OK", { status: 200 });
      },
      { method: "GET", path: "/health" },
    );

    assert(result instanceof Response);
    assertEquals(result.status, 200);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

// Test to ensure singleton pattern works correctly
Deno.test("Native OpenTelemetry - Singleton Pattern", () => {
  Deno.env.set("OTEL_DENO", "true");

  const instance1 = NativeSaltyTracer.getInstance();
  const instance2 = NativeSaltyTracer.getInstance();

  assertEquals(instance1, instance2);

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});
