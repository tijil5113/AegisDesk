/**
 * AegisDesk Ultimate Desktop OS — information architecture, widgets,
 * dock, live activity, command center glue, customization.
 * Preserves window-manager, registry, and app contracts.
 */
(function (global) {
    'use strict';

    var PREFS_KEY = 'aegis_desktop_os';
    var WELCOME_KEY = 'aegis_desktop_welcome';
    var MARK =
        '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
        '<path class="aegis-mark-ring" d="M32 5.6L53.2 14.4v16.8c0 14.6-9.1 24.8-21.2 29.4C19.9 56 10.8 45.8 10.8 31.2V14.4L32 5.6z" stroke="currentColor" stroke-width="2.7" stroke-linejoin="round" pathLength="100"/>' +
        '<path class="aegis-mark-leg" d="M32 18.2 L20.6 46.6" stroke="#F8FAFC" stroke-width="3.5" stroke-linecap="round"/>' +
        '<path class="aegis-mark-leg" d="M32 18.2 L43.4 46.6" stroke="#F8FAFC" stroke-width="3.5" stroke-linecap="round"/>' +
        '<path class="aegis-mark-slit" d="M24 35.2 H40" stroke="#3EC6D8" stroke-width="2.8" stroke-linecap="round"/>' +
        '</svg>';

    var PRIMARY = [
        { id: 'ai-chat', name: 'Aegis' },
        { id: 'code-editor', name: 'Code Studio' },
        { id: 'mail', name: 'Mail' },
        { id: 'music', name: 'Music' },
        { id: 'files', name: 'Files' },
        { id: 'browser', name: 'Browser' },
        { id: 'calendar', name: 'Calendar' },
        { id: 'tasks', name: 'Tasks' },
        { id: 'notes', name: 'Notes' },
        { id: 'settings', name: 'Settings' },
        { id: 'bookmarks', name: 'Bookmarks' },
        { id: 'calculator', name: 'Calculator' }
    ];

    var CATEGORIES = {
        Productivity: ['tasks', 'notes', 'calendar', 'files', 'world-clock'],
        Creative: ['music', 'drawing', 'gallery'],
        Development: ['code-editor', 'terminal', 'system-monitor'],
        Communication: ['mail', 'ai-chat', 'news-reader', 'news-hub'],
        System: ['settings', 'browser', 'bookmarks', 'calculator', 'weather', 'help', 'user', 'system-intelligence']
    };

    var DEFAULT_PINNED = ['code-editor', 'mail', 'music', 'files', 'browser', 'calendar', 'settings'];

    var DEFAULT_PREFS = {
        widgets: {
            today: true,
            tasks: true,
            notes: true,
            calendar: true,
            world: true,
            continue: true,
            actions: true,
            music: false,
            aegis: false,
            system: false,
            quote: false
        },
        density: 'comfortable',
        labels: true,
        liveActivity: true,
        pinnedDock: DEFAULT_PINNED.slice(),
        showRunningDock: true,
        timeAware: false,
        iconSize: 'medium',
        largerText: false,
        highContrast: false
    };

    var PAPER_NAMES = {
        aurora: 'Aurora',
        midnight: 'Midnight',
        atmosphere: 'Atmosphere',
        horizon: 'Horizon',
        obsidian: 'Obsidian Flow',
        celestial: 'Celestial',
        'light-field': 'Light Field'
    };

    var WIDGET_META = [
        { id: 'today', name: 'Today' },
        { id: 'tasks', name: 'Tasks' },
        { id: 'notes', name: 'Notes' },
        { id: 'calendar', name: 'Calendar' },
        { id: 'world', name: 'World Time' },
        { id: 'continue', name: 'Continue' },
        { id: 'actions', name: 'Quick Actions' },
        { id: 'music', name: 'Music' },
        { id: 'aegis', name: 'Ask Aegis' },
        { id: 'system', name: 'System' },
        { id: 'quote', name: 'Quote' }
    ];

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function reduced() {
        return document.documentElement.classList.contains('aegis-reduced-motion')
            || !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)
            || document.body.classList.contains('performance-mode');
    }

    function loadPrefs() {
        var stored = {};
        try { stored = JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') || {}; } catch (e) { stored = {}; }
        var prefs = Object.assign({}, DEFAULT_PREFS, stored);
        prefs.widgets = Object.assign({}, DEFAULT_PREFS.widgets, stored.widgets || {});
        if (!Array.isArray(prefs.pinnedDock) || !prefs.pinnedDock.length) prefs.pinnedDock = DEFAULT_PINNED.slice();
        return prefs;
    }

    function savePrefs(partial) {
        var next = Object.assign(loadPrefs(), partial || {});
        if (partial && partial.widgets) next.widgets = Object.assign(loadPrefs().widgets, partial.widgets);
        try { localStorage.setItem(PREFS_KEY, JSON.stringify(next)); } catch (e) { /* quota */ }
        applyPrefs(next);
        document.dispatchEvent(new CustomEvent('aegisdesktopchange', { detail: next }));
        return next;
    }

    function appTitle(id) {
        var primary = PRIMARY.find(function (p) { return p.id === id; });
        if (primary) return primary.name;
        if (global.APP_REGISTRY && APP_REGISTRY[id] && APP_REGISTRY[id].title) return APP_REGISTRY[id].title;
        var catalog = (global.AEGIS_APP_CATALOG || []).find(function (c) { return c.id === id; });
        return (catalog && catalog.name) || id;
    }

    function appIcon(id) {
        if (global.AEGIS_APP_ICONS && AEGIS_APP_ICONS[id]) return AEGIS_APP_ICONS[id];
        if (global.APP_REGISTRY && APP_REGISTRY[id] && APP_REGISTRY[id].iconSVG) return APP_REGISTRY[id].iconSVG;
        return MARK;
    }

    function appPurpose(id) {
        var catalog = (global.AEGIS_APP_CATALOG || []).find(function (c) { return c.id === id; });
        return catalog && catalog.description ? catalog.description : '';
    }

    function openApp(id, originEl) {
        if (!id) return;
        if (originEl && global.windowManager) {
            var rect = originEl.getBoundingClientRect();
            windowManager._launchOrigin = {
                x: rect.left + rect.width / 2,
                y: rect.top + rect.height / 2,
                w: rect.width,
                h: rect.height
            };
        }
        if (global.AegisRecent) AegisRecent.recordApp(id);
        if (global.desktop && desktop.openApp) desktop.openApp(id);
        else if (global.APP_REGISTRY && APP_REGISTRY[id] && APP_REGISTRY[id].open) APP_REGISTRY[id].open();
    }

    function notesList() {
        try {
            if (global.AegisActions && AegisActions.getNotes) return AegisActions.getNotes() || [];
        } catch (e) { /* ignore */ }
        return (global.storage && storage.get) ? (storage.get('notes', []) || []) : [];
    }

    function tasksList() {
        try {
            if (global.AegisActions && AegisActions.getTasks) return AegisActions.getTasks() || [];
        } catch (e) { /* ignore */ }
        return (global.storage && storage.get) ? (storage.get('tasks', []) || []) : [];
    }

    function calendarEvents() {
        var engine = global.calendarEngine;
        if (!engine) return [];
        if (Array.isArray(engine.events)) return engine.events;
        return [];
    }

    function nextEvent() {
        var now = Date.now();
        return calendarEvents()
            .map(function (ev) { return { ev: ev, t: new Date(ev.start || ev.date || ev.startTime).getTime() }; })
            .filter(function (row) { return Number.isFinite(row.t) && row.t >= now - 60000; })
            .sort(function (a, b) { return a.t - b.t; })[0] || null;
    }

    function dueTasks() {
        return tasksList().filter(function (t) {
            if (!t || t.completed || t.done) return false;
            var due = t.due || t.dueDate || t.date;
            if (!due) return false;
            var d = new Date(due);
            if (Number.isNaN(d.getTime())) return false;
            var today = new Date();
            return d.getTime() <= new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).getTime();
        });
    }

    function openTasks() {
        return tasksList().filter(function (t) { return t && !t.completed && !t.done; });
    }

    function phaseFromHour(hour) {
        if (hour >= 5 && hour < 8) return 'dawn';
        if (hour >= 8 && hour < 17) return 'day';
        if (hour >= 17 && hour < 20) return 'dusk';
        return 'night';
    }

    function phaseGlyph(phase) {
        return '<span class="aegis-phase-mark" data-phase="' + phase + '" aria-hidden="true"></span>';
    }

    function paperLabel(id) {
        return PAPER_NAMES[id] || String(id || '').replace(/-/g, ' ');
    }

    function relativeLabel(clock) {
        if (clock && clock.relative) return clock.relative;
        return clock && clock.offset ? clock.offset : '';
    }

    /* ---------- SYSTEM BAR ---------- */
    function ensureSystemBar() {
        var bar = document.getElementById('aegis-system-bar');
        if (!bar) {
        bar = document.createElement('header');
        bar.id = 'aegis-system-bar';
        bar.className = 'aegis-system-bar';
        bar.setAttribute('role', 'banner');
        bar.innerHTML =
            '<div class="aegis-bar-left">' +
            '<button type="button" class="aegis-bar-mark" id="aegis-bar-mark" aria-label="AegisDesk home" title="AegisDesk">' + MARK + '</button>' +
            '<div class="aegis-bar-context">' +
            '<strong id="aegis-bar-space">Workspace 1</strong>' +
            '<span id="aegis-bar-app">Desktop</span>' +
            '</div>' +
            '</div>' +
            '<div class="aegis-bar-center">' +
            '<button type="button" class="aegis-activity-capsule" id="aegis-activity-capsule" hidden aria-expanded="false" aria-label="Live activity"></button>' +
            '</div>' +
            '<div class="aegis-bar-right">' +
            '<button type="button" class="aegis-bar-btn" id="aegis-bar-command" aria-label="Command Center" data-tooltip="Command Center">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4 4"/></svg>' +
            '</button>' +
            '<button type="button" class="aegis-bar-btn" id="aegis-bar-focus" aria-label="Focus" data-tooltip="Focus mode" aria-pressed="false">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="2.4"/></svg>' +
            '</button>' +
            '<button type="button" class="aegis-bar-btn" id="aegis-bar-notify" aria-label="Notifications" data-tooltip="Notifications">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M6 16V10a6 6 0 1112 0v6l1.5 2H4.5L6 16z"/><path d="M10 20a2 2 0 004 0"/></svg>' +
            '<span class="aegis-bar-dot" id="aegis-bar-notify-dot" hidden></span>' +
            '</button>' +
            '<button type="button" class="aegis-bar-btn" id="aegis-bar-quick" aria-label="Quick settings" data-tooltip="Quick settings">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="3"/><path d="M12 5v2M12 17v2M5 12h2M17 12h2M7.2 7.2l1.4 1.4M15.4 15.4l1.4 1.4M16.8 7.2l-1.4 1.4M8.6 15.4l-1.4 1.4"/></svg>' +
            '</button>' +
            '<button type="button" class="aegis-bar-clock" id="aegis-bar-clock" aria-haspopup="dialog" aria-expanded="false">' +
            '<time id="aegis-bar-time">00:00</time>' +
            '<span id="aegis-bar-date">Wed 16</span>' +
            '</button>' +
            '<button type="button" class="aegis-bar-btn aegis-bar-profile" id="aegis-bar-profile" aria-label="Account" data-tooltip="Account">' +
            '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="9" r="3"/><path d="M6.5 18c.5-2.6 2.5-4 5.5-4s5 1.4 5.5 4"/></svg>' +
            '</button>' +
            '</div>';
            document.body.insertBefore(bar, document.body.firstChild);
        }
        if (bar && !bar._bound) {
            bar._bound = true;
            try { bindSystemBar(bar); } catch (err) { console.error('AegisDesktopOS system bar bind failed', err); }
        }
        return bar;
    }

    function bindSystemBar(bar) {
        if (!bar) return;
        function on(sel, type, fn) {
            var el = bar.querySelector(sel);
            if (el) el.addEventListener(type, fn);
        }
        on('#aegis-bar-mark', 'click', function () {
            if (global.virtualDesktops && virtualDesktops.showOverview) virtualDesktops.showOverview();
        });
        on('#aegis-bar-command', 'click', function () {
            if (global.globalSearch) globalSearch.show();
        });
        on('#aegis-bar-focus', 'click', function () {
            if (global.AegisFocus && AegisFocus.toggle) AegisFocus.toggle();
            else if (global.AegisActions) AegisActions.run('focus.enter', { minutes: 25 });
        });
        on('#aegis-bar-notify', 'click', function () {
            if (global.notificationCenter) notificationCenter.toggle ? notificationCenter.toggle() : notificationCenter.show();
        });
        on('#aegis-bar-quick', 'click', function (e) {
            e.stopPropagation();
            toggleQuickSettings();
        });
        on('#aegis-bar-clock', 'click', function (e) {
            e.stopPropagation();
            toggleClockPanel();
        });
        on('#aegis-bar-profile', 'click', function () {
            openApp('user');
        });
        on('#aegis-activity-capsule', 'click', function () {
            toggleActivityExpand();
        });
    }

    function updateBarContext() {
        var spaceEl = document.getElementById('aegis-bar-space');
        var appEl = document.getElementById('aegis-bar-app');
        if (spaceEl && global.virtualDesktops) {
            var i = virtualDesktops.getCurrentDesktop();
            var desk = virtualDesktops.getDesktop(i);
            spaceEl.textContent = (desk && desk.name) || ('Workspace ' + (i + 1));
        }
        if (appEl && global.windowManager) {
            var active = document.querySelector('.window.active:not(.minimized)');
            if (active) {
                var title = active.querySelector('.window-title');
                appEl.textContent = title ? title.textContent : 'Window';
            } else {
                appEl.textContent = 'Desktop';
            }
        }
        var focusBtn = document.getElementById('aegis-bar-focus');
        if (focusBtn) {
            var on = document.documentElement.classList.contains('aegis-focus')
                || document.body.classList.contains('aegis-focus-on')
                || (global.AegisFocus && AegisFocus.active);
            focusBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
            focusBtn.classList.toggle('is-on', !!on);
        }
        var badge = document.getElementById('notification-badge');
        var dot = document.getElementById('aegis-bar-notify-dot');
        if (dot && badge) {
            var n = parseInt(badge.textContent, 10) || 0;
            var visible = badge.style.display !== 'none' && n > 0;
            dot.hidden = !visible;
        }
    }

    /* ---------- WORKSPACE ---------- */
    function ensureWorkspace() {
        var carousel = document.getElementById('desktop-icon-carousel');
        if (!carousel) return;
        carousel.classList.add('aegis-workspace-host');
        carousel.setAttribute('aria-label', 'Desktop workspace');
        if (!document.getElementById('aegis-workspace')) {
            carousel.innerHTML =
                '<div id="aegis-workspace" class="aegis-workspace">' +
                '<section class="aegis-work-main">' +
                '<header class="aegis-work-header">' +
                '<div><p class="aegis-kicker">Applications</p><h2>Desktop</h2></div>' +
                '<div class="aegis-work-tools">' +
                '<button type="button" class="aegis-chip" id="aegis-customize-btn">Customize Desktop</button>' +
                '<button type="button" class="aegis-chip" id="aegis-library-btn">App Library</button>' +
                '</div></header>' +
                '<div id="aegis-app-grid" class="aegis-app-grid" role="list"></div>' +
                '<div id="aegis-continue" class="aegis-continue" hidden></div>' +
                '</section>' +
                '<aside id="aegis-live-area" class="aegis-live-area" aria-label="Live widgets"></aside>' +
                '</div>';
        }
        var customize = document.getElementById('aegis-customize-btn');
        if (customize && !customize._bound) {
            customize._bound = true;
            customize.addEventListener('click', function () { toggleCustomize(); });
        }
        var library = document.getElementById('aegis-library-btn');
        if (library && !library._bound) {
            library._bound = true;
            library.addEventListener('click', function () {
                var btn = document.querySelector('[data-action="show-apps-menu"]');
                if (btn) btn.click();
            });
        }
        var gridHost = document.getElementById('aegis-app-grid');
        if (gridHost && !gridHost._openBound) {
            gridHost._openBound = true;
            gridHost.addEventListener('click', function (e) {
                var card = e.target.closest('[data-app]');
                if (!card || !gridHost.contains(card)) return;
                if (card._aegisCardBound) return;
                openApp(card.getAttribute('data-app'), card);
            });
        }
        try { renderAppGrid(); } catch (err) { console.error('AegisDesktopOS app grid failed', err); }
        try { renderContinue(); } catch (err) { console.error('AegisDesktopOS continue failed', err); }
        try { renderWidgets(); } catch (err) { console.error('AegisDesktopOS widgets failed', err); }
    }

    function renderAppGrid() {
        var grid = document.getElementById('aegis-app-grid');
        if (!grid) return;
        var prefs = loadPrefs();
        grid.setAttribute('data-density', prefs.density);
        grid.innerHTML = PRIMARY.map(function (app) {
            var status = global.AegisAppStatus ? AegisAppStatus.getDesktopStatus(app.id) : null;
            var statusHtml = (status && status.label)
                ? '<span class="aegis-app-status' + (status.tone ? ' is-' + status.tone : '') + '">' + escapeHtml(status.label) + '</span>'
                : '';
            return '<button type="button" class="aegis-app-card" data-app="' + app.id + '" role="listitem" aria-label="' + escapeHtml(app.name) + '">' +
                '<span class="aegis-app-glyph" aria-hidden="true">' + appIcon(app.id) + '</span>' +
                '<span class="aegis-app-meta">' +
                '<span class="aegis-app-name">' + escapeHtml(app.name) + '</span>' +
                statusHtml +
                '</span></button>';
        }).join('');
        grid.querySelectorAll('.aegis-app-card').forEach(function (card) {
            card._aegisCardBound = true;
            card.addEventListener('pointerdown', function () { card.classList.add('is-pressed'); });
            card.addEventListener('pointerup', function () { card.classList.remove('is-pressed'); });
            card.addEventListener('pointerleave', function () { card.classList.remove('is-pressed'); });
            card.addEventListener('click', function (e) {
                e.stopPropagation();
                openApp(card.getAttribute('data-app'), card);
            });
            card.addEventListener('contextmenu', function (e) {
                e.preventDefault();
                showAppMenu(card.getAttribute('data-app'), e.clientX, e.clientY);
            });
        });
    }

    function renderContinue() {
        var host = document.getElementById('aegis-continue');
        if (!host) return;
        if (!loadPrefs().widgets.continue) { host.hidden = true; host.innerHTML = ''; return; }
        var items = [];
        var notes = notesList().slice().sort(function (a, b) {
            return (b.updatedAt || b.updated || 0) - (a.updatedAt || a.updated || 0);
        });
        if (notes[0] && (notes[0].content || notes[0].title)) {
            items.push({ id: 'notes', label: 'Recent note', title: notes[0].title || 'Untitled' });
        }
        var open = openTasks();
        if (open[0]) items.push({ id: 'tasks', label: 'Open task', title: open[0].title || open[0].text || 'Task' });
        var recents = (global.AegisRecent && AegisRecent.apps()) || [];
        recents.slice(0, 2).forEach(function (id) {
            if (id === 'notes' || id === 'tasks') return;
            items.push({ id: id, label: 'Recent', title: appTitle(id) });
        });
        if (!items.length) { host.hidden = true; host.innerHTML = ''; return; }
        host.hidden = false;
        host.innerHTML = '<p class="aegis-kicker">Continue</p><div class="aegis-continue-row">' +
            items.slice(0, 4).map(function (item) {
                return '<button type="button" class="aegis-continue-chip" data-app="' + escapeHtml(item.id) + '">' +
                    '<span>' + escapeHtml(item.label) + '</span><strong>' + escapeHtml(String(item.title).slice(0, 28)) + '</strong></button>';
            }).join('') + '</div>';
        host.querySelectorAll('[data-app]').forEach(function (btn) {
            btn.addEventListener('click', function () { openApp(btn.getAttribute('data-app'), btn); });
        });
    }

    /* ---------- WIDGETS ---------- */
    function renderWidgets() {
        var area = document.getElementById('aegis-live-area');
        if (!area) return;
        var prefs = loadPrefs();
        var html = '';
        WIDGET_META.forEach(function (meta) {
            if (!prefs.widgets[meta.id] || meta.id === 'continue') return;
            html += '<section class="aegis-widget" data-widget="' + meta.id + '" aria-label="' + meta.name + '">' + widgetBody(meta.id) + '</section>';
        });
        if (!html) {
            area.innerHTML = '<div class="aegis-live-empty"><p>Widgets hidden. The desktop stays a workspace.</p><button type="button" class="aegis-chip" id="aegis-empty-customize">Customize Desktop</button></div>';
            var emptyBtn = document.getElementById('aegis-empty-customize');
            if (emptyBtn) emptyBtn.addEventListener('click', function () { toggleCustomize(); });
            return;
        }
        area.innerHTML = html;
        bindWidgets(area);
    }

    function widgetBody(id) {
        if (id === 'today') return todayWidget();
        if (id === 'tasks') return tasksWidget();
        if (id === 'notes') return notesWidget();
        if (id === 'calendar') return calendarWidget();
        if (id === 'world') return worldWidget();
        if (id === 'actions') return actionsWidget();
        if (id === 'music') return musicWidget();
        if (id === 'aegis') return aegisWidget();
        if (id === 'system') return systemWidget();
        if (id === 'quote') return quoteWidget();
        return '';
    }

    function todayWidget() {
        var now = new Date();
        var date = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
        var next = nextEvent();
        var due = dueTasks();
        var nextHtml = next
            ? '<button type="button" class="aegis-widget-row" data-open="calendar"><span>Next</span><strong>' + escapeHtml(next.ev.title || 'Event') + '</strong></button>'
            : '';
        var dueHtml = due.length
            ? '<button type="button" class="aegis-widget-row" data-open="tasks"><span>Due</span><strong>' + due.length + ' task' + (due.length === 1 ? '' : 's') + '</strong></button>'
            : '';
        var world = '';
        if (global.AegisWorldClock) {
            var rows = AegisWorldClock.snapshot(false).slice(0, 3);
            world = '<div class="aegis-mini-clocks">' + rows.map(function (c) {
                return '<span><b>' + escapeHtml(c.city) + '</b> ' + escapeHtml(c.time) + '</span>';
            }).join('') + '</div>';
        }
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Today</p><h3>' + escapeHtml(date) + '</h3></header>' +
            nextHtml + dueHtml + world;
    }

    function tasksWidget() {
        var remaining = openTasks();
        var due = dueTasks();
        var label = due.length ? (due.length + ' due') : (remaining.length + ' remaining');
        var list = remaining.slice(0, 4).map(function (t) {
            return '<li>' + escapeHtml(t.title || t.text || 'Task') + '</li>';
        }).join('');
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Tasks</p><h3>' + escapeHtml(label) + '</h3>' +
            '<button type="button" class="aegis-icon-btn" data-action="new-task" aria-label="Add task">+</button></header>' +
            (list ? '<ul class="aegis-widget-list">' + list + '</ul>' : '<p class="aegis-widget-empty">No open tasks.</p>') +
            '<button type="button" class="aegis-widget-link" data-open="tasks">Open Tasks</button>';
    }

    function notesWidget() {
        var notes = notesList().slice().sort(function (a, b) {
            return (b.updatedAt || b.updated || 0) - (a.updatedAt || a.updated || 0);
        });
        if (!notes.length) {
            return '<header class="aegis-widget-head"><p class="aegis-kicker">Notes</p><h3>Quick note</h3></header>' +
                '<form class="aegis-quick-note" id="aegis-quick-note"><label class="visually-hidden" for="aegis-quick-note-input">Quick note</label>' +
                '<textarea id="aegis-quick-note-input" rows="3" placeholder="Write a thought…"></textarea>' +
                '<button type="submit" class="aegis-chip">Save</button></form>';
        }
        var rows = notes.slice(0, 3).map(function (n) {
            return '<button type="button" class="aegis-widget-row" data-open="notes"><span>' + escapeHtml(n.title || 'Untitled') + '</span></button>';
        }).join('');
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Notes</p><h3>Recent</h3>' +
            '<button type="button" class="aegis-icon-btn" data-action="new-note" aria-label="New note">+</button></header>' + rows;
    }

    function calendarWidget() {
        var now = new Date();
        var next = nextEvent();
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Calendar</p><h3>' +
            now.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) + '</h3></header>' +
            (next
                ? '<button type="button" class="aegis-widget-row" data-open="calendar"><span>Next</span><strong>' + escapeHtml(next.ev.title || 'Event') + '</strong></button>'
                : '<p class="aegis-widget-empty">No upcoming events.</p>') +
            '<button type="button" class="aegis-widget-link" data-open="calendar">Open Calendar</button>';
    }

    function worldWidget() {
        var rows = (global.AegisWorldClock ? AegisWorldClock.snapshot(false) : []).slice(0, 5);
        var cards = rows.map(function (c) {
            var phase = phaseFromHour(c.hour);
            return '<button type="button" class="aegis-tz-card is-' + phase + '" data-open="world-clock">' +
                '<span class="aegis-tz-city">' + escapeHtml(c.city) + '</span>' +
                '<strong>' + escapeHtml(c.time) + '</strong>' +
                '<span class="aegis-tz-meta">' + escapeHtml((c.weekday || (c.date || '').split(',')[0] || '') + ' · ' + relativeLabel(c)) + '</span>' +
                '</button>';
        }).join('');
        return '<header class="aegis-widget-head"><p class="aegis-kicker">World Time</p><h3>Clocks</h3></header>' +
            '<div class="aegis-tz-list">' + cards + '</div>';
    }

    function actionsWidget() {
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Quick Actions</p></header>' +
            '<div class="aegis-action-rail">' +
            '<button type="button" data-action="new-task">New Task</button>' +
            '<button type="button" data-action="new-note">New Note</button>' +
            '<button type="button" data-open="ai-chat">Ask Aegis</button>' +
            '</div>';
    }

    function musicWidget() {
        var engine = global.musicEngine || (global.musicPlayerApp && musicPlayerApp.engine);
        if (!engine || !engine.currentTrack) {
            return '<header class="aegis-widget-head"><p class="aegis-kicker">Music</p><h3>Idle</h3></header><p class="aegis-widget-empty">Nothing playing.</p>';
        }
        var track = engine.currentTrack;
        var name = track.title || track.name || 'Track';
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Music</p><h3>' + escapeHtml(String(name).slice(0, 28)) + '</h3></header>' +
            '<button type="button" class="aegis-widget-link" data-open="music">' + (engine.isPlaying ? 'Playing' : 'Paused') + '</button>';
    }

    function aegisWidget() {
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Aegis</p><h3>Ask</h3></header>' +
            '<form class="aegis-ask-form" id="aegis-ask-form"><label class="visually-hidden" for="aegis-ask-input">Ask Aegis</label>' +
            '<input id="aegis-ask-input" type="text" placeholder="Ask Aegis…" autocomplete="off">' +
            '<button type="submit" class="aegis-chip">Ask</button></form>';
    }

    function systemWidget() {
        var online = navigator.onLine ? 'Online' : 'Offline';
        var mem = '';
        if (performance && performance.memory && performance.memory.usedJSHeapSize) {
            mem = '<span>JS heap ' + Math.round(performance.memory.usedJSHeapSize / 1048576) + ' MB</span>';
        }
        return '<header class="aegis-widget-head"><p class="aegis-kicker">System</p><h3>Browser</h3></header>' +
            '<p class="aegis-widget-empty">' + online + '. Host CPU and RAM are not available.</p>' + mem;
    }

    function quoteWidget() {
        return '<header class="aegis-widget-head"><p class="aegis-kicker">Quote</p></header>' +
            '<p class="aegis-widget-empty">Optional. Hidden by default so the desktop stays useful.</p>';
    }

    function bindWidgets(area) {
        if (!area._aegisBound) {
            area._aegisBound = true;
            area.addEventListener('click', function (e) {
                var open = e.target.closest('[data-open]');
                if (open) { openApp(open.getAttribute('data-open'), open); return; }
                var action = e.target.closest('[data-action]');
                if (!action) return;
                var act = action.getAttribute('data-action');
                if (act === 'new-task' && global.AegisActions) AegisActions.run('tasks.create', { text: 'New task' });
                if (act === 'new-note' && global.AegisActions) AegisActions.run('notes.create', { title: 'New note', content: '' });
            });
        }
        var noteForm = area.querySelector('#aegis-quick-note');
        if (noteForm) {
            noteForm.addEventListener('submit', function (e) {
                e.preventDefault();
                var input = document.getElementById('aegis-quick-note-input');
                var text = input && input.value.trim();
                if (!text) return;
                if (global.AegisActions) AegisActions.run('notes.create', { title: text.slice(0, 40), content: text });
                input.value = '';
                renderWidgets();
                renderContinue();
            });
        }
        var ask = area.querySelector('#aegis-ask-form');
        if (ask) {
            ask.addEventListener('submit', function (e) {
                e.preventDefault();
                var input = document.getElementById('aegis-ask-input');
                var q = input && input.value.trim();
                if (!q) return;
                if (global.AegisIntelligence) AegisIntelligence.show(q);
                else openApp('ai-chat');
            });
        }
    }

    /* ---------- DOCK ---------- */
    function rebuildDock() {
        var taskbar = document.querySelector('.taskbar');
        if (!taskbar) return;
        taskbar.classList.add('aegis-dock');
        taskbar.setAttribute('aria-label', 'Aegis Dock');
        var prefs = loadPrefs();
        var left = taskbar.querySelector('.taskbar-left');
        if (!left) return;
        left.querySelectorAll(':scope > .taskbar-icon[data-app], :scope > .taskbar-app-icon[data-app]').forEach(function (el) {
            el.hidden = true;
        });
        var pinnedHost = left.querySelector('.taskbar-pinned-apps');
        if (!pinnedHost) {
            pinnedHost = document.createElement('div');
            pinnedHost.className = 'taskbar-pinned-apps';
            pinnedHost.setAttribute('aria-label', 'Pinned and running apps');
            pinnedHost.setAttribute('role', 'menubar');
            left.appendChild(pinnedHost);
        }
        var runningIds = [];
        if (global.windowManager) {
            windowManager.windows.forEach(function (_el, id) {
                if (id !== 'email') runningIds.push(id);
            });
        }
        var ids = prefs.pinnedDock.slice();
        if (prefs.showRunningDock) {
            runningIds.forEach(function (id) {
                if (ids.indexOf(id) === -1) ids.push(id);
            });
        }
        pinnedHost.innerHTML = ids.map(function (id) {
            return dockButton(id, runningIds.indexOf(id) !== -1);
        }).join('');
        var tray = taskbar.querySelector('.system-tray') || taskbar.querySelector('.taskbar-right');
        if (tray && !document.getElementById('aegis-overview-btn')) {
            var overview = document.createElement('button');
            overview.type = 'button';
            overview.id = 'aegis-overview-btn';
            overview.className = 'taskbar-icon aegis-overview-btn';
            overview.setAttribute('aria-label', 'Multitasking overview');
            overview.setAttribute('data-tooltip', 'Overview — open windows and workspaces');
            overview.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="4" y="5" width="7" height="6" rx="1.4"/><rect x="13" y="5" width="7" height="6" rx="1.4"/><rect x="4" y="13" width="16" height="6" rx="1.4"/></svg><span class="taskbar-icon-label">Overview</span>';
            tray.insertBefore(overview, tray.firstChild);
            overview.addEventListener('click', function () { showOverview(); });
        }
        pinnedHost.querySelectorAll('[data-app]').forEach(function (btn) {
            if (btn._aegisDockBound) {
                btn.setAttribute('data-tooltip', dockTooltip(btn.getAttribute('data-app')));
                return;
            }
            btn._aegisDockBound = true;
            enhanceDockButton(btn);
        });
        var search = taskbar.querySelector('#global-search');
        if (search) {
            search.setAttribute('placeholder', 'Command Center');
            search.setAttribute('aria-label', 'Open Command Center');
        }
        var appsBtn = taskbar.querySelector('[data-action="show-apps-menu"]');
        if (appsBtn) {
            appsBtn.setAttribute('data-tooltip', 'App Library');
            appsBtn.setAttribute('aria-label', 'Open App Library');
            appsBtn.setAttribute('title', 'App Library');
        }
        updateDockStates();
    }

    function dockButton(id, running) {
        var title = appTitle(id);
        return '<button type="button" class="taskbar-icon' + (running ? ' running' : '') + '" data-app="' + id + '" aria-label="' + escapeHtml(title) + '" data-tooltip="' + escapeHtml(title) + '">' +
            appIcon(id) + '<span class="taskbar-icon-label">' + escapeHtml(title) + '</span>' +
            '<span class="aegis-dock-state" aria-hidden="true"></span></button>';
    }

    function enhanceDockButton(btn) {
        var id = btn.getAttribute('data-app');
        if (!id) return;
        btn.setAttribute('data-tooltip', dockTooltip(id));
        btn.addEventListener('mouseenter', function () { showDockPreview(btn, id); });
        btn.addEventListener('mouseleave', function () { hideDockPreviewSoon(); });
        btn.addEventListener('contextmenu', function (e) {
            e.preventDefault();
            e.stopPropagation();
            showDockMenu(id, e.clientX, e.clientY);
        });
    }

    function dockTooltip(id) {
        var title = appTitle(id);
        var win = global.windowManager && windowManager.windows.get(id);
        var status = global.AegisAppStatus ? AegisAppStatus.getDockStatus(id) : null;
        var parts = [title];
        if (win) {
            var minimized = win.classList.contains('minimized');
            var active = win.classList.contains('active') && !minimized;
            parts.push(active ? 'Active' : (minimized ? 'Minimized' : '1 window'));
        }
        if (status && status.label) parts.push(status.label);
        return parts.join(' · ');
    }

    function updateDockStates() {
        document.querySelectorAll('.taskbar-icon[data-app], .aegis-app-card[data-app]').forEach(function (el) {
            var id = el.getAttribute('data-app');
            var win = global.windowManager && windowManager.windows.get(id);
            var running = !!win;
            var minimized = running && win.classList.contains('minimized');
            var active = running && win.classList.contains('active') && !minimized;
            var status = global.AegisAppStatus ? AegisAppStatus.getDockStatus(id) : null;
            var attention = !!(status && status.tone === 'attention');
            el.classList.toggle('running', running);
            el.classList.toggle('minimized', minimized);
            el.classList.toggle('active', active);
            el.classList.toggle('needs-attention', attention);
            el.setAttribute('data-tooltip', dockTooltip(id));
            var pip = el.querySelector('.aegis-dock-state');
            if (pip) {
                pip.setAttribute('data-state', attention ? 'attention' : (active ? 'active' : (minimized ? 'minimized' : (running ? 'running' : 'idle'))));
            }
        });
        updateBarContext();
    }

    var previewTimer = null;
    function showDockPreview(btn, id) {
        hideDockPreviewSoon.cancel = true;
        var win = global.windowManager && windowManager.windows.get(id);
        if (!win) return;
        var panel = document.getElementById('aegis-dock-preview');
        if (!panel) {
            panel = document.createElement('div');
            panel.id = 'aegis-dock-preview';
            panel.className = 'aegis-dock-preview';
            panel.setAttribute('role', 'dialog');
            document.body.appendChild(panel);
            panel.addEventListener('mouseenter', function () { hideDockPreviewSoon.cancel = true; });
            panel.addEventListener('mouseleave', hideDockPreviewSoon);
        }
        var title = win.querySelector('.window-title');
        var minimized = win.classList.contains('minimized');
        panel.innerHTML = '<p>' + escapeHtml(appTitle(id)) + '</p><strong>' + escapeHtml(title ? title.textContent : appTitle(id)) + '</strong>' +
            '<span>' + (minimized ? 'Minimized' : 'Open') + '</span>' +
            '<button type="button" data-show>Show window</button>';
        var rect = btn.getBoundingClientRect();
        panel.style.left = Math.max(8, rect.left + rect.width / 2 - 110) + 'px';
        panel.style.bottom = (window.innerHeight - rect.top + 10) + 'px';
        panel.classList.add('visible');
        panel.querySelector('[data-show]').addEventListener('click', function () {
            windowManager.focusWindow(win);
            panel.classList.remove('visible');
        });
    }

    function hideDockPreviewSoon() {
        hideDockPreviewSoon.cancel = false;
        clearTimeout(previewTimer);
        previewTimer = setTimeout(function () {
            if (hideDockPreviewSoon.cancel) return;
            var panel = document.getElementById('aegis-dock-preview');
            if (panel) panel.classList.remove('visible');
        }, 180);
    }

    function showDockMenu(appId, x, y) {
        if (global.AegisExperience && AegisExperience.showDockMenu) {
            AegisExperience.showDockMenu(appId, x, y);
            return;
        }
        var menu = document.getElementById('aegis-dock-menu');
        if (!menu) return;
        menu.setAttribute('data-app', appId);
        var running = !!(global.windowManager && windowManager.windows.has(appId));
        menu.innerHTML =
            '<button class="aegis-menu-item" data-dock-action="open">Open ' + escapeHtml(appTitle(appId)) + '</button>' +
            (running ? '<button class="aegis-menu-item" data-dock-action="show">Show window</button>' : '') +
            (running ? '<button class="aegis-menu-item" data-dock-action="close">Close</button>' : '');
        menu.classList.add('visible');
        if (global.aegisShell && aegisShell.positionMenu) aegisShell.positionMenu(menu, x, y);
    }

    function showAppMenu(appId, x, y) {
        var menu = document.getElementById('aegis-app-card-menu');
        if (!menu) {
            menu = document.createElement('div');
            menu.id = 'aegis-app-card-menu';
            menu.className = 'aegis-context-menu aegis-menu';
            menu.setAttribute('role', 'menu');
            document.body.appendChild(menu);
            menu.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-app-action]');
                if (!btn) return;
                var id = menu.getAttribute('data-app');
                var act = btn.getAttribute('data-app-action');
                menu.classList.remove('visible');
                if (act === 'open') openApp(id);
                if (act === 'library') document.querySelector('[data-action="show-apps-menu"]')?.click();
            });
        }
        menu.setAttribute('data-app', appId);
        var purpose = appPurpose(appId);
        menu.innerHTML =
            '<button class="aegis-menu-item" role="menuitem" data-app-action="open">Open ' + escapeHtml(appTitle(appId)) + '</button>' +
            (purpose ? '<p class="aegis-menu-note">' + escapeHtml(purpose) + '</p>' : '') +
            '<button class="aegis-menu-item" role="menuitem" data-app-action="library">Show in App Library</button>';
        menu.classList.add('visible');
        if (global.aegisShell && aegisShell.positionMenu) aegisShell.positionMenu(menu, x, y);
        else { menu.style.left = x + 'px'; menu.style.top = y + 'px'; }
    }

    /* ---------- CLOCK PANEL ---------- */
    function toggleClockPanel() {
        var panel = document.getElementById('aegis-clock-panel');
        if (panel && panel.classList.contains('visible')) { panel.classList.remove('visible'); return; }
        ensureClockPanel();
        document.getElementById('aegis-clock-panel').classList.add('visible');
        document.getElementById('aegis-bar-clock').setAttribute('aria-expanded', 'true');
        renderClockPanel();
    }

    function ensureClockPanel() {
        if (document.getElementById('aegis-clock-panel')) return;
        var panel = document.createElement('div');
        panel.id = 'aegis-clock-panel';
        panel.className = 'aegis-clock-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Time and calendar');
        document.body.appendChild(panel);
        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('visible')) return;
            if (panel.contains(e.target) || e.target.closest('#aegis-bar-clock')) return;
            panel.classList.remove('visible');
            document.getElementById('aegis-bar-clock')?.setAttribute('aria-expanded', 'false');
        });
    }

    function renderClockPanel() {
        var panel = document.getElementById('aegis-clock-panel');
        if (!panel) return;
        var now = new Date();
        var hour = now.getHours();
        var phase = phaseFromHour(hour);
        var clocks = global.AegisWorldClock ? AegisWorldClock.snapshot(false) : [];
        var cal = monthGrid(now);
        panel.innerHTML =
            '<div class="aegis-clock-hero is-' + phase + '">' +
            '<span class="aegis-phase">' + phaseGlyph(phase) + ' ' + phase + '</span>' +
            '<strong>' + now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) + '</strong>' +
            '<span>' + now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }) + '</span></div>' +
            '<div class="aegis-mini-cal" aria-label="Calendar">' + cal + '</div>' +
            '<div class="aegis-clock-world">' + clocks.slice(0, 8).map(function (c) {
                return '<div class="aegis-tz-card is-' + phaseFromHour(c.hour) + '" data-clock-id="' + escapeHtml(c.id) + '">' +
                    '<span class="aegis-tz-city">' + escapeHtml(c.city) + '</span>' +
                    '<strong>' + escapeHtml(c.time) + '</strong>' +
                    '<span>' + escapeHtml((c.weekday || '') + (c.weekday ? ' · ' : '') + relativeLabel(c)) + '</span>' +
                    '<span class="aegis-tz-tools">' +
                    '<button type="button" class="aegis-icon-btn" data-clock-move="-1" aria-label="Move ' + escapeHtml(c.city) + ' up">↑</button>' +
                    '<button type="button" class="aegis-icon-btn" data-clock-move="1" aria-label="Move ' + escapeHtml(c.city) + ' down">↓</button>' +
                    '<button type="button" class="aegis-icon-btn" data-clock-remove aria-label="Remove ' + escapeHtml(c.city) + '">×</button>' +
                    '</span></div>';
            }).join('') + '</div>' +
            '<label class="aegis-clock-add">Add city' +
            '<input type="search" id="aegis-clock-search" placeholder="City or IANA zone" autocomplete="off"></label>' +
            '<div id="aegis-clock-results" class="aegis-clock-results" role="listbox"></div>' +
            '<div class="aegis-clock-tools"><button type="button" class="aegis-chip" data-open-wc>Open World Clock</button>' +
            '<button type="button" class="aegis-chip" data-open-cal>Open Calendar</button></div>';
        panel.querySelector('[data-open-wc]').addEventListener('click', function () { openApp('world-clock'); panel.classList.remove('visible'); });
        panel.querySelector('[data-open-cal]').addEventListener('click', function () { openApp('calendar'); panel.classList.remove('visible'); });
        panel.querySelectorAll('[data-clock-remove]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var card = btn.closest('[data-clock-id]');
                if (card && global.AegisWorldClock) { AegisWorldClock.remove(card.getAttribute('data-clock-id')); renderClockPanel(); }
            });
        });
        panel.querySelectorAll('[data-clock-move]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                var card = btn.closest('[data-clock-id]');
                if (card && global.AegisWorldClock) {
                    AegisWorldClock.move(card.getAttribute('data-clock-id'), Number(btn.getAttribute('data-clock-move')));
                    renderClockPanel();
                }
            });
        });
        var search = panel.querySelector('#aegis-clock-search');
        var results = panel.querySelector('#aegis-clock-results');
        if (search && results && global.AegisWorldClock) {
            search.addEventListener('input', function () {
                var q = search.value.trim();
                if (!q) { results.innerHTML = ''; return; }
                results.innerHTML = AegisWorldClock.search(q).slice(0, 8).map(function (item) {
                    return '<button type="button" class="aegis-widget-row" data-add-tz="' + escapeHtml(item.tz) + '" data-add-city="' + escapeHtml(item.city) + '" data-add-country="' + escapeHtml(item.country) + '">' +
                        '<span>' + escapeHtml(item.city) + '</span><strong>' + escapeHtml(item.tz) + '</strong></button>';
                }).join('') || '<p class="aegis-widget-empty">No matching cities.</p>';
            });
            results.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-add-tz]');
                if (!btn) return;
                AegisWorldClock.add({
                    city: btn.getAttribute('data-add-city'),
                    country: btn.getAttribute('data-add-country'),
                    tz: btn.getAttribute('data-add-tz')
                });
                search.value = '';
                results.innerHTML = '';
                renderClockPanel();
            });
        }
    }

    function monthGrid(now) {
        var y = now.getFullYear();
        var m = now.getMonth();
        var first = new Date(y, m, 1);
        var start = (first.getDay() + 6) % 7;
        var days = new Date(y, m + 1, 0).getDate();
        var cells = '';
        for (var i = 0; i < start; i++) cells += '<span></span>';
        for (var d = 1; d <= days; d++) {
            cells += '<span class="' + (d === now.getDate() ? 'is-today' : '') + '">' + d + '</span>';
        }
        return '<p>' + now.toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) + '</p><div class="aegis-cal-grid">' + cells + '</div>';
    }

    /* ---------- QUICK SETTINGS / CUSTOMIZE ---------- */
    function toggleQuickSettings() {
        var panel = document.getElementById('aegis-quick-settings');
        if (panel && panel.classList.contains('visible')) { panel.classList.remove('visible'); return; }
        ensureQuickSettings();
        renderQuickSettings();
        document.getElementById('aegis-quick-settings').classList.add('visible');
    }

    function ensureQuickSettings() {
        if (document.getElementById('aegis-quick-settings')) return;
        var panel = document.createElement('div');
        panel.id = 'aegis-quick-settings';
        panel.className = 'aegis-quick-settings';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Quick settings');
        document.body.appendChild(panel);
        panel.addEventListener('click', onQuickClick);
        document.addEventListener('click', function (e) {
            if (!panel.classList.contains('visible')) return;
            if (panel.contains(e.target) || e.target.closest('#aegis-bar-quick')) return;
            panel.classList.remove('visible');
        });
    }

    function renderQuickSettings() {
        var panel = document.getElementById('aegis-quick-settings');
        if (!panel) return;
        var prefs = loadPrefs();
        var theme = document.documentElement.classList.contains('theme-light') ? 'light' : 'dark';
        var paper = (global.AegisExperience && AegisExperience.currentWallpaper()) || 'aurora';
        panel.innerHTML =
            '<p class="aegis-kicker">Quick settings</p>' +
            '<div class="aegis-qs-grid">' +
            '<button type="button" data-qs="theme">' + (theme === 'light' ? 'Light' : 'Dark') + ' theme</button>' +
            '<button type="button" data-qs="focus">Focus</button>' +
            '<button type="button" data-qs="density">' + (prefs.density === 'compact' ? 'Compact' : 'Comfortable') + '</button>' +
            '<button type="button" data-qs="customize">Desktop</button>' +
            '</div>' +
            '<p class="aegis-kicker">Wallpaper</p>' +
            '<div class="aegis-qs-papers">' + ['aurora', 'midnight', 'atmosphere', 'horizon', 'obsidian', 'celestial', 'light-field'].map(function (id) {
                return '<button type="button" class="aegis-paper-chip' + (paper === id ? ' is-on' : '') + '" data-paper="' + id + '">' + paperLabel(id) + '</button>';
            }).join('') + '</div>' +
            '<button type="button" class="aegis-widget-link" data-qs="settings">Open Settings</button>';
    }

    function onQuickClick(e) {
        var paper = e.target.closest('[data-paper]');
        if (paper && global.AegisExperience) {
            AegisExperience.applyWallpaper(paper.getAttribute('data-paper'));
            renderQuickSettings();
            return;
        }
        var qs = e.target.closest('[data-qs]');
        if (!qs) return;
        var act = qs.getAttribute('data-qs');
        if (act === 'theme' && global.themeSystem) {
            var next = document.documentElement.classList.contains('theme-light') ? 'dark' : 'light';
            if (themeSystem.setTheme) themeSystem.setTheme(next);
            else if (global.AegisActions) AegisActions.run('settings.setTheme', { theme: next });
        }
        if (act === 'focus' && global.AegisActions) AegisActions.run('focus.enter', { minutes: 25 });
        if (act === 'density') {
            var prefs = loadPrefs();
            savePrefs({ density: prefs.density === 'compact' ? 'comfortable' : 'compact' });
            renderAppGrid();
        }
        if (act === 'customize') { toggleCustomize(); document.getElementById('aegis-quick-settings')?.classList.remove('visible'); }
        if (act === 'settings') { openApp('settings'); document.getElementById('aegis-quick-settings')?.classList.remove('visible'); }
        renderQuickSettings();
    }

    function toggleCustomize() {
        var panel = document.getElementById('aegis-customize');
        if (panel && panel.classList.contains('visible')) { panel.classList.remove('visible'); return; }
        ensureCustomize();
        renderCustomize();
        document.getElementById('aegis-customize').classList.add('visible');
    }

    function ensureCustomize() {
        if (document.getElementById('aegis-customize')) return;
        var panel = document.createElement('div');
        panel.id = 'aegis-customize';
        panel.className = 'aegis-customize';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-label', 'Customize Desktop');
        document.body.appendChild(panel);
    }

    function renderCustomize() {
        var panel = document.getElementById('aegis-customize');
        if (!panel) return;
        var prefs = loadPrefs();
        panel.innerHTML =
            '<header><h2>Customize Desktop</h2><button type="button" class="aegis-icon-btn" data-close aria-label="Close">×</button></header>' +
            '<label>Density <select id="aegis-density"><option value="comfortable">Comfortable</option><option value="compact">Compact</option></select></label>' +
            '<label class="aegis-check"><input type="checkbox" data-pref="labels"' + (prefs.labels !== false ? ' checked' : '') + '> Application names on desktop</label>' +
            '<label class="aegis-check"><input type="checkbox" data-pref="liveActivity"' + (prefs.liveActivity !== false ? ' checked' : '') + '> Live activity capsule</label>' +
            '<label class="aegis-check"><input type="checkbox" data-pref="showRunningDock"' + (prefs.showRunningDock !== false ? ' checked' : '') + '> Show running apps in Dock</label>' +
            '<label class="aegis-check"><input type="checkbox" data-pref="largerText"' + (prefs.largerText ? ' checked' : '') + '> Larger interface text</label>' +
            '<label class="aegis-check"><input type="checkbox" data-pref="highContrast"' + (prefs.highContrast ? ' checked' : '') + '> Higher contrast</label>' +
            '<label class="aegis-check"><input type="checkbox" data-pref="timeAware"' + (prefs.timeAware ? ' checked' : '') + '> Time-aware wallpaper tone</label>' +
            '<p class="aegis-kicker">Widgets</p>' +
            WIDGET_META.map(function (w) {
                return '<label class="aegis-check"><input type="checkbox" data-widget="' + w.id + '"' + (prefs.widgets[w.id] ? ' checked' : '') + '> ' + w.name + '</label>';
            }).join('') +
            '<p class="aegis-kicker">Wallpaper</p>' +
            '<div class="aegis-qs-papers">' + ['aurora', 'midnight', 'atmosphere', 'horizon', 'obsidian', 'celestial', 'light-field'].map(function (id) {
                return '<button type="button" class="aegis-paper-chip" data-paper="' + id + '">' + paperLabel(id) + '</button>';
            }).join('') + '</div>' +
            '<p class="aegis-kicker">World clocks</p><p class="aegis-widget-empty">Add, reorder, or remove cities in World Clock.</p>' +
            '<button type="button" class="aegis-chip" data-open-wc>Open World Clock</button>';
        panel.querySelector('#aegis-density').value = prefs.density;
        panel.querySelector('#aegis-density').addEventListener('change', function (e) {
            savePrefs({ density: e.target.value });
            renderAppGrid();
        });
        panel.querySelectorAll('[data-widget]').forEach(function (input) {
            input.addEventListener('change', function () {
                var widgets = loadPrefs().widgets;
                widgets[input.getAttribute('data-widget')] = input.checked;
                savePrefs({ widgets: widgets });
                renderWidgets();
                renderContinue();
            });
        });
        panel.querySelectorAll('[data-pref]').forEach(function (input) {
            input.addEventListener('change', function () {
                var key = input.getAttribute('data-pref');
                var patch = {};
                patch[key] = input.checked;
                savePrefs(patch);
                if (key === 'showRunningDock') rebuildDock();
                renderAppGrid();
            });
        });
        panel.querySelectorAll('[data-paper]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (global.AegisExperience) AegisExperience.applyWallpaper(btn.getAttribute('data-paper'));
            });
        });
        panel.querySelector('[data-close]').addEventListener('click', function () { panel.classList.remove('visible'); });
        panel.querySelector('[data-open-wc]').addEventListener('click', function () { openApp('world-clock'); panel.classList.remove('visible'); });
    }

    /* ---------- LIVE ACTIVITY ---------- */
    function renderActivity(rows) {
        var cap = document.getElementById('aegis-activity-capsule');
        if (!cap || !loadPrefs().liveActivity) { if (cap) cap.hidden = true; return; }
        if (!rows || !rows.length) { cap.hidden = true; cap.classList.remove('is-open'); return; }
        var item = rows[0];
        cap.hidden = false;
        cap.innerHTML = '<span class="aegis-cap-app">' + escapeHtml(item.title || appTitle(item.appId)) + '</span>' +
            '<span class="aegis-cap-detail">' + escapeHtml(item.detail || '') + '</span>';
        cap.dataset.action = item.action || item.appId || '';
        cap.classList.toggle('has-progress', !!item.progress);
    }

    function toggleActivityExpand() {
        var cap = document.getElementById('aegis-activity-capsule');
        if (!cap) return;
        var rows = global.AegisAppStatus ? AegisAppStatus.live() : [];
        if (cap.classList.contains('is-open')) {
            cap.classList.remove('is-open');
            var action = cap.dataset.action;
            if (action) openApp(action, cap);
            return;
        }
        cap.classList.add('is-open');
        if (rows[0]) {
            cap.innerHTML = '<span class="aegis-cap-app">' + escapeHtml(rows[0].title || '') + '</span>' +
                '<span class="aegis-cap-detail">' + escapeHtml(rows[0].detail || '') + '</span>' +
                '<span class="aegis-cap-hint">Click to open</span>';
        }
    }

    /* ---------- OVERVIEW ---------- */
    function showOverview() {
        var overlay = document.getElementById('aegis-overview');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'aegis-overview';
            overlay.className = 'aegis-overview';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-label', 'Multitasking overview');
            document.body.appendChild(overlay);
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) overlay.classList.remove('visible');
                var close = e.target.closest('[data-close-win]');
                if (close && global.windowManager) {
                    var id = close.getAttribute('data-close-win');
                    var win = windowManager.windows.get(id);
                    if (win) windowManager.closeWindow(win);
                    showOverview();
                }
                var pick = e.target.closest('[data-focus-win]');
                if (pick && global.windowManager) {
                    var win2 = windowManager.windows.get(pick.getAttribute('data-focus-win'));
                    if (win2) windowManager.focusWindow(win2);
                    overlay.classList.remove('visible');
                }
                var space = e.target.closest('[data-space]');
                if (space && global.virtualDesktops) {
                    virtualDesktops.switchTo(Number(space.getAttribute('data-space')));
                    overlay.classList.remove('visible');
                    updateBarContext();
                }
            });
            document.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') overlay.classList.remove('visible');
            });
        }
        var windowsHtml = '';
        if (global.windowManager) {
            windowManager.windows.forEach(function (el, id) {
                var title = el.querySelector('.window-title');
                windowsHtml += '<article class="aegis-overview-card">' +
                    '<button type="button" data-focus-win="' + id + '">' +
                    '<span class="aegis-app-glyph">' + appIcon(id) + '</span>' +
                    '<strong>' + escapeHtml(appTitle(id)) + '</strong>' +
                    '<span>' + escapeHtml(title ? title.textContent : '') + '</span></button>' +
                    '<button type="button" class="aegis-icon-btn" data-close-win="' + id + '" aria-label="Close">×</button></article>';
            });
        }
        var spaces = '';
        if (global.virtualDesktops) {
            spaces = virtualDesktops.getAllDesktops().map(function (d, i) {
                return '<button type="button" class="aegis-space-pill' + (i === virtualDesktops.getCurrentDesktop() ? ' is-on' : '') + '" data-space="' + i + '">' + escapeHtml(d.name || ('Workspace ' + (i + 1))) + '</button>';
            }).join('');
        }
        overlay.innerHTML = '<div class="aegis-overview-inner"><header><h2>Overview</h2><button type="button" class="aegis-chip" data-spaces>Workspaces</button></header>' +
            '<div class="aegis-space-row">' + spaces + '</div>' +
            '<div class="aegis-overview-grid">' + (windowsHtml || '<p class="aegis-widget-empty">No open windows.</p>') + '</div></div>';
        overlay.classList.add('visible');
        overlay.querySelector('[data-spaces]')?.addEventListener('click', function () {
            if (global.virtualDesktops) virtualDesktops.showOverview();
        });
    }

    /* ---------- FIRST RUN ---------- */
    function maybeWelcome() {
        try { if (localStorage.getItem(WELCOME_KEY) === '1') return; } catch (e) { return; }
        var overlay = document.createElement('div');
        overlay.id = 'aegis-welcome';
        overlay.className = 'aegis-welcome';
        overlay.innerHTML =
            '<div class="aegis-welcome-card">' +
            '<div class="aegis-mark aegis-mark-64 aegis-mark-reveal">' + MARK + '</div>' +
            '<h1>Welcome to AegisDesk</h1>' +
            '<p>A protected computing environment. Choose a starting look — you can change this anytime.</p>' +
            '<label>Theme<select id="aegis-welcome-theme"><option value="dark">Dark</option><option value="light">Light</option></select></label>' +
            '<label>Wallpaper<select id="aegis-welcome-paper"><option value="aurora">Aurora</option><option value="obsidian">Obsidian</option><option value="horizon">Horizon</option><option value="celestial">Celestial</option><option value="light-field">Light Field</option></select></label>' +
            '<p class="aegis-widget-empty">World clocks start with New York, London, Dubai, Kolkata, Singapore, Tokyo, Seoul, and Sydney. Customize in World Clock.</p>' +
            '<button type="button" class="aegis-chip aegis-chip-primary" id="aegis-welcome-go">Enter desktop</button>' +
            '</div>';
        document.body.appendChild(overlay);
        document.getElementById('aegis-welcome-go').addEventListener('click', function () {
            var theme = document.getElementById('aegis-welcome-theme').value;
            var paper = document.getElementById('aegis-welcome-paper').value;
            if (global.themeSystem && themeSystem.setTheme) themeSystem.setTheme(theme);
            else if (global.AegisActions) AegisActions.run('settings.setTheme', { theme: theme });
            if (global.AegisExperience) AegisExperience.applyWallpaper(paper);
            try { localStorage.setItem(WELCOME_KEY, '1'); } catch (e) { /* ignore */ }
            overlay.remove();
        });
    }

    /* ---------- APP LIBRARY ---------- */
    function enhanceLibrary() {
        var menu = document.getElementById('apps-menu');
        if (!menu) return;
        var header = menu.querySelector('.apps-menu-header h2');
        if (header) header.textContent = 'App Library';
        var sub = menu.querySelector('.apps-menu-subtitle');
        if (sub) sub.textContent = 'Every application, named. Filter instantly — no AI required.';
        var grid = document.getElementById('apps-grid');
        if (!grid || grid._aegisCats) return;
        grid._aegisCats = true;
        if (!grid._aegisObs) {
            grid._aegisObs = new MutationObserver(function () { stampLibraryTiles(); });
            grid._aegisObs.observe(grid, { childList: true, subtree: false });
        }
        stampLibraryTiles();
    }

    function stampLibraryTiles() {
        var grid = document.getElementById('apps-grid');
        if (!grid || grid._stamping) return;
        grid._stamping = true;
        try {
        grid.querySelectorAll('.app-tile[data-app]').forEach(function (tile) {
            var id = tile.getAttribute('data-app');
            var name = tile.querySelector('.app-tile-name');
            if (name) name.textContent = appTitle(id);
            if (!tile.querySelector('.app-tile-purpose')) {
                var purpose = appPurpose(id);
                if (purpose) {
                    var p = document.createElement('div');
                    p.className = 'app-tile-purpose';
                    p.textContent = purpose;
                    tile.appendChild(p);
                }
            }
            tile.setAttribute('aria-label', appTitle(id));
        });
        if (!grid.querySelector('.app-library-cat') && global.APP_REGISTRY) {
            var used = {};
            var html = '';
            Object.keys(CATEGORIES).forEach(function (cat) {
                var tiles = CATEGORIES[cat].map(function (id) {
                    if (used[id] || !APP_REGISTRY[id]) return '';
                    used[id] = true;
                    var tile = grid.querySelector('.app-tile[data-app="' + id + '"]');
                    return tile ? tile.outerHTML : '';
                }).join('');
                if (tiles) html += '<h3 class="app-library-cat">' + cat + '</h3><div class="app-library-row">' + tiles + '</div>';
            });
            var leftover = [];
            grid.querySelectorAll('.app-tile[data-app]').forEach(function (tile) {
                var id = tile.getAttribute('data-app');
                if (!used[id]) leftover.push(tile.outerHTML);
            });
            if (leftover.length) html += '<h3 class="app-library-cat">More</h3><div class="app-library-row">' + leftover.join('') + '</div>';
            if (html) grid.innerHTML = html;
        }
        } finally {
            grid._stamping = false;
        }
    }

    /* ---------- CONTEXT / DROP / CLOCK TICK ---------- */
    function bindDesktopExtras() {
        var menu = document.getElementById('aegis-desktop-menu');
        if (menu && !menu.querySelector('[data-aegis-action="customize"]')) {
            menu.insertAdjacentHTML('beforeend',
                '<div class="aegis-menu-sep"></div>' +
                '<button class="aegis-menu-item" role="menuitem" data-aegis-action="customize">Customize Desktop</button>' +
                '<button class="aegis-menu-item" role="menuitem" data-aegis-action="wallpaper">Change wallpaper</button>' +
                '<button class="aegis-menu-item" role="menuitem" data-aegis-action="code">Open Code Studio</button>' +
                '<button class="aegis-menu-item" role="menuitem" data-aegis-action="refresh">Refresh</button>');
            menu.addEventListener('click', function (e) {
                var btn = e.target.closest('[data-aegis-action]');
                if (!btn) return;
                var act = btn.getAttribute('data-aegis-action');
                if (act === 'customize') toggleCustomize();
                if (act === 'wallpaper') toggleQuickSettings();
                if (act === 'code') openApp('code-editor');
                if (act === 'refresh') { renderAppGrid(); renderWidgets(); renderContinue(); }
            });
        }
        var workspace = document.getElementById('aegis-workspace');
        if (workspace && !workspace._drop) {
            workspace._drop = true;
            workspace.addEventListener('dragover', function (e) {
                if (!e.dataTransfer) return;
                e.preventDefault();
                workspace.classList.add('is-drop');
            });
            workspace.addEventListener('dragleave', function () { workspace.classList.remove('is-drop'); });
            workspace.addEventListener('drop', function (e) {
                workspace.classList.remove('is-drop');
                var files = e.dataTransfer && e.dataTransfer.files;
                if (!files || !files.length) return;
                e.preventDefault();
                var target = e.target.closest('[data-app]');
                var id = target && target.getAttribute('data-app');
                if (id === 'code-editor' || id === 'files') {
                    openApp(id, target);
                    if (global.notificationSystem) notificationSystem.info('Import', 'Dropped files stay in the AegisDesk workspace, not your computer disk.');
                }
            });
        }
        document.addEventListener('keydown', function (e) {
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') return;
            if (e.ctrlKey && e.key === ' ') {
                e.preventDefault();
                if (global.globalSearch) globalSearch.show();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'd' && e.shiftKey) {
                e.preventDefault();
                showOverview();
            }
        });
    }

    function subscribeClock() {
        var apply = function (_rows, now) {
            now = now || new Date();
            var time = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
            var date = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
            var t = document.getElementById('aegis-bar-time');
            var d = document.getElementById('aegis-bar-date');
            var t2 = document.getElementById('time-display');
            var d2 = document.getElementById('date-display');
            if (t) t.textContent = time;
            if (d) d.textContent = date;
            if (t2) t2.textContent = time;
            if (d2) d2.textContent = date;
            document.documentElement.setAttribute('data-aegis-phase', phaseFromHour(now.getHours()));
            if (document.getElementById('aegis-clock-panel')?.classList.contains('visible')) renderClockPanel();
            var world = document.querySelector('[data-widget="world"]');
            if (world) world.innerHTML = worldWidget();
        };
        apply(null, new Date());
        if (global.AegisWorldClock && AegisWorldClock.subscribe) {
            try { AegisWorldClock.subscribe(apply); } catch (err) { console.error('AegisDesktopOS clock subscribe failed', err); }
        }
        if (!subscribeClock._pulsing) {
            subscribeClock._pulsing = true;
            setInterval(function () { apply(null, new Date()); }, 15000);
        }
    }

    function applyPrefs(prefs) {
        prefs = prefs || loadPrefs();
        document.body.setAttribute('data-desktop-density', prefs.density);
        document.body.classList.toggle('aegis-hide-labels', prefs.labels === false);
        document.body.classList.toggle('aegis-live-off', prefs.liveActivity === false);
        document.body.classList.toggle('aegis-time-aware', !!prefs.timeAware);
        document.body.classList.toggle('aegis-larger-text', !!prefs.largerText);
        document.body.classList.toggle('aegis-high-contrast', !!prefs.highContrast);
        document.documentElement.classList.toggle('aegis-high-contrast', !!prefs.highContrast);
    }

    function hidePrototypeSurfaces() {
        var ql = document.getElementById('quick-launch');
        if (ql) ql.hidden = true;
        var widgets = document.getElementById('desktop-widgets');
        if (widgets) widgets.hidden = true;
        var modal = document.getElementById('icon-modal-overlay');
        if (modal) modal.hidden = true;
        document.querySelectorAll('.carousel-nav').forEach(function (n) { n.hidden = true; });
        var title = document.querySelector('.desktop-title-container');
        if (title) title.hidden = true;
    }

    function hookWindowManager() {
        if (!global.windowManager || windowManager._aegisOsHooked) return;
        windowManager._aegisOsHooked = true;
        var orig = windowManager.updateTaskbar.bind(windowManager);
        var dockTimer = null;
        windowManager.updateTaskbar = function () {
            orig();
            updateDockStates();
            renderAppGrid();
            clearTimeout(dockTimer);
            dockTimer = setTimeout(rebuildDock, 80);
        };
    }

    function init() {
        document.body.classList.add('aegis-desktop-os');
        var steps = [
            hidePrototypeSurfaces,
            applyPrefs,
            ensureSystemBar,
            ensureWorkspace,
            rebuildDock,
            enhanceLibrary,
            bindDesktopExtras,
            subscribeClock,
            hookWindowManager
        ];
        steps.forEach(function (fn) {
            try { fn(); } catch (err) { console.error('AegisDesktopOS step failed:', fn.name || fn, err); }
        });
        try {
            if (global.AegisAppStatus) AegisAppStatus.subscribe(renderActivity);
        } catch (err) { console.error('AegisDesktopOS status subscribe failed', err); }
        document.addEventListener('desktopchange', updateBarContext);
        document.addEventListener('aegisprefschange', updateBarContext);
        try { maybeWelcome(); } catch (err) { console.error('AegisDesktopOS welcome failed', err); }
        requestAnimationFrame(function () {
            try { rebuildDock(); renderAppGrid(); renderWidgets(); subscribeClock(); } catch (err) {
                console.error('AegisDesktopOS raf failed', err);
            }
        });
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    global.AegisDesktopOS = {
        prefs: loadPrefs,
        save: savePrefs,
        openApp: openApp,
        refresh: function () { renderAppGrid(); renderWidgets(); renderContinue(); updateDockStates(); rebuildDock(); },
        showOverview: showOverview,
        customize: toggleCustomize,
        mark: MARK,
        categories: CATEGORIES,
        papers: PAPER_NAMES,
        primary: PRIMARY
    };
})(typeof window !== 'undefined' ? window : this);
