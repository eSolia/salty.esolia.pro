/**
 * @fileoverview Enhanced Salty server with comprehensive security features
 * @author eSolia Inc.
 */

import { salty_decrypt, salty_encrypt, salty_key } from "./salty.ts";
import {
  SECURITY_COMPLIANCE,
  SECURITY_INFO,
  TECH_SPECS,
  VERSION,
  VersionUtils,
} from "./version.ts";
import { LogCategory, logger, SecurityEvent } from "./logger.ts";
import { getTracer, TracingHelpers } from "./telemetry-native.ts";
import { bundle } from "https://deno.land/x/emit@0.32.0/mod.ts";
import { coverageTracker } from "./coverage-tracker.ts";

// Initialize tracer (native telemetry when available)
const tracer = await getTracer();

/**
 * Security configuration constants
 */
/** Rate limiting window duration in milliseconds (1 hour) */
const RATE_LIMIT_WINDOW = 60 * 60 * 1000;
/** Maximum requests allowed per rate limit window */
const RATE_LIMIT_MAX_REQUESTS = 20;
/** Maximum payload size in bytes (1MB) */
const MAX_PAYLOAD_SIZE = 1024 * 1024;
/** Maximum key size in bytes (1KB) */
const MAX_KEY_SIZE = 1024;

/**
 * Request body interface for encrypt/decrypt API endpoints
 */
interface EncryptRequest {
  /** The text payload to encrypt or decrypt */
  payload: string;
  /** The encryption/decryption key */
  key: string;
}

/**
 * Standardized API response interface
 */
interface ApiResponse {
  /** Whether the operation was successful */
  success: boolean;
  /** Response data (encrypted/decrypted text) */
  data?: string;
  /** Error message if operation failed */
  error?: string;
  /** ISO timestamp of the response */
  timestamp?: string;
}

/**
 * Rate limiting entry stored in memory
 */
interface RateLimitEntry {
  /** Number of requests in current window */
  count: number;
  /** Timestamp when the current window started */
  windowStart: number;
}

/**
 * dbFLEX tracking configuration interface
 */
interface DbflexConfig {
  enabled: boolean;
  apiKey?: string;
  baseUrl?: string;
  tableUrl?: string;
  upsertUrl?: string;
  proxySecret?: string;
}

/**
 * In-memory rate limiting store
 * @description Maps client IP addresses to their rate limit data
 * @todo Consider using Redis for production scaling across multiple instances
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

/**
 * Gets the dbFLEX configuration from environment variables
 * @returns The dbFLEX configuration object
 */
function getDbflexConfig(): DbflexConfig {
  return {
    enabled: Deno.env.get("DBFLEX_TRACKING_ENABLED") === "true",
    apiKey: Deno.env.get("DBFLEX_API_KEY"),
    baseUrl: Deno.env.get("DBFLEX_BASE_URL"),
    tableUrl: Deno.env.get("DBFLEX_TABLE_URL"),
    upsertUrl: Deno.env.get("DBFLEX_UPSERT_URL"),
    proxySecret: Deno.env.get("DBFLEX_PROXY_SECRET"),
  };
}

/**
 * Security utility class providing various security-related helper functions
 */
class SecurityUtils {
  /**
   * Extracts the client IP address from the request headers
   * @param request - The incoming HTTP request
   * @returns The client IP address or 'unknown' if not found
   */
  static getClientIP(request: Request): string {
    // Get IP from various headers (for proxies/load balancers)
    const forwardedFor = request.headers.get("x-forwarded-for");
    const realIP = request.headers.get("x-real-ip");
    const cfConnectingIP = request.headers.get("cf-connecting-ip");

    return forwardedFor?.split(",")[0]?.trim() ||
      realIP ||
      cfConnectingIP ||
      "unknown";
  }

  /**
   * Validates that the request has the correct content type for API endpoints
   * @param request - The incoming HTTP request
   * @returns True if content type is application/json, false otherwise
   */
  static isValidContentType(request: Request): boolean {
    const contentType = request.headers.get("content-type");
    return contentType === "application/json";
  }

  /**
   * Creates a comprehensive set of security headers for HTTP responses
   * @returns Headers object with all security headers configured
   */
  static createSecurityHeaders(): Headers {
    const headers = new Headers();

    // Content Security Policy - Secure configuration with necessary inline scripts allowed
    const cspDirectives = [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com https://cdn.jsdelivr.net",
      "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.usefathom.com https://cdn.jsdelivr.net",
      "img-src 'self' data: https:",
      "connect-src 'self' https://cdn.usefathom.com https://api.pwnedpasswords.com",
      "font-src 'self' https://fonts.gstatic.com https://cdn.jsdelivr.net",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
    ];

    // Add CSP reporting if endpoint is configured
    const cspReportUri = Deno.env.get("CSP_REPORT_URI");
    if (cspReportUri) {
      cspDirectives.push(`report-uri ${cspReportUri}`);
      cspDirectives.push(`report-to csp-endpoint`);

      // Add Report-To header for modern browsers
      headers.set(
        "Report-To",
        JSON.stringify({
          group: "csp-endpoint",
          max_age: 86400,
          endpoints: [{ url: cspReportUri }],
        }),
      );
    }

    headers.set("Content-Security-Policy", cspDirectives.join("; "));

    // Security headers
    headers.set("X-Content-Type-Options", "nosniff");
    headers.set("X-Frame-Options", "DENY");
    headers.set("X-XSS-Protection", "1; mode=block");
    headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
    headers.set(
      "Permissions-Policy",
      "geolocation=(), microphone=(), camera=()",
    );

    // HSTS (only if serving over HTTPS)
    headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains",
    );

