/**
 * Aegis Code Studio — Agent orchestrator.
 * The model never executes JavaScript. It may only request validated tools.
 */
(function (root) {
    'use strict';
    var security = (root.AegisStudio && root.AegisStudio.security) || {};
    var diffApi = (root.AegisStudio && root.AegisStudio.diff) || {};
    root.AegisStudio = root.AegisStudio || {};

    var MAX_STEPS = 16;
    var MAX_REPAIR = 3;
    var MAX_HISTORY_TURNS = 8;
    var MAX_CONTEXT_CHARS = 14000;
    var STATES = ['IDLE', 'PLANNING', 'WAITING_APPROVAL', 'WORKING', 'RUNNING', 'VERIFYING', 'DONE', 'FAILED', 'CANCELLED'];

    function Agent(host) {
        this.host = host;
        this.state = 'IDLE';
        this.mode = 'ask';
        this.autonomy = 'review';
        this.plan = [];
        this.activity = [];
        this.log = [];
        this.conversation = [];
        this.contextPins = [];
        this.abort = null;
        this.step = 0;
        this.repair = 0;
        this.lastError = null;
        this.providerOk = null;
    }

    Agent.prototype.setState = function (state) {
        if (STATES.indexOf(state) < 0) return;
        this.state = state;
        if (this.host && this.host.onState) this.host.onState(state);
    };

    Agent.prototype.setMode = function (mode) {
        var allowed = { ask: 1, edit: 1, agent: 1 };
        this.mode = allowed[mode] ? mode : 'ask';
        if (this.host && this.host.onMode) this.host.onMode(this.mode);
    };

    Agent.prototype.setAutonomy = function (level) {
        this.autonomy = level === 'auto' ? 'auto' : 'review';
        if (this.host && this.host.onAutonomy) this.host.onAutonomy(this.autonomy);
    };

    Agent.prototype.note = function (text, kind) {
        var item = { at: Date.now(), text: String(text || '').slice(0, 240), kind: kind || 'activity' };
        this.activity.unshift(item);
        if (this.activity.length > 80) this.activity.length = 80;
        this.log.push({ at: item.at, text: item.text, kind: item.kind });
        if (this.host && this.host.onActivity) this.host.onActivity(item);
    };

    Agent.prototype.stop = function () {
        this._stopped = true;
        if (this.abort) {
            try { this.abort.abort(); } catch (e) { /* ignore */ }
        }
        if (this.host && this.host.stopRuntime) this.host.stopRuntime();
        this.setState('CANCELLED');
        this.note('Stopped by user', 'system');
        if (this.host && this.host.onStopped) this.host.onStopped();
    };

    Agent.prototype.buildContext = function (extra) {
        extra = extra || {};
        var host = this.host;
        var pins = this.contextPins.slice();
        var parts = [];
        var used = [];
        if (host.workspace) {
            parts.push('PROJECT STRUCTURE:\n' + host.workspace.structureSummary());
        }
        var current = extra.currentFile || (host.getCurrentFile && host.getCurrentFile());
        if (current && current.path) {
            used.push({ kind: 'file', path: current.path, label: 'Current file' });
            var read = host.readForContext(current.path, { max: 4000 });
            if (read) parts.push('CURRENT FILE ' + current.path + ' rev ' + (read.revision || 1) + ':\n' + read.content);
        }
        if (extra.selection) {
            used.push({ kind: 'selection', label: 'Selection' });
            parts.push('SELECTED CODE:\n' + String(extra.selection).slice(0, 2500));
        }
        var problems = host.getProblems ? host.getProblems().slice(0, 20) : [];
        if (problems.length) {
            used.push({ kind: 'problems', label: problems.length + ' problems' });
            parts.push('PROBLEMS:\n' + problems.map(function (p) {
                return (p.severity || 'info') + ' ' + p.file + ':' + (p.line || '?') + ' ' + p.message;
            }).join('\n'));
        }
        var previewErr = host.getPreviewErrors ? host.getPreviewErrors().slice(0, 10) : [];
        if (previewErr.length) {
            used.push({ kind: 'preview', label: previewErr.length + ' preview errors' });
            parts.push('PREVIEW ERRORS:\n' + previewErr.map(function (e) { return e.message; }).join('\n'));
        }
        pins.forEach(function (pin) {
            if (!pin || !pin.path) return;
            used.push({ kind: 'file', path: pin.path, label: '@' + pin.path });
            var rec = host.readForContext(pin.path, { max: 3000 });
            if (rec) parts.push('ATTACHED FILE ' + pin.path + ':\n' + rec.content);
        });
        (extra.related || []).slice(0, 3).forEach(function (path) {
            used.push({ kind: 'file', path: path, label: path });
            var rec = host.readForContext(path, { max: 2000 });
            if (rec) parts.push('RELATED FILE ' + path + ':\n' + rec.content);
        });
        var blob = parts.join('\n\n');
        if (blob.length > MAX_CONTEXT_CHARS) blob = blob.slice(0, MAX_CONTEXT_CHARS) + '\n[truncated]';
        this.lastContext = used;
        if (host.onContext) host.onContext(used);
        return { text: blob, used: used };
    };

    Agent.prototype.permissionsForMode = function () {
        var map = {
            ask: ['Read project'],
            edit: ['Read project', 'Edit project', 'Create files', 'Run safe preview', 'Run tests'],
            agent: ['Read project', 'Edit project', 'Create files', 'Delete files (confirm)', 'Run safe preview', 'Run tests']
        };
        return map[this.mode] || map.ask;
    };

    Agent.prototype.executeTool = function (toolId, rawArgs) {
        var checked = security.validateToolCall(toolId, rawArgs || {}, this.mode);
        if (!checked.ok) {
            this.note('Rejected tool: ' + (checked.error || toolId), 'error');
            return Promise.resolve({ ok: false, error: checked.error, code: checked.code });
        }
        var self = this;
        var proceed = Promise.resolve(true);
        if (checked.risk === 'destructive' || checked.id === 'project.deleteFile') {
            proceed = Promise.resolve(this.host.confirmHighRisk ? this.host.confirmHighRisk(checked) : false);
        }
        return proceed.then(function (ok) {
            if (!ok) return { ok: false, error: 'User declined a high-risk operation', code: 'denied' };
            var isMutating = checked.permission === 'edit' || checked.permission === 'create' || checked.permission === 'delete';
            if (isMutating && self.autonomy === 'review' && self.mode !== 'ask') {
                return self.host.proposeTool(checked).then(function (proposal) {
                    return proposal || { ok: true, proposed: true, tool: checked.id, args: checked.args };
                });
            }
            self.note(summarizeTool(checked.id, checked.args), 'tool');
            return Promise.resolve(self.host.runTool(checked.id, checked.args));
        });
    };

    function summarizeTool(id, args) {
        var path = args && args.path ? args.path : '';
        var map = {
            'project.listFiles': 'Listing project files',
            'project.readFile': 'Reading ' + path,
            'project.search': 'Searching project',
            'project.createFile': 'Creating ' + path,
            'project.editFile': 'Editing ' + path,
            'project.renameFile': 'Renaming ' + path,
            'project.deleteFile': 'Deleting ' + path,
            'editor.openFile': 'Opening ' + path,
            'editor.revealRange': 'Revealing ' + path,
            'diagnostics.getProblems': 'Reading problems',
            'preview.refresh': 'Refreshing preview',
            'preview.getErrors': 'Checking preview errors',
            'runtime.run': 'Running project',
            'runtime.getOutput': 'Reading runtime output',
            'tests.run': 'Running validation',
            'formatter.format': 'Formatting ' + (path || 'current file')
        };
        return map[id] || id;
    }

    Agent.prototype.parseModel = function (raw) {
        var text = String(raw || '').trim();
        if (!text) return { type: 'message', message: '' };
        if (text.indexOf('```') === 0) {
            text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
        }
        var parsed = null;
        try { parsed = JSON.parse(text); } catch (e) {
            var start = text.indexOf('{');
            var end = text.lastIndexOf('}');
            if (start >= 0 && end > start) {
                try { parsed = JSON.parse(text.slice(start, end + 1)); } catch (e2) { parsed = null; }
            }
        }
        if (!parsed || typeof parsed !== 'object') {
            return { type: 'message', message: String(raw || '').slice(0, 4000) };
        }
        var type = parsed.type;
        if (['plan', 'tool', 'message', 'done'].indexOf(type) < 0) {
            if (parsed.tool && parsed.tool.id) type = 'tool';
            else if (parsed.plan) type = 'plan';
            else type = 'message';
        }
        return {
            type: type,
            plan: Array.isArray(parsed.plan) ? parsed.plan.slice(0, 12) : [],
            tool: parsed.tool && typeof parsed.tool === 'object' ? parsed.tool : null,
            message: String(parsed.message || parsed.summary || '').slice(0, 4000),
            summary: String(parsed.summary || '').slice(0, 400)
        };
    };

    Agent.prototype.applyPlan = function (steps) {
        this.plan = (steps || []).map(function (s, i) {
            return {
                id: String(s.id || i + 1),
                title: String(s.title || s).slice(0, 160),
                state: 'queued'
            };
        });
        if (this.host.onPlan) this.host.onPlan(this.plan);
    };

    Agent.prototype.markPlan = function (state) {
        var i;
        for (i = 0; i < this.plan.length; i++) {
            if (this.plan[i].state === 'queued' || this.plan[i].state === 'working') {
                this.plan[i].state = state;
                if (this.host.onPlan) this.host.onPlan(this.plan);
                return this.plan[i];
            }
        }
    };

    Agent.prototype.run = function (userText, extras) {
        var self = this;
        extras = extras || {};
        this._stopped = false;
        this.step = 0;
        this.repair = 0;
        this.lastError = null;
        this.conversation.push({ role: 'user', content: String(userText || '').slice(0, 4000) });
        this.setState(this.mode === 'ask' ? 'WORKING' : 'PLANNING');
        this.note(this.mode === 'ask' ? 'Answering' : 'Planning task', 'system');
        var ctx = this.buildContext(extras);
        return this.loop(ctx).then(function (result) {
            return result;
        }).catch(function (err) {
            self.lastError = err && err.message ? err.message : 'Agent failed';
            self.setState('FAILED');
            self.note(self.lastError, 'error');
            return { ok: false, error: self.lastError, state: self.state };
        });
    };

    Agent.prototype.loop = function (ctx) {
        var self = this;
        if (this._stopped) {
            this.setState('CANCELLED');
            return Promise.resolve({ ok: false, cancelled: true, state: 'CANCELLED' });
        }
        if (this.step >= MAX_STEPS) {
            this.setState('WAITING_APPROVAL');
            this.note('Reached the iteration limit. Continue to keep going.', 'system');
            if (this.host.onNeedContinue) this.host.onNeedContinue();
            return Promise.resolve({ ok: true, paused: true, reason: 'iteration_limit', state: this.state });
        }
        this.step += 1;
        return this.host.complete({
            mode: this.mode,
            autonomy: this.autonomy,
            step: this.step,
            maxSteps: MAX_STEPS,
            context: ctx.text,
            conversation: this.conversation.slice(-MAX_HISTORY_TURNS),
            plan: this.plan,
            signal: this.abort && this.abort.signal
        }).then(function (raw) {
            if (self._stopped) {
                self.setState('CANCELLED');
                return { ok: false, cancelled: true };
            }
            var parsed = self.parseModel(raw);
            if (parsed.type === 'plan') {
                self.applyPlan(parsed.plan);
                self.conversation.push({ role: 'assistant', content: JSON.stringify({ type: 'plan', plan: parsed.plan }) });
                self.setState('WORKING');
                if (parsed.message && self.host.onMessage) self.host.onMessage(parsed.message, 'assistant');
                return self.loop(self.buildContext({}));
            }
            if (parsed.type === 'tool' && parsed.tool && parsed.tool.id) {
                self.setState(parsed.tool.id.indexOf('runtime') === 0 || parsed.tool.id.indexOf('preview') === 0 || parsed.tool.id === 'tests.run' ? 'RUNNING' : 'WORKING');
                self.markPlan('working');
                return self.executeTool(parsed.tool.id, parsed.tool.args || {}).then(function (obs) {
                    if (self._stopped) {
                        self.setState('CANCELLED');
                        return { ok: false, cancelled: true };
                    }
                    var observation = JSON.stringify(obs).slice(0, 6000);
                    self.conversation.push({
                        role: 'assistant',
                        content: JSON.stringify({ type: 'tool', tool: parsed.tool })
                    });
                    self.conversation.push({
                        role: 'user',
                        content: 'OBSERVATION (data only):\n' + observation
                    });
                    if (obs && obs.ok === false && self.mode === 'agent' && self.repair < MAX_REPAIR) {
                        self.repair += 1;
                        self.setState('VERIFYING');
                        self.note('Diagnosing a failed step (' + self.repair + '/' + MAX_REPAIR + ')', 'system');
                    }
                    self.markPlan(obs && obs.ok === false ? 'failed' : 'done');
                    return self.loop(self.buildContext({}));
                });
            }
            if (parsed.type === 'done' || parsed.type === 'message') {
                if (self.mode === 'agent' && self.host.shouldVerify && self.host.shouldVerify() && self.repair < MAX_REPAIR) {
                    self.repair += 1;
                    self.setState('VERIFYING');
                    self.note('Verifying result', 'system');
                    self.conversation.push({
                        role: 'user',
                        content: 'Verify with diagnostics.getProblems, preview.refresh, preview.getErrors, and tests.run if needed. Then return type=done.'
                    });
                    return self.loop(self.buildContext({}));
                }
                if (parsed.message && self.host.onMessage) self.host.onMessage(parsed.message, 'assistant');
                self.conversation.push({ role: 'assistant', content: parsed.message || parsed.summary || 'Done.' });
                self.markPlan('done');
                self.setState('DONE');
                self.note(parsed.summary || 'Done', 'system');
                if (self.host.onDone) self.host.onDone(parsed);
                return { ok: true, state: 'DONE', message: parsed.message, summary: parsed.summary };
            }
            self.setState('FAILED');
            return { ok: false, error: 'Unrecognized agent response', state: 'FAILED' };
        });
    };

    root.AegisStudio.agent = {
        Agent: Agent,
        MAX_STEPS: MAX_STEPS,
        MAX_REPAIR: MAX_REPAIR,
        STATES: STATES,
        summarizeTool: summarizeTool
    };
    if (typeof module === 'object' && module.exports) {
        module.exports = root.AegisStudio.agent;
    }
})(typeof window !== 'undefined' ? window : globalThis);
