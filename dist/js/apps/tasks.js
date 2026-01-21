// Tasks App - OS-Level Task Manager
class TasksApp {
    constructor() {
        // Load from OS store, fallback to legacy storage for backward compatibility
        let tasksData = null;
        if (typeof osStore !== 'undefined' && osStore.initialized) {
            tasksData = osStore.getStateSlice('tasks');
        } else if (typeof storage !== 'undefined') {
            tasksData = storage.get('tasks', []);
        }
        
        // Ensure tasks is always an array
        this.tasks = Array.isArray(tasksData) ? tasksData : [];
        this.windowId = 'tasks';
        this.filters = {
            category: 'all',
            priority: 'all',
            status: 'all' // all, active, completed
        };
        
        // Subscribe to state changes if OS store is available
        if (typeof osStore !== 'undefined') {
            this.unsubscribe = osStore.subscribe((state, prevState) => {
                if (prevState && state.tasks !== prevState.tasks) {
                    // Ensure tasks is always an array
                    this.tasks = Array.isArray(state.tasks) ? state.tasks : [];
                    // Refresh UI if window is open
                    if (windowManager.windows.has(this.windowId)) {
                        const window = windowManager.windows.get(this.windowId);
                        if (window) {
                            const content = window.querySelector('.window-content');
                            if (content) {
                                this.refresh(content);
                            }
                        }
                    }
                }
            });
            
            // Sync from OS store after initialization
            const syncFromStore = () => {
                if (osStore.initialized) {
                    const storeTasks = osStore.getStateSlice('tasks');
                    // Ensure it's an array
                    if (Array.isArray(storeTasks)) {
                        this.tasks = storeTasks;
                    } else if (!this.tasks || !Array.isArray(this.tasks)) {
                        this.tasks = [];
                    }
                }
            };
            
            // Try to sync immediately if already initialized
            if (osStore.initialized) {
                syncFromStore();
            } else {
                // Wait for initialization
                const checkInit = setInterval(() => {
                    if (osStore.initialized) {
                        syncFromStore();
                        clearInterval(checkInit);
                    }
                }, 100);
                // Stop checking after 5 seconds
                setTimeout(() => clearInterval(checkInit), 5000);
            }
        }
    }

    open() {
        // Ensure tasks is an array before opening
        if (!Array.isArray(this.tasks)) {
            console.warn('Tasks is not an array, initializing to empty array');
            this.tasks = [];
        }
        
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Tasks',
            width: 600,
            height: 700,
            class: 'app-tasks',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 11l3 3L22 4"></path>
                <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        // Safety check: ensure tasks is an array
        if (!Array.isArray(this.tasks)) {
            console.warn('Tasks is not an array in render(), initializing to empty array');
            this.tasks = [];
        }
        
        const filteredTasks = this.getFilteredTasks();
        const categories = this.getCategories();
        const stats = this.getStats();

        return `
            <div class="tasks-container">
                <div class="tasks-header">
                    <h2>Tasks</h2>
                    <div class="tasks-stats">
                        <span class="stat-item">${stats.active} active</span>
                        <span class="stat-item">${stats.completed} done</span>
                    </div>
                </div>
                
                <div class="tasks-filters">
                    <select class="tasks-filter" id="filter-category" title="Filter by category">
                        <option value="all">All Categories</option>
                        ${categories.map(cat => `<option value="${cat}">${cat}</option>`).join('')}
                    </select>
                    <select class="tasks-filter" id="filter-priority" title="Filter by priority">
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="normal">Normal</option>
                        <option value="low">Low</option>
                    </select>
                    <select class="tasks-filter" id="filter-status" title="Filter by status">
                        <option value="all">All</option>
                        <option value="active">Active</option>
                        <option value="completed">Completed</option>
                    </select>
                </div>

                <div class="tasks-input-container">
                    <input type="text" class="tasks-input" id="task-input" placeholder="Add a new task...">
                    <button class="tasks-add-btn" id="task-add-btn">Add</button>
                </div>
                
                <div class="tasks-quick-actions">
                    <button class="tasks-quick-btn" data-action="add-details" title="Add task with details">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="12" y1="8" x2="12" y2="16"></line>
                            <line x1="8" y1="12" x2="16" y2="12"></line>
                        </svg>
                    </button>
                </div>

                <div class="tasks-list" id="tasks-list">
                    ${filteredTasks.length === 0 ? this.renderEmpty() : this.renderTasks(filteredTasks)}
                </div>
            </div>
        `;
    }

