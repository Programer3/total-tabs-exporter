/**
 * @module core/groupResolver
 * Resolves Firefox native tab groups and containers (contextualIdentities),
 * then maps each TabRecord to its classification.
 * Responsibility: Data enrichment and classification only.
 *
 * @typedef {Object} GroupMeta
 * @property {string} id
 * @property {string} name
 * @property {string} color
 * @property {'group'|'container'|'default'} type
 *
 * @typedef {Object} GroupEntry
 * @property {GroupMeta} meta
 * @property {import('./tabCollector.js').TabRecord[]} tabs
 *
 * @typedef {Object} GroupedTabs
 * @property {import('./tabCollector.js').TabRecord[]}   all
 * @property {Object.<string, GroupEntry>}               groups      - Firefox native groups
 * @property {Object.<string, GroupEntry>}               containers  - Container groups
 * @property {import('./tabCollector.js').TabRecord[]}   ungrouped
 */

import { logger } from '../utils/logger.js';

const DEFAULT_CONTAINER_ID = 'firefox-default';

/** @type {GroupMeta} */
const DEFAULT_CONTAINER_META = {
  id:    DEFAULT_CONTAINER_ID,
  name:  'Default',
  color: 'gray',
  type:  'container',
};

/**
 * Fetches Firefox native tab group metadata.
 * Gracefully returns an empty map if the tabGroups API is unavailable.
 * Firefox 131+ supports browser.tabGroups for extensions.
 *
 * @returns {Promise<Map<number, GroupMeta>>}
 */
async function fetchNativeGroups() {
  const map = new Map();
  try {
    if (typeof browser.tabGroups?.query === 'function') {
      const groups = await browser.tabGroups.query({});
      for (const g of groups) {
        map.set(g.id, {
          id:    String(g.id),
          name:  g.title || `Group ${g.id}`,
          color: g.color || 'blue',
          type:  'group',
        });
      }
      logger.debug(`fetchNativeGroups: found ${map.size} native groups`);
    } else {
      logger.debug('fetchNativeGroups: tabGroups API not available');
    }
  } catch (err) {
    logger.warn('fetchNativeGroups: error fetching tab groups:', err.message);
  }
  return map;
}

/**
 * Fetches container (contextualIdentity) metadata.
 * Returns a map of cookieStoreId → GroupMeta.
 *
 * @returns {Promise<Map<string, GroupMeta>>}
 */
async function fetchContainers() {
  const map = new Map();
  map.set(DEFAULT_CONTAINER_ID, DEFAULT_CONTAINER_META);

  try {
    if (typeof browser.contextualIdentities?.query === 'function') {
      const identities = await browser.contextualIdentities.query({});
      for (const identity of identities) {
        map.set(identity.cookieStoreId, {
          id:    identity.cookieStoreId,
          name:  identity.name,
          color: identity.color,
          type:  'container',
        });
      }
      logger.debug(`fetchContainers: found ${map.size - 1} containers`);
    } else {
      logger.debug('fetchContainers: contextualIdentities API not available');
    }
  } catch (err) {
    logger.warn('fetchContainers: error fetching containers:', err.message);
  }

  return map;
}

/**
 * Classifies all tabs into native groups, containers, and ungrouped.
 * Priority: native group > named container > ungrouped/default.
 *
 * @param {import('./tabCollector.js').TabRecord[]} tabs
 * @returns {Promise<GroupedTabs>}
 */
export async function resolveTabs(tabs) {
  const [nativeGroups, containers] = await Promise.all([
    fetchNativeGroups(),
    fetchContainers(),
  ]);

  /** @type {Object.<string, GroupEntry>} */
  const groups = {};
  /** @type {Object.<string, GroupEntry>} */
  const containerGroups = {};
  /** @type {import('./tabCollector.js').TabRecord[]} */
  const ungrouped = [];

  for (const tab of tabs) {
    // 1. Firefox native tab group.
    // Use tabGroups API metadata if available, otherwise synthesise metadata
    // from the raw groupId so tabs are still classified correctly even when
    // browser.tabGroups.query() is unavailable (Firefox 131 early builds).
    const gid = tab.groupId;
    if (gid !== null && gid !== -1) {
      const meta = nativeGroups.get(gid) ?? {
        id:    String(gid),
        name:  `Group ${gid}`,
        color: 'blue',
        type:  'group',
      };
      if (!groups[meta.id]) { groups[meta.id] = { meta, tabs: [] }; }
      groups[meta.id].tabs.push(tab);
      continue;
    }

    // 2. Named container (not default)
    if (tab.cookieStoreId && tab.cookieStoreId !== DEFAULT_CONTAINER_ID) {
      const meta = containers.get(tab.cookieStoreId) ?? {
        id:    tab.cookieStoreId,
        name:  tab.cookieStoreId,
        color: 'gray',
        type:  'container',
      };
      if (!containerGroups[meta.id]) { containerGroups[meta.id] = { meta, tabs: [] }; }
      containerGroups[meta.id].tabs.push(tab);
      continue;
    }

    // 3. Ungrouped / default container
    ungrouped.push(tab);
  }

  logger.debug(
    `resolveTabs: ${Object.keys(groups).length} groups, ` +
    `${Object.keys(containerGroups).length} containers, ` +
    `${ungrouped.length} ungrouped`,
  );

  return { all: tabs, groups, containers: containerGroups, ungrouped };
}
