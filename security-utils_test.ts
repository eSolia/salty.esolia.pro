/**
 * @fileoverview Security utility tests
 * @description Comprehensive test suite for security validation functions
 */

import {
  assertEquals,
  assertThrows,
} from "https://deno.land/std@0.208.0/assert/mod.ts";
import {
  escapeHtml,
  hashForLogging,
  sanitizeString,
  SecurityRateLimiter,
  validateAgainstPatterns,
  validateBase91,
  validateContentType,
  validateEnvironmentVariable,
  validateHex,
  validateJSONStructure,
  validateNoPathTraversal,
  validateNoShellMetacharacters,
  validateNoSQLPatterns,
  validateURL,
} from "./security-utils.ts";

Deno.test("Security Utils - Pattern Validation", async (t) => {
  await t.step("should detect eval() patterns", () => {
    assertEquals(validateAgainstPatterns("eval(code)", "test"), false);
    assertEquals(validateAgainstPatterns("window.eval()", "test"), false);
    assertEquals(validateAgainstPatterns("evaluate", "test"), true);
  });

  await t.step("should detect Function constructor", () => {
    assertEquals(
      validateAgainstPatterns("new Function('code')", "test"),
      false,
    );
    assertEquals(validateAgainstPatterns("Function('code')", "test"), false);
    assertEquals(validateAgainstPatterns("function() {}", "test"), true);
  });

  await t.step("should detect import/require", () => {
    assertEquals(validateAgainstPatterns("import('module')", "test"), false);
    assertEquals(validateAgainstPatterns("require('module')", "test"), false);
    assertEquals(validateAgainstPatterns("important", "test"), true);
  });

  await t.step("should detect XSS patterns", () => {
    assertEquals(
      validateAgainstPatterns("<script>alert(1)</script>", "test"),
      false,
    );
    assertEquals(validateAgainstPatterns("javascript:void(0)", "test"), false);
    assertEquals(validateAgainstPatterns("onclick='alert(1)'", "test"), false);
    assertEquals(validateAgainstPatterns("on click", "test"), true);
  });

  await t.step("should detect Deno/process access", () => {
    assertEquals(validateAgainstPatterns("Deno.readFile()", "test"), false);
    assertEquals(validateAgainstPatterns("process.env", "test"), false);
    assertEquals(validateAgainstPatterns("globalThis.Deno", "test"), false);
    assertEquals(validateAgainstPatterns("processing", "test"), true);
  });
});

Deno.test("Security Utils - Shell Metacharacters", async (t) => {
  await t.step("should detect shell metacharacters", () => {
    assertEquals(validateNoShellMetacharacters("safe-input"), true);
    assertEquals(validateNoShellMetacharacters("safe_input_123"), true);
    assertEquals(validateNoShellMetacharacters("rm -rf /"), false);
    assertEquals(validateNoShellMetacharacters("echo $PATH"), false);
    assertEquals(validateNoShellMetacharacters("cmd; ls"), false);
    assertEquals(validateNoShellMetacharacters("cmd && ls"), false);
    assertEquals(validateNoShellMetacharacters("cmd | grep"), false);
    assertEquals(validateNoShellMetacharacters("`command`"), false);
    assertEquals(validateNoShellMetacharacters("$(command)"), false);
  });
});

Deno.test("Security Utils - SQL Injection", async (t) => {
  await t.step("should detect SQL patterns", () => {
    assertEquals(validateNoSQLPatterns("safe input"), true);
    assertEquals(validateNoSQLPatterns("1=1"), true);
    assertEquals(validateNoSQLPatterns("' OR '1'='1"), false);
    assertEquals(validateNoSQLPatterns("'; DROP TABLE users; --"), false);
    assertEquals(validateNoSQLPatterns("UNION SELECT * FROM"), false);
    assertEquals(validateNoSQLPatterns("INSERT INTO users"), false);
    assertEquals(validateNoSQLPatterns("DELETE FROM table"), false);
    assertEquals(validateNoSQLPatterns("/* comment */"), false);
    assertEquals(validateNoSQLPatterns("xp_cmdshell"), false);
  });
});

Deno.test("Security Utils - Path Traversal", async (t) => {
  await t.step("should detect path traversal attempts", () => {
    assertEquals(validateNoPathTraversal("file.txt"), true);
    assertEquals(validateNoPathTraversal("folder/file.txt"), true);
    assertEquals(validateNoPathTraversal("../../../etc/passwd"), false);
    assertEquals(validateNoPathTraversal("..\\..\\windows\\system32"), false);
    assertEquals(validateNoPathTraversal("file%2e%2e%2fpasswd"), false);
    assertEquals(validateNoPathTraversal("file%5c%5cwindows"), false);
    assertEquals(validateNoPathTraversal("/etc/passwd"), false);
    assertEquals(validateNoPathTraversal("C:\\Windows\\System32"), false);
  });
});

