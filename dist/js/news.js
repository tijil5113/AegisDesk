// Premium News Hub - Complete Implementation
class PremiumNewsHub {
    constructor() {
        // API Configuration - Direct call with CORS proxy (no server needed!)
        this.apiKey = '1c8e3e79f9f24569a3f6d1c647aeff46';
        this.useCorsProxy = true; // Use CORS proxy to avoid server
        this.corsProxy = 'https://api.allorigins.win/raw?url='; // Free CORS proxy
        
        // State Management
        this.currentCategory = 'all';
        this.currentPage = 1;
        this.pageSize = 24;
        this.allArticles = [];
        this.filteredArticles = [];
        this.bookmarks = new Set();
        this.recentlyViewed = [];
        this.isLoading = false;
        this.hasMore = true;
        this.totalResults = 0;
        this.totalPages = 0;
        this.maxPages = 15; // Safety limit to prevent rate limits
        this.searchQuery = '';
        this.filters = {
            source: 'all',
            location: 'all',
            sort: 'latest',
            date: 'all'
        };
        
        // Debug state
        this.debug = {
            lastRequest: null,
            lastResponse: null,
            lastError: null
        };
        
        // Cache
        this.cache = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        
        // Sources mapping
        this.sources = {
            'the-times-of-india': 'the-times-of-india',
            'the-hindu': 'the-hindu',
            'ndtv': 'ndtv',
            'indian-express': 'indian-express',
            'bbc-news': 'bbc-news',
            'reuters': 'reuters',
            'techcrunch': 'techcrunch',
            'wired': 'wired',
            'bloomberg': 'bloomberg'
        };
        
        // Location keywords
        this.locationKeywords = {
            'tamil-nadu': ['tamil nadu', 'chennai', 'tamilnadu', 'tn'],
            'chennai': ['chennai', 'madras'],
            'kerala': ['kerala', 'kochi', 'trivandrum'],
            'karnataka': ['karnataka', 'bangalore', 'bengaluru'],
            'andhra-pradesh': ['andhra pradesh', 'hyderabad', 'vijayawada'],
            'telangana': ['telangana', 'hyderabad']
        };
        
        // Initialize
        this.init();
    }
    
    async init() {
        // No server needed! Direct API calls work now.
        console.log('[News] Initializing - no server required! Direct API access enabled.');
        
        // Load saved data
        this.loadBookmarks();
        this.loadRecentlyViewed();
        this.loadTheme();
        
        // Setup zoom sync
        this.setupZoomSync();
        
        // Setup event listeners
        this.setupEventListeners();
        
        // Setup infinite scroll
        this.setupInfiniteScroll();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Load initial news
        await this.loadBreakingNews();
        await this.loadAllNews();
    }
    
    // Render pipeline functions
    initNewsPage() {
        // Page initialization handled in init()
        this.renderArticles([], false); // Clear grid initially
    }
    
    renderArticles(articles, append = false) {
        const grid = document.getElementById('news-articles-grid');
        if (!grid) return;
        
        // Clear if not appending
        if (!append) {
            grid.innerHTML = '';
        }
        
        // Render each article
        articles.forEach(article => {
            const card = this.createArticleCard(article);
            grid.appendChild(card);
        });
        
        // Animate new cards
        if (!append) {
            this.animateCards();
        }
    }
    
