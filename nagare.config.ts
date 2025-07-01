import type { NagareConfig } from "@rick/nagare/types";
import { TemplateFormat } from "@rick/nagare/types";

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
    template: TemplateFormat.TYPESCRIPT, // Use built-in template
    
    // Add Salty's custom exports
    additionalExports: [
      {
        name: "TECH_SPECS",
        type: "const",
        description: "Tech specifications used by the application",
        value: {
          platform: "Deno Deploy",
          runtime: "Deno",
          cryptoFeatures: [
            "AES-GCM-256 encryption",
            "PBKDF2-SHA512 key derivation",
            "600,000 iterations",
            "basE91 encoding",
            "Web Crypto API",
          ],
          securityFeatures: [
            "Rate limiting",
            "Input validation",
            "Security headers",
            "API authentication",
            "Request size limits",
            "Structured logging",
            "Security event tracking",
          ],
          endpoints: [
            { path: "/", description: "Japanese UI" },
            { path: "/en/", description: "English UI" },
            { path: "/api/encrypt", method: "POST", description: "Encrypt endpoint" },
            { path: "/api/decrypt", method: "POST", description: "Decrypt endpoint" },
            { path: "/health", method: "GET", description: "Health check endpoint" },
          ],
        },
        asConst: true,
      },
      {
        name: "SECURITY_INFO",
        type: "const",
        description: "Security information for the application",
        value: {
          rateLimiting: {
            window: "1 hour",
            maxRequests: 20,
          },
          maxPayloadSize: "1MB",
          maxKeySize: "1KB",
          securityHeaders: [
            "Content-Security-Policy",
            "Strict-Transport-Security",
            "X-Content-Type-Options",
            "X-Frame-Options",
            "X-XSS-Protection",
            "Referrer-Policy",
          ],
        },
        asConst: true,
      },
      {
        name: "VersionUtils",
        type: "class",
        description: "Version utility class",
        content: `
  static getExtendedVersion(): string {
    return \`\${VERSION} (Built: \${BUILD_INFO.buildDate})\`;
  }

  static getDetailedInfo() {
    return {
      version: VERSION,
      build: BUILD_INFO,
      app: APP_INFO,
      specs: TECH_SPECS,
      security: SECURITY_INFO,
    };
  }

  static isPrerelease(): boolean {
    return BUILD_INFO.versionComponents.prerelease !== null;
  }

  static getReleaseType(): string {
    if (this.isPrerelease()) {
      return "prerelease";
    }
    return "stable";
  }`,
      },
    ],
  },

  updateFiles: [
    { path: "./deno.json" }, // Auto-detected and handled by built-in handler
    { path: "./README.md" }, // Auto-detected and handled by built-in handler
  ],

  github: {
    owner: "esolia",
    repo: "salty.esolia.pro",
    createRelease: true,
  },
} satisfies NagareConfig;