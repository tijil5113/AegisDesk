// Browser App
class BrowserApp {
    constructor() {
        this.windowId = 'browser';
        this.customApps = storage.get('customApps', [
            { name: 'Google', url: 'https://www.google.com', icon: '🌐' },
            { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' }
        ]);
    }

    open(url = null, title = 'Browser') {
        const targetUrl = url || 'https://www.google.com';
        // Create unique window ID for each browser instance
        let windowId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // For specific searches or URLs, use a more descriptive ID
        if (targetUrl.includes('google.com/search')) {
            windowId = `browser_search_${Date.now()}`;
        } else if (targetUrl.includes('youtube.com')) {
            windowId = `browser_youtube_${Date.now()}`;
        } else if (targetUrl.includes('google.com')) {
            windowId = `browser_google_${Date.now()}`;
        }
        
        console.log('Opening browser with URL:', targetUrl, 'Window ID:', windowId);
        
        const content = this.render(targetUrl);
        const window = windowManager.createWindow(windowId, {
            title: title,
            width: 1000,
            height: 700,
            class: 'app-browser',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
            </svg>`,
            content: content,
            url: targetUrl
        });

        this.attachEvents(window, targetUrl);
        
        // Focus the window
        if (window) {
            windowManager.focusWindow(window);
        }
    }

    render(url) {
        // Always use iframe for external sites - it will work for most sites
        const isExternal = url.startsWith('http://') || url.startsWith('https://');
        
        // Normalize URL
        let normalizedUrl = url;
        if (!isExternal && !url.startsWith('file://')) {
            normalizedUrl = 'https://' + url;
        }
        
        return `
            <div class="browser-container">
                <div class="browser-toolbar">
                    <button class="browser-nav-btn" id="browser-back" title="Back">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                    </button>
                    <button class="browser-nav-btn" id="browser-forward" title="Forward">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    <button class="browser-nav-btn" id="browser-refresh" title="Refresh">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="23 4 23 10 17 10"></polyline>
                            <polyline points="1 20 1 14 7 14"></polyline>
                            <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path>
                        </svg>
                    </button>
                    <input type="text" class="browser-url-bar" id="browser-url" value="${this.escapeHtml(normalizedUrl)}" placeholder="Enter URL or search...">
                    <button class="browser-nav-btn" id="browser-go" title="Go">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                    </button>
                    <button class="browser-nav-btn" id="browser-open-new" title="Open in New Tab">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"></path>
                            <polyline points="15 3 21 3 21 9"></polyline>
                            <line x1="10" y1="14" x2="21" y2="3"></line>
                        </svg>
                    </button>
                </div>
                <iframe class="browser-content" id="browser-content" src="${this.escapeHtml(normalizedUrl)}" sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"></iframe>
            </div>
        `;
    }
    }
    
    getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (e) {
            return url;
        }
    }

    attachEvents(window, initialUrl) {
        const content = window.querySelector('.window-content');
        const urlBar = content.querySelector('#browser-url');
        const iframe = content.querySelector('#browser-content');
        const backBtn = content.querySelector('#browser-back');
        const forwardBtn = content.querySelector('#browser-forward');
        const refreshBtn = content.querySelector('#browser-refresh');
        const goBtn = content.querySelector('#browser-go');
        const openNewBtn = content.querySelector('#browser-open-new');

        // Normalize initial URL
        let currentUrl = initialUrl;
        if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://') && !currentUrl.startsWith('file://')) {
            currentUrl = 'https://' + currentUrl;
        }

        let history = [currentUrl];
        let historyIndex = 0;

        // Navigate function
        const navigate = (url) => {
            // Check if it's a search query (no dots, has spaces, or doesn't look like URL)
            if (!url.includes('.') && (url.includes(' ') || !url.match(/^[a-zA-Z0-9-]+\./))) {
                // It's a search query - use Google search
                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
                // Add https:// if missing
                url = 'https://' + url;
            }
            
            if (iframe) {
                iframe.src = url;
            }
            if (urlBar) {
                urlBar.value = url;
            }
            history = history.slice(0, historyIndex + 1);
            history.push(url);
            historyIndex++;
            updateButtons();
        };

        // Update button states
        const updateButtons = () => {
            if (backBtn) backBtn.disabled = historyIndex <= 0;
            if (forwardBtn) forwardBtn.disabled = historyIndex >= history.length - 1;
        };

        // URL bar navigation
        if (urlBar) {
            urlBar.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    navigate(urlBar.value.trim());
                }
            });
        }

        // Go button
        if (goBtn) {
            goBtn.addEventListener('click', () => {
                if (urlBar) {
                    navigate(urlBar.value.trim());
                }
            });
        }

        // Navigation buttons
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (historyIndex > 0 && iframe) {
                    historyIndex--;
                    const url = history[historyIndex];
                    iframe.src = url;
                    if (urlBar) urlBar.value = url;
                    updateButtons();
                }
            });
        }

        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => {
                if (historyIndex < history.length - 1 && iframe) {
                    historyIndex++;
                    const url = history[historyIndex];
                    iframe.src = url;
                    if (urlBar) urlBar.value = url;
                    updateButtons();
                }
            });
        }

        if (refreshBtn && iframe) {
            refreshBtn.addEventListener('click', () => {
                iframe.src = iframe.src;
            });
        }

        // Open in new tab
        if (openNewBtn) {
            openNewBtn.addEventListener('click', () => {
                const url = urlBar ? urlBar.value : currentUrl;
                try {
                    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                    if (!newWindow) {
                        // Popup blocked - copy URL to clipboard
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(url).then(() => {
                                alert('URL copied to clipboard: ' + url);
                            });
                        } else {
                            alert('Please enable popups or copy this URL: ' + url);
                        }
                    }
                } catch (error) {
                    console.error('Error opening URL:', error);
                }
            });
        }

        // Update URL bar when iframe navigates (if possible)
        if (iframe) {
            iframe.addEventListener('load', () => {
                try {
                    if (urlBar && iframe.contentWindow && iframe.contentWindow.location) {
                        const newUrl = iframe.contentWindow.location.href;
                        if (newUrl && newUrl !== 'about:blank') {
                            urlBar.value = newUrl;
                            // Update history if needed
                            if (history[historyIndex] !== newUrl) {
                                history = history.slice(0, historyIndex + 1);
                                history.push(newUrl);
                                historyIndex++;
                                updateButtons();
                            }
                            
                            // Prompt to save bookmark
                            this.promptBookmarkSave(newUrl, window);
                        }
                    } else {
                        // Use URL bar value if iframe access is blocked (cross-origin)
                        const currentUrl = urlBar.value;
                        if (currentUrl && currentUrl !== 'about:blank' && currentUrl.startsWith('http')) {
                            this.promptBookmarkSave(currentUrl, window);
                        }
                    }
                } catch (e) {
                    // Cross-origin, can't access - use URL bar value
                    const currentUrl = urlBar.value;
                    if (currentUrl && currentUrl !== 'about:blank' && currentUrl.startsWith('http')) {
                        this.promptBookmarkSave(currentUrl, window);
                    }
                }
            });
        }

        updateButtons();
    }

    promptBookmarkSave(url, window) {
        // Don't prompt for blank pages or data URLs
        if (!url || url === 'about:blank' || url.startsWith('data:')) return;
        
        // Check if already bookmarked
        if (typeof bookmarksApp !== 'undefined') {
            const existing = bookmarksApp.bookmarks.find(b => b.url === url);
            if (existing) return; // Already bookmarked
        }
        
        // Show prompt after a short delay
        setTimeout(() => {
            const prompt = document.createElement('div');
            prompt.className = 'browser-bookmark-prompt';
            prompt.innerHTML = `
                <div class="browser-bookmark-prompt-content">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"></path>
                    </svg>
                    <span>Save this page as a bookmark?</span>
                    <div class="browser-bookmark-prompt-actions">
                        <button class="browser-bookmark-prompt-btn browser-bookmark-prompt-yes">Save</button>
                        <button class="browser-bookmark-prompt-btn browser-bookmark-prompt-no">No</button>
                    </div>
                </div>
            `;
            
            const windowContent = window.querySelector('.window-content');
            if (windowContent) {
                windowContent.appendChild(prompt);
                
                // Auto-hide after 5 seconds
                const autoHide = setTimeout(() => {
                    prompt.remove();
                }, 5000);
                
                prompt.querySelector('.browser-bookmark-prompt-yes').addEventListener('click', () => {
                    clearTimeout(autoHide);
                    this.saveCurrentPageAsBookmark(url, window);
                    prompt.remove();
                });
                
                prompt.querySelector('.browser-bookmark-prompt-no').addEventListener('click', () => {
                    clearTimeout(autoHide);
                    prompt.remove();
                });
            }
        }, 2000); // Show prompt 2 seconds after page load
    }
    
    saveCurrentPageAsBookmark(url, window) {
        if (typeof bookmarksApp === 'undefined') return;
        
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            const name = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
            
            // Try to get page title from iframe (may fail due to CORS)
            const iframe = window.querySelector('#browser-content');
            let pageTitle = name;
            
            if (iframe && iframe.contentWindow) {
                try {
                    pageTitle = iframe.contentWindow.document.title || name;
                } catch (e) {
                    // Cross-origin, can't access title
                }
            }
            
            const bookmark = {
                name: pageTitle,
                url: url,
                icon: '🔗'
            };
            
            bookmarksApp.addBookmark(bookmark, null);
            
            // Show confirmation
            const confirmation = document.createElement('div');
            confirmation.className = 'browser-bookmark-confirmation';
            confirmation.textContent = '✓ Bookmark saved!';
            const windowContent = window.querySelector('.window-content');
            if (windowContent) {
                windowContent.appendChild(confirmation);
                setTimeout(() => confirmation.remove(), 2000);
            }
        } catch (e) {
            console.error('Error saving bookmark:', e);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const browserApp = new BrowserApp();

