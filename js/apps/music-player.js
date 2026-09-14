// Music Player App - OS Integration
class MusicPlayerApp {
    constructor() {
        this.windowId = 'music-player';
        this.isStandalone = false;
    }

    open() {
        if (typeof windowManager !== 'undefined') {
            this.openAsWindow();
        } else {
            this.openAsStandalone();
        }
    }

    openAsWindow() {
        const existing = windowManager.windows.get(this.windowId);
        if (existing) {
            windowManager.focusWindow(existing);
            return existing;
        }

        const content = this.renderWindowContent();
        const win = windowManager.createWindow(this.windowId, {
            title: 'Music',
            width: 1200,
            height: 800,
            class: 'app-music-player',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
            </svg>`,
            content: content
        });

        this.attachWindowEvents();
        return win;
    }

    openAsStandalone() {
        window.location.href = 'music.html';
    }

    renderWindowContent() {
        return `
            <div class="music-window-container">
                <iframe src="music.html" title="Music" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
        `;
    }

    attachWindowEvents() {
        if (this._messageBound) return;
        this._messageBound = true;
        globalThis.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'music-track-change') {
                this.updateTaskbarInfo(event.data.track);
            }
        });
    }

    updateTaskbarInfo(track) {
        if (!track) return;

        const taskbarIcon = document.querySelector('.taskbar-icon[data-app="music"], .taskbar-icon[data-app="music-player"]');
        if (taskbarIcon) {
            taskbarIcon.title = `Music: ${track.title} - ${track.artist}`;
            taskbarIcon.classList.add('running');
        }

        const musicWindow = windowManager?.windows.get(this.windowId);
        if (musicWindow) {
            const titleEl = musicWindow.querySelector('.window-title');
            if (titleEl) {
                titleEl.textContent = `Music - ${track.title}`;
            }
        }
    }
}

const musicPlayerApp = new MusicPlayerApp();
window.musicPlayerApp = musicPlayerApp;
