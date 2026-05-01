/**
 * @module formatters/index
 * Formatter registry. Maps format keys to formatter instances.
 * Open for extension: add a new formatter without touching existing code.
 */

import { MarkdownFormatter } from './markdownFormatter.js';
import { JsonFormatter }     from './jsonFormatter.js';
import { HtmlFormatter }     from './htmlFormatter.js';
import { TextFormatter }     from './textFormatter.js';

/** @type {Map<string, { format: Function }>} */
const REGISTRY = new Map([
  ['markdown', new MarkdownFormatter()],
  ['json',     new JsonFormatter()],
  ['html',     new HtmlFormatter()],
  ['text',     new TextFormatter()],
]);

/**
 * Returns the formatter for the given format key.
 * @param {string} format
 * @returns {{ format: Function }}
 * @throws {Error} if the format is not registered
 */
export function getFormatter(format) {
  const formatter = REGISTRY.get(format);
  if (!formatter) {
    const valid = [...REGISTRY.keys()].join(', ');
    throw new Error(`Unknown format: "${format}". Valid options: ${valid}`);
  }
  return formatter;
}

/**
 * Returns all registered format keys.
 * @returns {string[]}
 */
export function getAvailableFormats() {
  return [...REGISTRY.keys()];
}
