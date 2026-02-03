// Mode Manager - Work/Study/Focus/Chill Modes
class ModeManager {
    constructor() {
        this.currentMode = 'work';
        this.modes = {
            work: {
                name: 'Work',
                theme: 'dark',
                visibleApps: ['tasks', 'notes', 'calendar', 'email', 'code-editor'],
                hiddenApps: ['music', 'gallery', 'playground'],
                notificationRules: {
                    allow: ['critical', 'important'],
                    block: ['low']
                },
                animations: 'normal',
                focus: true
            },
            study: {
                name: 'Study',
                theme: 'dark',
                visibleApps: ['notes', 'code-editor', 'browser', 'calculator'],
                hiddenApps: ['email', 'news', 'music'],
                notificationRules: {
                    allow: ['critical'],
                    block: ['low', 'normal']
                },
                animations: 'reduced',
                focus: true
            },
            focus: {
                name: 'Focus',
                theme: 'dark',
                visibleApps: ['tasks', 'notes'],
                hiddenApps: ['email', 'news', 'music', 'browser', 'gallery', 'playground'],
                notificationRules: {
                    allow: ['critical'],
                    block: ['low', 'normal', 'important']
                },
                animations: 'minimal',
                focus: true
            },
            chill: {
                name: 'Chill',
                theme: 'dark',
                visibleApps: ['music', 'gallery', 'news', 'browser', 'playground'],
                hiddenApps: ['email', 'code-editor', 'terminal'],
                notificationRules: {
                    allow: ['critical', 'important', 'normal'],
                    block: []
                },
                animations: 'full',
                focus: false
            }
        };
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // Load saved mode
        const savedMode = storage.get('current_mode', 'work');
        if (this.modes[savedMode]) {
            this.currentMode = savedMode;
        }
        
        // Apply current mode
        this.applyMode(this.currentMode);
        
        this.initialized = true;
        console.log(`[ModeManager] Initialized with mode: ${this.currentMode}`);
    }

    // Set mode
    setMode(mode) {
        if (!this.modes[mode]) {
            console.warn(`[ModeManager] Unknown mode: ${mode}`);
            return false;
        }
        
        this.currentMode = mode;
        storage.set('current_mode', mode);
        
        // Apply mode
        this.applyMode(mode);
        
        // Record in user profile
        if (typeof userProfile !== 'undefined') {
            userProfile.recordEvent('mode_changed', { mode });
        }
        
        // Notify
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.show(
                'Mode Changed',
                `Switched to ${this.modes[mode].name} mode`,
                { type: 'info', priority: 'low' }
            );
        }
        
        // Dispatch event
        document.dispatchEvent(new CustomEvent('modeChanged', { 
            detail: { mode, config: this.modes[mode] } 
        }));
        
        return true;
    }

    // Apply mode
    applyMode(mode) {
        const config = this.modes[mode];
        if (!config) return;
        
        // Apply theme
        if (typeof themeSystem !== 'undefined') {
            themeSystem.setTheme(config.theme);
        }
        
        // Apply notification rules
        if (typeof notificationCenter !== 'undefined') {
            notificationCenter.setFocusMode(config.focus);
        }
        
        // Update app visibility (if desktop exists)
        if (typeof desktop !== 'undefined' && desktop.updateAppVisibility) {
            desktop.updateAppVisibility(config.visibleApps, config.hiddenApps);
        }
        
        // Apply animation settings
        this.applyAnimationSettings(config.animations);
        
        // Update UI
        this.updateModeIndicator();
    }

    // Apply animation settings
    applyAnimationSettings(level) {
        const root = document.documentElement;
        
        switch (level) {
            case 'minimal':
                root.style.setProperty('--animation-duration', '0ms');
                document.body.classList.add('animations-minimal');
                break;
            case 'reduced':
                root.style.setProperty('--animation-duration', '150ms');
                document.body.classList.add('animations-reduced');
                break;
            case 'normal':
                root.style.setProperty('--animation-duration', '300ms');
                document.body.classList.remove('animations-minimal', 'animations-reduced');
                break;
            case 'full':
                root.style.setProperty('--animation-duration', '500ms');
                document.body.classList.remove('animations-minimal', 'animations-reduced');
                break;
        }
    }

    // Update mode indicator
    updateModeIndicator() {
        // Remove existing indicator
        const existing = document.getElementById('mode-indicator');
        if (existing) {
            existing.remove();
        }
        
        // Create indicator
        const indicator = document.createElement('div');
        indicator.id = 'mode-indicator';
        indicator.className = 'mode-indicator';
        indicator.textContent = this.modes[this.currentMode].name;
        indicator.title = `Current mode: ${this.modes[this.currentMode].name}`;
        
        // Add to taskbar or desktop
        const taskbar = document.querySelector('.taskbar');
        if (taskbar) {
            taskbar.appendChild(indicator);
        } else {
            document.body.appendChild(indicator);
        }
    }

    // Get current mode
    getCurrentMode() {
        return this.currentMode;
    }

    // Get mode config
    getModeConfig(mode = null) {
        const targetMode = mode || this.currentMode;
        return { ...this.modes[targetMode] };
    }

    // Get available modes
    getAvailableModes() {
        return Object.keys(this.modes).map(key => ({
            id: key,
            name: this.modes[key].name,
            current: key === this.currentMode
        }));
    }

    // Quick switch (cycle through modes)
    quickSwitch() {
        const modes = Object.keys(this.modes);
        const currentIndex = modes.indexOf(this.currentMode);
        const nextIndex = (currentIndex + 1) % modes.length;
        this.setMode(modes[nextIndex]);
    }
}

// Create singleton instance
const modeManager = new ModeManager();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => modeManager.init());
} else {
    modeManager.init();
}

// Make globally accessible
window.modeManager = modeManager;
