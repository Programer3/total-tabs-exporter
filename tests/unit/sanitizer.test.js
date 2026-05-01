import { escapeMarkdown, escapeHtml, sanitizeUrl, truncate } from '../../utils/sanitizer.js';

describe('sanitizer', () => {
  describe('escapeMarkdown', () => {
    test('escapes special markdown characters', () => {
      expect(escapeMarkdown('Hello [world](link)')).toBe('Hello \\[world\\]\\(link\\)');
      expect(escapeMarkdown('## Heading')).toBe('\\#\\# Heading');
      expect(escapeMarkdown('**bold**')).toBe('\\*\\*bold\\*\\*');
    });

    test('returns empty string for falsy input', () => {
      expect(escapeMarkdown('')).toBe('');
      expect(escapeMarkdown(null)).toBe('');
      expect(escapeMarkdown(undefined)).toBe('');
    });

    test('handles plain text without modification', () => {
      expect(escapeMarkdown('Hello World')).toBe('Hello World');
    });
  });

  describe('escapeHtml', () => {
    test('escapes HTML entities', () => {
      expect(escapeHtml('<script>alert("xss")</script>')).toBe(
        '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
      );
      expect(escapeHtml("it's & \"things\"")).toBe("it&#39;s &amp; &quot;things&quot;");
    });

    test('returns empty string for falsy input', () => {
      expect(escapeHtml('')).toBe('');
      expect(escapeHtml(null)).toBe('');
    });
  });

  describe('sanitizeUrl', () => {
    test('passes through valid http/https URLs', () => {
      expect(sanitizeUrl('https://example.com/path?q=1')).toBe('https://example.com/path?q=1');
      expect(sanitizeUrl('http://localhost:3000')).toBe('http://localhost:3000/');
    });

    test('blocks javascript: URIs', () => {
      expect(sanitizeUrl('javascript:alert(1)')).toBe('#blocked');
    });

    test('blocks data: URIs', () => {
      expect(sanitizeUrl('data:text/html,<h1>hi</h1>')).toBe('#blocked');
    });

    test('handles empty/null input', () => {
      expect(sanitizeUrl('')).toBe('#empty');
      expect(sanitizeUrl(null)).toBe('#empty');
    });

    test('handles malformed URLs', () => {
      expect(sanitizeUrl('not a url at all')).toBe('#invalid');
    });
  });

  describe('truncate', () => {
    test('does not truncate short strings', () => {
      expect(truncate('short', 200)).toBe('short');
    });

    test('truncates long strings with ellipsis', () => {
      const long = 'a'.repeat(250);
      const result = truncate(long, 200);
      expect(result.length).toBe(200);
      expect(result.endsWith('…')).toBe(true);
    });

    test('uses default max length of 200', () => {
      const long = 'a'.repeat(250);
      expect(truncate(long).length).toBe(200);
    });
  });
});
