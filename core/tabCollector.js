/**
 * @module core/tabCollector
 * Fetches and normalizes all tab data from the Firefox tabs API.
 * Responsibility: Data acquisition and normalization only.
 *
 * @typedef {Object} TabRecord
 * @property {number}      id
 * @property {string}      title
 * @property {string}      url
 * @property {string|null} favIconUrl
 * @property {number}      windowId
 * @property {number|null} groupId        - Firefox native tab group id (-1 = none)
 * @property {string}      cookieStoreId  - Container identity id
 * @property {boolean}     pinned
 * @property {boolean}     active
 * @property {number}      index          - Position within window
 * @property {boolean}     discarded
 */

import { logger } from '../utils/logger.js';

/**
 * Normalizes a raw browser tab into a TabRecord.
 * @param {browser.tabs.Tab} tab
 * @returns {TabRecord}
 */
function normalizeTab(tab) {
  return {
    id:            tab.id,
    title:         tab.title          ?? '',
    url:           tab.url            ?? '',
    favIconUrl:    tab.favIconUrl     ?? null,
    windowId:      tab.windowId,
    groupId:       tab.groupId        ?? null,
    cookieStoreId: tab.cookieStoreId  ?? 'firefox-default',
    pinned:        tab.pinned         ?? false,
    active:        tab.active         ?? false,
    index:         tab.index,
    discarded:     tab.discarded      ?? false,
  };
}

/**
 * Fetches open tabs, normalizes them, and optionally filters internal pages.
 * Supports filtering by specific windowId or current window.
 *
 * @param {{ filterInternal?: boolean, windowId?: number|null, currentWindow?: boolean }} [options]
 * @returns {Promise<TabRecord[]>}
 */
export async function collectTabs({ filterInternal = true, windowId = null, currentWindow = false } = {}) {
  const queryObj = {};
  if (typeof windowId === 'number') {
    queryObj.windowId = windowId;
  } else if (currentWindow) {
    queryObj.currentWindow = true;
  }

  const rawTabs = await browser.tabs.query(queryObj);
  logger.debug(`collectTabs: fetched ${rawTabs.length} raw tabs`);

  let tabs = rawTabs.map(normalizeTab);

  if (filterInternal) {
    const before = tabs.length;
    tabs = tabs.filter((tab) => {
      const url = tab.url.toLowerCase();
      // Filter out common browser internal schemes
      return !url.startsWith('about:') && 
             !url.startsWith('moz-extension:') && 
             !url.startsWith('chrome-extension:') && 
             !url.startsWith('chrome:');
    });
    logger.debug(`collectTabs: filterInternal=true. Before: ${before}, After: ${tabs.length}`);
  } else {
    logger.debug(`collectTabs: filterInternal=false. Total: ${tabs.length}`);
  }

  return tabs;
}

/**
 * Gets the current window ID safely across browser environments.
 * @returns {Promise<number>}
 */
export async function getCurrentWindowId() {
  try {
    if (typeof browser.windows?.getCurrent === 'function') {
      const win = await browser.windows.getCurrent();
      if (win?.id) {
        return win.id;
      }
    }
  } catch (err) {
    logger.warn('getCurrentWindowId: windows.getCurrent failed:', err.message);
  }

  try {
    const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
    if (tab?.windowId) {
      return tab.windowId;
    }
  } catch (err) {
    logger.warn('getCurrentWindowId: tabs.query currentWindow failed:', err.message);
  }

  return 1;
}

/**
 * @typedef {Object} WindowInfo
 * @property {number}  id
 * @property {number}  index
 * @property {boolean} isCurrent
 * @property {number}  tabCount
 * @property {string}  title
 */

/**
 * Returns metadata about all open windows, derived from browser.windows and/or the tab list.
 *
 * @param {TabRecord[]} [tabs] - Optional pre-collected tabs to avoid extra query
 * @returns {Promise<{ windows: WindowInfo[], currentWindowId: number }>}
 */
export async function getWindowsInfo(tabs = null) {
  const currentWindowId = await getCurrentWindowId();
  const allTabs = tabs ?? await collectTabs({ filterInternal: false });

  // Map tabs by windowId
  const tabsByWindow = new Map();
  for (const tab of allTabs) {
    const wid = tab.windowId;
    if (!tabsByWindow.has(wid)) {
      tabsByWindow.set(wid, []);
    }
    tabsByWindow.get(wid).push(tab);
  }

  // Fetch windows from API if available
  let rawWindows = [];
  try {
    if (typeof browser.windows?.getAll === 'function') {
      rawWindows = await browser.windows.getAll({ windowTypes: ['normal'] });
    }
  } catch (err) {
    logger.debug('getWindowsInfo: windows.getAll not available or failed:', err.message);
  }

  // Combine window IDs
  const windowIdSet = new Set(rawWindows.map((w) => w.id));
  for (const wid of tabsByWindow.keys()) {
    windowIdSet.add(wid);
  }

  // Ensure currentWindowId is always present
  if (currentWindowId) {
    windowIdSet.add(currentWindowId);
  }

  const sortedWindowIds = [...windowIdSet].sort((a, b) => a - b);

  const windows = [];
  let index = 0;
  for (const wid of sortedWindowIds) {
    index += 1;
    const windowTabs = tabsByWindow.get(wid) ?? [];
    const isCurrent = wid === currentWindowId;
    const activeTab = windowTabs.find((t) => t.active) ?? windowTabs[0];

    // Determine descriptive title
    let title = '';
    const rawWin = rawWindows.find((w) => w.id === wid);
    if (rawWin?.title && !rawWin.title.startsWith('Mozilla Firefox')) {
      title = rawWin.title;
    } else if (activeTab?.title) {
      title = activeTab.title.replace(/\s*[-—]\s*Mozilla Firefox$/i, '').trim();
    }

    windows.push({
      id: wid,
      index,
      isCurrent,
      tabCount: windowTabs.length,
      title: title || `Window ${index}`,
    });
  }

  // Sort: current window first, then by index / id
  windows.sort((a, b) => {
    if (a.isCurrent) {
      return -1;
    }
    if (b.isCurrent) {
      return 1;
    }
    return a.id - b.id;
  });

  return { windows, currentWindowId };
}

