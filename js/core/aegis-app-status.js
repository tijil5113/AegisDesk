/**
 * Aegis app status contract.
 * Apps may expose getDesktopStatus / getDockStatus / getLiveActivity.
 * No status: icon and name only. Never invent metrics.
 */
(function (global) {
    'use strict';

    var providers = Object.create(null);
    var listeners = [];
    var lastLive = [];
    var timer = null;

    function reduced() {
        return document.documentElement.classList.contains('aegis-reduced-motion')
            || document.body.classList.contains('performance-mode')
            || document.hidden;
    }

    function register(appId, api) {
        if (!appId || !api) return;
        providers[appId] = api;
    }

    function call(appId, method) {
        var api = providers[appId];
        if (!api || typeof api[method] !== 'function') return null;
        try { return api[method]() || null; } catch (e) { return null; }
    }

    function getDesktopStatus(appId) {
        return call(appId, 'getDesktopStatus');
    }

    function getDockStatus(appId) {
        return call(appId, 'getDockStatus') || getDesktopStatus(appId);
    }

    function collectLive() {
        var rows = [];
        Object.keys(providers).forEach(function (id) {
            var item = call(id, 'getLiveActivity');
            if (!item) return;
            if (Array.isArray(item)) item.forEach(function (row) { if (row) rows.push(Object.assign({ appId: id }, row)); });
            else rows.push(Object.assign({ appId: id }, item));
        });
        return rows;
    }

    function notify() {
        lastLive = collectLive();
        listeners.forEach(function (fn) {
            try { fn(lastLive); } catch (e) { /* isolate */ }
        });
        document.dispatchEvent(new CustomEvent('aegisstatuschange', { detail: { live: lastLive } }));
    }

    function schedule() {
        if (timer) clearTimeout(timer);
        timer = setTimeout(function () {
            if (!document.hidden) notify();
            schedule();
        }, reduced() ? 4000 : 1800);
    }

    function subscribe(fn) {
        if (typeof fn !== 'function') return function () {};
        listeners.push(fn);
        fn(lastLive);
        if (listeners.length === 1) {
            notify();
            schedule();
        }
        return function () {
            listeners = listeners.filter(function (item) { return item !== fn; });
            if (!listeners.length && timer) { clearTimeout(timer); timer = null; }
        };
    }

    function notesList() {
        try {
            if (global.AegisActions && AegisActions.getNotes) return AegisActions.getNotes() || [];
        } catch (e) { /* ignore */ }
        try {
            if (global.storage) return storage.get('notes', []) || [];
        } catch (e) { return []; }
        return [];
    }

    function tasksList() {
        try {
            if (global.AegisActions && AegisActions.getTasks) return AegisActions.getTasks() || [];
        } catch (e) { /* ignore */ }
        try {
            if (global.storage) return storage.get('tasks', []) || [];
        } catch (e) { return []; }
        return [];
    }

    function isToday(value) {
        if (!value) return false;
        var d = new Date(value);
        if (Number.isNaN(d.getTime())) return false;
        var now = new Date();
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    }

    function isDueToday(task) {
        if (!task || task.completed || task.done) return false;
        var due = task.due || task.dueDate || task.date;
        if (!due) return false;
        return isToday(due) || (new Date(due).getTime() < Date.now() && !Number.isNaN(new Date(due).getTime()));
    }

    register('tasks', {
        getDesktopStatus: function () {
            var tasks = tasksList();
            var remaining = tasks.filter(function (t) { return t && !t.completed && !t.done; });
            var due = remaining.filter(isDueToday);
            if (!tasks.length) return null;
            if (due.length) return { label: due.length + ' due', tone: 'attention' };
            if (remaining.length) return { label: remaining.length + ' open' };
            return { label: 'All clear' };
        },
        getLiveActivity: function () { return null; }
    });

    register('notes', {
        getDesktopStatus: function () {
            var notes = notesList();
            if (!notes.length) return null;
            var latest = notes.slice().sort(function (a, b) {
                return (b.updatedAt || b.updated || b.createdAt || 0) - (a.updatedAt || a.updated || a.createdAt || 0);
            })[0];
            if (!latest) return { label: notes.length + ' notes' };
            return { label: String(latest.title || 'Untitled').slice(0, 22) };
        }
    });

    register('calendar', {
        getDesktopStatus: function () {
            var engine = global.calendarEngine;
            if (!engine || typeof engine.getEvents !== 'function' && !Array.isArray(engine.events)) return null;
            var events = Array.isArray(engine.events) ? engine.events : [];
            var now = Date.now();
            var next = events
                .map(function (ev) { return { ev: ev, t: new Date(ev.start || ev.date || ev.startTime).getTime() }; })
                .filter(function (row) { return Number.isFinite(row.t) && row.t >= now - 3600000; })
                .sort(function (a, b) { return a.t - b.t; })[0];
            if (!next) return events.length ? { label: events.length + ' events' } : null;
            return { label: String(next.ev.title || 'Next event').slice(0, 22) };
        }
    });

    register('mail', {
        getDesktopStatus: function () {
            var app = global.mailApp;
            if (!app) return null;
            if (app.composeSending) return { label: 'Sending', tone: 'live' };
            var unread = 0;
            if (Array.isArray(app.inbox)) unread = app.inbox.filter(function (m) { return m && m.unread; }).length;
            else if (app.engine && Array.isArray(app.engine.inbox)) unread = app.engine.inbox.filter(function (m) { return m && m.unread; }).length;
            return unread ? { label: unread + ' unread', tone: 'attention' } : null;
        },
        getLiveActivity: function () {
            var app = global.mailApp;
            if (!app) return null;
            if (app.composeSending) {
                return { id: 'mail-send', title: 'Mail', detail: 'Sending message…', progress: null, action: 'mail' };
            }
            if (app._sentAt && Date.now() - app._sentAt < 4000) {
                return { id: 'mail-sent', title: 'Mail', detail: 'Message sent', action: 'mail' };
            }
            return null;
        }
    });

    register('music', {
        getDesktopStatus: function () {
            var engine = global.musicEngine || (global.musicPlayerApp && musicPlayerApp.engine);
            if (!engine || !engine.currentTrack) return null;
            return { label: engine.isPlaying ? 'Playing' : 'Paused' };
        },
        getLiveActivity: function () {
            var engine = global.musicEngine || (global.musicPlayerApp && musicPlayerApp.engine);
            if (!engine || !engine.currentTrack) return null;
            var track = engine.currentTrack;
            var name = track.title || track.name || track.videoTitle || '';
            if (!name) return null;
            return {
                id: 'music-now',
                title: 'Music',
                detail: (engine.isPlaying ? 'Playing' : 'Paused') + ' · ' + String(name).slice(0, 36),
                action: 'music'
            };
        }
    });

    register('code-editor', {
        getDesktopStatus: function () {
            var live = global.AegisLive && AegisLive.agent;
            if (live && live.active) return { label: 'Agent working', tone: 'live' };
            var studio = global.AegisCodeStudio;
            if (studio && studio.agent && studio.agent.isLive && studio.agent.isLive()) {
                return { label: 'Agent working', tone: 'live' };
            }
            return null;
        },
        getLiveActivity: function () {
            var live = global.AegisLive && AegisLive.agent;
            if (live && live.active) {
                return {
                    id: 'agent',
                    title: 'Aegis Agent',
                    detail: live.detail || 'Working',
                    progress: live.progress,
                    action: 'code-editor'
                };
            }
            var studio = global.AegisCodeStudio;
            if (studio && studio.agent && studio.agent.isLive && studio.agent.isLive()) {
                var step = studio.agent.step || 0;
                var plan = (studio.agent.plan || []).length || 0;
                return {
                    id: 'agent',
                    title: 'Aegis Agent',
                    detail: plan ? ('Step ' + step + ' of ' + plan) : (studio.agent.state || 'Working'),
                    action: 'code-editor'
                };
            }
            if (live && !live.active && live._doneAt && Date.now() - live._doneAt < 3500) {
                return { id: 'agent-done', title: 'Aegis Agent', detail: 'Finished', action: 'code-editor' };
            }
            return null;
        }
    });

    document.addEventListener('visibilitychange', function () {
        if (!document.hidden) notify();
    });

    global.AegisAppStatus = {
        register: register,
        getDesktopStatus: getDesktopStatus,
        getDockStatus: getDockStatus,
        live: function () { return lastLive; },
        collectLive: collectLive,
        subscribe: subscribe,
        refresh: notify
    };

    global.AegisLive = global.AegisLive || { agent: null };

    window.addEventListener('message', function (event) {
        if (event.origin !== window.location.origin) return;
        var data = event.data;
        if (!data || data.source !== 'aegis-code-studio' || data.type !== 'agent-status') return;
        global.AegisLive = global.AegisLive || {};
        if (data.active) {
            global.AegisLive.agent = {
                active: true,
                detail: data.detail || 'Working',
                progress: data.progress
            };
        } else {
            global.AegisLive.agent = {
                active: false,
                detail: data.detail || 'Finished',
                _doneAt: Date.now()
            };
        }
        notify();
    });
})(typeof window !== 'undefined' ? window : this);
