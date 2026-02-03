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
                name: `Desktop ${i + 1}`,
                windows: new Map(),
                wallpaper: null
            });
        }

        // Load saved state
        const saved = storage.get('virtualDesktops', null);
        if (saved) {
            this.desktops = saved.desktops;
            this.currentDesktop = saved.currentDesktop || 0;
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
        const desktop = this.desktops[desktopId];
        if (!desktop) return;

        desktop.windows.forEach((windowId) => {
            const window = document.querySelector(`[data-window-id="${windowId}"]`);
            if (window) {
                window.style.display = 'none';
            }
        });
    }

    showDesktop(desktopId) {
        const desktop = this.desktops[desktopId];
        if (!desktop) return;

        desktop.windows.forEach((windowId) => {
            const window = document.querySelector(`[data-window-id="${windowId}"]`);
            if (window) {
                window.style.display = 'block';
            }
        });
    }

    addWindowToDesktop(windowId, desktopId = null) {
        const targetDesktop = desktopId !== null ? desktopId : this.currentDesktop;
        const desktop = this.desktops[targetDesktop];
        
        if (desktop && !desktop.windows.has(windowId)) {
            desktop.windows.set(windowId, windowId);
            this.saveState();
        }
    }

    removeWindowFromDesktop(windowId) {
        this.desktops.forEach(desktop => {
            desktop.windows.delete(windowId);
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
            desktops: this.desktops,
            currentDesktop: this.currentDesktop
        });
    }

    showDesktopSwitcher() {
        if (typeof windowManager !== 'undefined') {
            const content = this.buildSwitcherUI();
            windowManager.createWindow('desktop-switcher', {
                title: 'Virtual Desktops',
                width: 600,
                height: 400,
                content
            });
        }
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
                    ${desktop.windows.size} windows
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
