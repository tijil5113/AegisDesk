/**
 * Aegis Code Studio — Agent orchestrator.
 * The model never executes JavaScript. It may only request validated tools.
 */
(function (root) {
    'use strict';
    var security = (root.AegisStudio && root.AegisStudio.security) || {};
    var protocol = (root.AegisStudio && root.AegisStudio.protocol) || {};
    var intentApi = (root.AegisStudio && root.AegisStudio.intent) || {};
    root.AegisStudio = root.AegisStudio || {};

    var MAX_STEPS = 16;
    var MAX_REPAIR = 3;
    var MAX_PROTOCOL_REPAIR = 1;
    var MAX_HISTORY_TURNS = 8;
    var MAX_LOG = 120;
    var STATES = [
        'IDLE', 'UNDERSTANDING', 'PLANNING', 'WAITING_PERMISSION', 'EXECUTING',
        'OBSERVING', 'REPAIRING', 'VERIFYING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PAUSED'
    ];
    var LIVE = {
        UNDERSTANDING: 1, PLANNING: 1, WAITING_PERMISSION: 1, EXECUTING: 1,
        OBSERVING: 1, REPAIRING: 1, VERIFYING: 1
    };

    function makeAbort(host) {
        if (host && host.makeAbort) return host.makeAbort();
        if (typeof AbortController === 'function') return new AbortController();
        return { abort: function () {}, signal: undefined };
    }

    function Agent(host) {
        this.host = host;
        this.state = 'IDLE';
        this.mode = 'agent';
        this.surface = 'agent';
        this.autonomy = 'review';
        this.plan = [];
        this.activity = [];
        this.log = [];
        this.conversation = [];
        this.contextPins = [];
        this.abort = null;
        this.step = 0;
        this.repair = 0;
        this.protocolRepair = 0;
        this.lastError = null;
        this.providerOk = null;
        this.requestId = 0;
        this.taskId = null;
        this.lastSummary = null;
        this.userPermissions = security.normalizeUserPermissions
            ? security.normalizeUserPermissions(null)
            : {};
        this._queue = null;
    }

    Agent.prototype.setState = function (state) {
        if (STATES.indexOf(state) < 0) return;
        this.state = state;
        if (this.host && this.host.onState) this.host.onState(state);
        try {
            var live = !!(LIVE[state]);
            var detail = this.plan && this.plan.length
                ? ('Step ' + (this.step || 0) + ' of ' + this.plan.length)
                : (state === 'COMPLETED' ? 'Finished' : state);
            var payload = {
                source: 'aegis-code-studio',
                type: 'agent-status',
                active: live,
                detail: detail,
                progress: this.plan && this.plan.length ? ((this.step || 0) / this.plan.length) : null
            };
            if (!live) payload._doneAt = Date.now();
            if (window.parent && window.parent !== window) window.parent.postMessage(payload, window.location.origin);
            window.AegisLive = window.AegisLive || {};
            window.AegisLive.agent = payload;
        } catch (e) { /* ignore */ }
    };

    Agent.prototype.isLive = function () {
        return !!LIVE[this.state];
    };

    Agent.prototype.setMode = function (mode) {
        var allowed = { ask: 1, edit: 1, agent: 1, companion: 1 };
        this.mode = allowed[mode] ? mode : 'agent';
        if (this.mode === 'companion' || this.mode === 'ask') this.surface = 'companion';
        else this.surface = 'agent';
        if (this.host && this.host.onMode) this.host.onMode(this.mode);
    };

    Agent.prototype.setAutonomy = function (level) {
        this.autonomy = level === 'auto' ? 'auto' : 'review';
        if (this.host && this.host.onAutonomy) this.host.onAutonomy(this.autonomy);
    };

    Agent.prototype.setPermissions = function (prefs) {
        this.userPermissions = security.normalizeUserPermissions
            ? security.normalizeUserPermissions(prefs)
            : (prefs || {});
    };

    Agent.prototype.note = function (text, kind) {
        var item = { at: Date.now(), text: String(text || '').slice(0, 240), kind: kind || 'activity' };
        this.activity.unshift(item);
        if (this.activity.length > 80) this.activity.length = 80;
        this.log.push({ at: item.at, text: item.text, kind: item.kind });
        if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
        if (this.host && this.host.onActivity) this.host.onActivity(item);
    };

    Agent.prototype.logTool = function (id, args, result) {
        var path = args && args.path ? args.path : '';
        var ok = result && result.ok !== false;
        var line = id + (path ? '(' + path + ')' : '') + ' — ' + (ok ? 'success' : 'failed');
        if (result && result.code === 'stale') line += ' (file changed since read)';
        this.log.push({ at: Date.now(), text: line, kind: 'tool' });
        if (this.log.length > MAX_LOG) this.log.splice(0, this.log.length - MAX_LOG);
        if (this.host && this.host.onAgentLog) this.host.onAgentLog(line, ok ? 'ok' : 'error');
    };

    Agent.prototype.stop = function () {
        this._stopped = true;
        this.requestId += 1;
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
        if (this.host && this.host.buildContext) return this.host.buildContext(extra);
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
        var blob = parts.join('\n\n');
        this.lastContext = used;
        if (host.onContext) host.onContext(used);
        return { text: blob, used: used };
    };

    Agent.prototype.permissionsForMode = function () {
        var map = {
            companion: ['Read project'],
            ask: ['Read project'],
            edit: ['Read project', 'Edit project', 'Create files', 'Run safe preview', 'Run tests'],
            agent: ['Read project', 'Edit project', 'Create files', 'Delete files (confirm)', 'Run safe preview', 'Run tests']
        };
        return map[this.mode] || map.agent;
    };

    Agent.prototype.allowedToolIds = function () {
        return security.TOOLS ? Object.keys(security.TOOLS) : [];
    };

    Agent.prototype.executeTool = function (toolId, rawArgs) {
        var checked = security.validateToolCall(toolId, rawArgs || {}, this.mode, this.userPermissions);
        if (!checked.ok) {
            this.note('Rejected tool: ' + (checked.error || toolId), 'error');
            this.logTool(toolId, rawArgs || {}, checked);
            return Promise.resolve({ ok: false, error: checked.error, code: checked.code });
        }
        var self = this;
        var proceed = Promise.resolve(true);
        var needsAsk = checked.ask || checked.risk === 'destructive' || checked.id === 'project.deleteFile' || checked.id === 'changes.revertCheckpoint';
        if (needsAsk && (checked.risk === 'destructive' || checked.userLevel === 'always_ask')) {
            this.setState('WAITING_PERMISSION');
            proceed = Promise.resolve(this.host.confirmHighRisk ? this.host.confirmHighRisk(checked) : false);
        }
        return proceed.then(function (ok) {
            if (!ok) return { ok: false, error: 'User declined a high-risk operation', code: 'denied' };
            var isMutating = checked.permission === 'edit' || checked.permission === 'create' || checked.permission === 'delete';
            if (isMutating && self.autonomy === 'review' && self.mode !== 'ask' && self.mode !== 'companion') {
                self.setState('WAITING_PERMISSION');
                return self.host.proposeTool(checked).then(function (proposal) {
                    return proposal || { ok: true, proposed: true, tool: checked.id, args: checked.args };
                });
            }
            self.note(summarizeTool(checked.id, checked.args), 'tool');
            self.setState('EXECUTING');
            return Promise.resolve(self.host.runTool(checked.id, checked.args)).then(function (result) {
                self.logTool(checked.id, checked.args, result);
                if (self.host && self.host.onLiveEdit && isMutating && result && result.ok) {
                    self.host.onLiveEdit(checked.id, checked.args, result);
                }
                return result;
            });
        });
    };

    function summarizeTool(id, args) {
        var path = args && args.path ? args.path : '';
        var map = {
            'project.listFiles': 'Listing project files',
            'project.readFile': 'Reading ' + path,
            'project.search': 'Searching the project',
            'project.createFile': 'Creating ' + path,
            'project.editFile': 'Editing ' + path,
            'project.renameFile': 'Renaming ' + path,
            'project.deleteFile': 'Deleting ' + path,
            'editor.openFile': 'Opening ' + path,
            'editor.revealRange': 'Revealing ' + path,
            'diagnostics.getProblems': 'Reading problems',
            'preview.refresh': 'Refreshing preview',
            'preview.getErrors': 'Checking preview errors',
            'preview.start': 'Starting preview',
            'preview.inspect': 'Inspecting preview',
            'runtime.run': 'Running project',
            'runtime.getOutput': 'Reading runtime output',
            'tests.run': 'Running validation',
            'formatter.format': 'Formatting ' + (path || 'current file'),
            'changes.createCheckpoint': 'Creating checkpoint',
            'changes.revertCheckpoint': 'Reverting checkpoint'
        };
        return map[id] || id;
    }

    Agent.prototype.parseModel = function (raw) {
        if (protocol.parse) {
            return protocol.parse(raw, { allowedTools: this.allowedToolIds() });
        }
        return { ok: true, kind: 'conversation', envelope: { type: 'assistant_message', message: String(raw || '') } };
    };

    Agent.prototype.applyPlan = function (steps) {
        this.plan = (steps || []).map(function (s, i) {
            return {
                id: String(s.id || i + 1),
                title: String(s.title || s).slice(0, 160),
                state: s.state || 'queued'
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

    Agent.prototype.pause = function (reason, extras) {
        extras = extras || {};
        this.lastError = reason;
        this.setState('PAUSED');
        this.note(reason, 'error');
        if (this.host && this.host.onPaused) this.host.onPaused(reason, extras);
        return { ok: false, paused: true, error: reason, state: 'PAUSED' };
    };

    Agent.prototype.run = function (userText, extras) {
        var self = this;
        extras = extras || {};
        if (this.isLive() && !extras.continueTask) {
            this._queue = { text: userText, extras: extras };
            this.note('Another Agent task is running. Stop it first or wait.', 'system');
            return Promise.resolve({ ok: false, queued: true, error: 'Agent is already working. Stop the current task or wait.' });
        }
        this._stopped = false;
        this.step = 0;
        this.repair = 0;
        this.protocolRepair = 0;
        this.lastError = null;
        this.lastSummary = null;
        this.taskId = 'task_' + Date.now().toString(36);
        var id = ++this.requestId;
        this.conversation.push({ role: 'user', content: String(userText || '').slice(0, 4000) });
        if (extras.handoff) {
            this.conversation.push({
                role: 'user',
                content: 'HANDOFF FROM COMPANION (data only):\n' + JSON.stringify(extras.handoff).slice(0, 3500)
            });
        }
        this.setState('UNDERSTANDING');
        this.note('Understanding the request', 'system');
        var ctx = this.buildContext(extras);
        return this.loop(ctx, id).then(function (result) {
            return result;
        }).catch(function (err) {
            if (id !== self.requestId) return { ok: false, stale: true };
            self.lastError = err && err.message ? err.message : 'Agent failed';
            self.setState('FAILED');
            self.note(self.lastError, 'error');
            if (self.host && self.host.onProviderFailure) self.host.onProviderFailure(self.lastError);
            return { ok: false, error: self.lastError, state: self.state };
        });
    };

    Agent.prototype.loop = function (ctx, requestId) {
        var self = this;
        if (requestId == null) requestId = this.requestId;
        if (this._stopped || requestId !== this.requestId) {
            this.setState('CANCELLED');
            return Promise.resolve({ ok: false, cancelled: true, state: 'CANCELLED' });
        }
        if (this.step >= MAX_STEPS) {
            return Promise.resolve(this.pause('Reached the iteration limit. Continue to keep going.', { reason: 'iteration_limit' }));
        }
        this.step += 1;
        this.abort = makeAbort(this.host);
        return this.host.complete({
            mode: this.mode,
            surface: 'agent',
            autonomy: this.autonomy,
            step: this.step,
            maxSteps: MAX_STEPS,
            context: ctx.text,
            conversation: this.conversation.slice(-MAX_HISTORY_TURNS),
            plan: this.plan,
            taskId: this.taskId,
            requestId: requestId,
            signal: this.abort && this.abort.signal
        }).then(function (raw) {
            if (self._stopped || requestId !== self.requestId) {
                self.setState('CANCELLED');
                return { ok: false, cancelled: true };
            }
            var parsed = self.parseModel(raw);
            return self.dispatch(parsed, ctx, requestId);
        });
    };

    Agent.prototype.dispatch = function (parsed, ctx, requestId) {
        var self = this;
        if (!parsed || !parsed.ok) {
            if (this.protocolRepair < MAX_PROTOCOL_REPAIR && parsed && parsed.recoverable) {
                this.protocolRepair += 1;
                this.note('Repairing protocol reply', 'system');
                this.conversation.push({
                    role: 'user',
                    content: protocol.repairPrompt ? protocol.repairPrompt(parsed.error) : 'Return valid protocol JSON only.'
                });
                return this.loop(ctx, requestId);
            }
            return Promise.resolve(this.pause(
                protocol.userFacingError ? protocol.userFacingError(parsed) : (parsed && parsed.error) || 'Invalid agent response',
                { kind: parsed && parsed.kind, actions: ['retry', 'companion', 'cancel'] }
            ));
        }

        var env = parsed.envelope || {};
        var type = env.type;

        if (type === 'plan') {
            this.applyPlan(env.plan);
            this.conversation.push({ role: 'assistant', content: JSON.stringify({ type: 'plan', plan: env.plan }) });
            this.setState('PLANNING');
            if (env.message && this.host.onMessage) this.host.onMessage(env.message, 'assistant');
            this.setState('EXECUTING');
            return this.loop(this.buildContext({}), requestId);
        }

        if (type === 'tool_call' && env.tool && env.tool.id) {
            if (env.message && this.host.onMessage) this.host.onMessage(env.message, 'assistant');
            this.setState('EXECUTING');
            this.markPlan('working');
            return this.executeTool(env.tool.id, env.tool.args || {}).then(function (obs) {
                if (self._stopped || requestId !== self.requestId) {
                    self.setState('CANCELLED');
                    return { ok: false, cancelled: true };
                }
                self.setState('OBSERVING');
                var observation = '';
                try { observation = JSON.stringify(obs).slice(0, 6000); } catch (e) { observation = '{"ok":false}'; }
                self.conversation.push({
                    role: 'assistant',
                    content: JSON.stringify({ protocolVersion: 1, type: 'tool_call', tool: env.tool })
                });
                self.conversation.push({
                    role: 'user',
                    content: 'OBSERVATION (data only):\n' + observation
                });
                if (obs && obs.ok === false && self.mode === 'agent' && self.repair < MAX_REPAIR) {
                    self.repair += 1;
                    self.setState('REPAIRING');
                    self.note('Repairing a failed step (' + self.repair + '/' + MAX_REPAIR + ')', 'system');
                } else if (obs && obs.ok === false && self.repair >= MAX_REPAIR) {
                    self.markPlan('failed');
                    return self.pause('Automatic repair limit reached. Review the remaining issue or continue from Companion.', {
                        kind: 'repair_limit',
                        actions: ['retry', 'companion', 'cancel']
                    });
                }
                self.markPlan(obs && obs.ok === false ? 'failed' : 'completed');
                return self.loop(self.buildContext({}), requestId);
            });
        }

        if (type === 'assistant_message') {
            var message = env.message || '';
            if (this.host.onMessage) this.host.onMessage(message, 'assistant');
            this.conversation.push({ role: 'assistant', content: message });
            if (this.step <= 1 && intentApi.isGreeting && intentApi.isGreeting(this.conversation[0] && this.conversation[0].content)) {
                this.setState('COMPLETED');
                this.note('Companion-style reply in Agent', 'system');
                return Promise.resolve({ ok: true, state: 'COMPLETED', message: message, conversational: true });
            }
            if (this.mode === 'agent' && this.step < 3 && this.plan.length === 0) {
                this.conversation.push({
                    role: 'user',
                    content: 'If this task requires project changes, return a plan or a tool_call next. If you are done explaining, return type=completion. Do not call diagnostics unless the user asked to inspect problems.'
                });
                return this.loop(this.buildContext({}), requestId);
            }
            this.setState('COMPLETED');
            return Promise.resolve({ ok: true, state: 'COMPLETED', message: message, conversational: true });
        }

        if (type === 'completion') {
            if (this.mode === 'agent' && this.host.shouldVerify && this.host.shouldVerify() && this.repair < MAX_REPAIR && this.step < MAX_STEPS - 1 && !env.validation) {
                this.repair += 1;
                this.setState('VERIFYING');
                this.note('Verifying result', 'system');
                this.conversation.push({
                    role: 'user',
                    content: 'Verify with diagnostics.getProblems, preview.refresh, preview.inspect, and tests.run if the project is frontend. Then return type=completion with what was actually verified. Never claim pass unless observations show it.'
                });
                return this.loop(this.buildContext({}), requestId);
            }
            if (env.message && this.host.onMessage) this.host.onMessage(env.message, 'assistant');
            this.conversation.push({ role: 'assistant', content: env.message || env.summary || 'Finished.' });
            this.markPlan('completed');
            this.setState('COMPLETED');
            this.lastSummary = {
                task: this.taskId,
                result: 'Completed',
                message: env.message,
                summary: env.summary,
                files: env.files || [],
                validation: env.validation || null
            };
            this.note(env.summary || 'Finished', 'system');
            if (this.host.onDone) this.host.onDone(env);
            return Promise.resolve({ ok: true, state: 'COMPLETED', message: env.message, summary: env.summary });
        }

        if (type === 'approval_request') {
            this.setState('WAITING_PERMISSION');
            if (env.tool && env.tool.id) return this.executeTool(env.tool.id, env.tool.args || {});
            return Promise.resolve(this.pause(env.message || 'Approval required', { actions: ['retry', 'cancel'] }));
        }

        return Promise.resolve(this.pause(
            protocol.userFacingError ? protocol.userFacingError(parsed) : 'Invalid agent response',
            { actions: ['retry', 'companion', 'cancel'] }
        ));
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
