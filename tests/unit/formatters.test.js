import { MarkdownFormatter } from '../../formatters/markdownFormatter.js';
import { JsonFormatter }     from '../../formatters/jsonFormatter.js';
import { HtmlFormatter }     from '../../formatters/htmlFormatter.js';
import { TextFormatter }     from '../../formatters/textFormatter.js';
import { getFormatter, getAvailableFormats } from '../../formatters/index.js';

/** Minimal GroupedTabs fixture */
const makeGroupedTabs = (overrides = {}) => {
  const t1 = { id: 1, title: 'Example', url: 'https://example.com', favIconUrl: 'https://example.com/fav.ico', windowId: 1, groupId: 10, cookieStoreId: 'firefox-default', pinned: false, active: true, index: 0, discarded: false };
  const t2 = { id: 2, title: 'GitHub',  url: 'https://github.com',  favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-container-1', pinned: false, active: false, index: 1, discarded: false };
  const t3 = { id: 3, title: 'Bare',    url: 'https://bare.io',     favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: true, active: false, index: 2, discarded: false };

  return {
    all: [t1, t2, t3],
    groups: {
      '10': { meta: { id: '10', name: 'Work', color: 'blue', type: 'group' }, tabs: [t1] },
    },
    containers: {
      'firefox-container-1': { meta: { id: 'firefox-container-1', name: 'Personal', color: 'orange', type: 'container' }, tabs: [t2] },
    },
    ungrouped: [t3],
    ...overrides,
  };
};

/* ── Formatter Registry ── */
describe('formatter registry', () => {
  test('returns all 4 formatters', () => {
    expect(getAvailableFormats()).toEqual(expect.arrayContaining(['markdown', 'json', 'html', 'text']));
  });

  test('throws for unknown format', () => {
    expect(() => getFormatter('xml')).toThrow(/Unknown format/);
  });

  test('returns correct formatter instances', () => {
    expect(getFormatter('markdown')).toBeInstanceOf(MarkdownFormatter);
    expect(getFormatter('json')).toBeInstanceOf(JsonFormatter);
    expect(getFormatter('html')).toBeInstanceOf(HtmlFormatter);
    expect(getFormatter('text')).toBeInstanceOf(TextFormatter);
  });
});

/* ── Markdown ── */
describe('MarkdownFormatter', () => {
  const fmt = new MarkdownFormatter();
  const gt  = makeGroupedTabs();

  test('includes H1 heading', async () => {
    const out = await fmt.format(gt, { includeTitle: true });
    expect(out).toContain('# Exported Firefox Tabs');
  });

  test('includes tab URL as link when includeTitle=true', async () => {
    const out = await fmt.format(gt, { includeTitle: true });
    expect(out).toContain('[Example](https://example.com/)');
  });

  test('outputs raw URL when includeTitle=false', async () => {
    const out = await fmt.format(gt, { includeTitle: false });
    expect(out).toContain('<https://example.com/>');
    expect(out).not.toContain('[Example]');
  });

  test('escapes Markdown special chars in title', async () => {
    const gt2 = makeGroupedTabs({
      ungrouped: [{ id: 9, title: '[Click here](evil)', url: 'https://safe.com', favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const out = await fmt.format(gt2, { includeTitle: true });
    expect(out).toContain('\\[Click here\\]\\(evil\\)');
  });

  test('blocks javascript: URL in output', async () => {
    const gt2 = makeGroupedTabs({
      ungrouped: [{ id: 9, title: 'Bad', url: 'javascript:alert(1)', favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const out = await fmt.format(gt2, { includeTitle: true });
    expect(out).toContain('#blocked');
    expect(out).not.toContain('javascript:');
  });
});

/* ── JSON ── */
describe('JsonFormatter', () => {
  const fmt = new JsonFormatter();

  test('produces valid JSON', async () => {
    const out = await fmt.format(makeGroupedTabs(), { includeTitle: true });
    expect(() => JSON.parse(out)).not.toThrow();
  });

  test('includes meta block with exportedAt and browser', async () => {
    const parsed = JSON.parse(await fmt.format(makeGroupedTabs(), { includeTitle: true }));
    expect(parsed.meta.browser).toBe('Firefox');
    expect(parsed.meta.exportedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test('includes favIconUrl in tab records', async () => {
    const gt = makeGroupedTabs({
      ungrouped: [{ id: 9, title: 'Test', url: 'https://test.com', favIconUrl: 'https://test.com/fav.ico', windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const parsed = JSON.parse(await fmt.format(gt, { includeTitle: true }));
    expect(parsed.ungrouped[0].favIconUrl).toBe('https://test.com/fav.ico');
  });

  test('omits title when includeTitle=false', async () => {
    const gt = makeGroupedTabs({
      ungrouped: [{ id: 9, title: 'Secret', url: 'https://test.com', favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const parsed = JSON.parse(await fmt.format(gt, { includeTitle: false }));
    expect(parsed.ungrouped[0]).not.toHaveProperty('title');
  });
});

/* ── HTML ── */
describe('HtmlFormatter', () => {
  const fmt = new HtmlFormatter();

  test('produces valid HTML with doctype', async () => {
    const out = await fmt.format(makeGroupedTabs(), { includeTitle: true });
    expect(out).toContain('<!DOCTYPE html>');
    expect(out).toContain('<html lang="en">');
  });

  test('HTML-encodes titles to prevent XSS', async () => {
    const gt = makeGroupedTabs({
      ungrouped: [{ id: 9, title: '<script>alert(1)</script>', url: 'https://safe.com', favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const out = await fmt.format(gt, { includeTitle: true });
    expect(out).not.toContain('<script>alert(1)</script>');
    expect(out).toContain('&lt;script&gt;');
  });

  test('blocks javascript: URL in href', async () => {
    const gt = makeGroupedTabs({
      ungrouped: [{ id: 9, title: 'Bad', url: 'javascript:alert(1)', favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const out = await fmt.format(gt, { includeTitle: true });
    expect(out).not.toContain('href="javascript:');
  });
});

/* ── Plain Text ── */
describe('TextFormatter', () => {
  const fmt = new TextFormatter();

  test('contains EXPORTED FIREFOX TABS header', async () => {
    const out = await fmt.format(makeGroupedTabs(), { includeTitle: true });
    expect(out).toContain('EXPORTED FIREFOX TABS');
  });

  test('outputs title and URL on separate lines when includeTitle=true', async () => {
    const gt = makeGroupedTabs({
      ungrouped: [{ id: 9, title: 'My Page', url: 'https://my.page', favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const out = await fmt.format(gt, { includeTitle: true });
    expect(out).toContain('My Page');
    expect(out).toContain('https://my.page/');
  });

  test('outputs only URL when includeTitle=false', async () => {
    const gt = makeGroupedTabs({
      ungrouped: [{ id: 9, title: 'My Page', url: 'https://my.page', favIconUrl: null, windowId: 1, groupId: -1, cookieStoreId: 'firefox-default', pinned: false, active: false, index: 0, discarded: false }],
    });
    const out = await fmt.format(gt, { includeTitle: false });
    expect(out).toContain('https://my.page/');
    expect(out).not.toContain('My Page');
  });
});
