/**
 * @fileoverview Centralized version and metadata information for Salty
 * @description Single source of truth for all version-related information
 */

/**
 * Application version information
 */
export const VERSION = "1.0.2";

/**
 * Build and deployment metadata
 */
export const BUILD_INFO = {
  /** Build timestamp (updated manually or via CI/CD) */
  buildDate: "2025-06-23T00:00:00.000Z",
  
  /** Git commit hash (update manually or via CI/CD) */
  gitCommit: "main",
  
  /** Build environment */
  buildEnvironment: "manual",
  
  /** Semantic version components */
  versionComponents: {
    major: 1,
    minor: 1,
    patch: 0,
    prerelease: null as string | null
  }
} as const;

/**
 * Application metadata
 */
export const APP_INFO = {
  /** Application name */
  name: "Salty",
  
  /** Full application name */
  fullName: "Salty - Browser-Native Secure Text Encryption",
  
  /** Application description */
  description: "Secure text encryption using Web Crypto API with basE91 encoding",
  
  /** Author/Organization */
  author: "Rick Cogley, eSolia Inc.",
  
  /** Homepage URL */
  homepage: "https://salty.esolia.pro",
  
  /** Repository URL */
  repository: "https://github.com/esolia/salty.esolia.pro",
  
  /** License */
  license: "MIT"
} as const;

/**
 * Technical specifications
 */
export const TECH_SPECS = {
  /** Runtime information */
  runtime: "Deno",
  
  /** Programming language */
  language: "TypeScript",
  
  /** Deployment platform */
  platform: "Deno Deploy",
  
  /** Cryptographic features */
  cryptoFeatures: [
    "AES-GCM-256",
    "PBKDF2-SHA512",
    "basE91 encoding",
    "Web Crypto API"
  ],
  
  /** Security features */
  securityFeatures: [
    "Rate limiting",
    "Input validation",
    "Security headers",
    "Structured logging",
    "API authentication",
    "Request size limits"
  ],
  
  /** Supported endpoints */
  endpoints: [
    "/",
    "/en/",
    "/api/encrypt",
    "/api/decrypt",
    "/health",
    "/salty.ts"
  ]
} as const;

/**
 * Security configuration metadata
 */
export const SECURITY_INFO = {
  /** Rate limiting configuration */
  rateLimiting: {
    windowMs: 60 * 60 * 1000, // 1 hour
    maxRequests: 20,
    perIp: true
  },
  
  /** Supported HTTP methods per endpoint */
  allowedMethods: {
    "/api/encrypt": ["POST"],
    "/api/decrypt": ["POST"],
    "/health": ["GET"],
    "static": ["GET"]
  },
  
  /** Security headers applied */
  securityHeaders: [
    "Content-Security-Policy",
    "X-Content-Type-Options",
    "X-Frame-Options", 
    "X-XSS-Protection",
    "Strict-Transport-Security",
    "Referrer-Policy",
    "Permissions-Policy"
  ]
} as const;

/**
 * Release notes for current version
 */
export const RELEASE_NOTES = {
  version: VERSION,
  releaseDate: "2025-06-23",
  changes: {
    added: [
      "Comprehensive rate limiting system",
      "Security headers with A+ rating",
      "Structured security event logging",
      "Enhanced input validation and sanitization",
      "API key authentication",
      "Request size limits",
      "Health check endpoint with detailed status",
      "Centralized version management"
    ],
    improved: [
      "Error handling with proper HTTP status codes",
      "Static file serving with security headers",
      "Environment variable validation",
      "TypeScript interfaces and documentation",
      "Content Security Policy configuration"
    ],
    security: [
      "Rate limiting prevents API abuse",
      "Input sanitization prevents injection attacks",
      "Security headers protect against common vulnerabilities",
      "Structured logging enables security monitoring",
      "Request validation prevents malformed inputs"
    ]
  }
} as const;

/**
 * Utility functions for version information
 */
export const VersionUtils = {
  /**
   * Get the full version string
   * @returns Version string (e.g., "1.2.3")
   */
  getVersion(): string {
    return VERSION;
  },

  /**
   * Get detailed version information
   * @returns Complete version and build information
   */
  getDetailedInfo() {
    return {
      version: VERSION,
      ...BUILD_INFO,
      ...APP_INFO,
      runtime: {
        deno: Deno.version.deno,
        v8: Deno.version.v8,
        typescript: Deno.version.typescript
      }
    };
  },

  /**
   * Get a version string with build info
   * @returns Extended version string
   */
  getExtendedVersion(): string {
    return `${VERSION} (${BUILD_INFO.buildDate.split('T')[0]})`;
  },

  /**
   * Check if this is a pre-release version
   * @returns True if pre-release
   */
  isPrerelease(): boolean {
    return BUILD_INFO.versionComponents.prerelease !== null;
  },

  /**
   * Get semantic version components
   * @returns Object with major, minor, patch numbers
   */
  getSemanticVersion() {
    return BUILD_INFO.versionComponents;
  }
};

/**
 * Export everything as a single object for convenience
 */
export const SALTY_METADATA = {
  VERSION,
  BUILD_INFO,
  APP_INFO,
  TECH_SPECS,
  SECURITY_INFO,
  RELEASE_NOTES,
  VersionUtils
} as const;