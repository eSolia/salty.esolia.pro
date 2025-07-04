#!/usr/bin/env -S deno run --allow-env --allow-read

/**
 * @fileoverview Test runner for Deno 2.4 features
 * @description Runs all tests related to the new Deno 2.4 enhancements
 */

console.log("🧪 Running Deno 2.4 Feature Tests\n");

const tests = [
  {
    name: "Native OpenTelemetry Tests",
    file: "./telemetry-native_test.ts",
    description: "Tests for native OTel integration and tracer functionality",
  },
  {
    name: "Coverage Tracker Tests",
    file: "./coverage-tracker_test.ts",
    description: "Tests for runtime coverage tracking system",
  },
  {
    name: "Server Enhancements Tests",
    file: "./server-enhancements_test.ts",
    description: "Tests for SIGUSR2 handler and server integrations",
  },
  {
    name: "Integration Tests",
    file: "./deno24-integration_test.ts",
    description: "Tests for all features working together",
  },
];

console.log("Test Suite Overview:");
console.log("===================");
for (const test of tests) {
  console.log(`\n📁 ${test.name}`);
  console.log(`   File: ${test.file}`);
  console.log(`   ${test.description}`);
}

console.log("\n\nRunning Tests:");
console.log("==============\n");

// Command to run all tests
const testCommand = [
  "deno",
  "test",
  "--allow-env",
  "--allow-read",
  "--allow-net", // For OTel tests that might connect to collectors
  ...tests.map((t) => t.file),
];

console.log("Executing command:");
console.log(`$ ${testCommand.join(" ")}\n`);

console.log("💡 Tips:");
console.log("- Run with OTEL_DENO=1 to test with native OpenTelemetry enabled");
console.log("- Run with --coverage=coverage_dir to generate coverage reports");
console.log("- Some tests (like SIGUSR2) require manual verification");
console.log("- Integration tests simulate real-world usage patterns\n");

console.log("To run tests individually:");
for (const test of tests) {
  console.log(`$ deno test --allow-env --allow-read ${test.file}`);
}

console.log("\nTo run with native OTel enabled:");
console.log(
  "$ OTEL_DENO=1 deno test --allow-env --allow-read --allow-net " +
    tests.map((t) => t.file).join(" "),
);

console.log("\nTo run with coverage:");
console.log(
  "$ deno test --allow-env --allow-read --coverage=coverage_dir " +
    tests.map((t) => t.file).join(" "),
);

console.log("\n✨ Happy testing!");
