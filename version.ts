/**
 * @fileoverview Centralized version and metadata information for Salty
 * @description Single source of truth for all version-related information
 */

/**
 * Application version information
 */
export const VERSION = "1.2.2";

/**
 * Build and deployment metadata
 */
export const BUILD_INFO = {
  buildDate: "2025-06-26T12:47:14.798Z",
  gitCommit: "5afc743",
  buildEnvironment: "production",
  versionComponents: {
    major: {{versionComponents.major}},
    minor: {{versionComponents.minor}},
    patch: {{versionComponents.patch}},
    prerelease: {{versionComponents.prerelease}}
  }
} as const;

// ... rest of your template

export const RELEASE_NOTES = {
  "version": "1.2.2",
  "date": "2025-06-26",
  "added": [],
  "changed": [
    "bump nagare to 0.8.0 (a61f7a9)"
  ],
  "deprecated": [],
  "removed": [],
  "fixed": [
    "specify export in deno.json as server.ts (5afc743)",
    "remove namespace reference (d9db864)",
    "add back the version key (4497599)"
  ],
  "security": []
} as const;

// ... rest of your existing template