    setActiveTab(tabKey) {
        document.querySelectorAll('.news-category-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.category === tabKey) {
                btn.classList.add('active');
            }
        });
        this.currentCategory = tabKey;
    }
    
    applyFilters() {
        this.filters.source = document.getElementById('news-filter-source')?.value || 'all';
        this.filters.location = document.getElementById('news-filter-location')?.value || 'all';
        this.filters.sort = document.getElementById('news-filter-sort')?.value || 'latest';
        this.filters.date = document.getElementById('news-filter-date')?.value || 'all';
        
        this.currentPage = 1;
        this.allArticles = [];
        this.loadAllNews();
        
        this.closeFiltersPanel();
    }
    
    handleInfiniteScroll() {
        // Already handled in setupInfiniteScroll, but can be called manually
        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const windowHeight = window.innerHeight;
        const documentHeight = document.documentElement.scrollHeight;
        
        if (scrollTop + windowHeight >= documentHeight - 400 && !this.isLoading && this.hasMore) {
            this.loadMoreArticles();
        }
    }
    
    showLoadingSkeleton() {
        const grid = document.getElementById('news-articles-grid');
        if (!grid) return;
        
        grid.innerHTML = Array(12).fill(0).map(() => `
            <div class="news-skeleton-card">
                <div class="news-skeleton-image"></div>
                <div class="news-skeleton-content">
                    <div class="news-skeleton-line short"></div>
                    <div class="news-skeleton-line medium"></div>
                    <div class="news-skeleton-line long"></div>
                    <div class="news-skeleton-line medium"></div>
                </div>
            </div>
        `).join('');
    }
    
    hideLoadingSkeleton() {
        // Handled by renderArticles
    }
    
    showErrorState(message, debugInfo = {}) {
        const grid = document.getElementById('news-articles-grid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="news-error-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 1rem; color: var(--news-error);">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="12"></line>
                    <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <h3 style="margin: 0 0 0.5rem; color: var(--news-text-primary);">${this.escapeHtml(message)}</h3>
                ${debugInfo.error ? `<p style="color: var(--news-text-muted); font-size: 0.875rem;">${this.escapeHtml(debugInfo.error)}</p>` : ''}
                ${debugInfo.status ? `<p style="color: var(--news-text-muted); font-size: 0.875rem;">Status: ${debugInfo.status}</p>` : ''}
                <button onclick="newsHub.loadAllNews()" class="news-filter-apply" style="margin-top: 1rem;">
                    Retry
                </button>
            </div>
        `;
    }
    
    showEmptyState() {
        const grid = document.getElementById('news-articles-grid');
        if (!grid) return;
        
        grid.innerHTML = `
            <div class="news-empty-state" style="grid-column: 1 / -1; text-align: center; padding: 3rem;">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin: 0 auto 1rem; color: var(--news-text-muted);">
                    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                </svg>
                <h3 style="margin: 0 0 0.5rem; color: var(--news-text-primary);">No articles found</h3>
                <p style="color: var(--news-text-muted);">Try adjusting your filters or search query.</p>
            </div>
        `;
    }
    
    showEndMessage() {
        const endMsg = document.getElementById('news-end-message');
        if (endMsg && this.allArticles.length > 0) {
            endMsg.style.display = 'block';
            if (this.currentPage >= this.maxPages) {
                endMsg.innerHTML = '<p>You\'ve reached the maximum number of pages. Showing first ' + (this.maxPages * this.pageSize) + ' articles.</p>';
            }
        }
    }
    
    
    setupZoomSync() {
        const updateScale = () => {
            // Use devicePixelRatio for zoom detection
            const devicePixelRatio = window.devicePixelRatio || 1;
            const screenWidth = window.screen.width;
            const innerWidth = window.innerWidth;
            
            // Calculate zoom level
            const zoomLevel = (innerWidth / screenWidth) * devicePixelRatio;
            const scaleFactor = Math.max(0.5, Math.min(3.0, Math.round(zoomLevel * 100) / 100));
            
            document.documentElement.style.setProperty('--scale-factor', scaleFactor);
        };
        
        updateScale();
        window.addEventListener('resize', this.debounce(updateScale, 300));
        
        // Also sync with zoom-detector if available
        if (typeof ZoomDetector !== 'undefined') {
            try {
                const zoomDetector = new ZoomDetector();
            } catch (e) {
                console.log('ZoomDetector not available');
            }
        }
    }
    
    setupEventListeners() {
        // Back button
        const backBtn = document.getElementById('news-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                // Check if there's history to go back
                if (window.history.length > 1) {
                    window.history.back();
                } else {
                    // Fallback to index/desktop page
                    window.location.href = 'desktop.html';
                }
            });
        }
        
        // Category buttons
        document.querySelectorAll('.news-category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.news-category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.currentPage = 1;
                this.allArticles = [];
                this.loadAllNews();
            });
        });
        
        // Search
        const searchInput = document.getElementById('news-search');
        const searchBtn = document.getElementById('news-search-btn');
        
        if (searchInput) {
            searchInput.addEventListener('input', this.debounce((e) => {
                this.searchQuery = e.target.value.trim();
                if (this.searchQuery) {
                    this.performSearch();
                } else {
                    this.loadAllNews();
                }
            }, 500));
            
            searchInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    this.searchQuery = e.target.value.trim();
                    if (this.searchQuery) {
                        this.performSearch();
                    }
                }
            });
        }
        
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.searchQuery = searchInput.value.trim();
                if (this.searchQuery) {
                    this.performSearch();
                }
            });
        }
        
        // Filters
        const filtersToggle = document.getElementById('news-filters-toggle');
        const filtersPanel = document.getElementById('news-filters-panel');
        
        if (filtersToggle && filtersPanel) {
            filtersToggle.addEventListener('click', () => {
                const isHidden = filtersPanel.getAttribute('aria-hidden') === 'true';
                filtersPanel.setAttribute('aria-hidden', !isHidden);
            });
        }
        
        document.getElementById('news-filter-apply')?.addEventListener('click', () => {
            this.applyFilters();
        });
        
        document.getElementById('news-filter-clear')?.addEventListener('click', () => {
            this.clearFilters();
        });
        
        // Theme toggle
        document.getElementById('news-theme-toggle')?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Reading mode
        document.getElementById('news-reading-mode')?.addEventListener('click', () => {
            this.toggleReadingMode();
        });
        
        // Bookmarks
        document.getElementById('news-bookmarks')?.addEventListener('click', () => {
            this.toggleBookmarksPanel();
        });
        
        document.getElementById('news-bookmarks-close')?.addEventListener('click', () => {
            this.toggleBookmarksPanel();
        });
        
        // Modal close
        document.getElementById('news-modal-close')?.addEventListener('click', () => {
            this.closeModal();
        });
        
        const modalOverlay = document.getElementById('news-modal-overlay');
        if (modalOverlay) {
            modalOverlay.addEventListener('click', (e) => {
                if (e.target === modalOverlay) {
                    this.closeModal();
                }
            });
        }
        
        // Scroll to top
        document.getElementById('news-scroll-top')?.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        
        window.addEventListener('scroll', this.throttle(() => {
            const scrollTop = document.getElementById('news-scroll-top');
            if (scrollTop) {
                scrollTop.style.display = window.scrollY > 300 ? 'flex' : 'none';
            }
        }, 100));
    }
    
    setupInfiniteScroll() {
        let lastScrollTop = 0;
        
        window.addEventListener('scroll', this.throttle(() => {
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            const windowHeight = window.innerHeight;
            const documentHeight = document.documentElement.scrollHeight;
            
            // Check if scrolled to bottom (with 200px threshold)
            if (scrollTop + windowHeight >= documentHeight - 200 && !this.isLoading && this.hasMore) {
                this.loadMoreArticles();
            }
            
            lastScrollTop = scrollTop;
        }, 200));
    }
    
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (e) => {
            // ESC to close modals/panels
            if (e.key === 'Escape') {
                this.closeModal();
                this.closeBookmarksPanel();
                this.closeFiltersPanel();
            }
            
            // Cmd/Ctrl + K for search
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                document.getElementById('news-search')?.focus();
            }
        });
    }
    
    async loadBreakingNews() {
        try {
            const articles = await this.fetchNews('top', { country: 'in', pageSize: 8 });
            if (articles.length > 0) {
                this.displayBreakingNews(articles);
            } else {
                // Show placeholder if no articles
                const tickerContent = document.getElementById('breaking-news-content');
                if (tickerContent) {
                    tickerContent.textContent = 'Loading breaking news...';
                }
            }
        } catch (error) {
            console.error('Error loading breaking news:', error);
            const tickerContent = document.getElementById('breaking-news-content');
            if (tickerContent) {
                tickerContent.textContent = 'Unable to load breaking news at this time.';
            }
        }
    }
    
    displayBreakingNews(articles) {
        const tickerContent = document.getElementById('breaking-news-content');
        if (!tickerContent) return;
        
        const headlines = articles.map(a => a.title).join(' • ');
        tickerContent.textContent = headlines;
    }
    
    async loadAllNews(append = false) {
        if (this.isLoading) {
            console.log('[News] Already loading, skipping...');
            return;
        }
        
        console.log('[News] loadAllNews called:', { 
            append, 
            category: this.currentCategory, 
            page: this.currentPage,
            searchQuery: this.searchQuery 
        });
        
        this.isLoading = true;
        if (!append) {
            this.showLoadingSkeleton();
        } else {
            this.showLoading();
        }
        
        try {
            let articles = [];
            
            // Check pagination limits
            if (this.currentPage >= this.maxPages) {
                console.log('[News] Reached max pages limit');
                this.hasMore = false;
                this.hideLoading();
                this.showEndMessage();
                return;
            }
            
            if (this.searchQuery) {
                // Search mode
                console.log('[News] Loading search results for:', this.searchQuery);
                articles = await this.fetchNews('everything', { 
                    q: this.searchQuery,
                    pageSize: this.pageSize 
                });
            } else if (this.currentCategory === 'all') {
                // Load top headlines for "All" - use everything endpoint for India
                console.log('[News] Loading all news (using everything endpoint)');
                articles = await this.fetchNews('everything', { 
                    q: 'india',
                    pageSize: this.pageSize 
                });
            } else if (this.currentCategory === 'top-headlines' || this.currentCategory === 'india') {
                console.log('[News] Loading top headlines (using everything endpoint)');
                articles = await this.fetchNews('everything', { 
                    q: 'india',
                    pageSize: this.pageSize 
                });
            } else {
                // Specific category - use everything endpoint with category as query
                console.log('[News] Loading category:', this.currentCategory);
                const categoryQueries = {
                    'business': 'india business',
                    'technology': 'india technology tech',
                    'science': 'india science',
                    'health': 'india health',
                    'sports': 'india sports',
                    'entertainment': 'india entertainment'
                };
                const query = categoryQueries[this.currentCategory] || `india ${this.currentCategory}`;
                articles = await this.fetchNews('everything', { 
                    q: query,
                    pageSize: this.pageSize 
                });
            }
            
            console.log('[News] Fetched articles:', articles.length);
            
            // Apply client-side filters (location, date)
            articles = this.applyFiltersToArticles(articles);
            
            // Remove duplicates
            articles = this.removeDuplicates(articles);
            
            // Sort
            articles = this.sortArticles(articles);
            
            console.log('[News] After filtering:', articles.length);
            
            // Add to all articles (append or replace)
            if (append) {
                this.allArticles = [...this.allArticles, ...articles];
            } else {
                this.allArticles = articles;
            }
            this.filteredArticles = this.allArticles;
            
            console.log('[News] Total articles now:', this.allArticles.length);
            
            // Display
            if (!append) {
                if (articles.length === 0) {
                    this.showEmptyState();
                } else {
                    this.displayHeroArticle();
                    this.displayTrendingArticles();
                    this.renderArticles(this.allArticles, false);
                }
            } else {
                if (articles.length > 0) {
                    this.renderArticles(articles, true);
                }
            }
            
            // Update UI
            this.updateArticleCount();
            this.hideLoading();
            
            // Check if we've reached the end
            if (articles.length === 0 || !this.hasMore) {
                this.showEndMessage();
            }
            
        } catch (error) {
            console.error('[News] Error loading news:', error);
            this.hideLoading();
            this.showErrorState(
                `Failed to load news: ${error.message || 'Unknown error'}`,
                { error: error.message, status: error.status, details: error.stack }
            );
        } finally {
            this.isLoading = false;
            console.log('[News] loadAllNews completed');
        }
    }
    
    async loadMoreArticles() {
        if (this.isLoading || !this.hasMore || this.currentPage >= this.maxPages) {
            return;
        }
        
        this.currentPage++;
        await this.loadAllNews(true); // Append mode
    }
    
    async fetchNews(mode = 'top', params = {}) {
        // Build NewsAPI URL directly (no server needed!)
        const page = params.page || this.currentPage || 1;
        const pageSize = params.pageSize || this.pageSize;
        const language = params.language || 'en';
        
        let apiUrl = '';
        const urlParams = new URLSearchParams({
            apiKey: this.apiKey,
            language: language,
            page: String(page),
            pageSize: String(pageSize)
        });
        
        // Build URL based on mode
        if (mode === 'top' || mode === 'top-headlines') {
            apiUrl = 'https://newsapi.org/v2/top-headlines';
            if (params.country) urlParams.append('country', params.country);
            if (params.category) urlParams.append('category', params.category);
        } else {
            // Use 'everything' endpoint for India (top-headlines doesn't work)
            apiUrl = 'https://newsapi.org/v2/everything';
            if (params.q) {
                urlParams.append('q', params.q);
            } else if (this.searchQuery) {
                urlParams.append('q', this.searchQuery);
            } else {
                urlParams.append('q', 'india'); // Default query
            }
            const sortBy = this.filters.sort === 'latest' ? 'publishedAt' : 
                         this.filters.sort === 'popular' ? 'popularity' : 'relevancy';
            urlParams.append('sortBy', sortBy);
        }
        
        const fullUrl = `${apiUrl}?${urlParams.toString()}`;
        
        // Check cache
        const cacheKey = `${mode}_${fullUrl}`;
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            this.debug.lastRequest = { mode, url: fullUrl };
            this.debug.lastResponse = { cached: true, articles: cached.data.length };
            return cached.data;
        }
        
        try {
            // Save request for debug
            this.debug.lastRequest = { mode, url: fullUrl };
            this.debug.lastError = null;
            
            console.log('[News] Fetching directly from NewsAPI:', fullUrl.substring(0, 100) + '...');
            
            // Call NewsAPI through CORS proxy
            let response;
            try {
                const proxyUrl = this.corsProxy + encodeURIComponent(fullUrl);
                response = await fetch(proxyUrl, {
                    method: 'GET',
                    headers: {
                        'Accept': 'application/json'
                    }
                });
            } catch (fetchError) {
                console.error('[News] Fetch error:', fetchError);
                // Try without proxy as fallback
                try {
                    console.log('[News] Trying direct fetch without proxy...');
                    response = await fetch(fullUrl);
                } catch (directError) {
                    throw new Error(`Cannot fetch news: ${fetchError.message}. Using CORS proxy.`);
                }
            }
            
            console.log('[News] Response status:', response.status, response.statusText);
            
            let data;
            try {
                const text = await response.text();
                console.log('[News] Response received, length:', text.length);
                data = JSON.parse(text);
            } catch (parseError) {
                console.error('[News] JSON parse error:', parseError);
                throw new Error(`Invalid response: ${parseError.message}`);
            }
            console.log('[News] Response data:', { 
                status: data.status, 
                totalResults: data.totalResults, 
                articlesCount: data.articles?.length || 0 
            });
            
            // Handle errors
            if (!response.ok || data.error) {
                const error = {
                    status: response.status,
                    message: data.error || `HTTP ${response.status}`,
                    details: data.details
                };
                this.debug.lastError = error;
                console.error('[News] API Error:', error);
                throw new Error(data.error || `API error: ${response.status}`);
            }
            
            // Extract articles and metadata
            const articles = Array.isArray(data.articles) ? data.articles : [];
            this.totalResults = data.totalResults || 0;
            this.totalPages = data.totalPages || Math.ceil(this.totalResults / this.pageSize);
            
            console.log('[News] Processed:', { 
                articles: articles.length, 
                totalResults: this.totalResults, 
                currentPage: this.currentPage,
                totalPages: this.totalPages 
            });
            
            // Update hasMore based on pagination
            this.hasMore = articles.length > 0 && 
                          this.currentPage < this.totalPages && 
                          this.currentPage < this.maxPages;
            
            // Cache results
            if (articles.length > 0) {
                this.cache.set(cacheKey, {
                    data: articles,
                    timestamp: Date.now()
                });
            }
            
            // Save response for debug
            this.debug.lastResponse = {
                status: data.status || 'unknown',
                totalResults: data.totalResults || 0,
                articles: articles.length,
                page: data.page || this.currentPage,
                totalPages: data.totalPages || this.totalPages
            };
            
            return articles;
        } catch (error) {
            console.error(`[News] Error fetching (${mode}):`, error);
            this.debug.lastError = {
                message: error.message || String(error),
                status: error.status || 'Network Error',
                stack: error.stack
            };
            throw error;
        }
    }
    
    applyFiltersToArticles(articles) {
        let filtered = [...articles];
        
        // Source filter
        if (this.filters.source !== 'all') {
            const sourceId = this.sources[this.filters.source];
            filtered = filtered.filter(a => 
                a.source?.id === sourceId || 
                a.source?.name?.toLowerCase().includes(sourceId?.replace('-', ' '))
            );
        }
        
        // Location filter
        if (this.filters.location !== 'all') {
            const keywords = this.locationKeywords[this.filters.location] || [];
            filtered = filtered.filter(a => {
                const text = `${a.title} ${a.description} ${a.content}`.toLowerCase();
                return keywords.some(kw => text.includes(kw));
            });
        }
        
        // Date filter
        if (this.filters.date !== 'all') {
            const now = new Date();
            const filterDate = new Date();
            
            switch (this.filters.date) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
            }
            
            filtered = filtered.filter(a => {
                const articleDate = new Date(a.publishedAt);
                return articleDate >= filterDate;
            });
        }
        
        return filtered;
    }
    
    removeDuplicates(articles) {
        const seen = new Set();
        return articles.filter(article => {
            const key = article.url || article.title;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }
    
    sortArticles(articles) {
        switch (this.filters.sort) {
            case 'latest':
                return articles.sort((a, b) => new Date(b.publishedAt) - new Date(a.publishedAt));
            case 'popular':
                // Sort by source popularity (simple heuristic)
                return articles.sort((a, b) => {
                    const aPopular = ['bbc-news', 'reuters', 'the-times-of-india'].includes(a.source?.id) ? 1 : 0;
                    const bPopular = ['bbc-news', 'reuters', 'the-times-of-india'].includes(b.source?.id) ? 1 : 0;
                    return bPopular - aPopular;
                });
            case 'relevance':
                // Keep original order (already relevant based on search/query)
                return articles;
            default:
                return articles;
        }
    }
    
    displayHeroArticle() {
        const heroMain = document.getElementById('news-hero-main');
        if (!heroMain || this.allArticles.length === 0) return;
        
        const featured = this.allArticles[0];
        heroMain.innerHTML = `
            <div class="news-hero-article" data-url="${this.escapeHtml(featured.url || '#')}">
                <div class="news-hero-image">
                    ${featured.urlToImage ? 
                        `<img src="${this.escapeHtml(featured.urlToImage)}" alt="${this.escapeHtml(featured.title)}" onerror="this.style.display='none'">` :
                        '<div class="news-article-image-placeholder">📰</div>'
                    }
                </div>
                <div class="news-hero-content-text">
                    <span class="news-hero-category">${this.getCategoryLabel(this.currentCategory)}</span>
                    <h2 class="news-hero-title">${this.escapeHtml(featured.title || 'No title')}</h2>
                    <p class="news-hero-description">${this.escapeHtml(featured.description || '')}</p>
                    <div class="news-hero-meta">
                        <span class="news-article-source">${this.escapeHtml(featured.source?.name || 'Unknown')}</span>
                        <span class="news-article-date">${this.formatDate(featured.publishedAt)}</span>
                    </div>
                </div>
            </div>
        `;
        
        heroMain.querySelector('.news-hero-article')?.addEventListener('click', () => {
            this.showArticleModal(featured);
        });
    }
    
    displayTrendingArticles() {
        const trendingList = document.getElementById('news-trending-list');
        if (!trendingList || this.allArticles.length < 2) return;
        
        const trending = this.allArticles.slice(1, 6);
        trendingList.innerHTML = trending.map((article, index) => `
            <div class="news-trending-item" data-url="${this.escapeHtml(article.url || '#')}">
                <div class="news-trending-number">${index + 1}</div>
                <div class="news-trending-content">
                    <div class="news-trending-title">${this.escapeHtml(article.title || 'No title')}</div>
                    <div class="news-trending-source">${this.escapeHtml(article.source?.name || 'Unknown')}</div>
                </div>
            </div>
        `).join('');
        
        trendingList.querySelectorAll('.news-trending-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.showArticleModal(trending[index]);
            });
        });
    }
    
    displayArticles() {
        // Use renderArticles instead
        const articlesToShow = this.currentPage === 1 
            ? this.allArticles.slice(1) // Skip hero article
            : this.allArticles.slice(this.allArticles.length - this.pageSize);
        
        this.renderArticles(articlesToShow, this.currentPage > 1);
    }
    
    createArticleCard(article) {
        const card = document.createElement('article');
        card.className = 'news-article-card';
        card.setAttribute('role', 'listitem');
        
        const isBookmarked = this.bookmarks.has(article.url);
        
        card.innerHTML = `
            <div class="news-article-image">
                ${article.urlToImage ? 
                    `<img src="${this.escapeHtml(article.urlToImage)}" alt="${this.escapeHtml(article.title)}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'news-article-image-placeholder\\'>📰</div>'">` :
                    '<div class="news-article-image-placeholder">📰</div>'
                }
            </div>
            <div class="news-article-content">
                <div class="news-article-header">
                    <span class="news-article-category">${this.getCategoryLabel(this.currentCategory)}</span>
                    <button class="news-article-bookmark ${isBookmarked ? 'saved' : ''}" 
                            data-url="${this.escapeHtml(article.url || '')}"
                            aria-label="${isBookmarked ? 'Remove bookmark' : 'Bookmark article'}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="${isBookmarked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                            <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                        </svg>
                    </button>
                </div>
                <h3 class="news-article-title">${this.escapeHtml(article.title || 'No title')}</h3>
                <p class="news-article-description">${this.escapeHtml(article.description || article.content || 'Click to read more...')}</p>
                <div class="news-article-footer">
                    <div class="news-article-meta">
                        <div class="news-article-source">${this.escapeHtml(article.source?.name || 'Unknown')}</div>
                        <div class="news-article-date">${this.formatDate(article.publishedAt)}</div>
                    </div>
                    <button class="news-article-share" data-url="${this.escapeHtml(article.url || '')}" aria-label="Share article">
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
        `;
        
        // Event listeners
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.news-article-bookmark') && !e.target.closest('.news-article-share')) {
                this.showArticleModal(article);
            }
        });
        
        const bookmarkBtn = card.querySelector('.news-article-bookmark');
        bookmarkBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleBookmark(article);
            bookmarkBtn.classList.toggle('saved');
        });
        
        const shareBtn = card.querySelector('.news-article-share');
        shareBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            this.shareArticle(article);
        });
        
        return card;
    }
    
    animateCards() {
        const cards = document.querySelectorAll('.news-article-card');
        cards.forEach((card, index) => {
            if (!card.dataset.animated) {
                card.style.opacity = '0';
                card.style.transform = 'translateY(20px)';
                card.dataset.animated = 'true';
                
                setTimeout(() => {
                    card.style.transition = 'all 0.4s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, index * 50);
            }
        });
    }
    
    showArticleModal(article) {
        const modal = document.getElementById('news-modal-overlay');
        const modalContent = document.getElementById('news-modal-content');
        
        if (!modal || !modalContent) return;
        
        // Add to recently viewed
        this.addToRecentlyViewed(article);
        
        modalContent.innerHTML = `
            ${article.urlToImage ? `<img src="${this.escapeHtml(article.urlToImage)}" alt="${this.escapeHtml(article.title)}" class="news-modal-image" onerror="this.style.display='none'">` : ''}
            <h1 class="news-modal-title">${this.escapeHtml(article.title || 'No title')}</h1>
            <div class="news-modal-meta">
                <span class="news-article-source">${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                <span class="news-article-date">${this.formatDate(article.publishedAt)}</span>
                <button class="news-article-bookmark ${this.bookmarks.has(article.url) ? 'saved' : ''}" 
                        data-url="${this.escapeHtml(article.url || '')}"
                        onclick="event.stopPropagation(); newsHub.toggleBookmark(${JSON.stringify(article).replace(/"/g, '&quot;')})">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${this.bookmarks.has(article.url) ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
                    </svg>
                </button>
            </div>
            <div class="news-modal-body">
                <p class="news-modal-description">${this.escapeHtml(article.description || '')}</p>
                ${article.content ? `<div>${this.formatArticleContent(article.content)}</div>` : ''}
            </div>
            ${article.url ? `
                <div class="news-modal-footer">
                    <a href="${this.escapeHtml(article.url)}" target="_blank" rel="noopener noreferrer" class="news-modal-link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                        Read Original Article
                    </a>
                </div>
            ` : ''}
        `;
        
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }
    
    closeModal() {
        const modal = document.getElementById('news-modal-overlay');
        if (modal) {
            modal.setAttribute('aria-hidden', 'true');
            document.body.style.overflow = '';
        }
    }
    
    formatArticleContent(content) {
        if (!content) return '';
        let cleaned = content.replace(/\[.*?\]/g, '').trim();
        const paragraphs = cleaned.split(/\n\n+/).filter(p => p.trim().length > 20);
        return paragraphs.map(p => `<p>${this.escapeHtml(p.trim())}</p>`).join('');
    }
    
    async performSearch() {
        if (!this.searchQuery) {
            // Clear search, reload default
            this.currentPage = 1;
            this.allArticles = [];
            await this.loadAllNews();
            return;
        }
        
        this.isLoading = true;
        this.showLoadingSkeleton();
        this.allArticles = [];
        this.currentPage = 1;
        
        try {
            const articles = await this.fetchNews('everything', {
                q: this.searchQuery,
                pageSize: this.pageSize
            });
            
            this.allArticles = articles;
            this.filteredArticles = articles;
            
            if (articles.length === 0) {
                this.showEmptyState();
            } else {
                this.renderArticles(articles, false);
                this.animateCards();
            }
            
            this.updateArticleCount();
            this.updateSectionTitle(`Search: "${this.searchQuery}"`);
        } catch (error) {
            console.error('Search error:', error);
            this.showErrorState('Search failed. Please try again.', { error: error.message });
        } finally {
            this.isLoading = false;
            this.hideLoading();
        }
    }
    
    applyFilters() {
        this.filters.source = document.getElementById('news-filter-source')?.value || 'all';
        this.filters.location = document.getElementById('news-filter-location')?.value || 'all';
        this.filters.sort = document.getElementById('news-filter-sort')?.value || 'latest';
        this.filters.date = document.getElementById('news-filter-date')?.value || 'all';
        
        this.currentPage = 1;
        this.allArticles = [];
        this.loadAllNews();
        
        this.closeFiltersPanel();
    }
    
    clearFilters() {
        document.getElementById('news-filter-source').value = 'all';
        document.getElementById('news-filter-location').value = 'all';
        document.getElementById('news-filter-sort').value = 'latest';
        document.getElementById('news-filter-date').value = 'all';
        
        this.filters = {
            source: 'all',
            location: 'all',
            sort: 'latest',
            date: 'all'
        };
        
        this.currentPage = 1;
        this.allArticles = [];
        this.loadAllNews();
    }
    
    toggleBookmark(article) {
        if (!article || !article.url) return;
        
        if (this.bookmarks.has(article.url)) {
            this.bookmarks.delete(article.url);
        } else {
            this.bookmarks.add(article.url);
        }
        
        this.saveBookmarks();
        this.updateBookmarksPanel();
        
        // Update bookmark buttons
        document.querySelectorAll(`.news-article-bookmark[data-url="${this.escapeHtml(article.url)}"]`).forEach(btn => {
            btn.classList.toggle('saved');
            const svg = btn.querySelector('svg');
            if (svg) {
                svg.setAttribute('fill', this.bookmarks.has(article.url) ? 'currentColor' : 'none');
            }
        });
    }
    
    loadBookmarks() {
        try {
            const saved = localStorage.getItem('news_bookmarks');
            if (saved) {
                this.bookmarks = new Set(JSON.parse(saved));
            }
        } catch (error) {
            console.error('Error loading bookmarks:', error);
        }
    }
    
    saveBookmarks() {
        try {
            localStorage.setItem('news_bookmarks', JSON.stringify([...this.bookmarks]));
        } catch (error) {
            console.error('Error saving bookmarks:', error);
        }
    }
    
    addToRecentlyViewed(article) {
        this.recentlyViewed = this.recentlyViewed.filter(a => a.url !== article.url);
        this.recentlyViewed.unshift(article);
        this.recentlyViewed = this.recentlyViewed.slice(0, 50);
        
        try {
            localStorage.setItem('news_recently_viewed', JSON.stringify(this.recentlyViewed));
        } catch (error) {
            console.error('Error saving recently viewed:', error);
        }
    }
    
    loadRecentlyViewed() {
        try {
            const saved = localStorage.getItem('news_recently_viewed');
            if (saved) {
                this.recentlyViewed = JSON.parse(saved);
            }
        } catch (error) {
            console.error('Error loading recently viewed:', error);
        }
    }
    
    toggleBookmarksPanel() {
        const panel = document.getElementById('news-bookmarks-panel');
        if (!panel) return;
        
        const isHidden = panel.getAttribute('aria-hidden') === 'true';
        panel.setAttribute('aria-hidden', !isHidden);
        
        if (!isHidden) {
            this.updateBookmarksPanel();
        }
    }
    
    closeBookmarksPanel() {
        const panel = document.getElementById('news-bookmarks-panel');
        if (panel) {
            panel.setAttribute('aria-hidden', 'true');
        }
    }
    
    updateBookmarksPanel() {
        const content = document.getElementById('news-bookmarks-content');
        if (!content) return;
        
        const bookmarkedArticles = this.allArticles.filter(a => this.bookmarks.has(a.url));
        
        if (bookmarkedArticles.length === 0) {
            content.innerHTML = '<p style="text-align: center; color: var(--news-text-muted); padding: 2rem;">No bookmarked articles yet.</p>';
            return;
        }
        
        content.innerHTML = bookmarkedArticles.map((article, index) => {
            const articleId = `bookmark-${index}`;
            const articleJson = JSON.stringify(article).replace(/"/g, '&quot;');
            return `
                <div class="news-bookmark-item" data-article-id="${articleId}">
                    <div class="news-bookmark-title">${this.escapeHtml(article.title || 'No title')}</div>
                    <div class="news-bookmark-source">${this.escapeHtml(article.source?.name || 'Unknown')}</div>
                </div>
            `;
        }).join('');
        
        // Attach click handlers
        content.querySelectorAll('.news-bookmark-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.showArticleModal(bookmarkedArticles[index]);
            });
        });
    }
    
    toggleReadingMode() {
        document.body.classList.toggle('reading-mode');
    }
    
    toggleTheme() {
        // Sync with AegisDesk theme system if available
        if (typeof ThemeSystem !== 'undefined') {
            // Cycle through themes
            const themes = ['dark', 'light', 'auto'];
            const current = localStorage.getItem('theme') || 'dark';
            const nextIndex = (themes.indexOf(current) + 1) % themes.length;
            ThemeSystem.setTheme(themes[nextIndex]);
        } else {
            // Simple dark/light toggle
            document.body.classList.toggle('light-theme');
        }
    }
    
    loadTheme() {
        try {
            const saved = localStorage.getItem('theme') || 'dark';
            if (saved === 'light') {
                document.body.classList.add('light-theme');
            }
        } catch (error) {
            console.error('Error loading theme:', error);
        }
    }
    
    shareArticle(article) {
        if (navigator.share) {
            navigator.share({
                title: article.title,
                text: article.description,
                url: article.url
            }).catch(() => {
                this.copyToClipboard(article.url);
            });
        } else {
            this.copyToClipboard(article.url);
        }
    }
    
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Link copied to clipboard!');
        } catch (error) {
            console.error('Copy failed:', error);
        }
    }
    
    showNotification(message) {
        // Simple notification (can be enhanced)
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            background: var(--news-primary);
            color: white;
            padding: 16px 24px;
            border-radius: 8px;
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
            z-index: 10002;
            animation: slideIn 0.3s ease;
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    showLoading() {
        const loading = document.getElementById('news-loading');
        if (loading) {
            loading.style.display = 'flex';
            loading.innerHTML = `
                <div class="news-skeleton-loader">
                    ${Array(6).fill(0).map(() => `
                        <div class="news-skeleton-card">
                            <div class="news-skeleton-image"></div>
                            <div class="news-skeleton-content">
                                <div class="news-skeleton-line short"></div>
                                <div class="news-skeleton-line medium"></div>
                                <div class="news-skeleton-line long"></div>
                                <div class="news-skeleton-line medium"></div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    }
    
    hideLoading() {
        const loading = document.getElementById('news-loading');
        if (loading) loading.style.display = 'none';
        const endMsg = document.getElementById('news-end-message');
        if (endMsg && !this.hasMore && this.allArticles.length > 0) {
            endMsg.style.display = 'block';
        }
    }
    
    showError(message) {
        this.showErrorState(message);
    }
    
    updateArticleCount() {
        const countEl = document.getElementById('news-articles-count');
        if (countEl) {
            countEl.textContent = `${this.allArticles.length} articles`;
        }
    }
    
    updateSectionTitle(title) {
        const titleEl = document.getElementById('news-section-title');
        if (titleEl) {
            titleEl.textContent = title;
        }
    }
    
    closeFiltersPanel() {
        const panel = document.getElementById('news-filters-panel');
        if (panel) {
            panel.setAttribute('aria-hidden', 'true');
        }
    }
    
    getCategoryLabel(category) {
        const labels = {
            'all': 'All News',
            'top-headlines': 'Top Headlines',
            'world': 'World',
            'india': 'India',
            'business': 'Business',
            'technology': 'Technology',
            'science': 'Science',
            'health': 'Health',
            'sports': 'Sports',
            'entertainment': 'Entertainment'
        };
        return labels[category] || category;
    }
    
    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Utility functions
    debounce(func, wait) {
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
    
    throttle(func, limit) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const newsHub = new PremiumNewsHub();
        window.newsHub = newsHub; // Make globally accessible for debug
        
        // Initialize AI, Personalization, and Reading Modes
        if (typeof NewsAISystem !== 'undefined') {
            newsHub.aiSystem = new NewsAISystem(newsHub);
        }
        if (typeof NewsPersonalization !== 'undefined') {
            newsHub.personalization = new NewsPersonalization();
            // Apply personalization to articles
            const originalLoadAllNews = newsHub.loadAllNews.bind(newsHub);
            newsHub.loadAllNews = async function(append = false) {
                await originalLoadAllNews(append);
                if (this.personalization) {
                    this.allArticles = this.personalization.personalizeArticles(this.allArticles);
                    this.renderArticles(this.allArticles, false);
                }
            };
        }
        if (typeof NewsReadingModes !== 'undefined') {
            newsModes = new NewsReadingModes();
            window.newsModes = newsModes;
        }
    });
} else {
    const newsHub = new PremiumNewsHub();
    window.newsHub = newsHub; // Make globally accessible for debug
    
    // Initialize AI, Personalization, and Reading Modes
    if (typeof NewsAISystem !== 'undefined') {
        newsHub.aiSystem = new NewsAISystem(newsHub);
    }
    if (typeof NewsPersonalization !== 'undefined') {
        newsHub.personalization = new NewsPersonalization();
    }
    if (typeof NewsReadingModes !== 'undefined') {
        newsModes = new NewsReadingModes();
        window.newsModes = newsModes;
    }
}

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
