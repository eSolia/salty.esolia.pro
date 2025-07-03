/**
 * password-strength_test.ts
 *
 * Tests for password strength calculation module
 */

import {
  assertEquals,
  assertExists,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import {
  analyzePasswordStrength,
  getStrengthLevel,
  meetsMinimumRequirements,
  STRENGTH_LEVELS,
} from "./password-strength.ts";

Deno.test("Password Strength - Basic Functionality", async (t) => {
  await t.step("should analyze simple passwords", () => {
    const weak = analyzePasswordStrength("password");
    assertEquals(weak.score, 0);
    assertExists(weak.feedback.warning);

    const medium = analyzePasswordStrength("MyP@ssw0rd");
    assertEquals(medium.score >= 2, true);

    const strong = analyzePasswordStrength("MyVery$tr0ng&P@ssw0rd#2024!");
    assertEquals(strong.score, 4);
  });

  await t.step("should calculate entropy correctly", () => {
    // Only lowercase (8 chars * log2(26) = 8 * 4.7 = 37.6) - penalty for lowercase only
    const lowercase = analyzePasswordStrength("abcdefgh");
    assertEquals(Math.round(lowercase.entropy), 28); // With penalty applied

    // Mixed case (8 chars * log2(52) = 8 * 5.7 = 45.6)
    const mixedCase = analyzePasswordStrength("AbCdEfGh");
    assertEquals(Math.round(mixedCase.entropy), 46);

    // With numbers (8 chars * log2(62) = 8 * 5.95 = 47.6) + bonus for mixing
    const withNumbers = analyzePasswordStrength("AbCd1234");
    assertEquals(Math.round(withNumbers.entropy) >= 50, true);

    // With symbols (8 chars * log2(94) = 8 * 6.55 = 52.4) + bonus for mixing
    const withSymbols = analyzePasswordStrength("AbC!1234");
    assertEquals(Math.round(withSymbols.entropy) >= 55, true);
  });

  await t.step("should detect common patterns", () => {
    const patterns = [
      { password: "password123", expectedWarning: true },
      { password: "admin123", expectedWarning: true },
      { password: "12345678", expectedWarning: true },
      { password: "aaaaaaaa", expectedWarning: true },
      { password: "test1234", expectedWarning: true },
    ];

    patterns.forEach(({ password, expectedWarning }) => {
      const result = analyzePasswordStrength(password);
      assertEquals(!!result.feedback.warning, expectedWarning);
    });
  });
});

Deno.test("Password Strength - Feedback Messages", async (t) => {
  await t.step("should provide length suggestions", () => {
    const short = analyzePasswordStrength("Abc123");
    assertEquals(
      short.feedback.suggestions.some((s) => s.includes("8 characters")),
      true,
    );

    const medium = analyzePasswordStrength("Abcd1234");
    assertEquals(
      medium.feedback.suggestions.some((s) => s.includes("12+ characters")),
      true,
    );
  });

  await t.step("should suggest missing character types", () => {
    const noLower = analyzePasswordStrength("ABC123!@#");
    assertEquals(
      noLower.feedback.suggestions.some((s) => s.includes("lowercase")),
      true,
    );

    const noUpper = analyzePasswordStrength("abc123!@#");
    assertEquals(
      noUpper.feedback.suggestions.some((s) => s.includes("uppercase")),
      true,
    );

    const noDigits = analyzePasswordStrength("AbcDef!@#");
    assertEquals(
      noDigits.feedback.suggestions.some((s) => s.includes("numbers")),
      true,
    );

    const noSymbols = analyzePasswordStrength("AbcDef123");
    assertEquals(
      noSymbols.feedback.suggestions.some((s) =>
        s.includes("special characters")
      ),
      true,
    );
  });
});

Deno.test("Password Strength - Crack Time Estimation", async (t) => {
  await t.step("should estimate crack times", () => {
    const instant = analyzePasswordStrength("123");
    assertEquals(instant.crackTimeDisplay, "instant");

    const minutes = analyzePasswordStrength("abc123");
    assertExists(minutes.crackTimeDisplay);

    const years = analyzePasswordStrength("MySuper$tr0ngP@ssw0rd!");
    assertEquals(
      years.crackTimeDisplay.includes("years") ||
        years.crackTimeDisplay.includes("centuries"),
      true,
    );
  });
});

Deno.test("Password Strength - Edge Cases", async (t) => {
  await t.step("should handle empty password", () => {
    const result = analyzePasswordStrength("");
    assertEquals(result.score, 0);
    assertEquals(result.entropy, 0);
  });

  await t.step("should handle very long passwords", () => {
    const longPassword = "a".repeat(100);
    const result = analyzePasswordStrength(longPassword);
    assertExists(result.entropy);
    assertEquals(result.entropy > 0, true);
  });

  await t.step("should handle unicode characters", () => {
    const unicode = analyzePasswordStrength("Pass123!あいうえお");
    assertEquals(unicode.score >= 3, true);
  });
});

Deno.test("Password Strength - Minimum Requirements", async (t) => {
  await t.step("should enforce minimum requirements", () => {
    assertEquals(meetsMinimumRequirements("weak"), false);
    assertEquals(meetsMinimumRequirements("12345678"), false); // Only numbers
    assertEquals(meetsMinimumRequirements("Abc12345"), false); // Score is 1, needs 2+
    assertEquals(meetsMinimumRequirements("MyP@ss123"), true);
  });
});

Deno.test("Password Strength - Strength Levels", async (t) => {
  await t.step("should return correct strength levels", () => {
    STRENGTH_LEVELS.forEach((_level, index) => {
      const result = getStrengthLevel(index);
      assertEquals(result.score, index);
      assertExists(result.label);
      assertExists(result.color);
    });
  });
});
