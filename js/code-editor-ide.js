/**
 * Standalone Code Editor IDE - VS Code–level web IDE.
 * Monaco Editor, file tree with folders, run, terminal, AI, themes.
 * MODIFY ONLY Code Editor–related code. API key: set OPENAI_API_KEY on server.
 */
(function () {
    'use strict';

    var STORAGE_FILES = 'codeEditorIdeFiles';
    var STORAGE_OPEN = 'codeEditorIdeOpenIds';
    var STORAGE_THEME = 'codeEditorIdeTheme';
    var STORAGE_ONBOARDING = 'codeEditorOnboardingDone';
    var STORAGE_TERMINAL_HISTORY = 'codeEditorTerminalHistory';
    var STORAGE_SIDEBAR_WIDTH = 'codeEditorIdeSidebarWidth';
    var STORAGE_PANEL_HEIGHT = 'codeEditorIdePanelHeight';
    var STORAGE_PREVIEW_VISIBLE = 'codeEditorIdePreviewVisible';
    var STORAGE_PREVIEW_RATIO = 'codeEditorIdePreviewRatio';
    var PREVIEW_DEBOUNCE_MS = 600;
    var MONACO_CDN = 'https://unpkg.com/monaco-editor@0.44.0/min/vs';

    var THEMES = [
        { id: 'dark-pro', name: 'Dark Pro', monaco: 'vs-dark' },
        { id: 'vs-dark', name: 'Dark+', monaco: 'vs-dark' },
        { id: 'vs', name: 'Light+', monaco: 'vs' },
        { id: 'monokai', name: 'Monokai', monaco: 'vs-dark' },
        { id: 'dracula', name: 'Dracula', monaco: 'vs-dark' },
        { id: 'nord', name: 'Nord', monaco: 'vs-dark' },
        { id: 'cyberpunk-neon', name: 'Cyberpunk Neon', monaco: 'vs-dark' },
        { id: 'matrix-hacker', name: 'Matrix Hacker', monaco: 'vs-dark' },
        { id: 'midnight-purple', name: 'Midnight Purple', monaco: 'vs-dark' },
        { id: 'solar-gold', name: 'Solar Gold', monaco: 'vs-dark' },
        { id: 'arctic-light', name: 'Arctic Light', monaco: 'vs' },
        { id: 'rose-quartz', name: 'Rose Quartz', monaco: 'vs-dark' },
        { id: 'aurora-glow', name: 'Aurora Glow', monaco: 'vs-dark' },
        { id: 'hacker-green', name: 'Hacker Green Terminal', monaco: 'vs-dark' }
    ];

    var TEMPLATES = {
        'HTML5': '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <title>Page</title>\n</head>\n<body>\n  <h1>Hello</h1>\n</body>\n</html>',
        'React': 'import React from "react";\n\nexport default function App() {\n  return <div>Hello</div>;\n}\n',
        'Node': 'console.log("Hello");\n',
        'Python': 'print("Hello")\n',
        'JavaScript': 'console.log("Hello");\n'
    };

    function getStorage(key, fallback) {
        try {
            var s = localStorage.getItem(key);
            if (s == null) return fallback;
            return JSON.parse(s);
        } catch (e) {
            return fallback;
        }
    }

    function setStorage(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
        } catch (e) {
            if (e.name === 'QuotaExceededError') try { saveStateToIDB(); } catch (e2) {}
        }
    }

    var IDB_NAME = 'CodeEditorIDB';
    var IDB_STORE = 'project';

    function saveStateToIDB() {
        try {
            if (!window.indexedDB) return;
            var req = window.indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
            };
            req.onsuccess = function () {
                var db = req.result;
                try {
                    var tx = db.transaction(IDB_STORE, 'readwrite');
                    tx.objectStore(IDB_STORE).put({ files: IDE.files, openFileIds: IDE.openFileIds }, 'state');
                } catch (e) {}
                db.close();
            };
        } catch (e) {}
    }

    function loadStateFromIDB(callback) {
        try {
            if (!window.indexedDB) { callback(null); return; }
            var req = window.indexedDB.open(IDB_NAME, 1);
            req.onupgradeneeded = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
            };
            req.onsuccess = function () {
                var db = req.result;
                if (!db.objectStoreNames.contains(IDB_STORE)) { db.close(); callback(null); return; }
                var tx = db.transaction(IDB_STORE, 'readonly');
                var get = tx.objectStore(IDB_STORE).get('state');
                get.onsuccess = function () {
                    db.close();
                    callback(get.result || null);
                };
                get.onerror = function () { db.close(); callback(null); };
            };
            req.onerror = function () { callback(null); };
        } catch (e) {
            callback(null);
        }
    }

    var IDE = {
        editor: null,
        files: [],
        openFileIds: [],
        currentFileId: null,
        monacoLoaded: false,
        runFrame: null,
        livePreviewFrame: null,
        previewDebounceTimer: null,
        aiConversationHistory: [],
        pyodide: null,
        terminalHistory: [],
        terminalHistoryIndex: -1,
        problems: [],
        todoDecorations: [],

        init: function () {
            var self = this;
            this.terminalHistory = getStorage(STORAGE_TERMINAL_HISTORY, []);
            if (getStorage(STORAGE_ONBOARDING, null)) {
                hideOnboardingShowRoot();
                this.loadStateMaybeFromIDB(function () {
                    self.attachAllUiHandlers();
                    self.loadMonaco(function () {
                        self.setupEditor();
                        self.renderTabs();
                        self.renderTree();
                        self.attachFindReplace();
                        self.applyTheme(getStorage(STORAGE_THEME, 'dark-pro'));
                        self.refreshProblems();
                        if (self.openFileIds.length) {
                            self.switchToFile(self.openFileIds[0]);
                        } else if (self.files.length) {
                            self.switchToFile(self.files[0].id);
                        } else {
                            self.newFile('untitled.js');
                        }
                    });
                });
            } else {
                document.getElementById('ide-onboarding').style.display = 'flex';
                document.getElementById('ide-root').style.display = 'none';
                var startBtn = document.getElementById('onboarding-start');
                if (startBtn) startBtn.addEventListener('click', function () {
                    setStorage(STORAGE_ONBOARDING, true);
                    hideOnboardingShowRoot();
                    self.loadStateMaybeFromIDB(function () {
                        self.attachAllUiHandlers();
                        self.loadMonaco(function () {
                            self.setupEditor();
                            self.renderTabs();
                            self.renderTree();
                            self.attachFindReplace();
                            self.applyTheme(getStorage(STORAGE_THEME, 'dark-pro'));
                            self.refreshProblems();
                            self.newFile('untitled.js');
                        });
                    });
                });
            }

            function hideOnboardingShowRoot() {
                var ob = document.getElementById('ide-onboarding');
                var root = document.getElementById('ide-root');
                if (ob) ob.style.display = 'none';
                if (root) root.style.display = 'flex';
            }
        },

        loadState: function () {
            this.files = getStorage(STORAGE_FILES, []);
            this.openFileIds = getStorage(STORAGE_OPEN, []).filter(function (id) {
                return this.files.some(function (f) { return f.id === id; });
            }.bind(this));
            if (this.openFileIds.length && !this.currentFileId) this.currentFileId = this.openFileIds[0];
        },

        loadStateMaybeFromIDB: function (onDone) {
            var self = this;
            this.loadState();
            if (this.files.length > 0) {
                onDone();
                return;
            }
            loadStateFromIDB(function (data) {
                if (data && data.files && data.files.length) {
                    self.files = data.files;
                    self.openFileIds = (data.openFileIds || []).filter(function (id) {
                        return self.files.some(function (f) { return f.id === id; });
                    });
                    if (self.openFileIds.length) self.currentFileId = self.openFileIds[0];
                    setStorage(STORAGE_FILES, self.files);
                    setStorage(STORAGE_OPEN, self.openFileIds);
                }
                onDone();
            });
        },

        saveState: function () {
            setStorage(STORAGE_FILES, this.files);
            setStorage(STORAGE_OPEN, this.openFileIds);
            try { saveStateToIDB(); } catch (e) {}
        },

        loadMonaco: function (onReady) {
            if (window.monaco && window.require) {
                this.monacoLoaded = true;
                onReady();
                return;
            }
            var self = this;
            function doRequire() {
                window.require.config({
                    paths: { vs: MONACO_CDN },
                    'vs/nls': { availableLanguages: {} }
                });
                window.require(['vs/editor/editor.main'], function () {
                    IDE.monacoLoaded = true;
                    IDE.defineThemes();
                    onReady();
                }, function () {
                    var el = document.getElementById('monaco-container');
                    if (el) el.innerHTML = '<p style="color:#f48771;padding:20px">Failed to load editor. Check network.</p>';
                    onReady();
                });
            }
            if (window.require) {
                doRequire();
                return;
            }
            var script = document.createElement('script');
            script.src = MONACO_CDN.replace('/min/vs', '') + '/vs/loader.js';
            script.onload = doRequire;
            script.onerror = function () {
                var el = document.getElementById('monaco-container');
                if (el) el.innerHTML = '<p style="color:#f48771;padding:20px">Failed to load Monaco. Check network.</p>';
                onReady();
            };
            document.head.appendChild(script);
        },

        defineThemes: function () {
            if (!window.monaco) return;
            var m = window.monaco.editor;
            m.defineTheme('cyberpunk-neon', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#0a0a12', 'editor.foreground': '#e0f7ff' } });
            m.defineTheme('matrix-hacker', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#000', 'editor.foreground': '#00ff41' } });
            m.defineTheme('midnight-purple', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#0f0e25', 'editor.foreground': '#e9d5ff' } });
            m.defineTheme('solar-gold', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#0f0a05', 'editor.foreground': '#fef3c7' } });
            m.defineTheme('nord', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#2e3440', 'editor.foreground': '#d8dee9' } });
            m.defineTheme('rose-quartz', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#1f0f18', 'editor.foreground': '#fdf2f8' } });
            m.defineTheme('aurora-glow', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#0d1117', 'editor.foreground': '#58a6ff' } });
            m.defineTheme('hacker-green', { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#0a0f0a', 'editor.foreground': '#00ff88' } });
        },

        setupEditor: function () {
            var container = document.getElementById('monaco-container');
            if (!container || !window.monaco) return;
            var theme = getStorage(STORAGE_THEME, 'dark-pro');
            var t = THEMES.find(function (x) { return x.id === theme; }) || THEMES[0];
            var monacoTheme = (theme !== 'dark-pro' && theme !== 'arctic-light' && theme !== 'vs-dark' && theme !== 'vs') ? theme : t.monaco;
            this.editor = window.monaco.editor.create(container, {
                value: '',
                language: 'javascript',
                theme: monacoTheme,
                automaticLayout: true,
                fontSize: 14,
                fontFamily: "'JetBrains Mono','Consolas',monospace",
                lineNumbers: 'on',
                minimap: { enabled: true },
                bracketPairColorization: { enabled: true },
                guides: { bracketPairs: true, indentation: true },
                scrollBeyondLastLine: false,
                wordWrap: 'off',
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                renderLineHighlight: 'all',
                matchBrackets: 'always',
                autoIndent: 'full',
                tabSize: 4,
                insertSpaces: true,
                folding: true,
                foldingStrategy: 'indentation',
                formatOnPaste: true,
                quickSuggestions: { other: true, comments: false, strings: true },
                suggestOnTriggerCharacters: true,
                wordBasedSuggestions: 'matchingDocuments',
                acceptSuggestionOnEnter: 'on'
            });
            var self = this;
            this.editor.onDidChangeCursorPosition(function (e) {
                var el = document.getElementById('ide-status-position');
                if (el) el.textContent = 'Ln ' + e.position.lineNumber + ', Col ' + e.position.column;
            });
            this.editor.onDidChangeModelContent(function () {
                if (self.currentFileId) {
                    var f = self.files.find(function (x) { return x.id === self.currentFileId; });
                    if (f) {
                        f.content = self.editor.getValue();
                        f.isDirty = true;
                        self.saveState();
                        self.renderTabs();
                    }
                    self.scheduleLivePreviewRefresh();
                }
                self.updateTodoDecorations();
            });
            this.editor.onDidChangeModel(function () {
                self.updateTodoDecorations();
            });
        },

        scheduleLivePreviewRefresh: function () {
            var self = this;
            if (this.previewDebounceTimer) clearTimeout(this.previewDebounceTimer);
            this.previewDebounceTimer = setTimeout(function () {
                self.previewDebounceTimer = null;
                var wrap = document.getElementById('ide-preview-wrap');
                if (wrap && wrap.style.display !== 'none') self.refreshLivePreview();
            }, PREVIEW_DEBOUNCE_MS);
        },

        updateTodoDecorations: function () {
            if (!this.editor || !window.monaco) return;
            var model = this.editor.getModel();
            if (!model) return;
            var content = model.getValue();
            var lines = content.split('\n');
            var deco = [];
            for (var i = 0; i < lines.length; i++) {
                var line = lines[i];
                var idx = Math.max(line.toUpperCase().indexOf('TODO'), line.toUpperCase().indexOf('FIXME'), line.toUpperCase().indexOf('HACK'));
                if (idx >= 0) {
                    deco.push({
                        range: new window.monaco.Range(i + 1, idx + 1, i + 1, line.length + 1),
                        options: { isWholeLine: false, glyphMarginClassName: 'ide-todo-marker', linesDecorationsClassName: 'ide-todo-line' }
                    });
                }
            }
            this.todoDecorations = this.editor.deltaDecorations(this.todoDecorations, deco);
        },

        refreshProblems: function () {
            var list = document.getElementById('ide-problems-list');
            if (!list) return;
            var self = this;
            this.problems = [];
            this.files.forEach(function (f) {
                var content = f.content || '';
                var lines = content.split('\n');
                lines.forEach(function (line, i) {
                    var l = line.toUpperCase();
                    if (l.indexOf('TODO') >= 0 || l.indexOf('FIXME') >= 0) {
                        self.problems.push({ file: f.name, path: f.path, line: i + 1, message: line.trim(), severity: 'info' });
                    }
                });
            });
            var html = this.problems.length ? this.problems.map(function (p) {
                return '<div class="ide-problem ' + p.severity + '"><span class="ide-problem-loc">' + self.escapeHtml(p.file) + ':' + p.line + '</span> ' + self.escapeHtml(p.message) + '</div>';
            }.bind(this)).join('') : '<div class="ide-problems-empty">No problems.</div>';
            list.innerHTML = html;
        },

        detectLanguage: function (name) {
            var ext = (name.split('.').pop() || '').toLowerCase();
            var map = { js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript', py: 'python', java: 'java', cpp: 'cpp', c: 'c', html: 'html', htm: 'html', css: 'css', json: 'json', md: 'markdown', xml: 'xml', yaml: 'yaml', yml: 'yaml', txt: 'plaintext' };
            return map[ext] || 'plaintext';
        },

        getFolderFromPath: function (path) {
            var idx = path.lastIndexOf('/');
            return idx >= 0 ? path.substring(0, idx) : '';
        },

        buildTree: function () {
            var folders = {};
            var list = [];
            this.files.forEach(function (f) {
                var path = f.path || f.name;
                var parts = path.split('/');
                var folder = '';
                for (var i = 0; i < parts.length - 1; i++) {
                    folder = folder ? folder + '/' + parts[i] : parts[i];
                    if (!folders[folder]) {
                        folders[folder] = true;
                        list.push({ type: 'folder', path: folder, name: parts[i] });
                    }
                }
                list.push({ type: 'file', file: f });
            });
            list.sort(function (a, b) {
                var ap = a.type === 'folder' ? a.path : a.file.path || a.file.name;
                var bp = b.type === 'folder' ? b.path : b.file.path || b.file.name;
                if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
                return ap.localeCompare(bp);
            });
            return list;
        },

        newFile: function (name, templateKey) {
            name = name || prompt('File name (e.g. script.js or src/app.js):', 'untitled.js') || 'untitled.js';
            if (!name.trim()) return;
            name = name.trim();
            var id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            var content = (templateKey && TEMPLATES[templateKey]) ? TEMPLATES[templateKey] : '';
            var file = { id: id, name: name.replace(/^.*\//, ''), path: name, content: content, language: this.detectLanguage(name), isDirty: !!content };
            this.files.push(file);
            this.openFileIds.push(id);
            this.currentFileId = id;
            this.saveState();
            this.switchToFile(id);
            this.renderTree();
            this.renderTabs();
            this.refreshProblems();
        },

        newFolder: function () {
            var name = prompt('Folder name (e.g. src or components):', '');
            if (!name || !name.trim()) return;
            name = name.trim().replace(/\/+$/, '');
            var dummyId = 'folder_' + Date.now();
            var file = { id: dummyId, name: name + '/', path: name + '/.keep', content: '', language: 'plaintext', isDirty: false, isFolderPlaceholder: true };
            this.files.push(file);
            this.saveState();
            this.renderTree();
        },

        renameFile: function (fileId) {
            var file = this.files.find(function (f) { return f.id === fileId; });
            if (!file) return;
            var newName = prompt('New name:', file.path || file.name);
            if (!newName || !newName.trim()) return;
            newName = newName.trim();
            file.name = newName.replace(/^.*\//, '');
            file.path = newName;
            file.language = this.detectLanguage(newName);
            this.saveState();
            this.renderTree();
            this.renderTabs();
        },

        deleteFile: function (fileId) {
            var file = this.files.find(function (f) { return f.id === fileId; });
            if (!file || !confirm('Delete "' + (file.path || file.name) + '"?')) return;
            this.files = this.files.filter(function (f) { return f.id !== fileId; });
            this.openFileIds = this.openFileIds.filter(function (id) { return id !== fileId; });
            if (this.currentFileId === fileId) {
                this.currentFileId = this.openFileIds[0] || (this.files[0] && this.files[0].id) || null;
                if (this.currentFileId) this.switchToFile(this.currentFileId);
                else if (this.editor && window.monaco) this.editor.setModel(window.monaco.editor.createModel('', 'plaintext'));
            }
            this.saveState();
            this.renderTree();
            this.renderTabs();
            this.refreshProblems();
        },

        switchToFile: function (fileId) {
            var file = this.files.find(function (f) { return f.id === fileId; });
            if (!file || file.isFolderPlaceholder) return;
            this.currentFileId = fileId;
            if (this.openFileIds.indexOf(fileId) < 0) this.openFileIds.push(fileId);
            if (this.editor && window.monaco) {
                var model = window.monaco.editor.createModel(file.content || '', file.language || 'plaintext');
                this.editor.setModel(model);
                this.editor.focus();
            }
            var el = document.getElementById('ide-status-language');
            if (el) el.textContent = file.language || 'plaintext';
            this.renderTabs();
            this.updateTodoDecorations();
        },

        saveCurrent: function () {
            if (!this.currentFileId || !this.editor) return;
            var file = this.files.find(function (f) { return f.id === this.currentFileId; }.bind(this));
            if (!file) return;
            file.content = this.editor.getValue();
            file.isDirty = false;
            this.saveState();
            this.renderTabs();
        },

        saveAs: function () {
            if (!this.currentFileId || !this.editor) return;
            var newName = prompt('Save as (filename or path):', this.files.find(function (f) { return f.id === this.currentFileId; }.bind(this)).path);
            if (!newName || !newName.trim()) return;
            newName = newName.trim();
            var id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
            var file = this.files.find(function (f) { return f.id === this.currentFileId; }.bind(this));
            var newFile = { id: id, name: newName.replace(/^.*\//, ''), path: newName, content: this.editor.getValue(), language: this.detectLanguage(newName), isDirty: false };
            this.files.push(newFile);
            this.openFileIds.push(id);
            this.currentFileId = id;
            this.saveState();
            this.switchToFile(id);
            this.renderTree();
            this.renderTabs();
        },

        downloadCurrent: function () {
            if (!this.currentFileId || !this.editor) return;
            var file = this.files.find(function (f) { return f.id === this.currentFileId; }.bind(this));
            if (!file) return;
            var blob = new Blob([this.editor.getValue()], { type: 'text/plain;charset=utf-8' });
            var a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = file.name || 'file.txt';
            a.click();
            URL.revokeObjectURL(a.href);
        },

        exportZip: function () {
            if (typeof JSZip === 'undefined') {
                this.writeConsole('JSZip not loaded. Cannot export ZIP.');
                return;
            }
            var zip = new JSZip();
            this.files.forEach(function (f) {
                if (f.isFolderPlaceholder) return;
                zip.file(f.path || f.name, f.content || '');
            });
            zip.generateAsync({ type: 'blob' }).then(function (blob) {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'project.zip';
                a.click();
                URL.revokeObjectURL(a.href);
            });
        },

        uploadFiles: function (files) {
            var self = this;
            for (var i = 0; i < files.length; i++) {
                (function (file) {
                    var r = new FileReader();
                    r.onload = function () {
                        var name = file.name;
                        var id = 'f_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
                        var f = { id: id, name: name, path: name, content: r.result, language: self.detectLanguage(name), isDirty: false };
                        self.files.push(f);
                        self.openFileIds.push(id);
                        self.currentFileId = id;
                        self.saveState();
                        self.switchToFile(id);
                        self.renderTree();
                        self.renderTabs();
                    };
                    r.readAsText(file);
                })(files[i]);
            }
        },

        closeTab: function (fileId) {
            this.openFileIds = this.openFileIds.filter(function (id) { return id !== fileId; });
            if (this.currentFileId === fileId) {
                this.currentFileId = this.openFileIds[0] || null;
                if (this.currentFileId) this.switchToFile(this.currentFileId);
                else if (this.files.length) this.switchToFile(this.files[0].id);
            }
            this.saveState();
            this.renderTabs();
        },

        renderTabs: function () {
            var html = this.openFileIds.map(function (id) {
                var file = this.files.find(function (f) { return f.id === id; });
                if (!file || file.isFolderPlaceholder) return '';
                var active = id === this.currentFileId ? ' active' : '';
                var dirty = file.isDirty ? ' <span class="tab-dirty">●</span>' : '';
                return '<div class="ide-tab' + active + '" data-file-id="' + id + '">' + this.escapeHtml(file.name) + dirty + '<button type="button" class="ide-tab-close" data-file-id="' + id + '">×</button></div>';
            }.bind(this)).join('');
            var el = document.getElementById('ide-tabs');
            if (el) el.innerHTML = html;
        },

        renderTree: function () {
            var self = this;
            var tree = this.buildTree();
            var openFolders = getStorage('codeEditorIdeOpenFolders', {});
            function render(items, indent) {
                indent = indent || 0;
                var out = '';
                items.forEach(function (item) {
                    if (item.type === 'folder') {
                        var isOpen = openFolders[item.path];
                        out += '<div class="ide-tree-folder' + (isOpen ? ' open' : '') + '" data-folder="' + self.escapeHtml(item.path) + '" style="padding-left:' + (12 + indent * 12) + 'px"><span class="ide-tree-icon">📁</span><span>' + self.escapeHtml(item.name) + '</span></div>';
                        if (isOpen) {
                            var children = tree.filter(function (x) {
                                if (x.type === 'file') {
                                    var p = (x.file.path || x.file.name);
                                    return p.indexOf(item.path + '/') === 0 && p.split('/').length === item.path.split('/').length + 1;
                                }
                                if (x.type === 'folder') return x.path.indexOf(item.path + '/') === 0 && x.path.split('/').length === item.path.split('/').length + 1;
                                return false;
                            });
                            out += render(children, indent + 1);
                        }
                    } else {
                        var open = self.openFileIds.indexOf(item.file.id) >= 0 ? ' open' : '';
                        out += '<div class="ide-tree-item' + open + '" data-file-id="' + item.file.id + '" style="padding-left:' + (12 + indent * 12) + 'px"><span class="ide-tree-icon">📄</span><span>' + self.escapeHtml(item.file.name) + '</span></div>';
                    }
                });
                return out;
            }
            var topLevel = tree.filter(function (x) {
                if (x.type === 'folder') return (x.path || '').indexOf('/') < 0;
                if (x.type === 'file') return ((x.file.path || x.file.name) || '').indexOf('/') < 0;
                return false;
            });
            var html = topLevel.length ? render(topLevel) : '<div class="ide-tree-empty">No files. New file / Upload.</div>';
            var el = document.getElementById('ide-file-tree');
            if (el) el.innerHTML = html;
        },

        setPreviewStatus: function (text) {
            var el = document.getElementById('ide-preview-status');
            if (el) el.textContent = text || '';
        },

        getConsoleForwardingScript: function () {
            return '<script>(' + function () {
                var send = function (type, args) {
                    try {
                        window.parent.postMessage({ source: 'ide-preview', type: type, args: args.map(function (a) {
                            return typeof a === 'object' ? JSON.stringify(a) : String(a);
                        }) }, '*');
                    } catch (e) {}
                };
                var origLog = console.log, origErr = console.error, origWarn = console.warn;
                console.log = function () { send('log', Array.prototype.slice.call(arguments)); origLog.apply(console, arguments); };
                console.error = function () { send('error', Array.prototype.slice.call(arguments)); origErr.apply(console, arguments); };
                console.warn = function () { send('warn', Array.prototype.slice.call(arguments)); origWarn.apply(console, arguments); };
                window.onerror = function (msg, url, line, col, err) {
                    send('error', ['Error: ' + msg + (line ? ' (line ' + line + ')' : '')]);
                    return false;
                };
            }.toString() + ')();</script>';
        },

        updateLivePreview: function (html) {
            var frame = document.getElementById('ide-live-preview-frame');
            if (!frame) return;
            var self = this;
            var inject = this.getConsoleForwardingScript();
            var doc = frame.contentDocument || frame.contentWindow.document;
            var full = html;
            if (full.indexOf('<head>') >= 0) {
                full = full.replace(/<head>/, '<head>' + inject);
            } else if (full.indexOf('<html') >= 0) {
                full = full.replace(/<html[^>]*>/, function (m) { return m + '<head>' + inject + '</head>'; });
            } else {
                full = '<!DOCTYPE html><html><head>' + inject + '</head><body>' + full + '</body></html>';
            }
            try {
                doc.open();
                doc.write(full);
                doc.close();
            } catch (err) {
                self.setPreviewStatus('Error in script — see console');
                self.writeConsole('Preview error: ' + err.message);
            }
        },

        refreshLivePreview: function () {
            var file = this.currentFileId && this.files.find(function (f) { return f.id === this.currentFileId; });
            if (!file) return;
            var lang = (file.language || this.detectLanguage(file.name)).toLowerCase();
            var name = (file.name || '').toLowerCase();
            if (lang === 'html' || name.endsWith('.html') || lang === 'css' || name.endsWith('.css')) {
                var code = this.editor ? this.editor.getValue() : file.content || '';
                if (lang === 'html' || name.endsWith('.html')) {
                    this.updateLivePreview(code);
                    this.setPreviewStatus('Preview updated');
                    var self = this;
                    setTimeout(function () { self.setPreviewStatus(''); }, 2000);
                }
            }
        },

        showPreview: function () {
            var wrap = document.getElementById('ide-preview-wrap');
            var resizer = document.getElementById('ide-resizer-preview');
            var showBtn = document.getElementById('ide-preview-show-btn');
            var hideBtn = document.getElementById('ide-preview-hide-btn');
            var refreshBtn = document.getElementById('ide-preview-refresh-btn');
            if (wrap) wrap.style.display = 'flex';
            if (resizer) resizer.style.display = 'block';
            if (showBtn) showBtn.style.display = 'none';
            if (hideBtn) hideBtn.style.display = 'inline-block';
            if (refreshBtn) refreshBtn.style.display = 'inline-block';
            setStorage(STORAGE_PREVIEW_VISIBLE, true);
            this.refreshLivePreview();
            if (this.editor && window.monaco) try { this.editor.layout(); } catch (e) {}
        },

        hidePreview: function () {
            var wrap = document.getElementById('ide-preview-wrap');
            var resizer = document.getElementById('ide-resizer-preview');
            var showBtn = document.getElementById('ide-preview-show-btn');
            var hideBtn = document.getElementById('ide-preview-hide-btn');
            var refreshBtn = document.getElementById('ide-preview-refresh-btn');
            if (wrap) wrap.style.display = 'none';
            if (resizer) resizer.style.display = 'none';
            if (showBtn) showBtn.style.display = 'inline-block';
            if (hideBtn) hideBtn.style.display = 'none';
            if (refreshBtn) refreshBtn.style.display = 'none';
            setStorage(STORAGE_PREVIEW_VISIBLE, false);
            if (this.editor && window.monaco) try { this.editor.layout(); } catch (e) {}
        },

        runCode: function () {
            var file = this.currentFileId && this.files.find(function (f) { return f.id === this.currentFileId; }.bind(this));
            if (!file) return;
            var code = this.editor ? this.editor.getValue() : file.content;
            var lang = (file.language || this.detectLanguage(file.name)).toLowerCase();
            var outPre = document.getElementById('ide-console-pre');
            var self = this;
            outPre.textContent = '';

            function logToPanel() {
                var args = Array.prototype.slice.call(arguments);
                var line = args.map(function (a) { return typeof a === 'object' ? JSON.stringify(a) : String(a); }).join(' ');
                outPre.textContent += line + '\n';
            }

            document.querySelector('[data-panel="console"]') && document.querySelector('[data-panel="console"]').click();
            if (lang === 'javascript') {
                try {
                    self.setPreviewStatus('Running...');
                    var origLog = console.log, origErr = console.error, origWarn = console.warn;
                    console.log = console.error = console.warn = logToPanel;
                    new Function(code)();
                    console.log = origLog;
                    console.error = origErr;
                    console.warn = origWarn;
                    outPre.textContent += 'Done.\n';
                    self.setPreviewStatus('');
                } catch (err) {
                    outPre.textContent += 'Error: ' + err.message + '\n' + (err.stack || '');
                    self.setPreviewStatus('Error in script — see console');
                    self.problems.push({ file: file.name, path: file.path, line: 1, message: err.message, severity: 'error' });
                    self.refreshProblems();
                }
            } else if (lang === 'html' || (file.name || '').toLowerCase().endsWith('.html')) {
                try {
                    self.setPreviewStatus('Running...');
                    var frame = document.getElementById('ide-live-preview-frame');
                    if (frame) {
                        self.updateLivePreview(code);
                        self.setPreviewStatus('Preview updated');
                        setTimeout(function () { self.setPreviewStatus(''); }, 2500);
                        outPre.textContent = 'Preview updated.\n';
                    } else {
                        self.runFrame = self.runFrame || document.createElement('iframe');
                        self.runFrame.style.cssText = 'width:100%;height:300px;border:0;background:#fff';
                        var panel = document.getElementById('ide-output');
                        if (panel) { panel.innerHTML = ''; panel.appendChild(self.runFrame); }
                        self.runFrame.srcdoc = code;
                        outPre.textContent = 'HTML rendered in preview.';
                        self.setPreviewStatus('');
                    }
                } catch (err) {
                    outPre.textContent += 'Error: ' + err.message + '\n';
                    self.setPreviewStatus('Error in script — see console');
                }
            } else if (lang === 'python') {
                outPre.textContent = 'Loading Python (Pyodide)...\n';
                this.runPython(code, function (result) {
                    outPre.textContent += result;
                });
            } else {
                outPre.textContent = 'Run: JavaScript, HTML, or Python. Current: ' + lang;
            }
        },

        runPython: function (code, callback) {
            if (window.languagePluginLoader) {
                window.languagePluginLoader.then(function () {
                    try {
                        var out = window.pyodide.runPython(code);
                        callback(out != null ? String(out) : '');
                    } catch (e) {
                        callback('Error: ' + e.message);
                    }
                }).catch(function () { callback('Pyodide failed.'); });
                return;
            }
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
            script.onload = function () {
                window.languagePluginLoader = window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' });
                window.languagePluginLoader.then(function () {
                    try {
                        var out = window.pyodide.runPython(code);
                        callback(out != null ? String(out) : '');
                    } catch (e) {
                        callback('Error: ' + e.message);
                    }
                }).catch(function (err) {
                    callback('Pyodide error: ' + (err && err.message ? err.message : ''));
                });
            };
            script.onerror = function () { callback('Could not load Pyodide.'); };
            document.head.appendChild(script);
        },

        formatDocument: function () {
            if (this.editor && window.monaco) {
                try {
                    this.editor.getAction('editor.action.formatDocument').run();
                } catch (e) {}
            }
        },

        getAIApiKey: function () {
            try {
                if (typeof storage !== 'undefined') return (storage.get('openai_api_key', '') || storage.get('openaiApiKey', '') || '');
                var raw = localStorage.getItem('aegisdesk_openai_api_key');
                if (raw) { try { return JSON.parse(raw); } catch (_) { return raw; } }
            } catch (e) {}
            return '';
        },

        getAIChatUrl: function () {
            var o = typeof window !== 'undefined' && window.location && window.location.origin;
            if (o && String(o).indexOf('http') === 0) return o + '/api/chat';
            return '/api/chat';
        },

        fetchAI: function (messages) {
            var self = this;
            var url = this.getAIChatUrl();
            var opts = {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: messages })
            };
            return fetch(url, opts).then(function (r) { return r.json().then(function (data) { return { ok: r.ok, data: data }; }); }).then(function (res) {
                if (!res.ok && res.data && res.data.error) throw new Error(res.data.error.message || res.data.error);
                if (!res.ok) throw new Error('Request failed.');
                return res.data;
            });
        },

        aiAction: function (action) {
            var file = this.currentFileId && this.files.find(function (f) { return f.id === this.currentFileId; }.bind(this));
            var code = this.editor ? this.editor.getValue() : (file && file.content) || '';
            var sel = this.editor && this.editor.getSelection();
            var selected = sel ? this.editor.getModel().getValueInRange(sel) : '';
            var text = selected || code;
            if (!text.trim() && action !== 'generate') {
                this.writeConsole('Select code or have content for AI.');
                return;
            }
            var prompts = {
                explain: { sys: 'You are a code explainer. Explain the following code clearly and concisely.', user: text },
                fix: { sys: 'You are a bug fixer. Fix any bugs. Return ONLY the corrected code, no explanation.', user: text },
                optimize: { sys: 'You are a refactoring expert. Optimize/refactor the code. Return ONLY the improved code.', user: text },
                generate: { sys: 'You are a code generator. Generate code based on the user request. Return ONLY the code.', user: text || 'Hello world' },
                comment: { sys: 'Add clear comments to the following code. Return ONLY the code with comments.', user: text },
                convert: { sys: 'Convert the following plain English into working code. Return ONLY the code.', user: text }
            };
            var p = prompts[action];
            if (!p) return;
            this.writeConsole('AI thinking...');
            var self = this;
            this.fetchAI([{ role: 'system', content: p.sys }, { role: 'user', content: p.user }]).then(function (data) {
                var out = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : '';
                if (data.error) { self.writeConsole('AI: ' + data.error); return; }
                if (!out) { self.writeConsole('AI returned no response.'); return; }
                if (action === 'fix' || action === 'optimize' || action === 'comment' || action === 'generate' || action === 'convert') {
                    var codeBlock = out.match(/```[\s\S]*?```/);
                    if (codeBlock) out = codeBlock[0].replace(/^```\w*\n?|```$/g, '');
                    if (self.editor) self.editor.setValue(out);
                } else {
                    self.writeConsole(out);
                }
            }).catch(function (e) {
                var msg = e.message || 'Request failed.';
                if (msg.indexOf('fetch') !== -1 || msg.indexOf('Failed to fetch') !== -1) msg = 'Could not reach AI. Add your OpenAI API key in Desktop Settings (OpenAI API Key), or run the app with npm start and set OPENAI_API_KEY in .env.';
                self.writeConsole('AI error: ' + msg);
            });
        },

        formatAiMessage: function (raw) {
            return this.escapeHtml(raw)
                .replace(/\n/g, '<br>')
                .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
                .replace(/`([^`]+)`/g, '<code>$1</code>')
                .replace(/```(\w*)\n?([\s\S]*?)```/g, function (_, lang, code) { return '<pre><code>' + code.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</code></pre>'; });
        },

        aiSendMessage: function (text) {
            if (!text.trim()) return;
            var welcome = document.getElementById('ide-ai-welcome');
            if (welcome) welcome.style.display = 'none';
            var msgs = document.getElementById('ide-ai-messages');
            var typingEl = document.getElementById('ide-ai-typing');
            msgs.innerHTML += '<div class="ide-ai-msg user">' + this.escapeHtml(text) + '</div>';
            msgs.scrollTop = msgs.scrollHeight;
            if (typingEl) { typingEl.style.display = 'flex'; msgs.scrollTop = msgs.scrollHeight; }
            var self = this;
            this.aiConversationHistory.push({ role: 'user', content: text });
            var systemPrompt = 'You are a friendly, calm, and supportive coding assistant inside a code editor. Be clear and step-by-step. Explain concepts simply. When suggesting code, use fenced code blocks (```). Offer optional improvements when relevant. Stay professional but warm. You can explain code, fix bugs, optimize performance, refactor, generate projects, and answer any technical question. Remember the conversation context in this session.';
            var messageList = [{ role: 'system', content: systemPrompt }].concat(
                this.aiConversationHistory.slice(-20).map(function (m) { return { role: m.role, content: m.content }; })
            );
            this.fetchAI(messageList).then(function (data) {
                if (typingEl) typingEl.style.display = 'none';
                var out = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content : (data.error || 'No response.');
                self.aiConversationHistory.push({ role: 'assistant', content: out });
                msgs.innerHTML += '<div class="ide-ai-msg assistant">' + self.formatAiMessage(out) + '</div>';
                msgs.scrollTop = msgs.scrollHeight;
            }).catch(function (e) {
                if (typingEl) typingEl.style.display = 'none';
                var msg = e.message || 'Request failed.';
                if (msg.indexOf('fetch') !== -1 || msg.indexOf('Failed to fetch') !== -1) msg = 'Could not reach AI. Add your OpenAI API key in Desktop Settings, or run the app with npm start and set OPENAI_API_KEY in .env.';
                msgs.innerHTML += '<div class="ide-ai-msg assistant error">' + self.escapeHtml(msg) + '</div>';
                msgs.scrollTop = msgs.scrollHeight;
            });
        },

        writeConsole: function (text) {
            var pre = document.getElementById('ide-console-pre');
            if (pre) pre.textContent += text + '\n';
        },

        applyTheme: function (themeId) {
            themeId = themeId || 'dark-pro';
            document.body.setAttribute('data-theme', themeId);
            setStorage(STORAGE_THEME, themeId);
            var t = THEMES.find(function (x) { return x.id === themeId; });
            if (window.monaco && this.editor && t) {
                var monacoTheme = (themeId !== 'dark-pro' && themeId !== 'arctic-light' && themeId !== 'vs-dark' && themeId !== 'vs') ? themeId : t.monaco;
                window.monaco.editor.setTheme(monacoTheme);
            }
        },

        attachFindReplace: function () {
            var self = this;
            var wrap = document.getElementById('ide-find-wrap');
            var findInput = document.getElementById('ide-find-input');
            var replaceInput = document.getElementById('ide-replace-input');
            var prevBtn = document.getElementById('ide-find-prev');
            var nextBtn = document.getElementById('ide-find-next');
            var replaceOneBtn = document.getElementById('ide-find-replace-one');
            var closeBtn = document.getElementById('ide-find-close');
            if (!wrap || !this.editor) return;
            function showFind() { wrap.style.display = 'flex'; if (findInput) findInput.focus(); }
            function hideFind() { wrap.style.display = 'none'; self.editor.focus(); }
            if (closeBtn) closeBtn.addEventListener('click', hideFind);
            if (nextBtn && findInput) nextBtn.addEventListener('click', function () {
                var model = self.editor.getModel();
                if (model && findInput.value) {
                    var pos = self.editor.getPosition();
                    var match = model.findNextMatch(findInput.value, pos, false, false, null, true);
                    if (match) self.editor.setSelection(match.range);
                    else {
                        match = model.findNextMatch(findInput.value, { lineNumber: 1, column: 1 }, false, false, null, true);
                        if (match) self.editor.setSelection(match.range);
                    }
                }
            });
            if (prevBtn && findInput) prevBtn.addEventListener('click', function () {
                var model = self.editor.getModel();
                if (model && findInput.value) {
                    var match = model.findPreviousMatch(findInput.value, self.editor.getPosition(), false, false, null, true);
                    if (match) self.editor.setSelection(match.range);
                }
            });
            if (replaceOneBtn && replaceInput) replaceOneBtn.addEventListener('click', function () {
                var sel = self.editor.getSelection();
                if (sel) self.editor.executeEdits('replace', [{ range: sel, text: replaceInput.value }]);
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') hideFind();
                if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); showFind(); }
                if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); showFind(); }
            });
            findInput && findInput.addEventListener('input', function () {
                var model = self.editor.getModel();
                if (model && findInput.value) {
                    var match = model.findNextMatch(findInput.value, self.editor.getPosition(), false, false, null, true);
                    if (match) self.editor.setSelection(match.range);
                }
            });
            if (replaceInput) replaceInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && findInput && findInput.value) {
                    var sel = self.editor.getSelection();
                    if (sel) self.editor.executeEdits('replace', [{ range: sel, text: replaceInput.value }]);
                }
            });
        },

        attachTerminal: function () {
            var self = this;
            var out = document.getElementById('ide-terminal-output');
            var inp = document.getElementById('ide-terminal-input');
            if (!out || !inp) return;
            function appendLine(text, isCmd) {
                var line = document.createElement('div');
                line.className = 'ide-terminal-line' + (isCmd ? ' cmd' : '');
                line.textContent = (isCmd ? '$ ' : '') + text;
                out.appendChild(line);
                out.scrollTop = out.scrollHeight;
            }
            function runCmd(cmd) {
                cmd = (cmd || '').trim();
                if (!cmd) return;
                self.terminalHistory.push(cmd);
                if (self.terminalHistory.length > 50) self.terminalHistory.shift();
                setStorage(STORAGE_TERMINAL_HISTORY, self.terminalHistory);
                self.terminalHistoryIndex = self.terminalHistory.length;
                appendLine(cmd, true);
                var lower = cmd.toLowerCase();
                if (lower === 'clear' || lower === 'cls') {
                    out.innerHTML = '';
                    return;
                }
                if (lower === 'ls' || lower === 'dir') {
                    self.files.filter(function (f) { return !f.isFolderPlaceholder; }).forEach(function (f) {
                        appendLine((f.path || f.name));
                    });
                    if (!self.files.length) appendLine('(no files)');
                    return;
                }
                if (lower === 'pwd') {
                    appendLine('/project');
                    return;
                }
                if (lower === 'help') {
                    appendLine('ls, dir, pwd, clear, help, node <file>');
                    return;
                }
                if (lower.startsWith('node ') || lower.startsWith('node ')) {
                    var name = cmd.slice(5).trim();
                    var f = self.files.find(function (x) { return (x.path || x.name) === name || x.name === name; });
                    if (f && (f.language === 'javascript' || f.name.endsWith('.js'))) {
                        try {
                            var orig = console.log;
                            var buf = [];
                            console.log = function () { buf.push(Array.prototype.join.call(arguments, ' ')); };
                            new Function(f.content || '')();
                            console.log = orig;
                            buf.forEach(function (l) { appendLine(l); });
                        } catch (e) {
                            appendLine('Error: ' + e.message);
                        }
                    } else {
                        appendLine('File not found or not JS: ' + name);
                    }
                    return;
                }
                appendLine('Unknown command. Try: ls, pwd, clear, node <file>');
            }
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    runCmd(inp.value);
                    inp.value = '';
                }
                if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    if (self.terminalHistoryIndex > 0) {
                        self.terminalHistoryIndex--;
                        inp.value = self.terminalHistory[self.terminalHistoryIndex];
                    }
                }
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    if (self.terminalHistoryIndex < self.terminalHistory.length - 1) {
                        self.terminalHistoryIndex++;
                        inp.value = self.terminalHistory[self.terminalHistoryIndex];
                    } else {
                        self.terminalHistoryIndex = self.terminalHistory.length;
                        inp.value = '';
                    }
                }
            });
        },

        attachCommandPalette: function () {
            var self = this;
            var wrap = document.getElementById('ide-command-palette');
            var inp = document.getElementById('ide-command-input');
            var list = document.getElementById('ide-command-list');
            if (!wrap || !inp || !list) return;
            var commands = [
                { id: 'new', label: 'New File', run: function () { self.newFile(); } },
                { id: 'save', label: 'Save', run: function () { self.saveCurrent(); } },
                { id: 'run', label: 'Run', run: function () { self.runCode(); } },
                { id: 'format', label: 'Format Document', run: function () { self.formatDocument(); } },
                { id: 'theme', label: 'Change Theme', run: function () { self.applyTheme(THEMES[(THEMES.findIndex(function (t) { return t.id === (document.body.getAttribute('data-theme') || 'dark-pro'); }) + 1) % THEMES.length].id); } }
            ];
            THEMES.forEach(function (t) {
                commands.push({ id: 'theme-' + t.id, label: 'Theme: ' + t.name, run: function () { self.applyTheme(t.id); } });
            });
            function show() {
                wrap.style.display = 'block';
                inp.value = '';
                list.innerHTML = commands.map(function (c) { return '<div class="ide-command-item" data-cmd="' + c.id + '">' + self.escapeHtml(c.label) + '</div>'; }).join('');
                inp.focus();
            }
            function hide() {
                wrap.style.display = 'none';
                self.editor && self.editor.focus();
            }
            function run(cmdId) {
                var c = commands.find(function (x) { return x.id === cmdId; });
                if (c) c.run();
                hide();
            }
            document.addEventListener('keydown', function (e) {
                if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') { e.preventDefault(); show(); }
            });
            inp.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') hide();
                if (e.key === 'Enter') {
                    var sel = list.querySelector('.ide-command-item.selected');
                    if (sel) run(sel.dataset.cmd);
                    else if (list.firstChild) run(list.firstChild.dataset.cmd);
                }
            });
            inp.addEventListener('input', function () {
                var q = inp.value.toLowerCase();
                var filtered = commands.filter(function (c) { return c.label.toLowerCase().indexOf(q) >= 0; });
                list.innerHTML = filtered.map(function (c) { return '<div class="ide-command-item" data-cmd="' + c.id + '">' + self.escapeHtml(c.label) + '</div>'; }).join('');
            });
            list.addEventListener('click', function (e) {
                var item = e.target.closest('.ide-command-item');
                if (item) run(item.dataset.cmd);
            });
        },

        attachSidebarViews: function () {
            var self = this;
            var viewBtns = document.querySelectorAll('.ide-sidebar-view');
            for (var vb = 0; vb < viewBtns.length; vb++) {
                (function (btn) {
                    btn.addEventListener('click', function () {
                        var all = document.querySelectorAll('.ide-sidebar-view');
                        for (var a = 0; a < all.length; a++) all[a].classList.remove('active');
                        btn.classList.add('active');
                        var views = document.querySelectorAll('.ide-view');
                        for (var v = 0; v < views.length; v++) views[v].classList.remove('active');
                        var target = document.getElementById('ide-view-' + (btn.dataset.view || 'explorer'));
                        if (target) target.classList.add('active');
                    });
                })(viewBtns[vb]);
            }
            var fileTree = document.getElementById('ide-file-tree');
            if (!fileTree) return;
            fileTree.addEventListener('click', function (e) {
                var item = e.target.closest('.ide-tree-item[data-file-id]');
                var folder = e.target.closest('.ide-tree-folder[data-folder]');
                if (item) {
                    var id = item.dataset.fileId;
                    var file = self.files.find(function (f) { return f.id === id; });
                    if (file && !file.isFolderPlaceholder) self.switchToFile(id);
                }
                if (folder) {
                    var path = folder.dataset.folder;
                    var open = getStorage('codeEditorIdeOpenFolders', {});
                    open[path] = !open[path];
                    setStorage('codeEditorIdeOpenFolders', open);
                    folder.classList.toggle('open');
                    self.renderTree();
                }
            });
            document.getElementById('ide-file-tree').addEventListener('contextmenu', function (e) {
                var item = e.target.closest('.ide-tree-item[data-file-id]');
                if (!item) return;
                e.preventDefault();
                var id = item.dataset.fileId;
                var file = self.files.find(function (f) { return f.id === id; });
                if (!file || file.isFolderPlaceholder) return;
                var action = prompt('Rename or Delete? Type r to rename, d to delete:', '');
                if (action && action.toLowerCase() === 'r') self.renameFile(id);
                else if (action && action.toLowerCase() === 'd') self.deleteFile(id);
            });
        },

        attachSearch: function () {
            var self = this;
            var inp = document.getElementById('ide-search-input');
            var btn = document.getElementById('ide-search-btn');
            var results = document.getElementById('ide-search-results');
            if (!inp || !btn || !results) return;
            btn.onclick = function () {
                var q = inp.value.trim();
                if (!q) { results.innerHTML = '<div class="ide-search-empty">Enter a search term.</div>'; return; }
                var out = [];
                self.files.forEach(function (f) {
                    if (f.isFolderPlaceholder) return;
                    var content = f.content || '';
                    var lines = content.split('\n');
                    lines.forEach(function (line, i) {
                        if (line.indexOf(q) >= 0) out.push({ file: f.name, path: f.path, line: i + 1, text: line.trim() });
                    });
                });
                if (!out.length) results.innerHTML = '<div class="ide-search-empty">No results.</div>';
                else results.innerHTML = out.slice(0, 50).map(function (r) {
                    return '<div class="ide-search-hit" data-file-id="' + r.path + '"><span class="ide-search-loc">' + self.escapeHtml(r.file) + ':' + r.line + '</span> ' + self.escapeHtml(r.text) + '</div>';
                }).join('');
            };
        },

        attachAiPanel: function () {
            var self = this;
            var inp = document.getElementById('ide-ai-input');
            var send = document.getElementById('ide-ai-send');
            var welcome = document.getElementById('ide-ai-welcome');
            var suggestions = document.getElementById('ide-ai-suggestions');
            if (inp && send) {
                send.addEventListener('click', function () {
                    var text = inp.value.trim();
                    if (text) { self.aiSendMessage(text); inp.value = ''; }
                });
                inp.addEventListener('keydown', function (e) {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send.click(); }
                });
            }
            if (suggestions) {
                suggestions.querySelectorAll('.ide-ai-suggestion-btn').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        var text = (btn.dataset.suggestion || '').trim();
                        if (text) {
                            if (welcome) welcome.style.display = 'none';
                            self.aiSendMessage(text);
                        }
                    });
                });
            }
        },

        applyPanelSizes: function () {
            var sidebar = document.getElementById('ide-sidebar');
            var panel = document.getElementById('ide-bottom-panel');
            var previewWrap = document.getElementById('ide-preview-wrap');
            var resizerPreview = document.getElementById('ide-resizer-preview');
            var showBtn = document.getElementById('ide-preview-show-btn');
            var hideBtn = document.getElementById('ide-preview-hide-btn');
            var refreshBtn = document.getElementById('ide-preview-refresh-btn');
            if (sidebar) {
                var w = parseInt(getStorage(STORAGE_SIDEBAR_WIDTH, 280), 10);
                w = Math.max(180, Math.min(800, w));
                sidebar.style.width = w + 'px';
            }
            if (panel) {
                var h = parseInt(getStorage(STORAGE_PANEL_HEIGHT, 200), 10);
                h = Math.max(100, Math.min(window.innerHeight * 0.7, h));
                panel.style.height = h + 'px';
            }
            var previewVisible = getStorage(STORAGE_PREVIEW_VISIBLE, false);
            if (previewWrap && resizerPreview) {
                if (previewVisible) {
                    previewWrap.style.display = 'flex';
                    resizerPreview.style.display = 'block';
                    if (showBtn) showBtn.style.display = 'none';
                    if (hideBtn) hideBtn.style.display = 'inline-block';
                    if (refreshBtn) refreshBtn.style.display = 'inline-block';
                    var ratio = parseFloat(getStorage(STORAGE_PREVIEW_RATIO, 0.45), 10);
                    if (ratio > 0 && ratio < 1) {
                        var row = document.getElementById('ide-editor-row');
                        if (row) previewWrap.style.width = ((row.offsetWidth * ratio) | 0) + 'px';
                        previewWrap.style.flex = 'none';
                    }
                } else {
                    previewWrap.style.display = 'none';
                    resizerPreview.style.display = 'none';
                    if (showBtn) showBtn.style.display = 'inline-block';
                    if (hideBtn) hideBtn.style.display = 'none';
                    if (refreshBtn) refreshBtn.style.display = 'none';
                }
            }
            if (this.editor && window.monaco) {
                try { this.editor.layout(); } catch (e) {}
            }
        },

        attachResizers: function () {
            var self = this;
            var sidebar = document.getElementById('ide-sidebar');
            var resizerSidebar = document.getElementById('ide-resizer-sidebar');
            var panel = document.getElementById('ide-bottom-panel');
            var resizerPanel = document.getElementById('ide-resizer-panel');
            if (resizerSidebar && sidebar) {
                resizerSidebar.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    var startX = e.clientX;
                    var startW = sidebar.offsetWidth;
                    function move(ev) {
                        var dx = ev.clientX - startX;
                        var w = Math.max(180, Math.min(800, startW + dx));
                        sidebar.style.width = w + 'px';
                        if (self.editor && window.monaco) try { self.editor.layout(); } catch (err) {}
                    }
                    function stop() {
                        document.removeEventListener('mousemove', move);
                        document.removeEventListener('mouseup', stop);
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        setStorage(STORAGE_SIDEBAR_WIDTH, sidebar.offsetWidth);
                    }
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                    document.addEventListener('mousemove', move);
                    document.addEventListener('mouseup', stop);
                });
            }
            if (resizerPanel && panel) {
                resizerPanel.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    var startY = e.clientY;
                    var startH = panel.offsetHeight;
                    function move(ev) {
                        var dy = ev.clientY - startY;
                        var h = Math.max(100, Math.min(window.innerHeight * 0.7, startH + dy));
                        panel.style.height = h + 'px';
                        if (self.editor && window.monaco) try { self.editor.layout(); } catch (err) {}
                    }
                    function stop() {
                        document.removeEventListener('mousemove', move);
                        document.removeEventListener('mouseup', stop);
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        setStorage(STORAGE_PANEL_HEIGHT, panel.offsetHeight);
                    }
                    document.body.style.cursor = 'row-resize';
                    document.body.style.userSelect = 'none';
                    document.addEventListener('mousemove', move);
                    document.addEventListener('mouseup', stop);
                });
            }
            var resizerPreview = document.getElementById('ide-resizer-preview');
            var previewWrap = document.getElementById('ide-preview-wrap');
            var editorArea = document.getElementById('ide-editor-area');
            if (resizerPreview && previewWrap && editorArea) {
                resizerPreview.addEventListener('mousedown', function (e) {
                    e.preventDefault();
                    var startX = e.clientX;
                    var row = document.getElementById('ide-editor-row');
                    var total = row ? row.offsetWidth : 800;
                    var previewW = previewWrap.offsetWidth;
                    function move(ev) {
                        var dx = startX - ev.clientX;
                        var newW = Math.max(200, Math.min(total - 200, previewW + dx));
                        previewWrap.style.width = newW + 'px';
                        previewWrap.style.flex = 'none';
                        if (self.editor && window.monaco) try { self.editor.layout(); } catch (err) {}
                    }
                    function stop() {
                        document.removeEventListener('mousemove', move);
                        document.removeEventListener('mouseup', stop);
                        document.body.style.cursor = '';
                        document.body.style.userSelect = '';
                        var totalW = row ? row.offsetWidth : 800;
                        setStorage(STORAGE_PREVIEW_RATIO, previewWrap.offsetWidth / totalW);
                    }
                    document.body.style.cursor = 'col-resize';
                    document.body.style.userSelect = 'none';
                    document.addEventListener('mousemove', move);
                    document.addEventListener('mouseup', stop);
                });
            }
        },

        attachPreviewMessageListener: function () {
            var self = this;
            window.addEventListener('message', function (e) {
                if (!e.data || e.data.source !== 'ide-preview') return;
                var outPre = document.getElementById('ide-console-pre');
                var panelConsole = document.querySelector('[data-panel="console"]');
                if (panelConsole) panelConsole.click();
                if (outPre) {
                    var line = (e.data.args || []).join(' ');
                    var prefix = e.data.type === 'error' ? 'Error: ' : e.data.type === 'warn' ? 'Warn: ' : '';
                    outPre.textContent += prefix + line + '\n';
                }
            });
        },

        attachAllUiHandlers: function () {
            this.applyPanelSizes();
            this.attachResizers();
            this.attachEvents();
            this.attachTerminal();
            this.attachCommandPalette();
            this.attachSidebarViews();
            this.attachSearch();
            this.attachAiPanel();
            this.attachPreviewMessageListener();
        },

        attachEvents: function () {
            var self = this;
            var doc = document;
            function byId(id) { return doc.getElementById(id); }

            var runBtn = byId('ide-run-btn');
            if (runBtn) runBtn.addEventListener('click', function () { self.runCode(); });
            var showPreviewBtn = byId('ide-preview-show-btn');
            if (showPreviewBtn) showPreviewBtn.addEventListener('click', function () { self.showPreview(); });
            var hidePreviewBtn = byId('ide-preview-hide-btn');
            if (hidePreviewBtn) hidePreviewBtn.addEventListener('click', function () { self.hidePreview(); });
            var refreshPreviewBtn = byId('ide-preview-refresh-btn');
            if (refreshPreviewBtn) refreshPreviewBtn.addEventListener('click', function () { self.refreshLivePreview(); });
            var formatBtn = byId('ide-format-btn');
            if (formatBtn) formatBtn.addEventListener('click', function () { self.formatDocument(); });
            var newBtn = byId('ide-new-btn');
            if (newBtn) newBtn.addEventListener('click', function () { self.newFile(); });
            var newFileBtn = byId('ide-new-file');
            if (newFileBtn) newFileBtn.addEventListener('click', function () { self.newFile(); });
            var newFolderBtn = byId('ide-new-folder');
            if (newFolderBtn) newFolderBtn.addEventListener('click', function () { self.newFolder(); });
            var saveBtn = byId('ide-save-btn');
            if (saveBtn) saveBtn.addEventListener('click', function () { self.saveCurrent(); });
            var saveAsBtn = byId('ide-saveas-btn');
            if (saveAsBtn) saveAsBtn.addEventListener('click', function () { self.saveAs(); });
            var downloadBtn = byId('ide-download-btn');
            if (downloadBtn) downloadBtn.addEventListener('click', function () { self.downloadCurrent(); });
            var exportZipBtn = byId('ide-export-zip-btn');
            if (exportZipBtn) exportZipBtn.addEventListener('click', function () { self.exportZip(); });

            var openBtn = byId('ide-open-btn');
            var openInput = byId('ide-open-input');
            if (openBtn && openInput) openBtn.addEventListener('click', function () { openInput.click(); });
            if (openInput) openInput.addEventListener('change', function () {
                if (this.files && this.files.length) self.uploadFiles(this.files);
                this.value = '';
            });

            var uploadBtn = byId('ide-upload-btn');
            var uploadInput = byId('ide-upload-input');
            if (uploadBtn && uploadInput) uploadBtn.addEventListener('click', function () { uploadInput.click(); });
            if (uploadInput) uploadInput.addEventListener('change', function () {
                if (this.files && this.files.length) self.uploadFiles(this.files);
                this.value = '';
            });

            var aiBtn = byId('ide-ai-btn');
            var aiMenu = byId('ide-ai-menu');
            if (aiBtn && aiMenu) {
                aiBtn.addEventListener('click', function (e) {
                    e.stopPropagation();
                    aiMenu.style.display = aiMenu.style.display === 'none' ? 'block' : 'none';
                });
                var aiItems = aiMenu.querySelectorAll('[data-ai]');
                for (var i = 0; i < aiItems.length; i++) {
                    (function (btn) {
                        btn.addEventListener('click', function () {
                            aiMenu.style.display = 'none';
                            self.aiAction(btn.getAttribute('data-ai'));
                        });
                    })(aiItems[i]);
                }
                doc.addEventListener('click', function () { aiMenu.style.display = 'none'; });
            }

            var tabsEl = byId('ide-tabs');
            if (tabsEl) tabsEl.addEventListener('click', function (e) {
                var tab = e.target.closest('.ide-tab');
                var close = e.target.closest('.ide-tab-close');
                if (close && close.dataset && close.dataset.fileId) {
                    e.stopPropagation();
                    self.closeTab(close.dataset.fileId);
                } else if (tab && tab.dataset && tab.dataset.fileId) {
                    self.switchToFile(tab.dataset.fileId);
                }
            });

            var themeBtn = byId('ide-theme-btn');
            if (themeBtn) themeBtn.addEventListener('click', function () {
                var current = doc.body.getAttribute('data-theme') || 'dark-pro';
                var idx = -1;
                for (var t = 0; t < THEMES.length; t++) { if (THEMES[t].id === current) { idx = t; break; } }
                idx = (idx + 1) % THEMES.length;
                self.applyTheme(THEMES[idx].id);
            });

            var panelTabs = doc.querySelectorAll('.ide-panel-tab');
            if (panelTabs.length) {
                for (var p = 0; p < panelTabs.length; p++) {
                    (function (btn) {
                        btn.addEventListener('click', function () {
                            var all = doc.querySelectorAll('.ide-panel-tab');
                            for (var b = 0; b < all.length; b++) all[b].classList.remove('active');
                            btn.classList.add('active');
                            var panels = ['output', 'console', 'terminal', 'problems'];
                            for (var i = 0; i < panels.length; i++) {
                                var el = byId('ide-' + panels[i]);
                                if (el) el.style.display = btn.dataset.panel === panels[i] ? 'block' : 'none';
                            }
                            if (btn.dataset.panel === 'terminal') {
                                var tinp = byId('ide-terminal-input');
                                if (tinp) tinp.focus();
                            }
                        });
                    })(panelTabs[p]);
                }
            }

            doc.addEventListener('keydown', function (e) {
                var ctrl = e.ctrlKey || e.metaKey;
                if (ctrl && e.key === 'n') { e.preventDefault(); self.newFile(); }
                if (ctrl && e.key === 's') { e.preventDefault(); self.saveCurrent(); }
                if (ctrl && e.key === 'Enter') { e.preventDefault(); self.runCode(); }
                if (ctrl && e.shiftKey && e.key === 'f') { e.preventDefault(); self.formatDocument(); }
            });
        },

        escapeHtml: function (s) {
            if (s == null) return '';
            var div = document.createElement('div');
            div.textContent = s;
            return div.innerHTML;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { IDE.init(); });
    } else {
        IDE.init();
    }
})();
