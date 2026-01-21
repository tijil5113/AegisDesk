// Tooltip System - Adds hover tooltips to all interactive elements
class TooltipSystem {
    constructor() {
        this.tooltip = null;
        this.init();
    }

    init() {
        // Create tooltip element
        this.tooltip = document.createElement('div');
        this.tooltip.className = 'tooltip';
        this.tooltip.setAttribute('role', 'tooltip');
        this.tooltip.setAttribute('aria-hidden', 'true');
        document.body.appendChild(this.tooltip);

        // Add tooltips to all elements with title attribute or data-tooltip
        this.attachTooltips();

        // Listen for dynamically added elements
        const observer = new MutationObserver(() => {
            this.attachTooltips();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    attachTooltips() {
        const elements = document.querySelectorAll(
            '[title]:not([data-tooltip-attached]), ' +
            '[data-tooltip]:not([data-tooltip-attached]), ' +
            '.taskbar-icon:not([data-tooltip-attached]), ' +
            '.app-tile:not([data-tooltip-attached]), ' +
            '.modern-icon:not([data-tooltip-attached])'
        );

        elements.forEach(element => {
            if (element.hasAttribute('data-tooltip-attached')) return;

            const tooltipText = element.getAttribute('data-tooltip') || 
                               element.getAttribute('title') || 
                               element.getAttribute('aria-label') ||
                               element.textContent?.trim().substring(0, 50);

            if (!tooltipText) return;

            // Remove title to prevent default tooltip
            const originalTitle = element.getAttribute('title');
            if (originalTitle) {
                element.setAttribute('data-original-title', originalTitle);
                element.removeAttribute('title');
            }

            element.setAttribute('data-tooltip-attached', 'true');
            element.setAttribute('data-tooltip-text', tooltipText);

            element.addEventListener('mouseenter', (e) => this.showTooltip(e, tooltipText));
            element.addEventListener('mouseleave', () => this.hideTooltip());
            element.addEventListener('focus', (e) => this.showTooltip(e, tooltipText));
            element.addEventListener('blur', () => this.hideTooltip());
        });
    }

    showTooltip(event, text) {
        if (!this.tooltip || !text) return;

        this.tooltip.textContent = text;
        this.tooltip.setAttribute('aria-hidden', 'false');
        this.tooltip.classList.add('visible');

        // Position tooltip
        const rect = event.target.getBoundingClientRect();
        const tooltipRect = this.tooltip.getBoundingClientRect();
        
        let top = rect.top - tooltipRect.height - 8;
        let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);

        // Adjust if tooltip goes off screen
        if (left < 8) left = 8;
        if (left + tooltipRect.width > window.innerWidth - 8) {
            left = window.innerWidth - tooltipRect.width - 8;
        }
        if (top < 8) {
            top = rect.bottom + 8;
        }

        this.tooltip.style.top = `${top}px`;
        this.tooltip.style.left = `${left}px`;
    }

    hideTooltip() {
        if (!this.tooltip) return;
        this.tooltip.classList.remove('visible');
        this.tooltip.setAttribute('aria-hidden', 'true');
    }
}

// Initialize globally
const tooltipSystem = new TooltipSystem();
