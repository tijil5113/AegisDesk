// Bulletproof Terminal Engine - DUAL ENGINE SYSTEM
// PRIMARY: xterm.js (local) | FALLBACK: Custom lightweight terminal
// NEVER FAILS - Always works offline

class TerminalEngine {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            fontFamily: options.fontFamily || 'JetBrains Mono, Fira Code, Source Code Pro, Consolas, monospace',
            fontSize: options.fontSize || 14,
            theme: options.theme || 'vs-code-dark',
            cursorBlink: options.cursorBlink !== false,
            cursorStyle: options.cursorStyle || 'block',
            scrollback: options.scrollback || 1000,
            copyOnSelect: options.copyOnSelect !== false,
            rightClickPaste: options.rightClickPaste !== false,
            ...options
        };
        
        this.engine = null; // 'xterm' or 'fallback'
        this.searchAddon = null;
        this.onReverseSearchCallback = null;
        this.onTabCompleteCallback = null;
        this.currentLine = '';
        this.commandHistory = [];
        this.historyIndex = -1;
        this.onDataCallback = null;
        this.onLineCallback = null;
        this.currentDir = '/home/user';
        this.environment = { HOME: '/home/user', USER: 'user' };
        
        this.init();
    }
    
    async init() {
        // Try to load xterm.js first (local vendor copy)
        const xtermLoaded = await this.loadXterm();
        
        if (xtermLoaded && window.Terminal) {
            console.log('✅ Terminal Engine: Using xterm.js (Primary)');
            this.initXtermEngine();
        } else {
            console.log('✅ Terminal Engine: Using Fallback Renderer (Offline-safe)');
            this.initFallbackEngine();
        }
    }
    
    async loadXterm() {
        // Check if already loaded
        if (window.Terminal) {
            return true;
        }
        
        try {
            // Load CSS
            if (!document.querySelector('link[href*="vendor/xterm/xterm.css"]')) {
                const cssLink = document.createElement('link');
                cssLink.rel = 'stylesheet';
                cssLink.href = 'vendor/xterm/xterm.css';
                document.head.appendChild(cssLink);
            }
            
            // Load xterm.js (local vendor copy)
            return new Promise((resolve) => {
                // Check if script already exists
                let script = document.querySelector('script[src*="vendor/xterm/xterm.js"]');
                
                if (!script) {
                    script = document.createElement('script');
                    script.src = 'vendor/xterm/xterm.js';
                    script.onload = () => {
                        // Wait a moment for Terminal to be available
                        setTimeout(() => {
                            this.loadXtermAddons().then(() => resolve(window.Terminal ? true : false));
                        }, 100);
                    };
                    script.onerror = () => {
                        console.warn('⚠️ xterm.js not found locally, using fallback');
                        resolve(false);
                    };
                    document.head.appendChild(script);
                } else {
                    // Script exists, wait for it to load
                    let attempts = 0;
                    const checkInterval = setInterval(() => {
                        attempts++;
                        if (window.Terminal) {
                            clearInterval(checkInterval);
                            this.loadXtermAddons().then(() => resolve(true));
                        } else if (attempts > 50) {
                            clearInterval(checkInterval);
                            resolve(false);
                        }
                    }, 100);
                }
            });
        } catch (e) {
            console.warn('⚠️ Failed to load xterm.js:', e);
            return false;
        }
    }
    
    async loadXtermAddons() {
        // Load FitAddon
        if (!window.FitAddon) {
            try {
                const fitScript = document.createElement('script');
                fitScript.src = 'vendor/xterm/addons/xterm-addon-fit.js';
                fitScript.onload = () => console.log('✅ FitAddon loaded');
                fitScript.onerror = () => console.warn('⚠️ FitAddon not available');
                document.head.appendChild(fitScript);
            } catch (e) {
                console.warn('FitAddon load failed:', e);
            }
        }
        
        // Load WebLinksAddon
        if (!window.WebLinksAddon) {
            try {
                const webLinksScript = document.createElement('script');
                webLinksScript.src = 'vendor/xterm/addons/xterm-addon-web-links.js';
                webLinksScript.onload = () => console.log('✅ WebLinksAddon loaded');
                document.head.appendChild(webLinksScript);
            } catch (e) {
                // Silent fail - optional addon
            }
        }
        // Load SearchAddon for Ctrl+F
        if (!window.SearchAddon) {
            try {
                const searchScript = document.createElement('script');
                searchScript.src = 'vendor/xterm/addons/xterm-addon-search.js';
                searchScript.onload = () => console.log('✅ SearchAddon loaded');
                document.head.appendChild(searchScript);
            } catch (e) {
                // Silent fail
            }
        }
    }
    
    getSafeThemeForXterm(themeName) {
        const theme = { ...this.getThemeConfig(themeName) };
        const BRIGHT_FG = '#e2e8f0';
        const BRIGHT_CURSOR = '#00dd88';
        const hexLuminance = (hex) => {
            const h = (hex || '').replace(/^#/, '');
            if (h.length !== 6) return 0;
            const r = parseInt(h.slice(0, 2), 16) / 255;
            const g = parseInt(h.slice(2, 4), 16) / 255;
            const b = parseInt(h.slice(4, 6), 16) / 255;
            const srgb = c => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));
            return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
        };
        if (!theme.foreground || hexLuminance(theme.foreground) < 0.35) theme.foreground = BRIGHT_FG;
        if (!theme.cursor || hexLuminance(theme.cursor) < 0.35) theme.cursor = BRIGHT_CURSOR;
        return theme;
    }
    
    initXtermEngine() {
        this.engine = 'xterm';
        const cursorStyle = this.options.cursorStyle === 'bar' ? 'bar' : this.options.cursorStyle === 'underline' ? 'underline' : 'block';
        this.terminal = new window.Terminal({
            cursorBlink: this.options.cursorBlink,
            cursorStyle,
            fontFamily: this.options.fontFamily,
            fontSize: this.options.fontSize,
            theme: this.getSafeThemeForXterm(this.options.theme),
            allowProposedApi: true,
            scrollback: Math.min(Math.max(this.options.scrollback || 1000, 100), 10000),
            tabStopWidth: 4,
            convertEol: true
        });
        
        // Load addons
        if (window.FitAddon) {
            try {
                const FitAddonClass = window.FitAddon.FitAddon || window.FitAddon;
                this.fitAddon = new FitAddonClass();
                this.terminal.loadAddon(this.fitAddon);
            } catch (e) {
                console.warn('FitAddon init failed:', e);
            }
        }
        
        if (window.WebLinksAddon) {
            try {
                const WebLinksAddonClass = window.WebLinksAddon.WebLinksAddon || window.WebLinksAddon;
                this.webLinksAddon = new WebLinksAddonClass();
                this.terminal.loadAddon(this.webLinksAddon);
            } catch (e) {
                // Silent fail
            }
        }
        
        if (window.SearchAddon) {
            try {
                const SearchAddonClass = window.SearchAddon.SearchAddon || window.SearchAddon;
                this.searchAddon = new SearchAddonClass();
                this.terminal.loadAddon(this.searchAddon);
                this.searchAddon.activate(this.terminal);
            } catch (e) {
                console.warn('SearchAddon init failed:', e);
            }
        }
        
        // Copy on select
        if (this.options.copyOnSelect && this.terminal.getSelection) {
            this.container.addEventListener('mouseup', () => {
                setTimeout(() => {
                    try {
                        const sel = this.terminal.getSelection();
                        if (sel && typeof navigator.clipboard !== 'undefined' && navigator.clipboard.writeText) {
                            navigator.clipboard.writeText(sel);
                        }
                    } catch (_) {}
                }, 10);
            });
        }
        
        // Open terminal
        this.terminal.open(this.container);
        
        // Fit to container
        if (this.fitAddon) {
            setTimeout(() => {
                try {
                    this.fitAddon.fit();
                } catch (e) {
                    console.warn('Fit failed:', e);
                }
            }, 100);
        }
        
        // Handle resize
        const resizeObserver = new ResizeObserver(() => {
            if (this.fitAddon) {
                setTimeout(() => {
                    try {
                        this.fitAddon.fit();
                    } catch (e) {
                        // Silent fail
                    }
                }, 50);
            }
        });
        resizeObserver.observe(this.container);
        
        // Setup input handler
        this.setupXtermInput();
    }
    
    initFallbackEngine() {
        this.engine = 'fallback';
        
        // Create fallback terminal HTML
        this.container.innerHTML = '';
        this.container.className = 'terminal-fallback-container';
        this.container.style.cssText = `
            width: 100%;
            height: 100%;
            background: ${this.getThemeConfig(this.options.theme).background || '#1e1e1e'};
            color: ${this.getThemeConfig(this.options.theme).foreground || '#d4d4d4'};
            font-family: ${this.options.fontFamily};
            font-size: ${this.options.fontSize}px;
            overflow-y: auto;
            overflow-x: hidden;
            padding: 16px;
            box-sizing: border-box;
            position: relative;
        `;
        
        this.fallbackContent = document.createElement('div');
        this.fallbackContent.className = 'terminal-fallback-content';
        this.fallbackContent.style.cssText = 'white-space: pre-wrap; word-wrap: break-word;';
        this.container.appendChild(this.fallbackContent);
        
        // Create input line
        this.fallbackInput = document.createElement('div');
        this.fallbackInput.className = 'terminal-fallback-input';
        this.fallbackInput.style.cssText = `
            display: flex;
            align-items: center;
            min-height: ${this.options.fontSize + 8}px;
        `;
        
        this.fallbackPrompt = document.createElement('span');
        this.fallbackPrompt.textContent = this.getPrompt();
        this.fallbackPrompt.style.cssText = `
            color: #10b981;
            margin-right: 8px;
        `;
        
        this.fallbackLine = document.createElement('span');
        this.fallbackLine.className = 'terminal-fallback-line';
        this.fallbackLine.style.cssText = `
            flex: 1;
            outline: none;
            position: relative;
        `;
        
        this.fallbackCursor = document.createElement('span');
        this.fallbackCursor.textContent = '█';
        this.fallbackCursor.className = 'terminal-fallback-cursor';
        this.fallbackCursor.style.cssText = `
            color: ${this.getThemeConfig(this.options.theme).cursor || '#aeafad'};
            animation: ${this.options.cursorBlink ? 'blink 1s infinite' : 'none'};
            margin-left: 2px;
        `;
        
        this.fallbackLine.appendChild(this.fallbackCursor);
        this.fallbackInput.appendChild(this.fallbackPrompt);
        this.fallbackInput.appendChild(this.fallbackLine);
        this.container.appendChild(this.fallbackInput);
        
        // Add blink animation
        if (!document.querySelector('#terminal-fallback-styles')) {
            const style = document.createElement('style');
            style.id = 'terminal-fallback-styles';
            style.textContent = `
                @keyframes blink {
                    0%, 49% { opacity: 1; }
                    50%, 100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        // Setup input handling
        this.setupFallbackInput();
        
        // Focus
        this.container.tabIndex = 0;
        this.container.focus();
    }
    
    setupXtermInput() {
        this.terminal.onData((data) => {
            this.handleInput(data);
        });
    }
    
    setupFallbackInput() {
        // Handle keyboard input
        this.container.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.handleEnter();
            } else if (e.key === 'Backspace') {
                e.preventDefault();
                this.handleBackspace();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.handleArrowUp();
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.handleArrowDown();
            } else if (e.key === 'c' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.handleCtrlC();
            } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.clear();
            } else if (e.key === 'v' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                // Paste will be handled by paste event
            } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
                this.handleCharacter(e.key);
            }
        });
        
        // Handle paste
        this.container.addEventListener('paste', (e) => {
            e.preventDefault();
            const text = e.clipboardData.getData('text');
            if (text) {
                for (const char of text) {
                    this.handleCharacter(char);
                }
            }
        });
    }
    
    handleInput(data) {
        if (this.engine === 'xterm') {
            if (data === '\t' && this.onTabCompleteCallback) {
                const result = this.onTabCompleteCallback(this.currentLine);
                const apply = (completion) => {
                    if (typeof completion === 'string' && completion.length > 0) {
                        this.terminal.write(completion);
                        this.currentLine += completion;
                    }
                };
                if (result && typeof result.then === 'function') {
                    result.then(apply);
                    return;
                }
                apply(result);
                if (typeof result === 'string' && result.length > 0) return;
            }
            for (let i = 0; i < data.length; i++) {
                const c = data[i];
                const code = c.charCodeAt(0);
                if (c === '\r' || c === '\n') {
                    // Write newline to terminal
                    this.terminal.write('\r\n');
                    const command = this.currentLine.trim();
                    if (command && this.onLineCallback) this.onLineCallback(command);
                    if (command) {
                        this.commandHistory.push(command);
                        if (this.commandHistory.length > 200) this.commandHistory.shift();
                    }
                    this.currentLine = '';
                    this.historyIndex = -1;
                } else if (code === 127 || code === 8) {
                    // Backspace: remove character from line and terminal
                    if (this.currentLine.length > 0) {
                        this.currentLine = this.currentLine.slice(0, -1);
                        // Write backspace sequence to terminal
                        this.terminal.write('\b \b');
                    }
                } else if (code >= 32 && code !== 127) {
                    // Printable character: add to line and write to terminal
                    this.currentLine += c;
                    this.terminal.write(c);
                }
            }
        }
        if (this.onDataCallback) {
            this.onDataCallback(data);
        }
    }
    
    handleEnter() {
        this.writeOutput('\n');
        const command = this.currentLine.trim();
        if (command && this.onLineCallback) {
            this.onLineCallback(command);
        }
        if (command) {
            this.commandHistory.push(command);
            if (this.commandHistory.length > 100) {
                this.commandHistory.shift();
            }
        }
        this.currentLine = '';
        this.historyIndex = -1;
        this.updatePrompt();
    }
    
    handleBackspace() {
        if (this.currentLine.length > 0) {
            this.currentLine = this.currentLine.slice(0, -1);
            this.updateInputDisplay();
        }
    }
    
    handleArrowUp() {
        if (this.historyIndex === -1) {
            this.historyIndex = this.commandHistory.length;
        }
        if (this.historyIndex > 0) {
            this.historyIndex--;
            this.currentLine = this.commandHistory[this.historyIndex] || '';
            this.updateInputDisplay();
        }
    }
    
    handleArrowDown() {
        if (this.historyIndex < this.commandHistory.length - 1) {
            this.historyIndex++;
            this.currentLine = this.commandHistory[this.historyIndex] || '';
        } else {
            this.historyIndex = this.commandHistory.length;
            this.currentLine = '';
        }
        this.updateInputDisplay();
    }
    
    handleCtrlC() {
        this.writeOutput('^C\n');
        this.currentLine = '';
        this.updatePrompt();
    }
    
    handleCharacter(char) {
        // Only printable characters
        if (char.charCodeAt(0) >= 32 && char.charCodeAt(0) <= 126) {
            this.currentLine += char;
            this.updateInputDisplay();
        }
    }
    
    updateInputDisplay() {
        if (this.engine === 'fallback' && this.fallbackLine) {
            // Remove cursor, update text, add cursor back
            const cursor = this.fallbackCursor;
            cursor.remove();
            this.fallbackLine.textContent = this.currentLine;
            this.fallbackLine.appendChild(cursor);
            this.scrollToBottom();
        }
    }
    
    updatePrompt() {
        if (this.engine === 'fallback' && this.fallbackPrompt) {
            const promptText = this.getPrompt();
            this.fallbackPrompt.innerHTML = '';
            if (promptText.includes('\x1b[')) {
                this.parseAnsiColors(promptText, this.fallbackPrompt);
            } else {
                this.fallbackPrompt.textContent = promptText;
            }
        }
    }
    
    getPrompt() {
        return `\x1b[32m${this.environment.USER}@aegisdesk\x1b[0m:\x1b[36m${this.currentDir}\x1b[0m$ `;
    }
    
    writePrompt() {
        const prompt = this.getPrompt();
        if (this.engine === 'xterm' && this.terminal) {
            this.terminal.write(prompt);
        } else if (this.engine === 'fallback') {
            this.updatePrompt();
        }
    }
    
    scrollToBottom() {
        if (this.container) {
            this.container.scrollTop = this.container.scrollHeight;
        }
    }
    
    // Unified API
    write(text) {
        if (this.engine === 'xterm' && this.terminal) {
            this.terminal.write(text);
        } else if (this.engine === 'fallback') {
            this.writeOutput(text);
        }
    }
    
    writeln(text) {
        this.write(text + '\n');
    }
    
    writeOutput(text) {
        if (this.engine === 'fallback') {
            // Parse ANSI colors (basic support)
            const lines = text.split('\n');
            lines.forEach((line, i) => {
                if (line) {
                    const div = document.createElement('div');
                    div.style.cssText = 'margin: 0; line-height: 1.5;';
                    
                    // Apply ANSI colors if present
                    if (line.includes('\x1b[')) {
                        this.parseAnsiColors(line, div);
                    } else {
                        div.textContent = line;
                    }
                    
                    this.fallbackContent.appendChild(div);
                }
                if (i < lines.length - 1 && text !== '\n') {
                    const br = document.createElement('br');
                    this.fallbackContent.appendChild(br);
                }
            });
            this.scrollToBottom();
        }
    }
    
    stripAnsi(text) {
        // Basic ANSI code removal
        return text.replace(/\x1b\[[0-9;]*m/g, '');
    }
    
    parseAnsiColors(text, element) {
        // Basic ANSI color parsing
        const codes = {
            '[32m': '#10b981', // Green
            '[31m': '#f48771', // Red
            '[33m': '#e5e510', // Yellow
            '[36m': '#11a8cd', // Cyan
            '[34m': '#2472c8', // Blue
            '[0m': 'inherit' // Reset
        };
        
        let cleanText = '';
        let currentColor = 'inherit';
        let i = 0;
        
        while (i < text.length) {
            if (text[i] === '\x1b' && text[i + 1] === '[') {
                // Find the end of the code
                let j = i + 2;
                while (j < text.length && text[j] !== 'm') j++;
                const code = text.substring(i + 1, j + 1);
                if (codes[code]) {
                    if (currentColor !== 'inherit') {
                        const span = document.createElement('span');
                        span.style.color = currentColor;
                        span.textContent = cleanText;
                        element.appendChild(span);
                        cleanText = '';
                    }
                    currentColor = codes[code];
                } else if (code === '[0m') {
                    if (cleanText) {
                        const span = document.createElement('span');
                        span.style.color = currentColor;
                        span.textContent = cleanText;
                        element.appendChild(span);
                        cleanText = '';
                    }
                    currentColor = 'inherit';
                }
                i = j + 1;
            } else {
                cleanText += text[i];
                i++;
            }
        }
        
        if (cleanText) {
            const span = document.createElement('span');
            if (currentColor !== 'inherit') {
                span.style.color = currentColor;
            }
            span.textContent = cleanText;
            element.appendChild(span);
        }
    }
    
    clear() {
        if (this.engine === 'xterm' && this.terminal) {
            this.terminal.clear();
        } else if (this.engine === 'fallback' && this.fallbackContent) {
            this.fallbackContent.innerHTML = '';
        }
    }
    
    focus() {
        if (this.engine === 'xterm' && this.terminal) {
            this.terminal.focus();
        } else if (this.engine === 'fallback' && this.container) {
            this.container.focus();
        }
    }
    
    onData(callback) {
        this.onDataCallback = callback;
    }
    
    onLine(callback) {
        this.onLineCallback = callback;
    }
    
    setHistory(history) {
        this.commandHistory = history || [];
    }
    
    getHistory() {
        return [...this.commandHistory];
    }
    
    setDirectory(dir) {
        this.currentDir = dir;
        this.updatePrompt();
    }
    
    getDirectory() {
        return this.currentDir;
    }
    
    setEnvironment(env) {
        this.environment = { ...this.environment, ...env };
        this.updatePrompt();
    }
    
    getEnvironment() {
        return { ...this.environment };
    }
    
    setTheme(themeName) {
        this.options.theme = themeName;
        if (this.engine === 'xterm' && this.terminal) {
            this.terminal.options.theme = this.getThemeConfig(themeName);
        } else if (this.engine === 'fallback') {
            const theme = this.getThemeConfig(themeName);
            if (this.container) {
                this.container.style.background = theme.background || '#1e1e1e';
                this.container.style.color = theme.foreground || '#d4d4d4';
            }
        }
    }
    
    getThemeConfig(themeName) {
        const themes = {
            'vs-code-dark': {
                background: '#1e1e1e',
                foreground: '#d4d4d4',
                cursor: '#aeafad',
                selection: '#264f78',
                black: '#000000', red: '#cd3131', green: '#0dbc79', yellow: '#e5e510',
                blue: '#2472c8', magenta: '#bc3fbc', cyan: '#11a8cd', white: '#e5e5e5'
            },
            'dracula': {
                background: '#282a36',
                foreground: '#f8f8f2',
                cursor: '#f8f8f0',
                selection: '#44475a',
                black: '#21222c', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
                blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2'
            },
            'nord': {
                background: '#2e3440',
                foreground: '#d8dee9',
                cursor: '#d8dee9',
                selection: '#434c5e',
                black: '#3b4252', red: '#bf616a', green: '#a3be8c', yellow: '#ebcb8b',
                blue: '#81a1c1', magenta: '#b48ead', cyan: '#88c0d0', white: '#e5e9f0'
            },
            'gruvbox': {
                background: '#282828',
                foreground: '#ebdbb2',
                cursor: '#ebdbb2',
                selection: '#458588',
                black: '#282828', red: '#cc241d', green: '#98971a', yellow: '#d79921',
                blue: '#458588', magenta: '#b16286', cyan: '#689d6a', white: '#a89984'
            },
            'one-dark': {
                background: '#282c34',
                foreground: '#abb2bf',
                cursor: '#528bff',
                selection: '#3e4451',
                black: '#282c34', red: '#e06c75', green: '#98c379', yellow: '#e5c07b',
                blue: '#61afef', magenta: '#c678dd', cyan: '#56b6c2', white: '#abb2bf'
            },
            'solarized-dark': {
                background: '#002b36',
                foreground: '#839496',
                cursor: '#93a1a1',
                selection: '#073642',
                black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
                blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5'
            },
            'matrix-green': {
                background: '#0a0a0a',
                foreground: '#00ff41',
                cursor: '#00ff41',
                selection: '#003300',
                black: '#0a0a0a', red: '#00ff41', green: '#00ff41', yellow: '#00ff41',
                blue: '#00ff41', magenta: '#00ff41', cyan: '#00ff41', white: '#00ff41'
            },
            'cyberpunk-neon': {
                background: '#0d0221',
                foreground: '#0ff',
                cursor: '#f0f',
                selection: '#ff00ff40',
                black: '#0d0221', red: '#ff2a6d', green: '#05d9e8', yellow: '#ffd300',
                blue: '#01cdfe', magenta: '#ff006e', cyan: '#05d9e8', white: '#d1f7ff'
            },
            'midnight-purple': {
                background: '#1a0a2e',
                foreground: '#e0d4f7',
                cursor: '#ad7bea',
                selection: '#4a2c6a',
                black: '#1a0a2e', red: '#ff6b9d', green: '#7bebb3', yellow: '#ffe66d',
                blue: '#7b68ee', magenta: '#ad7bea', cyan: '#7bebeb', white: '#e0d4f7'
            },
            'solar-gold': {
                background: '#1c1917',
                foreground: '#fcd34d',
                cursor: '#fbbf24',
                selection: '#78350f',
                black: '#1c1917', red: '#f87171', green: '#4ade80', yellow: '#fcd34d',
                blue: '#60a5fa', magenta: '#c084fc', cyan: '#22d3ee', white: '#fef3c7'
            },
            'retro-amber': {
                background: '#1e1e1e',
                foreground: '#ffb000',
                cursor: '#ffb000',
                selection: '#665200',
                black: '#1e1e1e', red: '#ff6b6b', green: '#69db7c', yellow: '#ffb000',
                blue: '#339af0', magenta: '#cc5de8', cyan: '#22b8cf', white: '#ffe066'
            },
            'oled-black': {
                background: '#000000',
                foreground: '#e0e0e0',
                cursor: '#ffffff',
                selection: '#333333',
                black: '#000000', red: '#ff5555', green: '#50fa7b', yellow: '#f1fa8c',
                blue: '#bd93f9', magenta: '#ff79c6', cyan: '#8be9fd', white: '#f8f8f2'
            }
        };
        return themes[themeName] || themes['vs-code-dark'];
    }
    
    getOptions() {
        return { ...this.options };
    }
    
    setOptions(opts) {
        Object.assign(this.options, opts);
        if (this.engine === 'xterm' && this.terminal) {
            if (opts.fontSize != null) this.terminal.options.fontSize = opts.fontSize;
            if (opts.fontFamily != null) this.terminal.options.fontFamily = opts.fontFamily;
            if (opts.cursorBlink != null) this.terminal.options.cursorBlink = opts.cursorBlink;
            if (opts.cursorStyle != null) this.terminal.options.cursorStyle = opts.cursorStyle === 'bar' ? 'bar' : opts.cursorStyle === 'underline' ? 'underline' : 'block';
            if (opts.scrollback != null) this.terminal.options.scrollback = Math.min(Math.max(opts.scrollback, 100), 10000);
            if (opts.theme != null) this.terminal.options.theme = this.getSafeThemeForXterm(opts.theme);
        }
    }
    
    searchFindNext(term, opts = {}) {
        if (this.searchAddon && this.engine === 'xterm') {
            try {
                return this.searchAddon.findNext(term, { ...opts, decorations: opts.decorations !== false });
            } catch (e) {
                return false;
            }
        }
        return false;
    }
    
    searchFindPrevious(term, opts = {}) {
        if (this.searchAddon && this.engine === 'xterm') {
            try {
                return this.searchAddon.findPrevious(term, { ...opts, decorations: opts.decorations !== false });
            } catch (e) {
                return false;
            }
        }
        return false;
    }
    
    searchClear() {
        if (this.searchAddon && typeof this.searchAddon.clearDecorations === 'function') {
            this.searchAddon.clearDecorations();
        }
    }
    
    getSelectionText() {
        if (this.engine === 'xterm' && this.terminal && typeof this.terminal.getSelection === 'function') {
            return this.terminal.getSelection() || '';
        }
        return '';
    }
    
    pasteText(text) {
        if (this.engine === 'xterm' && this.terminal) {
            this.terminal.write(text);
        } else if (this.engine === 'fallback' && text) {
            for (const char of text) this.handleCharacter(char);
        }
    }
    
    onReverseSearch(callback) {
        this.onReverseSearchCallback = callback;
    }
    
    onTabComplete(callback) {
        this.onTabCompleteCallback = callback;
    }
    
    setCurrentLine(line) {
        this.currentLine = line;
        if (this.engine === 'fallback') this.updateInputDisplay();
    }
    
    getCurrentLine() {
        return this.currentLine;
    }
    
    resize() {
        if (this.engine === 'xterm' && this.fitAddon) {
            try {
                this.fitAddon.fit();
            } catch (e) {
                // Silent fail
            }
        }
    }
    
    destroy() {
        if (this.engine === 'xterm' && this.terminal) {
            this.terminal.dispose();
        }
        this.container.innerHTML = '';
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TerminalEngine = TerminalEngine;
}
