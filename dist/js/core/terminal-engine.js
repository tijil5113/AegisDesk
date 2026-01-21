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
            ...options
        };
        
        this.engine = null; // 'xterm' or 'fallback'
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
    }
    
    initXtermEngine() {
        this.engine = 'xterm';
        this.terminal = new window.Terminal({
            cursorBlink: this.options.cursorBlink,
            cursorStyle: this.options.cursorStyle,
            fontFamily: this.options.fontFamily,
            fontSize: this.options.fontSize,
            theme: this.getThemeConfig(this.options.theme),
            allowProposedApi: true,
            scrollback: this.options.scrollback,
            tabStopWidth: 4
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
                black: '#000000',
                red: '#cd3131',
                green: '#0dbc79',
                yellow: '#e5e510',
                blue: '#2472c8',
                magenta: '#bc3fbc',
                cyan: '#11a8cd',
                white: '#e5e5e5'
            },
            'dracula': {
                background: '#282a36',
                foreground: '#f8f8f2',
                cursor: '#f8f8f0',
                selection: '#44475a'
            },
            'one-dark': {
                background: '#282c34',
                foreground: '#abb2bf',
                cursor: '#528bff'
            },
            'solarized-dark': {
                background: '#002b36',
                foreground: '#839496',
                cursor: '#93a1a1'
            },
            'matrix-green': {
                background: '#000000',
                foreground: '#00ff00',
                cursor: '#00ff00'
            },
            'retro-amber': {
                background: '#1e1e1e',
                foreground: '#ffb000',
                cursor: '#ffb000'
            }
        };
        
        return themes[themeName] || themes['vs-code-dark'];
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
