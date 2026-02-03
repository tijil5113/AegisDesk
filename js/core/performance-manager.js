/**
 * Performance Manager — runs early in shell init; applies body.performance-mode so
 * glass-system.css and performance-optimized.css can disable blur/animations.
 * Guardrails: prefers-reduced-motion/transparency (CSS); manual toggle + localStorage.
 */
const PERF_MODE_STORAGE_KEY = 'aegis-desktop-performance-mode';

class PerformanceManager {
    constructor() {
        this.rafCallbacks = new Set();
        this.frameId = null;
        this.lastFrameTime = 0;
        this.targetFPS = 30;
        this.frameInterval = 1000 / this.targetFPS;
        this._performanceMode = false;
        this.init();
    }

    init() {
        this.applyPerformanceModeFromStorage();
        if (!this._performanceMode) {
            this.detectDeviceCapabilities();
        }
        this.optimizeScroll();
        this.setupRAF();
    }

    /** User/manual override stored in localStorage. Takes precedence over auto low-end detection. */
    applyPerformanceModeFromStorage() {
        try {
            const stored = localStorage.getItem(PERF_MODE_STORAGE_KEY);
            if (stored === 'true') {
                this._performanceMode = true;
                this.enablePerformanceMode();
            } else if (stored === 'false') {
                this._performanceMode = false;
                this.disablePerformanceMode();
            }
        } catch (_) {}
    }

    isPerformanceMode() {
        return this._performanceMode || document.body.classList.contains('performance-mode');
    }

    enablePerformanceMode() {
        this._performanceMode = true;
        try { localStorage.setItem(PERF_MODE_STORAGE_KEY, 'true'); } catch (_) {}
        document.body.classList.add('performance-mode');
        document.documentElement.classList.add('performance-mode');
        if (typeof parallaxController !== 'undefined') parallaxController.enabled = false;
        document.documentElement.style.setProperty('--anim-speed-fast', '100ms');
        document.documentElement.style.setProperty('--anim-speed-normal', '150ms');
        document.documentElement.style.setProperty('--anim-speed-slow', '200ms');
    }

    disablePerformanceMode() {
        this._performanceMode = false;
        try { localStorage.setItem(PERF_MODE_STORAGE_KEY, 'false'); } catch (_) {}
        document.body.classList.remove('performance-mode');
        document.documentElement.classList.remove('performance-mode');
        if (typeof parallaxController !== 'undefined') parallaxController.enabled = true;
        document.documentElement.style.removeProperty('--anim-speed-fast');
        document.documentElement.style.removeProperty('--anim-speed-normal');
        document.documentElement.style.removeProperty('--anim-speed-slow');
    }

    togglePerformanceMode() {
        if (this.isPerformanceMode()) {
            this.disablePerformanceMode();
            return false;
        } else {
            this.enablePerformanceMode();
            return true;
        }
    }

    /** Auto-enable on low-end devices only if user has not set a preference. */
    detectDeviceCapabilities() {
        try {
            if (localStorage.getItem(PERF_MODE_STORAGE_KEY) !== null) return;
        } catch (_) {}
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        const deviceMemory = navigator.deviceMemory || 4;
        const isLowEnd = hardwareConcurrency < 4 || deviceMemory < 4;
        if (isLowEnd) {
            this._performanceMode = true;
            this.enablePerformanceMode();
        }
    }

    optimizeScroll() {
        // Use passive listeners for scroll
        const scrollElements = document.querySelectorAll('.apps-grid, .news-articles-grid, .files-list');
        scrollElements.forEach(el => {
            el.addEventListener('scroll', () => {}, { passive: true });
        });
    }

    setupRAF() {
        // Throttled RAF for smoother performance
        const rafLoop = (timestamp) => {
            if (!this.lastFrameTime) {
                this.lastFrameTime = timestamp;
            }
            
            const elapsed = timestamp - this.lastFrameTime;
            
            if (elapsed >= this.frameInterval) {
                // Execute callbacks
                this.rafCallbacks.forEach(callback => {
                    try {
                        callback(timestamp);
                    } catch (error) {
                        console.error('RAF callback error:', error);
                    }
                });
                
                this.lastFrameTime = timestamp - (elapsed % this.frameInterval);
            }
            
            this.frameId = requestAnimationFrame(rafLoop);
        };
        
        this.frameId = requestAnimationFrame(rafLoop);
    }

    addRAF(callback) {
        this.rafCallbacks.add(callback);
        return () => this.rafCallbacks.delete(callback);
    }

    destroy() {
        if (this.frameId) {
            cancelAnimationFrame(this.frameId);
        }
        this.rafCallbacks.clear();
    }
}

// Initialize globally
const performanceManager = new PerformanceManager();
