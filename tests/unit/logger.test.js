/* eslint-disable no-console */
import { jest } from '@jest/globals';
import { logger } from '../../utils/logger.js';

describe('utils/logger', () => {
  let originalDebug;
  let originalInfo;
  let originalWarn;
  let originalError;

  beforeEach(() => {
    originalDebug = console.debug;
    originalInfo = console.info;
    originalWarn = console.warn;
    originalError = console.error;

    console.debug = jest.fn();
    console.info = jest.fn();
    console.warn = jest.fn();
    console.error = jest.fn();
  });

  afterEach(() => {
    console.debug = originalDebug;
    console.info = originalInfo;
    console.warn = originalWarn;
    console.error = originalError;
    delete global.localStorage;
  });

  test('debug and info no-op when debug flag is unset or false', () => {
    global.localStorage = { getItem: jest.fn(() => null) };

    logger.debug('should not print');
    logger.info('should not print');

    expect(console.debug).not.toHaveBeenCalled();
    expect(console.info).not.toHaveBeenCalled();
  });

  test('debug and info log when TAB_EXPORTER_DEBUG is 1', () => {
    global.localStorage = { getItem: jest.fn((k) => (k === 'TAB_EXPORTER_DEBUG' ? '1' : null)) };

    logger.debug('debug message');
    logger.info('info message');

    expect(console.debug).toHaveBeenCalledWith('[TabExporter]', 'debug message');
    expect(console.info).toHaveBeenCalledWith('[TabExporter]', 'info message');
  });

  test('warn and error always log regardless of debug flag', () => {
    global.localStorage = { getItem: jest.fn(() => null) };

    logger.warn('warning message');
    logger.error('error message');

    expect(console.warn).toHaveBeenCalledWith('[TabExporter]', 'warning message');
    expect(console.error).toHaveBeenCalledWith('[TabExporter]', 'error message');
  });
});
