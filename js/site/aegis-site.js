/**
 * Public site chrome: navigation, footer, mobile menu, reduced motion.
 */
(function () {
    'use strict';

    const MARK = `<span class="aegis-mark aegis-mark-24" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none">
            <circle cx="32" cy="32" r="27" stroke="#818CF8" stroke-width="2.6"/>
            <path d="M32 14 L18.5 50" stroke="#F8FAFC" stroke-width="3.6" stroke-linecap="round"/>
            <path d="M32 14 L45.5 50" stroke="#F8FAFC" stroke-width="3.6" stroke-linecap="round"/>
            <path d="M23.5 36.8 H40.5" stroke="#38BDF8" stroke-width="2.8" stroke-linecap="round"/>
        </svg>
    </span>`;

    const LINKS = [
        { href: 'index.html', id: 'home', label: 'Home' },
        { href: 'product.html', id: 'product', label: 'Product' },
        { href: 'features.html', id: 'features', label: 'Features' },
        { href: 'apps.html', id: 'apps', label: 'Apps' },
        { href: 'intelligence.html', id: 'intelligence', label: 'Intelligence' },
        { href: 'security.html', id: 'security', label: 'Security' },
        { href: 'docs.html', id: 'docs', label: 'Docs' },
        { href: 'about.html', id: 'about', label: 'About' }
    ];

    function currentPage() {
        const file = (location.pathname.split('/').pop() || 'index.html').toLowerCase();
        if (!file || file === '' || file === '/') return 'index.html';
        return file;
    }

    function header() {
        const page = currentPage();
        const nav = LINKS.map((item) => {
            const current = page === item.href ? ' aria-current="page"' : '';
            return `<a href="${item.href}"${current}>${item.label}</a>`;
        }).join('');
        return `<a class="site-skip" href="#main">Skip to content</a>
        <header class="site-header">
            <div class="site-header-inner">
                <a class="site-brand" href="index.html">${MARK}Aegis<span>Desk</span></a>
                <button class="site-menu-btn" type="button" aria-expanded="false" aria-controls="site-nav" id="site-menu-btn">Menu</button>
                <nav class="site-nav" id="site-nav" aria-label="Primary">
                    ${nav}
                    <a class="site-cta" href="login.html">Launch AegisDesk</a>
                    <a class="site-btn-secondary" href="signup.html">Create account</a>
                </nav>
            </div>
        </header>`;
    }

    function footer() {
        return `<footer class="site-footer">
            <div class="site-footer-inner">
                <div class="site-footer-grid">
                    <div>
                        <h2>AegisDesk</h2>
                        <p>A web operating environment for mail, music, work, and a local intelligence layer.</p>
                    </div>
                    <div>
                        <h3>Product</h3>
                        <a href="product.html">Product</a>
                        <a href="apps.html">Apps</a>
                        <a href="intelligence.html">Aegis Intelligence</a>
                    </div>
                    <div>
                        <h3>Resources</h3>
                        <a href="docs.html">Documentation</a>
                        <a href="security.html">Security &amp; privacy</a>
                        <a href="features.html">Features</a>
                        <a href="about.html">About</a>
                    </div>
                    <div>
                        <h3>Launch</h3>
                        <a href="login.html">Sign in</a>
                        <a href="signup.html">Create account</a>
                        <a href="desktop.html">Desktop</a>
                    </div>
                </div>
                <p class="site-legal">AegisDesk. Built by Monish Tijil. No social profiles are listed here because they are not published as official product channels.</p>
            </div>
        </footer>`;
    }

    function renderAppsGrid(target) {
        if (!target || !window.AEGIS_APP_CATALOG || !window.AEGIS_APP_ICONS) return;
        target.innerHTML = window.AEGIS_APP_CATALOG.map((app) => {
            const icon = window.AEGIS_APP_ICONS[app.id] || '';
            return `<article class="site-card app-card">
                ${icon}
                <div>
                    <h3>${app.name}</h3>
                    <p>${app.description}</p>
                </div>
            </article>`;
        }).join('');
    }

    function renderDocs(target) {
        if (!target || !window.AEGIS_DOCS) return;
        const nav = document.getElementById('docs-nav');
        if (nav) {
            nav.innerHTML = window.AEGIS_DOCS.map((section) =>
                `<a href="#${section.id}">${section.title}</a>`
            ).join('');
        }
        target.innerHTML = window.AEGIS_DOCS.map((section) =>
            `<article id="${section.id}">
                <h2>${section.title}</h2>
                ${section.body}
            </article>`
        ).join('');
    }

    document.addEventListener('DOMContentLoaded', function () {
        const root = document.getElementById('site-root');
        if (root) {
            root.insertAdjacentHTML('afterbegin', header());
            root.insertAdjacentHTML('beforeend', footer());
        }
        const btn = document.getElementById('site-menu-btn');
        const nav = document.getElementById('site-nav');
        if (btn && nav) {
            btn.addEventListener('click', function () {
                const open = nav.classList.toggle('is-open');
                btn.setAttribute('aria-expanded', open ? 'true' : 'false');
            });
        }
        renderAppsGrid(document.getElementById('apps-showcase'));
        renderDocs(document.getElementById('docs-content'));

        var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!reduce && 'IntersectionObserver' in window) {
            var nodes = document.querySelectorAll('.site-section, .site-card, .site-hero .reveal');
            nodes.forEach(function (el) { el.classList.add('io-pending'); });
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (entry) {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('io-in');
                        io.unobserve(entry.target);
                    }
                });
            }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
            nodes.forEach(function (el) { io.observe(el); });
        }
    });
})();
