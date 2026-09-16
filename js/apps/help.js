// Help — documentation sourced from AEGIS_DOCS so the website and OS stay aligned.
class HelpApp {
    constructor() {
        this.windowId = 'help';
        this.query = '';
    }

    createWindow() {
        const content = this.render();
        const win = windowManager.createWindow(this.windowId, {
            title: 'Help',
            width: 920,
            height: 760,
            class: 'help-window',
            content
        });
        this.attach(win);
        return win;
    }

    render() {
        return `
            <div class="help-app aegis-app">
                <header class="aegis-app-header">
                    <div>
                        <h2 class="aegis-app-title">Help</h2>
                        <p class="aegis-app-subtitle">Documentation for the current AegisDesk product</p>
                    </div>
                </header>
                <div class="help-search">
                    <label class="aegis-search-field">
                        <span class="visually-hidden">Search help</span>
                        <input type="search" id="help-search" class="aegis-input" placeholder="Search getting started, shortcuts, apps…" aria-label="Search help">
                    </label>
                </div>
                <div class="help-content" id="help-content"></div>
            </div>
        `;
    }

    sections() {
        return Array.isArray(window.AEGIS_DOCS) ? window.AEGIS_DOCS : [];
    }

    attach(win) {
        const input = win.querySelector('#help-search');
        const paint = () => {
            this.query = input ? input.value : '';
            this.renderSections(win);
        };
        if (input) {
            input.addEventListener('input', paint);
        }
        this.renderSections(win);
    }

    renderSections(win) {
        const host = win.querySelector('#help-content');
        if (!host) return;
        const q = (this.query || '').trim().toLowerCase();
        const sections = this.sections().filter((section) => {
            if (!q) return true;
            return (section.title + ' ' + section.body).toLowerCase().includes(q);
        });
        if (!sections.length) {
            host.innerHTML = window.AegisAppKit
                ? AegisAppKit.emptyState('No matching topics', 'Try a different search, or clear the field to see all documentation.')
                : '<p>No matching topics.</p>';
            return;
        }
        host.innerHTML = sections.map((section) => `
            <section class="help-section" id="help-${section.id}">
                <h3>${section.title}</h3>
                ${section.body}
            </section>
        `).join('');
    }

    open() {
        return this.createWindow();
    }
}

const helpApp = new HelpApp();
