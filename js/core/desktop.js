// Desktop Core — shell UI (launcher, taskbar, search, clock, shortcuts).
// PERF: Clock = cached refs only (no desktop/launcher re-render). Launcher = single .visible
// class toggle. One document click closes both launcher and power menu on outside click.
// Search debounced in search-suggestions.js; hover CSS-only; tooltips delegated on launcher.
class Desktop {
    constructor() {
        this.appsMenu = null;
        this.searchInput = null;
        this.init();
    }

    init() {
        this.appsMenu = document.getElementById('apps-menu');
        this.searchInput = document.getElementById('global-search');
        
        // Setup event listeners
        this.setupAppsMenu();
        this.setupTaskbar();
        this.setupSearch();
        this.setupClock();
        this.setupKeyboardShortcuts();
        
        // Apply saved icon size on load
        this.applySavedIconSize();
        
        // Load saved window states
        this.restoreWindows();
        
        requestAnimationFrame(() => {
            // Re-setup taskbar after apps are loaded (deferred scripts)
            // Use a single delayed setup instead of multiple timeouts
            if (typeof window.requestIdleCallback !== 'undefined') {
                requestIdleCallback(() => {
                    this.setupTaskbar();
                }, { timeout: 2000 });
            } else {
                setTimeout(() => {
                    this.setupTaskbar();
                }, 1000);
            }
        });
    }

