# Developer Reference — Total Tab Exporter

> **For human developers** who need to understand, debug, modify, or extend this project.  
> Mirrors the Memory Bank structure but written for human cognition — with architecture diagrams, code maps, and practical gotchas.

---

## 1. Overview

| Field | Value |
|-------|-------|
| **Project** | Total Tab Exporter |
| **Version** | 1.0.3 |
| **Tagline** | Firefox extension to export tabs in multiple formats (Markdown, JSON, HTML, plain text) |
| **Tech Stack** | JavaScript (ESM), WebExtensions API, CSS (OKLCH), HTML5, Jest, Web-ext |

### What It Does

Total Tab Exporter is a lightweight Firefox extension that allows developers and power users to save lists of open browser tabs. It offers dynamic scope filtering (all tabs, ungrouped tabs, specific containers, specific color-coded tab groups, or the current active page) and parses them into beautifully structured outputs including Markdown links, raw JSON metadata, self-contained HTML files, or simple plain text.

### Key Files at a Glance

| File | Purpose |
|------|---------|
| `manifest.json` | Web extension metadata, permissions, background scripts, and popup anchor. |
| `popup/popup.html` | The main visual widget structure for the extension popup. |
| `popup/popup.js` | Presentation controller; orchestrates events and bridges core modules to the popup interface. |
| `popup/popup.css` | Design-system compliant CSS styles using oklch color spaces and Outfit typography. |
| `core/exportCoordinator.js` | Orchestrator coordinating tab collection, scope filtering, formatting, and delivery. |
| `core/tabCollector.js` | Interfaces with the browser API to query and normalize tab records. |
| `core/groupResolver.js` | Grouping logic for parsing native tab groups and container contexts. |
| `formatters/index.js` | Factory pattern registering and retrieving format engines. |

---

## 2. Architecture Diagram

```d2
direction: right

layers: {
    Presentation: {
        PopupHTML: popup.html
        PopupJS: popup.js (controller)
        PopupCSS: popup.css (Design System)
    }
    Orchestration: {
        Coordinator: exportCoordinator.js
    }
    Business: {
        GroupResolver: groupResolver.js
        Formatters: formatters/ (markdown, json, html, text)
    }
    Services: {
        TabCollector: tabCollector.js (tabs.query)
        Downloader: downloader.js (downloads/clipboard)
    }
    CrossCutting: {
        Logger: logger.js (localStorage debug flag)
        Sanitizer: sanitizer.js (XSS prevention & URL safety)
        Chunker: chunker.js (O(n) processing batching)
        Tooltips: tooltipManager.js (a11y descriptions)
    }
}

Presentation -> Orchestration: "trigger export with UI options"
Orchestration -> Services: "collect raw tabs"
Orchestration -> Business: "group tabs & apply selected scope"
Orchestration -> Business: "format using selected engine"
Orchestration -> Services: "download file / write clipboard"
```

---

## 3. Folder Layout

```
total-tab-exporter/
├── .rules/                       # Project custom rules and guidance
│   ├── DESIGN.md                 # Visual design system (OKLCH, Outfit typography)
│   ├── SKILL.md                  # Software engineering rules & quality checklists
│   ├── task_plan.md              # Phase tracking document
│   ├── findings.md               # Technical research notes
│   ├── progress.md               # Session test/run history logs
│   └── DEVELOPER_REFERENCE.md    # This file
│
├── _locales/                     # Extension translation definitions
│   └── en_US/
│       └── messages.json         # English localizations
│
├── background/                   # Persistent/lazy background services
│
├── core/                         # Orchestrations and browser integrations
│   ├── downloader.js             # File delivery and clipboard writing
│   ├── exportCoordinator.js      # Pipeline coordinator (collection -> formatting -> output)
│   ├── groupResolver.js          # Tab group and container contextual indexing
│   └── tabCollector.js           # raw tab retrieval and URL-filtering
│
├── formatters/                   # Output strategy formats
│   ├── index.js                  # Formatter registry and interface factory
│   ├── htmlFormatter.js          # HTML output renderer
│   ├── jsonFormatter.js          # JSON metadata exporter
│   ├── markdownFormatter.js      # Markdown link list compiler
│   └── textFormatter.js          # Raw titles and URLs exporter
│
├── popup/                        # Extension popup widget assets
│   ├── popup.html                # Popup layout structure
│   ├── popup.css                 # Stylings using design rules
│   └── popup.js                  # Frontend UI event orchestration
│
├── tests/                        # Test configurations and suites
│   ├── integration/
│   │   └── exportFlow.test.js    # Integration end-to-end tests
│   ├── mocks/
│   │   └── browser.mock.js       # Browser API mocks for ESM Jest
│   └── unit/
│       ├── chunker.test.js
│       ├── formatters.test.js
│       ├── sanitizer.test.js
│       └── tabCollector.test.js
│
├── utils/                        # Shared utility modules
│   ├── chunker.js                # Performance task segment batching
│   ├── logger.js                 # Local debug logging helper
│   ├── sanitizer.js              # Markdown / HTML URL security sanitization
│   └── tooltipManager.js         # JS popup tooltips
│
├── .gitignore                    # Git file exclusions
├── .web-ext-config.mjs           # Extension packaging config (excludes .rules/)
├── manifest.json                 # Web extension settings
└── package.json                  # Dependencies and Jest execution mappings
```

---

## 4. Module Walkthrough

### 4.1 Entry Point — `popup/popup.js`
Thin presentation layer that binds click events, checkbox changes, and dropdown selections. Keeps a local cache `cachedGroupedTabs` to dynamically update the count text in the UI header.

### 4.2 Orchestrator — `core/exportCoordinator.js`
Main async coordinator executing the sequential pipeline:
1. `collectTabs({ filterInternal })`
2. `resolveTabs(allTabs)`
3. `applyScope(groupedTabs, scope, activeTab)`
4. `getFormatter(format).format(scopedTabs, { includeTitle })`
5. Delivers the result to `downloadFile` or `copyToClipboard`.

---

## 5. Gotchas & Debugging

- **Jest ESM Windows Runners**: On Windows hosts running Node, Jest executable wrappers in `.bin/` fail to run under pure ES Modules. Always invoke tests targeting the JavaScript runner `node_modules/jest/bin/jest.js` directly with `--experimental-vm-modules`.
- **JSDOM URL Mocking**: Do not replace the native `global.URL` object inside Jest setup files, as doing so destroys the URL parser constructor. Instead, assign mock static fields (`createObjectURL` and `revokeObjectURL`) to the native class.
- **Active Tab Queries**: When querying `{ active: true, currentWindow: true }` inside the extension popup, remember that `browser.tabs.query` returns a list. The first item in that list represents the current webpage tab the user launched the popup from.
