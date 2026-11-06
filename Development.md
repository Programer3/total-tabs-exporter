# Development Guide — Total Tab Exporter

Complete guide for setting up, developing, testing, and packaging Total Tab Exporter.

---

## 1. Install & Load (Development)

### Prerequisites
- Firefox 139.0 or later (Desktop)
- Node.js 18+ and npm (for tests, linting, and packaging only — extension itself has zero runtime dependencies)

### Steps

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/programer3/total-tabs-exporter.git
   cd total-tabs-exporter
   ```

2. Create a feature branch:
   ```bash
   git checkout -b feat/your-feature-name
   ```

3. Install development dependencies:
   ```bash
   npm install
   ```

4. Load temporarily in Firefox:
   - Navigate to `about:debugging` in Firefox.
   - Click **This Firefox** -> **Load Temporary Add-on...**
   - Select `manifest.json` from the repository root.

5. Or use **web-ext** for auto-reloading development:
   ```bash
   npm run dev
   ```

---

## 2. Automated Testing & Verification

```bash
# Run all tests with coverage report
npm test

# Watch mode (reruns on file save)
npm run test:watch

# Unit tests only
npm run test:unit

# Integration tests only
npm run test:integration

# Lint all source files (Zero Warnings Policy)
npm run lint
npm run lint:fix
```

### Test Coverage Matrix

| Module | Test File | Verified Invariants |
| :--- | :--- | :--- |
| `utils/sanitizer` | `tests/unit/sanitizer.test.js` | HTML/Markdown escaping, XSS prevention (`javascript:`, `data:` URI blocks), truncation |
| `utils/chunker` | `tests/unit/chunker.test.js` | 1000-tab batching, non-blocking chunk execution, error propagation |
| `utils/tooltipManager` | `tests/unit/tooltipManager.test.js` | Dynamic positioning, boundary detection, show/hide lifecycles |
| `core/tabCollector` | `tests/unit/tabCollector.test.js` | Normalization, URL filtering, empty attributes, 1000-tab performance gate |
| `formatters/*` | `tests/unit/formatters.test.js` | Markdown, JSON, HTML, and Text formatters, title inclusion, syntax validity |
| Integration | `tests/integration/exportFlow.test.js` | Full pipeline: scope resolution, window filtering, delivery (download vs clipboard) |

---

## 3. Enable Debug Logging

Open the **Browser Console** (`Ctrl+Shift+J` or `Cmd+Option+J`) while the popup or options page is open, then run:

```javascript
localStorage.setItem('TAB_EXPORTER_DEBUG', '1');
```

Reload the popup to view structured logs prefixed with `[TabExporter]`.

---

## 4. Build for Distribution

```bash
# Build .zip package (excludes dev files per .web-ext-config.mjs)
npm run package
# Output: dist/total_tab_exporter-1.2.0.zip
```

---

## 5. Sign & Publish (AMO)

```bash
# Sign with AMO API credentials (from addons.mozilla.org/developers)
npm run sign -- --api-key=YOUR_KEY --api-secret=YOUR_SECRET
# Output: dist/total_tab_exporter-1.2.0-signed.xpi
```

For **self-distribution** (sideloading), distribute the `.xpi` directly:
- Users install via `about:addons` -> Gear icon -> "Install Add-on From File".
- Or host on a website with `Content-Type: application/x-xpinstall`.

---

## 6. Security Notes

- **No host permissions**: Extension reads tab metadata only; never injects content scripts into web pages.
- **No remote code**: All logic is 100% local and offline; zero telemetry or external server calls.
- **Strict Content Security Policy**: Manifest blocks remote scripts and eval.
- **URL sanitization**: Strips dangerous URL schemes (`javascript:`, `data:`) across all output formats.
- **HTML escaping**: Comprehensive entity encoding in HTML formatter prevents XSS in exported files.
- **Minimal permissions**: `tabs`, `tabGroups`, `contextualIdentities`, `downloads`, `clipboardWrite`, `storage`.

---

## 7. Modifying & Extending

### Adding a New Export Format
1. Create `formatters/myFormatFormatter.js` implementing:
   ```javascript
   export class MyFormatFormatter {
     async format(groupedTabs, options = {}) {
       // Return formatted string
     }
   }
   ```
2. Register in `formatters/index.js`:
   ```javascript
   import { MyFormatFormatter } from './myFormatFormatter.js';
   REGISTRY.set('myformat', new MyFormatFormatter());
   ```
3. Add a radio button in `popup/popup.html`.
4. Add file extension and MIME mapping in `core/exportCoordinator.js` (`FORMAT_EXT`, `FORMAT_MIME`).

---

## 8. Browser Compatibility & Known Limitations

- **Firefox Version Requirement**: Mozilla added the `"permissions:tabGroups"` WebExtension API in **Firefox 139.0**. `manifest.json` specifies `"strict_min_version": "139.0"`. Earlier builds of Firefox will reject the `tabGroups` permission upon installation.
- **Firefox Multi-Account Containers**: Supported since Firefox 53 via `contextualIdentities`. Fully supported on Firefox Desktop.
- **Chromium Browsers (Chrome, Edge, Brave, Opera)**: The extension uses `browser.*` and Firefox-exclusive `contextualIdentities`. To run on Chromium $\ge 111$, an adapter layer (`webextension-polyfill` mapping `browser` $\rightarrow$ `chrome` and `"service_worker"` in background) is required.
- **Graceful degradation**: Tabs without custom group titles are safely categorized by group identifier (e.g. "Group 10") with custom colors mapped automatically where available.