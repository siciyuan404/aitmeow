# Icon and Logo Files

This directory contains the application icons and logo.

## Files

- `icon.svg` - Source SVG for generating all icon formats
- `logo.svg` - Logo displayed in the application UI (same as icon.svg)
- `icon.ico` - Windows application icon (multi-resolution ICO file)
- `icon.png` - macOS/Linux application icon (512x512)
- `icons/` - Directory containing PNG exports in various sizes

## Regenerating Icons

If you modify `icon.svg`, regenerate all formats by running:

```bash
npm run generate-icons
```

This will regenerate:
- All PNG sizes in `icons/` directory
- `icon.ico` for Windows
- `icon.png` for macOS/Linux

## Icon Sizes

The script generates the following sizes:
- ICO: 16, 32, 48, 64, 128, 256 (combined into one .ico file)
- PNG exports: 16, 32, 64, 128, 256, 512, 1024
- Main icon.png: 512x512 (for Electron on macOS/Linux)
