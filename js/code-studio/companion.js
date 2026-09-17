/**
 * Aegis Code Studio — Companion conversation layer.
 * Understands the project. Does not mutate files.
 */
(function (root) {
    'use strict';
    var intentApi = (root.AegisStudio && root.AegisStudio.intent) || {};
    var protocol = (root.AegisStudio && root.AegisStudio.protocol) || {};
    root.AegisStudio = root.AegisStudio || {};

    var MAX_TURNS = 16;
    var STORAGE_KEY = 'codeStudioCompanionMemory';

    function Companion(host) {
        this.host = host;
        this.conversation = [];
        this.lastProposal = null;
        this.abort = null;
        this.requestId = 0;
        this.busy = false;
        this.projectId = 'default';
    }

    Companion.prototype.loadMemory = function (projectId) {
        this.projectId = projectId || 'default';
        try {
            var all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
            this.conversation = Array.isArray(all[this.projectId]) ? all[this.projectId].slice(-MAX_TURNS) : [];
        } catch (e) {
            this.conversation = [];
        }
    };

    Companion.prototype.saveMemory = function () {
        try {
            var all = {};
            try { all = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch (e2) { all = {}; }
            all[this.projectId] = this.conversation.slice(-MAX_TURNS);
            var keys = Object.keys(all);
            if (keys.length > 8) delete all[keys[0]];
            localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
        } catch (e) { /* quota */ }
    };

    Companion.prototype.stop = function () {
        this.requestId += 1;
        this.busy = false;
        if (this.abort) {
            try { this.abort.abort(); } catch (e) { /* ignore */ }
        }
        if (this.host && this.host.onCompanionStopped) this.host.onCompanionStopped();
    };

    Companion.prototype.reset = function () {
        this.conversation = [];
        this.lastProposal = null;
        this.saveMemory();
        if (this.host && this.host.onCompanionReset) this.host.onCompanionReset();
    };

    Companion.prototype.buildHandoff = function (userText) {
        var proposal = this.lastProposal || {};
        return {
            userRequest: String(userText || proposal.userRequest || '').slice(0, 2000),
            companionSummary: String(proposal.summary || proposal.message || '').slice(0, 2500),
            files: Array.isArray(proposal.files) ? proposal.files.slice(0, 12) : [],
            diagnostics: Array.isArray(proposal.diagnostics) ? proposal.diagnostics.slice(0, 12) : [],
            acceptance: Array.isArray(proposal.acceptance) ? proposal.acceptance.slice(0, 8) : [
                'Apply only the discussed changes',
                'Keep unrelated code intact',
                'Refresh preview and repair real errors'
            ]
        };
    };

    Companion.prototype.extractProposal = function (message) {
        var text = String(message || '');
        var files = [];
        var re = /`([^`]+\.[A-Za-z0-9]+)`/g;
        var m;
        while ((m = re.exec(text))) {
            if (files.indexOf(m[1]) < 0) files.push(m[1]);
        }
        var actionable = /\b(I would|I'd|should|change|improve|fix|add|replace|refactor)\b/i.test(text);
        if (!actionable && !files.length) return null;
        return {
            summary: text.slice(0, 1800),
            message: text,
            files: files.slice(0, 8),
            acceptance: []
        };
    };

    Companion.prototype.ask = function (userText, extras) {
        var self = this;
        extras = extras || {};
        var id = ++this.requestId;
        this.busy = true;
        this.abort = (this.host && this.host.makeAbort) ? this.host.makeAbort() : (typeof AbortController === 'function' ? new AbortController() : { abort: function () {}, signal: undefined });
        this.conversation.push({ role: 'user', content: String(userText || '').slice(0, 4000) });
        if (this.host && this.host.onCompanionMessage) this.host.onCompanionMessage(userText, 'user');
        var ctx = extras.context || '';
        return this.host.completeCompanion({
            surface: 'companion',
            context: ctx,
            conversation: this.conversation.slice(-MAX_TURNS),
            signal: this.abort.signal,
            requestId: id
        }).then(function (raw) {
            if (id !== self.requestId) return { ok: false, stale: true };
            self.busy = false;
            var text = '';
            if (typeof raw === 'string') text = raw;
            else if (raw && raw.message) text = raw.message;
            else if (raw && raw.content) text = raw.content;
            text = String(text || '').trim();
            if (!text) text = 'I did not get a usable reply just then. Your project is unchanged — try again?';
            if (protocol.parse) {
                var parsed = protocol.parse(raw && raw.type ? raw : text, {});
                if (parsed.ok && parsed.envelope && parsed.envelope.message) text = parsed.envelope.message;
            }
            self.conversation.push({ role: 'assistant', content: text.slice(0, 6000) });
            if (self.conversation.length > MAX_TURNS) self.conversation = self.conversation.slice(-MAX_TURNS);
            self.saveMemory();
            self.lastProposal = self.extractProposal(text);
            if (self.lastProposal) self.lastProposal.userRequest = userText;
            if (self.host && self.host.onCompanionMessage) self.host.onCompanionMessage(text, 'assistant');
            if (self.host && self.host.onCompanionDone) self.host.onCompanionDone({ message: text, proposal: self.lastProposal });
            return { ok: true, message: text, proposal: self.lastProposal };
        }).catch(function (err) {
            if (id !== self.requestId) return { ok: false, stale: true };
            self.busy = false;
            var message = (err && err.message) ? err.message : 'Aegis Companion could not reach the AI service. Your project is safe.';
            if (self.host && self.host.onCompanionError) self.host.onCompanionError(message);
            return { ok: false, error: message };
        });
    };

    Companion.prototype.localGreeting = function () {
        return "Hey! What are we building today? I can look through the project with you, explain something, debug an issue, or hand a task over to Agent.";
    };

    root.AegisStudio.companion = {
        Companion: Companion,
        STORAGE_KEY: STORAGE_KEY
    };
    if (typeof module === 'object' && module.exports) {
        module.exports = root.AegisStudio.companion;
    }
})(typeof window !== 'undefined' ? window : globalThis);
