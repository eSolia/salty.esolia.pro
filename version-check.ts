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
const totalChanges = changes.added.length + changes.improved.length + 
                    changes.fixed.length + changes.security.length;

if (totalChanges > 0) {
  console.log(`📝 Changes in this release: ${totalChanges} items`);
  if (changes.added.length > 0) console.log(`   ✨ Added: ${changes.added.length}`);
  if (changes.improved.length > 0) console.log(`   🔄 Improved: ${changes.improved.length}`);
  if (changes.fixed.length > 0) console.log(`   🐛 Fixed: ${changes.fixed.length}`);
  if (changes.security.length > 0) console.log(`   🔒 Security: ${changes.security.length}`);
}