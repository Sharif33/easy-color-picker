# Release Notes

## 1.0.2 (2026-02-10)
UI and state improvements for picked colors, history visibility, and analyzer interactions.

Highlights:
- Added extension badge state sync with `lastPickedColor` on install/startup/storage updates
- Badge now displays the last picked color and clears automatically when the value is removed
- Added a `Last Picked` section in popup with preview and one-click clear action
- Updated color history and saved webpage colors to larger grid tiles with inline HEX labels
- Improved contrast-aware text rendering on color tiles for better readability
- Enabled click-to-copy on analyzer RGB and HEX fields

## 1.0.1 (2026-02-09)
Updates to popup picking flow and picker UX.

Highlights:
- Consolidated popup picker actions into a single `Pick Color` option
- Removed the separate active-page picker code path
- Kept a lightweight temporary popup state while EyeDropper is active
- Suppressed warning logs for expected user-cancelled EyeDropper actions

## 1.0.0 (2026-02-08)
Color Hub public release.

Highlights:
- Pick colors from any page via the popup and context menu
- Save and organize palettes in browser storage
- Fast, minimal UI focused on everyday design workflows

Permissions used:
- `activeTab`, `storage`, `unlimitedStorage`, `scripting`, `contextMenus`
- `host_permissions`: `<all_urls>`
