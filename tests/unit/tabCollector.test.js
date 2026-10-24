import { collectTabs, getCurrentWindowId, getWindowsInfo } from '../../core/tabCollector.js';

describe('tabCollector', () => {
  beforeEach(() => resetBrowserMocks());

  test('returns normalized TabRecord objects', async () => {
    const tabs = await collectTabs();
    expect(tabs.length).toBeGreaterThan(0);
    const tab = tabs[0];
    expect(tab).toHaveProperty('id');
    expect(tab).toHaveProperty('title');
    expect(tab).toHaveProperty('url');
    expect(tab).toHaveProperty('favIconUrl');
    expect(tab).toHaveProperty('windowId');
    expect(tab).toHaveProperty('groupId');
    expect(tab).toHaveProperty('cookieStoreId');
    expect(tab).toHaveProperty('pinned');
    expect(tab).toHaveProperty('active');
    expect(tab).toHaveProperty('index');
    expect(tab).toHaveProperty('discarded');
  });

  test('calls browser.tabs.query once with no filters', async () => {
    await collectTabs();
    expect(browser.tabs.query).toHaveBeenCalledTimes(1);
    expect(browser.tabs.query).toHaveBeenCalledWith({});
  });

  test('filters by windowId when windowId parameter is provided', async () => {
    await collectTabs({ windowId: 2 });
    expect(browser.tabs.query).toHaveBeenCalledWith({ windowId: 2 });
  });

  test('filters by currentWindow when currentWindow=true', async () => {
    await collectTabs({ currentWindow: true });
    expect(browser.tabs.query).toHaveBeenCalledWith({ currentWindow: true });
  });

  test('filters internal pages when filterInternal=true (default)', async () => {
    mockTabsReturn([
      { id: 1, title: 'New Tab',    url: 'about:newtab',          windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false },
      { id: 2, title: 'Real Page',  url: 'https://example.com',   windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 1, discarded: false },
      { id: 3, title: 'Extension',  url: 'moz-extension://abc',   windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 2, discarded: false },
    ]);
    const tabs = await collectTabs({ filterInternal: true });
    expect(tabs).toHaveLength(1);
    expect(tabs[0].url).toBe('https://example.com');
  });

  test('does not filter when filterInternal=false', async () => {
    mockTabsReturn([
      { id: 1, url: 'about:newtab',        title: '', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false },
      { id: 2, url: 'https://example.com', title: '', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 1, discarded: false },
    ]);
    const tabs = await collectTabs({ filterInternal: false });
    expect(tabs).toHaveLength(2);
  });

  test('handles tabs with missing optional fields gracefully', async () => {
    mockTabsReturn([
      { id: 99, windowId: 1, index: 0 },   // Minimal tab
    ]);
    const tabs = await collectTabs({ filterInternal: false });
    expect(tabs[0].title).toBe('');
    expect(tabs[0].url).toBe('');
    expect(tabs[0].favIconUrl).toBeNull();
    expect(tabs[0].pinned).toBe(false);
  });

  test('getCurrentWindowId returns current window id', async () => {
    const wid = await getCurrentWindowId();
    expect(wid).toBe(1);
  });

  test('getWindowsInfo correctly groups tabs and identifies current window', async () => {
    const multiWinTabs = [
      { id: 1, title: 'Window 1 Active', url: 'https://site1.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false },
      { id: 2, title: 'Window 1 Tab 2',  url: 'https://site2.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 1, discarded: false },
      { id: 3, title: 'Window 2 Active', url: 'https://site3.com', windowId: 2, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false },
    ];
    browser.windows.getAll.mockResolvedValueOnce([
      { id: 1, focused: true, type: 'normal' },
      { id: 2, focused: false, type: 'normal' },
    ]);

    const { windows, currentWindowId } = await getWindowsInfo(multiWinTabs);
    expect(currentWindowId).toBe(1);
    expect(windows).toHaveLength(2);
    expect(windows[0].isCurrent).toBe(true);
    expect(windows[0].id).toBe(1);
    expect(windows[0].tabCount).toBe(2);
    expect(windows[0].title).toBe('Window 1 Active');

    expect(windows[1].isCurrent).toBe(false);
    expect(windows[1].id).toBe(2);
    expect(windows[1].tabCount).toBe(1);
    expect(windows[1].title).toBe('Window 2 Active');
  });

  test('handles 1000 tabs efficiently', async () => {
    const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
      id: i, title: `Tab ${i}`, url: `https://site${i}.com`, windowId: 1,
      groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false,
      index: i, discarded: false,
    }));
    mockTabsReturn(largeBatch);
    const start = Date.now();
    const tabs  = await collectTabs();
    const ms    = Date.now() - start;
    expect(tabs).toHaveLength(1000);
    expect(ms).toBeLessThan(500);  // Must complete well under 500ms
  });
});
