/**
 * Aegis Code Studio — workspace UI, editor, preview, runtime, and Agent host.
 * Monaco is retained. Agent actions use the validated tool registry only.
 */
(function () {
    'use strict';

    var S = window.AegisStudio || {};
    var security = S.security || {};
    var diffApi = S.diff || {};
    var WS = S.workspace || {};
    var templatesApi = S.templates || { all: function () { return []; }, get: function () { return null; } };
    var Agent = (S.agent && S.agent.Agent) ? S.agent.Agent : function () {};
    var Companion = (S.companion && S.companion.Companion) ? S.companion.Companion : function () {};
    var ContextEngine = (S.context && S.context.ContextEngine) ? S.context.ContextEngine : function () {};
    var intentApi = S.intent || { classify: function () { return { surface: 'companion', launchTools: false }; } };

    var MONACO_CDN = 'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs';
    var PREVIEW_DEBOUNCE_MS = 800;
    var MAX_CONSOLE = 200;
    var MAX_AGENT_LOG = 120;
    var STORAGE_PERMISSIONS = (WS.STORAGE_PERMISSIONS) || 'codeStudioPermissions';

    function getStorage(key, fallback) {
        try {
            var s = localStorage.getItem(key);
            if (s == null) return fallback;
            return JSON.parse(s);
        } catch (e) { return fallback; }
    }
    function setStorage(key, value) {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* quota */ }
    }
    function $(id) { return document.getElementById(id); }
    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    var Studio = {
        workspace: null,
        editor: null,
        agent: null,
        companion: null,
        contextEngine: null,
        aiSurface: 'companion',
        monacoLoaded: false,
        usingFallbackEditor: false,
        previewTimer: null,
        previewState: 'stopped',
        previewErrors: [],
        consoleLines: [],
        problems: [],
        outputLines: [],
        testResults: [],
        pendingProposal: null,
        proposalResolver: null,
        highRiskOk: false,
        layout: {},
        models: {},
        decorations: [],
        pyodide: null,
        terminalHistory: [],
        terminalIndex: 0,
        runFrame: null,
        lastCheckpointId: null,
        lastUserPrompt: '',
        sendLock: false,
        lastAgentSummary: null,
        userPermissions: null,

        init: function () {
            this.workspace = new WS.ProjectWorkspace();
            this.layout = getStorage(WS.STORAGE_LAYOUT, {
                explorerW: 252, agentW: 420, previewW: 0.36, previewOn: false,
                bottomH: 148, bottomCollapsed: true, theme: null, autonomy: 'review', mode: 'agent',
                aiSurface: 'companion', uiDensity: 'v3'
            });
            if (this.layout.uiDensity !== 'v3') {
                this.layout.bottomCollapsed = true;
                this.layout.bottomH = Math.min(this.layout.bottomH || 148, 148);
                this.layout.explorerW = Math.max(this.layout.explorerW || 252, 240);
                this.layout.agentW = Math.max(this.layout.agentW || 420, 380);
                this.layout.aiSurface = this.layout.aiSurface || 'companion';
                this.layout.uiDensity = 'v3';
            }
            this.loadPersisted();
            this.userPermissions = security.normalizeUserPermissions
                ? security.normalizeUserPermissions(getStorage(STORAGE_PERMISSIONS, null))
                : { read: 'allowed', edit: 'ask', create: 'ask', delete: 'always_ask', preview: 'allowed', tests: 'allowed', network: 'denied' };
            this.contextEngine = new ContextEngine();
            this.agent = new Agent(this.makeHost());
            this.companion = new Companion(this.makeHost());
            var self = this;
            this.workspace.on(function (type) {
                if (self.contextEngine) self.contextEngine.invalidate();
                if (type === 'edit' || type === 'create' || type === 'delete' || type === 'rename') {
                    self.updateEmptyState();
                }
            });
            this.agent.setMode('agent');
            this.agent.setAutonomy(this.layout.autonomy || 'review');
            this.agent.setPermissions(this.userPermissions);
            this.aiSurface = this.layout.aiSurface === 'agent' ? 'agent' : 'companion';
            this.companion.loadMemory(this.workspace.name || 'default');
            this.bindWelcome();
            this.bindGlobal();
            this.renderTemplates();
            var hasFiles = this.workspace.files.some(function (f) { return !f.isFolderPlaceholder; });
            if (hasFiles) {
                var cont = $('welcome-continue');
                if (cont) cont.hidden = false;
            }
            this.applyOsTheme();
            this.announce('Aegis Code Studio ready');
        },

        loadPersisted: function () {
            var files = getStorage(WS.STORAGE_FILES, []);
            var open = getStorage(WS.STORAGE_OPEN, []);
            var meta = getStorage(WS.STORAGE_META, {});
            if (files && files.length) {
                this.workspace.hydrate({
                    name: meta.name || 'Untitled project',
                    files: files,
                    openFileIds: open,
                    currentFileId: open[0] || (files[0] && files[0].id),
                    history: getStorage(WS.STORAGE_HISTORY, [])
                });
            }
        },

        persist: function () {
            var data = this.workspace.serialize();
            setStorage(WS.STORAGE_FILES, data.files);
            setStorage(WS.STORAGE_OPEN, data.openFileIds);
            setStorage(WS.STORAGE_META, { name: data.name });
            setStorage(WS.STORAGE_HISTORY, data.history);
            this.saveToIdb(data);
        },

        saveToIdb: function (data) {
            try {
                if (!window.indexedDB) return;
                var req = indexedDB.open(WS.IDB_NAME, 1);
                req.onupgradeneeded = function () {
                    if (!req.result.objectStoreNames.contains(WS.IDB_STORE)) req.result.createObjectStore(WS.IDB_STORE);
                };
                req.onsuccess = function () {
                    var db = req.result;
                    try { db.transaction(WS.IDB_STORE, 'readwrite').objectStore(WS.IDB_STORE).put(data, 'state'); } catch (e) {}
                    db.close();
                };
            } catch (e) {}
        },

        announce: function (text) {
            var el = $('studio-live');
            if (el) el.textContent = text;
        },

        writeOutput: function (text) {
            this.outputLines.push(String(text));
            if (this.outputLines.length > 200) this.outputLines.shift();
            var pre = $('output-pre');
            if (pre) pre.textContent = this.outputLines.join('\n');
            var pane = $('pane-output');
            if (pane) pane.scrollTop = pane.scrollHeight;
        },

        pushConsole: function (type, args, meta) {
            var line = {
                type: type || 'log',
                text: (args || []).join(' '),
                at: new Date().toISOString().slice(11, 19),
                file: meta && meta.file,
                line: meta && meta.line
            };
            this.consoleLines.push(line);
            if (this.consoleLines.length > MAX_CONSOLE) this.consoleLines.splice(0, this.consoleLines.length - MAX_CONSOLE);
            if (this.consoleLines.length > MAX_CONSOLE) this.consoleLines.shift();
            this.renderConsole();
            if (type === 'error') {
                this.problems.push({
                    severity: 'error',
                    file: line.file || (this.currentPath() || 'preview'),
                    line: line.line || 1,
                    message: line.text,
                    source: 'preview'
                });
                this.renderProblems();
            }
        },

        renderConsole: function () {
            var box = $('console-list');
            if (!box) return;
            var errorsOnly = $('console-errors') && $('console-errors').checked;
            var html = this.consoleLines.filter(function (l) { return !errorsOnly || l.type === 'error'; }).map(function (l, i) {
                var actions = l.type === 'error'
                    ? ' <button type="button" class="studio-btn compact" data-explain-console="' + i + '">Explain</button> <button type="button" class="studio-btn compact" data-fix-console="' + i + '">Fix with Agent</button>'
                    : '';
                return '<div class="log-item ' + l.type + '" data-file="' + escapeHtml(l.file || '') + '" data-line="' + (l.line || '') + '"><span>' + l.at + '</span> ' + escapeHtml(l.text) + actions + '</div>';
            }).join('');
            box.innerHTML = html || '<div class="fs-note">No project console output.</div>';
        },

        dialog: function (opts) {
            opts = opts || {};
            var modal = $('studio-dialog');
            $('dialog-title').textContent = opts.title || 'Confirm';
            $('dialog-body').textContent = opts.body || '';
            var wrap = $('dialog-field-wrap');
            var field = $('dialog-field');
            wrap.hidden = !opts.field;
            if (opts.field) { field.value = opts.value || ''; field.placeholder = opts.placeholder || ''; }
            $('dialog-ok').textContent = opts.okLabel || 'Continue';
            $('dialog-ok').classList.toggle('danger', !!opts.danger);
            modal.hidden = false;
            var self = this;
            return new Promise(function (resolve) {
                function close(val) {
                    modal.hidden = true;
                    $('dialog-ok').onclick = null;
                    $('dialog-cancel').onclick = null;
                    resolve(val);
                }
                $('dialog-ok').onclick = function () { close(opts.field ? field.value : true); };
                $('dialog-cancel').onclick = function () { close(opts.field ? null : false); };
            });
        },

        applyOsTheme: function () {
            var saved = this.layout.theme;
            var dark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.applyTheme(saved || (dark ? 'aegis-dark' : 'aegis-light'));
        },

        applyTheme: function (id) {
            var theme = id === 'aegis-light' ? 'aegis-light' : 'aegis-dark';
            document.body.setAttribute('data-theme', theme);
            this.layout.theme = theme;
            setStorage(WS.STORAGE_LAYOUT, this.layout);
            if (window.monaco && this.editor) {
                try {
                    if (theme === 'aegis-light') {
                        window.monaco.editor.setTheme('studio-light');
                    } else {
                        window.monaco.editor.setTheme('studio-dark');
                    }
                } catch (e) {}
            }
        },

        renderTemplates: function () {
            var box = $('welcome-templates');
            if (!box) return;
            box.innerHTML = templatesApi.all().map(function (t) {
                return '<button type="button" class="template-card" data-template="' + t.id + '"><strong>' + escapeHtml(t.name) + '</strong><span>' + escapeHtml(t.description) + '</span></button>';
            }).join('');
        },

        bindWelcome: function () {
            var self = this;
            $('welcome-new').addEventListener('click', function () { self.startBlank(); });
            $('welcome-import').addEventListener('click', function () { $('welcome-file-input').click(); });
            $('welcome-file-input').addEventListener('change', function () {
                if (this.files && this.files.length) self.importFiles(this.files, true);
                this.value = '';
            });
            var cont = $('welcome-continue');
            if (cont) cont.addEventListener('click', function () { self.enterStudio(); });
            $('welcome-build').addEventListener('click', function () {
                var prompt = $('welcome-prompt').value.trim();
                self.startBlank().then(function () {
                    self.setAiSurface('agent');
                    self.routeSend(prompt || 'Create a simple responsive landing page.');
                });
            });
            $('welcome-templates').addEventListener('click', function (e) {
                var btn = e.target.closest('[data-template]');
                if (!btn) return;
                self.startTemplate(btn.getAttribute('data-template'));
            });
        },

        startBlank: function () {
            this.workspace.clear();
            this.workspace.name = 'Untitled project';
            this.persist();
            return this.enterStudio();
        },

        startTemplate: function (id) {
            var t = templatesApi.get(id);
            if (!t) return this.startBlank();
            this.workspace.applyTemplate(t);
            this.persist();
            this.enterStudio();
        },

        showWelcome: function () {
            document.body.setAttribute('data-surface', 'welcome');
            $('studio-welcome').hidden = false;
            $('studio-welcome').removeAttribute('aria-hidden');
            $('studio-root').hidden = true;
            $('studio-root').setAttribute('aria-hidden', 'true');
        },

        enterStudio: function () {
            var self = this;
            document.body.setAttribute('data-surface', 'studio');
            $('studio-welcome').hidden = true;
            $('studio-welcome').setAttribute('aria-hidden', 'true');
            $('studio-root').hidden = false;
            $('studio-root').removeAttribute('aria-hidden');
            this.applyLayout();
            this.bindStudioOnce();
            return this.loadMonaco().then(function () {
                self.setupEditor();
                self.renderAll();
                if (self.workspace.currentFileId) self.switchToFile(self.workspace.currentFileId);
                else if (self.workspace.files[0]) self.switchToFile(self.workspace.files[0].id);
                self.syncModeUi();
                self.refreshProblems();
                self.writeOutput('Workspace ready. Files stay in this browser.');
                self.setAiSurface(self.aiSurface || 'companion', { silent: true });
                self.updateEmptyState();
                if (self.workspace.files.length && self.companion && !self.companion.conversation.length) {
                    self.appendCompanionMessage('Want a quick project overview, or should Agent check problems and responsiveness?', 'assistant');
                }
            });
        },

        bindStudioOnce: function () {
            if (this._studioBound) return;
            this._studioBound = true;
            this.bindStudio();
        },

        loadMonaco: function () {
            var self = this;
            if (this.monacoLoaded && window.monaco) return Promise.resolve();
            return new Promise(function (resolve) {
                function ready() {
                    window.MonacoEnvironment = window.MonacoEnvironment || {
                        getWorkerUrl: function () {
                            return URL.createObjectURL(new Blob([
                                "self.MonacoEnvironment={baseUrl:'https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/'};",
                                "importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@0.44.0/min/vs/base/worker/workerMain.js');"
                            ], { type: 'text/javascript' }));
                        }
                    };
                    window.require.config({ paths: { vs: MONACO_CDN } });
                    window.require(['vs/editor/editor.main'], function () {
                        self.monacoLoaded = true;
                        self.defineMonacoThemes();
                        resolve();
                    }, function () {
                        self.installFallback('Monaco could not load. A plain editor is available.');
                        resolve();
                    });
                }
                if (window.require) ready();
                else {
                    var script = document.createElement('script');
                    script.src = MONACO_CDN + '/loader.js';
                    script.onload = ready;
                    script.onerror = function () {
                        self.installFallback('Monaco could not load. A plain editor is available.');
                        resolve();
                    };
                    document.head.appendChild(script);
                }
            });
        },

        defineMonacoThemes: function () {
            if (!window.monaco) return;
            window.monaco.editor.defineTheme('studio-dark', {
                base: 'vs-dark', inherit: true, rules: [],
                colors: {
                    'editor.background': '#070b14',
                    'editor.foreground': '#e8eef7',
                    'editorLineNumber.foreground': '#64748b',
                    'editorCursor.foreground': '#14b8a6',
                    'editor.selectionBackground': '#134e4a88'
                }
            });
            window.monaco.editor.defineTheme('studio-light', {
                base: 'vs', inherit: true, rules: [],
                colors: {
                    'editor.background': '#f8fafc',
                    'editor.foreground': '#0f172a',
                    'editorCursor.foreground': '#0f766e'
                }
            });
        },

        installFallback: function (message) {
            var container = $('monaco-container');
            if (!container) return;
            container.innerHTML = '';
            var note = document.createElement('p');
            note.className = 'ide-fallback-note';
            note.textContent = message;
            var ta = document.createElement('textarea');
            ta.className = 'ide-plain-editor';
            ta.setAttribute('spellcheck', 'false');
            ta.setAttribute('aria-label', 'Code');
            container.appendChild(note);
            container.appendChild(ta);
            var listeners = [];
            ta.addEventListener('input', function () { listeners.forEach(function (fn) { fn(); }); });
            this.usingFallbackEditor = true;
            this.editor = {
                getValue: function () { return ta.value; },
                setValue: function (v) { ta.value = v || ''; },
                layout: function () {},
                focus: function () { ta.focus(); },
                getSelection: function () { return null; },
                getPosition: function () { return { lineNumber: 1, column: 1 }; },
                getModel: function () {
                    return {
                        getValue: function () { return ta.value; },
                        getValueInRange: function () { return ''; },
                        findNextMatch: function () { return null; },
                        findPreviousMatch: function () { return null; }
                    };
                },
                setModel: function (model) { ta.value = model && model.getValue ? model.getValue() : ''; },
                onDidChangeCursorPosition: function () { return { dispose: function () {} }; },
                onDidChangeModelContent: function (fn) { listeners.push(fn); return { dispose: function () {} }; },
                executeEdits: function (_, edits) { if (edits && edits[0]) ta.value = edits[0].text; },
                getAction: function () { return { run: function () {} }; },
                deltaDecorations: function () { return []; }
            };
        },

        setupEditor: function () {
            var self = this;
            if (this.editor && !this.usingFallbackEditor) return;
            var container = $('monaco-container');
            if (!container || !window.monaco) return;
            this._suspendSync = true;
            this.editor = window.monaco.editor.create(container, {
                value: '',
                language: 'javascript',
                theme: this.layout.theme === 'aegis-light' ? 'studio-light' : 'studio-dark',
                automaticLayout: true,
                fontSize: 13,
                lineHeight: 22,
                fontFamily: "'JetBrains Mono','Consolas',monospace",
                lineNumbers: 'on',
                minimap: { enabled: false },
                bracketPairColorization: { enabled: true },
                matchBrackets: 'always',
                autoIndent: 'full',
                tabSize: 2,
                insertSpaces: true,
                folding: true,
                padding: { top: 14, bottom: 28 },
                scrollbar: { verticalScrollbarSize: 12, horizontalScrollbarSize: 12, alwaysConsumeMouseWheel: false },
                quickSuggestions: { other: true, comments: false, strings: true },
                suggestOnTriggerCharacters: true,
                wordBasedSuggestions: 'matchingDocuments',
                scrollBeyondLastLine: false,
                renderLineHighlight: 'line',
                smoothScrolling: true
            });
            this.editor.onDidChangeCursorPosition(function (e) {
                var el = $('status-cursor');
                if (el) el.textContent = 'Ln ' + e.position.lineNumber + ', Col ' + e.position.column;
            });
            this.editor.onDidChangeModelContent(function () {
                if (self._suspendSync) return;
                self.syncBufferToWorkspace();
                self.schedulePreview();
                self.updateInlineAi();
            });
            this.editor.onDidChangeCursorSelection(function () { self.updateInlineAi(); });
            this._suspendSync = false;
        },

        modelFor: function (file) {
            if (!window.monaco) return null;
            if (this.models[file.id]) {
                var existing = this.models[file.id];
                if (existing.getValue() !== (file.content || '')) existing.setValue(file.content || '');
                return existing;
            }
            var model = window.monaco.editor.createModel(file.content || '', file.language || 'plaintext');
            this.models[file.id] = model;
            return model;
        },

        switchToFile: function (id) {
            var file = this.workspace.findById(id);
            if (!file || file.isFolderPlaceholder) return;
            if (this.workspace.currentFileId && this.workspace.currentFileId !== id) this.flushCurrent();
            this._suspendSync = true;
            this.workspace.currentFileId = id;
            if (this.editor && window.monaco && !this.usingFallbackEditor) {
                this.editor.setModel(this.modelFor(file));
                var lines = (file.content || '').split('\n').length;
                this.editor.updateOptions({ minimap: { enabled: lines < 2000 && window.innerWidth > 1100 } });
                this.editor.focus();
            } else if (this.editor) {
                this.editor.setValue(file.content || '');
            }
            var self = this;
            setTimeout(function () { self._suspendSync = false; }, 0);
            var lang = $('status-language');
            if (lang) lang.textContent = file.language || 'plaintext';
            this.renderTabs();
            this.renderTree();
            this.persist();
            this.updateContextChips();
        },

        currentFile: function () {
            return this.workspace.findById(this.workspace.currentFileId);
        },

        currentPath: function () {
            var f = this.currentFile();
            return f ? (f.path || f.name) : '';
        },

        flushCurrent: function () {
            if (this._suspendSync) return;
            var file = this.currentFile();
            if (!file || !this.editor) return;
            var val = this.editor.getValue();
            if (val !== file.content) {
                file.content = val;
                file.isDirty = true;
            }
        },

        syncBufferToWorkspace: function () {
            var file = this.currentFile();
            if (!file || !this.editor) return;
            file.content = this.editor.getValue();
            file.isDirty = true;
            this.persist();
            this.renderTabs();
            var dirty = $('status-dirty');
            if (dirty) dirty.textContent = 'Unsaved';
        },

        saveCurrent: function () {
            this.flushCurrent();
            var file = this.currentFile();
            if (!file) return;
            file.isDirty = false;
            this.persist();
            this.renderTabs();
            var dirty = $('status-dirty');
            if (dirty) dirty.textContent = 'Saved';
            this.writeOutput('Saved ' + (file.path || file.name) + ' to local workspace.');
            this.announce('Saved');
        },

        renderAll: function () {
            var name = $('studio-project-name');
            if (name) name.textContent = this.workspace.name || 'Untitled project';
            this.renderTree();
            this.renderTabs();
            this.renderChanges();
            this.updateContextChips();
            this.updateEmptyState();
        },

        updateEmptyState: function () {
            var empty = $('editor-empty');
            if (!empty) return;
            var hasFiles = this.workspace.files.some(function (f) { return !f.isFolderPlaceholder; });
            empty.hidden = hasFiles;
            var stage = $('editor-stage');
            if (stage) stage.classList.toggle('is-empty', !hasFiles);
        },

        renderTree: function () {
            var el = $('file-tree');
            if (!el) return;
            var self = this;
            var folders = {};
            var rows = [];
            this.workspace.files.forEach(function (f) {
                var path = f.path || f.name;
                var parts = path.split('/');
                var acc = '';
                for (var i = 0; i < parts.length - 1; i++) {
                    acc = acc ? acc + '/' + parts[i] : parts[i];
                    if (!folders[acc]) {
                        folders[acc] = true;
                        rows.push({ type: 'folder', path: acc, name: parts[i], depth: i });
                    }
                }
                if (!f.isFolderPlaceholder) {
                    rows.push({ type: 'file', file: f, depth: parts.length - 1 });
                }
            });
            rows.sort(function (a, b) {
                var ap = a.type === 'folder' ? a.path : a.file.path;
                var bp = b.type === 'folder' ? b.path : b.file.path;
                return ap.localeCompare(bp);
            });
            el.innerHTML = rows.length ? rows.map(function (row) {
                if (row.type === 'folder') {
                    return '<div class="tree-folder" data-folder="' + escapeHtml(row.path) + '" style="padding-left:' + (10 + row.depth * 14) + 'px"><span class="tree-kind">dir</span>' + escapeHtml(row.name) + '</div>';
                }
                var active = row.file.id === self.workspace.currentFileId ? ' is-open' : '';
                var ext = (row.file.name.split('.').pop() || 'file').slice(0, 4);
                return '<div class="tree-item' + active + '" data-id="' + row.file.id + '" style="padding-left:' + (10 + row.depth * 14) + 'px"><span class="tree-kind">' + escapeHtml(ext) + '</span>' + escapeHtml(row.file.name) + '</div>';
            }).join('') : '<div class="fs-note">No files yet. Create one or ask Aegis to build.</div>';
        },

        renderTabs: function () {
            var el = $('editor-tabs');
            if (!el) return;
            var self = this;
            el.innerHTML = this.workspace.openFileIds.map(function (id) {
                var f = self.workspace.findById(id);
                if (!f || f.isFolderPlaceholder) return '';
                var active = id === self.workspace.currentFileId ? ' active' : '';
                var dirty = f.isDirty ? '<span class="tab-dirty">●</span>' : '';
                return '<div class="editor-tab' + active + '" data-id="' + id + '" role="tab">' + escapeHtml(f.name) + dirty + '<button type="button" class="tab-close" data-close="' + id + '" aria-label="Close">×</button></div>';
            }).join('');
        },

        renderChanges: function () {
            var el = $('changes-list');
            if (!el) return;
            var hist = this.workspace.history || [];
            if (this.pendingProposal) {
                el.innerHTML = '<div class="change-item">Proposed: ' + escapeHtml(this.pendingProposal.path) + '</div>';
                return;
            }
            el.innerHTML = hist.length ? hist.map(function (h) {
                var files = [].concat(h.created || [], h.modified || [], h.deleted || []);
                return '<div class="change-item"><strong>' + escapeHtml(h.task) + '</strong><span>' + escapeHtml(files.join(', ') || 'No file list') + '</span></div>';
            }).join('') : '<div class="fs-note">No agent changesets yet.</div>';
        },

        updateContextChips: function () {
            var box = $('context-chips');
            if (!box) return;
            var chips = [];
            var cur = this.currentFile();
            if (cur) chips.push({ id: 'current', label: 'Active — ' + (cur.path || cur.name) });
            var sel = this.getSelectionMeta();
            if (sel && sel.text) {
                chips.push({
                    id: 'selection',
                    label: 'Selection — ' + (sel.path || 'code') + (sel.startLine ? ' lines ' + sel.startLine + '–' + sel.endLine : ''),
                    unpin: 'selection'
                });
            }
            var probs = this.problems.filter(function (p) { return p.severity === 'error'; });
            if (probs.length) chips.push({ id: 'problems', label: probs.length + ' problems' });
            var pins = (this.contextEngine && this.contextEngine.pins) || [];
            pins.forEach(function (path) {
                chips.push({ id: 'pin:' + path, label: '@' + path, path: path, unpin: path });
            });
            box.innerHTML = chips.map(function (c) {
                return '<span class="chip">' + escapeHtml(c.label) + (c.unpin ? ' <button type="button" data-unpin="' + escapeHtml(c.unpin) + '" aria-label="Remove">×</button>' : '') + '</span>';
            }).join('') || '<span class="fs-note">No extra context attached.</span>';
        },

        getSelectionMeta: function () {
            var text = this.getSelection();
            if (!text) return null;
            var sel = this.editor && this.editor.getSelection && this.editor.getSelection();
            return {
                path: this.currentPath() || '',
                text: text,
                startLine: sel && (sel.startLineNumber || sel.startLine) || 1,
                endLine: sel && (sel.endLineNumber || sel.endLine) || 1
            };
        },

        getSelection: function () {
            if (!this.editor) return '';
            var sel = this.editor.getSelection && this.editor.getSelection();
            if (!sel || !this.editor.getModel()) return '';
            var text = this.editor.getModel().getValueInRange(sel);
            return text && text.trim() ? text : '';
        },

        updateInlineAi: function () {
            var bar = $('inline-ai');
            if (!bar) return;
            var sel = this.getSelection();
            bar.hidden = !sel;
        },

        /* ---------- Preview ---------- */
        setPreviewState: function (state) {
            this.previewState = state;
            var el = $('preview-state');
            if (el) {
                el.textContent = state.charAt(0).toUpperCase() + state.slice(1);
                el.setAttribute('data-state', state);
            }
            var st = $('status-preview');
            if (st) st.textContent = 'Preview ' + state;
        },

        assemblePreviewHtml: function (entryPath) {
            var file = this.workspace.findByPath(entryPath);
            if (!file) return '';
            var html = file.content || '';
            var self = this;
            html = html.replace(/<link\s+[^>]*href=["']([^"']+)["'][^>]*>/gi, function (m, href) {
                if (/^https?:/i.test(href)) return m;
                var n = security.normalizeProjectPath(href);
                if (!n.ok) return '';
                var css = self.workspace.findByPath(n.path);
                if (!css) return '<!-- missing ' + escapeHtml(n.path) + ' -->';
                return '<style>\n' + css.content + '\n</style>';
            });
            html = html.replace(/<script\s+[^>]*src=["']([^"']+)["'][^>]*><\/script>/gi, function (m, src) {
                if (/^https?:/i.test(src)) return '<!-- external scripts are not inlined -->';
                var n = security.normalizeProjectPath(src);
                if (!n.ok) return '';
                var js = self.workspace.findByPath(n.path);
                if (!js) return '<!-- missing ' + n.path + ' -->';
                return '<script>\n' + js.content + '\n<\/script>';
            });
            var probe = '<script>(function(){function send(type,args,extra){try{parent.postMessage(Object.assign({source:"studio-preview",type:type,args:args.map(function(a){return typeof a==="object"?JSON.stringify(a):String(a);})},extra||{}),"*");}catch(e){}}var ol=console.log,oe=console.error,ow=console.warn;console.log=function(){send("log",[].slice.call(arguments));ol.apply(console,arguments);};console.warn=function(){send("warn",[].slice.call(arguments));ow.apply(console,arguments);};console.error=function(){send("error",[].slice.call(arguments));oe.apply(console,arguments);};window.addEventListener("error",function(e){send("error",[e.message||"Script error"],{line:e.lineno,file:e.filename});});window.addEventListener("unhandledrejection",function(e){send("error",["Unhandled: "+(e.reason&&e.reason.message?e.reason.message:String(e.reason))]);});})();<\/script>';
            if (/<head>/i.test(html)) html = html.replace(/<head>/i, '<head>' + probe);
            else html = '<!DOCTYPE html><html><head>' + probe + '</head><body>' + html + '</body></html>';
            return html;
        },

        refreshPreview: function () {
            var frame = $('preview-frame');
            if (!frame) return { ok: false, error: 'No preview frame' };
            this.flushCurrent();
            var entry = this.workspace.entryHtml();
            if (!entry) {
                var cur = this.currentFile();
                if (cur && /html|css|javascript/i.test(cur.language || '')) entry = cur.path;
            }
            if (!entry) {
                this.setPreviewState('error');
                return { ok: false, error: 'No HTML entry file' };
            }
            this.previewErrors = [];
            this.setPreviewState('loading');
            var html = this.assemblePreviewHtml(entry);
            frame.removeAttribute('src');
            frame.srcdoc = html;
            var self = this;
            frame.onload = function () { self.setPreviewState('ready'); };
            this.writeOutput('Preview refreshed from ' + entry + '.');
            return { ok: true, entry: entry, status: 'ready' };
        },

        showPreview: function (on) {
            var dock = $('preview-dock');
            var resizer = $('resizer-preview');
            var btn = $('btn-preview');
            this.layout.previewOn = !!on;
            dock.hidden = !on;
            resizer.hidden = !on;
            btn.setAttribute('aria-pressed', on ? 'true' : 'false');
            btn.textContent = on ? 'Hide Preview' : 'Preview';
            setStorage(WS.STORAGE_LAYOUT, this.layout);
            if (on) this.refreshPreview();
            else this.setPreviewState('stopped');
            if (this.editor) try { this.editor.layout(); } catch (e) {}
        },

        schedulePreview: function () {
            var self = this;
            if (!this.layout.previewOn) return;
            if (this.previewTimer) clearTimeout(this.previewTimer);
            this.previewTimer = setTimeout(function () {
                self.previewTimer = null;
                self.refreshPreview();
            }, PREVIEW_DEBOUNCE_MS);
        },

        /* ---------- Runtime ---------- */
        runCode: function (path) {
            this.flushCurrent();
            var file = path ? this.workspace.findByPath(path) : this.currentFile();
            if (!file) return { ok: false, error: 'No file to run' };
            var lang = file.language || WS.detectLanguage(file.name);
            this.writeOutput('Run: ' + (file.path || file.name));
            this.showBottom('console');
            if (lang === 'html' || lang === 'css' || /\.html?$/i.test(file.name)) {
                this.showPreview(true);
                return this.refreshPreview();
            }
            if (lang === 'javascript') {
                this.showPreview(true);
                var wrapped = '<!DOCTYPE html><html><head></head><body><script>\n' + (file.content || '') + '\n<\/script></body></html>';
                var fake = { path: 'index.html', content: wrapped, language: 'html', name: 'index.html' };
                var prev = this.workspace.files.slice();
                this.workspace.files = this.workspace.files.concat([fake]);
                var html = this.assemblePreviewHtml('index.html');
                this.workspace.files = prev;
                var frame = $('preview-frame');
                if (frame) {
                    this.setPreviewState('loading');
                    frame.srcdoc = html;
                    this.setPreviewState('ready');
                }
                return { ok: true, ran: 'javascript-sandbox', status: 'RUN' };
            }
            if (lang === 'python') {
                this.runPython(file.content || '');
                return { ok: true, ran: 'python-pyodide', status: 'RUN' };
            }
            this.writeOutput('Run supports HTML preview, sandboxed JavaScript, and optional Python via Pyodide. Current: ' + lang);
            return { ok: false, error: 'Unsupported run language: ' + lang };
        },

        runPython: function (code) {
            var self = this;
            this.pushConsole('log', ['Loading Python (Pyodide)…']);
            function go(py) {
                try {
                    var out = py.runPython(code);
                    self.pushConsole('log', [out != null ? String(out) : 'Done.']);
                } catch (e) {
                    self.pushConsole('error', [e.message]);
                }
            }
            if (window.pyodide) { go(window.pyodide); return; }
            var script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/pyodide.js';
            script.onload = function () {
                window.loadPyodide({ indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.24.1/full/' }).then(function (py) {
                    window.pyodide = py;
                    go(py);
                }).catch(function (err) { self.pushConsole('error', ['Pyodide failed']); });
            };
            script.onerror = function () { self.pushConsole('error', ['Could not load Pyodide']); };
            document.head.appendChild(script);
        },

        stopRuntime: function () {
            var frame = $('preview-frame');
            if (frame) frame.srcdoc = '<!DOCTYPE html><title>Stopped</title>';
            this.setPreviewState('stopped');
        },

        formatDocument: function (path) {
            var self = this;
            if (path && path !== this.currentPath()) {
                var f = this.workspace.findByPath(path);
                if (f) this.switchToFile(f.id);
            }
            if (this.editor && this.editor.getAction) {
                try { this.editor.getAction('editor.action.formatDocument').run(); } catch (e) {}
            }
            this.writeOutput('Format requested for ' + (path || this.currentPath() || 'current file') + '.');
            return { ok: true, status: 'APPLIED' };
        },

        /* ---------- Diagnostics / tests ---------- */
        refreshProblems: function () {
            this.flushCurrent();
            var issues = [];
            this.workspace.files.forEach(function (f) {
                if (f.isFolderPlaceholder) return;
                var lines = String(f.content || '').split('\n');
                lines.forEach(function (line, i) {
                    if (/TODO|FIXME/i.test(line)) {
                        issues.push({ severity: 'info', file: f.path || f.name, line: i + 1, message: line.trim(), source: 'comment' });
                    }
                });
                if ((f.language === 'javascript' || /\.js$/i.test(f.name)) && f.content) {
                    if (window.monaco && Studio.models[f.id]) {
                        var markers = window.monaco.editor.getModelMarkers({ resource: Studio.models[f.id].uri }) || [];
                        markers.forEach(function (mk) {
                            if (mk.severity >= 8) {
                                issues.push({ severity: 'error', file: f.path || f.name, line: mk.startLineNumber || 1, message: mk.message, source: 'syntax' });
                            }
                        });
                    }
                }
                if ((f.language === 'html' || /\.html?$/i.test(f.name)) && window.DOMParser) {
                    var doc = new DOMParser().parseFromString(f.content || '', 'text/html');
                    var err = doc.querySelector('parsererror');
                    if (err) issues.push({ severity: 'warning', file: f.path || f.name, line: 1, message: 'HTML parse warning', source: 'html' });
                }
            });
            this.previewErrors.forEach(function (e) {
                issues.push({ severity: 'error', file: e.file || 'preview', line: e.line || 1, message: e.message, source: 'preview' });
            });
            this.problems = issues;
            this.renderProblems();
            return issues;
        },

        renderProblems: function () {
            var el = $('problems-list');
            if (!el) return;
            var self = this;
            el.innerHTML = this.problems.length ? this.problems.map(function (p, i) {
                return '<div class="problem-item ' + p.severity + '" data-file="' + escapeHtml(p.file) + '" data-line="' + p.line + '"><span>' + escapeHtml(p.file) + ':' + p.line + '</span> ' + escapeHtml(p.message) + ' <button type="button" class="studio-btn compact" data-explain="' + i + '">Explain</button> <button type="button" class="studio-btn fix-aegis" data-fix="' + i + '">Fix with Agent</button></div>';
            }).join('') : '<div class="fs-note">No problems.</div>';
        },

        runValidation: function () {
            var issues = this.refreshProblems();
            var htmlOk = this.workspace.files.filter(function (f) { return /\.html?$/i.test(f.path || f.name); }).length;
            var jsErr = issues.filter(function (p) { return p.source === 'syntax'; });
            var previewErr = issues.filter(function (p) { return p.source === 'preview'; });
            var results = [
                { name: 'HTML files present', pass: htmlOk > 0 || this.workspace.files.length === 0, detail: htmlOk ? htmlOk + ' HTML file(s)' : 'No HTML entry' },
                { name: 'JavaScript syntax', pass: jsErr.length === 0, detail: jsErr.length ? jsErr[0].message : 'No syntax errors' },
                { name: 'Preview errors captured', pass: previewErr.length === 0, detail: previewErr.length ? previewErr.length + ' error(s)' : 'None captured' }
            ];
            this.testResults = results;
            var box = $('tests-list');
            if (box) {
                box.innerHTML = results.map(function (r) {
                    return '<div class="log-item ' + (r.pass ? '' : 'error') + '">' + (r.pass ? 'PASS' : 'FAIL') + ' — ' + escapeHtml(r.name) + ': ' + escapeHtml(r.detail) + '</div>';
                }).join('');
            }
            this.writeOutput('Validation finished: ' + results.filter(function (r) { return r.pass; }).length + '/' + results.length + ' checks passed.');
            return { ok: jsErr.length === 0, results: results, status: 'VERIFIED' };
        },

        /* ---------- Agent host ---------- */
        makeHost: function () {
            var self = this;
            return {
                workspace: self.workspace,
                getCurrentFile: function () { return self.currentFile(); },
                readForContext: function (path, opts) {
                    self.flushCurrent();
                    var rec = self.workspace.readFile(path, {});
                    if (!rec.ok) return null;
                    if (rec.file.omitted) return { content: '[sensitive omitted]', revision: rec.file.revision };
                    var text = rec.file.content || '';
                    if (opts && opts.max) text = text.slice(0, opts.max);
                    return { content: text, revision: rec.file.revision };
                },
                getProblems: function () { return self.problems.slice(); },
                getPreviewErrors: function () { return self.previewErrors.slice(); },
                confirmHighRisk: function (checked) {
                    return self.dialog({
                        title: 'High-risk operation',
                        body: 'Aegis wants to ' + checked.id + (checked.args && checked.args.path ? ' on ' + checked.args.path : '') + '. This can delete or overwrite project files.',
                        danger: true,
                        okLabel: 'Allow once'
                    });
                },
                proposeTool: function (checked) { return self.proposeTool(checked); },
                runTool: function (id, args) { return self.runTool(id, args); },
                stopRuntime: function () { self.stopRuntime(); },
                shouldVerify: function () { return self.agent && self.aiSurface === 'agent'; },
                onState: function (state) { self.setAgentState(state); },
                onMode: function () { self.syncModeUi(); },
                onAutonomy: function (v) { self.layout.autonomy = v; setStorage(WS.STORAGE_LAYOUT, self.layout); },
                onActivity: function (item) { self.renderActivity(item); },
                onPlan: function (plan) { self.renderPlan(plan); },
                onContext: function () { self.updateContextChips(); },
                onMessage: function (text, role) { self.appendMessage(text, role || 'assistant'); },
                onDone: function (parsed) { self.onAgentDone(parsed); },
                onStopped: function () { self.onAgentStopped(); },
                onPaused: function (reason, extras) { self.onAgentPaused(reason, extras); },
                onProviderFailure: function (message) { self.onAgentPaused(message, { actions: ['retry', 'review', 'revert'] }); },
                onNeedContinue: function () {
                    self.appendMessage('Aegis paused after the step limit. Send “continue” to keep going.', 'assistant');
                },
                onLiveEdit: function (id, args) { self.showLiveEdit(args && args.path); },
                onAgentLog: function (line, kind) { self.appendAgentLog(line, kind); },
                onCompanionMessage: function (text, role) { self.appendCompanionMessage(text, role); },
                onCompanionDone: function () { self.sendLock = false; },
                onCompanionError: function (message) { self.appendCompanionMessage(message, 'error'); self.sendLock = false; },
                onCompanionStopped: function () { self.sendLock = false; },
                onCompanionReset: function () {
                    var thread = $('companion-thread');
                    if (thread) thread.innerHTML = '';
                },
                makeAbort: function () { return new AbortController(); },
                buildContext: function (extra) { return self.buildProjectContext(extra); },
                complete: function (payload) { return self.completeAgent(payload); },
                completeCompanion: function (payload) { return self.completeCompanion(payload); }
            };
        },

        buildProjectContext: function (extra) {
            extra = extra || {};
            this.flushCurrent();
            if (this.contextEngine) {
                this.contextEngine.ensure(this.workspace);
                if (extra.selection || this.getSelection()) {
                    var meta = this.getSelectionMeta();
                    if (meta) this.contextEngine.setSelection(meta);
                }
                var built = this.contextEngine.build(this.workspace, {
                    currentFile: extra.currentFile || this.currentFile(),
                    problems: this.problems,
                    previewErrors: this.previewErrors,
                    related: extra.related || this.relatedFiles(),
                    agentSummary: this.lastAgentSummary && JSON.stringify(this.lastAgentSummary)
                });
                this.lastContext = built.used;
                this.updateContextChips();
                return built;
            }
            return { text: '', used: [] };
        },

        setAiSurface: function (surface, opts) {
            opts = opts || {};
            this.aiSurface = surface === 'agent' ? 'agent' : 'companion';
            this.layout.aiSurface = this.aiSurface;
            setStorage(WS.STORAGE_LAYOUT, this.layout);
            var root = $('studio-agent');
            if (root) root.setAttribute('data-ai', this.aiSurface);
            var companionBtn = $('surface-companion');
            var agentBtn = $('surface-agent');
            if (companionBtn) {
                companionBtn.classList.toggle('active', this.aiSurface === 'companion');
                companionBtn.setAttribute('aria-selected', this.aiSurface === 'companion' ? 'true' : 'false');
            }
            if (agentBtn) {
                agentBtn.classList.toggle('active', this.aiSurface === 'agent');
                agentBtn.setAttribute('aria-selected', this.aiSurface === 'agent' ? 'true' : 'false');
            }
            var kicker = $('ai-kicker');
            if (kicker) kicker.textContent = this.aiSurface === 'agent' ? 'Aegis Agent' : 'Aegis Companion';
            var hint = $('composer-hint');
            if (hint) {
                hint.textContent = this.aiSurface === 'agent'
                    ? 'Describe an outcome. Agent will plan, edit, preview, and verify. Use @ to attach a file.'
                    : 'Talk through the project. Companion will not edit files. Use @ to attach a file.';
            }
            var input = $('agent-input');
            if (input) {
                input.placeholder = this.aiSurface === 'agent'
                    ? 'Build a responsive login page, add dark mode, or fix the preview…'
                    : 'Ask about this file, review the layout, or talk through an error…';
            }
            var companionThread = $('companion-thread');
            var agentThread = $('agent-thread');
            if (companionThread) companionThread.hidden = this.aiSurface !== 'companion';
            if (agentThread) agentThread.hidden = this.aiSurface !== 'agent';
            var plan = $('agent-plan');
            if (plan && this.aiSurface !== 'agent') plan.hidden = true;
            $('btn-toggle-companion') && $('btn-toggle-companion').setAttribute('aria-pressed', this.aiSurface === 'companion' ? 'true' : 'false');
            $('btn-toggle-agent') && $('btn-toggle-agent').setAttribute('aria-pressed', this.aiSurface === 'agent' ? 'true' : 'false');
            document.body.classList.add('is-agent-open');
            $('studio-workspace') && $('studio-workspace').classList.remove('is-agent-collapsed');
            if (!opts.silent && input) input.focus();
            if (this.aiSurface === 'companion') this.agent.setMode('agent');
            this.syncModeUi();
        },

        setAgentState: function (state) {
            var el = $('agent-state');
            var st = $('status-agent');
            var stop = $('btn-stop');
            var live = ['UNDERSTANDING', 'PLANNING', 'WAITING_PERMISSION', 'EXECUTING', 'OBSERVING', 'REPAIRING', 'VERIFYING', 'WORKING', 'RUNNING'].indexOf(state) >= 0;
            var label = state === 'IDLE' || state === 'COMPLETED' ? (this.aiSurface === 'companion' ? 'Ready' : 'Idle') : state.replace(/_/g, ' ').toLowerCase();
            if (el) {
                el.textContent = label;
                el.classList.toggle('is-live', live);
                el.setAttribute('data-state', state);
            }
            if (st) st.textContent = (this.aiSurface === 'companion' ? 'Companion ' : 'Agent ') + label;
            if (stop) stop.hidden = !live && !(this.companion && this.companion.busy);
            if (live) this.announce('Agent ' + label);
        },

        syncModeUi: function () {
            if ($('studio-autonomy')) $('studio-autonomy').value = this.agent.autonomy;
            this.layout.mode = this.agent.mode;
            this.layout.aiSurface = this.aiSurface;
            setStorage(WS.STORAGE_LAYOUT, this.layout);
        },

        renderPlan: function (plan) {
            var el = $('agent-plan');
            if (!el) return;
            el.hidden = this.aiSurface !== 'agent' || !plan || !plan.length;
            if (!plan || !plan.length) {
                el.innerHTML = '';
                return;
            }
            el.innerHTML = '<p class="plan-label">Working plan</p><ol>' + plan.map(function (s) {
                return '<li class="' + escapeHtml(s.state) + '">' + escapeHtml(s.title) + ' <span class="tree-kind">' + escapeHtml(s.state) + '</span></li>';
            }).join('') + '</ol>';
        },

        renderActivity: function (item) {
            var el = $('agent-activity');
            if (el) {
                el.hidden = this.aiSurface !== 'agent';
                el.textContent = item.text;
            }
            this.appendAgentLog(item.text, item.kind);
        },

        appendAgentLog: function (text, kind) {
            var log = $('agent-log');
            if (!log) return;
            while (log.children.length >= MAX_AGENT_LOG) log.removeChild(log.lastChild);
            var row = document.createElement('div');
            row.className = 'log-item' + (kind === 'error' ? ' error' : '');
            row.textContent = text;
            log.prepend(row);
        },

        appendMessage: function (text, role) {
            this.appendThreadMessage($('agent-thread'), text, role, 'Agent');
        },

        appendCompanionMessage: function (text, role) {
            this.appendThreadMessage($('companion-thread'), text, role, 'Companion', true);
        },

        appendThreadMessage: function (thread, text, role, who, withActions) {
            if (!thread) return;
            var clean = String(text || '').trim();
            if (!clean) return;
            var last = thread.lastElementChild;
            if (last && last.getAttribute('data-text') === clean && last.classList.contains(role)) return;
            var div = document.createElement('div');
            div.className = 'agent-msg ' + role + (who === 'Companion' && role === 'assistant' ? ' companion' : '');
            div.setAttribute('data-text', clean);
            var label = role === 'user' ? 'You' : (role === 'error' ? 'Needs attention' : who);
            var actions = '';
            if (withActions && role === 'assistant') {
                actions = '<div class="msg-actions">' +
                    '<button type="button" class="studio-btn compact" data-act="copy">Copy</button>' +
                    '<button type="button" class="studio-btn compact" data-act="insert">Insert</button>' +
                    '<button type="button" class="studio-btn compact" data-act="apply">Apply suggestion</button>' +
                    '<button type="button" class="studio-btn compact" data-act="agent">Implement with Agent</button>' +
                    '<button type="button" class="studio-btn compact" data-act="more">Explain more</button>' +
                    '</div>';
            }
            div.innerHTML = '<span class="msg-role">' + label + '</span><div class="msg-body">' + this.formatMessage(clean) + '</div>' + actions;
            thread.appendChild(div);
            var body = $('agent-body');
            if (body) body.scrollTop = body.scrollHeight;
        },

        formatMessage: function (raw) {
            var t = escapeHtml(raw || '');
            t = t.replace(/```([\s\S]*?)```/g, function (_, code) { return '<pre><code>' + code + '</code></pre>'; });
            t = t.replace(/\n/g, '<br>');
            return t;
        },

        completeAgent: function (payload) {
            var self = this;
            this.agent.abort = payload.signal ? { signal: payload.signal, abort: function () {} } : new AbortController();
            return fetch('/api/code-studio', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                signal: payload.signal || this.agent.abort.signal,
                body: JSON.stringify({
                    surface: 'agent',
                    mode: payload.mode || 'agent',
                    messages: payload.conversation,
                    context: payload.context,
                    taskId: payload.taskId,
                    requestId: payload.requestId,
                    max_tokens: 1100
                })
            }).then(function (r) {
                return r.text().then(function (text) {
                    var data = {};
                    try { data = text ? JSON.parse(text) : {}; } catch (e) {}
                    if (r.status === 503) {
                        self.agent.providerOk = false;
                        throw new Error(data.error || 'Aegis Agent is not configured on the server.');
                    }
                    if (r.status === 401) {
                        throw new Error('Sign in to use Aegis Agent. The editor, preview, and files still work.');
                    }
                    if (!r.ok) throw new Error(data.error || 'Aegis Agent request failed.');
                    self.agent.providerOk = true;
                    return data;
                });
            });
        },

        completeCompanion: function (payload) {
            var self = this;
            return fetch('/api/code-studio', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json', Accept: 'text/event-stream, application/json' },
                signal: payload.signal,
                body: JSON.stringify({
                    surface: 'companion',
                    mode: 'companion',
                    stream: true,
                    messages: payload.conversation,
                    context: payload.context,
                    requestId: payload.requestId,
                    max_tokens: 900
                })
            }).then(function (r) {
                var type = r.headers.get('content-type') || '';
                if (r.status === 503) {
                    return r.json().catch(function () { return {}; }).then(function (data) {
                        throw new Error(data.error || 'Aegis Companion could not reach the AI service. Your project is safe.');
                    });
                }
                if (r.status === 401) throw new Error('Sign in to use Aegis Companion. The editor and preview still work.');
                if (!r.ok) {
                    return r.json().catch(function () { return {}; }).then(function (data) {
                        throw new Error(data.error || 'Aegis Companion request failed.');
                    });
                }
                if (type.indexOf('text/event-stream') >= 0 && r.body && r.body.getReader) {
                    return self.readCompanionStream(r);
                }
                return r.json().then(function (data) { return data; });
            });
        },

        readCompanionStream: function (response) {
            var reader = response.body.getReader();
            var decoder = new TextDecoder();
            var buffer = '';
            var acc = '';
            var thread = $('companion-thread');
            var bubble = null;
            function ensureBubble() {
                if (bubble) return bubble;
                bubble = document.createElement('div');
                bubble.className = 'agent-msg assistant companion';
                bubble.innerHTML = '<span class="msg-role">Companion</span><div class="msg-body"></div>';
                if (thread) thread.appendChild(bubble);
                return bubble;
            }
            var self = this;
            function pump() {
                return reader.read().then(function (result) {
                    if (result.done) return { message: acc };
                    buffer += decoder.decode(result.value, { stream: true });
                    var parts = buffer.split('\n\n');
                    buffer = parts.pop() || '';
                    parts.forEach(function (chunk) {
                        var line = chunk.trim();
                        if (line.indexOf('data:') !== 0) return;
                        try {
                            var json = JSON.parse(line.slice(5).trim());
                            if (json.delta) {
                                acc += json.delta;
                                var body = ensureBubble().querySelector('.msg-body');
                                if (body) body.innerHTML = self.formatMessage(acc);
                                var pane = $('agent-body');
                                if (pane) pane.scrollTop = pane.scrollHeight;
                            }
                            if (json.done && json.message) acc = json.message;
                        } catch (e) { /* ignore incomplete event */ }
                    });
                    return pump();
                });
            }
            return pump().then(function (out) {
                if (bubble) bubble.setAttribute('data-text', out.message || acc);
                return { type: 'assistant_message', message: out.message || acc };
            });
        },

        routeSend: function (text) {
            var raw = String(text || '').trim();
            if (!raw || this.sendLock) return;
            this.lastUserPrompt = raw;
            this.flushCurrent();
            if (this.contextEngine) this.contextEngine.parseMentions(raw, this.workspace);
            this.parseMentions(raw);
            var classified = intentApi.classify(raw, {
                surface: this.aiSurface,
                hasProposal: !!(this.companion && this.companion.lastProposal)
            });
            if (raw.charAt(0) === '/') {
                var parts = raw.split(/\s+/);
                var cmd = parts.shift().slice(1).toLowerCase();
                var rest = parts.join(' ');
                if (cmd === 'explain' || cmd === 'review') {
                    classified = { surface: 'companion', launchTools: false, reason: 'slash' };
                    raw = (cmd === 'review' ? 'Review ' : 'Explain ') + (rest || 'the current file');
                } else if (cmd === 'fix' || cmd === 'build' || cmd === 'test') {
                    classified = { surface: 'agent', launchTools: true, reason: 'slash' };
                    raw = rest || (cmd === 'build' ? 'Build a complete, runnable frontend for this request' : cmd === 'test' ? 'Run validation and fix real failures only' : 'Fix problems in the current file');
                } else if (cmd === 'preview') {
                    this.showPreview(true);
                    return;
                } else if (cmd === 'changes') {
                    this.showExplorer('changes');
                    return;
                } else if (cmd === 'revert') {
                    this.revertTask();
                    return;
                }
            }
            if (classified.handoff && this.companion && this.companion.lastProposal) {
                this.setAiSurface('agent');
                this.sendAgent(raw, { handoff: this.companion.buildHandoff(raw) });
                return;
            }
            if (classified.surface === 'companion' || classified.reason === 'greeting') {
                this.setAiSurface('companion', { silent: true });
                this.sendCompanion(raw);
                return;
            }
            this.setAiSurface('agent');
            this.sendAgent(raw);
        },

        sendCompanion: function (text) {
            var self = this;
            if (!this.companion || !this.companion.ask) {
                this.appendCompanionMessage(text, 'user');
                this.appendCompanionMessage('Companion is unavailable in this session.', 'error');
                return;
            }
            if (intentApi.isGreeting && intentApi.isGreeting(text) && this.companion.localGreeting && !this.companion.conversation.length) {
                this.appendCompanionMessage(text, 'user');
                var greet = this.companion.localGreeting();
                this.companion.conversation.push({ role: 'user', content: text });
                this.companion.conversation.push({ role: 'assistant', content: greet });
                this.appendCompanionMessage(greet, 'assistant');
                this.companion.saveMemory();
                return;
            }
            this.sendLock = true;
            $('btn-stop').hidden = false;
            var ctx = this.buildProjectContext({ selection: this.getSelection() });
            this.companion.ask(text, { context: ctx.text }).then(function () {
                self.sendLock = false;
                $('btn-stop').hidden = true;
            }).catch(function () {
                self.sendLock = false;
                $('btn-stop').hidden = true;
            });
        },

        sendAgent: function (text, extras) {
            var self = this;
            var raw = String(text || '').trim();
            if (!raw) return;
            extras = extras || {};
            if (this.agent && this.agent.isLive && this.agent.isLive()) {
                this.appendMessage('Agent is already working. Stop the current task first.', 'error');
                return;
            }
            this.appendMessage(raw, 'user');
            this.flushCurrent();
            var cp = this.workspace.checkpoint(raw.slice(0, 80));
            if (cp.ok) this.lastCheckpointId = cp.checkpoint.id;
            $('btn-stop').hidden = false;
            this.workspace.beginChangeset(raw.slice(0, 120));
            this.sendLock = true;
            var sel = this.getSelectionMeta();
            var runExtras = {
                selection: sel && sel.text,
                related: this.relatedFiles(),
                handoff: extras.handoff || null
            };
            this.parseMentions(raw);
            this.agent.setMode('agent');
            this.agent.run(raw, runExtras).then(function (result) {
                self.sendLock = false;
                self.persist();
                self.renderAll();
                self.refreshProblems();
                if (result && result.paused) return;
                if (result && result.ok === false && result.error) {
                    self.appendMessage(result.error, 'error');
                }
            }).catch(function (err) {
                self.sendLock = false;
                self.appendMessage(err.message || 'Agent failed.', 'error');
            });
        },

        relatedFiles: function () {
            var cur = this.currentPath();
            return this.workspace.listPaths().map(function (f) { return f.path; }).filter(function (p) {
                if (p === cur) return false;
                return /\.(html|css|js)$/i.test(p);
            }).slice(0, 3);
        },

        parseMentions: function (text) {
            var self = this;
            var re = /@([A-Za-z0-9._@+\-\/]+)/g;
            var m;
            while ((m = re.exec(text))) {
                var n = security.normalizeProjectPath(m[1]);
                if (n.ok && self.workspace.findByPath(n.path)) {
                    if (self.contextEngine) self.contextEngine.pinFile(n.path);
                    if (!self.agent.contextPins.some(function (p) { return p.path === n.path; })) {
                        self.agent.contextPins.push({ path: n.path });
                    }
                }
            }
            this.updateContextChips();
        },

        onAgentDone: function (parsed) {
            this.sendLock = false;
            $('btn-stop').hidden = true;
            $('agent-recovery').hidden = true;
            var cs = this.workspace.finishChangeset(this.testResults.length ? { results: this.testResults } : null);
            this.renderChanges();
            var created = cs ? cs.created.length : 0;
            var modified = cs ? cs.modified.length : 0;
            var deleted = cs ? cs.deleted.length : 0;
            if (cs) this.writeOutput('Changeset ' + cs.id + ': ' + created + ' created, ' + modified + ' changed, ' + deleted + ' deleted.');
            var previewChecked = this.layout.previewOn;
            var previewClean = previewChecked && this.previewErrors.length === 0;
            var problemsNow = this.refreshProblems();
            var errorCount = problemsNow.filter(function (p) { return p.severity === 'error'; }).length;
            this.lastAgentSummary = {
                task: (parsed && parsed.summary) || this.lastUserPrompt || 'Agent task',
                result: 'Completed',
                files: [].concat((cs && cs.created) || [], (cs && cs.modified) || []).map(function (x) { return x.path || x; }),
                validation: {
                    preview: previewChecked ? (previewClean ? 'checked' : 'errors') : 'not checked',
                    problems: errorCount
                }
            };
            var msg = (parsed && parsed.message) || '';
            if (!msg) {
                msg = 'Finished. ' + created + ' file' + (created === 1 ? '' : 's') + ' created, ' +
                    modified + ' changed, ' + deleted + ' deleted. Preview: ' +
                    (previewChecked ? (previewClean ? 'clean' : 'errors remain') : 'not opened') +
                    '. Problems: ' + errorCount + '. You can review the diff or revert the task.';
            }
            this.appendMessage(msg, 'assistant');
            if (this.companion) {
                this.companion.lastProposal = null;
                this.appendCompanionMessage('Agent finished. ' + msg, 'assistant');
            }
            if (this.layout.previewOn) this.schedulePreview();
            this.showChangesetCard(cs);
        },

        showChangesetCard: function (cs) {
            if (!cs) return;
            var thread = $('agent-thread');
            if (!thread) return;
            var card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = '<strong>' + cs.created.length + ' created · ' + cs.modified.length + ' changed · ' + cs.deleted.length + ' deleted</strong>' +
                '<div class="composer-row">' +
                '<button type="button" class="studio-btn" id="card-review">Review changes</button>' +
                '<button type="button" class="studio-btn" id="card-preview">Open preview</button>' +
                '<button type="button" class="studio-btn danger" id="card-revert">Revert task</button>' +
                '</div>';
            thread.appendChild(card);
            var self = this;
            card.querySelector('#card-review').onclick = function () { self.showExplorer('changes'); self.openLastDiff(); };
            card.querySelector('#card-preview').onclick = function () { self.showPreview(true); };
            card.querySelector('#card-revert').onclick = function () { self.revertTask(); };
        },

        openLastDiff: function () {
            var hist = this.workspace.history[0];
            if (!hist) return;
            var path = (hist.modified && hist.modified[0]) || (hist.created && hist.created[0]);
            if (!path) return;
            var file = this.workspace.findByPath(path);
            var snap = this.workspace.checkpoints[0];
            var before = '';
            if (snap) {
                var old = snap.files.filter(function (f) { return (f.path || f.name) === path; })[0];
                before = old ? old.content : '';
            }
            this.openDiffModal(path, before, file ? file.content : '', 'unified');
        },

        onAgentStopped: function () {
            this.sendLock = false;
            this.writeOutput('Agent stopped. Project remains as last applied change.');
            $('btn-stop').hidden = true;
            var cs = this.workspace.activeChangeset;
            var n = cs ? (cs.created.length + cs.modified.length + cs.deleted.length) : 0;
            if (n) this.appendMessage('Stopped. ' + n + ' file operation(s) were already applied. Review, retry, or revert.', 'assistant');
        },

        onAgentPaused: function (reason, extras) {
            this.sendLock = false;
            extras = extras || {};
            var box = $('agent-recovery');
            var copy = $('recovery-copy');
            if (copy) copy.textContent = reason || 'Aegis Agent paused.';
            if (box) box.hidden = false;
            $('btn-stop').hidden = true;
            this.appendMessage(reason || 'Aegis Agent paused.', 'error');
            var cs = this.workspace.activeChangeset;
            if (cs && (cs.created.length + cs.modified.length)) {
                this.appendMessage((cs.created.length + cs.modified.length) + ' file(s) changed before interruption. Review, retry, or revert.', 'assistant');
            }
        },

        showLiveEdit: function (path) {
            var flag = $('live-edit-flag');
            if (flag) {
                flag.hidden = false;
                flag.textContent = path ? ('Aegis editing ' + path + '…') : 'Aegis editing…';
            }
            if (path) {
                var file = this.workspace.findByPath(path);
                if (file) this.switchToFile(file.id);
            }
            var self = this;
            setTimeout(function () { if (flag) flag.hidden = true; }, 1200);
        },

        proposeTool: function (checked) {
            var self = this;
            if (checked.id !== 'project.editFile' && checked.id !== 'project.createFile' && checked.id !== 'project.deleteFile' && checked.id !== 'project.renameFile') {
                return Promise.resolve(self.runTool(checked.id, checked.args));
            }
            return new Promise(function (resolve) {
                self.pendingProposal = checked;
                self.proposalResolver = resolve;
                self.agent.setState('WAITING_APPROVAL');
                self.showDiffForProposal(checked);
                self.appendActionCard(checked);
            });
        },

        appendActionCard: function (checked) {
            var thread = $('agent-thread');
            var card = document.createElement('div');
            card.className = 'action-card';
            card.innerHTML = '<strong>Proposed ' + escapeHtml(checked.id) + '</strong><p>' + escapeHtml(checked.args.path || '') + '</p><button type="button" class="studio-btn primary" data-accept="1">Accept</button> <button type="button" class="studio-btn" data-reject="1">Reject</button>';
            thread.appendChild(card);
            var body = $('agent-body');
            if (body) body.scrollTop = body.scrollHeight;
            card.addEventListener('click', function (e) {
                if (e.target.getAttribute('data-accept')) self.acceptProposal();
                if (e.target.getAttribute('data-reject')) self.rejectProposal();
            });
            $('btn-accept-all').hidden = false;
        },

        showDiffForProposal: function (checked) {
            var path = checked.args.path;
            var before = '';
            var after = '';
            if (checked.id === 'project.createFile') {
                after = checked.args.content || '';
            } else if (checked.id === 'project.deleteFile') {
                var f = this.workspace.findByPath(path);
                before = f ? f.content : '';
            } else if (checked.id === 'project.editFile') {
                var file = this.workspace.findByPath(path);
                before = file ? file.content : '';
                if (checked.args.old_string != null) {
                    var ap = diffApi.applyReplacement(before, checked.args.old_string, checked.args.new_string || '');
                    after = ap.ok ? ap.content : before;
                } else after = checked.args.content || before;
            } else {
                after = before;
            }
            this.openDiffModal(path, before, after);
        },

        openDiffModal: function (path, before, after, mode) {
            var modal = $('diff-modal');
            $('diff-title').textContent = path || 'Diff';
            this.renderDiffBody(before, after, mode || 'unified');
            modal.hidden = false;
            this._diff = { path: path, before: before, after: after };
        },

        renderDiffBody: function (before, after, mode) {
            var hunks = diffApi.diffLines(before, after);
            var body = $('diff-body');
            if (mode === 'split') {
                var left = [], right = [];
                hunks.forEach(function (h) {
                    if (h.type !== 'add') left.push('<div class="' + (h.type === 'remove' ? 'del-line' : '') + '">' + escapeHtml(h.text) + '</div>');
                    if (h.type !== 'remove') right.push('<div class="' + (h.type === 'add' ? 'add-line' : '') + '">' + escapeHtml(h.text) + '</div>');
                });
                body.innerHTML = '<div class="diff-split"><div>' + left.join('') + '</div><div>' + right.join('') + '</div></div>';
            } else {
                body.innerHTML = hunks.map(function (h) {
                    var cls = h.type === 'add' ? 'add-line' : h.type === 'remove' ? 'del-line' : '';
                    var mark = h.type === 'add' ? '+' : h.type === 'remove' ? '-' : ' ';
                    return '<div class="' + cls + '">' + mark + escapeHtml(h.text) + '</div>';
                }).join('');
            }
        },

        acceptProposal: function () {
            if (!this.pendingProposal) return;
            var checked = this.pendingProposal;
            var result = this.runTool(checked.id, checked.args);
            if (this.proposalResolver) this.proposalResolver(result);
            this.pendingProposal = null;
            this.proposalResolver = null;
            $('diff-modal').hidden = true;
            $('btn-accept-all').hidden = true;
            this.markEditedRegion(checked.args.path);
        },

        rejectProposal: function () {
            if (this.proposalResolver) this.proposalResolver({ ok: false, error: 'User rejected the edit', code: 'rejected' });
            this.pendingProposal = null;
            this.proposalResolver = null;
            $('diff-modal').hidden = true;
            $('btn-accept-all').hidden = true;
        },

        markEditedRegion: function (path) {
            if (!this.editor || !window.monaco) return;
            var file = this.workspace.findByPath(path);
            if (!file || file.id !== this.workspace.currentFileId) return;
            this.decorations = this.editor.deltaDecorations(this.decorations, [{
                range: new window.monaco.Range(1, 1, Math.min(8, (file.content || '').split('\n').length), 1),
                options: { isWholeLine: true, className: 'add-line' }
            }]);
            var self = this;
            setTimeout(function () {
                if (self.editor) self.decorations = self.editor.deltaDecorations(self.decorations, []);
            }, 4000);
        },

        runTool: function (id, args) {
            this.flushCurrent();
            var ws = this.workspace;
            var path = args.path;
            if (id === 'project.listFiles') return { ok: true, files: ws.listPaths() };
            if (id === 'project.readFile') return ws.readFile(path, { startLine: args.startLine, endLine: args.endLine });
            if (id === 'project.search') return ws.search(args.query, { namesOnly: args.namesOnly, maxResults: args.maxResults });
            if (id === 'project.createFile') {
                var created = ws.createFile(path, args.content || '');
                if (created.ok) {
                    ws.recordChange('created', path, { after: args.content || '' });
                    this.switchToFile(created.file.id);
                    this.persist();
                    this.renderAll();
                }
                return created;
            }
            if (id === 'project.editFile') {
                var open = ws.findByPath(path);
                if (open && this.editor && open.id === this.workspace.currentFileId) {
                    open.content = this.editor.getValue();
                }
                var edited = ws.editFile(path, args);
                if (edited.ok) {
                    ws.recordChange('modified', path, { before: edited.before, after: edited.after });
                    if (this.models[edited.file.id] && window.monaco) this.models[edited.file.id].setValue(edited.after);
                    else if (this.currentFile() && this.currentFile().id === edited.file.id && this.editor) this.editor.setValue(edited.after);
                    this.persist();
                    this.renderAll();
                    this.markEditedRegion(path);
                }
                return edited;
            }
            if (id === 'project.renameFile') {
                var renamed = ws.renameFile(path, args.newPath);
                if (renamed.ok) { ws.recordChange('modified', args.newPath, { before: path }); this.persist(); this.renderAll(); }
                return renamed;
            }
            if (id === 'project.deleteFile') {
                var deleted = ws.deleteFile(path);
                if (deleted.ok) { ws.recordChange('deleted', path, { before: deleted.file.content }); this.persist(); this.renderAll(); }
                return deleted;
            }
            if (id === 'editor.openFile') {
                var f = ws.findByPath(path);
                if (!f) return { ok: false, error: 'File not found' };
                this.switchToFile(f.id);
                return { ok: true };
            }
            if (id === 'editor.revealRange') {
                var rf = ws.findByPath(path);
                if (!rf) return { ok: false, error: 'File not found' };
                this.switchToFile(rf.id);
                if (this.editor && window.monaco && args.line) {
                    this.editor.revealLineInCenter(args.line);
                    this.editor.setPosition({ lineNumber: args.line, column: args.column || 1 });
                }
                return { ok: true };
            }
            if (id === 'diagnostics.getProblems') return { ok: true, problems: this.refreshProblems() };
            if (id === 'preview.refresh') return this.refreshPreview();
            if (id === 'preview.getErrors') return { ok: true, errors: this.previewErrors.slice() };
            if (id === 'runtime.run') return this.runCode(args.path);
            if (id === 'runtime.getOutput') return { ok: true, output: this.outputLines.slice(-30), console: this.consoleLines.slice(-30) };
            if (id === 'tests.run') return this.runValidation();
            if (id === 'formatter.format') return this.formatDocument(path);
            if (id === 'preview.start') {
                this.showPreview(true);
                return this.refreshPreview();
            }
            if (id === 'preview.inspect') {
                return { ok: true, status: this.previewState, errors: this.previewErrors.slice() };
            }
            if (id === 'changes.createCheckpoint') {
                var cp = this.workspace.checkpoint(args.label || 'Agent checkpoint');
                if (cp.ok) this.lastCheckpointId = cp.checkpoint.id;
                return cp;
            }
            if (id === 'changes.revertCheckpoint') {
                var restored = this.workspace.restoreCheckpoint(args.id || this.lastCheckpointId);
                if (restored.ok) {
                    this.models = {};
                    this.renderAll();
                    if (this.workspace.currentFileId) this.switchToFile(this.workspace.currentFileId);
                }
                return restored;
            }
            return { ok: false, error: 'Unknown tool' };
        },

        /* ---------- Import / export ---------- */
        importFiles: function (list, enter) {
            var self = this;
            var readers = [];
            Array.prototype.forEach.call(list, function (file) {
                if (/\.zip$/i.test(file.name)) {
                    self.importZip(file, enter);
                    return;
                }
                readers.push(new Promise(function (resolve) {
                    var r = new FileReader();
                    r.onload = function () {
                        var path = (file.webkitRelativePath || file.name).replace(/^\/+/, '');
                        var n = security.normalizeProjectPath(path);
                        if (n.ok) self.workspace.createFile(n.path, String(r.result || ''), { saved: true });
                        resolve();
                    };
                    r.readAsText(file);
                }));
            });
            Promise.all(readers).then(function () {
                self.persist();
                if (enter) self.enterStudio();
                else { self.renderAll(); }
            });
        },

        importZip: function (file, enter) {
            var self = this;
            if (typeof JSZip === 'undefined') { this.writeOutput('JSZip is not loaded.'); return; }
            JSZip.loadAsync(file).then(function (zip) {
                var jobs = [];
                zip.forEach(function (rel, entry) {
                    if (entry.dir) return;
                    jobs.push(entry.async('string').then(function (text) {
                        var n = security.normalizeProjectPath(rel);
                        if (n.ok && !security.isSensitivePath(n.path)) self.workspace.createFile(n.path, text, { saved: true });
                    }));
                });
                return Promise.all(jobs);
            }).then(function () {
                self.persist();
                if (enter) self.enterStudio();
                else self.renderAll();
                self.writeOutput('ZIP imported into the browser workspace.');
            }).catch(function () { self.writeOutput('ZIP import failed.'); });
        },

        exportZip: function () {
            if (typeof JSZip === 'undefined') { this.writeOutput('JSZip is not loaded.'); return; }
            this.flushCurrent();
            var zip = new JSZip();
            this.workspace.files.forEach(function (f) {
                if (f.isFolderPlaceholder) return;
                if (security.isSensitivePath(f.path || f.name)) return;
                zip.file(f.path || f.name, f.content || '');
            });
            zip.generateAsync({ type: 'blob' }).then(function (blob) {
                var a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'aegis-code-studio-project.zip';
                a.click();
                URL.revokeObjectURL(a.href);
            });
            this.writeOutput('Exported current project ZIP (sensitive files omitted).');
        },

        downloadCurrent: function () {
            var file = this.currentFile();
            if (!file) return;
            this.flushCurrent();
            var a = document.createElement('a');
            a.href = URL.createObjectURL(new Blob([file.content || ''], { type: 'text/plain' }));
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(a.href);
        },

        /* ---------- Layout ---------- */
        applyLayout: function () {
            var root = $('studio-root');
            var ws = $('studio-workspace');
            ws.style.setProperty('--explorer-w', (this.layout.explorerW || 240) + 'px');
            ws.style.setProperty('--agent-w', (this.layout.agentW || 420) + 'px');
            $('studio-bottom').style.setProperty('--bottom-h', (this.layout.bottomH || 148) + 'px');
            if (this.layout.bottomCollapsed) $('studio-bottom').style.height = '';
            else $('studio-bottom').style.height = (this.layout.bottomH || 148) + 'px';
            root.classList.toggle('is-bottom-collapsed', !!this.layout.bottomCollapsed);
            var collapseBtn = $('btn-toggle-bottom');
            if (collapseBtn) collapseBtn.textContent = this.layout.bottomCollapsed ? 'Expand' : 'Collapse';
            this.showPreview(!!this.layout.previewOn);
            this.applyResponsive();
        },

        applyResponsive: function () {
            var w = window.innerWidth;
            var h = window.innerHeight;
            document.body.classList.toggle('is-narrow', w < 1100);
            document.body.classList.toggle('is-compact', w < 900);
            if (w < 1100) {
                document.body.classList.remove('is-agent-open');
                document.body.classList.remove('is-explorer-open');
            }
            var dock = $('preview-dock');
            var stage = $('editor-stage');
            if (dock && w < 1280) dock.style.removeProperty('width');
            if (dock && stage && !dock.hidden) {
                var minEditor = w < 900 ? Math.min(stage.clientWidth || w, 240) : 280;
                var maxPreview = Math.max(140, (stage.clientWidth || w) - minEditor);
                if (dock.offsetWidth > maxPreview) dock.style.width = maxPreview + 'px';
            }
            if (h < 700 && this.layout && this.layout.bottomH > 140) {
                $('studio-bottom').style.height = '140px';
            }
            if (this.editor) {
                var self = this;
                requestAnimationFrame(function () { try { self.editor.layout(); } catch (e) {} });
            }
        },

        persistLayout: function () {
            setStorage(WS.STORAGE_LAYOUT, this.layout);
        },

        attachResizer: function (el, onMove, onStop) {
            if (!el) return;
            el.addEventListener('pointerdown', function (e) {
                e.preventDefault();
                el.setPointerCapture && el.setPointerCapture(e.pointerId);
                var frame = 0;
                function move(ev) {
                    if (frame) return;
                    frame = requestAnimationFrame(function () {
                        frame = 0;
                        onMove(ev);
                    });
                }
                function stop() {
                    el.removeEventListener('pointermove', move);
                    el.removeEventListener('pointerup', stop);
                    document.body.classList.remove('studio-dragging', 'studio-dragging-row');
                    if (frame) cancelAnimationFrame(frame);
                    if (onStop) onStop();
                }
                el.addEventListener('pointermove', move);
                el.addEventListener('pointerup', stop);
            });
        },

        showBottom: function (name) {
            document.querySelectorAll('[data-bottom]').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-bottom') === name);
            });
            ['output', 'console', 'terminal', 'problems', 'tests', 'agentlog'].forEach(function (id) {
                var pane = $('pane-' + id);
                if (pane) pane.classList.toggle('active', id === name);
            });
        },

        /* ---------- Command palette / quick open ---------- */
        commands: function () {
            var self = this;
            return [
                { id: 'new', label: 'Code Studio: New File', run: function () { self.newFile(); } },
                { id: 'new-project', label: 'Code Studio: New Project', run: function () { self.showWelcome(); } },
                { id: 'open', label: 'Code Studio: Open File', run: function () { $('open-input').click(); } },
                { id: 'save', label: 'Code Studio: Save', run: function () { self.saveCurrent(); } },
                { id: 'run', label: 'Code Studio: Run', run: function () { self.runCode(); } },
                { id: 'format', label: 'Code Studio: Format', run: function () { self.formatDocument(); } },
                { id: 'preview', label: 'Code Studio: Toggle Preview', run: function () { self.showPreview(!self.layout.previewOn); } },
                { id: 'ask', label: 'Code Studio: Companion', run: function () { self.setAiSurface('companion'); } },
                { id: 'agent', label: 'Code Studio: Agent', run: function () { self.setAiSurface('agent'); } },
                { id: 'review', label: 'Code Studio: Review Changes', run: function () { self.renderChanges(); self.showExplorer('changes'); } },
                { id: 'search', label: 'Code Studio: Project Search', run: function () { self.showExplorer('search'); $('project-search').focus(); } },
                { id: 'theme-dark', label: 'Theme: Aegis Dark', run: function () { self.applyTheme('aegis-dark'); } },
                { id: 'theme-light', label: 'Theme: Aegis Light', run: function () { self.applyTheme('aegis-light'); } }
            ];
        },

        showPalette: function (open) {
            var box = $('command-palette');
            box.hidden = !open;
            if (!open) return;
            var list = this.commands();
            $('command-input').value = '';
            this.renderOverlayList($('command-list'), list, 'label');
            $('command-input').focus();
            this._palette = list;
        },

        showQuickOpen: function (open) {
            var box = $('quick-open');
            box.hidden = !open;
            if (!open) return;
            var files = this.workspace.listPaths();
            $('quick-open-input').value = '';
            this.renderOverlayList($('quick-open-list'), files.map(function (f) { return { id: f.path, label: f.path }; }), 'label');
            $('quick-open-input').focus();
            this._quick = files;
        },

        renderOverlayList: function (el, items, key) {
            el.innerHTML = items.slice(0, 40).map(function (item, i) {
                return '<button type="button" class="overlay-item' + (i === 0 ? ' selected' : '') + '" data-id="' + escapeHtml(item.id) + '">' + escapeHtml(item[key] || item.label) + '</button>';
            }).join('');
        },

        showExplorer: function (name) {
            document.querySelectorAll('[data-explorer]').forEach(function (btn) {
                btn.classList.toggle('active', btn.getAttribute('data-explorer') === name);
            });
            ['files', 'search', 'changes'].forEach(function (id) {
                $('explorer-' + id).classList.toggle('active', id === name);
            });
            document.body.classList.add('is-explorer-open');
        },

        newFile: function () {
            var self = this;
            this.dialog({ title: 'New file', body: 'Path inside this project.', field: true, value: 'untitled.js', okLabel: 'Create' }).then(function (name) {
                if (!name) return;
                var created = self.workspace.createFile(name, '');
                if (!created.ok) { self.dialog({ title: 'Could not create', body: created.error }); return; }
                self.switchToFile(created.file.id);
                self.persist();
                self.renderAll();
            });
        },

        newFolder: function () {
            var self = this;
            this.dialog({ title: 'New folder', body: 'Folder name or path.', field: true, value: 'src', okLabel: 'Create' }).then(function (name) {
                if (!name) return;
                self.workspace.createFolder(name);
                self.persist();
                self.renderTree();
            });
        },

        closeTab: function (id) {
            var file = this.workspace.findById(id);
            if (file && file.isDirty) {
                var self = this;
                this.dialog({ title: 'Unsaved changes', body: 'Close ' + (file.path || file.name) + ' without saving?', danger: true, okLabel: 'Close' }).then(function (ok) {
                    if (ok) self.forceClose(id);
                });
                return;
            }
            this.forceClose(id);
        },

        forceClose: function (id) {
            this.workspace.openFileIds = this.workspace.openFileIds.filter(function (x) { return x !== id; });
            if (this.workspace.currentFileId === id) {
                this.workspace.currentFileId = this.workspace.openFileIds[0] || null;
                if (this.workspace.currentFileId) this.switchToFile(this.workspace.currentFileId);
            }
            this.renderTabs();
            this.persist();
        },

        projectSearch: function () {
            var q = $('project-search').value;
            var names = $('search-names').checked;
            var res = this.workspace.search(q, { namesOnly: names });
            var box = $('search-results');
            if (!res.ok) { box.innerHTML = '<div class="fs-note">' + escapeHtml(res.error) + '</div>'; return; }
            box.innerHTML = res.hits.length ? res.hits.map(function (h) {
                return '<div class="search-hit" data-path="' + escapeHtml(h.path) + '" data-line="' + h.line + '"><strong>' + escapeHtml(h.path) + (h.line ? ':' + h.line : '') + '</strong> ' + escapeHtml(h.text) + '</div>';
            }).join('') : '<div class="fs-note">No results.</div>';
        },

        previewReplace: function () {
            var q = $('project-search').value;
            var r = $('project-replace').value;
            if (!q) return;
            var hits = [];
            var self = this;
            this.workspace.files.forEach(function (f) {
                if (f.isFolderPlaceholder || security.isSensitivePath(f.path)) return;
                var count = (f.content || '').split(q).length - 1;
                if (count > 0) hits.push({ path: f.path, count: count, preview: (f.content || '').split(q).join(r).slice(0, 400) });
            });
            this.dialog({
                title: 'Replace across project',
                body: hits.length ? ('Replace in ' + hits.length + ' file(s). This is a bulk change.') : 'No matches.',
                danger: true,
                okLabel: hits.length ? 'Replace' : 'OK'
            }).then(function (ok) {
                if (!ok || !hits.length) return;
                self.workspace.checkpoint('Replace ' + q);
                hits.forEach(function (h) {
                    var f = self.workspace.findByPath(h.path);
                    if (f) self.workspace.setContent(h.path, (f.content || '').split(q).join(r));
                });
                self.persist();
                self.renderAll();
                self.writeOutput('Replaced across ' + hits.length + ' file(s).');
            });
        },

        quickLookFile: function (file) {
            if (!file) return;
            var item = {
                title: file.path || file.name,
                kind: 'Code Studio file',
                meta: (file.language || '') + ' · ' + ((file.content || '').length) + ' chars',
                body: security.isSensitivePath(file.path) ? 'Sensitive file contents are hidden.' : String(file.content || '').slice(0, 4000),
                open: function () { Studio.switchToFile(file.id); }
            };
            try {
                if (window.parent && window.parent !== window && window.parent.AegisQuickLook) {
                    window.parent.AegisQuickLook.show(item);
                    return;
                }
            } catch (e) {}
            this.dialog({ title: item.title, body: item.body.slice(0, 800), okLabel: 'Close' });
        },

        revertTask: function () {
            var self = this;
            this.dialog({ title: 'Revert last Agent task', body: 'Restore the checkpoint taken before the last Agent mutation.', danger: true, okLabel: 'Revert' }).then(function (ok) {
                if (!ok) return;
                var restored = self.workspace.restoreCheckpoint(self.lastCheckpointId);
                if (!restored.ok) { self.writeOutput(restored.error); return; }
                Object.keys(self.models).forEach(function (id) {
                    try { self.models[id].dispose(); } catch (e) {}
                });
                self.models = {};
                self.persist();
                self.renderAll();
                if (self.workspace.currentFileId) self.switchToFile(self.workspace.currentFileId);
                self.writeOutput('Reverted to checkpoint.');
                self.announce('Task reverted');
            });
        },

        handleCompanionAction: function (act, text) {
            var clean = String(text || '');
            if (act === 'copy') {
                if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(clean);
                this.announce('Copied');
                return;
            }
            if (act === 'insert') {
                if (this.editor && this.editor.executeEdits) {
                    var sel = this.editor.getSelection && this.editor.getSelection();
                    if (sel) this.editor.executeEdits('companion-insert', [{ range: sel, text: clean }]);
                }
                return;
            }
            if (act === 'apply') {
                this.applyCompanionSuggestion(clean);
                return;
            }
            if (act === 'agent') {
                this.setAiSurface('agent');
                var handoff = this.companion && this.companion.buildHandoff ? this.companion.buildHandoff(clean) : { companionSummary: clean };
                this.sendAgent('Implement the Companion recommendation.', { handoff: handoff });
                return;
            }
            if (act === 'more') {
                this.sendCompanion('Explain more, with more detail on the tradeoffs.');
            }
        },

        applyCompanionSuggestion: function (text) {
            var file = this.currentFile();
            if (!file) {
                this.dialog({ title: 'Apply suggestion', body: 'Open a file first. Companion will not mutate blindly.' });
                return;
            }
            var match = /```(?:[\w-]+)?\n([\s\S]*?)```/.exec(text);
            var suggestion = match ? match[1] : '';
            if (!suggestion) {
                this.dialog({ title: 'No code suggestion', body: 'That message does not contain a code block to apply safely.' });
                return;
            }
            this.pendingProposal = {
                id: 'project.editFile',
                args: { path: file.path || file.name, content: suggestion },
                permission: 'edit',
                risk: 'write'
            };
            this.showDiffForProposal(this.pendingProposal);
            this.agent.setState('WAITING_PERMISSION');
        },

        openPermissions: function () {
            var modal = $('permissions-modal');
            var list = $('perm-list');
            if (!modal || !list) return;
            var prefs = this.userPermissions || {};
            var rows = [
                { key: 'read', label: 'Read project', options: ['allowed'] },
                { key: 'edit', label: 'Edit project', options: ['ask', 'allowed'] },
                { key: 'create', label: 'Create files', options: ['ask', 'allowed'] },
                { key: 'delete', label: 'Delete files', options: ['always_ask'] },
                { key: 'preview', label: 'Run preview', options: ['allowed', 'ask'] },
                { key: 'tests', label: 'Run tests', options: ['allowed', 'ask'] },
                { key: 'network', label: 'Network actions', options: ['denied'] }
            ];
            list.innerHTML = rows.map(function (row) {
                var current = prefs[row.key] || row.options[0];
                var opts = row.options.map(function (opt) {
                    return '<option value="' + opt + '"' + (opt === current ? ' selected' : '') + '>' + opt.replace(/_/g, ' ') + '</option>';
                }).join('');
                return '<label class="perm-row"><span>' + escapeHtml(row.label) + '</span><select data-perm="' + row.key + '"' + (row.options.length === 1 ? ' disabled' : '') + '>' + opts + '</select></label>';
            }).join('');
            modal.hidden = false;
        },

        savePermissions: function () {
            var prefs = {};
            document.querySelectorAll('#perm-list [data-perm]').forEach(function (sel) {
                prefs[sel.getAttribute('data-perm')] = sel.value;
            });
            this.userPermissions = security.normalizeUserPermissions
                ? security.normalizeUserPermissions(prefs)
                : prefs;
            setStorage(STORAGE_PERMISSIONS, this.userPermissions);
            if (this.agent && this.agent.setPermissions) this.agent.setPermissions(this.userPermissions);
            $('permissions-modal').hidden = true;
            this.writeOutput('Agent permissions saved. High-risk deletes still always ask. There is no unrestricted mode.');
        },

        /* ---------- Bindings ---------- */
        bindStudio: function () {
            var self = this;
            $('btn-new').onclick = function () { self.newFile(); };
            $('btn-new-file').onclick = function () { self.newFile(); };
            $('btn-new-folder').onclick = function () { self.newFolder(); };
            $('btn-open').onclick = function () { $('open-input').click(); };
            $('btn-upload').onclick = function () { $('upload-input').click(); };
            $('btn-import-zip').onclick = function () { $('zip-input').click(); };
            $('btn-save').onclick = function () { self.saveCurrent(); };
            $('btn-saveas').onclick = function () {
                self.dialog({ title: 'Save as', body: 'New path', field: true, value: self.currentPath() || 'file.txt' }).then(function (name) {
                    if (!name) return;
                    var created = self.workspace.createFile(name, self.editor ? self.editor.getValue() : '');
                    if (created.ok) self.switchToFile(created.file.id);
                    self.persist();
                });
            };
            $('btn-download').onclick = function () { self.downloadCurrent(); };
            $('btn-export').onclick = function () { self.exportZip(); };
            $('btn-run').onclick = function () { self.runCode(); };
            $('btn-format').onclick = function () { self.formatDocument(); };
            $('btn-preview').onclick = function () { self.showPreview(!self.layout.previewOn); };
            $('preview-refresh').onclick = function () { self.refreshPreview(); };
            $('preview-hide').onclick = function () { self.showPreview(false); };
            $('preview-larger').onclick = function () {
                $('preview-large').hidden = false;
                $('preview-large-frame').srcdoc = $('preview-frame').srcdoc || '';
            };
            $('preview-large-close').onclick = function () { $('preview-large').hidden = true; };
            document.querySelectorAll('[data-device]').forEach(function (btn) {
                btn.onclick = function () {
                    document.querySelectorAll('[data-device]').forEach(function (b) { b.classList.remove('active'); });
                    btn.classList.add('active');
                    $('preview-frame-wrap').setAttribute('data-device', btn.getAttribute('data-device'));
                };
            });
            $('btn-home').onclick = function () { self.showWelcome(); };
            $('btn-theme').onclick = function () {
                self.applyTheme(self.layout.theme === 'aegis-light' ? 'aegis-dark' : 'aegis-light');
            };
            $('btn-permissions').onclick = function () { self.openPermissions(); };
            $('studio-autonomy').onchange = function () { self.agent.setAutonomy(this.value); };
            document.querySelectorAll('.surface-switch [data-surface]').forEach(function (btn) {
                btn.onclick = function (e) {
                    e.stopPropagation();
                    self.setAiSurface(btn.getAttribute('data-surface'));
                };
            });
            $('btn-send').onclick = function () {
                var text = $('agent-input').value.trim();
                if (!text || self.sendLock) return;
                $('agent-input').value = '';
                self.routeSend(text);
            };
            $('agent-input').addEventListener('keydown', function (e) {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    $('btn-send').click();
                }
                if (e.key === '@') self.showMentions();
            });
            $('btn-stop').onclick = function () {
                if (self.companion) self.companion.stop();
                self.agent.stop();
                self.sendLock = false;
            };
            if ($('btn-new-chat')) {
                $('btn-new-chat').onclick = function () {
                    if (self.companion) self.companion.reset();
                    self.appendCompanionMessage("New conversation. What should we look at?", 'assistant');
                };
            }
            ['recovery-retry', 'recovery-companion', 'recovery-cancel'].forEach(function (id) {
                if (!$(id)) return;
                $(id).onclick = function () {
                    $('agent-recovery').hidden = true;
                    if (id === 'recovery-retry' && self.lastUserPrompt) self.sendAgent(self.lastUserPrompt);
                    else if (id === 'recovery-companion') self.setAiSurface('companion');
                    else self.agent.setState('CANCELLED');
                };
            });
            if ($('empty-build')) {
                $('empty-build').onclick = function () {
                    var prompt = $('empty-prompt').value.trim();
                    self.setAiSurface('agent');
                    self.routeSend(prompt || 'Create a simple responsive landing page.');
                };
                $('empty-new-file').onclick = function () { self.newFile(); };
                $('empty-import').onclick = function () { $('open-input').click(); };
            }
            if ($('perm-close')) $('perm-close').onclick = function () { $('permissions-modal').hidden = true; };
            if ($('perm-cancel')) $('perm-cancel').onclick = function () { $('permissions-modal').hidden = true; };
            if ($('perm-save')) $('perm-save').onclick = function () { self.savePermissions(); };
            if ($('companion-thread')) {
                $('companion-thread').addEventListener('click', function (e) {
                    var act = e.target.getAttribute('data-act');
                    if (!act) return;
                    var msg = e.target.closest('.agent-msg');
                    var text = msg ? msg.getAttribute('data-text') : '';
                    self.handleCompanionAction(act, text);
                });
            }
            if ($('btn-layout-preview-focus')) {
                $('btn-layout-preview-focus').onclick = function () {
                    self.showPreview(true);
                    $('studio-workspace').classList.add('is-explorer-collapsed');
                    $('studio-workspace').classList.add('is-agent-collapsed');
                };
            }
            $('btn-search').onclick = function () { self.projectSearch(); };
            $('btn-replace-preview').onclick = function () { self.previewReplace(); };
            $('btn-revert-task').onclick = function () { self.revertTask(); };
            $('btn-review-changes').onclick = function () {
                var last = self.workspace.history[0];
                if (!last) { self.writeOutput('No changeset to review.'); return; }
                self.showExplorer('changes');
            };
            $('btn-accept-all').onclick = function () { self.acceptProposal(); };
            $('diff-close').onclick = function () { $('diff-modal').hidden = true; };
            $('diff-accept').onclick = function () { self.acceptProposal(); };
            $('diff-reject').onclick = function () { self.rejectProposal(); };
            $('diff-unified').onclick = function () { if (self._diff) self.renderDiffBody(self._diff.before, self._diff.after, 'unified'); };
            $('diff-split').onclick = function () { if (self._diff) self.renderDiffBody(self._diff.before, self._diff.after, 'split'); };
            $('btn-run-tests').onclick = function () { self.showBottom('tests'); self.runValidation(); };
            $('console-clear').onclick = function () { self.consoleLines = []; self.renderConsole(); };
            $('console-errors').onchange = function () { self.renderConsole(); };
            $('btn-toggle-bottom').onclick = function () {
                self.layout.bottomCollapsed = !self.layout.bottomCollapsed;
                $('studio-root').classList.toggle('is-bottom-collapsed', self.layout.bottomCollapsed);
                $('btn-toggle-bottom').textContent = self.layout.bottomCollapsed ? 'Expand' : 'Collapse';
                self.persistLayout();
                if (self.editor) try { self.editor.layout(); } catch (e) {}
            };
            $('btn-toggle-explorer').onclick = function () {
                document.body.classList.toggle('is-explorer-open');
                $('studio-workspace').classList.toggle('is-explorer-collapsed');
                var on = !$('studio-workspace').classList.contains('is-explorer-collapsed') || document.body.classList.contains('is-explorer-open');
                $('btn-toggle-explorer').setAttribute('aria-pressed', on ? 'true' : 'false');
                if (self.editor) try { self.editor.layout(); } catch (e) {}
            };
            if ($('btn-toggle-companion')) $('btn-toggle-companion').onclick = function () { self.setAiSurface('companion'); };
            if ($('btn-toggle-agent')) $('btn-toggle-agent').onclick = function () { self.setAiSurface('agent'); };
            $('btn-more').onclick = function (e) {
                e.preventDefault();
                e.stopPropagation();
                var menu = $('more-menu');
                var willOpen = menu.hidden;
                menu.hidden = !willOpen;
                $('btn-more').setAttribute('aria-expanded', willOpen ? 'true' : 'false');
            };
            document.addEventListener('click', function (e) {
                if (e.target.closest('#btn-more') || e.target.closest('#more-menu')) return;
                $('more-menu').hidden = true;
                $('btn-more').setAttribute('aria-expanded', 'false');
            });
            $('more-menu').addEventListener('click', function () {
                $('more-menu').hidden = true;
                $('btn-more').setAttribute('aria-expanded', 'false');
            });

            $('file-tree').addEventListener('click', function (e) {
                var item = e.target.closest('[data-id]');
                if (item) self.switchToFile(item.getAttribute('data-id'));
            });
            $('file-tree').addEventListener('keydown', function (e) {
                if (e.key === ' ' || e.key === 'Spacebar') {
                    e.preventDefault();
                    var file = self.currentFile();
                    self.quickLookFile(file);
                }
            });
            $('file-tree').addEventListener('contextmenu', function (e) {
                var item = e.target.closest('[data-id]');
                if (!item) return;
                e.preventDefault();
                var file = self.workspace.findById(item.getAttribute('data-id'));
                if (!file) return;
                self.dialog({ title: file.name, body: 'Rename, duplicate, or delete this file.', okLabel: 'Rename', field: true, value: file.path }).then(function (val) {
                    if (val && val !== file.path) {
                        self.workspace.renameFile(file.path, val);
                        self.persist();
                        self.renderAll();
                    }
                });
            });
            $('editor-tabs').addEventListener('click', function (e) {
                var close = e.target.closest('[data-close]');
                var tab = e.target.closest('[data-id]');
                if (close) { e.stopPropagation(); self.closeTab(close.getAttribute('data-close')); }
                else if (tab) self.switchToFile(tab.getAttribute('data-id'));
            });
            $('search-results').addEventListener('click', function (e) {
                var hit = e.target.closest('[data-path]');
                if (!hit) return;
                var f = self.workspace.findByPath(hit.getAttribute('data-path'));
                if (f) {
                    self.switchToFile(f.id);
                    if (self.editor && window.monaco && Number(hit.getAttribute('data-line'))) {
                        self.editor.revealLineInCenter(Number(hit.getAttribute('data-line')));
                    }
                }
            });
            $('problems-list').addEventListener('click', function (e) {
                var fix = e.target.closest('[data-fix]');
                var explain = e.target.closest('[data-explain]');
                var item = e.target.closest('[data-file]');
                if (fix || explain) {
                    var idx = Number((fix || explain).getAttribute(fix ? 'data-fix' : 'data-explain'));
                    var p = self.problems[idx];
                    if (!p) return;
                    var payload = p.file + ':' + p.line + ' ' + p.message;
                    if (explain) {
                        self.setAiSurface('companion');
                        self.sendCompanion('Explain this problem and what you would change:\n' + payload);
                    } else {
                        self.setAiSurface('agent');
                        self.sendAgent('Fix this problem only, without unrelated rewrites:\n' + payload);
                    }
                    return;
                }
                if (item) {
                    var f = self.workspace.findByPath(item.getAttribute('data-file'));
                    if (f) self.switchToFile(f.id);
                }
            });
            document.querySelectorAll('[data-explorer]').forEach(function (btn) {
                btn.onclick = function () { self.showExplorer(btn.getAttribute('data-explorer')); };
            });
            document.querySelectorAll('[data-bottom]').forEach(function (btn) {
                btn.onclick = function () { self.showBottom(btn.getAttribute('data-bottom')); };
            });
            $('open-input').onchange = $('upload-input').onchange = function () {
                if (this.files) self.importFiles(this.files, false);
                this.value = '';
            };
            $('zip-input').onchange = function () {
                if (this.files && this.files[0]) self.importZip(this.files[0], false);
                this.value = '';
            };
            $('context-chips').addEventListener('click', function (e) {
                var unpin = e.target.getAttribute('data-unpin');
                if (!unpin) return;
                if (unpin === 'selection' && self.contextEngine) self.contextEngine.clearSelection();
                else if (self.contextEngine) self.contextEngine.unpinFile(unpin);
                self.agent.contextPins = self.agent.contextPins.filter(function (p) { return p.path !== unpin; });
                self.updateContextChips();
            });
            $('console-list').addEventListener('click', function (e) {
                var explain = e.target.closest('[data-explain-console]');
                var fix = e.target.closest('[data-fix-console]');
                if (!explain && !fix) return;
                var idx = Number((explain || fix).getAttribute(explain ? 'data-explain-console' : 'data-fix-console'));
                var line = self.consoleLines[idx];
                if (!line) return;
                if (explain) {
                    self.setAiSurface('companion');
                    self.sendCompanion('Explain this console error:\n' + line.text);
                } else {
                    self.setAiSurface('agent');
                    self.sendAgent('Fix this console/preview error only:\n' + line.text);
                }
            });
            document.querySelectorAll('#inline-ai [data-inline]').forEach(function (btn) {
                btn.onclick = function () {
                    var act = btn.getAttribute('data-inline');
                    var sel = self.getSelection();
                    if (act === 'explain') {
                        self.setAiSurface('companion');
                        self.sendCompanion('Explain the selected code:\n' + sel);
                    } else {
                        self.setAiSurface('agent');
                        self.sendAgent(act + ' the selected code:\n' + sel);
                    }
                };
            });

            this.attachResizer($('resizer-explorer'), function (ev) {
                document.body.classList.add('studio-dragging');
                self.layout.explorerW = Math.max(160, Math.min(420, ev.clientX));
                $('studio-workspace').style.setProperty('--explorer-w', self.layout.explorerW + 'px');
                if (self.editor) self.editor.layout();
            }, function () { self.persistLayout(); });
            this.attachResizer($('resizer-agent'), function (ev) {
                document.body.classList.add('studio-dragging');
                var right = window.innerWidth - ev.clientX;
                self.layout.agentW = Math.max(280, Math.min(520, right));
                $('studio-workspace').style.setProperty('--agent-w', self.layout.agentW + 'px');
                if (self.editor) self.editor.layout();
            }, function () { self.persistLayout(); });
            this.attachResizer($('resizer-preview'), function (ev) {
                document.body.classList.add('studio-dragging');
                var dock = $('preview-dock');
                var w = Math.max(220, window.innerWidth - ev.clientX - (self.layout.agentW || 360));
                dock.style.width = w + 'px';
            }, function () { self.persistLayout(); });
            this.attachResizer($('resizer-bottom'), function (ev) {
                document.body.classList.add('studio-dragging-row');
                var h = Math.max(80, window.innerHeight - ev.clientY - 28);
                self.layout.bottomH = Math.min(window.innerHeight * 0.5, h);
                $('studio-bottom').style.height = self.layout.bottomH + 'px';
                if (self.editor) self.editor.layout();
            }, function () { self.persistLayout(); });

            var explorer = $('studio-explorer');
            explorer.addEventListener('dragover', function (e) { e.preventDefault(); });
            explorer.addEventListener('drop', function (e) {
                e.preventDefault();
                if (e.dataTransfer.files && e.dataTransfer.files.length) self.importFiles(e.dataTransfer.files, false);
            });

            window.addEventListener('resize', function () { self.applyResponsive(); if (self.editor) self.editor.layout(); });
            window.addEventListener('message', function (e) {
                if (!e.data) return;
                if (e.data.source === 'studio-preview') {
                    var type = e.data.type || 'log';
                    self.pushConsole(type, e.data.args || [], { line: e.data.line, file: e.data.file });
                    if (type === 'error') {
                        self.previewErrors.push({ message: (e.data.args || []).join(' '), line: e.data.line, file: e.data.file });
                        self.setPreviewState('error');
                    }
                }
                if (e.data.source === 'aegis-desktop' && e.data.command) {
                    if (e.origin !== window.location.origin) return;
                    self.handleDesktopCommand(e.data.command);
                }
            });

            var term = $('terminal-input');
            term.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    self.runTerminal(term.value);
                    term.value = '';
                }
            });

            $('command-input').addEventListener('input', function () {
                var q = this.value.toLowerCase();
                var list = self.commands().filter(function (c) { return c.label.toLowerCase().indexOf(q) >= 0; });
                self._palette = list;
                self.renderOverlayList($('command-list'), list, 'label');
            });
            $('command-input').addEventListener('keydown', function (e) {
                if (e.key === 'Escape') self.showPalette(false);
                if (e.key === 'Enter' && self._palette && self._palette[0]) {
                    self._palette[0].run();
                    self.showPalette(false);
                }
            });
            $('command-list').addEventListener('click', function (e) {
                var item = e.target.closest('[data-id]');
                if (!item) return;
                var cmd = self.commands().filter(function (c) { return c.id === item.getAttribute('data-id'); })[0];
                if (cmd) cmd.run();
                self.showPalette(false);
            });
            $('quick-open-input').addEventListener('input', function () {
                var q = this.value.toLowerCase();
                var files = self.workspace.listPaths().filter(function (f) { return f.path.toLowerCase().indexOf(q) >= 0; });
                self._quick = files;
                self.renderOverlayList($('quick-open-list'), files.map(function (f) { return { id: f.path, label: f.path }; }), 'label');
            });
            $('quick-open-input').addEventListener('keydown', function (e) {
                if (e.key === 'Escape') self.showQuickOpen(false);
                if (e.key === 'Enter' && self._quick && self._quick[0]) {
                    var f = self.workspace.findByPath(self._quick[0].path);
                    if (f) self.switchToFile(f.id);
                    self.showQuickOpen(false);
                }
            });
            $('quick-open-list').addEventListener('click', function (e) {
                var item = e.target.closest('[data-id]');
                if (!item) return;
                var f = self.workspace.findByPath(item.getAttribute('data-id'));
                if (f) self.switchToFile(f.id);
                self.showQuickOpen(false);
            });

            $('find-close').onclick = function () { $('find-wrap').hidden = true; };
            $('find-next').onclick = function () { self.findNext(1); };
            $('find-prev').onclick = function () { self.findNext(-1); };
            $('find-replace').onclick = function () {
                if (!self.editor) return;
                var sel = self.editor.getSelection();
                if (sel) self.editor.executeEdits('replace', [{ range: sel, text: $('replace-input').value }]);
            };
        },

        showMentions: function () {
            var menu = $('mention-menu');
            var files = this.workspace.listPaths().slice(0, 12);
            menu.hidden = false;
            menu.innerHTML = files.map(function (f) {
                return '<button type="button" data-path="' + escapeHtml(f.path) + '">@' + escapeHtml(f.path) + '</button>';
            }).join('');
            var self = this;
            menu.onclick = function (e) {
                var b = e.target.closest('[data-path]');
                if (!b) return;
                var p = b.getAttribute('data-path');
                $('agent-input').value += p + ' ';
                if (self.contextEngine && !self.contextEngine.pins.some(function (x) { return x === p; })) self.contextEngine.pinFile(p);
                if (!self.agent.contextPins.some(function (x) { return x.path === p; })) self.agent.contextPins.push({ path: p });
                self.updateContextChips();
                menu.hidden = true;
            };
        },

        findNext: function (dir) {
            if (!this.editor || !this.editor.getModel) return;
            var model = this.editor.getModel();
            var q = $('find-input').value;
            if (!model || !q) return;
            var match = dir < 0 ? model.findPreviousMatch(q, this.editor.getPosition(), false, false, null, true)
                : model.findNextMatch(q, this.editor.getPosition(), false, false, null, true);
            if (match) this.editor.setSelection(match.range);
        },

        runTerminal: function (cmd) {
            cmd = String(cmd || '').trim();
            var out = $('terminal-output');
            function line(t) { var d = document.createElement('div'); d.textContent = t; out.appendChild(d); out.scrollTop = out.scrollHeight; }
            line('project $ ' + cmd);
            var lower = cmd.toLowerCase();
            if (lower === 'help') line('help, ls, pwd, clear, run — simulated. Not a host shell.');
            else if (lower === 'clear') out.innerHTML = '';
            else if (lower === 'pwd') line('/project');
            else if (lower === 'ls' || lower === 'dir') this.workspace.listPaths().forEach(function (f) { line(f.path); });
            else if (lower === 'run') this.runCode();
            else line('Unknown command. Try help.');
        },

        handleDesktopCommand: function (cmd) {
            var map = {
                newProject: function () { Studio.showWelcome(); },
                openFile: function () { $('open-input').click(); },
                run: function () { Studio.runCode(); },
                format: function () { Studio.formatDocument(); },
                togglePreview: function () { Studio.showPreview(!Studio.layout.previewOn); },
                askAegis: function () { Studio.setAiSurface('companion'); },
                reviewChanges: function () { Studio.showExplorer('changes'); }
            };
            if ($('studio-root').hidden) this.enterStudio();
            if (map[cmd]) map[cmd]();
        },

        bindGlobal: function () {
            var self = this;
            document.addEventListener('keydown', function (e) {
                var meta = e.metaKey || e.ctrlKey;
                if (e.key === 'Escape') {
                    $('command-palette').hidden = true;
                    $('quick-open').hidden = true;
                    $('diff-modal').hidden = true;
                    $('studio-dialog').hidden = true;
                    $('find-wrap').hidden = true;
                    $('mention-menu').hidden = true;
                    $('preview-large').hidden = true;
                    if ($('permissions-modal')) $('permissions-modal').hidden = true;
                    return;
                }
                if (meta && e.shiftKey && (e.key === 'P' || e.key === 'p')) { e.preventDefault(); self.showPalette(true); return; }
                if (meta && e.shiftKey && (e.key === 'F' || e.key === 'f')) {
                    e.preventDefault();
                    if ($('studio-root').hidden) return;
                    self.showExplorer('search');
                    $('project-search').focus();
                    return;
                }
                if (meta && (e.key === 'p' || e.key === 'P') && !e.shiftKey) { e.preventDefault(); self.showQuickOpen(true); return; }
                if (meta && (e.key === 's' || e.key === 'S')) { e.preventDefault(); self.saveCurrent(); return; }
                if (meta && (e.key === 'f' || e.key === 'F') && !e.shiftKey) {
                    e.preventDefault();
                    $('find-wrap').hidden = false;
                    $('find-input').focus();
                    return;
                }
                if (meta && e.key === 'Enter') { e.preventDefault(); self.runCode(); return; }
                if (meta && (e.key === 'i' || e.key === 'I') && !e.shiftKey) {
                    e.preventDefault();
                    self.setAiSurface('agent');
                    return;
                }
                if (meta && e.shiftKey && (e.key === 'a' || e.key === 'A')) {
                    e.preventDefault();
                    self.setAiSurface('companion');
                }
            });
        }
    };

    window.AegisCodeStudio = Studio;
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { Studio.init(); });
    else Studio.init();
})();
