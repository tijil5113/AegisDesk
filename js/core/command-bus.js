// OS Command Bus - Centralized command execution
class CommandBus {
    constructor() {
        this.handlers = new Map();
        this.commandHistory = [];
        this.maxHistorySize = 100;
        this.setupBuiltInHandlers();
    }

    // Register a handler for a command type
    registerHandler(type, handlerFn) {
        if (typeof handlerFn !== 'function') {
            console.error('Handler must be a function');
            return;
        }
        
        if (!this.handlers.has(type)) {
            this.handlers.set(type, []);
        }
        
        this.handlers.get(type).push(handlerFn);
        
        // Return unsubscribe function
        return () => {
            const handlers = this.handlers.get(type);
            if (handlers) {
                const index = handlers.indexOf(handlerFn);
                if (index > -1) {
                    handlers.splice(index, 1);
                }
            }
        };
    }

    // Dispatch a command
    async dispatchCommand({ type, payload = {}, source = 'unknown' }) {
        if (!type) {
            console.error('Command type is required');
            return { success: false, error: 'Command type is required' };
        }

        const command = {
            type,
            payload,
            source,
            timestamp: Date.now()
        };

        // Add to history
        this.commandHistory.push(command);
        if (this.commandHistory.length > this.maxHistorySize) {
            this.commandHistory.shift();
        }

        // Get handlers for this command type
        const handlers = this.handlers.get(type) || [];
        
        if (handlers.length === 0) {
            console.warn(`No handler registered for command type: ${type}`);
            return { success: false, error: `No handler for command type: ${type}` };
        }

        // Execute all handlers (in order)
        const results = [];
        for (const handler of handlers) {
            try {
                const result = await handler(payload, command);
                results.push(result);
            } catch (error) {
                console.error(`Error executing handler for ${type}:`, error);
                results.push({ success: false, error: error.message });
            }
        }

        // Return the last result (or combine if multiple handlers)
        return results.length > 0 ? results[results.length - 1] : { success: false };
    }

