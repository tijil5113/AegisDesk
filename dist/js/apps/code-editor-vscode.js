// VS Code-like Code Editor using Monaco Editor (Official VS Code Engine)
class VSCodeEditorApp {
    constructor() {
        this.windowId = 'code-editor';
        this.editor = null;
        this.editorWindow = null;
        this.files = storage.get('codeEditorFiles', []);
        this.currentFileId = null;
        this.openFileIds = storage.get('codeEditorOpenFiles', []);
        this.theme = storage.get('codeEditorTheme', 'vs-dark');
        this.isMonacoLoaded = false;
        this.monacoLoadPromise = null;
        
        // Load Monaco early
        this.ensureMonacoLoaded();
    }
    
    ensureMonacoLoaded() {
        if (this.monacoLoadPromise) {
            return this.monacoLoadPromise;
        }
        
        if (window.monaco) {
            this.isMonacoLoaded = true;
            return Promise.resolve();
        }
        
        this.monacoLoadPromise = new Promise((resolve, reject) => {
            // Use unpkg CDN (recommended by Monaco docs)
            const loaderScript = document.createElement('script');
            loaderScript.src = 'https://unpkg.com/monaco-editor@latest/min/vs/loader.js';
            loaderScript.onload = () => {
                if (!window.require) {
                    reject(new Error('Monaco loader failed'));
                    return;
                }
                
                window.require.config({ 
                    paths: { 
                        vs: 'https://unpkg.com/monaco-editor@latest/min/vs' 
                    } 
                });
                
                window.require(['vs/editor/editor.main'], () => {
                    console.log('✅ Monaco Editor loaded successfully');
                    this.isMonacoLoaded = true;
                    // Define default themes
                    this.defineCustomThemes();
                    resolve();
                }, (error) => {
                    console.error('❌ Monaco Editor load error:', error);
                    reject(error);
                });
            };
            
            loaderScript.onerror = () => {
                reject(new Error('Failed to load Monaco Editor script'));
            };
            
            document.head.appendChild(loaderScript);
        });
        
        return this.monacoLoadPromise;
    }
    
