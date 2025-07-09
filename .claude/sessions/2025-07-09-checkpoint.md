# Session Checkpoint - 2025-07-09 19:37:06 JST

## Session Context

**Working Directory**: `/Users/rcogley/dev/salty.esolia.pro-dd`
**Git Branch**: main (clean)
**Platform**: macOS Darwin 24.5.0

## Memory Files Loaded

1. **Global memory**: `~/.claude/CLAUDE.md`
   - Universal Claude Code configuration
   - Security standards (OWASP Top 10, ISO 27001)
   - Programming paradigm guidelines
   - Language-specific preflight checks
   - Commit message standards

2. **Project memory**: `./CLAUDE.md`
   - Salty project-specific instructions
   - Architecture and security requirements
   - Development commands and workflows
   - Aichaku methodology integration rules (recently updated)

## Project Overview

**Salty** - A security-focused password utility with:

- Client-side encryption (AES-GCM-256, PBKDF2-SHA512)
- Server never sees plaintext
- Deno-based implementation
- Nagare release automation
- Comprehensive security controls

## Key Development Reminders

1. **Security First**: Always verify against OWASP Top 10
2. **Preflight Checks**: `deno fmt`, `deno check **/*.ts`, `deno lint`, `deno test`
3. **No Attribution**: Never add "Generated with Claude Code" to commits
4. **TypeScript Strictness**: Never use `any` type
5. **Aichaku Methodology**: Discussion first, then create without asking

## Recent Activity

- Reviewed memory file loading process
- Confirmed 2 memory files loaded (global and project CLAUDE.md)
- Note: Project CLAUDE.md was recently updated with Aichaku integration rules

## Environment Variables Required

- `SALT_HEX`: 32-character hex string for cryptographic salt
- Optional: `API_KEY`, `LOG_LEVEL`, `WEBHOOK_URL`, `NODE_ENV`, `DASH_USER`, `DASH_PASS`

## Next Steps

Ready to assist with Salty development, security reviews, or methodology-based planning.
