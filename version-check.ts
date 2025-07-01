#!/usr/bin/env deno run --allow-read

/**
 * Simple version checker script
 * Usage: deno task version
 */

import { RELEASE_NOTES, VERSION, VersionUtils } from "./version.ts";

console.log(`🏷️  Salty Version: ${VERSION}`);
console.log(`📅 Build Date: ${VersionUtils.getExtendedVersion()}`);
console.log(`📦 Last Release: ${RELEASE_NOTES.date}`);

// Handle nagare's standard release notes structure
const added = RELEASE_NOTES.added || [];
const changed = RELEASE_NOTES.changed || [];
const fixed = RELEASE_NOTES.fixed || [];
const security = RELEASE_NOTES.security || [];
const removed = RELEASE_NOTES.removed || [];
const deprecated = RELEASE_NOTES.deprecated || [];

const totalChanges = added.length + changed.length + fixed.length +
  security.length + removed.length + deprecated.length;

if (totalChanges > 0) {
  console.log(`📝 Changes in this release: ${totalChanges} items`);
  if (added.length > 0) console.log(`   ✨ Added: ${added.length}`);
  if (changed.length > 0) console.log(`   🔄 Changed: ${changed.length}`);
  if (fixed.length > 0) console.log(`   🐛 Fixed: ${fixed.length}`);
  if (security.length > 0) console.log(`   🔒 Security: ${security.length}`);
  if (removed.length > 0) console.log(`   🗑️  Removed: ${removed.length}`);
  if (deprecated.length > 0) console.log(`   ⚠️  Deprecated: ${deprecated.length}`);
} else {
  console.log(`📝 No detailed change information available`);
}
