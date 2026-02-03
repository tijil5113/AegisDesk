/**
 * Notes App - Professional knowledge system with folders, tags, AI, linking, and multimedia.
 * MODIFY ONLY notes-related code. No desktop/window/tasks/theme changes.
 */
(function () {
    'use strict';

    var _notesAppStub = {
        open: function () {
            if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'Notes is still loading. Try again in a moment.');
            else if (typeof alert === 'function') alert('Notes is still loading. Try again in a moment.');
        }
    };
    if (typeof window !== 'undefined') window.notesApp = _notesAppStub;
    if (typeof globalThis !== 'undefined') globalThis.notesApp = _notesAppStub;

    var FOLDER_IDS = { ALL: '__all__', FAVORITES: '__fav__', RECENT: '__recent__', TRASH: '__trash__', WORK: 'work', STUDY: 'study', PERSONAL: 'personal', GENERAL: 'general' };
    var NOTE_TYPES = ['normal', 'task', 'journal', 'meeting', 'study', 'code', 'voice', 'drawing', 'project'];
    var MAX_VERSIONS = 20;
    var TEMPLATES = {
        meeting: { name: 'Meeting', content: '# Meeting\n\n**Date:** \n**Attendees:** \n\n## Agenda\n- \n\n## Notes\n\n## Action items\n- [ ] \n' },
        study: { name: 'Study', content: '# Topic\n\n## Key concepts\n- \n\n## Definitions\n\n## Practice\n- [ ] \n' },
        journal: { name: 'Journal', content: '# Journal\n\n**Date:** \n\n\n' },
        ideas: { name: 'Ideas', content: '# Ideas\n\n- \n' }
    };

    function normalizeNote(note) {
        if (!note || typeof note !== 'object') return null;
        return {
            id: note.id || 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
            title: typeof note.title === 'string' ? note.title : 'Untitled',
            content: typeof note.content === 'string' ? note.content : '',
            folderId: note.folderId != null ? note.folderId : FOLDER_IDS.PERSONAL,
            tags: Array.isArray(note.tags) ? note.tags : [],
            pinned: !!note.pinned,
            trashed: !!note.trashed,
            deletedAt: note.deletedAt || null,
            type: NOTE_TYPES.indexOf(note.type) >= 0 ? note.type : 'normal',
            template: note.template || null,
            versionHistory: Array.isArray(note.versionHistory) ? note.versionHistory.slice(-MAX_VERSIONS) : [],
            coverImage: note.coverImage || null,
            color: note.color || null,
            icon: note.icon || null,
            attachments: Array.isArray(note.attachments) ? note.attachments : [],
            voiceData: note.voiceData || null,
            drawingData: note.drawingData || null,
            createdAt: typeof note.createdAt === 'number' ? note.createdAt : Date.now(),
            updatedAt: typeof note.updatedAt === 'number' ? note.updatedAt : Date.now(),
            linkedNotes: Array.isArray(note.linkedNotes) ? note.linkedNotes : []
        };
    }

    function getStoredNotes() {
        try {
            var data = null;
            if (typeof osStore !== 'undefined' && osStore.initialized && typeof osStore.getStateSlice === 'function') {
                data = osStore.getStateSlice('notes');
            }
            if (!Array.isArray(data) && typeof storage !== 'undefined' && typeof storage.get === 'function') {
                data = storage.get('notes', []);
            }
            return Array.isArray(data) ? data : [];
        } catch (e) {
            return [];
        }
    }

    function saveStoredNotes(notes) {
        var list = notes.map(function (n) { return normalizeNote(n); });
        if (typeof osStore !== 'undefined' && osStore.initialized) {
            osStore.dispatch({ type: 'NOTES_UPDATE', payload: list });
        } else if (typeof storage !== 'undefined') {
            storage.set('notes', list);
        }
    }

    function NotesApp() {
        var raw = getStoredNotes();
        this.notes = [];
        try {
            for (var i = 0; i < raw.length; i++) {
                var n = normalizeNote(raw[i]);
                if (n) this.notes.push(n);
            }
        } catch (e) {
            if (typeof console !== 'undefined' && console.error) console.error('Notes init notes array:', e);
        }
        this.currentNoteId = null;
        this.windowId = 'notes';
        try {
            this.markdownMode = (typeof storage !== 'undefined' && storage.get) ? storage.get('notesMarkdownMode', true) : true;
            this.sidebarWidth = (typeof storage !== 'undefined' && storage.get) ? Math.min(320, Math.max(180, storage.get('notesSidebarWidth', 260))) : 260;
        } catch (e) {
            this.markdownMode = true;
            this.sidebarWidth = 260;
        }
        this.openTabs = [];
        this.viewMode = 'editor';
        try {
            this.sortBy = (typeof storage !== 'undefined' && storage.get) ? storage.get('notesSortBy', 'updated') : 'updated';
        } catch (e) {
            this.sortBy = 'updated';
        }
        this.filterFolder = FOLDER_IDS.ALL;
        this.filterTag = null;
        this.searchQuery = '';
        this.autoSaveTimeout = null;
        this._listScrollTop = 0;
        this._listItemHeight = 76;
        this._listVisibleCount = 0;

        var self = this;
        try {
            if (typeof osStore !== 'undefined' && typeof osStore.subscribe === 'function') {
                this.unsubscribe = osStore.subscribe(function (state, prevState) {
                    if (prevState && state.notes !== prevState.notes) {
                        self.notes = (Array.isArray(state.notes) ? state.notes : []).map(normalizeNote).filter(Boolean);
                        if (typeof windowManager !== 'undefined' && windowManager.windows && windowManager.windows.has(self.windowId)) {
                            var w = windowManager.windows.get(self.windowId);
                            if (w) {
                                var content = w.querySelector('.window-content');
                                if (content) self.refreshList(content);
                            }
                        }
                    }
                });
                if (osStore.initialized && typeof osStore.getStateSlice === 'function') {
                    var storeNotes = osStore.getStateSlice('notes');
                    if (Array.isArray(storeNotes)) self.notes = storeNotes.map(normalizeNote).filter(Boolean);
                }
            }
        } catch (err) {
            if (typeof console !== 'undefined' && console.error) console.error('Notes init osStore:', err);
        }
    }

    NotesApp.prototype.getActiveNotes = function (includeTrash) {
        if (includeTrash) return this.notes;
        return this.notes.filter(function (n) { return !n.trashed; });
    };

    NotesApp.prototype.getFolders = function () {
        var active = this.getActiveNotes(false);
        var ids = {};
        active.forEach(function (n) {
            var id = n.folderId || FOLDER_IDS.PERSONAL;
            if (id !== FOLDER_IDS.TRASH) ids[id] = true;
        });
        var list = [
            { id: FOLDER_IDS.WORK, name: 'Work' },
            { id: FOLDER_IDS.STUDY, name: 'Study' },
            { id: FOLDER_IDS.PERSONAL, name: 'Personal' },
            { id: FOLDER_IDS.GENERAL, name: 'General' }
        ];
        Object.keys(ids).forEach(function (id) {
            if (id !== FOLDER_IDS.WORK && id !== FOLDER_IDS.STUDY && id !== FOLDER_IDS.PERSONAL && id !== FOLDER_IDS.GENERAL && id.indexOf('__') !== 0) {
                list.push({ id: id, name: id });
            }
        });
        return list;
    };

    NotesApp.prototype.getNotesForList = function () {
        var self = this;
        var active = this.getActiveNotes(false);
        if (this.filterFolder === FOLDER_IDS.TRASH) {
            active = this.notes.filter(function (n) { return n.trashed; });
        } else if (this.filterFolder === FOLDER_IDS.FAVORITES) {
            active = active.filter(function (n) { return n.pinned; });
        } else if (this.filterFolder === FOLDER_IDS.RECENT) {
            active = active.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); }).slice(0, 50);
        } else if (this.filterFolder !== FOLDER_IDS.ALL) {
            active = active.filter(function (n) { return (n.folderId || FOLDER_IDS.PERSONAL) === self.filterFolder; });
        }
        if (this.filterTag) {
            active = active.filter(function (n) { return (n.tags || []).indexOf(self.filterTag) >= 0; });
        }
        if (this.searchQuery.trim()) {
            var q = this.searchQuery.toLowerCase();
            active = active.filter(function (n) {
                return (n.title || '').toLowerCase().indexOf(q) >= 0 || (n.content || '').toLowerCase().indexOf(q) >= 0;
            });
        }
        if (this.sortBy === 'title') {
            active = active.slice().sort(function (a, b) { return (a.title || '').localeCompare(b.title || ''); });
        } else if (this.sortBy === 'created') {
            active = active.slice().sort(function (a, b) { return (a.createdAt || 0) - (b.createdAt || 0); });
        } else if (this.sortBy === 'size') {
            active = active.slice().sort(function (a, b) { return (b.content || '').length - (a.content || '').length; });
        } else {
            active = active.slice().sort(function (a, b) { return (b.updatedAt || 0) - (a.updatedAt || 0); });
        }
        return active;
    };

    NotesApp.prototype.save = function () {
        saveStoredNotes(this.notes);
        if (typeof storage !== 'undefined') {
            storage.set('notesSortBy', this.sortBy);
            storage.set('notesSidebarWidth', this.sidebarWidth);
        }
    };

    NotesApp.prototype.pushVersion = function (note, title, content) {
        if (!note) return;
        note.versionHistory = note.versionHistory || [];
        note.versionHistory.push({ title: title, content: content, at: Date.now() });
        if (note.versionHistory.length > MAX_VERSIONS) note.versionHistory.shift();
    };

    NotesApp.prototype.open = function () {
        if (typeof windowManager === 'undefined' || !windowManager.createWindow) {
            if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'Window manager not available');
            else if (typeof alert === 'function') alert('Notes: Window manager not available. Refresh the page.');
            return;
        }
        var self = this;
        if (!Array.isArray(this.notes)) this.notes = [];
        var content;
        try {
            content = this.render();
        } catch (err) {
            if (typeof console !== 'undefined' && console.error) console.error('Notes render:', err);
            if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'Could not render: ' + (err && err.message));
            return;
        }
        var windowEl = windowManager.createWindow(this.windowId, {
            title: 'Notes',
            width: 960,
            height: 720,
            class: 'app-notes',
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><path d="M14 2v6h6"></path></svg>',
            content: content
        });
        try {
            this.attachEvents(windowEl);
        } catch (err) {
            if (typeof console !== 'undefined' && console.error) console.error('Notes attachEvents:', err);
        }
    };

    NotesApp.prototype.render = function () {
        var self = this;
        var folders = this.getFolders();
        var listNotes = this.getNotesForList();
        var folderOptions = folders.map(function (f) {
            return '<option value="' + self.escapeHtml(f.id) + '">' + self.escapeHtml(f.name) + '</option>';
        }).join('');
        var sortOptions = [
            { v: 'updated', l: 'Last updated' },
            { v: 'created', l: 'Created' },
            { v: 'title', l: 'Title' },
            { v: 'size', l: 'Size' }
        ].map(function (o) {
            return '<option value="' + o.v + '"' + (self.sortBy === o.v ? ' selected' : '') + '>' + o.l + '</option>';
        }).join('');

        var listHtml = listNotes.slice(0, 150).map(function (note) {
            return self.renderNoteItem(note);
        }).join('');

        return '<div class="notes-container">' +
            '<div class="notes-layout">' +
            '<!-- LEFT SIDEBAR -->' +
            '<aside class="notes-sidebar glass" id="notes-sidebar" style="width:' + this.sidebarWidth + 'px">' +
            '<div class="notes-resize-handle" id="notes-resize-handle" aria-hidden="true"></div>' +
            '<div class="notes-sidebar-inner">' +
            '<div class="notes-search">' +
            '<input type="text" class="notes-search-input" id="notes-search-input" placeholder="Search notes (Ctrl+F)">' +
            '</div>' +
            '<button type="button" class="notes-btn-new-note" id="notes-btn-new-note" title="New Note (Ctrl+N)">+ New Note</button>' +
            '<nav class="notes-nav" aria-label="Note categories">' +
            '<button class="notes-nav-item active" data-folder="' + FOLDER_IDS.ALL + '">All</button>' +
            '<button class="notes-nav-item" data-folder="' + FOLDER_IDS.FAVORITES + '">★ Favorites</button>' +
            '<button class="notes-nav-item" data-folder="' + FOLDER_IDS.RECENT + '">Recent</button>' +
            folders.map(function (f) {
                return '<button class="notes-nav-item" data-folder="' + self.escapeHtml(f.id) + '">' + self.escapeHtml(f.name) + '</button>';
            }).join('') +
            '<button class="notes-nav-item" data-folder="' + FOLDER_IDS.TRASH + '">Trash</button>' +
            '</nav>' +
            '<div class="notes-sort-row">' +
            '<label class="notes-sort-label">Sort:</label>' +
            '<select id="notes-sort-select" class="notes-sort-select">' + sortOptions + '</select>' +
            '</div>' +
            '<div class="notes-list" id="notes-list">' + listHtml + '</div>' +
            '</div></aside>' +
            '<!-- MAIN AREA -->' +
            '<main class="notes-main">' +
            '<!-- TOP BAR (actions) -->' +
            '<header class="notes-top-bar glass" id="notes-top-bar">' +
            '<span class="notes-save-status" id="notes-save-status">Saved</span>' +
            '<div class="notes-top-actions">' +
            '<button type="button" class="notes-btn notes-top-btn" id="notes-top-new" title="New Note (Ctrl+N)">New Note</button>' +
            '<button type="button" class="notes-btn notes-top-btn" id="notes-top-delete" title="Delete / Move to Trash" style="display:none">Delete</button>' +
            '<button type="button" class="notes-btn notes-top-btn" id="notes-top-restore" title="Restore from Trash" style="display:none">Restore</button>' +
            '<button type="button" class="notes-btn notes-top-btn" id="notes-top-fav" title="Favorite" style="display:none">★ Favorite</button>' +
            '<select id="notes-top-folder" class="notes-top-folder" title="Move to folder" style="display:none">' + folderOptions + '</select>' +
            '<button type="button" class="notes-btn notes-top-btn" id="notes-top-export" title="Export" style="display:none">Export</button>' +
            '</div></header>' +
            '<!-- EMPTY STATE (no note selected) -->' +
            '<div class="notes-empty-state" id="notes-empty-state">' +
            '<div class="notes-empty-inner">' +
            '<p class="notes-empty-title">No note selected</p>' +
            '<p class="notes-empty-desc">Create your first note or pick one from the list.</p>' +
            '<button type="button" class="notes-btn notes-btn-primary notes-empty-cta" id="notes-empty-cta">Create your first note</button>' +
            '</div></div>' +
            '<!-- EDITOR (only when note selected) -->' +
            '<div class="notes-editor-wrap" id="notes-editor-wrap" style="display:none">' +
            '<input type="text" class="note-editor-title" id="note-title" placeholder="Note title">' +
            '<div class="notes-format-toolbar glass">' +
            '<button type="button" class="notes-tb-btn" data-cmd="bold" title="Bold (Ctrl+B)">B</button>' +
            '<button type="button" class="notes-tb-btn" data-cmd="italic" title="Italic (Ctrl+I)">I</button>' +
            '<button type="button" class="notes-tb-btn" data-cmd="h1" title="Heading 1">H1</button>' +
            '<button type="button" class="notes-tb-btn" data-cmd="h2" title="Heading 2">H2</button>' +
            '<button type="button" class="notes-tb-btn" data-cmd="bullet" title="Bullet list">• List</button>' +
            '<button type="button" class="notes-tb-btn" data-cmd="checkbox" title="Checklist">☑</button>' +
            '<button type="button" class="notes-tb-btn" data-cmd="code" title="Code">code</button>' +
            '<button type="button" class="notes-tb-btn" data-cmd="quote" title="Quote">Quote</button>' +
            '</div>' +
            '<div class="notes-editor-tabs">' +
            '<button class="notes-tab active" data-tab="edit">Edit</button>' +
            '<button class="notes-tab" data-tab="preview">Preview</button>' +
            '<button class="notes-tab" data-tab="split">Split</button>' +
            '</div>' +
            '<div class="notes-editor-area">' +
            '<textarea class="note-editor-content" id="note-content" placeholder="Write your note… (Markdown supported)"></textarea>' +
            '<div class="note-preview-content" id="note-preview" style="display:none"></div>' +
            '</div>' +
            '<div class="notes-editor-footer">' +
            '<span class="notes-word-count" id="notes-word-count">0 words</span>' +
            '<span class="notes-reading-time" id="notes-reading-time"></span>' +
            '<button type="button" class="notes-btn notes-footer-save" id="note-save-btn">Save (Ctrl+S)</button>' +
            '</div></div>' +
            '</main></div></div>';
    };

    NotesApp.prototype.renderNoteItem = function (note) {
        var title = this.escapeHtml(note.title || 'Untitled');
        var preview = this.escapeHtml((note.content || '').substring(0, 80).replace(/\n/g, ' '));
        var meta = this.formatDate(note.updatedAt || note.createdAt);
        var icon = note.icon || '📄';
        var active = note.id === this.currentNoteId ? ' active' : '';
        var pin = note.pinned ? ' 📌' : '';
        var tagStr = (note.tags || []).slice(0, 2).join(', ');
        return '<div class="note-item glass' + active + '" data-note-id="' + this.escapeHtml(note.id) + '">' +
            '<span class="note-item-icon">' + icon + '</span>' +
            '<div class="note-item-body">' +
            '<div class="note-title">' + title + pin + '</div>' +
            '<div class="note-preview">' + preview + '</div>' +
            '<div class="note-meta">' + meta + (tagStr ? ' · ' + this.escapeHtml(tagStr) : '') + '</div>' +
            '</div></div>';
    };

    NotesApp.prototype.setSaveStatus = function (content, status) {
        var el = content && content.querySelector('#notes-save-status');
        if (el) el.textContent = status;
    };

    NotesApp.prototype.attachEvents = function (winEl) {
        var self = this;
        if (!winEl || !winEl.querySelector) return;
        var content = winEl.querySelector('.window-content');
        if (!content) return;

        var list = content.querySelector('#notes-list');
        var editorWrap = content.querySelector('#notes-editor-wrap');
        var emptyState = content.querySelector('#notes-empty-state');
        var titleInput = content.querySelector('#note-title');
        var contentInput = content.querySelector('#note-content');
        var previewDiv = content.querySelector('#note-preview');
        var searchInput = content.querySelector('#notes-search-input');
        var sidebar = content.querySelector('#notes-sidebar');
        var resizeHandle = content.querySelector('#notes-resize-handle');

        if (!list || !contentInput || !titleInput) return;

        function showEditor(show) {
            if (show) {
                if (editorWrap) editorWrap.style.display = 'flex';
                if (emptyState) emptyState.style.display = 'none';
                var topDelete = content.querySelector('#notes-top-delete');
                var topFav = content.querySelector('#notes-top-fav');
                var topFolder = content.querySelector('#notes-top-folder');
                var topExport = content.querySelector('#notes-top-export');
                if (topDelete) topDelete.style.display = 'inline-block';
                if (topFav) topFav.style.display = 'inline-block';
                if (topFolder) topFolder.style.display = 'inline-block';
                if (topExport) topExport.style.display = 'inline-block';
            } else {
                if (editorWrap) editorWrap.style.display = 'none';
                if (emptyState) emptyState.style.display = 'flex';
                var topDelete = content.querySelector('#notes-top-delete');
                var topFav = content.querySelector('#notes-top-fav');
                var topFolder = content.querySelector('#notes-top-folder');
                var topExport = content.querySelector('#notes-top-export');
                if (topDelete) topDelete.style.display = 'none';
                if (topFav) topFav.style.display = 'none';
                if (topFolder) topFolder.style.display = 'none';
                if (topExport) topExport.style.display = 'none';
            }
        }

        function doNewNote() {
            self.currentNoteId = null;
            titleInput.value = '';
            contentInput.value = '';
            if (previewDiv) previewDiv.innerHTML = '';
            showEditor(true);
            self.refreshList(content);
            titleInput.focus();
        }

        list.addEventListener('click', function (e) {
            var item = e.target.closest('.note-item');
            if (!item) return;
            var id = item.dataset.noteId;
            if (id) self.loadNote(id, winEl);
        });

        content.querySelectorAll('.notes-nav-item').forEach(function (btn) {
            btn.addEventListener('click', function () {
                self.filterFolder = btn.dataset.folder;
                content.querySelectorAll('.notes-nav-item').forEach(function (b) { b.classList.remove('active'); });
                btn.classList.add('active');
                self.refreshList(content);
            });
        });

        var sortSelect = content.querySelector('#notes-sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', function () {
                self.sortBy = sortSelect.value;
                self.save();
                self.refreshList(content);
            });
        }

        var newNoteSidebar = content.querySelector('#notes-btn-new-note');
        if (newNoteSidebar) newNoteSidebar.addEventListener('click', doNewNote);
        var newNoteTop = content.querySelector('#notes-top-new');
        if (newNoteTop) newNoteTop.addEventListener('click', doNewNote);
        var emptyCta = content.querySelector('#notes-empty-cta');
        if (emptyCta) emptyCta.addEventListener('click', doNewNote);

        var searchDebounce;
        searchInput.addEventListener('input', function () {
            clearTimeout(searchDebounce);
            searchDebounce = setTimeout(function () {
                self.searchQuery = searchInput.value;
                self.refreshList(content);
            }, 200);
        });

        if (resizeHandle && sidebar) {
            var dragging = false;
            resizeHandle.addEventListener('mousedown', function (e) {
                e.preventDefault();
                dragging = true;
                var startX = e.clientX, startW = sidebar.offsetWidth;
                function onMove(ev) {
                    var w = Math.min(420, Math.max(160, startW + (ev.clientX - startX)));
                    sidebar.style.width = w + 'px';
                    self.sidebarWidth = w;
                }
                function onUp() {
                    dragging = false;
                    document.removeEventListener('mousemove', onMove);
                    document.removeEventListener('mouseup', onUp);
                    self.save();
                }
                document.addEventListener('mousemove', onMove);
                document.addEventListener('mouseup', onUp);
            });
        }

        content.querySelectorAll('.notes-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                var t = tab.dataset.tab;
                content.querySelectorAll('.notes-tab').forEach(function (x) { x.classList.remove('active'); });
                tab.classList.add('active');
                var area = content.querySelector('.notes-editor-area');
                if (t === 'split' && area) {
                    area.classList.add('split-view');
                    contentInput.style.display = 'block';
                    previewDiv.style.display = 'block';
                    self.updatePreview(previewDiv, contentInput.value);
                } else {
                    if (area) area.classList.remove('split-view');
                    if (t === 'preview') {
                        contentInput.style.display = 'none';
                        previewDiv.style.display = 'block';
                        self.updatePreview(previewDiv, contentInput.value);
                    } else {
                        contentInput.style.display = 'block';
                        previewDiv.style.display = 'none';
                    }
                }
            });
        });

        var saveBtn = content.querySelector('#note-save-btn');
        if (saveBtn) saveBtn.addEventListener('click', function () {
            self.saveNoteFromEditor(winEl, true);
        });

        var topDelete = content.querySelector('#notes-top-delete');
        if (topDelete) topDelete.addEventListener('click', function () {
            if (!self.currentNoteId) return;
            var note = self.notes.find(function (n) { return n.id === self.currentNoteId; });
            if (!note) return;
            if (note.trashed) {
                if (!confirm('Permanently delete this note?')) return;
                self.notes = self.notes.filter(function (n) { return n.id !== self.currentNoteId; });
                self.currentNoteId = null;
                titleInput.value = '';
                contentInput.value = '';
                showEditor(false);
            } else {
                note.trashed = true;
                note.deletedAt = Date.now();
                self.currentNoteId = null;
                titleInput.value = '';
                contentInput.value = '';
                showEditor(false);
            }
            self.save();
            self.refreshList(content);
        });

        var topRestore = content.querySelector('#notes-top-restore');
        if (topRestore) topRestore.addEventListener('click', function () {
            var note = self.currentNoteId && self.notes.find(function (n) { return n.id === self.currentNoteId; });
            if (note && note.trashed) {
                note.trashed = false;
                note.deletedAt = null;
                self.save();
                self.refreshList(content);
                topRestore.style.display = 'none';
                if (topDelete) topDelete.textContent = 'Delete';
            }
        });

        var topFav = content.querySelector('#notes-top-fav');
        if (topFav) topFav.addEventListener('click', function () {
            var note = self.currentNoteId && self.notes.find(function (n) { return n.id === self.currentNoteId; });
            if (note) {
                note.pinned = !note.pinned;
                topFav.textContent = note.pinned ? '★ Favorited' : '★ Favorite';
                self.save();
                self.refreshList(content);
            }
        });

        var topFolder = content.querySelector('#notes-top-folder');
        if (topFolder) topFolder.addEventListener('change', function () {
            var note = self.currentNoteId && self.notes.find(function (n) { return n.id === self.currentNoteId; });
            if (note) {
                note.folderId = topFolder.value || FOLDER_IDS.PERSONAL;
                self.save();
                self.refreshList(content);
            }
        });

        var topExport = content.querySelector('#notes-top-export');
        if (topExport) topExport.addEventListener('click', function () {
            self.exportCurrentNote(content);
        });

        contentInput.addEventListener('input', function () {
            var text = contentInput.value;
            var words = text.trim().split(/\s+/).filter(function (w) { return w.length > 0; }).length;
            var wc = content.querySelector('#notes-word-count');
            if (wc) wc.textContent = words + ' word' + (words !== 1 ? 's' : '');
            var rt = content.querySelector('#notes-reading-time');
            if (rt) rt.textContent = Math.max(1, Math.ceil(words / 200)) + ' min read';
            if (previewDiv.style.display !== 'none') self.updatePreview(previewDiv, text);
            clearTimeout(self.autoSaveTimeout);
            self.autoSaveTimeout = setTimeout(function () {
                if (self.currentNoteId || titleInput.value.trim() || text.trim()) {
                    self.setSaveStatus(content, 'Saving...');
                    self.saveNoteFromEditor(winEl, false);
                    self.setSaveStatus(content, 'Saved');
                }
            }, 500);
        });

        contentInput.addEventListener('paste', function (e) {
            var items = e.clipboardData && e.clipboardData.items;
            if (!items) return;
            for (var i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    var file = items[i].getAsFile();
                    if (file) {
                        var reader = new FileReader();
                        reader.onload = function (ev) {
                            var url = ev.target.result;
                            var insert = '\n![](' + url + ')\n';
                            var start = contentInput.selectionStart;
                            contentInput.value = contentInput.value.substring(0, start) + insert + contentInput.value.substring(contentInput.selectionEnd);
                            contentInput.selectionStart = contentInput.selectionEnd = start + insert.length;
                        };
                        reader.readAsDataURL(file);
                    }
                    break;
                }
            }
        });

        content.querySelectorAll('.notes-tb-btn[data-cmd]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var cmd = btn.dataset.cmd;
                if (cmd === 'bold') self.wrapSelection(contentInput, '**', '**');
                else if (cmd === 'italic') self.wrapSelection(contentInput, '*', '*');
                else if (cmd === 'h1') self.wrapLine(contentInput, '# ', '');
                else if (cmd === 'h2') self.wrapLine(contentInput, '## ', '');
                else if (cmd === 'h3') self.wrapLine(contentInput, '### ', '');
                else if (cmd === 'code') self.wrapSelection(contentInput, '`', '`');
                else if (cmd === 'checkbox') self.insertAtCursor(contentInput, '\n- [ ] ');
                else if (cmd === 'bullet') self.insertAtCursor(contentInput, '\n- ');
                else if (cmd === 'quote') self.wrapLine(contentInput, '> ', '');
                contentInput.focus();
            });
        });

        contentInput.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.key === 'b') { e.preventDefault(); self.wrapSelection(contentInput, '**', '**'); }
            if (e.ctrlKey && e.key === 'i') { e.preventDefault(); self.wrapSelection(contentInput, '*', '*'); }
            if (e.ctrlKey && e.key === 'k') { e.preventDefault(); self.insertLink(contentInput); }
        });

        winEl.addEventListener('keydown', function (e) {
            if (e.ctrlKey && e.key === 'n') { e.preventDefault(); doNewNote(); }
            if (e.ctrlKey && e.key === 's') { e.preventDefault(); self.saveNoteFromEditor(winEl, true); self.setSaveStatus(content, 'Saved'); }
            if (e.ctrlKey && e.key === 'f') { e.preventDefault(); searchInput.focus(); }
            if (e.ctrlKey && e.key === 'p') { e.preventDefault(); var previewTab = content.querySelector('.notes-tab[data-tab="preview"]'); if (previewTab) previewTab.click(); }
        });

        showEditor(!!this.currentNoteId);
    };

    NotesApp.prototype.wrapSelection = function (textarea, before, after) {
        var start = textarea.selectionStart, end = textarea.selectionEnd;
        var sel = textarea.value.substring(start, end);
        var rep = before + sel + after;
        textarea.value = textarea.value.substring(0, start) + rep + textarea.value.substring(end);
        textarea.setSelectionRange(start + before.length, start + before.length + sel.length);
    };

    NotesApp.prototype.wrapLine = function (textarea, before, after) {
        var val = textarea.value;
        var start = textarea.selectionStart;
        var lineStart = val.lastIndexOf('\n', start - 1) + 1;
        var lineEnd = val.indexOf('\n', start);
        if (lineEnd < 0) lineEnd = val.length;
        var line = val.substring(lineStart, lineEnd);
        var newLine = before + line + after;
        textarea.value = val.substring(0, lineStart) + newLine + val.substring(lineEnd);
        textarea.setSelectionRange(lineStart, lineStart + newLine.length);
    };

    NotesApp.prototype.insertAtCursor = function (textarea, text) {
        var start = textarea.selectionStart;
        textarea.value = textarea.value.substring(0, start) + text + textarea.value.substring(textarea.selectionEnd);
        textarea.setSelectionRange(start + text.length, start + text.length);
    };

    NotesApp.prototype.insertTable = function (textarea) {
        var tbl = '\n| Col1 | Col2 | Col3 |\n|------|------|------|\n|  |  |  |\n';
        this.insertAtCursor(textarea, tbl);
    };

    NotesApp.prototype.insertLink = function (textarea) {
        var start = textarea.selectionStart, end = textarea.selectionEnd;
        var sel = textarea.value.substring(start, end);
        var linkText = sel || 'link';
        var rep = '[' + linkText + '](url)';
        textarea.value = textarea.value.substring(0, start) + rep + textarea.value.substring(end);
        textarea.setSelectionRange(start + linkText.length + 3, start + linkText.length + 6);
    };

    NotesApp.prototype.saveNoteFromEditor = function (winEl, showFeedback) {
        if (showFeedback === undefined) showFeedback = true;
        var content = winEl && winEl.querySelector('.window-content');
        if (!content) return;
        var titleInput = content.querySelector('#note-title');
        var contentInput = content.querySelector('#note-content');
        var folderSelect = content.querySelector('#notes-top-folder');
        var title = titleInput ? titleInput.value.trim() : '';
        var text = contentInput ? contentInput.value : '';

        var self = this;
        var crossLinks = [];
        var matches = text.match(/\[\[([^\]]+)\]\]/g);
        if (matches) {
            matches.forEach(function (m) {
                var name = m.replace(/\[\[|\]\]/g, '');
                var linked = self.notes.find(function (n) { return n.title === name || n.id === name; });
                if (linked && linked.id !== self.currentNoteId) crossLinks.push(linked.id);
            });
        }

        if (this.currentNoteId) {
            var note = this.notes.find(function (n) { return n.id === this.currentNoteId; }.bind(this));
            if (note) {
                this.pushVersion(note, note.title, note.content);
                note.title = title || 'Untitled';
                note.content = text;
                note.updatedAt = Date.now();
                note.linkedNotes = crossLinks;
                if (folderSelect) note.folderId = folderSelect.value || FOLDER_IDS.PERSONAL;
            }
        } else {
            var newNote = normalizeNote({
                id: 'note_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
                title: title || 'Untitled',
                content: text,
                folderId: folderSelect ? folderSelect.value : FOLDER_IDS.PERSONAL,
                linkedNotes: crossLinks
            });
            this.notes.unshift(newNote);
            this.currentNoteId = newNote.id;
        }

        this.save();
        this.refreshList(content);
        this.setSaveStatus(content, 'Saved');

        if (showFeedback) {
            var saveBtn = content.querySelector('#note-save-btn');
            if (saveBtn) {
                var orig = saveBtn.textContent;
                saveBtn.textContent = 'Saved';
                saveBtn.style.background = 'rgba(34, 197, 94, 0.8)';
                setTimeout(function () { saveBtn.textContent = orig; saveBtn.style.background = ''; }, 1200);
            }
        }
    };

    NotesApp.prototype.loadNote = function (noteId, winEl) {
        var note = this.notes.find(function (n) { return n.id === noteId; });
        if (!note) return;
        var content = winEl && winEl.querySelector('.window-content');
        if (!content) return;
        var titleInput = content.querySelector('#note-title');
        var contentInput = content.querySelector('#note-content');
        var previewDiv = content.querySelector('#note-preview');
        var folderSelect = content.querySelector('#notes-top-folder');
        var topFav = content.querySelector('#notes-top-fav');

        this.currentNoteId = noteId;
        titleInput.value = note.title || '';
        contentInput.value = note.content || '';
        if (folderSelect) folderSelect.value = note.folderId || FOLDER_IDS.PERSONAL;
        if (topFav) topFav.textContent = note.pinned ? '★ Favorited' : '★ Favorite';
        this.updatePreview(previewDiv, note.content || '');

        var editorWrap = content.querySelector('#notes-editor-wrap');
        var emptyState = content.querySelector('#notes-empty-state');
        if (editorWrap) editorWrap.style.display = 'flex';
        if (emptyState) emptyState.style.display = 'none';
        var topDelete = content.querySelector('#notes-top-delete');
        var topRestore = content.querySelector('#notes-top-restore');
        var topExport = content.querySelector('#notes-top-export');
        if (topDelete) {
            topDelete.style.display = 'inline-block';
            topDelete.textContent = note.trashed ? 'Delete permanently' : 'Delete';
        }
        if (topRestore) topRestore.style.display = note.trashed ? 'inline-block' : 'none';
        if (topFav) topFav.style.display = 'inline-block';
        if (folderSelect) folderSelect.style.display = 'inline-block';
        if (topExport) topExport.style.display = 'inline-block';

        this.refreshList(content);
    };

    NotesApp.prototype.updatePreview = function (previewDiv, markdown) {
        if (!previewDiv) return;
        if (typeof marked !== 'undefined') {
            previewDiv.innerHTML = marked.parse(markdown || '');
        } else {
            previewDiv.innerHTML = this.simpleMarkdown(markdown || '');
        }
        this.processCrossLinks(previewDiv);
        previewDiv.querySelectorAll('input[type="checkbox"]').forEach(function (cb) {
            cb.addEventListener('change', function () {
                var line = this.closest('li');
                if (line) line.classList.toggle('checked', this.checked);
            });
        });
    };

    NotesApp.prototype.simpleMarkdown = function (text) {
        return this.escapeHtml(text)
            .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
            .replace(/\*(.+?)\*/g, '<em>$1</em>')
            .replace(/`(.+?)`/g, '<code>$1</code>')
            .replace(/^# (.+)$/gm, '<h1>$1</h1>')
            .replace(/^## (.+)$/gm, '<h2>$1</h2>')
            .replace(/^### (.+)$/gm, '<h3>$1</h3>')
            .replace(/^- \[x\] (.+)$/gim, '<li class="checked"><input type="checkbox" checked disabled> $1</li>')
            .replace(/^- \[ \] (.+)$/gim, '<li><input type="checkbox" disabled> $1</li>')
            .replace(/\n/g, '<br>');
    };

    NotesApp.prototype.processCrossLinks = function (element) {
        var self = this;
        if (!element || !element.innerHTML) return;
        element.innerHTML = element.innerHTML.replace(/\[\[([^\]]+)\]\]/g, function (_, name) {
            var note = self.notes.find(function (n) { return n.title === name; });
            if (note) return '<a href="#" class="note-cross-link" data-note-id="' + self.escapeHtml(note.id) + '">' + self.escapeHtml(name) + '</a>';
            return '[[' + name + ']]';
        });
        element.querySelectorAll('.note-cross-link').forEach(function (a) {
            a.addEventListener('click', function (e) {
                e.preventDefault();
                var win = a.closest('.window');
                if (win && a.dataset.noteId) self.loadNote(a.dataset.noteId, win);
            });
        });
    };

    NotesApp.prototype.refreshList = function (container) {
        if (!container) return;
        var list = container.querySelector('#notes-list');
        if (!list) return;
        var notes = this.getNotesForList();
        list.innerHTML = notes.slice(0, 150).map(this.renderNoteItem.bind(this)).join('');
    };

    NotesApp.prototype.filterNotes = function (query, list) {
        this.searchQuery = query;
        var container = list && list.closest('.window');
        if (container) this.refreshList(container.querySelector('.window-content'));
    };

    NotesApp.prototype.showAIMenu = function (content, window, contentInput) {
        var self = this;
        var note = this.currentNoteId && this.notes.find(function (n) { return n.id === this.currentNoteId; }.bind(this));
        var text = (contentInput && contentInput.value) || (note && note.content) || '';
        var menu = document.createElement('div');
        menu.className = 'notes-dropdown glass';
        menu.innerHTML = '<button data-ai="title">Auto title</button><button data-ai="summarize">Summarize</button><button data-ai="rewrite">Rewrite</button><button data-ai="points">Key points</button><button data-ai="tasks">Convert to tasks</button><button data-ai="expand">Expand</button><button data-ai="tags">Auto tags</button><button data-ai="quiz">Generate quiz</button>';
        var rect = content.querySelector('#note-ai-menu').getBoundingClientRect();
        menu.style.position = 'fixed';
        menu.style.left = rect.left + 'px';
        menu.style.top = (rect.bottom + 4) + 'px';
        menu.style.zIndex = '10000';
        document.body.appendChild(menu);
        function close() {
            if (menu.parentNode) menu.parentNode.removeChild(menu);
        }
        menu.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var action = btn.dataset.ai;
                close();
                self.runAIAction(action, text, content, window, contentInput);
            });
        });
        setTimeout(function () {
            document.addEventListener('click', function handler() {
                document.removeEventListener('click', handler);
                close();
            });
        }, 0);
    };

    NotesApp.prototype.runAIAction = function (action, inputText, content, window, contentInput) {
        var self = this;
        var prompts = {
            title: { sys: 'Suggest a short note title (3-6 words) for the following text. Reply with ONLY the title, no quotes.', user: inputText.substring(0, 1500) },
            summarize: { sys: 'Summarize the following note in 2-4 concise sentences. Reply with only the summary.', user: inputText },
            rewrite: { sys: 'Improve and rewrite the following text for clarity and flow. Keep the same length. Reply with only the rewritten text.', user: inputText },
            points: { sys: 'List 3-7 key points from the following text. One per line, start each with a dash.', user: inputText },
            tasks: { sys: 'Convert the following into a short task list. Reply with markdown checklist format: - [ ] Task one', user: inputText.substring(0, 1200) },
            expand: { sys: 'Expand the following short note into a longer, well-structured note (2-3 paragraphs). Reply with only the expanded text.', user: inputText },
            tags: { sys: 'Suggest 3-5 tags (single words or short phrases) for this note. Reply with only comma-separated tags.', user: inputText.substring(0, 800) },
            quiz: { sys: 'Generate 3-5 quiz questions from the following note. Reply with one question per line in the format: Q: question? A: answer', user: inputText.substring(0, 2000) }
        };
        var p = prompts[action];
        if (!p) return;
        if (typeof notificationSystem !== 'undefined') notificationSystem.info('Notes', 'AI processing...');
        fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ messages: [{ role: 'system', content: p.sys }, { role: 'user', content: p.user }] })
        }).then(function (r) { return r.ok ? r.json() : null; }).then(function (data) {
            var out = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : '';
            if (!out) {
                if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'AI request failed');
                return;
            }
            var titleInput = content.querySelector('#note-title');
            if (action === 'title' && titleInput) {
                titleInput.value = out.replace(/^["']|["']$/g, '');
            } else if (action === 'tags') {
                var tagsInput = content.querySelector('#note-tags-input');
                if (tagsInput) tagsInput.value = out;
            } else if (action === 'quiz') {
                self.showQuizModal(out);
            } else if (contentInput) {
                contentInput.value = out;
                self.updatePreview(content.querySelector('#note-preview'), out);
            }
            if (typeof notificationSystem !== 'undefined') notificationSystem.success('Notes', 'Done');
        }).catch(function () {
            if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'AI request failed');
        });
    };

    NotesApp.prototype.showMoreMenu = function (content, window) {
        var self = this;
        var menu = document.createElement('div');
        menu.className = 'notes-dropdown glass';
        menu.innerHTML = '<button data-more="focus">Focus mode</button><button data-more="flashcards">Flashcards from note</button><button data-more="import">Import JSON</button><button data-more="exportAll">Export all (JSON)</button><button data-more="template">New from template</button><button data-more="voice">Voice note</button><button data-more="drawing">Drawing</button>';
        var btn = content.querySelector('#note-more-btn');
        var rect = btn.getBoundingClientRect();
        menu.style.cssText = 'position:fixed;left:' + rect.left + 'px;top:' + (rect.bottom + 4) + 'px;z-index:10000';
        document.body.appendChild(menu);
        function close() {
            if (menu.parentNode) menu.parentNode.removeChild(menu);
        }
        menu.querySelector('[data-more="focus"]').addEventListener('click', function () {
            close();
            var wrap = content.querySelector('.notes-editor-wrap');
            if (wrap) wrap.classList.toggle('notes-focus-mode');
        });
        menu.querySelector('[data-more="import"]').addEventListener('click', function () {
            close();
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.json';
            inp.onchange = function () {
                var f = inp.files[0];
                if (!f) return;
                var r = new FileReader();
                r.onload = function () {
                    try {
                        var json = JSON.parse(r.result);
                        var arr = Array.isArray(json) ? json : (json.notes || []);
                        arr.forEach(function (n) {
                            var norm = normalizeNote(n);
                            if (norm && !self.notes.some(function (x) { return x.id === norm.id; })) self.notes.push(norm);
                        });
                        self.save();
                        self.refreshList(content);
                        if (typeof notificationSystem !== 'undefined') notificationSystem.success('Notes', 'Imported ' + arr.length + ' notes');
                    } catch (e) {
                        if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'Invalid JSON');
                    }
                };
                r.readAsText(f);
            };
            inp.click();
        });
        menu.querySelector('[data-more="exportAll"]').addEventListener('click', function () {
            close();
            var blob = new Blob([JSON.stringify(self.notes, null, 2)], { type: 'application/json' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = 'notes-export-' + Date.now() + '.json';
            a.click();
            URL.revokeObjectURL(a.href);
        });
        menu.querySelector('[data-more="template"]').addEventListener('click', function () {
            close();
            self.createFromTemplate(content, window);
        });
        var voiceBtn = menu.querySelector('[data-more="voice"]');
        if (voiceBtn) voiceBtn.addEventListener('click', function () { close(); self.toggleVoiceRecord(content, window); });
        var drawBtn = menu.querySelector('[data-more="drawing"]');
        if (drawBtn) drawBtn.addEventListener('click', function () { close(); self.openDrawingPanel(content, window); });
        var fcBtn = menu.querySelector('[data-more="flashcards"]');
        if (fcBtn) fcBtn.addEventListener('click', function () { close(); self.openFlashcards(content); });
        setTimeout(function () { document.addEventListener('click', function h() { document.removeEventListener('click', h); close(); }); }, 0);
    };

    NotesApp.prototype.toggleVoiceRecord = function (content, window) {
        var self = this;
        if (this._voiceRecorder) {
            this._voiceRecorder.stop();
            this._voiceRecorder = null;
            if (typeof notificationSystem !== 'undefined') notificationSystem.info('Notes', 'Recording saved');
            return;
        }
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'Microphone not supported');
            return;
        }
        navigator.mediaDevices.getUserMedia({ audio: true }).then(function (stream) {
            var chunks = [];
            var rec = new (window.MediaRecorder || window.webkitMediaRecorder)(stream);
            rec.ondataavailable = function (e) { if (e.data.size) chunks.push(e.data); };
            rec.onstop = function () {
                stream.getTracks().forEach(function (t) { t.stop(); });
                var blob = new Blob(chunks, { type: 'audio/webm' });
                var reader = new FileReader();
                reader.onload = function () {
                    var note = self.currentNoteId && self.notes.find(function (n) { return n.id === self.currentNoteId; });
                    if (note) {
                        note.voiceData = reader.result;
                        self.save();
                        var contentInput = content.querySelector('#note-content');
                        if (contentInput) contentInput.value = (contentInput.value || '') + '\n\n[Voice note attached]\n';
                    }
                };
                reader.readAsDataURL(blob);
            };
            rec.start();
            self._voiceRecorder = rec;
            if (typeof notificationSystem !== 'undefined') notificationSystem.info('Notes', 'Recording... Click Voice note again to stop');
        }).catch(function () {
            if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'Microphone access denied');
        });
    };

    NotesApp.prototype.openDrawingPanel = function (content, window) {
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'notes-modal-overlay glass';
        var w = 500, h = 360;
        overlay.innerHTML = '<div class="notes-modal glass notes-drawing-modal">' +
            '<h3>Drawing</h3>' +
            '<canvas id="notes-drawing-canvas" width="' + w + '" height="' + h + '" style="display:block;background:#1e293b;border-radius:8px;touch-action:none;cursor:crosshair;"></canvas>' +
            '<div class="notes-drawing-toolbar">' +
            '<button type="button" class="notes-btn" id="notes-draw-clear">Clear</button>' +
            '<button type="button" class="notes-btn primary" id="notes-draw-save">Save to note</button>' +
            '<button type="button" class="notes-btn" id="notes-draw-close">Close</button></div></div>';
        document.body.appendChild(overlay);
        var canvas = overlay.querySelector('#notes-drawing-canvas');
        var ctx = canvas.getContext('2d');
        var drawing = false, lastX = 0, lastY = 0;
        ctx.strokeStyle = '#e2e8f0';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        function draw(e) {
            var x = (e.touches ? e.touches[0].clientX : e.clientX) - canvas.getBoundingClientRect().left;
            var y = (e.touches ? e.touches[0].clientY : e.clientY) - canvas.getBoundingClientRect().top;
            if (drawing) {
                ctx.beginPath();
                ctx.moveTo(lastX, lastY);
                ctx.lineTo(x, y);
                ctx.stroke();
            }
            lastX = x;
            lastY = y;
        }
        canvas.addEventListener('mousedown', function (e) { drawing = true; lastX = e.offsetX; lastY = e.offsetY; });
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', function () { drawing = false; });
        canvas.addEventListener('mouseleave', function () { drawing = false; });
        canvas.addEventListener('touchstart', function (e) { e.preventDefault(); drawing = true; lastX = (e.touches[0].clientX - canvas.getBoundingClientRect().left); lastY = (e.touches[0].clientY - canvas.getBoundingClientRect().top); });
        canvas.addEventListener('touchmove', function (e) { e.preventDefault(); draw(e); }, { passive: false });
        canvas.addEventListener('touchend', function () { drawing = false; });
        overlay.querySelector('#notes-draw-clear').onclick = function () { ctx.fillStyle = '#1e293b'; ctx.fillRect(0, 0, canvas.width, canvas.height); };
        overlay.querySelector('#notes-draw-save').onclick = function () {
            var note = self.currentNoteId && self.notes.find(function (n) { return n.id === self.currentNoteId; });
            if (note) {
                note.drawingData = canvas.toDataURL('image/png');
                self.save();
                var contentInput = content.querySelector('#note-content');
                if (contentInput) contentInput.value = (contentInput.value || '') + '\n\n![](' + note.drawingData + ')\n';
            }
            overlay.remove();
        };
        overlay.querySelector('#notes-draw-close').onclick = function () { overlay.remove(); };
        overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    };

    NotesApp.prototype.openFlashcards = function (content) {
        var note = this.currentNoteId && this.notes.find(function (n) { return n.id === this.currentNoteId; }.bind(this));
        if (!note || !note.content) return;
        var lines = note.content.split(/\n/).filter(function (s) { return s.trim(); });
        var cards = [];
        var i = 0;
        while (i < lines.length) {
            var line = lines[i];
            if (/^##\s+/.test(line)) {
                var front = line.replace(/^##\s+/, '').trim();
                var back = [];
                i++;
                while (i < lines.length && !/^##\s+/.test(lines[i])) { back.push(lines[i]); i++; }
                if (front) cards.push({ front: front, back: back.join('\n').trim() || front });
            } else if (/^[-*]\s+/.test(line)) {
                var parts = line.replace(/^[-*]\s+/, '').split(/[:–—]/);
                if (parts.length >= 2) cards.push({ front: parts[0].trim(), back: parts.slice(1).join(':').trim() });
                else if (line.trim()) cards.push({ front: line.replace(/^[-*]\s+/, '').trim(), back: '' });
                i++;
            } else {
                i++;
            }
        }
        if (cards.length === 0) {
            if (typeof notificationSystem !== 'undefined') notificationSystem.info('Notes', 'Use ## headings or "term : definition" lines for flashcards');
            return;
        }
        var overlay = document.createElement('div');
        overlay.className = 'notes-modal-overlay glass';
        var cardEl = document.createElement('div');
        cardEl.className = 'notes-modal glass';
        cardEl.style.minWidth = '320px';
        overlay.appendChild(cardEl);
        var idx = 0;
        var side = 'front';
        function showCard() {
            var c = cards[idx];
            cardEl.innerHTML = '<div class="notes-flashcard ' + side + '">' +
                (side === 'front' ? self.escapeHtml(c.front) : (c.back ? self.escapeHtml(c.back) : self.escapeHtml(c.front))) + '</div>' +
                '<div class="notes-flashcard-nav">' +
                '<button type="button" class="notes-btn" id="notes-fc-prev">Prev</button>' +
                '<span>' + (idx + 1) + ' / ' + cards.length + '</span>' +
                '<button type="button" class="notes-btn" id="notes-fc-next">Next</button></div>';
            cardEl.querySelector('#notes-fc-prev').onclick = function () {
                if (idx > 0) { idx--; side = 'front'; showCard(); }
            };
            cardEl.querySelector('#notes-fc-next').onclick = function () {
                if (side === 'front') { side = 'back'; showCard(); }
                else if (idx < cards.length - 1) { idx++; side = 'front'; showCard(); }
                else overlay.remove();
            };
            var fl = cardEl.querySelector('.notes-flashcard');
            if (fl) fl.onclick = function () {
                if (side === 'front') { side = 'back'; showCard(); }
            };
        }
        showCard();
        document.body.appendChild(overlay);
        overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    };

    NotesApp.prototype.createFromTemplate = function (content, window) {
        var self = this;
        var names = Object.keys(TEMPLATES);
        var choice = names[0];
        if (names.length > 1 && typeof prompt === 'function') {
            choice = prompt('Template: ' + names.join(', ') + '\nEnter name', names[0]) || names[0];
        }
        var t = TEMPLATES[choice];
        if (!t) return;
        var newNote = normalizeNote({
            title: t.name + ' ' + new Date().toLocaleDateString(),
            content: t.content,
            folderId: FOLDER_IDS.PERSONAL,
            type: 'normal'
        });
        this.notes.unshift(newNote);
        this.currentNoteId = newNote.id;
        this.save();
        this.refreshList(content);
        this.loadNote(newNote.id, window);
    };

    NotesApp.prototype.showVersionHistory = function (content, window) {
        var note = this.currentNoteId && this.notes.find(function (n) { return n.id === this.currentNoteId; }.bind(this));
        if (!note || !(note.versionHistory && note.versionHistory.length)) return;
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'notes-modal-overlay glass';
        var html = '<div class="notes-modal glass"><h3>Version history</h3><div class="notes-version-list">';
        note.versionHistory.slice().reverse().forEach(function (v, i) {
            html += '<div class="notes-version-item" data-index="' + (note.versionHistory.length - 1 - i) + '">' +
                '<span>' + new Date(v.at).toLocaleString() + '</span>' +
                '<button type="button" class="notes-btn small">Restore</button></div>';
        });
        html += '</div><button type="button" class="notes-btn" id="notes-version-close">Close</button></div>';
        overlay.innerHTML = html;
        document.body.appendChild(overlay);
        overlay.querySelector('#notes-version-close').onclick = function () { overlay.remove(); };
        overlay.querySelectorAll('.notes-version-item button').forEach(function (btn) {
            btn.onclick = function () {
                var idx = parseInt(btn.closest('.notes-version-item').dataset.index, 10);
                var v = note.versionHistory[idx];
                if (v) {
                    note.title = v.title;
                    note.content = v.content;
                    note.updatedAt = Date.now();
                    self.save();
                    self.loadNote(note.id, window);
                }
                overlay.remove();
            };
        });
        overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    };

    NotesApp.prototype.exportCurrentNote = function (content) {
        var note = this.currentNoteId && this.notes.find(function (n) { return n.id === this.currentNoteId; }.bind(this));
        if (!note) return;
        var format = 'md';
        var blob;
        var name = (note.title || 'note').replace(/[^\w\-]/g, '_');
        if (format === 'json') {
            blob = new Blob([JSON.stringify(note, null, 2)], { type: 'application/json' });
            name += '.json';
        } else if (format === 'txt') {
            blob = new Blob([note.title + '\n\n' + (note.content || '')], { type: 'text/plain' });
            name += '.txt';
        } else {
            blob = new Blob([(note.content || '')], { type: 'text/markdown' });
            name += '.md';
        }
        var a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = name;
        a.click();
        URL.revokeObjectURL(a.href);
    };

    NotesApp.prototype.formatDate = function (ts) {
        if (!ts) return '';
        var d = new Date(ts);
        var now = Date.now();
        var diff = now - ts;
        if (diff < 86400000) return 'Today';
        if (diff < 172800000) return 'Yesterday';
        if (diff < 604800000) return Math.floor(diff / 86400000) + ' days ago';
        return d.toLocaleDateString();
    };

    NotesApp.prototype.showQuizModal = function (quizText) {
        var self = this;
        var lines = quizText.split(/\n/).filter(Boolean);
        var qa = [];
        lines.forEach(function (line) {
            var m = line.match(/Q:\s*(.+?)\s*A:\s*(.+)/i) || line.match(/(.+?)\s*A:\s*(.+)/);
            if (m) qa.push({ q: m[1].trim(), a: (m[2] || '').trim() });
        });
        if (qa.length === 0) {
            if (typeof notificationSystem !== 'undefined') notificationSystem.info('Notes', 'No quiz format found');
            return;
        }
        var overlay = document.createElement('div');
        overlay.className = 'notes-modal-overlay glass';
        var idx = 0;
        var showAnswer = false;
        var box = document.createElement('div');
        box.className = 'notes-modal glass';
        box.style.minWidth = '360px';
        overlay.appendChild(box);
        function render() {
            var item = qa[idx];
            box.innerHTML = '<div class="notes-quiz-q">' + self.escapeHtml(item.q) + '</div>' +
                (showAnswer ? '<div class="notes-quiz-a">' + self.escapeHtml(item.a) + '</div>' : '<button type="button" class="notes-btn" id="q-show">Show answer</button>') +
                '<div class="notes-flashcard-nav"><button type="button" class="notes-btn" id="q-prev">Prev</button><span>' + (idx + 1) + ' / ' + qa.length + '</span><button type="button" class="notes-btn" id="q-next">Next</button></div>';
            var showBtn = box.querySelector('#q-show');
            if (showBtn) showBtn.onclick = function () { showAnswer = true; render(); };
            var prevBtn = box.querySelector('#q-prev');
            if (prevBtn) prevBtn.onclick = function () { if (idx > 0) { idx--; showAnswer = false; render(); } };
            var nextBtn = box.querySelector('#q-next');
            if (nextBtn) nextBtn.onclick = function () { if (idx < qa.length - 1) { idx++; showAnswer = false; render(); } else overlay.remove(); };
        }
        render();
        document.body.appendChild(overlay);
        overlay.onclick = function (e) { if (e.target === overlay) overlay.remove(); };
    };

    NotesApp.prototype.escapeHtml = function (s) {
        if (s == null) return '';
        var d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    };

    NotesApp.prototype.openNote = function (noteId) {
        if (typeof windowManager === 'undefined' || !windowManager.windows.has(this.windowId)) return;
        this.loadNote(noteId, windowManager.windows.get(this.windowId));
    };

    NotesApp.prototype.createNewNote = function () {
        if (typeof windowManager === 'undefined' || !windowManager.windows.has(this.windowId)) return;
        var win = windowManager.windows.get(this.windowId);
        var content = win && win.querySelector('.window-content');
        if (content) content.querySelector('#note-new-btn').click();
    };

    var app;
    try {
        app = new NotesApp();
    } catch (err) {
        if (typeof console !== 'undefined' && console.error) console.error('Notes constructor:', err);
        app = {
            open: function () {
                if (typeof notificationSystem !== 'undefined') notificationSystem.error('Notes', 'Notes failed to load. Check console (F12).');
                else if (typeof alert === 'function') alert('Notes failed to load. Open browser console (F12) for details.');
            }
        };
    }
    if (typeof window !== 'undefined') {
        window.notesApp = app;
    }
    if (typeof globalThis !== 'undefined') {
        globalThis.notesApp = app;
    }
})();
