/**
 * @module background/service-worker
 * Lightweight background service worker.
 * Handles context menus and keyboard command dispatch.
 * Heavy lifting (tab collection, formatting) is done in the popup.
 *
 * NOTE: This is a non-module script (Firefox MV3 background scripts).
 * Uses browser.* APIs which are globally available in the service worker.
 */

/* ── Context Menus ── */
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus?.create({
    id:       'open-tab-exporter',
    title:    'Export Tabs…',
    contexts: ['all'],
  });
});

browser.contextMenus?.onClicked.addListener((info) => {
  if (info.menuItemId === 'open-tab-exporter') {
    browser.action.openPopup();
  }
});

/* ── Message Bridge ──
 * The popup may request a download via the background when
 * browser.downloads is unavailable directly from the popup context.
 * This acts as a safe fallback relay.
 */
browser.runtime.onMessage.addListener((message, _sender) => {
  if (message?.type === 'PING') {
    return Promise.resolve({ type: 'PONG', version: browser.runtime.getManifest().version });
  }
  // Additional message types can be handled here as the extension grows.
  return false; // Let other listeners handle
});
