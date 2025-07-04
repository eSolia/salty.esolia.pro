/**
 * @fileoverview Test script to demonstrate native OpenTelemetry integration
 * @description Run with: OTEL_DENO=1 deno run --allow-env --allow-net test-otel.ts
 */

import {
  getTracer,
  isNativeOtelEnabled,
  TracingHelpers,
} from "./telemetry-native.ts";
import { metrics, trace } from "npm:@opentelemetry/api@1";

console.log("OpenTelemetry Test Script");
console.log("=========================");
console.log(`Native OTel Enabled: ${isNativeOtelEnabled()}`);
console.log(`OTEL_DENO: ${Deno.env.get("OTEL_DENO")}`);
console.log(
  `OTEL_SERVICE_NAME: ${Deno.env.get("OTEL_SERVICE_NAME") || "salty"}`,
);
console.log(
  `OTEL_EXPORTER_OTLP_ENDPOINT: ${
    Deno.env.get("OTEL_EXPORTER_OTLP_ENDPOINT") || "http://localhost:4318"
  }`,
);

async function testTracing() {
  console.log("\nTesting Native OpenTelemetry Tracing...");

  const tracer = await getTracer();

  // Test basic span creation
  await tracer.trace("test.basic-operation", async () => {
    console.log("  ✓ Basic span created");
    await new Promise((resolve) => setTimeout(resolve, 100));
  }, { test: true });

  // Test crypto operation tracing
  await TracingHelpers.traceCrypto("encrypt", async () => {
    console.log("  ✓ Crypto operation traced");
    await new Promise((resolve) => setTimeout(resolve, 50));
  }, { payload_size: 1024 });

  // Test security check tracing
  await TracingHelpers.traceSecurity("rate-limit", () => {
    console.log("  ✓ Security check traced");
    return { allowed: true, remaining: 19 };
  }, { client_ip: "127.0.0.1" });

  // Test nested spans
  await tracer.trace("test.parent-operation", async () => {
    console.log("  ✓ Parent span created");

    await tracer.trace("test.child-operation", async () => {
      console.log("  ✓ Child span created");
      await new Promise((resolve) => setTimeout(resolve, 25));
    });
  });

  // Test error handling
  try {
    await tracer.trace("test.error-operation", () => {
      throw new Error("Test error for tracing");
    });
  } catch (_error) {
    console.log("  ✓ Error properly traced");
  }

  // Test metrics
  tracer.recordMetric("test_counter", 1, { environment: "test" });
  tracer.recordMetric("test_gauge", 42, { type: "gauge" });
  console.log("  ✓ Metrics recorded");

  // Test events
  tracer.recordEvent("test.event", {
    action: "test_completed",
    user_id: "test-user-123",
  });
  console.log("  ✓ Event recorded");
}

function testDirectOtelAPI() {
  console.log("\nTesting Direct OpenTelemetry API...");

  // Direct tracer usage
  const directTracer = trace.getTracer("test-direct", "1.0.0");
  const span = directTracer.startSpan("direct.test-span");
  span.setAttributes({
    "test.direct": true,
    "test.value": 123,
  });
  span.addEvent("test-event", {
    "event.data": "test data",
  });
  span.end();
  console.log("  ✓ Direct API span created");

  // Direct metrics usage
  const meter = metrics.getMeter("test-direct", "1.0.0");
  const counter = meter.createCounter("direct_test_counter", {
    description: "Test counter using direct API",
  });
  counter.add(1, { source: "test" });
  console.log("  ✓ Direct API metric created");
}

// Run tests
await testTracing();
testDirectOtelAPI();

console.log("\n✅ All tests completed!");
console.log(
  "\nTo see traces, ensure you have an OTLP collector running at localhost:4318",
);
console.log("You can use Jaeger with OTLP support:");
console.log("  docker run -d --name jaeger \\");
console.log("    -e COLLECTOR_OTLP_ENABLED=true \\");
console.log("    -p 16686:16686 \\");
console.log("    -p 4318:4318 \\");
console.log("    jaegertracing/all-in-one:latest");
console.log("\nThen run this script with:");
console.log(
  "  OTEL_DENO=1 OTEL_SERVICE_NAME=salty-test deno run --allow-env --allow-net test-otel.ts",
);
