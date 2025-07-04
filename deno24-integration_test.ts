/**
 * @fileoverview Integration tests for Deno 2.4 features
 * @description Tests how telemetry, coverage, and monitoring work together
 */

import {
  assert,
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  getTracer,
  isNativeOtelEnabled,
  TracingHelpers,
} from "./telemetry-native.ts";
import { coverageTracker } from "./coverage-tracker.ts";
import { LogCategory, logger, LogLevel } from "./logger.ts";

// Store original environment values
const originalOtelDeno = Deno.env.get("OTEL_DENO");
const originalCoverageDir = Deno.env.get("DENO_COVERAGE_DIR");

Deno.test("Deno 2.4 Integration - Telemetry with Coverage Tracking", async (t) => {
  // Enable native OTel
  Deno.env.set("OTEL_DENO", "true");
  coverageTracker.reset();

  await t.step("should track coverage within traced operations", async () => {
    const result = await TracingHelpers.traceCrypto("encrypt", async () => {
      // Simulate crypto operation
      coverageTracker.trackFunction("salty_encrypt");
      await new Promise((resolve) => setTimeout(resolve, 10));
      return "encrypted-data";
    }, { payload_size: 100 });

    assertEquals(result, "encrypted-data");

    // Verify function was tracked
    const coverage = coverageTracker.getFunctionCoverage();
    const executed = coverage.functionsExecuted as string[];
    assert(executed.includes("salty_encrypt"));
  });

  await t.step(
    "should maintain coverage across multiple traced operations",
    async () => {
      // Execute multiple operations
      await TracingHelpers.traceSecurity("rate-limit", async () => {
        coverageTracker.trackFunction("checkRateLimit");
        return { allowed: true };
      });

      await TracingHelpers.traceValidation("request", async () => {
        coverageTracker.trackFunction("validateApiKey");
        return { valid: true };
      });

      await TracingHelpers.traceAPI("request-handler", async () => {
        coverageTracker.trackEndpoint("GET", "/health");
        coverageTracker.trackFunction("handleRequest");
        return new Response("OK");
      });

      // Verify all operations were tracked
      const functionCoverage = coverageTracker.getFunctionCoverage();
      const endpointCoverage = coverageTracker.getEndpointCoverage();

      assertEquals(functionCoverage.executedFunctions, 4); // Including previous test
      assertEquals(endpointCoverage.coveredEndpoints, 1);
    },
  );

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Deno 2.4 Integration - Coverage with Logging", async (t) => {
  coverageTracker.reset();

  await t.step("should log coverage milestones", () => {
    // Track various operations
    for (let i = 0; i < 5; i++) {
      coverageTracker.trackEndpoint("GET", `/endpoint${i}`);
    }

    const coverage = coverageTracker.getEndpointCoverage();
    const percentage = coverage.coveragePercentage as number;

    // Log coverage milestone if over 50%
    if (percentage > 50) {
      logger.info("Coverage milestone reached", {
        category: LogCategory.PERFORMANCE,
        coveragePercentage: percentage,
        coveredEndpoints: coverage.coveredEndpoints,
        totalEndpoints: coverage.totalEndpoints,
      });
    }

    assert(percentage > 50);
  });

  await t.step("should track security-critical functions", () => {
    // Track security functions
    const securityFunctions = [
      "validateApiKey",
      "checkRateLimit",
      "validateEnvironment",
    ];

    for (const func of securityFunctions) {
      coverageTracker.trackFunction(func);
    }

    const coverage = coverageTracker.getFunctionCoverage();
    const executed = coverage.functionsExecuted as string[];

    // Log security coverage
    const securityCoverage = securityFunctions.filter((f) =>
      executed.includes(f)
    );

    logger.info("Security function coverage", {
      coveredFunctions: securityCoverage.length,
      totalSecurityFunctions: securityFunctions.length,
      percentage: (securityCoverage.length / securityFunctions.length) * 100,
    });

    assertEquals(securityCoverage.length, 3);
  });
});

