/**
 * @fileoverview Enhanced Salty server with comprehensive security features  
 * @author eSolia Inc.
 */

import { salty_decrypt, salty_encrypt, salty_key } from './salty.ts';
import { VERSION, VersionUtils, TECH_SPECS, SECURITY_INFO } from './version.ts';
import { logger, LogCategory, SecurityEvent } from './logger.ts';
import { tracer, TracingHelpers } from './telemetry.ts';

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
 * In-memory rate limiting store
 * @description Maps client IP addresses to their rate limit data
 * @todo Consider using Redis for production scaling across multiple instances
 */
const rateLimitStore = new Map<string, RateLimitEntry>();

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
    const forwardedFor = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    
    return forwardedFor?.split(',')[0]?.trim() || 
           realIP || 
           cfConnectingIP || 
           'unknown';
  }

  /**
   * Validates that the request has the correct content type for API endpoints
   * @param request - The incoming HTTP request
   * @returns True if content type is application/json, false otherwise
   */
  static isValidContentType(request: Request): boolean {
    const contentType = request.headers.get('content-type');
    return contentType === 'application/json';
  }

  /**
   * Creates a comprehensive set of security headers for HTTP responses
   * @returns Headers object with all security headers configured
   */
  static createSecurityHeaders(): Headers {
    const headers = new Headers();
    
    // Content Security Policy - Secure configuration with necessary inline scripts allowed
    headers.set('Content-Security-Policy', [
      "default-src 'self'",
      "style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com",
      "script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://kit.fontawesome.com https://cdn.usefathom.com",
      "img-src 'self' data: https:",
      "connect-src 'self' https://cdn.usefathom.com",
      "font-src 'self' https://fonts.gstatic.com https://kit.fontawesome.com",
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'"
    ].join('; '));
    
    // Security headers
    headers.set('X-Content-Type-Options', 'nosniff');
    headers.set('X-Frame-Options', 'DENY');
    headers.set('X-XSS-Protection', '1; mode=block');
    headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
    
    // HSTS (only if serving over HTTPS)
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    
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
    if (typeof input !== 'string') {
      throw new Error('Input must be a string');
    }
    
    if (input.length > maxLength) {
      throw new Error(`Input exceeds maximum length of ${maxLength}`);
    }
    
    // Basic sanitization - remove null bytes
    return input.replace(/\0/g, '');
  }

  /**
   * Logs security-related events with structured data
   * @param event - The type of security event
   * @param details - Additional details about the event
   * @deprecated Use logger.security() instead
   */
  static logSecurityEvent(event: string, details: Record<string, any>): void {
    // Legacy method - redirect to new logger
    logger.security(event as SecurityEvent, `Security event: ${event}`, details);
  }
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
    return TracingHelpers.traceSecurity('rate-limit', () => {
      const now = Date.now();
      const entry = rateLimitStore.get(clientIP);
      
      if (!entry || (now - entry.windowStart) > RATE_LIMIT_WINDOW) {
        // New window or first request
        rateLimitStore.set(clientIP, {
          count: 1,
          windowStart: now
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
            limit: RATE_LIMIT_MAX_REQUESTS
          }
        );
        return false;
      }

      entry.count++;
      return true;
    }, {
      'client.ip': clientIP,
      'rate_limit.window_ms': RATE_LIMIT_WINDOW,
      'rate_limit.max_requests': RATE_LIMIT_MAX_REQUESTS
    });
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
    public code: string = 'INTERNAL_ERROR'
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Validates basic API request properties (method, content-type, size)
 * @param request - The incoming HTTP request
 * @throws ApiError if validation fails
 */
function validateApiRequest(request: Request): void {
  if (request.method !== 'POST') {
    throw new ApiError('Method not allowed', 405, 'METHOD_NOT_ALLOWED');
  }

  if (!SecurityUtils.isValidContentType(request)) {
    throw new ApiError('Invalid content type. Expected application/json', 400, 'INVALID_CONTENT_TYPE');
  }

  const contentLength = request.headers.get('content-length');
  if (contentLength && parseInt(contentLength) > MAX_PAYLOAD_SIZE) {
    throw new ApiError('Request too large', 413, 'REQUEST_TOO_LARGE');
  }
}

