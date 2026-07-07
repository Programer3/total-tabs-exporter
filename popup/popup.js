/**
 * @module popup/popup.js
 * Popup controller — thin orchestration layer between the UI and core modules.
 * Responsibility: UI events, state display, delegating work to core.
 */

import { runExport, fetchScopeOptions } from '../core/exportCoordinator.js';
import { TooltipManager } from '../utils/tooltipManager.js';

const STORAGE_KEY = 'tabExporterSettings';

/* ── DOM refs ── */
const $ = (id) => document.getElementById(id);
const elTabCount    = $('tab-count');
const elScopeSelect = $('scope-select');
const elRefreshBtn  = $('refresh-scope');
const elSettingsBtn = $('settings-btn');
const elOptTitle    = $('opt-title');
const elOptFilter   = $('opt-filter');
const elBtnDownload = $('btn-download');
const elBtnCopy     = $('btn-copy');
const elStatusBar   = $('status-bar');
const elStatusText  = $('status-text');
const elToast       = $('toast');

let toastTimer = null;
let cachedGroupedTabs = null;

/* ── Localization ── */
function localizeUI() {
  // Text content
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const msg = browser.i18n.getMessage(key);
    if (msg) {
      el.textContent = msg;
    }
  });

  // Aria labels
  document.querySelectorAll('[data-i18n-aria]').forEach((el) => {
    const key = el.getAttribute('data-i18n-aria');
    const msg = browser.i18n.getMessage(key);
    if (msg) { el.setAttribute('aria-label', msg); }
  });
}

/* ── Toast ── */
function showToast(msg, type = 'success', duration = 2800) {
  clearTimeout(toastTimer);
  elToast.textContent = msg;
  elToast.className   = `toast ${type}`;
  elToast.hidden      = false;
  toastTimer = setTimeout(() => { elToast.hidden = true; }, duration);
}

/* ── Progress ── */
const STEP_LABELS = {
  collecting: browser.i18n.getMessage('statusCollecting') || 'Collecting tabs…',
  resolving:  browser.i18n.getMessage('statusResolving')  || 'Resolving groups & containers…',
  scoping:    browser.i18n.getMessage('statusScoping')    || 'Applying scope…',
  formatting: browser.i18n.getMessage('statusFormatting') || 'Formatting…',
  delivering: browser.i18n.getMessage('statusDelivering') || 'Saving file…',
};

function setProgress(step, count) {
  elStatusBar.hidden = false;
  elStatusText.textContent = `${STEP_LABELS[step] ?? step}${count ? ` (${count} tabs)` : ''}`;
}

function clearProgress() {
  elStatusBar.hidden = true;
}

/* ── Busy state ── */
function setBusy(busy) {
  elBtnDownload.disabled = busy;
  elBtnCopy.disabled     = busy;
  elRefreshBtn.disabled  = busy;
}

/* ── Load saved settings ── */
async function loadSettings() {
  try {
    const result = await browser.storage.local.get(STORAGE_KEY);
    const s = result[STORAGE_KEY];
    if (!s) { return; }
    if (s.includeTitle   !== undefined) { elOptTitle.checked  = s.includeTitle; }
    if (s.filterInternal !== undefined) { elOptFilter.checked = s.filterInternal; }
    if (s.defaultFormat) {
      const radio = document.querySelector(`input[name="format"][value="${s.defaultFormat}"]`);
      if (radio) { radio.checked = true; }
    }
  } catch { /* storage unavailable in tests — ignore */ }
}

/* ── Update active count ── */
async function updateTabCount() {
  if (!cachedGroupedTabs) { return; }
  const scope = elScopeSelect.value;
  let count = 0;

  if (scope === 'all') {
    count = cachedGroupedTabs.all.length;
  } else if (scope === 'current') {
    const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
    let isCurrentIncluded = true;
    if (elOptFilter.checked && currentTab) {
      const url = currentTab.url.toLowerCase();
      if (url.startsWith('about:') ||
          url.startsWith('moz-extension:') ||
          url.startsWith('chrome-extension:') ||
          url.startsWith('chrome:')) {
        isCurrentIncluded = false;
      }
    }
    count = isCurrentIncluded && currentTab ? 1 : 0;
  } else if (scope === 'ungrouped') {
    count = cachedGroupedTabs.ungrouped.length;
  } else if (scope.startsWith('group:')) {
    const id = scope.slice(6);
    count = cachedGroupedTabs.groups[id]?.tabs.length ?? 0;
  } else if (scope.startsWith('container:')) {
    const id = scope.slice(10);
    count = cachedGroupedTabs.containers[id]?.tabs.length ?? 0;
  }

  elTabCount.textContent = count;
}