    /**
     * Launcher open/close: single class toggle only (.visible). No re-render, no
     * innerHTML or multi-class toggles — keeps compositor layer cheap.
     */
    setupAppsMenu() {
        const showBtn = document.querySelector('[data-action="show-apps-menu"]');
        const hideBtn = document.querySelector('[data-action="hide-apps-menu"]');
        const menu = this.appsMenu;

        showBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const open = !menu.classList.contains('visible');
            menu.classList.toggle('visible', open);
            menu.setAttribute('aria-hidden', open ? 'false' : 'true');
            if (open) {
                const input = document.getElementById('launcher-search-input');
                if (input) input.focus();
            }
        });

        hideBtn?.addEventListener('click', () => {
            menu.classList.remove('visible');
            menu.setAttribute('aria-hidden', 'true');
        });

        // Single global click: close launcher and power menu when clicking outside (OS-like)
        document.addEventListener('click', (e) => {
            if (!menu.contains(e.target) && !showBtn?.contains(e.target)) {
                menu.classList.remove('visible');
                menu.setAttribute('aria-hidden', 'true');
            }
            const powerMenu = document.getElementById('power-menu');
            const powerMenuBtn = document.getElementById('power-menu-btn');
            if (powerMenu && powerMenuBtn && !powerMenu.contains(e.target) && !powerMenuBtn.contains(e.target)) {
                powerMenu.classList.remove('visible');
                powerMenuBtn.setAttribute('aria-expanded', 'false');
            }
        });

        // Render apps from registry
        this.renderAppsMenu(menu);
        
        // Use event delegation for app tiles (works with dynamically rendered tiles)
        menu.addEventListener('click', (e) => {
            const tile = e.target.closest('.app-tile, .launcher-recent-chip');
            if (tile) {
                const appId = tile.dataset.app;
                const url = tile.dataset.url;
                
                menu.classList.remove('visible');
                menu.setAttribute('aria-hidden', 'true');
                this.openApp(appId, url);
            }
        });

        // Icon size controls
        this.setupIconSizeControls(menu);
        
        // Explore button
        const exploreBtn = menu.querySelector('[data-action="explore"]');
        if (exploreBtn) {
            exploreBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                window.open('explore.html', '_blank');
            });
        }
    }

    setupTaskbar() {
        // Single delegated click handler - no per-icon listeners or DOM clones (faster, less memory)
        const taskbar = document.querySelector('.taskbar');
        if (taskbar) {
            if (this.taskbarClickHandler) {
                taskbar.removeEventListener('click', this.taskbarClickHandler, true);
            }
            this.taskbarClickHandler = (e) => {
                const icon = e.target.closest('.taskbar-icon[data-app], .taskbar-app-icon[data-app]');
                if (icon) {
                    e.preventDefault();
                    e.stopPropagation();
                    const appId = icon.dataset.app;
                    if (typeof windowManager !== 'undefined' && windowManager.windows.has(appId)) {
                        windowManager.focusWindow(windowManager.windows.get(appId));
                        return;
                    }
                    this.openApp(appId);
                }
            };
            taskbar.addEventListener('click', this.taskbarClickHandler, true);
        }
        
        // Removed unnecessary test timeout - icons are already set up

        // Theme switcher is owned by ThemeSystem (opens the selector panel).
        // Do not also cycle themes here — that fights panel selection and persist.

        // Quick actions button
        // Notification Center button
        const notificationCenterBtn = document.getElementById('notification-center-btn');
        if (notificationCenterBtn && typeof notificationCenter !== 'undefined') {
            notificationCenterBtn.addEventListener('click', () => {
                notificationCenter.toggle();
            });
            
            // Update badge count periodically
            const updateBadge = () => {
                const badge = document.getElementById('notification-badge');
                if (badge) {
                    const count = notificationCenter.getUnreadCount();
                    if (count > 0) {
                        badge.textContent = count > 99 ? '99+' : count;
                        badge.style.display = 'flex';
                    } else {
                        badge.style.display = 'none';
                    }
                }
            };
            
            // Update badge less frequently (every 10 seconds instead of 5)
            setInterval(updateBadge, 10000);
            updateBadge();
        }
        
        const quickActionsBtn = document.getElementById('quick-actions-btn');
        if (quickActionsBtn && typeof quickActions !== 'undefined') {
            quickActionsBtn.addEventListener('click', () => {
                quickActions.toggle();
            });
        }
    }

    setupSearch() {
        if (!this.searchInput) {
            return;
        }

        // Search suggestions are debounced in search-suggestions.js (input handler).
        // This file only handles Enter key and button click — no duplicate input handling.

        // Handle Enter key (single listener)
        this.searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                const query = this.searchInput.value.trim();
                if (query) {
                    this.handleSearch(query);
                } else {
                    this.searchInput.focus();
                }
            }
        });

        // Add search button if it doesn't exist
        const searchBar = this.searchInput.closest('.search-bar');
        if (searchBar) {
            // Remove existing search button if any
            const existingBtn = searchBar.querySelector('.search-btn');
            if (existingBtn) {
                existingBtn.remove();
            }

            const searchBtn = document.createElement('button');
            searchBtn.className = 'search-btn';
            searchBtn.type = 'button';
            searchBtn.setAttribute('aria-label', 'Search');
            searchBtn.innerHTML = `
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                </svg>
            `;
            // Hover/focus: CSS-only (main.css / perf-desktop.css .search-btn:hover)
            searchBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const query = this.searchInput.value.trim();
                if (query) this.handleSearch(query);
                else this.searchInput.focus();
            });

            searchBar.appendChild(searchBtn);
        }
    }

    /**
     * PERF: Clock updates only touch cached time/date nodes. No desktop or launcher
     * re-render — avoids layout thrash and keeps 60fps.
     */
    setupClock() {
        const timeEl = document.getElementById('time-display');
        const dateEl = document.getElementById('date-display');
        if (!timeEl || !dateEl) return;

        const updateClock = () => {
            const now = new Date();
            timeEl.textContent = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            });
            dateEl.textContent = now.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric'
            });
        };

        updateClock();
        const msUntilNextMinute = 60000 - (Date.now() % 60000);
        this._clockTimeout = setTimeout(() => {
            updateClock();
            this._clockInterval = setInterval(updateClock, 60000);
        }, msUntilNextMinute);
    }

    /**
     * Single keydown listener on body (avoids global document where possible).
     * Shortcuts only when not in input/textarea.
     */
    setupKeyboardShortcuts() {
        const target = document.body;
        target.addEventListener('keydown', (e) => {
            if (e.altKey && e.key === ' ') {
                e.preventDefault();
                const open = !this.appsMenu.classList.contains('visible');
                this.appsMenu.classList.toggle('visible', open);
                this.appsMenu.setAttribute('aria-hidden', open ? 'false' : 'true');
                if (open) {
                    const input = document.getElementById('launcher-search-input');
                    if (input) input.focus();
                }
            }

            if (e.key === 'Escape') {
                const searchOverlay = document.getElementById('global-search-overlay');
                const powerMenu = document.getElementById('power-menu');
                const desktopMenu = document.getElementById('aegis-desktop-menu');
                if (this.appsMenu?.classList.contains('visible')) {
                    this.appsMenu.classList.remove('visible');
                    this.appsMenu.setAttribute('aria-hidden', 'true');
                    return;
                }
                if (searchOverlay?.classList.contains('visible')) {
                    return;
                }
                if (powerMenu?.classList.contains('visible')) {
                    powerMenu.classList.remove('visible');
                    return;
                }
                if (desktopMenu?.classList.contains('visible')) {
                    return;
                }
                const activeWindow = document.querySelector('.window.active');
                if (activeWindow && !e.target.closest('.window-content input, .window-content textarea, .window-content [contenteditable]')) {
                    windowManager.closeWindow(activeWindow);
                }
            }

            // Alt + F4: Close active window
            if (e.altKey && e.key === 'F4') {
                e.preventDefault();
                const activeWindow = document.querySelector('.window.active');
                if (activeWindow) {
                    windowManager.closeWindow(activeWindow);
                }
            }

            // Alt + Tab: Switch between windows
            if (e.altKey && e.key === 'Tab') {
                e.preventDefault();
                this.switchWindows();
            }

            // Alt + Number: Open pinned apps
            if (e.altKey && /^[1-9]$/.test(e.key)) {
                const index = parseInt(e.key) - 1;
                const pinnedApps = Array.from(document.querySelectorAll('.taskbar-icon[data-app]'));
                if (pinnedApps[index]) {
                    const appId = pinnedApps[index].dataset.app;
                    this.openApp(appId);
                }
            }

            // Ctrl + F: Focus search
            if (e.ctrlKey && e.key === 'f' && !e.target.closest('input, textarea')) {
                e.preventDefault();
                if (this.searchInput) {
                    this.searchInput.focus();
                    this.searchInput.select();
                }
            }

            // Ctrl + W: Close active window
            if (e.ctrlKey && e.key === 'w' && !e.target.closest('input, textarea')) {
                e.preventDefault();
                const activeWindow = document.querySelector('.window.active');
                if (activeWindow) {
                    windowManager.closeWindow(activeWindow);
                }
            }

            // T key: Cycle theme (when not typing)
            if (e.key === 't' && !e.ctrlKey && !e.altKey && !e.shiftKey && !e.target.closest('input, textarea')) {
                if (typeof themeSystem !== 'undefined') {
                    const newTheme = themeSystem.cycleTheme();
                    if (typeof notificationSystem !== 'undefined') {
                        notificationSystem.info('Theme Changed', `Switched to ${themeSystem.themes[newTheme].name} theme`);
                    }
                }
            }
        });
    }

    switchWindows() {
        const windows = Array.from(windowManager.windows.values());
        if (windows.length < 2) return;
        
        const currentIndex = windows.findIndex(w => w.classList.contains('active'));
        const nextIndex = (currentIndex + 1) % windows.length;
        
        windowManager.focusWindow(windows[nextIndex]);
    }

    renderAppsMenu(menu) {
        if (typeof APP_REGISTRY === 'undefined') {
            console.warn('APP_REGISTRY not available, using static HTML');
            return;
        }

        const appsGrid = menu.querySelector('.apps-grid');
        if (!appsGrid) return;

        const scrollContainer = menu.querySelector('[data-launcher-scroll]') || appsGrid.parentElement;

        // --- VIRTUALIZED RENDERING PLACEHOLDER (for very large app lists) ---
        // When app count exceeds LAUNCHER_VIRTUALIZE_THRESHOLD, render only visible rows + buffer:
        // 1. Use scrollContainer scrollTop + clientHeight to compute visible range.
        // 2. Render only appOrder.slice(startIndex, endIndex + buffer).
        // 3. Use a spacer (height: (startIndex * rowHeight)) and bottom spacer for scroll height.
        // 4. On scroll (throttled), recompute startIndex/endIndex and patch DOM.
        // const LAUNCHER_VIRTUALIZE_THRESHOLD = 50;
        // const LAUNCHER_ROW_HEIGHT = 156; // --launcher-cell-h + gap
        // if (appOrder.length > LAUNCHER_VIRTUALIZE_THRESHOLD) { ... virtualized path ... }

        // --- LAZY RENDERING HOOKS (optional: render tiles when they enter viewport) ---
        // Use IntersectionObserver on scrollContainer to mark visible tiles and defer
        // icon SVG / heavy content until tile is near viewport:
        // scrollContainer && new IntersectionObserver((entries) => { ... }, { root: scrollContainer, rootMargin: '100px', threshold: 0 }) for each placeholder tile.
        // For now we render all tiles; grid has contain: paint so scroll is cheap.

        // Get app order (preserve existing order from HTML if possible)
        const appOrder = ['tasks', 'notes', 'weather', 'world-clock', 'ai-chat', 'code-editor', 'terminal', 'drawing', 'system-monitor', 'gallery', 'music', 'browser', 'bookmarks', 'calculator', 'calendar', 'mail', 'files', 'settings', 'system-intelligence', 'news-hub', 'user', 'help'];
        
        // Render apps from registry (full render; switch to virtualized when appOrder.length > threshold)
        appsGrid.innerHTML = appOrder.map(appId => {
            const app = APP_REGISTRY[appId];
            if (!app) return '';
            
            // Check if app has special URL (for ai-chat, browser)
            let urlAttr = '';
            if (appId === 'ai-chat') {
                urlAttr = 'data-url="ai-chat.html"';
            } else if (appId === 'browser') {
                urlAttr = 'data-url="https://www.google.com"';
            }
            
            // Escape HTML in title for tooltip
            const title = app.title || appId;
            const escapedTitle = title.replace(/"/g, '&quot;');
            
            return `
                <div class="app-tile" 
                     data-app="${appId}" 
                     ${urlAttr}
                     role="button"
                     tabindex="0"
                     aria-label="Open ${escapedTitle}"
                     title="${escapedTitle}">
                    <div class="app-tile-icon" aria-hidden="true">
                        ${app.iconSVG}
                    </div>
                    <div class="app-tile-name">${title}</div>
                    <div class="app-tile-tooltip" role="tooltip" aria-hidden="true">${escapedTitle}</div>
                </div>
            `;
        }).join('');

        var recentsHost = menu.querySelector('#launcher-recents');
        if (recentsHost && typeof AegisRecent !== 'undefined') {
            var recentIds = (AegisRecent.apps() || []).filter(function (id) { return APP_REGISTRY[id]; }).slice(0, 4);
            if (recentIds.length) {
                recentsHost.hidden = false;
                recentsHost.innerHTML = '<p class="launcher-recents-label">Recent</p>' + recentIds.map(function (id) {
                    var app = APP_REGISTRY[id];
                    return '<button type="button" class="launcher-recent-chip" data-app="' + id + '">' + (app.title || id) + '</button>';
                }).join('');
            } else {
                recentsHost.hidden = true;
                recentsHost.innerHTML = '';
            }
        }
        
        // Setup tooltip positioning after render
        this.setupAppTileTooltips(appsGrid);
        
        // Setup keyboard navigation
        this.setupAppTileKeyboard(appsGrid);
    }
    
    /**
     * PERF: One delegated listener on launcher for tooltip positioning (no N listeners).
     * Hover visuals are CSS-only; this only sets placement classes to avoid viewport clipping.
     */
    setupAppTileTooltips(container) {
        const updateTooltipForTile = (tile) => {
            const tooltip = tile.querySelector('.app-tile-tooltip');
            if (!tooltip) return;
            const rect = tile.getBoundingClientRect();
            const tooltipRect = tooltip.getBoundingClientRect();
            const vw = window.innerWidth;

            tooltip.className = 'app-tile-tooltip';
            if (rect.top - tooltipRect.height - 12 < 0) tooltip.classList.add('tooltip-bottom');
            else tooltip.classList.add('tooltip-top');
            if (rect.left + tooltipRect.width / 2 > vw) tooltip.classList.add('tooltip-left');
            else if (rect.right - tooltipRect.width / 2 < 0) tooltip.classList.add('tooltip-right');
        };

        container.addEventListener('mouseenter', (e) => {
            const tile = e.target.closest('.app-tile');
            if (tile) updateTooltipForTile(tile);
        }, true);
        container.addEventListener('focusin', (e) => {
            const tile = e.target.closest('.app-tile');
            if (tile) updateTooltipForTile(tile);
        }, true);

        let resizeScheduled = false;
        const onResize = () => {
            if (resizeScheduled) return;
            resizeScheduled = true;
            requestAnimationFrame(() => {
                container.querySelectorAll('.app-tile').forEach(updateTooltipForTile);
                resizeScheduled = false;
            });
        };
        window.addEventListener('resize', onResize);
    }
    
    setupAppTileKeyboard(container) {
        const visibleTiles = () => Array.from(container.querySelectorAll('.app-tile[tabindex="0"]'))
            .filter(tile => !tile.hidden);

        container.querySelectorAll('.app-tile[tabindex="0"]').forEach((tile) => {
            // Enter/Space to activate
            tile.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    if (tile.hidden) return;
                    e.preventDefault();
                    e.stopPropagation();
                    const appId = tile.dataset.app;
                    const url = tile.dataset.url;
                    this.appsMenu.classList.remove('visible');
                    this.appsMenu.setAttribute('aria-hidden', 'true');
                    this.openApp(appId, url);
                }
            });
            
            // Arrow key navigation
            tile.addEventListener('keydown', (e) => {
                if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
                
                e.preventDefault();
                const tiles = visibleTiles();
                if (!tiles.length) return;
                
                const cols = Math.max(1, Math.floor(container.clientWidth / 140));
                const currentIndex = Math.max(0, tiles.indexOf(tile));
                let nextIndex = currentIndex;
                
                switch(e.key) {
                    case 'ArrowRight':
                        nextIndex = (currentIndex + 1) % tiles.length;
                        break;
                    case 'ArrowLeft':
                        nextIndex = (currentIndex - 1 + tiles.length) % tiles.length;
                        break;
                    case 'ArrowDown':
                        nextIndex = Math.min(currentIndex + cols, tiles.length - 1);
                        break;
                    case 'ArrowUp':
                        nextIndex = Math.max(currentIndex - cols, 0);
                        break;
                }
                
                if (nextIndex !== currentIndex) {
                    tiles[nextIndex].focus();
                    tiles[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
            });
        });
    }

    openApp(appId, url = null) {
        if (!appId) {
            return;
        }

        if (typeof windowManager !== 'undefined' && windowManager.windows.has(appId) && !url) {
            windowManager.focusWindow(windowManager.windows.get(appId));
            return;
        }
        
        // Use APP_REGISTRY if available
        if (typeof APP_REGISTRY !== 'undefined' && APP_REGISTRY[appId]) {
            const app = APP_REGISTRY[appId];
            const beforeCount = (typeof windowManager !== 'undefined') ? windowManager.windows.size : 0;
            try {
                if (url) {
                    app.open(url);
                } else {
                    app.open();
                }
                try {
                    if (typeof userProfile !== 'undefined' && userProfile.initialized) {
                        userProfile.recordEvent('app_opened', { appId });
                    }
                } catch (profileError) {
                    console.error('Could not record app open:', appId);
                }
                return;
            } catch (error) {
                console.error('Error opening app from registry:', appId, error);
                if (typeof windowManager !== 'undefined' && windowManager.windows.size > beforeCount) {
                    return;
                }
            }
        }

        this.openAppLegacy(appId, url);
    }

    openAppLegacy(appId, url = null) {
        switch (appId) {
            case 'tasks':
                if (typeof tasksApp !== 'undefined') {
                    try {
                        tasksApp.open();
                    } catch (error) {
                        console.error('Error opening Tasks app:', error);
                        if (typeof notificationSystem !== 'undefined') {
                            notificationSystem.error('Error', 'Failed to open Tasks app: ' + error.message);
                        } else {
                            alert('Error opening Tasks app: ' + error.message);
                        }
                    }
                } else {
                    console.error('❌ tasksApp is not defined!');
                    console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('task')));
                    // Try waiting and retry multiple times
                    let attempts = 0;
                    const maxAttempts = 5;
                    const checkAndOpen = () => {
                        attempts++;
                        if (typeof tasksApp !== 'undefined') {
                            console.log('✅ tasksApp now available (attempt ' + attempts + '), opening...');
                            try {
                                tasksApp.open();
                            } catch (error) {
                                console.error('Error opening after wait:', error);
                            }
                        } else if (attempts < maxAttempts) {
                            console.log('⏳ Waiting for tasksApp... (attempt ' + attempts + ')');
                            setTimeout(checkAndOpen, 300);
                        } else {
                            console.error('❌ tasksApp still not available after ' + maxAttempts + ' attempts');
                            if (typeof notificationSystem !== 'undefined') {
                                notificationSystem.error('Error', 'Tasks app is not loaded. Please refresh the page.');
                            } else {
                                alert('Tasks app is not loaded. Please refresh the page.');
                            }
                        }
                    };
                    setTimeout(checkAndOpen, 300);
                }
                break;
            case 'notes':
                if (typeof notesApp !== 'undefined') {
                    try {
                        notesApp.open();
                    } catch (error) {
                        console.error('Error opening Notes app:', error);
                        if (typeof notificationSystem !== 'undefined') {
                            notificationSystem.error('Error', 'Failed to open Notes app: ' + error.message);
                        } else {
                            alert('Error opening Notes app: ' + error.message);
                        }
                    }
                } else {
                    console.error('❌ notesApp is not defined!');
                    console.log('Available globals:', Object.keys(window).filter(k => k.toLowerCase().includes('note')));
                    // Try waiting and retry multiple times
                    let attempts = 0;
                    const maxAttempts = 5;
                    const checkAndOpen = () => {
                        attempts++;
                        if (typeof notesApp !== 'undefined') {
                            console.log('✅ notesApp now available (attempt ' + attempts + '), opening...');
                            try {
                                notesApp.open();
                            } catch (error) {
                                console.error('Error opening after wait:', error);
                            }
                        } else if (attempts < maxAttempts) {
                            console.log('⏳ Waiting for notesApp... (attempt ' + attempts + ')');
                            setTimeout(checkAndOpen, 300);
                        } else {
                            console.error('❌ notesApp still not available after ' + maxAttempts + ' attempts');
                            if (typeof notificationSystem !== 'undefined') {
                                notificationSystem.error('Error', 'Notes app is not loaded. Please refresh the page.');
                            } else {
                                alert('Notes app is not loaded. Please refresh the page.');
                            }
                        }
                    };
                    setTimeout(checkAndOpen, 300);
                }
                break;
            case 'weather':
                if (typeof weatherApp !== 'undefined') weatherApp.open();
                break;
            case 'ai-chat':
                // Always open ai-chat.html in a new window/tab
                const aiChatUrl = url || 'ai-chat.html';
                console.log('Opening AI Assistant:', aiChatUrl);
                window.open(aiChatUrl, '_blank');
                break;
            case 'browser':
                if (typeof browserApp !== 'undefined') {
                    const appUrl = url || 'https://www.google.com';
                    console.log('Opening browser with URL:', appUrl, 'Title: Browser');
                    browserApp.open(appUrl, 'Browser');
                } else {
                    console.error('browserApp is not defined!');
                    alert('Browser app is not available. Please refresh the page.');
                }
                break;
            case 'bookmarks':
                if (typeof bookmarksApp !== 'undefined') bookmarksApp.open();
                break;
            case 'calculator':
                if (typeof calculatorApp !== 'undefined') calculatorApp.open();
                break;
            case 'world-clock':
                if (typeof worldClockApp !== 'undefined' && worldClockApp.open) worldClockApp.open();
                break;
            case 'calendar':
                if (typeof calendarApp !== 'undefined') calendarApp.open();
                break;
            case 'files':
                if (typeof filesApp !== 'undefined') filesApp.open();
                break;
            case 'settings':
                if (typeof settingsApp !== 'undefined') settingsApp.open();
                break;
            case 'terminal':
                if (typeof terminalApp !== 'undefined') {
                    try {
                        terminalApp.open();
                    } catch (err) {
                        console.error('Terminal open error:', err);
                        window.open('terminal.html', '_blank') || (window.location.href = 'terminal.html');
                    }
                } else {
                    window.open('terminal.html', '_blank') || (window.location.href = 'terminal.html');
                }
                break;
            default:
                if (typeof bookmarksApp !== 'undefined' && typeof bookmarksApp.findBookmark === 'function') {
                    const bookmark = bookmarksApp.findBookmark(appId);
                    if (bookmark && typeof browserApp !== 'undefined') {
                        browserApp.open(bookmark.url, bookmark.name);
                        return;
                    }
                }
                break;
        }
    }

    handleSearch(query) {
        if (!query || !query.trim()) {
            return;
        }
        
        const lowerQuery = query.toLowerCase().trim();
        const originalQuery = query.trim();
        
        try {
            // Check if it's a URL (has dots and looks like a domain)
            if (originalQuery.includes('.') && (originalQuery.includes('http') || originalQuery.match(/^[a-zA-Z0-9-]+\.[a-zA-Z]/))) {
                // It's a URL - open it
                let url = originalQuery;
                if (!url.startsWith('http://') && !url.startsWith('https://')) {
                    url = 'https://' + url;
                }
                console.log('Detected URL, opening:', url);
                if (typeof browserApp !== 'undefined' && browserApp) {
                    browserApp.open(url, 'Browser');
                    this.searchInput.value = '';
                    return;
                } else {
                    console.error('browserApp is not defined!');
                    alert('Browser app is not available. Please refresh the page.');
                    return;
                }
            }

            // Check for app names using APP_REGISTRY (case-insensitive)
            // Build search map from registry
            const appMap = {};
            const aliases = {
                'task': 'tasks',
                'tasks': 'tasks',
                'note': 'notes',
                'notes': 'notes',
                'weather': 'weather',
                'ai': 'ai-chat',
                'assistant': 'ai-chat',
                'chat': 'ai-chat',
                'browser': 'browser',
                'code-editor': 'code-editor',
                'codeeditor': 'code-editor',
                'editor': 'code-editor',
                'studio': 'code-editor',
                'code studio': 'code-editor',
                'terminal': 'terminal',
                'music': 'music',
                'musicplayer': 'music',
                'music-player': 'music',
                'youtube': 'music',
                'drawing': 'drawing',
                'draw': 'drawing',
                'monitor': 'system-monitor',
                'system': 'system-monitor',
                'gallery': 'gallery',
                'photos': 'gallery',
                'yt': 'youtube',
                'setting': 'settings',
                'settings': 'settings',
                'file': 'files',
                'files': 'files',
                'calc': 'calculator',
                'calculator': 'calculator',
                'world clock': 'world-clock',
                'world-clock': 'world-clock',
                'timezone': 'world-clock',
                'calendar': 'calendar',
                'mail': 'mail',
                'email': 'mail',
                'e-mail': 'mail',
                'e mail': 'mail',
                'bookmark': 'bookmarks',
                'bookmarks': 'bookmarks'
            };
            
            // Add registry titles and aliases
            if (typeof APP_REGISTRY !== 'undefined') {
                Object.keys(APP_REGISTRY).forEach(appId => {
                    const app = APP_REGISTRY[appId];
                    const titleLower = app.title.toLowerCase();
                    appMap[titleLower] = appId;
                    appMap[appId] = appId;
                });
            }
            
            // Add aliases (override registry if needed)
            Object.entries(aliases).forEach(([alias, appId]) => {
                appMap[alias] = appId;
            });

            // Check for exact app name matches first
            if (appMap[lowerQuery]) {
                console.log('Detected app name, opening:', appMap[lowerQuery]);
                const targetAppId = appMap[lowerQuery];
                this.openApp(targetAppId);
                this.searchInput.value = '';
                return;
            }

            // Check if query matches any app title (case-insensitive partial match)
            if (typeof APP_REGISTRY !== 'undefined') {
                for (const [appId, app] of Object.entries(APP_REGISTRY)) {
                    const titleLower = app.title.toLowerCase();
                    if (titleLower.includes(lowerQuery) || lowerQuery.includes(titleLower)) {
                        console.log('Matched app by title, opening:', appId);
                        this.openApp(appId);
                        this.searchInput.value = '';
                        return;
                    }
                }
            }

            // Check if query starts with app keywords
            for (const [keyword, appId] of Object.entries(appMap)) {
                if (lowerQuery === keyword || lowerQuery.startsWith(keyword + ' ')) {
                    console.log('Detected app keyword, opening:', appId);
                    this.openApp(appId);
                    this.searchInput.value = '';
                    return;
                }
            }

            // If it's not a URL and not an app, treat it as a Google search
            // Open browser with Google search
            const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(originalQuery);
            console.log('Treating as Google search, opening:', searchUrl);
            
            if (typeof browserApp !== 'undefined' && browserApp) {
                browserApp.open(searchUrl, 'Google Search');
                this.searchInput.value = '';
            } else {
                console.error('browserApp is not defined!');
                console.error('Available globals:', Object.keys(window).filter(k => k.includes('App') || k.includes('app')));
                alert('Browser app is not available. Please refresh the page.');
            }
        } catch (error) {
            console.error('Error in handleSearch:', error);
            alert('An error occurred while searching. Please try again.');
        }
    }

    setupIconSizeControls(menu) {
        const sizeButtons = menu.querySelectorAll('.icon-size-btn[data-size]');
        const appTiles = menu.querySelectorAll('.app-tile');
        
        // Load saved size preference
        const savedSize = storage.get('iconSize', 'medium');
        this.setIconSize(savedSize, sizeButtons, appTiles);
        
        sizeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const size = btn.dataset.size;
                this.setIconSize(size, sizeButtons, appTiles);
                storage.set('iconSize', size);
            });
        });
    }

    applySavedIconSize() {
        // Apply saved icon size immediately on page load
        const savedSize = storage.get('iconSize', 'medium');
        const menu = this.appsMenu;
        if (menu) {
            const sizeButtons = menu.querySelectorAll('.icon-size-btn[data-size]');
            const appTiles = menu.querySelectorAll('.app-tile');
            this.setIconSize(savedSize, sizeButtons, appTiles);
        }
    }

    setIconSize(size, sizeButtons, appTiles) {
        // Update button states
        sizeButtons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.size === size);
        });
        
        // Update icon sizes
        appTiles.forEach(tile => {
            const icon = tile.querySelector('.app-tile-icon');
            if (icon) {
                icon.className = 'app-tile-icon size-' + size;
            }
        });
    }

    restoreWindows() {
        // Windows are restored individually when opened via window manager
        // This could be enhanced to auto-restore all windows on startup
    }
}

const desktop = new Desktop();
if (typeof window !== 'undefined') {
    window.desktop = desktop;
}