    // Setup built-in handlers
    setupBuiltInHandlers() {
        // TASK_CREATE handler
        this.registerHandler('TASK_CREATE', async (payload) => {
            try {
                // Validate payload
                if (!payload.text || typeof payload.text !== 'string') {
                    return { success: false, error: 'Task text is required' };
                }

                // Get current tasks (use OS store if available, fallback to storage)
                let tasks = [];
                if (typeof osStore !== 'undefined' && osStore.initialized) {
                    tasks = osStore.getStateSlice('tasks') || [];
                } else {
                    tasks = storage.get('tasks', []);
                }

                // Create task with same schema as tasks.js
                const task = {
                    id: 'task_' + Date.now(),
                    text: payload.text.trim(),
                    completed: false,
                    priority: payload.priority || 'normal',
                    category: payload.category || 'general',
                    dueDate: payload.dueDate || null,
                    createdAt: Date.now()
                };

                tasks.push(task);

                // Save (use OS store if available)
                if (typeof osStore !== 'undefined' && osStore.initialized) {
                    osStore.dispatch({
                        type: 'TASKS_UPDATE',
                        payload: tasks
                    });
                } else {
                    storage.set('tasks', tasks);
                }

                // Refresh tasks app if open
                if (typeof windowManager !== 'undefined' && windowManager.windows.has('tasks')) {
                    const tasksWindow = windowManager.windows.get('tasks');
                    if (tasksWindow && typeof tasksApp !== 'undefined') {
                        const content = tasksWindow.querySelector('.window-content');
                        if (content) {
                            tasksApp.refresh(content);
                        }
                    }
                }

                return {
                    success: true,
                    data: task,
                    message: `Task created: "${task.text}"`
                };
            } catch (error) {
                console.error('TASK_CREATE error:', error);
                return { success: false, error: error.message };
            }
        });

        // NOTE_CREATE handler
        this.registerHandler('NOTE_CREATE', async (payload) => {
            try {
                // Validate payload
                if (!payload.title && !payload.content) {
                    return { success: false, error: 'Note title or content is required' };
                }

                // Get current notes (use OS store if available, fallback to storage)
                let notes = [];
                if (typeof osStore !== 'undefined' && osStore.initialized) {
                    notes = osStore.getStateSlice('notes') || [];
                } else {
                    notes = storage.get('notes', []);
                }

                // Create note with same schema as notes.js
                const note = {
                    id: 'note_' + Date.now(),
                    title: payload.title || 'Untitled',
                    content: payload.content || '',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    linkedNotes: payload.linkedNotes || []
                };

                notes.unshift(note);

                // Save (use OS store if available)
                if (typeof osStore !== 'undefined' && osStore.initialized) {
                    osStore.dispatch({
                        type: 'NOTES_UPDATE',
                        payload: notes
                    });
                } else {
                    storage.set('notes', notes);
                }

                // Refresh notes app if open
                if (typeof windowManager !== 'undefined' && windowManager.windows.has('notes')) {
                    const notesWindow = windowManager.windows.get('notes');
                    if (notesWindow && typeof notesApp !== 'undefined') {
                        const content = notesWindow.querySelector('.window-content');
                        if (content) {
                            notesApp.refreshList(content);
                        }
                    }
                }

                return {
                    success: true,
                    data: note,
                    message: `Note created: "${note.title}"`
                };
            } catch (error) {
                console.error('NOTE_CREATE error:', error);
                return { success: false, error: error.message };
            }
        });

        // TASK_QUERY handler
        this.registerHandler('TASK_QUERY', async (payload) => {
            try {
                // Get tasks (use OS store if available, fallback to storage)
                let tasks = [];
                if (typeof osStore !== 'undefined' && osStore.initialized) {
                    tasks = osStore.getStateSlice('tasks') || [];
                } else {
                    tasks = storage.get('tasks', []);
                }

                // Apply filters if provided
                let filteredTasks = [...tasks];
                
                if (payload.filter) {
                    if (payload.filter.status === 'active') {
                        filteredTasks = filteredTasks.filter(t => !t.completed);
                    } else if (payload.filter.status === 'completed') {
                        filteredTasks = filteredTasks.filter(t => t.completed);
                    }
                    
                    if (payload.filter.category && payload.filter.category !== 'all') {
                        filteredTasks = filteredTasks.filter(t => (t.category || 'general') === payload.filter.category);
                    }
                    
                    if (payload.filter.priority && payload.filter.priority !== 'all') {
                        filteredTasks = filteredTasks.filter(t => (t.priority || 'normal') === payload.filter.priority);
                    }
                }

                const active = filteredTasks.filter(t => !t.completed);
                const completed = filteredTasks.filter(t => t.completed);

                return {
                    success: true,
                    data: {
                        all: filteredTasks,
                        active: active,
                        completed: completed,
                        total: filteredTasks.length,
                        activeCount: active.length,
                        completedCount: completed.length
                    },
                    message: `Found ${active.length} active task${active.length !== 1 ? 's' : ''} and ${completed.length} completed.`
                };
            } catch (error) {
                console.error('TASK_QUERY error:', error);
                return { success: false, error: error.message };
            }
        });

        // NOTE_QUERY handler
        this.registerHandler('NOTE_QUERY', async (payload) => {
            try {
                // Get notes (use OS store if available, fallback to storage)
                let notes = [];
                if (typeof osStore !== 'undefined' && osStore.initialized) {
                    notes = osStore.getStateSlice('notes') || [];
                } else {
                    notes = storage.get('notes', []);
                }

                // Apply search if provided
                let filteredNotes = [...notes];
                
                if (payload.search && payload.search.trim()) {
                    const searchLower = payload.search.toLowerCase();
                    filteredNotes = filteredNotes.filter(note => 
                        (note.title || '').toLowerCase().includes(searchLower) ||
                        (note.content || '').toLowerCase().includes(searchLower)
                    );
                }

                return {
                    success: true,
                    data: {
                        all: filteredNotes,
                        total: filteredNotes.length
                    },
                    message: `Found ${filteredNotes.length} note${filteredNotes.length !== 1 ? 's' : ''}.`
                };
            } catch (error) {
                console.error('NOTE_QUERY error:', error);
                return { success: false, error: error.message };
            }
        });
    }

    // Get command history
    getHistory(limit = 10) {
        return this.commandHistory.slice(-limit);
    }
}

// Create singleton instance
const commandBus = new CommandBus();

// Register music commands when music system is available
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        // Wait for music system to be available
        const checkMusicSystem = setInterval(() => {
            if (typeof window.musicSystem !== 'undefined' && window.musicSystem) {
                clearInterval(checkMusicSystem);
                
                // Register music command handlers
                commandBus.registerHandler('MUSIC_PLAY', async (payload) => {
                    if (window.musicSystem && payload.track) {
                        window.musicSystem.playTrack(payload.track);
                        return { success: true, message: 'Playing track' };
                    }
                    return { success: false, error: 'Track not provided' };
                });
                
                commandBus.registerHandler('MUSIC_PAUSE', async () => {
                    if (window.musicSystem) {
                        window.musicSystem.togglePlayPause();
                        return { success: true };
                    }
                    return { success: false };
                });
                
                commandBus.registerHandler('MUSIC_NEXT', async () => {
                    if (window.musicSystem) {
                        window.musicSystem.nextTrack();
                        return { success: true };
                    }
                    return { success: false };
                });
                
                commandBus.registerHandler('MUSIC_PREV', async () => {
                    if (window.musicSystem) {
                        window.musicSystem.previousTrack();
                        return { success: true };
                    }
                    return { success: false };
                });
                
                commandBus.registerHandler('MUSIC_SEARCH', async (payload) => {
                    if (window.musicSystem && payload.query) {
                        await window.musicSystem.performSearch(payload.query);
                        return { success: true };
                    }
                    return { success: false, error: 'Search query required' };
                });
            }
        }, 500);
        
        // Stop checking after 10 seconds
        setTimeout(() => clearInterval(checkMusicSystem), 10000);
    });
}

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.commandBus = commandBus;
}
