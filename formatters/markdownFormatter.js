/**
 * @module formatters/markdownFormatter
 * Formats grouped tabs as structured Markdown.
 * Uses join() on string arrays (not concatenation) for O(n) performance.
 */

import { escapeMarkdown, sanitizeUrl, truncate } from '../utils/sanitizer.js';
import { chunkProcess } from '../utils/chunker.js';

export class MarkdownFormatter {
  /**
   * @param {import('../core/groupResolver.js').GroupedTabs} groupedTabs
   * @param {{ includeTitle?: boolean }} options
   * @returns {Promise<string>}
   */
  async format(groupedTabs, { includeTitle = true } = {}) {
    const lines = [];
    const now   = new Date().toLocaleString();

    lines.push('# Exported Firefox Tabs', '');
    lines.push(`> **Exported:** ${now}  `);
    lines.push(`> **Total tabs:** ${groupedTabs.all.length}`, '');
    lines.push('---', '');

    // Native groups
    for (const entry of Object.values(groupedTabs.groups)) {
      lines.push(`## 📁 Group: ${escapeMarkdown(entry.meta.name)}`, '');
      lines.push(`*${entry.tabs.length} tab${entry.tabs.length !== 1 ? 's' : ''}*`, '');
      await chunkProcess(entry.tabs, 100, (tab) => {
        lines.push(this._tabLine(tab, includeTitle), '');
      });
      lines.push('');
    }

    // Containers
    for (const entry of Object.values(groupedTabs.containers)) {
      lines.push(`## 🔷 Container: ${escapeMarkdown(entry.meta.name)}`, '');
      lines.push(`*${entry.tabs.length} tab${entry.tabs.length !== 1 ? 's' : ''}*`, '');
      await chunkProcess(entry.tabs, 100, (tab) => {
        lines.push(this._tabLine(tab, includeTitle), '');
      });
      lines.push('');
    }

    // Ungrouped
    if (groupedTabs.ungrouped.length > 0) {
      lines.push('## 🔗 Default / Ungrouped', '');
      lines.push(`*${groupedTabs.ungrouped.length} tab${groupedTabs.ungrouped.length !== 1 ? 's' : ''}*`, '');
      await chunkProcess(groupedTabs.ungrouped, 100, (tab) => {
        lines.push(this._tabLine(tab, includeTitle), '');
      });
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * @param {import('../core/tabCollector.js').TabRecord} tab
   * @param {boolean} includeTitle
   * @returns {string}
   */
  _tabLine(tab, includeTitle) {
    const safeUrl = sanitizeUrl(tab.url);
    if (includeTitle && tab.title) {
      const safeTitle = escapeMarkdown(truncate(tab.title, 120));
      return `- [${safeTitle}](${safeUrl})`;
    }
    return `- <${safeUrl}>`;
  }
}
