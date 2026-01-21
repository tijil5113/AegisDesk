// Personalization System - Learn user preferences and customize experience
class NewsPersonalization {
    constructor() {
        this.prefs = this.loadPreferences();
        this.readingHistory = this.loadReadingHistory();
        this.init();
    }
    
    init() {
        // Track user behavior
        this.trackReadingPatterns();
    }
    
    loadPreferences() {
        try {
            const saved = localStorage.getItem('news_preferences');
            return saved ? JSON.parse(saved) : {
                preferredTopics: [],
                hiddenCategories: [],
                favoriteSources: [],
                readingMode: 'default',
                theme: 'auto',
                language: 'en'
            };
        } catch {
            return {
                preferredTopics: [],
                hiddenCategories: [],
                favoriteSources: [],
                readingMode: 'default',
                theme: 'auto',
                language: 'en'
            };
        }
    }
    
    savePreferences() {
        try {
            localStorage.setItem('news_preferences', JSON.stringify(this.prefs));
        } catch (error) {
            console.error('Error saving preferences:', error);
        }
    }
    
    loadReadingHistory() {
        try {
            const saved = localStorage.getItem('news_reading_history');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }
    
    saveReadingHistory() {
        try {
            // Keep only last 1000 items
            const limited = this.readingHistory.slice(-1000);
            localStorage.setItem('news_reading_history', JSON.stringify(limited));
        } catch (error) {
            console.error('Error saving reading history:', error);
        }
    }
    
    // Track what user reads
    trackArticleRead(article) {
        const entry = {
            url: article.url,
            category: article.category,
            source: article.source?.name,
            timestamp: Date.now(),
            readTime: this.estimateReadTime(article)
        };
        
        this.readingHistory.push(entry);
        
        // Learn preferences
        this.learnFromReading(entry);
        this.saveReadingHistory();
    }
    
    estimateReadTime(article) {
        const words = (article.content || article.description || '').split(/\s+/).length;
        return Math.ceil(words / 200); // 200 words per minute
    }
    
    learnFromReading(entry) {
        // Learn preferred topics
        if (!this.prefs.preferredTopics.includes(entry.category)) {
            const count = this.readingHistory.filter(h => h.category === entry.category).length;
            if (count > 3) {
                this.prefs.preferredTopics.push(entry.category);
                this.savePreferences();
            }
        }
        
        // Learn favorite sources
        if (entry.source && !this.prefs.favoriteSources.includes(entry.source)) {
            const count = this.readingHistory.filter(h => h.source === entry.source).length;
            if (count > 5) {
                this.prefs.favoriteSources.push(entry.source);
                this.savePreferences();
            }
        }
    }
    
    trackReadingPatterns() {
        // Track reading times
        const hour = new Date().getHours();
        const pattern = localStorage.getItem('news_reading_pattern') || '{}';
        try {
            const patterns = JSON.parse(pattern);
            patterns[hour] = (patterns[hour] || 0) + 1;
            localStorage.setItem('news_reading_pattern', JSON.stringify(patterns));
        } catch {}
    }
    
    // Get personalized feed
    personalizeArticles(articles) {
        let personalized = [...articles];
        
        // Boost preferred topics
        personalized = personalized.map(article => {
            let score = 0;
            const category = this.getCategory(article);
            
            if (this.prefs.preferredTopics.includes(category)) {
                score += 10;
            }
            
            if (this.prefs.favoriteSources.includes(article.source?.name)) {
                score += 5;
            }
            
            // Boost recent articles
            const age = Date.now() - new Date(article.publishedAt).getTime();
            if (age < 3600000) score += 3; // Last hour
            
            return { ...article, _personalScore: score };
        });
        
        // Hide unwanted categories
        personalized = personalized.filter(article => {
            const category = this.getCategory(article);
            return !this.prefs.hiddenCategories.includes(category);
        });
        
        // Sort by personal score
        personalized.sort((a, b) => (b._personalScore || 0) - (a._personalScore || 0));
        
        return personalized.map(({ _personalScore, ...article }) => article);
    }
    
    getCategory(article) {
        // Try to infer category from content
        const text = `${article.title} ${article.description}`.toLowerCase();
        if (text.includes('sport') || text.includes('football') || text.includes('cricket')) return 'sports';
        if (text.includes('tech') || text.includes('ai') || text.includes('software')) return 'technology';
        if (text.includes('health') || text.includes('medical') || text.includes('covid')) return 'health';
        if (text.includes('business') || text.includes('economy') || text.includes('market')) return 'business';
        if (text.includes('entertainment') || text.includes('movie') || text.includes('celebrity')) return 'entertainment';
        return 'general';
    }
    
    // User preferences methods
    addPreferredTopic(topic) {
        if (!this.prefs.preferredTopics.includes(topic)) {
            this.prefs.preferredTopics.push(topic);
            this.savePreferences();
        }
    }
    
    hideCategory(category) {
        if (!this.prefs.hiddenCategories.includes(category)) {
            this.prefs.hiddenCategories.push(category);
            this.savePreferences();
        }
    }
    
    addFavoriteSource(source) {
        if (!this.prefs.favoriteSources.includes(source)) {
            this.prefs.favoriteSources.push(source);
            this.savePreferences();
        }
    }
    
    setReadingMode(mode) {
        this.prefs.readingMode = mode;
        this.savePreferences();
    }
    
    setTheme(theme) {
        this.prefs.theme = theme;
        this.savePreferences();
    }
    
    setLanguage(lang) {
        this.prefs.language = lang;
        this.savePreferences();
    }
}
