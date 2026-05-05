# ⬡ Total Tabs Exporter — Firefox Extension

Export all your Firefox tabs to **Markdown, JSON, HTML, or plain text** in one click.  
Supports native tab groups (Firefox 131+), containers, 1000+ tabs, and clipboard copy.  
Useful for backing up your browsing sessions, sharing tab collections, or organizing research.
Made this because I couldn't find any on firefox that can export "groups".

---

##  Features

| Feature | Description |
|---|---|
| **4 Export Formats** | Markdown, JSON (with favicons), self-contained HTML, plain text |
| **Tab Groups Support** | Firefox 131+ native tab groups with graceful degradation |
| **Container Support** | Full Firefox Multi-Account Container support |
| **Flexible Scope** | Export All tabs / specific group / specific container / ungrouped only |
| **Smart Filtering** | Option to exclude internal pages (`about:`, `moz-extension:`, etc.) |
| **Clipboard Integration** | One-click copy to clipboard instead of file download |
| **Auto-generated Filenames** | `firefox-tabs-export-YYYY-MM-DD-HH-MM-SS.ext` |
| **Persistent Settings** | Your preferences survive browser restarts |
| **High Performance** | Handles 1000+ tabs without freezing your browser |
| **Privacy-First** | No data collection, no external network calls |

---

##  Installation

### From Firefox Add-ons (AMO) - Recommended
1. Visit [Firefox Add-ons](https://addons.mozilla.org/)
2. Search for "Total Tabs Exporter" (WIP)
3. Click "Add to Firefox"

### Manual Installation (Sideloading)
1. Download the extension package (`.xpi` file) from the [Releases](https://github.com/programer3/total-tabs-exporter/releases) page
2. Open Firefox and go to `about:addons`
3. Click the gear icon (⚙) → "Install Add-on From File"
4. Select the downloaded `.xpi` file

---

##  Usage Tutorial

### Basic Export
1. Click the **⬡ Total Tab Exporter** icon in your Firefox toolbar
2. Choose your preferred **Format** (MD / JSON / HTML / TXT)
3. Select the **Scope** of tabs to export:
   - **All Tabs**: Every open tab across all windows
   - **Current Group**: Tabs in your active tab group (Firefox 131+)
   - **Specific Container**: Tabs from a particular container
   - **Ungrouped Only**: Tabs not in any group
4. Toggle **Include tab title** if you want group/container names included
5. Toggle **Filter internal pages** to exclude Firefox system pages
6. Choose **Download** to save as a file, or **Copy** to copy to clipboard

### Advanced Features
- **Settings Page**: Click the gear icon (⚙) in the popup to access persistent settings
- **Context Menu**: Right-click on any tab or the toolbar icon for quick export options
- **Keyboard Shortcut**: Press `Ctrl+Shift+E` to open the exporter

---

##  Security & Privacy

This extension is designed with security and privacy as top priorities:

- **No Host Permissions**: Only accesses tab metadata, never injects code into web pages
- **Zero Network Calls**: All processing happens locally on your device
- **Strict Content Security Policy**: Blocks inline scripts and external code execution
- **URL Sanitization**: Automatically blocks dangerous URLs like `javascript:` schemes
- **No Data Collection**: Your browsing data never leaves your device
- **Open Source**: Code is publicly auditable for security review

**Minimal Required Permissions:**
- `tabs`: Read tab information
- `contextualIdentities`: Access container information
- `downloads`: Save export files
- `clipboardWrite`: Copy to clipboard
- `storage`: Save your settings

---

##  Architecture Overview

The codebase follows production-grade conventions, modern web extension best practices & SOLID principles:

- **Manifest V3**: Latest Firefox extension standard
- **Modular Design**: Separate concerns for maintainability
- **Async Processing**: Non-blocking operations for smooth performance
- **Error Handling**: Graceful degradation when features aren't available
- **Cross-Platform**: Works on Windows, macOS, and Linux

---

##  Testing

The extension includes comprehensive test coverage to ensure reliability:

- **Unit Tests**: Individual component testing
- **Integration Tests**: Full export pipeline validation
- **Performance Tests**: 1000+ tab handling verification
- **Security Tests**: XSS prevention and URL sanitization

All tests pass before each release to guarantee stability*.

---

## Project Structure

```
Total Tabs Exporter/
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

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Ways to Contribute
- **Bug Reports**: Found an issue? Open a GitHub issue.
<!-- - **Feature Requests**: Have an idea? [Start a discussion](https://github.com/programer3/total-tabs-exporter/discussions) -->
- **Code Contributions**: Open a Pull request to contribute your code
- **Documentation**: Improve this README or something

### [Development Setup](Development.md)

### Code of Conduct
Please be respectful and constructive in all interactions. Its a personal side project

---

##  Requirements

- **Firefox**: Version 131 or later (for native tab groups support)
- **Operating System**: Windows 10+, macOS 10.15+, Linux (any modern distribution)

---

##  Troubleshooting

### Common Issues
- **Extension not loading**: Ensure you're using Firefox 131+
- **Groups not showing**: Tab groups require Firefox 131+ with the feature enabled
- **Settings not saving**: Clear browser data or try in a new profile
- **Any other issue**: Open a issue on this Repository (look at top section of this webpage)
<!-- - **Firefox Add-ons**: [AMO Page](https://addons.mozilla.org/addon/total-tabs-exporter/) -->

### Debug Mode
For advanced troubleshooting, enable debug logging:
1. Open Browser Console (`Ctrl+Shift+J`)
2. Run: `localStorage.setItem('TAB_EXPORTER_DEBUG', '1');`
3. Reload the extension popup
4. Check console for detailed logs

---

##  License

This project is licensed under the MIT License

---

##  Acknowledgments

- Built with modern WebExtensions APIs
- Inspired by the need for better tab management tools
- Thanks to the Firefox extension community for best practices
- And yes AI is used as a copilot to build this Extension

---

*Made with ❤️ for Firefox users who need better tab management tools.*