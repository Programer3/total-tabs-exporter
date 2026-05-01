# ⬡ Tab Exporter — Firefox Extension

Export all your Firefox tabs to **Markdown, JSON, HTML, or plain text** in one click.  
Supports native tab groups (Firefox 131+), containers, 1000+ tabs, and clipboard copy.

---

## Features

| Feature | Details |
|---|---|
| **4 Export Formats** | Markdown, JSON (with favicons), self-contained HTML, plain text |
| **Tab Groups** | Firefox 131+ native tab groups with graceful degradation |
| **Containers** | Full Firefox Multi-Account Container support |
| **Scope Control** | Export All / specific group / specific container / ungrouped only |
| **Include Title toggle** | On/off checkbox per export |
| **Filter Internal Pages** | Strips `about:`, `moz-extension:`, etc. |
| **Clipboard Copy** | One-click copy instead of file download |
| **Auto Filename** | `firefox-tabs-export-YYYY-MM-DD-HH-MM-SS.ext` |
| **Persistent Settings** | Stored in `browser.storage.local`, survives reinstall only resets |
| **Performance** | Chunked async processing — handles 1000+ tabs without blocking |
| **Security** | MV3, strict CSP, URL sanitization, zero external network calls |

---

## Project Structure

```
ffox-extn-tabs-export/
├── manifest.json               # MV3 manifest
├── background/
│   └── service-worker.js       # Context menus, message bridge
├── core/
│   ├── tabCollector.js         # Fetch & normalize tabs (single query)
│   ├── groupResolver.js        # Resolve groups & containers
│   ├── exportCoordinator.js    # Pipeline orchestration
│   └── downloader.js           # File download + clipboard
├── formatters/
│   ├── index.js                # Formatter registry
│   ├── markdownFormatter.js
│   ├── jsonFormatter.js
│   ├── htmlFormatter.js
│   └── textFormatter.js
├── utils/
│   ├── sanitizer.js            # URL/title escaping (security)
│   ├── chunker.js              # Async chunk processing
│   └── logger.js               # Conditional debug logger
├── popup/
│   ├── popup.html / .css / .js # Extension popup UI
├── options/
│   ├── options.html / .css / .js # Persistent settings page
├── _locales/en_US/messages.json
└── tests/
    ├── mocks/browser.mock.js   # Jest browser API mock
    ├── unit/                   # sanitizer, chunker, tabCollector, formatters
    └── integration/            # Full export pipeline tests
```

---

## 1. Install & Load (Development)

### Prerequisites
- Firefox 131 or later
- Node.js 18+ and npm (for tests and packaging only — extension itself has zero runtime deps)

### Steps

```powershell
# 1. Clone / navigate to the project
cd C:\Users\amangpt\Desktop\ffox-extn-tabs-export

# 2. Install dev dependencies (Jest, ESLint, web-ext)
npm install

# 3. Load in Firefox
#    Open: about:debugging → This Firefox → Load Temporary Add-on
#    Navigate to the project folder → select manifest.json
```

Or use **web-ext** for hot-reload development:

```powershell
npm run dev
# This launches a Firefox instance with the extension auto-loaded and auto-reloaded on file changes
```

---

## 2. Using the Extension

1. Click the **⬡ Tab Exporter** icon in the Firefox toolbar (or press `Ctrl+Shift+E`)
2. Choose a **Format** (MD / JSON / HTML / TXT)
3. Choose a **Scope** (All Tabs / specific Group or Container)
4. Toggle **Include tab title** and **Filter internal pages** as needed
5. Click **Download** to save a file, or **Copy** to copy to clipboard
6. Click the **⚙ gear icon** to open persistent settings

---

## 3. Testing

```powershell
# Run all tests with coverage report
npm test

# Watch mode (reruns on file save — great during development)
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Lint all source files
npm run lint
npm run lint:fix    # auto-fix where possible
```

### Test Coverage

