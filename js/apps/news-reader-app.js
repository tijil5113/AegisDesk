// PREMIUM NEWS READER APP - Complete NewsAPI.org Integration
// Professional, AI-powered news aggregator for AegisDesk

class NewsReaderApp {
    constructor() {
        // NewsAPI.org - Direct calls via CORS proxy (NO SERVER NEEDED)
        this.apiKey = '1c8e3e79f9f24569a3f6d1c647aeff46';
        // Try multiple CORS proxies as fallback
        this.corsProxies = [
            'https://api.allorigins.win/get?url=',
            'https://corsproxy.io/?',
            'https://api.codetabs.com/v1/proxy?quest='
        ];
        this.currentProxyIndex = 0;
        this.newsApiBaseUrl = 'https://newsapi.org/v2';
        
        // EXPLICIT STATE MACHINE - NO BOOLEANS, NO IMPLICIT CONDITIONS
        this.state = {
            status: 'idle', // 'idle' | 'loading' | 'success' | 'empty' | 'error'
            articles: [],
            error: null,
            breakingNews: []
        };
        
        // UI State (separate from data state)
        this.featuredArticle = null;
        this.trendingArticles = [];
        this.currentCategory = 'all';
        this.currentPage = 1;
        this.pageSize = 20; // GNews default max
        this.totalResults = 0;
        this.hasMore = true;
        this.searchQuery = '';
        this.currentLanguage = this.loadLanguage(); // 'en' | 'hi' | 'ta'
        
        this.bookmarks = this.loadBookmarks();
        this.readingMode = false;
        
        // Timeout tracking
        this.timeoutId = null;
        this.HARD_TIMEOUT_MS = 15000; // 15 seconds - increased for CORS proxy delays
        
        // Cache
        this.cache = new Map();
        this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
        
        // Debug info
        this.debugInfo = {
            lastRequest: null,
            lastResponse: null,
            totalResults: 0,
            currentPage: 1,
            maxPages: 0,
            lastError: null,
            stateStatus: 'idle'
        };
        
        this.init();
    }
    
    loadLanguage() {
        try {
            return localStorage.getItem('news_language') || 'en';
        } catch {
            return 'en';
        }
    }
    
    saveLanguage(lang) {
        try {
            localStorage.setItem('news_language', lang);
        } catch {
            console.warn('[News] Failed to save language preference');
        }
    }
    
    // SET STATE - ONLY WAY TO CHANGE STATE
    setState(newState) {
        const oldStatus = this.state.status;
        this.state = { ...this.state, ...newState };
        this.debugInfo.stateStatus = this.state.status;
        
        console.log(`[News] 🔄 State changed: ${oldStatus} → ${this.state.status}`, {
            articles: this.state.articles.length,
            error: this.state.error
        });
        
        // ALWAYS RENDER AFTER STATE CHANGE
        this.render();
    }
    
    init() {
        console.log('[News] 🔄 Initializing News Reader App...');
        console.log('[News] Current URL:', window.location.href);
        console.log('[News] Protocol:', window.location.protocol);
        console.log('[News] ✅ Using NewsAPI.org via CORS proxy');
        console.log('[News] 🎯 State machine initialized with status:', this.state.status);
        console.log('[News] 🌐 Language:', this.currentLanguage);
        
        this.setupEventListeners();
        this.setupIntersectionObserver();
        
        // Load news immediately
        console.log('[News] ✅ Loading news from NewsAPI.org...');
        this.loadInitialNews();
        
        // Auto-refresh every 5 minutes
        setInterval(() => {
            this.refreshNews();
        }, 5 * 60 * 1000);
    }
    
    // RENDER - BASED ONLY ON STATE.STATUS
    render() {
        console.log(`[News] 🎨 Rendering with state.status: ${this.state.status}, articles: ${this.state.articles.length}`);
        
        const container = document.getElementById('news-articles-grid');
        const ticker = document.getElementById('breaking-news-content');
        
        if (!container) {
            console.error('[News] ❌ Articles grid container not found!');
            return;
        }
        
        // Clear loading indicators FIRST
        this.hideLoading();
        document.querySelectorAll('.news-hero-skeleton, .news-skeleton-item, .news-loading').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        switch (this.state.status) {
            case 'idle':
                // Initial state - show skeleton
                console.log('[News] 🎨 Rendering IDLE state - showing skeleton');
                this.showSkeletonPlaceholders();
                break;
                
            case 'loading':
                // Show skeleton and loading spinner
                console.log('[News] 🎨 Rendering LOADING state - showing skeleton + spinner');
                this.showSkeletonPlaceholders();
                this.showLoading();
                break;
                
            case 'success':
                // Render articles
                console.log('[News] 🎨 Rendering SUCCESS state - rendering', this.state.articles.length, 'articles');
                
                // CRITICAL: Ensure this.articles is set from state
                if (this.state.articles && this.state.articles.length > 0) {
                    this.articles = [...this.state.articles]; // Create a copy
                    console.log('[News] ✅ Set this.articles to', this.articles.length, 'articles');
                    console.log('[News] 📋 First article sample:', this.articles[0]?.title || 'N/A');
                } else if (this.articles && this.articles.length > 0) {
                    console.log('[News] ✅ Using existing this.articles:', this.articles.length, 'articles');
                } else {
                    console.warn('[News] ⚠️ Success state but no articles in state OR this.articles - switching to empty');
                    this.setState({ status: 'empty' });
                    break;
                }
                
                // Render featured and trending for first page
                if (this.currentPage === 1 && this.articles.length > 0) {
                    this.featuredArticle = this.articles[0];
                    this.renderFeaturedArticle();
                    console.log('[News] ✅ Rendered featured article');
                    
                    if (this.articles.length > 1) {
                        this.trendingArticles = this.articles.slice(1, 4);
                        this.renderTrendingArticles();
                        console.log('[News] ✅ Rendered trending articles');
                    }
                }
                
                // Now render the main grid - ALWAYS render even if already rendered
                this.renderArticles(true);
                console.log('[News] ✅ Called renderArticles(true)');
                break;
                
            case 'empty':
                // Show empty state
                console.log('[News] 🎨 Rendering EMPTY state');
                this.showEmptyState();
                break;
                
            case 'error':
                // Show error state
                console.error('[News] 🎨 Rendering ERROR state:', this.state.error);
                this.showErrorState(this.state.error || 'Unknown error occurred');
                break;
                
            default:
                console.error('[News] ❌ Unknown state.status:', this.state.status);
                this.setState({ status: 'error', error: `Invalid state: ${this.state.status}` });
        }
    }
    
    // Map category to NewsAPI category
    getNewsApiCategory(category) {
        const categoryMap = {
            'world': null, // Use 'everything' endpoint with country filter
            'india': null, // Use 'top-headlines' with country=in
            'business': 'business',
            'technology': 'technology',
            'science': 'science',
            'health': 'health',
            'sports': 'sports',
            'entertainment': 'entertainment'
        };
        return categoryMap[category] || null;
    }
    
    // Build NewsAPI request params
    buildNewsApiParams(params = {}) {
        const { mode, category, q, page, pageSize, lang } = params;
        
        let requestParams = {
            mode: mode || 'top-headlines',
            page: page || this.currentPage || 1,
            pageSize: pageSize || this.pageSize || 20,
            language: lang || this.currentLanguage || 'en'
        };
        
        // Handle search mode
        if (q || this.searchQuery) {
            requestParams.mode = 'everything';
            requestParams.q = q || this.searchQuery;
        }
        // Handle category mode
        else if (category && category !== 'all' && category !== 'top-headlines') {
            if (category === 'india') {
                // India news - top headlines from India
                requestParams.mode = 'top-headlines';
                requestParams.country = 'in';
            } else if (category === 'world') {
                // World news - use everything endpoint with broader search for international news
                requestParams.mode = 'everything';
                requestParams.q = 'world OR international OR global OR breaking OR news OR politics OR economy';
                requestParams.sortBy = 'publishedAt';
                // Don't restrict to a country for world news
                delete requestParams.country;
                // Use English language for world news
                requestParams.language = 'en';
            } else {
                // Specific categories (business, technology, etc.)
                const newsApiCategory = this.getNewsApiCategory(category);
                if (newsApiCategory) {
                    requestParams.mode = 'top-headlines';
                    requestParams.category = newsApiCategory;
                    // Get news from India for these categories
                    requestParams.country = 'in';
                } else {
                    // Unknown category - default to India headlines
                    requestParams.mode = 'top-headlines';
                    requestParams.country = 'in';
                }
            }
        }
        // Handle "all" category - show mix of top headlines
        else if (category === 'all') {
            requestParams.mode = 'top-headlines';
            requestParams.country = 'in';
            // Don't specify category to get all categories
        }
        // Handle "top-headlines" category
        else if (category === 'top-headlines') {
            requestParams.mode = 'top-headlines';
            requestParams.country = 'in';
        }
        // Default: top headlines for India
        else {
            requestParams.mode = 'top-headlines';
            requestParams.country = 'in';
        }
        
        return requestParams;
    }
    
