/**
 * @fileoverview Security configuration interface for Salty
 * @description Centralized security settings and policies
 */

import { LogLevel } from "./logger.ts";

/**
 * Security configuration interface
 */
export interface SecurityConfig {
  /** Rate limiting configuration */
  rateLimiting: {
    /** Enable rate limiting */
    enabled: boolean;
    /** Requests per minute */
    requestsPerMinute: number;
    /** Burst size allowed */
    burstSize: number;
    /** Block duration in minutes */
    blockDuration: number;
  };

  /** Authentication configuration */
  authentication: {
    /** Require API key for all requests */
    requireApiKey: boolean;
    /** API key header name */
    apiKeyHeader: string;
    /** Allow multiple API keys */
    multipleKeys: boolean;
    /** API key expiration in days (0 = never) */
    keyExpirationDays: number;
  };

  /** Encryption configuration */
  encryption: {
    /** Algorithm for encryption */
    algorithm: "AES-GCM";
    /** Key size in bits */
    keySize: 256;
    /** PBKDF2 iterations */
    pbkdf2Iterations: number;
    /** Salt length in bytes */
    saltLength: number;
    /** IV length in bytes */
    ivLength: number;
  };

  /** Input validation configuration */
  validation: {
    /** Maximum input length */
    maxInputLength: number;
    /** Allow special characters */
    allowSpecialChars: boolean;
    /** Strict mode (blocks all suspicious patterns) */
    strictMode: boolean;
    /** Custom validation patterns */
    customPatterns?: RegExp[];
  };

  /** Security headers configuration */
  headers: {
    /** Content Security Policy */
    csp: {
      enabled: boolean;
      policy: string;
      reportUri?: string;
    };
    /** CORS configuration */
    cors: {
      enabled: boolean;
      allowedOrigins: string[];
      allowedMethods: string[];
      allowCredentials: boolean;
      maxAge: number;
    };
    /** Additional security headers */
    additionalHeaders: Record<string, string>;
  };

  /** Logging configuration */
  logging: {
    /** Minimum log level */
    minLevel: LogLevel;
    /** Enable audit logging */
    auditEnabled: boolean;
    /** Log sensitive operations */
    logSensitiveOps: boolean;
    /** Webhook for critical alerts */
    alertWebhook?: string;
    /** Maximum log retention days */
    retentionDays: number;
  };

  /** Monitoring configuration */
  monitoring: {
    /** Enable security monitoring */
    enabled: boolean;
    /** Suspicious activity threshold */
    suspiciousThreshold: number;
    /** Alert on high risk events */
    alertOnHighRisk: boolean;
    /** Metrics collection interval (seconds) */
    metricsInterval: number;
  };

  /** IP filtering configuration */
  ipFiltering: {
    /** Enable IP filtering */
    enabled: boolean;
    /** Whitelist mode (true) or blacklist mode (false) */
    whitelistMode: boolean;
    /** List of IPs or CIDR ranges */
    ipList: string[];
    /** Auto-block suspicious IPs */
    autoBlock: boolean;
  };

  /** Error handling configuration */
  errorHandling: {
    /** Show detailed errors in development */
    verboseErrors: boolean;
    /** Include stack traces */
    includeStackTraces: boolean;
    /** Custom error messages */
    customMessages: Record<string, string>;
  };
}

/**
 * Default security configuration
 */
