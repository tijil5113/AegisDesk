// Advanced News Reader App
class NewsReaderApp {
    constructor() {
        this.articles = [];
        this.categories = ['technology', 'business', 'science', 'entertainment', 'sports'];
        this.currentCategory = 'technology';
        this.init();
    }

    async fetchNews(category = 'technology') {
        try {
            // Using NewsAPI (free tier available)
            // For demo, we'll use mock data
            const mockArticles = [
                {
                    title: 'AI Breakthrough: New Model Surpasses Human Performance',
                    description: 'Researchers have developed an AI model that outperforms humans in complex reasoning tasks.',
                    url: '#',
                    publishedAt: new Date(),
                    source: 'Tech News',
                    image: 'https://via.placeholder.com/400x200?text=AI+News'
                },
                {
                    title: 'Quantum Computing Milestone Achieved',
                    description: 'Scientists achieve stable quantum entanglement for extended periods.',
                    url: '#',
                    publishedAt: new Date(Date.now() - 3600000),
                    source: 'Science Daily',
                    image: 'https://via.placeholder.com/400x200?text=Quantum'
                },
                {
                    title: 'New Web Standards Revolutionize Development',
                    description: 'Latest browser updates bring powerful new APIs for developers.',
                    url: '#',
                    publishedAt: new Date(Date.now() - 7200000),
                    source: 'Dev Weekly',
                    image: 'https://via.placeholder.com/400x200?text=Web+Dev'
                }
            ];

            // In production, you would use:
            // const apiKey = 'YOUR_NEWS_API_KEY';
            // const response = await fetch(`https://newsapi.org/v2/top-headlines?category=${category}&apiKey=${apiKey}`);
            // const data = await response.json();
            // this.articles = data.articles;

            this.articles = mockArticles;
            return this.articles;
        } catch (error) {
            console.error('Error fetching news:', error);
            this.articles = [];
            return [];
        }
    }

    createWindow() {
        const content = `
            <div class="news-reader-app">
                <div class="news-header">
                    <h2>News Reader</h2>
                    <div class="news-categories">
                        ${this.categories.map(cat => `
                            <button class="news-category-btn ${cat === this.currentCategory ? 'active' : ''}" 
                                    data-category="${cat}">
                                ${cat.charAt(0).toUpperCase() + cat.slice(1)}
                            </button>
                        `).join('')}
                    </div>
                </div>
                <div class="news-content">
                    <div class="news-list" id="news-list">
                        <div class="news-loading">Loading news...</div>
                    </div>
                    <div class="news-viewer" id="news-viewer">
                        <div class="news-viewer-placeholder">
                            <p>Select an article to read</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        const window = windowManager.createWindow('news-reader', {
            title: 'News Reader',
            width: 1000,
            height: 700,
            content,
            class: 'news-window'
        });

        this.setupEventListeners(window);
        this.loadNews(window, this.currentCategory);

        return window;
    }

    async loadNews(window, category) {
        const list = window.querySelector('#news-list');
        list.innerHTML = '<div class="news-loading">Loading news...</div>';

        await this.fetchNews(category);
        this.renderNewsList(window);
    }

    renderNewsList(window) {
        const list = window.querySelector('#news-list');
        
        if (this.articles.length === 0) {
            list.innerHTML = '<div class="news-empty">No articles found</div>';
            return;
        }

        list.innerHTML = this.articles.map((article, index) => `
            <div class="news-item" data-index="${index}">
                <div class="news-item-image" style="background-image: url('${article.image}')"></div>
                <div class="news-item-content">
                    <div class="news-item-source">${this.escapeHtml(article.source)}</div>
                    <h3 class="news-item-title">${this.escapeHtml(article.title)}</h3>
                    <p class="news-item-description">${this.escapeHtml(article.description)}</p>
                    <div class="news-item-meta">
                        <span>${this.formatTime(article.publishedAt)}</span>
                    </div>
                </div>
            </div>
        `).join('');

        // Attach click handlers
        window.querySelectorAll('.news-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.openArticle(window, index);
            });
        });
    }

    openArticle(window, index) {
        const article = this.articles[index];
        if (!article) return;

        const viewer = window.querySelector('#news-viewer');
        viewer.innerHTML = `
            <div class="news-article">
                <div class="news-article-header">
                    <div class="news-article-source">${this.escapeHtml(article.source)}</div>
                    <div class="news-article-time">${this.formatTime(article.publishedAt)}</div>
                </div>
                <h1 class="news-article-title">${this.escapeHtml(article.title)}</h1>
                <div class="news-article-image" style="background-image: url('${article.image}')"></div>
                <div class="news-article-content">
                    <p>${this.escapeHtml(article.description)}</p>
                    <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                    <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                </div>
                <div class="news-article-actions">
                    <button class="news-share-btn">Share</button>
                    <button class="news-bookmark-btn">Bookmark</button>
                </div>
            </div>
        `;
    }

    setupEventListeners(window) {
        const categoryBtns = window.querySelectorAll('.news-category-btn');
        categoryBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const category = btn.dataset.category;
                this.currentCategory = category;
                
                categoryBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                this.loadNews(window, category);
            });
        });
    }

    formatTime(date) {
        const d = new Date(date);
        const now = new Date();
        const diff = now - d;
        const hours = Math.floor(diff / 3600000);
        
        if (hours < 1) return 'Just now';
        if (hours < 24) return `${hours}h ago`;
        return d.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create global instance
const newsReaderApp = new NewsReaderApp();
