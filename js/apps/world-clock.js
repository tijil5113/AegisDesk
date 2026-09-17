/**
 * World Clock application and compact system panel.
 */
(function (global) {
    'use strict';

    function escapeHtml(value) {
        return String(value == null ? '' : value)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function analog(clock) {
        var hour = ((clock.hour % 12) + clock.minute / 60) * 30;
        var minute = clock.minute * 6;
        return '<svg class="wc-analog" viewBox="0 0 40 40" aria-hidden="true">' +
            '<circle cx="20" cy="20" r="18" fill="none" stroke="currentColor" stroke-width="1.4" opacity="0.35"/>' +
            '<line x1="20" y1="20" x2="20" y2="10" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" transform="rotate(' + hour + ' 20 20)"/>' +
            '<line x1="20" y1="20" x2="20" y2="7" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" opacity="0.7" transform="rotate(' + minute + ' 20 20)"/>' +
            '<circle cx="20" cy="20" r="1.6" fill="currentColor"/>' +
            '</svg>';
    }

    function card(clock, compact) {
            var day = clock.phase || (clock.isDay ? 'day' : 'night');
            var phaseClass = 'is-' + day;
            return '<article class="wc-card ' + phaseClass + (compact ? ' wc-card-compact' : '') + '" data-id="' + escapeHtml(clock.id) + '">' +
            '<div class="wc-card-top">' +
            '<div><strong>' + escapeHtml(clock.city) + '</strong><span>' + escapeHtml(clock.country) + '</span></div>' +
            analog(clock) +
            '<span class="wc-phase" aria-hidden="true">' + escapeHtml(day) + '</span>' +
            '</div>' +
            '<div class="wc-time" data-time>' + escapeHtml(clock.time) + '</div>' +
            '<div class="wc-meta"><span data-date>' + escapeHtml((clock.weekday || '') + (clock.weekday ? ' · ' : '') + (clock.relative || clock.offset || '')) + '</span></div>' +
            (compact ? '' : '<div class="wc-actions">' +
                '<button type="button" class="aegis-btn aegis-btn-ghost" data-wc="up" aria-label="Move up">Up</button>' +
                '<button type="button" class="aegis-btn aegis-btn-ghost" data-wc="down" aria-label="Move down">Down</button>' +
                '<button type="button" class="aegis-btn aegis-btn-ghost" data-wc="remove">Remove</button>' +
            '</div>') +
            '</article>';
    }

    function WorldClockApp() {
        this.windowId = 'world-clock';
        this.unsubscribe = null;
        this.panelUnsub = null;
    }

    WorldClockApp.prototype.open = function () {
        if (typeof windowManager === 'undefined') return;
        var self = this;
        var win = windowManager.createWindow(this.windowId, {
            title: 'World Clock',
            width: 920,
            height: 640,
            class: 'app-world-clock',
            onClose: function () {
                if (self.unsubscribe) { self.unsubscribe(); self.unsubscribe = null; }
            },
            content: this.render()
        });
        this.attach(win);
        return win;
    };

    WorldClockApp.prototype.render = function () {
        return '<div class="wc-app aegis-app">' +
            '<header class="aegis-app-header">' +
            '<div><h2 class="aegis-app-title">World Clock</h2>' +
            '<p class="aegis-app-subtitle">IANA time zones. Daylight saving follows the browser.</p></div>' +
            '<button type="button" class="aegis-btn" data-wc="restore">Restore defaults</button>' +
            '</header>' +
            '<div class="wc-toolbar">' +
            '<label class="aegis-search-field"><span class="visually-hidden">Search cities or time zones</span>' +
            '<input type="search" id="wc-search" class="aegis-input" placeholder="Add a city or IANA zone" autocomplete="off" aria-label="Search cities or time zones">' +
            '</label>' +
            '<div id="wc-search-results" class="wc-results" role="listbox" aria-label="Matching time zones"></div>' +
            '</div>' +
            '<div id="wc-grid" class="wc-grid" role="list"></div>' +
            '</div>';
    };

    WorldClockApp.prototype.attach = function (win) {
        var self = this;
        var engine = global.AegisWorldClock;
        if (!engine) return;
        var grid = win.querySelector('#wc-grid');
        var search = win.querySelector('#wc-search');
        var results = win.querySelector('#wc-search-results');

        function paint(rows) {
            if (!grid) return;
            grid.innerHTML = rows.map(function (row) { return card(row, false); }).join('');
        }

        if (this.unsubscribe) this.unsubscribe();
        engine.setSecondsVisible(false);
        this.unsubscribe = engine.subscribe(paint);

        win.addEventListener('click', function (e) {
            var restore = e.target.closest('[data-wc="restore"]');
            if (restore) { engine.restoreDefaults(); return; }
            var action = e.target.closest('[data-wc]');
            var host = e.target.closest('.wc-card');
            if (!action || !host) return;
            var id = host.getAttribute('data-id');
            var kind = action.getAttribute('data-wc');
            if (kind === 'remove') engine.remove(id);
            if (kind === 'up') engine.move(id, -1);
            if (kind === 'down') engine.move(id, 1);
        });

        function renderResults(q) {
            if (!results) return;
            var qv = String(q || '').trim();
            if (!qv) { results.innerHTML = ''; results.hidden = true; return; }
            var matches = engine.search(qv).slice(0, 12);
            results.hidden = false;
            results.innerHTML = matches.map(function (item) {
                return '<button type="button" class="wc-result" role="option" data-tz="' + escapeHtml(item.tz) + '" data-city="' + escapeHtml(item.city) + '" data-country="' + escapeHtml(item.country) + '">' +
                    '<strong>' + escapeHtml(item.city) + '</strong><span>' + escapeHtml(item.country) + ' · ' + escapeHtml(item.tz) + '</span></button>';
            }).join('') || '<p class="wc-empty">No matching zones.</p>';
        }

        if (search) {
            var t = null;
            search.addEventListener('input', function () {
                clearTimeout(t);
                var value = search.value;
                t = setTimeout(function () { renderResults(value); }, 80);
            });
        }
        if (results) {
            results.addEventListener('click', function (e) {
                var btn = e.target.closest('.wc-result');
                if (!btn) return;
                engine.add({
                    id: btn.getAttribute('data-tz') + '-' + btn.getAttribute('data-city'),
                    tz: btn.getAttribute('data-tz'),
                    city: btn.getAttribute('data-city'),
                    country: btn.getAttribute('data-country')
                });
                results.innerHTML = '';
                results.hidden = true;
                if (search) search.value = '';
            });
        }
    };

    WorldClockApp.prototype.ensurePanel = function () {
        if (this.panel) return this.panel;
        var panel = document.createElement('aside');
        panel.id = 'aegis-world-clock-panel';
        panel.className = 'wc-panel';
        panel.setAttribute('role', 'dialog');
        panel.setAttribute('aria-modal', 'true');
        panel.setAttribute('aria-label', 'World Clock');
        panel.setAttribute('aria-hidden', 'true');
        panel.innerHTML = '<header class="wc-panel-head"><h2>World Clock</h2>' +
            '<button type="button" class="aegis-btn aegis-btn-ghost" data-wc-panel="open">Open</button>' +
            '<button type="button" class="aegis-btn aegis-btn-ghost" data-wc-panel="close" aria-label="Close">Close</button></header>' +
            '<div class="wc-panel-grid" id="wc-panel-grid"></div>';
        document.body.appendChild(panel);
        var self = this;
        panel.addEventListener('click', function (e) {
            if (e.target.closest('[data-wc-panel="close"]')) self.hidePanel();
            if (e.target.closest('[data-wc-panel="open"]')) {
                self.hidePanel();
                self.open();
            }
        });
        this.panel = panel;
        return panel;
    };

    WorldClockApp.prototype.showPanel = function () {
        var engine = global.AegisWorldClock;
        var panel = this.ensurePanel();
        var grid = panel.querySelector('#wc-panel-grid');
        panel.classList.add('visible');
        panel.setAttribute('aria-hidden', 'false');
        var self = this;
        if (this._panelDocClose) {
            document.removeEventListener('mousedown', this._panelDocClose);
            this._panelDocClose = null;
        }
        if (this._panelKeyClose) {
            document.removeEventListener('keydown', this._panelKeyClose);
            this._panelKeyClose = null;
        }
        if (this.panelUnsub) this.panelUnsub();
        this.panelUnsub = engine.subscribe(function (rows) {
            if (!grid) return;
            grid.innerHTML = rows.slice(0, 8).map(function (row) { return card(row, true); }).join('');
        });
        var onDoc = function (e) {
            if (!panel.contains(e.target) && !e.target.closest('#time-display, #date-display, .time-date-container')) {
                self.hidePanel();
            }
        };
        var onKey = function (e) {
            if (e.key === 'Escape') self.hidePanel();
        };
        document.addEventListener('mousedown', onDoc);
        document.addEventListener('keydown', onKey);
        this._panelDocClose = onDoc;
        this._panelKeyClose = onKey;
    };

    WorldClockApp.prototype.hidePanel = function () {
        if (this.panel) {
            this.panel.classList.remove('visible');
            this.panel.setAttribute('aria-hidden', 'true');
        }
        if (this.panelUnsub) { this.panelUnsub(); this.panelUnsub = null; }
        if (this._panelDocClose) {
            document.removeEventListener('mousedown', this._panelDocClose);
            this._panelDocClose = null;
        }
        if (this._panelKeyClose) {
            document.removeEventListener('keydown', this._panelKeyClose);
            this._panelKeyClose = null;
        }
    };

    WorldClockApp.prototype.togglePanel = function () {
        if (this.panel && this.panel.classList.contains('visible')) this.hidePanel();
        else this.showPanel();
    };

    var app = new WorldClockApp();
    global.worldClockApp = app;

    document.addEventListener('DOMContentLoaded', function () {
        var clock = document.querySelector('.time-date-container');
        if (!clock) return;
        clock.setAttribute('role', 'button');
        clock.setAttribute('tabindex', '0');
        clock.setAttribute('aria-label', 'Open World Clock');
        clock.addEventListener('click', function () { app.togglePanel(); });
        clock.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                app.togglePanel();
            }
        });
    });
})(typeof window !== 'undefined' ? window : globalThis);
