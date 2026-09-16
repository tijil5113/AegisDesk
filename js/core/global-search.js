// Global Search - Spotlight-style search across entire OS
class GlobalSearch {
    constructor() {
        this.panel = null;
        this.searchInput = null;
        this.results = [];
        this.selectedIndex = -1;
        this.initialized = false;
        this.category = 'all';
        this.searchIndex = {
            apps: [],
            notes: [],
            tasks: [],
            files: [],
            help: [],
            commands: [],
            bookmarks: []
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
    }

    createUI() {
        // Create search overlay
        const overlay = document.createElement('div');
        overlay.id = 'global-search-overlay';
        overlay.className = 'global-search-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        
        overlay.innerHTML = `
            <div class="global-search-panel" role="dialog" aria-modal="true" aria-label="Global search">
                <div class="global-search-input-container">
                    <svg class="global-search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <circle cx="11" cy="11" r="8"></circle>
                        <path d="m21 21-4.35-4.35"></path>
                    </svg>
                    <input 
                        type="text" 
                        id="global-search-input" 
                        class="global-search-input" 
                        placeholder="Search apps, notes, tasks, mail, music..."
                        autocomplete="off"
                        aria-label="Global search"
                        aria-controls="global-search-results"
                        role="combobox"
                        aria-autocomplete="list"
                        aria-expanded="true"
                    >
                    <button type="button" class="global-search-close" id="global-search-close" aria-label="Close search">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
                <div class="global-search-results" id="global-search-results" role="listbox">
                    <div class="aegis-empty global-search-empty"><strong>Search AegisDesk</strong><span>Apps, commands, notes, tasks, files, and help stay local. Ask Aegis only when you choose it.</span></div>
                </div>
                <div class="aegis-search-tabs" role="tablist" aria-label="Search category">
                    <button type="button" class="aegis-search-tab" role="tab" data-cat="all" aria-selected="true">All</button>
                    <button type="button" class="aegis-search-tab" role="tab" data-cat="apps">Apps</button>
                    <button type="button" class="aegis-search-tab" role="tab" data-cat="commands">Commands</button>
                    <button type="button" class="aegis-search-tab" role="tab" data-cat="notes">Notes</button>
                    <button type="button" class="aegis-search-tab" role="tab" data-cat="tasks">Tasks</button>
                    <button type="button" class="aegis-search-tab" role="tab" data-cat="files">Files</button>
                    <button type="button" class="aegis-search-tab" role="tab" data-cat="help">Help</button>
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
            const tab = e.target.closest('[data-cat]');
            if (tab) {
                this.category = tab.getAttribute('data-cat');
                overlay.querySelectorAll('[data-cat]').forEach((t) => t.setAttribute('aria-selected', t === tab ? 'true' : 'false'));
                this.performSearch(this.searchInput.value);
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
        
        this.searchIndex.commands = [
            { id: 'open-mail', title: 'Open Mail', command: 'open mail', type: 'command', category: 'Open' },
            { id: 'open-music', title: 'Open Music', command: 'open music', type: 'command', category: 'Open' },
            { id: 'open-notes', title: 'Open Notes', command: 'open notes', type: 'command', category: 'Open' },
            { id: 'open-tasks', title: 'Open Tasks', command: 'open tasks', type: 'command', category: 'Open' },
            { id: 'new-note', title: 'New Note', command: 'new note', type: 'command', category: 'Create' },
            { id: 'new-task', title: 'New Task', command: 'new task', type: 'command', category: 'Create' },
            { id: 'open-settings', title: 'Open Settings', command: 'open settings', type: 'command', category: 'Appearance' },
            { id: 'dark-theme', title: 'Switch to dark theme', command: 'dark theme', type: 'command', category: 'Appearance' },
            { id: 'light-theme', title: 'Switch to light theme', command: 'light theme', type: 'command', category: 'Appearance' },
            { id: 'focus-on', title: 'Enter Focus Mode', command: 'focus mode', type: 'command', category: 'Workspace' },
            { id: 'layouts', title: 'Two column layout', command: 'two columns', type: 'command', category: 'Window' },
            { id: 'help-keys', title: 'Keyboard shortcuts', command: 'help keyboard', type: 'command', category: 'Help' },
            { id: 'clipboard', title: 'Clipboard History', command: 'clipboard', type: 'command', category: 'Open' },
            { id: 'activity', title: 'Activity Center', command: 'activity', type: 'command', category: 'Open' },
            { id: 'intel', title: 'Aegis Intelligence', command: 'aegis intelligence', type: 'command', category: 'Open' }
        ];
        if (typeof AegisActions !== 'undefined') {
            AegisActions.catalog().forEach((a) => {
                this.searchIndex.commands.push({
                    id: a.id,
                    title: a.title,
                    command: a.title.toLowerCase(),
                    type: 'command',
                    category: a.category,
                    actionId: a.id
                });
            });
        }
        if (typeof AEGIS_DOCS !== 'undefined') {
            this.searchIndex.help = AEGIS_DOCS.map((s) => ({
                id: s.id,
                title: s.title,
                content: (s.body || '').replace(/<[^>]+>/g, ' '),
                type: 'help',
                data: s
            }));
        }
        this.searchIndex.files = [];
        if (typeof vfs !== 'undefined' && vfs.index) {
            try {
                const files = vfs.index || [];
                this.searchIndex.files = (Array.isArray(files) ? files : []).slice(0, 200).map((f) => ({
                    id: f.path || f.id,
                    title: f.name || f.path || 'File',
                    type: 'file',
                    data: f
                }));
            } catch (e) { /* ignore */ }
        }
        const bookmarkSource = (typeof bookmarksApp !== 'undefined' && Array.isArray(bookmarksApp.bookmarks))
            ? bookmarksApp.bookmarks
            : (storage.get('bookmarks', []) || []);
        this.searchIndex.bookmarks = (Array.isArray(bookmarkSource) ? bookmarkSource : []).slice(0, 200).map((b) => ({
            id: b.id || b.url,
            title: b.name || b.title || b.url || 'Bookmark',
            url: b.url || '',
            type: 'bookmark',
            data: b
        }));
    }

    performSearch(query) {
        if (!query || query.trim().length === 0) {
            this.results = [];
            this.selectedIndex = -1;
            this.renderResults();
            return;
        }

        try {
            const lowerQuery = query.toLowerCase().trim();
            this.results = [];
            const cat = this.category || 'all';
            const allow = (type) => cat === 'all' || cat === type || (cat === 'commands' && type === 'command');

        if (allow('app') || cat === 'apps') {
        this.searchIndex.apps.forEach(app => {
            if (app.title.toLowerCase().includes(lowerQuery) || 
                app.id.toLowerCase().includes(lowerQuery) ||
                (app.id === 'mail' && (lowerQuery === 'email' || lowerQuery === 'e-mail' || lowerQuery === 'e mail')) ||
                (app.id === 'music' && (lowerQuery === 'youtube' || lowerQuery === 'songs' || lowerQuery === 'player'))) {
                this.results.push(app);
            }
        });
        }
        
        if (allow('note') || cat === 'notes') {
        this.searchIndex.notes.forEach(note => {
            if (note.title.toLowerCase().includes(lowerQuery) ||
                note.content.toLowerCase().includes(lowerQuery)) {
                this.results.push(note);
            }
        });
        }
        
        if (allow('task') || cat === 'tasks') {
        this.searchIndex.tasks.forEach(task => {
            if (task.title.toLowerCase().includes(lowerQuery)) {
                this.results.push(task);
            }
        });
        }

        if (allow('file') || cat === 'files') {
            (this.searchIndex.files || []).forEach(file => {
                if ((file.title || '').toLowerCase().includes(lowerQuery)) this.results.push(file);
            });
        }

        if (cat === 'all') {
            (this.searchIndex.bookmarks || []).forEach((bm) => {
                if ((bm.title || '').toLowerCase().includes(lowerQuery) || (bm.url || '').toLowerCase().includes(lowerQuery)) {
                    this.results.push(bm);
                }
            });
        }

        if (allow('help') || cat === 'help') {
            (this.searchIndex.help || []).forEach(doc => {
                if ((doc.title || '').toLowerCase().includes(lowerQuery) || (doc.content || '').toLowerCase().includes(lowerQuery)) {
                    this.results.push(doc);
                }
            });
        }
        
        if (allow('command') || cat === 'commands') {
        this.searchIndex.commands.forEach(cmd => {
            if (cmd.title.toLowerCase().includes(lowerQuery) ||
                cmd.command.toLowerCase().includes(lowerQuery)) {
                this.results.push(cmd);
            }
        });
        }

        if (cat === 'all' && lowerQuery.length > 2) {
            this.results.push({
                type: 'ask',
                title: 'Ask Aegis: ' + query,
                description: 'AI-assisted interpretation — sends this query only, not your local library.',
                query
            });
        }
        
        this.results = this.groupResultsByType(this.results);
        this.selectedIndex = this.selectableResults().length ? 0 : -1;
        this.renderResults();

        if (typeof userProfile !== 'undefined') {
            userProfile.recordEvent('search_performed', {
                query,
                resultCount: this.selectableResults().length
            });
        }
        } catch (err) {
            this.results = [];
            this.selectedIndex = -1;
            const container = document.getElementById('global-search-results');
            if (container) {
                container.innerHTML = '<div class="aegis-error"><strong>Search failed</strong><span>Try again. Local app search is still available.</span></div>';
            }
        }
    }

    selectableResults() {
        return this.results.filter(r => r.type !== 'header');
    }

    groupResultsByType(results) {
        const grouped = {
            apps: [],
            notes: [],
            tasks: [],
            files: [],
            help: [],
            commands: [],
            bookmarks: [],
            ask: []
        };
        
        results.forEach(result => {
            if (result.type === 'ask') grouped.ask.push(result);
            else if (result.type === 'bookmark') grouped.bookmarks.push(result);
            else if (grouped[result.type + 's']) grouped[result.type + 's'].push(result);
            else if (result.type === 'help') grouped.help.push(result);
            else if (result.type === 'file') grouped.files.push(result);
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
            files: 'Files',
            help: 'Help',
            commands: 'Commands',
            bookmarks: 'Bookmarks',
            ask: 'Ask Aegis'
        };
        return titles[type] || type;
    }

    renderResults() {
        const container = document.getElementById('global-search-results');
        if (!container) return;
        
        if (this.results.length === 0) {
            const q = this.searchInput?.value?.trim();
            if (q) {
                container.innerHTML = '<div class="aegis-empty global-search-empty"><strong>No results</strong><span>Try an app name such as Mail or Music.</span></div>';
                return;
            }
            const recentApps = (typeof AegisRecent !== 'undefined' ? AegisRecent.apps() : []).slice(0, 4);
            const recentCmds = (typeof AegisRecent !== 'undefined' ? AegisRecent.commands() : []).slice(0, 4);
            let recents = '';
            if (recentApps.length || recentCmds.length) {
                recents = '<div class="aegis-search-recents">';
                if (recentApps.length) {
                    recents += '<div class="global-search-header">Recent apps</div>' + recentApps.map((id, i) => {
                        const title = (typeof APP_REGISTRY !== 'undefined' && APP_REGISTRY[id] && APP_REGISTRY[id].title) || id;
                        return `<div class="global-search-result" data-recent-app="${this.escapeHtml(id)}" role="option"><div class="global-search-result-icon">📱</div><div class="global-search-result-content"><div class="global-search-result-title">${this.escapeHtml(title)}</div></div></div>`;
                    }).join('');
                }
                if (recentCmds.length) {
                    recents += '<div class="global-search-header">Recent commands</div>' + recentCmds.map((id) => {
                        const def = (typeof AegisActions !== 'undefined' && AegisActions.get(id)) || { title: id };
                        return `<div class="global-search-result" data-recent-cmd="${this.escapeHtml(id)}" role="option"><div class="global-search-result-icon">⚡</div><div class="global-search-result-content"><div class="global-search-result-title">${this.escapeHtml(def.title)}</div></div></div>`;
                    }).join('');
                }
                recents += '</div>';
            }
            container.innerHTML = '<div class="aegis-empty global-search-empty"><strong>Search AegisDesk</strong><span>Apps, notes, tasks, mail, and music stay local and instant.</span></div>' + recents;
            container.querySelectorAll('[data-recent-app]').forEach((el) => {
                el.addEventListener('click', () => {
                    if (typeof AegisActions !== 'undefined') AegisActions.openApp(el.getAttribute('data-recent-app'));
                    this.hide();
                });
            });
            container.querySelectorAll('[data-recent-cmd]').forEach((el) => {
                el.addEventListener('click', () => {
                    if (typeof AegisActions !== 'undefined') AegisActions.run(el.getAttribute('data-recent-cmd'), {});
                    this.hide();
                });
            });
            return;
        }
        
        let selectableIndex = 0;
        container.innerHTML = this.results.map((result) => {
            if (result.type === 'header') {
                return `<div class="global-search-header">${result.title}</div>`;
            }
            
            const selected = selectableIndex === this.selectedIndex ? 'selected' : '';
            const icon = this.getResultIcon(result);
            const currentSelectable = selectableIndex;
            selectableIndex += 1;
            
            return `
                <div class="global-search-result ${selected}" data-index="${currentSelectable}" data-type="${result.type}" role="option" aria-selected="${selected ? 'true' : 'false'}">
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
            file: '📄',
            help: '❓',
            command: '⚡',
            bookmark: '🔖',
            ask: '✦'
        };
        return icons[result.type] || '📄';
    }

