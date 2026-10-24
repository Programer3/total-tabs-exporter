/**
 * Integration test — full export pipeline from tab collection to output.
 * Tests the complete runExport() flow with mocked browser APIs.
 */

import { runExport, fetchScopeOptions } from '../../core/exportCoordinator.js';

describe('exportCoordinator — full pipeline', () => {
  beforeEach(() => resetBrowserMocks());

  test('runExport (download) calls browser.downloads.download', async () => {
    const result = await runExport({ format: 'markdown', scope: 'all', output: 'download' });
    expect(result.success).toBe(true);
    expect(result.count).toBeGreaterThan(0);
    expect(result.filename).toMatch(/^firefox-tabs-export-\d{4}-\d{2}-\d{2}-\d{2}-\d{2}-\d{2}\.md$/);
    expect(browser.downloads.download).toHaveBeenCalledTimes(1);
  });

  test('runExport (clipboard) calls clipboard.writeText', async () => {
    const result = await runExport({ format: 'json', scope: 'all', output: 'clipboard' });
    expect(result.success).toBe(true);
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(browser.downloads.download).not.toHaveBeenCalled();
  });

  test('runExport with scope=all exports all non-internal tabs', async () => {
    const result = await runExport({ format: 'text', scope: 'all', output: 'clipboard', filterInternal: true });
    expect(result.success).toBe(true);
    // Default mock has 5 tabs, all https:// so none filtered
    expect(result.count).toBe(5);
  });

  test('runExport with scope=ungrouped exports only ungrouped tabs', async () => {
    // Mock: 5 tabs, first 2 in group 10, tab 4 in container
    const result = await runExport({ format: 'text', scope: 'ungrouped', output: 'clipboard' });
    expect(result.success).toBe(true);
    // Tabs 3 and 5 are ungrouped (index 2 and 4, cookieStoreId=firefox-default, groupId=-1)
    expect(result.count).toBeGreaterThanOrEqual(1);
  });

  test('runExport with group scope exports only that group', async () => {
    const result = await runExport({ format: 'markdown', scope: 'group:10', output: 'clipboard' });
    expect(result.success).toBe(true);
    expect(result.count).toBe(2);   // First 2 tabs are in group 10
  });

  test('runExport with container scope exports only that container', async () => {
    const result = await runExport({ format: 'json', scope: 'container:firefox-container-1', output: 'clipboard' });
    expect(result.success).toBe(true);
    expect(result.count).toBe(1);   // Tab index 3 is in container
  });

  test('runExport with scope=current exports only the active tab in the current window', async () => {
    const result = await runExport({ format: 'text', scope: 'current', output: 'clipboard' });
    expect(result.success).toBe(true);
    expect(result.count).toBe(1); // tab 1 is active by default in the mock tabs
  });

  test('runExport throws for unknown group scope', async () => {
    await expect(
      runExport({ format: 'text', scope: 'group:nonexistent', output: 'clipboard' })
    ).rejects.toThrow(/not found/i);
  });

  test('runExport throws for unknown container scope', async () => {
    await expect(
      runExport({ format: 'text', scope: 'container:nonexistent', output: 'clipboard' })
    ).rejects.toThrow(/not found/i);
  });

  test('all 4 formats complete without error', async () => {
    for (const format of ['markdown', 'json', 'html', 'text']) {
      resetBrowserMocks();
      const result = await runExport({ format, scope: 'all', output: 'clipboard' });
      expect(result.success).toBe(true);
    }
  });

  test('onProgress callback is called for each pipeline step', async () => {
    const steps = [];
    await runExport({
      format: 'text', scope: 'all', output: 'clipboard',
      onProgress: ({ step }) => steps.push(step),
    });
    expect(steps).toContain('collecting');
    expect(steps).toContain('resolving');
    expect(steps).toContain('formatting');
    expect(steps).toContain('delivering');
  });

  test('fetchScopeOptions returns grouped structure and window info', async () => {
    const grouped = await fetchScopeOptions();
    expect(grouped).toHaveProperty('all');
    expect(grouped).toHaveProperty('groups');
    expect(grouped).toHaveProperty('containers');
    expect(grouped).toHaveProperty('ungrouped');
    expect(grouped).toHaveProperty('windows');
    expect(grouped).toHaveProperty('currentWindowId');
    expect(grouped).toHaveProperty('totalWindows');
    expect(Array.isArray(grouped.all)).toBe(true);
    expect(Array.isArray(grouped.windows)).toBe(true);
  });

  test('runExport with windowScope=current exports only tabs in current window', async () => {
    const multiWinTabs = [
      { id: 1, title: 'W1 T1', url: 'https://site1.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false },
      { id: 2, title: 'W1 T2', url: 'https://site2.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 1, discarded: false },
      { id: 3, title: 'W2 T1', url: 'https://site3.com', windowId: 2, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false },
      { id: 4, title: 'W2 T2', url: 'https://site4.com', windowId: 2, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 1, discarded: false },
      { id: 5, title: 'W2 T3', url: 'https://site5.com', windowId: 2, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 2, discarded: false },
    ];
    browser.tabs.query.mockResolvedValue(multiWinTabs);

    const resultCurrent = await runExport({ format: 'text', scope: 'all', windowScope: 'current', output: 'clipboard' });
    expect(resultCurrent.count).toBe(2);

    const resultAll = await runExport({ format: 'text', scope: 'all', windowScope: 'all', output: 'clipboard' });
    expect(resultAll.count).toBe(5);

    const resultWin2 = await runExport({ format: 'text', scope: 'all', windowScope: 2, output: 'clipboard' });
    expect(resultWin2.count).toBe(3);
  });

  test('runExport with scope=window:current and scope=window:2', async () => {
    const multiWinTabs = [
      { id: 1, title: 'W1 T1', url: 'https://site1.com', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false },
      { id: 2, title: 'W2 T1', url: 'https://site2.com', windowId: 2, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false },
    ];
    browser.tabs.query.mockResolvedValue(multiWinTabs);

    const resultCurrent = await runExport({ format: 'markdown', scope: 'window:current', output: 'clipboard' });
    expect(resultCurrent.count).toBe(1);

    const resultWin2 = await runExport({ format: 'markdown', scope: 'window:2', output: 'clipboard' });
    expect(resultWin2.count).toBe(1);
  });

  test('fetchScopeOptions filters groups and tabs when windowScope is specified', async () => {
    const multiWinTabs = [
      { id: 1, title: 'W1 T1', url: 'https://site1.com', windowId: 1, groupId: 10, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false },
      { id: 2, title: 'W2 T1', url: 'https://site2.com', windowId: 2, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false },
    ];
    browser.tabs.query.mockResolvedValue(multiWinTabs);

    const scopedWin1 = await fetchScopeOptions({ windowScope: 'current' });
    expect(scopedWin1.all).toHaveLength(1);
    expect(scopedWin1.groups['10']).toBeDefined();

    const scopedWin2 = await fetchScopeOptions({ windowScope: 2 });
    expect(scopedWin2.all).toHaveLength(1);
    expect(scopedWin2.groups['10']).toBeUndefined();
  });

  test('pipeline handles 1000 tabs in all formats', async () => {
    const largeBatch = Array.from({ length: 1000 }, (_, i) => ({
      id: i, title: `Tab ${i}`, url: `https://example.com/page/${i}`,
      favIconUrl: null, windowId: 1, groupId: -1,
      cookieStoreId: 'firefox-default', pinned: false, active: false,
      index: i, discarded: false,
    }));
    browser.tabs.query.mockResolvedValue(largeBatch);

    for (const format of ['markdown', 'json', 'html', 'text']) {
      browser.tabs.query.mockResolvedValue(largeBatch);
      const start  = Date.now();
      const result = await runExport({ format, scope: 'all', output: 'clipboard' });
      const ms     = Date.now() - start;
      expect(result.count).toBe(1000);
      expect(ms).toBeLessThan(3000);   // Must complete within 3s for 1000 tabs
    }
  });
});
