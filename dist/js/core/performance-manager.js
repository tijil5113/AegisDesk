// Performance Manager - Optimizes runtime performance
class PerformanceManager {
    constructor() {
        this.rafCallbacks = new Set();
        this.frameId = null;
        this.lastFrameTime = 0;
        this.targetFPS = 30; // Reduced from 60 for better performance
        this.frameInterval = 1000 / this.targetFPS;
        this.init();
    }

    init() {
        // Detect low-end devices and adjust settings
        this.detectDeviceCapabilities();
        
        // Optimize scroll performance
        this.optimizeScroll();
        
        // Batch DOM updates
        this.setupRAF();
    }

    detectDeviceCapabilities() {
        const hardwareConcurrency = navigator.hardwareConcurrency || 4;
        const deviceMemory = navigator.deviceMemory || 4;
        const isLowEnd = hardwareConcurrency < 4 || deviceMemory < 4;
        
        if (isLowEnd) {
            // Disable expensive features on low-end devices
            document.body.classList.add('performance-mode');
            
            // Disable parallax
            if (typeof parallaxController !== 'undefined') {
                parallaxController.enabled = false;
            }
            
            // Reduce animation complexity
            document.documentElement.style.setProperty('--anim-speed-fast', '100ms');
            document.documentElement.style.setProperty('--anim-speed-normal', '150ms');
            document.documentElement.style.setProperty('--anim-speed-slow', '200ms');
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
