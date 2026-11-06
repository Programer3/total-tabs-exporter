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
const elTabCount         = $('tab-count');
const elSummaryLabel     = $('summary-label');
const elWindowSection    = $('window-section');
const elWindowSelect     = $('window-select');
const elScopeSelect      = $('scope-select');
const elContextContainer = $('context-selector-container');
const elContextSelect    = $('context-select');
const elRefreshBtn       = $('refresh-scope');
const elSettingsBtn      = $('settings-btn');
const elOptTitle         = $('opt-title');
const elOptFilter        = $('opt-filter');
const elBtnDownload      = $('btn-download');
const elBtnCopy          = $('btn-copy');
const elStatusBar        = $('status-bar');
const elStatusText       = $('status-text');
const elToast            = $('toast');

let toastTimer = null;
let cachedGroupedTabs = null;
let savedDefaultWindow = 'current';
let activeCategory = 'all';

/* ── Localization ── */
function localizeUI() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const msg = browser.i18n.getMessage(key);
    if (msg) {
      el.textContent = msg;
    }
  });

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
    if (s.defaultWindow) {
      savedDefaultWindow = s.defaultWindow;
      if (elWindowSelect) { elWindowSelect.value = s.defaultWindow; }
    }
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
  } else if (scope.startsWith('domain:')) {
    const target = scope.slice(7).toLowerCase();
    if (target === 'current') {
      const dom = cachedGroupedTabs.currentDomain;
      count = dom && cachedGroupedTabs.domains ? (cachedGroupedTabs.domains[dom]?.count ?? 0) : 0;
    } else {
      count = cachedGroupedTabs.domains?.[target]?.count ?? 0;
    }
  }

  elTabCount.textContent = count;

  // Update summary label to reflect window context
  if (elSummaryLabel) {
    if (cachedGroupedTabs.totalWindows > 1 && !elWindowSection.hidden) {
      if (elWindowSelect.value === 'all') {
        elSummaryLabel.textContent = browser.i18n.getMessage('labelTabsReadyAll') || 'tabs ready to export (all windows)';
      } else if (elWindowSelect.value === 'current') {
        elSummaryLabel.textContent = browser.i18n.getMessage('labelTabsReadyCurrent') || 'tabs ready to export (this window)';
      } else {
        elSummaryLabel.textContent = browser.i18n.getMessage('labelTabsReady') || 'tabs ready to export';
      }
    } else {
      elSummaryLabel.textContent = browser.i18n.getMessage('labelTabsReady') || 'tabs ready to export';
    }
  }
}

/* ── Contextual Selector Renderer ── */
function renderContextSelector() {
  if (!cachedGroupedTabs) { return; }

  if (activeCategory === 'all') {
    elContextContainer.hidden = true;
    elScopeSelect.value = 'all';
    return;
  }

  if (activeCategory === 'current') {
    elContextContainer.hidden = true;
    elScopeSelect.value = 'current';
    return;
  }

  elContextContainer.hidden = false;
  elContextSelect.innerHTML = '';

  if (activeCategory === 'domain') {
    const domains = Object.values(cachedGroupedTabs.domains || {})
      .sort((a, b) => b.count - a.count);

    if (domains.length === 0) {
      const opt = document.createElement('option');
      opt.value = 'all';
      opt.disabled = true;
      opt.textContent = browser.i18n.getMessage('labelNoDomains') || 'No web domains found';
      elContextSelect.appendChild(opt);
      elScopeSelect.value = 'all';
      return;
    }

    const currentDom = cachedGroupedTabs.currentDomain;
    if (currentDom && cachedGroupedTabs.domains?.[currentDom]) {
      const optCurrent = document.createElement('option');
      optCurrent.value = `domain:${currentDom}`;
      const count = cachedGroupedTabs.domains[currentDom].count;
      optCurrent.textContent = `${browser.i18n.getMessage('labelCurrentDomain') || 'Current Domain'}: ${currentDom} (${count})`;
      elContextSelect.appendChild(optCurrent);
    }

    for (const d of domains) {
      if (d.domain === currentDom) { continue; }
      const opt = document.createElement('option');
      opt.value = `domain:${d.domain}`;
      opt.textContent = `${d.domain} (${d.count})`;
      elContextSelect.appendChild(opt);
    }

    elScopeSelect.value = elContextSelect.value;
    return;
  }

  if (activeCategory === 'group') {
    const groups = Object.entries(cachedGroupedTabs.groups || {});
    if (groups.length === 0) {
      const opt = document.createElement('option');
      opt.value = 'all';
      opt.disabled = true;
      opt.textContent = browser.i18n.getMessage('labelNoGroups') || 'No tab groups in this window';
      elContextSelect.appendChild(opt);
      elScopeSelect.value = 'all';
      return;
    }

    for (const [id, { meta, tabs }] of groups) {
      const opt = document.createElement('option');
      opt.value = `group:${id}`;
      opt.textContent = `${meta.name} (${tabs.length})`;
      elContextSelect.appendChild(opt);
    }

    elScopeSelect.value = elContextSelect.value;
    return;
  }

  if (activeCategory === 'container') {
    const containers = Object.entries(cachedGroupedTabs.containers || {});
    for (const [id, { meta, tabs }] of containers) {
      const opt = document.createElement('option');
      opt.value = `container:${id}`;
      opt.textContent = `${meta.name} (${tabs.length})`;
      elContextSelect.appendChild(opt);
    }

    if (cachedGroupedTabs.ungrouped?.length > 0) {
      const opt = document.createElement('option');
      opt.value = 'ungrouped';
      opt.textContent = `${browser.i18n.getMessage('scopeUngrouped') || 'Default / Ungrouped'} (${cachedGroupedTabs.ungrouped.length})`;
      elContextSelect.appendChild(opt);
    }

    elScopeSelect.value = elContextSelect.value;
  }
}

