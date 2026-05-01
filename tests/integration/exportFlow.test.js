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

  test('fetchScopeOptions returns grouped structure', async () => {
    const grouped = await fetchScopeOptions();
    expect(grouped).toHaveProperty('all');
    expect(grouped).toHaveProperty('groups');
    expect(grouped).toHaveProperty('containers');
    expect(grouped).toHaveProperty('ungrouped');
    expect(Array.isArray(grouped.all)).toBe(true);
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
