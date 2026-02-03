# Aegis Desk Bookmarks Browser Extension

## Installation

1. **Chrome/Edge/Brave:**
   - Open `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the extension folder

2. **Firefox:**
   - Open `about:debugging`
   - Click "This Firefox"
   - Click "Load Temporary Add-on"
   - Select `manifest.json`

## Files Required

- `manifest.json` - Extension configuration
- `popup.html` - Extension popup UI
- `popup.js` - Popup functionality
- `content.js` - Content script for page interaction
- `background.js` - Background service worker
- `icon16.png`, `icon48.png`, `icon128.png` - Extension icons

## Features

- One-click bookmark saving from any website
- Auto-capture page title, URL, description, and favicon
- Seamless integration with Aegis Desk Bookmarks
- Works on all websites

## Usage

1. Visit any website
2. Click the extension icon
3. Click "Save This Page"
4. Bookmark is automatically added to Aegis Desk

## Development

The extension communicates with Aegis Desk through:
- Content scripts for page metadata extraction
- Message passing for bookmark data
- Local storage for sync (optional)
