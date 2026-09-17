/**
 * Aegis Code Studio — project context engine.
 * Incremental metadata. Never dumps the whole project or secrets into prompts.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AegisStudio = root.AegisStudio || {};
    root.AegisStudio.context = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var MAX_CONTEXT = 12000;
    var MAX_FILE_SLICE = 3500;
    var MAX_HISTORY_TURNS = 10;
    var MAX_MEMORY = 24;

    function ContextEngine() {
        this.meta = {};
        this.readCache = {};
        this.memory = [];
        this.selection = null;
        this.pins = [];
        this.dirtyIndex = true;
        this.generation = 0;
    }

    ContextEngine.prototype.invalidate = function (path) {
        this.dirtyIndex = true;
        this.generation += 1;
        if (path && this.readCache[path]) delete this.readCache[path];
    };

    ContextEngine.prototype.rebuild = function (workspace) {
        if (!workspace) return;
        var next = {};
        var files = workspace.listPaths ? workspace.listPaths() : [];
        var i;
        for (i = 0; i < files.length; i++) {
            var f = files[i];
            next[f.path] = {
                path: f.path,
                language: f.language,
                size: f.bytes || 0,
                revision: f.revision || 1,
                sensitive: !!f.sensitive
            };
        }
        this.meta = next;
        this.dirtyIndex = false;
    };

    ContextEngine.prototype.ensure = function (workspace) {
        if (this.dirtyIndex) this.rebuild(workspace);
    };

    ContextEngine.prototype.setSelection = function (sel) {
        if (!sel || !sel.text) {
            this.selection = null;
            return;
        }
        this.selection = {
            path: sel.path || '',
            text: String(sel.text).slice(0, 2500),
            startLine: sel.startLine || null,
            endLine: sel.endLine || null
        };
    };

    ContextEngine.prototype.clearSelection = function () {
        this.selection = null;
    };

    ContextEngine.prototype.pinFile = function (path) {
        if (!path) return;
        if (this.pins.indexOf(path) < 0) this.pins.push(path);
        if (this.pins.length > 8) this.pins = this.pins.slice(-8);
    };

    ContextEngine.prototype.unpinFile = function (path) {
        this.pins = this.pins.filter(function (p) { return p !== path; });
    };

    ContextEngine.prototype.parseMentions = function (text, workspace) {
        var re = /@([A-Za-z0-9._@+\-\/]+)/g;
        var m;
        var found = [];
        while ((m = re.exec(String(text || '')))) {
            if (!workspace || !workspace.findByPath) continue;
            var file = workspace.findByPath(m[1]);
            if (file) {
                this.pinFile(file.path || file.name);
                found.push(file.path || file.name);
            }
        }
        return found;
    };

    ContextEngine.prototype.readCached = function (workspace, path, max) {
        if (!workspace || !path) return null;
        var rec = workspace.readFile(path, {});
        if (!rec || !rec.ok) return null;
        if (rec.file.sensitive || rec.file.omitted) {
            return { path: path, omitted: true, revision: rec.file.revision, content: '' };
        }
        var key = path + '@' + (rec.file.revision || 1);
        var cached = this.readCache[path];
        if (cached && cached.key === key) {
            return { path: path, revision: rec.file.revision, content: cached.content.slice(0, max || MAX_FILE_SLICE) };
        }
        var content = String(rec.file.content || '').slice(0, max || MAX_FILE_SLICE);
        this.readCache[path] = { key: key, content: content, revision: rec.file.revision };
        return { path: path, revision: rec.file.revision, content: content };
    };

    ContextEngine.prototype.treeSummary = function () {
        var paths = Object.keys(this.meta).sort();
        var lines = paths.slice(0, 80).map(function (p) {
            var m = this.meta[p];
            return (m.sensitive ? '[sensitive] ' : '') + p;
        }.bind(this));
        if (paths.length > 80) lines.push('… ' + (paths.length - 80) + ' more files');
        return lines.join('\n');
    };

    ContextEngine.prototype.build = function (workspace, extras) {
        extras = extras || {};
        this.ensure(workspace);
        var used = [];
        var parts = [];
        parts.push('PROJECT STRUCTURE:\n' + this.treeSummary());

        if (extras.currentFile && extras.currentFile.path) {
            var cur = this.readCached(workspace, extras.currentFile.path, 4000);
            if (cur && !cur.omitted) {
                used.push({ kind: 'file', path: cur.path, label: 'Current file' });
                parts.push('CURRENT FILE ' + cur.path + ' rev ' + (cur.revision || 1) + ':\n' + cur.content);
            } else if (cur && cur.omitted) {
                used.push({ kind: 'file', path: cur.path, label: 'Current file (protected)' });
                parts.push('CURRENT FILE ' + cur.path + ' is sensitive and omitted.');
            }
        }

        if (this.selection && this.selection.text) {
            used.push({
                kind: 'selection',
                path: this.selection.path,
                label: 'Selection' + (this.selection.path ? ' — ' + this.selection.path : '') +
                    (this.selection.startLine ? ' lines ' + this.selection.startLine + '–' + this.selection.endLine : '')
            });
            parts.push('SELECTED CODE:\n' + this.selection.text);
        }

        (extras.problems || []).slice(0, 16).forEach(function (p) {
            if (!parts._probs) {
                parts._probs = [];
                used.push({ kind: 'problems', label: 'Problems' });
            }
            parts._probs.push((p.severity || 'info') + ' ' + (p.file || '') + ':' + (p.line || '?') + ' ' + p.message);
        });
        if (parts._probs) parts.push('PROBLEMS:\n' + parts._probs.join('\n'));

        (extras.previewErrors || []).slice(0, 8).forEach(function (e, i) {
            if (i === 0) {
                used.push({ kind: 'preview', label: 'Preview errors' });
                parts.push('PREVIEW ERRORS:');
            }
            parts.push('- ' + (e.message || ''));
        });

        var self = this;
        this.pins.forEach(function (path) {
            var rec = self.readCached(workspace, path, 3000);
            if (!rec) return;
            used.push({ kind: 'file', path: path, label: '@' + path });
            if (rec.omitted) parts.push('ATTACHED FILE ' + path + ' omitted (sensitive).');
            else parts.push('ATTACHED FILE ' + path + ':\n' + rec.content);
        });

        (extras.related || []).slice(0, 3).forEach(function (path) {
            if (self.pins.indexOf(path) >= 0) return;
            var rec = self.readCached(workspace, path, 1800);
            if (!rec || rec.omitted) return;
            used.push({ kind: 'file', path: path, label: path });
            parts.push('RELATED FILE ' + path + ':\n' + rec.content);
        });

        if (extras.agentSummary) {
            used.push({ kind: 'agent', label: 'Last Agent result' });
            parts.push('LAST AGENT SUMMARY:\n' + String(extras.agentSummary).slice(0, 1500));
        }

        var blob = parts.filter(function (p) { return typeof p === 'string'; }).join('\n\n');
        if (blob.length > MAX_CONTEXT) blob = blob.slice(0, MAX_CONTEXT) + '\n[truncated]';
        return { text: blob, used: used };
    };

    ContextEngine.prototype.remember = function (item) {
        this.memory.unshift({
            at: Date.now(),
            role: item.role,
            text: String(item.text || '').slice(0, 1200)
        });
        if (this.memory.length > MAX_MEMORY) this.memory.length = MAX_MEMORY;
    };

    ContextEngine.prototype.summarizeMemory = function () {
        if (this.memory.length <= MAX_HISTORY_TURNS) return '';
        var older = this.memory.slice(MAX_HISTORY_TURNS);
        return older.slice(0, 8).map(function (m) {
            return (m.role || 'user') + ': ' + String(m.text || '').slice(0, 140);
        }).join('\n');
    };

    ContextEngine.prototype.recentTurns = function () {
        return this.memory.slice(0, MAX_HISTORY_TURNS);
    };

    return {
        ContextEngine: ContextEngine,
        MAX_CONTEXT: MAX_CONTEXT,
        MAX_FILE_SLICE: MAX_FILE_SLICE
    };
});