/**
 * Validates the API key from request headers
 * @param request - The incoming HTTP request
 * @throws ApiError if API key is missing or invalid
 */
function validateApiKey(request: Request): void {
  return TracingHelpers.traceSecurity('api-key', () => {
    const expectedApiKey = Deno.env.get('API_KEY');
    
    if (expectedApiKey) {
      const providedApiKey = request.headers.get('X-API-Key');
      
      if (!providedApiKey) {
        logger.security(
          SecurityEvent.API_KEY_MISSING,
          'API request missing required API key',
          { 
            clientIP: SecurityUtils.getClientIP(request),
            endpoint: new URL(request.url).pathname
          }
        );
        throw new ApiError('API key required', 401, 'API_KEY_MISSING');
      }
      
      if (providedApiKey !== expectedApiKey) {
        logger.security(
          SecurityEvent.API_KEY_INVALID,
          'API request with invalid API key',
          { 
            clientIP: SecurityUtils.getClientIP(request),
            endpoint: new URL(request.url).pathname,
            providedKeyLength: providedApiKey.length
          }
        );
        throw new ApiError('Invalid API key', 401, 'API_KEY_INVALID');
      }
    }
  }, {
    'client.ip': SecurityUtils.getClientIP(request),
    'api_key.required': !!Deno.env.get('API_KEY')
  });
}

/**
 * Validates and sanitizes the request body for encrypt/decrypt operations
 * @param request - The incoming HTTP request
 * @returns Validated and sanitized request data
 * @throws ApiError if validation fails
 */
async function validateRequestBody(request: Request): Promise<EncryptRequest> {
  return TracingHelpers.traceValidation('body-parsing', async () => {
    let body;
    
    try {
      body = await request.json();
    } catch {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        'Invalid JSON in request body',
        { 
          clientIP: SecurityUtils.getClientIP(request),
          contentType: request.headers.get('content-type')
        }
      );
      throw new ApiError('Invalid JSON in request body', 400, 'INVALID_JSON');
    }

    if (!body || typeof body !== 'object') {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        'Request body is not a JSON object',
        { 
          clientIP: SecurityUtils.getClientIP(request),
          bodyType: typeof body
        }
      );
      throw new ApiError('Request body must be a JSON object', 400, 'INVALID_BODY');
    }

    const { payload, key } = body;

    if (!payload || typeof payload !== 'string') {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        'Missing or invalid payload field',
        { 
          clientIP: SecurityUtils.getClientIP(request),
          hasPayload: !!payload,
          payloadType: typeof payload,
          payloadConstructor: payload?.constructor?.name || 'unknown',
          payloadValue: String(payload).substring(0, 100)
        }
      );
      throw new ApiError('Missing or invalid payload field', 400, 'INVALID_PAYLOAD');
    }

    if (!key || typeof key !== 'string') {
      logger.security(
        SecurityEvent.MALFORMED_INPUT,
        'Missing or invalid key field',
        { 
          clientIP: SecurityUtils.getClientIP(request),
          hasKey: !!key,
          keyType: typeof key,
          keyConstructor: key?.constructor?.name || 'unknown'
        }
      );
      throw new ApiError('Missing or invalid key field', 400, 'INVALID_KEY');
    }

    // Sanitize inputs with tracing - ensure Promises are resolved
    const sanitizedPayload = await TracingHelpers.traceSecurity('input-sanitization', async () => {
      // Ensure payload is resolved if it's a Promise
      const resolvedPayload = await Promise.resolve(payload);
      if (typeof resolvedPayload !== 'string') {
        throw new Error(`Payload resolved to ${typeof resolvedPayload}, expected string`);
      }
      return SecurityUtils.sanitizeInput(resolvedPayload, MAX_PAYLOAD_SIZE);
    }, { 'input.type': 'payload', 'input.length': typeof payload === 'string' ? payload.length : 'unknown' });

    const sanitizedKey = await TracingHelpers.traceSecurity('input-sanitization', async () => {
      // Ensure key is resolved if it's a Promise  
      const resolvedKey = await Promise.resolve(key);
      if (typeof resolvedKey !== 'string') {
        throw new Error(`Key resolved to ${typeof resolvedKey}, expected string`);
      }
      return SecurityUtils.sanitizeInput(resolvedKey, MAX_KEY_SIZE);
    }, { 'input.type': 'key', 'input.length': typeof key === 'string' ? key.length : 'unknown' });

    return {
      payload: sanitizedPayload,
      key: sanitizedKey
    };
  }, {
    'client.ip': SecurityUtils.getClientIP(request),
    'content_type': request.headers.get('content-type') || 'unknown'
  });
}

