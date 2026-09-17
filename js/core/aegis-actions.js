/**
 * Aegis Action Registry — Spec 3
 * User intent → validated action id → confirmation (by risk) → handler.
 * No eval, no dynamic Function, no arbitrary endpoints.
 */
(function (global) {
    'use strict';

    var RISK = { NAV: 0, LOCAL: 1, DESTRUCTIVE: 2, EXTERNAL: 3 };
    var MAX_TEXT = 4000;
    var ACTION_ID_RE = /^[a-z][a-zA-Z0-9._-]{1,79}$/;
    var registry = Object.create(null);
    var lastUndo = null;

    function str(value, max) {
        if (value == null) return '';
        return String(value).slice(0, max || MAX_TEXT);
    }

    function prefs() {
        return (global.AegisOS && AegisOS.prefs) ? AegisOS.prefs.get() : {};
    }

    function toast(message, type) {
        try {
            if (global.notificationSystem && notificationSystem.show) {
                notificationSystem.show('AegisDesk', message, type || 'info');
            } else if (global.notificationCenter && notificationCenter.show) {
                notificationCenter.show('AegisDesk', message, { type: type || 'info' });
            }
        } catch (e) { /* toast must never fail an action */ }
        try {
            if (global.AegisActivity) AegisActivity.record({
                app: 'system',
                type: type === 'error' ? 'error' : 'action',
                title: message,
                status: type === 'error' ? 'failed' : 'ok'
            });
        } catch (e) { /* ignore */ }
    }

    function getNotes() {
        try {
            if (global.osStore && osStore.initialized) {
                var slice = osStore.getStateSlice('notes');
                if (Array.isArray(slice)) return slice;
            }
        } catch (e) { /* ignore */ }
        return (global.storage && storage.get) ? (storage.get('notes', []) || []) : [];
    }

    function saveNotes(notes) {
        if (global.osStore && osStore.initialized) {
            osStore.dispatch({ type: 'NOTES_UPDATE', payload: notes });
        } else if (global.storage) {
            storage.set('notes', notes);
        }
        if (global.notesApp && Array.isArray(notesApp.notes)) {
            notesApp.notes = notes;
            if (global.windowManager && windowManager.windows.has('notes')) {
                var win = windowManager.windows.get('notes');
                var content = win && win.querySelector('.window-content');
                if (content && notesApp.refreshList) notesApp.refreshList(content);
            }
        }
    }

    function getTasks() {
        try {
            if (global.osStore && osStore.initialized) {
                var slice = osStore.getStateSlice('tasks');
                if (Array.isArray(slice)) return slice;
            }
        } catch (e) { /* ignore */ }
        return (global.storage && storage.get) ? (storage.get('tasks', []) || []) : [];
    }

    function saveTasks(tasks) {
        if (global.osStore && osStore.initialized) {
            osStore.dispatch({ type: 'TASKS_UPDATE', payload: tasks });
        } else if (global.storage) {
            storage.set('tasks', tasks);
        }
        if (global.tasksApp) {
            tasksApp.tasks = tasks;
            if (global.windowManager && windowManager.windows.has('tasks') && tasksApp.refresh) {
                var win = windowManager.windows.get('tasks');
                var content = win && win.querySelector('.window-content');
                if (content) tasksApp.refresh(content);
            }
        }
    }

    function openApp(appId, extra) {
        var id = str(appId, 60);
        if (!id) return { success: false, error: 'Missing app' };
        if (global.APP_REGISTRY && !APP_REGISTRY[id] && id !== 'desktop') {
            return { success: false, error: 'Unknown application: ' + id };
        }
        try {
            if (global.AegisRecent) AegisRecent.recordApp(id);
            if (global.desktop && typeof desktop.openApp === 'function') {
                desktop.openApp(id, extra || null);
            } else if (global.APP_REGISTRY && APP_REGISTRY[id] && APP_REGISTRY[id].open) {
                APP_REGISTRY[id].open(extra);
            } else {
                return { success: false, error: 'Could not open ' + id };
            }
            return { success: true, message: 'Opened ' + id };
        } catch (err) {
            return { success: false, error: 'Could not open ' + id };
        }
    }

    function confirmAction(def, args) {
        return new Promise(function (resolve) {
            var settled = false;
            function done(value) {
                if (settled) return;
                settled = true;
                resolve(value);
            }
            if (global.aegisShell && typeof aegisShell.dialog === 'function') {
                aegisShell.dialog({
                    title: def.title || 'Confirm',
                    body: def.confirmText ? def.confirmText(args) : ('Run “' + def.title + '”?'),
                    confirmLabel: def.confirmLabel || 'Continue',
                    danger: def.risk >= RISK.DESTRUCTIVE,
                    onConfirm: function () { done(true); },
                    onCancel: function () { done(false); }
                });
                return;
            }
            done(window.confirm(def.title || 'Confirm this action?'));
        });
    }

    function define(def) {
        if (!def || !ACTION_ID_RE.test(def.id) || typeof def.handler !== 'function') return;
        registry[def.id] = {
            id: def.id,
            title: def.title || def.id,
            description: def.description || '',
            application: def.application || 'system',
            category: def.category || 'Open',
            keywords: def.keywords || [],
            risk: typeof def.risk === 'number' ? def.risk : RISK.NAV,
            confirm: !!def.confirm || (def.risk >= RISK.DESTRUCTIVE),
            args: def.args || [],
            aliases: def.aliases || [],
            undoable: !!def.undoable,
            confirmText: def.confirmText || null,
            confirmLabel: def.confirmLabel || null,
            handler: def.handler
        };
    }

    define({
        id: 'apps.open',
        title: 'Open application',
        description: 'Open a known AegisDesk application',
        application: 'system',
        category: 'Open',
        keywords: ['open', 'launch', 'app'],
        args: ['appId'],
        risk: RISK.NAV,
        handler: function (args) {
            return openApp(args.appId || args.id || args.name);
        }
    });

    var APP_ALIASES = {
        mail: 'mail', email: 'mail', inbox: 'mail',
        music: 'music', youtube: 'music', songs: 'music',
        notes: 'notes', note: 'notes',
        tasks: 'tasks', task: 'tasks', todo: 'tasks',
        files: 'files', file: 'files',
        calendar: 'calendar', cal: 'calendar',
        settings: 'settings', preferences: 'settings',
        calculator: 'calculator', calc: 'calculator',
        browser: 'browser', web: 'browser',
        bookmarks: 'bookmarks', bookmark: 'bookmarks',
        help: 'help', docs: 'help',
        weather: 'weather',
        terminal: 'terminal',
        gallery: 'gallery',
        drawing: 'drawing', draw: 'drawing',
        monitor: 'system-monitor', 'system-monitor': 'system-monitor',
        insights: 'insights', intelligence: 'insights',
        profile: 'user', user: 'user',
        news: 'news-hub', 'news-hub': 'news-hub',
        code: 'code-editor', editor: 'code-editor', 'code-editor': 'code-editor',
        studio: 'code-editor', 'code studio': 'code-editor', 'aegis code studio': 'code-editor',
        chat: 'ai-chat', ai: 'ai-chat', assistant: 'ai-chat', 'ai-chat': 'ai-chat',
        clock: 'world-clock', 'world-clock': 'world-clock', timezone: 'world-clock', timezones: 'world-clock'
    };

    function resolveAppId(name) {
        var raw = str(name, 60).toLowerCase().trim();
        if (!raw) return '';
        if (global.APP_REGISTRY && APP_REGISTRY[raw]) return raw;
        if (APP_ALIASES[raw]) return APP_ALIASES[raw];
        if (global.APP_REGISTRY) {
            var keys = Object.keys(APP_REGISTRY);
            for (var i = 0; i < keys.length; i++) {
                var app = APP_REGISTRY[keys[i]];
                if ((app.title || '').toLowerCase() === raw) return keys[i];
            }
        }
        return '';
    }

    ['mail', 'music', 'calendar', 'settings', 'calculator',
        'browser', 'bookmarks', 'weather', 'terminal', 'gallery', 'drawing',
        'system-monitor', 'insights', 'user', 'news-hub', 'code-editor', 'ai-chat', 'world-clock'].forEach(function (id) {
        define({
            id: id.replace(/-/g, '') + '.open',
            title: 'Open ' + id,
            description: 'Open the ' + id + ' application',
            application: id,
            category: 'Open',
            keywords: ['open', id],
            aliases: ['open ' + id],
            risk: RISK.NAV,
            handler: function () { return openApp(id); }
        });
    });

    function studioFrame() {
        try {
            var win = global.windowManager && windowManager.windows.get('code-editor');
            return win && win.querySelector && win.querySelector('iframe');
        } catch (e) { return null; }
    }

    function studioCommand(command) {
        var opened = openApp('code-editor');
        setTimeout(function () {
            var frame = studioFrame();
            if (frame && frame.contentWindow) {
                frame.contentWindow.postMessage({ source: 'aegis-desktop', command: command }, window.location.origin);
            }
        }, 400);
        return opened.success
            ? { success: true, message: 'Aegis Code Studio: ' + command }
            : opened;
    }

    define({
        id: 'codestudio.newProject',
        title: 'Code Studio: New Project',
        description: 'Open Aegis Code Studio at the new-project screen',
        application: 'code-editor',
        category: 'Create',
        keywords: ['code', 'studio', 'new project'],
        aliases: ['new project', 'code studio new'],
        risk: RISK.NAV,
        handler: function () { return studioCommand('newProject'); }
    });
    define({
        id: 'codestudio.openFile',
        title: 'Code Studio: Open File',
        description: 'Open files into the Code Studio workspace',
        application: 'code-editor',
        category: 'Open',
        keywords: ['code', 'open file'],
        risk: RISK.NAV,
        handler: function () { return studioCommand('openFile'); }
    });
    define({
        id: 'codestudio.run',
        title: 'Code Studio: Run',
        description: 'Run the current Code Studio project in the sandboxed preview',
        application: 'code-editor',
        category: 'Workspace',
        keywords: ['run', 'preview', 'code'],
        risk: RISK.LOCAL,
        handler: function () { return studioCommand('run'); }
    });
    define({
        id: 'codestudio.format',
        title: 'Code Studio: Format',
        description: 'Format the current Code Studio file',
        application: 'code-editor',
        category: 'Workspace',
        keywords: ['format', 'code'],
        risk: RISK.LOCAL,
        handler: function () { return studioCommand('format'); }
    });
    define({
        id: 'codestudio.togglePreview',
        title: 'Code Studio: Toggle Preview',
        description: 'Show or hide the Code Studio live preview',
        application: 'code-editor',
        category: 'Workspace',
        keywords: ['preview', 'code studio'],
        risk: RISK.NAV,
        handler: function () { return studioCommand('togglePreview'); }
    });
    define({
        id: 'codestudio.askAegis',
        title: 'Code Studio: Companion',
        description: 'Focus Aegis Companion in Code Studio',
        application: 'code-editor',
        category: 'Workspace',
        keywords: ['ask aegis', 'agent', 'code'],
        risk: RISK.NAV,
        handler: function () { return studioCommand('askAegis'); }
    });
    define({
        id: 'codestudio.reviewChanges',
        title: 'Code Studio: Review Changes',
        description: 'Open the Code Studio changeset review surface',
        application: 'code-editor',
        category: 'Workspace',
        keywords: ['review', 'diff', 'changeset'],
        risk: RISK.NAV,
        handler: function () { return studioCommand('reviewChanges'); }
    });

    define({
        id: 'notes.create',
        title: 'Create note',
        description: 'Create a local note',
        application: 'notes',
        category: 'Create',
        keywords: ['note', 'write', 'new note'],
        args: ['title', 'content'],
        risk: RISK.LOCAL,
        undoable: true,
        handler: function (args) {
            var notes = getNotes().slice();
            var note = {
                id: 'note_' + Date.now(),
                title: str(args.title, 200) || 'Untitled',
                content: str(args.content, MAX_TEXT),
                createdAt: Date.now(),
                updatedAt: Date.now(),
                linkedNotes: []
            };
            var prev = notes.slice();
            notes.unshift(note);
            saveNotes(notes);
            lastUndo = {
                label: 'Note created',
                run: function () { saveNotes(prev); }
            };
            openApp('notes');
            setTimeout(function () {
                if (global.notesApp && notesApp.openNote) notesApp.openNote(note.id);
            }, 180);
            return { success: true, data: { id: note.id }, message: 'Note created: “' + note.title + '”' };
        }
    });

    define({
        id: 'notes.open',
        title: 'Open note',
        description: 'Open Notes and select a note when found',
        application: 'notes',
        category: 'Open',
        args: ['id', 'query'],
        risk: RISK.NAV,
        handler: function (args) {
            var notes = getNotes();
            var id = str(args.id, 80);
            var query = str(args.query, 200).toLowerCase();
            var note = id ? notes.find(function (n) { return n.id === id; }) : null;
            if (!note && query) {
                note = notes.find(function (n) {
                    return (n.title || '').toLowerCase().indexOf(query) !== -1
                        || (n.content || '').toLowerCase().indexOf(query) !== -1;
                });
            }
            var result = openApp('notes');
            if (note) {
                setTimeout(function () {
                    if (global.notesApp && notesApp.openNote) notesApp.openNote(note.id);
                }, 180);
                return { success: true, message: 'Opened note “' + (note.title || 'Untitled') + '”' };
            }
            return result.success
                ? { success: true, message: query ? 'No matching note. Notes is open.' : 'Notes opened.' }
                : result;
        }
    });

    define({
        id: 'notes.search',
        title: 'Search notes',
        description: 'Find local notes by keyword',
        application: 'notes',
        category: 'Search',
        args: ['query'],
        risk: RISK.NAV,
        handler: function (args) {
            var q = str(args.query, 200).toLowerCase();
            if (!q) return { success: false, error: 'Search query required' };
            var matches = getNotes().filter(function (n) {
                return (n.title || '').toLowerCase().indexOf(q) !== -1
                    || (n.content || '').toLowerCase().indexOf(q) !== -1;
            });
            if (global.AegisIntelligence) AegisIntelligence.showSearchResults('notes', q, matches);
            openApp('notes');
            if (matches[0] && global.notesApp && notesApp.openNote) {
                setTimeout(function () { notesApp.openNote(matches[0].id); }, 180);
            }
            return {
                success: true,
                data: { count: matches.length },
                message: matches.length ? ('Found ' + matches.length + ' note' + (matches.length === 1 ? '' : 's') + '.') : 'No notes matched that search.'
            };
        }
    });

    define({
        id: 'tasks.create',
        title: 'Create task',
        description: 'Create a local task',
        application: 'tasks',
        category: 'Create',
        keywords: ['todo', 'remind', 'task'],
        args: ['text', 'title', 'dueDate', 'description'],
        risk: RISK.LOCAL,
        undoable: true,
        handler: function (args) {
            var text = str(args.text || args.title, 300);
            if (!text) return { success: false, error: 'Task text is required' };
            var tasks = getTasks().slice();
            var prev = tasks.slice();
            var task = {
                id: 'task_' + Date.now(),
                text: text,
                completed: false,
                priority: 'medium',
                category: 'general',
                dueDate: args.dueDate || null,
                description: str(args.description, 1000),
                createdAt: Date.now(),
                updatedAt: Date.now()
            };
            tasks.push(task);
            saveTasks(tasks);
            lastUndo = {
                label: 'Task created',
                run: function () { saveTasks(prev); }
            };
            openApp('tasks');
            return { success: true, data: { id: task.id }, message: 'Task created: “' + task.text + '”' };
        }
    });

    define({
        id: 'tasks.complete',
        title: 'Complete task',
        description: 'Mark a local task complete',
        application: 'tasks',
        category: 'Create',
        args: ['id', 'query'],
        risk: RISK.LOCAL,
        undoable: true,
        handler: function (args) {
            var tasks = getTasks().slice();
            var prev = JSON.parse(JSON.stringify(tasks));
            var id = str(args.id, 80);
            var query = str(args.query || args.text, 200).toLowerCase();
            var task = tasks.find(function (t) {
                if (id && t.id === id) return true;
                if (query && (t.text || '').toLowerCase().indexOf(query) !== -1) return true;
                return false;
            });
            if (!task) return { success: false, error: 'Task not found' };
            task.completed = true;
            task.completedAt = Date.now();
            task.updatedAt = Date.now();
            saveTasks(tasks);
            lastUndo = { label: 'Task completed', run: function () { saveTasks(prev); } };
            return { success: true, message: 'Task completed: “' + task.text + '”' };
        }
    });

    define({
        id: 'tasks.search',
        title: 'Search tasks',
        description: 'Find local tasks by keyword',
        application: 'tasks',
        category: 'Search',
        args: ['query'],
        risk: RISK.NAV,
        handler: function (args) {
            var q = str(args.query, 200).toLowerCase();
            if (!q) return { success: false, error: 'Search query required' };
            var matches = getTasks().filter(function (t) {
                return (t.text || '').toLowerCase().indexOf(q) !== -1
                    || (t.description || '').toLowerCase().indexOf(q) !== -1;
            });
            openApp('tasks');
            return {
                success: true,
                message: matches.length ? ('Found ' + matches.length + ' task' + (matches.length === 1 ? '' : 's') + '.') : 'No tasks matched that search.'
            };
        }
    });

    define({
        id: 'mail.compose',
        title: 'Compose email',
        description: 'Open Mail compose. You send it — Aegis never sends silently.',
        application: 'mail',
        category: 'Create',
        args: ['to', 'subject', 'body'],
        risk: RISK.EXTERNAL,
        handler: function (args) {
            if (global.storage) {
                storage.set('mail_compose_intent', {
                    to: str(args.to, 200),
                    subject: str(args.subject, 200),
                    body: str(args.body, MAX_TEXT),
                    ts: Date.now()
                });
            }
            var opened = openApp('mail');
            return {
                success: opened.success,
                message: 'Draft prepared in Mail. Review the recipient and send it yourself.',
                requiresUserSend: true
            };
        }
    });

    define({
        id: 'calendar.createEvent',
        title: 'Create calendar event',
        description: 'Prepare a local Calendar event',
        application: 'calendar',
        category: 'Create',
        args: ['title', 'date', 'notes'],
        risk: RISK.LOCAL,
        handler: function (args) {
            var title = str(args.title, 200);
            if (!title) return { success: false, error: 'Event title is required' };
            if (global.storage) {
                storage.set('calendar_create_intent', {
                    title: title,
                    date: str(args.date, 40),
                    notes: str(args.notes, 1000),
                    ts: Date.now()
                });
            }
            openApp('calendar');
            return { success: true, message: 'Calendar opened with a prepared event. Confirm it there.' };
        }
    });

    define({
        id: 'files.open',
        title: 'Open Files',
        description: 'Open the virtual Files workspace',
        application: 'files',
        category: 'Open',
        args: ['path', 'query'],
        risk: RISK.NAV,
        handler: function (args) {
            if (global.storage && (args.path || args.query)) {
                storage.set('files_open_intent', { path: str(args.path, 200), query: str(args.query, 200), ts: Date.now() });
            }
            return openApp('files');
        }
    });

    define({
        id: 'files.search',
        title: 'Search files',
        description: 'Search virtual file names',
        application: 'files',
        category: 'Search',
        args: ['query'],
        risk: RISK.NAV,
        handler: function (args) {
            if (global.storage) storage.set('files_open_intent', { query: str(args.query, 200), ts: Date.now() });
            return openApp('files');
        }
    });

    define({
        id: 'music.search',
        title: 'Search Music',
        description: 'Open Music and search YouTube through the server API',
        application: 'music',
        category: 'Search',
        args: ['query'],
        risk: RISK.NAV,
        handler: function (args) {
            var q = str(args.query, 200);
            if (global.storage) storage.set('music_search_intent', { query: q, ts: Date.now() });
            var opened = openApp('music');
            return {
                success: opened.success,
                message: q ? ('Music opened. Searching for “' + q + '”.') : 'Music opened.'
            };
        }
    });

    define({
        id: 'browser.open',
        title: 'Open Browser',
        description: 'Open Browser, optionally to a URL',
        application: 'browser',
        category: 'Open',
        args: ['url'],
        risk: RISK.NAV,
        handler: function (args) {
            var url = str(args.url, 500);
            if (url && global.browserApp && browserApp.open) {
                browserApp.open(url);
                return { success: true, message: 'Opened Browser' };
            }
            return openApp('browser');
        }
    });

    define({
        id: 'bookmarks.open',
        title: 'Open bookmark',
        description: 'Open Bookmarks or a bookmark in Browser',
        application: 'bookmarks',
        category: 'Open',
        args: ['url', 'name'],
        risk: RISK.NAV,
        handler: function (args) {
            var url = str(args.url, 500);
            if (url && global.browserApp && browserApp.open) {
                browserApp.open(url, str(args.name, 120) || 'Bookmark');
                return { success: true, message: 'Opened bookmark in Browser' };
            }
            return openApp('bookmarks');
        }
    });

    define({
        id: 'settings.setTheme',
        title: 'Set theme',
        description: 'Switch the AegisDesk theme',
        application: 'settings',
        category: 'Appearance',
        aliases: ['dark mode', 'night mode', 'light mode'],
        args: ['theme'],
        risk: RISK.LOCAL,
        undoable: true,
        handler: function (args) {
            if (!global.themeSystem || typeof themeSystem.setTheme !== 'function') {
                return { success: false, error: 'Theme system unavailable' };
            }
            var prev = themeSystem.currentTheme || (global.storage && storage.get('theme'));
            var requested = str(args.theme, 40).toLowerCase();
            if (requested === 'dark' || requested === 'night') requested = 'aegis-dark';
            if (requested === 'light' || requested === 'day') requested = 'aegis-light';
            if (requested === 'system' || requested === 'auto') {
                var prefersDark = global.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
                requested = prefersDark ? 'aegis-dark' : 'aegis-light';
            }
            if (!requested) {
                themeSystem.cycleTheme();
                lastUndo = { label: 'Theme changed', run: function () { if (prev) themeSystem.setTheme(prev); } };
                return { success: true, message: 'Theme changed' };
            }
            themeSystem.setTheme(requested);
            lastUndo = { label: 'Theme changed', run: function () { if (prev) themeSystem.setTheme(prev); } };
            return { success: true, message: 'Theme set to ' + requested };
        }
    });

    define({
        id: 'settings.setWallpaper',
        title: 'Change wallpaper',
        description: 'Apply an Aegis wallpaper: aurora, midnight, atmosphere, horizon, obsidian, celestial, or light-field',
        application: 'settings',
        category: 'Appearance',
        args: ['wallpaper'],
        risk: RISK.LOCAL,
        undoable: true,
        handler: function (args) {
            if (!global.AegisExperience || typeof AegisExperience.applyWallpaper !== 'function') {
                return { success: false, error: 'Wallpaper engine unavailable' };
            }
            var prev = AegisExperience.currentWallpaper();
            var requested = str(args.wallpaper, 40).toLowerCase().replace(/\s+/g, '-');
            if (!requested) requested = 'aurora';
            AegisExperience.applyWallpaper(requested);
            lastUndo = { label: 'Wallpaper changed', run: function () { AegisExperience.applyWallpaper(prev); } };
            return { success: true, message: 'Wallpaper set to ' + requested };
        }
    });

    define({
        id: 'help.open',
        title: 'Open Help',
        description: 'Open Help and documentation',
        application: 'help',
        category: 'Help',
        args: ['query'],
        risk: RISK.NAV,
        handler: function (args) {
            if (global.storage && args.query) storage.set('help_open_intent', { query: str(args.query, 200), ts: Date.now() });
            return openApp('help');
        }
    });

    define({
        id: 'focus.enter',
        title: 'Enter Focus Mode',
        description: 'Quiet non-critical notifications and reduce desktop noise',
        application: 'system',
        category: 'Workspace',
        args: ['minutes'],
        risk: RISK.LOCAL,
        handler: function (args) {
            if (!global.AegisFocus) return { success: false, error: 'Focus Mode unavailable' };
            AegisFocus.enter(Number(args.minutes) || 25);
            return { success: true, message: 'Focus Mode on' };
        }
    });

    define({
        id: 'focus.exit',
        title: 'Exit Focus Mode',
        description: 'Restore normal notifications and desktop chrome',
        application: 'system',
        category: 'Workspace',
        risk: RISK.LOCAL,
        handler: function () {
            if (!global.AegisFocus) return { success: false, error: 'Focus Mode unavailable' };
            AegisFocus.exit();
            return { success: true, message: 'Focus Mode off' };
        }
    });

    define({
        id: 'focus.pause',
        title: 'Pause Focus timer',
        description: 'Pause the Focus Mode countdown without leaving Focus',
        application: 'system',
        category: 'Workspace',
        risk: RISK.LOCAL,
        handler: function () {
            if (!global.AegisFocus) return { success: false, error: 'Focus Mode unavailable' };
            if (!AegisFocus.active) return { success: false, error: 'Focus Mode is not on' };
            AegisFocus.pause();
            return { success: true, message: 'Focus timer paused' };
        }
    });

    define({
        id: 'focus.resume',
        title: 'Resume Focus timer',
        description: 'Resume a paused Focus Mode countdown',
        application: 'system',
        category: 'Workspace',
        risk: RISK.LOCAL,
        handler: function () {
            if (!global.AegisFocus) return { success: false, error: 'Focus Mode unavailable' };
            if (!AegisFocus.active) return { success: false, error: 'Focus Mode is not on' };
            AegisFocus.resume();
            return { success: true, message: 'Focus timer resumed' };
        }
    });

    define({
        id: 'spaces.switch',
        title: 'Switch Space',
        description: 'Switch the active AegisDesk Space',
        application: 'system',
        category: 'Workspace',
        args: ['index'],
        risk: RISK.NAV,
        handler: function (args) {
            var idx = Number(args.index);
            if (!global.virtualDesktops) return { success: false, error: 'Spaces unavailable' };
            if (!Number.isFinite(idx)) return { success: false, error: 'Space index required' };
            virtualDesktops.switchTo(idx);
            return { success: true, message: 'Switched to Space ' + (idx + 1) };
        }
    });

    define({
        id: 'layout.apply',
        title: 'Apply window layout',
        description: 'Arrange open windows: focus, columns, or main+side',
        application: 'system',
        category: 'Window',
        args: ['layout'],
        risk: RISK.LOCAL,
        handler: function (args) {
            if (!global.AegisLayouts) return { success: false, error: 'Layouts unavailable' };
            return AegisLayouts.apply(str(args.layout, 40) || 'focus');
        }
    });

    define({
        id: 'clipboard.show',
        title: 'Clipboard History',
        description: 'Show items copied through AegisDesk',
        application: 'system',
        category: 'Open',
        risk: RISK.NAV,
        handler: function () {
            if (global.AegisClipboard) AegisClipboard.show();
            else if (global.clipboardManager) clipboardManager.showHistory();
            return { success: true, message: 'Clipboard History opened' };
        }
    });

    define({
        id: 'activity.show',
        title: 'Activity Center',
        description: 'Show recent AegisDesk activity',
        application: 'system',
        category: 'Open',
        risk: RISK.NAV,
        handler: function () {
            if (global.AegisActivity) AegisActivity.show();
            return { success: true, message: 'Activity Center opened' };
        }
    });

    define({
        id: 'intelligence.open',
        title: 'Aegis Intelligence',
        description: 'Open the system intelligence surface',
        application: 'system',
        category: 'Open',
        risk: RISK.NAV,
        handler: function (args) {
            if (global.AegisIntelligence) AegisIntelligence.show(str(args.query, 200));
            return { success: true, message: 'Aegis Intelligence opened' };
        }
    });

    define({
        id: 'desktop.customize',
        title: 'Customize Desktop',
        description: 'Show or hide widgets, density, and wallpaper',
        application: 'system',
        category: 'Appearance',
        aliases: ['customize desktop', 'widgets'],
        risk: RISK.NAV,
        handler: function () {
            if (global.AegisDesktopOS && AegisDesktopOS.customize) AegisDesktopOS.customize();
            return { success: true, message: 'Customize Desktop opened' };
        }
    });

    define({
        id: 'worldclock.open',
        title: 'Open World Clock',
        description: 'Open world clocks and manage cities',
        application: 'world-clock',
        category: 'Open',
        aliases: ['world clock', 'add world clock', 'time zones'],
        risk: RISK.NAV,
        handler: function () {
            return openApp('world-clock');
        }
    });

    function catalog() {
        return Object.keys(registry).map(function (id) {
            var a = registry[id];
            return {
                id: a.id,
                title: a.title,
                description: a.description,
                application: a.application,
                category: a.category,
                keywords: a.keywords,
                risk: a.risk,
                confirm: a.confirm,
                args: a.args,
                aliases: a.aliases
            };
        });
    }

    function get(id) {
        return registry[id] || null;
    }

    function validate(id, args) {
        if (!ACTION_ID_RE.test(id || '')) {
            return { ok: false, error: 'Unknown or malformed action' };
        }
        var def = registry[id];
        if (!def) return { ok: false, error: 'Unknown action: ' + id };
        var safe = {};
        (def.args || []).forEach(function (name) {
            if (args && args[name] != null) {
                var v = args[name];
                if (typeof v === 'string') safe[name] = v.slice(0, MAX_TEXT);
                else if (typeof v === 'number' && Number.isFinite(v)) safe[name] = v;
                else if (typeof v === 'boolean') safe[name] = v;
            }
        });
        Object.keys(args || {}).forEach(function (key) {
            if (safe[key] !== undefined) return;
            if ((def.args || []).indexOf(key) === -1) return;
        });
        if (args) {
            Object.keys(args).forEach(function (key) {
                if (safe[key] !== undefined) return;
                var v = args[key];
                if (typeof v === 'string' && (def.args || []).indexOf(key) !== -1) {
                    safe[key] = v.slice(0, MAX_TEXT);
                }
            });
            ['appId', 'id', 'name', 'query', 'text', 'title', 'to', 'subject', 'body',
                'theme', 'url', 'path', 'layout', 'index', 'minutes', 'date', 'notes', 'description'].forEach(function (k) {
                if (args[k] != null && safe[k] === undefined) {
                    var v = args[k];
                    if (typeof v === 'string') safe[k] = v.slice(0, MAX_TEXT);
                    else if (typeof v === 'number' && Number.isFinite(v)) safe[k] = v;
                }
            });
        }
        return { ok: true, def: def, args: safe };
    }

    async function run(id, rawArgs, options) {
        options = options || {};
        var checked = validate(id, rawArgs || {});
        if (!checked.ok) {
            toast(checked.error, 'error');
            if (global.AegisActivity) AegisActivity.record({
                app: 'system', type: 'action', title: 'Rejected action', description: checked.error, status: 'failed'
            });
            return { success: false, error: checked.error, cancelled: false };
        }
        var def = checked.def;
        var args = checked.args;
        if (def.risk >= RISK.DESTRUCTIVE && def.confirm !== false && !options.skipConfirm) {
            var ok = await confirmAction(def, args);
            if (!ok) {
                toast('Action cancelled.', 'info');
                return { success: false, cancelled: true, error: 'Action cancelled' };
            }
        }
        try {
            var result = await def.handler(args);
            if (!result) result = { success: false, error: 'Action returned no result' };
            if (result.success) {
                toast(result.message || (def.title + ' completed.'), 'success');
                if (global.AegisActivity) AegisActivity.record({
                    app: def.application,
                    type: 'action',
                    title: def.title,
                    description: result.message || '',
                    status: 'ok',
                    target: def.id
                });
                if (global.AegisRecent) AegisRecent.recordCommand(def.id);
            } else {
                toast(result.error || 'Action failed.', 'error');
                if (global.AegisActivity) AegisActivity.record({
                    app: def.application,
                    type: 'action',
                    title: def.title,
                    description: result.error || 'failed',
                    status: 'failed',
                    target: def.id
                });
            }
            return result;
        } catch (err) {
            var msg = 'Action failed.';
            toast(msg, 'error');
            if (global.AegisActivity) AegisActivity.record({
                app: def.application, type: 'action', title: def.title, status: 'failed'
            });
            return { success: false, error: msg };
        }
    }

    function undo() {
        if (!lastUndo) return { success: false, error: 'Nothing to undo' };
        try {
            lastUndo.run();
            var label = lastUndo.label;
            lastUndo = null;
            toast('Undone: ' + label, 'success');
            return { success: true, message: 'Undone' };
        } catch (e) {
            return { success: false, error: 'Undo failed' };
        }
    }

    global.AegisActions = {
        RISK: RISK,
        define: define,
        catalog: catalog,
        get: get,
        validate: validate,
        run: run,
        undo: undo,
        resolveAppId: resolveAppId,
        openApp: openApp,
        getNotes: getNotes,
        getTasks: getTasks
    };
})(typeof window !== 'undefined' ? window : globalThis);
