// Notes App - Markdown Editor with Cross-Linking
class NotesApp {
    constructor() {
        // Load from OS store, fallback to legacy storage for backward compatibility
        let notesData = null;
        if (typeof osStore !== 'undefined' && osStore.initialized) {
            notesData = osStore.getStateSlice('notes');
        } else if (typeof storage !== 'undefined') {
            notesData = storage.get('notes', []);
        }
        
        // Ensure notes is always an array
        this.notes = Array.isArray(notesData) ? notesData : [];
        this.currentNoteId = null;
        this.windowId = 'notes';
        this.markdownMode = storage.get('notesMarkdownMode', true);
        
        // Subscribe to state changes if OS store is available
        if (typeof osStore !== 'undefined') {
            this.unsubscribe = osStore.subscribe((state, prevState) => {
                if (prevState && state.notes !== prevState.notes) {
                    // Ensure notes is always an array
                    this.notes = Array.isArray(state.notes) ? state.notes : [];
                    // Refresh UI if window is open
                    if (windowManager.windows.has(this.windowId)) {
                        const window = windowManager.windows.get(this.windowId);
                        if (window) {
                            const content = window.querySelector('.window-content');
                            if (content) {
                                this.refreshList(content);
                            }
                        }
                    }
                }
            });
            
            // Sync from OS store after initialization
            const syncFromStore = () => {
                if (osStore.initialized) {
                    const storeNotes = osStore.getStateSlice('notes');
                    // Ensure it's an array
                    if (Array.isArray(storeNotes)) {
                        this.notes = storeNotes;
                    } else if (!this.notes || !Array.isArray(this.notes)) {
                        this.notes = [];
                    }
                }
            };
            
            // Try to sync immediately if already initialized
            if (osStore.initialized) {
                syncFromStore();
            } else {
                // Wait for initialization
                const checkInit = setInterval(() => {
                    if (osStore.initialized) {
                        syncFromStore();
                        clearInterval(checkInit);
                    }
                }, 100);
                // Stop checking after 5 seconds
                setTimeout(() => clearInterval(checkInit), 5000);
            }
        }
    }

    open() {
        // Ensure notes is an array before opening
        if (!Array.isArray(this.notes)) {
            console.warn('Notes is not an array, initializing to empty array');
            this.notes = [];
        }
        
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Notes',
            width: 800,
            height: 700,
            class: 'app-notes',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                <path d="M14 2v6h6"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
        if (this.notes.length > 0) {
            this.loadNote(this.notes[0].id, window);
        }
    }

