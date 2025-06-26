#!/usr/bin/env deno run --allow-read --allow-write --allow-run

/**
 * @fileoverview Automated release script for Salty
 * @description Handles version bumping, changelog generation, and GitHub releases
 * Usage: deno run --allow-read --allow-write --allow-run release.ts [patch|minor|major]
 */

import { parse } from "@std/semver";

interface ConventionalCommit {
  type: string;
  scope?: string;
  description: string;
  body?: string;
  breakingChange?: boolean;
  hash: string;
  date: string;
}

interface ReleaseNotes {
  version: string;
  date: string;
  added: string[];
  changed: string[];
  deprecated: string[];
  removed: string[];
  fixed: string[];
  security: string[];
}

class ReleaseManager {
  private currentVersion: string = "";
  private newVersion: string = "";

  async getCurrentVersion(): Promise<string> {
    try {
      const versionFile = await Deno.readTextFile("./version.ts");
      const versionMatch = versionFile.match(
        /export const VERSION = "([^"]+)"/,
      );
      if (!versionMatch) {
        throw new Error("Could not find VERSION in version.ts");
      }
      return versionMatch[1];
    } catch (error) {
      console.error("❌ Error reading current version:", error.message);
      Deno.exit(1);
    }
  }

  async getLastReleaseTag(): Promise<string> {
    try {
      const result = await this.runCommand([
        "git",
        "describe",
        "--tags",
        "--abbrev=0",
      ]);
      return result.trim() || "HEAD"; // Fallback to HEAD if no tags exist
    } catch {
      console.log("ℹ️  No previous tags found, using all commits");
      return "HEAD"; // If no tags exist, use HEAD
    }
  }

  async getCommitsSinceLastRelease(): Promise<ConventionalCommit[]> {
    const lastTag = await this.getLastReleaseTag();
    const range = lastTag === "HEAD" ? "HEAD" : `${lastTag}..HEAD`;

    try {
      // Use a more robust delimiter and simpler format
      const result = await this.runCommand([
        "git",
        "log",
        range,
        "--pretty=format:%H|||%ci|||%s",
        "--no-merges",
      ]);

      if (!result.trim()) {
        console.log("ℹ️  No commits found since last release");
        return [];
      }

      return result.split("\n")
        .filter((line) => line.trim())
        .map((line) => this.parseConventionalCommit(line))
        .filter((commit) => commit !== null) as ConventionalCommit[];
    } catch (error) {
      console.error("❌ Error getting commits:", error.message);
      return [];
    }
  }

  private parseConventionalCommit(
    gitLogLine: string,
  ): ConventionalCommit | null {
    if (!gitLogLine || typeof gitLogLine !== "string") {
      console.warn("Invalid git log line:", gitLogLine);
      return null;
    }

    // Use triple pipe delimiter which is less likely to appear in commit messages
    const parts = gitLogLine.split("|||");
    if (parts.length < 3) {
      console.warn(
        "Incomplete git log line:",
        gitLogLine.substring(0, 100) + "...",
      );
      return null;
    }

    const [hash, date, subject] = parts;

    if (!hash || !date || !subject) {
      console.warn(
        "Missing required fields in git log line:",
        gitLogLine.substring(0, 100) + "...",
      );
      return null;
    }

    // Clean up the subject line - remove any extra whitespace and newlines
    const cleanSubject = subject.trim().replace(/\n.*$/s, ""); // Take only first line

    // Parse conventional commit format: type(scope): description
    const conventionalRegex =
      /^(feat|fix|docs|style|refactor|perf|test|chore|build|ci|revert)(\([^)]+\))?\!?:\s*(.+)$/;
    const match = cleanSubject.match(conventionalRegex);

    if (!match) {
      // Not a conventional commit, but include it anyway
      return {
        type: "other",
        description: cleanSubject.substring(0, 100), // Limit description length
        body: undefined, // Skip body for non-conventional commits
        breakingChange: cleanSubject.includes("BREAKING CHANGE") ||
          cleanSubject.includes("!:"),
        hash: hash.substring(0, 7),
        date: date.split(" ")[0],
      };
    }

    const [, type, scopeMatch, description] = match;
    const scope = scopeMatch ? scopeMatch.slice(1, -1) : undefined;
    const breakingChange = cleanSubject.includes("!:");

    return {
      type,
      scope,
      description: description.substring(0, 100), // Limit description length
      body: undefined, // Skip body parsing to avoid complexity
      breakingChange,
      hash: hash.substring(0, 7),
      date: date.split(" ")[0],
    };
  }

  calculateNewVersion(
    currentVersion: string,
    commits: ConventionalCommit[],
    bumpType?: string,
  ): string {
    const semver = parse(currentVersion);

    if (bumpType) {
      // Manual version bump
      switch (bumpType) {
        case "major":
          return `${semver.major + 1}.0.0`;
        case "minor":
          return `${semver.major}.${semver.minor + 1}.0`;
        case "patch":
          return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
        default:
          throw new Error(`Invalid bump type: ${bumpType}`);
      }
    }

    // Auto-calculate based on conventional commits
    const hasBreaking = commits.some((c) => c.breakingChange);
    const hasFeatures = commits.some((c) => c.type === "feat");
    const hasFixes = commits.some((c) => c.type === "fix");

    if (hasBreaking) {
      return `${semver.major + 1}.0.0`;
    } else if (hasFeatures) {
      return `${semver.major}.${semver.minor + 1}.0`;
    } else if (hasFixes) {
      return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
    } else {
      // No significant changes, bump patch
      return `${semver.major}.${semver.minor}.${semver.patch + 1}`;
    }
  }

  generateReleaseNotes(commits: ConventionalCommit[]): ReleaseNotes {
    const notes: ReleaseNotes = {
      version: this.newVersion,
      date: new Date().toISOString().split("T")[0],
      added: [],
      changed: [],
      deprecated: [],
      removed: [],
      fixed: [],
      security: [],
    };

    for (const commit of commits) {
      const entry = `${commit.description} (${commit.hash})`;

      switch (commit.type) {
        case "feat":
          notes.added.push(entry);
          break;
        case "fix":
          notes.fixed.push(entry);
          break;
        case "perf":
        case "refactor":
          notes.changed.push(entry);
          break;
        case "security":
          notes.security.push(entry);
          break;
        default:
          if (commit.breakingChange) {
            notes.changed.push(`⚠️  BREAKING: ${entry}`);
          } else {
            notes.changed.push(entry);
          }
      }
    }

    return notes;
  }

  async updateVersionFile(
    newVersion: string,
    releaseNotes: ReleaseNotes,
  ): Promise<void> {
    try {
      let content = await Deno.readTextFile("./version.ts");

      // Update VERSION
      content = content.replace(
        /export const VERSION = "[^"]+"/,
        `export const VERSION = "${newVersion}"`,
      );

      // Update buildDate
      const now = new Date().toISOString();
      content = content.replace(
        /buildDate: "[^"]+"/,
        `buildDate: "${now}"`,
      );

      // Update version components
      const semver = parse(newVersion);
      content = content.replace(
        /versionComponents: \{[^}]+\}/s,
        `versionComponents: {
    major: ${semver.major},
    minor: ${semver.minor},
    patch: ${semver.patch},
    prerelease: null as string | null
  }`,
      );

      // Update RELEASE_NOTES section
      const releaseNotesSection = this.generateVersionTsReleaseNotes(
        releaseNotes,
      );
      content = content.replace(
        /export const RELEASE_NOTES = \{[\s\S]*?\} as const;/,
        `export const RELEASE_NOTES = ${releaseNotesSection} as const;`,
      );

      await Deno.writeTextFile("./version.ts", content);
      console.log("✅ Updated version.ts with new release notes");
    } catch (error) {
      console.error("❌ Error updating version.ts:", error.message);
      throw error;
    }
  }

  private generateVersionTsReleaseNotes(releaseNotes: ReleaseNotes): string {
    const formatArrayForTs = (items: string[]): string => {
      if (items.length === 0) return "[]";
      return "[\n      " +
        items.map((item) => `"${item.replace(/"/g, '\\"')}"`).join(
          ",\n      ",
        ) + "\n    ]";
    };

    return `{
  version: VERSION,
  releaseDate: "${releaseNotes.date}",
  changes: {
    added: ${formatArrayForTs(releaseNotes.added)},
    improved: ${formatArrayForTs(releaseNotes.changed)},
    removed: ${formatArrayForTs(releaseNotes.removed)},
    fixed: ${formatArrayForTs(releaseNotes.fixed)},
    security: ${formatArrayForTs(releaseNotes.security)}
  }
}`;
  }

  async updateChangelog(releaseNotes: ReleaseNotes): Promise<void> {
    const changelogPath = "./CHANGELOG.md";

    try {
      let existingContent = "";
      try {
        existingContent = await Deno.readTextFile(changelogPath);
      } catch {
        // File doesn't exist, create header
        existingContent = `# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

`;
      }

      // Generate new entry
      let newEntry = `## [${releaseNotes.version}] - ${releaseNotes.date}\n\n`;

      if (releaseNotes.added.length > 0) {
        newEntry += `### Added\n${
          releaseNotes.added.map((item) => `- ${item}`).join("\n")
        }\n\n`;
      }
      if (releaseNotes.changed.length > 0) {
        newEntry += `### Changed\n${
          releaseNotes.changed.map((item) => `- ${item}`).join("\n")
        }\n\n`;
      }
      if (releaseNotes.fixed.length > 0) {
        newEntry += `### Fixed\n${
          releaseNotes.fixed.map((item) => `- ${item}`).join("\n")
        }\n\n`;
      }
      if (releaseNotes.security.length > 0) {
        newEntry += `### Security\n${
          releaseNotes.security.map((item) => `- ${item}`).join("\n")
        }\n\n`;
      }

      // Insert new entry after header
      const headerEnd = existingContent.indexOf("\n## ");
      if (headerEnd === -1) {
        // No existing releases
        await Deno.writeTextFile(changelogPath, existingContent + newEntry);
      } else {
        const newContent = existingContent.slice(0, headerEnd + 1) + newEntry +
          existingContent.slice(headerEnd + 1);
        await Deno.writeTextFile(changelogPath, newContent);
      }

      console.log("✅ Updated CHANGELOG.md");
    } catch (error) {
      console.error("❌ Error updating CHANGELOG.md:", error.message);
      throw error;
    }
  }

  async commitAndTag(): Promise<void> {
    try {
      await this.runCommand(["git", "add", "version.ts", "CHANGELOG.md"]);
      await this.runCommand([
        "git",
        "commit",
        "-m",
        `chore(release): bump version to ${this.newVersion}`,
      ]);
      await this.runCommand([
        "git",
        "tag",
        "-a",
        `v${this.newVersion}`,
        "-m",
        `Release v${this.newVersion}`,
      ]);
      console.log("✅ Created commit and tag");
    } catch (error) {
      console.error("❌ Error committing changes:", error.message);
      throw error;
    }
  }

  async createGitHubRelease(releaseNotes: ReleaseNotes): Promise<void> {
    // Check if gh CLI is available
    try {
      await this.runCommand(["gh", "--version"]);
    } catch {
      console.log(
        "⚠️  GitHub CLI (gh) not found. Please install it to create GitHub releases automatically.",
      );
      console.log(
        "   You can create the release manually at: https://github.com/esolia/salty.esolia.pro/releases/new",
      );
      return;
    }

    try {
      // Push the tag first
      console.log("📤 Pushing tag to GitHub...");
      await this.runCommand(["git", "push", "origin", `v${this.newVersion}`]);

      const releaseBody = this.formatReleaseBodyMarkdown(releaseNotes);
      await this.runCommand([
        "gh",
        "release",
        "create",
        `v${this.newVersion}`,
        "--title",
        `Release v${this.newVersion}`,
        "--notes",
        releaseBody,
      ]);
      console.log("✅ Created GitHub release");
    } catch (error) {
      console.error("❌ Error creating GitHub release:", error.message);
      console.log(
        "ℹ️  You can create it manually at: https://github.com/esolia/salty.esolia.pro/releases/new",
      );
      console.log(
        "   The tag has been created locally. Push it with: git push origin --tags",
      );
    }
  }

  private formatReleaseBodyMarkdown(notes: ReleaseNotes): string {
    let body = `## What's Changed\n\n`;

    if (notes.added.length > 0) {
      body += `### ✨ Added\n${
        notes.added.map((item) => `- ${item}`).join("\n")
      }\n\n`;
    }
    if (notes.changed.length > 0) {
      body += `### 🔄 Changed\n${
        notes.changed.map((item) => `- ${item}`).join("\n")
      }\n\n`;
    }
    if (notes.fixed.length > 0) {
      body += `### 🐛 Fixed\n${
        notes.fixed.map((item) => `- ${item}`).join("\n")
      }\n\n`;
    }
    if (notes.security.length > 0) {
      body += `### 🔒 Security\n${
        notes.security.map((item) => `- ${item}`).join("\n")
      }\n\n`;
    }

    body +=
      `**Full Changelog**: https://github.com/esolia/salty.esolia.pro/compare/v${this.currentVersion}...v${notes.version}`;

    return body;
  }

  private async runCommand(cmd: string[]): Promise<string> {
    const process = new Deno.Command(cmd[0], {
      args: cmd.slice(1),
      stdout: "piped",
      stderr: "piped",
    });

    const result = await process.output();

    if (!result.success) {
      const error = new TextDecoder().decode(result.stderr);
      throw new Error(`Command failed: ${cmd.join(" ")}\n${error}`);
    }

    return new TextDecoder().decode(result.stdout);
  }

  async release(bumpType?: string): Promise<void> {
    console.log("🚀 Starting release process...\n");

    // Get current version
    this.currentVersion = await this.getCurrentVersion();
    console.log(`📦 Current version: ${this.currentVersion}`);

    // Get commits since last release
    const commits = await this.getCommitsSinceLastRelease();
    console.log(`📝 Found ${commits.length} commits since last release`);

    if (commits.length === 0 && !bumpType) {
      console.log(
        "ℹ️  No commits found since last release. Use --patch, --minor, or --major to force a release.",
      );
      return;
    }

    // Calculate new version
    this.newVersion = this.calculateNewVersion(
      this.currentVersion,
      commits,
      bumpType,
    );
    console.log(`📈 New version: ${this.newVersion}`);

    // Generate release notes
    const releaseNotes = this.generateReleaseNotes(commits);

    // Preview changes
    console.log("\n📋 Release Notes Preview:");
    console.log(`Version: ${releaseNotes.version}`);
    if (releaseNotes.added.length > 0) {
      console.log(`Added: ${releaseNotes.added.length} items`);
    }
    if (releaseNotes.changed.length > 0) {
      console.log(`Changed: ${releaseNotes.changed.length} items`);
    }
    if (releaseNotes.fixed.length > 0) {
      console.log(`Fixed: ${releaseNotes.fixed.length} items`);
    }

    // Confirm release
    const proceed = confirm("\n❓ Proceed with release?");
    if (!proceed) {
      console.log("❌ Release cancelled");
      return;
    }

    // Update files
    await this.updateVersionFile(this.newVersion, releaseNotes);
    await this.updateChangelog(releaseNotes);

    // Git operations
    await this.commitAndTag();

    // GitHub release
    await this.createGitHubRelease(releaseNotes);

    console.log("\n🎉 Release completed successfully!");
    console.log(`   Version: ${this.newVersion}`);
    console.log("   Next steps:");
    console.log("   1. Push changes: git push origin main --tags");
    console.log("   2. Deploy to production");
  }
}

// Main execution
if (import.meta.main) {
  const args = Deno.args;
  const bumpType = args[0];

  if (bumpType && !["patch", "minor", "major"].includes(bumpType)) {
    console.error("❌ Invalid bump type. Use: patch, minor, or major");
    Deno.exit(1);
  }

  const releaseManager = new ReleaseManager();
  await releaseManager.release(bumpType);
}
