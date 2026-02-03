// News App - Tamil Nadu News Reader with Translation Support
class NewsApp {
    constructor() {
        this.windowId = 'news-reader';
        this.currentLanguage = storage.get('news_language', 'en'); // 'en', 'ta', 'hi'
        this.currentCategory = storage.get('news_category', 'all');
        this.currentRegion = 'tamil-nadu'; // Default to Tamil Nadu
        this.articles = [];
        this.originalArticles = []; // Store original articles before translation
        this.cachedArticles = null;
        this.cacheTimestamp = null;
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.translationCache = new Map(); // Cache translations
        
        // Multiple API keys for fallback
        this.apiKeys = {
            newsapi: '1c8e3e79f9f24569a3f6d1c647aeff46', // NewsAPI.org key
            mediastack: 'YOUR_MEDIASTACK_KEY', // Optional: Get from https://mediastack.com/signup
        };
        
        // Tamil Nadu specific news sources
        this.tamilNaduSources = [
            'the-hindu',
            'the-times-of-india',
            'the-new-indian-express',
            'dt-next',
            'dinamani',
            'daily-thanthi'
        ];
        
        // Tamil Nadu keywords for filtering (expanded list)
        this.tamilNaduKeywords = [
            'Tamil Nadu', 'தமிழ்நாடு', 'Tamilnadu', 'TN',
            'Chennai', 'சென்னை', 'Madras',
            'Coimbatore', 'கோயம்புத்தூர்', 'Kovai',
            'Madurai', 'மதுரை', 'Madura',
            'Trichy', 'திருச்சி', 'Tiruchirappalli', 'Trichinopoly',
            'Salem', 'சேலம்',
            'Tirunelveli', 'திருநெல்வேலி', 'Tinnevelly',
            'Erode', 'ஈரோடு',
            'Vellore', 'வேலூர்',
            'Thanjavur', 'தஞ்சாவூர்', 'Tanjore',
            'Dindigul', 'திண்டுக்கல்',
            'Kanchipuram', 'காஞ்சிபுரம்',
            'Tiruppur', 'திருப்பூர்',
            'Karur', 'கரூர்',
            'Namakkal', 'நாமக்கல்',
            'Hosur', 'ஓசூர்',
            'Ooty', 'ஊட்டி', 'Udhagamandalam',
            'Kodaikanal', 'கோடைக்கானல்',
            'Rameswaram', 'ராமேஸ்வரம்',
            'Kanyakumari', 'கன்னியாகுமரி', 'Cape Comorin'
        ];
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'News Reader',
            width: 1000,
            height: 700,
            class: 'app-news-reader',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                <path d="M18 14h-8"></path>
                <path d="M15 18h-5"></path>
                <path d="M10 6h8v4h-8V6Z"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
        this.loadNews(window);
    }

