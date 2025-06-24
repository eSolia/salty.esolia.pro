#!/usr/bin/env deno run --allow-read

/**
 * Simple version checker script
 * Usage: deno task version
 */

import { VERSION, VersionUtils, RELEASE_NOTES } from './version.ts';

console.log(`🏷️  Salty Version: ${VERSION}`);
console.log(`📅 Build Date: ${VersionUtils.getExtendedVersion()}`);
console.log(`📦 Last Release: ${RELEASE_NOTES.releaseDate}`);

const changes = RELEASE_NOTES.changes;

// Handle both old and new property names safely
const added = changes.added || [];
const improved = changes.improved || [];
const fixed = changes.fixed || [];
const security = changes.security || [];
const removed = changes.removed || [];

const totalChanges = added.length + improved.length + fixed.length + security.length + removed.length;

if (totalChanges > 0) {
  console.log(`📝 Changes in this release: ${totalChanges} items`);
  if (added.length > 0) console.log(`   ✨ Added: ${added.length}`);
  if (improved.length > 0) console.log(`   🔄 Improved: ${improved.length}`);
  if (fixed.length > 0) console.log(`   🐛 Fixed: ${fixed.length}`);
  if (security.length > 0) console.log(`   🔒 Security: ${security.length}`);
  if (removed.length > 0) console.log(`   🗑️  Removed: ${removed.length}`);
} else {
  console.log(`📝 No detailed change information available`);
}