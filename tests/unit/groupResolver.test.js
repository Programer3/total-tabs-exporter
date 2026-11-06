import { resolveTabs } from '../../core/groupResolver.js';

describe('core/groupResolver', () => {
  let originalTabGroups;
  let originalContainers;

  beforeEach(() => {
    originalTabGroups = browser.tabGroups;
    originalContainers = browser.contextualIdentities;
    resetBrowserMocks();
  });

  afterEach(() => {
    browser.tabGroups = originalTabGroups;
    browser.contextualIdentities = originalContainers;
  });

  test('handles case when browser.tabGroups API is missing', async () => {
    browser.tabGroups = undefined;

    const tabs = [
      { id: 1, title: 'T1', url: 'https://a.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false },
    ];

    const result = await resolveTabs(tabs);
    expect(result.all).toHaveLength(1);
    expect(Object.keys(result.groups)).toHaveLength(0);
  });

  test('handles case when browser.tabGroups query rejects with error', async () => {
    browser.tabGroups.query.mockRejectedValueOnce(new Error('Permission denied'));

    const tabs = [
      { id: 1, title: 'T1', url: 'https://a.com', windowId: 1, groupId: 10, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false },
    ];

    const result = await resolveTabs(tabs);
    expect(result.all).toHaveLength(1);
    expect(result.groups['10']).toBeDefined();
    expect(result.groups['10'].meta.name).toBe('Group 10');
  });

  test('handles case when contextualIdentities API is missing', async () => {
    browser.contextualIdentities = undefined;

    const tabs = [
      { id: 1, title: 'T1', url: 'https://a.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-container-1', pinned: false, active: true, index: 0, discarded: false },
    ];

    const result = await resolveTabs(tabs);
    expect(result.all).toHaveLength(1);
    expect(result.containers['firefox-container-1']).toBeDefined();
    expect(result.containers['firefox-container-1'].meta.name).toBe('firefox-container-1');
  });

  test('handles case when contextualIdentities query rejects with error', async () => {
    browser.contextualIdentities.query.mockRejectedValueOnce(new Error('Internal storage error'));

    const tabs = [
      { id: 1, title: 'T1', url: 'https://a.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-container-99', pinned: false, active: true, index: 0, discarded: false },
    ];

    const result = await resolveTabs(tabs);
    expect(result.all).toHaveLength(1);
    expect(result.containers['firefox-container-99'].meta.name).toBe('firefox-container-99');
  });
});
