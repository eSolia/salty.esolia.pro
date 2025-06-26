#!/usr/bin/env deno run --allow-read --allow-write --allow-run

/**
 * @fileoverview Rollback script for failed releases
 * @description Rolls back version changes, removes tags, and restores files
 * Usage: deno run --allow-read --allow-write --allow-run rollback.ts [version]
 */

class ReleaseRollback {
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

  async getLastCommitMessage(): Promise<string> {
    try {
      const result = await this.runCommand([
        "git",
        "log",
        "-1",
        "--pretty=format:%s",
      ]);
      return result.trim();
    } catch (error) {
      console.error("❌ Error getting last commit message:", error.message);
      return "";
    }
  }

  async getCurrentBranch(): Promise<string> {
    try {
      const result = await this.runCommand(["git", "branch", "--show-current"]);
      return result.trim();
    } catch (error) {
      console.error("❌ Error getting current branch:", error.message);
      return "main";
    }
  }

  async getLocalTags(): Promise<string[]> {
    try {
      const result = await this.runCommand(["git", "tag", "-l"]);
      return result.trim().split("\n").filter((tag) => tag.trim());
    } catch (error) {
      console.error("❌ Error getting tags:", error.message);
      return [];
    }
  }

  async rollbackRelease(targetVersion?: string): Promise<void> {
    console.log("🔄 Starting release rollback...\n");

    // Check if we're in a git repository
    try {
      await this.runCommand(["git", "status"]);
    } catch {
      console.error("❌ Not in a git repository or git not available");
      Deno.exit(1);
    }

    // Get current state
    const currentBranch = await this.getCurrentBranch();
    const lastCommit = await this.getLastCommitMessage();
    const localTags = await this.getLocalTags();

    console.log(`📍 Current branch: ${currentBranch}`);
    console.log(`📝 Last commit: ${lastCommit}`);
    console.log(`🏷️  Local tags: ${localTags.length} found`);

    // Detect if last commit is a release commit
    const isReleaseCommit = lastCommit.includes(
      "chore(release): bump version to",
    );
    let versionToRollback = targetVersion;

    if (!versionToRollback && isReleaseCommit) {
      const versionMatch = lastCommit.match(/bump version to (.+)$/);
      if (versionMatch) {
        versionToRollback = versionMatch[1];
      }
    }

    if (!versionToRollback) {
      console.log("❓ Enter the version to rollback (e.g., 1.1.0):");
      versionToRollback = prompt("Version:");
      if (!versionToRollback) {
        console.log("❌ No version specified. Aborting rollback.");
        return;
      }
    }

    console.log(`\n🎯 Rolling back version: ${versionToRollback}`);

    // Confirm rollback
    const proceed = confirm("\n❓ This will undo release changes. Continue?");
    if (!proceed) {
      console.log("❌ Rollback cancelled");
      return;
    }

    let rollbackActions: string[] = [];

    try {
      // 1. Check if there's a local tag to remove
      const tagName = `v${versionToRollback}`;
      if (localTags.includes(tagName)) {
        console.log(`🗑️  Removing local tag: ${tagName}`);
        await this.runCommand(["git", "tag", "-d", tagName]);
        rollbackActions.push(`Removed local tag ${tagName}`);
      }

      // 2. If last commit is a release commit, reset to previous commit
      if (isReleaseCommit) {
        console.log("⏪ Resetting to previous commit (before release)");
        await this.runCommand(["git", "reset", "--hard", "HEAD~1"]);
        rollbackActions.push("Reset to previous commit");
      } else {
        console.log("ℹ️  Last commit is not a release commit, skipping reset");
      }

      // 3. Check if there are any staged changes to discard
      try {
        const status = await this.runCommand(["git", "status", "--porcelain"]);
        if (status.trim()) {
          console.log("🧹 Discarding any uncommitted changes");
          await this.runCommand(["git", "reset", "--hard"]);
          rollbackActions.push("Discarded uncommitted changes");
        }
      } catch {
        // Ignore status check errors
      }

      // 4. Try to remove remote tag if it exists
      try {
        console.log(`📤 Checking if remote tag exists: ${tagName}`);
        await this.runCommand([
          "git",
          "ls-remote",
          "--tags",
          "origin",
          tagName,
        ]);

        const deleteRemote = confirm(
          `🗑️  Remote tag ${tagName} exists. Delete it?`,
        );
        if (deleteRemote) {
          await this.runCommand(["git", "push", "origin", "--delete", tagName]);
          rollbackActions.push(`Deleted remote tag ${tagName}`);
        }
      } catch {
        console.log(
          `ℹ️  Remote tag ${tagName} does not exist or cannot be accessed`,
        );
      }

      console.log("\n✅ Rollback completed successfully!");
      console.log("\n📋 Actions taken:");
      rollbackActions.forEach((action) => console.log(`   ✓ ${action}`));

      console.log("\n📌 Next steps:");
      console.log("   1. Verify your files are in the correct state");
      console.log(
        "   2. If you made changes to version.ts or CHANGELOG.md, check they are reverted",
      );
      console.log("   3. Fix any issues that caused the release to fail");
      console.log("   4. Try the release again when ready");

      // Show current status
      try {
        const status = await this.runCommand(["git", "status", "--short"]);
        if (status.trim()) {
          console.log("\n📄 Current git status:");
          console.log(status);
        } else {
          console.log("\n📄 Working directory is clean");
        }
      } catch {
        // Ignore status errors
      }
    } catch (error) {
      console.error("\n❌ Error during rollback:", error.message);
      console.log("\n🔧 Manual rollback steps:");
      console.log(`   1. Remove local tag: git tag -d v${versionToRollback}`);
      console.log("   2. Reset to previous commit: git reset --hard HEAD~1");
      console.log(
        "   3. Remove remote tag: git push origin --delete v" +
          versionToRollback,
      );
      console.log(
        "   4. Check git status and restore files manually if needed",
      );
    }
  }
}

// Main execution
if (import.meta.main) {
  const args = Deno.args;
  const targetVersion = args[0];

  const rollback = new ReleaseRollback();
  await rollback.rollbackRelease(targetVersion);
}