    // Build NewsAPI.org URL with CORS proxy
    buildNewsApiUrl(requestParams, proxyIndex = null) {
        const { mode, category, q, country, language, page, pageSize } = requestParams;
        
        // Determine endpoint
        let endpoint = mode === 'everything' 
            ? `${this.newsApiBaseUrl}/everything`
            : `${this.newsApiBaseUrl}/top-headlines`;
        
        // Build URL parameters
        const params = new URLSearchParams({
            apiKey: this.apiKey,
            page: String(page || 1),
            pageSize: String(pageSize || 20)
        });
        
        if (mode === 'everything' && q) {
            params.append('q', q);
            if (language) {
                params.append('language', language);
            }
            // Sort by published date for everything endpoint
            params.append('sortBy', 'publishedAt');
            // Don't add country for everything endpoint (it's global)
        } else if (mode === 'top-headlines') {
            if (country) {
                params.append('country', country);
            }
            if (category) {
                params.append('category', category);
            }
            // Note: language parameter is not supported for top-headlines endpoint
        }
        
        const fullUrl = `${endpoint}?${params.toString()}`;
        
        // Use specified proxy index or current one
        const proxyIdx = proxyIndex !== null ? proxyIndex : this.currentProxyIndex;
        const corsProxy = this.corsProxies[proxyIdx] || this.corsProxies[0];
        
        // Different proxies have different URL formats
        let proxiedUrl;
        if (corsProxy.includes('allorigins.win')) {
            proxiedUrl = corsProxy + encodeURIComponent(fullUrl);
        } else if (corsProxy.includes('codetabs.com')) {
            proxiedUrl = corsProxy + encodeURIComponent(fullUrl);
        } else {
            proxiedUrl = corsProxy + encodeURIComponent(fullUrl);
        }
        
        return proxiedUrl;
    }
    
    // Try next CORS proxy if current one fails
    tryNextProxy() {
        this.currentProxyIndex = (this.currentProxyIndex + 1) % this.corsProxies.length;
        console.log(`[News] 🔄 Switching to CORS proxy ${this.currentProxyIndex + 1}/${this.corsProxies.length}`);
    }
    
