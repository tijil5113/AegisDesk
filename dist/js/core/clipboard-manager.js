// Advanced Clipboard Manager
class ClipboardManager {
    constructor() {
        this.history = [];
        this.maxHistory = 50;
        this.currentClipboard = '';
        this.init();
    }

    async init() {
        // Load history from storage
        const saved = storage.get('clipboardHistory', []);
        this.history = saved.slice(0, this.maxHistory);

        // Monitor clipboard changes
        this.setupClipboardMonitoring();

        // Setup keyboard shortcuts
        this.setupShortcuts();
    }

    async setupClipboardMonitoring() {
        // Monitor paste events
        document.addEventListener('paste', async (e) => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && text !== this.currentClipboard) {
                    this.addToHistory(text);
                }
            } catch (err) {
                // Clipboard API might not be available
                console.log('Clipboard monitoring not available');
            }
        });
    }

    addToHistory(text) {
        if (!text || text.trim() === '') return;

        // Remove duplicates
        this.history = this.history.filter(item => item !== text);
        
        // Add to beginning
        this.history.unshift(text);
        
        // Limit history
        if (this.history.length > this.maxHistory) {
            this.history = this.history.slice(0, this.maxHistory);
        }

        // Save to storage
        storage.set('clipboardHistory', this.history);
        this.currentClipboard = text;

        // Dispatch event
        document.dispatchEvent(new CustomEvent('clipboardchange', { 
            detail: { text, history: this.history } 
        }));
    }

    async copy(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.addToHistory(text);
            return true;
        } catch (err) {
            // Fallback for older browsers
            const textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                this.addToHistory(text);
                return true;
            } catch (e) {
                return false;
            } finally {
                document.body.removeChild(textarea);
            }
        }
    }

    async paste() {
        try {
            const text = await navigator.clipboard.readText();
            return text;
        } catch (err) {
            return '';
        }
    }

    getHistory() {
        return [...this.history];
    }

    clearHistory() {
        this.history = [];
        this.currentClipboard = '';
        storage.set('clipboardHistory', []);
        document.dispatchEvent(new CustomEvent('clipboardchange', { 
            detail: { text: '', history: [] } 
        }));
    }

    setupShortcuts() {
        // Ctrl+Shift+V for clipboard history
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.shiftKey && e.key === 'V') {
                e.preventDefault();
                this.showHistory();
            }
        });
    }

    showHistory() {
        // This will be integrated with a UI component
        if (typeof windowManager !== 'undefined') {
            windowManager.createWindow('clipboard-history', {
                title: 'Clipboard History',
                width: 500,
                height: 600,
                content: this.buildHistoryUI()
            });
        }
    }

    buildHistoryUI() {
        if (this.history.length === 0) {
            return '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No clipboard history</div>';
        }

        const items = this.history.map((item, index) => `
            <div class="clipboard-item" data-index="${index}" style="
                padding: 12px;
                margin: 8px 0;
                background: var(--bg-card);
                border-radius: 8px;
                cursor: pointer;
                transition: all 0.2s;
                border: 1px solid var(--border);
            ">
                <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 4px;">
                    ${this.truncate(item, 100)}
                </div>
            </div>
        `).join('');

        return `
            <div style="padding: 16px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
                    <h3 style="margin: 0;">Clipboard History</h3>
                    <button id="clear-clipboard" style="
                        padding: 6px 12px;
                        background: var(--accent);
                        border: none;
                        border-radius: 6px;
                        color: white;
                        cursor: pointer;
                    ">Clear</button>
                </div>
                <div style="max-height: 500px; overflow-y: auto;">
                    ${items}
                </div>
            </div>
        `;
    }

    truncate(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
}

// Initialize globally
const clipboardManager = new ClipboardManager();