Deno.test("Security Utils - String Sanitization", async (t) => {
  await t.step("should remove null bytes", () => {
    assertEquals(sanitizeString("hello\0world", 100), "helloworld");
    assertEquals(sanitizeString("\0\0\0", 100), "");
  });

  await t.step("should remove control characters", () => {
    assertEquals(sanitizeString("hello\x01\x02\x03world", 100), "helloworld");
    assertEquals(sanitizeString("line1\r\nline2", 100), "line1line2");
  });

  await t.step("should truncate to max length", () => {
    assertEquals(sanitizeString("a".repeat(200), 100).length, 100);
    assertEquals(sanitizeString("short", 100), "short");
  });

  await t.step("should throw on non-string input", () => {
    assertThrows(() => sanitizeString(null as any, 100), TypeError);
    assertThrows(() => sanitizeString(123 as any, 100), TypeError);
  });
});

Deno.test("Security Utils - Base91 Validation", async (t) => {
  await t.step("should validate Base91 strings", () => {
    assertEquals(validateBase91("ABCabc123!@#"), true);
    assertEquals(validateBase91("valid+base/91=string"), true);
    assertEquals(validateBase91(""), false);
    assertEquals(validateBase91("invalid\0char"), false);
    assertEquals(validateBase91("invalid space"), false);
    assertEquals(validateBase91("नमस्ते"), false); // Unicode
  });
});

Deno.test("Security Utils - Hex Validation", async (t) => {
  await t.step("should validate hex strings", () => {
    assertEquals(validateHex("0123456789ABCDEF"), true);
    assertEquals(validateHex("deadbeef"), true);
    assertEquals(validateHex("DEADBEEF"), true);
    assertEquals(validateHex(""), false);
    assertEquals(validateHex("xyz"), false);
    assertEquals(validateHex("12345"), false); // Odd length
    assertEquals(validateHex("0x1234"), false); // With prefix
  });
});

Deno.test("Security Utils - Environment Variable Validation", async (t) => {
  await t.step("should validate SALT_HEX", () => {
    assertEquals(
      validateEnvironmentVariable(
        "SALT_HEX",
        "0123456789ABCDEF0123456789ABCDEF",
      ),
      true,
    );
    assertEquals(validateEnvironmentVariable("SALT_HEX", "invalid"), false);
    assertEquals(
      validateEnvironmentVariable("SALT_HEX", "0123456789ABCDEF"),
      false,
    ); // Wrong length
  });

  await t.step("should validate API_KEY", () => {
    assertEquals(validateEnvironmentVariable("API_KEY", "dGVzdGtleQ=="), true);
    assertEquals(validateEnvironmentVariable("API_KEY", "test+key/123="), true);
    assertEquals(validateEnvironmentVariable("API_KEY", "invalid!@#"), false);
  });

  await t.step("should validate LOG_LEVEL", () => {
    assertEquals(validateEnvironmentVariable("LOG_LEVEL", "INFO"), true);
    assertEquals(validateEnvironmentVariable("LOG_LEVEL", "DEBUG"), true);
    assertEquals(validateEnvironmentVariable("LOG_LEVEL", "INVALID"), false);
  });

  await t.step("should validate LOG_FORMAT", () => {
    assertEquals(validateEnvironmentVariable("LOG_FORMAT", "json"), true);
    assertEquals(validateEnvironmentVariable("LOG_FORMAT", "text"), true);
    assertEquals(validateEnvironmentVariable("LOG_FORMAT", "xml"), false);
  });

  await t.step("should validate NODE_ENV", () => {
    assertEquals(validateEnvironmentVariable("NODE_ENV", "production"), true);
    assertEquals(validateEnvironmentVariable("NODE_ENV", "development"), true);
    assertEquals(validateEnvironmentVariable("NODE_ENV", "test"), false);
  });

  await t.step("should block shell metacharacters in env vars", () => {
    assertEquals(validateEnvironmentVariable("CUSTOM", "safe-value"), true);
    assertEquals(validateEnvironmentVariable("CUSTOM", "rm -rf /"), false);
    assertEquals(
      validateEnvironmentVariable("CUSTOM", "value; echo bad"),
      false,
    );
  });
});

Deno.test("Security Utils - URL Validation", async (t) => {
  await t.step("should validate HTTPS URLs", () => {
    assertEquals(validateURL("https://example.com"), true);
    assertEquals(validateURL("https://example.com/path?query=1"), true);
    assertEquals(validateURL("http://example.com", ["http", "https"]), true);
  });

  await t.step("should reject dangerous schemes", () => {
    assertEquals(validateURL("javascript:alert(1)"), false);
    assertEquals(
      validateURL("data:text/html,<script>alert(1)</script>"),
      false,
    );
    assertEquals(validateURL("file:///etc/passwd"), false);
    assertEquals(validateURL("ftp://example.com"), false);
  });

  await t.step("should reject local/private URLs", () => {
    assertEquals(validateURL("https://localhost/api"), false);
    assertEquals(validateURL("https://127.0.0.1/api"), false);
    assertEquals(validateURL("https://192.168.1.1/api"), false);
    assertEquals(validateURL("https://10.0.0.1/api"), false);
    assertEquals(validateURL("https://172.16.0.1/api"), false);
  });

  await t.step("should reject invalid URLs", () => {
    assertEquals(validateURL("not-a-url"), false);
    assertEquals(validateURL(""), false);
    assertEquals(validateURL("//example.com"), false);
  });
});

