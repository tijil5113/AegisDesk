// Immersive Reading Modes: Focus, Listen (TTS), Visual
class NewsReadingModes {
    constructor() {
        this.currentMode = 'default';
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.init();
    }
    
    init() {
        // Check TTS availability
        this.ttsAvailable = 'speechSynthesis' in window;
        
        // Setup mode listeners
        this.setupModeControls();
    }
    
    setupModeControls() {
        // Mode buttons will be added to UI
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-mode]')) {
                const mode = e.target.dataset.mode;
                this.switchMode(mode);
            }
        });
    }
    
    // Focus Mode - Full screen, no distractions
    enterFocusMode(article) {
        const overlay = document.createElement('div');
        overlay.className = 'news-focus-mode';
        overlay.innerHTML = `
            <div class="news-focus-header">
                <button class="news-focus-close" onclick="newsModes.exitFocusMode()">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
                <div class="news-focus-meta">
                    <span class="news-focus-source">${this.escapeHtml(article.source?.name || '')}</span>
                    <span class="news-focus-date">${this.formatDate(article.publishedAt)}</span>
                </div>
            </div>
            <div class="news-focus-content">
                ${article.urlToImage ? `<img src="${this.escapeHtml(article.urlToImage)}" alt="${this.escapeHtml(article.title)}" class="news-focus-image">` : ''}
                <h1 class="news-focus-title">${this.escapeHtml(article.title || '')}</h1>
                <div class="news-focus-body">
                    ${this.formatArticleContent(article.content || article.description || '')}
                </div>
            </div>
            <div class="news-focus-footer">
                <button class="news-focus-action" onclick="newsModes.startListening('${this.escapeHtml(article.url)}')">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                    </svg>
                    Listen
                </button>
                <a href="${this.escapeHtml(article.url || '#')}" target="_blank" class="news-focus-action">
                    Read Original
                </a>
            </div>
        `;
        
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        this.currentMode = 'focus';
    }
    
    exitFocusMode() {
        const focusMode = document.querySelector('.news-focus-mode');
        if (focusMode) {
            focusMode.remove();
            document.body.style.overflow = '';
            this.currentMode = 'default';
            this.stopListening();
        }
    }
    
    // Listen Mode - Text to Speech
    startListening(articleUrl = null) {
        if (!this.ttsAvailable) {
            alert('Text-to-speech is not available in your browser.');
            return;
        }
        
        this.stopListening(); // Stop any current speech
        
        // Get article content
        const article = articleUrl ? 
            Array.from(document.querySelectorAll('.news-article-card')).find(card => card.dataset.url === articleUrl) :
            document.querySelector('.news-focus-content');
        
        if (!article) return;
        
        const title = article.querySelector('.news-focus-title, .news-article-title')?.textContent || '';
        const content = article.querySelector('.news-focus-body, .news-article-description')?.textContent || '';
        const text = `${title}. ${content}`.substring(0, 5000); // Limit length
        
        this.currentUtterance = new SpeechSynthesisUtterance(text);
        this.currentUtterance.lang = 'en-US';
        this.currentUtterance.rate = 1.0;
        this.currentUtterance.pitch = 1.0;
        this.currentUtterance.volume = 1.0;
        
        // Update UI
        const listenBtn = document.querySelector('[onclick*="startListening"]');
        if (listenBtn) {
            listenBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="6" y="4" width="4" height="16"></rect>
                    <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                Stop
            `;
            listenBtn.onclick = () => this.stopListening();
        }
        
        this.speechSynthesis.speak(this.currentUtterance);
    }
    
    stopListening() {
        if (this.speechSynthesis.speaking) {
            this.speechSynthesis.cancel();
        }
        
        const listenBtn = document.querySelector('[onclick*="startListening"], [onclick*="stopListening"]');
        if (listenBtn) {
            listenBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
                </svg>
                Listen
            `;
            listenBtn.onclick = () => this.startListening();
        }
    }
    
    // Visual Mode - Large images, minimal text
    enterVisualMode() {
        document.body.classList.add('news-visual-mode');
        const cards = document.querySelectorAll('.news-article-card');
        cards.forEach(card => {
            card.classList.add('visual-mode-card');
        });
        this.currentMode = 'visual';
    }
    
    exitVisualMode() {
        document.body.classList.remove('news-visual-mode');
        const cards = document.querySelectorAll('.news-article-card');
        cards.forEach(card => {
            card.classList.remove('visual-mode-card');
        });
        this.currentMode = 'default';
    }
    
    switchMode(mode) {
        if (this.currentMode === mode) return;
        
        // Exit current mode
        if (this.currentMode === 'focus') this.exitFocusMode();
        if (this.currentMode === 'visual') this.exitVisualMode();
        if (this.currentMode === 'listen') this.stopListening();
        
        // Enter new mode
        if (mode === 'visual') this.enterVisualMode();
    }
    
    formatArticleContent(content) {
        if (!content) return '';
        const paragraphs = content.split(/\n\n+/).filter(p => p.trim().length > 20);
        return paragraphs.map(p => `<p>${this.escapeHtml(p.trim())}</p>`).join('');
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
}

// Global instance
let newsModes;
