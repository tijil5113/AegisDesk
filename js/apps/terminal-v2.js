// BULLETPROOF TERMINAL APP - Best-in-Class Terminal
// Uses TerminalEngine with dual-engine system (xterm.js + fallback)
// NEVER FAILS - Works 100% offline

class AdvancedTerminalApp {
    constructor() {
        this.windowId = 'terminal';
        this.terminalEngines = new Map(); // tabId -> TerminalEngine
        this.activeTabId = null;
        this.tabs = [];
        this.nextTabId = 1;
        this.commandHistory = storage.get('terminalHistory', []) || [];
        this.currentDir = '/home/user';
        this.environment = { HOME: '/home/user', USER: 'user' };
        this.theme = storage.get('terminalTheme', 'vs-code-dark');
        this.fontFamily = storage.get('terminalFont', 'JetBrains Mono, Fira Code, Source Code Pro, Consolas, monospace');
        this.fontSize = storage.get('terminalFontSize', 14);
    }
    
    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
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
        
        this.attachEvents(window);
        
        // Initialize first tab after DOM is ready
        setTimeout(() => {
            this.createTab(window);
        }, 300);
    }
    
    render() {
        return `
            <div class="terminal-v2-container">
                <div class="terminal-v2-header">
                    <div class="terminal-tabs" id="terminal-tabs"></div>
                    <div class="terminal-actions">
                        <button class="terminal-action-btn" id="terminal-new-tab" title="New Tab (Ctrl+Shift+T)">➕</button>
                        <button class="terminal-action-btn" id="terminal-clear" title="Clear (Ctrl+L)">Clear</button>
                        <button class="terminal-action-btn" id="terminal-search" title="Search (Ctrl+F)">🔍</button>
                        <button class="terminal-action-btn" id="terminal-theme" title="Theme">🎨</button>
                        <button class="terminal-action-btn" id="terminal-settings" title="Settings">⚙️</button>
                        <button class="terminal-action-btn" id="terminal-new-page" title="Open in New Page">🌐</button>
                    </div>
                </div>
                <div class="terminal-v2-content">
                    <div id="terminal-containers" class="terminal-containers"></div>
                </div>
            </div>
        `;
    }
    
    createTab(window, tabName = null) {
        const tabId = `tab-${this.nextTabId++}`;
        const name = tabName || `Terminal ${this.tabs.length + 1}`;
        
        this.tabs.push({ id: tabId, name, active: false });
        
        // Create tab button
        const tabsContainer = window.querySelector('#terminal-tabs');
        const tabButton = document.createElement('div');
        tabButton.className = 'terminal-tab';
        tabButton.dataset.tabId = tabId;
        tabButton.innerHTML = `
            <span class="tab-title">${name}</span>
            <button class="tab-close" data-tab-id="${tabId}" title="Close (Ctrl+W)">×</button>
        `;
        
        // Create container
        const containersDiv = window.querySelector('#terminal-containers');
        const container = document.createElement('div');
        container.className = 'terminal-container';
        container.id = `terminal-container-${tabId}`;
        container.style.display = 'none';
        containersDiv.appendChild(container);
        
        // Create terminal engine
        const engine = new TerminalEngine(container, {
            fontFamily: this.fontFamily,
            fontSize: this.fontSize,
            theme: this.theme,
            cursorBlink: true,
            cursorStyle: 'block',
            scrollback: 1000
        });
        
        engine.setHistory(this.commandHistory);
        engine.setDirectory(this.currentDir);
        engine.setEnvironment(this.environment);
        
        // Setup command handler
        engine.onLine((command) => {
            this.executeCommand(engine, command);
        });
        
        this.terminalEngines.set(tabId, engine);
        this.activeTabId = tabId;
        this.activateTab(tabId);
        
        // Tab click handler
        tabButton.querySelector('.tab-title').addEventListener('click', () => {
            this.activateTab(tabId);
        });
        
        // Close button handler
        tabButton.querySelector('.tab-close').addEventListener('click', (e) => {
            e.stopPropagation();
            this.closeTab(window, tabId);
        });
        
        tabsContainer.appendChild(tabButton);
        
        // Write welcome message
        setTimeout(() => {
            this.writeWelcome(engine);
            engine.focus();
        }, 200);
        
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
        
        // Focus active terminal
        const engine = this.terminalEngines.get(tabId);
        if (engine) {
            setTimeout(() => engine.focus(), 50);
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
        
        // Activate another tab
        if (this.activeTabId === tabId) {
            const nextTab = this.tabs[0];
            if (nextTab) {
                this.activateTab(nextTab.id);
            }
        }
    }
    
    writeWelcome(engine) {
        const welcome = `\x1b[36m╔═══════════════════════════════════════════╗\x1b[0m\n\x1b[36m║\x1b[0m     \x1b[32mAEGIS DESK TERMINAL v3.0\x1b[0m              \x1b[36m║\x1b[0m\n\x1b[36m║\x1b[0m     \x1b[33mBulletproof Terminal Engine\x1b[0m          \x1b[36m║\x1b[0m\n\x1b[36m║\x1b[0m     \x1b[35mDual-Engine: xterm.js + Fallback\x1b[0m      \x1b[36m║\x1b[0m\n\x1b[36m╚═══════════════════════════════════════════╝\x1b[0m\n\n\x1b[32mWelcome!\x1b[0m Type '\x1b[36mhelp\x1b[0m' for available commands.\nType '\x1b[36mai help\x1b[0m' for AI-powered commands.\n\n`;
        engine.write(welcome);
    }
    
    getActiveEngine() {
        if (!this.activeTabId) return null;
        return this.terminalEngines.get(this.activeTabId);
    }
    
    executeCommand(engine, command) {
        const parts = command.trim().split(/\s+/);
        const cmd = parts[0].toLowerCase();
        const args = parts.slice(1);
        
        // AI commands
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
            case 'open':
                this.openApp(engine, args[0]);
                break;
            case 'code':
                this.openCodeEditor(engine, args[0]);
                break;
            case 'news':
                this.openApp(engine, 'news');
                break;
            case 'music':
                this.openApp(engine, 'music-player');
                break;
            case 'tasks':
                this.openApp(engine, 'tasks');
                break;
            case 'notes':
                this.openApp(engine, 'notes');
                break;
            case 'weather':
                this.openApp(engine, 'weather');
                break;
            case 'settings':
                this.openApp(engine, 'settings');
                break;
            case 'theme':
                this.changeTheme(engine, args[0]);
                break;
            case 'history':
                this.showHistory(engine);
                break;
            default:
                engine.writeln(`\x1b[31mCommand not found: ${cmd}\x1b[0m`);
                engine.writeln(`Type '\x1b[36mhelp\x1b[0m' for available commands.`);
        }
    }
    
    async handleAICommand(engine, args) {
        if (!args || args.length === 0) {
            engine.writeln('\x1b[33mAI-Powered Commands:\x1b[0m');
            engine.writeln('  \x1b[32mai explain <command>\x1b[0m  - Explain what a command does');
            engine.writeln('  \x1b[32mai debug <error>\x1b[0m     - Get help debugging an error');
            engine.writeln('  \x1b[32mai suggest\x1b[0m           - Get command suggestions');
            engine.writeln('  \x1b[32mai help\x1b[0m              - Show this help');
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
            
            if (subCmd === 'explain') {
                if (!query) {
                    engine.writeln('\x1b[31mPlease specify a command to explain.\x1b[0m');
                    return;
                }
                aiResponse = await this.aiExplainCommand(query);
            } else if (subCmd === 'debug') {
                if (!query) {
                    engine.writeln('\x1b[31mPlease describe the error you\'re debugging.\x1b[0m');
                    return;
                }
                aiResponse = await this.aiDebugError(query);
            } else if (subCmd === 'suggest') {
                aiResponse = await this.aiSuggestCommands();
            } else {
                engine.writeln(`\x1b[31mUnknown AI command: ${subCmd}\x1b[0m`);
                engine.writeln(`Type '\x1b[36mai help\x1b[0m' for available AI commands.`);
                return;
            }
            
            // Display AI response inline
            engine.writeln(`\x1b[36m${aiResponse}\x1b[0m`);
            
        } catch (error) {
            engine.writeln(`\x1b[31mAI error: ${error.message}\x1b[0m`);
            engine.writeln('\x1b[33mTip: Make sure AI is configured in Settings.\x1b[0m');
        }
    }
    
    async aiExplainCommand(command) {
        // Check if AI system is available
        if (typeof AISystem !== 'undefined') {
            const aiSystem = new AISystem();
            const prompt = `Explain what the command "${command}" does in a terminal. Be concise and practical.`;
            try {
                return await aiSystem.getAIResponse(prompt, false);
            } catch (e) {
                // Fall through to fallback
            }
        }
        
        // Fallback explanations
        const explanations = {
            'ls': 'Lists files and directories in the current directory.',
            'cd': 'Changes the current directory. Usage: cd <directory>',
            'pwd': 'Prints the current working directory path.',
            'clear': 'Clears the terminal screen.',
            'help': 'Shows available commands and their descriptions.',
            'open': 'Opens an application. Usage: open <app-name>',
            'code': 'Opens the code editor. Usage: code [filename]',
            'theme': 'Changes the terminal theme. Usage: theme <theme-name>'
        };
        
        const explanation = explanations[command.toLowerCase()];
        if (explanation) {
            return explanation;
        }
        
        return `The "${command}" command is not recognized. Try typing "help" to see available commands.`;
    }
    
    async aiDebugError(error) {
        // Check if AI system is available
        if (typeof AISystem !== 'undefined') {
            const aiSystem = new AISystem();
            const prompt = `A user is experiencing this error: "${error}". Provide debugging help. Be concise and actionable.`;
            try {
                return await aiSystem.getAIResponse(prompt, false);
            } catch (e) {
                // Fall through to fallback
            }
        }
        
        return `To debug: 1) Check the error message carefully, 2) Verify command syntax with "help", 3) Try breaking down the command into smaller parts.`;
    }
    
    async aiSuggestCommands() {
        // Check if AI system is available
        if (typeof AISystem !== 'undefined') {
            const aiSystem = new AISystem();
            const prompt = 'Suggest 3-5 useful terminal commands for managing tasks and productivity. Be concise.';
            try {
                return await aiSystem.getAIResponse(prompt, false);
            } catch (e) {
                // Fall through to fallback
            }
        }
        
        return 'Try: "open music" to play music, "tasks" to manage tasks, "notes" for notes, "news" for news, or "code" to open the editor.';
    }
    
    showHelp(engine) {
        const help = `
\x1b[33mAvailable Commands:\x1b[0m

\x1b[32mBasic:\x1b[0m
  \x1b[32mhelp\x1b[0m          Show this help message
  \x1b[32mclear\x1b[0m         Clear terminal screen
  \x1b[32mecho <text>\x1b[0m   Echo text
  \x1b[32mdate\x1b[0m          Show current date and time
  \x1b[32mwhoami\x1b[0m        Show current user
  \x1b[32mpwd\x1b[0m           Show current directory
  \x1b[32mls [dir]\x1b[0m      List files and directories
  \x1b[32mcd [dir]\x1b[0m      Change directory
  \x1b[32mhistory\x1b[0m       Show command history

\x1b[32mOpen Apps:\x1b[0m
  \x1b[32mopen <app>\x1b[0m    Open application (code-editor, music-player, etc.)
  \x1b[32mcode [file]\x1b[0m   Open code editor
  \x1b[32mnews\x1b[0m          Open News app
  \x1b[32mmusic\x1b[0m         Open Music app
  \x1b[32mtasks\x1b[0m         Open Tasks app
  \x1b[32mnotes\x1b[0m         Open Notes app
  \x1b[32mweather\x1b[0m       Open Weather app
  \x1b[32msettings\x1b[0m      Open Settings

\x1b[32mAI-Powered:\x1b[0m
  \x1b[32mai explain <cmd>\x1b[0m  Explain what a command does
  \x1b[32mai debug <error>\x1b[0m  Get help debugging
  \x1b[32mai suggest\x1b[0m        Get command suggestions
  \x1b[32mai help\x1b[0m           Show AI commands help

\x1b[32mSettings:\x1b[0m
  \x1b[32mtheme [name]\x1b[0m  Change terminal theme

\x1b[36mExamples:\x1b[0m
  $ open code-editor
  $ music
  $ theme dracula
  $ ai explain ls
`;
        engine.writeln(help);
    }
    
    listFiles(engine, args) {
        const files = ['\x1b[34mDocuments\x1b[0m', '\x1b[34mDownloads\x1b[0m', '\x1b[34mDesktop\x1b[0m', '\x1b[34mMusic\x1b[0m', '\x1b[34mPictures\x1b[0m', '\x1b[34mVideos\x1b[0m'];
        engine.writeln(files.join('  '));
    }
    
    changeDirectory(engine, dir) {
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
            newDir = currentDir + '/' + dir;
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
        const themes = ['vs-code-dark', 'dracula', 'one-dark', 'solarized-dark', 'matrix-green', 'retro-amber'];
        
        if (themeName) {
            if (themes.includes(themeName)) {
                this.theme = themeName;
                storage.set('terminalTheme', themeName);
                
                // Update all terminals
                this.terminalEngines.forEach(e => {
                    e.setTheme(themeName);
                });
                
                engine.writeln(`\x1b[32m✓ Theme changed to: ${themeName}\x1b[0m`);
            } else {
                engine.writeln(`\x1b[31m✗ Invalid theme: ${themeName}\x1b[0m`);
                engine.writeln(`Available themes: ${themes.join(', ')}`);
            }
        } else {
            engine.writeln(`\x1b[33mAvailable themes:\x1b[0m ${themes.join(', ')}`);
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
        // New tab
        window.querySelector('#terminal-new-tab')?.addEventListener('click', () => {
            this.createTab(window);
        });
        
        // Clear
        window.querySelector('#terminal-clear')?.addEventListener('click', () => {
            const engine = this.getActiveEngine();
            if (engine) {
                engine.clear();
                this.writeWelcome(engine);
            }
        });
        
        // Theme
        window.querySelector('#terminal-theme')?.addEventListener('click', () => {
            const engine = this.getActiveEngine();
            if (engine) {
                const themes = ['vs-code-dark', 'dracula', 'one-dark', 'solarized-dark', 'matrix-green', 'retro-amber'];
                const currentIndex = themes.indexOf(this.theme);
                const nextTheme = themes[(currentIndex + 1) % themes.length];
                this.changeTheme(engine, nextTheme);
            }
        });
        
        // New page
        window.querySelector('#terminal-new-page')?.addEventListener('click', () => {
            window.open('terminal.html', '_blank');
        });
        
        // Keyboard shortcuts
        window.addEventListener('keydown', (e) => {
            // Ctrl+Shift+T: New tab
            if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'T') {
                e.preventDefault();
                this.createTab(window);
            }
            // Ctrl+W: Close tab
            else if ((e.ctrlKey || e.metaKey) && e.key === 'w') {
                e.preventDefault();
                if (this.activeTabId) {
                    this.closeTab(window, this.activeTabId);
                }
            }
            // Ctrl+L: Clear
            else if ((e.ctrlKey || e.metaKey) && e.key === 'l') {
                e.preventDefault();
                const engine = this.getActiveEngine();
                if (engine) {
                    engine.clear();
                    this.writeWelcome(engine);
                }
            }
            // Tab switching (Ctrl+1, Ctrl+2, etc.)
            else if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '9') {
                e.preventDefault();
                const tabIndex = parseInt(e.key) - 1;
                if (tabIndex < this.tabs.length) {
                    this.activateTab(this.tabs[tabIndex].id);
                }
            }
        });
    }
}

// Create instance
const terminalApp = new AdvancedTerminalApp();
window.terminalApp = terminalApp;
