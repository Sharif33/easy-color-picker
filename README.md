# Color Hub

Extract colors, analyze palettes, and enhance your design workflow.

## Features
- Pick colors from anywhere using `Pick Color` (EyeDropper)
- Analyze webpage CSS colors and save palettes by domain
- Keep a picked-color history with larger, readable swatches
- Copy analyzed RGB/HEX values directly from the analyzer fields
- Keep the extension badge and popup `Last Picked` color in sync
- Fast access in a compact popup UI

## Install (Development)
1. Install dependencies: `pnpm install`
2. Start the dev server: `pnpm dev`
3. Load the extension in Chrome:
   - Open `chrome://extensions`
   - Enable Developer mode
   - Click "Load unpacked" and select `build/chrome-mv3-dev`

## Build (Production)
```bash
pnpm build
```
This creates a production bundle in `build/`.

## Permissions
- `activeTab`: read the currently active tab on demand
- `storage`: save palettes and settings
- `unlimitedStorage`: store larger color histories if needed
- `scripting`: inject scripts to sample colors
- `contextMenus`: add right‑click menu actions
- `host_permissions` `<all_urls>`: allow color sampling on any page

## Privacy
This extension does not collect or transmit user data. All data stays local in your browser storage.

## Contributing
See `CONTRIBUTING.md` for workflow and guidelines.

## License
MIT — see `LICENSE`.

## Release Notes
See `RELEASE_NOTES.md` and `CHANGELOG.md`.
