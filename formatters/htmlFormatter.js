/**
 * @module formatters/htmlFormatter
 * Formats grouped tabs as a self-contained, styled HTML document.
 * Includes favicons (per user request). All output is HTML-escaped.
 */

import { escapeHtml, sanitizeUrl, truncate } from '../utils/sanitizer.js';
import { chunkProcess } from '../utils/chunker.js';

export class HtmlFormatter {
  /**
   * @param {import('../core/groupResolver.js').GroupedTabs} groupedTabs
   * @param {{ includeTitle?: boolean }} options
   * @returns {Promise<string>}
   */
  async format(groupedTabs, { includeTitle = true } = {}) {
    const now     = new Date().toLocaleString();
    const total   = groupedTabs.all.length;
    const parts   = [];

    // Sections
    for (const entry of Object.values(groupedTabs.groups)) {
      parts.push(await this._section(`📁 Group: ${entry.meta.name}`, entry.meta.color, entry.tabs, includeTitle, 'group'));
    }
    for (const entry of Object.values(groupedTabs.containers)) {
      parts.push(await this._section(`🔷 Container: ${entry.meta.name}`, entry.meta.color, entry.tabs, includeTitle, 'container'));
    }
    if (groupedTabs.ungrouped.length > 0) {
      parts.push(await this._section('🔗 Default / Ungrouped', 'gray', groupedTabs.ungrouped, includeTitle, 'default'));
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Exported Firefox Tabs — ${escapeHtml(now)}</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #0f1117; color: #e1e4e8; padding: 2rem; line-height: 1.6; }
    h1 { font-size: 1.75rem; font-weight: 700; color: #ff9500; margin-bottom: 0.25rem; }
    .meta { color: #8b949e; font-size: 0.875rem; margin-bottom: 2rem; }
    .section { background: #161b22; border: 1px solid #30363d; border-radius: 12px; margin-bottom: 1.5rem; overflow: hidden; }
    .section-header { padding: 0.75rem 1rem; font-weight: 600; font-size: 1rem; display: flex; align-items: center; gap: 0.5rem; border-bottom: 1px solid #30363d; }
    .section-header.group     { background: #1c2d3c; color: #58a6ff; }
    .section-header.container { background: #1c2c1c; color: #3fb950; }
    .section-header.default   { background: #1e1e1e; color: #8b949e; }
    .badge { font-size: 0.75rem; color: #8b949e; margin-left: auto; }
    .tab-list { list-style: none; }
    .tab-item { display: flex; align-items: center; gap: 0.6rem; padding: 0.5rem 1rem; border-bottom: 1px solid #21262d; transition: background 0.15s; }
    .tab-item:last-child { border-bottom: none; }
    .tab-item:hover { background: #21262d; }
    .favicon { width: 16px; height: 16px; flex-shrink: 0; border-radius: 3px; }
    .favicon-fallback { width: 16px; height: 16px; flex-shrink: 0; opacity: 0.4; }
    .tab-link { color: #58a6ff; text-decoration: none; font-size: 0.875rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
    .tab-link:hover { text-decoration: underline; color: #a5c9f8; }
    .tab-url { color: #8b949e; font-size: 0.75rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .pinned-badge { font-size: 0.65rem; background: #388bfd26; color: #58a6ff; padding: 1px 5px; border-radius: 4px; flex-shrink: 0; }
  </style>
</head>
<body>
  <h1>Exported Firefox Tabs</h1>
  <p class="meta">Exported: ${escapeHtml(now)} &nbsp;·&nbsp; ${total} tab${total !== 1 ? 's' : ''}</p>
  ${parts.join('\n  ')}
</body>
</html>`;
  }

  /**
   * Builds an HTML section for a group/container/default.
   */
  async _section(title, _color, tabs, includeTitle, sectionClass) {
    const items = [];
    await chunkProcess(tabs, 100, (tab) => {
      items.push(this._tabItem(tab, includeTitle));
    });

    return `<section class="section">
    <div class="section-header ${escapeHtml(sectionClass)}">
      ${escapeHtml(title)}
      <span class="badge">${tabs.length} tab${tabs.length !== 1 ? 's' : ''}</span>
    </div>
    <ul class="tab-list">
      ${items.join('\n      ')}
    </ul>
  </section>`;
  }

  /**
   * @param {import('../core/tabCollector.js').TabRecord} tab
   * @param {boolean} includeTitle
   * @returns {string}
   */
  _tabItem(tab, includeTitle) {
    const safeUrl   = sanitizeUrl(tab.url);
    const safeTitle = includeTitle && tab.title
      ? escapeHtml(truncate(tab.title, 120))
      : escapeHtml(truncate(tab.url, 80));
    const pinnedBadge = tab.pinned ? '<span class="pinned-badge">📌 pinned</span>' : '';

    const faviconHtml = tab.favIconUrl
      ? `<img class="favicon" src="${escapeHtml(tab.favIconUrl)}" alt="" loading="lazy" onerror="this.style.display='none'">`
      : `<span class="favicon-fallback">🌐</span>`;

    return `<li class="tab-item">
        ${faviconHtml}
        <div style="min-width:0;flex:1">
          <a class="tab-link" href="${escapeHtml(safeUrl)}" title="${escapeHtml(tab.url)}">${safeTitle}</a>
          ${includeTitle && tab.title ? `<div class="tab-url">${escapeHtml(truncate(tab.url, 80))}</div>` : ''}
        </div>
        ${pinnedBadge}
      </li>`;
  }
}
