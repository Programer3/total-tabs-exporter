import { jest } from '@jest/globals';
import { TooltipManager } from '../../utils/tooltipManager.js';

describe('utils/tooltipManager', () => {
  let listeners;
  let createdElements;
  let manager;

  beforeEach(() => {
    listeners = new Map();
    createdElements = [];

    global.document = {
      body: {
        appendChild: jest.fn((el) => {
          createdElements.push(el);
          return el;
        }),
      },
      createElement: jest.fn((tag) => {
        const classList = new Set();
        return {
          tagName: tag.toUpperCase(),
          className: '',
          classList: {
            add: jest.fn((c) => classList.add(c)),
            remove: jest.fn((c) => classList.delete(c)),
            contains: jest.fn((c) => classList.has(c)),
          },
          style: {},
          hidden: false,
          textContent: '',
          getBoundingClientRect: jest.fn(() => ({
            top: 20,
            left: 20,
            width: 100,
            height: 30,
            bottom: 50,
            right: 120,
          })),
        };
      }),
      addEventListener: jest.fn((type, handler) => {
        if (!listeners.has(type)) {
          listeners.set(type, []);
        }
        listeners.get(type).push(handler);
      }),
    };

    global.requestAnimationFrame = jest.fn((cb) => {
      cb();
      return 1;
    });

    manager = new TooltipManager();
  });

  afterEach(() => {
    delete global.document;
    delete global.requestAnimationFrame;
  });

  function fireEvent(type, target) {
    const handlers = listeners.get(type) || [];
    for (const h of handlers) {
      h({
        target,
      });
    }
  }

  test('creates and appends dynamic tooltip element on init', () => {
    expect(document.createElement).toHaveBeenCalledWith('div');
    expect(document.body.appendChild).toHaveBeenCalledTimes(1);
    expect(manager.tooltipEl.className).toBe('dynamic-tooltip');
    expect(manager.tooltipEl.hidden).toBe(true);
  });

  test('shows tooltip on mouseenter of trigger element', () => {
    const trigger = {
      getAttribute: jest.fn((attr) => (attr === 'data-i18n-tip' ? 'tipWindow' : null)),
      closest: jest.fn(function () { return this; }),
      getBoundingClientRect: () => ({
        top: 50,
        left: 50,
        width: 100,
        height: 20,
        bottom: 70,
        right: 150,
      }),
    };

    fireEvent('mouseenter', trigger);

    expect(manager.tooltipEl.hidden).toBe(false);
    expect(manager.activeTrigger).toBe(trigger);
    expect(manager.tooltipEl.textContent).toBe('tipWindow');
  });

  test('hides tooltip on mouseleave of active trigger', () => {
    const trigger = {
      getAttribute: jest.fn((attr) => (attr === 'data-i18n-tip' ? 'tipFormat' : null)),
      closest: jest.fn(function () { return this; }),
      getBoundingClientRect: () => ({
        top: 50,
        left: 50,
        width: 100,
        height: 20,
        bottom: 70,
        right: 150,
      }),
    };

    fireEvent('mouseenter', trigger);
    expect(manager.tooltipEl.hidden).toBe(false);

    fireEvent('mouseleave', trigger);
    expect(manager.tooltipEl.hidden).toBe(true);
    expect(manager.activeTrigger).toBeNull();
  });

  test('hides tooltip on mousedown anywhere', () => {
    manager.tooltipEl.hidden = false;
    fireEvent('mousedown', {});
    expect(manager.tooltipEl.hidden).toBe(true);
  });

  test('positionTooltip applies horizontal containment (left bound and right bound)', () => {
    // Test left edge containment
    const leftTrigger = {
      getAttribute: () => 'tipLeft',
      getBoundingClientRect: () => ({ top: 100, left: 2, width: 10, height: 20, bottom: 120, right: 12 }),
    };
    manager.positionTooltip(leftTrigger);
    expect(manager.tooltipEl.style.left).toBe('8px');

    // Test right edge containment
    const rightTrigger = {
      getAttribute: () => 'tipRight',
      getBoundingClientRect: () => ({ top: 100, left: 330, width: 20, height: 20, bottom: 120, right: 350 }),
    };
    manager.positionTooltip(rightTrigger);
    // 340 - 100 - 8 = 232px
    expect(manager.tooltipEl.style.left).toBe('232px');
  });

  test('positionTooltip applies vertical containment below trigger if space above is insufficient', () => {
    // top < 8 should add bottom class and position below
    const topEdgeTrigger = {
      getAttribute: () => 'tipTop',
      getBoundingClientRect: () => ({ top: 5, left: 100, width: 40, height: 20, bottom: 25, right: 140 }),
    };

    manager.positionTooltip(topEdgeTrigger);
    expect(manager.tooltipEl.classList.add).toHaveBeenCalledWith('bottom');
    expect(manager.tooltipEl.style.top).toBe('33px'); // bottom (25) + padding (8)
  });
});

