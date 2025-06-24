/**
 * @fileoverview Centralized version and metadata information for Salty
 * @description Single source of truth for all version-related information
 */

/**
 * Application version information
 */
export const VERSION = "1.1.0";

/**
 * Build and deployment metadata
 */
export const BUILD_INFO = {
  /** Build timestamp (updated manually or via CI/CD) */
  buildDate: "2025-06-24T06:15:35.798Z",
  
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
  releaseDate: "2025-06-24",
  changes: {
    added: [
      "add rollback and fix release (d3329b7)",
      "add deno.json changelog and release management scripts (d262ca3)",
      "add telemetry custom tracing spans (68caf7d)",
      "add enhanced logging (2d04b6f)",
      "add version.ts that other files can use (a05641e)"
    ],
    improved: [
      "revert docs to before release (57a2f52)",
      "bump version to 1.1.0 (e74e5d8)",
      "ignore deno.lock (7d2c0e2)",
      "serve favicon.ico (f9f34d3)",
      "tidy up version number to actual release (5ca7f5a)",
      "remove direct console.error (e052a27)",
      "add info about env var settings (e0dbf97)",
      "update README, add SPEC (e250e72)",
      "add favicon (e98df25)",
      "enhance security on server.ts (9d5366d)",
      "refactor how to generate api key (2efe156)"
    ],
    removed: [],
    fixed: [
      "handle detailed commit log messages (79cbe46)",
      "adds missing bracket (49f1a36)",
      "fix deno task version error (77783d2)",
      "correct version getter deno task (f80e760)",
      "remove allowJS deno compiler option (27b3691)",
      "add clear url param to reset (9f010ee)",
      "switch to deno transpiler (5acfb15)",
      "loosen the transpiler (27ba223)",
      "create headers first (28fdfe7)",
      "transpile salty.ts to js (52eca00)",
      "remove ts feature (24a9f59)",
      "correct the salt injection (aab10f8)",
      "ensure payload is awaited (29f0517)",
      "better logging and typing (59dd345)",
      "get payload type (4e9a48e)",
      "update basE91 char table, add types for safety (51c8d74)",
      "add logging for decrypt ops (6f83288)",
      "change the salt injection to create a global variable (4e616ab)",
      "further enhance debugging (e3fc622)",
      "better debug (260a2e2)",
      "correctly define INJECTED_SALT_HEX (70cd6de)",
      "subject (940d88c)",
      "disable suspicious activity check if api_key user (31141fd)",
      "remove redundant export (04fd52b)",
      "remove redundant export (4d55071)",
      "convert string key to CryptoKey object before calling encrypt (a80f061)",
      "add unsafe-inline because it is required (4fdd4e9)",
      "change mime type for salty.ts, improve csp security (ff9c6eb)",
      "set csp to what is actually being used (f000531)"
    ],
    security: []
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