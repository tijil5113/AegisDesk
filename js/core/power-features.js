/**
 * Power Features — Cool extras without changing existing behavior
 * Adds: Shortcuts overlay, Command Palette, Quote widget, Session timer, Easter eggs
 */
(function () {
    'use strict';

    const KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'KeyB', 'KeyA'];
    const QUOTES = [
        { text: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
        { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
        { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
        { text: "Any sufficiently advanced technology is indistinguishable from magic.", author: "Arthur C. Clarke" },
        { text: "The best time to plant a tree was 20 years ago. The second best time is now.", author: "Chinese Proverb" },
        { text: "Innovation distinguishes between a leader and a follower.", author: "Steve Jobs" },
        { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
        { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
        { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
        { text: "Stay hungry. Stay foolish.", author: "Steve Jobs" }
    ];

    let konamiIndex = 0;
    let sessionStart = Date.now();

    // ——— 1. Keyboard Shortcuts Overlay ———
    function createShortcutsOverlay() {
        const overlay = document.createElement('div');
        overlay.id = 'shortcuts-overlay';
        overlay.className = 'power-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Keyboard shortcuts');
        overlay.innerHTML = `
            <div class="power-overlay-content shortcuts-content">
                <div class="power-overlay-header">
                    <h2>⌨️ Keyboard Shortcuts</h2>
                    <button class="power-overlay-close" aria-label="Close">&times;</button>
                </div>
                <div class="shortcuts-grid">
                    <div class="shortcut-row"><kbd>?</kbd><span>Show this shortcuts panel</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>P</kbd><span>Command Palette</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>Space</kbd><span>Focus search</span></div>
                    <div class="shortcut-row"><kbd>Alt</kbd>+<kbd>Space</kbd><span>Open apps menu</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>A</kbd><span>Quick Actions</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>N</kbd><span>New Task</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>N</kbd><span>New Note</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>K</kbd><span>AI Assistant</span></div>
                    <div class="shortcut-row"><kbd>Ctrl</kbd>+<kbd>Z</kbd><span>Undo (in supported apps)</span></div>
                    <div class="shortcut-row"><kbd>Esc</kbd><span>Close modals / blur</span></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        overlay.querySelector('.power-overlay-close').addEventListener('click', () => overlay.classList.remove('visible'));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.classList.remove('visible'); });
        overlay.addEventListener('keydown', (e) => { if (e.key === 'Escape') overlay.classList.remove('visible'); });

        return overlay;
    }

    // ——— 2. Command Palette ———
    function createCommandPalette() {
        const commands = [
            { id: 'tasks', label: 'Open Tasks', icon: '✅', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('tasks'); } },
            { id: 'notes', label: 'Open Notes', icon: '📝', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('notes'); } },
            { id: 'calculator', label: 'Open Calculator', icon: '🔢', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('calculator'); } },
            { id: 'weather', label: 'Open Weather', icon: '🌤️', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('weather'); } },
            { id: 'ai-chat', label: 'Open AI Assistant', icon: '🤖', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('ai-chat'); } },
            { id: 'calendar', label: 'Open Calendar', icon: '📅', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('calendar'); } },
            { id: 'files', label: 'Open Files', icon: '📁', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('files'); } },
            { id: 'settings', label: 'Open Settings', icon: '⚙️', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('settings'); } },
            { id: 'quick-actions', label: 'Quick Actions', icon: '⚡', fn: () => { if (typeof quickActions !== 'undefined') quickActions.toggle(); } },
            { id: 'theme', label: 'Change Theme', icon: '🎨', fn: () => { if (typeof themeSystem !== 'undefined') themeSystem.cycleTheme(); } },
            { id: 'help', label: 'Help', icon: '❓', fn: () => { if (typeof desktop !== 'undefined') desktop.openApp('help'); } }
        ];

        const overlay = document.createElement('div');
        overlay.id = 'command-palette';
        overlay.className = 'power-overlay';
        overlay.setAttribute('role', 'dialog');
        overlay.setAttribute('aria-label', 'Command palette');
        overlay.innerHTML = `
            <div class="power-overlay-content palette-content">
                <input type="text" class="palette-input" placeholder="Type a command..." aria-label="Search commands" />
                <div class="palette-list"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        const input = overlay.querySelector('.palette-input');
        const list = overlay.querySelector('.palette-list');

        function render(filter = '') {
            const q = filter.toLowerCase().trim();
            const filtered = q ? commands.filter(c => c.label.toLowerCase().includes(q)) : commands;
            list.innerHTML = filtered.map(c => `
                <button class="palette-item" data-id="${c.id}">
                    <span class="palette-icon">${c.icon}</span>
                    <span>${c.label}</span>
                </button>
            `).join('');

            list.querySelectorAll('.palette-item').forEach(btn => {
                btn.addEventListener('click', () => {
                    const cmd = commands.find(c => c.id === btn.dataset.id);
                    if (cmd?.fn) cmd.fn();
                    close();
                });
            });
        }

        function open() {
            overlay.classList.add('visible');
            render();
            input.value = '';
            input.focus();
        }

        function close() {
            overlay.classList.remove('visible');
            input.blur();
        }

        input.addEventListener('input', () => render(input.value));
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') close();
            if (e.key === 'Enter') {
                const first = list.querySelector('.palette-item');
                if (first) first.click();
            }
        });
        overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

        return { open, close };
    }

    // ——— 3. Quote of the Day Widget (floating on desktop) ———
    function createQuoteWidget() {
        const day = new Date().toDateString();
        const hash = day.split('').reduce((a, c) => ((a << 5) - a) + c.charCodeAt(0), 0);
        const q = QUOTES[Math.abs(hash) % QUOTES.length];

        const widget = document.createElement('div');
        widget.id = 'quote-widget';
        widget.className = 'quote-widget';
        widget.innerHTML = `
            <div class="quote-text">"${q.text}"</div>
            <div class="quote-author">— ${q.author}</div>
        `;

        document.body.appendChild(widget);
    }

    // ——— 4. Session Timer ———
    function createSessionTimer() {
        const el = document.createElement('div');
        el.id = 'session-timer';
        el.className = 'session-timer';
        el.title = 'Session duration';

        function format(ms) {
            const s = Math.floor(ms / 1000);
            const m = Math.floor(s / 60);
            const h = Math.floor(m / 60);
            if (h > 0) return `${h}h ${m % 60}m`;
            if (m > 0) return `${m}m ${s % 60}s`;
            return `${s}s`;
        }

        function update() {
            el.textContent = '🕐 ' + format(Date.now() - sessionStart);
        }

        setInterval(update, 1000);
        update();

        const timeContainer = document.querySelector('.time-date-container');
        if (timeContainer && timeContainer.parentElement) {
            const tray = timeContainer.closest('.system-tray') || timeContainer.parentElement;
            tray.insertBefore(el, timeContainer);
        }
    }

    // ——— 5. Konami Easter Egg ———
    function fireConfetti() {
        const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#10b981', '#f59e0b'];
        const count = 80;

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'confetti-piece';
            p.style.cssText = `
                position: fixed;
                width: 10px; height: 10px;
                background: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${50 + (Math.random() - 0.5) * 40}vw;
                top: -20px;
                border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
                animation: confetti-fall ${1.5 + Math.random()}s ease-out forwards;
                pointer-events: none;
                z-index: 99999;
            `;
            p.style.setProperty('--rx', (Math.random() - 0.5) * 360 + 'deg');
            p.style.setProperty('--delay', Math.random() * 0.5 + 's');
            document.body.appendChild(p);
            setTimeout(() => p.remove(), 3000);
        }

        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.success('🎉 Secret unlocked!', 'You found the Konami code!');
        }
    }

    function setupKonami() {
        document.addEventListener('keydown', (e) => {
            if (e.key === KONAMI[konamiIndex]) {
                konamiIndex++;
                if (konamiIndex === KONAMI.length) {
                    konamiIndex = 0;
                    fireConfetti();
                }
            } else {
                konamiIndex = 0;
            }
        });
    }

    // ——— 6. Add confetti keyframes ———
    function injectConfettiStyles() {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes confetti-fall {
                0% { transform: translateY(0) rotate(0deg); opacity: 1; }
                100% { transform: translateY(100vh) rotate(var(--rx, 360deg)); opacity: 0; }
            }
        `;
        document.head.appendChild(style);
    }

    // ——— Init ———
    function init() {
        injectConfettiStyles();

        const shortcutsOverlay = createShortcutsOverlay();
        const palette = createCommandPalette();

        document.addEventListener('keydown', (e) => {
            if (e.key === '?' && !e.ctrlKey && !e.metaKey && !e.altKey) {
                const active = document.activeElement;
                const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');
                if (!isInput) {
                    e.preventDefault();
                    shortcutsOverlay.classList.add('visible');
                }
            }
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'KeyP') {
                e.preventDefault();
                palette.open();
            }
            if ((e.ctrlKey || e.metaKey) && e.code === 'Space') {
                const search = document.getElementById('global-search');
                if (search && document.activeElement !== search) {
                    e.preventDefault();
                    search.focus();
                }
            }
        });

        setupKonami();

        function injectWidgets() {
            if (!document.getElementById('quote-widget')) createQuoteWidget();
            if (!document.getElementById('session-timer')) createSessionTimer();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => setTimeout(injectWidgets, 600));
        } else {
            setTimeout(injectWidgets, 600);
        }
    }

    init();
})();
