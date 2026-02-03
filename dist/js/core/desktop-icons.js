// Desktop Icon Carousel - Premium Interactive Experience
class DesktopIconCarousel {
    constructor() {
        this.carousel = document.getElementById('desktop-icon-carousel');
        this.track = document.getElementById('carousel-track');
        this.navLeft = document.getElementById('carousel-nav-left');
        this.navRight = document.getElementById('carousel-nav-right');
        this.modalOverlay = document.getElementById('icon-modal-overlay');
        this.modalIcon = document.getElementById('icon-modal-icon');
        this.modalName = document.getElementById('icon-modal-name');
        this.modalOpenBtn = document.getElementById('icon-modal-open');
        this.modalCancelBtn = document.getElementById('icon-modal-cancel');
        
        this.currentApp = null;
        this.scrollPosition = 0;
        this.isScrolling = false;
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.isDragging = false;
        this.autoScrollInterval = null;
        this.autoScrollDirection = 1; // 1 for right, -1 for left
        this.isPaused = false;
        
        this.init();
    }
    
    init() {
        if (!this.carousel || !this.track) {
            console.warn('Desktop icon carousel elements not found');
            return;
        }
        
        this.renderIcons();
        this.setupEventListeners();
        this.startAutoScroll();
        this.enhanceTitleAnimations();
    }
    
    enhanceTitleAnimations() {
        // Simplified - removed heavy sparkle effects for performance
        const titleLetters = document.querySelectorAll('.title-letter');
        
        titleLetters.forEach((letter) => {
            // Simple hover effect only
            letter.addEventListener('mouseenter', () => {
                letter.style.transform = 'translateY(-8px) scale(1.1)';
            });
            letter.addEventListener('mouseleave', () => {
                letter.style.transform = '';
            });
        });
        
        // Throttled cursor tracking glow effect
        const titleContainer = document.querySelector('.desktop-title-container');
        if (titleContainer) {
            let lastTime = 0;
            const throttleDelay = 50; // Update max 20 times per second
            
            titleContainer.addEventListener('mousemove', (e) => {
                const now = Date.now();
                if (now - lastTime < throttleDelay) return;
                lastTime = now;
                
                const rect = titleContainer.getBoundingClientRect();
                const x = ((e.clientX - rect.left) / rect.width) * 100;
                const y = ((e.clientY - rect.top) / rect.height) * 100;
                
                const glowEffect = document.querySelector('.title-glow-effect');
                if (glowEffect) {
                    glowEffect.style.background = `radial-gradient(
                        ellipse 400px 300px at ${x}% ${y}%,
                        rgba(99, 102, 241, 0.2) 0%,
                        rgba(139, 92, 246, 0.15) 30%,
                        transparent 70%
                    )`;
                }
            }, { passive: true });
        }
    }
    
    // Removed createSparkle - was causing performance issues
    
    renderIcons() {
        if (!this.track || typeof APP_REGISTRY === 'undefined') {
            console.warn('APP_REGISTRY not available or track not found');
            return;
        }
        
        // Get all apps from registry
        const apps = Object.entries(APP_REGISTRY);
        
        // Clear existing icons
        this.track.innerHTML = '';
        
        // Create icon items - duplicate them for seamless looping
        const iconItems = [];
        apps.forEach(([appId, app]) => {
            const iconItem = document.createElement('div');
            iconItem.className = 'desktop-icon-item';
            iconItem.dataset.app = appId;
            iconItem.dataset.url = appId === 'ai-chat' ? 'ai-chat.html' : 
                                  appId === 'browser' ? 'https://www.google.com' : '';
            
            iconItem.innerHTML = `
                <div class="desktop-icon-wrapper">
                    ${app.iconSVG}
                </div>
                <div class="desktop-icon-name">${app.title}</div>
            `;
            
            // Add click/touch handler
            iconItem.addEventListener('click', (e) => {
                e.stopPropagation();
                this.handleIconClick(appId, app, iconItem);
            });
            
            this.track.appendChild(iconItem);
            iconItems.push(iconItem);
        });
        
        // Duplicate icons for seamless infinite scroll
        iconItems.forEach(item => {
            const clone = item.cloneNode(true);
            clone.addEventListener('click', (e) => {
                e.stopPropagation();
                const appId = item.dataset.app;
                const app = APP_REGISTRY[appId];
                if (app) {
                    this.handleIconClick(appId, app, item);
                }
            });
            this.track.appendChild(clone);
        });
    }
    
