/**
 * @module core/downloader
 * Handles file download via browser.downloads API and clipboard copy.
 * Responsibility: Output delivery only.
 */

import { logger } from '../utils/logger.js';

/**
 * Triggers a browser file download using the Blob + object URL pattern.
 * The object URL is revoked after a safe delay to free memory.
 *
 * @param {string}  content   - Text content to download
 * @param {string}  filename  - Suggested filename
 * @param {string}  mimeType  - MIME type (e.g. 'text/markdown')
 * @returns {Promise<void>}
 */
export async function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
  const url  = URL.createObjectURL(blob);
  logger.debug(`downloadFile: initiating download for "${filename}" (${blob.size} bytes)`);

  try {
    await browser.downloads.download({
      url,
      filename,
      saveAs:         false,
      conflictAction: 'uniquify',
    });
  } finally {
    // Revoke after delay to ensure the download manager has read the blob
    setTimeout(() => {
      URL.revokeObjectURL(url);
      logger.debug('downloadFile: blob URL revoked');
    }, 15_000);
  }
}

/**
 * Copies text content to the system clipboard.
 *
 * @param {string} content
 * @returns {Promise<void>}
 */
export async function copyToClipboard(content) {
  await navigator.clipboard.writeText(content);
  logger.debug(`copyToClipboard: copied ${content.length} characters`);
}
