# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [1.0.2] - 2026-02-10
### Added
- Initialized and synchronized extension badge color from `lastPickedColor` on install/startup/storage changes.
- Added popup `Last Picked` display with color preview and clear action.
- Added a shared contrast text utility for color-based UI elements.

### Changed
- Updated color history and saved webpage color layouts to larger grid tiles with inline HEX labels.
- Updated analyzer selected color fields to support click-to-copy for RGB and HEX.
- Preserved `lastPickedColor` in storage instead of removing it after popup hydration.

## [1.0.1] - 2026-02-09
### Changed
- Replaced separate popup picker entries with a single `Pick Color` action.
- Removed the old active-page picker implementation.

### Fixed
- Treat EyeDropper cancel (`AbortError`) as an expected action without warning noise.

## [1.0.0] - 2026-02-08
### Added
- Initial public release of Color Hub.
