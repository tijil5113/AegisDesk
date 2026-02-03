// Advanced Theme System with Multiple Themes
class ThemeSystem {
    constructor() {
        this.themes = {
            dark: {
                name: 'Dark',
                primary: '#6366f1',
                primaryDark: '#4f46e5',
                primaryLight: '#818cf8',
                secondary: '#8b5cf6',
                accent: '#ec4899',
                bgDark: '#0f172a',
                bgDarker: '#020617',
                bgCard: 'rgba(30, 41, 59, 0.8)',
                textPrimary: '#f1f5f9',
                textSecondary: '#cbd5e1',
                textMuted: '#94a3b8'
            },
            light: {
                name: 'Light',
                primary: '#6366f1',
                primaryDark: '#4f46e5',
                primaryLight: '#818cf8',
                secondary: '#8b5cf6',
                accent: '#ec4899',
                bgDark: '#f8fafc',
                bgDarker: '#ffffff',
                bgCard: 'rgba(255, 255, 255, 0.9)',
                textPrimary: '#0f172a',
                textSecondary: '#334155',
                textMuted: '#64748b'
            },
            cyberpunk: {
                name: 'Cyberpunk',
                primary: '#00ff88',
                primaryDark: '#00cc6a',
                primaryLight: '#33ffaa',
                secondary: '#ff0080',
                accent: '#ff00ff',
                bgDark: '#0a0a0f',
                bgDarker: '#000000',
                bgCard: 'rgba(0, 255, 136, 0.1)',
                textPrimary: '#00ff88',
                textSecondary: '#00cc6a',
                textMuted: '#008855'
            },
            ocean: {
                name: 'Ocean',
                primary: '#06b6d4',
                primaryDark: '#0891b2',
                primaryLight: '#22d3ee',
                secondary: '#3b82f6',
                accent: '#8b5cf6',
                bgDark: '#0c1222',
                bgDarker: '#050812',
                bgCard: 'rgba(6, 182, 212, 0.1)',
                textPrimary: '#e0f2fe',
                textSecondary: '#bae6fd',
                textMuted: '#7dd3fc'
            },
            sunset: {
                name: 'Sunset',
                primary: '#f97316',
                primaryDark: '#ea580c',
                primaryLight: '#fb923c',
                secondary: '#ec4899',
                accent: '#f43f5e',
                bgDark: '#1c0a0a',
                bgDarker: '#0f0505',
                bgCard: 'rgba(249, 115, 22, 0.1)',
                textPrimary: '#fff7ed',
                textSecondary: '#ffedd5',
                textMuted: '#fed7aa'
            },
            matrix: {
                name: 'Matrix',
                primary: '#00ff41',
                primaryDark: '#00cc33',
                primaryLight: '#33ff66',
                secondary: '#00ff41',
                accent: '#00ff41',
                bgDark: '#000000',
                bgDarker: '#000000',
                bgCard: 'rgba(0, 255, 65, 0.05)',
                textPrimary: '#00ff41',
                textSecondary: '#00cc33',
                textMuted: '#008822'
            },
            neonPurple: {
                name: 'Neon Purple',
                primary: '#a855f7',
                primaryDark: '#9333ea',
                primaryLight: '#c084fc',
                secondary: '#ec4899',
                accent: '#f472b6',
                bgDark: '#1e1b4b',
                bgDarker: '#0f0e25',
                bgCard: 'rgba(168, 85, 247, 0.15)',
                textPrimary: '#f3e8ff',
                textSecondary: '#e9d5ff',
                textMuted: '#c084fc'
            },
            spaceBlack: {
                name: 'Space Black',
                primary: '#0ea5e9',
                primaryDark: '#0284c7',
                primaryLight: '#38bdf8',
                secondary: '#6366f1',
                accent: '#8b5cf6',
                bgDark: '#020617',
                bgDarker: '#000000',
                bgCard: 'rgba(14, 165, 233, 0.1)',
                textPrimary: '#e0f2fe',
                textSecondary: '#bae6fd',
                textMuted: '#7dd3fc'
            },
            aquaBlue: {
                name: 'Aqua Blue',
                primary: '#06b6d4',
                primaryDark: '#0891b2',
                primaryLight: '#22d3ee',
                secondary: '#3b82f6',
                accent: '#0ea5e9',
                bgDark: '#0c1222',
                bgDarker: '#050812',
                bgCard: 'rgba(6, 182, 212, 0.15)',
                textPrimary: '#e0f2fe',
                textSecondary: '#bae6fd',
                textMuted: '#7dd3fc'
            },
            electricPink: {
                name: 'Electric Pink',
                primary: '#ec4899',
                primaryDark: '#db2777',
                primaryLight: '#f472b6',
                secondary: '#f43f5e',
                accent: '#fb7185',
                bgDark: '#1f0f1f',
                bgDarker: '#0f050f',
                bgCard: 'rgba(236, 72, 153, 0.15)',
                textPrimary: '#fce7f3',
                textSecondary: '#fbcfe8',
                textMuted: '#f9a8d4'
            },
            solarizedDark: {
                name: 'Solarized Dark',
                primary: '#268bd2',
                primaryDark: '#1e6fa8',
                primaryLight: '#4ca5d2',
                secondary: '#2aa198',
                accent: '#859900',
                bgDark: '#002b36',
                bgDarker: '#001e26',
                bgCard: 'rgba(38, 139, 210, 0.15)',
                textPrimary: '#fdf6e3',
                textSecondary: '#eee8d5',
                textMuted: '#93a1a1'
            },
            forestGreen: {
                name: 'Forest Green',
                primary: '#10b981',
                primaryDark: '#059669',
                primaryLight: '#34d399',
                secondary: '#22c55e',
                accent: '#84cc16',
                bgDark: '#0a1f14',
                bgDarker: '#05100a',
                bgCard: 'rgba(16, 185, 129, 0.15)',
                textPrimary: '#d1fae5',
                textSecondary: '#a7f3d0',
                textMuted: '#6ee7b7'
            },
            sunsetOrange: {
                name: 'Sunset Orange',
                primary: '#f97316',
                primaryDark: '#ea580c',
                primaryLight: '#fb923c',
                secondary: '#f59e0b',
                accent: '#fbbf24',
                bgDark: '#1c0a0a',
                bgDarker: '#0f0505',
                bgCard: 'rgba(249, 115, 22, 0.15)',
                textPrimary: '#fff7ed',
                textSecondary: '#ffedd5',
                textMuted: '#fed7aa'
            },
            cyberpunkYellow: {
                name: 'Cyberpunk Yellow',
                primary: '#eab308',
                primaryDark: '#ca8a04',
                primaryLight: '#fcd34d',
                secondary: '#f59e0b',
                accent: '#fbbf24',
                bgDark: '#1a1a0a',
                bgDarker: '#0f0f05',
                bgCard: 'rgba(234, 179, 8, 0.15)',
                textPrimary: '#fefce8',
                textSecondary: '#fef9c3',
                textMuted: '#fde047'
            },
            minimalWhite: {
                name: 'Minimal White',
                primary: '#6366f1',
                primaryDark: '#4f46e5',
                primaryLight: '#818cf8',
                secondary: '#8b5cf6',
                accent: '#ec4899',
                bgDark: '#ffffff',
                bgDarker: '#f8fafc',
                bgCard: 'rgba(248, 250, 252, 0.95)',
                textPrimary: '#0f172a',
                textSecondary: '#334155',
                textMuted: '#64748b'
            },
            retroTerminalGreen: {
                name: 'Retro Terminal Green',
                primary: '#00ff41',
                primaryDark: '#00cc33',
                primaryLight: '#33ff66',
                secondary: '#00ff88',
                accent: '#00cc6a',
                bgDark: '#0d1117',
                bgDarker: '#010409',
                bgCard: 'rgba(0, 255, 65, 0.05)',
                textPrimary: '#00ff41',
                textSecondary: '#00cc33',
                textMuted: '#008822'
            }
        };
        this.currentTheme = 'dark';
        this.autoCycleEnabled = storage.get('theme_auto_cycle', false);
        this.autoCycleInterval = null;
        this.init();
    }

