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
    {
      path: "./deno.json",
      // Custom update function to safely update only the top-level version field
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
      // Custom update function to handle specific badge patterns with comment markers
      updateFn: (
        content: string,
        data: { version: string; buildDate?: string },
      ) => {
        let result = content;

        // Update version badge between comment markers
        const versionBadgeRegex =
          /<!-- VERSION_BADGE_START -->([\s\S]*?)<!-- VERSION_BADGE_END -->/;
        const versionBadgeMatch = result.match(versionBadgeRegex);

        if (versionBadgeMatch) {
          const newVersionBadge = `<!-- VERSION_BADGE_START -->

[![Version](https://img.shields.io/badge/version-${data.version}-blue.svg)](https://github.com/esolia/salty.esolia.pro/releases/tag/v${data.version})

<!-- VERSION_BADGE_END -->`;

          result = result.replace(versionBadgeRegex, newVersionBadge);
        }

        // Update build date badge between comment markers
        const buildBadgeRegex =
          /<!-- BUILD_BADGE_START -->([\s\S]*?)<!-- BUILD_BADGE_END -->/;
        const buildBadgeMatch = result.match(buildBadgeRegex);

        if (buildBadgeMatch) {
          // Format the build date as YYYY-MM-DD
          const buildDate = data.buildDate
            ? new Date(data.buildDate).toISOString().split("T")[0]
            : new Date().toISOString().split("T")[0];
          const formattedBuildDate = buildDate.replace(/-/g, "--");

          const newBuildBadge = `<!-- BUILD_BADGE_START -->

[![Build Date](https://img.shields.io/badge/build-${formattedBuildDate}-green.svg)](https://github.com/esolia/salty.esolia.pro)

<!-- BUILD_BADGE_END -->`;

          result = result.replace(buildBadgeRegex, newBuildBadge);
        }

        return result;
      },
    },
  ],

  github: {
    owner: "esolia",
    repo: "salty.esolia.pro",
    createRelease: true,
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
