/**
 * Shared authentication UI helpers for Login and Sign-Up.
 */
(function () {
    'use strict';

    const AUTH_FLAG = 'aegisdesk_auth_ok';
    const CURRENT_SESSION_KEY = 'aegisdesk_current_session';
    const SESSIONS_KEY = 'aegisdesk_sessions';
    const SESSION_PENDING_KEY = 'aegisdesk_session_pending';
    const LAST_ROUTE_KEY = 'aegisdesk_last_route';
    const PROFILE_KEY = 'aegisdesk_account_profile';

    function setStatus(el, message, type) {
        if (!el) return;
        el.textContent = message || '';
        el.className = 'auth-status' + (type ? ' ' + type : '');
    }

    function setBusy(btn, busy) {
        if (!btn) return;
        btn.disabled = !!busy;
        btn.classList.toggle('is-loading', !!busy);
        btn.setAttribute('aria-busy', busy ? 'true' : 'false');
    }

    function rememberLocalSession(user) {
        const sessionId = 'AEGIS-ACCT-' + String(user && user.id ? user.id : Date.now()).replace(/-/g, '').slice(0, 8).toUpperCase();
        let sessions = {};
        try { sessions = JSON.parse(localStorage.getItem(SESSIONS_KEY) || '{}'); } catch (_) { sessions = {}; }
        sessions[sessionId] = {
            email: user && user.email,
            displayName: user && user.displayName,
            createdAt: Date.now(),
            lastActiveAt: Date.now(),
            kind: 'account'
        };
        localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
        localStorage.setItem(CURRENT_SESSION_KEY, sessionId);
        localStorage.setItem(SESSION_PENDING_KEY, 'false');
        localStorage.setItem(AUTH_FLAG, '1');
        try { localStorage.setItem(PROFILE_KEY, JSON.stringify({ email: user.email, displayName: user.displayName, id: user.id })); } catch (_) {}
        return sessionId;
    }

    function bindToggle(button, input) {
        if (!button || !input) return;
        button.addEventListener('click', function () {
            const show = input.type === 'password';
            input.type = show ? 'text' : 'password';
            button.textContent = show ? 'Hide' : 'Show';
            button.setAttribute('aria-pressed', show ? 'true' : 'false');
            button.setAttribute('aria-label', show ? 'Hide password' : 'Show password');
        });
    }

    async function readJson(response) {
        try { return await response.json(); } catch (_) { return {}; }
    }

    async function fetchSession() {
        try {
            const response = await fetch('/api/auth/session', { credentials: 'same-origin' });
            return await readJson(response);
        } catch (_) {
            return { ok: false, authenticated: false };
        }
    }

    function goDesktop() {
        const last = localStorage.getItem(LAST_ROUTE_KEY) || 'desktop.html';
        window.location.href = last.indexOf('desktop') >= 0 ? last : 'desktop.html';
    }

    window.AegisAuthUI = {
        AUTH_FLAG,
        CURRENT_SESSION_KEY,
        SESSIONS_KEY,
        setStatus,
        setBusy,
        rememberLocalSession,
        bindToggle,
        readJson,
        fetchSession,
        goDesktop,
        async logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: '{}' });
            } catch (_) { /* offline */ }
            try {
                localStorage.removeItem(AUTH_FLAG);
                localStorage.removeItem(CURRENT_SESSION_KEY);
                localStorage.removeItem(SESSION_PENDING_KEY);
                localStorage.removeItem(PROFILE_KEY);
            } catch (_) {}
            window.location.href = 'login.html';
        }
    };
})();
