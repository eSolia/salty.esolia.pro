/**
 * @fileoverview Centralized version and metadata information for Salty
 * @description Single source of truth for all version-related information
 */

/**
 * Application version information
 */
export const VERSION = "1.2.3";

/**
 * Build and deployment metadata
 */
export const BUILD_INFO = {
  buildDate: "2025-06-26T13:00:29.573Z",
  gitCommit: "104b009",
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
  "version": "1.2.3",
  "date": "2025-06-26",
  "added": [],
  "changed": [
    "deno fmt (104b009)"
  ],
  "deprecated": [],
  "removed": [],
  "fixed": [
    "implement capture group properly (d211fad)",
    "manual fix for regex-clobbered version (5320d39)"
  ],
  "security": []
} as const;

// ... rest of your existing template
