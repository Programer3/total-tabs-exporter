/**
 * @module popup/popup.js
 * Popup controller — thin orchestration layer between the UI and core modules.
 * Responsibility: UI events, state display, delegating work to core.
 */

import { runExport, fetchScopeOptions } from '../core/exportCoordinator.js';

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
  collecting: 'Collecting tabs…',
  resolving:  'Resolving groups & containers…',
  scoping:    'Applying scope…',
  formatting: 'Formatting…',
  delivering: 'Saving file…',
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

/* ── Scope population ──
 * Always pass the current filterInternal toggle value so the tab count
 * shown in the UI matches exactly what will be exported.
 * Also called automatically when the filter toggle changes.
 */
async function populateScope() {
  elRefreshBtn.disabled = true;
  try {
    // Use same filter as export so count is consistent
    const filterInternal = elOptFilter.checked;
    const grouped = await fetchScopeOptions({ filterInternal });
    elTabCount.textContent = grouped.all.length;

    // Remember currently selected scope so we can restore it after rebuild
    const previousScope = elScopeSelect.value;

    // Remove dynamic options, keep static ones
    const staticValues = new Set(['all', 'ungrouped']);
    [...elScopeSelect.options].forEach((opt) => {
      if (!staticValues.has(opt.value)) { opt.remove(); }
    });

    // Native groups
    for (const [id, { meta, tabs }] of Object.entries(grouped.groups)) {
      const opt       = document.createElement('option');
      opt.value       = `group:${id}`;
      opt.textContent = `📁 Group: ${meta.name} (${tabs.length})`;
      elScopeSelect.appendChild(opt);
    }

    // Containers
    for (const [id, { meta, tabs }] of Object.entries(grouped.containers)) {
      const opt       = document.createElement('option');
      opt.value       = `container:${id}`;
      opt.textContent = `🔷 Container: ${meta.name} (${tabs.length})`;
      elScopeSelect.appendChild(opt);
    }

    // Restore previous selection if it still exists, otherwise fall back to 'all'
    const optionValues = [...elScopeSelect.options].map((o) => o.value);
    elScopeSelect.value = optionValues.includes(previousScope) ? previousScope : 'all';

  } catch (err) {
    showToast(`⚠ Could not load scope: ${err.message}`, 'error');
  } finally {
    elRefreshBtn.disabled = false;
  }
}

/* ── Read current UI state ── */
function getExportOptions(output) {
  const formatRadio = document.querySelector('input[name="format"]:checked');
  return {
    format:         formatRadio?.value ?? 'markdown',
    scope:          elScopeSelect.value,
    includeTitle:   elOptTitle.checked,
    filterInternal: elOptFilter.checked,
    output,
    onProgress:     (p) => setProgress(p.step, p.count),
  };
}

/* ── Export handler ── */
async function handleExport(output) {
  setBusy(true);
  clearProgress();
  try {
    const result = await runExport(getExportOptions(output));
    clearProgress();

    if (output === 'clipboard') {
      showToast(`✓ ${result.count} tabs copied to clipboard`, 'success');
    } else {
      showToast(`✓ ${result.count} tabs saved as ${result.filename}`, 'success');
    }
  } catch (err) {
    clearProgress();
    showToast(`✗ Export failed: ${err.message}`, 'error', 4000);
    console.error('[TabExporter] export error:', err);
  } finally {
    setBusy(false);
  }
}

/* ── Init ── */
async function init() {
  await loadSettings();
  await populateScope();

  elBtnDownload.addEventListener('click', () => handleExport('download'));
  elBtnCopy.addEventListener('click',     () => handleExport('clipboard'));
  elRefreshBtn.addEventListener('click',  populateScope);
  elSettingsBtn.addEventListener('click', () => browser.runtime.openOptionsPage());

  // Re-populate scope + refresh count whenever filter toggle changes
  // so the displayed number always equals what will actually be exported
  elOptFilter.addEventListener('change', populateScope);
}

document.addEventListener('DOMContentLoaded', init);
