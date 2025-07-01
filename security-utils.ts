/**
 * @fileoverview Security utility functions for input validation and sanitization
 * @description Provides comprehensive security validation functions following OWASP guidelines
 */

import { logger, SecurityEvent } from "./logger.ts";

/**
 * Security configuration options
 */
export interface SecurityConfig {
  /** Enable strict input validation */
  strictValidation: boolean;
  /** Maximum allowed payload size in bytes */
  maxPayloadSize: number;
  /** Maximum allowed key size in bytes */
  maxKeySize: number;
  /** Enable security audit logging */
  auditLogging: boolean;
  /** Block dangerous patterns in inputs */
  blockDangerousPatterns: boolean;
}

/**
 * Default security configuration
 */
export const DEFAULT_SECURITY_CONFIG: SecurityConfig = {
  strictValidation: true,
  maxPayloadSize: 1024 * 1024, // 1MB
  maxKeySize: 1024, // 1KB
  auditLogging: true,
  blockDangerousPatterns: true,
};

/**
 * Dangerous patterns that could indicate injection attempts
 */
const DANGEROUS_PATTERNS = [
  /eval\s*\(/i,
  /new\s+Function\s*\(/i,
  /import\s*\(/i,
  /require\s*\(/i,
  /\bprocess\s*\./i,
  /\bDeno\s*\./i,
  /\bglobalThis\s*\./i,
  /\bwindow\s*\./i,
  /\bdocument\s*\./i,
  /<script/i,
  /javascript:/i,
  /on\w+\s*=/i, // onclick=, onerror=, etc.
];

/**
 * Shell metacharacters that could be used for command injection
 */
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>\\'"]/;

/**
 * SQL injection patterns
 */
const SQL_PATTERNS =
  /(\b(union|select|insert|update|delete|drop|create|alter|exec|script)\b|--|\/\*|\*\/|xp_|sp_)/i;

/**
 * Path traversal patterns
 */
const PATH_TRAVERSAL_PATTERNS = /\.\.[\/\\]|\.\.%2[fF]|\.\.%5[cC]/;

/**
 * Validates input against dangerous patterns
 * @param input - The input string to validate
 * @param context - Context for logging (e.g., "payload", "key")
 * @returns True if input is safe, false if dangerous patterns detected
 */
export function validateAgainstPatterns(
  input: string,
  context: string,
): boolean {
  if (typeof input !== "string") {
    return false;
  }

  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(input)) {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        `Dangerous pattern detected in ${context}`,
        {
          pattern: pattern.toString(),
          context,
          inputLength: input.length,
          sample: input.substring(0, 50),
        },
      );
      return false;
    }
  }

  return true;
}

/**
 * Validates that input doesn't contain shell metacharacters
 * @param input - The input string to validate
 * @returns True if input is safe, false if shell metacharacters detected
 */
export function validateNoShellMetacharacters(input: string): boolean {
  return !SHELL_METACHARACTERS.test(input);
}

/**
 * Validates that input doesn't contain SQL injection patterns
 * @param input - The input string to validate
 * @returns True if input is safe, false if SQL patterns detected
 */
export function validateNoSQLPatterns(input: string): boolean {
  return !SQL_PATTERNS.test(input);
}

/**
 * Validates that a path doesn't contain traversal attempts
 * @param path - The file path to validate
 * @returns True if path is safe, false if traversal patterns detected
 */
export function validateNoPathTraversal(path: string): boolean {
  if (PATH_TRAVERSAL_PATTERNS.test(path)) {
    logger.security(
      SecurityEvent.MALFORMED_INPUT,
      "Path traversal attempt detected",
      { path, pattern: PATH_TRAVERSAL_PATTERNS.toString() },
    );
    return false;
  }

  // Additional check for absolute paths
  if (path.startsWith("/") || path.match(/^[a-zA-Z]:[\\\/]/)) {
    logger.security(
      SecurityEvent.MALFORMED_INPUT,
      "Absolute path not allowed",
      { path },
    );
    return false;
  }

  return true;
}

/**
 * Sanitizes a string by removing null bytes and control characters
 * @param input - The input string to sanitize
 * @param maxLength - Maximum allowed length
 * @returns Sanitized string
 */
export function sanitizeString(input: string, maxLength: number): string {
  if (typeof input !== "string") {
    throw new TypeError("Input must be a string");
  }

  // Remove null bytes and control characters
  let sanitized = input
    .replace(/\0/g, "") // Remove null bytes
    // deno-lint-ignore no-control-regex
    .replace(/[\x00-\x1F\x7F]/g, ""); // Remove control characters

  // Truncate to maximum length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
  }

  return sanitized;
}

