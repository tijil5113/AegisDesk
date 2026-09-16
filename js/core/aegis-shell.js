/**
 * AegisDesk OS shell helpers — Spec 1.
 * Theme boot, desktop context menu, launcher filter, snap preview, dialogs.
 * Does not replace window-manager, desktop, or app registry.
 */
(function (global) {
    'use strict';

    var MARK_SVG =
        '<svg viewBox="0 0 64 64" fill="none" aria-hidden="true">' +
        '<circle class="aegis-mark-ring" cx="32" cy="32" r="27" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" pathLength="100" stroke-dasharray="88 12" stroke-dashoffset="6"/>' +
        '<path class="aegis-mark-leg" d="M32 14 L18.5 50" stroke="#F8FAFC" stroke-width="3.6" stroke-linecap="round"/>' +
        '<path class="aegis-mark-leg" d="M32 14 L45.5 50" stroke="#F8FAFC" stroke-width="3.6" stroke-linecap="round"/>' +
        '<path class="aegis-mark-slit" d="M23.5 36.8 H40.5" stroke="#38BDF8" stroke-width="2.8" stroke-linecap="round"/>' +
        '</svg>';

    function prefersReducedMotion() {
        return !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches);
    }

    function applyBootClasses() {
        var root = document.documentElement;
        if (prefersReducedMotion()) root.classList.add('aegis-reduced-motion');
        try {
            var raw = localStorage.getItem('aegisdesk_theme');
            if (!raw) return;
            var theme = JSON.parse(raw);
            if (typeof theme === 'string') {
                root.setAttribute('data-aegis-theme', theme);
                if (theme === 'light') root.classList.add('theme-light');
            }
        } catch (e) { /* ignore corrupt theme cache */ }
    }

    applyBootClasses();

    function clampMenu(el, x, y) {
        var pad = 8;
        var w = el.offsetWidth || 220;
        var h = el.offsetHeight || 160;
        var left = Math.min(Math.max(pad, x), window.innerWidth - w - pad);
        var top = Math.min(Math.max(pad, y), window.innerHeight - h - pad);
        el.style.left = left + 'px';
        el.style.top = top + 'px';
    }

    function hideDesktopMenu() {
        var menu = document.getElementById('aegis-desktop-menu');
        if (!menu) return;
        menu.classList.remove('visible');
        menu.setAttribute('aria-hidden', 'true');
    }

    function menuItems(menu) {
        return Array.prototype.slice.call(menu.querySelectorAll('.aegis-menu-item:not([aria-disabled="true"])'));
    }

    function ensureDesktopMenu() {
        var existing = document.getElementById('aegis-desktop-menu');
        if (existing) return existing;
        var menu = document.createElement('div');
        menu.id = 'aegis-desktop-menu';
        menu.className = 'aegis-context-menu aegis-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-hidden', 'true');
        menu.innerHTML =
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-launcher">Open Applications</button>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-search">Search</button>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-intel">Aegis Intelligence</button>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-spaces">Spaces</button>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-layout">Window layouts</button>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="layout-columns">Two-column layout</button>' +
            '<div class="aegis-menu-sep"></div>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-notes">New Note</button>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-tasks">New Task</button>' +
            '<div class="aegis-menu-sep"></div>' +
            '<button class="aegis-menu-item" role="menuitem" data-aegis-action="open-theme">Change Theme</button>';
        document.body.appendChild(menu);
        menu.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-aegis-action]');
            if (!btn) return;
            e.preventDefault();
            e.stopPropagation();
            var action = btn.getAttribute('data-aegis-action');
            hideDesktopMenu();
            if (action === 'open-launcher') {
                var apps = document.getElementById('apps-menu');
                if (apps) {
                    apps.classList.add('visible');
                    apps.setAttribute('aria-hidden', 'false');
                    var input = document.getElementById('launcher-search-input');
                    if (input) input.focus();
                }
            } else if (action === 'open-search' && global.globalSearch) {
                global.globalSearch.show();
            } else if (action === 'open-intel' && global.AegisIntelligence) {
                global.AegisIntelligence.show();
            } else if (action === 'open-spaces' && global.virtualDesktops && virtualDesktops.showOverview) {
                virtualDesktops.showOverview();
            } else if (action === 'open-focus' && global.AegisFocus) {
                AegisFocus.toggle();
            } else if (action === 'open-layout' && global.AegisLayouts) {
                AegisLayouts.showPicker();
            } else if (action === 'open-notes' && global.desktop) {
                global.desktop.openApp('notes');
            } else if (action === 'open-tasks' && global.desktop) {
                global.desktop.openApp('tasks');
            } else if (action === 'open-theme' && global.themeSystem) {
                global.themeSystem.showThemePanel();
            }
        });
        menu.addEventListener('keydown', function (e) {
            var items = menuItems(menu);
            if (!items.length) return;
            var idx = items.indexOf(document.activeElement);
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                items[(idx + 1) % items.length].focus();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                items[(idx - 1 + items.length) % items.length].focus();
            } else if (e.key === 'Home') {
                e.preventDefault();
                items[0].focus();
            } else if (e.key === 'End') {
                e.preventDefault();
                items[items.length - 1].focus();
            } else if (e.key === 'Escape') {
                hideDesktopMenu();
            }
        });
        return menu;
    }

    function positionExistingMenus(menu, x, y) {
        if (!menu) return;
        menu.style.position = 'fixed';
        menu.style.left = x + 'px';
        menu.style.top = y + 'px';
        requestAnimationFrame(function () {
            clampMenu(menu, x, y);
        });
    }

    function closeDialog() {
        var overlay = document.getElementById('aegis-dialog-overlay');
        if (!overlay) return;
        overlay.classList.remove('visible');
        overlay.setAttribute('aria-hidden', 'true');
        var prev = overlay._aegisPrevFocus;
        if (prev && typeof prev.focus === 'function') prev.focus();
    }

    function dialog(options) {
        options = options || {};
        var overlay = document.getElementById('aegis-dialog-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'aegis-dialog-overlay';
            overlay.className = 'aegis-dialog-overlay';
            overlay.setAttribute('role', 'presentation');
            overlay.innerHTML =
                '<div class="aegis-dialog" role="dialog" aria-modal="true" aria-labelledby="aegis-dialog-title">' +
                '<h2 id="aegis-dialog-title" class="aegis-type-section"></h2>' +
                '<p id="aegis-dialog-body" class="aegis-type-secondary"></p>' +
                '<div class="aegis-dialog-actions">' +
                '<button type="button" class="aegis-btn aegis-btn-ghost" data-aegis-dialog="cancel">Cancel</button>' +
                '<button type="button" class="aegis-btn" data-aegis-dialog="confirm">Confirm</button>' +
                '</div></div>';
            document.body.appendChild(overlay);
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay && overlay.dataset.dismissible === 'true') closeDialog();
            });
            overlay.addEventListener('keydown', function (e) {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    closeDialog();
                }
            });
        }
        overlay._aegisPrevFocus = document.activeElement;
        overlay.querySelector('#aegis-dialog-title').textContent = options.title || 'Confirm';
        overlay.querySelector('#aegis-dialog-body').textContent = options.body || '';
        overlay.dataset.dismissible = options.dismissible === false ? 'false' : 'true';
        var confirmBtn = overlay.querySelector('[data-aegis-dialog="confirm"]');
        var cancelBtn = overlay.querySelector('[data-aegis-dialog="cancel"]');
        confirmBtn.textContent = options.confirmLabel || 'Confirm';
        confirmBtn.className = 'aegis-btn ' + (options.danger ? 'aegis-btn-danger' : 'aegis-btn-primary');
        cancelBtn.onclick = function () { closeDialog(); };
        confirmBtn.onclick = function () {
            closeDialog();
            if (typeof options.onConfirm === 'function') options.onConfirm();
        };
        overlay.classList.add('visible');
        overlay.setAttribute('aria-hidden', 'false');
        confirmBtn.focus();
    }

    function initLauncher() {
        var launcherInput = document.getElementById('launcher-search-input');
        var grid = document.getElementById('apps-grid');
        var menu = document.getElementById('apps-menu');
        if (launcherInput && grid) {
            launcherInput.addEventListener('input', function () {
                var q = launcherInput.value.trim().toLowerCase();
                var tiles = grid.querySelectorAll('.app-tile');
                var visible = 0;
                tiles.forEach(function (tile) {
                    var name = (tile.querySelector('.app-tile-name')?.textContent || tile.dataset.app || '').toLowerCase();
                    var show = !q || name.indexOf(q) !== -1 || (tile.dataset.app || '').indexOf(q) !== -1;
                    tile.hidden = !show;
                    if (show) visible += 1;
                });
                var empty = grid.querySelector('.aegis-launcher-empty');
                if (!q) {
                    if (empty) empty.remove();
                    return;
                }
                if (visible === 0) {
                    if (!empty) {
                        empty = document.createElement('div');
                        empty.className = 'aegis-empty aegis-launcher-empty';
                        empty.innerHTML = '<strong>No matching apps</strong><span>Try another name. Mail and Music stay in the full list.</span>';
                        grid.appendChild(empty);
                    }
                } else if (empty) {
                    empty.remove();
                }
            });
            launcherInput.addEventListener('keydown', function (e) {
                if (e.key !== 'ArrowDown') return;
                var first = grid.querySelector('.app-tile:not([hidden])');
                if (first) {
                    e.preventDefault();
                    first.focus();
                }
            });
        }
        if (menu) {
            menu.setAttribute('aria-modal', 'true');
            if (!menu.classList.contains('visible')) menu.setAttribute('aria-hidden', 'true');
        }
    }

    function initShell() {
        ensureDesktopMenu();
        initLauncher();

        var wallpaper = document.querySelector('.desktop-background');
        if (wallpaper) wallpaper.classList.add('aegis-wallpaper');

        document.addEventListener('contextmenu', function (e) {
            var existing = e.target.closest('.window, .taskbar, .apps-menu, .global-search-overlay, .notification-center-panel, input, textarea, [contenteditable="true"]');
            if (existing) return;
            e.preventDefault();
            var menu = ensureDesktopMenu();
            menu.classList.add('visible');
            menu.setAttribute('aria-hidden', 'false');
            positionExistingMenus(menu, e.clientX, e.clientY);
            var first = menu.querySelector('.aegis-menu-item');
            if (first) first.focus();
        });

        document.addEventListener('click', function (e) {
            var menu = document.getElementById('aegis-desktop-menu');
            if (menu && !menu.contains(e.target)) hideDesktopMenu();
        });

        document.addEventListener('keydown', function (e) {
            if (e.key !== 'Escape') return;
            hideDesktopMenu();
            closeDialog();
            document.querySelectorAll('.files-context-menu, .file-context-menu, .mail-context-menu, .bookmarks-context-menu, .calendar-context-menu, .album-context-menu').forEach(function (el) {
                el.style.display = 'none';
                el.classList.remove('visible');
            });
        });

        var snap = document.getElementById('aegis-snap-preview');
        if (!snap) {
            snap = document.createElement('div');
            snap.id = 'aegis-snap-preview';
            snap.setAttribute('aria-hidden', 'true');
            document.body.appendChild(snap);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initShell);
    } else {
        initShell();
    }

    global.aegisShell = {
        prefersReducedMotion: prefersReducedMotion,
        clampMenu: clampMenu,
        hideDesktopMenu: hideDesktopMenu,
        positionMenu: positionExistingMenus,
        markSVG: MARK_SVG,
        dialog: dialog,
        closeDialog: closeDialog
    };
})(typeof window !== 'undefined' ? window : this);
