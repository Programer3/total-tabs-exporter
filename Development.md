## 1. Install & Load (Development)

### Prerequisites
- Firefox 131 or later
- Node.js 18+ and npm (for tests and packaging only — extension itself has zero runtime deps)

### Steps

1. Fork the repository
2. Clone your fork to local machine

```powershell
# 3. navigate to the project
cd "path to your clone"

# 4. Create a feature branch:
git checkout -b feature/your-feature-name

# 5. Install dev dependencies (Jest, ESLint, web-ext)
npm install
```
6. Load in Firefox Open: about:debugging → This Firefox → Load Temporary Add-on Navigate to the project folder → select manifest.json


#### Or use **web-ext** for hot-reload development:

```powershell
npm run dev
# This launches a Firefox instance with the extension auto-loaded and auto-reloaded on file changes
```
7. Make changes and test 
8. Commmit & Submit a pull request

---

##  Testing

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