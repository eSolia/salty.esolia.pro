/**
 * @fileoverview Centralized version and metadata information for Salty
 * @description Single source of truth for all version-related information
 */

/**
 * Application version information
 */
export const VERSION = "1.2.1";

/**
 * Build and deployment metadata
 */
export const BUILD_INFO = {
  buildDate: "2025-06-26T11:05:28.349Z",
  gitCommit: "f8badfb",
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
  "version": "1.2.1",
  "date": "2025-06-26",
  "added": [],
  "changed": [
    "improve deno.json adding metadata and lint rules (f8badfb)",
    "bump nagare to 0.7.0 (f64329b)"
  ],
  "deprecated": [],
  "removed": [],
  "fixed": [
    "make regex more precise (0bffed5)"
  ],
  "security": []
} as const;

// ... rest of your existing template
