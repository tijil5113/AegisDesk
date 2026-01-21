// Parallax Desktop Controller - Performance Optimized
class ParallaxController {
    constructor() {
        // Auto-disable parallax on low-power / constrained devices for smoother performance
        this.enabled = this.shouldEnableParallax();
        this.intensity = 0.01; // Further reduced for better performance
        this.mouseX = 0;
        this.mouseY = 0;
        this.targetX = 0;
        this.targetY = 0;
        this.currentX = 0;
        this.currentY = 0;
        this.cursorGlow = null;
        this.animationFrame = null;
        this.isAnimating = false;
        this.lastUpdate = 0;
        this.throttleDelay = 32; // ~30fps max update rate (was 60fps)
        this.mouseMoveThrottle = null;
        this.lastMouseMove = 0;
        this.mouseMoveDelay = 100; // Throttle mouse move to 10fps (was 20fps)
    }

    shouldEnableParallax() {
        try {
            // Respect OS-level reduced motion preference
            if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
                return false;
            }

            // Heuristic: disable on very low-core devices
            if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) {
                return false;
            }

            // Heuristic: disable on very low memory devices when available
            if (navigator.deviceMemory && navigator.deviceMemory <= 2) {
                return false;
            }
        } catch (e) {
            // If anything goes wrong, fall back to enabled state
        }

        return true;
    }

    init() {
        if (!this.enabled) return;
        
        this.cursorGlow = document.getElementById('cursor-glow');
        document.body.classList.add('parallax-active');
        
        // Throttled mouse move handler for better performance
        document.addEventListener('mousemove', (e) => {
            const now = Date.now();
            if (now - this.lastMouseMove < this.mouseMoveDelay) return;
            this.lastMouseMove = now;
            
            if (this.mouseMoveThrottle) {
                cancelAnimationFrame(this.mouseMoveThrottle);
            }
            
            this.mouseMoveThrottle = requestAnimationFrame(() => {
                this.handleMouseMove(e);
            });
        }, { passive: true });
        
        // Mouse leave handler
        document.addEventListener('mouseleave', () => {
            this.handleMouseLeave();
        }, { passive: true });
        
        // Start optimized animation loop
        this.animate();
    }

    handleMouseMove(e) {
        const centerX = window.innerWidth / 2;
        const centerY = window.innerHeight / 2;
        
        // Calculate offset from center
        const offsetX = (e.clientX - centerX) * this.intensity;
        const offsetY = (e.clientY - centerY) * this.intensity;
        
        this.targetX = offsetX;
        this.targetY = offsetY;
        
        // Update cursor glow position (throttled)
        if (this.cursorGlow) {
            this.cursorGlow.style.setProperty('--mouse-x', e.clientX + 'px');
            this.cursorGlow.style.setProperty('--mouse-y', e.clientY + 'px');
            this.cursorGlow.classList.add('active');
        }
        
        // Start animation if not already running
        if (!this.isAnimating) {
            this.isAnimating = true;
        }
    }

    handleMouseLeave() {
        // Reset to center
        this.targetX = 0;
        this.targetY = 0;
        
        if (this.cursorGlow) {
            this.cursorGlow.classList.remove('active');
        }
    }

    animate() {
        if (!this.enabled) {
            // Stop animation loop if disabled
            this.animationFrame = null;
            return;
        }
        
        const now = performance.now();
        
        // Throttle animation updates to ~30fps max (was 60fps)
        if (now - this.lastUpdate >= this.throttleDelay) {
            // Check if we need to animate (target and current are different)
            const dx = Math.abs(this.targetX - this.currentX);
            const dy = Math.abs(this.targetY - this.currentY);
            
            // Only update if difference is significant (was 0.1)
            if (dx > 0.5 || dy > 0.5) {
                // Faster interpolation for snappier feel
                this.currentX += (this.targetX - this.currentX) * 0.2;
                this.currentY += (this.targetY - this.currentY) * 0.2;
                
                // Apply to CSS variables
                document.documentElement.style.setProperty('--parallax-x', this.currentX + 'px');
                document.documentElement.style.setProperty('--parallax-y', this.currentY + 'px');
                
                this.lastUpdate = now;
                this.isAnimating = true;
            } else {
                // Snap to target if very close
                this.currentX = this.targetX;
                this.currentY = this.targetY;
                this.isAnimating = false;
                
                // Stop animation loop when not needed
                if (this.targetX === 0 && this.targetY === 0) {
                    this.animationFrame = null;
                    return;
                }
            }
        }
        
        this.animationFrame = requestAnimationFrame(() => this.animate());
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.mouseMoveThrottle) {
            cancelAnimationFrame(this.mouseMoveThrottle);
        }
        document.body.classList.remove('parallax-active');
    }
}

const parallaxController = new ParallaxController();
