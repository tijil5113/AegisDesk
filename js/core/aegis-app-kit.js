/**
 * Shared AegisDesk application chrome helpers — Spec 2
 * Empty / loading / error markup and iframe page-app launcher.
 */
(function (global) {
    'use strict';

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    function emptyState(title, body, actionLabel, actionAttr) {
        const action = actionLabel
            ? `<button type="button" class="aegis-btn aegis-btn-primary" ${actionAttr || ''}>${escapeHtml(actionLabel)}</button>`
            : '';
        return `<div class="aegis-empty aegis-app-empty" role="status">
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(body)}</p>
            ${action}
        </div>`;
    }

    function loadingState(label) {
        return `<div class="aegis-loading aegis-app-loading" role="status" aria-live="polite">
            <div class="aegis-progress" aria-hidden="true"></div>
            <strong>${escapeHtml(label || 'Loading')}</strong>
        </div>`;
    }

    function errorState(title, body, actionLabel, actionAttr) {
        const action = actionLabel
            ? `<button type="button" class="aegis-btn" ${actionAttr || ''}>${escapeHtml(actionLabel)}</button>`
            : '';
        return `<div class="aegis-error aegis-app-error" role="alert">
            <strong>${escapeHtml(title)}</strong>
            <p>${escapeHtml(body)}</p>
            ${action}
        </div>`;
    }

    function toolbar(title, controlsHtml) {
        return `<header class="aegis-app-header">
            <div class="aegis-app-title-block">
                <h2 class="aegis-app-title">${escapeHtml(title)}</h2>
            </div>
            <div class="aegis-app-toolbar">${controlsHtml || ''}</div>
        </header>`;
    }

    function openIframeApp(windowId, options) {
        const opts = options || {};
        if (typeof windowManager === 'undefined') {
            global.location.href = opts.src;
            return null;
        }
        const existing = windowManager.windows.get(windowId);
        if (existing) {
            windowManager.focusWindow(existing);
            return existing;
        }
        const title = opts.title || 'AegisDesk';
        const src = opts.src;
        const icon = (global.AEGIS_APP_ICONS && opts.iconId && global.AEGIS_APP_ICONS[opts.iconId])
            || opts.icon
            || '';
        return windowManager.createWindow(windowId, {
            title,
            width: opts.width || 1100,
            height: opts.height || 740,
            class: opts.className || 'app-iframe',
            icon,
            content: `<div class="aegis-iframe-shell"><iframe src="${escapeHtml(src)}" title="${escapeHtml(title)}"></iframe></div>`
        });
    }

    global.AegisAppKit = {
        escapeHtml,
        emptyState,
        loadingState,
        errorState,
        toolbar,
        openIframeApp
    };
})(typeof window !== 'undefined' ? window : globalThis);
