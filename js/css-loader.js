// CSS LOADER - Lazy loads CSS files for better performance
class CSSLoader {
    constructor() {
        this.loaded = new Set();
        this.loading = new Set();
        this.criticalCSS = [
            'styles/main.css',
            'styles/motion-system.css',
            'styles/modern-system.css',
            'styles/performance-optimized.css'
        ];
    }

    /**
     * Load critical CSS immediately
     */
    loadCritical() {
        this.criticalCSS.forEach(href => {
            if (!this.loaded.has(href)) {
                this.loadSync(href);
            }
        });
    }

    /**
     * Load CSS synchronously (for critical)
     * @param {string} href 
     */
    loadSync(href) {
        if (this.loaded.has(href)) return;
        
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        document.head.appendChild(link);
        this.loaded.add(href);
    }

    /**
     * Load CSS asynchronously (for non-critical)
     * @param {string} href 
     * @returns {Promise}
     */
    async loadAsync(href) {
        if (this.loaded.has(href)) {
            return Promise.resolve();
        }

        if (this.loading.has(href)) {
            // Wait for existing load
            return new Promise(resolve => {
                const checkInterval = setInterval(() => {
                    if (this.loaded.has(href)) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 50);
            });
        }

        this.loading.add(href);

        return new Promise((resolve, reject) => {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = href;
            link.media = 'print'; // Load as non-blocking
            link.onload = () => {
                link.media = 'all'; // Apply styles
                this.loaded.add(href);
                this.loading.delete(href);
                resolve();
            };
            link.onerror = () => {
                this.loading.delete(href);
                reject(new Error(`Failed to load CSS: ${href}`));
            };
            document.head.appendChild(link);
        });
    }

    /**
     * Batch load multiple CSS files
     * @param {string[]} hrefs 
     * @param {boolean} async 
     */
    async loadBatch(hrefs, async = true) {
        if (async) {
            // Load in parallel
            return Promise.all(hrefs.map(href => this.loadAsync(href).catch(err => {
                console.warn(`[CSSLoader] Failed to load ${href}:`, err);
            })));
        } else {
            // Load sequentially
            for (const href of hrefs) {
                await this.loadSync(href);
            }
        }
    }
}

// Create global instance
const cssLoader = new CSSLoader();
window.cssLoader = cssLoader;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CSSLoader;
}
