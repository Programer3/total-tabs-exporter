/**
 * @module utils/sanitizer
 * Sanitizes URLs and titles for safe inclusion in output formats.
 * Responsibility: Security-critical text escaping only.
 */

/** Characters that have special meaning in Markdown */
const MD_ESCAPE_RE = /([\\`*_{}[\]()#+\-.!|])/g;

/** HTML entities map */
const HTML_ENTITIES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/**
 * Escapes special Markdown characters in a string.
 * @param {string} text
 * @returns {string}
 */
export function escapeMarkdown(text) {
  if (!text) { return ''; }
  return String(text).replace(MD_ESCAPE_RE, '\\$1');
}

/**
 * Escapes HTML special characters to prevent injection in HTML output.
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
  if (!text) { return ''; }
  return String(text).replace(/[&<>"']/g, (ch) => HTML_ENTITIES[ch]);
}

/**
 * Validates and returns a safe URL string.
 * Rejects javascript: and data: URIs to prevent XSS.
 * @param {string} url
 * @returns {string} The sanitized URL, or '#invalid' if unsafe.
 */
export function sanitizeUrl(url) {
  if (!url) { return '#empty'; }
  try {
    const parsed = new URL(url);
    const ALLOWED_PROTOCOLS = new Set([
      'http:', 'https:', 'ftp:', 'file:', 'moz-extension:', 'about:',
    ]);
    if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return '#blocked';
    }
    return parsed.href;
  } catch {
    return '#invalid';
  }
}

/**
 * Truncates a string to maxLength, appending ellipsis if needed.
 * @param {string} text
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(text, maxLength = 200) {
  if (!text || text.length <= maxLength) { return text || ''; }
  return text.slice(0, maxLength - 1) + '…';
}