    render() {
        // Safety check: ensure notes is an array
        if (!Array.isArray(this.notes)) {
            console.warn('Notes is not an array in render(), initializing to empty array');
            this.notes = [];
        }
        
        const notesListHtml = this.notes.map(note => `
            <div class="note-item ${note.id === this.currentNoteId ? 'active' : ''}" data-note-id="${note.id}">
                <div class="note-title">${this.escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-preview">${this.escapeHtml(note.content?.substring(0, 100) || 'No content')}</div>
                <div class="note-meta">
                    ${this.formatDate(note.updatedAt || note.createdAt)}
                    ${note.linkedNotes && note.linkedNotes.length > 0 ? `<span class="note-links-count">${note.linkedNotes.length} links</span>` : ''}
                </div>
            </div>
        `).join('');

        return `
            <div class="notes-container">
                <div class="notes-header">
                    <h2>Notes</h2>
                    <div class="notes-actions">
                        <button class="notes-view-toggle" id="notes-view-toggle" title="Toggle Markdown Preview">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <rect x="3" y="3" width="18" height="18" rx="2"></rect>
                                <line x1="9" y1="3" x2="9" y2="21"></line>
                            </svg>
                        </button>
                        <button class="notes-search-btn" id="notes-search-btn" title="Search Notes">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="11" cy="11" r="8"></circle>
                                <path d="m21 21-4.35-4.35"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="notes-layout">
                    <div class="notes-sidebar">
                        <div class="notes-search" id="notes-search" style="display: none;">
                            <input type="text" class="notes-search-input" id="notes-search-input" placeholder="Search notes...">
                        </div>
                        <div class="notes-list" id="notes-list">
                            ${notesListHtml}
                        </div>
                    </div>
                    <div class="notes-editor-panel">
                        <div class="notes-editor" id="notes-editor">
                            <input type="text" class="note-editor-title" id="note-title" placeholder="Note title...">
                            <div class="notes-editor-tabs">
                                <button class="notes-tab active" data-tab="edit">Edit</button>
                                <button class="notes-tab" data-tab="preview">Preview</button>
                            </div>
                            <textarea class="note-editor-content" id="note-content" placeholder="Start writing... (Markdown supported)"></textarea>
                            <div class="note-preview-content" id="note-preview" style="display: none;"></div>
                            <div class="notes-toolbar">
                                <div class="notes-toolbar-left">
                                    <button class="notes-btn" id="note-new-btn">New</button>
                                    <button class="notes-btn" id="note-delete-btn" style="display: none;">Delete</button>
                                </div>
                                <div class="notes-toolbar-right">
                                    <span class="notes-word-count" id="notes-word-count">0 words</span>
                                    <button class="notes-btn primary" id="note-save-btn">Save</button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        const list = content.querySelector('#notes-list');
        const editor = content.querySelector('#notes-editor');
        const titleInput = content.querySelector('#note-title');
        const contentInput = content.querySelector('#note-content');
        const previewDiv = content.querySelector('#note-preview');
        const newBtn = content.querySelector('#note-new-btn');
        const saveBtn = content.querySelector('#note-save-btn');
        const deleteBtn = content.querySelector('#note-delete-btn');
        const searchBtn = content.querySelector('#notes-search-btn');
        const searchContainer = content.querySelector('#notes-search');
        const searchInput = content.querySelector('#notes-search-input');
        const tabs = content.querySelectorAll('.notes-tab');
        const wordCount = content.querySelector('#notes-word-count');

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                if (tabName === 'preview') {
                    contentInput.style.display = 'none';
                    previewDiv.style.display = 'block';
                    this.updatePreview(previewDiv, contentInput.value);
                } else {
                    contentInput.style.display = 'block';
                    previewDiv.style.display = 'none';
                }
            });
        });

        // Search
        searchBtn.addEventListener('click', () => {
            searchContainer.style.display = searchContainer.style.display === 'none' ? 'block' : 'none';
            if (searchContainer.style.display === 'block') {
                searchInput.focus();
            }
        });

        searchInput.addEventListener('input', (e) => {
            this.filterNotes(e.target.value, list);
        });

        // Load note
        list.addEventListener('click', (e) => {
            const noteItem = e.target.closest('.note-item');
            if (!noteItem) return;

            const noteId = noteItem.dataset.noteId;
            this.loadNote(noteId, window);
        });

        // New note
        newBtn.addEventListener('click', () => {
            this.currentNoteId = null;
            titleInput.value = '';
            contentInput.value = '';
            previewDiv.innerHTML = '';
            deleteBtn.style.display = 'none';
            this.refreshList(content);
            titleInput.focus();
        });

        // Delete note
        deleteBtn.addEventListener('click', () => {
            if (this.currentNoteId && confirm('Delete this note?')) {
                this.notes = this.notes.filter(n => n.id !== this.currentNoteId);
                this.currentNoteId = null;
                titleInput.value = '';
                contentInput.value = '';
                previewDiv.innerHTML = '';
                deleteBtn.style.display = 'none';
                this.save();
                this.refreshList(content);
            }
        });

        // Save note
        saveBtn.addEventListener('click', () => {
            this.saveNote(titleInput.value.trim(), contentInput.value, window);
        });

        // Update word count and preview
        contentInput.addEventListener('input', () => {
            const text = contentInput.value;
            const words = text.trim().split(/\s+/).filter(w => w.length > 0).length;
            wordCount.textContent = `${words} word${words !== 1 ? 's' : ''}`;
            
            // Update preview if visible
            if (previewDiv.style.display !== 'none') {
                this.updatePreview(previewDiv, text);
            }
            
            // Auto-save (debounced)
            clearTimeout(this.autoSaveTimeout);
            this.autoSaveTimeout = setTimeout(() => {
                if (this.currentNoteId) {
                    this.saveNote(titleInput.value.trim(), contentInput.value, window, false);
                }
            }, 2000);
        });

        // Markdown shortcuts
        contentInput.addEventListener('keydown', (e) => {
            // Ctrl+B for bold
            if (e.ctrlKey && e.key === 'b') {
                e.preventDefault();
                this.wrapSelection(contentInput, '**', '**');
            }
            // Ctrl+I for italic
            if (e.ctrlKey && e.key === 'i') {
                e.preventDefault();
                this.wrapSelection(contentInput, '*', '*');
            }
            // Ctrl+K for link
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                this.insertLink(contentInput);
            }
        });
    }

    wrapSelection(textarea, before, after) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        const replacement = before + selected + after;
        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        textarea.selectionStart = start + before.length;
        textarea.selectionEnd = start + before.length + selected.length;
        textarea.focus();
    }

    insertLink(textarea) {
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);
        const linkText = selected || 'link text';
        const replacement = `[${linkText}](url)`;
        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        textarea.selectionStart = start + linkText.length + 3;
        textarea.selectionEnd = start + linkText.length + 6;
        textarea.focus();
    }

    updatePreview(previewDiv, markdown) {
        if (typeof marked !== 'undefined') {
            previewDiv.innerHTML = marked.parse(markdown);
            // Process cross-links
            this.processCrossLinks(previewDiv);
        } else {
            // Fallback simple markdown
            previewDiv.innerHTML = this.simpleMarkdown(markdown);
        }
    }

    simpleMarkdown(text) {
        return this.escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/\n/g, '<br>');
    }

    processCrossLinks(element) {
        // Find [[note links]] and convert to clickable links
        const links = element.querySelectorAll('*');
        links.forEach(link => {
            if (link.textContent && link.textContent.includes('[[')) {
                link.innerHTML = link.innerHTML.replace(/\[\[([^\]]+)\]\]/g, (match, noteTitle) => {
                    const note = this.notes.find(n => n.title === noteTitle);
                    if (note) {
                        return `<a href="#" class="note-cross-link" data-note-id="${note.id}">${noteTitle}</a>`;
                    }
                    return match;
                });
            }
        });
        
        // Add click handlers for cross-links
        element.querySelectorAll('.note-cross-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const noteId = link.dataset.noteId;
                const window = link.closest('.window');
                if (window) {
                    this.loadNote(noteId, window);
                }
            });
        });
    }

    filterNotes(query, list) {
        if (!query.trim()) {
            this.refreshList(list.closest('.window').querySelector('.window-content'));
            return;
        }
        
        const lowerQuery = query.toLowerCase();
        const filtered = this.notes.filter(note => 
            (note.title || '').toLowerCase().includes(lowerQuery) ||
            (note.content || '').toLowerCase().includes(lowerQuery)
        );
        
        list.innerHTML = filtered.map(note => `
            <div class="note-item ${note.id === this.currentNoteId ? 'active' : ''}" data-note-id="${note.id}">
                <div class="note-title">${this.highlightMatch(this.escapeHtml(note.title || 'Untitled'), query)}</div>
                <div class="note-preview">${this.highlightMatch(this.escapeHtml(note.content?.substring(0, 100) || 'No content'), query)}</div>
                <div class="note-meta">${this.formatDate(note.updatedAt || note.createdAt)}</div>
            </div>
        `).join('');
    }

    highlightMatch(text, query) {
        if (!query) return text;
        const regex = new RegExp(`(${query})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }

