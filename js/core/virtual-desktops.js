// Virtual Desktops System
class VirtualDesktops {
    constructor() {
        this.desktops = [];
        this.currentDesktop = 0;
        this.maxDesktops = 4;
        this.init();
    }

    init() {
        // Create default desktops
        for (let i = 0; i < this.maxDesktops; i++) {
                this.desktops.push({
                id: i,
                name: `Space ${i + 1}`,
                windows: [],
                wallpaper: null
            });
        }

        const saved = storage.get('virtualDesktops', null);
        if (saved && Array.isArray(saved.desktops)) {
            this.desktops = saved.desktops.slice(0, this.maxDesktops).map((d, i) => ({
                id: i,
                name: (d && d.name) || `Space ${i + 1}`,
                windows: Array.isArray(d.windows) ? d.windows : (d.windows && typeof d.windows === 'object' ? Object.keys(d.windows) : []),
                wallpaper: null
            }));
            while (this.desktops.length < this.maxDesktops) {
                this.desktops.push({ id: this.desktops.length, name: `Space ${this.desktops.length + 1}`, windows: [], wallpaper: null });
            }
            this.currentDesktop = Math.max(0, Math.min(saved.currentDesktop || 0, this.maxDesktops - 1));
        }

        // Setup keyboard shortcuts
        this.setupShortcuts();
    }

    switchTo(desktopId) {
        if (desktopId < 0 || desktopId >= this.desktops.length) return;

        // Hide current desktop windows
        this.hideDesktop(this.currentDesktop);

        // Show new desktop windows
        this.currentDesktop = desktopId;
        this.showDesktop(desktopId);

        // Save state
        this.saveState();

        // Dispatch event
        document.dispatchEvent(new CustomEvent('desktopchange', { 
            detail: { desktop: desktopId } 
        }));
    }

    hideDesktop(desktopId) {
        if (typeof windowManager === 'undefined') return;
        windowManager.windows.forEach((el) => {
            const space = Number(el.dataset.aegisSpace || 0);
            if (space === desktopId) el.style.visibility = 'hidden';
        });
    }

    showDesktop(desktopId) {
        if (typeof windowManager === 'undefined') return;
        windowManager.windows.forEach((el) => {
            const space = Number(el.dataset.aegisSpace || 0);
            el.style.visibility = space === desktopId ? 'visible' : 'hidden';
        });
    }

    addWindowToDesktop(windowId, desktopId = null) {
        const targetDesktop = desktopId !== null ? desktopId : this.currentDesktop;
        const desktop = this.desktops[targetDesktop];
        if (!desktop) return;
        if (!Array.isArray(desktop.windows)) desktop.windows = [];
        if (desktop.windows.indexOf(windowId) === -1) desktop.windows.push(windowId);
        const el = document.querySelector(`[data-window-id="${windowId}"]`);
        if (el) el.dataset.aegisSpace = String(targetDesktop);
        this.saveState();
    }

    removeWindowFromDesktop(windowId) {
        this.desktops.forEach(desktop => {
            desktop.windows = (desktop.windows || []).filter(id => id !== windowId);
        });
        this.saveState();
    }

    moveWindowToDesktop(windowId, desktopId) {
        // Remove from all desktops
        this.removeWindowFromDesktop(windowId);
        
        // Add to target desktop
        this.addWindowToDesktop(windowId, desktopId);
        
        // If moving to current desktop, show it
        if (desktopId === this.currentDesktop) {
            const window = document.querySelector(`[data-window-id="${windowId}"]`);
            if (window) {
                window.style.display = 'block';
            }
        }
    }

    getCurrentDesktop() {
        return this.currentDesktop;
    }

    getDesktop(desktopId) {
        return this.desktops[desktopId];
    }

    getAllDesktops() {
        return this.desktops;
    }

    setupShortcuts() {
        // Ctrl+Alt+Left/Right to switch desktops
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.altKey) {
                if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    const prev = (this.currentDesktop - 1 + this.maxDesktops) % this.maxDesktops;
                    this.switchTo(prev);
                } else if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    const next = (this.currentDesktop + 1) % this.maxDesktops;
                    this.switchTo(next);
                } else if (e.key >= '1' && e.key <= '4') {
                    e.preventDefault();
                    const desktopId = parseInt(e.key) - 1;
                    this.switchTo(desktopId);
                }
            }
        });
    }

    saveState() {
        storage.set('virtualDesktops', {
            desktops: this.desktops.map((d, i) => ({
                id: i,
                name: d.name || `Space ${i + 1}`,
                windows: Array.isArray(d.windows) ? d.windows : []
            })),
            currentDesktop: this.currentDesktop
        });
    }

    showOverview() {
        let overlay = document.getElementById('aegis-spaces-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'aegis-spaces-overlay';
            overlay.className = 'aegis-spaces-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-label', 'Spaces overview');
            document.body.appendChild(overlay);
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) overlay.classList.remove('visible');
                const card = e.target.closest('[data-space]');
                if (card) {
                    this.switchTo(Number(card.getAttribute('data-space')));
                    overlay.classList.remove('visible');
                }
            });
            overlay.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') overlay.classList.remove('visible');
            });
        }
        overlay.innerHTML = `<div class="aegis-spaces-grid">${this.desktops.map((d, i) => {
            const count = (typeof windowManager !== 'undefined')
                ? Array.from(windowManager.windows.values()).filter(el => Number(el.dataset.aegisSpace || 0) === i).length
                : (d.windows || []).length;
            return `<button type="button" class="aegis-space-card ${i === this.currentDesktop ? 'is-active' : ''}" data-space="${i}">
                <h3>${d.name || ('Space ' + (i + 1))}</h3>
                <p>${count} window${count === 1 ? '' : 's'}</p>
            </button>`;
        }).join('')}</div>`;
        overlay.classList.add('visible');
    }

    showDesktopSwitcher() {
        this.showOverview();
    }

    buildSwitcherUI() {
        const desktops = this.desktops.map((desktop, index) => `
            <div class="desktop-card ${index === this.currentDesktop ? 'active' : ''}" 
                 data-desktop="${index}"
                 style="
                    padding: 20px;
                    margin: 12px;
                    background: ${index === this.currentDesktop ? 'var(--primary)' : 'var(--bg-card)'};
                    border-radius: 12px;
                    cursor: pointer;
                    border: 2px solid ${index === this.currentDesktop ? 'var(--accent)' : 'var(--border)'};
                    transition: all 0.3s;
                 ">
                <h3 style="margin: 0 0 8px 0;">${desktop.name}</h3>
                <div style="font-size: 12px; color: var(--text-muted);">
                    ${desktop.windows.length || 0} windows
                </div>
            </div>
        `).join('');

        return `
            <div style="padding: 20px;">
                <h3 style="margin-bottom: 16px;">Switch Desktop</h3>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr);">
                    ${desktops}
                </div>
                <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid var(--border);">
                    <p style="font-size: 12px; color: var(--text-muted);">
                        <strong>Shortcuts:</strong><br>
                        Ctrl+Alt+Left/Right - Switch desktops<br>
                        Ctrl+Alt+1-4 - Jump to desktop
                    </p>
                </div>
            </div>
        `;
    }
}

// Initialize globally
const virtualDesktops = new VirtualDesktops();
