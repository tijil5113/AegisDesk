/**
 * Aegis Experience System 2.0 — runtime glue.
 * Wallpaper, icon family, dock menu, launcher environment, auth enter.
 * Does not replace window-manager, desktop, or auth contracts.
 */
(function (global) {
    'use strict';

    var WALLPAPER_KEY = 'aegis_wallpaper';
    var WALLPAPERS = ['aurora', 'midnight', 'atmosphere', 'horizon', 'obsidian', 'celestial', 'light-field'];

    function reduced() {
        return document.documentElement.classList.contains('aegis-reduced-motion')
            || !!(global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches)
            || document.body.classList.contains('performance-mode');
    }

    function currentWallpaper() {
        try {
            var stored = localStorage.getItem(WALLPAPER_KEY);
            if (stored && WALLPAPERS.indexOf(stored) >= 0) return stored;
        } catch (e) { /* ignore */ }
        return document.documentElement.classList.contains('theme-light') ? 'light-field' : 'aurora';
    }

    function applyWallpaper(id) {
        var name = WALLPAPERS.indexOf(id) >= 0 ? id : 'aurora';
        var el = document.querySelector('.desktop-background');
        if (!el) return name;
        el.setAttribute('data-wallpaper', name);
        el.classList.add('aegis-wallpaper');
        if (!reduced() && name !== 'obsidian') el.classList.add('aegis-wallpaper-live');
        else el.classList.remove('aegis-wallpaper-live');
        try { localStorage.setItem(WALLPAPER_KEY, name); } catch (e) { /* ignore */ }
        document.dispatchEvent(new CustomEvent('aegiswallpaperchange', { detail: { wallpaper: name } }));
        return name;
    }

    function pauseWallpaper(on) {
        document.documentElement.classList.toggle('aegis-wallpaper-paused', !!on);
    }

    function iconFor(id) {
        var icons = global.AEGIS_APP_ICONS || {};
        return icons[id] || '';
    }

    function applyFamilyIcons() {
        var icons = global.AEGIS_APP_ICONS;
        if (!icons) return;
        document.querySelectorAll('.taskbar-icon[data-app], .taskbar-app-icon[data-app]').forEach(function (btn) {
            var id = btn.getAttribute('data-app');
            var svg = icons[id];
            if (!svg) return;
            var existing = btn.querySelector('svg');
            var label = btn.querySelector('.taskbar-icon-label');
            btn.innerHTML = svg + (label ? label.outerHTML : '');
            if (existing && btn.querySelector('svg')) {
                btn.querySelector('svg').setAttribute('width', '26');
                btn.querySelector('svg').setAttribute('height', '26');
            }
        });
        var launcher = document.querySelector('[data-action="show-apps-menu"]');
        if (launcher) {
            launcher.innerHTML = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" aria-hidden="true">' +
                '<rect x="4" y="4" width="6.5" height="6.5" rx="1.6" stroke="#F8FAFC" stroke-width="1.6"/>' +
                '<rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6" stroke="#F8FAFC" stroke-width="1.6"/>' +
                '<rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6" stroke="#F8FAFC" stroke-width="1.6"/>' +
                '<rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6" fill="#3EC6D8"/>' +
                '</svg>';
        }
        document.querySelectorAll('#apps-grid .app-tile[data-app]').forEach(function (tile) {
            var id = tile.getAttribute('data-app');
            var svg = icons[id];
            var slot = tile.querySelector('.app-tile-icon');
            if (svg && slot) slot.innerHTML = svg;
        });
    }

    function hideDockMenu() {
        var menu = document.getElementById('aegis-dock-menu');
        if (!menu) return;
        menu.classList.remove('visible');
        menu.setAttribute('aria-hidden', 'true');
    }

    function dockMenu() {
        var menu = document.getElementById('aegis-dock-menu');
        if (menu) return menu;
        menu = document.createElement('div');
        menu.id = 'aegis-dock-menu';
        menu.className = 'aegis-context-menu aegis-menu';
        menu.setAttribute('role', 'menu');
        menu.setAttribute('aria-hidden', 'true');
        document.body.appendChild(menu);
        menu.addEventListener('click', function (e) {
            var btn = e.target.closest('[data-dock-action]');
            if (!btn) return;
            var action = btn.getAttribute('data-dock-action');
            var appId = menu.getAttribute('data-app');
            hideDockMenu();
            if (!appId) return;
            if (action === 'open' && global.desktop && desktop.openApp) desktop.openApp(appId);
            if (action === 'show' && global.windowManager && windowManager.windows && windowManager.windows.has(appId)) {
                windowManager.focusWindow(windowManager.windows.get(appId));
            }
            if (action === 'close' && global.windowManager && windowManager.windows && windowManager.windows.has(appId)) {
                windowManager.closeWindow(windowManager.windows.get(appId));
            }
        });
        return menu;
    }

    function showDockMenu(appId, x, y) {
        if (!appId) return;
        var menu = dockMenu();
        var running = !!(global.windowManager && windowManager.windows && windowManager.windows.has(appId));
        var title = (global.APP_REGISTRY && APP_REGISTRY[appId] && APP_REGISTRY[appId].title) || appId;
        menu.setAttribute('data-app', appId);
        menu.innerHTML =
            '<button class="aegis-menu-item" role="menuitem" data-dock-action="open">Open ' + title + '</button>' +
            (running ? '<button class="aegis-menu-item" role="menuitem" data-dock-action="show">Show window</button>' : '') +
            (running ? '<button class="aegis-menu-item" role="menuitem" data-dock-action="close">Close</button>' : '');
        menu.classList.add('visible');
        menu.setAttribute('aria-hidden', 'false');
        if (global.aegisShell && aegisShell.positionMenu) aegisShell.positionMenu(menu, x, y);
        else {
            menu.style.position = 'fixed';
            menu.style.left = x + 'px';
            menu.style.top = y + 'px';
        }
    }

    function bindDock() {
        var taskbar = document.querySelector('.taskbar');
        if (!taskbar || taskbar._aegisDockBound) return;
        taskbar._aegisDockBound = true;
        taskbar.addEventListener('contextmenu', function (e) {
            var icon = e.target.closest('[data-app]');
            if (!icon) return;
            e.preventDefault();
            e.stopPropagation();
            showDockMenu(icon.getAttribute('data-app'), e.clientX, e.clientY);
        });
        document.addEventListener('click', function (e) {
            var menu = document.getElementById('aegis-dock-menu');
            if (menu && !menu.contains(e.target)) hideDockMenu();
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') hideDockMenu();
        });
    }

    function bindLauncher() {
        var menu = document.getElementById('apps-menu');
        if (!menu || menu._aegisEnvBound) return;
        menu._aegisEnvBound = true;
        var sync = function () {
            document.body.classList.toggle('aegis-launcher-open', menu.classList.contains('visible'));
        };
        var obs = new MutationObserver(sync);
        obs.observe(menu, { attributes: true, attributeFilter: ['class'] });
        sync();
    }

    function authEnter() {
        try {
            if (sessionStorage.getItem('aegis_auth_enter') !== '1') return;
            sessionStorage.removeItem('aegis_auth_enter');
        } catch (e) { return; }
        if (reduced()) return;
        document.body.classList.add('aegis-auth-enter');
        setTimeout(function () { document.body.classList.remove('aegis-auth-enter'); }, 900);
    }

    function visibility() {
        document.addEventListener('visibilitychange', function () {
            pauseWallpaper(document.hidden);
        });
    }

    function init() {
        applyWallpaper(currentWallpaper());
        applyFamilyIcons();
        bindDock();
        bindLauncher();
        authEnter();
        visibility();
        requestAnimationFrame(applyFamilyIcons);
        setTimeout(applyFamilyIcons, 800);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();

    global.AegisExperience = {
        wallpapers: WALLPAPERS,
        applyWallpaper: applyWallpaper,
        currentWallpaper: currentWallpaper,
        applyFamilyIcons: applyFamilyIcons,
        showDockMenu: showDockMenu
    };
})(typeof window !== 'undefined' ? window : this);
