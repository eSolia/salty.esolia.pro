# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2025-06-26

### Added
- add scratch directory for dev experiments (5c1c790)
- add release library nagare (161c422)

### Changed
- bump nagare version (a13e68f)
- add br to top Jp message for clean look (ea4daed)

### Fixed
- add deno wrapper to fix eval problem (3f9be05)
- run nagare more directly (4fa0412)

## [1.1.0] - 2025-06-24

### Added
- add rollback and fix release (d3329b7)
- add deno.json changelog and release management scripts (d262ca3)
- add telemetry custom tracing spans (68caf7d)
- add enhanced logging (2d04b6f)
- add version.ts that other files can use (a05641e)

### Changed
- revert docs to before release (57a2f52)
- bump version to 1.1.0 (e74e5d8)
- ignore deno.lock (7d2c0e2)
- serve favicon.ico (f9f34d3)
- tidy up version number to actual release (5ca7f5a)
- remove direct console.error (e052a27)
- add info about env var settings (e0dbf97)
- update README, add SPEC (e250e72)
- add favicon (e98df25)
- enhance security on server.ts (9d5366d)
- refactor how to generate api key (2efe156)

### Fixed
- handle detailed commit log messages (79cbe46)
- adds missing bracket (49f1a36)
- fix deno task version error (77783d2)
- correct version getter deno task (f80e760)
- remove allowJS deno compiler option (27b3691)
- add clear url param to reset (9f010ee)
- switch to deno transpiler (5acfb15)
- loosen the transpiler (27ba223)
- create headers first (28fdfe7)
- transpile salty.ts to js (52eca00)
- remove ts feature (24a9f59)
- correct the salt injection (aab10f8)
- ensure payload is awaited (29f0517)
- better logging and typing (59dd345)
- get payload type (4e9a48e)
- update basE91 char table, add types for safety (51c8d74)
- add logging for decrypt ops (6f83288)
- change the salt injection to create a global variable (4e616ab)
- further enhance debugging (e3fc622)
- better debug (260a2e2)
- correctly define INJECTED_SALT_HEX (70cd6de)
- subject (940d88c)
- disable suspicious activity check if api_key user (31141fd)
- remove redundant export (04fd52b)
- remove redundant export (4d55071)
- convert string key to CryptoKey object before calling encrypt (a80f061)
- add unsafe-inline because it is required (4fdd4e9)
- change mime type for salty.ts, improve csp security (ff9c6eb)
- set csp to what is actually being used (f000531)

## [1.0.2] - 2025-06-21

- Merge pull request #7 from eSolia/20250622-rc-add-pre-populate-payload-url-param (d23367b)
- docs(readme): add how to prepopulate payload (e5d78b8)
- Merge pull request #6 from eSolia/20250622-rc-update-readme-with-security-info (8f40f2c)
- docs(readme): add section on security details (e92d0e6)

## [1.0.1] - 2025-06-21

- style(ui): make button colors consistent (3eaa695)

## [1.0.0] - 2025-06-21

- style(ui): set max width to 65 char for top and modal p (7e895ff)
- style(ui): set max width of top intro blurb to 65 char (8803165)
- fix(ui): set max width to top para (391e74c)
- Revert "style(typography): add tailwind typography plugin" (68938ff)
- Merge pull request #5 from eSolia/20250621-rc-add-tailwind-typography-from-cdn (427ce0d)
- style(typography): add tailwind typography plugin (ad992ec)
- Merge pull request #4 from eSolia/20250621-rc-ui-updates-logo-reset-wordwrap (aaa7cfb)
- fix(ui): handle word wrap for compressed cipher (90adb41)
- refactor(ui): move reset next to go (8cfe27e)
- Merge pull request #3 from eSolia/20250621-rc-add-payload-url-param-to-indices (874ead4)
- docs(ui): update acknowledgement of Neatnik Salty (3f7284b)
- feat(ui): add url param allowing pre-populating payload (aa2ad4e)
- docs(readme): update readme to include decrypt api (cd1f337)
- Merge pull request #2 from eSolia/20250621-rc-add-decrypt-api (a0d1a8c)
- feat(crypto): add api endpoint for decryption (29ea29f)
- Merge pull request #1 from eSolia/20250620-rc-compressed-version-does-not-decrypt (fbc474f)
- fix(decrypt): fix decryption logic to allow compressed (b2c0653)
- Sets title font weight (f56863b)
- Changes webfont to IBM Plex Sans JP (f1f4baa)
- Updates to text sky (51cb020)
- Updates accents to amber (2196f7e)
- Update background from gray to sky (36145a2)
- Adds static image serving (c2b28f9)
- Adds eSolia logo (6160f6a)
- Adds api endpoint details (1f3433e)
- Updates readme and marketing phrasing in app (cd8a190)
- Updates fontawesome (1b9fff3)
- Makes copyToClipboard attach to window object (38363f0)
- Fixes copy buttons (71b5397)
- Removes all type declarations (c510e23)
- Removes typescript type annotation (c0569de)
- Fixes charcode and how salty.ts is served (7b0cef3)
- Fixes form submission (63b2c7d)
- Updates imports (8a38795)
- Refactor to use external html files (7f2e65c)
- Updates (9bb3405)
- Tries string.fromCharCode (7901696)
- Fixes escaping problem? (c02bdb7)
- Continued fixes of backticks etc (fc457fb)
- Updates double quotes to single and some strings (b56cb46)
- Fixes escaping (5385a64)
- Fixes typos and adds more strings (52cc607)
- Fixes typo and UI strings (a7b3c1b)
- Adds initial salty typescript app (863f1e1)
- Initial commit (276306b)

[1.0.2]: https://github.com/esolia/salty.esolia.pro/compare/v1.0.1...v1.0.2
[1.0.1]: https://github.com/esolia/salty.esolia.pro/compare/v1.0.0...v1.0.1
[1.0.0]: https://github.com/esolia/salty.esolia.pro/releases/tag/v1.0.0