    defineCustomThemes() {
        if (!window.monaco) return;
        
        // Define custom themes
        window.monaco.editor.defineTheme('github-dark', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#0d1117',
                'editor.foreground': '#c9d1d9'
            }
        });
        
        window.monaco.editor.defineTheme('dracula', {
            base: 'vs-dark',
            inherit: true,
            rules: [],
            colors: {
                'editor.background': '#282a36',
                'editor.foreground': '#f8f8f2'
            }
        });
    }
    
    open() {
        const content = this.render();
        this.editorWindow = windowManager.createWindow(this.windowId, {
            title: 'Code Editor',
            width: 1200,
            height: 800,
            class: 'app-code-editor-vscode',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
            </svg>`,
            content: content
        });
        
        this.attachEvents(this.editorWindow);
        
        // Initialize Monaco after a short delay to ensure DOM is ready
        setTimeout(() => {
            this.initMonaco(this.editorWindow);
        }, 100);
    }
    
    render() {
        const tabsHTML = Array.from(this.openFileIds).map(fileId => {
            const file = this.files.find(f => f.id === fileId);
            if (!file) return '';
            const isActive = fileId === this.currentFileId;
            const isDirty = file.isDirty || false;
            return `
                <div class="editor-tab ${isActive ? 'active' : ''}" data-file-id="${fileId}">
                    <span class="tab-name">${this.escapeHtml(file.name)}</span>
                    ${isDirty ? '<span class="tab-dirty" title="Unsaved changes">●</span>' : ''}
                    <button class="tab-close" data-file-id="${fileId}" title="Close">×</button>
                </div>
            `;
        }).join('');
        
        return `
            <div class="vscode-editor-container">
                <div class="vscode-sidebar">
                    <div class="vscode-sidebar-header">
                        <button class="vscode-btn" id="new-file-btn" title="New File (Ctrl+N)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                        <button class="vscode-btn" id="open-file-btn" title="Open File (Ctrl+O)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"></path>
                                <polyline points="17 8 12 3 7 8"></polyline>
                                <line x1="12" y1="3" x2="12" y2="15"></line>
                            </svg>
                        </button>
                        <button class="vscode-btn" id="save-file-btn" title="Save (Ctrl+S)">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                        </button>
                    </div>
                    <div class="vscode-file-explorer">
                        <div class="explorer-header">EXPLORER</div>
                        <div class="file-list" id="file-list">
                            ${this.files.length > 0 ? this.files.map(file => `
                                <div class="file-item ${this.openFileIds.includes(file.id) ? 'open' : ''}" data-file-id="${file.id}">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path d="M13 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V9z"></path>
                                        <polyline points="13 2 13 9 20 9"></polyline>
                                    </svg>
                                    <span>${this.escapeHtml(file.name)}</span>
                                </div>
                            `).join('') : '<div class="file-empty">No files</div>'}
                        </div>
                    </div>
                </div>
                <div class="vscode-main">
                    <div class="vscode-tabs">
                        ${tabsHTML || '<div class="tab-empty">No files open</div>'}
                        <div class="tab-spacer"></div>
                    </div>
                    <div class="vscode-editor-wrapper">
                        <div id="monaco-editor-container" class="monaco-container"></div>
                        <div id="terminal-container" class="terminal-container" style="display: none;">
                            <div class="terminal-header">
                                <span>TERMINAL</span>
                                <button id="terminal-close" title="Close Terminal">×</button>
                            </div>
                            <div id="terminal-output" class="terminal-output"></div>
                            <div class="terminal-input-wrapper">
                                <span class="terminal-prompt">$</span>
                                <input type="text" id="terminal-input" class="terminal-input" placeholder="Enter command...">
                            </div>
                        </div>
                    </div>
                </div>
                <div id="command-palette" class="command-palette" style="display: none;">
                    <input type="text" id="command-input" class="command-input" placeholder="Type command name... (Ctrl+Shift+P to open)">
                    <div id="command-results" class="command-results"></div>
                </div>
            </div>
        `;
    }
    
    async initMonaco(window) {
        try {
            await this.ensureMonacoLoaded();
        } catch (error) {
            console.error('❌ Failed to load Monaco:', error);
            const container = window.querySelector('#monaco-editor-container');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #cccccc;">
                        <h3 style="color: #f48771; margin-bottom: 16px;">Failed to Load Monaco Editor</h3>
                        <p style="margin-bottom: 16px;">Please check your internet connection and refresh the page.</p>
                        <button onclick="location.reload()" style="padding: 8px 16px; background: #007acc; color: white; border: none; border-radius: 4px; cursor: pointer;">
                            Reload Page
                        </button>
                    </div>
                `;
            }
            return;
        }
        
        if (!window.monaco) {
            console.error('Monaco not available after load');
            return;
        }
        
        const container = window.querySelector('#monaco-editor-container');
        if (!container) {
            console.error('Monaco container not found');
            return;
        }
        
        // Destroy existing editor if any
        if (this.editor) {
            try {
                this.editor.dispose();
            } catch (e) {
                console.warn('Error disposing editor:', e);
            }
        }
        
        try {
            // Get OS zoom level for font size
            const zoomLevel = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16;
            const baseFontSize = 14;
            const fontSize = Math.max(10, Math.min(24, Math.round(baseFontSize * zoomLevel)));
            
            // Set theme
            window.monaco.editor.setTheme(this.theme);
            
            // Create editor with VS Code-like configuration
            this.editor = window.monaco.editor.create(container, {
                value: '',
                language: 'javascript',
                theme: this.theme,
                automaticLayout: true, // Critical for resizing
                fontSize: fontSize,
                fontFamily: "'JetBrains Mono', 'Consolas', 'Courier New', monospace",
                lineNumbers: 'on',
                roundedSelection: false,
                scrollBeyondLastLine: false,
                readOnly: false,
                minimap: { enabled: true, side: 'right' },
                wordWrap: 'on',
                wrappingIndent: 'indent',
                formatOnPaste: true,
                formatOnType: true,
                formatOnSave: true,
                suggestOnTriggerCharacters: true,
                acceptSuggestionOnEnter: 'on',
                tabCompletion: 'on',
                wordBasedSuggestions: 'allDocuments',
                multiCursorModifier: 'ctrlCmd',
                bracketPairColorization: { enabled: true },
                guides: {
                    bracketPairs: true,
                    indentation: true,
                    highlightActiveIndentation: true
                },
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderWhitespace: 'selection',
                renderLineHighlight: 'all',
                selectOnLineNumbers: true,
                glyphMargin: true,
                folding: true,
                unfoldOnClickAfterEndOfLine: true,
                foldingStrategy: 'auto',
                showFoldingControls: 'always',
                matchBrackets: 'always',
                autoIndent: 'full',
                tabSize: 4,
                insertSpaces: true,
                detectIndentation: true,
                trimAutoWhitespace: true,
                quickSuggestions: {
                    other: true,
                    comments: false,
                    strings: false
                },
                parameterHints: { enabled: true },
                hover: { enabled: true, delay: 300 },
                colorDecorators: true,
                codeLens: true,
                links: true
            });
            
            console.log('✅ Monaco Editor initialized');
            
            // Setup IntelliSense
            this.setupIntelliSense();
            
            // Load first file or create default
            if (this.openFileIds.length > 0) {
                const firstFileId = this.openFileIds[0];
                this.switchToFile(firstFileId, window);
            } else if (this.files.length > 0) {
                this.switchToFile(this.files[0].id, window);
            } else {
                // Create default file
                this.createDefaultFile(window);
            }
            
            // Setup change tracking
            this.setupChangeTracking(window);
            
            // Setup keyboard shortcuts
            this.setupKeyboardShortcuts(window);
            
        } catch (error) {
            console.error('❌ Failed to initialize Monaco Editor:', error);
            if (container) {
                container.innerHTML = `
                    <div style="padding: 40px; text-align: center; color: #cccccc;">
                        <h3 style="color: #f48771;">Editor Initialization Error</h3>
                        <p>${error.message}</p>
                    </div>
                `;
            }
        }
    }
    
    setupIntelliSense() {
        if (!window.monaco) return;
        
        try {
            // Configure JavaScript/TypeScript
            window.monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
                target: window.monaco.languages.typescript.ScriptTarget.ES2020,
                allowNonTsExtensions: true,
                moduleResolution: window.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                module: window.monaco.languages.typescript.ModuleKind.ESNext,
                noEmit: true,
                esModuleInterop: true,
                jsx: window.monaco.languages.typescript.JsxEmit.React,
                reactNamespace: "React",
                allowJs: true,
                checkJs: false,
                typeRoots: ["node_modules/@types"]
            });
            
            // Configure TypeScript
            window.monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
                target: window.monaco.languages.typescript.ScriptTarget.ES2020,
                allowNonTsExtensions: true,
                moduleResolution: window.monaco.languages.typescript.ModuleResolutionKind.NodeJs,
                module: window.monaco.languages.typescript.ModuleKind.ESNext,
                noEmit: true,
                esModuleInterop: true,
                jsx: window.monaco.languages.typescript.JsxEmit.React,
                reactNamespace: "React",
                typeRoots: ["node_modules/@types"]
            });
            
            // Add common type definitions
            const extraLibs = [
                {
                    filePath: 'lib.dom.d.ts',
                    content: `declare var console: { log(...args: any[]): void; error(...args: any[]): void; warn(...args: any[]): void; };`
                }
            ];
            
            window.monaco.languages.typescript.javascriptDefaults.setExtraLibs(extraLibs);
            window.monaco.languages.typescript.typescriptDefaults.setExtraLibs(extraLibs);
            
            console.log('✅ IntelliSense configured');
        } catch (error) {
            console.error('Failed to setup IntelliSense:', error);
        }
    }
    
    setupChangeTracking(window) {
        if (!this.editor) return;
        
        const model = this.editor.getModel();
        if (!model) return;
        
        // Track changes
        model.onDidChangeContent(() => {
            if (this.currentFileId) {
                const file = this.files.find(f => f.id === this.currentFileId);
                if (file) {
                    const newContent = this.editor.getValue();
                    if (newContent !== file.content) {
                        file.content = newContent;
                        file.isDirty = true;
                        this.saveFiles();
                        this.refreshTabs(window);
                    }
                }
            }
        });
    }
    
    setupKeyboardShortcuts(window) {
        if (!this.editor) return;
        
        // Global shortcuts (on window element)
        const handleKeyDown = (e) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const ctrlKey = isMac ? e.metaKey : e.ctrlKey;
            
            // Command Palette: Ctrl/Cmd + Shift + P
            if (ctrlKey && e.shiftKey && e.key === 'P') {
                e.preventDefault();
                this.showCommandPalette(window);
                return;
            }
            
            // Save: Ctrl/Cmd + S
            if (ctrlKey && e.key === 's') {
                e.preventDefault();
                this.saveCurrentFile(window);
                return;
            }
            
            // New File: Ctrl/Cmd + N
            if (ctrlKey && e.key === 'n' && !e.shiftKey) {
                e.preventDefault();
                this.createNewFile(window);
                return;
            }
            
            // Open File: Ctrl/Cmd + O
            if (ctrlKey && e.key === 'o' && !e.shiftKey) {
                e.preventDefault();
                this.openFileDialog(window);
                return;
            }
            
            // Toggle Terminal: Ctrl/Cmd + `
            if (ctrlKey && e.key === '`' || e.key === 'Backquote') {
                e.preventDefault();
                this.toggleTerminal(window);
                return;
            }
            
            // Editor shortcuts are handled by Monaco itself
        };
        
        // Attach to window element to catch all shortcuts
        if (this.editorWindow) {
            this.editorWindow.addEventListener('keydown', handleKeyDown, true);
        }
    }
    
    showCommandPalette(window) {
        const palette = window.querySelector('#command-palette');
        const input = window.querySelector('#command-input');
        const results = window.querySelector('#command-results');
        
        if (!palette || !input || !results) return;
        
        const commands = [
            { id: 'new-file', label: 'New File', action: () => this.createNewFile(window) },
            { id: 'open-file', label: 'Open File...', action: () => this.openFileDialog(window) },
            { id: 'save-file', label: 'Save', action: () => this.saveCurrentFile(window) },
            { id: 'format-document', label: 'Format Document', action: () => this.formatDocument() },
            { id: 'change-theme', label: 'Change Theme', action: () => this.showThemeSelector(window) },
            { id: 'change-language', label: 'Change Language Mode', action: () => this.showLanguageSelector(window) },
            { id: 'toggle-minimap', label: 'Toggle Minimap', action: () => this.toggleMinimap() },
            { id: 'toggle-terminal', label: 'Toggle Terminal', action: () => this.toggleTerminal(window) },
            { id: 'go-to-line', label: 'Go to Line...', action: () => this.goToLine() },
            { id: 'close-editor', label: 'Close Editor', action: () => this.closeFile(this.currentFileId, window) }
        ];
        
        palette.style.display = 'block';
        input.value = '';
        input.focus();
        
        const updateResults = (query) => {
            const filtered = commands.filter(cmd => 
                cmd.label.toLowerCase().includes(query.toLowerCase())
            );
            
            results.innerHTML = filtered.slice(0, 10).map(cmd => `
                <div class="command-item" data-command-id="${cmd.id}">
                    <span class="command-label">${cmd.label}</span>
                </div>
            `).join('');
            
            // Attach click handlers
            results.querySelectorAll('.command-item').forEach((item, index) => {
                if (index === 0) item.classList.add('selected');
                
                item.addEventListener('click', () => {
                    const cmd = commands.find(c => c.id === item.dataset.commandId);
                    if (cmd) {
                        palette.style.display = 'none';
                        cmd.action();
                    }
                });
            });
        };
        
        input.addEventListener('input', (e) => {
            updateResults(e.target.value);
        });
        
        input.addEventListener('keydown', (e) => {
            const items = results.querySelectorAll('.command-item');
            const selected = results.querySelector('.command-item.selected');
            let selectedIndex = Array.from(items).indexOf(selected);
            
            if (e.key === 'Escape') {
                palette.style.display = 'none';
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                items.forEach((item, i) => {
                    item.classList.toggle('selected', i === selectedIndex);
                });
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                items.forEach((item, i) => {
                    item.classList.toggle('selected', i === selectedIndex);
                });
            } else if (e.key === 'Enter') {
                e.preventDefault();
                if (selected) {
                    selected.click();
                }
            }
        });
        
        updateResults('');
    }
    
    createDefaultFile(window) {
        const file = {
            id: Date.now().toString(),
            name: 'untitled.js',
            content: '// Welcome to AegisDesk Code Editor\nconsole.log("Hello, World!");\n',
            language: 'javascript',
            isDirty: false
        };
        
        this.files.push(file);
        this.switchToFile(file.id, window);
        this.saveFiles();
    }
    
    createNewFile(window) {
        const name = prompt('Enter file name:', 'untitled.js');
        if (!name || !name.trim()) return;
        
        const file = {
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            name: name.trim(),
            content: '',
            language: this.detectLanguage(name.trim()),
            isDirty: false
        };
        
        this.files.push(file);
        this.switchToFile(file.id, window);
        this.saveFiles();
        this.refresh(window);
    }
    
    switchToFile(fileId, window) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        
        if (!this.openFileIds.includes(fileId)) {
            this.openFileIds.push(fileId);
        }
        
        this.currentFileId = fileId;
        
        if (this.editor && window.monaco) {
            const model = window.monaco.editor.createModel(
                file.content || '',
                file.language || 'plaintext'
            );
            
            this.editor.setModel(model);
            this.editor.focus();
        }
        
        this.refreshTabs(window);
    }
    
    openFileDialog(window) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js,.ts,.html,.css,.py,.java,.cpp,.c,.json,.md,.txt,.xml,.yaml,.yml';
        input.multiple = true;
        
        input.addEventListener('change', (e) => {
            Array.from(e.target.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const fileData = {
                        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
                        name: file.name,
                        content: event.target.result,
                        language: this.detectLanguage(file.name),
                        isDirty: false
                    };
                    
                    this.files.push(fileData);
                    this.switchToFile(fileData.id, window);
                    this.saveFiles();
                    this.refresh(window);
                };
                reader.readAsText(file);
            });
        });
        
        input.click();
    }
    
    saveCurrentFile(window) {
        if (!this.currentFileId || !this.editor) return;
        
        const file = this.files.find(f => f.id === this.currentFileId);
        if (!file) return;
        
        file.content = this.editor.getValue();
        file.isDirty = false;
        this.saveFiles();
        
        // Download file
        const blob = new Blob([file.content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.refreshTabs(window);
    }
    
    formatDocument() {
        if (!this.editor) return;
        
        this.editor.getAction('editor.action.formatDocument').run().catch(err => {
            console.warn('Format document not available for this language');
        });
    }
    
    toggleMinimap() {
        if (!this.editor || !window.monaco) return;
        
        const options = this.editor.getOption(window.monaco.editor.EditorOption.minimap);
        this.editor.updateOptions({
            minimap: { enabled: !options.enabled }
        });
    }
    
    toggleTerminal(window) {
        const terminal = window.querySelector('#terminal-container');
        if (!terminal) return;
        
        const isVisible = terminal.style.display !== 'none';
        terminal.style.display = isVisible ? 'none' : 'flex';
        
        if (!isVisible) {
            const input = window.querySelector('#terminal-input');
            if (input) setTimeout(() => input.focus(), 100);
        } else {
            // Resize editor when terminal hides
            if (this.editor) {
                setTimeout(() => this.editor.layout(), 100);
            }
        }
    }
    
    goToLine() {
        if (!this.editor) return;
        
        const line = prompt('Go to line:');
        if (line) {
            const lineNum = parseInt(line);
            if (!isNaN(lineNum) && lineNum > 0) {
                this.editor.setPosition({ lineNumber: lineNum, column: 1 });
                this.editor.revealLineInCenter(lineNum);
                this.editor.focus();
            }
        }
    }
    
    showThemeSelector(window) {
        const themes = [
            { id: 'vs', name: 'Light+' },
            { id: 'vs-dark', name: 'Dark+' },
            { id: 'hc-black', name: 'High Contrast Dark' },
            { id: 'hc-light', name: 'High Contrast Light' },
            { id: 'github-dark', name: 'GitHub Dark' },
            { id: 'dracula', name: 'Dracula' }
        ];
        
        const themeList = themes.map((t, i) => `${i + 1}. ${t.name}`).join('\n');
        const selection = prompt(`Select theme:\n\n${themeList}`);
        if (selection) {
            const index = parseInt(selection) - 1;
            if (index >= 0 && index < themes.length) {
                this.setTheme(themes[index].id, window);
            }
        }
    }
    
    setTheme(themeId, window) {
        this.theme = themeId;
        storage.set('codeEditorTheme', themeId);
        if (this.editor && window.monaco) {
            window.monaco.editor.setTheme(themeId);
        }
    }
    
    showLanguageSelector(window) {
        if (!this.editor || !this.currentFileId) return;
        
        const languages = [
            'javascript', 'typescript', 'python', 'java', 'cpp', 'c',
            'html', 'css', 'json', 'markdown', 'xml', 'yaml', 'plaintext'
        ];
        
        const langList = languages.map((l, i) => `${i + 1}. ${l}`).join('\n');
        const selection = prompt(`Select language:\n\n${langList}`);
        if (selection) {
            const index = parseInt(selection) - 1;
            if (index >= 0 && index < languages.length) {
                const file = this.files.find(f => f.id === this.currentFileId);
                if (file && window.monaco) {
                    file.language = languages[index];
                    window.monaco.editor.setModelLanguage(this.editor.getModel(), languages[index]);
                }
            }
        }
    }
    
    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            'js': 'javascript', 'jsx': 'javascript',
            'ts': 'typescript', 'tsx': 'typescript',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp', 'cc': 'cpp', 'cxx': 'cpp',
            'c': 'c',
            'html': 'html', 'htm': 'html',
            'css': 'css', 'scss': 'css', 'sass': 'css',
            'json': 'json',
            'md': 'markdown',
            'xml': 'xml',
            'yaml': 'yaml', 'yml': 'yaml',
            'txt': 'plaintext'
        };
        return map[ext] || 'plaintext';
    }
    
    refreshTabs(window) {
        const tabsContainer = window.querySelector('.vscode-tabs');
        if (!tabsContainer) return;
        
        const tabsHTML = Array.from(this.openFileIds).map(fileId => {
            const file = this.files.find(f => f.id === fileId);
            if (!file) return '';
            const isActive = fileId === this.currentFileId;
            const isDirty = file.isDirty || false;
            return `
                <div class="editor-tab ${isActive ? 'active' : ''}" data-file-id="${fileId}">
                    <span class="tab-name">${this.escapeHtml(file.name)}</span>
                    ${isDirty ? '<span class="tab-dirty" title="Unsaved changes">●</span>' : ''}
                    <button class="tab-close" data-file-id="${fileId}" title="Close">×</button>
                </div>
            `;
        }).join('');
        
        tabsContainer.innerHTML = tabsHTML + '<div class="tab-spacer"></div>';
        this.attachTabEvents(window);
    }
    
    closeFile(fileId, window) {
        if (!fileId) return;
        
        const file = this.files.find(f => f.id === fileId);
        if (file && file.isDirty) {
            if (!confirm(`File "${file.name}" has unsaved changes. Close anyway?`)) {
                return;
            }
        }
        
        this.openFileIds = this.openFileIds.filter(id => id !== fileId);
        storage.set('codeEditorOpenFiles', this.openFileIds);
        
        if (this.currentFileId === fileId) {
            const nextFileId = this.openFileIds[0];
            if (nextFileId) {
                this.switchToFile(nextFileId, window);
            } else {
                this.currentFileId = null;
                if (this.editor) {
                    const emptyModel = window.monaco?.editor.createModel('', 'plaintext');
                    if (emptyModel) {
                        this.editor.setModel(emptyModel);
                    }
                }
            }
        }
        
        this.refreshTabs(window);
    }
    
    attachEvents(window) {
        window.querySelector('#new-file-btn')?.addEventListener('click', () => this.createNewFile(window));
        window.querySelector('#open-file-btn')?.addEventListener('click', () => this.openFileDialog(window));
        window.querySelector('#save-file-btn')?.addEventListener('click', () => this.saveCurrentFile(window));
        
        window.querySelector('#terminal-close')?.addEventListener('click', () => this.toggleTerminal(window));
        window.querySelector('#terminal-input')?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                this.executeTerminalCommand(e.target.value, window);
                e.target.value = '';
            }
        });
        
        window.querySelectorAll('.file-item').forEach(item => {
            item.addEventListener('click', () => {
                const fileId = item.dataset.fileId;
                if (fileId) this.switchToFile(fileId, window);
            });
        });
        
        this.attachTabEvents(window);
        
        // Window resize handler
        const resizeObserver = new ResizeObserver(() => {
            if (this.editor) {
                setTimeout(() => this.editor.layout(), 50);
            }
        });
        
        const container = window.querySelector('#monaco-editor-container');
        if (container) {
            resizeObserver.observe(container);
        }
    }
    
    attachTabEvents(window) {
        window.querySelectorAll('.editor-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('tab-close')) return;
                const fileId = tab.dataset.fileId;
                if (fileId) this.switchToFile(fileId, window);
            });
        });
        
        window.querySelectorAll('.tab-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const fileId = btn.dataset.fileId;
                this.closeFile(fileId, window);
            });
        });
    }
    
    executeTerminalCommand(command, window) {
        const output = window.querySelector('#terminal-output');
        if (!output) return;
        
        const line = document.createElement('div');
        line.className = 'terminal-line';
        line.textContent = `$ ${command}`;
        output.appendChild(line);
        
        // Simple command execution
        if (command.trim().startsWith('node') || command.trim().startsWith('js')) {
            try {
                const code = this.editor?.getValue() || '';
                const result = eval(code);
                const resultLine = document.createElement('div');
                resultLine.className = 'terminal-output-line';
                resultLine.textContent = String(result);
                output.appendChild(resultLine);
            } catch (e) {
                const errorLine = document.createElement('div');
                errorLine.className = 'terminal-error-line';
                errorLine.textContent = `Error: ${e.message}`;
                output.appendChild(errorLine);
            }
        } else {
            const resultLine = document.createElement('div');
            resultLine.className = 'terminal-output-line';
            resultLine.textContent = `Command not found: ${command}`;
            output.appendChild(resultLine);
        }
        
        output.scrollTop = output.scrollHeight;
    }
    
    refresh(window) {
        const content = window.querySelector('.window-content');
        if (content) {
            content.innerHTML = this.render();
            this.attachEvents(window);
            setTimeout(() => {
                if (!this.editor) {
                    this.initMonaco(window);
                }
            }, 100);
        }
    }
    
    saveFiles() {
        storage.set('codeEditorFiles', this.files);
        storage.set('codeEditorOpenFiles', this.openFileIds);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Create and export instance
const codeEditorApp = new VSCodeEditorApp();
window.codeEditorApp = codeEditorApp;
