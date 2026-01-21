// PERFORMANCE OPTIMIZATIONS
// Lazy loading, caching, and performance monitoring

class PerformanceOptimizer {
    constructor() {
        this.pageCache = new Map();
        this.cssCache = new Set();
        this.scriptCache = new Set();
        this.loadingPromises = new Map();
        this.observer = null;
        this.init();
    }

    init() {
        // Intersection Observer for lazy loading
        if ('IntersectionObserver' in window) {
            this.observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const element = entry.target;
                        if (element.dataset.lazyLoad) {
                            this.loadLazyContent(element);
                        }
                    }
                });
            }, {
                rootMargin: '50px'
            });
        }

        // Preload critical resources
        this.preloadCritical();
    }

    /**
     * Preload critical resources
     */
    preloadCritical() {
        // Preload critical CSS
        const criticalCSS = [
            'styles/main.css',
            'styles/modern-system.css'
        ];

        criticalCSS.forEach(href => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = href;
            document.head.appendChild(link);
        });
    }

    /**
     * Lazy load CSS files
     * @param {string} href 
     * @returns {Promise}
     */
    async loadCSS(href) {
        if (this.cssCache.has(href)) {
            return Promise.resolve();
        }

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.onload = () => {
                this.cssCache.add(href);
                resolve();
            };
            link.onerror = reject;
            document.head.appendChild(link);
        });
    }

    /**
     * Lazy load scripts
     * @param {string} src 
     * @param {boolean} defer 
     * @returns {Promise}
     */
    async loadScript(src, defer = true) {
        if (this.scriptCache.has(src)) {
            return Promise.resolve();
        }

        // Check if already loading
        if (this.loadingPromises.has(src)) {
            return this.loadingPromises.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.defer = defer;
            script.async = !defer;
            script.onload = () => {
                this.scriptCache.add(src);
                this.loadingPromises.delete(src);
                resolve();
            };
            script.onerror = () => {
                this.loadingPromises.delete(src);
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.head.appendChild(script);
        });

        this.loadingPromises.set(src, promise);
        return promise;
    }

    /**
     * Batch load multiple scripts
     * @param {string[]} scripts 
     * @returns {Promise}
     */
    async loadScripts(scripts) {
        return Promise.all(scripts.map(src => this.loadScript(src)));
    }

    /**
     * Debounce function
     * @param {Function} func 
     * @param {number} wait 
     * @returns {Function}
     */
    debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    /**
     * Throttle function
     * @param {Function} func 
     * @param {number} limit 
     * @returns {Function}
     */
    throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    /**
     * Cache page content
     * @param {string} url 
     * @param {string} content 
     */
    cachePage(url, content) {
        this.pageCache.set(url, {
            content,
            timestamp: Date.now()
        });
    }

    /**
     * Get cached page
     * @param {string} url 
     * @param {number} maxAge 
     * @returns {string|null}
     */
    getCachedPage(url, maxAge = 5 * 60 * 1000) {
        const cached = this.pageCache.get(url);
        if (cached && Date.now() - cached.timestamp < maxAge) {
            return cached.content;
        }
        return null;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.pageCache.clear();
    }

    /**
     * Measure performance
     * @param {string} name 
     * @param {Function} fn 
     * @returns {Promise}
     */
    async measure(name, fn) {
        const start = performance.now();
        try {
            const result = await fn();
            const duration = performance.now() - start;
            console.log(`[Performance] ${name}: ${duration.toFixed(2)}ms`);
            return result;
        } catch (error) {
            const duration = performance.now() - start;
            console.error(`[Performance] ${name} failed after ${duration.toFixed(2)}ms:`, error);
            throw error;
        }
    }
}

// Create global instance
const perfOptimizer = new PerformanceOptimizer();
window.perfOptimizer = perfOptimizer;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PerformanceOptimizer;
}
