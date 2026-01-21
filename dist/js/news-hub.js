// Complete News Hub - All Categories News Reader
class NewsHub {
    constructor() {
        this.apiKey = '1c8e3e79f9f24569a3f6d1c647aeff46';
        this.currentLanguage = 'en';
        this.currentCategory = 'all';
        this.categories = [
            { id: 'sports', name: 'Sports', icon: '⚽' },
            { id: 'science', name: 'Science', icon: '🔬' },
            { id: 'entertainment', name: 'Entertainment', icon: '🎬' },
            { id: 'health', name: 'Health', icon: '🏥' },
            { id: 'technology', name: 'Technology', icon: '💻' },
            { id: 'business', name: 'Business', icon: '💼' },
            { id: 'general', name: 'General', icon: '📰' }
        ];
        this.newsData = {};
        this.cache = {};
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
        this.init();
    }

    init() {
        // Load saved language
        const savedLang = localStorage.getItem('news_hub_language');
        if (savedLang) {
            this.currentLanguage = savedLang;
            const langSelect = document.getElementById('news-hub-language');
            if (langSelect) langSelect.value = savedLang;
        }

        // Setup event listeners
        this.setupEvents();
        
        // Load all news
        this.loadAllNews();
        
        // Setup scroll to top
        this.setupScrollTop();
    }

