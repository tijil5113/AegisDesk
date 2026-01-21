// Boot Sequence Controller
class BootSequence {
    constructor() {
        this.overlay = document.getElementById('boot-overlay');
        this.duration = 2800; // 2.8 seconds
        this.startTime = null;
    }

    start() {
        if (!this.overlay) return;
        
        this.startTime = Date.now();
        
        // Hide boot overlay after sequence
        setTimeout(() => {
            this.complete();
        }, this.duration);
    }

    complete() {
        if (!this.overlay) return;
        
        // Add hidden class for fade out
        this.overlay.classList.add('hidden');
        
        // Remove from DOM after fade
        setTimeout(() => {
            if (this.overlay && this.overlay.parentNode) {
                this.overlay.style.display = 'none';
            }
            
            // Trigger desktop reveal
            document.body.classList.add('desktop-ready');
            
            // Initialize parallax
            if (typeof parallaxController !== 'undefined') {
                parallaxController.init();
            }
        }, 500);
    }

    skip() {
        this.complete();
    }
}

// Auto-start boot sequence
const bootSequence = new BootSequence();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        bootSequence.start();
    });
} else {
    bootSequence.start();
}
