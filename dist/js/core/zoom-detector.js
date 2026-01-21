// Zoom Detection and Scaling System
// Detects browser zoom and applies CSS scaling accordingly
class ZoomDetector {
    constructor() {
        this.scaleFactor = 1;
        this.updateInterval = null;
        this.init();
    }

    init() {
        this.updateScale();
        
        // Update on resize (handles zoom changes) - Debounced heavily
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this.updateScale(), 300); // Increased debounce
        }, { passive: true });

        // Update on zoom (if supported)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                clearTimeout(this.updateInterval);
                this.updateInterval = setTimeout(() => this.updateScale(), 100);
            });
        }

        // Initial scale application
        this.applyScale();
    }

    updateScale() {
        // Detect zoom level using devicePixelRatio
        const devicePixelRatio = window.devicePixelRatio || 1;
        const screenWidth = window.screen.width;
        const innerWidth = window.innerWidth;
        
        // Calculate zoom percentage
        const zoomLevel = (innerWidth / screenWidth) * devicePixelRatio;
        
        // Normalize to scale factor (1.0 = 100%, 1.1 = 110%, etc.)
        this.scaleFactor = Math.round(zoomLevel * 100) / 100;
        
        // Clamp between 0.5 and 3.0 for safety
        this.scaleFactor = Math.max(0.5, Math.min(3.0, this.scaleFactor));
        
        this.applyScale();
    }

    applyScale() {
        const root = document.documentElement;
        root.style.setProperty('--scale-factor', this.scaleFactor);
        root.style.setProperty('--zoom-level', `${Math.round(this.scaleFactor * 100)}%`);
        
        // Dispatch event for other components
        document.dispatchEvent(new CustomEvent('zoomchange', { 
            detail: { scaleFactor: this.scaleFactor } 
        }));
    }

    getScaleFactor() {
        return this.scaleFactor;
    }
}

// Initialize globally
const zoomDetector = new ZoomDetector();