    init() {
        // Load saved theme
        const saved = storage.get('theme', 'dark');
        this.setTheme(saved);
        
        // Start auto-cycle if enabled
        if (this.autoCycleEnabled) {
            this.startAutoCycle();
        }
    }

    startAutoCycle() {
        this.stopAutoCycle();
        this.autoCycleInterval = setInterval(() => {
            this.cycleTheme();
        }, 30000); // 30 seconds
    }

    stopAutoCycle() {
        if (this.autoCycleInterval) {
            clearInterval(this.autoCycleInterval);
            this.autoCycleInterval = null;
        }
    }

    toggleAutoCycle() {
        this.autoCycleEnabled = !this.autoCycleEnabled;
        storage.set('theme_auto_cycle', this.autoCycleEnabled);
        
        if (this.autoCycleEnabled) {
            this.startAutoCycle();
        } else {
            this.stopAutoCycle();
        }
        
        return this.autoCycleEnabled;
    }

    setTheme(themeName) {
        if (!this.themes[themeName]) {
            console.warn(`Theme "${themeName}" not found, using dark`);
            themeName = 'dark';
        }

        this.currentTheme = themeName;
        const theme = this.themes[themeName];
        const root = document.documentElement;

        // Apply CSS variables
        Object.keys(theme).forEach(key => {
            if (key !== 'name') {
                const cssVar = `--${key.replace(/([A-Z])/g, '-$1').toLowerCase()}`;
                root.style.setProperty(cssVar, theme[key]);
            }
        });

        // Save preference
        storage.set('theme', themeName);

        // Update body class
        document.body.className = document.body.className.replace(/theme-\w+/g, '');
        document.body.classList.add(`theme-${themeName}`);

        // Dispatch event
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));

        return themeName;
    }

    getTheme() {
        return this.currentTheme;
    }

    getAvailableThemes() {
        return Object.keys(this.themes).map(key => ({
            id: key,
            name: this.themes[key].name
        }));
    }

    cycleTheme() {
        const themes = Object.keys(this.themes);
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        return this.setTheme(themes[nextIndex]);
    }
}

// Initialize globally
const themeSystem = new ThemeSystem();
