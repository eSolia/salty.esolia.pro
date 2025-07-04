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
            {
              path: "/api/encrypt",
              method: "POST",
              description: "Encrypt endpoint",
            },
            {
              path: "/api/decrypt",
              method: "POST",
              description: "Decrypt endpoint",
            },
            {
              path: "/health",
              method: "GET",
              description: "Health check endpoint",
            },
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
        name: "SECURITY_COMPLIANCE",
        type: "const",
        description: "Security compliance and standards information",
        value: {
          standards: {
            owasp: {
              a01_brokenAccessControl: "N/A - No user authentication system",
              a02_cryptographicFailures:
                "AES-256-GCM with PBKDF2-SHA512 (600k iterations)",
              a03_injection:
                "Input validation and sanitization on all endpoints",
              a04_insecureDesign: "Security-first design with rate limiting",
              a05_securityMisconfiguration:
                "Secure headers, strict CSP, HSTS enabled",
              a06_vulnerableComponents: "Regular Deno and dependency updates",
              a07_authFailures:
                "API key authentication for sensitive endpoints",
              a08_dataIntegrityFailures:
                "HMAC validation in encrypted payloads",
              a09_loggingFailures: "Structured logging with security events",
              a10_ssrf: "N/A - No external requests from user input",
            },
          },
          lastSecurityReview: "BUILD_INFO.buildDate", // This will reference the actual BUILD_INFO
          encryptionDetails: {
            algorithm: "AES-GCM",
            keySize: 256,
            keyDerivation: "PBKDF2-SHA512",
            iterations: 600000,
            saltSize: 16,
            ivSize: 12,
            tagSize: 16,
          },
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
      compliance: SECURITY_COMPLIANCE,
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
    {
      path: "./deno.json",
      // KEEP custom update function because of "version" task that would get clobbered
      updateFn: (content: string, data: { version: string }) => {
        // Parse the JSON to safely update only the top-level version
        try {
          const config = JSON.parse(content);
          config.version = data.version;
          return JSON.stringify(config, null, 2);
        } catch (_error) {
          // Fallback to regex if JSON parsing fails
          return content.replace(
            /^(\s*"version":\s*)"[^"]+"/m,
            `$1"${data.version}"`,
          );
        }
      },
    },
    {
      path: "./README.md",
      // Now using built-in handler - just need to update README badges to standard format
      // Change badges to: https://img.shields.io/badge/version-X.X.X-blue
    },
  ],

  // Release notes configuration
  releaseNotes: {
    includeCommitHashes: true,
    maxDescriptionLength: 120, // Increased from default 100 for more descriptive commits
  },

  github: {
    owner: "esolia",
    repo: "salty.esolia.pro",
    createRelease: true,
  },

  // Options are already using defaults, but explicit for clarity
  options: {
    tagPrefix: "v",
    gitRemote: "origin",
    // logLevel defaults to INFO
  },

  hooks: {
    preRelease: [
      async () => {
        console.log("🔨 Building HTML files from templates...");
        const command = new Deno.Command("deno", {
          args: ["task", "build:html"],
        });
        const result = await command.output();
        if (!result.success) {
          throw new Error("HTML build failed");
        }
        console.log("✅ HTML build completed");
      },
    ],
  },
} satisfies NagareConfig;
