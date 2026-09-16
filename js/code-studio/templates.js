/**
 * Aegis Code Studio — genuine local starter templates.
 * No remote dependencies. Accessible, responsive, no placeholder junk.
 */
(function (root) {
    'use strict';
    root.AegisStudio = root.AegisStudio || {};

    var TEMPLATES = {
        blank: {
            id: 'blank',
            name: 'Blank',
            description: 'An empty project. Add files or ask Aegis to build.',
            files: []
        },
        html: {
            id: 'html',
            name: 'HTML / CSS / JS',
            description: 'A linked three-file starter ready for the live preview.',
            files: [
                {
                    path: 'index.html',
                    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>New page</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <main class="page">\n    <h1>Ready to build</h1>\n    <p>This project is linked across HTML, CSS, and JavaScript.</p>\n    <button type="button" id="action">Mark as started</button>\n    <p id="status" role="status"></p>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n'
                },
                {
                    path: 'styles.css',
                    content: ':root {\n  color-scheme: light dark;\n  --bg: #0f172a;\n  --fg: #e2e8f0;\n  --accent: #14b8a6;\n  --card: #111827;\n}\n\n@media (prefers-color-scheme: light) {\n  :root {\n    --bg: #f8fafc;\n    --fg: #0f172a;\n    --card: #ffffff;\n  }\n}\n\n* { box-sizing: border-box; }\n\nbody {\n  margin: 0;\n  font-family: "Segoe UI", system-ui, sans-serif;\n  background: var(--bg);\n  color: var(--fg);\n  line-height: 1.5;\n}\n\n.page {\n  max-width: 40rem;\n  margin: 0 auto;\n  padding: 3rem 1.25rem;\n}\n\nh1 { font-size: 2rem; margin: 0 0 0.75rem; }\n\nbutton {\n  margin-top: 1rem;\n  padding: 0.6rem 1rem;\n  border: 0;\n  border-radius: 8px;\n  background: var(--accent);\n  color: #042f2e;\n  font-weight: 600;\n  cursor: pointer;\n}\n\nbutton:focus-visible {\n  outline: 3px solid var(--accent);\n  outline-offset: 3px;\n}\n'
                },
                {
                    path: 'script.js',
                    content: 'var button = document.getElementById("action");\nvar statusEl = document.getElementById("status");\n\nif (button && statusEl) {\n  button.addEventListener("click", function () {\n    statusEl.textContent = "Project started.";\n    button.setAttribute("disabled", "true");\n  });\n}\n'
                }
            ]
        },
        landing: {
            id: 'landing',
            name: 'Landing page',
            description: 'A focused product landing page with navigation, hero, and contact.',
            files: [
                {
                    path: 'index.html',
                    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Northline Studio</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <a class="skip" href="#content">Skip to content</a>\n  <header class="site-header">\n    <p class="mark">Northline</p>\n    <nav aria-label="Primary">\n      <a href="#work">Work</a>\n      <a href="#approach">Approach</a>\n      <a href="#contact">Contact</a>\n    </nav>\n  </header>\n  <main id="content">\n    <section class="hero">\n      <p class="eyebrow">Product design &amp; engineering</p>\n      <h1>Calm interfaces for demanding work.</h1>\n      <p class="lede">Northline helps teams ship software that stays readable under pressure — precise layout, honest states, and no decorative noise.</p>\n      <a class="cta" href="#contact">Start a conversation</a>\n    </section>\n    <section id="work" class="grid">\n      <article>\n        <h2>Operations console</h2>\n        <p>A dense dashboard rebuilt around scan-friendly hierarchy and keyboard paths.</p>\n      </article>\n      <article>\n        <h2>Research archive</h2>\n        <p>Search, tags, and reading view for a 12-year internal knowledge base.</p>\n      </article>\n      <article>\n        <h2>Member portal</h2>\n        <p>Accessible account flows with clear errors and no dead-end states.</p>\n      </article>\n    </section>\n    <section id="approach">\n      <h2>Approach</h2>\n      <p>We start from the job to be done, then reduce the interface until every remaining control earns its place.</p>\n    </section>\n    <section id="contact">\n      <h2>Contact</h2>\n      <form id="contact-form" novalidate>\n        <label>Name <input name="name" required autocomplete="name"></label>\n        <label>Email <input name="email" type="email" required autocomplete="email"></label>\n        <label>Message <textarea name="message" rows="4" required></textarea></label>\n        <button type="submit">Send</button>\n        <p id="form-status" role="status"></p>\n      </form>\n    </section>\n  </main>\n  <footer><p>Northline Studio</p></footer>\n  <script src="script.js"></script>\n</body>\n</html>\n'
                },
                {
                    path: 'styles.css',
                    content: ':root {\n  --bg: #08111b;\n  --fg: #e8eef6;\n  --muted: #9fb0c3;\n  --line: rgba(232, 238, 246, 0.12);\n  --accent: #5eead4;\n}\n\n* { box-sizing: border-box; }\nhtml { scroll-behavior: smooth; }\nbody {\n  margin: 0;\n  font-family: Georgia, "Times New Roman", serif;\n  background: radial-gradient(1200px 500px at 10% -10%, #123, var(--bg));\n  color: var(--fg);\n  line-height: 1.55;\n}\n.skip {\n  position: absolute;\n  left: -999px;\n  top: 0;\n}\n.skip:focus {\n  left: 12px;\n  top: 12px;\n  background: var(--accent);\n  color: #042f2e;\n  padding: 8px 12px;\n}\n.site-header, footer, main { width: min(960px, calc(100% - 2rem)); margin: 0 auto; }\n.site-header {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n  padding: 1.25rem 0;\n  border-bottom: 1px solid var(--line);\n}\n.mark { font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; font-size: 0.8rem; }\nnav { display: flex; gap: 1rem; }\na { color: var(--fg); }\n.hero { padding: 4.5rem 0 3rem; }\n.eyebrow { color: var(--accent); letter-spacing: 0.12em; text-transform: uppercase; font-size: 0.75rem; }\nh1 { font-size: clamp(2rem, 5vw, 3.4rem); line-height: 1.15; margin: 0.4rem 0 1rem; }\n.lede { max-width: 38rem; color: var(--muted); font-size: 1.15rem; }\n.cta {\n  display: inline-block;\n  margin-top: 1.5rem;\n  background: var(--accent);\n  color: #042f2e;\n  text-decoration: none;\n  padding: 0.75rem 1.1rem;\n  border-radius: 999px;\n  font-family: "Segoe UI", system-ui, sans-serif;\n  font-weight: 650;\n}\n.grid {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));\n  gap: 1rem;\n  padding: 1rem 0 3rem;\n}\narticle, form {\n  border: 1px solid var(--line);\n  border-radius: 16px;\n  padding: 1.1rem 1.2rem;\n  background: rgba(8, 17, 27, 0.55);\n}\nlabel { display: block; margin: 0.75rem 0; font-family: "Segoe UI", system-ui, sans-serif; }\ninput, textarea, button {\n  width: 100%;\n  margin-top: 0.35rem;\n  padding: 0.65rem 0.7rem;\n  border-radius: 10px;\n  border: 1px solid var(--line);\n  background: #0b1520;\n  color: var(--fg);\n  font: inherit;\n}\nbutton {\n  background: var(--accent);\n  color: #042f2e;\n  font-weight: 700;\n  cursor: pointer;\n  width: auto;\n}\nbutton:focus-visible, a:focus-visible, input:focus-visible, textarea:focus-visible {\n  outline: 3px solid var(--accent);\n  outline-offset: 2px;\n}\nfooter { padding: 2rem 0 3rem; color: var(--muted); }\n@media (max-width: 640px) {\n  .site-header { flex-direction: column; align-items: flex-start; gap: 0.75rem; }\n}\n'
                },
                {
                    path: 'script.js',
                    content: 'var form = document.getElementById("contact-form");\nvar statusEl = document.getElementById("form-status");\n\nif (form) {\n  form.addEventListener("submit", function (event) {\n    event.preventDefault();\n    if (!form.checkValidity()) {\n      statusEl.textContent = "Please complete name, email, and message.";\n      return;\n    }\n    statusEl.textContent = "Message captured locally. Connect a mail endpoint to send it.";\n    form.reset();\n  });\n}\n'
                }
            ]
        },
        portfolio: {
            id: 'portfolio',
            name: 'Portfolio',
            description: 'Home, About, Projects, and Contact — a complete personal site.',
            files: [
                {
                    path: 'index.html',
                    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Portfolio</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <a class="skip" href="#home">Skip to content</a>\n  <header>\n    <p class="logo">A. Rao</p>\n    <button type="button" class="nav-toggle" aria-expanded="false" aria-controls="site-nav">Menu</button>\n    <nav id="site-nav" aria-label="Primary">\n      <a href="#home">Home</a>\n      <a href="#about">About</a>\n      <a href="#projects">Projects</a>\n      <a href="#contact">Contact</a>\n    </nav>\n  </header>\n  <main>\n    <section id="home" class="hero">\n      <p class="eyebrow">Product engineer</p>\n      <h1>I design systems people can actually finish work in.</h1>\n      <p>Currently building internal tools, documentation sites, and calm consumer products.</p>\n    </section>\n    <section id="about">\n      <h2>About</h2>\n      <p>I work at the intersection of interface design and frontend engineering. I care about loading states, empty states, and the last 10% that makes software feel finished.</p>\n    </section>\n    <section id="projects">\n      <h2>Projects</h2>\n      <ul class="projects">\n        <li>\n          <h3>Atlas Review</h3>\n          <p>A reading-and-annotation workspace for research teams.</p>\n        </li>\n        <li>\n          <h3>Harbor</h3>\n          <p>Onboarding flows with honest progress and recoverable errors.</p>\n        </li>\n        <li>\n          <h3>Ledger Lite</h3>\n          <p>A personal finance view with local-only data and export.</p>\n        </li>\n      </ul>\n    </section>\n    <section id="contact">\n      <h2>Contact</h2>\n      <form id="contact-form">\n        <label>Name <input name="name" required></label>\n        <label>Email <input type="email" name="email" required></label>\n        <label>Message <textarea name="message" rows="4" required></textarea></label>\n        <button type="submit">Send message</button>\n        <p id="form-status" role="status"></p>\n      </form>\n    </section>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n'
                },
                {
                    path: 'styles.css',
                    content: ':root {\n  --bg: #f4efe6;\n  --ink: #1c1916;\n  --muted: #5c564e;\n  --accent: #0f766e;\n  --card: #fffdf8;\n}\n* { box-sizing: border-box; }\nbody {\n  margin: 0;\n  font-family: "Palatino Linotype", Palatino, serif;\n  background: var(--bg);\n  color: var(--ink);\n  line-height: 1.6;\n}\n.skip { position: absolute; left: -999px; }\n.skip:focus { left: 1rem; top: 1rem; background: #fff; padding: 0.5rem; }\nheader, main { width: min(880px, calc(100% - 2rem)); margin: 0 auto; }\nheader {\n  display: flex;\n  align-items: center;\n  justify-content: space-between;\n  gap: 1rem;\n  padding: 1.25rem 0;\n}\n.logo { font-weight: 700; letter-spacing: 0.04em; }\nnav { display: flex; gap: 1rem; }\na { color: inherit; }\n.nav-toggle { display: none; }\n.hero { padding: 3rem 0 2rem; }\nh1 { font-size: clamp(2rem, 6vw, 3.2rem); line-height: 1.15; }\nsection { padding: 1.5rem 0 2rem; border-top: 1px solid rgba(28, 25, 22, 0.12); }\n.projects { list-style: none; padding: 0; display: grid; gap: 1rem; }\n.projects li, form {\n  background: var(--card);\n  border-radius: 14px;\n  padding: 1rem 1.1rem;\n  box-shadow: 0 8px 24px rgba(28, 25, 22, 0.06);\n}\nlabel { display: grid; gap: 0.3rem; margin: 0.75rem 0; }\ninput, textarea, button, .nav-toggle {\n  font: inherit;\n  padding: 0.6rem 0.7rem;\n  border-radius: 10px;\n  border: 1px solid rgba(28, 25, 22, 0.18);\n}\nbutton {\n  background: var(--accent);\n  color: white;\n  border: 0;\n  cursor: pointer;\n  font-family: "Segoe UI", system-ui, sans-serif;\n}\n:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }\n@media (max-width: 700px) {\n  .nav-toggle { display: inline-flex; }\n  nav { display: none; flex-direction: column; width: 100%; }\n  header { flex-wrap: wrap; }\n  header.is-open nav { display: flex; }\n}\n'
                },
                {
                    path: 'script.js',
                    content: 'var header = document.querySelector("header");\nvar toggle = document.querySelector(".nav-toggle");\nvar form = document.getElementById("contact-form");\nvar statusEl = document.getElementById("form-status");\n\nif (toggle && header) {\n  toggle.addEventListener("click", function () {\n    var open = header.classList.toggle("is-open");\n    toggle.setAttribute("aria-expanded", open ? "true" : "false");\n  });\n}\n\nif (form) {\n  form.addEventListener("submit", function (event) {\n    event.preventDefault();\n    if (!form.checkValidity()) {\n      statusEl.textContent = "Please complete the form.";\n      return;\n    }\n    statusEl.textContent = "Thanks. This demo stores the message on this page only.";\n    form.reset();\n  });\n}\n'
                }
            ]
        },
        dashboard: {
            id: 'dashboard',
            name: 'Dashboard',
            description: 'A compact operations dashboard with stats, a table, and filters.',
            files: [
                {
                    path: 'index.html',
                    content: '<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8">\n  <meta name="viewport" content="width=device-width, initial-scale=1.0">\n  <title>Operations dashboard</title>\n  <link rel="stylesheet" href="styles.css">\n</head>\n<body>\n  <header class="topbar">\n    <h1>Operations</h1>\n    <label class="search">Search queues\n      <input id="filter" type="search" placeholder="Filter by name or status">\n    </label>\n  </header>\n  <main>\n    <section class="stats" aria-label="Summary">\n      <article><p>Open</p><strong id="stat-open">0</strong></article>\n      <article><p>Waiting</p><strong id="stat-waiting">0</strong></article>\n      <article><p>Done today</p><strong id="stat-done">0</strong></article>\n    </section>\n    <section>\n      <h2>Queues</h2>\n      <div class="table-wrap">\n        <table>\n          <thead>\n            <tr><th>Queue</th><th>Owner</th><th>Status</th><th>Items</th></tr>\n          </thead>\n          <tbody id="rows"></tbody>\n        </table>\n      </div>\n      <p id="empty" class="empty" hidden>No queues match that filter.</p>\n    </section>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n'
                },
                {
                    path: 'styles.css',
                    content: ':root {\n  --bg: #0b1220;\n  --panel: #121a2b;\n  --fg: #e5edf7;\n  --muted: #93a4bb;\n  --line: rgba(229, 237, 247, 0.1);\n  --accent: #38bdf8;\n}\n* { box-sizing: border-box; }\nbody {\n  margin: 0;\n  font-family: "Segoe UI", system-ui, sans-serif;\n  background: var(--bg);\n  color: var(--fg);\n}\n.topbar, main { width: min(1040px, calc(100% - 1.5rem)); margin: 0 auto; }\n.topbar {\n  display: flex;\n  justify-content: space-between;\n  align-items: end;\n  gap: 1rem;\n  padding: 1.5rem 0 1rem;\n}\nh1, h2 { margin: 0 0 0.75rem; }\n.search { display: grid; gap: 0.35rem; color: var(--muted); font-size: 0.85rem; }\ninput {\n  min-width: 16rem;\n  padding: 0.55rem 0.7rem;\n  border-radius: 8px;\n  border: 1px solid var(--line);\n  background: var(--panel);\n  color: var(--fg);\n}\n.stats {\n  display: grid;\n  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));\n  gap: 0.75rem;\n  margin-bottom: 1.5rem;\n}\n.stats article, .table-wrap {\n  background: var(--panel);\n  border: 1px solid var(--line);\n  border-radius: 12px;\n  padding: 1rem;\n}\n.stats strong { font-size: 1.8rem; }\ntable { width: 100%; border-collapse: collapse; }\nth, td { text-align: left; padding: 0.65rem 0.4rem; border-bottom: 1px solid var(--line); }\n.status {\n  display: inline-block;\n  padding: 0.15rem 0.5rem;\n  border-radius: 999px;\n  font-size: 0.75rem;\n}\n.status.open { background: rgba(56, 189, 248, 0.16); color: #7dd3fc; }\n.status.waiting { background: rgba(251, 191, 36, 0.16); color: #fbbf24; }\n.status.done { background: rgba(16, 185, 129, 0.16); color: #34d399; }\n.empty { color: var(--muted); }\n:focus-visible { outline: 3px solid var(--accent); outline-offset: 2px; }\n@media (max-width: 640px) {\n  .topbar { flex-direction: column; align-items: stretch; }\n  input { min-width: 0; width: 100%; }\n}\n'
                },
                {
                    path: 'script.js',
                    content: 'var QUEUES = [\n  { name: "Billing exceptions", owner: "Priya", status: "open", items: 12 },\n  { name: "KYC review", owner: "Jonah", status: "waiting", items: 4 },\n  { name: "Release notes", owner: "Amelia", status: "done", items: 0 },\n  { name: "Support overflow", owner: "Chris", status: "open", items: 9 }\n];\n\nvar rows = document.getElementById("rows");\nvar filter = document.getElementById("filter");\nvar empty = document.getElementById("empty");\n\nfunction render(list) {\n  rows.innerHTML = "";\n  list.forEach(function (item) {\n    var tr = document.createElement("tr");\n    tr.innerHTML = "<td>" + item.name + "</td><td>" + item.owner + "</td><td><span class=\\"status " + item.status + "\\">" + item.status + "</span></td><td>" + item.items + "</td>";\n    rows.appendChild(tr);\n  });\n  empty.hidden = list.length > 0;\n  document.getElementById("stat-open").textContent = String(QUEUES.filter(function (q) { return q.status === "open"; }).length);\n  document.getElementById("stat-waiting").textContent = String(QUEUES.filter(function (q) { return q.status === "waiting"; }).length);\n  document.getElementById("stat-done").textContent = String(QUEUES.filter(function (q) { return q.status === "done"; }).length);\n}\n\nfilter.addEventListener("input", function () {\n  var q = filter.value.toLowerCase();\n  render(QUEUES.filter(function (item) {\n    return item.name.toLowerCase().indexOf(q) >= 0 || item.status.indexOf(q) >= 0;\n  }));\n});\n\nrender(QUEUES);\n'
                }
            ]
        }
    };

    root.AegisStudio.templates = {
        all: function () {
            return ['blank', 'html', 'landing', 'portfolio', 'dashboard'].map(function (id) {
                var t = TEMPLATES[id];
                return { id: t.id, name: t.name, description: t.description };
            });
        },
        get: function (id) {
            return TEMPLATES[id] || null;
        }
    };
})(typeof window !== 'undefined' ? window : globalThis);