    setupEvents() {
        // Language selector
        const langSelect = document.getElementById('news-hub-language');
        if (langSelect) {
            langSelect.addEventListener('change', (e) => {
                this.currentLanguage = e.target.value;
                localStorage.setItem('news_hub_language', this.currentLanguage);
                this.loadAllNews();
            });
        }

        // Refresh button
        const refreshBtn = document.getElementById('news-hub-refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.cache = {}; // Clear cache
                this.loadAllNews();
            });
        }

        // Category tabs
        document.querySelectorAll('.news-hub-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                // Update active tab
                document.querySelectorAll('.news-hub-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                this.currentCategory = tab.dataset.category;
                this.displayNews();
            });
        });
    }

    async loadAllNews() {
        const loadingEl = document.getElementById('news-hub-loading');
        const contentEl = document.getElementById('news-hub-content');
        const emptyEl = document.getElementById('news-hub-empty');

        // Show loading
        if (loadingEl) loadingEl.style.display = 'flex';
        if (contentEl) contentEl.style.display = 'none';
        if (emptyEl) emptyEl.style.display = 'none';

        try {
            // Load news for all categories in parallel
            const promises = this.categories.map(cat => this.fetchCategoryNews(cat.id));
            await Promise.all(promises);

            // Display news
            this.displayNews();

            // Hide loading, show content
            if (loadingEl) loadingEl.style.display = 'none';
            if (contentEl) contentEl.style.display = 'flex';
        } catch (error) {
            console.error('Error loading news:', error);
            if (loadingEl) loadingEl.style.display = 'none';
            if (emptyEl) emptyEl.style.display = 'flex';
        }
    }

    async fetchCategoryNews(category) {
        // Check cache
        const cacheKey = `${category}_${this.currentLanguage}`;
        const cached = this.cache[cacheKey];
        if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
            this.newsData[category] = cached.data;
            return cached.data;
        }

        try {
            // Fetch from NewsAPI
            const url = `https://newsapi.org/v2/top-headlines?country=in&category=${category}&pageSize=20&apiKey=${this.apiKey}`;
            
            const response = await fetch(url);
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            const articles = data.articles || [];

            // Cache the results
            this.cache[cacheKey] = {
                data: articles,
                timestamp: Date.now()
            };

            this.newsData[category] = articles;
            return articles;
        } catch (error) {
            console.error(`Error fetching ${category} news:`, error);
            this.newsData[category] = [];
            return [];
        }
    }

    displayNews() {
        const contentEl = document.getElementById('news-hub-content');
        if (!contentEl) return;

        if (this.currentCategory === 'all') {
            // Show all categories
            contentEl.innerHTML = this.categories.map(cat => {
                const articles = this.newsData[cat.id] || [];
                if (articles.length === 0) return '';

                return `
                    <section class="news-hub-category" data-category="${cat.id}">
                        <div class="news-hub-category-header">
                            <h2 class="news-hub-category-title">
                                ${cat.icon} ${cat.name}
                            </h2>
                            <span class="news-hub-category-count">${articles.length} articles</span>
                        </div>
                        <div class="news-hub-articles-grid">
                            ${articles.map((article, index) => this.renderArticleCard(article, index, cat.id)).join('')}
                        </div>
                    </section>
                `;
            }).filter(html => html).join('');
        } else {
            // Show single category
            const cat = this.categories.find(c => c.id === this.currentCategory);
            const articles = this.newsData[this.currentCategory] || [];

            if (articles.length === 0) {
                contentEl.innerHTML = `
                    <div class="news-hub-empty">
                        <h2>No ${cat?.name || 'news'} available</h2>
                        <p>Try refreshing or check back later</p>
                    </div>
                `;
                return;
            }

            contentEl.innerHTML = `
                <section class="news-hub-category">
                    <div class="news-hub-category-header">
                        <h2 class="news-hub-category-title">
                            ${cat?.icon || '📰'} ${cat?.name || 'News'}
                        </h2>
                        <span class="news-hub-category-count">${articles.length} articles</span>
                    </div>
                    <div class="news-hub-articles-grid">
                        ${articles.map((article, index) => this.renderArticleCard(article, index, this.currentCategory)).join('')}
                    </div>
                </section>
            `;
        }

        // Attach click handlers
        this.attachArticleHandlers();
    }

    renderArticleCard(article, index, category) {
        const title = this.escapeHtml(article.title || 'No title');
        const description = this.escapeHtml(article.description || article.content || 'Click to read full article...');
        const source = this.escapeHtml(article.source?.name || 'Unknown');
        const date = this.formatDate(article.publishedAt);
        const image = article.urlToImage || '';
        const url = article.url || '#';

        return `
            <article class="news-hub-article-card" data-index="${index}" data-category="${category}" data-url="${url}">
                ${image ? `
                    <div class="news-hub-article-image">
                        <img src="${image}" alt="${title}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'news-hub-article-image-placeholder\\'>📰</div>'">
                    </div>
                ` : '<div class="news-hub-article-image-placeholder">📰</div>'}
                <div class="news-hub-article-content">
                    <div class="news-hub-article-meta">
                        <span class="news-hub-article-source">${source}</span>
                        <span class="news-hub-article-date">${date}</span>
                    </div>
                    <h3 class="news-hub-article-title">${title}</h3>
                    <p class="news-hub-article-description">${description}</p>
                    <button class="news-hub-article-read-btn" data-index="${index}" data-category="${category}">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
                            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
                        </svg>
                        Read Article
                    </button>
                </div>
            </article>
        `;
    }

    attachArticleHandlers() {
        // Article card clicks
        document.querySelectorAll('.news-hub-article-card').forEach(card => {
            card.addEventListener('click', (e) => {
                if (e.target.closest('.news-hub-article-read-btn')) return;
                
                const index = parseInt(card.dataset.index);
                const category = card.dataset.category;
                const article = this.newsData[category][index];
                if (article) {
                    this.showArticleReader(article);
                }
            });
        });

        // Read button clicks
        document.querySelectorAll('.news-hub-article-read-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.index);
                const category = btn.dataset.category;
                const article = this.newsData[category][index];
                if (article) {
                    this.showArticleReader(article);
                }
            });
        });
    }

    showArticleReader(article) {
        // Use the same reader from news.js
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
        closeBtn.addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        const escHandler = (e) => {
            if (e.key === 'Escape') {
                overlay.remove();
                document.removeEventListener('keydown', escHandler);
            }
        };
        document.addEventListener('keydown', escHandler);
    }

    formatArticleContent(content) {
        if (!content) return '';
        let cleaned = content.replace(/\[.*?\]/g, '').trim();
        const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 10);
        return sentences.map(s => `<p>${this.escapeHtml(s.trim())}.</p>`).join('');
    }

    formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupScrollTop() {
        const scrollBtn = document.createElement('button');
        scrollBtn.className = 'news-hub-scroll-top';
        scrollBtn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"></polyline></svg>';
        scrollBtn.title = 'Scroll to top';
        scrollBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
        document.body.appendChild(scrollBtn);

        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                scrollBtn.classList.add('visible');
            } else {
                scrollBtn.classList.remove('visible');
            }
        });
    }
}

// Initialize
const newsHub = new NewsHub();
