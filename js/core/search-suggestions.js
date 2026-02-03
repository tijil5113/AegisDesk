// Advanced Search with Suggestions
// PERF: Input handler is debounced so typing does not trigger excessive DOM updates or re-renders.
class SearchSuggestions {
    constructor() {
        this.searchInput = null;
        this.suggestionsPanel = null;
        this.apps = [];
        this.init();
    }

    init() {
        this.searchInput = document.getElementById('global-search');
        if (!this.searchInput) return;

        this.createSuggestionsPanel();
        this.setupEventListeners();
        this.loadApps();
    }

    /** Debounce delay (ms) for search input — reduces re-renders while typing. */
    static get INPUT_DEBOUNCE_MS() { return 200; }

    createSuggestionsPanel() {
        this.suggestionsPanel = document.createElement('div');
        this.suggestionsPanel.className = 'search-suggestions';
        this.suggestionsPanel.id = 'search-suggestions';
        document.body.appendChild(this.suggestionsPanel);
    }

    loadApps() {
        if (typeof APP_REGISTRY !== 'undefined') {
            this.apps = Object.keys(APP_REGISTRY).map(id => ({
                id,
                title: APP_REGISTRY[id].title,
                type: 'app'
            }));
        }
    }

    setupEventListeners() {
        let inputDebounce;
        const debounceMs = SearchSuggestions.INPUT_DEBOUNCE_MS;
        this.searchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(inputDebounce);
            if (query.length === 0) {
                this.hideSuggestions();
                return;
            }
            inputDebounce = setTimeout(() => this.showSuggestions(query), debounceMs);
        });

        this.searchInput.addEventListener('focus', () => {
            if (this.searchInput.value.trim().length > 0) {
                this.showSuggestions(this.searchInput.value.trim());
            }
        });

        // Single click listener for outside-close (suggestions panel only)
        document.body.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.suggestionsPanel.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                this.navigateSuggestions(e.key);
            } else if (e.key === 'Enter') {
                const selected = this.suggestionsPanel.querySelector('.suggestion-item.selected');
                if (selected) {
                    selected.click();
                }
            }
        });
    }

    showSuggestions(query) {
        const suggestions = this.getSuggestions(query);
        
        if (suggestions.length === 0) {
            this.hideSuggestions();
            return;
        }

        this.suggestionsPanel.innerHTML = suggestions.map((suggestion, index) => `
            <div class="suggestion-item ${index === 0 ? 'selected' : ''}" data-action="${suggestion.action}" data-type="${suggestion.type}">
                <div class="suggestion-icon">${suggestion.icon}</div>
                <div class="suggestion-content">
                    <div class="suggestion-title">${this.highlightMatch(suggestion.title, query)}</div>
                    ${suggestion.subtitle ? `<div class="suggestion-subtitle">${suggestion.subtitle}</div>` : ''}
                </div>
                <div class="suggestion-shortcut">${suggestion.shortcut || ''}</div>
            </div>
        `).join('');

        // Position panel above the search bar so user sees suggestions clearly on top
        const searchRect = this.searchInput.getBoundingClientRect();
        this.suggestionsPanel.style.top = 'auto';
        this.suggestionsPanel.style.bottom = (window.innerHeight - searchRect.top + 8) + 'px';
        this.suggestionsPanel.style.left = searchRect.left + 'px';
        this.suggestionsPanel.style.width = searchRect.width + 'px';
        this.suggestionsPanel.classList.add('visible');

        // Add click handlers
        this.suggestionsPanel.querySelectorAll('.suggestion-item').forEach(item => {
            item.addEventListener('click', () => {
                this.handleSuggestion(item);
            });
        });
    }

    getSuggestions(query) {
        const lowerQuery = query.toLowerCase();
        const suggestions = [];

        // App matches
        this.apps.forEach(app => {
            if (app.title.toLowerCase().includes(lowerQuery)) {
                suggestions.push({
                    title: app.title,
                    subtitle: 'Application',
                    icon: '📱',
                    type: 'app',
                    action: app.id,
                    shortcut: 'Enter'
                });
            }
        });

        // Quick actions
        const quickActions = [
            { title: 'New Note', query: ['note', 'new'], icon: '📝', action: 'new-note' },
            { title: 'New Task', query: ['task', 'todo'], icon: '✅', action: 'new-task' },
            { title: 'Settings', query: ['settings', 'preferences'], icon: '⚙️', action: 'settings' },
            { title: 'Help', query: ['help', 'instructions'], icon: '❓', action: 'help' },
            { title: 'Theme', query: ['theme', 'color'], icon: '🎨', action: 'theme' },
            { title: 'Clipboard', query: ['clipboard', 'copy'], icon: '📋', action: 'clipboard' }
        ];

        quickActions.forEach(action => {
            if (action.query.some(q => lowerQuery.includes(q)) || action.title.toLowerCase().includes(lowerQuery)) {
                suggestions.push({
                    title: action.title,
                    subtitle: 'Quick Action',
                    icon: action.icon,
                    type: 'action',
                    action: action.action,
                    shortcut: 'Enter'
                });
            }
        });

        // Web search
        if (query.length > 2) {
            suggestions.push({
                title: `Search "${query}" on Google`,
                subtitle: 'Web Search',
                icon: '🔍',
                type: 'search',
                action: query,
                shortcut: 'Enter'
            });
        }

        return suggestions.slice(0, 8);
    }

    highlightMatch(text, query) {
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    navigateSuggestions(direction) {
        const items = this.suggestionsPanel.querySelectorAll('.suggestion-item');
        const selected = this.suggestionsPanel.querySelector('.suggestion-item.selected');
        
        if (items.length === 0) return;

        let currentIndex = selected ? Array.from(items).indexOf(selected) : -1;

        if (direction === 'ArrowDown') {
            currentIndex = (currentIndex + 1) % items.length;
        } else {
            currentIndex = (currentIndex - 1 + items.length) % items.length;
        }

        items.forEach(item => item.classList.remove('selected'));
        items[currentIndex].classList.add('selected');
        items[currentIndex].scrollIntoView({ block: 'nearest' });
    }

    handleSuggestion(item) {
        const action = item.dataset.action;
        const type = item.dataset.type;

        if (type === 'app') {
            if (typeof desktop !== 'undefined') {
                desktop.openApp(action);
            }
        } else if (type === 'action') {
            if (typeof quickActions !== 'undefined') {
                quickActions.handleAction(action);
            }
        } else if (type === 'search') {
            window.open(`https://www.google.com/search?q=${encodeURIComponent(action)}`, '_blank');
        }

        this.searchInput.value = '';
        this.hideSuggestions();
        this.searchInput.blur();
    }

    hideSuggestions() {
        this.suggestionsPanel.classList.remove('visible');
    }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SearchSuggestions();
    });
} else {
    new SearchSuggestions();
}
