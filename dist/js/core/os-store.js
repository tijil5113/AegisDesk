// OS State Store - Centralized state management
class OSStore {
    constructor() {
        this.state = {
            tasks: [],
            notes: [],
            settings: {},
            windows: {},
            ai: {
                history: [],
                apiKey: ''
            },
            weather: null
        };
        this.listeners = new Set();
        this.schemaVersion = 1;
        this.initialized = false;
    }

    // Initialize store and migrate existing data
    async init() {
        if (this.initialized) return;
        
        const storedVersion = storage.get('schema_version', 0);
        
        // Migrate from old storage keys if needed
        if (storedVersion < this.schemaVersion) {
            await this.migrateData();
        }
        
        // Load state from storage
        const storedState = storage.get('os_state', null);
        if (storedState) {
            this.state = {
                ...this.state,
                ...storedState
            };
        }
        
        // Ensure state structure
        this.state = {
            tasks: this.state.tasks || [],
            notes: this.state.notes || [],
            settings: this.state.settings || {},
            windows: this.state.windows || {},
            ai: {
                history: this.state.ai?.history || [],
                apiKey: this.state.ai?.apiKey || storage.get('openai_api_key', '') || storage.get('openaiApiKey', '')
            },
            weather: this.state.weather || null
        };
        
        // Save schema version
        storage.set('schema_version', this.schemaVersion);
        
        this.initialized = true;
        this.notifyListeners();
    }

    // Migrate data from old storage keys
    async migrateData() {
        console.log('Migrating OS state from legacy storage keys...');
        
        // Migrate tasks
        const oldTasks = storage.get('tasks', null);
        if (oldTasks && !storage.get('os_state')?.tasks) {
            this.state.tasks = oldTasks;
        }
        
        // Migrate notes
        const oldNotes = storage.get('notes', null);
        if (oldNotes && !storage.get('os_state')?.notes) {
            this.state.notes = oldNotes;
        }
        
        // Migrate settings
        const oldSettings = storage.get('settings', null);
        if (oldSettings && !storage.get('os_state')?.settings) {
            this.state.settings = oldSettings;
        }
        
        // Migrate window positions
        const oldWindowPositions = storage.get('windowPositions', null);
        if (oldWindowPositions && !storage.get('os_state')?.windows) {
            this.state.windows = oldWindowPositions;
        }
        
        // Migrate AI history
        const oldAIHistory = storage.get('aiChatHistory', null);
        if (oldAIHistory && !storage.get('os_state')?.ai?.history) {
            this.state.ai.history = oldAIHistory;
        }
        
        // Migrate API key
        const oldAPIKey = storage.get('openai_api_key', null) || storage.get('openaiApiKey', null);
        if (oldAPIKey && !storage.get('os_state')?.ai?.apiKey) {
            this.state.ai.apiKey = oldAPIKey;
        }
        
        // Save migrated state
        storage.set('os_state', this.state);
        
        console.log('Migration complete');
    }

    // Get current state
    getState() {
        return { ...this.state };
    }

    // Get specific state slice
    getStateSlice(key) {
        return this.state[key] !== undefined ? { ...this.state[key] } : null;
    }

    // Set state (partial update)
    setState(partial) {
        const prevState = { ...this.state };
        this.state = {
            ...this.state,
            ...partial
        };
        
        // Persist to storage
        storage.set('os_state', this.state);
        
        // Notify listeners
        this.notifyListeners(prevState);
    }

    // Update specific state slice
    updateSlice(key, value) {
        if (this.state[key] === undefined) {
            console.warn(`State slice "${key}" does not exist`);
            return;
        }
        
        const prevState = { ...this.state };
        this.state = {
            ...this.state,
            [key]: value
        };
        
        storage.set('os_state', this.state);
        this.notifyListeners(prevState);
    }

    // Subscribe to state changes
    subscribe(listener) {
        if (typeof listener !== 'function') {
            console.error('Listener must be a function');
            return () => {};
        }
        
        this.listeners.add(listener);
        
        // Return unsubscribe function
        return () => {
            this.listeners.delete(listener);
        };
    }

    // Notify all listeners
    notifyListeners(prevState = null) {
        const currentState = this.getState();
        this.listeners.forEach(listener => {
            try {
                listener(currentState, prevState);
            } catch (error) {
                console.error('Error in state listener:', error);
            }
        });
    }

    // Dispatch action (simple reducer pattern)
    dispatch(action) {
        if (!action || typeof action !== 'object' || !action.type) {
            console.error('Invalid action:', action);
            return;
        }

        const prevState = { ...this.state };
        let newState = { ...this.state };

        switch (action.type) {
            case 'TASKS_UPDATE':
                newState.tasks = action.payload || [];
                break;
            case 'TASKS_ADD':
                newState.tasks = [...(newState.tasks || []), action.payload];
                break;
            case 'TASKS_REMOVE':
                newState.tasks = (newState.tasks || []).filter((_, i) => i !== action.payload);
                break;
            case 'TASKS_UPDATE_ITEM':
                if (action.payload.index !== undefined) {
                    newState.tasks = [...(newState.tasks || [])];
                    newState.tasks[action.payload.index] = {
                        ...newState.tasks[action.payload.index],
                        ...action.payload.data
                    };
                }
                break;

            case 'NOTES_UPDATE':
                newState.notes = action.payload || [];
                break;
            case 'NOTES_ADD':
                newState.notes = [action.payload, ...(newState.notes || [])];
                break;
            case 'NOTES_UPDATE_ITEM':
                const noteIndex = (newState.notes || []).findIndex(n => n.id === action.payload.id);
                if (noteIndex !== -1) {
                    newState.notes = [...(newState.notes || [])];
                    newState.notes[noteIndex] = {
                        ...newState.notes[noteIndex],
                        ...action.payload.data
                    };
                }
                break;
            case 'NOTES_REMOVE':
                newState.notes = (newState.notes || []).filter(n => n.id !== action.payload);
                break;

            case 'SETTINGS_UPDATE':
                newState.settings = {
                    ...(newState.settings || {}),
                    ...action.payload
                };
                break;

            case 'WINDOWS_UPDATE':
                newState.windows = {
                    ...(newState.windows || {}),
                    ...action.payload
                };
                break;

            case 'AI_HISTORY_ADD':
                newState.ai = {
                    ...(newState.ai || {}),
                    history: [...(newState.ai?.history || []), action.payload]
                };
                break;
            case 'AI_HISTORY_UPDATE':
                newState.ai = {
                    ...(newState.ai || {}),
                    history: action.payload || []
                };
                break;
            case 'AI_API_KEY_SET':
                newState.ai = {
                    ...(newState.ai || {}),
                    apiKey: action.payload || ''
                };
                break;

            case 'WEATHER_UPDATE':
                newState.weather = action.payload;
                break;

            default:
                console.warn('Unknown action type:', action.type);
                return;
        }

        this.state = newState;
        storage.set('os_state', this.state);
        this.notifyListeners(prevState);
    }
}

// Create singleton instance
const osStore = new OSStore();

// Initialize on load
function initOSStore() {
    return osStore.init();
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initOSStore);
} else {
    initOSStore();
}