    loadNote(noteId, window) {
        const note = this.notes.find(n => n.id === noteId);
        if (!note) return;

        this.currentNoteId = noteId;
        const content = window.querySelector('.window-content');
        const titleInput = content.querySelector('#note-title');
        const contentInput = content.querySelector('#note-content');
        const previewDiv = content.querySelector('#note-preview');
        const deleteBtn = content.querySelector('#note-delete-btn');
        const tabs = content.querySelectorAll('.notes-tab');

        titleInput.value = note.title || '';
        contentInput.value = note.content || '';
        this.updatePreview(previewDiv, note.content || '');
        deleteBtn.style.display = 'block';
        
        // Switch to edit tab
        tabs.forEach(t => {
            if (t.dataset.tab === 'edit') {
                t.classList.add('active');
            } else {
                t.classList.remove('active');
            }
        });
        contentInput.style.display = 'block';
        previewDiv.style.display = 'none';
        
        this.refreshList(content);
    }

    saveNote(title, content, window, showFeedback = true) {
        if (!title && !content) return;

        // Extract cross-links from content
        const crossLinks = [];
        const linkMatches = content.match(/\[\[([^\]]+)\]\]/g);
        if (linkMatches) {
            linkMatches.forEach(match => {
                const noteTitle = match.replace(/\[\[|\]\]/g, '');
                const linkedNote = this.notes.find(n => n.title === noteTitle);
                if (linkedNote && linkedNote.id !== this.currentNoteId) {
                    crossLinks.push(linkedNote.id);
                }
            });
        }

