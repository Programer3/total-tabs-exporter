/**
 * @module formatters/jsonFormatter
 * Formats grouped tabs as structured JSON with full metadata.
 * Includes favicons in output (as requested).
 * Uses a replacer to control field inclusion based on options.
 */

import { sanitizeUrl } from '../utils/sanitizer.js';

export class JsonFormatter {
  /**
   * @param {import('../core/groupResolver.js').GroupedTabs} groupedTabs
   * @param {{ includeTitle?: boolean }} options
   * @returns {Promise<string>}
   */
  async format(groupedTabs, { includeTitle = true } = {}) {
    const output = {
      meta: {
        exportedAt:    new Date().toISOString(),
        browser:       'Firefox',
        totalTabs:     groupedTabs.all.length,
        includeTitle,
      },
      groups:     this._serializeEntries(groupedTabs.groups,     includeTitle),
      containers: this._serializeEntries(groupedTabs.containers, includeTitle),
      ungrouped:  groupedTabs.ungrouped.map((t) => this._serializeTab(t, includeTitle)),
    };

    return JSON.stringify(output, null, 2);
  }

  /**
   * @param {Object.<string, import('../core/groupResolver.js').GroupEntry>} entries
   * @param {boolean} includeTitle
   * @returns {Object[]}
   */
  _serializeEntries(entries, includeTitle) {
    return Object.values(entries).map(({ meta, tabs }) => ({
      id:    meta.id,
      name:  meta.name,
      color: meta.color,
      type:  meta.type,
      count: tabs.length,
      tabs:  tabs.map((t) => this._serializeTab(t, includeTitle)),
    }));
  }

  /**
   * @param {import('../core/tabCollector.js').TabRecord} tab
   * @param {boolean} includeTitle
   * @returns {Object}
   */
  _serializeTab(tab, includeTitle) {
    const record = {
      url:           sanitizeUrl(tab.url),
      favIconUrl:    tab.favIconUrl ?? null,   // included per user request
      windowId:      tab.windowId,
      index:         tab.index,
      pinned:        tab.pinned,
      active:        tab.active,
      discarded:     tab.discarded,
      cookieStoreId: tab.cookieStoreId,
    };
    if (includeTitle) {
      record.title = tab.title;
    }
    return record;
  }
}
