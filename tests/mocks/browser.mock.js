/**
 * Browser API mock for Jest (Node environment).
 * Provides realistic stubs for all browser.* APIs used by the extension.
 * Set as a Jest setupFile so it runs before every test file.
 */

import { jest } from '@jest/globals';


const makeMockTabs = (count = 5) =>
  Array.from({ length: count }, (_, i) => ({
    id:            i + 1,
    title:         `Tab ${i + 1}`,
    url:           `https://example.com/page${i + 1}`,
    favIconUrl:    `https://example.com/favicon${i + 1}.ico`,
    windowId:      1,
    groupId:       i < 2 ? 10 : -1,  // first 2 tabs in group 10
    cookieStoreId: i === 3 ? 'firefox-container-1' : 'firefox-default',
    pinned:        i === 0,
    active:        i === 0,
    index:         i,
    discarded:     false,
  }));

global.browser = {
  tabs: {
    query: jest.fn(async (queryObj = {}) => {
      let tabs = makeMockTabs(5);
      if (queryObj.active) {
        tabs = tabs.filter((t) => t.active);
      }
      if (queryObj.currentWindow) {
        tabs = tabs.filter((t) => t.windowId === 1);
      }
      return tabs;
    }),
  },
  tabGroups: {
    query: jest.fn(async () => [
      { id: 10, title: 'Work', color: 'blue' },
    ]),
  },
  contextualIdentities: {
    query: jest.fn(async () => [
      { cookieStoreId: 'firefox-container-1', name: 'Personal', color: 'orange' },
    ]),
  },
  downloads: {
    download: jest.fn(async () => 1),
  },
  storage: {
    local: {
      get:    jest.fn(async () => ({})),
      set:    jest.fn(async () => {}),
      remove: jest.fn(async () => {}),
    },
  },
  runtime: {
    getManifest:   jest.fn(() => ({ version: '1.0.0' })),
    openOptionsPage: jest.fn(),
    onMessage:     { addListener: jest.fn() },
    onInstalled:   { addListener: jest.fn() },
  },
  i18n: {
    getMessage: jest.fn((key) => {
      if (key === 'errGroupNotFound') return 'Tab group not found.';
      if (key === 'errContainerNotFound') return 'Container not found.';
      return key;
    }),
  },
  action: {
    openPopup: jest.fn(),
  },
  contextMenus: {
    create:       jest.fn(),
    onClicked:    { addListener: jest.fn() },
  },
};

// Extend the native URL constructor so new URL() still works in tests
const NativeURL = global.URL || globalThis.URL;
if (NativeURL) {
  NativeURL.createObjectURL = jest.fn(() => 'blob:mock-url');
  NativeURL.revokeObjectURL = jest.fn();
}


global.navigator = {
  clipboard: {
    writeText: jest.fn(async () => {}),
  },
};

/** Helper to reset all mocks between tests */
global.resetBrowserMocks = () => {
  browser.tabs.query.mockClear();
  browser.tabGroups.query.mockClear();
  browser.contextualIdentities.query.mockClear();
  browser.downloads.download.mockClear();
  browser.storage.local.get.mockClear();
  browser.storage.local.set.mockClear();
  navigator.clipboard.writeText.mockClear();
};

/** Override tab data for specific tests */
global.mockTabsReturn = (tabs) => {
  browser.tabs.query.mockResolvedValueOnce(tabs);
};
