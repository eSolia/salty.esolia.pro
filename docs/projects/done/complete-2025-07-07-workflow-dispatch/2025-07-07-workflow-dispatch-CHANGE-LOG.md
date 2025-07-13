# Workflow Dispatch Enhancement - Change Log

**Project**: Add workflow_dispatch to GitHub Actions
**Completed**: 2025-07-07
**Status**: Complete

## Summary

Added `workflow_dispatch` trigger to all GitHub workflow files to enable manual workflow runs via GitHub UI or CLI.

## Changes Made

### Workflows Updated

1. **auto-merge-dependabot.yml**
   - Added `workflow_dispatch:` trigger
   - Maintains existing `pull_request` trigger

2. **codeql.yml**
   - Added `workflow_dispatch:` trigger
   - Maintains existing `push`, `pull_request`, and `schedule` triggers

3. **dependency-review.yml**
   - Already had `workflow_dispatch` - no changes needed

4. **devskim.yml**
   - Added `workflow_dispatch:` trigger
   - Maintains existing `push`, `pull_request`, and `schedule` triggers

5. **security.yml**
   - Already had `workflow_dispatch` - no changes needed

## Benefits

- Manual workflow runs now available for all security and quality checks
- Can trigger workflows without needing to push code
- Useful for testing workflow changes
- Enables on-demand security scans
- Works with GitHub CLI for automation

## Usage Examples

### Via GitHub UI

Navigate to Actions tab → Select workflow → Run workflow

### Via GitHub CLI

```bash
# Run specific workflows
gh workflow run "DevSkim Security Scan" --ref main
gh workflow run "CodeQL Analysis" --ref main
gh workflow run "Dependency Review" --ref main
gh workflow run "Auto-update Dependabot PRs" --ref main

# List all workflows
gh workflow list

# View workflow runs
gh run list
```

## Technical Notes

- No parameters added to `workflow_dispatch` - uses defaults
- All existing triggers preserved
- No breaking changes
- Compatible with current permissions and job configurations
