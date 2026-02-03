// ROUTER - Single Page Application Router
// Handles client-side routing and navigation guards

class Router {
    constructor() {
        this.routes = {
            '/': 'index.html',
            '/login': 'login.html',
            '/desktop': 'desktop.html'
        };
        this.currentRoute = null;
        this.authRequired = ['/desktop'];
        this.pageCache = new Map();
        this.loadingPromises = new Map();
        this.init();
    }

    init() {
        console.log('[Router] Initializing router...');
        console.log('[Router] Current URL:', window.location.href);
        console.log('[Router] Protocol:', window.location.protocol);
        
        // Check environment first
        if (typeof envDetector !== 'undefined' && envDetector.isFileMode()) {
            this.showFileModeError();
            return;
        }

        // Wait for auth system to be ready before handling routes
        const checkAuthReady = () => {
            if (typeof authSystem !== 'undefined') {
                // Handle initial route
                this.handleRoute();
                
                // Listen for popstate (back/forward buttons)
                window.addEventListener('popstate', () => {
                    this.handleRoute();
                });
            } else {
                // Wait a bit more for auth system
                setTimeout(checkAuthReady, 100);
            }
        };
        
        checkAuthReady();
    }

    /**
     * Show error for file:// mode
     */
    showFileModeError() {
        document.body.innerHTML = `
            <div style="
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                color: white;
                z-index: 99999;
            ">
                <div style="
                    background: rgba(0, 0, 0, 0.3);
                    backdrop-filter: blur(10px);
                    padding: 48px;
                    border-radius: 16px;
                    max-width: 600px;
                    text-align: center;
                    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
                ">
                    <div style="font-size: 64px; margin-bottom: 24px;">⚠️</div>
                    <h1 style="font-size: 32px; margin-bottom: 16px; font-weight: 700;">Unsupported Environment</h1>
                    <p style="font-size: 18px; margin-bottom: 32px; line-height: 1.6; opacity: 0.9;">
                        AegisDesk must be run using a local server (http://localhost).<br>
                        OAuth and cloud services are disabled in file mode.
                    </p>
                    <div style="
                        background: rgba(255, 255, 255, 0.1);
                        padding: 24px;
                        border-radius: 8px;
                        text-align: left;
                        margin-bottom: 24px;
                    ">
                        <h2 style="font-size: 20px; margin-bottom: 16px;">Quick Start:</h2>
                        <ol style="line-height: 2; padding-left: 24px;">
                            <li>Open terminal in this folder</li>
                            <li>Run: <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">npm start</code></li>
                            <li>Open: <code style="background: rgba(0,0,0,0.3); padding: 4px 8px; border-radius: 4px;">http://localhost:3000</code></li>
                        </ol>
                    </div>
                    <button onclick="location.reload()" style="
                        background: white;
                        color: #667eea;
                        border: none;
                        padding: 12px 32px;
                        border-radius: 8px;
                        font-size: 16px;
                        font-weight: 600;
                        cursor: pointer;
                        transition: transform 0.2s;
                    " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
                        Reload Page
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Get current route from URL
     * @returns {string}
     */
    getCurrentRoute() {
        const path = window.location.pathname;
        const hash = window.location.hash.replace('#', '');
        
        // Handle hash-based routing
        if (hash) {
            return '/' + hash;
        }
        
        // Handle path-based routing
        if (path === '/' || path === '/index.html') {
            return '/';
        }
        
        return path;
    }

    /**
     * Check if route requires authentication
     * @param {string} route 
     * @returns {boolean}
     */
    requiresAuth(route) {
        return this.authRequired.some(protectedRoute => route.startsWith(protectedRoute));
    }

    /**
     * Navigate to a route
     * @param {string} route 
     * @param {boolean} replace 
     */
    navigate(route, replace = false) {
        console.log(`[Router] Navigating to: ${route} (replace: ${replace})`);
        
        if (replace) {
            window.history.replaceState({ route }, '', route);
        } else {
            window.history.pushState({ route }, '', route);
        }
        
        this.handleRoute();
    }

    /**
     * Handle route changes
     */
    async handleRoute() {
        const route = this.getCurrentRoute();
        console.log(`[Router] Handling route: ${route}`);
        
        // Check if route requires auth
        if (this.requiresAuth(route)) {
            if (typeof authSystem === 'undefined' || !authSystem.isAuthenticated()) {
                console.log('[Router] Route requires auth, redirecting to login...');
                this.navigate('/login', true);
                return;
            }
        }
        
        // Route to appropriate page
        if (route === '/' || route === '/index.html') {
            // Entry point - check auth and redirect
            if (typeof authSystem !== 'undefined' && authSystem.isAuthenticated()) {
                console.log('[Router] User authenticated, redirecting to desktop...');
                this.navigate('/desktop', true);
            } else {
                console.log('[Router] User not authenticated, redirecting to login...');
                this.navigate('/login', true);
            }
        } else if (route === '/login') {
            // Login page - if already authenticated, redirect to desktop
            if (typeof authSystem !== 'undefined' && authSystem.isAuthenticated()) {
                console.log('[Router] Already authenticated, redirecting to desktop...');
                this.navigate('/desktop', true);
            } else {
                this.loadPage('login.html');
            }
        } else if (route === '/desktop') {
            // Desktop page - must be authenticated (checked above)
            this.loadPage('desktop.html');
        } else {
            // Unknown route - redirect to index
            console.warn(`[Router] Unknown route: ${route}, redirecting to /`);
            this.navigate('/', true);
        }
    }

    /**
     * Load a page dynamically with caching and optimization
     * @param {string} page 
     */
    async loadPage(page) {
        console.log(`[Router] Loading page: ${page}`);
        
        // Check cache first
        const cached = this.pageCache.get(page);
        if (cached && Date.now() - cached.timestamp < 5 * 60 * 1000) {
            console.log(`[Router] Using cached page: ${page}`);
            this.renderPage(cached.html, cached.doc);
            return;
        }
        
        // Check if already loading
        if (this.loadingPromises.has(page)) {
            console.log(`[Router] Page already loading: ${page}, waiting...`);
            await this.loadingPromises.get(page);
            return;
        }
        
        // Start loading
        const loadPromise = this.fetchAndRenderPage(page);
        this.loadingPromises.set(page, loadPromise);
        
        try {
            await loadPromise;
        } finally {
            this.loadingPromises.delete(page);
        }
    }
    
    /**
     * Fetch and render page
     * @param {string} page 
     */
    async fetchAndRenderPage(page) {
        try {
            const startTime = performance.now();
            
            const response = await fetch(page, {
                cache: 'default',
                headers: {
                    'Cache-Control': 'max-age=300'
                }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to load ${page}: ${response.status}`);
            }
            
            const html = await response.text();
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');
            
            // Cache the page
            this.pageCache.set(page, {
                html,
                doc,
                timestamp: Date.now()
            });
            
            // Render the page
            this.renderPage(html, doc);
            
            const duration = performance.now() - startTime;
            console.log(`[Router] Page loaded in ${duration.toFixed(2)}ms: ${page}`);
        } catch (error) {
            console.error(`[Router] Error loading page ${page}:`, error);
            this.showError(page, error);
        }
    }
    
    /**
     * Render page content
     * @param {string} html 
     * @param {Document} doc 
     */
    async renderPage(html, doc) {
        // Use requestAnimationFrame for smooth rendering
        await new Promise(resolve => requestAnimationFrame(resolve));
        
        // Replace body content
        document.body.innerHTML = doc.body.innerHTML;
        
        // Load CSS files lazily (non-blocking)
        const stylesheets = Array.from(doc.querySelectorAll('link[rel="stylesheet"]'));
        const criticalCSS = stylesheets.slice(0, 2); // First 2 are critical
        const lazyCSS = stylesheets.slice(2);
        
        // Load critical CSS immediately
        criticalCSS.forEach(link => {
            if (!document.querySelector(`link[href="${link.href}"]`)) {
                document.head.appendChild(link.cloneNode(true));
            }
        });
        
        // Load lazy CSS asynchronously
        lazyCSS.forEach(link => {
            if (!document.querySelector(`link[href="${link.href}"]`)) {
                const lazyLink = link.cloneNode(true);
                lazyLink.media = 'print';
                lazyLink.onload = () => { lazyLink.media = 'all'; };
                document.head.appendChild(lazyLink);
            }
        });
        
        // Load scripts efficiently with priority
        const scripts = Array.from(doc.querySelectorAll('script'));
        const srcScripts = scripts.filter(s => s.src);
        const inlineScripts = scripts.filter(s => !s.src);
        
        // Categorize scripts by priority
        const criticalScripts = srcScripts.slice(0, 5); // First 5 are critical
        const normalScripts = srcScripts.slice(5, 20); // Next 15 are normal
        const lowPriorityScripts = srcScripts.slice(20); // Rest are low priority
        
        // Load critical scripts first (sequential for dependencies)
        for (const script of criticalScripts) {
            const src = script.src;
            if (!document.querySelector(`script[src="${src}"]`)) {
                await new Promise((resolve, reject) => {
                    const newScript = document.createElement('script');
                    newScript.src = src;
                    if (script.defer) newScript.defer = true;
                    newScript.onload = resolve;
                    newScript.onerror = reject;
                    document.head.appendChild(newScript);
                });
            }
        }
        
        // Execute inline scripts after critical scripts
        inlineScripts.forEach(script => {
            const newScript = document.createElement('script');
            newScript.textContent = script.textContent;
            document.head.appendChild(newScript);
        });
        
        // Load normal priority scripts in parallel (don't wait)
        Promise.all(normalScripts.map(script => {
            const src = script.src;
            if (document.querySelector(`script[src="${src}"]`)) {
                return Promise.resolve();
            }
            return new Promise((resolve, reject) => {
                const newScript = document.createElement('script');
                newScript.src = src;
                newScript.defer = true;
                newScript.onload = resolve;
                newScript.onerror = () => resolve(); // Don't fail on low priority
                document.head.appendChild(newScript);
            });
        })).catch(() => {});
        
        // Load low priority scripts asynchronously (background)
        lowPriorityScripts.forEach(script => {
            const src = script.src;
            if (!document.querySelector(`script[src="${src}"]`)) {
                const newScript = document.createElement('script');
                newScript.src = src;
                newScript.async = true;
                document.head.appendChild(newScript);
            }
        });
        
        // Update title
        if (doc.title) {
            document.title = doc.title;
        }
        
        // Dispatch custom event for page load
        window.dispatchEvent(new CustomEvent('pageLoaded', { detail: { page } }));
    }
    
    /**
     * Show error page
     * @param {string} page 
     * @param {Error} error 
     */
    showError(page, error) {
        document.body.innerHTML = `
            <div style="padding: 48px; text-align: center; font-family: sans-serif; color: white;">
                <h1>Error Loading Page</h1>
                <p>Failed to load ${page}</p>
                <p style="color: rgba(255,255,255,0.7); font-size: 14px;">${error.message}</p>
                <button onclick="location.reload()" style="
                    background: white;
                    color: #667eea;
                    border: none;
                    padding: 12px 24px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 16px;
                    margin-top: 16px;
                ">Reload</button>
            </div>
        `;
    }
}

// Initialize router when DOM is ready
let router;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        router = new Router();
        window.router = router;
    });
} else {
    router = new Router();
    window.router = router;
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Router;
}
