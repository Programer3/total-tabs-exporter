/**
 * @module utils/logger
 * Lightweight conditional logger. No-ops in production builds.
 * Set localStorage.setItem('TAB_EXPORTER_DEBUG', '1') to enable.
 */

const PREFIX = '[TabExporter]';
const isDebug = () =>
  typeof localStorage !== 'undefined' &&
  typeof localStorage.getItem === 'function' &&
  localStorage.getItem('TAB_EXPORTER_DEBUG') === '1';


export const logger = {
  debug: (...args) => { if (isDebug()) { console.debug(PREFIX, ...args); } },
  info:  (...args) => { if (isDebug()) { console.info(PREFIX, ...args); } },
  warn:  (...args) => console.warn(PREFIX, ...args),
  error: (...args) => console.error(PREFIX, ...args),
};
