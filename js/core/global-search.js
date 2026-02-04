// Global Search - Spotlight-style search across entire OS
class GlobalSearch {
    constructor() {
        this.panel = null;
        this.searchInput = null;
        this.results = [];
        this.selectedIndex = -1;
        this.initialized = false;
        this.searchIndex = {
            apps: [],
            notes: [],
            tasks: [],
            news: [],
            commands: []
        };
    }

    async init() {
        if (this.initialized) return;
        
        // Create UI
        this.createUI();
        
        // Setup keyboard shortcut (Ctrl/Cmd + K)
        this.setupKeyboardShortcut();
        
        // Build search index
        this.buildIndex();
        
        // Subscribe to data changes to rebuild index (debounced)
        if (typeof osStore !== 'undefined') {
            const debouncedRebuild = typeof perfOptimizer !== 'undefined'
                ? perfOptimizer.debounce(() => {
                    this.buildIndex();
                }, 1000)
                : () => {
                    // Fallback: throttle manually
                    if (!this._rebuildTimeout) {
                        this._rebuildTimeout = setTimeout(() => {
                            this.buildIndex();
                            this._rebuildTimeout = null;
                        }, 1000);
                    }
                };
            
            osStore.subscribe(debouncedRebuild);
        }
        
        this.initialized = true;
        console.log('[GlobalSearch] Initialized');
    }

