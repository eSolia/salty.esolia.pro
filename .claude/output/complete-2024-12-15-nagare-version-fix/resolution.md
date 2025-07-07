# Nagare Version.ts Generation Issue Summary

## Problem

Nagare's version file generation overwrites custom exports needed by the application during releases.

## Details

- When running `deno task release`, Nagare regenerates `version.ts` using its template system
- The generated file only includes standard exports: `VERSION`, `BUILD_INFO`, `APP_INFO`, `APP_METADATA`, and `RELEASE_NOTES`
- Salty requires additional custom exports that are critical for the application:
  - `SECURITY_INFO` - Security configuration constants
  - `TECH_SPECS` - Technical specifications
  - `VersionUtils` - Utility class with helper methods

## Impact

- After each release, the deployment fails with: `error: Uncaught SyntaxError: The requested module './version.ts' does not provide an export named 'SECURITY_INFO'`
- Manual intervention required after every release to add back the missing exports
- This has happened twice (v2.0.0 and v2.0.1 releases)

## Current Configuration

```typescript
// nagare.config.ts
versionFile: {
  path: "./version.ts",
  template: TemplateFormat.TYPESCRIPT,
}
```

## What's Needed

A way to either:

1. Preserve custom exports when regenerating version.ts
2. Add a hook/callback to append custom exports after generation
3. Support a "custom exports" section in the template configuration
4. Allow extending the standard template with additional content

## Ideal Solution

Nagare should provide a mechanism to define custom exports that persist across version regenerations, either through configuration or by reading from a separate file that gets merged with the generated content.
