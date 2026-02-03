// SCRIPT LOADER - Optimized script loading with batching and priority
class ScriptLoader {
    constructor() {
        this.loaded = new Set();
        this.loading = new Map();
        this.priority = {
            critical: [],
            high: [],
            normal: [],
            low: []
        };
    }

    /**
     * Load script with priority
     * @param {string} src 
     * @param {string} priority - 'critical' | 'high' | 'normal' | 'low'
     * @returns {Promise}
     */
    async load(src, priority = 'normal') {
        if (this.loaded.has(src)) {
            return Promise.resolve();
        }

        if (this.loading.has(src)) {
            return this.loading.get(src);
        }

        const promise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.defer = priority !== 'critical';
            script.async = priority === 'low';
            script.onload = () => {
                this.loaded.add(src);
                this.loading.delete(src);
                resolve();
            };
            script.onerror = () => {
                this.loading.delete(src);
                reject(new Error(`Failed to load script: ${src}`));
            };
            document.head.appendChild(script);
        });

        this.loading.set(src, promise);
        return promise;
    }

    /**
     * Batch load scripts by priority
     * @param {string[]} scripts 
     * @param {string} priority 
     */
    async loadBatch(scripts, priority = 'normal') {
        // Load critical scripts sequentially
        if (priority === 'critical') {
            for (const src of scripts) {
                await this.load(src, priority);
            }
        } else {
            // Load others in parallel
            await Promise.all(scripts.map(src => this.load(src, priority).catch(err => {
                console.warn(`[ScriptLoader] Failed to load ${src}:`, err);
            })));
        }
    }

    /**
     * Load scripts in priority order
     */
    async loadByPriority() {
        // Critical first (sequential)
        await this.loadBatch(this.priority.critical, 'critical');
        
        // High priority (parallel)
        await this.loadBatch(this.priority.high, 'high');
        
        // Normal priority (parallel, deferred)
        this.loadBatch(this.priority.normal, 'normal');
        
        // Low priority (async, don't wait)
        this.loadBatch(this.priority.low, 'low');
    }
}

// Create global instance
const scriptLoader = new ScriptLoader();
window.scriptLoader = scriptLoader;

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ScriptLoader;
}