    render() {
        return `
            <div class="news-container">
                <div class="news-header">
                    <div class="news-header-title">
                        <h2>📰 Tamil Nadu News</h2>
                        <p class="news-header-subtitle">Latest news from Tamil Nadu in your preferred language</p>
                    </div>
                    <div class="news-controls">
                        <div class="news-language-selector">
                            <label>🌐 Translate to:</label>
                            <select id="news-language" class="news-select">
                                <option value="en" ${this.currentLanguage === 'en' ? 'selected' : ''}>English</option>
                                <option value="ta" ${this.currentLanguage === 'ta' ? 'selected' : ''}>தமிழ் (Tamil)</option>
                                <option value="hi" ${this.currentLanguage === 'hi' ? 'selected' : ''}>हिंदी (Hindi)</option>
                            </select>
                        </div>
                        <div class="news-category-selector">
                            <label>📂 Category:</label>
                            <select id="news-category" class="news-select">
                                <option value="all" ${this.currentCategory === 'all' ? 'selected' : ''}>All News</option>
                                <option value="business" ${this.currentCategory === 'business' ? 'selected' : ''}>Business</option>
                                <option value="entertainment" ${this.currentCategory === 'entertainment' ? 'selected' : ''}>Entertainment</option>
                                <option value="general" ${this.currentCategory === 'general' ? 'selected' : ''}>General</option>
                                <option value="health" ${this.currentCategory === 'health' ? 'selected' : ''}>Health</option>
                                <option value="science" ${this.currentCategory === 'science' ? 'selected' : ''}>Science</option>
                                <option value="sports" ${this.currentCategory === 'sports' ? 'selected' : ''}>Sports</option>
                                <option value="technology" ${this.currentCategory === 'technology' ? 'selected' : ''}>Technology</option>
                                <option value="politics" ${this.currentCategory === 'politics' ? 'selected' : ''}>Politics</option>
                            </select>
                        </div>
                        <button class="news-refresh-btn" id="news-refresh-btn" title="Refresh news">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"></path>
                            </svg>
                            Refresh
                        </button>
                    </div>
                </div>
                <div class="news-content" id="news-content">
                    <div class="news-loading">
                        <div class="news-spinner"></div>
                        <p>Loading Tamil Nadu news...</p>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const langSelect = window.querySelector('#news-language');
        const categorySelect = window.querySelector('#news-category');
        const regionSelect = window.querySelector('#news-region');
        const refreshBtn = window.querySelector('#news-refresh-btn');

        langSelect?.addEventListener('change', async (e) => {
            this.currentLanguage = e.target.value;
            storage.set('news_language', this.currentLanguage);
            
            // If we have original articles, translate them
            if (this.originalArticles.length > 0) {
                await this.translateAndDisplay(window, this.originalArticles);
            } else {
                await this.loadNews(window);
            }
        });

        categorySelect?.addEventListener('change', (e) => {
            this.currentCategory = e.target.value;
            storage.set('news_category', this.currentCategory);
            this.loadNews(window);
        });

        refreshBtn?.addEventListener('click', () => {
            this.cachedArticles = null;
            this.cacheTimestamp = null;
            this.loadNews(window);
        });
    }

    async loadNews(window) {
        const content = window.querySelector('#news-content');
        if (!content) return;

        // Check cache first
        if (this.cachedArticles && this.cacheTimestamp && 
            Date.now() - this.cacheTimestamp < this.cacheDuration) {
            this.originalArticles = this.cachedArticles;
            await this.translateAndDisplay(window, this.cachedArticles);
            return;
        }

        content.innerHTML = `
            <div class="news-loading">
                <div class="news-spinner"></div>
                <p>Loading Tamil Nadu news...</p>
            </div>
        `;

        try {
            // Try multiple API sources
            let articles = await this.fetchTamilNaduNews();
            
            if (!articles || articles.length === 0) {
                // Fallback to India-wide news with keyword filtering
                console.log('No direct Tamil Nadu results, trying India-wide news...');
                articles = await this.fetchIndiaNews();
            }
            
            if (articles && articles.length > 0) {
                // Filter for Tamil Nadu relevance (only if we got India-wide news)
                const beforeFilter = articles.length;
                articles = this.filterTamilNaduNews(articles);
                const afterFilter = articles.length;
                
                if (beforeFilter !== afterFilter) {
                    console.log(`Filtered ${beforeFilter} articles to ${afterFilter} Tamil Nadu relevant articles`);
                }
                
                if (articles.length === 0) {
                    console.log('No Tamil Nadu relevant articles found after filtering');
                } else {
                    console.log(`✅ Displaying ${articles.length} Tamil Nadu news articles`);
                }
                
                // Store original articles
                this.originalArticles = articles;
                this.cachedArticles = articles;
                this.cacheTimestamp = Date.now();
                
                // Translate and display
                await this.translateAndDisplay(window, articles);
                return;
            } else {
                console.log('No articles found from API');
            }
        } catch (error) {
            console.error('News fetch error:', error);
        }

        // Fallback to demo Tamil Nadu articles
        const demoArticles = this.getTamilNaduDemoArticles();
        this.originalArticles = demoArticles;
        await this.translateAndDisplay(window, demoArticles);
    }

    async translateAndDisplay(window, articles) {
        const content = window.querySelector('#news-content');
        if (!content) return;

        // If language is English and articles are in English, display directly
        if (this.currentLanguage === 'en') {
            this.displayArticles(window, articles);
            return;
        }

        // Show loading
        content.innerHTML = `
            <div class="news-loading">
                <div class="news-spinner"></div>
                <p>Translating to ${this.currentLanguage === 'ta' ? 'Tamil' : 'Hindi'}...</p>
            </div>
        `;

        // Translate articles
        const translatedArticles = await this.translateArticles(articles, this.currentLanguage);
        this.displayArticles(window, translatedArticles);
    }

    async fetchTamilNaduNews() {
        // Method 1: Try NewsAPI with Tamil Nadu keywords
        if (this.apiKeys.newsapi && this.apiKeys.newsapi !== 'YOUR_NEWSAPI_KEY') {
            try {
                // Expanded search for Tamil Nadu - includes all major cities
                const keywords = encodeURIComponent('Tamil Nadu OR Chennai OR Coimbatore OR Madurai OR Trichy OR Salem OR Tirunelveli OR Erode OR Vellore OR Thanjavur');
                
                // Use 'everything' endpoint for better search results
                let url = `https://newsapi.org/v2/everything?q=${keywords}&language=en&sortBy=publishedAt&pageSize=50&apiKey=${this.apiKeys.newsapi}`;
                
                // Add category filter if not 'all'
                if (this.currentCategory !== 'all') {
                    url += `&category=${this.currentCategory}`;
                }
                
                console.log('🔍 Fetching Tamil Nadu news from NewsAPI...');
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.articles && data.articles.length > 0) {
                        console.log(`✅ Found ${data.articles.length} Tamil Nadu articles!`);
                        return data.articles;
                    } else {
                        console.log('⚠️ No articles found in direct search, trying India headlines...');
                    }
                } else {
                    const errorData = await response.json();
                    console.error('❌ NewsAPI error:', errorData);
                }
            } catch (error) {
                console.error('❌ NewsAPI fetch error:', error);
            }
        }
        
        // Method 1b: Try India headlines and filter for Tamil Nadu
        if (this.apiKeys.newsapi && this.apiKeys.newsapi !== 'YOUR_NEWSAPI_KEY') {
            try {
                const category = this.currentCategory === 'all' ? '' : `&category=${this.currentCategory}`;
                const url = `https://newsapi.org/v2/top-headlines?country=in${category}&pageSize=100&apiKey=${this.apiKeys.newsapi}`;
                
                console.log('🔍 Fetching India headlines as fallback...');
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    if (data.articles && data.articles.length > 0) {
                        console.log(`✅ Found ${data.articles.length} India articles, filtering for Tamil Nadu...`);
                        // Return all - will be filtered by filterTamilNaduNews()
                        return data.articles;
                    }
                } else {
                    const errorData = await response.json();
                    console.error('❌ NewsAPI headlines error:', errorData);
                }
            } catch (error) {
                console.error('❌ India headlines fetch error:', error);
            }
        }

        // Method 2: Try mediastack API
        if (this.apiKeys.mediastack && this.apiKeys.mediastack !== 'YOUR_MEDIASTACK_KEY') {
            try {
                const keywords = encodeURIComponent('Tamil Nadu, Chennai, Coimbatore, Madurai');
                const url = `https://api.mediastack.com/v1/news?access_key=${this.apiKeys.mediastack}&countries=in&keywords=${keywords}&limit=50`;
                
                const response = await fetch(url);
                if (response.ok) {
                    const data = await response.json();
                    if (data.data && data.data.length > 0) {
                        // Convert mediastack format to our format
                        return data.data.map(article => ({
                            title: article.title,
                            description: article.description,
                            url: article.url,
                            urlToImage: article.image,
                            publishedAt: article.published_at,
                            source: { name: article.source }
                        }));
                    }
                }
            } catch (error) {
                console.error('MediaStack error:', error);
            }
        }

        return null;
    }

    async fetchIndiaNews() {
        // Fallback: Fetch India-wide news and filter
        if (this.apiKeys.newsapi && this.apiKeys.newsapi !== 'YOUR_NEWSAPI_KEY') {
            try {
                const category = this.currentCategory === 'all' ? '' : `&category=${this.currentCategory}`;
                const url = `https://newsapi.org/v2/top-headlines?country=in${category}&pageSize=100&apiKey=${this.apiKeys.newsapi}`;
                
                console.log('Fetching India-wide news...');
                const response = await fetch(url);
                
                if (response.ok) {
                    const data = await response.json();
                    console.log(`✅ Found ${data.articles?.length || 0} India articles`);
                    return data.articles || [];
                } else {
                    const errorData = await response.json();
                    console.error('India news API error:', errorData);
                }
            } catch (error) {
                console.error('India news fetch error:', error);
            }
        }
        return null;
    }

    filterTamilNaduNews(articles) {
        // Filter articles related to Tamil Nadu
        const keywords = this.tamilNaduKeywords.map(k => k.toLowerCase());
        
        return articles.filter(article => {
            const title = (article.title || '').toLowerCase();
            const description = (article.description || '').toLowerCase();
            const content = (article.content || '').toLowerCase();
            const source = (article.source?.name || '').toLowerCase();
            
            const text = `${title} ${description} ${content} ${source}`;
            
            // Check if article mentions Tamil Nadu keywords
            return keywords.some(keyword => text.includes(keyword.toLowerCase()));
        });
    }

    getTamilNaduDemoArticles() {
        // Demo articles about Tamil Nadu (will be translated)
        return [
            {
                title: 'Chennai IT Corridor Expands with New Tech Park',
                description: 'The Chennai IT corridor welcomes a new state-of-the-art technology park, expected to create 10,000 jobs in Tamil Nadu.',
                url: '#',
                publishedAt: new Date().toISOString(),
                source: { name: 'The Hindu' },
                content: 'Chennai continues to be a major IT hub in India...'
            },
            {
                title: 'Tamil Nadu Government Announces New Industrial Policy',
                description: 'The Tamil Nadu government has unveiled a new industrial policy aimed at attracting investments worth ₹2 lakh crore.',
                url: '#',
                publishedAt: new Date(Date.now() - 3600000).toISOString(),
                source: { name: 'Times of India' },
                content: 'The new policy focuses on renewable energy and manufacturing...'
            },
            {
                title: 'Coimbatore Textile Industry Sees Growth',
                description: 'Coimbatore\'s textile industry reports 15% growth this quarter, driven by export demand.',
                url: '#',
                publishedAt: new Date(Date.now() - 7200000).toISOString(),
                source: { name: 'The New Indian Express' },
                content: 'Textile manufacturers in Coimbatore are expanding operations...'
            },
            {
                title: 'Madurai Temple Festival Begins',
                description: 'The annual Meenakshi Amman Temple festival in Madurai has begun with traditional ceremonies and cultural events.',
                url: '#',
                publishedAt: new Date(Date.now() - 10800000).toISOString(),
                source: { name: 'Daily Thanthi' },
                content: 'Thousands of devotees are expected to participate...'
            },
            {
                title: 'Tamil Nadu Education Department Launches Digital Learning Initiative',
                description: 'A new digital learning platform has been launched to improve education access in rural Tamil Nadu.',
                url: '#',
                publishedAt: new Date(Date.now() - 14400000).toISOString(),
                source: { name: 'Dinamani' },
                content: 'The initiative aims to reach 50,000 students across the state...'
            },
            {
                title: 'Salem Steel Plant Modernization Plan Approved',
                description: 'The central government has approved a ₹1,000 crore modernization plan for the Salem Steel Plant.',
                url: '#',
                publishedAt: new Date(Date.now() - 18000000).toISOString(),
                source: { name: 'DT Next' },
                content: 'The modernization will include new production lines...'
            }
        ];
    }

    async translateArticles(articles, targetLang) {
        const translated = [];
        
        for (const article of articles) {
            const cacheKey = `${article.title}_${targetLang}`;
            
            // Check cache first
            if (this.translationCache.has(cacheKey)) {
                translated.push(this.translationCache.get(cacheKey));
                continue;
            }

            try {
                // Translate using free Google Translate API (requires API key)
                // For now, use a simple translation approach with a proxy
                const translatedArticle = await this.translateText(article, targetLang);
                
                // Cache the translation
                this.translationCache.set(cacheKey, translatedArticle);
                translated.push(translatedArticle);
                
                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            } catch (error) {
                console.error('Translation error:', error);
                // Use original article if translation fails
                translated.push(article);
            }
        }
        
        return translated;
    }

    async translateText(article, targetLang) {
        // Use a free translation API (MyMemory Translation API - free tier)
        try {
            const translateUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(article.title + ' | ' + article.description)}&langpair=en|${targetLang === 'ta' ? 'ta' : 'hi'}`;
            
            const response = await fetch(translateUrl);
            if (response.ok) {
                const data = await response.json();
                const translated = data.responseData.translatedText;
                const parts = translated.split(' | ');
                
                return {
                    ...article,
                    title: parts[0] || article.title,
                    description: parts[1] || article.description,
                    _translated: true
                };
            }
        } catch (error) {
            console.error('Translation API error:', error);
        }
        
        // Fallback: return original
        return article;
    }

    displayArticles(window, articles) {
        const content = window.querySelector('#news-content');
        if (!content || !articles || articles.length === 0) {
            content.innerHTML = `
                <div class="news-empty">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"></path>
                    </svg>
                    <p>No news available at this time.</p>
                    <button class="news-refresh-btn" onclick="location.reload()" style="margin-top: 16px;">
                        Try Again
                    </button>
                </div>
            `;
            return;
        }

        // Store articles for later use
        this.currentArticles = articles;

        content.innerHTML = `
            <div class="news-articles-grid">
                ${articles.map((article, index) => `
                    <article class="news-article-card" data-index="${index}" data-url="${article.url || '#'}">
                        ${article.urlToImage ? `
                            <div class="news-article-image">
                                <img src="${article.urlToImage}" alt="${article.title}" loading="lazy" onerror="this.style.display='none'">
                            </div>
                        ` : '<div class="news-article-image-placeholder">📰</div>'}
                        <div class="news-article-content">
                            <div class="news-article-meta">
                                <span class="news-article-source">${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                                <span class="news-article-date">${this.formatDate(article.publishedAt)}</span>
                            </div>
                            <h3 class="news-article-title">${this.escapeHtml(article.title || 'No title')}</h3>
                            <p class="news-article-description">${this.escapeHtml(article.description || article.content || 'Click to read full article...')}</p>
                            <div class="news-article-actions">
                                <button class="news-read-btn" data-index="${index}">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                                        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                                    </svg>
                                    Read Full Article
                                </button>
                                ${article.url && article.url !== '#' ? `
                                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-open-external-btn" onclick="event.stopPropagation()">
                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                            <polyline points="15 3 21 3 21 9"></polyline>
                                            <line x1="10" y1="14" x2="21" y2="3"></line>
                                        </svg>
                                        Open in Browser
                                    </a>
                                ` : ''}
                            </div>
                        </div>
                    </article>
                `).join('')}
            </div>
        `;

        // Add click handlers for reading articles
        content.querySelectorAll('.news-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                const article = articles[index];
                this.showArticleReader(window, article);
            });
        });

        // Also make entire card clickable
        content.querySelectorAll('.news-article-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't trigger if clicking on buttons
                if (e.target.closest('.news-read-btn, .news-open-external-btn')) return;
                
                const index = parseInt(card.dataset.index);
                const article = articles[index];
                if (article) {
                    this.showArticleReader(window, article);
                }
            });
        });
    }

    showArticleReader(window, article) {
        // Create article reader overlay
        const overlay = document.createElement('div');
        overlay.className = 'news-reader-overlay';
        overlay.innerHTML = `
            <div class="news-reader-modal">
                <div class="news-reader-header">
                    <div class="news-reader-meta">
                        <span class="news-reader-source">${this.escapeHtml(article.source?.name || 'Unknown')}</span>
                        <span class="news-reader-date">${this.formatDate(article.publishedAt)}</span>
                    </div>
                    <button class="news-reader-close" title="Close">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="news-reader-content">
                    ${article.urlToImage ? `
                        <div class="news-reader-image">
                            <img src="${article.urlToImage}" alt="${this.escapeHtml(article.title)}" onerror="this.style.display='none'">
                        </div>
                    ` : ''}
                    <h1 class="news-reader-title">${this.escapeHtml(article.title || 'No title')}</h1>
                    <div class="news-reader-body">
                        <p class="news-reader-description">${this.escapeHtml(article.description || '')}</p>
                        ${article.content ? `
                            <div class="news-reader-full-content">
                                ${this.formatArticleContent(article.content)}
                            </div>
                        ` : ''}
                        ${article.url && article.url !== '#' ? `
                            <div class="news-reader-footer">
                                <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="news-reader-original-link">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
                                        <polyline points="15 3 21 3 21 9"></polyline>
                                        <line x1="10" y1="14" x2="21" y2="3"></line>
                                    </svg>
                                    Read Original Article
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Close handlers
        const closeBtn = overlay.querySelector('.news-reader-close');
        closeBtn.addEventListener('click', () => {
            overlay.remove();
        });

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        });

        // ESC key to close
        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);

        // Scroll to top
        overlay.querySelector('.news-reader-content').scrollTop = 0;
    }

    formatArticleContent(content) {
        if (!content) return '';
        
        // Clean up content - remove [Removed] or similar markers
        let cleaned = content.replace(/\[.*?\]/g, '').trim();
        
        // Split by sentences and format
        const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 10);
        
        return sentences.map(sentence => `<p>${this.escapeHtml(sentence.trim())}.</p>`).join('');
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString(this.currentLanguage === 'en' ? 'en-US' : 
                                      this.currentLanguage === 'ta' ? 'ta-IN' : 'hi-IN', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }
}

const newsApp = new NewsApp();
