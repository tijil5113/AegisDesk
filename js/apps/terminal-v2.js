// BULLETPROOF TERMINAL APP - Developer-grade terminal
// Uses TerminalEngine (xterm.js + fallback), VFS, AI, multi-tab, sessions

const TERMINAL_THEMES = ['vs-code-dark', 'dracula', 'nord', 'gruvbox', 'one-dark', 'solarized-dark', 'matrix-green', 'cyberpunk-neon', 'midnight-purple', 'solar-gold', 'retro-amber', 'oled-black'];
const TERMINAL_COMMANDS = ['help', 'clear', 'echo', 'date', 'whoami', 'pwd', 'ls', 'cd', 'mkdir', 'touch', 'rm', 'mv', 'cp', 'cat', 'open', 'notes', 'tasks', 'code', 'news', 'music', 'weather', 'theme', 'notify', 'workspace', 'history', 'node', 'python', 'ai'];
const TERMINAL_COMMAND_HINTS = {
    help: 'Show all commands', ls: 'List files', cd: 'Change directory', pwd: 'Show current path',
    mkdir: 'Create directory', touch: 'Create file', rm: 'Remove file/dir', mv: 'Move', cp: 'Copy',
    cat: 'Show file content', clear: 'Clear screen', echo: 'Echo text', date: 'Show date/time',
    whoami: 'Current user', open: 'Open app (e.g. open notes)', theme: 'Set theme (theme set nord)',
    notify: 'Send notification', workspace: 'Set workspace (work/study/personal)',
    history: 'Command history', node: 'Run JS file (node file.js)', python: 'Run Python file',
    ai: 'AI assistant — try: ai help, ai explain, ai fix error'
};

class AdvancedTerminalApp {
    constructor() {
        this.windowId = 'terminal';
        this.terminalEngines = new Map();
        this.activeTabId = null;
        this.tabs = [];
        this.nextTabId = 1;
        this.commandHistory = storage.get('terminalHistory', []) || [];
        this.currentDir = '/home/user';
        this.environment = { HOME: '/home/user', USER: 'user' };
        this.theme = storage.get('terminalTheme', 'vs-code-dark');
        this.fontFamily = storage.get('terminalFont', 'JetBrains Mono, Fira Code, Source Code Pro, Consolas, monospace') || 'JetBrains Mono, Fira Code, Source Code Pro, Consolas, monospace';
        this.fontSize = storage.get('terminalFontSize', 14) || 14;
        this.cursorStyle = storage.get('terminalCursorStyle', 'block') || 'block';
        this.cursorBlink = storage.get('terminalCursorBlink', true) !== false;
        this.scrollback = Math.min(Math.max(parseInt(storage.get('terminalScrollback'), 10) || 1000, 100), 10000);
        this.copyOnSelect = storage.get('terminalCopyOnSelect', true) !== false;
        this.rightClickPaste = storage.get('terminalRightClickPaste', true) !== false;
        this.vfs = typeof TerminalVFS !== 'undefined' ? new TerminalVFS() : null;
        this.searchOpen = false;
        this.reverseSearchOpen = false;
    }
    
