// Aegis Desk Bookmarks Extension - Content Script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveBookmark') {
        // Extract page metadata
        const bookmark = {
            title: document.title,
            url: window.location.href,
            description: document.querySelector('meta[name="description"]')?.content || '',
            favicon: document.querySelector('link[rel="icon"]')?.href || 
                    document.querySelector('link[rel="shortcut icon"]')?.href || 
                    `https://www.google.com/s2/favicons?domain=${window.location.hostname}&sz=32`,
            preview: document.querySelector('meta[property="og:image"]')?.content || null
        };
        
        // Send to Aegis Desk if available
        if (window.bookmarksApp) {
            window.bookmarksApp.saveBookmark({
                id: `bookmark_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                name: bookmark.title,
                url: bookmark.url,
                description: bookmark.description,
                dateAdded: new Date().toISOString(),
                visitCount: 0,
                favorite: false,
                tags: [],
                folder: null,
                favicon: bookmark.favicon,
                preview: bookmark.preview
            });
            sendResponse({ success: true });
        } else {
            sendResponse({ success: false, error: 'Aegis Desk not found' });
        }
    }
});

// Show prompt when user visits a new page
let lastUrl = window.location.href;
setTimeout(() => {
    if (window.location.href !== lastUrl && window.bookmarksApp) {
        // Optional: Show a small notification
        console.log('Aegis Desk: Ready to save this page');
    }
}, 2000);
