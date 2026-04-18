# Changelog

All notable changes to this project will be documented in this file.

## 0.1.0-alpha - 2026-04-17

- Added synchronous `measureHeight` API backed by JSI host function installation.
- Added JS measurement runtime with configurable fallback behavior and pixel rounding options.
- Added LRU-based measurement caching with cache key normalization and explicit cache controls.
- Added Android and iOS native text-measure paths plus parity test tooling for HostAppLegacy.
- Added unit and integration-style test coverage for cache behavior, configuration, and repeatability.
- Added New Architecture scaffolding work (codegen config and TurboModule spec) while keeping Old Architecture as the verified path.
- Added explicit warning when New Architecture runtime falls back to approximate JS measurement.
- Fixed TypeScript consumer compatibility by replacing untyped `globalThis.devicePixelRatio` access with a typed runtime-global cast.
- Removed accidental self-dependency from `package.json` that broke fresh-app tarball installs.
- Updated repository metadata URLs in `package.json` and `pretext-rn.podspec` to point to the live GitHub repository.
- Aligned podspec version/tag metadata with `0.1.0-alpha`.
