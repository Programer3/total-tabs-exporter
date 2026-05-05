/**
 * @module options/options.js
 * Options page controller.
 * Persists settings to browser.storage.local (survives sessions, resets only on reinstall).
 */

/** @typedef {Object} AppSettings
 * @property {string}  defaultFormat      - 'markdown'|'json'|'html'|'text'
 * @property {boolean} includeTitle       - Include tab titles by default
 * @property {boolean} filterInternal     - Filter about: pages by default
 * @property {'download'|'clipboard'} defaultOutput - Default output method
 */

/** @type {AppSettings} */
const DEFAULTS = {
  defaultFormat:  'markdown',
  includeTitle:   true,
  filterInternal: true,
  defaultOutput:  'download',
};

const STORAGE_KEY = 'tabExporterSettings';

function localizeUI() {
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    const key = el.getAttribute('data-i18n');
    const msg = browser.i18n.getMessage(key);
    if (msg) { el.textContent = msg; }
  });
}

/**
 * Loads settings from storage, merging with defaults for any missing keys.
 * @returns {Promise<AppSettings>}
 */
async function loadSettings() {
  const result = await browser.storage.local.get(STORAGE_KEY);
  return { ...DEFAULTS, ...(result[STORAGE_KEY] ?? {}) };
}

/**
 * Persists settings to storage.
 * @param {AppSettings} settings
 */
async function saveSettings(settings) {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

/* ── DOM references ── */
const $ = (id) => document.getElementById(id);

const elFormat        = $('default-format');
const elIncludeTitle  = $('include-title');
const elFilterInt     = $('filter-internal');
const elDefaultOutput = $('default-output');
const elSaveBtn       = $('save-btn');
const elResetBtn      = $('reset-btn');
const elStatus        = $('status-msg');

/** Populates the form from a settings object */
function applyToForm(settings) {
  elFormat.value              = settings.defaultFormat;
  elIncludeTitle.checked      = settings.includeTitle;
  elFilterInt.checked         = settings.filterInternal;
  elDefaultOutput.value       = settings.defaultOutput;
}

/** Reads current form values into a settings object */
function readFromForm() {
  return {
    defaultFormat:  elFormat.value,
    includeTitle:   elIncludeTitle.checked,
    filterInternal: elFilterInt.checked,
    defaultOutput:  elDefaultOutput.value,
  };
}

function showStatus(msg, isError = false) {
  elStatus.textContent = msg;
  elStatus.className   = `status-msg ${isError ? 'error' : 'success'}`;
  elStatus.hidden      = false;
  setTimeout(() => { elStatus.hidden = true; }, 2500);
}

/* ── Init ── */
async function init() {
  localizeUI();
  const settings = await loadSettings();
  applyToForm(settings);

  elSaveBtn.addEventListener('click', async () => {
    try {
      await saveSettings(readFromForm());
      showStatus(browser.i18n.getMessage('statusSaved') || '✓ Settings saved');
    } catch (err) {
      showStatus(`Error: ${err.message}`, true);
    }
  });

  elResetBtn.addEventListener('click', async () => {
    try {
      await saveSettings(DEFAULTS);
      applyToForm(DEFAULTS);
      showStatus(browser.i18n.getMessage('statusReset') || '✓ Settings reset to defaults');
    } catch (err) {
      showStatus(`Error: ${err.message}`, true);
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