        if (this.currentNoteId) {
            // Update existing
            const note = this.notes.find(n => n.id === this.currentNoteId);
            if (note) {
                note.title = title || 'Untitled';
                note.content = content;
                note.updatedAt = Date.now();
                note.linkedNotes = crossLinks;
            }
        } else {
            // Create new
            const newNote = {
                id: 'note_' + Date.now(),
                title: title || 'Untitled',
                content: content,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                linkedNotes: crossLinks
            };
            this.notes.unshift(newNote);
            this.currentNoteId = newNote.id;
        }

        this.save();
        this.refreshList(window.querySelector('.window-content'));

        if (showFeedback) {
            const saveBtn = window.querySelector('#note-save-btn');
            const originalText = saveBtn.textContent;
            saveBtn.textContent = 'Saved!';
            saveBtn.style.background = 'rgba(34, 197, 94, 0.8)';
            setTimeout(() => {
                saveBtn.textContent = originalText;
                saveBtn.style.background = '';
            }, 1000);
        }
    }

    refreshList(container) {
        // Safety check: ensure notes is an array
        if (!Array.isArray(this.notes)) {
            console.warn('Notes is not an array in refreshList(), initializing to empty array');
            this.notes = [];
        }
        
        const list = container.querySelector('#notes-list');
        if (!list) return;
        
        list.innerHTML = this.notes.map(note => `
            <div class="note-item ${note.id === this.currentNoteId ? 'active' : ''}" data-note-id="${note.id}">
                <div class="note-title">${this.escapeHtml(note.title || 'Untitled')}</div>
                <div class="note-preview">${this.escapeHtml(note.content?.substring(0, 100) || 'No content')}</div>
                <div class="note-meta">
                    ${this.formatDate(note.updatedAt || note.createdAt)}
                    ${note.linkedNotes && note.linkedNotes.length > 0 ? `<span class="note-links-count">${note.linkedNotes.length} links</span>` : ''}
                </div>
            </div>
        `).join('');
    }

    save() {
        // Save through OS store if available, fallback to legacy storage
        if (typeof osStore !== 'undefined' && osStore.initialized) {
            osStore.dispatch({
                type: 'NOTES_UPDATE',
                payload: this.notes
            });
        } else {
            // Fallback to legacy storage for backward compatibility
            storage.set('notes', this.notes);
        }
    }

    formatDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = now - date;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const notesApp = new NotesApp();