| Module | Tests |
|---|---|
| `utils/sanitizer` | Markdown/HTML escaping, URL validation (XSS), truncation |
| `utils/chunker` | All-items processed, 1000-item perf gate, error propagation |
| `core/tabCollector` | Normalization, filtering, missing fields, 1000-tab perf gate |
| `formatters/*` | All 4 formats, XSS prevention, title toggle, registry errors |
| Integration | All scopes × all formats, clipboard vs download, progress callbacks, 1000-tab perf |

---

## 4. Enable Debug Logging

Open the **Browser Console** (`Ctrl+Shift+J`) while the popup is open, then run:

```javascript
localStorage.setItem('TAB_EXPORTER_DEBUG', '1');
```

Reload the popup to see detailed logs prefixed with `[TabExporter]`.

---

## 5. Build for Distribution

```powershell
# Build .zip package (excludes dev files per .web-ext-config.js)
npm run package
# Output: dist/tab_exporter-1.0.0.zip
```

---

## 6. Sign & Publish (AMO)

```powershell
# Sign with your AMO API credentials (get from addons.mozilla.org/developers)
npm run sign -- --api-key=YOUR_KEY --api-secret=YOUR_SECRET
# Output: dist/tab_exporter-1.0.0-signed.xpi
```

For **self-distribution** (sideloading), distribute the `.xpi` directly:
- Users install via `about:addons` → gear icon → "Install Add-on From File"
- Or host it on a website with `Content-Type: application/x-xpinstall`

---

## 7. Security Notes

- **No host permissions** — extension reads tab metadata only, never injects into pages
- **No remote code** — all logic is local; zero external server calls
- **Strict CSP** in manifest blocks inline scripts and eval
- **URL sanitization** blocks `javascript:` and `data:` URIs in all output formats
- **HTML escaping** in HTML formatter prevents XSS in exported files
- **Minimal permissions**: `tabs`, `contextualIdentities`, `downloads`, `clipboardWrite`, `storage`

---

## 8. Modifying & Extending

### Add a new export format

1. Create `formatters/csvFormatter.js` with a class implementing `format(groupedTabs, options): Promise<string>`
2. Register it in `formatters/index.js`:
   ```javascript
   import { CsvFormatter } from './csvFormatter.js';
   REGISTRY.set('csv', new CsvFormatter());
   ```
3. Add a radio button in `popup/popup.html`
4. Add extension mapping in `core/exportCoordinator.js` (`FORMAT_EXT`, `FORMAT_MIME`)

### Adjust chunk size for your hardware

In `formatters/*.js` or `core/tabCollector.js`, change the `chunkSize` argument to `chunkProcess()`.  
Default is 50–100 items/chunk, which balances responsiveness vs overhead.

---

## Architecture Principles

This codebase follows **SOLID** principles and production-grade conventions:

- **Single Responsibility** — each module does exactly one thing
- **Open/Closed** — formatters are open for extension without modifying existing code
- **Dependency Inversion** — `exportCoordinator` depends on abstractions (formatter interface), not implementations
- **DRY** — shared utilities (`sanitizer`, `chunker`, `logger`) are centralized
- **Modular** — no circular imports; dependency graph flows one way: `popup → core → formatters/utils`

---

## ⚠️ Known Limitations (Firefox API)

Currently, Firefox's WebExtensions API does not fully expose Native Tab Group metadata (like the group's custom name or color) to extensions, despite the feature being available to users in Firefox 131+. 

*   **What this means:** Tab Exporter *will* successfully detect that tabs are grouped and will export them together in a group block. However, the group will be named something generic like "Group 42" instead of your custom name, and it will use a default color.
*   **Future Fix:** As soon as Mozilla officially enables the `browser.tabGroups` API for Firefox extensions, this extension will automatically start pulling in your custom group names and colors (the code for this is already written and waiting in `core/groupResolver.js`).

---

## 🤝 Open Source & Contributing

This project is built to be open-source and community-driven. If you're publishing this on GitHub:

1. **License:** Consider adding an open-source license (like MIT or GPLv3) to the repository.
2. **Issues & PRs:** Feel free to open issues for bugs or feature requests. Pull requests adding new formatters (like CSV or OPML) are highly encouraged!
3. **Local Dev:** Use the instructions in the "Testing" and "Modifying & Extending" sections to get your local environment set up.
