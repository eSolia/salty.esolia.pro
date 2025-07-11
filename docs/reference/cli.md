# CLI Reference

## Overview

The Salty command-line interface provides commands for running the server, managing releases, and performing maintenance tasks.

## Synopsis

```bash
deno task [command] [options]
```

## Description

Salty uses Deno's task runner for command-line operations. All commands are defined in `deno.json` and provide consistent interfaces for development, deployment, and release management.

## Commands

### `deno task dev` {#dev}

Starts the development server with file watching enabled.

**Usage**:
```bash
deno task dev
```

**Options**:
- Automatically reloads on file changes
- Enables verbose logging
- Binds to localhost by default

**Environment**:
- Sets `NODE_ENV=development` if not specified
- Enables debug logging

**Example**:
```bash
export LOG_LEVEL=DEBUG
deno task dev
```

### `deno task start` {#start}

Starts the production server without file watching.

**Usage**:
```bash
deno task start
```

**Options**:
- No automatic reload
- Optimized for production use
- Respects all environment variables

**Example**:
```bash
export NODE_ENV=production
export SALT_HEX=0123456789abcdef0123456789abcdef
deno task start
```

### `deno task release:patch` {#release-patch}

Creates a patch release (increments version x.y.Z).

**Usage**:
```bash
deno task release:patch [-- options]
```

**Options**:
- `--skip-confirmation`: Skip interactive confirmation
- `--dry-run`: Preview changes without executing

**Process**:
1. Increments patch version in deno.json
2. Updates version in README badges
3. Regenerates version.ts
4. Creates git tag
5. Pushes to GitHub
6. Creates GitHub release

**Example**:
```bash
# Interactive release
deno task release:patch

# Non-interactive release
deno task release:patch -- --skip-confirmation
```

### `deno task release:minor` {#release-minor}

Creates a minor release (increments version x.Y.0).

**Usage**:
```bash
deno task release:minor [-- options]
```

**Options**:
- `--skip-confirmation`: Skip interactive confirmation
- `--dry-run`: Preview changes without executing

**Example**:
```bash
# Create minor release (1.2.3 -> 1.3.0)
deno task release:minor -- --skip-confirmation
```

### `deno task release:major` {#release-major}

Creates a major release (increments version X.0.0).

**Usage**:
```bash
deno task release:major [-- options]
```

**Options**:
- `--skip-confirmation`: Skip interactive confirmation
- `--dry-run`: Preview changes without executing

**Example**:
```bash
# Create major release (1.2.3 -> 2.0.0)
deno task release:major -- --skip-confirmation
```

### `deno task rollback` {#rollback}

Rolls back the last release.

**Usage**:
```bash
deno task rollback
```

**Process**:
1. Identifies the last release tag
2. Reverts version changes
3. Deletes the release tag
4. Updates GitHub release status

**Example**:
```bash
# Rollback last release
deno task rollback
```

### `deno task changelog` {#changelog}

Generates a changelog preview without creating a release.

**Usage**:
```bash
deno task changelog
```

**Output**:
- Shows commits since last release
- Groups by conventional commit types
- Previews release notes

**Example**:
```bash
deno task changelog
```

## Code Quality Commands

### `deno fmt` {#fmt}

Formats all code according to project standards.

**Usage**:
```bash
deno fmt
```

**Configuration**:
- 2 spaces indentation
- Double quotes
- Semicolons required
- 100 character line width

**Example**:
```bash
# Format all files
deno fmt

# Check formatting without changes
deno fmt --check
```

### `deno lint` {#lint}

Runs the linter on all TypeScript files.

**Usage**:
```bash
deno lint
```

**Rules**:
- No `any` types
- No unused variables
- Prefer const
- Require type annotations

**Example**:
```bash
# Lint all files
deno lint

# Lint specific file
deno lint server.ts
```

### `deno check` {#check}

Type-checks all TypeScript files without running them.

**Usage**:
```bash
deno check **/*.ts
```

**Important**: Always check all TypeScript files, not just server.ts.

**Example**:
```bash
# Type check all files
deno check **/*.ts

# Alternative syntax
deno check *.ts scripts/*.ts
```

### `deno test` {#test}

Runs all test files.

**Usage**:
```bash
deno test
```

**Options**:
- `--allow-env`: Required for environment tests
- `--allow-read`: Required for file system tests
- `--coverage`: Generate coverage report

**Example**:
```bash
# Run all tests
deno test

# Run specific test file
deno test security-utils_test.ts

# Run with coverage
deno test --coverage=coverage
```

## Utility Scripts

### Pre-commit Hook

The project includes a git pre-commit hook for automatic formatting:

```bash
# Enable pre-commit hook
git config core.hooksPath .githooks

# The hook automatically runs:
# - deno fmt
# - Stages formatted files
```

### Environment Validation

Check environment configuration:

```bash
# Validate required environment variables
deno eval "
  const required = ['SALT_HEX'];
  const missing = required.filter(v => !Deno.env.get(v));
  if (missing.length) {
    console.error('Missing:', missing);
    Deno.exit(1);
  }
  console.log('✓ Environment valid');
"
```

## Exit Codes

| Code | Description |
|------|-------------|
| 0 | Success |
| 1 | General error |
| 2 | Invalid configuration |
| 3 | Port already in use |
| 4 | Missing required environment variable |
| 5 | Release process failed |

## Examples

### Development Workflow

```bash
# 1. Set up development environment
export NODE_ENV=development
export SALT_HEX=devsalt0123456789abcdef0123456789
export LOG_LEVEL=DEBUG

# 2. Start development server
deno task dev

# 3. Make changes and test
# (Server auto-reloads)

# 4. Run quality checks
deno fmt
deno lint
deno check **/*.ts
deno test

# 5. Commit changes
git add .
git commit -m "feat: add new feature"
```

### Release Workflow

```bash
# 1. Ensure clean working directory
git status

# 2. Run pre-release checks
deno fmt --check
deno lint
deno check **/*.ts
deno test

# 3. Create release
deno task release:minor -- --skip-confirmation

# 4. Verify release
git tag -l
gh release view
```

### Production Deployment

```bash
# 1. Set production environment
export NODE_ENV=production
export SALT_HEX=$(openssl rand -hex 16)
export API_KEY=$(openssl rand -base64 32)
export LOG_LEVEL=INFO

# 2. Start server
deno task start

# 3. Monitor health
curl http://localhost:8000/health
```

## Troubleshooting

**Problem**: `deno task` not found
**Solution**: Ensure Deno is installed and in PATH

**Problem**: Permission denied errors
**Solution**: Deno requires explicit permissions; check task definitions

**Problem**: Release fails with "dirty working directory"
**Solution**: Commit or stash all changes before releasing

**Problem**: Type check finds errors not shown in editor
**Solution**: Run `deno check **/*.ts` to check all files, not just server.ts

## See also

- [Configuration Reference](./configuration.md) - Environment variables
- [Deploying Salty](../tutorials/deploying-salty.md) - Deployment guide
- [Getting Started](../tutorials/getting-started.md) - Quick start tutorial