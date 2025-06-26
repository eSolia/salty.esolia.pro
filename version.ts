/**
 * @fileoverview Centralized version and metadata information for Salty
 * @description Single source of truth for all version-related information
 */

/**
 * Application version information
 */
export const VERSION = "1.2.0";

/**
 * Build and deployment metadata
 */
export const BUILD_INFO = {
  buildDate: "2025-06-26T08:57:05.186Z",
  gitCommit: "3f9be05",
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
  "version": "1.2.0",
  "date": "2025-06-26",
  "added": [
    "add scratch directory for dev experiments (5c1c790)",
    "add release library nagare (161c422)"
  ],
  "changed": [
    "bump nagare version (a13e68f)",
    "add br to top Jp message for clean look (ea4daed)"
  ],
  "deprecated": [],
  "removed": [],
  "fixed": [
    "add deno wrapper to fix eval problem (3f9be05)",
    "run nagare more directly (4fa0412)"
  ],
  "security": []
} as const;

// ... rest of your existing template
