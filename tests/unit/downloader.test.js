import { jest } from '@jest/globals';
import { downloadFile, copyToClipboard } from '../../core/downloader.js';

describe('core/downloader', () => {
  beforeEach(() => {
    resetBrowserMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('downloadFile creates object URL and triggers download', async () => {
    await downloadFile('test content', 'tabs.md', 'text/markdown');

    expect(URL.createObjectURL).toHaveBeenCalledTimes(1);
    expect(browser.downloads.download).toHaveBeenCalledWith({
      url: 'blob:mock-url',
      filename: 'tabs.md',
      saveAs: false,
      conflictAction: 'uniquify',
    });

    // Advance timers by 15s to trigger URL revocation
    jest.advanceTimersByTime(15_000);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  test('copyToClipboard writes text to navigator.clipboard', async () => {
    await copyToClipboard('sample tab urls');
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith('sample tab urls');
  });
});

