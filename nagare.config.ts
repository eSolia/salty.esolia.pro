import type { NagareConfig } from "jsr:@rick/nagare/types";

export default {
  project: {
    name: "Salty",
    description: "Browser-Native Secure Text Encryption",
    repository: "https://github.com/esolia/salty.esolia.pro",
    homepage: "https://salty.esolia.pro",
    license: "MIT",
    author: "Rick Cogley, eSolia Inc.",
  },

  versionFile: {
    path: "./version.ts",
    template: "custom",
    customTemplate: `/**
 * @fileoverview Centralized version and metadata information for Salty
 * @description Single source of truth for all version-related information
 */

/**
 * Application version information
 */
export const VERSION = "{{version}}";

/**
 * Build and deployment metadata
 */
export const BUILD_INFO = {
  buildDate: "{{buildDate}}",
  gitCommit: "{{gitCommit}}",
  buildEnvironment: "{{environment}}",
  versionComponents: {
    major: {{versionComponents.major}},
    minor: {{versionComponents.minor}},
    patch: {{versionComponents.patch}},
    prerelease: {{versionComponents.prerelease}}
  }
} as const;

// ... rest of your template

export const RELEASE_NOTES = {{releaseNotes}} as const;

// ... rest of your existing template
`,
  },

  releaseNotes: {
    metadata: {
      cryptoFeatures: [
        "AES-GCM-256",
        "PBKDF2-SHA512",
        "basE91 encoding",
        "Web Crypto API",
      ],
      securityFeatures: [
        "Rate limiting",
        "Input validation",
        "Security headers",
        "API authentication",
      ],
      endpoints: [
        "/",
        "/en/",
        "/api/encrypt",
        "/api/decrypt",
        "/health",
      ],
    },
  },

  github: {
    owner: "esolia",
    repo: "salty.esolia.pro",
    createRelease: true,
  },

  updateFiles: [
    {
      path: "./deno.json",
      patterns: {
        version: /^(\s*)"version":\s*"([^"]+)"/m,
      },
      updateFn: (content: string, data: TemplateData) => {
        // Custom replacement that preserves the structure correctly
        return content.replace(
          /^(\s*)"version":\s*"([^"]+)"/m,
          `$1"version": "${data.version}"`,
        );
      },
    },
  ],
} as NagareConfig;
