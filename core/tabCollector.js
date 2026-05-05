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

const INTERNAL_URL_RE = /^(about:|moz-extension:|chrome-extension:|file:\/\/\/)/i;

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
 * Fetches all open tabs, normalizes them, and optionally filters internal pages.
 * A single browser.tabs.query({}) call is used for maximum efficiency.
 *
 * @param {{ filterInternal?: boolean }} [options]
 * @returns {Promise<TabRecord[]>}
 */
export async function collectTabs({ filterInternal = true } = {}) {
  const rawTabs = await browser.tabs.query({});
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