/* ── Scope population ── */
async function populateScope() {
  elRefreshBtn.disabled = true;
  try {
    const filterInternal = elOptFilter.checked;
    const grouped = await fetchScopeOptions({ filterInternal });
    cachedGroupedTabs = grouped;

    // Remember currently selected scope so we can restore it after rebuild
    const previousScope = elScopeSelect.value;

    // Remove dynamic options, keep static ones
    const staticValues = new Set(['all', 'current', 'ungrouped']);
    [...elScopeSelect.options].forEach((opt) => {
      if (!staticValues.has(opt.value)) { opt.remove(); }
    });

    // Calculate current tab availability
    const [currentTab] = await browser.tabs.query({ active: true, currentWindow: true });
    let isCurrentIncluded = true;
    if (filterInternal && currentTab) {
      const url = currentTab.url.toLowerCase();
      if (url.startsWith('about:') ||
          url.startsWith('moz-extension:') ||
          url.startsWith('chrome-extension:') ||
          url.startsWith('chrome:')) {
        isCurrentIncluded = false;
      }
    }
    const currentCount = isCurrentIncluded && currentTab ? 1 : 0;

    // Update This Page option text with count
    const optCurrent = elScopeSelect.querySelector('option[value="current"]');
    if (optCurrent) {
      const baseText = browser.i18n.getMessage('scopeCurrent') || 'This Page';
      optCurrent.textContent = `${baseText} (${currentCount})`;
    }

    // Native groups
    for (const [id, { meta, tabs }] of Object.entries(grouped.groups)) {
      const opt       = document.createElement('option');
      opt.value       = `group:${id}`;
      opt.textContent = `Group: ${meta.name} (${tabs.length})`;
      elScopeSelect.appendChild(opt);
    }

    // Containers
    for (const [id, { meta, tabs }] of Object.entries(grouped.containers)) {
      const opt       = document.createElement('option');
      opt.value       = `container:${id}`;
      opt.textContent = `Container: ${meta.name} (${tabs.length})`;
      elScopeSelect.appendChild(opt);
    }

    // Restore previous selection if it still exists, otherwise fall back to 'all'
    const optionValues = [...elScopeSelect.options].map((o) => o.value);
    elScopeSelect.value = optionValues.includes(previousScope) ? previousScope : 'all';

    await updateTabCount();

  } catch (err) {
    showToast(browser.i18n.getMessage('toastScopeError', [err.message]), 'error');
  } finally {
    elRefreshBtn.disabled = false;
  }
}

/* ── Read current UI state ── */
function getExportOptions(output) {
  const formatRadio = document.querySelector('input[name="format"]:checked');
  const options = {
    format:         formatRadio?.value ?? 'markdown',
    scope:          elScopeSelect.value,
    includeTitle:   elOptTitle.checked,
    filterInternal: elOptFilter.checked,
    output,
    onProgress:     (p) => setProgress(p.step, p.count),
  };
  console.debug('[TabExporter] Export options:', { ...options, onProgress: 'fn' });
  return options;
}

/* ── Export handler ── */
async function handleExport(output) {
  setBusy(true);
  clearProgress();
  try {
    const result = await runExport(getExportOptions(output));
    clearProgress();

    if (output === 'clipboard') {
      showToast(browser.i18n.getMessage('toastCopySuccess', [result.count.toString()]), 'success');
    } else {
      showToast(browser.i18n.getMessage('toastDownloadSuccess', [result.count.toString(), result.filename]), 'success');
    }
  } catch (err) {
    clearProgress();
    showToast(browser.i18n.getMessage('toastExportError', [err.message]), 'error', 4000);
    console.error('[TabExporter] export error:', err);
  } finally {
    setBusy(false);
  }
}

/* ── Init ── */
async function init() {
  localizeUI();
  new TooltipManager();

  await loadSettings();
  await populateScope();

  elBtnDownload.addEventListener('click', () => handleExport('download'));
  elBtnCopy.addEventListener('click',     () => handleExport('clipboard'));
  elRefreshBtn.addEventListener('click',  populateScope);
  elSettingsBtn.addEventListener('click', () => browser.runtime.openOptionsPage());

  elScopeSelect.addEventListener('change', updateTabCount);
  elOptFilter.addEventListener('change', populateScope);
}

document.addEventListener('DOMContentLoaded', init);