/**
 * Creates a standardized API response with security headers
 * @param success - Whether the operation was successful
 * @param data - Response data (for successful operations)
 * @param error - Error message (for failed operations)
 * @returns HTTP Response object with proper headers and status code
 */
function createApiResponse(success: boolean, data?: string, error?: string): Response {
  const response: ApiResponse = {
    success,
    timestamp: new Date().toISOString()
  };

  if (success && data !== undefined) {
    response.data = data;
  }

  if (!success && error) {
    response.error = error;
  }

  const headers = SecurityUtils.createSecurityHeaders();
  headers.set('Content-Type', 'application/json');

  return new Response(
    JSON.stringify(response),
    {
      headers,
      status: success ? 200 : (error?.includes('401') ? 401 : 
                              error?.includes('405') ? 405 : 
                              error?.includes('413') ? 413 : 400)
    }
  );
}

/**
 * Handles encrypt and decrypt API requests with comprehensive security checks
 * @param request - The incoming HTTP request
 * @param operation - Whether to 'encrypt' or 'decrypt' the payload
 * @returns HTTP Response with the operation result or error
 */
async function handleApiRequest(
  request: Request,
  operation: 'encrypt' | 'decrypt'
): Promise<Response> {
  return TracingHelpers.traceAPI('request-handler', async () => {
    const startTime = performance.now();
    const clientIP = SecurityUtils.getClientIP(request);
    const requestId = logger.generateRequestId();
    
    // Add request context to tracing
    tracer.addSpanAttributes({
      'http.method': 'POST',
      'http.url': request.url,
      'http.route': `/api/${operation}`,
      'client.ip': clientIP,
      'request.id': requestId
    });
    
    try {
      // Check for suspicious activity patterns with tracing (skip if API key provided)
      const hasValidApiKey = !!request.headers.get('X-API-Key') && !!Deno.env.get('API_KEY');
      if (!hasValidApiKey) {
        await TracingHelpers.traceSecurity('suspicious-activity', async () => {
          logger.detectSuspiciousActivity(clientIP);
        }, { 'client.ip': clientIP });
      }

      // Rate limiting check (already traced in RateLimiter.checkRateLimit)
      if (!RateLimiter.checkRateLimit(clientIP)) {
        throw new ApiError('Rate limit exceeded', 429, 'RATE_LIMIT_EXCEEDED');
      }

      // Validate request (already traced)
      TracingHelpers.traceValidation('request', () => {
        validateApiRequest(request);
      }, { 'http.method': request.method });
      
      // API key validation (already traced)
      validateApiKey(request);
      
      // Body validation (already traced)
      const { payload, key } = await validateRequestBody(request);

      // Perform crypto operations with detailed tracing
      let result: string;
      
      try {
        // Get the salt from environment
        const saltHex = Deno.env.get('SALT_HEX');
        if (!saltHex) {
          throw new Error('SALT_HEX environment variable not found');
        }
        
        // Key derivation with tracing
        const cryptoKey = await TracingHelpers.traceCrypto('key-derivation', async () => {
          return await salty_key(key, saltHex);
        }, {
          'crypto.salt_length': saltHex.length,
          'crypto.key_length': key.length
        });
        
        // Encryption/decryption with tracing
        if (operation === 'encrypt') {
          result = await TracingHelpers.traceCrypto('encrypt', async () => {
            const encrypted = await salty_encrypt(payload, cryptoKey);
            logger.info(`Encryption successful`, {
              originalLength: payload.length,
              encryptedLength: encrypted.length,
              payloadPreview: String(payload).substring(0, 20) + (String(payload).length > 20 ? '...' : ''),
              encryptedPreview: String(encrypted).substring(0, 20) + (String(encrypted).length > 20 ? '...' : '')
            }, LogCategory.CRYPTO);
            return encrypted;
          }, {
            'crypto.payload_length': payload.length,
            'crypto.algorithm': 'AES-GCM'
          });
        } else {
          result = await TracingHelpers.traceCrypto('decrypt', async () => {
            // Add detailed logging for decrypt operation
            logger.info(`Starting decryption`, {
              encryptedLength: typeof payload === 'string' ? payload.length : 'N/A',
              encryptedPreview: typeof payload === 'string' ? payload.substring(0, 20) + (payload.length > 20 ? '...' : '') : String(payload),
              keyLength: key.length,
              payloadType: typeof payload,
              payloadConstructor: payload?.constructor?.name || 'unknown'
            }, LogCategory.CRYPTO);
            
            const decrypted = await salty_decrypt(payload, cryptoKey);
            
            if (decrypted === null) {
              logger.error(`Decryption returned null - basE91 decode likely failed`, {
                payloadLength: payload.length,
                payloadSample: String(payload).substring(0, 50)
              }, LogCategory.CRYPTO);
              throw new Error('Decryption failed - invalid basE91 or corrupted data');
            }
            
            logger.info(`Decryption successful`, {
              encryptedLength: payload.length,
              decryptedLength: decrypted.length,
              encryptedPreview: String(payload).substring(0, 20) + (String(payload).length > 20 ? '...' : ''),
              decryptedPreview: String(decrypted).substring(0, 20) + (String(decrypted).length > 20 ? '...' : '')
            }, LogCategory.CRYPTO);
            return decrypted;
          }, {
            'crypto.payload_length': payload.length,
            'crypto.algorithm': 'AES-GCM'
          });
        }
        
        // Record success metrics
        tracer.recordMetric(`crypto.${operation}.success`, 1, {
          'operation': operation,
          'payload_size': payload.length,
          'result_size': result.length
        });
        
      } catch (cryptoError) {
        // Record crypto failure metrics
        tracer.recordMetric(`crypto.${operation}.failure`, 1, {
          'operation': operation,
          'error_type': cryptoError instanceof Error ? cryptoError.constructor.name : 'Unknown'
        });
        
        logger.security(
          SecurityEvent.CRYPTO_FAILURE,
          `Crypto operation failed: ${operation}`,
          {
            operation,
            clientIP,
            error: cryptoError.message,
            payloadLength: payload.length,
            keyLength: key.length,
            requestId
          }
        );
        
        throw new ApiError(
          `${operation} operation failed: ${cryptoError.message}`,
          400,
          `${operation.toUpperCase()}_FAILED`
        );
      }

      // Create response with tracing
      const response = await TracingHelpers.traceAPI('response-creation', () => {
        return createApiResponse(true, result);
      }, {
        'response.success': true,
        'response.result_length': result.length
      });

      // Log successful operation
      const responseTime = performance.now() - startTime;
      logger.apiRequest(
        'POST',
        `/api/${operation}`,
        200,
        responseTime,
        clientIP,
        requestId,
        {
          payloadLength: payload.length,
          resultLength: result.length,
          operation
        }
      );

      // Record performance metrics
      tracer.recordMetric('api.request.duration', responseTime, {
        'operation': operation,
        'status': 'success'
      });

      return response;

    } catch (error) {
      const responseTime = performance.now() - startTime;
      
      if (error instanceof ApiError) {
        // Log API-specific errors
        logger.apiRequest(
          'POST',
          `/api/${operation}`,
          error.statusCode,
          responseTime,
          clientIP,
          requestId,
          {
            error: error.message,
            code: error.code,
            operation
          }
        );

        // Record error metrics
        tracer.recordMetric('api.request.error', 1, {
          'operation': operation,
          'error_code': error.code,
          'status_code': error.statusCode.toString()
        });

        const errorResponse = TracingHelpers.traceAPI('response-creation', () => {
          return createApiResponse(false, undefined, error.message);
        }, {
          'response.success': false,
          'response.error_code': error.code
        });

        return errorResponse;
      }

      // Unexpected error
      logger.error(
        `Unexpected error in API ${operation}`,
        error as Error,
        {
          operation,
          clientIP,
          requestId
        },
        LogCategory.API
      );

      logger.apiRequest(
        'POST',
        `/api/${operation}`,
        500,
        responseTime,
        clientIP,
        requestId,
        {
          error: 'Internal server error',
          operation
        }
      );

      // Record unexpected error metrics
      tracer.recordMetric('api.request.unexpected_error', 1, {
        'operation': operation,
        'error_type': error instanceof Error ? error.constructor.name : 'Unknown'
      });

      return createApiResponse(false, undefined, 'Internal server error');
    }
  }, {
    'api.operation': operation,
    'client.ip': SecurityUtils.getClientIP(request)
  });
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
    if (pathname === '/' || pathname === '') {
      filePath = './index.html';
    } else if (pathname === '/en' || pathname === '/en/') {
      filePath = './en/index.html';
    } else if (pathname === '/salty.ts') {
      filePath = './salty.ts';
    } 
    // Handle image files
    else if (pathname.startsWith('/img/') && pathname.endsWith('.svg')) {
      // Security check: prevent directory traversal
      const fileName = pathname.replace('/img/', '');
      if (fileName.includes('..') || fileName.includes('/') || fileName.includes('\\')) {
        throw new Error('Invalid file path');
      }
      filePath = `./img/${fileName}`;
    } 
    // Handle other potential static files (LICENSE, README.md for reference)
    else if (pathname === '/LICENSE') {
      filePath = './LICENSE';
    } else if (pathname === '/README.md') {
      filePath = './README.md';
    } else {
      throw new Error('File not found');
    }

    let fileContent = await Deno.readFile(filePath);
    const headers = SecurityUtils.createSecurityHeaders();
    
    // Set appropriate content type based on file extension
    if (filePath.endsWith('.html')) {
      headers.set('Content-Type', 'text/html; charset=utf-8');
      
      // Inject SALT_HEX into HTML files
      const saltHex = Deno.env.get('SALT_HEX');
      if (saltHex) {
        let htmlContent = new TextDecoder().decode(fileContent);
        
        console.log(`[DEBUG] Processing HTML file: ${filePath}`);
        console.log('[DEBUG] Attempting salt injection...');
        
        // Simple, reliable replacement
        const placeholder = 'SALT_HEX_PLACEHOLDER_INJECTED_BY_SERVER';
        
        if (htmlContent.includes(placeholder)) {
          console.log(`[DEBUG] Found salt placeholder, injecting salt: ${saltHex}`);
          htmlContent = htmlContent.replace(placeholder, saltHex);
          console.log('[DEBUG] Salt injection completed successfully');
        } else {
          console.log('[DEBUG] No salt placeholder found in this HTML file');
        }
        
        fileContent = new TextEncoder().encode(htmlContent);
      }
    } else if (filePath.endsWith('.ts')) {
      // Serve TypeScript files as JavaScript modules for browser compatibility
      headers.set('Content-Type', 'text/javascript; charset=utf-8');
    } else if (filePath.endsWith('.svg')) {
      headers.set('Content-Type', 'image/svg+xml');
    } else if (filePath.endsWith('.md')) {
      headers.set('Content-Type', 'text/markdown; charset=utf-8');
    } else if (filePath === './LICENSE') {
      headers.set('Content-Type', 'text/plain; charset=utf-8');
    }

    return new Response(fileContent, { headers });
    
  } catch {
    const headers = SecurityUtils.createSecurityHeaders();
    headers.set('Content-Type', 'text/html; charset=utf-8');
    
    return new Response(
      '<!DOCTYPE html><html><head><title>404 Not Found</title></head><body><h1>404 - Page Not Found</h1></body></html>',
      { status: 404, headers }
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

  // API endpoints
  if (pathname === '/api/encrypt') {
    return handleApiRequest(request, 'encrypt');
  }
  
  if (pathname === '/api/decrypt') {
    return handleApiRequest(request, 'decrypt');
  }

  // Health check endpoint with enhanced metrics
  if (pathname === '/health') {
    const headers = SecurityUtils.createSecurityHeaders();
    headers.set('Content-Type', 'application/json');
    
    const metrics = logger.getMetrics();
    const securitySummary = logger.getSecuritySummary();
    
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: VERSION,
      buildInfo: VersionUtils.getDetailedInfo(),
      server: {
        runtime: `Deno ${Deno.version.deno}`,
        platform: TECH_SPECS.platform,
        uptime: metrics.uptime,
        startTime: new Date(Date.now() - metrics.uptime * 1000).toISOString()
      },
      security: {
        rateLimiting: SECURITY_INFO.rateLimiting,
        headersApplied: SECURITY_INFO.securityHeaders.length,
        apiKeyRequired: !!Deno.env.get('API_KEY'),
        securityEvents: securitySummary
      },
      environment: {
        saltConfigured: !!Deno.env.get('SALT_HEX'),
        apiKeyConfigured: !!Deno.env.get('API_KEY'),
        nodeEnv: Deno.env.get('NODE_ENV') || 'production',
        logLevel: Deno.env.get('LOG_LEVEL') || 'INFO'
      },
      endpoints: TECH_SPECS.endpoints,
      crypto: {
        features: TECH_SPECS.cryptoFeatures,
        webCryptoAvailable: !!globalThis.crypto?.subtle
      },
      metrics: {
        requests: {
          total: metrics.totalRequests,
          successful: metrics.successfulRequests,
          failed: metrics.failedRequests,
          successRate: metrics.totalRequests > 0 ? 
            Math.round((metrics.successfulRequests / metrics.totalRequests) * 100) : 0
        },
        performance: {
          averageResponseTime: Math.round(metrics.averageResponseTime),
          metricsResetTime: metrics.resetTime
        },
        endpoints: Object.fromEntries(metrics.endpointStats),
        security: securitySummary
      }
    };
    
    logger.apiRequest(
      'GET',
      '/health',
      200,
      performance.now(),
      SecurityUtils.getClientIP(request),
      logger.generateRequestId(),
      { healthCheck: true }
    );
    
    return new Response(
      JSON.stringify(healthData, null, 2),
      { headers }
    );
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
  const saltHex = Deno.env.get('SALT_HEX');
  
  if (!saltHex) {
    logger.critical('SALT_HEX environment variable is required', {
      missingVariable: 'SALT_HEX'
    });
    Deno.exit(1);
  }

  if (!/^[0-9A-Fa-f]{32}$/.test(saltHex)) {
    logger.critical('SALT_HEX must be a 32-character hexadecimal string', {
      saltHexLength: saltHex.length,
      saltHexFormat: 'invalid'
    });
    Deno.exit(1);
  }

  const apiKey = Deno.env.get('API_KEY');
  if (apiKey && apiKey.length < 16) {
    logger.warn('API_KEY should be at least 16 characters for security', {
      apiKeyLength: apiKey.length,
      recommendedMinimum: 16
    });
  }

  logger.info('Environment validation passed', {
    saltHexConfigured: true,
    apiKeyConfigured: !!apiKey,
    apiKeyLength: apiKey?.length || 0
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
  endpoints: TECH_SPECS.endpoints
});

/**
 * Start the Deno HTTP server
 * @description Starts the server on port 8000 with the main request handler
 */
Deno.serve({ port: 8000 }, handleRequest);