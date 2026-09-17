/**
 * Aegis Code Studio — in-browser project model.
 * Files live in this workspace only. Not the host disk. Not AegisDesk source.
 */
(function (root) {
    'use strict';
    var security = (root.AegisStudio && root.AegisStudio.security) || {};
    var diffApi = (root.AegisStudio && root.AegisStudio.diff) || {};
    root.AegisStudio = root.AegisStudio || {};

    var STORAGE_FILES = 'codeEditorIdeFiles';
    var STORAGE_OPEN = 'codeEditorIdeOpenIds';
    var STORAGE_META = 'codeStudioProjectMeta';
    var STORAGE_LAYOUT = 'codeStudioLayout';
    var STORAGE_HISTORY = 'codeStudioTaskHistory';
    var STORAGE_PERMISSIONS = 'codeStudioPermissions';
    var STORAGE_COMPANION = 'codeStudioCompanionMemory';
    var IDB_NAME = 'CodeEditorIDB';
    var IDB_STORE = 'project';
    var MAX_CHECKPOINTS = 5;
    var MAX_HISTORY = 20;
    var MAX_CHECKPOINT_CHARS = 1800000;

    function uid(prefix) {
        return (prefix || 'id') + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8);
    }

    function cloneFiles(files) {
        return (files || []).map(function (f) {
            return {
                id: f.id,
                name: f.name,
                path: f.path,
                content: f.content,
                language: f.language,
                isDirty: !!f.isDirty,
                isFolderPlaceholder: !!f.isFolderPlaceholder,
                revision: f.revision || 1
            };
        });
    }

    function detectLanguage(name) {
        var ext = String(name || '').split('.').pop().toLowerCase();
        var map = {
            js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
            ts: 'typescript', tsx: 'typescript', py: 'python', html: 'html', htm: 'html',
            css: 'css', json: 'json', md: 'markdown', txt: 'plaintext', svg: 'xml',
            xml: 'xml', yaml: 'yaml', yml: 'yaml', csv: 'plaintext'
        };
        return map[ext] || 'plaintext';
    }

    function basename(path) {
        var p = String(path || '');
        var i = p.lastIndexOf('/');
        return i >= 0 ? p.slice(i + 1) : p;
    }

    function dirname(path) {
        var p = String(path || '');
        var i = p.lastIndexOf('/');
        return i >= 0 ? p.slice(0, i) : '';
    }

    function ProjectWorkspace(options) {
        options = options || {};
        this.files = [];
        this.openFileIds = [];
        this.currentFileId = null;
        this.name = 'Untitled project';
        this.checkpoints = [];
        this.history = [];
        this.activeChangeset = null;
        this.pendingProposals = [];
        this.listeners = [];
        this.storage = options.storage || null;
    }

    ProjectWorkspace.prototype.on = function (fn) {
        this.listeners.push(fn);
    };

    ProjectWorkspace.prototype.emit = function (type, detail) {
        var i;
        for (i = 0; i < this.listeners.length; i++) {
            try { this.listeners[i](type, detail || {}); } catch (e) { /* ignore */ }
        }
    };

    ProjectWorkspace.prototype.findByPath = function (path) {
        var n = security.normalizeProjectPath(path);
        if (!n.ok) return null;
        var i;
        for (i = 0; i < this.files.length; i++) {
            if ((this.files[i].path || this.files[i].name) === n.path) return this.files[i];
        }
        return null;
    };

    ProjectWorkspace.prototype.findById = function (id) {
        var i;
        for (i = 0; i < this.files.length; i++) {
            if (this.files[i].id === id) return this.files[i];
        }
        return null;
    };

    ProjectWorkspace.prototype.listPaths = function () {
        return this.files.filter(function (f) { return !f.isFolderPlaceholder; }).map(function (f) {
            return {
                path: f.path || f.name,
                language: f.language,
                bytes: (f.content || '').length,
                revision: f.revision || 1,
                sensitive: security.isSensitivePath(f.path || f.name)
            };
        });
    };

    ProjectWorkspace.prototype.readFile = function (path, opts) {
        opts = opts || {};
        var file = this.findByPath(path);
        if (!file || file.isFolderPlaceholder) return { ok: false, error: 'File not found', code: 'unknown_path' };
        var rec = {
            path: file.path || file.name,
            language: file.language,
            revision: file.revision || 1,
            dirty: !!file.isDirty,
            sensitive: security.isSensitivePath(file.path || file.name)
        };
        if (rec.sensitive && !opts.allowSensitive) {
            rec.omitted = true;
            rec.reason = 'Sensitive file contents are excluded from automatic AI context.';
            return { ok: true, file: rec };
        }
        var content = file.content || '';
        if (opts.startLine || opts.endLine) {
            var lines = content.split('\n');
            var start = Math.max(1, opts.startLine || 1);
            var end = Math.min(lines.length, opts.endLine || lines.length);
            content = lines.slice(start - 1, end).join('\n');
            rec.startLine = start;
            rec.endLine = end;
        }
        if (content.length > (security.MAX_FILE_CHARS || 120000)) {
            rec.truncated = true;
            content = content.slice(0, security.MAX_FILE_CHARS || 120000);
        }
        rec.content = content;
        rec.hash = diffApi.hashContent ? diffApi.hashContent(file.content || '') : '';
        return { ok: true, file: rec };
    };

    ProjectWorkspace.prototype.createFile = function (path, content, opts) {
        opts = opts || {};
        var n = security.normalizeProjectPath(path);
        if (!n.ok) return n;
        if (this.files.length >= (security.MAX_FILES || 400)) {
            return { ok: false, error: 'Project file limit reached', code: 'limit' };
        }
        if (this.findByPath(n.path)) return { ok: false, error: 'File already exists', code: 'exists' };
        var text = String(content == null ? '' : content);
        if (text.length > (security.MAX_FILE_CHARS || 120000)) {
            return { ok: false, error: 'File too large', code: 'oversized' };
        }
        var file = {
            id: uid('f'),
            name: basename(n.path),
            path: n.path,
            content: text,
            language: detectLanguage(n.path),
            isDirty: !opts.saved,
            isFolderPlaceholder: false,
            revision: 1
        };
        this.files.push(file);
        this.emit('create', { path: file.path, id: file.id });
        return { ok: true, file: file };
    };

    ProjectWorkspace.prototype.createFolder = function (path) {
        var n = security.normalizeProjectPath(path + '/.keep');
        if (!n.ok) return n;
        if (this.findByPath(n.path)) return { ok: true };
        return this.createFile(n.path, '', { saved: true });
    };

    ProjectWorkspace.prototype.setContent = function (path, content, opts) {
        opts = opts || {};
        var file = this.findByPath(path);
        if (!file) return { ok: false, error: 'File not found', code: 'unknown_path' };
        if (opts.expectedRevision != null && (file.revision || 1) !== opts.expectedRevision) {
            return { ok: false, error: 'The file changed since it was read. Refresh and try again.', code: 'stale' };
        }
        if (opts.expectedHash && diffApi.hashContent && diffApi.hashContent(file.content || '') !== opts.expectedHash) {
            return { ok: false, error: 'The file changed since it was read. Refresh and try again.', code: 'stale' };
        }
        var text = String(content == null ? '' : content);
        if (text.length > (security.MAX_FILE_CHARS || 120000)) {
            return { ok: false, error: 'File too large', code: 'oversized' };
        }
        var before = file.content || '';
        file.content = text;
        file.isDirty = opts.dirty !== false;
        file.revision = (file.revision || 1) + 1;
        this.emit('edit', { path: file.path, id: file.id, before: before, after: text });
        return { ok: true, file: file, before: before, after: text };
    };

    ProjectWorkspace.prototype.editFile = function (path, args) {
        var file = this.findByPath(path);
        if (!file) return { ok: false, error: 'File not found', code: 'unknown_path' };
        var next;
        if (args.old_string != null) {
            var applied = diffApi.applyReplacement(file.content || '', args.old_string, args.new_string || '');
            if (!applied.ok) return applied;
            next = applied.content;
        } else if (args.content != null) {
            next = String(args.content);
        } else {
            return { ok: false, error: 'Provide old_string/new_string or content', code: 'invalid_args' };
        }
        return this.setContent(path, next, {
            expectedRevision: args.expected_revision,
            dirty: true
        });
    };

    ProjectWorkspace.prototype.renameFile = function (path, newPath) {
        var file = this.findByPath(path);
        if (!file) return { ok: false, error: 'File not found', code: 'unknown_path' };
        var n = security.normalizeProjectPath(newPath);
        if (!n.ok) return n;
        if (this.findByPath(n.path) && (this.findByPath(n.path).id !== file.id)) {
            return { ok: false, error: 'A file already exists at the new path', code: 'exists' };
        }
        var oldPath = file.path;
        file.path = n.path;
        file.name = basename(n.path);
        file.language = detectLanguage(n.path);
        file.revision = (file.revision || 1) + 1;
        this.emit('rename', { from: oldPath, to: n.path, id: file.id });
        return { ok: true, file: file, from: oldPath };
    };

    ProjectWorkspace.prototype.deleteFile = function (path) {
        var file = this.findByPath(path);
        if (!file) return { ok: false, error: 'File not found', code: 'unknown_path' };
        var snapshot = cloneFiles([file])[0];
        this.files = this.files.filter(function (f) { return f.id !== file.id; });
        this.openFileIds = this.openFileIds.filter(function (id) { return id !== file.id; });
        if (this.currentFileId === file.id) this.currentFileId = this.openFileIds[0] || null;
        this.emit('delete', { path: snapshot.path, id: snapshot.id });
        return { ok: true, file: snapshot };
    };

    ProjectWorkspace.prototype.duplicateFile = function (path) {
        var file = this.findByPath(path);
        if (!file) return { ok: false, error: 'File not found', code: 'unknown_path' };
        var base = file.path || file.name;
        var dot = base.lastIndexOf('.');
        var next = dot > 0 ? base.slice(0, dot) + '-copy' + base.slice(dot) : base + '-copy';
        var i = 2;
        while (this.findByPath(next)) {
            next = dot > 0 ? base.slice(0, dot) + '-copy' + i + base.slice(dot) : base + '-copy' + i;
            i++;
        }
        return this.createFile(next, file.content || '');
    };

    ProjectWorkspace.prototype.search = function (query, opts) {
        opts = opts || {};
        var q = String(query || '').slice(0, security.MAX_SEARCH_QUERY || 200);
        if (!q) return { ok: false, error: 'Empty query', code: 'invalid_args' };
        var max = Math.min(80, opts.maxResults || 40);
        var namesOnly = !!opts.namesOnly;
        var hits = [];
        var i;
        for (i = 0; i < this.files.length; i++) {
            var f = this.files[i];
            if (f.isFolderPlaceholder) continue;
            var path = f.path || f.name;
            if (security.isSensitivePath(path)) continue;
            if (path.toLowerCase().indexOf(q.toLowerCase()) >= 0) {
                hits.push({ path: path, line: 0, text: path, kind: 'name' });
            }
            if (namesOnly) continue;
            var lines = String(f.content || '').split('\n');
            var li;
            for (li = 0; li < lines.length; li++) {
                if (lines[li].toLowerCase().indexOf(q.toLowerCase()) >= 0) {
                    hits.push({ path: path, line: li + 1, text: lines[li].trim().slice(0, 200), kind: 'text' });
                    if (hits.length >= max) return { ok: true, hits: hits, truncated: true };
                }
            }
        }
        return { ok: true, hits: hits.slice(0, max), truncated: hits.length > max };
    };

    ProjectWorkspace.prototype.replaceInFile = function (path, search, replacement) {
        var file = this.findByPath(path);
        if (!file) return { ok: false, error: 'File not found', code: 'unknown_path' };
        if (security.isSensitivePath(file.path)) return { ok: false, error: 'Sensitive file blocked', code: 'sensitive' };
        var src = file.content || '';
        if (src.indexOf(search) < 0) return { ok: true, count: 0, preview: src };
        var next = src.split(search).join(replacement);
        return { ok: true, count: src.split(search).length - 1, preview: next, path: file.path };
    };

    ProjectWorkspace.prototype.structureSummary = function () {
        var files = this.listPaths();
        var lines = files.map(function (f) { return (f.sensitive ? '[sensitive] ' : '') + f.path; });
        return lines.slice(0, 80).join('\n') + (files.length > 80 ? '\n…' : '');
    };

    ProjectWorkspace.prototype.entryHtml = function () {
        var preferred = ['index.html', 'src/index.html', 'app.html'];
        var i;
        for (i = 0; i < preferred.length; i++) {
            if (this.findByPath(preferred[i])) return preferred[i];
        }
        for (i = 0; i < this.files.length; i++) {
            var p = this.files[i].path || this.files[i].name;
            if (/\.html?$/i.test(p) && !this.files[i].isFolderPlaceholder) return p;
        }
        return null;
    };

    ProjectWorkspace.prototype.checkpoint = function (label) {
        var snap = {
            id: uid('cp'),
            at: Date.now(),
            label: String(label || 'Checkpoint').slice(0, 120),
            name: this.name,
            files: cloneFiles(this.files),
            openFileIds: this.openFileIds.slice(),
            currentFileId: this.currentFileId
        };
        var encoded = JSON.stringify(snap);
        if (encoded.length > MAX_CHECKPOINT_CHARS) {
            return { ok: false, error: 'Checkpoint too large for local storage', code: 'limit' };
        }
        this.checkpoints.unshift(snap);
        if (this.checkpoints.length > MAX_CHECKPOINTS) this.checkpoints.length = MAX_CHECKPOINTS;
        this.emit('checkpoint', { id: snap.id, label: snap.label });
        return { ok: true, checkpoint: { id: snap.id, at: snap.at, label: snap.label, files: snap.files.length } };
    };

    ProjectWorkspace.prototype.restoreCheckpoint = function (id) {
        var snap = null;
        var i;
        for (i = 0; i < this.checkpoints.length; i++) {
            if (this.checkpoints[i].id === id) snap = this.checkpoints[i];
        }
        if (!snap) snap = this.checkpoints[0];
        if (!snap) return { ok: false, error: 'No checkpoint', code: 'missing' };
        this.files = cloneFiles(snap.files);
        this.openFileIds = (snap.openFileIds || []).slice();
        this.currentFileId = snap.currentFileId || null;
        this.name = snap.name || this.name;
        this.activeChangeset = null;
        this.pendingProposals = [];
        this.emit('restore', { id: snap.id });
        return { ok: true, checkpoint: snap.id };
    };

    ProjectWorkspace.prototype.beginChangeset = function (task) {
        this.activeChangeset = {
            id: uid('cs'),
            at: Date.now(),
            task: String(task || 'Agent task').slice(0, 240),
            created: [],
            modified: [],
            deleted: [],
            validation: null,
            status: 'open'
        };
        return this.activeChangeset;
    };

    ProjectWorkspace.prototype.recordChange = function (kind, path, extra) {
        if (!this.activeChangeset) this.beginChangeset('Edits');
        var cs = this.activeChangeset;
        extra = extra || {};
        var rec = { path: path, before: extra.before, after: extra.after };
        if (kind === 'created') cs.created.push(rec);
        else if (kind === 'deleted') cs.deleted.push(rec);
        else cs.modified.push(rec);
    };

    ProjectWorkspace.prototype.finishChangeset = function (validation) {
        if (!this.activeChangeset) return null;
        this.activeChangeset.validation = validation || null;
        this.activeChangeset.status = 'applied';
        this.history.unshift({
            id: this.activeChangeset.id,
            at: this.activeChangeset.at,
            task: this.activeChangeset.task,
            created: this.activeChangeset.created.map(function (x) { return x.path; }),
            modified: this.activeChangeset.modified.map(function (x) { return x.path; }),
            deleted: this.activeChangeset.deleted.map(function (x) { return x.path; }),
            validation: this.activeChangeset.validation
        });
        if (this.history.length > MAX_HISTORY) this.history.length = MAX_HISTORY;
        var done = this.activeChangeset;
        this.activeChangeset = null;
        this.emit('changeset', done);
        return done;
    };

    ProjectWorkspace.prototype.clear = function () {
        this.files = [];
        this.openFileIds = [];
        this.currentFileId = null;
        this.pendingProposals = [];
        this.activeChangeset = null;
        this.emit('clear', {});
    };

    ProjectWorkspace.prototype.applyTemplate = function (template) {
        var self = this;
        this.clear();
        this.name = template && template.name ? template.name : 'Untitled project';
        (template.files || []).forEach(function (f) {
            self.createFile(f.path, f.content, { saved: true });
        });
        if (this.files[0]) this.currentFileId = this.files[0].id;
        return { ok: true };
    };

    ProjectWorkspace.prototype.serialize = function () {
        return {
            name: this.name,
            files: cloneFiles(this.files),
            openFileIds: this.openFileIds.slice(),
            currentFileId: this.currentFileId,
            history: this.history.slice(0, MAX_HISTORY)
        };
    };

    ProjectWorkspace.prototype.hydrate = function (data) {
        if (!data) return;
        this.name = data.name || this.name;
        this.files = cloneFiles(data.files || []);
        this.openFileIds = (data.openFileIds || []).filter(function (id) {
            return this.files.some(function (f) { return f.id === id; }.bind(this));
        }.bind(this));
        this.currentFileId = data.currentFileId || this.openFileIds[0] || (this.files[0] && this.files[0].id) || null;
        this.history = Array.isArray(data.history) ? data.history.slice(0, MAX_HISTORY) : [];
    };

    root.AegisStudio.workspace = {
        ProjectWorkspace: ProjectWorkspace,
        detectLanguage: detectLanguage,
        basename: basename,
        dirname: dirname,
        uid: uid,
        cloneFiles: cloneFiles,
        STORAGE_FILES: STORAGE_FILES,
        STORAGE_OPEN: STORAGE_OPEN,
        STORAGE_META: STORAGE_META,
        STORAGE_LAYOUT: STORAGE_LAYOUT,
        STORAGE_HISTORY: STORAGE_HISTORY,
        STORAGE_PERMISSIONS: STORAGE_PERMISSIONS,
        STORAGE_COMPANION: STORAGE_COMPANION,
        IDB_NAME: IDB_NAME,
        IDB_STORE: IDB_STORE
    };

    if (typeof module === 'object' && module.exports) {
        module.exports = root.AegisStudio.workspace;
    }
})(typeof window !== 'undefined' ? window : globalThis);