Deno.test("Security Utils - Content Type Validation", async (t) => {
  await t.step("should validate content types", () => {
    assertEquals(
      validateContentType("application/json", ["application/json"]),
      true,
    );
    assertEquals(
      validateContentType("application/json; charset=utf-8", [
        "application/json",
      ]),
      true,
    );
    assertEquals(
      validateContentType("text/plain", ["text/plain", "application/json"]),
      true,
    );
    assertEquals(
      validateContentType("APPLICATION/JSON", ["application/json"]),
      true,
    );
  });

  await t.step("should reject invalid content types", () => {
    assertEquals(validateContentType("text/html", ["application/json"]), false);
    assertEquals(validateContentType(null, ["application/json"]), false);
    assertEquals(validateContentType("", ["application/json"]), false);
  });
});

Deno.test("Security Utils - Rate Limiter", async (t) => {
  await t.step("should allow requests within limit", () => {
    const limiter = new SecurityRateLimiter(3, 1000);

    assertEquals(limiter.check("test-key").allowed, true);
    assertEquals(limiter.check("test-key").allowed, true);
    assertEquals(limiter.check("test-key").allowed, true);
    assertEquals(limiter.check("test-key").allowed, false);
    assertEquals(limiter.check("test-key").remaining, 0);
  });

  await t.step("should reset after window", async () => {
    const limiter = new SecurityRateLimiter(1, 100);

    assertEquals(limiter.check("test-key-2").allowed, true);
    assertEquals(limiter.check("test-key-2").allowed, false);

    await new Promise((resolve) => setTimeout(resolve, 150));

    assertEquals(limiter.check("test-key-2").allowed, true);
  });

  await t.step("should track separate keys", () => {
    const limiter = new SecurityRateLimiter(2, 1000);

    assertEquals(limiter.check("key1").allowed, true);
    assertEquals(limiter.check("key2").allowed, true);
    assertEquals(limiter.check("key1").allowed, true);
    assertEquals(limiter.check("key2").allowed, true);
    assertEquals(limiter.check("key1").allowed, false);
    assertEquals(limiter.check("key2").allowed, false);
  });
});

Deno.test("Security Utils - HTML Escaping", async (t) => {
  await t.step("should escape HTML entities", () => {
    assertEquals(
      escapeHtml("<script>alert('XSS')</script>"),
      "&lt;script&gt;alert(&#x27;XSS&#x27;)&lt;&#x2F;script&gt;",
    );
    assertEquals(
      escapeHtml('"><img src=x onerror=alert(1)>'),
      "&quot;&gt;&lt;img src=x onerror=alert(1)&gt;",
    );
    assertEquals(escapeHtml("safe text"), "safe text");
    assertEquals(escapeHtml("&<>\"'/"), "&amp;&lt;&gt;&quot;&#x27;&#x2F;");
  });
});

Deno.test("Security Utils - JSON Structure Validation", async (t) => {
  await t.step("should validate JSON structure", () => {
    assertEquals(validateJSONStructure('{"key": "value"}'), true);
    assertEquals(validateJSONStructure("[1, 2, 3]"), true);
    assertEquals(
      validateJSONStructure('  { "nested": { "data": true } }  '),
      true,
    );
    assertEquals(validateJSONStructure("[]"), true);
    assertEquals(validateJSONStructure("{}"), true);
  });

  await t.step("should reject invalid JSON structure", () => {
    assertEquals(validateJSONStructure("not json"), false);
    assertEquals(validateJSONStructure("{incomplete"), false);
    assertEquals(validateJSONStructure("incomplete}"), false);
    assertEquals(validateJSONStructure(""), false);
    assertEquals(validateJSONStructure("null"), false);
    assertEquals(validateJSONStructure('"string"'), false);
  });
});

Deno.test("Security Utils - Hash for Logging", async (t) => {
  await t.step("should create consistent hashes", async () => {
    const hash1 = await hashForLogging("sensitive-data");
    const hash2 = await hashForLogging("sensitive-data");
    assertEquals(hash1, hash2);
    assertEquals(hash1.startsWith("sha256:"), true);
    assertEquals(hash1.length, 15); // "sha256:" + 8 chars + "..."
  });

  await t.step(
    "should create different hashes for different inputs",
    async () => {
      const hash1 = await hashForLogging("data1");
      const hash2 = await hashForLogging("data2");
      assertEquals(hash1 !== hash2, true);
    },
  );
});
