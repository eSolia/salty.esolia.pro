# Session Checkpoint - 2025-07-11 10:06:11 JST

## Session Context

**Working Directory**: `/Users/rcogley/dev/salty.esolia.pro-dd`
**Git Branch**: main
**Platform**: macOS Darwin 24.5.0
**Model**: Claude Opus 4 (claude-opus-4-20250514)

## Memory Files Loaded

1. **Global memory**: `~/.claude/CLAUDE.md`
   - Universal Claude Code configuration
   - Security standards (OWASP Top 10, ISO 27001)
   - Programming paradigm guidelines
   - Language-specific preflight checks
   - Commit message standards
   - Git hooks and CI/CD best practices

2. **Project memory**: `./CLAUDE.md`
   - Salty project-specific instructions
   - Architecture and security requirements
   - Development commands and workflows
   - Aichaku methodology integration rules
   - TypeScript strictness requirements

## Git Status

**Current Branch**: main
**Modified Files**:

- deno.json

**Recent Commits**:

- bd14b36 chore(aichaku): upgrade to latest, tidy up
- 38899ee docs: add session checkpoint 2025-07-09
- af69493 docs: add session checkpoint 2025-07-09
- 09deb55 docs: add session checkpoint 2025-07-09
- de785b5 feat: add workflow_dispatch to GitHub Actions workflows

## Project Overview

**Salty** - A security-focused password utility featuring:

- Client-side encryption (AES-GCM-256, PBKDF2-SHA512 with 600,000 iterations)
- Zero-knowledge server architecture (plaintext never transmitted)
- Deno-based implementation with TypeScript
- Nagare release automation
- Comprehensive security controls and rate limiting (20 req/hour)
- Multi-language support (Japanese and English)

## Key Development Reminders

1. **Security First**: Always verify against OWASP Top 10 before any code changes
2. **Preflight Checks**: `deno fmt`, `deno check **/*.ts`, `deno lint`, `deno test`
3. **No AI Attribution**: Never add "Generated with Claude Code" to commits
4. **TypeScript Strictness**: Never use `any` type - project has strict linting
5. **Aichaku Methodology**: Discussion first, then create without asking
6. **Security Changelog**: Update SECURITY.md for any security-related changes
7. **Git Hooks**: Use `.githooks/pre-commit` for automatic formatting

## Environment Configuration

**Required**:

- `SALT_HEX`: 32-character hex string (16 bytes) for cryptographic salt

**Optional**:

- `API_KEY`: Base64 string for API endpoint authentication
- `LOG_LEVEL`: DEBUG, INFO, WARN, ERROR, SECURITY, CRITICAL (default: INFO)
- `LOG_FORMAT`: json or text (default: json)
- `WEBHOOK_URL`: For critical alert notifications
- `NODE_ENV`: development, staging, or production
- `DASH_USER`: Username for admin dashboard authentication
- `DASH_PASS`: Password for admin dashboard authentication

## Release Commands

- `deno task release:patch` - Patch release (1.2.3 -> 1.2.4)
- `deno task release:minor` - Minor release (1.2.3 -> 1.3.0)
- `deno task release:major` - Major release (1.2.3 -> 2.0.0)
- Add `-- --skip-confirmation` for non-interactive releases

## Recent Activity

- Reviewed memory file loading process
- Confirmed 2 memory files loaded (global and project CLAUDE.md)
- Previous checkpoint created on 2025-07-09

## Next Steps

Ready to assist with:

- Salty development and enhancements
- Security reviews and OWASP compliance
- Release management with Nagare
- Aichaku methodology-based planning
- Code quality improvements