    renderEmpty() {
        return `
            <div class="tasks-empty">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9 11l3 3L22 4"></path>
                    <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"></path>
                </svg>
                <p>No tasks yet. Add one to get started!</p>
                <p class="tasks-empty-hint">Tip: Ask the AI to create tasks for you</p>
            </div>
        `;
    }

    renderTasks(tasks) {
        return tasks.map((task, index) => {
            const originalIndex = this.tasks.findIndex(t => t.id === task.id || (t.text === task.text && t.createdAt === task.createdAt));
            const priorityClass = task.priority || 'normal';
            const categoryBadge = task.category && task.category !== 'general' ? `<span class="task-category">${task.category}</span>` : '';
            const dueDateBadge = task.dueDate ? this.renderDueDate(task.dueDate) : '';
            
            return `
                <div class="task-item ${task.completed ? 'completed' : ''} priority-${priorityClass}" data-task-index="${originalIndex}">
                    <div class="task-checkbox ${task.completed ? 'checked' : ''}" data-action="toggle">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                    <div class="task-content">
                        <div class="task-text">${this.escapeHtml(task.text)}</div>
                        <div class="task-meta">
                            ${categoryBadge}
                            ${dueDateBadge}
                            ${task.priority === 'high' ? '<span class="task-priority-badge high">High</span>' : ''}
                        </div>
                    </div>
                    <div class="task-actions">
                        <button class="task-edit" data-action="edit" title="Edit task">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                        </button>
                        <button class="task-delete" data-action="delete" title="Delete task">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="3 6 5 6 21 6"></polyline>
                                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"></path>
                            </svg>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderDueDate(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diff = date - now;
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        
        let className = 'task-due-date';
        if (days < 0) {
            className += ' overdue';
        } else if (days === 0) {
            className += ' today';
        } else if (days <= 3) {
            className += ' soon';
        }
        
        const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `<span class="${className}">${dateStr}</span>`;
    }

    getFilteredTasks() {
        // Safety check: ensure tasks is an array
        if (!Array.isArray(this.tasks)) {
            this.tasks = [];
        }
        let filtered = [...this.tasks];
        
        if (this.filters.category !== 'all') {
            filtered = filtered.filter(t => (t.category || 'general') === this.filters.category);
        }
        
        if (this.filters.priority !== 'all') {
            filtered = filtered.filter(t => (t.priority || 'normal') === this.filters.priority);
        }
        
        if (this.filters.status === 'active') {
            filtered = filtered.filter(t => !t.completed);
        } else if (this.filters.status === 'completed') {
            filtered = filtered.filter(t => t.completed);
        }
        
        // Sort: high priority first, then by due date, then by creation date
        filtered.sort((a, b) => {
            if (a.completed !== b.completed) return a.completed ? 1 : -1;
            if ((a.priority === 'high') !== (b.priority === 'high')) return a.priority === 'high' ? -1 : 1;
            if (a.dueDate && b.dueDate) return a.dueDate - b.dueDate;
            if (a.dueDate) return -1;
            if (b.dueDate) return 1;
            return (b.createdAt || 0) - (a.createdAt || 0);
        });
        
        return filtered;
    }

    getCategories() {
        const categories = new Set();
        this.tasks.forEach(task => {
            if (task.category && task.category !== 'general') {
                categories.add(task.category);
            }
        });
        return Array.from(categories).sort();
    }

    getStats() {
        return {
            active: this.tasks.filter(t => !t.completed).length,
            completed: this.tasks.filter(t => t.completed).length,
            total: this.tasks.length
        };
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        const input = content.querySelector('#task-input');
        const addBtn = content.querySelector('#task-add-btn');
        const list = content.querySelector('#tasks-list');
        const filters = content.querySelectorAll('.tasks-filter');
        const quickBtn = content.querySelector('[data-action="add-details"]');

        // Filters
        filters.forEach(filter => {
            filter.addEventListener('change', (e) => {
                const filterType = e.target.id.replace('filter-', '');
                this.filters[filterType] = e.target.value;
                this.refresh(content);
            });
        });

        // Add task
        const addTask = () => {
            const text = input.value.trim();
            if (!text) return;

            const task = {
                id: 'task_' + Date.now(),
                text: text,
                completed: false,
                priority: 'normal',
                category: 'general',
                createdAt: Date.now()
            };

            this.tasks.push(task);
            this.save();
            this.refresh(content);
            input.value = '';
            input.focus();
        };

        addBtn.addEventListener('click', addTask);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') addTask();
        });

        // Quick add with details
        quickBtn.addEventListener('click', () => {
            this.showTaskDialog(content, null);
        });

        // Task actions
        list.addEventListener('click', (e) => {
            const taskItem = e.target.closest('.task-item');
            if (!taskItem) return;

            const index = parseInt(taskItem.dataset.taskIndex);
            const action = e.target.closest('[data-action]')?.dataset.action;

            if (action === 'toggle') {
                this.tasks[index].completed = !this.tasks[index].completed;
                this.save();
                this.refresh(content);
            } else if (action === 'delete') {
                this.tasks.splice(index, 1);
                this.save();
                this.refresh(content);
            } else if (action === 'edit') {
                this.showTaskDialog(content, this.tasks[index], index);
            }
        });
    }

    showTaskDialog(container, task = null, index = null) {
        const dialog = document.createElement('div');
        dialog.className = 'task-dialog-overlay';
        dialog.innerHTML = `
            <div class="task-dialog">
                <h3>${task ? 'Edit Task' : 'New Task'}</h3>
                <div class="task-dialog-form">
                    <input type="text" class="task-dialog-input" id="dialog-task-text" 
                           placeholder="Task description..." value="${task ? this.escapeHtml(task.text) : ''}">
                    <div class="task-dialog-row">
                        <label>Priority:</label>
                        <select id="dialog-task-priority">
                            <option value="low" ${task?.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="normal" ${!task || task.priority === 'normal' ? 'selected' : ''}>Normal</option>
                            <option value="high" ${task?.priority === 'high' ? 'selected' : ''}>High</option>
                        </select>
                    </div>
                    <div class="task-dialog-row">
                        <label>Category:</label>
                        <input type="text" id="dialog-task-category" list="categories-list" 
                               value="${task ? (task.category || 'general') : 'general'}">
                        <datalist id="categories-list">
                            <option value="work">
                            <option value="personal">
                            <option value="shopping">
                            <option value="health">
                            <option value="study">
                            <option value="home">
                        </datalist>
                    </div>
                    <div class="task-dialog-row">
                        <label>Due Date:</label>
                        <input type="date" id="dialog-task-due" 
                               value="${task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}">
                    </div>
                    <div class="task-dialog-actions">
                        <button class="task-dialog-btn cancel">Cancel</button>
                        <button class="task-dialog-btn save">${task ? 'Update' : 'Create'}</button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(dialog);
        
        const saveBtn = dialog.querySelector('.save');
        const cancelBtn = dialog.querySelector('.cancel');
        const textInput = dialog.querySelector('#dialog-task-text');
        const prioritySelect = dialog.querySelector('#dialog-task-priority');
        const categoryInput = dialog.querySelector('#dialog-task-category');
        const dueInput = dialog.querySelector('#dialog-task-due');
        
        const save = () => {
            const text = textInput.value.trim();
            if (!text) {
                dialog.remove();
                return;
            }
            
            const taskData = {
                text: text,
                priority: prioritySelect.value,
                category: categoryInput.value.trim() || 'general',
                dueDate: dueInput.value ? new Date(dueInput.value).getTime() : null
            };
            
            if (task && index !== null) {
                // Update existing
                Object.assign(this.tasks[index], taskData);
            } else {
                // Create new
                this.tasks.push({
                    id: 'task_' + Date.now(),
                    ...taskData,
                    completed: false,
                    createdAt: Date.now()
                });
            }
            
            this.save();
            this.refresh(container);
            dialog.remove();
        };
        
        saveBtn.addEventListener('click', save);
        cancelBtn.addEventListener('click', () => dialog.remove());
        textInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') save();
        });
        textInput.focus();
    }

    refresh(container) {
        const list = container.querySelector('#tasks-list');
        const filteredTasks = this.getFilteredTasks();
        list.innerHTML = filteredTasks.length === 0 ? this.renderEmpty() : this.renderTasks(filteredTasks);
        
        // Update stats
        const stats = this.getStats();
        const statsEl = container.querySelector('.tasks-stats');
        if (statsEl) {
            statsEl.innerHTML = `
                <span class="stat-item">${stats.active} active</span>
                <span class="stat-item">${stats.completed} done</span>
            `;
        }
    }

    save() {
        // Save through OS store if available, fallback to legacy storage
        if (typeof osStore !== 'undefined' && osStore.initialized) {
            osStore.dispatch({
                type: 'TASKS_UPDATE',
                payload: this.tasks
            });
        } else {
            // Fallback to legacy storage for backward compatibility
            storage.set('tasks', this.tasks);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const tasksApp = new TasksApp();