    handleKeyNavigation(e) {
        const selectable = this.selectableResults();
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            this.selectedIndex = Math.min(this.selectedIndex + 1, selectable.length - 1);
            this.updateSelection();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
            this.updateSelection();
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (this.selectedIndex >= 0) {
                this.selectResult(this.selectedIndex);
            }
        }
    }

    updateSelection() {
        const container = document.getElementById('global-search-results');
        if (!container) return;
        
        container.querySelectorAll('.global-search-result').forEach((item, index) => {
            const on = index === this.selectedIndex;
            item.classList.toggle('selected', on);
            item.setAttribute('aria-selected', on ? 'true' : 'false');
            if (on) item.scrollIntoView({ block: 'nearest' });
        });
    }

    selectResult(index) {
        const results = this.selectableResults();
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
                if (typeof AegisActions !== 'undefined') {
                    AegisActions.run('notes.open', { id: result.id || (result.data && result.data.id) });
                } else if (typeof notesApp !== 'undefined') {
                    notesApp.open();
                    setTimeout(() => {
                        if (notesApp.openNote) notesApp.openNote(result.id);
                    }, 100);
                }
                break;
                
            case 'task':
                if (typeof tasksApp !== 'undefined') {
                    tasksApp.open();
                }
                break;
                
            case 'help':
                if (typeof AegisActions !== 'undefined') AegisActions.run('help.open', { query: result.id || result.title });
                break;
            case 'file':
                if (typeof AegisActions !== 'undefined') AegisActions.run('files.open', { path: result.data && result.data.path });
                break;
            case 'bookmark':
                if (typeof AegisActions !== 'undefined') {
                    AegisActions.run('bookmarks.open', { url: result.url || (result.data && result.data.url), name: result.title });
                }
                break;
            case 'ask':
                if (typeof AegisIntelligence !== 'undefined') AegisIntelligence.show(result.query);
                break;
            case 'command':
                if (result.actionId && typeof AegisActions !== 'undefined') {
                    AegisActions.run(result.actionId, {});
                } else {
                    this.executeCommand(result.command);
                }
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
        } else if (cmd.includes('open mail') || cmd.includes('open email')) {
            if (typeof APP_REGISTRY !== 'undefined' && APP_REGISTRY.mail) {
                APP_REGISTRY.mail.open();
            }
        } else if (cmd.includes('open music')) {
            if (typeof APP_REGISTRY !== 'undefined' && APP_REGISTRY.music) {
                APP_REGISTRY.music.open();
            }
        } else if (cmd.includes('open settings')) {
            if (typeof settingsApp !== 'undefined') settingsApp.open();
        } else if (cmd.includes('open dashboard')) {
            if (typeof window !== 'undefined') window.open('dashboard.html', '_blank');
        } else if (cmd.includes('dark theme')) {
            if (typeof AegisActions !== 'undefined') AegisActions.run('settings.setTheme', { theme: 'dark' });
        } else if (cmd.includes('light theme')) {
            if (typeof AegisActions !== 'undefined') AegisActions.run('settings.setTheme', { theme: 'light' });
        } else if (cmd.includes('focus')) {
            if (typeof AegisActions !== 'undefined') AegisActions.run('focus.enter', { minutes: 25 });
        } else if (cmd.includes('two columns')) {
            if (typeof AegisActions !== 'undefined') AegisActions.run('layout.apply', { layout: 'columns' });
        } else if (cmd.includes('clipboard')) {
            if (typeof AegisActions !== 'undefined') AegisActions.run('clipboard.show', {});
        } else if (cmd.includes('activity')) {
            if (typeof AegisActions !== 'undefined') AegisActions.run('activity.show', {});
        } else if (cmd.includes('aegis intelligence') || cmd.includes('help keyboard')) {
            if (typeof AegisActions !== 'undefined') AegisActions.run(cmd.includes('help') ? 'help.open' : 'intelligence.open', { query: 'keyboard' });
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    show() {
        if (!this.panel) return;
        this._prevFocus = document.activeElement;
        this.panel.setAttribute('aria-hidden', 'false');
        this.panel.classList.add('visible');
        this.searchInput.focus();
        this.buildIndex();
    }

    hide() {
        if (!this.panel) return;
        this.panel.setAttribute('aria-hidden', 'true');
        this.panel.classList.remove('visible');
        this.searchInput.value = '';
        this.results = [];
        this.selectedIndex = -1;
        this.renderResults();
        if (this._prevFocus && typeof this._prevFocus.focus === 'function') {
            try { this._prevFocus.focus(); } catch (e) { /* ignore */ }
        }
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
