/**
 * Theme System - Premium multi-theme registry with selector UI.
 * MODIFY ONLY theme-related logic and UI. No desktop/window manager changes.
 */
(function (global) {
    'use strict';

    var CATEGORIES = ['Dark', 'Neon', 'Luxury', 'Minimal', 'Experimental'];

    function defaultCategory(name) {
        if (!name) return 'Dark';
        var n = name.toLowerCase();
        if (n.indexOf('neon') >= 0 || n.indexOf('cyberpunk') >= 0 || n.indexOf('electric') >= 0) return 'Neon';
        if (n.indexOf('minimal') >= 0 || n.indexOf('white') >= 0 || n.indexOf('light') >= 0 || n.indexOf('arctic') >= 0) return 'Minimal';
        if (n.indexOf('gold') >= 0 || n.indexOf('royal') >= 0 || n.indexOf('rose') >= 0 || n.indexOf('solar') >= 0) return 'Luxury';
        if (n.indexOf('aurora') >= 0 || n.indexOf('matrix') >= 0 || n.indexOf('hacker') >= 0) return 'Experimental';
        return 'Dark';
    }

    function buildThemeRegistry() {
        var themes = {
            dark: {
                name: 'Dark',
                category: 'Dark',
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
                category: 'Minimal',
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
            nebulaPurple: {
                name: 'Nebula Purple',
                category: 'Neon',
                primary: '#a78bfa',
                primaryDark: '#7c3aed',
                primaryLight: '#c4b5fd',
                secondary: '#c084fc',
                accent: '#e879f9',
                bgDark: '#1e1b4b',
                bgDarker: '#0f0e25',
                bgCard: 'rgba(139, 92, 246, 0.18)',
                textPrimary: '#f3e8ff',
                textSecondary: '#e9d5ff',
                textMuted: '#c4b5fd'
            },
            cyberpunkNeon: {
                name: 'Cyberpunk Neon',
                category: 'Neon',
                primary: '#ff00ff',
                primaryDark: '#cc00cc',
                primaryLight: '#ff66ff',
                secondary: '#00ffff',
                accent: '#ff0080',
                bgDark: '#0a0a12',
                bgDarker: '#000008',
                bgCard: 'rgba(255, 0, 255, 0.08)',
                textPrimary: '#e0f7ff',
                textSecondary: '#00ffff',
                textMuted: '#99ffff'
            },
            midnightGlass: {
                name: 'Midnight Glass',
                category: 'Dark',
                primary: '#818cf8',
                primaryDark: '#6366f1',
                primaryLight: '#a5b4fc',
                secondary: '#94a3b8',
                accent: '#c4b5fd',
                bgDark: 'rgba(15, 23, 42, 0.85)',
                bgDarker: '#030712',
                bgCard: 'rgba(30, 41, 59, 0.6)',
                textPrimary: '#f1f5f9',
                textSecondary: '#cbd5e1',
                textMuted: '#94a3b8'
            },
            auroraBorealis: {
                name: 'Aurora Borealis',
                category: 'Experimental',
                primary: '#34d399',
                primaryDark: '#10b981',
                primaryLight: '#6ee7b7',
                secondary: '#22d3ee',
                accent: '#67e8f9',
                bgDark: '#052e16',
                bgDarker: '#022c22',
                bgCard: 'rgba(16, 185, 129, 0.15)',
                textPrimary: '#d1fae5',
                textSecondary: '#a7f3d0',
                textMuted: '#6ee7b7'
            },
            solarGold: {
                name: 'Solar Gold',
                category: 'Luxury',
                primary: '#fbbf24',
                primaryDark: '#f59e0b',
                primaryLight: '#fcd34d',
                secondary: '#d97706',
                accent: '#fde047',
                bgDark: '#0f0a05',
                bgDarker: '#000000',
                bgCard: 'rgba(251, 191, 36, 0.12)',
                textPrimary: '#fef3c7',
                textSecondary: '#fde68a',
                textMuted: '#fcd34d'
            },
            arcticIce: {
                name: 'Arctic Ice',
                category: 'Minimal',
                primary: '#38bdf8',
                primaryDark: '#0ea5e9',
                primaryLight: '#7dd3fc',
                secondary: '#e0f2fe',
                accent: '#bae6fd',
                bgDark: '#f0f9ff',
                bgDarker: '#e0f2fe',
                bgCard: 'rgba(224, 242, 254, 0.9)',
                textPrimary: '#0c4a6e',
                textSecondary: '#075985',
                textMuted: '#0369a1'
            },
            matrixHacker: {
                name: 'Matrix Hacker',
                category: 'Experimental',
                primary: '#00ff41',
                primaryDark: '#00cc33',
                primaryLight: '#33ff66',
                secondary: '#00ff41',
                accent: '#39ff14',
                bgDark: '#000000',
                bgDarker: '#000000',
                bgCard: 'rgba(0, 255, 65, 0.06)',
                textPrimary: '#00ff41',
                textSecondary: '#00cc33',
                textMuted: '#008822'
            },
            crimsonShadow: {
                name: 'Crimson Shadow',
                category: 'Dark',
                primary: '#dc2626',
                primaryDark: '#b91c1c',
                primaryLight: '#ef4444',
                secondary: '#991b1b',
                accent: '#f87171',
                bgDark: '#0f0505',
                bgDarker: '#000000',
                bgCard: 'rgba(220, 38, 38, 0.12)',
                textPrimary: '#fef2f2',
                textSecondary: '#fecaca',
                textMuted: '#fca5a5'
            },
            roseQuartz: {
                name: 'Rose Quartz',
                category: 'Luxury',
                primary: '#f9a8d4',
                primaryDark: '#ec4899',
                primaryLight: '#fbcfe8',
                secondary: '#f472b6',
                accent: '#fce7f3',
                bgDark: '#1f0f18',
                bgDarker: '#0f080c',
                bgCard: 'rgba(244, 114, 182, 0.15)',
                textPrimary: '#fdf2f8',
                textSecondary: '#fbcfe8',
                textMuted: '#f9a8d4'
            },
            royalIndigo: {
                name: 'Royal Indigo',
                category: 'Luxury',
                primary: '#6366f1',
                primaryDark: '#4f46e5',
                primaryLight: '#818cf8',
                secondary: '#7c3aed',
                accent: '#8b5cf6',
                bgDark: '#0f0e25',
                bgDarker: '#08071a',
                bgCard: 'rgba(99, 102, 241, 0.15)',
                textPrimary: '#e0e7ff',
                textSecondary: '#c7d2fe',
                textMuted: '#a5b4fc'
            },
            cyberpunk: {
                name: 'Cyberpunk',
                category: 'Neon',
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
                category: 'Dark',
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
                category: 'Dark',
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
                category: 'Experimental',
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
                category: 'Neon',
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
                category: 'Dark',
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
                category: 'Dark',
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
                category: 'Neon',
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
                category: 'Dark',
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
                category: 'Dark',
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
                category: 'Dark',
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
                category: 'Neon',
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
                category: 'Minimal',
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
                category: 'Experimental',
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
        return themes;
    }

    function ThemeSystem() {
        this.themes = buildThemeRegistry();
        this.currentTheme = 'dark';
        this.autoCycleEnabled = typeof storage !== 'undefined' ? storage.get('theme_auto_cycle', false) : false;
        this.autoCycleInterval = null;
        this._panelEl = null;
        this._styleEl = null;
    }

    ThemeSystem.prototype.init = function () {
        var saved = typeof storage !== 'undefined' ? storage.get('theme', 'dark') : 'dark';
        this.setTheme(saved);
        if (this.autoCycleEnabled) this.startAutoCycle();
        this.injectThemePanelStyles();
        this.buildThemePanel();
        var btn = document.getElementById('theme-switcher-btn');
        if (btn) {
            var self = this;
            // Single click opens Theme Selector anytime (capture so we run before other handlers)
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                self.showThemePanel();
            }, true);
        }
    };

    ThemeSystem.prototype.injectThemePanelStyles = function () {
        if (this._styleEl) return;
        var css = '.theme-panel-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);z-index:9999;display:flex;align-items:center;justify-content:center;padding:20px;box-sizing:border-box;animation:themePanelFadeIn .25s ease-out}.theme-panel-overlay.theme-panel-closing{animation:themePanelFadeOut .2s ease-in forwards}.theme-panel{background:rgba(30,41,59,0.97);backdrop-filter:blur(24px);border:1px solid rgba(148,163,184,0.2);border-radius:16px;max-width:520px;width:100%;max-height:min(88vh,620px);overflow:hidden;display:flex;flex-direction:column;box-shadow:0 24px 64px rgba(0,0,0,0.5);animation:themePanelSlide .3s cubic-bezier(0.34,1.56,0.64,1)}.theme-panel.closing{animation:themePanelSlideOut .2s ease-in forwards}.theme-panel-header{padding:20px 24px;border-bottom:1px solid rgba(148,163,184,0.15);flex-shrink:0}.theme-panel-header h2{margin:0;font-size:18px;font-weight:600;background:linear-gradient(135deg,var(--primary-light),var(--secondary));-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text}.theme-panel-body{flex:1;min-height:0;overflow-y:auto;padding:16px 24px}.theme-panel-body::-webkit-scrollbar{width:8px}.theme-panel-body::-webkit-scrollbar-track{background:rgba(15,23,42,0.4);border-radius:4px}.theme-panel-body::-webkit-scrollbar-thumb{background:rgba(99,102,241,0.4);border-radius:4px}.theme-panel-category{margin-bottom:20px}.theme-panel-category:last-child{margin-bottom:0}.theme-panel-category-title{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:var(--text-muted);margin:0 0 10px 0}.theme-panel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px}.theme-panel-card{position:relative;padding:14px;border-radius:12px;border:2px solid rgba(148,163,184,0.2);background:rgba(15,23,42,0.5);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease,border-color .15s ease;display:flex;flex-direction:column;align-items:center;gap:8px;min-height:80px}.theme-panel-card:hover{transform:translateY(-2px);box-shadow:0 8px 24px rgba(0,0,0,0.3);border-color:rgba(99,102,241,0.4)}.theme-panel-card.selected{border-color:var(--primary);box-shadow:0 0 0 2px rgba(99,102,241,0.3),0 0 20px rgba(99,102,241,0.2)}.theme-panel-swatch{width:100%;height:28px;border-radius:8px;flex-shrink:0}.theme-panel-card span{font-size:12px;font-weight:500;color:var(--text-primary);text-align:center;line-height:1.2}html.theme-transitioning,html.theme-transitioning body{transition:background-color .35s ease,color .35s ease}@keyframes themePanelFadeIn{from{opacity:0}to{opacity:1}}@keyframes themePanelFadeOut{to{opacity:0}}@keyframes themePanelSlide{from{opacity:0;transform:scale(0.96) translateY(12px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes themePanelSlideOut{to{opacity:0;transform:scale(0.98) translateY(8px)}}';
        this._styleEl = document.createElement('style');
        this._styleEl.id = 'theme-system-panel-styles';
        this._styleEl.textContent = css;
        document.head.appendChild(this._styleEl);
    };

    ThemeSystem.prototype.buildThemePanel = function () {
        if (this._panelEl) return;
        var self = this;
        var overlay = document.createElement('div');
        overlay.className = 'theme-panel-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.id = 'theme-panel-overlay';

        var byCategory = {};
        var themeIds = Object.keys(this.themes);
        themeIds.forEach(function (id) {
            var t = self.themes[id];
            var cat = t.category || defaultCategory(t.name);
            if (!byCategory[cat]) byCategory[cat] = [];
            byCategory[cat].push({ id: id, name: t.name, primary: t.primary, bgDark: t.bgDark, bgDarker: t.bgDarker });
        });
        var order = ['Dark', 'Neon', 'Luxury', 'Minimal', 'Experimental'];
        var cats = order.filter(function (c) { return byCategory[c] && byCategory[c].length; });
        var rest = Object.keys(byCategory).filter(function (c) { return order.indexOf(c) < 0; });
        cats = cats.concat(rest);

        var bodyHtml = '';
        cats.forEach(function (cat) {
            var list = byCategory[cat];
            if (!list.length) return;
            bodyHtml += '<div class="theme-panel-category"><div class="theme-panel-category-title">' + escapeHtml(cat) + '</div><div class="theme-panel-grid">';
            list.forEach(function (item) {
                var selected = item.id === self.currentTheme ? ' selected' : '';
                var swatchStyle = 'background:linear-gradient(135deg,' + item.primary + ',' + item.bgDark + ');';
                bodyHtml += '<div class="theme-panel-card' + selected + '" data-theme-id="' + escapeHtml(item.id) + '" role="button" tabindex="0">' +
                    '<div class="theme-panel-swatch" style="' + swatchStyle + '"></div>' +
                    '<span>' + escapeHtml(item.name) + '</span></div>';
            });
            bodyHtml += '</div></div>';
        });

        overlay.innerHTML = '<div class="theme-panel">' +
            '<header class="theme-panel-header"><h2>Choose theme</h2></header>' +
            '<div class="theme-panel-body">' + bodyHtml + '</div></div>';
        overlay.addEventListener('click', function (e) {
            if (e.target === overlay) self.hideThemePanel();
        });
        overlay.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') { e.preventDefault(); self.hideThemePanel(); }
        });
        var panel = overlay.querySelector('.theme-panel');
        overlay.querySelector('.theme-panel-body').addEventListener('click', function (e) {
            var card = e.target.closest('.theme-panel-card');
            if (!card) return;
            var id = card.dataset.themeId;
            if (id && self.themes[id]) {
                self.setTheme(id);
                overlay.querySelectorAll('.theme-panel-card').forEach(function (c) { c.classList.remove('selected'); });
                card.classList.add('selected');
                if (typeof notificationSystem !== 'undefined') {
                    notificationSystem.info('Theme', 'Switched to ' + self.themes[id].name);
                }
            }
        });
        overlay.style.display = 'none';
        document.body.appendChild(overlay);
        this._panelEl = overlay;
    };

    function escapeHtml(s) {
        var div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    ThemeSystem.prototype.showThemePanel = function () {
        if (!this._panelEl) this.buildThemePanel();
        var overlay = this._panelEl;
        overlay.classList.remove('theme-panel-closing');
        overlay.querySelectorAll('.theme-panel-card').forEach(function (c) {
            c.classList.toggle('selected', c.dataset.themeId === this.currentTheme);
        }.bind(this));
        overlay.setAttribute('aria-hidden', 'false');
        overlay.style.display = 'flex';
    };

    ThemeSystem.prototype.hideThemePanel = function () {
        var overlay = this._panelEl;
        if (!overlay) return;
        overlay.classList.add('theme-panel-closing');
        overlay.setAttribute('aria-hidden', 'true');
        setTimeout(function () {
            overlay.style.display = 'none';
        }, 200);
    };

    ThemeSystem.prototype.startAutoCycle = function () {
        this.stopAutoCycle();
        var self = this;
        this.autoCycleInterval = setInterval(function () { self.cycleTheme(); }, 30000);
    };

    ThemeSystem.prototype.stopAutoCycle = function () {
        if (this.autoCycleInterval) {
            clearInterval(this.autoCycleInterval);
            this.autoCycleInterval = null;
        }
    };

    ThemeSystem.prototype.toggleAutoCycle = function () {
        this.autoCycleEnabled = !this.autoCycleEnabled;
        if (typeof storage !== 'undefined') storage.set('theme_auto_cycle', this.autoCycleEnabled);
        if (this.autoCycleEnabled) this.startAutoCycle();
        else this.stopAutoCycle();
        return this.autoCycleEnabled;
    };

    ThemeSystem.prototype.setTheme = function (themeName) {
        if (!this.themes[themeName]) {
            themeName = 'dark';
        }
        this.currentTheme = themeName;
        var theme = this.themes[themeName];
        var root = document.documentElement;
        var skipKeys = { name: 1, category: 1 };

        var useTransition = !document.body.classList.contains('performance-mode') && 
            !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (useTransition) root.classList.add('theme-transitioning');

        Object.keys(theme).forEach(function (key) {
            if (skipKeys[key]) return;
            var cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
            root.style.setProperty(cssVar, theme[key]);
        });

        if (typeof storage !== 'undefined') storage.set('theme', themeName);
        document.body.className = document.body.className.replace(/\s*theme-\S+/g, '');
        document.body.classList.add('theme-' + themeName);

        if (useTransition) {
            setTimeout(function () { root.classList.remove('theme-transitioning'); }, 350);
        }
        document.dispatchEvent(new CustomEvent('themechange', { detail: { theme: themeName } }));
        return themeName;
    };

    ThemeSystem.prototype.getTheme = function () {
        return this.currentTheme;
    };

    ThemeSystem.prototype.getAvailableThemes = function () {
        var self = this;
        return Object.keys(this.themes).map(function (key) {
            var t = self.themes[key];
            return { id: key, name: t.name, category: t.category || defaultCategory(t.name) };
        });
    };

    ThemeSystem.prototype.cycleTheme = function () {
        var themes = Object.keys(this.themes);
        var idx = themes.indexOf(this.currentTheme);
        var next = themes[(idx + 1) % themes.length];
        return this.setTheme(next);
    };

    var themeSystem = new ThemeSystem();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { themeSystem.init(); });
    } else {
        themeSystem.init();
    }
    global.themeSystem = themeSystem;
    global.ThemeSystem = ThemeSystem;
})(typeof window !== 'undefined' ? window : this);
