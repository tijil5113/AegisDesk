// Browser App — Quick Launch opens sites in your system browser (no iframe)
const QUICK_LAUNCH_CATEGORIES = [
    { id: 'search', icon: '🔎', title: 'Search & Browsers', links: [
        { name: 'Google', url: 'https://www.google.com' }, { name: 'Bing', url: 'https://www.bing.com' },
        { name: 'DuckDuckGo', url: 'https://duckduckgo.com' }, { name: 'Yahoo Search', url: 'https://search.yahoo.com' },
        { name: 'Baidu', url: 'https://www.baidu.com' }
    ]},
    { id: 'video', icon: '🎥', title: 'Videos & Streaming', links: [
        { name: 'YouTube', url: 'https://www.youtube.com' }, { name: 'Vimeo', url: 'https://vimeo.com' },
        { name: 'Twitch', url: 'https://www.twitch.tv' }, { name: 'Netflix', url: 'https://www.netflix.com' },
        { name: 'Hulu', url: 'https://www.hulu.com' }
    ]},
    { id: 'shopping', icon: '🛍️', title: 'Shopping & Deals', links: [
        { name: 'Amazon', url: 'https://www.amazon.com' }, { name: 'eBay', url: 'https://www.ebay.com' },
        { name: 'Etsy', url: 'https://www.etsy.com' }, { name: 'Walmart', url: 'https://www.walmart.com' },
        { name: 'Target', url: 'https://www.target.com' }
    ]},
    { id: 'social', icon: '🌐', title: 'Social Media', links: [
        { name: 'Facebook', url: 'https://www.facebook.com' }, { name: 'Instagram', url: 'https://www.instagram.com' },
        { name: 'X (Twitter)', url: 'https://www.twitter.com' }, { name: 'LinkedIn', url: 'https://www.linkedin.com' },
        { name: 'Reddit', url: 'https://www.reddit.com' }
    ]},
    { id: 'tech', icon: '🧠', title: 'Tech & AI', links: [
        { name: 'ChatGPT', url: 'https://chat.openai.com' }, { name: 'OpenAI', url: 'https://openai.com' },
        { name: 'Claude', url: 'https://www.claude.ai' }, { name: 'IBM Cloud', url: 'https://www.ibm.com/cloud' },
        { name: 'Google Cloud', url: 'https://cloud.google.com' }
    ]},
    { id: 'learning', icon: '💡', title: 'Learning & Knowledge', links: [
        { name: 'Wikipedia', url: 'https://www.wikipedia.org' }, { name: 'Khan Academy', url: 'https://www.khanacademy.org' },
        { name: 'Coursera', url: 'https://www.coursera.org' }, { name: 'Udemy', url: 'https://www.udemy.com' },
        { name: 'edX', url: 'https://www.edx.org' }
    ]},
    { id: 'news', icon: '📰', title: 'News & Info', links: [
        { name: 'CNN', url: 'https://www.cnn.com' }, { name: 'BBC', url: 'https://www.bbc.com' },
        { name: 'NY Times', url: 'https://www.nytimes.com' }, { name: 'Forbes', url: 'https://www.forbes.com' },
        { name: 'TechCrunch', url: 'https://www.techcrunch.com' }
    ]},
    { id: 'dev', icon: '💻', title: 'Developer & Tech Tools', links: [
        { name: 'GitHub', url: 'https://github.com' }, { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
        { name: 'MDN', url: 'https://developer.mozilla.org' }, { name: 'CodePen', url: 'https://codepen.io' },
        { name: 'JSFiddle', url: 'https://jsfiddle.net' }
    ]},
    { id: 'email', icon: '📧', title: 'Email & Communication', links: [
        { name: 'Gmail', url: 'https://mail.google.com' }, { name: 'Outlook', url: 'https://outlook.live.com' },
        { name: 'Yahoo Mail', url: 'https://www.yahoo.com/mail' }, { name: 'Zoom', url: 'https://www.zoom.us' },
        { name: 'Slack', url: 'https://slack.com' }
    ]},
    { id: 'productivity', icon: '📊', title: 'Productivity & Cloud', links: [
        { name: 'Google Drive', url: 'https://drive.google.com' }, { name: 'Microsoft 365', url: 'https://www.office.com' },
        { name: 'Dropbox', url: 'https://www.dropbox.com' }, { name: 'Notion', url: 'https://www.notion.so' },
        { name: 'Trello', url: 'https://trello.com' }
    ]}
];

// Top 100 Popular Websites in India — Quick Launch India
const QUICK_LAUNCH_INDIA = [
    { id: 'search-in', icon: '🔎', title: 'Search & General', links: [
        { name: 'Google India', url: 'https://www.google.co.in' }, { name: 'Google', url: 'https://www.google.com' },
        { name: 'Bing', url: 'https://www.bing.com' }, { name: 'DuckDuckGo', url: 'https://duckduckgo.com' },
        { name: 'Yahoo Search', url: 'https://search.yahoo.com' }
    ]},
    { id: 'video-in', icon: '📺', title: 'Video & Streaming', links: [
        { name: 'YouTube', url: 'https://www.youtube.com' }, { name: 'Disney+ Hotstar', url: 'https://www.hotstar.com' },
        { name: 'Netflix', url: 'https://www.netflix.com' }, { name: 'MX Player', url: 'https://www.mxplayer.in' },
        { name: 'JioCinema', url: 'https://www.jiocinema.com' }
    ]},
    { id: 'ecommerce-in', icon: '🛍️', title: 'E-Commerce & Shopping', links: [
        { name: 'Amazon India', url: 'https://www.amazon.in' }, { name: 'Flipkart', url: 'https://www.flipkart.com' },
        { name: 'Myntra', url: 'https://www.myntra.com' }, { name: 'Meesho', url: 'https://www.meesho.com' },
        { name: 'Tata Cliq', url: 'https://www.tatacliq.com' }, { name: 'Snapdeal', url: 'https://www.snapdeal.com' },
        { name: 'ShopClues', url: 'https://www.shopclues.com' }, { name: 'Paytm Mall', url: 'https://www.paytmmall.com' },
        { name: 'Shoppers Stop', url: 'https://www.shoppersstop.com' }, { name: 'Bluestone', url: 'https://www.bluestone.com' }
    ]},
    { id: 'social-in', icon: '📱', title: 'Social Media & Messaging', links: [
        { name: 'Facebook', url: 'https://www.facebook.com' }, { name: 'Instagram', url: 'https://www.instagram.com' },
        { name: 'X (Twitter)', url: 'https://www.twitter.com' }, { name: 'LinkedIn', url: 'https://www.linkedin.com' },
        { name: 'WhatsApp Web', url: 'https://web.whatsapp.com' }, { name: 'Koo', url: 'https://www.kooapp.com' },
        { name: 'Reddit', url: 'https://www.reddit.com' }
    ]},
    { id: 'news-in', icon: '📰', title: 'News & Media', links: [
        { name: 'India Times', url: 'https://www.indiatimes.com' }, { name: 'NDTV', url: 'https://www.ndtv.com' },
        { name: 'The Hindu', url: 'https://www.thehindu.com' }, { name: 'Hindustan Times', url: 'https://www.hindustantimes.com' },
        { name: 'Aaj Tak', url: 'https://www.aajtak.in' }, { name: 'Indian Express', url: 'https://www.indianexpress.com' },
        { name: 'Telegraph India', url: 'https://www.telegraphindia.com' }, { name: 'Firstpost', url: 'https://www.firstpost.com' },
        { name: 'News18', url: 'https://www.news18.com' }, { name: 'Deccan Herald', url: 'https://www.deccanherald.com' },
        { name: 'The Quint', url: 'https://www.thequint.com' }, { name: 'OneIndia', url: 'https://www.oneindia.com' },
        { name: 'Cricbuzz', url: 'https://www.cricbuzz.com' }
    ]},
    { id: 'finance-in', icon: '📊', title: 'Finance & Business', links: [
        { name: 'Moneycontrol', url: 'https://www.moneycontrol.com' }, { name: 'HDFC Bank', url: 'https://www.hdfcbank.com' },
        { name: 'ICICI Bank', url: 'https://www.icicibank.com' }, { name: 'State Bank of India', url: 'https://www.sbi.co.in' },
        { name: 'NSE India', url: 'https://www.nseindia.com' }, { name: 'BSE India', url: 'https://www.bseindia.com' },
        { name: 'Zerodha', url: 'https://www.zerodha.com' }, { name: 'Upstox', url: 'https://www.upstox.com' },
        { name: 'Policybazaar', url: 'https://www.policybazaar.com' }
    ]},
    { id: 'education-in', icon: '🎓', title: 'Education & Reference', links: [
        { name: 'Wikipedia', url: 'https://www.wikipedia.org' }, { name: 'Khan Academy', url: 'https://www.khanacademy.org' },
        { name: 'Coursera', url: 'https://www.coursera.org' }, { name: 'edX', url: 'https://www.edx.org' },
        { name: 'SSC', url: 'https://www.ssc.nic.in' }, { name: 'NTA', url: 'https://www.nta.ac.in' }
    ]},
    { id: 'jobs-in', icon: '💼', title: 'Jobs & Career', links: [
        { name: 'Naukri', url: 'https://www.naukri.com' }, { name: 'Monster India', url: 'https://www.monsterindia.com' },
        { name: 'Times Jobs', url: 'https://www.timesjobs.com' }, { name: 'Indeed India', url: 'https://www.indeed.co.in' },
        { name: 'Shine', url: 'https://www.shine.com' }
    ]},
    { id: 'travel-in', icon: '🏨', title: 'Travel & Maps', links: [
        { name: 'IRCTC', url: 'https://www.irctc.co.in' }, { name: 'Cleartrip', url: 'https://www.cleartrip.com' },
        { name: 'Yatra', url: 'https://www.yatra.com' }, { name: 'Goibibo', url: 'https://www.goibibo.com' },
        { name: 'MakeMyTrip', url: 'https://www.makemytrip.com' }, { name: 'Kerala Tourism', url: 'https://www.keralatourism.org' }
    ]},
    { id: 'tech-in', icon: '📥', title: 'Tech & Developer Tools', links: [
        { name: 'GitHub', url: 'https://github.com' }, { name: 'Stack Overflow', url: 'https://stackoverflow.com' },
        { name: 'MDN', url: 'https://developer.mozilla.org' }, { name: 'CodePen', url: 'https://codepen.io' },
        { name: 'JSFiddle', url: 'https://jsfiddle.net' }, { name: 'Stack Exchange', url: 'https://www.stackexchange.com' }
    ]},
    { id: 'ai-in', icon: '🤖', title: 'AI & Cloud', links: [
        { name: 'ChatGPT', url: 'https://chat.openai.com' }, { name: 'OpenAI', url: 'https://openai.com' },
        { name: 'Claude', url: 'https://www.claude.ai' }, { name: 'Google Cloud', url: 'https://cloud.google.com' },
        { name: 'AWS', url: 'https://aws.amazon.com' }, { name: 'Azure', url: 'https://azure.microsoft.com' }
    ]},
    { id: 'tickets-in', icon: '🎟️', title: 'Tickets & Entertainment', links: [
        { name: 'BookMyShow', url: 'https://www.bookmyshow.com' }, { name: 'APKido', url: 'https://www.apkido.in' },
        { name: 'TicketNew', url: 'https://www.ticketnew.com' }, { name: 'Sony LIV', url: 'https://www.sonyliv.com' },
        { name: 'Zee5', url: 'https://www.zee5.com' }, { name: 'Shemaroo', url: 'https://www.shemaroome.com' }
    ]},
    { id: 'blogs-in', icon: '📖', title: 'Blogs & Lifestyle', links: [
        { name: 'Rediff', url: 'https://www.rediff.com' }, { name: 'Pinkvilla', url: 'https://www.pinkvilla.com' },
        { name: 'Snapdeal Blog', url: 'https://www.snapdeal.com/blog' }, { name: 'Lifehacker', url: 'https://www.lifehacker.com' },
        { name: 'Quora', url: 'https://www.quora.com' }
    ]},
    { id: 'gov-in', icon: '🧾', title: 'Government, Services & Misc', links: [
        { name: 'Income Tax India', url: 'https://www.incometax.gov.in' }, { name: 'Umang', url: 'https://www.umoja.nic.in' },
        { name: 'Passport India', url: 'https://www.passportindia.gov.in' }, { name: 'LIC', url: 'https://www.licindia.in' },
        { name: 'EPF India', url: 'https://www.epfindia.gov.in' }, { name: 'UPPCL', url: 'https://www.uppcl.org' }
    ]},
    { id: 'email-in', icon: '📬', title: 'Email & Communication', links: [
        { name: 'Gmail', url: 'https://mail.google.com' }, { name: 'Outlook', url: 'https://outlook.live.com' },
        { name: 'Yahoo Mail', url: 'https://mail.yahoo.com' }, { name: 'Zoho Mail', url: 'https://www.zoho.com/mail' },
        { name: 'Fastmail', url: 'https://www.fastmail.com' }
    ]}
];

class BrowserApp {
    constructor() {
        this.windowId = 'browser';
        this.customApps = storage.get('customApps', [
            { name: 'Google', url: 'https://www.google.com', icon: '🌐' },
            { name: 'YouTube', url: 'https://www.youtube.com', icon: '▶️' }
        ]);
    }

    open(url = null, title = 'Browser') {
        const windowId = `browser_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const content = this.renderQuickLaunch(url || '');
        const window = windowManager.createWindow(windowId, {
            title: title,
            width: 920,
            height: 720,
            class: 'app-browser app-browser-quicklaunch',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="2" y1="12" x2="22" y2="12"></line>
                <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"></path>
            </svg>`,
            content: content,
            url: url || ''
        });
        this.attachQuickLaunchEvents(window);
        if (window) windowManager.focusWindow(window);
    }

    renderCategories(categories) {
        return categories.map(cat => {
            const linksHtml = cat.links.map(link => `
                <a class="quick-launch-card" href="${this.escapeHtml(link.url)}" target="_blank" rel="noopener noreferrer" data-name="${this.escapeHtml(link.name)}" data-url="${this.escapeHtml(link.url)}" title="${this.escapeHtml(link.url)}">
                    <span class="quick-launch-card-initial">${this.escapeHtml((link.name[0] || '').toUpperCase())}</span>
                    <span class="quick-launch-card-name">${this.escapeHtml(link.name)}</span>
                    <span class="quick-launch-card-url">${this.escapeHtml(link.url.replace(/^https?:\/\/(www\.)?/, ''))}</span>
                </a>
            `).join('');
            return `
                <section class="quick-launch-category" data-category-id="${this.escapeHtml(cat.id)}" data-category-title="${this.escapeHtml(cat.title)}">
                    <h3 class="quick-launch-category-title"><span class="quick-launch-category-icon">${cat.icon}</span>${this.escapeHtml(cat.title)}</h3>
                    <div class="quick-launch-grid">${linksHtml}</div>
                </section>
            `;
        }).join('');
    }

    renderQuickLaunch(initialUrl = '') {
        const globalHtml = this.renderCategories(QUICK_LAUNCH_CATEGORIES);
        const indiaHtml = this.renderCategories(QUICK_LAUNCH_INDIA);
        return `
            <div class="browser-container browser-quicklaunch-container">
                <div class="quick-launch-toolbar">
                    <div class="quick-launch-region-tabs" role="tablist" aria-label="Country / Region">
                        <button type="button" class="quick-launch-region-tab active" data-region="global" role="tab" aria-selected="true">🌐 Global</button>
                        <button type="button" class="quick-launch-region-tab" data-region="india" role="tab" aria-selected="false">🇮🇳 India</button>
                    </div>
                    <div class="quick-launch-search-wrap">
                        <span class="quick-launch-search-icon" aria-hidden="true">🔍</span>
                        <input type="text" class="quick-launch-search" id="quick-launch-search" placeholder="Search sites..." autocomplete="off" aria-label="Filter links">
                    </div>
                    <div class="quick-launch-open-url-wrap">
                        <input type="text" class="quick-launch-url-input" id="quick-launch-url-input" placeholder="Or paste any URL to open in your browser..." value="${this.escapeHtml(initialUrl)}" aria-label="URL to open">
                        <button type="button" class="quick-launch-open-btn" id="quick-launch-open-btn" title="Open in your browser">Open in browser</button>
                    </div>
                </div>
                <div class="quick-launch-content" id="quick-launch-content">
                    <div class="quick-launch-panel quick-launch-panel-global" id="quick-launch-panel-global" role="tabpanel" aria-label="Global sites">
                        <p class="quick-launch-intro">Open any site in your system browser. Click a card below.</p>
                        <div class="quick-launch-categories">${globalHtml}</div>
                    </div>
                    <div class="quick-launch-panel quick-launch-panel-india hidden" id="quick-launch-panel-india" role="tabpanel" aria-label="India sites" hidden>
                        <p class="quick-launch-intro">Popular sites in India — opens in your browser.</p>
                        <div class="quick-launch-categories">${indiaHtml}</div>
                    </div>
                </div>
            </div>
        `;
    }

    attachQuickLaunchEvents(windowEl) {
        const content = windowEl.querySelector('.window-content');
        if (!content) return;
        const searchInput = content.querySelector('#quick-launch-search');
        const urlInput = content.querySelector('#quick-launch-url-input');
        const openBtn = content.querySelector('#quick-launch-open-btn');
        const panelGlobal = content.querySelector('#quick-launch-panel-global');
        const panelIndia = content.querySelector('#quick-launch-panel-india');
        const regionTabs = content.querySelectorAll('.quick-launch-region-tab');

        const openInBrowser = (url) => {
            let u = url.trim();
            if (!u) return;
            if (!u.startsWith('http://') && !u.startsWith('https://')) u = 'https://' + u;
            const w = window.open(u, '_blank', 'noopener,noreferrer');
            if (!w && typeof notificationSystem !== 'undefined') {
                notificationSystem.warn('Popup blocked', 'Allow popups for this site or copy the URL and open it manually.');
            }
        };

        if (openBtn && urlInput) {
            openBtn.addEventListener('click', () => openInBrowser(urlInput.value));
            urlInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') openInBrowser(urlInput.value); });
        }

        content.querySelectorAll('.quick-launch-card').forEach(card => {
            card.addEventListener('click', (e) => {
                e.preventDefault();
                const url = card.dataset.url || card.getAttribute('href');
                if (url) openInBrowser(url);
            });
        });

        regionTabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const region = tab.dataset.region;
                regionTabs.forEach(t => {
                    t.classList.toggle('active', t.dataset.region === region);
                    t.setAttribute('aria-selected', t.dataset.region === region ? 'true' : 'false');
                });
                if (region === 'global') {
                    if (panelGlobal) { panelGlobal.classList.remove('hidden'); panelGlobal.hidden = false; }
                    if (panelIndia) { panelIndia.classList.add('hidden'); panelIndia.hidden = true; }
                } else {
                    if (panelGlobal) { panelGlobal.classList.add('hidden'); panelGlobal.hidden = true; }
                    if (panelIndia) { panelIndia.classList.remove('hidden'); panelIndia.hidden = false; }
                }
            });
        });

        const filterCategories = (container) => {
            if (!container) return;
            const q = searchInput ? searchInput.value.trim().toLowerCase() : '';
            container.querySelectorAll('.quick-launch-category').forEach(section => {
                const cards = section.querySelectorAll('.quick-launch-card');
                const title = (section.dataset.categoryTitle || '').toLowerCase();
                const matchTitle = !q || title.includes(q);
                let visible = 0;
                cards.forEach(card => {
                    const name = (card.dataset.name || '').toLowerCase();
                    const url = (card.dataset.url || '').toLowerCase();
                    const show = matchTitle || !q || name.includes(q) || url.includes(q);
                    card.classList.toggle('quick-launch-card-hidden', !show);
                    if (show) visible++;
                });
                section.classList.toggle('quick-launch-category-hidden', visible === 0);
            });
        };

        if (searchInput) {
            searchInput.addEventListener('input', () => {
                if (panelGlobal) filterCategories(panelGlobal);
                if (panelIndia) filterCategories(panelIndia);
            });
        }
    }
    
    getDomainFromUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace('www.', '');
        } catch (e) {
            return url;
        }
    }

    attachEvents(window, initialUrl) {
        const content = window.querySelector('.window-content');
        const urlBar = content.querySelector('#browser-url');
        const iframe = content.querySelector('#browser-content');
        const backBtn = content.querySelector('#browser-back');
        const forwardBtn = content.querySelector('#browser-forward');
        const refreshBtn = content.querySelector('#browser-refresh');
        const goBtn = content.querySelector('#browser-go');
        const openNewBtn = content.querySelector('#browser-open-new');

        // Normalize initial URL
        let currentUrl = initialUrl;
        if (!currentUrl.startsWith('http://') && !currentUrl.startsWith('https://') && !currentUrl.startsWith('file://')) {
            currentUrl = 'https://' + currentUrl;
        }

        let history = [currentUrl];
        let historyIndex = 0;

        // Navigate function
        const navigate = (url) => {
            // Check if it's a search query (no dots, has spaces, or doesn't look like URL)
            if (!url.includes('.') && (url.includes(' ') || !url.match(/^[a-zA-Z0-9-]+\./))) {
                // It's a search query - use Google search
                url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            } else if (!url.startsWith('http://') && !url.startsWith('https://') && !url.startsWith('file://')) {
                // Add https:// if missing
                url = 'https://' + url;
            }
            
            if (iframe) {
                iframe.src = url;
            }
            if (urlBar) {
                urlBar.value = url;
            }
            history = history.slice(0, historyIndex + 1);
            history.push(url);
            historyIndex++;
            updateButtons();
        };

        // Update button states
        const updateButtons = () => {
            if (backBtn) backBtn.disabled = historyIndex <= 0;
            if (forwardBtn) forwardBtn.disabled = historyIndex >= history.length - 1;
        };

        // URL bar navigation
        if (urlBar) {
            urlBar.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    navigate(urlBar.value.trim());
                }
            });
        }

        // Go button
        if (goBtn) {
            goBtn.addEventListener('click', () => {
                if (urlBar) {
                    navigate(urlBar.value.trim());
                }
            });
        }

        // Navigation buttons
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (historyIndex > 0 && iframe) {
                    historyIndex--;
                    const url = history[historyIndex];
                    iframe.src = url;
                    if (urlBar) urlBar.value = url;
                    updateButtons();
                }
            });
        }

        if (forwardBtn) {
            forwardBtn.addEventListener('click', () => {
                if (historyIndex < history.length - 1 && iframe) {
                    historyIndex++;
                    const url = history[historyIndex];
                    iframe.src = url;
                    if (urlBar) urlBar.value = url;
                    updateButtons();
                }
            });
        }

        if (refreshBtn && iframe) {
            refreshBtn.addEventListener('click', () => {
                iframe.src = iframe.src;
            });
        }

        // Open in new tab
        if (openNewBtn) {
            openNewBtn.addEventListener('click', () => {
                const url = urlBar ? urlBar.value : currentUrl;
                try {
                    const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
                    if (!newWindow) {
                        // Popup blocked - copy URL to clipboard
                        if (navigator.clipboard) {
                            navigator.clipboard.writeText(url).then(() => {
                                alert('URL copied to clipboard: ' + url);
                            });
                        } else {
                            alert('Please enable popups or copy this URL: ' + url);
                        }
                    }
                } catch (error) {
                    console.error('Error opening URL:', error);
                }
            });
        }

        // Update URL bar when iframe navigates (if possible)
        if (iframe) {
            iframe.addEventListener('load', () => {
                try {
                    if (urlBar && iframe.contentWindow && iframe.contentWindow.location) {
                        const newUrl = iframe.contentWindow.location.href;
                        if (newUrl && newUrl !== 'about:blank') {
                            urlBar.value = newUrl;
                            // Update history if needed
                            if (history[historyIndex] !== newUrl) {
                                history = history.slice(0, historyIndex + 1);
                                history.push(newUrl);
                                historyIndex++;
                                updateButtons();
                            }
                            
                            // Prompt to save bookmark
                            this.promptBookmarkSave(newUrl, window);
                        }
                    } else {
                        // Use URL bar value if iframe access is blocked (cross-origin)
                        const currentUrl = urlBar.value;
                        if (currentUrl && currentUrl !== 'about:blank' && currentUrl.startsWith('http')) {
                            this.promptBookmarkSave(currentUrl, window);
                        }
                    }
                } catch (e) {
                    // Cross-origin, can't access - use URL bar value
                    const currentUrl = urlBar.value;
                    if (currentUrl && currentUrl !== 'about:blank' && currentUrl.startsWith('http')) {
                        this.promptBookmarkSave(currentUrl, window);
                    }
                }
            });
        }

        updateButtons();
    }

    promptBookmarkSave(url, window) {
        // Don't prompt for blank pages or data URLs
        if (!url || url === 'about:blank' || url.startsWith('data:')) return;
        
        // Check if already bookmarked
        if (typeof bookmarksApp !== 'undefined') {
            const existing = bookmarksApp.bookmarks.find(b => b.url === url);
            if (existing) return; // Already bookmarked
        }
        
        // Show prompt after a short delay
        setTimeout(() => {
            const prompt = document.createElement('div');
            prompt.className = 'browser-bookmark-prompt';
            prompt.innerHTML = `
                <div class="browser-bookmark-prompt-content">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z"></path>
                    </svg>
                    <span>Save this page as a bookmark?</span>
                    <div class="browser-bookmark-prompt-actions">
                        <button class="browser-bookmark-prompt-btn browser-bookmark-prompt-yes">Save</button>
                        <button class="browser-bookmark-prompt-btn browser-bookmark-prompt-no">No</button>
                    </div>
                </div>
            `;
            
            const windowContent = window.querySelector('.window-content');
            if (windowContent) {
                windowContent.appendChild(prompt);
                
                // Auto-hide after 5 seconds
                const autoHide = setTimeout(() => {
                    prompt.remove();
                }, 5000);
                
                prompt.querySelector('.browser-bookmark-prompt-yes').addEventListener('click', () => {
                    clearTimeout(autoHide);
                    this.saveCurrentPageAsBookmark(url, window);
                    prompt.remove();
                });
                
                prompt.querySelector('.browser-bookmark-prompt-no').addEventListener('click', () => {
                    clearTimeout(autoHide);
                    prompt.remove();
                });
            }
        }, 2000); // Show prompt 2 seconds after page load
    }
    
    saveCurrentPageAsBookmark(url, window) {
        if (typeof bookmarksApp === 'undefined') return;
        
        try {
            const urlObj = new URL(url);
            const domain = urlObj.hostname.replace('www.', '');
            const name = domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
            
            // Try to get page title from iframe (may fail due to CORS)
            const iframe = window.querySelector('#browser-content');
            let pageTitle = name;
            
            if (iframe && iframe.contentWindow) {
                try {
                    pageTitle = iframe.contentWindow.document.title || name;
                } catch (e) {
                    // Cross-origin, can't access title
                }
            }
            
            const bookmark = {
                name: pageTitle,
                url: url,
                icon: '🔗'
            };
            
            bookmarksApp.addBookmark(bookmark, null);
            
            // Show confirmation
            const confirmation = document.createElement('div');
            confirmation.className = 'browser-bookmark-confirmation';
            confirmation.textContent = '✓ Bookmark saved!';
            const windowContent = window.querySelector('.window-content');
            if (windowContent) {
                windowContent.appendChild(confirmation);
                setTimeout(() => confirmation.remove(), 2000);
            }
        } catch (e) {
            console.error('Error saving bookmark:', e);
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const browserApp = new BrowserApp();

