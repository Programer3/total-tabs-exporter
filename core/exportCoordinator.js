/**
 * @module core/exportCoordinator
 * Orchestrates the full export pipeline:
 *   collectTabs → resolveTabs → applyScope → format → deliver
 *
 * Responsibility: Pipeline coordination and scope filtering only.
 *
 * @typedef {'all'|'ungrouped'|`group:${string}`|`container:${string}`} ExportScope
 *
 * @typedef {Object} ExportOptions
 * @property {string}       format          - 'markdown'|'json'|'html'|'text'
 * @property {ExportScope}  scope           - What subset to export
 * @property {boolean}      includeTitle    - Include tab titles in output
 * @property {boolean}      filterInternal  - Filter about: / internal pages
 * @property {'download'|'clipboard'} output - Delivery method
 * @property {(progress: {step: string, count: number}) => void} [onProgress]
 *
 * @typedef {Object} ExportResult
 * @property {boolean}  success
 * @property {number}   count
 * @property {string}   [filename]
 */

import { collectTabs, getCurrentWindowId, getWindowsInfo } from './tabCollector.js';
import { resolveTabs }    from './groupResolver.js';
import { getFormatter }   from '../formatters/index.js';
import { downloadFile, copyToClipboard } from './downloader.js';
import { logger }         from '../utils/logger.js';

/** Maps format keys to file extensions */
const FORMAT_EXT = { markdown: 'md', json: 'json', html: 'html', text: 'txt' };

/** Maps format keys to MIME types */
const FORMAT_MIME = {
  markdown: 'text/markdown',
  json:     'application/json',
  html:     'text/html',
  text:     'text/plain',
};

/**
 * Generates a filename: firefox-tabs-export-YYYY-MM-DD-HH-MM-SS.ext
 * @param {string} format
 * @returns {string}
 */
function generateFilename(format) {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const ext  = FORMAT_EXT[format] ?? 'txt';
  return `firefox-tabs-export-${date}-${time}.${ext}`;
}

/**
 * Helper to filter grouped tabs down to a subset of TabRecords.
 * @param {import('./groupResolver.js').GroupedTabs} groupedTabs
 * @param {import('./tabCollector.js').TabRecord[]} subsetTabs
 * @returns {import('./groupResolver.js').GroupedTabs}
 */
function filterGroupedTabs(groupedTabs, subsetTabs) {
  const tabIdSet = new Set(subsetTabs.map((t) => t.id));
  const groups = {};
  for (const [id, entry] of Object.entries(groupedTabs.groups)) {
    const matched = entry.tabs.filter((t) => tabIdSet.has(t.id));
    if (matched.length > 0) {
      groups[id] = { meta: entry.meta, tabs: matched };
    }
  }
  const containers = {};
  for (const [id, entry] of Object.entries(groupedTabs.containers)) {
    const matched = entry.tabs.filter((t) => tabIdSet.has(t.id));
    if (matched.length > 0) {
      containers[id] = { meta: entry.meta, tabs: matched };
    }
  }
  const ungrouped = groupedTabs.ungrouped.filter((t) => tabIdSet.has(t.id));
  return { all: subsetTabs, groups, containers, ungrouped };
}

/**
 * Filters a GroupedTabs structure down to the requested scope.
 * @param {import('./groupResolver.js').GroupedTabs} groupedTabs
 * @param {ExportScope} scope
 * @param {browser.tabs.Tab|null} [activeTabInCurrentWindow]
 * @param {number|null} [currentWindowId]
 * @returns {import('./groupResolver.js').GroupedTabs}
 */
function applyScope(groupedTabs, scope, activeTabInCurrentWindow = null, currentWindowId = null) {
  if (scope === 'all') { return groupedTabs; }

  if (scope === 'window:current') {
    const targetWinId = currentWindowId ?? activeTabInCurrentWindow?.windowId;
    const tabs = groupedTabs.all.filter((t) => t.windowId === targetWinId);
    return filterGroupedTabs(groupedTabs, tabs);
  }

  if (scope.startsWith('window:')) {
    const targetWinId = Number(scope.slice(7));
    const tabs = groupedTabs.all.filter((t) => t.windowId === targetWinId);
    return filterGroupedTabs(groupedTabs, tabs);
  }

  if (scope === 'current') {
    const matchedTab = activeTabInCurrentWindow
      ? groupedTabs.all.find((t) => t.id === activeTabInCurrentWindow.id)
      : null;
    const tabs = matchedTab ? [matchedTab] : [];
    return { all: tabs, groups: {}, containers: {}, ungrouped: tabs };
  }

  if (scope === 'ungrouped') {
    return { all: groupedTabs.ungrouped, groups: {}, containers: {}, ungrouped: groupedTabs.ungrouped };
  }

  if (scope.startsWith('group:')) {
    const id    = scope.slice(6);
    const entry = groupedTabs.groups[id];
    if (!entry) {
      throw new Error(browser.i18n.getMessage('errGroupNotFound', [id]) || `Tab group "${id}" not found.`);
    }
    return { all: entry.tabs, groups: { [id]: entry }, containers: {}, ungrouped: [] };
  }

  if (scope.startsWith('container:')) {
    const id    = scope.slice(10);
    const entry = groupedTabs.containers[id];
    if (!entry) {
      throw new Error(browser.i18n.getMessage('errContainerNotFound', [id]) || `Container "${id}" not found.`);
    }
    return { all: entry.tabs, groups: {}, containers: { [id]: entry }, ungrouped: [] };
  }

  throw new Error(browser.i18n.getMessage('errUnknownScope', [scope]) || `Unknown export scope: "${scope}"`);
}

