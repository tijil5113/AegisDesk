// Main Application Entry Point
document.addEventListener('DOMContentLoaded', () => {
    console.log('AegisDesk initialized');
    
    // Register Service Worker for PWA support
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/sw.js')
                .then((registration) => {
                    console.log('Service Worker registered:', registration.scope);
                    
                    // Check for updates
                    registration.addEventListener('updatefound', () => {
                        const newWorker = registration.installing;
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New service worker available
                                if (confirm('A new version of AegisDesk is available. Reload to update?')) {
                                    window.location.reload();
                                }
                            }
                        });
                    });
                })
                .catch((error) => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }
    
    // Wait a bit to ensure all scripts are loaded
    setTimeout(() => {
        // Verify all apps are loaded
        console.log('Checking app availability...');
        console.log('browserApp:', typeof browserApp !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
        console.log('windowManager:', typeof windowManager !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
        console.log('desktop:', typeof desktop !== 'undefined' ? 'Available' : 'NOT AVAILABLE');
        
        // Re-setup search if needed (in case it didn't work the first time)
        if (typeof desktop !== 'undefined' && desktop.searchInput) {
            console.log('Re-setting up search...');
            desktop.setupSearch();
        }
    }, 100);
    
    // Welcome message and test notification
    setTimeout(() => {
        console.log('Welcome to AegisDesk! Press Alt+Space to open the apps menu.');
        
        // Show welcome notification with new features
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.success('AegisDesk Enhanced!', 'New features loaded: Themes, Notifications, Virtual Desktops, and more!', {
                duration: 5000
            });
        }
    }, 3000);
    
    // Prevent context menu on desktop (optional)
    document.addEventListener('contextmenu', (e) => {
        if (e.target.classList.contains('desktop-background')) {
            // Could show desktop context menu here
        }
    });
    
    // Handle window resize - Heavily debounced for performance
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            // Only update if window manager is available
            if (typeof windowManager !== 'undefined' && windowManager.windows) {
                // Use requestAnimationFrame for smooth updates
                requestAnimationFrame(() => {
                    windowManager.windows.forEach(win => {
                        const rect = win.getBoundingClientRect();
                        const maxLeft = window.innerWidth - rect.width;
                        const maxTop = window.innerHeight - rect.height - 48;
                        
                        if (parseInt(win.style.left) > maxLeft) {
                            win.style.left = Math.max(0, maxLeft) + 'px';
                        }
                        if (parseInt(win.style.top) > maxTop) {
                            win.style.top = Math.max(0, maxTop) + 'px';
                        }
                    });
                });
            }
        }, 500); // Increased debounce from 250ms to 500ms
    }, { passive: true });
    
    // Performance optimization: Use passive listeners where possible
    document.addEventListener('touchstart', () => {}, { passive: true });
});

