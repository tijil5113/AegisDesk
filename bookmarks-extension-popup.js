// Aegis Desk Bookmarks Extension - Popup Script
document.getElementById('save-bookmark').addEventListener('click', async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // Get page metadata
    const bookmark = {
        url: tab.url,
        title: tab.title,
        favicon: tab.faviconUrl || `https://www.google.com/s2/favicons?domain=${new URL(tab.url).hostname}&sz=32`
    };
    
    // Send to Aegis Desk
    try {
        // Try to communicate with Aegis Desk page
        chrome.tabs.sendMessage(tab.id, {
            action: 'saveBookmark',
            bookmark: bookmark
        }, (response) => {
            if (chrome.runtime.lastError) {
                // Fallback: open Aegis Desk and pass bookmark data
                chrome.tabs.create({
                    url: chrome.runtime.getURL('aegis-desk.html?bookmark=' + encodeURIComponent(JSON.stringify(bookmark)))
                });
            } else {
                document.getElementById('status').textContent = '✓ Saved to Aegis Desk!';
                setTimeout(() => window.close(), 1500);
            }
        });
    } catch (e) {
        document.getElementById('status').textContent = 'Please open Aegis Desk to save bookmarks';
    }
});
