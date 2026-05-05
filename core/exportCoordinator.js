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

import { collectTabs }    from './tabCollector.js';
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
 * Filters a GroupedTabs structure down to the requested scope.
 * @param {import('./groupResolver.js').GroupedTabs} groupedTabs
 * @param {ExportScope} scope
 * @returns {import('./groupResolver.js').GroupedTabs}
 */
function applyScope(groupedTabs, scope) {
  if (scope === 'all') { return groupedTabs; }

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
    includeTitle   = true,
    filterInternal = true,
    output         = 'download',
    onProgress     = () => {},
  } = options;

  onProgress({ step: 'collecting', count: 0 });
  const allTabs = await collectTabs({ filterInternal });
  logger.info(`runExport: collected ${allTabs.length} tabs`);

  onProgress({ step: 'resolving', count: allTabs.length });
  const groupedTabs  = await resolveTabs(allTabs);

  onProgress({ step: 'scoping', count: allTabs.length });
  const scopedTabs   = applyScope(groupedTabs, scope);
  const tabCount     = scopedTabs.all.length;
  logger.info(`runExport: exporting ${tabCount} tabs (scope=${scope}, format=${format})`);

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
 * Accepts the same filterInternal flag as runExport so the tab count
 * displayed in the popup matches what will actually be exported.
 *
 * @param {{ filterInternal?: boolean }} [options]
 * @returns {Promise<import('./groupResolver.js').GroupedTabs>}
 */
export async function fetchScopeOptions({ filterInternal = false } = {}) {
  const tabs = await collectTabs({ filterInternal });
  return resolveTabs(tabs);
}
