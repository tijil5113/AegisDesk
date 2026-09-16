/**
 * Aegis Intelligence — Spec 3 system surface.
 * Deterministic commands first. AI maps to the action registry only.
 */
(function (global) {
    'use strict';

    var HISTORY_KEY = 'aegis_intel_history';
    var MAX_HISTORY = 20;
    var overlay = null;
    var inputEl = null;
    var resultsEl = null;
    var prevFocus = null;
    var busy = false;

    function prefs() {
        return (global.AegisOS && global.AegisOS.prefs) ? global.AegisOS.prefs.get() : { aiEnabled: true };
    }

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function reducedMotion() {
        return document.documentElement.classList.contains('aegis-reduced-motion')
            || (global.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function loadHistory() {
        if (!global.storage) return [];
        var rows = storage.get(HISTORY_KEY, []) || [];
        return Array.isArray(rows) ? rows.slice(0, MAX_HISTORY) : [];
    }

    function saveHistory(rows) {
        if (!global.storage) return;
        storage.set(HISTORY_KEY, (rows || []).slice(0, MAX_HISTORY));
    }

    function pushHistory(query, resultText) {
        var rows = loadHistory();
        rows.unshift({
            q: String(query || '').slice(0, 140),
            r: String(resultText || '').slice(0, 180),
            t: Date.now()
        });
        saveHistory(rows);
    }

    function parseDeterministic(raw) {
        var q = String(raw || '').trim();
        if (!q) return null;
        var lower = q.toLowerCase().replace(/[?.!]+$/g, '').trim();

        var openMatch = lower.match(/^(?:open|launch|show|go to)\s+(.+)$/);
        if (openMatch && global.AegisActions) {
            var target = openMatch[1].replace(/^(the|my|an?)\s+/, '').trim();
            if (target === 'aegis intelligence' || target === 'intelligence') {
                return { id: 'intelligence.open', args: {} };
            }
            var appId = global.AegisActions.resolveAppId(target);
            if (appId) return { id: 'apps.open', args: { appId: appId } };
        }

        if (/^(dark|night)\s*(mode|theme)?$/.test(lower) || /switch to dark/.test(lower) || /use dark theme/.test(lower)) {
            return { id: 'settings.setTheme', args: { theme: 'dark' } };
        }
        if (/^(light|day)\s*(mode|theme)?$/.test(lower) || /switch to light/.test(lower)) {
            return { id: 'settings.setTheme', args: { theme: 'light' } };
        }
        if (/^(cycle|change|toggle)\s+theme/.test(lower)) {
            return { id: 'settings.setTheme', args: {} };
        }

        var noteCreate = q.match(/^(?:create|new|add|make)\s+(?:a\s+)?note(?:\s+(?:called|titled|about|named)\s+(.+))?$/i);
        if (noteCreate) {
            return { id: 'notes.create', args: { title: (noteCreate[1] || 'Untitled').trim() } };
        }
        if (/^open (?:my )?notes$/.test(lower)) return { id: 'notes.open', args: {} };

        var noteFind = q.match(/^(?:find|search|show)\s+notes?\s+(?:containing|about|with|for)\s+(.+)$/i);
        if (noteFind) return { id: 'notes.search', args: { query: noteFind[1].trim() } };

        var taskCreate = q.match(/^(?:create|add|new|make)\s+(?:a\s+)?task(?:\s+to\s+)?(.+)?$/i);
        if (taskCreate) {
            var text = (taskCreate[1] || '').replace(/^to\s+/i, '').trim();
            if (text) return { id: 'tasks.create', args: { text: text } };
        }
        if (/^open (?:my )?tasks$/.test(lower)) return { id: 'apps.open', args: { appId: 'tasks' } };

        var musicSearch = q.match(/^(?:search\s+(?:music|youtube|songs?)\s+(?:for\s+)?|play\s+)(.+)$/i);
        if (musicSearch) return { id: 'music.search', args: { query: musicSearch[1].trim() } };

        var mailCompose = q.match(/^(?:compose|draft|write)\s+(?:an?\s+)?(?:email|mail)(?:\s+to\s+(\S+))?(?:\s+about\s+(.+))?$/i);
        if (mailCompose) {
            return {
                id: 'mail.compose',
                args: {
                    to: (mailCompose[1] || '').replace(/[<>]/g, ''),
                    subject: mailCompose[2] || '',
                    body: mailCompose[2] ? ('About ' + mailCompose[2]) : ''
                }
            };
        }

        if (/^enter focus/.test(lower) || /^start focus/.test(lower) || lower === 'focus mode') {
            var mins = q.match(/(\d+)\s*(?:min|minutes?)/i);
            return { id: 'focus.enter', args: { minutes: mins ? Number(mins[1]) : 25 } };
        }
        if (/^(exit|end|stop|leave) focus/.test(lower)) return { id: 'focus.exit', args: {} };

        if (/clipboard/.test(lower)) return { id: 'clipboard.show', args: {} };
        if (/activity (?:center|history)/.test(lower)) return { id: 'activity.show', args: {} };

        var layout = lower.match(/^(?:apply\s+)?(focus|two columns|columns|main \+ side|main and side)\s*layout$/);
        if (layout || /^two columns$/.test(lower) || /^main \+ side$/.test(lower)) {
            var name = (layout && layout[1]) || lower;
            if (name.indexOf('column') !== -1) name = 'columns';
            if (name.indexOf('side') !== -1) name = 'side';
            if (name.indexOf('focus') !== -1) name = 'focus';
            return { id: 'layout.apply', args: { layout: name } };
        }

        var space = lower.match(/^(?:switch to |go to )?space\s+(\d+)$/);
        if (space) return { id: 'spaces.switch', args: { index: Number(space[1]) - 1 } };

        var helpQ = q.match(/^(?:help|show help)(?:\s+for\s+(.+))?$/i);
        if (helpQ) return { id: 'help.open', args: { query: helpQ[1] || 'keyboard' } };

        if (global.AegisActions) {
            var catalog = global.AegisActions.catalog();
            for (var i = 0; i < catalog.length; i++) {
                var a = catalog[i];
                if (lower === a.title.toLowerCase() || (a.aliases || []).some(function (al) { return al === lower; })) {
                    return { id: a.id, args: {} };
                }
            }
        }
        return null;
    }

    function catalogForApi() {
        if (!global.AegisActions) return [];
        return global.AegisActions.catalog().map(function (a) {
            return { id: a.id, title: a.title, description: a.description, args: a.args };
        });
    }

    async function resolveWithAI(query, snippet) {
        var p = prefs();
        if (p.aiEnabled === false) {
            return { type: 'unavailable', message: 'AI-assisted interpretation is turned off in Settings. Deterministic commands still work.' };
        }
        if (global.navigator && navigator.onLine === false) {
            return { type: 'unavailable', message: 'Aegis Intelligence is currently unavailable. You are offline — local commands still work.' };
        }
        try {
            var response = await fetch('/api/intent', {
                method: 'POST',
                credentials: 'same-origin',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    query: String(query).slice(0, 500),
                    snippet: snippet ? String(snippet).slice(0, 2000) : '',
                    catalog: catalogForApi()
                })
            });
            var data = await response.json().catch(function () { return {}; });
            if (response.status === 401) {
                return { type: 'unavailable', message: 'Sign in is required for AI interpretation. Local commands still work.' };
            }
            if (response.status === 503 || data.code === 'not_configured' || data.code === 'invalid_key' || data.code === 'provider_error') {
                return { type: 'unavailable', message: 'Aegis Intelligence is currently unavailable.' };
            }
            if (!response.ok) {
                return { type: 'unavailable', message: data.error || 'Aegis Intelligence is currently unavailable.' };
            }
            if (data.type !== 'action' || !data.action) {
                return { type: 'unknown', message: data.message || 'That request is not a supported AegisDesk action.' };
            }
            var checked = global.AegisActions.validate(data.action, data.args || {});
            if (!checked.ok) {
                return { type: 'unknown', message: 'The suggested action was rejected.' };
            }
            return { type: 'action', id: data.action, args: checked.args, message: data.message || '' };
        } catch (err) {
            return { type: 'unavailable', message: 'Aegis Intelligence is currently unavailable.' };
        }
    }

    function setStatus(html, isError) {
        if (!resultsEl) return;
        resultsEl.innerHTML = '<div class="aegis-intel-status' + (isError ? ' is-error' : '') + '" role="status">' + html + '</div>';
    }

    function renderSuggestions() {
        var items = [
            'Open Notes',
            'Create a task to call Dad tomorrow',
            'Compose an email',
            'Search Music for Interstellar soundtrack',
            'Switch to dark theme',
            'Open Calculator',
            'Show Help for keyboard shortcuts'
        ];
        resultsEl.innerHTML = '<div class="aegis-intel-hint">Local commands run immediately. Natural language uses the action registry — never arbitrary code.</div>'
            + '<div class="aegis-intel-suggestions">'
            + items.map(function (s) {
                return '<button type="button" class="aegis-intel-chip" data-fill="' + escapeHtml(s) + '">' + escapeHtml(s) + '</button>';
            }).join('')
            + '</div>';
        var history = loadHistory();
        if (history.length) {
            resultsEl.innerHTML += '<div class="aegis-intel-section-label">Recent</div>'
                + history.slice(0, 6).map(function (h) {
                    return '<button type="button" class="aegis-intel-history" data-fill="' + escapeHtml(h.q) + '"><strong>' + escapeHtml(h.q) + '</strong><span>' + escapeHtml(h.r) + '</span></button>';
                }).join('');
        }
    }

    function ensure() {
        if (overlay) return overlay;
        overlay = document.createElement('div');
        overlay.id = 'aegis-intel-overlay';
        overlay.className = 'aegis-intel-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML =
            '<div class="aegis-intel-panel" role="dialog" aria-modal="true" aria-labelledby="aegis-intel-title">' +
            '<header class="aegis-intel-header">' +
            '<div><p class="aegis-intel-kicker">Aegis Intelligence</p><h2 id="aegis-intel-title">What do you need?</h2></div>' +
            '<button type="button" class="aegis-btn aegis-btn-ghost" id="aegis-intel-close" aria-label="Close Aegis Intelligence">Close</button>' +
            '</header>' +
            '<form class="aegis-intel-form" id="aegis-intel-form">' +
            '<label class="visually-hidden" for="aegis-intel-input">Request</label>' +
            '<input id="aegis-intel-input" class="aegis-intel-input" type="text" autocomplete="off" placeholder="Open Mail, create a task, compose an email…" />' +
            '<button type="submit" class="aegis-btn aegis-btn-primary" id="aegis-intel-go">Go</button>' +
            '</form>' +
            '<p class="aegis-intel-fineprint">Deterministic commands stay on this device. AI interpretation sends only this request and the action catalog — not your full notes, tasks, or clipboard.</p>' +
            '<div id="aegis-intel-results" class="aegis-intel-results" role="region" aria-live="polite"></div>' +
            '</div>';
        document.body.appendChild(overlay);
        inputEl = overlay.querySelector('#aegis-intel-input');
        resultsEl = overlay.querySelector('#aegis-intel-results');
        overlay.querySelector('#aegis-intel-close').addEventListener('click', hide);
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) hide();
        });
        overlay.querySelector('#aegis-intel-form').addEventListener('submit', function (e) {
            e.preventDefault();
            submit(inputEl.value);
        });
        resultsEl.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-fill]');
            if (btn) {
                inputEl.value = btn.getAttribute('data-fill') || '';
                inputEl.focus();
                return;
            }
            var runBtn = e.target.closest('[data-run-action]');
            if (runBtn) {
                global.AegisActions.run(runBtn.getAttribute('data-run-action'), JSON.parse(runBtn.getAttribute('data-args') || '{}'));
            }
        });
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') {
                e.preventDefault();
                hide();
            }
        });
        return overlay;
    }

    function show(seed) {
        ensure();
        prevFocus = document.activeElement;
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden', 'false');
        renderSuggestions();
        if (seed) inputEl.value = seed;
        setTimeout(function () { inputEl.focus(); }, reducedMotion() ? 0 : 40);
    }

    function hide() {
        if (!overlay) return;
        overlay.classList.remove('visible');
        overlay.setAttribute('aria-hidden', 'true');
        if (prevFocus && typeof prevFocus.focus === 'function') {
            try { prevFocus.focus(); } catch (e) { /* ignore */ }
        }
    }

    function toggle() {
        if (overlay && overlay.classList.contains('visible')) hide();
        else show();
    }

    async function submit(raw) {
        var query = String(raw || '').trim();
        if (!query || busy) return;
        busy = true;
        setStatus('<strong>Working</strong><span>Resolving against supported actions…</span>');
        try {
            var local = parseDeterministic(query);
            if (local) {
                var localResult = await global.AegisActions.run(local.id, local.args);
                var msg = localResult.cancelled
                    ? 'Action cancelled.'
                    : (localResult.message || localResult.error || '');
                setStatus('<strong>' + escapeHtml(localResult.success ? 'Done' : (localResult.cancelled ? 'Cancelled' : 'Could not complete')) + '</strong><span>' + escapeHtml(msg) + '</span>', !localResult.success && !localResult.cancelled);
                pushHistory(query, msg);
                busy = false;
                if (localResult.success) setTimeout(hide, 650);
                return;
            }
            var ai = await resolveWithAI(query);
            if (ai.type === 'action') {
                var def = global.AegisActions.get(ai.id);
                if (def && def.risk >= 3) {
                    resultsEl.innerHTML =
                        '<div class="aegis-intel-preview">' +
                        '<strong>Review before continuing</strong>' +
                        '<p>' + escapeHtml(def.description) + '</p>' +
                        '<pre>' + escapeHtml(JSON.stringify(ai.args, null, 2)) + '</pre>' +
                        '<p>External actions are prepared only. Mail is never sent automatically.</p>' +
                        '<button type="button" class="aegis-btn aegis-btn-primary" data-run-action="' + escapeHtml(ai.id) + '" data-args="' + escapeHtml(JSON.stringify(ai.args)) + '">Continue</button>' +
                        '</div>';
                    pushHistory(query, 'Needs confirmation: ' + def.title);
                    busy = false;
                    return;
                }
                var aiResult = await global.AegisActions.run(ai.id, ai.args);
                var aiMsg = aiResult.cancelled ? 'Action cancelled.' : (aiResult.message || aiResult.error || ai.message || '');
                setStatus('<strong>' + escapeHtml(aiResult.success ? 'Done' : (aiResult.cancelled ? 'Cancelled' : 'Could not complete')) + '</strong><span>' + escapeHtml(aiMsg) + '</span>', !aiResult.success && !aiResult.cancelled);
                pushHistory(query, aiMsg);
                if (aiResult.success) setTimeout(hide, 650);
            } else {
                setStatus('<strong>' + (ai.type === 'unavailable' ? 'Unavailable' : 'Unknown request') + '</strong><span>' + escapeHtml(ai.message) + '</span>', true);
                pushHistory(query, ai.message);
            }
        } finally {
            busy = false;
        }
    }

    function showSearchResults(kind, query, matches) {
        show();
        var list = (matches || []).slice(0, 8).map(function (item) {
            return '<li>' + escapeHtml(item.title || item.text || item.id) + '</li>';
        }).join('');
        resultsEl.innerHTML = '<div class="aegis-intel-status"><strong>Local ' + escapeHtml(kind) + ' search</strong><span>' + escapeHtml(query) + '</span></div>'
            + (list ? '<ul class="aegis-intel-list">' + list + '</ul>' : '<p>No matches.</p>');
    }

    function clearHistory() {
        saveHistory([]);
        if (overlay && overlay.classList.contains('visible')) renderSuggestions();
    }

    global.AegisIntelligence = {
        show: show,
        hide: hide,
        toggle: toggle,
        submit: submit,
        parseDeterministic: parseDeterministic,
        resolveWithAI: resolveWithAI,
        showSearchResults: showSearchResults,
        clearHistory: clearHistory
    };
})(typeof window !== 'undefined' ? window : globalThis);
