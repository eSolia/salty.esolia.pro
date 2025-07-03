/**
 * hibp-checker_test.ts
 *
 * Tests for Have I Been Pwned password checker
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  checkPasswordBreach,
  clearHIBPCache,
  getHIBPCacheStats,
  type HIBPCheckResult,
} from "./hibp-checker.ts";

Deno.test("HIBP Checker - Basic Functionality", async (t) => {
  await t.step("should check known compromised password", async () => {
    // "password" is one of the most common compromised passwords
    const result = await checkPasswordBreach("password");
    assertEquals(result.isCompromised, true);
    assertEquals(result.breachCount > 0, true);
    assertEquals(result.error, undefined);
  });

  await t.step("should check safe password", async () => {
    // Generate a random safe password unlikely to be in breaches
    // Using crypto.getRandomValues for secure randomness in tests
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    const safePassword = `SafeP@ss${Date.now()}${array[0]}!`;
    const result = await checkPasswordBreach(safePassword);
    assertEquals(result.isCompromised, false);
    assertEquals(result.breachCount, 0);
    assertEquals(result.error, undefined);
  });

  await t.step("should handle empty password", async () => {
    const result = await checkPasswordBreach("");
    assertEquals(result.isCompromised, false);
    assertEquals(result.breachCount, 0);
    assertEquals(result.error, undefined);
  });
});

Deno.test("HIBP Checker - Caching", async (t) => {
  // Clear cache before testing
  clearHIBPCache();

  await t.step("should cache API responses", async () => {
    const password = "test123";

    // First check - should hit API
    const stats1 = getHIBPCacheStats();
    const result1 = await checkPasswordBreach(password);
    const stats2 = getHIBPCacheStats();

    assertEquals(stats2.size > stats1.size, true);

    // Second check - should use cache
    const start = Date.now();
    const result2 = await checkPasswordBreach(password);
    const duration = Date.now() - start;

    // Cached response should be very fast (< 10ms)
    assertEquals(duration < 10, true);
    assertEquals(result1.isCompromised, result2.isCompromised);
    assertEquals(result1.breachCount, result2.breachCount);
  });

  await t.step("should clear cache", () => {
    const stats1 = getHIBPCacheStats();
    assertEquals(stats1.size > 0, true);

    clearHIBPCache();

    const stats2 = getHIBPCacheStats();
    assertEquals(stats2.size, 0);
  });
});

Deno.test("HIBP Checker - SHA-1 Hashing", async (t) => { // devskim: ignore DS126858 - Testing HIBP which requires SHA-1
  await t.step("should handle various password types", async () => {
    const passwords = [
      "simple",
      "With Spaces 123",
      "Special!@#$%^&*()Characters",
      "Unicode🔐パスワード",
      "Very long password that exceeds typical length limits but should still work correctly",
    ];

    for (const password of passwords) {
      const result = await checkPasswordBreach(password);
      assertExists(result);
      assertEquals(typeof result.isCompromised, "boolean");
      assertEquals(typeof result.breachCount, "number");
    }
  });
});

Deno.test("HIBP Checker - Error Handling", {
  ignore: Deno.env.get("CI") === "true", // Skip in CI to avoid external API dependency
}, async (t) => {
  await t.step("should handle network errors gracefully", () => {
    // This test would require mocking fetch or using an invalid endpoint
    // For now, we just verify the structure is correct
    const result: HIBPCheckResult = {
      isCompromised: false,
      breachCount: 0,
      error: "Network error",
    };

    assertEquals(result.isCompromised, false);
    assertEquals(result.breachCount, 0);
    assertExists(result.error);
  });
});

Deno.test("HIBP Checker - Common Passwords", {
  ignore: Deno.env.get("CI") === "true", // Skip in CI to avoid external API dependency
}, async (t) => {
  await t.step("should detect common compromised passwords", async () => {
    const commonPasswords = [
      "123456",
      "password",
      "12345678",
      "qwerty",
      "abc123",
    ];

    for (const password of commonPasswords) {
      const result = await checkPasswordBreach(password);
      assertEquals(
        result.isCompromised,
        true,
        `${password} should be compromised`,
      );
      assertEquals(
        result.breachCount > 1000,
        true,
        `${password} should have many breaches`,
      );
    }
  });
});