export const defaultSecurityConfig: SecurityConfig = {
  rateLimiting: {
    enabled: true,
    requestsPerMinute: 60,
    burstSize: 10,
    blockDuration: 15,
  },
  authentication: {
    requireApiKey: true,
    apiKeyHeader: "X-API-Key",
    multipleKeys: false,
    keyExpirationDays: 0,
  },
  encryption: {
    algorithm: "AES-GCM",
    keySize: 256,
    pbkdf2Iterations: 600000,
    saltLength: 16,
    ivLength: 12,
  },
  validation: {
    maxInputLength: 10000,
    allowSpecialChars: true,
    strictMode: true,
    customPatterns: [],
  },
  headers: {
    csp: {
      enabled: true,
      policy:
        "default-src 'self'; script-src 'self' https://cdn.tailwindcss.com https://kit.fontawesome.com; style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com https://kit.fontawesome.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self';",
      reportUri: "/api/csp-report",
    },
    cors: {
      enabled: true,
      allowedOrigins: ["https://salty.esolia.pro"],
      allowedMethods: ["GET", "POST"],
      allowCredentials: false,
      maxAge: 86400,
    },
    additionalHeaders: {
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "X-XSS-Protection": "1; mode=block",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
    },
  },
  logging: {
    minLevel: LogLevel.INFO,
    auditEnabled: true,
    logSensitiveOps: true,
    retentionDays: 90,
  },
  monitoring: {
    enabled: true,
    suspiciousThreshold: 10,
    alertOnHighRisk: true,
    metricsInterval: 60,
  },
  ipFiltering: {
    enabled: false,
    whitelistMode: false,
    ipList: [],
    autoBlock: true,
  },
  errorHandling: {
    verboseErrors: false,
    includeStackTraces: false,
    customMessages: {
      "401": "Authentication required",
      "403": "Access forbidden",
      "429": "Too many requests",
      "500": "Internal server error",
    },
  },
};

/**
 * Development security configuration (more permissive)
 */
export const developmentSecurityConfig: SecurityConfig = {
  ...defaultSecurityConfig,
  rateLimiting: {
    ...defaultSecurityConfig.rateLimiting,
    requestsPerMinute: 300,
  },
  authentication: {
    ...defaultSecurityConfig.authentication,
    requireApiKey: false,
  },
  validation: {
    ...defaultSecurityConfig.validation,
    strictMode: false,
  },
  headers: {
    ...defaultSecurityConfig.headers,
    cors: {
      ...defaultSecurityConfig.headers.cors,
      allowedOrigins: ["*"],
    },
  },
  logging: {
    ...defaultSecurityConfig.logging,
    minLevel: LogLevel.DEBUG,
  },
  errorHandling: {
    ...defaultSecurityConfig.errorHandling,
    verboseErrors: true,
    includeStackTraces: true,
  },
};

/**
 * Strict security configuration (maximum security)
 */
export const strictSecurityConfig: SecurityConfig = {
  ...defaultSecurityConfig,
  rateLimiting: {
    ...defaultSecurityConfig.rateLimiting,
    requestsPerMinute: 30,
    blockDuration: 60,
  },
  encryption: {
    ...defaultSecurityConfig.encryption,
    pbkdf2Iterations: 1000000,
  },
  validation: {
    ...defaultSecurityConfig.validation,
    maxInputLength: 5000,
    allowSpecialChars: false,
  },
  ipFiltering: {
    ...defaultSecurityConfig.ipFiltering,
    enabled: true,
    whitelistMode: true,
  },
  monitoring: {
    ...defaultSecurityConfig.monitoring,
    suspiciousThreshold: 5,
  },
};

/**
 * Load security configuration based on environment
 */
export function loadSecurityConfig(): SecurityConfig {
  const env = Deno.env.get("NODE_ENV") || "production";

  switch (env) {
    case "development":
      return developmentSecurityConfig;
    case "strict":
      return strictSecurityConfig;
    default:
      return defaultSecurityConfig;
  }
}

/**
 * Validate security configuration
 */
export function validateSecurityConfig(
  config: Partial<SecurityConfig>,
): SecurityConfig {
  const merged = { ...defaultSecurityConfig, ...config };

  // Validate rate limiting
  if (merged.rateLimiting.requestsPerMinute < 1) {
    throw new Error("Rate limit requests per minute must be at least 1");
  }

  // Validate encryption
  if (merged.encryption.pbkdf2Iterations < 100000) {
    throw new Error("PBKDF2 iterations must be at least 100,000");
  }

  // Validate key size
  if (![128, 192, 256].includes(merged.encryption.keySize)) {
    throw new Error("Key size must be 128, 192, or 256 bits");
  }

  return merged;
}