/* ── Switch Scope Category ── */
function setScopeCategory(category) {
  activeCategory = category;
  document.querySelectorAll('.scope-pill').forEach((p) => {
    if (p.dataset.category === category) {
      p.classList.add('active');
    } else {
      p.classList.remove('active');
    }
  });

  renderContextSelector();
  updateTabCount();
}

/* ── Scope population ── */
async function populateScope() {
  elRefreshBtn.disabled = true;
  try {
    const filterInternal = elOptFilter.checked;
    const selectedWindowScope = elWindowSelect && !elWindowSection.hidden
      ? elWindowSelect.value
      : (savedDefaultWindow || 'current');

    const grouped = await fetchScopeOptions({ filterInternal, windowScope: selectedWindowScope });
    cachedGroupedTabs = grouped;

    // Handle Window Section visibility & options
    if (grouped.totalWindows > 1) {
      elWindowSection.hidden = false;
      const prevWinVal = elWindowSelect.value;
      elWindowSelect.innerHTML = '';

      const currentWin = grouped.windows.find((w) => w.isCurrent);
      const optCurrentWin = document.createElement('option');
      optCurrentWin.value = 'current';
      const currentCount = currentWin?.tabCount ?? 0;
      const currentTabWord = currentCount === 1 ? 'tab' : 'tabs';
      optCurrentWin.textContent = `${browser.i18n.getMessage('windowCurrent') || 'This Window'} (${currentCount} ${currentTabWord})`;
      elWindowSelect.appendChild(optCurrentWin);

      const optAllWin = document.createElement('option');
      optAllWin.value = 'all';
      const allCount = grouped.allTabsCount ?? 0;
      const allTabWord = allCount === 1 ? 'tab' : 'tabs';
      optAllWin.textContent = `${browser.i18n.getMessage('windowAll') || 'All Windows'} (${allCount} ${allTabWord})`;
      elWindowSelect.appendChild(optAllWin);

      grouped.windows.filter((w) => !w.isCurrent).forEach((w) => {
        const optOtherWin = document.createElement('option');
        optOtherWin.value = `window:${w.id}`;
        const tabWord = w.tabCount === 1 ? 'tab' : 'tabs';
        optOtherWin.textContent = `Window ${w.index} (${w.tabCount} ${tabWord})`;
        elWindowSelect.appendChild(optOtherWin);
      });

      const validWinVals = [...elWindowSelect.options].map((o) => o.value);
      elWindowSelect.value = validWinVals.includes(prevWinVal)
        ? prevWinVal
        : (validWinVals.includes(savedDefaultWindow) ? savedDefaultWindow : 'current');
    } else {
      elWindowSection.hidden = true;
    }

    renderContextSelector();
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
  const windowScope = elWindowSelect && !elWindowSection.hidden
    ? elWindowSelect.value
    : 'all';

  const options = {
    format:         formatRadio?.value ?? 'markdown',
    scope:          elScopeSelect.value,
    windowScope,
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

  document.querySelectorAll('.scope-pill').forEach((pill) => {
    pill.addEventListener('click', () => {
      setScopeCategory(pill.dataset.category);
    });
  });

  if (elContextSelect) {
    elContextSelect.addEventListener('change', () => {
      elScopeSelect.value = elContextSelect.value;
      updateTabCount();
    });
  }

  if (elWindowSelect) {
    elWindowSelect.addEventListener('change', populateScope);
  }
  elOptFilter.addEventListener('change', populateScope);
}

document.addEventListener('DOMContentLoaded', init);
