/**
 * @module utils/tooltipManager.js
 * Handles dynamic tooltip positioning to prevent UI cutoffs at edges.
 */

export class TooltipManager {
  constructor() {
    this.tooltipEl = null;
    this.activeTrigger = null;
    this.createTooltipElement();
    this.initListeners();
  }

  createTooltipElement() {
    this.tooltipEl = document.createElement('div');
    this.tooltipEl.className = 'dynamic-tooltip';
    this.tooltipEl.hidden = true;
    document.body.appendChild(this.tooltipEl);
  }

  initListeners() {
    document.addEventListener('mouseenter', (e) => {
      const trigger = e.target.closest('[data-i18n-tip]');
      if (trigger) {
        this.show(trigger);
      }
    }, true);

    document.addEventListener('mouseleave', (e) => {
      const trigger = e.target.closest('[data-i18n-tip]');
      if (trigger && trigger === this.activeTrigger) {
        this.hide();
      }
    }, true);

    // Hide on scroll or click
    document.addEventListener('mousedown', () => this.hide());
  }

  show(trigger) {
    this.activeTrigger = trigger;
    const key = trigger.getAttribute('data-i18n-tip');
    const text = browser.i18n.getMessage(key) || key;
    
    this.tooltipEl.textContent = text;
    this.tooltipEl.hidden = false;

    this.positionTooltip(trigger);
  }

  hide() {
    this.tooltipEl.hidden = true;
    this.activeTrigger = null;
  }

  positionTooltip(trigger) {
    const triggerRect = trigger.getBoundingClientRect();
    const tooltipRect = this.tooltipEl.getBoundingClientRect();
    const padding = 8;
    const popupWidth = 340;

    // Default: Center above the trigger
    let left = triggerRect.left + (triggerRect.width / 2) - (tooltipRect.width / 2);
    let top = triggerRect.top - tooltipRect.height - padding;

    // Horizontal containment
    if (left < padding) {
      left = padding;
    } else if (left + tooltipRect.width > popupWidth - padding) {
      left = popupWidth - tooltipRect.width - padding;
    }

    // Vertical containment (if not enough space above, show below)
    if (top < padding) {
      top = triggerRect.bottom + padding;
      this.tooltipEl.classList.add('bottom');
    } else {
      this.tooltipEl.classList.remove('bottom');
    }

    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
    
    // Add active class for animation
    requestAnimationFrame(() => {
      this.tooltipEl.classList.add('visible');
    });
  }
}
