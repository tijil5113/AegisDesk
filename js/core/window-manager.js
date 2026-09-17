/**
 * Window Manager — shell windows (create, focus, minimize, close).
 *
 * PERF: Single global resize listener (viewport only). Per-window resize listeners removed:
 * the window div does not fire "resize" on viewport change; only the global window does.
 * z-index stays in the window band so the dock/search/dialogs remain above.
 */
class WindowManager {
    constructor() {
        this.windows = new Map();
        this.zIndexCounter = 200;
        this.zIndexMin = 200;
        this.zIndexMax = 899;
        this.windowPositions = (typeof osStore !== 'undefined' && osStore.initialized)
            ? osStore.getStateSlice('windows') || {}
            : storage.get('windowPositions', {});
        this.saveTimeout = null;
        this.windowCallbacks = new WeakMap();
        this._closeTimers = new WeakMap();

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

    nextZIndex() {
        this.zIndexCounter += 1;
        if (this.zIndexCounter > this.zIndexMax) this.zIndexCounter = this.zIndexMin + 40;
        return this.zIndexCounter;
    }

    taskbarReserve() {
        const raw = getComputedStyle(document.documentElement).getPropertyValue('--aegis-taskbar-height');
        const parsed = parseInt(raw, 10);
        const inset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--aegis-dock-inset'), 10) || 10;
        return (parsed || 56) + inset;
    }

    reducedMotion() {
        return document.documentElement.classList.contains('aegis-reduced-motion')
            || (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    motionMs(full, reduced) {
        return this.reducedMotion() ? (reduced || 1) : full;
    }

    createWindow(appId, config = {}) {
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
            onOpen: config.onOpen || null,
            onFocus: config.onFocus || null,
            onMinimize: config.onMinimize || null,
            onMaximize: config.onMaximize || null,
            onClose: config.onClose || null
        };

        const windowEl = this.buildWindow(defaultConfig);

        this.windowCallbacks.set(windowEl, {
            onOpen: defaultConfig.onOpen,
            onFocus: defaultConfig.onFocus,
            onMinimize: defaultConfig.onMinimize,
            onMaximize: defaultConfig.onMaximize,
            onClose: defaultConfig.onClose
        });

        this.windows.set(appId, windowEl);
        this.addWindowToDOM(windowEl);
        this.setupWindowEvents(windowEl);
        this.restoreWindowPosition(windowEl);
        this.triggerCallback(windowEl, 'onOpen');

        if (typeof userProfile !== 'undefined' && userProfile.initialized) {
            userProfile.recordEvent('app_opened', { appId: appId });
            windowEl.dataset.openTime = Date.now();
        }

        this.focusWindow(windowEl);
        this.updateTaskbar();
        return windowEl;
    }

    buildWindow(config) {
        const windowEl = document.createElement('div');
        windowEl.className = `window ${config.class}`.trim();
        windowEl.dataset.windowId = config.id;
        windowEl.setAttribute('role', 'dialog');
        windowEl.setAttribute('aria-modal', 'false');
        windowEl.setAttribute('aria-label', config.title);
        windowEl.tabIndex = -1;

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const taskbarHeight = this.taskbarReserve();

        const maxWidth = Math.min(config.width, viewportWidth - 40);
        const maxHeight = Math.min(config.height, viewportHeight - taskbarHeight - 40);

        windowEl.style.width = maxWidth + 'px';
        windowEl.style.height = maxHeight + 'px';
        windowEl.style.zIndex = this.nextZIndex();
        windowEl.dataset.minWidth = String(config.minWidth || 300);
        windowEl.dataset.minHeight = String(config.minHeight || 200);

        const savedPos = this.windowPositions[config.id];
        if (savedPos && !savedPos.maximized) {
            const savedLeft = Math.max(0, Math.min(savedPos.left, viewportWidth - maxWidth));
            const savedTop = Math.max(0, Math.min(savedPos.top, viewportHeight - taskbarHeight - maxHeight));
            windowEl.style.left = savedLeft + 'px';
            windowEl.style.top = savedTop + 'px';
        } else {
            const centerX = Math.max(20, (viewportWidth - maxWidth) / 2);
            const centerY = Math.max(20, (viewportHeight - taskbarHeight - maxHeight) / 3);
            windowEl.style.left = centerX + 'px';
            windowEl.style.top = centerY + 'px';
        }

        this.ensureWindowInViewport(windowEl);

        windowEl.innerHTML = `
            <div class="window-titlebar">
                <div class="window-titlebar-left">
                    ${config.icon ? `<div class="window-icon" aria-hidden="true">${config.icon}</div>` : ''}
                    <div class="window-title" id="window-title-${config.id}">${config.title}</div>
                </div>
                <div class="window-titlebar-right">
                    <button type="button" class="window-button minimize" data-action="minimize" aria-label="Minimize">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                    </button>
                    <button type="button" class="window-button maximize" data-action="maximize" aria-label="Maximize">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3"></path>
                        </svg>
                    </button>
                    <button type="button" class="window-button close" data-action="close" aria-label="Close">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18"></line>
                            <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="window-content">${config.content}</div>
            <div class="window-resize-handle nw" aria-hidden="true"></div>
            <div class="window-resize-handle ne" aria-hidden="true"></div>
            <div class="window-resize-handle sw" aria-hidden="true"></div>
            <div class="window-resize-handle se" aria-hidden="true"></div>
            <div class="window-resize-handle n" aria-hidden="true"></div>
            <div class="window-resize-handle s" aria-hidden="true"></div>
            <div class="window-resize-handle e" aria-hidden="true"></div>
            <div class="window-resize-handle w" aria-hidden="true"></div>
        `;

        windowEl.setAttribute('aria-labelledby', `window-title-${config.id}`);
        return windowEl;
    }

    addWindowToDOM(windowEl) {
        document.body.appendChild(windowEl);
        windowEl.style.visibility = 'visible';
        if (!this.reducedMotion()) {
            windowEl.classList.add('aegis-window-enter');
            const clear = () => windowEl.classList.remove('aegis-window-enter');
            windowEl.addEventListener('animationend', clear, { once: true });
            setTimeout(clear, this.motionMs(280, 1));
        }
    }

    setupWindowEvents(windowEl) {
        const titlebar = windowEl.querySelector('.window-titlebar');
        const content = windowEl.querySelector('.window-content');
        const resizeHandles = windowEl.querySelectorAll('.window-resize-handle');
        const buttons = windowEl.querySelectorAll('.window-button');

        dragManager.initDrag(windowEl, titlebar);
        dragManager.initResize(windowEl, resizeHandles);

        windowEl.addEventListener('mousedown', () => this.focusWindow(windowEl));

        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleWindowAction(windowEl, btn.dataset.action);
            });
        });

        content.addEventListener('mousedown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
            e.stopPropagation();
        });

        let snapTimeout;
        windowEl.addEventListener('mouseup', () => {
            clearTimeout(snapTimeout);
            snapTimeout = setTimeout(() => {
                this.ensureWindowInViewport(windowEl);
                this.snapToEdge(windowEl);
            }, 80);
        });
    }

    getSnapZone(clientX, clientY) {
        const edge = 28;
        const vw = window.innerWidth;
        const vh = window.innerHeight - this.taskbarReserve();
        if (clientY <= edge) return 'maximize';
        if (clientX <= edge) return 'left';
        if (clientX >= vw - edge) return 'right';
        return null;
    }

    showSnapPreview(zone) {
        const preview = document.getElementById('aegis-snap-preview');
        if (!preview) return;
        if (!zone) {
            preview.classList.remove('visible');
            return;
        }
        const gap = 8;
        const vw = window.innerWidth;
        const vh = window.innerHeight - this.taskbarReserve();
        if (zone === 'left') {
            preview.style.left = gap + 'px';
            preview.style.top = gap + 'px';
            preview.style.width = (vw / 2 - gap * 1.5) + 'px';
            preview.style.height = (vh - gap * 2) + 'px';
        } else if (zone === 'right') {
            preview.style.left = (vw / 2 + gap / 2) + 'px';
            preview.style.top = gap + 'px';
            preview.style.width = (vw / 2 - gap * 1.5) + 'px';
            preview.style.height = (vh - gap * 2) + 'px';
        } else {
            preview.style.left = gap + 'px';
            preview.style.top = gap + 'px';
            preview.style.width = (vw - gap * 2) + 'px';
            preview.style.height = (vh - gap * 2) + 'px';
        }
        preview.classList.add('visible');
    }

    applySnap(windowEl, zone) {
        if (!zone || windowEl.classList.contains('maximized')) return;
        const vw = window.innerWidth;
        const vh = window.innerHeight - this.taskbarReserve();
        this.saveWindowPosition(windowEl);
        windowEl.classList.add('aegis-geometry-animating');
        if (zone === 'maximize') {
            windowEl.classList.add('maximized');
            this.triggerCallback(windowEl, 'onMaximize', true);
        } else if (zone === 'left') {
            windowEl.style.left = '0px';
            windowEl.style.top = '0px';
            windowEl.style.width = Math.floor(vw / 2) + 'px';
            windowEl.style.height = vh + 'px';
        } else if (zone === 'right') {
            windowEl.style.left = Math.floor(vw / 2) + 'px';
            windowEl.style.top = '0px';
            windowEl.style.width = Math.floor(vw / 2) + 'px';
            windowEl.style.height = vh + 'px';
        }
        setTimeout(() => windowEl.classList.remove('aegis-geometry-animating'), this.motionMs(240, 1));
        this.saveWindowPosition(windowEl);
    }

    snapToEdge(windowEl) {
        if (windowEl.classList.contains('maximized')) return;

        const rect = windowEl.getBoundingClientRect();
        const snapDistance = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight - this.taskbarReserve();

        let newLeft = parseInt(windowEl.style.left, 10);
        let newTop = parseInt(windowEl.style.top, 10);
        let snapped = false;

        if (Math.abs(newLeft) < snapDistance) {
            newLeft = 0;
            snapped = true;
        } else if (Math.abs(newLeft + rect.width - viewportWidth) < snapDistance) {
            newLeft = viewportWidth - rect.width;
            snapped = true;
        }

        if (Math.abs(newTop) < snapDistance) {
            newTop = 0;
            snapped = true;
        } else if (Math.abs(newTop + rect.height - viewportHeight) < snapDistance) {
            newTop = viewportHeight - rect.height;
            snapped = true;
        }

        if (snapped) {
            windowEl.classList.add('aegis-geometry-animating');
            windowEl.style.left = newLeft + 'px';
            windowEl.style.top = newTop + 'px';
            setTimeout(() => {
                windowEl.classList.remove('aegis-geometry-animating');
                this.saveWindowPosition(windowEl);
            }, this.motionMs(200, 1));
        }
    }

    handleWindowAction(windowEl, action) {
        switch (action) {
            case 'minimize':
                this.minimizeWindow(windowEl);
                break;
            case 'maximize':
                this.maximizeWindow(windowEl);
                break;
            case 'close':
                this.closeWindow(windowEl);
                break;
        }
    }

    minimizeWindow(windowEl) {
        windowEl.classList.add('minimizing', 'aegis-window-minimize');
        this.triggerCallback(windowEl, 'onMinimize');
        setTimeout(() => {
            windowEl.classList.remove('minimizing', 'aegis-window-minimize', 'active');
            windowEl.classList.add('minimized', 'inactive');
            this.updateTaskbar();
        }, this.motionMs(220, 1));
    }

    maximizeWindow(windowEl) {
        const isMaximized = windowEl.classList.contains('maximized');
        windowEl.classList.add('aegis-geometry-animating');
        if (isMaximized) {
            windowEl.classList.remove('maximized');
            const savedPos = this.windowPositions[windowEl.dataset.windowId];
            if (savedPos) {
                windowEl.style.left = savedPos.left + 'px';
                windowEl.style.top = savedPos.top + 'px';
                windowEl.style.width = savedPos.width + 'px';
                windowEl.style.height = savedPos.height + 'px';
            }
            this.triggerCallback(windowEl, 'onMaximize', false);
        } else {
            this.saveWindowPosition(windowEl);
            windowEl.classList.add('maximized');
            this.triggerCallback(windowEl, 'onMaximize', true);
        }
        this.ensureWindowInViewport(windowEl);
        setTimeout(() => windowEl.classList.remove('aegis-geometry-animating'), this.motionMs(240, 1));
        this.focusWindow(windowEl);
    }

    focusWindow(windowEl) {
        if (!windowEl) return;
        const wasMinimized = windowEl.classList.contains('minimized');
        windowEl.style.zIndex = this.nextZIndex();

        this.windows.forEach(w => {
            w.classList.remove('active');
            w.classList.add('inactive');
        });
        windowEl.classList.add('active');
        windowEl.classList.remove('inactive');
        if (wasMinimized) {
            windowEl.classList.remove('minimized');
            if (!this.reducedMotion()) {
                windowEl.classList.add('aegis-window-restore');
                const clear = () => windowEl.classList.remove('aegis-window-restore');
                windowEl.addEventListener('animationend', clear, { once: true });
                setTimeout(clear, this.motionMs(260, 1));
            }
        }

        const maxBtn = windowEl.querySelector('.window-button.maximize');
        if (maxBtn) {
            maxBtn.setAttribute('aria-label', windowEl.classList.contains('maximized') ? 'Restore' : 'Maximize');
        }

        this.triggerCallback(windowEl, 'onFocus');
        this.updateTaskbar();
    }

    closeWindow(windowEl) {
        const windowId = windowEl.dataset.windowId;

        if (typeof userProfile !== 'undefined' && userProfile.initialized) {
            const openTime = windowEl.dataset.openTime ? parseInt(windowEl.dataset.openTime, 10) : null;
            const duration = openTime ? Math.floor((Date.now() - openTime) / 1000 / 60) : 0;
            userProfile.recordEvent('app_closed', {
                appId: windowId,
                duration: duration
            });
        }

        this.triggerCallback(windowEl, 'onClose');
        this.saveWindowPosition(windowEl);
        windowEl.classList.add('window-closing', 'aegis-window-exit');
        windowEl.setAttribute('aria-hidden', 'true');
        this.showSnapPreview(null);

        const remaining = [];
        this.windows.forEach((w, id) => {
            if (id !== windowId && !w.classList.contains('minimized')) remaining.push(w);
        });

        const finish = () => {
            if (!windowEl.parentNode) return;
            windowEl.remove();
            this.windows.delete(windowId);
            this.windowCallbacks.delete(windowEl);
            this.updateTaskbar();
            if (remaining.length) this.focusWindow(remaining[remaining.length - 1]);
        };

        const existing = this._closeTimers.get(windowEl);
        if (existing) clearTimeout(existing);
        const timer = setTimeout(finish, this.motionMs(180, 1));
        this._closeTimers.set(windowEl, timer);
    }

    saveWindowPosition(windowEl) {
        if (!windowEl || !windowEl.dataset.windowId) return;

        const windowId = windowEl.dataset.windowId;

        if (windowEl.classList.contains('maximized')) {
            this.windowPositions[windowId] = {
                ...this.windowPositions[windowId],
                maximized: true
            };
        } else {
            const rect = windowEl.getBoundingClientRect();
            const left = parseInt(windowEl.style.left, 10) || rect.left;
            const top = parseInt(windowEl.style.top, 10) || rect.top;

            this.windowPositions[windowId] = {
                left: Math.max(0, left),
                top: Math.max(0, top),
                width: rect.width,
                height: rect.height,
                maximized: false
            };
        }

        clearTimeout(this.saveTimeout);
        this.saveTimeout = setTimeout(() => {
            if (typeof osStore !== 'undefined' && osStore.initialized) {
                osStore.dispatch({
                    type: 'WINDOWS_UPDATE',
                    payload: this.windowPositions
                });
            } else {
                storage.set('windowPositions', this.windowPositions);
            }
        }, 300);
    }

    restoreWindowPosition(windowEl) {
        const savedPos = this.windowPositions[windowEl.dataset.windowId];
        if (savedPos) {
            if (savedPos.maximized) {
                windowEl.classList.add('maximized');
            } else {
                const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
                const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
                const taskbarHeight = this.taskbarReserve();

                if (savedPos.left !== undefined) {
                    const maxLeft = viewportWidth - (savedPos.width || parseInt(windowEl.style.width, 10) || 500);
                    windowEl.style.left = Math.max(0, Math.min(savedPos.left, maxLeft)) + 'px';
                }
                if (savedPos.top !== undefined) {
                    const maxTop = viewportHeight - taskbarHeight - (savedPos.height || parseInt(windowEl.style.height, 10) || 500);
                    windowEl.style.top = Math.max(0, Math.min(savedPos.top, maxTop)) + 'px';
                }
                if (savedPos.width) {
                    const maxWidth = Math.min(savedPos.width, viewportWidth - 40);
                    windowEl.style.width = maxWidth + 'px';
                }
                if (savedPos.height) {
                    const maxHeight = Math.min(savedPos.height, viewportHeight - taskbarHeight - 40);
                    windowEl.style.height = maxHeight + 'px';
                }
            }
        }
        this.ensureWindowInViewport(windowEl);
    }

    ensureWindowInViewport(windowEl) {
        if (!windowEl || windowEl.classList.contains('maximized')) return;

        const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
        const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
        const taskbarHeight = this.taskbarReserve();

        const rect = windowEl.getBoundingClientRect();
        let left = parseInt(windowEl.style.left, 10) || rect.left;
        let top = parseInt(windowEl.style.top, 10) || rect.top;
        let width = parseInt(windowEl.style.width, 10) || rect.width;
        let height = parseInt(windowEl.style.height, 10) || rect.height;

        if (width > viewportWidth - 40) {
            width = viewportWidth - 40;
            windowEl.style.width = width + 'px';
        }
        if (height > viewportHeight - taskbarHeight - 40) {
            height = viewportHeight - taskbarHeight - 40;
            windowEl.style.height = height + 'px';
        }
        if (left < 0) {
            left = 20;
            windowEl.style.left = left + 'px';
        }
        if (left + width > viewportWidth) {
            left = Math.max(8, viewportWidth - width - 20);
            windowEl.style.left = left + 'px';
        }
        if (top < 0) {
            top = 20;
            windowEl.style.top = top + 'px';
        }
        if (top + height > viewportHeight - taskbarHeight) {
            top = Math.max(8, viewportHeight - taskbarHeight - height - 20);
            windowEl.style.top = top + 'px';
        }
    }

    triggerCallback(windowEl, callbackName, ...args) {
        const callbacks = this.windowCallbacks.get(windowEl);
        if (callbacks && callbacks[callbackName] && typeof callbacks[callbackName] === 'function') {
            try {
                callbacks[callbackName](windowEl, ...args);
            } catch (error) {
                console.error(`Error in ${callbackName} callback:`, error);
            }
        }
    }

    updateTaskbar() {
        const taskbarWindows = document.getElementById('taskbar-windows');
        if (!taskbarWindows) return;
        taskbarWindows.innerHTML = '';

        this.windows.forEach((windowEl, id) => {
            const isMinimized = windowEl.classList.contains('minimized');
            const isActive = windowEl.classList.contains('active') && !isMinimized;

            const taskbarWindow = document.createElement('button');
            taskbarWindow.type = 'button';
            taskbarWindow.className = `taskbar-window ${isActive ? 'active' : ''} ${isMinimized ? 'minimized' : ''}`;
            taskbarWindow.dataset.windowId = id;
            taskbarWindow.setAttribute('aria-pressed', isActive ? 'true' : 'false');

            const icon = windowEl.querySelector('.window-icon')?.innerHTML || '';
            const title = windowEl.querySelector('.window-title')?.textContent || id;
            taskbarWindow.setAttribute('aria-label', isMinimized ? `Restore ${title}` : `Focus ${title}`);

            taskbarWindow.innerHTML = `
                <div class="taskbar-window-icon" aria-hidden="true">${icon}</div>
                <span>${title}</span>
            `;

            taskbarWindow.addEventListener('click', () => {
                if (isMinimized || !isActive) {
                    this.focusWindow(windowEl);
                } else {
                    this.minimizeWindow(windowEl);
                }
            });

            taskbarWindows.appendChild(taskbarWindow);
        });

        document.querySelectorAll('.taskbar-icon[data-app]').forEach(icon => {
            const appId = icon.dataset.app;
            const win = this.windows.get(appId);
            const isOpen = !!win;
            const isMinimized = isOpen && win.classList.contains('minimized');
            const isActive = isOpen && win.classList.contains('active') && !isMinimized;

            icon.classList.toggle('running', isOpen);
            icon.classList.toggle('minimized', isMinimized);
            icon.classList.toggle('active', isActive);
        });
    }
}

const windowManager = new WindowManager();
if (typeof window !== 'undefined') {
    window.windowManager = windowManager;
}