    open() {
        const openFullPage = () => {
            try {
                window.open('terminal.html', '_blank') || (window.location.href = 'terminal.html');
            } catch (_) {
                window.location.href = 'terminal.html';
            }
        };
        try {
            const wm = typeof window !== 'undefined' ? window.windowManager : typeof windowManager !== 'undefined' ? windowManager : null;
            if (!wm || typeof wm.createWindow !== 'function') {
                openFullPage();
                return;
            }
            const content = this.render();
            const win = wm.createWindow(this.windowId, {
                title: 'Terminal',
                width: 1000,
                height: 700,
                class: 'app-terminal-v2',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="4 7 4 4 20 4 20 7"></polyline>
                    <line x1="9" y1="20" x2="15" y2="20"></line>
                    <line x1="12" y1="4" x2="12" y2="20"></line>
                </svg>`,
                content: content
            });
            this.attachEvents(win);
            const savedTabs = storage.get('terminalTabs', null);
            if (savedTabs && Array.isArray(savedTabs) && savedTabs.length > 0) {
                savedTabs.forEach((name) => {
                    this.createTab(win, name || null, true);
                });
                const firstId = this.tabs[0]?.id;
                if (firstId) setTimeout(() => this.activateTab(firstId), 50);
            } else {
                setTimeout(() => this.createTab(win), 300);
            }
            this.persistTabs();
        } catch (err) {
            console.error('Terminal open error:', err);
            openFullPage();
        }
    }
    
    persistTabs() {
        storage.set('terminalTabs', this.tabs.map(t => t.name));
        storage.set('terminalActiveTabId', this.activeTabId);
    }
    
    async tabComplete(line, engine) {
        const trimmed = line.trimStart();
        const words = trimmed.split(/\s+/);
        const lastWord = words[words.length - 1] || '';
        if (words.length <= 1) {
            const prefix = lastWord.toLowerCase();
            const matches = TERMINAL_COMMANDS.filter(c => c.startsWith(prefix));
            if (matches.length === 1) return matches[0].slice(prefix.length);
            if (matches.length > 1) {
                const common = matches[0].split('').filter((c, i) => matches.every(m => m[i] === c)).join('');
                if (common.length > prefix.length) return common.slice(prefix.length);
            }
            return undefined;
        }
        if (this.vfs && lastWord) {
            const cwd = engine.getDirectory();
            const list = await this.vfs.ls(cwd, '');
            if (!list) return undefined;
            const prefix = lastWord.includes('/') ? lastWord.split('/').pop() : lastWord;
            const matches = list.filter(e => e.name.startsWith(prefix)).map(e => e.name + (e.type === 'dir' ? '/' : ''));
            if (matches.length === 1) return (matches[0].startsWith(prefix) ? matches[0].slice(prefix.length) : matches[0]);
            if (matches.length > 1) {
                const base = lastWord.includes('/') ? lastWord.slice(0, lastWord.lastIndexOf('/') + 1) : '';
                const common = matches[0].split('').filter((c, i) => matches.every(m => m[i] === c)).join('');
                if (common.length > prefix.length) return (base + common).slice(lastWord.length);
            }
        }
        return undefined;
    }
    
    render() {
        return `
            <div class="terminal-v2-container">
                <div class="terminal-v2-header">
                    <div class="terminal-tabs" id="terminal-tabs"></div>
                    <div class="terminal-actions">
                        <button class="terminal-action-btn terminal-action-btn-primary" id="terminal-instructions" title="Terminal Instructions">Instructions</button>
                        <button class="terminal-action-btn" id="terminal-new-tab" title="New Tab (Ctrl+Shift+T)">➕</button>
                        <button class="terminal-action-btn" id="terminal-clear" title="Clear (Ctrl+Shift+C)">Clear</button>
                        <button class="terminal-action-btn" id="terminal-search" title="Search (Ctrl+F)">🔍</button>
                        <button class="terminal-action-btn" id="terminal-theme" title="Theme">🎨</button>
                        <button class="terminal-action-btn" id="terminal-settings" title="Settings">⚙️</button>
                        <button class="terminal-action-btn" id="terminal-new-page" title="Open in New Page">🌐</button>
                    </div>
                </div>
                <div id="terminal-search-bar" class="terminal-search-bar" style="display:none;">
                    <input type="text" id="terminal-search-input" placeholder="Search output..." />
                    <button type="button" id="terminal-search-prev">▲ Prev</button>
                    <button type="button" id="terminal-search-next">▼ Next</button>
                    <button type="button" id="terminal-search-close">Close</button>
                </div>
                <div id="terminal-reverse-search-bar" class="terminal-reverse-search-bar" style="display:none;">
                    <span class="terminal-reverse-prompt">(reverse-i-search)\`</span>
                    <input type="text" id="terminal-reverse-search-input" placeholder="" />
                    <span class="terminal-reverse-suffix">\': </span>
                </div>
                <div class="terminal-v2-content">
                    <div id="terminal-containers" class="terminal-containers"></div>
                    <div id="terminal-hint-bar" class="terminal-hint-bar" aria-live="polite">
                        <span class="terminal-hint-label">Hint:</span>
                        <span class="terminal-hint-text" id="terminal-hint-text">Type a command (e.g. help, ls) or press Tab to autocomplete.</span>
                    </div>
                </div>
                <div id="terminal-settings-modal" class="terminal-settings-modal" style="display:none;">
                    <div class="terminal-settings-content">
                        <h3>Terminal Settings</h3>
                        <div class="terminal-settings-grid">
                            <label>Theme</label>
                            <select id="terminal-setting-theme">${TERMINAL_THEMES.map(t => `<option value="${t}">${t}</option>`).join('')}</select>
                            <label>Font size</label>
                            <input type="number" id="terminal-setting-fontsize" min="10" max="28" value="14" />
                            <label>Font family</label>
                            <input type="text" id="terminal-setting-font" placeholder="Monospace font" />
                            <label>Cursor style</label>
                            <select id="terminal-setting-cursor"><option value="block">Block</option><option value="bar">Bar</option><option value="underline">Underline</option></select>
                            <label>Cursor blink</label>
                            <input type="checkbox" id="terminal-setting-blink" checked />
                            <label>Scrollback lines</label>
                            <input type="number" id="terminal-setting-scrollback" min="100" max="10000" value="1000" />
                            <label>Copy on select</label>
                            <input type="checkbox" id="terminal-setting-copyselect" checked />
                            <label>Right-click paste</label>
                            <input type="checkbox" id="terminal-setting-rightpaste" checked />
                        </div>
                        <div class="terminal-settings-actions">
                            <button type="button" id="terminal-settings-apply">Apply</button>
                            <button type="button" id="terminal-settings-close">Close</button>
                        </div>
                    </div>
                </div>
                <div id="terminal-instructions-modal" class="terminal-instructions-modal" style="display:none;" role="dialog" aria-labelledby="terminal-instructions-title" aria-modal="true">
                    <div class="terminal-instructions-panel">
                        <div class="terminal-instructions-header">
                            <h2 id="terminal-instructions-title">Terminal Instructions</h2>
                            <button type="button" class="terminal-instructions-close" id="terminal-instructions-close" aria-label="Close">×</button>
                        </div>
                        <div class="terminal-instructions-body">
                            <section>
                                <h3>How to type commands</h3>
                                <p>Type your command at the prompt and press <kbd>Enter</kbd>. Example: <code>ls</code> then Enter.</p>
                            </section>
                            <section>
                                <h3>Common commands</h3>
                                <ul>
                                    <li><code>ls</code> — List files</li>
                                    <li><code>cd folder</code> — Change directory</li>
                                    <li><code>pwd</code> — Show current path</li>
                                    <li><code>mkdir project</code> — Create folder</li>
                                    <li><code>touch file.txt</code> — Create file</li>
                                    <li><code>cat file.txt</code> — Show file content</li>
                                    <li><code>node file.js</code> — Run JavaScript</li>
                                    <li><code>clear</code> — Clear screen</li>
                                    <li><code>help</code> — Show all commands</li>
                                </ul>
                            </section>
                            <section>
                                <h3>AI commands</h3>
                                <ul>
                                    <li><code>ai help</code> — List AI commands</li>
                                    <li><code>ai explain &lt;thing&gt;</code> — Explain something</li>
                                    <li><code>ai fix error</code> — Get help fixing an error</li>
                                    <li><code>ai write script to &lt;goal&gt;</code> — Generate a script</li>
                                </ul>
                            </section>
                            <section>
                                <h3>OS commands</h3>
                                <ul>
                                    <li><code>open notes</code> — Open Notes app</li>
                                    <li><code>open tasks</code> — Open Tasks app</li>
                                    <li><code>open editor</code> — Open Code Editor</li>
                                    <li><code>theme set nord</code> — Change theme</li>
                                    <li><code>notify "message"</code> — Send notification</li>
                                    <li><code>workspace set work</code> — Set workspace</li>
                                </ul>
                            </section>
                            <section>
                                <h3>Keyboard shortcuts</h3>
                                <ul>
                                    <li><kbd>Tab</kbd> — Autocomplete command or path</li>
                                    <li><kbd>Ctrl+Shift+T</kbd> — New tab</li>
                                    <li><kbd>Ctrl+Shift+C</kbd> — Clear</li>
                                    <li><kbd>Ctrl+F</kbd> — Search output</li>
                                    <li><kbd>Ctrl+R</kbd> — Reverse history search</li>
                                    <li><kbd>↑</kbd> / <kbd>↓</kbd> — Command history</li>
                                </ul>
                            </section>
                            <section>
                                <h3>Tips for beginners</h3>
                                <p>Use the <strong>hint bar</strong> at the bottom — it suggests commands as you type. Press <kbd>Tab</kbd> to accept a suggestion. If a command isn’t found, try <code>help</code> or click Instructions again.</p>
                            </section>
                        </div>
                    </div>
                </div>
                <div id="terminal-context-menu" class="terminal-context-menu" style="display:none;">
                    <div class="terminal-context-item" data-action="copy">Copy</div>
                    <div class="terminal-context-item" data-action="paste">Paste</div>
                    <div class="terminal-context-item" data-action="selectall">Select All</div>
                    <div class="terminal-context-item" data-action="clear">Clear</div>
                    <div class="terminal-context-divider"></div>
                    <div class="terminal-context-item" data-action="split">Split Pane</div>
                    <div class="terminal-context-item" data-action="duplicate">Duplicate Tab</div>
                    <div class="terminal-context-item" data-action="settings">Settings</div>
                </div>
            </div>
        `;
    }
    
    createTab(window, tabName = null, noActivate = false) {
        const tabId = `tab-${this.nextTabId++}`;
        const name = tabName || `Terminal ${this.tabs.length + 1}`;
        
        this.tabs.push({ id: tabId, name, active: false });
        
        const tabsContainer = window.querySelector('#terminal-tabs');
        const tabButton = document.createElement('div');
        tabButton.className = 'terminal-tab';
        tabButton.dataset.tabId = tabId;
        tabButton.innerHTML = `
            <span class="tab-title">${name}</span>
            <button class="tab-close" data-tab-id="${tabId}" title="Close (Ctrl+W)">×</button>
        `;
        const titleSpan = tabButton.querySelector('.tab-title');
        const closeBtn = tabButton.querySelector('.tab-close');
        
        const containersDiv = window.querySelector('#terminal-containers');
        const container = document.createElement('div');
        container.className = 'terminal-container';
        container.id = `terminal-container-${tabId}`;
        container.style.display = 'none';
        containersDiv.appendChild(container);
        
        const engine = new TerminalEngine(container, {
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            theme: this.theme,
            cursorBlink: this.cursorBlink,
            cursorStyle: this.cursorStyle,
            scrollback: this.scrollback,
            copyOnSelect: this.copyOnSelect,
            rightClickPaste: this.rightClickPaste
        });
        
        engine.setHistory(this.commandHistory);
        engine.setDirectory(this.currentDir);
        engine.setEnvironment(this.environment);
        
        engine.onLine((command) => {
            this.executeCommand(engine, command);
        });
        engine.onTabComplete((line) => this.tabComplete(line, engine));
        engine.onData(() => {
            if (this.activeTabId === tabId) {
                setTimeout(() => this.updateHintBar(window), 0);
            }
        });
        
        this.terminalEngines.set(tabId, engine);
        if (!noActivate) {
            this.activeTabId = tabId;
            this.activateTab(tabId);
        }
        
        titleSpan.addEventListener('click', () => this.activateTab(tabId));
        titleSpan.addEventListener('dblclick', () => {
            const newName = prompt('Rename tab', name);
            if (newName != null && newName.trim()) {
                const tab = this.tabs.find(t => t.id === tabId);
                if (tab) {
                    tab.name = newName.trim();
                    titleSpan.textContent = tab.name;
                    this.persistTabs();
                }
            }
        });
        closeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(window, tabId);
        });
        
        tabsContainer.appendChild(tabButton);
        
        setTimeout(() => {
            this.writeWelcome(engine);
            if (!noActivate) engine.focus();
        }, noActivate ? 50 : 200);
        if (!noActivate) this.persistTabs();
        return tabId;
    }
    
    activateTab(tabId) {
        // Update tab states
        this.tabs.forEach(tab => {
            tab.active = tab.id === tabId;
        });
        
        // Update UI
        const window = document.querySelector(`[data-window-id="${this.windowId}"]`);
        if (!window) return;
        
        const tabs = window.querySelectorAll('.terminal-tab');
        tabs.forEach(tab => {
            if (tab.dataset.tabId === tabId) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Show/hide containers
        const containers = window.querySelectorAll('.terminal-container');
        containers.forEach(container => {
            if (container.id === `terminal-container-${tabId}`) {
                container.style.display = 'block';
            } else {
                container.style.display = 'none';
            }
        });
        
        this.activeTabId = tabId;
        
        const engine = this.terminalEngines.get(tabId);
        if (engine) {
            setTimeout(() => engine.focus(), 50);
            this.updateHintBar(window);
        }
    }
    
    closeTab(window, tabId) {
        if (this.tabs.length <= 1) {
            // Don't close last tab, just clear it
            const engine = this.terminalEngines.get(tabId);
            if (engine) {
                engine.clear();
                this.writeWelcome(engine);
            }
            return;
        }
        
        // Remove tab
        const tabIndex = this.tabs.findIndex(t => t.id === tabId);
        if (tabIndex !== -1) {
            this.tabs.splice(tabIndex, 1);
        }
        
        // Remove UI
        const tabButton = window.querySelector(`.terminal-tab[data-tab-id="${tabId}"]`);
        if (tabButton) tabButton.remove();
        
        const container = window.querySelector(`#terminal-container-${tabId}`);
        if (container) {
            const engine = this.terminalEngines.get(tabId);
            if (engine) {
                engine.destroy();
            }
            container.remove();
        }
        
        this.terminalEngines.delete(tabId);
        
        if (this.activeTabId === tabId) {
            const nextTab = this.tabs[0];
            if (nextTab) this.activateTab(nextTab.id);
        }
        this.persistTabs();
    }
    
    duplicateTab(win, tabId) {
        const tab = this.tabs.find(t => t.id === tabId);
        if (!tab) return;
        this.createTab(win, tab.name + ' (copy)');
        this.persistTabs();
    }
    
    writeWelcome(engine) {
        const welcome = `\x1b[36m╔═══════════════════════════════════════════╗\x1b[0m\n\x1b[36m║\x1b[0m     \x1b[32mAEGIS DESK TERMINAL\x1b[0m                   \x1b[36m║\x1b[0m\n\x1b[36m╚═══════════════════════════════════════════╝\x1b[0m\n\n\x1b[1;97mWelcome to Aegis Desk Terminal.\x1b[0m\n\x1b[33mClick \x1b[1mInstructions\x1b[0m\x1b[33m or type \x1b[36mhelp\x1b[0m\x1b[33m.\x1b[0m\n\n`;
        engine.write(welcome);
    }
    
    getHintForLine(line) {
        const trimmed = (line || '').trimStart();
        const first = trimmed.split(/\s+/)[0] || '';
        const prefix = first.toLowerCase();
        if (!prefix) return { suggestion: '', description: 'Type a command (e.g. help, ls) or press Tab to autocomplete.' };
        const matches = TERMINAL_COMMANDS.filter(c => c.startsWith(prefix));
        if (matches.length === 1) {
            const cmd = matches[0];
            return { suggestion: cmd, description: TERMINAL_COMMAND_HINTS[cmd] || cmd };
        }
        if (matches.length > 1) {
            const common = matches[0].split('').filter((c, i) => matches.every(m => m[i] === c)).join('');
            return { suggestion: common || matches[0], description: 'Press Tab to complete. Matches: ' + matches.slice(0, 5).join(', ') + (matches.length > 5 ? '…' : '') };
        }
        if (prefix.startsWith('ai')) {
            return { suggestion: 'ai', description: TERMINAL_COMMAND_HINTS.ai || 'AI commands: ai help, ai explain, ai fix error' };
        }
        for (const [cmd, desc] of Object.entries(TERMINAL_COMMAND_HINTS)) {
            if (cmd.startsWith(prefix)) return { suggestion: cmd, description: desc };
        }
        return { suggestion: '', description: 'Unknown. Try help or click Instructions.' };
    }
    
    updateHintBar(win) {
        if (!win) return;
        const bar = win.querySelector('#terminal-hint-bar');
        const textEl = win.querySelector('#terminal-hint-text');
        if (!bar || !textEl) return;
        const engine = this.getActiveEngine();
        if (!engine || typeof engine.getCurrentLine !== 'function') {
            textEl.textContent = 'Type a command (e.g. help, ls) or press Tab to autocomplete.';
            return;
        }
        const line = engine.getCurrentLine();
        const { suggestion, description } = this.getHintForLine(line);
        if (suggestion) {
            textEl.innerHTML = `<span class="terminal-hint-cmd">${suggestion}</span> — ${description}`;
        } else {
            textEl.textContent = description;
        }
    }
    
    openInstructionsModal(win) {
        const modal = win.querySelector('#terminal-instructions-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.querySelector('.terminal-instructions-panel').scrollTop = 0;
        }
    }
    
    closeInstructionsModal(win) {
        const modal = win.querySelector('#terminal-instructions-modal');
        if (modal) modal.style.display = 'none';
    }
    
    getActiveEngine() {
        if (!this.activeTabId) return null;
        return this.terminalEngines.get(this.activeTabId);
    }
    
    executeCommand(engine, command) {
        const raw = command.trim();
        const parts = raw.split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        if (cmd === 'ai') {
            this.handleAICommand(engine, args);
            return;
        }
        
        switch (cmd) {
            case 'help':
                this.showHelp(engine);
                break;
            case 'clear':
                engine.clear();
                break;
            case 'echo':
                engine.writeln(args.join(' '));
                break;
            case 'date':
                engine.writeln(new Date().toString());
                break;
            case 'whoami':
                engine.writeln(engine.getEnvironment().USER);
                break;
            case 'pwd':
                engine.writeln(engine.getDirectory());
                break;
            case 'ls':
                this.listFiles(engine, args);
                break;
            case 'cd':
                this.changeDirectory(engine, args[0] || '~');
                break;
            case 'mkdir':
                this.vfsMkdir(engine, args[0]);
                break;
            case 'touch':
                this.vfsTouch(engine, args[0]);
                break;
            case 'rm':
                this.vfsRm(engine, args);
                break;
            case 'mv':
                this.vfsMv(engine, args[0], args[1]);
                break;
            case 'cp':
                this.vfsCp(engine, args[0], args[1]);
                break;
            case 'cat':
                this.vfsCat(engine, args[0]);
                break;
            case 'open':
                if (['notes', 'tasks', 'code-editor', 'news', 'music', 'weather', 'settings', 'ai-chat'].includes((args[0] || '').toLowerCase())) {
                    this.openApp(engine, (args[0] || '').toLowerCase().replace('music', 'music-player'));
                } else {
                    this.openApp(engine, args[0]);
                }
                break;
            case 'notes':
                this.openApp(engine, 'notes');
                break;
            case 'tasks':
                this.openApp(engine, 'tasks');
                break;
            case 'code':
            case 'code-editor':
                this.openCodeEditor(engine, args[0]);
                break;
            case 'news':
                this.openApp(engine, 'news');
                break;
            case 'music':
                this.openApp(engine, 'music-player');
                break;
            case 'weather':
                this.openApp(engine, 'weather');
                break;
            case 'settings':
                this.openApp(engine, 'settings');
                break;
            case 'theme':
                if (args[0] === 'set' && args[1]) {
                    this.changeTheme(engine, args[1]);
                } else {
                    this.changeTheme(engine, args[0]);
                }
                break;
            case 'notify':
                this.cmdNotify(engine, args.join(' '));
                break;
            case 'workspace':
                if (args[0] === 'set' && ['work', 'study', 'personal'].includes((args[1] || '').toLowerCase())) {
                    storage.set('terminalWorkspace', (args[1] || '').toLowerCase());
                    engine.writeln(`\x1b[32m✓ Workspace set to: ${args[1]}\x1b[0m`);
                } else {
                    engine.writeln('\x1b[33mUsage: workspace set work|study|personal\x1b[0m');
                }
                break;
            case 'focus':
                if (args[0] === 'on' && typeof windowManager !== 'undefined' && windowManager.focusWindow) {
                    try { windowManager.focusWindow(this.windowId); } catch (_) {}
                    engine.writeln('\x1b[32m✓ Focus set\x1b[0m');
                }
                break;
            case 'history':
                this.showHistory(engine);
                break;
            case 'node':
                this.runNode(engine, args[0]);
                break;
            case 'python':
                this.runPython(engine, args[0]);
                break;
            default:
                if (cmd.endsWith('.html') && args.length === 0) {
                    this.previewHtml(engine, cmd);
                } else if (cmd === 'python3') {
                    this.runPython(engine, args[0]);
                } else {
                    engine.writeln(`\x1b[31mCommand not found.\x1b[0m Try \x1b[36mhelp\x1b[0m or \x1b[33mInstructions\x1b[0m.`);
                }
        }
    }
    
    async vfsMkdir(engine, name) {
        if (!name) { engine.writeln('\x1b[31mUsage: mkdir <name>\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        const ok = await this.vfs.mkdir(cwd, name);
        if (ok) engine.writeln(`\x1b[32m✓ Created directory ${name}\x1b[0m`);
        else engine.writeln(`\x1b[31mmkdir failed\x1b[0m`);
    }
    
    async vfsTouch(engine, name) {
        if (!name) { engine.writeln('\x1b[31mUsage: touch <name>\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        const ok = await this.vfs.touch(cwd, name);
        if (ok) engine.writeln(`\x1b[32m✓ Created file ${name}\x1b[0m`);
        else engine.writeln(`\x1b[31mtouch failed\x1b[0m`);
    }
    
    async vfsRm(engine, args) {
        const name = args[0];
        if (!name) { engine.writeln('\x1b[31mUsage: rm <path> [-r]\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const recursive = args.includes('-r') || args.includes('-rf');
        const cwd = engine.getDirectory();
        const target = args.filter(a => a !== '-r' && a !== '-rf')[0];
        const ok = await this.vfs.rm(cwd, target, recursive);
        if (ok === true) engine.writeln(`\x1b[32m✓ Removed\x1b[0m`);
        else if (ok === null) engine.writeln(`\x1b[31mDirectory not empty. Use rm -r\x1b[0m`);
        else engine.writeln(`\x1b[31mrm failed\x1b[0m`);
    }
    
    async vfsMv(engine, from, to) {
        if (!from || !to) { engine.writeln('\x1b[31mUsage: mv <from> <to>\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        const ok = await this.vfs.mv(cwd, from, to);
        if (ok) engine.writeln(`\x1b[32m✓ Moved\x1b[0m`);
        else engine.writeln(`\x1b[31mmv failed\x1b[0m`);
    }
    
    async vfsCp(engine, from, to) {
        if (!from || !to) { engine.writeln('\x1b[31mUsage: cp <from> <to>\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        const ok = await this.vfs.cp(cwd, from, to);
        if (ok) engine.writeln(`\x1b[32m✓ Copied\x1b[0m`);
        else engine.writeln(`\x1b[31mcp failed\x1b[0m`);
    }
    
    async vfsCat(engine, name) {
        if (!name) { engine.writeln('\x1b[31mUsage: cat <file>\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        const result = await this.vfs.cat(cwd, name);
        if (result === null) engine.writeln(`\x1b[31mNo such file or directory\x1b[0m`);
        else if (result.dir) engine.writeln(`\x1b[31mcat: ${name} is a directory\x1b[0m`);
        else engine.writeln(result.content || '');
    }
    
    cmdNotify(engine, msg) {
        const m = (msg || '').replace(/^["']|["']$/g, '');
        if (typeof window !== 'undefined' && window.Notification && Notification.permission === 'granted') {
            new Notification('Aegis Desk', { body: m || 'Notification' });
            engine.writeln('\x1b[32m✓ Notification sent\x1b[0m');
        } else {
            engine.writeln('\x1b[33mAllow notifications in browser to use notify.\x1b[0m');
        }
    }
    
    async runNode(engine, file) {
        if (!file) { engine.writeln('\x1b[31mUsage: node <file.js>\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        const result = await this.vfs.cat(cwd, file);
        if (!result || result.dir) { engine.writeln(`\x1b[31mFile not found: ${file}\x1b[0m`); return; }
        try {
            const mockConsole = {
                log: (...a) => { engine.writeln(a.map(x => String(x)).join(' ')); },
                error: (...a) => { engine.writeln('\x1b[31m' + a.map(x => String(x)).join(' ') + '\x1b[0m'); }
            };
            const fn = new Function('console', result.content);
            fn(mockConsole);
        } catch (e) {
            engine.writeln('\x1b[31m' + (e.message || e) + '\x1b[0m');
            if (e.stack) engine.writeln('\x1b[33m' + e.stack + '\x1b[0m');
        }
    }
    
    async runPython(engine, file) {
        if (!file) { engine.writeln('\x1b[31mUsage: python file.py\x1b[0m'); return; }
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        const result = await this.vfs.cat(cwd, file);
        if (!result || result.dir) { engine.writeln(`\x1b[31mFile not found: ${file}\x1b[0m`); return; }
        if (typeof loadPyodide !== 'undefined') {
            try {
                const pyodide = await loadPyodide();
                await pyodide.runPythonAsync(result.content);
            } catch (e) {
                engine.writeln('\x1b[31m' + (e.message || e) + '\x1b[0m');
            }
        } else {
            engine.writeln('\x1b[33mPython (Pyodide) not loaded. Include Pyodide in the page to run Python.\x1b[0m');
        }
    }
    
    previewHtml(engine, file) {
        if (!this.vfs) { engine.writeln('\x1b[33mVFS not available.\x1b[0m'); return; }
        const cwd = engine.getDirectory();
        this.vfs.cat(cwd, file).then((result) => {
            if (!result || result.dir) { engine.writeln(`\x1b[31mFile not found: ${file}\x1b[0m`); return; }
            const w = window.open('', '_blank');
            if (w) { w.document.write(result.content); w.document.close(); engine.writeln('\x1b[32m✓ Opened preview\x1b[0m'); }
            else engine.writeln('\x1b[31mPopup blocked\x1b[0m');
        });
    }
    
    async handleAICommand(engine, args) {
        if (!args || args.length === 0) {
            engine.writeln('\x1b[33mAI Commands:\x1b[0m');
            engine.writeln('  \x1b[32mai explain <output>\x1b[0m     Explain command/output');
            engine.writeln('  \x1b[32mai fix error\x1b[0m            Get help fixing an error');
            engine.writeln('  \x1b[32mai generate script for <goal>\x1b[0m  Generate a script');
            engine.writeln('  \x1b[32mai optimize command\x1b[0m     Optimize a command');
            engine.writeln('  \x1b[32mai translate <English>\x1b[0m   English → shell command');
            engine.writeln('  \x1b[32mai help\x1b[0m                  Show this');
            return;
        }
        
        const subCmd = args[0].toLowerCase();
        const query = args.slice(1).join(' ');
        
        if (subCmd === 'help') {
            this.handleAICommand(engine, []);
            return;
        }
        
        engine.write('\x1b[33m🤖 AI: \x1b[0m');
        
        try {
            let aiResponse = '';
            let suggestedCommand = null;
            
            if (subCmd === 'explain') {
                if (!query) { engine.writeln('\x1b[31mUsage: ai explain <command or output>\x1b[0m'); return; }
                aiResponse = await this.terminalAIFetch('Explain briefly what this does: ' + query);
            } else if (subCmd === 'fix' || subCmd === 'debug') {
                if (!query) { engine.writeln('\x1b[31mUsage: ai fix error <description>\x1b[0m'); return; }
                aiResponse = await this.terminalAIFetch('User sees this error. Give short, step-by-step fix. Safe suggestions only.\nError: ' + query);
            } else if (subCmd === 'generate') {
                const goal = args.slice(1).join(' ').replace(/^script\s+for\s+/i, '');
                if (!goal) { engine.writeln('\x1b[31mUsage: ai generate script for <goal>\x1b[0m'); return; }
                aiResponse = await this.terminalAIFetch('Generate a short shell script or command for: ' + goal + '. Output only the command or script, one line if possible.');
                suggestedCommand = this.extractSuggestedCommand(aiResponse);
            } else if (subCmd === 'optimize') {
                const cmd = args.slice(1).join(' ');
                if (!cmd) { engine.writeln('\x1b[31mUsage: ai optimize command <your command>\x1b[0m'); return; }
                aiResponse = await this.terminalAIFetch('Suggest a simpler or faster equivalent for this command: ' + cmd + '. Then output the suggested command on a line starting with $.');
                suggestedCommand = this.extractSuggestedCommand(aiResponse);
            } else if (subCmd === 'translate') {
                if (!query) { engine.writeln('\x1b[31mUsage: ai translate <English description>\x1b[0m'); return; }
                aiResponse = await this.terminalAIFetch('Convert to a single shell/terminal command. Reply with only the command, or command then brief explanation.');
                suggestedCommand = this.extractSuggestedCommand(aiResponse);
            } else if (subCmd === 'suggest') {
                aiResponse = await this.terminalAIFetch('Suggest 3–5 useful terminal commands for productivity. Short list.');
            } else {
                engine.writeln(`\x1b[31mUnknown: ai ${subCmd}\x1b[0m. Type \x1b[36mai help\x1b[0m`);
                return;
            }
            
            engine.writeln('\x1b[36m' + (aiResponse || 'No response.') + '\x1b[0m');
            if (suggestedCommand) {
                engine.writeln('\x1b[33m▶ Run suggested command: \x1b[32m' + suggestedCommand + '\x1b[0m');
                engine.writeln('  (\x1b[90mPaste the line above and press Enter to run\x1b[0m)');
            }
        } catch (error) {
            engine.writeln(`\x1b[31mAI error: ${error.message}\x1b[0m`);
            engine.writeln('\x1b[33mEnsure OPENAI_API_KEY is set on the server (e.g. .env).\x1b[0m');
        }
    }
    
    extractSuggestedCommand(text) {
        if (!text) return null;
        const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
        for (const line of lines) {
            const t = line.replace(/^\$\s*/, '').trim();
            if (t && !t.startsWith('```') && /^[a-zA-Z][a-zA-Z0-9_\-.]*/.test(t)) return t;
        }
        const m = text.match(/\$?\s*([a-z][a-z0-9_\-\s.]+)/i);
        return m ? m[1].trim() : null;
    }
    
    async terminalAIFetch(userPrompt) {
        const origin = window.location.origin || '';
        const url = origin ? `${origin}/api/chat` : '/api/chat';
        const systemPrompt = 'You are a helpful terminal assistant. Be concise, friendly, and safe. Prefer one-line answers when possible. For commands, output the command on its own line.';
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userPrompt }
                ]
            })
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || res.statusText);
        }
        const data = await res.json();
        const content = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
        return content || '';
    }
    
    showHelp(engine) {
        const help = `
\x1b[33m╔══ AEGIS DESK TERMINAL — Command reference ══╗\x1b[0m

\x1b[32mFile system (VFS):\x1b[0m
  \x1b[36mls [dir]\x1b[0m     List files
  \x1b[36mcd [dir]\x1b[0m     Change directory
  \x1b[36mpwd\x1b[0m          Print working directory
  \x1b[36mmkdir <name>\x1b[0m Create directory
  \x1b[36mtouch <file>\x1b[0m Create file
  \x1b[36mcat <file>\x1b[0m  Show file content
  \x1b[36mrm <path> [-r]\x1b[0m  Remove
  \x1b[36mmv <from> <to>\x1b[0m  Move
  \x1b[36mcp <from> <to>\x1b[0m  Copy

\x1b[32mRun code:\x1b[0m
  \x1b[36mnode file.js\x1b[0m   Run JavaScript (sandbox)
  \x1b[36mpython file.py\x1b[0m Run Python (Pyodide)
  \x1b[36mfile.html\x1b[0m     Preview HTML (type path)

\x1b[32mOS / Aegis:\x1b[0m
  \x1b[36mopen notes\x1b[0m   \x1b[36mopen tasks\x1b[0m   \x1b[36mopen code-editor\x1b[0m
  \x1b[36mtheme set <name>\x1b[0m  Change theme
  \x1b[36mnotify \"msg\"\x1b[0m  Send notification
  \x1b[36mworkspace set work|study|personal\x1b[0m

\x1b[32mAI:\x1b[0m
  \x1b[36mai explain <cmd>\x1b[0m  \x1b[36mai fix error\x1b[0m  \x1b[36mai generate script for <goal>\x1b[0m
  \x1b[36mai optimize command\x1b[0m  \x1b[36mai translate English → shell\x1b[0m  \x1b[36mai help\x1b[0m

\x1b[32mOther:\x1b[0m  \x1b[36mhelp\x1b[0m  \x1b[36mclear\x1b[0m  \x1b[36mecho\x1b[0m  \x1b[36mdate\x1b[0m  \x1b[36mwhoami\x1b[0m  \x1b[36mhistory\x1b[0m
\x1b[36mHotkeys:\x1b[0m Ctrl+Shift+T new tab | Ctrl+F search | Ctrl+R history search | Ctrl+Shift+C clear
`;
        engine.writeln(help);
    }
    
    async listFiles(engine, args) {
        const cwd = engine.getDirectory();
        if (this.vfs) {
            const list = await this.vfs.ls(cwd, args[0] || null);
            if (list === null) {
                engine.writeln('\x1b[31mNo such directory\x1b[0m');
                return;
            }
            const lines = list.map(e => e.type === 'dir' ? '\x1b[34m' + e.name + '\x1b[0m' : e.name);
            engine.writeln(lines.join('  '));
        } else {
            engine.writeln(['\x1b[34mDocuments\x1b[0m', '\x1b[34mDownloads\x1b[0m', '\x1b[34mDesktop\x1b[0m'].join('  '));
        }
    }
    
    async changeDirectory(engine, dir) {
        const currentDir = engine.getDirectory();
        let newDir = currentDir;
        if (dir === '~' || dir === '') {
            newDir = engine.getEnvironment().HOME;
        } else if (dir === '..') {
            const parts = currentDir.split('/').filter(p => p);
            parts.pop();
            newDir = '/' + parts.join('/') || '/';
        } else if (dir.startsWith('/')) {
            newDir = dir;
        } else {
            newDir = (currentDir.endsWith('/') ? currentDir : currentDir + '/') + dir;
        }
        if (this.vfs) {
            const list = await this.vfs.ls(newDir, '');
            if (list === null) {
                engine.writeln('\x1b[31mNo such directory\x1b[0m');
                return;
            }
        }
        engine.setDirectory(newDir);
        this.currentDir = newDir;
    }
    
    openApp(engine, appName) {
        if (typeof windowManager !== 'undefined' && typeof APP_REGISTRY !== 'undefined') {
            if (APP_REGISTRY[appName] && APP_REGISTRY[appName].open) {
                APP_REGISTRY[appName].open();
                engine.writeln(`\x1b[32m✓ Opening ${appName}...\x1b[0m`);
            } else {
                engine.writeln(`\x1b[31m✗ App not found: ${appName}\x1b[0m`);
                engine.writeln(`Available apps: news, music-player, tasks, notes, weather, ai-chat, code-editor`);
            }
        } else {
            engine.writeln(`\x1b[33m⚠ Window manager not available\x1b[0m`);
        }
    }
    
    openCodeEditor(engine, filename) {
        if (typeof codeEditorApp !== 'undefined' && codeEditorApp.open) {
            codeEditorApp.open();
            if (filename) {
                engine.writeln(`\x1b[32m✓ Opening ${filename} in code editor...\x1b[0m`);
            } else {
                engine.writeln(`\x1b[32m✓ Opening code editor...\x1b[0m`);
            }
        } else {
            engine.writeln(`\x1b[31m✗ Code editor not available\x1b[0m`);
        }
    }
    
    changeTheme(engine, themeName) {
        if (themeName) {
            if (TERMINAL_THEMES.includes(themeName)) {
                this.theme = themeName;
                storage.set('terminalTheme', themeName);
                this.terminalEngines.forEach(e => e.setTheme(themeName));
                engine.writeln(`\x1b[32m✓ Theme set: ${themeName}\x1b[0m`);
            } else {
                engine.writeln(`\x1b[31m✗ Invalid theme. Available: ${TERMINAL_THEMES.join(', ')}\x1b[0m`);
            }
        } else {
            engine.writeln(`\x1b[33mThemes:\x1b[0m ${TERMINAL_THEMES.join(', ')}\n  \x1b[36mtheme set <name>\x1b[0m`);
        }
    }
    
    showHistory(engine) {
        const history = engine.getHistory();
        if (history.length === 0) {
            engine.writeln('\x1b[33mNo command history.\x1b[0m');
        } else {
            history.slice(-20).forEach((cmd, i) => {
                engine.writeln(`  ${i + 1}. ${cmd}`);
            });
        }
    }
    
    attachEvents(window) {
        window.querySelector('#terminal-new-tab')?.addEventListener('click', () => this.createTab(window));
        
        window.querySelector('#terminal-clear')?.addEventListener('click', () => {
            const engine = this.getActiveEngine();
            if (engine) { engine.clear(); this.writeWelcome(engine); }
        });
        
        window.querySelector('#terminal-theme')?.addEventListener('click', () => {
            const engine = this.getActiveEngine();
            if (engine) {
                const idx = TERMINAL_THEMES.indexOf(this.theme);
                this.changeTheme(engine, TERMINAL_THEMES[(idx + 1) % TERMINAL_THEMES.length]);
            }
        });
        
        window.querySelector('#terminal-settings')?.addEventListener('click', () => this.openSettingsModal(window));
        window.querySelector('#terminal-instructions')?.addEventListener('click', () => this.openInstructionsModal(window));
        window.querySelector('#terminal-instructions-close')?.addEventListener('click', () => this.closeInstructionsModal(window));
        window.querySelector('#terminal-instructions-modal')?.addEventListener('click', (e) => {
            if (e.target.id === 'terminal-instructions-modal') this.closeInstructionsModal(window);
        });
        
        window.querySelector('#terminal-new-page')?.addEventListener('click', () => {
            this.persistTabs();
            storage.set('terminalSessionOrigin', window.location.origin || '');
            const w = window.open('terminal.html', '_blank');
            if (!w) window.location.href = 'terminal.html';
        });
        
        const searchBar = window.querySelector('#terminal-search-bar');
        const searchInput = window.querySelector('#terminal-search-input');
        const revBar = window.querySelector('#terminal-reverse-search-bar');
        const revInput = window.querySelector('#terminal-reverse-search-input');
        
        window.querySelector('#terminal-search')?.addEventListener('click', () => {
            this.searchOpen = true;
            if (searchBar) searchBar.style.display = 'flex';
            setTimeout(() => searchInput?.focus(), 50);
        });
        window.querySelector('#terminal-search-close')?.addEventListener('click', () => {
            this.searchOpen = false;
            if (searchBar) searchBar.style.display = 'none';
            const eng = this.getActiveEngine();
            if (eng && eng.searchClear) eng.searchClear();
        });
        window.querySelector('#terminal-search-next')?.addEventListener('click', () => {
            const eng = this.getActiveEngine();
            if (eng && eng.searchFindNext) eng.searchFindNext(searchInput?.value || '');
        });
        window.querySelector('#terminal-search-prev')?.addEventListener('click', () => {
            const eng = this.getActiveEngine();
            if (eng && eng.searchFindPrevious) eng.searchFindPrevious(searchInput?.value || '');
        });
        searchInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { searchBar.style.display = 'none'; this.searchOpen = false; }
            if (e.key === 'Enter') this.getActiveEngine()?.searchFindNext?.(searchInput.value);
        });
        
        revInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { revBar.style.display = 'none'; this.reverseSearchOpen = false; revInput.value = ''; }
            if (e.key === 'Enter') {
                const eng = this.getActiveEngine();
                const hist = eng ? eng.getHistory() : [];
                const q = revInput.value.toLowerCase();
                const match = hist.filter(h => h.toLowerCase().includes(q)).pop();
                if (match && eng) { eng.pasteText(match + '\n'); }
                revBar.style.display = 'none';
                this.reverseSearchOpen = false;
            }
        });
        
        const modal = window.querySelector('#terminal-settings-modal');
        window.querySelector('#terminal-settings-close')?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        window.querySelector('#terminal-settings-apply')?.addEventListener('click', () => this.applySettings(window));
        modal?.addEventListener('click', (e) => { if (e.target === modal) modal.style.display = 'none'; });
        
        window.querySelectorAll('#terminal-context-menu .terminal-context-item').forEach(el => {
            el.addEventListener('click', () => {
                const action = el.dataset.action;
                const win = document.querySelector(`[data-window-id="${this.windowId}"]`);
                const tabId = document.getElementById('terminal-context-menu')?.dataset?.tabContextId || this.activeTabId;
                document.getElementById('terminal-context-menu').style.display = 'none';
                const engine = this.getActiveEngine();
                if (action === 'copy' && engine) {
                    const sel = engine.getSelectionText ? engine.getSelectionText() : '';
                    if (sel && navigator.clipboard) navigator.clipboard.writeText(sel);
                } else if (action === 'paste' && engine && navigator.clipboard) {
                    navigator.clipboard.readText().then(t => engine.pasteText(t));
                } else if (action === 'selectall' && engine && engine.terminal?.selectAll) engine.terminal.selectAll();
                else if (action === 'clear' && engine) { engine.clear(); this.writeWelcome(engine); }
                else if (action === 'split') { /* split pane - create new tab for now */ this.createTab(win); }
                else if (action === 'settings') this.openSettingsModal(win);
                else if (action === 'duplicate' && tabId) this.duplicateTab(win, tabId);
            });
        });
        document.addEventListener('click', () => {
            const menu = window.querySelector('#terminal-context-menu');
            if (menu) menu.style.display = 'none';
        });
        
        window.addEventListener('keydown', (e) => {
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') { e.preventDefault(); this.createTab(window); }
            else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'W') { e.preventDefault(); if (this.activeTabId) this.closeTab(window, this.activeTabId); }
            else if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'C') { e.preventDefault(); const eng = this.getActiveEngine(); if (eng) { eng.clear(); this.writeWelcome(eng); } }
            else if ((e.ctrlKey || e.metaKey) && e.key === 'f') { e.preventDefault(); this.searchOpen = true; if (searchBar) searchBar.style.display = 'flex'; searchInput?.focus(); }
            else if ((e.ctrlKey || e.metaKey) && e.key === 'r') { e.preventDefault(); this.reverseSearchOpen = true; if (revBar) revBar.style.display = 'flex'; revInput?.value = ''; revInput?.focus(); }
            else if ((e.ctrlKey || e.metaKey) && e.key === 'w') { e.preventDefault(); if (this.activeTabId) this.closeTab(window, this.activeTabId); }
            else if ((e.ctrlKey || e.metaKey) && e.key === 'l') { e.preventDefault(); const eng = this.getActiveEngine(); if (eng) { eng.clear(); this.writeWelcome(eng); } }
            else if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') { e.preventDefault(); const i = parseInt(e.key) - 1; if (i < this.tabs.length) this.activateTab(this.tabs[i].id); }
        });
        
        window.querySelector('#terminal-containers')?.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const menu = window.querySelector('#terminal-context-menu');
            if (!menu) return;
            menu.dataset.tabContextId = this.activeTabId;
            menu.style.display = 'block';
            menu.style.left = e.clientX + 'px';
            menu.style.top = e.clientY + 'px';
        });
    }
    
    openSettingsModal(window) {
        const modal = window.querySelector('#terminal-settings-modal');
        if (!modal) return;
        const sel = window.querySelector('#terminal-setting-theme');
        if (sel) { sel.value = this.theme; }
        const fs = window.querySelector('#terminal-setting-fontsize');
        if (fs) fs.value = this.fontSize;
        const ff = window.querySelector('#terminal-setting-font');
        if (ff) ff.value = this.fontFamily;
        const cur = window.querySelector('#terminal-setting-cursor');
        if (cur) cur.value = this.cursorStyle;
        const bl = window.querySelector('#terminal-setting-blink');
        if (bl) bl.checked = this.cursorBlink;
        const sb = window.querySelector('#terminal-setting-scrollback');
        if (sb) sb.value = this.scrollback;
        const co = window.querySelector('#terminal-setting-copyselect');
        if (co) co.checked = this.copyOnSelect;
        const rp = window.querySelector('#terminal-setting-rightpaste');
        if (rp) rp.checked = this.rightClickPaste;
        modal.style.display = 'flex';
    }
    
    applySettings(window) {
        const sel = window.querySelector('#terminal-setting-theme');
        if (sel) { this.theme = sel.value; storage.set('terminalTheme', this.theme); }
        const fs = window.querySelector('#terminal-setting-fontsize');
        if (fs) { this.fontSize = Math.min(28, Math.max(10, parseInt(fs.value, 10) || 14)); storage.set('terminalFontSize', this.fontSize); }
        const ff = window.querySelector('#terminal-setting-font');
        if (ff) { this.fontFamily = ff.value || this.fontFamily; storage.set('terminalFont', this.fontFamily); }
        const cur = window.querySelector('#terminal-setting-cursor');
        if (cur) { this.cursorStyle = cur.value; storage.set('terminalCursorStyle', this.cursorStyle); }
        const bl = window.querySelector('#terminal-setting-blink');
        if (bl) { this.cursorBlink = bl.checked; storage.set('terminalCursorBlink', this.cursorBlink); }
        const sb = window.querySelector('#terminal-setting-scrollback');
        if (sb) { this.scrollback = Math.min(10000, Math.max(100, parseInt(sb.value, 10) || 1000)); storage.set('terminalScrollback', this.scrollback); }
        const co = window.querySelector('#terminal-setting-copyselect');
        if (co) { this.copyOnSelect = co.checked; storage.set('terminalCopyOnSelect', this.copyOnSelect); }
        const rp = window.querySelector('#terminal-setting-rightpaste');
        if (rp) { this.rightClickPaste = rp.checked; storage.set('terminalRightClickPaste', this.rightClickPaste); }
        this.terminalEngines.forEach(eng => {
            if (eng.setOptions) eng.setOptions({ fontFamily: this.fontFamily, fontSize: this.fontSize, theme: this.theme, cursorBlink: this.cursorBlink, cursorStyle: this.cursorStyle, scrollback: this.scrollback });
            else { eng.setTheme(this.theme); }
        });
        window.querySelector('#terminal-settings-modal').style.display = 'none';
    }
}

// Create instance
const terminalApp = new AdvancedTerminalApp();
window.terminalApp = terminalApp;
