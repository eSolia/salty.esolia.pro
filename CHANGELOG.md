# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.2.1] - 2025-07-04

### Added

- add Vento templating system for maintainable HTML generation (236ac24)
- replace Font Awesome with Phosphor icons and improve UI (c34a204)
- add sui parameter for cleaner sharing UI (bb4b5af)
- make 3-word diceware passphrases rank as 'Good' (0a209d8)
- add excluded symbols feature and dynamic wordlist loading (7f7e0f8)
- add password generator with visibility toggle (efccbb9)

### Changed

- update documentation for sui parameter (e6f9a0b)
- add comprehensive password generator test suite (5839cea)

### Fixed

- format HTML output from build script to prevent release issues (22ed72d)
- exclude HTML files from deno fmt to prevent release issues (c5120e9)
- ensure HTML files have trailing newlines after build (1968a31)
- add cdn.jsdelivr.net to font-src CSP for Phosphor fonts (90bfbdc)
- update CSP to allow Phosphor icons and add planning doc (4dd3e38)
- hide browser's native password reveal button to prevent duplicates (732902f)
- simplify strength indicator to always use analyzePasswordStrength (bb58445)
- make password generator modal use same strength analyzer as main form (df5d7ec)
- correct entropy calculation for diceware passphrases (7da3f16)
- respect user's excluded symbols preferences (537cb09)
- add test-password-generator.html to allowed static files (e043a48)
- add CodeQL/LGTM suppression comments for false positives (77ecc1f)
- update DevSkim suppression comments to inline format (a5ab155)
- address code scanning security alerts (442f62f)
- replace deprecated window with globalThis for Deno 2.0 compatibility (13f8181)
- improve diceware entropy with proper 10k+ word list (7e6422d)
- improve password generator UX and entropy calculation consistency (253d18f)
- correct favicon.ico path check to include leading slash (dfe4246)
- update CSP to allow Font Awesome kit domains (e8e0db3)
- update Font Awesome kit ID to correct value (96e995b)
- add POST method to forms to prevent key exposure in URL (dc5a4a5)
- add transpilation handlers for password-strength and hibp-checker modules (6bebddd)

## [Unreleased]

### Changed

- Replace Font Awesome icons with Phosphor icons for consistency
- Add icons to Go and Reset buttons for better visual clarity

### Fixed

- Fix Reset button to properly exit sharing UI mode (sui=1)
- Fix duplicate password reveal icons when using sui=1

## [2.2.0] - 2025-07-03

### Added

- add password strength indicator and HIBP breach checking (e4833e5)

## [2.1.6] - 2025-07-03

### Added

- add QR code generation for shareable URLs (8beaa59)
- add shareable URL copy button after encryption (87581d1)

### Fixed

- improve Japanese text formatting in QR code modal (0fcfecc)
- update CSP to allow QR code library from cdn.jsdelivr.net (1e36e39)
- resolve QR code button click issue and update documentation (9f8161a)

## [2.1.5] - 2025-07-02

### Added

- add git hooks and auto-update workflow to prevent formatting issues (afccdfe)

### Changed