/**
 * Runs the complete export pipeline.
 * @param {ExportOptions} options
 * @returns {Promise<ExportResult>}
 */
export async function runExport(options) {
  const {
    format         = 'markdown',
    scope          = 'all',
    windowScope    = 'all',
    includeTitle   = true,
    filterInternal = true,
    output         = 'download',
    onProgress     = () => {},
  } = options;

  onProgress({ step: 'collecting', count: 0 });
  const allTabs = await collectTabs({ filterInternal });
  logger.info(`runExport: collected ${allTabs.length} tabs`);

  const currentWinId = await getCurrentWindowId();
  let activeTab = null;
  if (scope === 'current') {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    activeTab = tab;
  }

  // Pre-filter by windowScope if specified and not 'all'
  let tabsToResolve = allTabs;
  if (windowScope === 'current') {
    tabsToResolve = allTabs.filter((t) => t.windowId === currentWinId);
  } else if (windowScope && windowScope !== 'all') {
    const targetId = typeof windowScope === 'string' && windowScope.startsWith('window:')
      ? Number(windowScope.slice(7))
      : Number(windowScope);
    if (!isNaN(targetId)) {
      tabsToResolve = allTabs.filter((t) => t.windowId === targetId);
    }
  }

  onProgress({ step: 'resolving', count: tabsToResolve.length });
  const groupedTabs  = await resolveTabs(tabsToResolve);

  onProgress({ step: 'scoping', count: tabsToResolve.length });
  const scopedTabs   = applyScope(groupedTabs, scope, activeTab, currentWinId);
  const tabCount     = scopedTabs.all.length;
  logger.info(`runExport: exporting ${tabCount} tabs (windowScope=${windowScope}, scope=${scope}, format=${format})`);

  onProgress({ step: 'formatting', count: tabCount });
  const formatter = getFormatter(format);
  const content   = await formatter.format(scopedTabs, { includeTitle });

  onProgress({ step: 'delivering', count: tabCount });

  if (output === 'clipboard') {
    await copyToClipboard(content);
    return { success: true, count: tabCount };
  }

  const filename = generateFilename(format);
  const mimeType = FORMAT_MIME[format] ?? 'text/plain';
  await downloadFile(content, filename, mimeType);

  return { success: true, count: tabCount, filename };
}

/**
 * Fetches available scope options (groups + containers) for the popup UI.
 * Accepts filterInternal and windowScope to return precisely the scopes and windows matching.
 *
 * @param {{ filterInternal?: boolean, windowScope?: string|number }} [options]
 * @returns {Promise<import('./groupResolver.js').GroupedTabs & { windows: import('./tabCollector.js').WindowInfo[], currentWindowId: number, totalWindows: number, allTabsCount: number, scopedTabsCount: number }>}
 */
export async function fetchScopeOptions({ filterInternal = false, windowScope = 'all' } = {}) {
  const allTabs = await collectTabs({ filterInternal });
  const { windows, currentWindowId } = await getWindowsInfo(allTabs);

  let scopedTabs = allTabs;
  if (windowScope === 'current') {
    scopedTabs = allTabs.filter((t) => t.windowId === currentWindowId);
  } else if (windowScope && windowScope !== 'all') {
    const targetId = typeof windowScope === 'string' && windowScope.startsWith('window:')
      ? Number(windowScope.slice(7))
      : Number(windowScope);
    if (!isNaN(targetId)) {
      scopedTabs = allTabs.filter((t) => t.windowId === targetId);
    }
  }

  const grouped = await resolveTabs(scopedTabs);
  return {
    ...grouped,
    windows,
    currentWindowId,
    totalWindows: windows.length,
    allTabsCount: allTabs.length,
    scopedTabsCount: scopedTabs.length,
  };
}