/**
 * Validates Base91 input format
 * @param input - The input string to validate
 * @returns True if valid Base91, false otherwise
 */
export function validateBase91(input: string): boolean {
  // Base91 alphabet
  const base91Pattern = /^[A-Za-z0-9!#$%&()*+,./:;<=>?@[\]^_`{|}~"-]+$/;
  return base91Pattern.test(input);
}

/**
 * Validates hexadecimal input format
 * @param input - The input string to validate
 * @returns True if valid hex, false otherwise
 */
export function validateHex(input: string): boolean {
  const hexPattern = /^[0-9A-Fa-f]+$/;
  return hexPattern.test(input) && input.length % 2 === 0;
}

/**
 * Validates environment variable values for security
 * @param name - The environment variable name
 * @param value - The environment variable value
 * @returns True if safe, false if potentially dangerous
 */
export function validateEnvironmentVariable(
  name: string,
  value: string,
): boolean {
  // Check for command injection in env vars
  if (SHELL_METACHARACTERS.test(value)) {
    logger.security(
      SecurityEvent.MALFORMED_INPUT,
      "Dangerous characters in environment variable",
      { name, valueLength: value.length },
    );
    return false;
  }

  // Check specific env var requirements
  switch (name) {
    case "SALT_HEX":
      return validateHex(value) && value.length === 32;
    case "API_KEY":
      // Base64 pattern
      return /^[A-Za-z0-9+/]+=*$/.test(value);
    case "LOG_LEVEL":
      return ["DEBUG", "INFO", "WARN", "ERROR", "SECURITY", "CRITICAL"]
        .includes(value);
    case "LOG_FORMAT":
      return ["json", "text"].includes(value);
    case "NODE_ENV":
      return ["development", "staging", "production"].includes(value);
    default:
      return true;
  }
}

/**
 * Creates a security audit log entry
 * @param event - The security event type
 * @param message - Human-readable message
 * @param details - Additional context
 * @returns Sanitized audit log entry
 */
export function createSecurityAuditLog(
  event: SecurityEvent,
  message: string,
  details: Record<string, unknown>,
): Record<string, unknown> {
  // Sanitize details to prevent log injection
  const sanitizedDetails: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(details)) {
    if (typeof value === "string") {
      // Remove newlines and control characters from log entries
      sanitizedDetails[key] = value
        .replace(/[\r\n]/g, " ")
        // deno-lint-ignore no-control-regex
        .replace(/[\x00-\x1F\x7F]/g, "");
    } else {
      sanitizedDetails[key] = value;
    }
  }

  return {
    timestamp: new Date().toISOString(),
    event,
    message: message.replace(/[\r\n]/g, " "),
    details: sanitizedDetails,
    severity: getSecurityEventSeverity(event),
  };
}

/**
 * Gets the severity level for a security event
 * @param event - The security event type
 * @returns Severity level (1-5, with 5 being most severe)
 */
function getSecurityEventSeverity(event: SecurityEvent): number {
  switch (event) {
    case SecurityEvent.CRYPTO_FAILURE:
    case SecurityEvent.MALFORMED_INPUT:
      return 5; // Critical
    case SecurityEvent.API_KEY_INVALID:
    case SecurityEvent.UNAUTHORIZED_ACCESS:
      return 4; // High
    case SecurityEvent.RATE_LIMIT_EXCEEDED:
    case SecurityEvent.SUSPICIOUS_ACTIVITY:
      return 3; // Medium
    case SecurityEvent.API_KEY_MISSING:
    case SecurityEvent.INVALID_REQUEST:
      return 2; // Low
    case SecurityEvent.CSP_VIOLATION:
      return 1; // Info
    default:
      return 3; // Default to medium
  }
}