    createUI() {
        // Create search overlay
        const overlay = document.createElement('div');
        overlay.id = 'global-search-overlay';
        overlay.className = 'global-search-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        
        overlay.innerHTML = `
            <div class="global-search-panel">
                <div class="global-search-input-container">
                    <svg class="global-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input 
                        type="text" 
                        id="global-search-input" 
                        class="global-search-input" 
                        placeholder="Search apps, notes, tasks..."
                        autocomplete="off"
                        aria-label="Global search"
                    >
                    <button class="global-search-close" id="global-search-close" aria-label="Close search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="global-search-results" id="global-search-results">
                    <div class="global-search-empty">Start typing to search...</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(overlay);
        this.panel = overlay;
        this.searchInput = document.getElementById('global-search-input');
        
        // Setup event listeners
        // Debounce search input for better performance
        const debouncedSearch = typeof perfOptimizer !== 'undefined'
            ? perfOptimizer.debounce((query) => {
                this.performSearch(query);
            }, 200)
            : (() => {
                let timeout;
                return (query) => {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 200);
                };
            })();
        
        this.searchInput.addEventListener('input', (e) => {
            debouncedSearch(e.target.value);
        });
        
        this.searchInput.addEventListener('keydown', (e) => {
            this.handleKeyNavigation(e);
        });
        
        document.getElementById('global-search-close').addEventListener('click', () => {
            this.hide();
        });
        
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                this.hide();
            }
        });
    }

    setupKeyboardShortcut() {
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + K
            if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
                e.preventDefault();
                this.toggle();
            }
            
            // Escape to close
            if (e.key === 'Escape' && this.panel?.classList.contains('visible')) {
                this.hide();
            }
        });
    }

    buildIndex() {
        // Index apps
        if (typeof APP_REGISTRY !== 'undefined') {
            this.searchIndex.apps = Object.entries(APP_REGISTRY).map(([id, app]) => ({
                id,
                title: app.title,
                type: 'app',
                data: app
            }));
        }
        
        // Index notes (ensure array)
        const notesRaw = osStore?.getStateSlice('notes') || storage.get('notes', []);
        const notes = Array.isArray(notesRaw) ? notesRaw : [];
        this.searchIndex.notes = notes.map(note => ({
            id: note.id,
            title: note.title || 'Untitled',
            content: note.content || '',
            type: 'note',
            data: note
        }));
        
        // Index tasks (ensure array)
        const tasksRaw = osStore?.getStateSlice('tasks') || storage.get('tasks', []);
        const tasks = Array.isArray(tasksRaw) ? tasksRaw : [];
        this.searchIndex.tasks = tasks.map((task, index) => ({
            id: `task-${index}`,
            title: task.text || 'Untitled Task',
            completed: task.completed || false,
            type: 'task',
            data: task,
            index
        }));
        
        // Index saved news (ensure array)
        const savedNewsRaw = storage.get('saved_news', []);
        const savedNews = Array.isArray(savedNewsRaw) ? savedNewsRaw : [];
        this.searchIndex.news = savedNews.map(article => ({
            id: article.url || article.title,
            title: article.title || 'Untitled Article',
            description: article.description || '',
            type: 'news',
            data: article
        }));
        
        // Index commands
        this.searchIndex.commands = [
            { id: 'open-news', title: 'Open News', command: 'open news', type: 'command' },
            { id: 'open-tasks', title: 'Open Tasks', command: 'open tasks', type: 'command' },
            { id: 'open-notes', title: 'Open Notes', command: 'open notes', type: 'command' },
            { id: 'new-note', title: 'New Note', command: 'new note', type: 'command' },
            { id: 'new-task', title: 'New Task', command: 'new task', type: 'command' },
            { id: 'open-settings', title: 'Open Settings', command: 'open settings', type: 'command' },
            { id: 'open-dashboard', title: 'Open Dashboard', command: 'open dashboard', type: 'command' },
            { id: 'open-insights', title: 'Open Insights', command: 'open insights', type: 'command' }
        ];
    }

    performSearch(query) {
        if (!query || query.trim().length === 0) {
            this.results = [];
            this.renderResults();
            return;
        }
        
        const lowerQuery = query.toLowerCase().trim();
        this.results = [];
        
        // Search apps
        this.searchIndex.apps.forEach(app => {
            if (app.title.toLowerCase().includes(lowerQuery) || 
                app.id.toLowerCase().includes(lowerQuery)) {
                this.results.push(app);
            }
        });
        
        // Search notes
        this.searchIndex.notes.forEach(note => {
            if (note.title.toLowerCase().includes(lowerQuery) ||
                note.content.toLowerCase().includes(lowerQuery)) {
                this.results.push(note);
            }
        });
        
        // Search tasks
        this.searchIndex.tasks.forEach(task => {
            if (task.title.toLowerCase().includes(lowerQuery)) {
                this.results.push(task);
            }
        });
        
        // Search news
        this.searchIndex.news.forEach(article => {
            if (article.title.toLowerCase().includes(lowerQuery) ||
                (article.description && article.description.toLowerCase().includes(lowerQuery))) {
                this.results.push(article);
            }
        });
        
        // Search commands
        this.searchIndex.commands.forEach(cmd => {
            if (cmd.title.toLowerCase().includes(lowerQuery) ||
                cmd.command.toLowerCase().includes(lowerQuery)) {
                this.results.push(cmd);
            }
        });
        
        // Group results by type
        this.results = this.groupResultsByType(this.results);
        
        // Render
        this.renderResults();
        
        // Record search in user profile
        if (typeof userProfile !== 'undefined') {
            userProfile.recordEvent('search_performed', {
                query,
                resultCount: this.results.length
            });
        }
    }

    groupResultsByType(results) {
        const grouped = {
            apps: [],
            notes: [],
            tasks: [],
            news: [],
            commands: []
        };
        
        results.forEach(result => {
            if (grouped[result.type + 's']) {
                grouped[result.type + 's'].push(result);
            }
        });
        
        // Flatten with type headers
        const flattened = [];
        Object.entries(grouped).forEach(([type, items]) => {
            if (items.length > 0) {
                flattened.push({ type: 'header', title: this.getTypeTitle(type) });
                flattened.push(...items);
            }
        });
        
        return flattened;
    }

    getTypeTitle(type) {
        const titles = {
            apps: 'Apps',
            notes: 'Notes',
            tasks: 'Tasks',
            news: 'Saved News',
            commands: 'Commands'
        };
        return titles[type] || type;
    }

    renderResults() {
        const container = document.getElementById('global-search-results');
        if (!container) return;
        
        if (this.results.length === 0) {
            container.innerHTML = '<div class="global-search-empty">No results found</div>';
            return;
        }
        
        container.innerHTML = this.results.map((result, index) => {
            if (result.type === 'header') {
                return `<div class="global-search-header">${result.title}</div>`;
            }
            
            const selected = index === this.selectedIndex ? 'selected' : '';
            const icon = this.getResultIcon(result);
            
            return `
                <div class="global-search-result ${selected}" data-index="${index}" data-type="${result.type}">
                    <div class="global-search-result-icon">${icon}</div>
                    <div class="global-search-result-content">
                        <div class="global-search-result-title">${this.escapeHtml(result.title)}</div>
                        ${result.description ? `<div class="global-search-result-desc">${this.escapeHtml(result.description)}</div>` : ''}
                    </div>
                </div>
            `;
        }).join('');
        
        // Setup click handlers
        container.querySelectorAll('.global-search-result').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                this.selectResult(index);
            });
        });
    }

    getResultIcon(result) {
        const icons = {
            app: '📱',
            note: '📝',
            task: '✓',
            news: '📰',
            command: '⚡'
        };
        return icons[result.type] || '📄';
    }

    handleKeyNavigation(e) {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, this.results.filter(r => r.type !== 'header').length - 1);
            this.updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
            this.updateSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedIndex >= 0) {
                this.selectResult(this.selectedIndex);
            }
        }
    }

    updateSelection() {
        const results = this.results.filter(r => r.type !== 'header');
        const container = document.getElementById('global-search-results');
        if (!container) return;
        
        container.querySelectorAll('.global-search-result').forEach((item, index) => {
            if (index === this.selectedIndex) {
                item.classList.add('selected');
                item.scrollIntoView({ block: 'nearest' });
            } else {
                item.classList.remove('selected');
            }
        });
    }

    selectResult(index) {
        const results = this.results.filter(r => r.type !== 'header');
        if (index < 0 || index >= results.length) return;
        
        const result = results[index];
        this.executeResult(result);
        this.hide();
    }

    executeResult(result) {
        switch (result.type) {
            case 'app':
                if (result.data && result.data.open) {
                    result.data.open();
                }
                break;
                
            case 'note':
                if (typeof notesApp !== 'undefined') {
                    notesApp.open();
                    // Focus on note if possible
                    setTimeout(() => {
                        if (notesApp.openNote) {
                            notesApp.openNote(result.id);
                        }
                    }, 100);
                }
                break;
                
            case 'task':
                if (typeof tasksApp !== 'undefined') {
                    tasksApp.open();
                }
                break;
                
            case 'news':
                if (typeof window !== 'undefined') {
                    window.open(result.data.url || '#', '_blank');
                }
                break;
                
            case 'command':
                this.executeCommand(result.command);
                break;
        }
        
        // Record in user profile
        if (typeof userProfile !== 'undefined') {
            userProfile.recordEvent('command_executed', { command: result.title });
        }
    }

    executeCommand(command) {
        const cmd = command.toLowerCase();
        
        if (cmd.includes('open news')) {
            if (typeof window !== 'undefined') window.open('news.html', '_blank');
        } else if (cmd.includes('open tasks')) {
            if (typeof tasksApp !== 'undefined') tasksApp.open();
        } else if (cmd.includes('open notes')) {
            if (typeof notesApp !== 'undefined') notesApp.open();
        } else if (cmd.includes('new note')) {
            if (typeof notesApp !== 'undefined') {
                notesApp.open();
                setTimeout(() => {
                    if (notesApp.createNewNote) notesApp.createNewNote();
                }, 100);
            }
        } else if (cmd.includes('new task')) {
            if (typeof tasksApp !== 'undefined') {
                tasksApp.open();
                setTimeout(() => {
                    const input = document.getElementById('task-input');
                    if (input) input.focus();
                }, 100);
            }
        } else if (cmd.includes('open settings')) {
            if (typeof settingsApp !== 'undefined') settingsApp.open();
        } else if (cmd.includes('open dashboard')) {
            if (typeof window !== 'undefined') window.open('dashboard.html', '_blank');
        } else if (cmd.includes('open insights')) {
            if (typeof window !== 'undefined') window.open('insights.html', '_blank');
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    show() {
        if (!this.panel) return;
        this.panel.setAttribute('aria-hidden', 'false');
        this.panel.classList.add('visible');
        this.searchInput.focus();
        this.buildIndex(); // Refresh index
    }

    hide() {
        if (!this.panel) return;
        this.panel.setAttribute('aria-hidden', 'true');
        this.panel.classList.remove('visible');
        this.searchInput.value = '';
        this.results = [];
        this.selectedIndex = -1;
        this.renderResults();
    }

    toggle() {
        if (this.panel?.classList.contains('visible')) {
            this.hide();
        } else {
            this.show();
        }
    }
}

// Create singleton instance
const globalSearch = new GlobalSearch();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => globalSearch.init());
} else {
    globalSearch.init();
}

// Make globally accessible
window.globalSearch = globalSearch;