    setupEventListeners() {
        // Category buttons
        document.querySelectorAll('.news-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.news-category-btn').forEach(b => {
                    b.classList.remove('active');
                    b.setAttribute('aria-selected', 'false');
                });
                btn.classList.add('active');
                btn.setAttribute('aria-selected', 'true');
                
                const category = btn.dataset.category;
                this.switchCategory(category);
            });
        });
        
        // Search
        const searchInput = document.getElementById('news-search');
        const searchBtn = document.getElementById('news-search-btn');
        
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                this.searchQuery = e.target.value.trim();
                if (this.searchQuery) {
                    this.searchNews(this.searchQuery);
                } else {
                    this.loadInitialNews();
                }
            }, 500);
        });
        
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.searchQuery = e.target.value.trim();
                if (this.searchQuery) {
                    this.searchNews(this.searchQuery);
                } else {
                    this.loadInitialNews();
                }
            }
        });
        
        searchBtn.addEventListener('click', () => {
            this.searchQuery = searchInput.value.trim();
            if (this.searchQuery) {
                this.searchNews(this.searchQuery);
            } else {
                this.loadInitialNews();
            }
        });
        
        // Filters
        document.getElementById('news-filters-toggle')?.addEventListener('click', () => {
            this.toggleFilters();
        });
        
        document.getElementById('news-filter-apply')?.addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('news-filter-clear')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Reading mode
        document.getElementById('news-reading-mode')?.addEventListener('click', () => {
            this.toggleReadingMode();
        });
        
        // Bookmarks
        document.getElementById('news-bookmarks')?.addEventListener('click', () => {
            this.toggleBookmarks();
        });
        
        document.getElementById('news-bookmarks-close')?.addEventListener('click', () => {
            this.toggleBookmarks();
        });
        
        // Modal
        document.getElementById('news-modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        document.getElementById('news-modal-overlay')?.addEventListener('click', (e) => {
            if (e.target.id === 'news-modal-overlay') {
                this.closeModal();
            }
        });
        
        // Scroll to top
        const scrollTopBtn = document.getElementById('news-scroll-top');
        scrollTopBtn?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        window.addEventListener('scroll', () => {
            if (window.scrollY > 500) {
                scrollTopBtn.style.display = 'flex';
            } else {
                scrollTopBtn.style.display = 'none';
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeFilters();
                this.closeBookmarks();
            }
        });
    }
    
    setupIntersectionObserver() {
        const options = {
            root: null,
            rootMargin: '200px',
            threshold: 0.1
        };
        
        this.observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && this.state.status !== 'loading' && this.hasMore) {
                    this.loadMoreArticles();
                }
            });
        }, options);
        
        // Observe the loading element
        const loadingEl = document.getElementById('news-loading');
        if (loadingEl) {
            this.observer.observe(loadingEl);
        }
    }
    
    async loadInitialNews() {
        this.currentCategory = 'all';
        this.currentPage = 1;
        this.hasMore = true;
        this.searchQuery = '';
        
        // DON'T set state here - let fetchNews() handle it
        // This prevents the "already loading" race condition
        
        // Load breaking news first (non-blocking - won't affect main feed)
        this.fetchBreakingNews().catch(error => {
            // Only log if not AbortError (AbortError is expected and harmless)
            if (error.name !== 'AbortError') {
                console.error('[News] Failed to load breaking news:', error);
            }
        });
        
        // Load main feed (this will set state to loading, then success/error/empty)
        try {
            await this.fetchNews();
        } catch (error) {
            // Only handle if not AbortError
            if (error.name !== 'AbortError') {
                console.error('[News] ❌ Failed to load initial news:', error);
                // fetchNews should have already set error state, but double-check
                if (this.state.status === 'loading') {
                    this.setState({ 
                        status: 'error', 
                        error: error.message || 'Failed to load news. Please check your connection and try again.',
                        articles: []
                    });
                }
            }
        }
    }
    
    async fetchBreakingNews() {
        try {
            console.log('[News] 📰 Fetching breaking news...');
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
            
            // Use NewsAPI top headlines for breaking news
            const requestParams = {
                mode: 'top-headlines',
                country: 'in',
                pageSize: 5,
                page: 1
            };
            
            console.log('[News] Breaking news request:', requestParams);
            
            // Build NewsAPI URL with CORS proxy
            const apiUrl = this.buildNewsApiUrl(requestParams);
            console.log('[News] Breaking news URL (proxied):', apiUrl.substring(0, 150) + '...');
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                signal: controller.signal
            });
            clearTimeout(timeoutId);
            
            console.log('[News] Breaking news response status:', response.status);
            
            if (response.ok) {
                const responseText = await response.text();
                console.log('[News] Breaking news raw response (first 500 chars):', responseText.substring(0, 500));
                
                let data;
                try {
                    data = JSON.parse(responseText);
                } catch (parseErr) {
                    console.error('[News] Failed to parse breaking news response:', parseErr);
                    throw new Error('Invalid JSON response from breaking news API');
                }
                
                // CORS proxy wraps response in {contents: "..."}, so parse it
                if (data.contents) {
                    console.log('[News] Breaking news: CORS proxy wrapper detected');
                    try {
                        data = JSON.parse(data.contents);
                    } catch (e) {
                        console.error('[News] Failed to parse CORS proxy response:', e);
                        console.error('[News] Contents:', data.contents?.substring(0, 500));
                        throw new Error('Invalid response from API proxy');
                    }
                }
                
                console.log('[News] Breaking news data received:', {
                    articlesCount: data.articles?.length || 0,
                    status: data.status,
                    code: data.code,
                    message: data.message
                });
                
                // Check for NewsAPI errors
                if (data.status === 'error') {
                    console.error('[News] Breaking news API error:', data);
                    const errorMsg = data.message || data.code || 'Breaking news API error';
                    const ticker = document.getElementById('breaking-news-content');
                    if (ticker) {
                        ticker.innerHTML = `<span style="color: #fbbf24;">⚠️ ${errorMsg}</span>`;
                    }
                    return; // Don't throw, just show error in ticker
                }
                
                if (data.articles && data.articles.length > 0) {
                    const top5 = data.articles.slice(0, 5);
                    this.state.breakingNews = top5;
                    this.updateBreakingNewsTicker(top5);
                    console.log('[News] ✅ Breaking news updated with', top5.length, 'headlines');
                } else {
                    console.warn('[News] ⚠️ Breaking news returned 0 articles');
                    const ticker = document.getElementById('breaking-news-content');
                    if (ticker) {
                        ticker.innerHTML = '<span>No breaking news available at this time</span>';
                    }
                }
            } else {
                const errorData = await response.json().catch(() => ({}));
                console.error('[News] ❌ Breaking news error:', response.status, errorData);
                
                // Parse error if wrapped by CORS proxy
                let errorMsg = `HTTP ${response.status}`;
                if (errorData.contents) {
                    try {
                        const parsed = JSON.parse(errorData.contents);
                        errorMsg = parsed.message || parsed.code || errorMsg;
                    } catch (e) {
                        // Ignore parse errors
                    }
                } else if (errorData.message) {
                    errorMsg = errorData.message;
                } else if (errorData.code) {
                    errorMsg = `NewsAPI Error: ${errorData.code}`;
                }
                
                throw new Error(errorMsg);
            }
        } catch (error) {
            // Ignore AbortError - this is expected when requests are cancelled (switching categories, etc.)
            if (error.name === 'AbortError') {
                // Silently return - AbortError is normal behavior when cancelling requests
                return;
            }
            
            // Only log and show error for actual failures
            console.error('[News] ❌ Breaking news fetch error:', error);
            const ticker = document.getElementById('breaking-news-content');
            if (ticker) {
                ticker.innerHTML = '<span style="color: #fbbf24;">Unable to load breaking news</span>';
            }
            // Don't throw - breaking news failure shouldn't block main feed
        }
    }
    
    updateBreakingNewsTicker(articles) {
        const ticker = document.getElementById('breaking-news-content');
        if (ticker && articles.length > 0) {
            const titles = articles.map(a => this.escapeHtml(a.title)).join(' • ');
            ticker.innerHTML = `<span>${titles}</span>`;
        }
    }
    
    showSkeletonPlaceholders() {
        // Skeleton is already in HTML, just ensure it's visible
        const heroSkeleton = document.querySelector('.news-hero-skeleton');
        const trendingSkeleton = document.querySelectorAll('.news-skeleton-item');
        if (heroSkeleton) heroSkeleton.style.display = 'block';
        trendingSkeleton.forEach(el => el.style.display = 'block');
    }
    
    async switchCategory(category) {
        console.log('[News] 📂 Switching category to:', category);
        
        // Cancel any in-flight request (AbortError will be silently caught)
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null; // Clear reference
        }
        
        this.currentCategory = category;
        this.currentPage = 1;
        this.searchQuery = ''; // Clear search when switching category
        this.hasMore = true;
        
        // Update section title
        const titleMap = {
            'all': 'All News',
            'top-headlines': 'Top Headlines',
            'world': 'World News',
            'india': 'India News',
            'business': 'Business',
            'technology': 'Technology',
            'science': 'Science',
            'health': 'Health',
            'sports': 'Sports',
            'entertainment': 'Entertainment'
        };
        
        const titleEl = document.getElementById('news-section-title');
        if (titleEl) {
            titleEl.textContent = titleMap[category] || 'News';
        }
        
        // Clear old content
        const container = document.getElementById('news-articles-grid');
        if (container) {
            container.innerHTML = '';
        }
        
        await this.fetchNews();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    async searchNews(query) {
        console.log('[News] 🔍 Searching for:', query);
        
        // Cancel any in-flight request (this will cause AbortError - that's expected and normal)
        if (this.abortController) {
            this.abortController.abort();
            this.abortController = null; // Clear reference
            // AbortError will be silently caught in fetchNews() - this is normal behavior
        }
        
        // If query is empty, revert to All News
        if (!query || query.trim() === '') {
            this.searchQuery = '';
            this.switchCategory('all');
            return;
        }
        
        this.searchQuery = query.trim();
        this.currentPage = 1;
        this.hasMore = true;
        this.currentCategory = 'all';
        
        const titleEl = document.getElementById('news-section-title');
        if (titleEl) {
            titleEl.textContent = `Search: ${this.searchQuery}`;
        }
        
        // Clear old content
        const container = document.getElementById('news-articles-grid');
        if (container) {
            container.innerHTML = '';
        }
        
        await this.fetchNews({ mode: 'search', q: this.searchQuery });
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
    
    setLanguage(lang) {
        if (!['en', 'hi', 'ta'].includes(lang)) {
            console.warn('[News] Invalid language:', lang);
            return;
        }
        
        console.log('[News] 🌐 Setting language to:', lang);
        this.currentLanguage = lang;
        this.saveLanguage(lang);
        
        // Re-fetch current view with new language
        if (this.searchQuery) {
            this.searchNews(this.searchQuery);
        } else {
            this.switchCategory(this.currentCategory);
        }
    }
    
    async fetchNews(params = {}) {
        // Prevent concurrent fetches - but allow if we're in error/empty state
        if (this.state.status === 'loading') {
            console.warn('[News] ⚠️ Already loading, ignoring duplicate request');
            console.warn('[News] Stack trace:', new Error().stack);
            return;
        }
        
        console.log('[News] 📡 fetchNews() called with params:', params);
        console.log('[News] Current state:', this.state.status);
        
        // SET STATE TO LOADING - triggers render()
        // Clear any previous errors
        this.setState({ status: 'loading', error: null, articles: [] });
        
        // SET HARD TIMEOUT - CRITICAL FIX (15 seconds - increased for CORS proxy)
        this.timeoutId = setTimeout(() => {
            console.error('[News] ⏱️ HARD TIMEOUT (15s) - Forcing error state');
            this.setState({ 
                status: 'error', 
                error: 'Request timeout. The news API took too long to respond. This usually means:\n\n1. NewsAPI.org is blocking browser requests (free tier restriction)\n2. CORS proxy is slow or unavailable\n3. Your internet connection is slow\n\n**Solution:** NewsAPI.org free tier requires server-side requests. Consider using a backend proxy or upgrading your NewsAPI plan.',
                articles: []
            });
        }, 15000); // Increased to 15 seconds for CORS proxy
        
        try {
            // Build NewsAPI request parameters
            const requestParams = this.buildNewsApiParams({
                ...params,
                category: this.currentCategory,
                lang: this.currentLanguage
            });
            
            // Build cache key
            const cacheKey = JSON.stringify(requestParams);
            
            // Check cache only if not searching (search should be fresh)
            if (!this.searchQuery) {
                const cached = this.cache.get(cacheKey);
                if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
                    console.log('[News] Using cached data');
                    // Update state from cache
                    if (cached.data.articles && cached.data.articles.length > 0) {
                        this.setState({ 
                            status: 'success', 
                            articles: cached.data.articles,
                            error: null
                        });
                    } else {
                        this.setState({ 
                            status: 'empty', 
                            articles: [],
                            error: null
                        });
                    }
                    return;
                }
            }
            
            console.log('[News] 📡 Fetching from NewsAPI.org:', requestParams);
            this.updateDebugInfo({
                lastRequest: JSON.stringify(requestParams, null, 2)
            });
            
            // Create abort controller for this request
            this.abortController = new AbortController();
            const fetchTimeoutId = setTimeout(() => this.abortController.abort(), 30000); // 30s fetch timeout
            
            // Build NewsAPI.org URL with CORS proxy (NO SERVER NEEDED)
            const apiUrl = this.buildNewsApiUrl(requestParams);
            console.log('[News] NewsAPI.org URL (proxied):', apiUrl.substring(0, 200) + '...');
            console.log('[News] Full API URL (first 300 chars):', apiUrl.substring(0, 300));
            console.log('[News] Request params:', JSON.stringify(requestParams, null, 2));
            
            let response;
            let lastError = null;
            let triedProxies = 0;
            const maxProxyRetries = this.corsProxies.length;
            
            // Try each CORS proxy until one works
            while (triedProxies < maxProxyRetries) {
                try {
                    const currentApiUrl = this.buildNewsApiUrl(requestParams, this.currentProxyIndex);
                    console.log(`[News] 🔄 Trying proxy ${this.currentProxyIndex + 1}/${maxProxyRetries}: ${this.corsProxies[this.currentProxyIndex].substring(0, 50)}...`);
                    
                    response = await Promise.race([
                        fetch(currentApiUrl, {
                            method: 'GET',
                            signal: this.abortController.signal,
                            headers: {
                                'Accept': 'application/json'
                            }
                        }),
                        new Promise((_, reject) => 
                            setTimeout(() => reject(new Error('Proxy timeout')), 12000)
                        )
                    ]);
                    
                    clearTimeout(fetchTimeoutId);
                    clearTimeout(this.timeoutId); // Clear hard timeout
                    this.timeoutId = null;
                    console.log('[News] ✅ Response received! Status:', response.status, response.statusText);
                    break; // Success, exit retry loop
                    
                } catch (fetchError) {
                    triedProxies++;
                    lastError = fetchError;
                    
                    // Ignore aborted requests (user switched category/search) - THIS IS EXPECTED AND NORMAL
                    if (fetchError.name === 'AbortError') {
                        // CRITICAL: Clear loading state when aborting, otherwise we get stuck!
                        if (this.state.status === 'loading') {
                            console.log('[News] ⚠️ Request aborted while loading - resetting state to idle');
                            this.setState({ status: 'idle', articles: [], error: null });
                        }
                        return;
                    }
                    
                    console.error(`[News] ❌ Proxy ${this.currentProxyIndex + 1} failed:`, fetchError.message);
                    
                    // Try next proxy if available
                    if (triedProxies < maxProxyRetries) {
                        this.tryNextProxy();
                        continue; // Try next proxy
                    } else {
                        // All proxies failed
                        clearTimeout(fetchTimeoutId);
                        clearTimeout(this.timeoutId);
                        this.timeoutId = null;
                        
                        let errorMsg = 'Network error';
                        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('network') || fetchError.message.includes('timeout')) {
                            errorMsg = `Cannot connect to NewsAPI.org. All CORS proxies failed.

⚠️ **POSSIBLE SOLUTIONS:**

1. **Check your internet connection**
2. **NewsAPI.org blocks browser requests** - You may need to:
   - Use a backend server to proxy requests
   - Or use a different news API that allows browser requests
3. **Try refreshing the page** - Sometimes proxies are temporarily unavailable
4. **Check your API key** - Make sure it's valid at newsapi.org

**Note:** NewsAPI.org free tier has restrictions on browser requests. Consider using a backend proxy server.`;
                        } else {
                            errorMsg = `Network error: ${fetchError.message}`;
                        }
                        
                        // SET STATE TO ERROR - DO NOT THROW
                        console.error('[News] 🔴 SETTING ERROR STATE:', errorMsg);
                        this.setState({ 
                            status: 'error', 
                            error: errorMsg,
                            articles: []
                        });
                        this.updateDebugInfo({
                            lastError: errorMsg,
                            lastRequest: 'Failed',
                            lastResponse: '0 articles'
                        });
                        return; // Exit - don't throw
                    }
                }
            }
            
            // If we got here but no response, something went wrong
            if (!response) {
                clearTimeout(fetchTimeoutId);
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
                const errorMsg = 'Failed to get response from any CORS proxy';
                this.setState({ 
                    status: 'error', 
                    error: errorMsg,
                    articles: []
                });
                return;
            }
            
            if (!response.ok) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
                
                let errorData;
                try {
                    errorData = await response.json();
                    // CORS proxy wraps response
                    if (errorData.contents) {
                        try {
                            errorData = JSON.parse(errorData.contents);
                        } catch (e) {
                            errorData = { status: 'error', message: `HTTP ${response.status}: ${response.statusText}` };
                        }
                    }
                } catch (parseError) {
                    errorData = { status: 'error', message: `HTTP ${response.status}: ${response.statusText}` };
                }
                
                const errorMsg = errorData.message || errorData.error || `API error: ${response.status}`;
                console.error('[News] ❌ API error:', response.status, errorData);
                
                // SET STATE TO ERROR
                this.setState({ 
                    status: 'error', 
                    error: errorMsg,
                    articles: []
                });
                this.updateDebugInfo({
                    lastError: errorMsg,
                    lastRequest: 'Failed',
                    lastResponse: `HTTP ${response.status}`
                });
                return; // Exit - don't throw
            }
            
            let data;
            try {
                const responseText = await response.text();
                console.log('[News] Raw response (first 500 chars):', responseText.substring(0, 500));
                
                try {
                    data = JSON.parse(responseText);
                } catch (parseErr) {
                    console.error('[News] Failed to parse response as JSON:', parseErr);
                    console.error('[News] Response text:', responseText);
                    throw new Error('Invalid JSON response from API');
                }
                
                // CORS proxy wraps response in {contents: "..."}, so parse it
                if (data.contents) {
                    console.log('[News] CORS proxy wrapper detected, parsing contents...');
                    try {
                        const parsedContents = JSON.parse(data.contents);
                        console.log('[News] Parsed contents:', {
                            status: parsedContents.status,
                            articlesCount: parsedContents.articles?.length || 0
                        });
                        data = parsedContents;
                    } catch (e) {
                        console.error('[News] Failed to parse CORS proxy response contents:', e);
                        console.error('[News] Contents value:', data.contents?.substring(0, 500));
                        throw new Error('Invalid response from API proxy');
                    }
                }
                
                console.log('[News] 📦 Response data:', {
                    status: data.status,
                    totalResults: data.totalResults,
                    totalArticles: data.totalArticles,
                    articlesCount: data.articles?.length || 0,
                    code: data.code,
                    message: data.message
                });
                
                // Log full response for debugging
                if (data.status === 'error') {
                    console.error('[News] ❌ NewsAPI Error Response:', JSON.stringify(data, null, 2));
                }
            } catch (parseError) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
                
                console.error('[News] ❌ Failed to parse response:', parseError);
                
                // SET STATE TO ERROR
                this.setState({ 
                    status: 'error', 
                    error: 'Invalid response from NewsAPI.org. Please try again.',
                    articles: []
                });
                this.updateDebugInfo({
                    lastError: parseError.message,
                    lastRequest: 'Failed',
                    lastResponse: 'Parse error'
                });
                return; // Exit - don't throw
            }
            
            // Clear timeout on success
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            
            // Check for NewsAPI errors
            if (data.status === 'error') {
                let errorMsg = data.message || data.code || 'Unknown error from NewsAPI.org';
                
                // Provide helpful error messages for common issues
                if (data.code === 'apiKeyInvalid' || data.code === 'apiKeyMissing') {
                    errorMsg = 'Invalid or missing NewsAPI.org API key. Please check your API key configuration.';
                } else if (data.code === 'rateLimited') {
                    errorMsg = 'NewsAPI.org rate limit exceeded. Please try again later.';
                } else if (data.code === 'sourcesTooMany') {
                    errorMsg = 'Too many sources requested. Please refine your search.';
                } else if (data.message && data.message.includes('CORS')) {
                    errorMsg = 'CORS error: NewsAPI.org requires server-side requests. The CORS proxy may not be working.';
                }
                
                console.error('[News] ❌ NewsAPI error:', data);
                
                // SET STATE TO ERROR
                this.setState({ 
                    status: 'error', 
                    error: errorMsg,
                    articles: []
                });
                this.updateDebugInfo({
                    lastError: errorMsg,
                    lastRequest: 'Failed',
                    lastResponse: `Error: ${data.code || 'unknown'}`
                });
                return; // Exit - don't throw
            }
            
            // Validate articles array (NewsAPI uses 'articles')
            const articles = data.articles || [];
            const articleCount = articles.length;
            
            console.log('[News] ✅ API call successful! Received', articleCount, 'articles');
            console.log('[News] 📋 First article:', articles[0]?.title || 'N/A');
            
            this.updateDebugInfo({
                lastRequest: 'Success',
                lastResponse: `${articleCount} articles`,
                totalResults: data.totalResults || articleCount,
                currentPage: this.currentPage
            });
            
            // SET STATE BASED ON RESULTS - CRITICAL
            if (articleCount === 0) {
                console.warn('[News] ⚠️ No articles in response - setting state to empty');
                this.setState({ 
                    status: 'empty', 
                    articles: [],
                    error: null
                });
            } else {
                // Normalize article format (NewsAPI uses 'urlToImage', ensure it's always present)
                const normalizedArticles = articles.map(article => ({
                    ...article,
                    urlToImage: article.urlToImage || article.image || '',
                    publishedAt: article.publishedAt || article.pubDate || ''
                }));
                
                console.log('[News] ✅ Normalized', normalizedArticles.length, 'articles');
                console.log('[News] 📋 Sample normalized article:', normalizedArticles[0]?.title || 'N/A');
                
                // Cache response (only if not searching)
                if (!this.searchQuery) {
                    this.cache.set(cacheKey, {
                        data: { ...data, articles: normalizedArticles },
                        timestamp: Date.now()
                    });
                }
                
                // CRITICAL: Set both state.articles AND this.articles BEFORE setState
                this.articles = normalizedArticles;
                
                // SET STATE TO SUCCESS - this will trigger render()
                this.setState({ 
                    status: 'success', 
                    articles: normalizedArticles,
                    error: null
                });
                
                // Update derived state
                this.totalResults = data.totalArticles || articleCount;
                this.hasMore = articleCount >= this.pageSize;
                
                // FORCE IMMEDIATE RENDER - don't wait for state machine
                console.log('[News] 🚀 FORCING IMMEDIATE RENDER...');
                setTimeout(() => {
                    console.log('[News] 🔄 Force rendering articles...');
                    if (this.articles && this.articles.length > 0) {
                        // Render featured and trending for first page
                        if (this.currentPage === 1) {
                            if (this.articles[0]) {
                                this.featuredArticle = this.articles[0];
                                this.renderFeaturedArticle();
                                console.log('[News] ✅ Force-rendered featured article');
                            }
                            if (this.articles.length > 1) {
                                this.trendingArticles = this.articles.slice(1, 4);
                                this.renderTrendingArticles();
                                console.log('[News] ✅ Force-rendered trending articles');
                            }
                        }
                        // Render main grid
                        this.renderArticles(true);
                        console.log('[News] ✅ Force-rendered', this.articles.length, 'articles to grid');
                    } else {
                        console.error('[News] ❌ No articles to render in force render!');
                    }
                }, 50);
            }
            
        } catch (error) {
            // Clear timeout on catch
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            
            console.error('[News] ❌ Fetch error:', error);
            console.error('[News] Error stack:', error.stack);
            
            const errorMsg = error.message || 'Failed to fetch news. Please check your connection and try again.';
            
            // SET STATE TO ERROR - CRITICAL: Always set error state
            console.error('[News] 🔴 Setting state to ERROR:', errorMsg);
            this.setState({ 
                status: 'error', 
                error: errorMsg,
                articles: []
            });
            this.updateDebugInfo({
                lastError: errorMsg,
                lastRequest: 'Failed',
                lastResponse: '0 articles'
            });
        } finally {
            // CRITICAL: Always clear timeout and abort controller
            if (this.timeoutId) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
            
            // Ensure state is never stuck in loading
            if (this.state.status === 'loading') {
                console.error('[News] ⚠️ WARNING: State still loading after fetchNews completed! Forcing error state.');
                this.setState({ 
                    status: 'error', 
                    error: 'Request did not complete. Please check your internet connection and try again.',
                    articles: []
                });
            }
            
            console.log('[News] 🔄 fetchNews() complete. Final state:', this.state.status);
        }
    }
    
    handleNewsResponse(data) {
        console.log('[News] ===== handleNewsResponse START =====');
        console.log('[News] Data received:', {
            hasArticles: !!data.articles,
            articlesCount: data.articles?.length || 0,
            totalResults: data.totalResults || 0,
            status: data.status,
            error: data.error
        });
        
        const newArticles = data.articles || [];
        this.totalResults = data.totalResults || 0;
        const totalPages = data.totalPages || Math.ceil(this.totalResults / this.pageSize);
        
        console.log('[News] Parsed:', {
            newArticlesCount: newArticles.length,
            totalResults: this.totalResults,
            currentPage: this.currentPage,
            totalPages: totalPages
        });
        
        // Update debug info
        this.updateDebugInfo({
            lastRequest: 'Success',
            lastResponse: `${newArticles.length} articles`,
            totalResults: this.totalResults,
            currentPage: this.currentPage,
            maxPages: totalPages,
            lastError: null
        });
        
        if (newArticles.length === 0 && this.currentPage === 1) {
            console.warn('[News] ⚠️ No articles received on first page - showing empty state');
            this.showEmptyState();
            return;
        }
        
        if (newArticles.length === 0) {
            console.warn('[News] ⚠️ No articles in response - returning early');
            return;
        }
        
        console.log('[News] Processing', newArticles.length, 'new articles...');
        
        if (this.currentPage === 1) {
            this.articles = newArticles;
            console.log('[News] Set', this.articles.length, 'articles on page 1');
            
            // Hide skeleton placeholders
            const heroSkeleton = document.querySelector('.news-hero-skeleton');
            if (heroSkeleton) heroSkeleton.style.display = 'none';
            document.querySelectorAll('.news-skeleton-item').forEach(el => {
                el.style.display = 'none';
            });
            
            // Set featured article (first article)
            if (newArticles.length > 0) {
                this.featuredArticle = newArticles[0];
                this.renderFeaturedArticle();
            }
            
            // Set trending articles (next 3)
            if (newArticles.length > 1) {
                this.trendingArticles = newArticles.slice(1, 4);
                this.renderTrendingArticles();
            }
        } else {
            this.articles.push(...newArticles);
        }
        
        // Check if has more (with safety cap of 20 pages)
        const maxPages = Math.min(totalPages, 20);
        this.hasMore = this.articles.length < this.totalResults && this.currentPage < maxPages;
        
        // CRITICAL: ALWAYS hide loading before rendering
        this.hideLoading();
        this.isLoading = false;
        
        console.log('[News] 📝 About to render', this.articles.length, 'articles. Clear:', this.currentPage === 1);
        
        // Render articles - this MUST happen
        this.renderArticles(this.currentPage === 1);
        
        // Verify articles were actually rendered
        const container = document.getElementById('news-articles-grid');
        const renderedCards = container ? container.querySelectorAll('.news-article-card').length : 0;
        console.log('[News] ✅ Verification: DOM has', renderedCards, 'article cards');
        
        if (renderedCards === 0 && this.articles.length > 0) {
            console.error('[News] ⚠️ WARNING: Articles exist but were not rendered! Forcing re-render...');
            // Force re-render immediately
            setTimeout(() => {
                console.log('[News] 🔄 Force re-rendering articles...');
                this.renderArticles(true);
            }, 100);
        }
        
        // Update count
        const countEl = document.getElementById('news-articles-count');
        if (countEl) {
            const countText = `${this.articles.length}${this.totalResults > this.articles.length ? ` of ${this.totalResults}` : ''} articles`;
            countEl.textContent = countText;
            console.log('[News] ✅ Updated article count:', countText);
        }
        
        // Show end message if no more
        const endMsg = document.getElementById('news-end-message');
        if (!this.hasMore && this.articles.length > 0 && endMsg) {
            endMsg.style.display = 'block';
            endMsg.innerHTML = '<p>You\'ve reached the end of available results. 🎉</p>';
        } else if (endMsg) {
            endMsg.style.display = 'none';
        }
        
        console.log('[News] ✅ handleNewsResponse COMPLETE - Articles rendered:', renderedCards, 'cards in DOM');
    }
    
    async loadMoreArticles() {
        if (!this.hasMore || this.state.status === 'loading') {
            console.log('[News] ⚠️ Cannot load more - hasMore:', this.hasMore, 'status:', this.state.status);
            return;
        }
        
        this.currentPage++;
        console.log('[News] 📄 Loading more articles - page', this.currentPage);
        await this.fetchNews();
    }
    
    renderFeaturedArticle() {
        if (!this.featuredArticle) return;
        
        const container = document.getElementById('news-hero-main');
        const article = this.featuredArticle;
        
        // Normalize image field (NewsAPI uses 'urlToImage')
        const imageUrl = article.urlToImage || article.image || '';
        
        container.innerHTML = `
            <article class="news-hero-card" onclick="newsApp.openArticle(${JSON.stringify(article).replace(/"/g, '&quot;')})">
                ${imageUrl ? `
                    <div class="news-hero-image">
                        <img src="${imageUrl}" alt="${this.escapeHtml(article.title)}" loading="lazy" onerror="this.style.display='none'">
                        <div class="news-hero-overlay"></div>
                    </div>
                ` : ''}
                <div class="news-hero-content-inner">
                    <div class="news-hero-meta">
                        <span class="news-hero-source">${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                        <span class="news-hero-time">${this.formatTime(article.publishedAt)}</span>
                    </div>
                    <h1 class="news-hero-title">${this.escapeHtml(article.title)}</h1>
                    <p class="news-hero-description">${this.escapeHtml(article.description || '')}</p>
                    <button class="news-hero-read-btn">
                        Read Full Article
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                            <polyline points="12 5 19 12 12 19"></polyline>
                        </svg>
                    </button>
                </div>
            </article>
        `;
    }
    
    renderTrendingArticles() {
        const container = document.getElementById('news-trending-list');
        
        if (this.trendingArticles.length === 0) {
            container.innerHTML = '<div class="news-empty-state">No trending articles</div>';
            return;
        }
        
        container.innerHTML = this.trendingArticles.map(article => {
            const articleSafe = JSON.stringify(article).replace(/"/g, '&quot;');
            return `
            <article class="news-trending-item" onclick="newsApp.openArticleFromString('${articleSafe}')">
                <div class="news-trending-content">
                    <h4 class="news-trending-title">${this.escapeHtml(article.title)}</h4>
                    <div class="news-trending-meta">
                        <span>${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                        <span>•</span>
                        <span>${this.formatTime(article.publishedAt)}</span>
                    </div>
                </div>
            </article>
            `;
        }).join('');
    }
    
    // FORCE RENDER - bypasses state machine, directly renders articles
    forceRenderArticles(articles) {
        console.log('[News] 🔥 FORCE RENDERING', articles.length, 'articles...');
        
        if (!articles || articles.length === 0) {
            console.warn('[News] ⚠️ No articles to force render');
            return;
        }
        
        // Set articles
        this.articles = articles;
        
        // Render featured and trending
        if (this.currentPage === 1 && articles.length > 0) {
            this.featuredArticle = articles[0];
            this.renderFeaturedArticle();
            
            if (articles.length > 1) {
                this.trendingArticles = articles.slice(1, 4);
                this.renderTrendingArticles();
            }
        }
        
        // Render main grid
        this.renderArticles(true);
    }
    
    renderArticles(clear = false) {
        const container = document.getElementById('news-articles-grid');
        
        if (!container) {
            console.error('[News] ❌ Articles grid container not found!');
            return;
        }
        
        console.log('[News] 🎨 renderArticles called. Clear:', clear, 'Total articles:', this.articles.length);
        
        // ALWAYS hide loading when rendering
        this.hideLoading();
        this.isLoading = false;
        
        if (clear) {
            container.innerHTML = '';
            console.log('[News] ✅ Cleared container');
        }
        
        const startIndex = clear ? 0 : container.children.length;
        const articlesToRender = this.articles.slice(startIndex);
        
        console.log('[News] Rendering', articlesToRender.length, 'articles starting from index', startIndex);
        
        if (articlesToRender.length === 0) {
            console.warn('[News] ⚠️ No articles to render! Total articles array:', this.articles.length);
            
            // If we have no articles and this is the first page, show empty state
            if (this.currentPage === 1 && this.articles.length === 0) {
                console.log('[News] Showing empty state...');
                this.showEmptyState();
            }
            return;
        }
        
        let renderedCount = 0;
        articlesToRender.forEach((article, index) => {
            try {
                if (!article || !article.title) {
                    console.warn('[News] ⚠️ Invalid article at index', index, article);
                    return;
                }
                
                const articleEl = this.createArticleCard(article, startIndex + index);
                if (articleEl) {
                    container.appendChild(articleEl);
                    renderedCount++;
                } else {
                    console.error('[News] ❌ Failed to create card for article:', article.title);
                }
            } catch (error) {
                console.error('[News] ❌ Error creating article card:', error, article);
            }
        });
        
        console.log('[News] ✅ Added', renderedCount, 'article cards to DOM. Container now has', container.children.length, 'children');
        
        // CRITICAL: Force visibility on rendered cards
        if (renderedCount > 0) {
            setTimeout(() => {
                container.querySelectorAll('.news-article-card').forEach((card, idx) => {
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                    card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
                    card.style.display = 'block';
                    card.style.visibility = 'visible';
                });
            }, 10);
        }
        
        // Hide skeletons
        const heroSkeleton = document.querySelector('.news-hero-skeleton');
        if (heroSkeleton && renderedCount > 0) {
            heroSkeleton.style.display = 'none';
        }
        document.querySelectorAll('.news-skeleton-item, .news-skeleton-loader, .news-loading').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // If we rendered articles, make sure error and empty states are hidden
        if (renderedCount > 0) {
            const errorState = container.querySelector('.news-error-state');
            if (errorState) {
                errorState.remove();
            }
            const emptyState = container.querySelector('.news-empty-state');
            if (emptyState) {
                emptyState.remove();
            }
        }
        
        // VERIFY RENDERING SUCCESS - CRITICAL CHECK
        const finalCardCount = container.querySelectorAll('.news-article-card').length;
        if (finalCardCount > 0) {
            console.log('[News] ✅✅✅ SUCCESS: Articles are visible in DOM!', finalCardCount, 'cards');
        } else if (this.articles.length > 0) {
            console.error('[News] ❌❌❌ CRITICAL: Articles exist but NOT rendered! Emergency fallback...');
            // Emergency fallback: render ALL articles directly
            container.innerHTML = ''; // Clear everything
            this.articles.forEach((article, idx) => {
                if (article && article.title) {
                    const card = this.createArticleCard(article, idx);
                    if (card) {
                        card.style.opacity = '1';
                        card.style.transform = 'translateY(0)';
                        container.appendChild(card);
                    }
                }
            });
            console.log('[News] ✅ Emergency render complete:', container.children.length, 'cards');
        }
        
        // Update observer target
        const loadingEl = document.getElementById('news-loading');
        if (renderedCount > 0 && this.hasMore && loadingEl && this.observer) {
            this.observer.observe(loadingEl);
        }
        
        // Final verification
        if (renderedCount === 0 && articlesToRender.length > 0) {
            console.error('[News] ❌ CRITICAL: Failed to render any articles!');
        }
    }
    
    createArticleCard(article, index) {
        const card = document.createElement('article');
        card.className = 'news-article-card';
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        const isBookmarked = this.bookmarks.some(b => b.url === article.url);
        
        const articleSafe = JSON.stringify(article).replace(/"/g, '&quot;');
        
        // Normalize image field (NewsAPI uses 'urlToImage')
        const imageUrl = article.urlToImage || article.image || '';
        
        card.innerHTML = `
            ${imageUrl ? `
                <div class="news-article-image">
                    <img src="${imageUrl}" alt="${this.escapeHtml(article.title)}" loading="lazy" onerror="this.style.display='none'">
                    <div class="news-article-overlay"></div>
                </div>
            ` : ''}
            <div class="news-article-content">
                <div class="news-article-header">
                    <span class="news-article-source">${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                    <div class="news-article-actions">
                        <button class="news-article-bookmark ${isBookmarked ? 'active' : ''}" 
                                data-article-url="${article.url}"
                                onclick="event.stopPropagation(); newsApp.toggleBookmarkFromCard('${articleSafe}')"
                                aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark article'}">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                        <button class="news-article-share" 
                                onclick="event.stopPropagation(); newsApp.shareArticleFromCard('${articleSafe}')"
                                aria-label="Share article">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <h3 class="news-article-title">${this.escapeHtml(article.title)}</h3>
                <p class="news-article-description">${this.escapeHtml(article.description || '')}</p>
                <div class="news-article-footer">
                    <span class="news-article-time">${this.formatTime(article.publishedAt)}</span>
                    <button class="news-article-read-btn">Read More</button>
                </div>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            // Only open if not clicking on buttons
            if (!e.target.closest('.news-article-actions')) {
                this.openArticle(article);
            }
        });
        
        // Animate in
        setTimeout(() => {
            card.style.transition = 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 50);
        
        return card;
    }
    
    openArticle(article) {
        if (!article || !article.url) {
            console.error('Invalid article:', article);
            return;
        }
        
        const modal = document.getElementById('news-modal-overlay');
        const content = document.getElementById('news-modal-content');
        
        if (!modal || !content) {
            console.error('Modal elements not found');
            return;
        }
        
        // Track view
        this.trackView(article);
        
        // Escape article for safe JSON embedding
        const articleSafe = JSON.stringify(article).replace(/"/g, '&quot;');
        const isBookmarked = this.bookmarks.some(b => b.url === article.url);
        
        // Normalize image field
        const imageUrl = article.urlToImage || article.image || '';
        
        content.innerHTML = `
            <div class="news-modal-article">
                ${imageUrl ? `
                    <div class="news-modal-image">
                        <img src="${imageUrl}" alt="${this.escapeHtml(article.title)}" onerror="this.style.display='none'">
                    </div>
                ` : ''}
                <div class="news-modal-header">
                    <div class="news-modal-meta">
                        <span class="news-modal-source">${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                        <span class="news-modal-time">${this.formatTime(article.publishedAt)}</span>
                    </div>
                    <div class="news-modal-actions">
                        <button class="news-modal-bookmark ${isBookmarked ? 'active' : ''}" 
                                onclick="newsApp.toggleBookmarkFromModal('${articleSafe}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                                <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                            </svg>
                        </button>
                        <button class="news-modal-share" onclick="newsApp.shareArticleFromModal('${articleSafe}')">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="18" cy="5" r="3"></circle>
                                <circle cx="6" cy="12" r="3"></circle>
                                <circle cx="18" cy="19" r="3"></circle>
                                <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                                <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <h1 class="news-modal-title">${this.escapeHtml(article.title)}</h1>
                <div class="news-modal-body">
                    <p class="news-modal-description">${this.escapeHtml(article.description || '')}</p>
                    ${article.content ? `
                        <div class="news-modal-content-text">
                            ${this.escapeHtml(article.content.split('…')[0] || article.content)}
                        </div>
                    ` : ''}
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-modal-link">
                        Read full article on ${this.escapeHtml(article.source?.name || 'source')}
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </a>
                </div>
            </div>
        `;
        
        modal.setAttribute('aria-hidden', 'false');
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Animate in
        setTimeout(() => {
            const modalInner = modal.querySelector('.news-modal');
            if (modalInner) {
                modalInner.style.opacity = '1';
                modalInner.style.transform = 'scale(1)';
            }
        }, 10);
    }
    
    toggleBookmarkFromModal(articleStr) {
        try {
            const article = JSON.parse(articleStr.replace(/&quot;/g, '"'));
            this.toggleBookmark(article);
            
            // Update modal button
            const btn = document.querySelector('.news-modal-bookmark');
            const isBookmarked = this.bookmarks.some(b => b.url === article.url);
            btn.classList.toggle('active', isBookmarked);
            btn.querySelector('svg').setAttribute('fill', isBookmarked ? 'currentColor' : 'none');
        } catch (e) {
            console.error('Error toggling bookmark from modal:', e);
        }
    }
    
    shareArticleFromModal(articleStr) {
        try {
            const article = JSON.parse(articleStr.replace(/&quot;/g, '"'));
            this.shareArticle(article);
        } catch (e) {
            console.error('Error sharing from modal:', e);
        }
    }
    
    closeModal() {
        const modal = document.getElementById('news-modal-overlay');
        const modalInner = modal.querySelector('.news-modal');
        
        modalInner.style.opacity = '0';
        modalInner.style.transform = 'scale(0.95)';
        
        setTimeout(() => {
            modal.setAttribute('aria-hidden', 'true');
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }, 200);
    }
    
    toggleBookmark(article) {
        const index = this.bookmarks.findIndex(b => b.url === article.url);
        
        if (index > -1) {
            this.bookmarks.splice(index, 1);
            this.saveBookmarks();
            this.showNotification('Article removed from bookmarks');
        } else {
            this.bookmarks.push({
                title: article.title,
                description: article.description,
                url: article.url,
                urlToImage: article.urlToImage || article.image || '',
                image: article.image || article.urlToImage || '',
                source: article.source,
                publishedAt: article.publishedAt,
                bookmarkedAt: Date.now()
            });
            this.saveBookmarks();
            this.showNotification('Article bookmarked!');
        }
        
        // Update UI
        this.updateBookmarkButtons(article.url);
        this.renderBookmarks();
    }
    
    toggleBookmarkFromCard(articleStr) {
        try {
            const article = JSON.parse(articleStr.replace(/&quot;/g, '"'));
            this.toggleBookmark(article);
        } catch (e) {
            console.error('Error toggling bookmark from card:', e);
        }
    }
    
    shareArticleFromCard(articleStr) {
        try {
            const article = JSON.parse(articleStr.replace(/&quot;/g, '"'));
            this.shareArticle(article);
        } catch (e) {
            console.error('Error sharing from card:', e);
        }
    }
    
    updateBookmarkButtons(url) {
        const isBookmarked = this.bookmarks.some(b => b.url === url);
        document.querySelectorAll(`[data-article-url="${url}"]`).forEach(btn => {
            btn.classList.toggle('active', isBookmarked);
        });
    }
    
    shareArticle(article) {
        if (navigator.share) {
            navigator.share({
                title: article.title,
                text: article.description,
                url: article.url
            }).catch(() => {});
        } else {
            // Fallback: copy to clipboard
            navigator.clipboard.writeText(article.url).then(() => {
                this.showNotification('Link copied to clipboard!');
            });
        }
    }
    
    toggleBookmarks() {
        const panel = document.getElementById('news-bookmarks-panel');
        const isHidden = panel.getAttribute('aria-hidden') === 'true';
        
        panel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
        if (isHidden) {
            this.renderBookmarks();
        }
    }
    
    renderBookmarks() {
        const container = document.getElementById('news-bookmarks-content');
        
        if (this.bookmarks.length === 0) {
            container.innerHTML = '<div class="news-empty-state">No bookmarks yet. Save articles to read later!</div>';
            return;
        }
        
        container.innerHTML = this.bookmarks.map((article, index) => {
            const articleSafe = JSON.stringify(article).replace(/"/g, '&quot;');
            return `
            <article class="news-bookmark-item" onclick="newsApp.openArticleFromString('${articleSafe}')">
                ${(article.urlToImage || article.image) ? `
                    <div class="news-bookmark-image">
                        <img src="${article.urlToImage || article.image}" alt="${this.escapeHtml(article.title)}" loading="lazy">
                    </div>
                ` : ''}
                <div class="news-bookmark-content">
                    <h4 class="news-bookmark-title">${this.escapeHtml(article.title)}</h4>
                    <div class="news-bookmark-meta">
                        <span>${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                        <span>•</span>
                        <span>${this.formatTime(article.publishedAt)}</span>
                    </div>
                    <button class="news-bookmark-remove" 
                            onclick="event.stopPropagation(); newsApp.toggleBookmark(${JSON.stringify(article).replace(/"/g, '&quot;')})">
                        Remove
                    </button>
                </div>
            </article>
        `;
        }).join('');
    }
    
    toggleFilters() {
        const panel = document.getElementById('news-filters-panel');
        const isHidden = panel.getAttribute('aria-hidden') === 'true';
        panel.setAttribute('aria-hidden', isHidden ? 'false' : 'true');
    }
    
    closeFilters() {
        document.getElementById('news-filters-panel').setAttribute('aria-hidden', 'true');
    }
    
    applyFilters() {
        this.filters.source = document.getElementById('news-filter-source').value;
        this.filters.location = document.getElementById('news-filter-location').value;
        this.filters.sortBy = document.getElementById('news-filter-sort').value;
        this.filters.dateRange = document.getElementById('news-filter-date').value;
        
        this.currentPage = 1;
        this.articles = [];
        this.hasMore = true;
        
        this.fetchNews();
        this.closeFilters();
    }
    
    clearFilters() {
        document.getElementById('news-filter-source').value = 'all';
        document.getElementById('news-filter-location').value = 'all';
        document.getElementById('news-filter-sort').value = 'publishedAt';
        document.getElementById('news-filter-date').value = 'all';
        
        this.filters = {
            source: 'all',
            location: 'all',
            sortBy: 'publishedAt',
            dateRange: 'all'
        };
        
        this.applyFilters();
    }
    
    toggleReadingMode() {
        this.readingMode = !this.readingMode;
        document.body.classList.toggle('reading-mode', this.readingMode);
        document.getElementById('news-reading-mode').classList.toggle('active', this.readingMode);
    }
    
    closeBookmarks() {
        document.getElementById('news-bookmarks-panel').setAttribute('aria-hidden', 'true');
    }
    
    updateBreakingNews(article) {
        // This is now handled by updateBreakingNewsTicker
        if (article) {
            this.updateBreakingNewsTicker([article]);
        }
    }
    
    refreshNews() {
        this.cache.clear();
        this.loadInitialNews();
    }
    
    trackView(article) {
        const views = JSON.parse(localStorage.getItem('news_views') || '[]');
        const view = {
            url: article.url,
            title: article.title,
            timestamp: Date.now()
        };
        views.unshift(view);
        localStorage.setItem('news_views', JSON.stringify(views.slice(0, 50)));
    }
    
    loadBookmarks() {
        try {
            return JSON.parse(localStorage.getItem('news_bookmarks') || '[]');
        } catch {
            return [];
        }
    }
    
    saveBookmarks() {
        localStorage.setItem('news_bookmarks', JSON.stringify(this.bookmarks));
    }
    
    showLoading() {
        const loadingEl = document.getElementById('news-loading');
        if (loadingEl) {
            loadingEl.style.display = 'block';
        }
        console.log('[News] Showing loading indicator...');
    }
    
    hideLoading() {
        const loadingEl = document.getElementById('news-loading');
        if (loadingEl) {
            loadingEl.style.display = 'none';
        }
        console.log('[News] Hiding loading indicator...');
    }
    
    // SHOW ERROR STATE - RENDER ERROR UI
    showErrorState(message) {
        console.error('[News] 🔴 showErrorState() called:', message);
        
        const container = document.getElementById('news-articles-grid');
        if (!container) {
            console.error('[News] ❌ Container not found for error state!');
            return;
        }
        
        // Hide all skeletons/loaders
        this.hideLoading();
        document.querySelectorAll('.news-hero-skeleton, .news-skeleton-item').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Format message for HTML (preserve line breaks if present)
        const formattedMessage = this.escapeHtml(message).replace(/\n/g, '<br>');
        
        // Check if it's a server connection error
        const isServerError = message.includes('Cannot connect to server') || message.includes('SERVER NOT RUNNING');
        
        container.innerHTML = `
            <div class="news-error-state" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center; max-width: 800px; margin: 0 auto;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--news-error, #ef4444)" stroke-width="2" style="margin-bottom: 20px;">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3 style="font-size: 28px; margin-bottom: 16px; color: var(--news-text-primary); font-weight: 700;">
                    ${isServerError ? '⚠️ Server Not Running' : 'Error Loading News'}
                </h3>
                <div style="font-size: 16px; color: var(--news-text-muted); margin-bottom: 24px; text-align: left; background: rgba(239, 68, 68, 0.1); border: 2px solid rgba(239, 68, 68, 0.3); border-radius: 12px; padding: 24px; line-height: 1.8;">
                    ${formattedMessage}
                </div>
                ${isServerError ? `
                <div style="background: rgba(59, 130, 246, 0.1); border: 2px solid rgba(59, 130, 246, 0.3); border-radius: 12px; padding: 20px; margin-bottom: 20px; text-align: left;">
                    <h4 style="color: var(--news-primary, #3b82f6); margin-bottom: 12px; font-size: 18px;">📋 Quick Start Instructions:</h4>
                    <ol style="margin: 0; padding-left: 24px; color: var(--news-text-secondary); line-height: 2;">
                        <li>Open PowerShell or Command Prompt</li>
                        <li>Navigate to this folder: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">cd "${window.location.pathname.replace(/\/[^/]*$/, '')}"</code></li>
                        <li>Run: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #10b981;">node server.js</code></li>
                        <li>Wait for: <code style="background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px;">AegisDesk server running on port 3000</code></li>
                        <li>Refresh this page (F5)</li>
                    </ol>
                </div>
                ` : ''}
                <button class="news-retry-btn" onclick="if(window.newsApp) { window.newsApp.loadInitialNews(); } else { location.reload(); }" style="margin-top: 24px; padding: 14px 28px; font-size: 16px; cursor: pointer; background: var(--news-primary, #3b82f6); color: white; border: none; border-radius: 8px; font-weight: 600; transition: all 0.2s;">🔄 Try Again</button>
            </div>
        `;
        
        // Update breaking news ticker
        const ticker = document.getElementById('breaking-news-content');
        if (ticker) {
            ticker.innerHTML = '<span style="color: #ef4444;">⚠️ Failed to load news</span>';
        }
        
        console.log('[News] ✅ Error state rendered in DOM');
    }
    
    // DEPRECATED - Use showErrorState instead
    showError(message, debugInfo = null) {
        console.warn('[News] ⚠️ showError() is deprecated, use showErrorState()');
        this.showErrorState(message);
        
        // Hide all skeleton loaders
        const heroSkeleton = document.querySelector('.news-hero-skeleton');
        if (heroSkeleton) {
            heroSkeleton.style.display = 'none';
        }
        document.querySelectorAll('.news-skeleton-item, .news-skeleton-loader, .news-loading').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        // Update debug info
        this.updateDebugInfo({
            lastRequest: 'Failed',
            lastResponse: '0 articles',
            totalResults: 0,
            currentPage: this.currentPage,
            maxPages: 0,
            lastError: message
        });
        
        const container = document.getElementById('news-articles-grid');
        if (container) {
            // ALWAYS clear container and show error - no conditions
            container.innerHTML = `
                <div class="news-error-state" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--news-error)" stroke-width="2" style="margin-bottom: 20px;">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3 style="font-size: 24px; margin-bottom: 12px; color: var(--news-text-primary);">Error Loading News</h3>
                    <p style="font-size: 16px; color: var(--news-text-muted); margin-bottom: 20px; max-width: 600px; margin-left: auto; margin-right: auto;">${this.escapeHtml(message)}</p>
                    ${debugInfo && debugInfo.hint ? `<div style="margin-top: 16px; padding: 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 8px; font-size: 14px; max-width: 600px; margin-left: auto; margin-right: auto;"><strong>💡 Tip:</strong> ${this.escapeHtml(debugInfo.hint)}</div>` : ''}
                    ${debugInfo ? `<details style="margin-top: 16px; text-align: left; cursor: pointer; max-width: 600px; margin-left: auto; margin-right: auto;"><summary style="color: var(--news-text-muted); font-size: 13px; padding: 8px; background: var(--news-bg-secondary); border-radius: 4px;">Show Debug Info (for developers)</summary><pre style="font-size: 11px; color: var(--news-text-muted); margin-top: 8px; padding: 12px; background: var(--news-bg-secondary); border-radius: 8px; overflow-x: auto; max-height: 300px; overflow-y: auto; white-space: pre-wrap; word-wrap: break-word;">${this.escapeHtml(JSON.stringify(debugInfo, null, 2))}</pre></details>` : ''}
                    <button class="news-retry-btn" onclick="if(window.newsApp) { window.newsApp.loadInitialNews(); } else { location.reload(); }" style="margin-top: 24px; padding: 12px 24px; font-size: 14px;">🔄 Try Again</button>
                </div>
            `;
        }
        
        // Also update breaking news ticker
        const ticker = document.getElementById('breaking-news-content');
        if (ticker) {
            ticker.innerHTML = '<span style="color: #ef4444;">⚠️ Failed to load news</span>';
        }
        
        console.log('[News] ✅ Error displayed to user');
    }
    
    showEmptyState() {
        console.log('[News] 📭 showEmptyState() called');
        
        const container = document.getElementById('news-articles-grid');
        if (!container) return;
        
        // Hide all skeletons/loaders
        this.hideLoading();
        document.querySelectorAll('.news-hero-skeleton, .news-skeleton-item').forEach(el => {
            if (el) el.style.display = 'none';
        });
        
        container.innerHTML = `
            <div class="news-empty-state" style="grid-column: 1 / -1; padding: 40px 20px; text-align: center;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 16px; opacity: 0.5;">
                    <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2"></path>
                    <path d="M18 14h-8"></path>
                    <path d="M15 18h-5"></path>
                </svg>
                <h3 style="font-size: 24px; margin-bottom: 12px;">No News Available</h3>
                <p style="font-size: 16px; color: var(--news-text-muted);">Try a different category or search term.</p>
                <button class="news-retry-btn" onclick="if(window.newsApp) { window.newsApp.loadInitialNews(); }" style="margin-top: 20px; padding: 12px 24px; font-size: 14px; cursor: pointer; background: var(--news-primary, #3b82f6); color: white; border: none; border-radius: 8px;">🔄 Refresh</button>
            </div>
        `;
    }
    
    showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'news-notification';
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        setTimeout(() => {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    formatTime(dateString) {
        if (!dateString) return 'Unknown';
        
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        
        return date.toLocaleDateString();
    }
    
    openArticleFromString(articleStr) {
        try {
            const article = JSON.parse(articleStr.replace(/&quot;/g, '"'));
            this.openArticle(article);
        } catch (e) {
            console.error('Error parsing article string:', e);
        }
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    updateDebugInfo(info) {
        this.debugInfo = { ...this.debugInfo, ...info };
        const debugPanel = document.getElementById('news-debug-panel');
        if (debugPanel) {
            const content = debugPanel.querySelector('.news-debug-content');
            if (content) {
                content.innerHTML = `
                    <div class="news-debug-item"><strong>Last Request:</strong> ${this.debugInfo.lastRequest || 'None'}</div>
                    <div class="news-debug-item"><strong>Last Response:</strong> ${this.debugInfo.lastResponse || 'None'}</div>
                    <div class="news-debug-item"><strong>Total Results:</strong> ${this.debugInfo.totalResults}</div>
                    <div class="news-debug-item"><strong>Current Page:</strong> ${this.debugInfo.currentPage} / ${this.debugInfo.maxPages}</div>
                    ${this.debugInfo.lastError ? `<div class="news-debug-item" style="color: var(--news-error);"><strong>Last Error:</strong> ${this.escapeHtml(this.debugInfo.lastError)}</div>` : ''}
                `;
            }
        }
    }
}

// Initialize when DOM is ready
let newsApp;
let isInitialized = false; // Prevent duplicate initialization

function initNewsApp() {
    // Prevent duplicate initialization
    if (isInitialized || window.newsApp) {
        console.warn('[News] ⚠️ News App already initialized, skipping duplicate init');
        return;
    }
    
    console.log('[News] Initializing News App...');
    console.log('[News] DOM ready state:', document.readyState);
    console.log('[News] Current URL:', window.location.href);
    
    try {
        isInitialized = true;
        newsApp = new NewsReaderApp();
        window.newsApp = newsApp;
        console.log('[News] ✅ News App initialized successfully');
    } catch (error) {
        isInitialized = false; // Reset on error
        console.error('[News] ❌ Failed to initialize News App:', error);
        const container = document.getElementById('news-articles-grid');
        if (container) {
            container.innerHTML = `
                <div class="news-error-state" style="grid-column: 1 / -1;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                    <h3>Initialization Error</h3>
                    <p>Failed to initialize news app: ${error.message}</p>
                    <pre style="text-align: left; font-size: 12px; color: var(--news-text-muted); margin-top: 16px; padding: 12px; background: var(--news-bg-secondary); border-radius: 8px; overflow-x: auto;">${error.stack}</pre>
                    <button class="news-retry-btn" onclick="location.reload()">Reload Page</button>
                </div>
            `;
        }
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNewsApp);
} else {
    // DOM already loaded, initialize immediately
    initNewsApp();
}
