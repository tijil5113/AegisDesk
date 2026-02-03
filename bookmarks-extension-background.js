// Aegis Desk Bookmarks Extension - Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
    console.log('Aegis Desk Bookmarks Extension installed');
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'saveBookmark') {
        // Forward to Aegis Desk if available
        chrome.tabs.query({ url: '*://*/*' }, (tabs) => {
            tabs.forEach(tab => {
                chrome.tabs.sendMessage(tab.id, {
                    action: 'forwardBookmark',
                    bookmark: request.bookmark
                });
            });
        });
        sendResponse({ success: true });
    }
    return true;
});