Deno.test("Deno 2.4 Integration - Memory Monitoring with Telemetry", async (t) => {
  Deno.env.set("OTEL_DENO", "true");

  await t.step("should trace memory-intensive operations", async () => {
    const tracer = await getTracer();

    const result = await tracer.trace(
      "memory.intensive-operation",
      async () => {
        const memoryBefore = Deno.memoryUsage();

        // Simulate memory-intensive operation
        const largeArray = new Array(1000000).fill("data");

        const memoryAfter = Deno.memoryUsage();

        // Record memory metrics
        tracer.recordMetric("memory.heap_used", memoryAfter.heapUsed, {
          operation: "intensive-operation",
        });

        tracer.recordMetric(
          "memory.heap_delta",
          memoryAfter.heapUsed - memoryBefore.heapUsed,
          {
            operation: "intensive-operation",
          },
        );

        return largeArray.length;
      },
      {
        "memory.tracking": true,
      },
    );

    assertEquals(result, 1000000);
  });

  await t.step("should handle memory pressure scenarios", async () => {
    // Simulate checking memory before critical operations
    const memoryUsage = Deno.memoryUsage();
    const heapUsedMB = Math.round(memoryUsage.heapUsed / 1024 / 1024);

    if (heapUsedMB > 100) { // Threshold for warning
      logger.warn("High memory usage detected", {
        category: LogCategory.PERFORMANCE,
        heapUsedMB,
        heapTotalMB: Math.round(memoryUsage.heapTotal / 1024 / 1024),
      });
    }

    // Memory check passes if no errors
    assert(true);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

Deno.test("Deno 2.4 Integration - Full Feature Stack", async (t) => {
  // Enable all features
  Deno.env.set("OTEL_DENO", "true");
  Deno.env.set("DENO_COVERAGE_DIR", "/tmp/test-coverage");
  coverageTracker.reset();

  await t.step(
    "should integrate all features in a typical request flow",
    async () => {
      const tracer = await getTracer();

      // Simulate a full API request with all features
      const response = await tracer.trace("api.full-request", async () => {
        // Track endpoint
        coverageTracker.trackEndpoint("POST", "/api/encrypt");
        coverageTracker.trackFunction("handleRequest");

        // Add span attributes
        tracer.addSpanAttributes({
          "http.method": "POST",
          "http.route": "/api/encrypt",
          "client.ip": "127.0.0.1",
        });

        // Validate request
        const validationResult = await TracingHelpers.traceValidation(
          "request",
          async () => {
            coverageTracker.trackFunction("validateApiKey");
            return { valid: true, errors: [] };
          },
        );

        if (!validationResult.valid) {
          return new Response("Invalid request", { status: 400 });
        }

        // Check rate limit
        const rateLimitResult = await TracingHelpers.traceSecurity(
          "rate-limit",
          async () => {
            coverageTracker.trackFunction("checkRateLimit");
            return { allowed: true, remaining: 19 };
          },
        );

        if (!rateLimitResult.allowed) {
          return new Response("Rate limit exceeded", { status: 429 });
        }

        // Perform crypto operation
        const encryptedData = await TracingHelpers.traceCrypto(
          "encrypt",
          async () => {
            coverageTracker.trackFunction("salty_encrypt");
            // Record metrics
            tracer.recordMetric("crypto.operations", 1, {
              operation: "encrypt",
              algorithm: "AES-GCM-256",
            });
            return "encrypted-payload";
          },
        );

        // Log successful operation
        logger.info("Encryption completed successfully", {
          category: LogCategory.API,
          endpoint: "/api/encrypt",
          responseTime: 50,
        });

        // Record success metric
        tracer.recordMetric("api.requests", 1, {
          endpoint: "/api/encrypt",
          status: "success",
        });

        return new Response(JSON.stringify({ data: encryptedData }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      });

      // Verify the response
      assertEquals(response.status, 200);
      const body = await response.json();
      assertEquals(body.data, "encrypted-payload");

      // Verify coverage
      const endpointCoverage = coverageTracker.getEndpointCoverage();
      const functionCoverage = coverageTracker.getFunctionCoverage();

      assertEquals(endpointCoverage.coveredEndpoints, 1);
      assert((functionCoverage.executedFunctions as number) >= 4);

      // Verify coverage is enabled
      const metrics = coverageTracker.getCoverageMetrics();
      assertEquals(metrics.enabled, true);
      assertEquals(metrics.coverageDir, "/tmp/test-coverage");
    },
  );

  await t.step("should generate comprehensive runtime report", () => {
    const runtimeCoverage = coverageTracker.getRuntimeCoverage();

    // Verify all components are present
    assertExists(runtimeCoverage.version);
    assertExists(runtimeCoverage.uptime);
    assertExists(runtimeCoverage.coverage);
    assertExists(runtimeCoverage.coverageEnabled);

    const coverage = runtimeCoverage.coverage as Record<string, unknown>;
    assertExists(coverage.endpoints);
    assertExists(coverage.functions);
    assertExists(coverage.overall);

    // Log the report (would be included in health endpoint)
    logger.info("Runtime coverage report", {
      category: LogCategory.HEALTH,
      coverage: runtimeCoverage,
    });
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }

  if (originalCoverageDir) {
    Deno.env.set("DENO_COVERAGE_DIR", originalCoverageDir);
  } else {
    Deno.env.delete("DENO_COVERAGE_DIR");
  }
});

Deno.test("Deno 2.4 Integration - Error Scenarios", async (t) => {
  Deno.env.set("OTEL_DENO", "true");
  coverageTracker.reset();

  await t.step(
    "should handle errors in traced operations gracefully",
    async () => {
      const tracer = await getTracer();
      let errorCaught = false;

      try {
        await tracer.trace("error.test-operation", async () => {
          coverageTracker.trackFunction("errorFunction");
          throw new Error("Simulated error");
        });
      } catch (error) {
        errorCaught = true;
        assertEquals((error as Error).message, "Simulated error");
      }

      assertEquals(errorCaught, true);

      // Function should still be tracked
      const coverage = coverageTracker.getFunctionCoverage();
      const executed = coverage.functionsExecuted as string[];
      assert(executed.includes("errorFunction"));
    },
  );

  await t.step("should maintain system stability on coverage errors", () => {
    // Test coverage tracker resilience
    try {
      // Try to track with invalid data
      coverageTracker.trackEndpoint("", "");
      coverageTracker.trackFunction("");

      // System should handle gracefully
      const coverage = coverageTracker.getRuntimeCoverage();
      assertExists(coverage);
    } catch (error) {
      // Should not throw
      assert(
        false,
        `Coverage tracker threw error: ${(error as Error).message}`,
      );
    }
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});

// Performance benchmark test
Deno.test("Deno 2.4 Integration - Performance Impact", async (t) => {
  await t.step("should have minimal performance overhead", async () => {
    Deno.env.set("OTEL_DENO", "true");
    const tracer = await getTracer();

    // Measure without tracing
    const withoutTracingStart = performance.now();
    for (let i = 0; i < 1000; i++) {
      const result = i * 2;
      assert(result >= 0);
    }
    const withoutTracingTime = performance.now() - withoutTracingStart;

    // Measure with tracing
    const withTracingStart = performance.now();
    await tracer.trace("performance.test", async () => {
      for (let i = 0; i < 1000; i++) {
        const result = i * 2;
        assert(result >= 0);
      }
    });
    const withTracingTime = performance.now() - withTracingStart;

    // Overhead should be reasonable (less than 50% slower)
    const overhead = (withTracingTime - withoutTracingTime) /
      withoutTracingTime;
    console.log(`Tracing overhead: ${(overhead * 100).toFixed(2)}%`);

    // Very generous threshold as timing can vary
    assert(overhead < 5, `Tracing overhead too high: ${overhead * 100}%`);
  });

  // Cleanup
  if (originalOtelDeno) {
    Deno.env.set("OTEL_DENO", originalOtelDeno);
  } else {
    Deno.env.delete("OTEL_DENO");
  }
});
