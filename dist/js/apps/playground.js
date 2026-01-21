// Code Playground App - HTML/CSS/JS playground
class PlaygroundApp {
    constructor() {
        this.windowId = 'playground';
        this.html = '<h1>Hello World!</h1>\n<p>Edit me to see live changes.</p>';
        this.css = 'body { font-family: Arial; padding: 20px; background: #f0f0f0; }';
        this.js = 'console.log("Hello from playground!");';
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Code Playground',
            width: 1200,
            height: 800,
            class: 'app-playground',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="9" y1="3" x2="9" y2="21"></line>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
        this.updatePreview(window);
    }

    render() {
        return `
            <div class="playground-container">
                <div class="playground-toolbar">
                    <div class="playground-tabs">
                        <button class="playground-tab active" data-tab="html">HTML</button>
                        <button class="playground-tab" data-tab="css">CSS</button>
                        <button class="playground-tab" data-tab="js">JavaScript</button>
                        <button class="playground-tab" data-tab="preview">Preview</button>
                    </div>
                    <div class="playground-actions">
                        <button class="playground-btn" id="clear-btn">Clear</button>
                        <button class="playground-btn" id="run-btn">Run</button>
                        <button class="playground-btn" id="save-btn">Save</button>
                    </div>
                </div>
                <div class="playground-content">
                    <div class="playground-editor-panel active" data-panel="html">
                        <textarea id="html-editor" class="playground-editor" placeholder="Enter HTML here...">${this.escapeHtml(this.html)}</textarea>
                    </div>
                    <div class="playground-editor-panel" data-panel="css">
                        <textarea id="css-editor" class="playground-editor" placeholder="Enter CSS here...">${this.escapeHtml(this.css)}</textarea>
                    </div>
                    <div class="playground-editor-panel" data-panel="js">
                        <textarea id="js-editor" class="playground-editor" placeholder="Enter JavaScript here...">${this.escapeHtml(this.js)}</textarea>
                    </div>
                    <div class="playground-editor-panel" data-panel="preview">
                        <iframe id="playground-preview" class="playground-preview" sandbox="allow-scripts allow-same-origin"></iframe>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const tabs = window.querySelectorAll('.playground-tab');
        const htmlEditor = window.querySelector('#html-editor');
        const cssEditor = window.querySelector('#css-editor');
        const jsEditor = window.querySelector('#js-editor');
        const runBtn = window.querySelector('#run-btn');
        const clearBtn = window.querySelector('#clear-btn');
        const saveBtn = window.querySelector('#save-btn');

        // Tab switching
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');

                const panels = window.querySelectorAll('.playground-editor-panel');
                panels.forEach(p => p.classList.remove('active'));
                const activePanel = window.querySelector(`[data-panel="${tabName}"]`);
                if (activePanel) activePanel.classList.add('active');

                // Update preview when switching to it
                if (tabName === 'preview') {
                    this.updatePreview(window);
                }
            });
        });

        // Auto-update on input
        [htmlEditor, cssEditor, jsEditor].forEach(editor => {
            if (editor) {
                editor.addEventListener('input', () => {
                    this.html = htmlEditor?.value || '';
                    this.css = cssEditor?.value || '';
                    this.js = jsEditor?.value || '';
                    // Auto-update preview if visible
                    const previewTab = window.querySelector('[data-tab="preview"]');
                    if (previewTab?.classList.contains('active')) {
                        this.updatePreview(window);
                    }
                });
            }
        });

        if (runBtn) {
            runBtn.addEventListener('click', () => {
                this.updatePreview(window);
            });
        }

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear all code?')) {
                    if (htmlEditor) htmlEditor.value = '';
                    if (cssEditor) cssEditor.value = '';
                    if (jsEditor) jsEditor.value = '';
                    this.html = '';
                    this.css = '';
                    this.js = '';
                    this.updatePreview(window);
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.saveCode(window);
            });
        }
    }

    updatePreview(window) {
        const htmlEditor = window.querySelector('#html-editor');
        const cssEditor = window.querySelector('#css-editor');
        const jsEditor = window.querySelector('#js-editor');
        const preview = window.querySelector('#playground-preview');

        if (!preview) return;

        const html = htmlEditor?.value || this.html || '';
        const css = cssEditor?.value || this.css || '';
        const js = jsEditor?.value || this.js || '';

        const fullHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>${js}</script>
            </body>
            </html>
        `;

        const blob = new Blob([fullHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        preview.src = url;
    }

    saveCode(window) {
        const htmlEditor = window.querySelector('#html-editor');
        const cssEditor = window.querySelector('#css-editor');
        const jsEditor = window.querySelector('#js-editor');

        const html = htmlEditor?.value || '';
        const css = cssEditor?.value || '';
        const js = jsEditor?.value || '';

        const fullHTML = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>${css}</style>
            </head>
            <body>
                ${html}
                <script>${js}</script>
            </body>
            </html>
        `;

        const blob = new Blob([fullHTML], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `playground-${Date.now()}.html`;
        a.click();
        URL.revokeObjectURL(url);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const playgroundApp = new PlaygroundApp();
