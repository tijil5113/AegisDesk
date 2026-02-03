/**
 * Window Manager — shell windows (create, focus, minimize, close).
 *
 * PERF: Single global resize listener (viewport only). Per-window resize listeners removed:
 * the window div does not fire "resize" on viewport change; only the global window does.
 * z-index: inline style set on focus so active window has highest stack; CSS .window.active
 * can override in stylesheet if desired; we use inline for deterministic stacking order.
 */
class WindowManager {
    constructor() {
        this.windows = new Map();
        this.zIndexCounter = 100;
        this.windowPositions = (typeof osStore !== 'undefined' && osStore.initialized)
            ? osStore.getStateSlice('windows') || {}
            : storage.get('windowPositions', {});
        this.saveTimeout = null;
        this.windowCallbacks = new WeakMap();

        // Single debounced viewport resize: only the global window fires resize on viewport change
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                this.windows.forEach(w => {
                    if (!w.classList.contains('maximized')) this.ensureWindowInViewport(w);
                });
            }, 150);
        });
    }

    createWindow(appId, config = {}) {
        // Check if window already exists
        if (this.windows.has(appId)) {
            const existingWindow = this.windows.get(appId);
            this.focusWindow(existingWindow);
            return existingWindow;
        }

        const defaultConfig = {
            id: appId,
            title: config.title || appId,
            icon: config.icon || '',
            width: config.width || 600,
            height: config.height || 500,
            minWidth: config.minWidth || 300,
            minHeight: config.minHeight || 200,
            content: config.content || '',
            class: config.class || '',
            url: config.url || null,
            // Lifecycle callbacks
            onOpen: config.onOpen || null,
            onFocus: config.onFocus || null,
            onMinimize: config.onMinimize || null,
            onMaximize: config.onMaximize || null,
            onClose: config.onClose || null
        };

        const window = this.buildWindow(defaultConfig);
        
        // Store callbacks
        this.windowCallbacks.set(window, {
            onOpen: defaultConfig.onOpen,
            onFocus: defaultConfig.onFocus,
            onMinimize: defaultConfig.onMinimize,
            onMaximize: defaultConfig.onMaximize,
            onClose: defaultConfig.onClose
        });
        
        this.windows.set(appId, window);
        this.addWindowToDOM(window);
        this.setupWindowEvents(window);
        
        // Restore position if saved
        this.restoreWindowPosition(window);
        
        // Trigger onOpen callback after DOM insert
        this.triggerCallback(window, 'onOpen');
        
        // Track app opened in user profile
        if (typeof userProfile !== 'undefined' && userProfile.initialized) {
            userProfile.recordEvent('app_opened', { appId: appId });
            // Track start time for duration calculation
            window.dataset.openTime = Date.now();
        }
        
        this.focusWindow(window);
        this.updateTaskbar();

        return window;
    }

    buildWindow(config) {
        const windowEl = document.createElement('div');
        windowEl.className = `window ${config.class}`;
        windowEl.dataset.windowId = config.id;
        
        // Get viewport dimensions (accounting for zoom)
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const taskbarHeight = 56; // Taskbar height
        
        // Constrain window size to fit viewport
        const maxWidth = Math.min(config.width, viewportWidth - 40);
        const maxHeight = Math.min(config.height, viewportHeight - taskbarHeight - 40);
        
        windowEl.style.width = maxWidth + 'px';
        windowEl.style.height = maxHeight + 'px';
        windowEl.style.zIndex = this.zIndexCounter++;

        const savedPos = this.windowPositions[config.id];
        if (savedPos && !savedPos.maximized) {
            // Ensure saved position is within viewport
            const savedLeft = Math.max(0, Math.min(savedPos.left, viewportWidth - maxWidth));
            const savedTop = Math.max(0, Math.min(savedPos.top, viewportHeight - taskbarHeight - maxHeight));
            windowEl.style.left = savedLeft + 'px';
            windowEl.style.top = savedTop + 'px';
        } else {
            // Center window, ensuring it fits viewport
            const centerX = Math.max(20, (viewportWidth - maxWidth) / 2);
            const centerY = Math.max(20, (viewportHeight - taskbarHeight - maxHeight) / 3);
            windowEl.style.left = centerX + 'px';
            windowEl.style.top = centerY + 'px';
        }
        
        // Ensure window stays within bounds after creation
        this.ensureWindowInViewport(windowEl);

        windowEl.innerHTML = `
            <div class="window-titlebar">
                <div class="window-titlebar-left">
                    ${config.icon ? `<div class="window-icon">${config.icon}</div>` : ''}
                    <div class="window-title">${config.title}</div>
                </div>
                <div class="window-titlebar-right">
                    <button class="window-button minimize" data-action="minimize">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button class="window-button maximize" data-action="maximize">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"></path>
                        </svg>
                    </button>
                    <button class="window-button close" data-action="close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="window-content">${config.content}</div>
            <div class="window-resize-handle nw"></div>
            <div class="window-resize-handle ne"></div>
            <div class="window-resize-handle sw"></div>
            <div class="window-resize-handle se"></div>
            <div class="window-resize-handle n"></div>
            <div class="window-resize-handle s"></div>
            <div class="window-resize-handle e"></div>
            <div class="window-resize-handle w"></div>
        `;

        return windowEl;
    }

    addWindowToDOM(window) {
        const container = document.getElementById('windows-container');
        container.appendChild(window);
    }

    setupWindowEvents(window) {
        const titlebar = window.querySelector('.window-titlebar');
        const content = window.querySelector('.window-content');
        const resizeHandles = window.querySelectorAll('.window-resize-handle');
        const buttons = window.querySelectorAll('.window-button');

        // Drag
        dragManager.initDrag(window, titlebar);

        // Resize
        dragManager.initResize(window, resizeHandles);

        // Focus
        window.addEventListener('mousedown', () => this.focusWindow(window));

        // Buttons
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                this.handleWindowAction(window, action);
            });
        });

        content.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            e.stopPropagation();
        });

        // Snap to viewport edges on drag end (single timeout per window)
        let snapTimeout;
        window.addEventListener('mouseup', () => {
            clearTimeout(snapTimeout);
            snapTimeout = setTimeout(() => {
                this.ensureWindowInViewport(window);
                this.snapToEdge(window);
            }, 100);
        });
        // Viewport resize is handled once globally in constructor; no per-window resize listener
    }

    snapToEdge(window) {
        if (window.classList.contains('maximized')) return;
        
        const rect = window.getBoundingClientRect();
        const snapDistance = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight - 48; // Taskbar height
        
        let newLeft = parseInt(window.style.left);
        let newTop = parseInt(window.style.top);
        let snapped = false;
        
        // Snap to left edge
        if (Math.abs(newLeft) < snapDistance) {
            newLeft = 0;
            snapped = true;
        }
        // Snap to right edge
        else if (Math.abs(newLeft + rect.width - viewportWidth) < snapDistance) {
            newLeft = viewportWidth - rect.width;
            snapped = true;
        }
        
        // Snap to top edge
        if (Math.abs(newTop) < snapDistance) {
            newTop = 0;
            snapped = true;
        }
        // Snap to bottom edge
        else if (Math.abs(newTop + rect.height - viewportHeight) < snapDistance) {
            newTop = viewportHeight - rect.height;
            snapped = true;
        }
        
        if (snapped) {
            window.style.transition = 'left 0.2s ease, top 0.2s ease';
            window.style.left = newLeft + 'px';
            window.style.top = newTop + 'px';
            setTimeout(() => {
                window.style.transition = '';
                this.saveWindowPosition(window);
            }, 200);
        }
    }

    handleWindowAction(window, action) {
        switch (action) {
            case 'minimize':
                this.minimizeWindow(window);
                break;
            case 'maximize':
                this.maximizeWindow(window);
                break;
            case 'close':
                this.closeWindow(window);
                break;
        }
    }

    minimizeWindow(window) {
        window.classList.add('minimizing');
        this.triggerCallback(window, 'onMinimize');
        
        setTimeout(() => {
            window.classList.remove('minimizing');
            window.classList.add('minimized');
            this.updateTaskbar();
        }, 300);
    }

    maximizeWindow(window) {
        const isMaximized = window.classList.contains('maximized');
        
        if (isMaximized) {
            // Restore
            window.classList.remove('maximized');
            const savedPos = this.windowPositions[window.dataset.windowId];
            if (savedPos) {
                window.style.left = savedPos.left + 'px';
                window.style.top = savedPos.top + 'px';
                window.style.width = savedPos.width + 'px';
                window.style.height = savedPos.height + 'px';
            }
            this.triggerCallback(window, 'onMaximize', false);
        } else {
            // Maximize - save current position
            this.saveWindowPosition(window);
            window.classList.add('maximized');
            this.triggerCallback(window, 'onMaximize', true);
        }
    }

    focusWindow(window) {
        // Update z-index
        window.style.zIndex = this.zIndexCounter++;
        
        // Update classes
        this.windows.forEach(w => {
            w.classList.remove('active');
            w.classList.add('inactive');
        });
        window.classList.add('active');
        window.classList.remove('inactive');
        window.classList.remove('minimized');

        // Trigger onFocus callback
        this.triggerCallback(window, 'onFocus');
        
        this.updateTaskbar();
    }

    closeWindow(window) {
        const windowId = window.dataset.windowId;
        
        // Track app closed in user profile
        if (typeof userProfile !== 'undefined' && userProfile.initialized) {
            const openTime = window.dataset.openTime ? parseInt(window.dataset.openTime) : null;
            const duration = openTime ? Math.floor((Date.now() - openTime) / 1000 / 60) : 0; // minutes
            userProfile.recordEvent('app_closed', { 
                appId: windowId,
                duration: duration
            });
        }
        
        // Trigger onClose callback before removal
        this.triggerCallback(window, 'onClose');
        
        this.saveWindowPosition(window);
        window.classList.add('window-closing');
        
        setTimeout(() => {
            window.remove();
            this.windows.delete(windowId);
            // Clean up callbacks
            this.windowCallbacks.delete(window);
            this.updateTaskbar();
        }, 300);
    }

    saveWindowPosition(window) {
        if (!window || !window.dataset.windowId) return;
        
        const windowId = window.dataset.windowId;
        
        if (window.classList.contains('maximized')) {
            this.windowPositions[windowId] = {
                ...this.windowPositions[windowId],
                maximized: true
            };
        } else {
            const rect = window.getBoundingClientRect();
            const left = parseInt(window.style.left) || rect.left;
            const top = parseInt(window.style.top) || rect.top;
            
            this.windowPositions[windowId] = {
                left: Math.max(0, left),
                top: Math.max(0, top),
                width: rect.width,
                height: rect.height,
                maximized: false
            };
        }
        
        // Debounce saves - use OS store if available
        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            if (typeof osStore !== 'undefined' && osStore.initialized) {
                osStore.dispatch({
                    type: 'WINDOWS_UPDATE',
                    payload: this.windowPositions
                });
            } else {
                // Fallback to legacy storage
                storage.set('windowPositions', this.windowPositions);
            }
        }, 300);
    }

    restoreWindowPosition(window) {
        const savedPos = this.windowPositions[window.dataset.windowId];
        if (savedPos) {
            if (savedPos.maximized) {
                window.classList.add('maximized');
            } else {
                // Constrain restored position to viewport
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                const taskbarHeight = 56;
                
                if (savedPos.left !== undefined) {
                    const maxLeft = viewportWidth - (savedPos.width || parseInt(window.style.width) || 500);
                    window.style.left = Math.max(0, Math.min(savedPos.left, maxLeft)) + 'px';
                }
                if (savedPos.top !== undefined) {
                    const maxTop = viewportHeight - taskbarHeight - (savedPos.height || parseInt(window.style.height) || 500);
                    window.style.top = Math.max(0, Math.min(savedPos.top, maxTop)) + 'px';
                }
                if (savedPos.width) {
                    const maxWidth = Math.min(savedPos.width, viewportWidth - 40);
                    window.style.width = maxWidth + 'px';
                }
                if (savedPos.height) {
                    const maxHeight = Math.min(savedPos.height, viewportHeight - taskbarHeight - 40);
                    window.style.height = maxHeight + 'px';
                }
            }
        }
        // Ensure window is in viewport after restore
        this.ensureWindowInViewport(window);
    }
    
    ensureWindowInViewport(window) {
        if (window.classList.contains('maximized')) return;
        
        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const taskbarHeight = 56;
        
        const rect = window.getBoundingClientRect();
        let left = parseInt(window.style.left) || rect.left;
        let top = parseInt(window.style.top) || rect.top;
        let width = parseInt(window.style.width) || rect.width;
        let height = parseInt(window.style.height) || rect.height;
        
        // Constrain width
        if (width > viewportWidth - 40) {
            width = viewportWidth - 40;
            window.style.width = width + 'px';
        }
        
        // Constrain height
        if (height > viewportHeight - taskbarHeight - 40) {
            height = viewportHeight - taskbarHeight - 40;
            window.style.height = height + 'px';
        }
        
        // Constrain position
        if (left < 0) {
            left = 20;
            window.style.left = left + 'px';
        }
        if (left + width > viewportWidth) {
            left = viewportWidth - width - 20;
            window.style.left = left + 'px';
        }
        
        if (top < 0) {
            top = 20;
            window.style.top = top + 'px';
        }
        if (top + height > viewportHeight - taskbarHeight) {
            top = viewportHeight - taskbarHeight - height - 20;
            window.style.top = top + 'px';
        }
    }

    // Trigger lifecycle callback
    triggerCallback(window, callbackName, ...args) {
        const callbacks = this.windowCallbacks.get(window);
        if (callbacks && callbacks[callbackName] && typeof callbacks[callbackName] === 'function') {
            try {
                callbacks[callbackName](window, ...args);
            } catch (error) {
                console.error(`Error in ${callbackName} callback:`, error);
            }
        }
    }

    updateTaskbar() {
        const taskbarWindows = document.getElementById('taskbar-windows');
        taskbarWindows.innerHTML = '';

        this.windows.forEach((window, id) => {
            const isMinimized = window.classList.contains('minimized');
            const isActive = window.classList.contains('active');

            const taskbarWindow = document.createElement('div');
            taskbarWindow.className = `taskbar-window ${isActive ? 'active' : ''}`;
            taskbarWindow.dataset.windowId = id;
            
            const icon = window.querySelector('.window-icon')?.innerHTML || '';
            const title = window.querySelector('.window-title')?.textContent || id;

            taskbarWindow.innerHTML = `
                <div class="taskbar-window-icon">${icon}</div>
                <span>${title}</span>
            `;

            taskbarWindow.addEventListener('click', () => {
                if (isMinimized) {
                    window.classList.remove('minimized');
                }
                this.focusWindow(window);
            });

            taskbarWindows.appendChild(taskbarWindow);
        });

        // Update pinned app icons with running state
        document.querySelectorAll('.taskbar-icon[data-app]').forEach(icon => {
            const appId = icon.dataset.app;
            const isOpen = this.windows.has(appId);
            const isActive = isOpen && Array.from(this.windows.values()).some(w => 
                w.dataset.windowId === appId && w.classList.contains('active')
            );
            
            icon.classList.toggle('running', isOpen);
            icon.classList.toggle('active', isActive);
        });
    }
}

const windowManager = new WindowManager();
if (typeof window !== 'undefined') {
    window.windowManager = windowManager;
}

