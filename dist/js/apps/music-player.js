// Music Player App - OS Integration
class MusicPlayerApp {
    constructor() {
        this.windowId = 'music-player';
        this.isStandalone = false;
    }

    open() {
        // Check if we're in desktop mode or standalone
        if (typeof windowManager !== 'undefined') {
            // Open as window in desktop
            this.openAsWindow();
        } else {
            // Open as standalone page
            this.openAsStandalone();
        }
    }
    
    openAsWindow() {
        const content = this.renderWindowContent();
        const window = windowManager.createWindow(this.windowId, {
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

        this.attachWindowEvents(window);
        this.loadMusicSystem(window);
    }
    
    openAsStandalone() {
        // Redirect to music.html
        window.location.href = 'music.html';
    }
    
    renderWindowContent() {
        return `
            <div class="music-window-container">
                <iframe src="music.html" frameborder="0" style="width: 100%; height: 100%; border: none;"></iframe>
            </div>
        `;
    }
    
    attachWindowEvents(window) {
        // Window-specific events can be added here
        // The iframe will handle its own events
    }
    
    loadMusicSystem(window) {
        // The music system is loaded in the iframe
        // We can communicate via postMessage if needed
        window.addEventListener('message', (event) => {
            if (event.data.type === 'music-track-change') {
                this.updateTaskbarInfo(event.data.track);
            }
        });
    }
    
    updateTaskbarInfo(track) {
        if (!track) return;
        
        // Update taskbar icon tooltip
        const taskbarIcon = document.querySelector('.taskbar-icon[data-app="music-player"]');
        if (taskbarIcon) {
            taskbarIcon.title = `Music: ${track.title} - ${track.artist}`;
            taskbarIcon.classList.add('running');
        }
        
        // Update window title
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
