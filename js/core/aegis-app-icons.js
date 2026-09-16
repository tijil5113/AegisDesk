/**
 * AegisDesk application icon family — Spec 2
 * Consistent 24×24 geometry, original glyphs, readable at dock and launcher size.
 */
(function (global) {
    'use strict';

    function tile(accent, glyph) {
        return `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect x="1.25" y="1.25" width="21.5" height="21.5" rx="6" fill="${accent}"/>
            ${glyph}
        </svg>`;
    }

    const stroke = 'stroke="#F8FAFC" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" fill="none"';

    const ICONS = {
        tasks: tile('#059669', `<rect x="7" y="6.5" width="10" height="11" rx="1.4" ${stroke}/>
            <path d="M9.2 12.1l1.6 1.6 3.4-3.5" ${stroke}/>`),
        notes: tile('#D97706', `<path d="M8 6.5h8v11H8z" ${stroke}/>
            <path d="M10 9.2h4M10 12h4M10 14.8h2.6" ${stroke}/>`),
        weather: tile('#2563EB', `<circle cx="9" cy="9.2" r="2.2" fill="#FBBF24"/>
            <path d="M8.2 15.6h7.4a2.4 2.4 0 000-4.8 3.3 3.3 0 00-6.2.8 2.2 2.2 0 00-1.2 4" ${stroke}/>`),
        'ai-chat': tile('#6D28D9', `<circle cx="8.2" cy="9.2" r="1.5" fill="#F8FAFC"/>
            <circle cx="15.8" cy="9.2" r="1.5" fill="#F8FAFC"/>
            <circle cx="12" cy="15.2" r="1.5" fill="#F8FAFC"/>
            <path d="M8.8 10.2L11.2 14M15.2 10.2L12.8 14M9.8 9.2h4.4" ${stroke}/>`),
        browser: tile('#1D4ED8', `<circle cx="12" cy="12" r="6.2" ${stroke}/>
            <path d="M6 12h12M12 6c1.8 2 2.7 4 2.7 6s-.9 4-2.7 6c-1.8-2-2.7-4-2.7-6s.9-4 2.7-6z" ${stroke}/>`),
        'code-editor': tile('#0F766E', `<path d="M9 8.2L6.2 12 9 15.8M15 8.2L17.8 12 15 15.8" ${stroke}/>
            <path d="M13.2 8.5l-2.4 7" ${stroke}/>`),
        terminal: tile('#020617', `<path d="M7.2 9.2L10 12l-2.8 2.8M12.2 15.2H16.8" ${stroke}/>`),
        drawing: tile('#C2410C', `<path d="M8 16.5l8.2-8.2 1.6 1.6L9.6 18H8v-1.5z" ${stroke}/>
            <path d="M14.8 7.1l1.6 1.6" ${stroke}/>`),
        'system-monitor': tile('#334155', `<path d="M6.5 15.5l2.4-4 2.2 2.6 2.4-5.2 2.6 3.2 1.4 3.4" ${stroke}/>
            <path d="M6 17.2h12" ${stroke}/>`),
        gallery: tile('#7C3AED', `<rect x="6.2" y="7.2" width="11.6" height="9.6" rx="1.4" ${stroke}/>
            <circle cx="9.4" cy="10.6" r="1.1" fill="#F8FAFC"/>
            <path d="M7.4 16.2l3.2-3.2 2.2 2.1 1.7-1.6 2.1 2.7" ${stroke}/>`),
        music: tile('#047857', `<circle cx="8.6" cy="16" r="2.1" ${stroke}/>
            <circle cx="16.2" cy="14.4" r="2.1" ${stroke}/>
            <path d="M10.7 16V8.2l7.6-1.4V14.4" ${stroke}/>`),
        bookmarks: tile('#B45309', `<path d="M8 6.8h8v10.6l-4-2.4-4 2.4V6.8z" ${stroke}/>`),
        calculator: tile('#475569', `<rect x="7" y="6.2" width="10" height="11.6" rx="1.6" ${stroke}/>
            <path d="M9 9.2h6M9 12.2h2.2M12.8 12.2h2.2M9 15.2h2.2M12.8 15.2h2.2" ${stroke}/>`),
        calendar: tile('#DC2626', `<rect x="6.4" y="7.2" width="11.2" height="10.4" rx="1.5" ${stroke}/>
            <path d="M6.4 10.2h11.2M9.2 6.4v2.2M14.8 6.4v2.2" ${stroke}/>
            <rect x="10.6" y="12.4" width="2.8" height="2.8" rx="0.5" fill="#F8FAFC"/>`),
        files: tile('#4F46E5', `<path d="M7 8.4h4.2l1.4 1.6H17a1.2 1.2 0 011.2 1.2v5.2A1.2 1.2 0 0117 17.6H7A1.2 1.2 0 015.8 16.4V9.6A1.2 1.2 0 017 8.4z" ${stroke}/>`),
        settings: tile('#64748B', `<circle cx="12" cy="12" r="2.1" ${stroke}/>
            <path d="M12 6.4v1.6M12 16v1.6M6.4 12h1.6M16 12h1.6M8 8l1.2 1.2M14.8 14.8L16 16M16 8l-1.2 1.2M8 16l1.2-1.2" ${stroke}/>`),
        mail: tile('#2563EB', `<rect x="5.8" y="7.4" width="12.4" height="9.2" rx="1.4" ${stroke}/>
            <path d="M6.2 8.2L12 12.6l5.8-4.4" ${stroke}/>`),
        email: tile('#2563EB', `<rect x="5.8" y="7.4" width="12.4" height="9.2" rx="1.4" ${stroke}/>
            <path d="M6.2 8.2L12 12.6l5.8-4.4" ${stroke}/>`),
        'system-intelligence': tile('#4F46E5', `<circle cx="12" cy="12" r="2" fill="#F8FAFC"/>
            <circle cx="12" cy="6.8" r="1.1" fill="#C7D2FE"/>
            <circle cx="17.2" cy="12" r="1.1" fill="#C7D2FE"/>
            <circle cx="12" cy="17.2" r="1.1" fill="#C7D2FE"/>
            <circle cx="6.8" cy="12" r="1.1" fill="#C7D2FE"/>
            <path d="M12 8.8v1.2M15.2 12h1.2M12 14v1.2M7.6 12H8.8" ${stroke}/>`),
        'news-hub': tile('#B91C1C', `<path d="M7 7.2h10v9.6H7z" ${stroke}/>
            <path d="M9 9.4h6M9 12h6M9 14.4h4" ${stroke}/>`),
        'news-reader': tile('#B91C1C', `<path d="M7 7.2h10v9.6H7z" ${stroke}/>
            <path d="M9 9.4h6M9 12h6M9 14.4h4" ${stroke}/>`),
        user: tile('#6D28D9', `<circle cx="12" cy="9" r="2.4" ${stroke}/>
            <path d="M7.2 17.2c.4-2.6 2.2-4 4.8-4s4.4 1.4 4.8 4" ${stroke}/>`),
        help: tile('#1D4ED8', `<circle cx="12" cy="12" r="6.2" ${stroke}/>
            <path d="M10 10a2 2 0 013.6.8c0 1.4-1.8 1.8-1.8 2.8" ${stroke}/>
            <circle cx="12" cy="16.1" r="0.7" fill="#F8FAFC"/>`),
        'world-clock': tile('#0F766E', `<circle cx="12" cy="12" r="6.2" ${stroke}/>
            <path d="M6 12h12M12 6c1.8 2 2.7 4 2.7 6s-.9 4-2.7 6c-1.8-2-2.7-4-2.7-6s.9-4 2.7-6z" ${stroke}/>
            <circle cx="12" cy="12" r="1" fill="#F8FAFC"/>`)
    };

    const CATALOG = [
        { id: 'mail', name: 'Mail', description: 'Compose and send mail through AegisDesk. Sent history stays on this device.' },
        { id: 'music', name: 'Music', description: 'Search YouTube and play results in a built-in player with a queue foundation.' },
        { id: 'ai-chat', name: 'AI Assistant', description: 'A conversation app for writing, planning, and questions. Uses the server OpenAI integration.' },
        { id: 'news-reader', name: 'News', description: 'Headlines from configured server news providers, with loading and error states.' },
        { id: 'tasks', name: 'Tasks', description: 'Create, complete, and organize work with filters that match saved task data.' },
        { id: 'notes', name: 'Notes', description: 'A focused writing space with local notes, search, and autosave.' },
        { id: 'files', name: 'Files', description: 'A virtual file workspace stored in this browser — not your computer disk.' },
        { id: 'calendar', name: 'Calendar', description: 'Month navigation and local events. External calendar sync is not enabled.' },
        { id: 'browser', name: 'Browser', description: 'Open the web from AegisDesk. Sites that block embedding are explained, not bypassed.' },
        { id: 'bookmarks', name: 'Bookmarks', description: 'Save, search, and open links. Integrates with Browser when available.' },
        { id: 'calculator', name: 'Calculator', description: 'A keyboard-ready calculator with clear, backspace, and honest error handling.' },
        { id: 'terminal', name: 'Terminal', description: 'A simulated AegisDesk shell with safe commands. Not a host operating-system prompt.' },
        { id: 'code-editor', name: 'Aegis Code Studio', description: 'An AI-assisted browser workspace for building, previewing, and repairing frontend projects. Not unrestricted disk or shell access.' },
        { id: 'gallery', name: 'Gallery', description: 'View images you import. Nothing is fabricated or pulled from stock libraries.' },
        { id: 'drawing', name: 'Drawing', description: 'Brush, eraser, color, and export on a local canvas.' },
        { id: 'system-monitor', name: 'System Monitor', description: 'Browser runtime metrics such as JS heap and battery. Not host CPU or RAM.' },
        { id: 'settings', name: 'Settings', description: 'Appearance, motion, notifications, and other AegisDesk preferences.' },
        { id: 'system-intelligence', name: 'System Intelligence', description: 'A local activity dashboard for this session. Distinct from Aegis Intelligence commands.' },
        { id: 'user', name: 'User Profile', description: 'Identity and preferences stored for the signed-in AegisDesk session.' },
        { id: 'help', name: 'Help', description: 'Documentation for desktop, windows, search, applications, and shortcuts.' },
        { id: 'weather', name: 'Weather', description: 'Live conditions from Open-Meteo when the network is available.' },
        { id: 'world-clock', name: 'World Clock', description: 'Many cities at once, using IANA time zones and the browser clock. Daylight saving stays correct automatically.' }
    ];

    global.AEGIS_APP_ICONS = ICONS;
    global.AEGIS_APP_CATALOG = CATALOG;
})(typeof window !== 'undefined' ? window : globalThis);
