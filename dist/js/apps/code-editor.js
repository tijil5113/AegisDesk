// Code Editor App - Advanced code editor with syntax highlighting
class CodeEditorApp {
    constructor() {
        this.windowId = 'code-editor';
        this.files = storage.get('codeEditorFiles', []);
        this.currentFile = null;
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Code Editor',
            width: 1000,
            height: 700,
            class: 'app-code-editor',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 18 22 12 16 6"></polyline>
                <polyline points="8 6 2 12 8 18"></polyline>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
        this.initEditor(window);
    }

    render() {
        const filesHTML = this.files.length > 0 ? this.files.map((file, index) => `
            <div class="code-file-item ${this.currentFile === index ? 'active' : ''}" data-index="${index}">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path>
                    <path d="M14 2v6h6"></path>
                </svg>
                <span>${this.escapeHtml(file.name)}</span>
            </div>
        `).join('') : '<div class="code-empty-sidebar">No files open</div>';

        return `
            <div class="code-editor-container">
                <div class="code-editor-sidebar">
                    <div class="code-editor-toolbar">
                        <button class="code-btn" id="new-file">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                            New
                        </button>
                        <button class="code-btn" id="open-file">Open</button>
                        <button class="code-btn" id="save-file">Save</button>
                    </div>
                    <div class="code-files-list">
                        ${filesHTML}
                    </div>
                </div>
                <div class="code-editor-main">
                    <div class="code-editor-header">
                        <div class="code-file-tabs"></div>
                        <div class="code-editor-actions">
                            <select id="language-select" class="code-select">
                                <option value="javascript">JavaScript</option>
                                <option value="html">HTML</option>
                                <option value="css">CSS</option>
                                <option value="python">Python</option>
                                <option value="java">Java</option>
                                <option value="cpp">C++</option>
                                <option value="plaintext">Plain Text</option>
                            </select>
                        </div>
                    </div>
                    <div class="code-editor-content">
                        <textarea id="code-editor-textarea" class="code-textarea" placeholder="Start coding..."></textarea>
                        <div id="code-editor-lines" class="code-line-numbers">1</div>
                    </div>
                </div>
            </div>
        `;
    }

    initEditor(window) {
        const textarea = window.querySelector('#code-editor-textarea');
        const lineNumbers = window.querySelector('#code-editor-lines');
        
        if (!textarea || !lineNumbers) return;

        // Update line numbers
        const updateLines = () => {
            const lines = textarea.value.split('\n').length;
            lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
        };

        textarea.addEventListener('input', updateLines);
        textarea.addEventListener('scroll', () => {
            lineNumbers.scrollTop = textarea.scrollTop;
        });

        // Basic syntax highlighting (simplified)
        textarea.addEventListener('input', () => {
            // For now, just keep it simple
            // In a real implementation, you'd use a library like CodeMirror or Monaco
        });
    }

    attachEvents(window) {
        const newFileBtn = window.querySelector('#new-file');
        const openFileBtn = window.querySelector('#open-file');
        const saveFileBtn = window.querySelector('#save-file');
        const textarea = window.querySelector('#code-editor-textarea');
        const languageSelect = window.querySelector('#language-select');

        if (newFileBtn) {
            newFileBtn.addEventListener('click', () => {
                this.createNewFile(window);
            });
        }

        if (openFileBtn) {
            openFileBtn.addEventListener('click', () => {
                this.openFile(window);
            });
        }

        if (saveFileBtn) {
            saveFileBtn.addEventListener('click', () => {
                this.saveFile(window);
            });
        }

        if (languageSelect) {
            languageSelect.addEventListener('change', () => {
                // Language changed - could apply syntax highlighting
                console.log('Language changed to:', languageSelect.value);
            });
        }

        // File list click
        const filesList = window.querySelector('.code-files-list');
        if (filesList) {
            filesList.addEventListener('click', (e) => {
                const fileItem = e.target.closest('.code-file-item');
                if (fileItem) {
                    const index = parseInt(fileItem.dataset.index);
                    this.switchFile(index, window);
                }
            });
        }

        // Keyboard shortcuts
        if (textarea) {
            textarea.addEventListener('keydown', (e) => {
                if (e.ctrlKey || e.metaKey) {
                    if (e.key === 's') {
                        e.preventDefault();
                        this.saveFile(window);
                    } else if (e.key === 'o') {
                        e.preventDefault();
                        this.openFile(window);
                    } else if (e.key === 'n') {
                        e.preventDefault();
                        this.createNewFile(window);
                    }
                }
            });
        }
    }

    createNewFile(window) {
        const name = prompt('Enter file name:', 'untitled.js');
        if (!name || !name.trim()) return;

        const file = {
            name: name.trim(),
            content: '',
            language: 'javascript',
            id: Date.now().toString()
        };

        this.files.push(file);
        this.currentFile = this.files.length - 1;
        this.save();
        this.refresh(window);
        
        const textarea = window.querySelector('#code-editor-textarea');
        if (textarea) textarea.focus();
    }

    openFile(window) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.js,.html,.css,.py,.java,.cpp,.txt';

        input.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target.result;
                const fileData = {
                    name: file.name,
                    content: content,
                    language: this.detectLanguage(file.name),
                    id: Date.now().toString()
                };

                this.files.push(fileData);
                this.currentFile = this.files.length - 1;
                this.save();
                this.refresh(window);
                this.loadFileContent(window);
            };
            reader.readAsText(file);
        });

        input.click();
    }

    saveFile(window) {
        if (this.currentFile === null || !this.files[this.currentFile]) {
            this.createNewFile(window);
            return;
        }

        const textarea = window.querySelector('#code-editor-textarea');
        if (textarea) {
            this.files[this.currentFile].content = textarea.value;
            this.save();
            
            // Download file
            const file = this.files[this.currentFile];
            const blob = new Blob([file.content], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = file.name;
            a.click();
            URL.revokeObjectURL(url);
        }
    }

    switchFile(index, window) {
        if (index >= 0 && index < this.files.length) {
            this.currentFile = index;
            this.refresh(window);
            this.loadFileContent(window);
        }
    }

    loadFileContent(window) {
        if (this.currentFile !== null && this.files[this.currentFile]) {
            const file = this.files[this.currentFile];
            const textarea = window.querySelector('#code-editor-textarea');
            const languageSelect = window.querySelector('#language-select');
            
            if (textarea) {
                textarea.value = file.content;
                const updateLines = () => {
                    const lines = textarea.value.split('\n').length;
                    const lineNumbers = window.querySelector('#code-editor-lines');
                    if (lineNumbers) {
                        lineNumbers.innerHTML = Array.from({ length: lines }, (_, i) => i + 1).join('<br>');
                    }
                };
                updateLines();
            }
            
            if (languageSelect) {
                languageSelect.value = file.language || 'javascript';
            }
        }
    }

    detectLanguage(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        const map = {
            'js': 'javascript',
            'html': 'html',
            'css': 'css',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'txt': 'plaintext'
        };
        return map[ext] || 'plaintext';
    }

    refresh(window) {
        const content = window.querySelector('.window-content');
        content.innerHTML = this.render();
        this.attachEvents(window);
        this.initEditor(window);
        if (this.currentFile !== null) {
            this.loadFileContent(window);
        }
    }

    save() {
        storage.set('codeEditorFiles', this.files);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const codeEditorApp = new CodeEditorApp();
