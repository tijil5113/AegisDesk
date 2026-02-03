/**
 * Tasks App - Advanced AI-Powered Task Manager
 * MODULAR: Only tasks-related logic. No changes to desktop/window manager.
 */
(function (global) {
    'use strict';

    var TASK_TYPES = ['normal', 'goal', 'project', 'habit', 'focus', 'milestone', 'reminder'];
    var PRIORITIES = ['low', 'medium', 'high', 'critical'];
    var CATEGORIES = ['general', 'work', 'study', 'personal', 'projects', 'health', 'shopping', 'home'];
    var VIEWS = ['list', 'today', 'upcoming', 'overdue', 'high-priority', 'completed', 'habits', 'projects', 'kanban', 'calendar', 'tags'];
    var XP_PER_TASK = 10;
    var XP_LEVEL_BASE = 100;

    function normalizeTask(t) {
        return {
            id: t.id || 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
            text: t.text || '',
            completed: !!t.completed,
            completedAt: t.completedAt || null,
            priority: PRIORITIES.indexOf(t.priority) >= 0 ? t.priority : (t.priority === 'normal' ? 'medium' : 'medium'),
            category: t.category && CATEGORIES.indexOf(t.category) >= 0 ? t.category : 'general',
            dueDate: t.dueDate ? (typeof t.dueDate === 'number' ? t.dueDate : new Date(t.dueDate).getTime()) : null,
            dueTime: t.dueTime || null,
            tags: Array.isArray(t.tags) ? t.tags : [],
            description: t.description || '',
            subtasks: Array.isArray(t.subtasks) ? t.subtasks.map(function (s) { return typeof s === 'object' ? { text: s.text, done: !!s.done } : { text: String(s), done: false }; }) : [],
            estimatedMinutes: typeof t.estimatedMinutes === 'number' ? t.estimatedMinutes : null,
            attachments: Array.isArray(t.attachments) ? t.attachments : [],
            recurring: t.recurring || null,
            comments: Array.isArray(t.comments) ? t.comments : [],
            progress: typeof t.progress === 'number' ? Math.min(100, Math.max(0, t.progress)) : (t.completed ? 100 : 0),
            type: TASK_TYPES.indexOf(t.type) >= 0 ? t.type : 'normal',
            projectId: t.projectId || null,
            habitStreak: typeof t.habitStreak === 'number' ? t.habitStreak : 0,
            focusMinutes: typeof t.focusMinutes === 'number' ? t.focusMinutes : 0,
            createdAt: t.createdAt || Date.now(),
            updatedAt: t.updatedAt || Date.now()
        };
    }

    function loadTasks() {
        var raw = [];
        if (typeof osStore !== 'undefined' && osStore.initialized) {
            raw = osStore.getStateSlice('tasks') || [];
        } else if (typeof storage !== 'undefined') {
            raw = storage.get('tasks', []);
        }
        return (Array.isArray(raw) ? raw : []).map(normalizeTask);
    }

    function loadMeta() {
        if (typeof storage === 'undefined') return { xp: 0, level: 1, streak: 0, lastCompleteDate: null, badges: [], history: [] };
        return storage.get('tasks_meta', { xp: 0, level: 1, streak: 0, lastCompleteDate: null, badges: [], history: [] });
    }

    function saveMeta(meta) {
        if (typeof storage !== 'undefined') storage.set('tasks_meta', meta);
    }

    function TasksApp() {
        this.tasks = loadTasks();
        this.windowId = 'tasks';
        this.view = 'list';
        this.filters = { category: 'all', priority: 'all', status: 'all', tag: 'all', type: 'all' };
        this.searchQuery = '';
        this.workspace = 'general';
        this.undoStack = [];
        this.maxUndo = 20;
        this._batchTimer = null;
        this._listEl = null;
        this._contentEl = null;

        var self = this;
        if (typeof osStore !== 'undefined') {
            this.unsubscribe = osStore.subscribe(function (state, prevState) {
                if (prevState && state.tasks !== prevState.tasks) {
                    self.tasks = (Array.isArray(state.tasks) ? state.tasks : []).map(normalizeTask);
                    self.scheduleRefresh();
                }
            });
            if (osStore.initialized) {
                var st = osStore.getStateSlice('tasks');
                if (Array.isArray(st)) self.tasks = st.map(normalizeTask);
            }
        }
    }

    TasksApp.prototype.open = function () {
        if (!Array.isArray(this.tasks)) this.tasks = [];
        this.runAutomation();
        var content = this.render();
        var win = windowManager.createWindow(this.windowId, {
            title: 'Tasks',
            width: 720,
            height: 760,
            class: 'app-tasks',
            icon: '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>',
            content: content
        });
        this.attachEvents(win);
    };

    TasksApp.prototype.runAutomation = function () {
        var now = Date.now();
        var day = 86400000;
        var changed = false;
        this.tasks.forEach(function (t) {
            if (t.completed && t.completedAt && (now - t.completedAt > 30 * day)) {
                if (!t.archived) { t.archived = true; changed = true; }
            }
            if (!t.completed && t.dueDate && t.dueDate < now - day) {
                t.overdue = true;
            }
        });
        this.tasks.sort(function (a, b) {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            var pa = PRIORITIES.indexOf(a.priority);
            var pb = PRIORITIES.indexOf(b.priority);
            if (pa !== pb) return pb - pa;
            if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        if (changed) this.save();
    };

    TasksApp.prototype.getFilteredTasks = function () {
        var list = this.tasks.slice();
        var v = this.view;
        var f = this.filters;
        var q = (this.searchQuery || '').trim().toLowerCase();

        if (q) {
            list = list.filter(function (t) {
                return (t.text || '').toLowerCase().indexOf(q) >= 0 ||
                    (t.description || '').toLowerCase().indexOf(q) >= 0 ||
                    (t.tags || []).some(function (tag) { return tag.toLowerCase().indexOf(q) >= 0; });
            });
        }

        if (v === 'today') {
            var todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);
            var todayEnd = todayStart.getTime() + 86400000;
            list = list.filter(function (t) {
                return !t.completed && t.dueDate >= todayStart.getTime() && t.dueDate < todayEnd;
            });
        } else if (v === 'upcoming') {
            var tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            list = list.filter(function (t) {
                return !t.completed && t.dueDate && t.dueDate >= tomorrow.getTime();
            });
        } else if (v === 'overdue') {
            list = list.filter(function (t) {
                return !t.completed && t.dueDate && t.dueDate < new Date().setHours(0, 0, 0, 0);
            });
        } else if (v === 'high-priority') {
            list = list.filter(function (t) {
                return !t.completed && (t.priority === 'high' || t.priority === 'critical');
            });
        } else if (v === 'completed') {
            list = list.filter(function (t) { return t.completed; });
        } else if (v === 'habits') {
            list = list.filter(function (t) { return t.type === 'habit'; });
        } else if (v === 'projects') {
            list = list.filter(function (t) { return t.type === 'project' || t.projectId; });
        } else if (v === 'tags' && f.tag !== 'all') {
            list = list.filter(function (t) { return (t.tags || []).indexOf(f.tag) >= 0; });
        } else {
            if (f.category !== 'all') list = list.filter(function (t) { return (t.category || 'general') === f.category; });
            if (f.priority !== 'all') list = list.filter(function (t) { return (t.priority || 'medium') === f.priority; });
            if (f.status === 'active') list = list.filter(function (t) { return !t.completed; });
            else if (f.status === 'completed') list = list.filter(function (t) { return t.completed; });
            if (f.type !== 'all') list = list.filter(function (t) { return (t.type || 'normal') === f.type; });
        }

        list.sort(function (a, b) {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            var pa = PRIORITIES.indexOf(a.priority);
            var pb = PRIORITIES.indexOf(b.priority);
            if (pa !== pb) return pb - pa;
            if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        return list;
    };

    TasksApp.prototype.getStats = function () {
        var active = this.tasks.filter(function (t) { return !t.completed; }).length;
        var completed = this.tasks.filter(function (t) { return t.completed; }).length;
        var today = 0;
        var now = Date.now();
        var day = 86400000;
        var todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        var todayEnd = todayStart.getTime() + day;
        this.tasks.forEach(function (t) {
            if (!t.completed && t.dueDate >= todayStart.getTime() && t.dueDate < todayEnd) today++;
        });
        return { active: active, completed: completed, total: this.tasks.length, today: today };
    };

    TasksApp.prototype.getCategories = function () {
        var set = {};
        this.tasks.forEach(function (t) {
            var c = t.category || 'general';
            if (!set[c]) set[c] = true;
        });
        return CATEGORIES.filter(function (c) { return set[c]; });
    };

    TasksApp.prototype.getTags = function () {
        var set = {};
        this.tasks.forEach(function (t) {
            (t.tags || []).forEach(function (tag) { set[tag] = true; });
        });
        return Object.keys(set).sort();
    };

    TasksApp.prototype.pushUndo = function (snapshot) {
        this.undoStack.push(JSON.stringify(this.tasks));
        if (this.undoStack.length > this.maxUndo) this.undoStack.shift();
    };

    TasksApp.prototype.undo = function () {
        if (this.undoStack.length === 0) return false;
        var prev = this.undoStack.pop();
        try {
            this.tasks = JSON.parse(prev).map(normalizeTask);
            this.save();
            return true;
        } catch (e) { return false; }
    };

    TasksApp.prototype.addXP = function (amount) {
        var meta = loadMeta();
        meta.xp = (meta.xp || 0) + amount;
        meta.level = Math.floor((meta.xp || 0) / XP_LEVEL_BASE) + 1;
        var today = new Date().toDateString();
        if (meta.lastCompleteDate) {
            var last = new Date(meta.lastCompleteDate).toDateString();
            var d1 = new Date(last);
            var d2 = new Date(today);
            var diff = Math.floor((d2 - d1) / 86400000);
            if (diff === 0) meta.streak = meta.streak || 0;
            else if (diff === 1) meta.streak = (meta.streak || 0) + 1;
            else meta.streak = 1;
        } else meta.streak = 1;
        meta.lastCompleteDate = today;
        saveMeta(meta);
    };

    TasksApp.prototype.save = function () {
        if (typeof osStore !== 'undefined' && osStore.initialized) {
            osStore.dispatch({ type: 'TASKS_UPDATE', payload: this.tasks });
        } else if (typeof storage !== 'undefined') {
            storage.set('tasks', this.tasks);
        }
    };

    TasksApp.prototype.scheduleRefresh = function () {
        var self = this;
        if (this._batchTimer) return;
        this._batchTimer = requestAnimationFrame(function () {
            self._batchTimer = null;
            if (self._contentEl) self.refresh(self._contentEl);
        });
    };

    TasksApp.prototype.refresh = function (container) {
        if (!container) return;
        this._contentEl = container;
        var listEl = container.querySelector('#tasks-list');
        if (listEl) {
            if (this.view === 'kanban') {
                listEl.innerHTML = this.renderKanban();
                listEl.classList.add('tasks-list-kanban');
            } else {
                var filtered = this.getFilteredTasks();
                listEl.innerHTML = filtered.length === 0 ? this.renderEmpty() : this.renderTasks(filtered);
                listEl.classList.remove('tasks-list-kanban');
            }
        }
        var statsEl = container.querySelector('.tasks-stats');
        if (statsEl) {
            var s = this.getStats();
            statsEl.innerHTML = '<span class="stat-item">' + s.active + ' active</span><span class="stat-item">' + s.completed + ' done</span><span class="stat-item">' + s.today + ' today</span>';
        }
        var meta = loadMeta();
        var levelEl = container.querySelector('.tasks-level');
        if (levelEl) levelEl.textContent = 'Lv.' + (meta.level || 1) + ' · ' + (meta.streak || 0) + ' day streak';
    };

    TasksApp.prototype.escapeHtml = function (str) {
        if (!str) return '';
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    };

    TasksApp.prototype.renderDueDate = function (ts, dueTime) {
        if (!ts) return '';
        var d = new Date(ts);
        var now = new Date();
        var todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        var day = 86400000;
        var diff = d.getTime() - todayStart;
        var days = Math.floor(diff / day);
        var cls = 'task-due-date';
        if (days < 0) cls += ' overdue';
        else if (days === 0) cls += ' today';
        else if (days <= 3) cls += ' soon';
        var str = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (dueTime) str += ' ' + dueTime;
        return '<span class="' + cls + '">' + this.escapeHtml(str) + '</span>';
    };

    TasksApp.prototype.renderTasks = function (tasks) {
        var self = this;
        return tasks.map(function (task, idx) {
            var origIdx = self.tasks.findIndex(function (t) { return t.id === task.id; });
            if (origIdx < 0) origIdx = idx;
            var pr = task.priority || 'medium';
            var typeIcon = task.type === 'habit' ? '🔄' : task.type === 'project' ? '📁' : task.type === 'goal' ? '🎯' : '';
            var subDone = (task.subtasks || []).filter(function (s) { return s.done; }).length;
            var subTotal = (task.subtasks || []).length;
            var progress = task.completed ? 100 : (task.progress != null ? task.progress : (subTotal ? Math.round((subDone / subTotal) * 100) : 0));
            var cat = task.category && task.category !== 'general' ? '<span class="task-category">' + self.escapeHtml(task.category) + '</span>' : '';
            var due = self.renderDueDate(task.dueDate, task.dueTime);
            var tagsHtml = (task.tags || []).slice(0, 3).map(function (tag) {
                return '<span class="task-tag">' + self.escapeHtml(tag) + '</span>';
            }).join('');
            var priorityBadge = pr !== 'medium' ? '<span class="task-priority-badge ' + pr + '">' + pr + '</span>' : '';
            return '<div class="task-item task-card ' + (task.completed ? 'completed' : '') + ' priority-' + pr + ' type-' + (task.type || 'normal') + '" data-task-index="' + origIdx + '">' +
                '<div class="task-checkbox ' + (task.completed ? 'checked' : '') + '" data-action="toggle">' +
                '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><polyline points="20 6 9 17 4 12"></polyline></svg>' +
                '</div>' +
                '<div class="task-progress-ring" style="--p:' + progress + '" title="' + progress + '%"><span class="progress-value">' + progress + '</span></div>' +
                '<div class="task-content">' +
                '<div class="task-text">' + (typeIcon ? '<span class="task-type-icon">' + typeIcon + '</span> ' : '') + self.escapeHtml(task.text) + '</div>' +
                '<div class="task-meta">' + cat + due + tagsHtml + priorityBadge +
                (subTotal ? ' <span class="task-subtask-count">' + subDone + '/' + subTotal + '</span>' : '') + '</div>' +
                '</div>' +
                '<div class="task-actions">' +
                '<button class="task-edit" data-action="edit" title="Edit">Edit</button>' +
                '<button class="task-delete" data-action="delete" title="Delete">Delete</button>' +
                '</div></div>';
        }).join('');
    };

    TasksApp.prototype.renderKanban = function () {
        var list = this.getFilteredTasks();
        var toDo = list.filter(function (t) { return !t.completed; });
        var done = list.filter(function (t) { return t.completed; });
        return '<div class="tasks-kanban">' +
            '<div class="tasks-kanban-col"><div class="tasks-kanban-title">To Do</div><div class="tasks-kanban-list" data-status="todo">' + (toDo.length ? this.renderTasks(toDo) : '<div class="tasks-empty small">No tasks</div>') + '</div></div>' +
            '<div class="tasks-kanban-col"><div class="tasks-kanban-title">Done</div><div class="tasks-kanban-list" data-status="done">' + (done.length ? this.renderTasks(done) : '<div class="tasks-empty small">No tasks</div>') + '</div></div>' +
            '</div>';
    };

    TasksApp.prototype.renderEmpty = function () {
        return '<div class="tasks-empty">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 11l3 3L22 4"></path><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path></svg>' +
            '<p>No tasks match this view.</p>' +
            '<p class="tasks-empty-hint">Try another filter or add a task. You can also ask AI to create tasks.</p></div>';
    };

    TasksApp.prototype.render = function () {
        var stats = this.getStats();
        var meta = loadMeta();
        var tags = this.getTags();
        var categories = this.getCategories();
        var viewLabels = { list: 'All', today: 'Today', upcoming: 'Upcoming', overdue: 'Overdue', 'high-priority': 'High Priority', completed: 'Completed', habits: 'Habits', projects: 'Projects', kanban: 'Kanban', calendar: 'Calendar', tags: 'By Tag' };
        var viewTabs = VIEWS.map(function (v) {
            return '<button type="button" class="tasks-view-tab ' + (this.view === v ? 'active' : '') + '" data-view="' + v + '">' + viewLabels[v] + '</button>';
        }.bind(this)).join('');
        return '<div class="tasks-container">' +
            '<div class="tasks-header">' +
            '<h2>Tasks</h2>' +
            '<div class="tasks-stats">' +
            '<span class="stat-item">' + stats.active + ' active</span>' +
            '<span class="stat-item">' + stats.completed + ' done</span>' +
            '<span class="stat-item">' + stats.today + ' today</span>' +
            '</div>' +
            '<div class="tasks-level">Lv.' + (meta.level || 1) + ' · ' + (meta.streak || 0) + ' day streak</div>' +
            '</div>' +
            '<div class="tasks-view-tabs">' + viewTabs + '</div>' +
            '<div class="tasks-toolbar">' +
            '<input type="text" class="tasks-search" id="tasks-search" placeholder="Search tasks..." value="' + this.escapeHtml(this.searchQuery) + '">' +
            '<select class="tasks-filter" id="filter-category"><option value="all">Category</option>' + CATEGORIES.map(function (c) { return '<option value="' + c + '">' + c + '</option>'; }).join('') + '</select>' +
            '<select class="tasks-filter" id="filter-priority"><option value="all">Priority</option><option value="critical">Critical</option><option value="high">High</option><option value="medium">Medium</option><option value="low">Low</option></select>' +
            '<select class="tasks-filter" id="filter-status"><option value="all">Status</option><option value="active">Active</option><option value="completed">Completed</option></select>' +
            (tags.length ? '<select class="tasks-filter" id="filter-tag"><option value="all">Tag</option>' + tags.map(function (t) { return '<option value="' + t + '">' + t + '</option>'; }).join('') + '</select>' : '') +
            '</div>' +
            '<div class="tasks-input-container">' +
            '<input type="text" class="tasks-input" id="task-input" placeholder="Add task or type naturally, e.g. &quot;Math homework tomorrow 6pm high&quot;">' +
            '<button class="tasks-add-btn" id="task-add-btn">Add</button>' +
            '</div>' +
            '<div class="tasks-quick-actions">' +
            '<button class="tasks-quick-btn" data-action="add-details" title="Add with details">+ Details</button>' +
            '<button class="tasks-quick-btn" data-action="ai-parse" title="Parse with AI">AI Parse</button>' +
            '<button class="tasks-quick-btn" data-action="undo" title="Undo">Undo</button>' +
            '<button class="tasks-quick-btn" data-action="export" title="Export JSON">Export</button>' +
            '<button class="tasks-quick-btn" data-action="import" title="Import JSON">Import</button>' +
            '</div>' +
            '<div class="tasks-list tasks-list-' + this.view + '" id="tasks-list">' +
            (this.view === 'kanban' ? this.renderKanban() : (this.getFilteredTasks().length === 0 ? this.renderEmpty() : this.renderTasks(this.getFilteredTasks()))) +
            '</div>' +
            '</div>';
    };

    TasksApp.prototype.attachEvents = function (window) {
        var content = window.querySelector('.window-content');
        if (!content) return;
        this._contentEl = content;
        var self = this;
        var input = content.querySelector('#task-input');
        var addBtn = content.querySelector('#task-add-btn');
        var list = content.querySelector('#tasks-list');
        var searchEl = content.querySelector('#tasks-search');

        content.querySelectorAll('.tasks-view-tab').forEach(function (tab) {
            tab.addEventListener('click', function () {
                self.view = tab.dataset.view;
                content.querySelectorAll('.tasks-view-tab').forEach(function (t) { t.classList.remove('active'); });
                tab.classList.add('active');
                self.refresh(content);
            });
        });

        content.querySelectorAll('.tasks-filter').forEach(function (el) {
            el.addEventListener('change', function () {
                var id = el.id.replace('filter-', '');
                self.filters[id] = el.value;
                self.refresh(content);
            });
        });

        if (searchEl) {
            searchEl.addEventListener('input', function () {
                self.searchQuery = searchEl.value;
                self.refresh(content);
            });
        }

        var addTask = function (payload) {
            var task = payload || {};
            if (!task.text && input) task.text = input.value.trim();
            if (!task.text) return;
            self.pushUndo();
            var t = normalizeTask({
                id: 'task_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9),
                text: task.text,
                completed: false,
                priority: task.priority || 'medium',
                category: task.category || 'general',
                dueDate: task.dueDate || null,
                dueTime: task.dueTime || null,
                tags: task.tags || [],
                description: task.description || '',
                subtasks: task.subtasks || [],
                type: task.type || 'normal',
                createdAt: Date.now(),
                updatedAt: Date.now()
            });
            self.tasks.push(t);
            self.save();
            self.refresh(content);
            if (input) { input.value = ''; input.focus(); }
        };

        if (addBtn) addBtn.addEventListener('click', function () { addTask(); });
        if (input) input.addEventListener('keypress', function (e) { if (e.key === 'Enter') addTask(); });

        content.querySelector('[data-action="add-details"]')?.addEventListener('click', function () {
            self.showTaskDialog(content, null);
        });
        content.querySelector('[data-action="undo"]')?.addEventListener('click', function () {
            if (self.undo()) self.refresh(content);
        });
        content.querySelector('[data-action="export"]')?.addEventListener('click', function () {
            var json = JSON.stringify(self.tasks, null, 2);
            var a = document.createElement('a');
            a.href = 'data:application/json;charset=utf-8,' + encodeURIComponent(json);
            a.download = 'aegisdesk-tasks-' + new Date().toISOString().slice(0, 10) + '.json';
            a.click();
        });
        content.querySelector('[data-action="import"]')?.addEventListener('click', function () {
            var inp = document.createElement('input');
            inp.type = 'file';
            inp.accept = '.json';
            inp.onchange = function () {
                var f = inp.files[0];
                if (!f) return;
                var r = new FileReader();
                r.onload = function () {
                    try {
                        var data = JSON.parse(r.result);
                        var arr = Array.isArray(data) ? data : (data.tasks || []);
                        self.pushUndo();
                        arr.forEach(function (t) { self.tasks.push(normalizeTask(t)); });
                        self.save();
                        self.refresh(content);
                    } catch (e) { console.error('Import failed', e); }
                };
                r.readAsText(f);
            };
            inp.click();
        });
        content.querySelector('[data-action="ai-parse"]')?.addEventListener('click', function () {
            var raw = input && input.value.trim();
            if (!raw) return;
            self.aiParseTask(raw, function (parsed) {
                if (parsed && parsed.text) addTask(parsed);
            });
        });

        list.addEventListener('click', function (e) {
            var item = e.target.closest('.task-item');
            if (!item) return;
            var index = parseInt(item.dataset.taskIndex, 10);
            if (isNaN(index) || index < 0 || index >= self.tasks.length) return;
            var action = e.target.closest('[data-action]')?.dataset.action;
            if (action === 'toggle') {
                self.pushUndo();
                var t = self.tasks[index];
                t.completed = !t.completed;
                t.completedAt = t.completed ? Date.now() : null;
                t.updatedAt = Date.now();
                if (t.completed) self.addXP(XP_PER_TASK);
                self.save();
                self.refresh(content);
            } else if (action === 'delete') {
                self.pushUndo();
                self.tasks.splice(index, 1);
                self.save();
                self.refresh(content);
            } else if (action === 'edit') {
                self.showTaskDialog(content, self.tasks[index], index);
            }
        });

        content.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.target.blur(); return; }
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); if (self.undo()) self.refresh(content); }
        });
    };

    TasksApp.prototype.aiParseTask = function (rawText, callback) {
        if (typeof fetch === 'undefined') { callback({ text: rawText }); return; }
        var messages = [
            { role: 'system', content: 'You are a task parser. Reply with ONLY a valid JSON object, no markdown. Keys: text (string), priority (one of: low, medium, high, critical), category (one of: general, work, study, personal, projects), dueDate (ISO date string or null), dueTime (e.g. "18:00" or null). Parse the user message into this structure. If no date/time/priority/category, use null or default.' },
            { role: 'user', content: rawText }
        ];
        fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ messages: messages }) })
            .catch(function () { return null; })
            .then(function (r) { return r && r.ok ? r.json() : null; })
            .then(function (data) {
                var text = (data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content) ? data.choices[0].message.content.trim() : '';
                var parsed = { text: rawText };
                try {
                    text = text.replace(/^```json?\s*|\s*```$/g, '');
                    var obj = JSON.parse(text);
                    if (obj.text) parsed.text = obj.text;
                    if (obj.priority) parsed.priority = obj.priority;
                    if (obj.category) parsed.category = obj.category;
                    if (obj.dueDate) parsed.dueDate = new Date(obj.dueDate).getTime();
                    if (obj.dueTime) parsed.dueTime = obj.dueTime;
                } catch (e) {}
                callback(parsed);
            });
    };

    TasksApp.prototype.showTaskDialog = function (container, task, index) {
        var isNew = !task;
        var self = this;
        task = task ? Object.assign({}, task) : { text: '', priority: 'medium', category: 'general', dueDate: null, dueTime: null, tags: [], description: '', subtasks: [], type: 'normal' };
        var dueStr = task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '';
        var tagsStr = (task.tags || []).join(', ');
        var progressVal = task.progress != null ? Math.min(100, Math.max(0, task.progress)) : 0;

        var dialog = document.createElement('div');
        dialog.className = 'task-dialog-overlay';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-labelledby', 'task-dialog-title');

        dialog.innerHTML =
            '<div class="task-dialog">' +
            '<header class="task-dialog-header">' +
            '<h3 id="task-dialog-title">' + (isNew ? 'New Task' : 'Edit Task') + '</h3>' +
            '</header>' +
            '<div class="task-dialog-body">' +
            '<div class="task-dialog-form">' +
            '<section class="task-dialog-section">' +
            '<h4 class="task-dialog-section-title">Task info</h4>' +
            '<label for="dialog-task-text">Title</label>' +
            '<input type="text" class="task-dialog-input" id="dialog-task-text" placeholder="What needs to be done?" value="' + this.escapeHtml(task.text) + '" autocomplete="off">' +
            '<label for="dialog-task-desc">Description</label>' +
            '<textarea class="task-dialog-textarea" id="dialog-task-desc" placeholder="Add details (optional)" rows="3">' + this.escapeHtml(task.description || '') + '</textarea>' +
            '</section>' +
            '<section class="task-dialog-section">' +
            '<h4 class="task-dialog-section-title">Priority & type</h4>' +
            '<div class="task-dialog-grid">' +
            '<div class="task-dialog-field"><label for="dialog-task-type">Type</label><select id="dialog-task-type">' +
            TASK_TYPES.map(function (t) { return '<option value="' + t + '"' + (task.type === t ? ' selected' : '') + '>' + t + '</option>'; }).join('') + '</select></div>' +
            '<div class="task-dialog-field"><label for="dialog-task-priority">Priority</label><select id="dialog-task-priority">' +
            PRIORITIES.map(function (p) { return '<option value="' + p + '"' + (task.priority === p ? ' selected' : '') + '>' + p + '</option>'; }).join('') + '</select></div>' +
            '<div class="task-dialog-field"><label for="dialog-task-category">Category</label><select id="dialog-task-category">' +
            CATEGORIES.map(function (c) { return '<option value="' + c + '"' + (task.category === c ? ' selected' : '') + '>' + c + '</option>'; }).join('') + '</select></div>' +
            '</div></section>' +
            '<section class="task-dialog-section">' +
            '<h4 class="task-dialog-section-title">Scheduling</h4>' +
            '<div class="task-dialog-grid">' +
            '<div class="task-dialog-field"><label for="dialog-task-due">Due date</label><input type="date" id="dialog-task-due" value="' + dueStr + '"></div>' +
            '<div class="task-dialog-field"><label for="dialog-task-time">Due time</label><input type="time" id="dialog-task-time" value="' + (task.dueTime || '') + '"></div>' +
            '</div></section>' +
            '<section class="task-dialog-section">' +
            '<h4 class="task-dialog-section-title">Tags & progress</h4>' +
            '<div class="task-dialog-field"><label for="dialog-task-tags">Tags</label><input type="text" id="dialog-task-tags" placeholder="e.g. urgent, work, review" value="' + this.escapeHtml(tagsStr) + '" autocomplete="off"></div>' +
            '<div class="task-dialog-field task-dialog-progress-wrap">' +
            '<label for="dialog-task-progress">Progress <span class="task-dialog-progress-value" id="dialog-progress-readout">' + progressVal + '</span>%</label>' +
            '<input type="range" id="dialog-task-progress" min="0" max="100" value="' + progressVal + '" class="task-dialog-range">' +
            '</div></section>' +
            '</div></div>' +
            '<footer class="task-dialog-footer">' +
            '<button type="button" class="task-dialog-btn cancel">Cancel</button>' +
            '<button type="button" class="task-dialog-btn save">' + (isNew ? 'Create' : 'Update') + '</button>' +
            '</footer></div>';
        document.body.appendChild(dialog);

        var box = dialog.querySelector('.task-dialog');
        var saveBtn = dialog.querySelector('.save');
        var cancelBtn = dialog.querySelector('.cancel');
        var textInput = dialog.querySelector('#dialog-task-text');
        var progressRange = dialog.querySelector('#dialog-task-progress');
        var progressReadout = dialog.querySelector('#dialog-progress-readout');

        function closeDialog() {
            dialog.classList.add('task-dialog-overlay-closing');
            box.classList.add('task-dialog-closing');
            setTimeout(function () {
                if (dialog.parentNode) dialog.remove();
            }, 200);
        }

        function getProgress() {
            if (progressRange) return Math.min(100, Math.max(0, parseInt(progressRange.value, 10) || 0));
            return progressVal;
        }

        if (progressRange && progressReadout) {
            progressRange.addEventListener('input', function () { progressReadout.textContent = progressRange.value; });
        }

        var save = function () {
            var text = textInput.value.trim();
            if (!text) {
                textInput.focus();
                textInput.classList.add('task-dialog-input-error');
                return;
            }
            textInput.classList.remove('task-dialog-input-error');
            var tags = dialog.querySelector('#dialog-task-tags').value.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
            var taskData = {
                text: text,
                description: dialog.querySelector('#dialog-task-desc').value.trim(),
                type: dialog.querySelector('#dialog-task-type').value,
                priority: dialog.querySelector('#dialog-task-priority').value,
                category: dialog.querySelector('#dialog-task-category').value,
                dueDate: dialog.querySelector('#dialog-task-due').value ? new Date(dialog.querySelector('#dialog-task-due').value).getTime() : null,
                dueTime: dialog.querySelector('#dialog-task-time').value || null,
                tags: tags,
                progress: getProgress(),
                subtasks: task.subtasks || [],
                updatedAt: Date.now()
            };
            self.pushUndo();
            if (isNew || index == null) {
                self.tasks.push(normalizeTask({ id: 'task_' + Date.now(), ...taskData, completed: false, createdAt: Date.now() }));
            } else {
                Object.assign(self.tasks[index], taskData);
                self.tasks[index].id = self.tasks[index].id;
            }
            self.save();
            self.refresh(container);
            closeDialog();
        };

        saveBtn.addEventListener('click', save);
        cancelBtn.addEventListener('click', closeDialog);
        dialog.addEventListener('click', function (e) { if (e.target === dialog) closeDialog(); });
        dialog.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); closeDialog(); }
        });
        textInput.addEventListener('keydown', function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); save(); } });
        textInput.addEventListener('input', function () { textInput.classList.remove('task-dialog-input-error'); });
        textInput.focus();
    };

    global.TasksApp = TasksApp;
    global.tasksApp = new TasksApp();
})(typeof window !== 'undefined' ? window : this);
