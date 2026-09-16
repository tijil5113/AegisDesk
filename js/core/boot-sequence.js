// Boot Sequence Controller — short, skippable, never delays readiness on purpose.
class BootSequence {
    constructor() {
        this.overlay = document.getElementById('boot-overlay');
        this.duration = 640;
        this.startTime = null;
    }

    shouldSkip() {
        if (!this.overlay) return true;
        if (sessionStorage.getItem('aegis_booted') === '1') return true;
        if (document.documentElement.classList.contains('aegis-reduced-motion')) return true;
        if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return true;
        if (document.body.classList.contains('performance-mode')) return true;
        return false;
    }

    start() {
        if (!this.overlay) return;
        if (this.shouldSkip()) {
            this.complete(true);
            return;
        }
        this.startTime = Date.now();
        this.overlay.addEventListener('click', () => this.skip(), { once: true });
        this.overlay.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Escape' || e.key === ' ') this.skip();
        });
        setTimeout(() => this.complete(false), this.duration);
    }

    complete(immediate) {
        if (!this.overlay) {
            document.body.classList.add('desktop-ready');
            return;
        }
        try { sessionStorage.setItem('aegis_booted', '1'); } catch (e) { /* ignore */ }
        this.overlay.classList.add('hidden');
        const finish = () => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.style.display = 'none';
                this.overlay.setAttribute('aria-hidden', 'true');
            }
            document.body.classList.add('desktop-ready');
            if (typeof parallaxController !== 'undefined' && !document.documentElement.classList.contains('aegis-reduced-motion')) {
                parallaxController.init();
            }
        };
        if (immediate) {
            finish();
            return;
        }
        setTimeout(finish, 160);
    }

    skip() {
        this.complete(true);
    }
}

const bootSequence = new BootSequence();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bootSequence.start();
    });
} else {
    bootSequence.start();
}
