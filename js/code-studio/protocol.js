/**
 * Aegis Code Studio — Agent protocol v1.
 * Structured envelopes only. Model prose is never executable.
 */
(function (root, factory) {
    var api = factory();
    if (typeof module === 'object' && module.exports) module.exports = api;
    root.AegisStudio = root.AegisStudio || {};
    root.AegisStudio.protocol = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    'use strict';

    var PROTOCOL_VERSION = 1;
    var MAX_MESSAGE = 8000;
    var MAX_SUMMARY = 600;
    var MAX_PLAN = 12;

    var TYPES = {
        assistant_message: true,
        plan: true,
        tool_call: true,
        tool_result: true,
        approval_request: true,
        completion: true,
        error: true
    };

    var LEGACY = {
        message: 'assistant_message',
        tool: 'tool_call',
        done: 'completion'
    };

    function asString(value, max) {
        if (typeof value !== 'string') return '';
        return value.slice(0, max == null ? MAX_MESSAGE : max);
    }

    function looksLikeProse(text) {
        var t = String(text || '').trim();
        if (!t) return false;
        if (t.charAt(0) === '{' || t.charAt(0) === '[') return false;
        return /[A-Za-z]/.test(t);
    }

    function stripFence(text) {
        return String(text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }

    function tryParseJson(text) {
        if (typeof text !== 'string' || !text.trim()) return null;
        var trimmed = stripFence(text);
        try {
            return JSON.parse(trimmed);
        } catch (_) {
            var start = trimmed.indexOf('{');
            var end = trimmed.lastIndexOf('}');
            if (start < 0 || end <= start) return null;
            try {
                return JSON.parse(trimmed.slice(start, end + 1));
            } catch (e2) {
                return { __truncated: true, raw: trimmed.slice(0, 400) };
            }
        }
    }

    function normalizePlan(plan) {
        if (!Array.isArray(plan)) return [];
        return plan.slice(0, MAX_PLAN).map(function (step, i) {
            if (typeof step === 'string') {
                return { id: String(i + 1), title: step.slice(0, 160), state: 'queued' };
            }
            return {
                id: String((step && step.id) || i + 1),
                title: asString((step && (step.title || step.label || step)) || ('Step ' + (i + 1)), 160),
                state: asString((step && step.state) || 'queued', 32) || 'queued'
            };
        });
    }

    function extractTool(obj) {
        if (!obj || typeof obj !== 'object') return null;
        var tool = obj.tool && typeof obj.tool === 'object' ? obj.tool : null;
        if (!tool && obj.tool_call && typeof obj.tool_call === 'object') tool = obj.tool_call;
        if (!tool && typeof obj.toolId === 'string') {
            tool = { id: obj.toolId, args: obj.args || obj.arguments || {} };
        }
        if (!tool) return null;
        var id = asString(tool.id || tool.name || tool.tool, 80);
        if (!id) return null;
        var args = tool.args || tool.arguments || tool.input;
        if (args == null || typeof args !== 'object' || Array.isArray(args)) args = {};
        return { id: id, args: args };
    }

    function envelope(type, fields) {
        var out = {
            protocolVersion: PROTOCOL_VERSION,
            type: type
        };
        var key;
        for (key in fields) {
            if (Object.prototype.hasOwnProperty.call(fields, key) && fields[key] != null) {
                out[key] = fields[key];
            }
        }
        return out;
    }

    function conversational(text) {
        return {
            ok: true,
            kind: 'conversation',
            recoverable: true,
            envelope: envelope('assistant_message', {
                message: asString(text, MAX_MESSAGE),
                executable: false
            })
        };
    }

    function malformed(reason, extra) {
        extra = extra || {};
        return {
            ok: false,
            kind: extra.kind || 'malformed',
            recoverable: extra.recoverable !== false,
            error: reason,
            envelope: envelope('error', {
                message: reason,
                code: extra.code || 'malformed'
            })
        };
    }

    function normalizeEnvelope(obj, allowedTools) {
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
            return malformed('Response was not a protocol object', { kind: 'malformed' });
        }
        if (obj.__truncated) {
            return malformed('Response JSON was truncated', { kind: 'truncated', code: 'truncated' });
        }
        var type = asString(obj.type, 40);
        if (LEGACY[type]) type = LEGACY[type];
        if (!TYPES[type]) {
            if (extractTool(obj)) type = 'tool_call';
            else if (Array.isArray(obj.plan) && obj.plan.length) type = 'plan';
            else if (obj.message || obj.summary) type = obj.summary && !obj.message ? 'completion' : 'assistant_message';
            else type = 'assistant_message';
        }

        var message = asString(obj.message || obj.content || obj.text || '', MAX_MESSAGE);
        var summary = asString(obj.summary, MAX_SUMMARY);
        var plan = normalizePlan(obj.plan);
        var tool = extractTool(obj);

        if (type === 'tool_call') {
            if (!tool || !tool.id) {
                return malformed('Tool call was missing a known tool id', { kind: 'invalid_tool', code: 'invalid_tool' });
            }
            if (allowedTools && allowedTools.length && allowedTools.indexOf(tool.id) < 0) {
                return malformed('Unknown tool: ' + tool.id, { kind: 'unknown_tool', code: 'unknown_tool', recoverable: true });
            }
            return {
                ok: true,
                kind: 'tool_call',
                recoverable: false,
                envelope: envelope('tool_call', {
                    tool: tool,
                    message: message,
                    summary: summary
                })
            };
        }

        if (type === 'plan') {
            return {
                ok: true,
                kind: 'plan',
                envelope: envelope('plan', { plan: plan, message: message, summary: summary })
            };
        }

        if (type === 'completion') {
            return {
                ok: true,
                kind: 'completion',
                envelope: envelope('completion', {
                    message: message || summary || 'Finished.',
                    summary: summary,
                    validation: obj.validation || null,
                    files: Array.isArray(obj.files) ? obj.files.slice(0, 40) : []
                })
            };
        }

        if (type === 'error') {
            return {
                ok: false,
                kind: 'error',
                recoverable: true,
                error: message || 'Agent error',
                envelope: envelope('error', { message: message || 'Agent error', code: asString(obj.code, 40) || 'error' })
            };
        }

        if (type === 'approval_request') {
            return {
                ok: true,
                kind: 'approval_request',
                envelope: envelope('approval_request', { message: message || 'Approval required', tool: tool })
            };
        }

        return {
            ok: true,
            kind: 'conversation',
            envelope: envelope('assistant_message', {
                message: message || summary,
                executable: false
            })
        };
    }

    function parse(raw, options) {
        options = options || {};
        var allowedTools = options.allowedTools || null;
        if (raw == null || raw === '') {
            return malformed('Empty response', { kind: 'empty', code: 'empty' });
        }
        if (typeof raw === 'object' && !Array.isArray(raw)) {
            return normalizeEnvelope(raw, allowedTools);
        }
        var text = String(raw).trim();
        if (text === '[object Object]') {
            return malformed('Unstructured object response', { kind: 'malformed', code: 'malformed' });
        }
        var parsed = tryParseJson(text);
        if (parsed && !parsed.__truncated) {
            return normalizeEnvelope(parsed, allowedTools);
        }
        if (parsed && parsed.__truncated) {
            if (looksLikeProse(text) && text.indexOf('{') < 0) return conversational(text);
            return malformed('Response JSON was truncated', { kind: 'truncated', code: 'truncated' });
        }
        if (looksLikeProse(text)) return conversational(text);
        return malformed('Could not parse agent protocol', { kind: 'malformed', code: 'malformed' });
    }

    function repairPrompt(reason) {
        return [
            'PROTOCOL REPAIR: Your previous reply was not a valid Aegis Agent protocol envelope.',
            'Reason: ' + asString(reason, 300),
            'Return JSON only with protocolVersion 1 and type of plan, tool_call, assistant_message, or completion.',
            'Example tool: {"protocolVersion":1,"type":"tool_call","tool":{"id":"project.listFiles","args":{}}}',
            'Example done: {"protocolVersion":1,"type":"completion","message":"...","summary":"..."}',
            'Do not wrap in markdown. Do not invent tool ids. Do not execute anything yourself.'
        ].join('\n');
    }

    function userFacingError(parsed) {
        if (!parsed) return 'Aegis Agent paused because the model reply was unusable.';
        if (parsed.kind === 'empty') return 'Aegis Agent received an empty reply. Your project was not changed by that step.';
        if (parsed.kind === 'truncated') return 'Aegis Agent received a truncated reply and did not execute it.';
        if (parsed.kind === 'unknown_tool') return 'Aegis Agent requested an unsupported tool. Nothing was executed.';
        if (parsed.kind === 'invalid_tool') return 'Aegis Agent sent an incomplete tool call. Nothing was executed.';
        return parsed.error || 'Aegis Agent paused on an invalid reply. Nothing unsafe was executed.';
    }

    return {
        PROTOCOL_VERSION: PROTOCOL_VERSION,
        TYPES: Object.keys(TYPES),
        asString: asString,
        parse: parse,
        repairPrompt: repairPrompt,
        userFacingError: userFacingError,
        envelope: envelope,
        conversational: conversational
    };
});