/**
 * Validates URL format and scheme
 * @param url - The URL string to validate
 * @param allowedSchemes - Array of allowed URL schemes
 * @returns True if valid and safe, false otherwise
 */
export function validateURL(
  url: string,
  allowedSchemes: string[] = ["https"],
): boolean {
  try {
    const parsed = new URL(url);

    // Check scheme
    if (!allowedSchemes.includes(parsed.protocol.replace(":", ""))) {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        "Invalid URL scheme",
        { url, scheme: parsed.protocol, allowed: allowedSchemes },
      );
      return false;
    }

    // Check for javascript: and data: URLs
    if (parsed.protocol === "javascript:" || parsed.protocol === "data:") {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        "Dangerous URL scheme detected",
        { url, scheme: parsed.protocol },
      );
      return false;
    }

    // Check for localhost/private IPs (SSRF prevention)
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname.startsWith("192.168.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("172.")
    ) {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        "Private/local URL not allowed",
        { url, hostname },
      );
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Validates Content-Type header
 * @param contentType - The Content-Type header value
 * @param allowedTypes - Array of allowed content types
 * @returns True if valid, false otherwise
 */
export function validateContentType(
  contentType: string | null,
  allowedTypes: string[],
): boolean {
  if (!contentType) {
    return false;
  }

  // Extract base content type (without parameters)
  const baseType = contentType.split(";")[0].trim().toLowerCase();

  return allowedTypes.some((allowed) => baseType === allowed.toLowerCase());
}

/**
 * Rate limit check result
 */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
}

/**
 * Simple in-memory rate limiter for security operations
 */
export class SecurityRateLimiter {
  private limits = new Map<string, { count: number; resetAt: number }>();

  constructor(
    private maxRequests: number,
    private windowMs: number,
  ) {}

  /**
   * Check if an operation is allowed under rate limits
   * @param key - The rate limit key (e.g., IP address)
   * @returns Rate limit result
   */
  check(key: string): RateLimitResult {
    const now = Date.now();
    const limit = this.limits.get(key);

    if (!limit || now > limit.resetAt) {
      // New window
      this.limits.set(key, {
        count: 1,
        resetAt: now + this.windowMs,
      });

      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: new Date(now + this.windowMs),
      };
    }

    if (limit.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: new Date(limit.resetAt),
      };
    }

    limit.count++;

    return {
      allowed: true,
      remaining: this.maxRequests - limit.count,
      resetAt: new Date(limit.resetAt),
    };
  }

  /**
   * Clean up expired entries
   */
  cleanup(): void {
    const now = Date.now();
    for (const [key, limit] of this.limits.entries()) {
      if (now > limit.resetAt) {
        this.limits.delete(key);
      }
    }
  }
}

/**
 * Escapes HTML special characters to prevent XSS
 * @param input - The input string to escape
 * @returns HTML-escaped string
 */
export function escapeHtml(input: string): string {
  const htmlEscapes: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#x27;",
    "/": "&#x2F;",
  };

  return input.replace(/[&<>"'/]/g, (char) => htmlEscapes[char]);
}

/**
 * Validates JSON structure without parsing (to prevent DoS)
 * @param input - The JSON string to validate
 * @returns True if appears to be valid JSON structure
 */
export function validateJSONStructure(input: string): boolean {
  // Basic structure check without parsing
  const trimmed = input.trim();

  // Check if it starts and ends with object or array delimiters
  if (
    (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
    (trimmed.startsWith("[") && trimmed.endsWith("]"))
  ) {
    // Check for basic JSON patterns
    const jsonPattern = /^[\s\r\n]*[\[\{][\s\S]*[\]\}][\s\r\n]*$/;
    return jsonPattern.test(input);
  }

  return false;
}

/**
 * Creates a secure hash of sensitive data for logging
 * @param data - The sensitive data to hash
 * @returns Hashed representation safe for logging
 */
export async function hashForLogging(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
    "",
  );

  // Return first 8 chars for identification
  return `sha256:${hashHex.substring(0, 8)}...`;
}