    setupEventListeners() {
        // Hide navigation buttons since we're using auto-scroll
        if (this.navLeft) {
            this.navLeft.style.display = 'none';
        }
        if (this.navRight) {
            this.navRight.style.display = 'none';
        }
        
        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (this.modalOverlay && this.modalOverlay.classList.contains('active')) {
                if (e.key === 'Escape') {
                    this.closeModal();
                } else if (e.key === 'Enter') {
                    this.openApp();
                }
            }
        });
        
        // Touch/swipe support
        if (this.track) {
            this.track.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: true });
            this.track.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: true });
            this.track.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: true });
            
            // Mouse drag support
            this.track.addEventListener('mousedown', (e) => this.handleMouseDown(e));
            this.track.addEventListener('mousemove', (e) => this.handleMouseMove(e));
            this.track.addEventListener('mouseup', () => this.handleMouseUp());
            this.track.addEventListener('mouseleave', () => this.handleMouseUp());
            
            // Pause auto-scroll on user interaction for better UX
            this.track.addEventListener('mouseenter', () => {
                this.pauseAutoScroll();
            });
            
            this.track.addEventListener('mouseleave', () => {
                this.resumeAutoScroll();
            });
            
            // Pause on touch/drag
            this.track.addEventListener('touchstart', () => {
                this.pauseAutoScroll();
            });
            
            this.track.addEventListener('mousedown', () => {
                this.pauseAutoScroll();
            });
            
            // Resume after interaction ends
            this.track.addEventListener('touchend', () => {
                setTimeout(() => this.resumeAutoScroll(), 2000);
            });
            
            this.track.addEventListener('mouseup', () => {
                setTimeout(() => this.resumeAutoScroll(), 1000);
            });
        }
        
        // Modal buttons
        if (this.modalOpenBtn) {
            this.modalOpenBtn.addEventListener('click', () => this.openApp());
        }
        
        if (this.modalCancelBtn) {
            this.modalCancelBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Close modal on overlay click
        if (this.modalOverlay) {
            this.modalOverlay.addEventListener('click', (e) => {
                if (e.target === this.modalOverlay) {
                    this.closeModal();
                }
            });
        }
        
        // Smooth scroll on wheel
        if (this.track) {
            this.track.addEventListener('wheel', (e) => {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    e.preventDefault();
                    this.track.scrollLeft += e.deltaY;
                }
            }, { passive: false });
        }
    }
    
    handleIconClick(appId, app, iconElement) {
        // Prevent if dragging
        if (this.isDragging) {
            return;
        }
        
        // Store current app info
        this.currentApp = {
            id: appId,
            app: app,
            element: iconElement
        };
        
        // Show modal with enlarged icon
        this.showModal(appId, app);
    }
    
    showModal(appId, app) {
        if (!this.modalOverlay || !this.modalIcon || !this.modalName) return;
        
        // Set modal content
        this.modalIcon.innerHTML = app.iconSVG;
        this.modalName.textContent = app.title;
        
        // Show modal
        this.modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden';
        
        // Add entrance animation
        const modal = this.modalOverlay.querySelector('.icon-modal');
        if (modal) {
            modal.style.animation = 'modalScaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
            
            // Ensure modal is visible and fits viewport
            this.ensureModalVisible(modal);
        }
    }
    
    ensureModalVisible(modal) {
        if (!modal) return;
        
        // Wait for next frame to ensure layout is calculated
        requestAnimationFrame(() => {
            const rect = modal.getBoundingClientRect();
            const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
            const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
            
            // Check if modal exceeds viewport
            if (rect.width > viewportWidth - 40) {
                modal.style.maxWidth = `${viewportWidth - 40}px`;
            }
            
            if (rect.height > viewportHeight - 40) {
                modal.style.maxHeight = `${viewportHeight - 40}px`;
            }
            
            // Ensure modal is centered and visible
            if (rect.top < 20) {
                modal.style.marginTop = '20px';
            }
            
            if (rect.bottom > viewportHeight - 20) {
                modal.style.marginBottom = '20px';
            }
            
            if (rect.left < 20) {
                modal.style.marginLeft = '20px';
            }
            
            if (rect.right > viewportWidth - 20) {
                modal.style.marginRight = '20px';
            }
        });
    }
    
    closeModal() {
        if (!this.modalOverlay) return;
        
        this.modalOverlay.classList.remove('active');
        document.body.style.overflow = '';
        this.currentApp = null;
    }
    
    openApp() {
        if (!this.currentApp) return;
        
        const { id, app } = this.currentApp;
        const url = this.currentApp.element?.dataset.url || null;
        
        console.log('Opening app:', id, 'with URL:', url);
        
        // Close modal
        this.closeModal();
        
        // Small delay for smooth transition
        setTimeout(() => {
            // Use desktop's openApp method if available
            if (typeof desktop !== 'undefined' && desktop.openApp) {
                console.log('Using desktop.openApp');
                desktop.openApp(id, url);
            } else if (app && app.open) {
                console.log('Using app.open');
                app.open(url);
            } else {
                console.error('No method to open app:', id);
                // Fallback: directly open URL if available
                if (url && (id === 'ai-chat' || id === 'browser')) {
                    console.log('Fallback: opening URL directly');
                    window.open(url, '_blank');
                }
            }
        }, 200);
    }
    
    scrollLeft() {
        if (!this.track || this.isScrolling) return;
        
        this.isScrolling = true;
        const scrollAmount = this.track.clientWidth * 0.8;
        const targetScroll = Math.max(0, this.track.scrollLeft - scrollAmount);
        
        this.smoothScrollTo(targetScroll, () => {
            this.isScrolling = false;
            this.updateNavButtons();
        });
    }
    
    scrollRight() {
        if (!this.track) {
            console.warn('Track not found');
            return;
        }
        
        if (this.isScrolling) {
            return; // Prevent multiple simultaneous scrolls
        }
        
        this.isScrolling = true;
        const scrollAmount = this.track.clientWidth * 0.8;
        const maxScroll = this.track.scrollWidth - this.track.clientWidth;
        const currentScroll = this.track.scrollLeft;
        const targetScroll = Math.min(maxScroll, currentScroll + scrollAmount);
        
        this.smoothScrollTo(targetScroll, () => {
            this.isScrolling = false;
            this.updateNavButtons();
        });
    }
    
    smoothScrollTo(target, callback) {
        if (!this.track) return;
        
        // Use native smooth scroll for better performance
        this.track.scrollTo({
            left: target,
            behavior: 'smooth'
        });
        
        // Call callback after animation (approximate duration)
        if (callback) {
            setTimeout(callback, 600);
        }
    }
    
    updateNavButtons() {
        if (!this.track || !this.navLeft || !this.navRight) return;
        
        const scrollLeft = this.track.scrollLeft;
        const maxScroll = this.track.scrollWidth - this.track.clientWidth;
        
        // Update left button
        if (scrollLeft <= 5) {
            this.navLeft.classList.add('disabled');
        } else {
            this.navLeft.classList.remove('disabled');
        }
        
        // Update right button
        if (scrollLeft >= maxScroll - 5) {
            this.navRight.classList.add('disabled');
        } else {
            this.navRight.classList.remove('disabled');
        }
    }
    
    // Touch/Swipe handlers
    handleTouchStart(e) {
        this.touchStartX = e.touches[0].clientX;
        this.touchStartY = e.touches[0].clientY;
        this.isDragging = false;
    }
    
    handleTouchMove(e) {
        if (!this.touchStartX || !this.touchStartY) return;
        
        const touchX = e.touches[0].clientX;
        const touchY = e.touches[0].clientY;
        const deltaX = Math.abs(touchX - this.touchStartX);
        const deltaY = Math.abs(touchY - this.touchStartY);
        
        // If horizontal movement is greater, it's a swipe
        if (deltaX > deltaY && deltaX > 10) {
            this.isDragging = true;
            const scrollDelta = this.touchStartX - touchX;
            if (this.track) {
                this.track.scrollLeft += scrollDelta;
            }
            this.touchStartX = touchX;
        }
    }
    
    handleTouchEnd(e) {
        this.touchStartX = 0;
        this.touchStartY = 0;
        // Reset dragging flag after a short delay to allow click events
        setTimeout(() => {
            this.isDragging = false;
        }, 100);
    }
    
    // Mouse drag handlers
    handleMouseDown(e) {
        this.isDragging = true;
        this.touchStartX = e.clientX;
        this.track.style.cursor = 'grabbing';
        this.track.style.userSelect = 'none';
    }
    
    handleMouseMove(e) {
        if (!this.isDragging) return;
        
        e.preventDefault();
        const deltaX = this.touchStartX - e.clientX;
        if (this.track) {
            this.track.scrollLeft += deltaX;
        }
        this.touchStartX = e.clientX;
    }
    
    handleMouseUp() {
        this.isDragging = false;
        if (this.track) {
            this.track.style.cursor = 'grab';
            this.track.style.userSelect = '';
        }
        // Reset dragging flag after a short delay
        setTimeout(() => {
            this.isDragging = false;
        }, 100);
    }
    
    startAutoScroll() {
        if (!this.track) return;
        
        // Clear any existing interval
        this.stopAutoScroll();
        
        // Wait a bit before starting auto-scroll
        setTimeout(() => {
            if (!this.track) return;
            
            // Optimized auto-scroll with frame skipping for better performance
            const scrollSpeed = 1.5; // Reduced speed for smoother performance
            let lastFrameTime = performance.now();
            const targetFPS = 30; // Target 30fps instead of 60fps for better performance
            const frameInterval = 1000 / targetFPS;
            
            const autoScroll = (currentTime) => {
                // Skip frame if too soon (throttle to target FPS)
                if (currentTime - lastFrameTime < frameInterval) {
                    this.autoScrollInterval = requestAnimationFrame(autoScroll);
                    return;
                }
                
                if (this.isPaused || this.isDragging || !this.track) {
                    this.autoScrollInterval = requestAnimationFrame(autoScroll);
                    return;
                }
                
                // Check if element is visible (Intersection Observer would be better, but this is simpler)
                const rect = this.track.getBoundingClientRect();
                const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
                
                if (!isVisible) {
                    // Element not visible, skip animation
                    this.autoScrollInterval = requestAnimationFrame(autoScroll);
                    return;
                }
                
                const trackWidth = this.track.scrollWidth / 2; // Half because we duplicated icons
                const currentScroll = this.track.scrollLeft;
                
                // If we've scrolled past the first set of icons, reset seamlessly
                if (currentScroll >= trackWidth - 10) {
                    // Instant reset to start (seamless loop - user won't notice)
                    this.track.scrollLeft = currentScroll - trackWidth;
                } else {
                    // Continue scrolling right
                    this.track.scrollLeft += scrollSpeed;
                }
                
                lastFrameTime = currentTime;
                this.autoScrollInterval = requestAnimationFrame(autoScroll);
            };
            
            this.autoScrollInterval = requestAnimationFrame(autoScroll);
        }, 1000); // Start after 1 second
    }
    
    stopAutoScroll() {
        if (this.autoScrollInterval) {
            cancelAnimationFrame(this.autoScrollInterval);
            this.autoScrollInterval = null;
        }
    }
    
    pauseAutoScroll() {
        this.isPaused = true;
        if (this.track) {
            this.track.style.animationPlayState = 'paused';
        }
    }
    
    resumeAutoScroll() {
        this.isPaused = false;
        if (this.track && !this.isDragging) {
            this.track.style.animationPlayState = 'running';
        }
    }
}

// Initialize carousel when DOM is ready and APP_REGISTRY is available
let desktopIconCarousel;

function initDesktopIconCarousel() {
    // Wait for APP_REGISTRY to be available
    if (typeof APP_REGISTRY === 'undefined') {
        // Retry after a short delay
        setTimeout(initDesktopIconCarousel, 100);
        return;
    }
    
    desktopIconCarousel = new DesktopIconCarousel();
    
    // Export for global access
    if (typeof window !== 'undefined') {
        window.desktopIconCarousel = desktopIconCarousel;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Wait a bit more for all scripts to load
        setTimeout(initDesktopIconCarousel, 200);
    });
} else {
    // Wait a bit more for all scripts to load
    setTimeout(initDesktopIconCarousel, 200);
}