- bump nagare to 1.10.0 (fe46d80)
- bump version to 2.1.4 (59a98b3)
- bump nagare to 1.9.4 (f112139)
- bump codecov/codecov-action from 3 to 5 (#22) (651ba78)

### Fixed

- apply formatting after release (902bf90)
- apply formatting to pass security workflow checks (9dd31e5)

## [2.1.4] - 2025-07-02

### Added

- add git hooks and auto-update workflow to prevent formatting issues (afccdfe)

### Changed

- bump nagare to 1.9.4 (c7fe166)

### Fixed

- apply formatting to pass security workflow checks (9dd31e5)

## [2.1.3] - 2025-07-02

### Changed

- bump nagare to 1.9.3 (dbc17e4)
- bump nagare to 1.9.0 (90215a9)

### Fixed

- add missing assert import in salty_security_test.ts (a4c07cb)
- apply deno formatting to server.ts (8d032a1)
- resolve code scanning security alerts (aec544d)
- remove unsupported package ecosystems from Dependabot config (c6b83ef)
- improve security workflow pattern matching (7a4ddb1)
- resolve linting errors and test failures (097ede0)
- resolve formatting issues to fix Security Tests workflow (30adf99)

## [2.1.2] - 2025-07-01

### Changed

- bump actions/dependency-review-action from 3 to 4 (a1c213b)
- bump denoland/setup-deno from 1 to 2 (e407502)
- bump actions/cache from 3 to 4 (86c6f8d)
- bump actions/upload-artifact from 3 to 4 (61d5b9e)
- bump github/codeql-action from 2 to 3 (66a6ed7)

## [2.1.1] - 2025-07-01

### Added

- add custom badge update logic to nagare config (0da7460)

### Changed

- use JSON parsing for safer deno.json updates (a80b7c6)
- update README badges to reflect current version 2.1.0 and build date (30cbb43)

### Fixed

- use safer pattern for deno.json version updates (9a6f87f)

## [2.1.0] - 2025-07-01

### Added

- upgrade Nagare to 1.8.0 with additionalExports support (c063470)

### Changed

- update README version badge to 2.0.1 (2d38537)

### Fixed

- resolve security test failures and formatting issues (2eca91f)
- resolve formatting issues in multiple files (300873f)
- re-add missing exports to version.ts after release (3c3f721)

## [2.0.1] - 2025-07-01

### Changed

- update security changelog for v2.0.0 and add reminder to CLAUDE.md (94cabf4)
- InfoSec: add Microsoft DevSkim security linter workflow (6f8ce92)

### Fixed

- resolve all lint warnings (any types and require-await) (3eaa3b9)
- add missing assertThrows import and fix formatting (2776420)
- update GitHub Actions to use upload-artifact@v4 (df2f0c9)
- add missing exports to version.ts for server compatibility (1793f11)

## [2.0.0] - 2025-07-01

### Added

- add comprehensive security documentation and enhancements (a4fd1fc)

### Changed

- InfoSec: implement comprehensive security infrastructure (5fc60fb)
- upgrade nagare from 1.1.1 to 1.7.3 (659bf89)
- add programming paradigm documentation and coding guidelines (45ab0b3)

### Fixed

- use standard TYPESCRIPT template format (2156044)
- simplify nagare.config.ts to use built-in TYPESCRIPT_EXTENDED template (46caf28)
- switch to built-in TYPESCRIPT_EXTENDED template to avoid validation issues (ee5db83)
- remove dynamic Deno version access from template to avoid nagare validation error (cb8cc9c)

## [1.3.0] - 2025-06-30

### Added

- switch to launcher (0d68c04)
- bump nagare to 1.1.0 which simplifies config (52649f6)

### Changed

- remove unused file (a0b4e0f)
- bump nagare version (6d5de47)
- Revert "fix(nagare): add forward slash" (888192c)
- deno fmt (5ff2261)

### Fixed

- specify full jsr package name (2d23981)
- make nagare alias import directly (e11227e)
- spawn new deno process (9c01b74)
- pass fully qualified url (7da45d0)
- simplify wrapper (903c254)
- explicitly provide a file URL for the configuration file (e691435)
- make wrapper use an absolute path for the config file (7e00ab8)
- simplify wrapper (7d2b3a7)
- add forward slash (d98948a)
- use deno realPath to specify config (72e50d1)
- force config inside wrapper (2c3f157)
- pass config via deno task (b8b42ee)
- use absolute path (3a7b314)
- specify config file (b5194b5)
- add debug logging (9d50842)
- use import map (0874223)
- change import map to simplify (86839fc)

## [1.2.5] - 2025-06-27

### Changed

- deno fmt (aee056f)

### Fixed

- use custom updateFn for deno.json version (df67cbd)

## [1.2.4] - 2025-06-27

### Changed

- migrate to Nagare 1.0.1 with Vento templates and fix TypeScript errors (a853d50)
- remove release and rollback (69c7140)

### Fixed

- correct Vento template syntax for release notes generation (af1a253)
- make version regex less broad (6f8aa8f)

## [1.2.3] - 2025-06-26

### Changed

- deno fmt (104b009)

### Fixed

- implement capture group properly (d211fad)
- manual fix for regex-clobbered version (5320d39)

## [1.2.2] - 2025-06-26

### Changed

- bump nagare to 0.8.0 (a61f7a9)

### Fixed

- specify export in deno.json as server.ts (5afc743)
- remove namespace reference (d9db864)
- add back the version key (4497599)

## [1.2.1] - 2025-06-26

### Changed

- improve deno.json adding metadata and lint rules (f8badfb)
- bump nagare to 0.7.0 (f64329b)

### Fixed

- make regex more precise (0bffed5)

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
