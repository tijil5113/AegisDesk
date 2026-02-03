/**
 * Tooltip System — event delegation only (no MutationObserver, no per-element listeners).
 *
 * PERF: Previously used MutationObserver on document.body + querySelectorAll + 4 listeners
 * per element, causing thundering herd on dynamic content. Now: one set of delegated
 * mouseenter/mouseleave/focusin/focusout on document.body; tooltip text resolved from
 * event.target (data-tooltip, title, aria-label, or trimmed textContent). Keeps dynamic
 * content (launcher, taskbar, windows) from triggering repeated scans and listener attach.
 */
class TooltipSystem {
    constructor() {
        this.tooltip = null;
        /** @type {Element | null} — element that currently shows the tooltip (for leave/out) */
        this.currentTarget = null;
        this.hideTimeout = null;
        this.init();
    }

    init() {
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        this.tooltip.setAttribute('role', 'tooltip');
        this.tooltip.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.tooltip);

        // Single delegated handlers (capture so we see phase before app handlers)
        document.body.addEventListener('mouseenter', (e) => this.onPointerEnter(e), true);
        document.body.addEventListener('mouseleave', (e) => this.onPointerLeave(e), true);
        document.body.addEventListener('focusin', (e) => this.onFocusIn(e), true);
        document.body.addEventListener('focusout', (e) => this.onFocusOut(e), true);
    }

    /**
     * Resolve tooltip text from element. Uses data-original-title (if we stole title),
     * then data-tooltip, title, aria-label, or trimmed textContent (max 50 chars).
     */
    getTooltipText(el) {
        if (!el || typeof el.getAttribute !== 'function') return null;
        const text =
            el.getAttribute('data-original-title') ||
            el.getAttribute('data-tooltip') ||
            el.getAttribute('title') ||
            el.getAttribute('aria-label') ||
            (el.textContent && el.textContent.trim().substring(0, 50));
        return text && text.trim() ? text.trim() : null;
    }

    /** True if element is a tooltip candidate (has text or is known control). */
    isTooltipTarget(el) {
        if (!el || typeof el.getAttribute !== 'function') return false;
        const hasAttr = el.getAttribute('data-tooltip') || el.getAttribute('title') ||
            el.getAttribute('aria-label') || el.getAttribute('data-original-title');
        if (hasAttr) return true;
        if (el.classList && (el.classList.contains('taskbar-icon') || el.classList.contains('app-tile') || el.classList.contains('modern-icon'))) {
            return !!this.getTooltipText(el);
        }
        return false;
    }

    /** From event target (may be child e.g. SVG), find nearest element that has tooltip content. */
    findTooltipTarget(el) {
        for (let node = el; node && node !== document.body; node = node.parentElement) {
            if (this.isTooltipTarget(node)) return node;
        }
        return null;
    }

    onPointerEnter(e) {
        const target = this.findTooltipTarget(e.target);
        if (!target) return;
        this.clearHideTimeout();
        const text = this.getTooltipText(target);
        if (text) this.showTooltip(target, text);
    }

    onPointerLeave(e) {
        const related = e.relatedTarget;
        if (this.currentTarget && (!related || !this.currentTarget.contains(related))) {
            this.scheduleHide();
        }
    }

    onFocusIn(e) {
        const target = this.findTooltipTarget(e.target);
        if (!target) return;
        this.clearHideTimeout();
        const text = this.getTooltipText(target);
        if (text) this.showTooltip(target, text);
    }

    onFocusOut(e) {
        const related = e.relatedTarget;
        if (this.currentTarget && (!related || !this.currentTarget.contains(related))) {
            this.scheduleHide();
        }
    }

    clearHideTimeout() {
        if (this.hideTimeout) {
            clearTimeout(this.hideTimeout);
            this.hideTimeout = null;
        }
    }

    scheduleHide() {
        this.clearHideTimeout();
        this.hideTimeout = setTimeout(() => this.hideTooltip(), 50);
    }

    showTooltip(element, text) {
        if (!this.tooltip || !text) return;

        // On first show, steal native title into data-original-title to avoid double tooltip
        const title = element.getAttribute('title');
        if (title) {
            element.setAttribute('data-original-title', title);
            element.removeAttribute('title');
        }

        this.currentTarget = element;
        this.tooltip.textContent = text;
        this.tooltip.setAttribute('aria-hidden', 'false');
        this.tooltip.classList.add('visible');

        const rect = element.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        if (top < 8) top = rect.bottom + 8;

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    hideTooltip() {
        this.clearHideTimeout();
        this.currentTarget = null;
        if (!this.tooltip) return;
        this.tooltip.classList.remove('visible');
        this.tooltip.setAttribute('aria-hidden', 'true');
    }
}

const tooltipSystem = new TooltipSystem();