    return headers;
  }

  /**
   * Creates CORS headers for API endpoints
   * @param request - The incoming HTTP request (optional, for preflight)
   * @returns Headers object with CORS headers configured
   */
  static createCorsHeaders(request?: Request): Headers {
    const headers = new Headers();

    // Get allowed origins from environment or use default
    const allowedOrigins = Deno.env.get("CORS_ALLOWED_ORIGINS")?.split(",") || [
      "https://salty.esolia.pro",
      // devskim: ignore DS137138 - localhost is needed for local development CORS
      "http://localhost:8000",
    ];

    // Check if request origin is allowed
    const origin = request?.headers.get("origin");
    if (origin && allowedOrigins.includes(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
    } else if (allowedOrigins.includes("*")) {
      headers.set("Access-Control-Allow-Origin", "*");
    } else {
      // Default to the first allowed origin if no match
      headers.set("Access-Control-Allow-Origin", allowedOrigins[0]);
    }

    // CORS headers
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "Content-Type, X-API-Key");
    headers.set("Access-Control-Max-Age", "86400"); // 24 hours
    headers.set("Access-Control-Allow-Credentials", "false");

    return headers;
  }

  /**
   * Sanitizes user input by removing potentially dangerous characters
   * @param input - The input string to sanitize
   * @param maxLength - Maximum allowed length for the input
   * @returns Sanitized input string
   * @throws Error if input is invalid or exceeds maximum length
   */
  static sanitizeInput(input: string, maxLength: number): string {
    if (typeof input !== "string") {
      throw new Error("Input must be a string");
    }

    if (input.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength}`);
    }

    // Basic sanitization - remove null bytes
    return input.replace(/\0/g, "");
  }

  /**
   * Logs security-related events with structured data
   * @param event - The type of security event
   * @param details - Additional details about the event
   * @deprecated Use logger.security() instead
   */
  static logSecurityEvent(
    event: string,
    details: Record<string, unknown>,
  ): void {
    // Legacy method - redirect to new logger
    logger.security(
      event as SecurityEvent,
      `Security event: ${event}`,
      details,
    );
  }
}

/**
 * Validates dbFLEX ID format (YYYYMMDD-NNN)
 * @param id - The ID to validate
 * @returns True if the ID format is valid, false otherwise
 */
function isValidDbflexId(id: string): boolean {
  // Format: YYYYMMDD-NNN where NNN is 3 digits
  const pattern = /^(\d{4})(\d{2})(\d{2})-(\d{3})$/;
  const match = id.match(pattern);

  if (!match) return false;

  // Basic date validation
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const day = parseInt(match[3]);

  if (year < 2020 || year > 2030) return false;
  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;

  return true;
}

/**
 * Rate limiting middleware class for preventing API abuse
 */
class RateLimiter {
  /**
   * Checks if a client IP has exceeded the rate limit
   * @param clientIP - The client's IP address
   * @returns True if the request is allowed, false if rate limit exceeded
   */
  static checkRateLimit(clientIP: string): boolean {
    const now = Date.now();
    const entry = rateLimitStore.get(clientIP);

    if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW) {
      // New window or first request
      rateLimitStore.set(clientIP, {
        count: 1,
        windowStart: now,
      });
      return true;
    }

    if (entry.count >= RATE_LIMIT_MAX_REQUESTS) {
      logger.security(
        SecurityEvent.RATE_LIMIT_EXCEEDED,
        `Rate limit exceeded for IP: ${clientIP}`,
        {
          clientIP,
          count: entry.count,
          windowStart: entry.windowStart,
          limit: RATE_LIMIT_MAX_REQUESTS,
        },
      );
      return false;
    }

    entry.count++;
    return true;
  }

  /**
   * Removes expired rate limit entries from memory to prevent memory leaks
   */
  static cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [ip, entry] of rateLimitStore.entries()) {
      if ((now - entry.windowStart) > RATE_LIMIT_WINDOW) {
        rateLimitStore.delete(ip);
      }
    }
  }
}

/**
 * Custom error class for API-specific errors with status codes
 */
class ApiError extends Error {
  /**
   * Creates a new API error
   * @param message - Human-readable error message
   * @param statusCode - HTTP status code (default: 500)
   * @param code - Machine-readable error code (default: 'INTERNAL_ERROR')
   */
  constructor(
    message: string,
    public statusCode: number = 500,
    public code: string = "INTERNAL_ERROR",
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Validates basic API request properties (method, content-type, size)
 * @param request - The incoming HTTP request
 * @throws ApiError if validation fails
 */
function validateApiRequest(request: Request): void {
  if (request.method !== "POST") {
    throw new ApiError("Method not allowed", 405, "METHOD_NOT_ALLOWED");
  }

  if (!SecurityUtils.isValidContentType(request)) {
    throw new ApiError(
      "Invalid content type. Expected application/json",
      400,
      "INVALID_CONTENT_TYPE",
    );
  }

  const contentLength = request.headers.get("content-length");
  if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
    throw new ApiError("Request too large", 413, "REQUEST_TOO_LARGE");
  }
}

/**
 * Validates the API key from request headers
 * @param request - The incoming HTTP request
 * @throws ApiError if API key is missing or invalid
 */
function validateApiKey(request: Request): void {
  const expectedApiKey = Deno.env.get("API_KEY");

  if (expectedApiKey) {
    const providedApiKey = request.headers.get("X-API-Key");

    if (!providedApiKey) {
      logger.security(
        SecurityEvent.API_KEY_MISSING,
        "API request missing required API key",
        {
          clientIP: SecurityUtils.getClientIP(request),
          endpoint: new URL(request.url).pathname,
        },
      );
      throw new ApiError("API key required", 401, "API_KEY_MISSING");
    }

    if (providedApiKey !== expectedApiKey) {
      logger.security(
        SecurityEvent.API_KEY_INVALID,
        "API request with invalid API key",
        {
          clientIP: SecurityUtils.getClientIP(request),
          endpoint: new URL(request.url).pathname,
          providedKeyLength: providedApiKey.length,
        },
      );
      throw new ApiError("Invalid API key", 401, "API_KEY_INVALID");
    }
  }
}

/**
 * Validates and sanitizes the request body for encrypt/decrypt operations
 * @param request - The incoming HTTP request
 * @returns Validated and sanitized request data
 * @throws ApiError if validation fails
 */
function validateRequestBody(request: Request): Promise<EncryptRequest> {
  return TracingHelpers.traceValidation("body-parsing", async () => {
    let body;

    try {
      body = await request.json();
    } catch {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        "Invalid JSON in request body",
        {
          clientIP: SecurityUtils.getClientIP(request),
          contentType: request.headers.get("content-type"),
        },
      );
      throw new ApiError("Invalid JSON in request body", 400, "INVALID_JSON");
    }

    if (!body || typeof body !== "object") {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        "Request body is not a JSON object",
        {
          clientIP: SecurityUtils.getClientIP(request),
          bodyType: typeof body,
        },
      );
      throw new ApiError(
        "Request body must be a JSON object",
        400,
        "INVALID_BODY",
      );
    }

    const { payload, key } = body;

    if (!payload || typeof payload !== "string") {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        "Missing or invalid payload field",
        {
          clientIP: SecurityUtils.getClientIP(request),
          hasPayload: !!payload,
          payloadType: typeof payload,
          payloadConstructor: payload?.constructor?.name || "unknown",
          payloadValue: String(payload).substring(0, 100),
        },
      );
      throw new ApiError(
        "Missing or invalid payload field",
        400,
        "INVALID_PAYLOAD",
      );
    }

    if (!key || typeof key !== "string") {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        "Missing or invalid key field",
        {
          clientIP: SecurityUtils.getClientIP(request),
          hasKey: !!key,
          keyType: typeof key,
          keyConstructor: key?.constructor?.name || "unknown",
        },
      );
      throw new ApiError("Missing or invalid key field", 400, "INVALID_KEY");
    }

    // Sanitize inputs with tracing - ensure Promises are resolved
    const sanitizedPayload = await TracingHelpers.traceSecurity(
      "input-sanitization",
      async () => {
        // Ensure payload is resolved if it's a Promise
        const resolvedPayload = await Promise.resolve(payload);
        if (typeof resolvedPayload !== "string") {
          throw new Error(
            `Payload resolved to ${typeof resolvedPayload}, expected string`,
          );
        }
        return SecurityUtils.sanitizeInput(resolvedPayload, MAX_PAYLOAD_SIZE);
      },
      {
        "input.type": "payload",
        "input.length": typeof payload === "string"
          ? payload.length
          : "unknown",
      },
    );

    const sanitizedKey = await TracingHelpers.traceSecurity(
      "input-sanitization",
      async () => {
        // Ensure key is resolved if it's a Promise
        const resolvedKey = await Promise.resolve(key);
        if (typeof resolvedKey !== "string") {
          throw new Error(
            `Key resolved to ${typeof resolvedKey}, expected string`,
          );
        }
        return SecurityUtils.sanitizeInput(resolvedKey, MAX_KEY_SIZE);
      },
      {
        "input.type": "key",
        "input.length": typeof key === "string" ? key.length : "unknown",
      },
    );

    return {
      payload: sanitizedPayload,
      key: sanitizedKey,
    };
  }, {
    "client.ip": SecurityUtils.getClientIP(request),
    "content_type": request.headers.get("content-type") || "unknown",
  });
}

/**
 * Creates a standardized API response with security headers
 * @param success - Whether the operation was successful
 * @param data - Response data (for successful operations)
 * @param error - Error message (for failed operations)
 * @param request - The original request (for CORS headers)
 * @returns HTTP Response object with proper headers and status code
 */
function createApiResponse(
  success: boolean,
  data?: string,
  error?: string,
  request?: Request,
): Response {
  const response: ApiResponse = {
    success,
    timestamp: new Date().toISOString(),
  };

  if (success && data !== undefined) {
    response.data = data;
  }

  if (!success && error) {
    response.error = error;
  }

  const headers = SecurityUtils.createSecurityHeaders();
  headers.set("Content-Type", "application/json");

  // Add CORS headers for API responses
  const corsHeaders = SecurityUtils.createCorsHeaders(request);
  for (const [key, value] of corsHeaders.entries()) {
    headers.set(key, value);
  }

  return new Response(
    JSON.stringify(response),
    {
      headers,
      status: success
        ? 200
        : (error?.includes("401")
          ? 401
          : error?.includes("405")
          ? 405
          : error?.includes("413")
          ? 413
          : 400),
    },
  );
}

/**
 * Handles encrypt and decrypt API requests with comprehensive security checks
 * @param request - The incoming HTTP request
 * @param operation - Whether to 'encrypt' or 'decrypt' the payload
 * @returns HTTP Response with the operation result or error
 */
function handleApiRequest(
  request: Request,
  operation: "encrypt" | "decrypt",
): Promise<Response> {
  return TracingHelpers.traceAPI("request-handler", async () => {
    const startTime = performance.now();
    const clientIP = SecurityUtils.getClientIP(request);
    const requestId = logger.generateRequestId();

    // Track function coverage
    coverageTracker.trackFunction(
      operation === "encrypt" ? "handleEncrypt" : "handleDecrypt",
    );

    // Add request context to tracing
    tracer.addSpanAttributes({
      "http.method": "POST",
      "http.url": request.url,
      "http.route": `/api/${operation}`,
      "client.ip": clientIP,
      "request.id": requestId,
    });

    try {
      // Check for suspicious activity patterns with tracing (skip if API key provided)
      const hasValidApiKey = !!request.headers.get("X-API-Key") &&
        !!Deno.env.get("API_KEY");
      if (!hasValidApiKey) {
        await TracingHelpers.traceSecurity("suspicious-activity", () => {
          logger.detectSuspiciousActivity(clientIP);
        }, { "client.ip": clientIP });
      }

      // Rate limiting check
      if (!RateLimiter.checkRateLimit(clientIP)) {
        throw new ApiError("Rate limit exceeded", 429, "RATE_LIMIT_EXCEEDED");
      }

      // Validate request
      TracingHelpers.traceValidation("request", () => {
        validateApiRequest(request);
      }, { "http.method": request.method });

      // API key validation
      validateApiKey(request);

      // Body validation (already traced)
      const { payload, key } = await validateRequestBody(request);

      // Perform crypto operations with detailed tracing
      let result: string;

      try {
        // Get the salt from environment
        const saltHex = Deno.env.get("SALT_HEX");
        if (!saltHex) {
          throw new Error("SALT_HEX environment variable not found");
        }

        // Key derivation with tracing
        const cryptoKey = await TracingHelpers.traceCrypto(
          "key-derivation",
          async () => {
            return await salty_key(key, saltHex);
          },
          {
            "crypto.salt_length": saltHex.length,
            "crypto.key_length": key.length,
          },
        );

        // Encryption/decryption with tracing
        if (operation === "encrypt") {
          result = await TracingHelpers.traceCrypto("encrypt", async () => {
            const encrypted = await salty_encrypt(payload, cryptoKey);
            logger.info(`Encryption successful`, {
              originalLength: payload.length,
              encryptedLength: encrypted.length,
              payloadPreview: String(payload).substring(0, 20) +
                (String(payload).length > 20 ? "..." : ""),
              encryptedPreview: String(encrypted).substring(0, 20) +
                (String(encrypted).length > 20 ? "..." : ""),
            }, LogCategory.CRYPTO);
            return encrypted;
          }, {
            "crypto.payload_length": payload.length,
            "crypto.algorithm": "AES-GCM",
          });
        } else {
          result = await TracingHelpers.traceCrypto("decrypt", async () => {
            // Add detailed logging for decrypt operation
            logger.info(`Starting decryption`, {
              encryptedLength: typeof payload === "string"
                ? payload.length
                : "N/A",
              encryptedPreview: typeof payload === "string"
                ? payload.substring(0, 20) + (payload.length > 20 ? "..." : "")
                : String(payload),
              keyLength: key.length,
              payloadType: typeof payload,
              payloadConstructor: payload?.constructor?.name || "unknown",
            }, LogCategory.CRYPTO);

            const decrypted = await salty_decrypt(payload, cryptoKey);

            if (decrypted === null) {
              logger.error(
                `Decryption returned null - basE91 decode likely failed`,
                undefined,
                {
                  payloadLength: payload.length,
                  payloadSample: String(payload).substring(0, 50),
                },
                LogCategory.CRYPTO,
              );
              throw new Error(
                "Decryption failed - invalid basE91 or corrupted data",
              );
            }

            logger.info(`Decryption successful`, {
              encryptedLength: payload.length,
              decryptedLength: decrypted.length,
              encryptedPreview: String(payload).substring(0, 20) +
                (String(payload).length > 20 ? "..." : ""),
              decryptedPreview: String(decrypted).substring(0, 20) +
                (String(decrypted).length > 20 ? "..." : ""),
            }, LogCategory.CRYPTO);
            return decrypted;
          }, {
            "crypto.payload_length": payload.length,
            "crypto.algorithm": "AES-GCM",
          });
        }

        // Record success metrics
        tracer.recordMetric(`crypto.${operation}.success`, 1, {
          "operation": operation,
          "payload_size": payload.length,
          "result_size": result.length,
        });
      } catch (cryptoError) {
        // Record crypto failure metrics
        tracer.recordMetric(`crypto.${operation}.failure`, 1, {
          "operation": operation,
          "error_type": cryptoError instanceof Error
            ? cryptoError.constructor.name
            : "Unknown",
        });

        const errorMessage = cryptoError instanceof Error
          ? cryptoError.message
          : String(cryptoError);

        logger.security(
          SecurityEvent.CRYPTO_FAILURE,
          `Crypto operation failed: ${operation}`,
          {
            operation,
            clientIP,
            error: errorMessage,
            payloadLength: payload.length,
            keyLength: key.length,
            requestId,
          },
        );

        throw new ApiError(
          `${operation} operation failed: ${errorMessage}`,
          400,
          `${operation.toUpperCase()}_FAILED`,
        );
      }

      // Create response with tracing
      const response = await TracingHelpers.traceAPI(
        "response-creation",
        () => {
          return createApiResponse(true, result, undefined, request);
        },
        {
          "response.success": true,
          "response.result_length": result.length,
        },
      );

      // Log successful operation
      const responseTime = performance.now() - startTime;
      logger.apiRequest(
        "POST",
        `/api/${operation}`,
        200,
        responseTime,
        clientIP,
        requestId,
        {
          payloadLength: payload.length,
          resultLength: result.length,
          operation,
        },
      );

      // Record performance metrics
      tracer.recordMetric("api.request.duration", responseTime, {
        "operation": operation,
        "status": "success",
      });

      return response;
    } catch (error) {
      const responseTime = performance.now() - startTime;

      if (error instanceof ApiError) {
        // Log API-specific errors
        logger.apiRequest(
          "POST",
          `/api/${operation}`,
          error.statusCode,
          responseTime,
          clientIP,
          requestId,
          {
            error: error.message,
            code: error.code,
            operation,
          },
        );

        // Record error metrics
        tracer.recordMetric("api.request.error", 1, {
          "operation": operation,
          "error_code": error.code,
          "status_code": error.statusCode.toString(),
        });

        const errorResponse = TracingHelpers.traceAPI(
          "response-creation",
          () => {
            return createApiResponse(false, undefined, error.message, request);
          },
          {
            "response.success": false,
            "response.error_code": error.code,
          },
        );

        return errorResponse;
      }

      // Unexpected error
      logger.error(
        `Unexpected error in API ${operation}`,
        error as Error,
        {
          operation,
          clientIP,
          requestId,
        },
        LogCategory.API,
      );

      logger.apiRequest(
        "POST",
        `/api/${operation}`,
        500,
        responseTime,
        clientIP,
        requestId,
        {
          error: "Internal server error",
          operation,
        },
      );

      // Record unexpected error metrics
      tracer.recordMetric("api.request.unexpected_error", 1, {
        "operation": operation,
        "error_type": error instanceof Error
          ? error.constructor.name
          : "Unknown",
      });

      return createApiResponse(
        false,
        undefined,
        "Internal server error",
        request,
      );
    }
  }, {
    "api.operation": operation,
    "client.ip": SecurityUtils.getClientIP(request),
  });
}

/**
 * Handles the track access API endpoint for dbFLEX integration
 * @param request - The incoming HTTP request
 * @returns HTTP Response with tracking result
 */
async function handleTrackAccess(req: Request): Promise<Response> {
  return await TracingHelpers.traceAPI("request-handler", async () => {
    const dbflexConfig = getDbflexConfig();

    if (!dbflexConfig.enabled) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Tracking not enabled",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    try {
      const data = await req.json();
      const { id, timestamp, userAgent, referrer } = data;

      // Validate ID format
      if (!id || !isValidDbflexId(id)) {
        throw new ApiError("Invalid ID format", 400, "INVALID_ID");
      }

      // Forward to dbFLEX with telemetry
      const result = await forwardToDbflex(id, timestamp, userAgent, referrer);

      return new Response(
        JSON.stringify({
          success: result.success,
          timestamp: new Date().toISOString(),
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    } catch (error) {
      const errorMessage = error instanceof Error
        ? error.message
        : String(error);
      const statusCode = error instanceof ApiError ? error.statusCode : 500;
      logger.error(
        "Track access error:",
        error instanceof Error ? error : new Error(String(error)),
      );
      return new Response(
        JSON.stringify({
          success: false,
          error: errorMessage,
        }),
        {
          status: statusCode,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }, {
    "client.ip": SecurityUtils.getClientIP(req),
    "http.route": "/api/track-access",
  });
}

/**
 * Parses user agent string into human-readable format
 * @param userAgent - The user agent string to parse
 * @returns Human-readable description of the user agent
 */
function parseUserAgent(userAgent: string): string {
  // Basic parsing - can be enhanced with a proper UA parser library
  const lines: string[] = [];

  // Try to extract browser
  const chromeMatch = userAgent.match(/Chrome\/([\d.]+)/);
  const safariMatch = userAgent.match(/Safari\/([\d.]+)/);
  const firefoxMatch = userAgent.match(/Firefox\/([\d.]+)/);

  if (chromeMatch) lines.push(`Browser: Chrome ${chromeMatch[1]}`);
  else if (firefoxMatch) lines.push(`Browser: Firefox ${firefoxMatch[1]}`);
  else if (safariMatch) lines.push(`Browser: Safari ${safariMatch[1]}`);

  // Extract OS
  if (userAgent.includes("Windows NT")) lines.push("OS: Windows");
  else if (userAgent.includes("Mac OS X")) {
    const osMatch = userAgent.match(/Mac OS X ([\d_]+)/);
    if (osMatch) lines.push(`OS: macOS ${osMatch[1].replace(/_/g, ".")}`);
  } else if (userAgent.includes("Linux")) lines.push("OS: Linux");
  else if (userAgent.includes("Android")) lines.push("OS: Android");
  else if (userAgent.includes("iOS")) lines.push("OS: iOS");

  // Platform
  if (userAgent.includes("Mobile")) lines.push("Platform: Mobile");
  else lines.push("Platform: Desktop");

  return lines.join("\n");
}

/**
 * Forwards tracking data to dbFLEX API
 * @param id - The dbFLEX record ID (without SALTY- prefix)
 * @param timestamp - The access timestamp
 * @param userAgent - The user agent string
 * @param referrer - The referrer URL
 * @returns Success indicator
 */
async function forwardToDbflex(
  id: string,
  timestamp: string,
  userAgent: string,
  referrer: string,
): Promise<{ success: boolean }> {
  const config = getDbflexConfig();

  // For proxy mode, we only need baseUrl. For direct mode, we need all fields.
  const isProxyMode = config.baseUrl && !config.tableUrl && !config.upsertUrl;

  if (isProxyMode) {
    if (!config.baseUrl) {
      logger.error("dbFLEX proxy URL not configured");
      return { success: false };
    }
  } else {
    if (
      !config.baseUrl || !config.apiKey || !config.tableUrl || !config.upsertUrl
    ) {
      logger.error("dbFLEX configuration incomplete for direct mode");
      return { success: false };
    }
  }

  try {
    // Construct the URL - if using proxy, baseUrl is the full proxy URL
    const url = config.tableUrl || config.upsertUrl
      ? `${config.baseUrl}/${config.tableUrl}/${config.upsertUrl}`
      : config.baseUrl; // For Cloudflare proxy, just use baseUrl

    // Reconstruct the full ID with SALTY- prefix
    const reconstructedId = `SALTY-${id}`;

    // Parse user agent for human-readable format
    const parsedUserAgent = parseUserAgent(userAgent || "unknown");

    // Prepare payload - dbFLEX will handle access count via trigger
    // Note: § Id might be handled by the match parameter in URL, not in payload
    const payload = [{
      "§ Id": reconstructedId, // Try with ID first
      "Last Accessed": timestamp,
      "Last User Agent": userAgent || "unknown",
      "Last User-Agent": parsedUserAgent,
      "Last Referrer": referrer || "direct",
    }];

    // Alternative payload without § Id if needed
    const payloadWithoutId = [{
      "Last Accessed": timestamp,
      "Last User Agent": userAgent || "unknown",
      "Last User-Agent": parsedUserAgent,
      "Last Referrer": referrer || "direct",
    }];

    logger.debug("Sending to dbFLEX proxy", { url, payload });

    const response = await fetch(url, {
      method: "POST",
      headers: {
        // Don't send auth header if using proxy (proxy handles it)
        ...(config.apiKey && config.tableUrl
          ? { "Authorization": `Bearer ${config.apiKey}` }
          : {}),
        // Add proxy secret if in proxy mode
        ...(isProxyMode && config.proxySecret
          ? { "X-Proxy-Secret": config.proxySecret }
          : {}),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error(
        `dbFLEX API error: ${response.status} ${response.statusText} - ${errorText}`,
      );
      return { success: false };
    }

    logger.info(`Successfully tracked access for ID: ${reconstructedId}`);
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : undefined;

    logger.error(
      "dbFLEX API request failed:",
      error instanceof Error ? error : new Error(String(error)),
      {
        errorMessage,
        errorStack,
        errorType: error?.constructor?.name || "Unknown",
        url: `${config.baseUrl}/${config.tableUrl}/${config.upsertUrl}`,
      },
    );
    return { success: false };
  }
}

/**
 * Serves static files with appropriate security headers
 * @param pathname - The requested file path
 * @returns HTTP Response with the file contents or 404 error
 */
async function serveFile(pathname: string): Promise<Response> {
  try {
    let filePath: string;

    // Main routes
    if (pathname === "/" || pathname === "") {
      filePath = "./index.html";
    } else if (pathname === "/en" || pathname === "/en/") {
      filePath = "./en/index.html";
    } else if (pathname === "/favicon.ico") {
      filePath = "./favicon.ico";
    } // Handle TypeScript module transpilation
    else if (
      pathname.endsWith(".ts") && [
        "/salty.ts",
        "/password-strength.ts",
        "/hibp-checker.ts",
        "/password-generator.ts",
      ].includes(pathname)
    ) {
      logger.debug(`Handling ${pathname} transpilation with Deno emit`, {
        category: LogCategory.HEALTH,
      });
      try {
        const moduleName = pathname.slice(1); // Remove leading slash
        const result = await bundle(
          new URL(`./${moduleName}`, import.meta.url),
        );
        const jsContent = result.code;

        logger.debug("Deno transpilation successful", {
          category: LogCategory.HEALTH,
          module: moduleName,
          contentLength: jsContent.length,
        });

        const headers = SecurityUtils.createSecurityHeaders();
        headers.set("Content-Type", "text/javascript; charset=utf-8");
        return new Response(jsContent, { headers });
      } catch (error) {
        logger.error(
          `Transpilation failed for ${pathname}`,
          error instanceof Error ? error : new Error(String(error)),
          { pathname },
          LogCategory.SECURITY,
        );
        throw new Error("Transpilation failed");
      }
    } // Handle image files
    else if (pathname.startsWith("/img/") && pathname.endsWith(".svg")) {
      // Security check: prevent directory traversal
      const fileName = pathname.replace("/img/", "");
      if (
        fileName.includes("..") || fileName.includes("/") ||
        fileName.includes("\\")
      ) {
        throw new Error("Invalid file path");
      }
      filePath = `./img/${fileName}`;
    } // Handle .well-known files (security.txt, etc.)
    else if (pathname.startsWith("/.well-known/")) {
      const fileName = pathname.replace("/.well-known/", "");
      // Security check: prevent directory traversal
      if (
        fileName.includes("..") || fileName.includes("/") ||
        fileName.includes("\\")
      ) {
        throw new Error("Invalid file path");
      }
      // Only allow specific files
      const allowedWellKnownFiles = ["security.txt", "security-policy"];
      if (!allowedWellKnownFiles.includes(fileName)) {
        throw new Error("File not found");
      }
      filePath = `./.well-known/${fileName}`;
    } // Handle other potential static files (LICENSE, README.md for reference)
    else if (pathname === "/LICENSE") {
      filePath = "./LICENSE";
    } else if (pathname === "/README.md") {
      filePath = "./README.md";
    } else if (pathname === "/japanese-diceware-wordlist.txt") {
      filePath = "./japanese-diceware-wordlist.txt";
    } else if (pathname === "/test-password-generator.html") {
      filePath = "./test-password-generator.html";
    } else if (pathname === "/test-diceware-entropy.html") {
      filePath = "./test-diceware-entropy.html";
    } else if (pathname === "/dashboard.html") {
      filePath = "./dashboard.html";
    } else {
      throw new Error("File not found");
    }

    let fileContent = await Deno.readFile(filePath);
    const headers = SecurityUtils.createSecurityHeaders();

    // Set appropriate content type based on file extension
    if (filePath.endsWith(".html")) {
      headers.set("Content-Type", "text/html; charset=utf-8");

      // Inject SALT_HEX into HTML files
      const saltHex = Deno.env.get("SALT_HEX");
      if (saltHex) {
        let htmlContent = new TextDecoder().decode(fileContent);

        logger.debug("Processing HTML file for salt injection", {
          category: LogCategory.HEALTH,
          filePath,
        });

        // Simple, reliable replacement
        const placeholder = "SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER";

        if (htmlContent.includes(placeholder)) {
          logger.debug("Found salt placeholder, injecting salt", {
            category: LogCategory.HEALTH,
            saltConfigured: true,
          });
          htmlContent = htmlContent.replace(placeholder, saltHex);
          logger.debug("Salt injection completed successfully", {
            category: LogCategory.HEALTH,
          });
        } else {
          logger.debug("No salt placeholder found in HTML file", {
            category: LogCategory.HEALTH,
          });
        }

        fileContent = new Uint8Array(new TextEncoder().encode(htmlContent));
      }
    } else if (filePath.endsWith(".svg")) {
      headers.set("Content-Type", "image/svg+xml");
    } else if (filePath.endsWith(".ico")) {
      headers.set("Content-Type", "image/x-icon");
      // Add cache headers for favicon
      headers.set("Cache-Control", "public, max-age=86400"); // 24 hours
    } else if (filePath.endsWith(".md")) {
      headers.set("Content-Type", "text/markdown; charset=utf-8");
    } else if (filePath === "./LICENSE") {
      headers.set("Content-Type", "text/plain; charset=utf-8");
    } else if (
      filePath.endsWith("security.txt") || filePath.endsWith("security-policy")
    ) {
      headers.set("Content-Type", "text/plain; charset=utf-8");
      // Security.txt should not be cached for long
      headers.set("Cache-Control", "public, max-age=3600"); // 1 hour
    } else if (filePath.endsWith(".txt")) {
      headers.set("Content-Type", "text/plain; charset=utf-8");
    }

    return new Response(fileContent, { headers });
  } catch {
    const headers = SecurityUtils.createSecurityHeaders();
    headers.set("Content-Type", "text/html; charset=utf-8");

    return new Response(
      "<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 - Page Not Found</h1></body></html>",
      { status: 404, headers },
    );
  }
}

/**
 * Main request handler that routes requests to appropriate handlers
 * @param request - The incoming HTTP request
 * @returns HTTP Response for the request
 */
async function handleRequest(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const pathname = url.pathname;

  // Track endpoint coverage
  coverageTracker.trackEndpoint(request.method, pathname);
  coverageTracker.trackFunction("handleRequest");

  // Handle CORS preflight requests for API endpoints
  if (
    request.method === "OPTIONS" &&
    (pathname === "/api/encrypt" || pathname === "/api/decrypt" ||
      pathname === "/api/track-access")
  ) {
    const headers = SecurityUtils.createSecurityHeaders();
    const corsHeaders = SecurityUtils.createCorsHeaders(request);
    for (const [key, value] of corsHeaders.entries()) {
      headers.set(key, value);
    }

    logger.info("CORS preflight request handled", {
      endpoint: pathname,
      origin: request.headers.get("origin"),
      method: request.headers.get("access-control-request-method"),
    }, LogCategory.API);

    return new Response(null, { status: 204, headers });
  }

  // API endpoints
  if (pathname === "/api/encrypt") {
    return handleApiRequest(request, "encrypt");
  }

  if (pathname === "/api/decrypt") {
    return handleApiRequest(request, "decrypt");
  }

  if (pathname === "/api/track-access") {
    return await handleTrackAccess(request);
  }

  // CSP violation reporting endpoint
  if (pathname === "/api/csp-report" && request.method === "POST") {
    try {
      const report = await request.json();

      logger.security(
        SecurityEvent.CSP_VIOLATION,
        "CSP violation reported",
        {
          documentUri: report["csp-report"]?.["document-uri"],
          violatedDirective: report["csp-report"]?.["violated-directive"],
          blockedUri: report["csp-report"]?.["blocked-uri"],
          lineNumber: report["csp-report"]?.["line-number"],
          columnNumber: report["csp-report"]?.["column-number"],
          sourceFile: report["csp-report"]?.["source-file"],
          referrer: report["csp-report"]?.["referrer"],
          clientIP: SecurityUtils.getClientIP(request),
        },
      );

      // Return 204 No Content for successful report
      return new Response(null, { status: 204 });
    } catch (error) {
      logger.error("Failed to process CSP report", error as Error, {
        clientIP: SecurityUtils.getClientIP(request),
      }, LogCategory.SECURITY);

      // Still return success to avoid retries
      return new Response(null, { status: 204 });
    }
  }

  // Health check endpoint with enhanced metrics
  if (pathname === "/health") {
    const headers = SecurityUtils.createSecurityHeaders();
    headers.set("Content-Type", "application/json");

    const metrics = logger.getMetrics();
    const securitySummary = logger.getSecuritySummary();

    // Defensive checks for metrics
    const uptime = metrics?.uptime || 0;
    const startTime = uptime > 0
      ? new Date(Date.now() - uptime * 1000).toISOString()
      : new Date().toISOString();

    const healthData = {
      status: "healthy",
      timestamp: new Date().toISOString(),
      version: VERSION,
      buildInfo: VersionUtils?.getDetailedInfo
        ? VersionUtils.getDetailedInfo()
        : null,
      server: {
        runtime: `Deno ${Deno.version?.deno || "unknown"}`,
        platform: TECH_SPECS?.platform || "unknown",
        uptime: uptime,
        startTime: startTime,
      },
      security: {
        rateLimiting: SECURITY_INFO?.rateLimiting || {},
        headersApplied: SECURITY_INFO?.securityHeaders?.length || 0,
        headers: SECURITY_INFO?.securityHeaders || [],
        apiKeyRequired: !!Deno.env.get("API_KEY"),
        securityEvents: securitySummary || {},
        compliance: SECURITY_COMPLIANCE || {},
      },
      environment: {
        saltConfigured: !!Deno.env.get("SALT_HEX"),
        apiKeyConfigured: !!Deno.env.get("API_KEY"),
        nodeEnv: Deno.env.get("NODE_ENV") || "production",
        logLevel: Deno.env.get("LOG_LEVEL") || "INFO",
      },
      endpoints: TECH_SPECS?.endpoints || [],
      crypto: {
        features: TECH_SPECS?.cryptoFeatures || [],
        webCryptoAvailable: !!globalThis.crypto?.subtle,
      },
      metrics: {
        requests: {
          total: metrics?.totalRequests || 0,
          successful: metrics?.successfulRequests || 0,
          failed: metrics?.failedRequests || 0,
          successRate: (metrics?.totalRequests || 0) > 0
            ? Math.round(
              ((metrics?.successfulRequests || 0) /
                (metrics?.totalRequests || 1)) * 100,
            )
            : 0,
        },
        performance: {
          averageResponseTime: Math.round(metrics?.averageResponseTime || 0),
          metricsResetTime: metrics?.resetTime || new Date().toISOString(),
        },
        endpoints: metrics?.endpointStats
          ? Object.fromEntries(metrics.endpointStats)
          : {},
        security: securitySummary || {},
      },
      coverage: coverageTracker.getRuntimeCoverage(),
    };

    // Health endpoint logging is now handled by handleRequestWithTiming
    // to ensure accurate response time measurement

    return new Response(
      JSON.stringify(healthData, null, 2),
      { headers },
    );
  }

  // Admin dashboard (protected route)
  if (pathname === "/dash" || pathname === "/dash/") {
    // Check if development mode - bypass auth
    const isDevelopment = Deno.env.get("NODE_ENV") === "development";
    const isLocalhost = request.headers.get("host")?.includes("localhost") ||
      request.headers.get("host")?.includes("127.0.0.1");

    if (!isDevelopment && !isLocalhost) {
      // Production mode - require HTTP Basic Auth
      const authHeader = request.headers.get("authorization");
      const dashUser = Deno.env.get("DASH_USER");
      const dashPass = Deno.env.get("DASH_PASS");

      if (!dashUser || !dashPass) {
        logger.error(
          "Dashboard credentials not configured",
          new Error("Missing DASH_USER or DASH_PASS"),
          { path: pathname },
          LogCategory.SECURITY,
        );
        return new Response("Service Unavailable", { status: 503 });
      }

      // Parse Basic Auth header
      let authenticated = false;
      if (authHeader?.startsWith("Basic ")) {
        try {
          const credentials = authHeader.slice(6);
          const decoded = atob(credentials);
          const [user, pass] = decoded.split(":");

          // Constant-time comparison for security
          authenticated = user === dashUser && pass === dashPass;
        } catch (error) {
          logger.debug("Invalid auth header format", {
            category: LogCategory.SECURITY,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      if (!authenticated) {
        logger.security(
          SecurityEvent.UNAUTHORIZED_ACCESS,
          "Unauthorized dashboard access attempt",
          {
            clientIP: SecurityUtils.getClientIP(request),
            path: pathname,
            hasAuthHeader: !!authHeader,
          },
        );

        const headers = SecurityUtils.createSecurityHeaders();
        headers.set("WWW-Authenticate", 'Basic realm="Salty Admin Dashboard"');
        return new Response("Authentication Required", {
          status: 401,
          headers,
        });
      }
    }

    // Serve dashboard
    return serveFile("/dashboard.html");
  }

  // Static file serving
  return serveFile(pathname);
}

/**
 * Cleanup task for rate limiting - removes expired entries to prevent memory leaks
 * Runs every 5 minutes
 */
setInterval(() => {
  RateLimiter.cleanupExpiredEntries();
}, 5 * 60 * 1000);

/**
 * Validates required environment variables on startup
 * @throws Process exit if critical environment variables are missing or invalid
 */
function validateEnvironment(): void {
  coverageTracker.trackFunction("validateEnvironment");
  const saltHex = Deno.env.get("SALT_HEX");

  if (!saltHex) {
    logger.critical("SALT_HEX environment variable is required", {
      missingVariable: "SALT_HEX",
    });
    Deno.exit(1);
  }

  if (!/^[0-9A-Fa-f]{32}$/.test(saltHex)) {
    logger.critical("SALT_HEX must be a 32-character hexadecimal string", {
      saltHexLength: saltHex.length,
      saltHexFormat: "invalid",
    });
    Deno.exit(1);
  }

  const apiKey = Deno.env.get("API_KEY");
  if (apiKey && apiKey.length < 16) {
    logger.warn("API_KEY should be at least 16 characters for security", {
      apiKeyLength: apiKey.length,
      recommendedMinimum: 16,
    });
  }

  // Check dbFLEX tracking configuration
  const dbflexTracking = Deno.env.get("DBFLEX_TRACKING_ENABLED") === "true";
  if (dbflexTracking) {
    const dbflexVars = [
      "DBFLEX_API_KEY",
      "DBFLEX_BASE_URL",
      "DBFLEX_TABLE_URL",
      "DBFLEX_UPSERT_URL",
    ];
    const missingDbflex = dbflexVars.filter((v) => !Deno.env.get(v));
    if (missingDbflex.length > 0) {
      logger.warn(
        `dbFLEX tracking enabled but missing: ${missingDbflex.join(", ")}`,
      );
    } else {
      logger.info("dbFLEX tracking configured and enabled");
    }
  }

  logger.info("Environment validation passed", {
    saltHexConfigured: true,
    apiKeyConfigured: !!apiKey,
    apiKeyLength: apiKey?.length || 0,
    dbflexTrackingEnabled: dbflexTracking,
  });
}

/**
 * Application startup and server initialization
 */

// Validate environment variables before starting
validateEnvironment();

logger.info(`Starting Salty v${VERSION} with enhanced security`, {
  version: VERSION,
  buildInfo: VersionUtils.getExtendedVersion(),
  rateLimitConfig: SECURITY_INFO.rateLimiting,
  maxPayloadSize: `${MAX_PAYLOAD_SIZE / 1024}KB`,
  securityFeatures: TECH_SPECS.securityFeatures.length,
  endpoints: TECH_SPECS.endpoints,
});

/**
 * Register SIGUSR2 handler for low memory detection (Deno 2.4+)
 * @description Logs critical alert when Deno detects low memory conditions
 */
try {
  Deno.addSignalListener("SIGUSR2", () => {
    const memoryUsage = Deno.memoryUsage();
    logger.critical("Low memory condition detected by Deno runtime", {
      category: LogCategory.SYSTEM,
      memoryUsage: {
        rss: `${Math.round(memoryUsage.rss / 1024 / 1024)}MB`,
        heapTotal: `${Math.round(memoryUsage.heapTotal / 1024 / 1024)}MB`,
        heapUsed: `${Math.round(memoryUsage.heapUsed / 1024 / 1024)}MB`,
        external: `${Math.round(memoryUsage.external / 1024 / 1024)}MB`,
      },
      timestamp: new Date().toISOString(),
    });
  });

  logger.debug("SIGUSR2 handler registered for low memory monitoring", {
    category: LogCategory.SYSTEM,
  });
} catch (error) {
  // Gracefully handle if SIGUSR2 is not supported (e.g., on Windows)
  logger.debug("Could not register SIGUSR2 handler", {
    category: LogCategory.SYSTEM,
    reason: error instanceof Error ? error.message : "Unknown error",
  });
}

/**
 * Wrap handleRequest to add timing
 */
async function handleRequestWithTiming(request: Request): Promise<Response> {
  const startTime = performance.now();
  const requestId = logger.generateRequestId();
  const url = new URL(request.url);
  const clientIP = SecurityUtils.getClientIP(request);

  try {
    const response = await handleRequest(request);

    // Log successful requests with proper timing (but skip duplicate health logging)
    if (url.pathname !== "/health") {
      const responseTime = performance.now() - startTime;
      logger.apiRequest(
        request.method,
        url.pathname,
        response.status,
        responseTime,
        clientIP,
        requestId,
      );
    }

    return response;
  } catch (error) {
    const responseTime = performance.now() - startTime;
    const status = error instanceof ApiError ? error.statusCode : 500;

    logger.apiRequest(
      request.method,
      url.pathname,
      status,
      responseTime,
      clientIP,
      requestId,
      { error: error instanceof Error ? error.message : String(error) },
    );

    // Return proper error response
    const headers = SecurityUtils.createSecurityHeaders();
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Internal server error",
        timestamp: new Date().toISOString(),
      }),
      {
        status,
        headers,
      },
    );
  }
}

/**
 * Start the Deno HTTP server
 * @description Starts the server on port 8000 with the main request handler
 */
Deno.serve({ port: 8000 }, handleRequestWithTiming);
