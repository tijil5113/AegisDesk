/**
 * Canonical AegisDesk documentation used by Help and the public docs site.
 * Content matches shipped Spec 1 + Spec 2 behavior.
 */
(function (global) {
    'use strict';

    const SECTIONS = [
        {
            id: 'getting-started',
            title: 'Getting Started',
            group: 'Basics',
            body: `
                <p>AegisDesk is a web operating environment. After you sign in, the desktop is your workspace: windows, a taskbar, a launcher, and search.</p>
                <ol>
                    <li>Open the public site, then choose <strong>Launch AegisDesk</strong>.</li>
                    <li>Sign in with an allowed email and access code when the login gate is configured.</li>
                    <li>Use the launcher or taskbar to open applications inside windows.</li>
                </ol>
                <p>Preferences, notes, tasks, bookmarks, and similar data stay in this browser unless an application says otherwise.</p>`
        },
        {
            id: 'desktop',
            title: 'Desktop',
            group: 'Basics',
            body: `
                <p>The desktop is the home surface: wallpaper, pinned apps, the clock, and the taskbar.</p>
                <ul>
                    <li>The taskbar shows running applications and system status.</li>
                    <li>The launcher lists installed AegisDesk applications.</li>
                    <li>Windows can be moved, resized, focused, minimized, and closed.</li>
                    <li>Themes and motion preferences persist through Settings.</li>
                </ul>`
        },
        {
            id: 'windows',
            title: 'Windows',
            group: 'Basics',
            body: `
                <p>Each application opens in an AegisDesk window. Some apps (Mail, Music, Calendar, News, Code Editor, AI Assistant, and Profile) render their full page inside the window.</p>
                <ul>
                    <li><kbd>Ctrl</kbd> + <kbd>W</kbd> closes the active window when the shortcut is available.</li>
                    <li><kbd>Esc</kbd> dismisses menus, overlays, and dialogs.</li>
                    <li>Inactive windows stay readable; they are not a separate operating-system process.</li>
                </ul>`
        },
        {
            id: 'launcher',
            title: 'Launcher',
            group: 'Basics',
            body: `
                <p>Open the launcher with <kbd>Alt</kbd> + <kbd>Space</kbd> or the taskbar apps control. Filter by typing, then press Enter to launch the highlighted app.</p>
                <p>Application icons are shared across the launcher, taskbar, and the public Apps page.</p>`
        },
        {
            id: 'search',
            title: 'Search',
            group: 'Basics',
            body: `
                <p>Desktop search finds applications and can open a web search. Focus it with <kbd>Ctrl</kbd> + <kbd>Space</kbd> or <kbd>Ctrl</kbd> + <kbd>F</kbd> when the search field is available.</p>
                <p><kbd>Ctrl</kbd> + <kbd>K</kbd> opens AI Assistant. Command palette: <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>.</p>`
        },
        {
            id: 'applications',
            title: 'Applications',
            group: 'Apps',
            body: `
                <p>AegisDesk includes a suite of applications that share one design language. Each app still has its own job:</p>
                <ul>
                    <li><strong>Mail</strong> — outbound compose through the server mail provider. Inbox sync needs a configured mailbox provider.</li>
                    <li><strong>Music</strong> — YouTube search and in-app playback. Audio is not downloaded.</li>
                    <li><strong>AI Assistant</strong> — conversation with the server OpenAI integration. It does not control the OS yet.</li>
                    <li><strong>Tasks / Notes / Files / Calendar / Bookmarks</strong> — local productivity, stored in this browser.</li>
                    <li><strong>Files</strong> is a virtual workspace, not unrestricted disk access.</li>
                    <li><strong>Terminal</strong> is a simulated AegisDesk shell.</li>
                    <li><strong>System Monitor</strong> reports browser runtime metrics, not host hardware telemetry.</li>
                    <li><strong>Weather</strong> uses Open-Meteo when the network is available.</li>
                </ul>`
        },
        {
            id: 'keyboard',
            title: 'Keyboard Shortcuts',
            group: 'Reference',
            body: `
                <table class="aegis-docs-table">
                    <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
                    <tbody>
                        <tr><td><kbd>?</kbd></td><td>Shortcuts overlay</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd></td><td>Command palette</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Space</kbd></td><td>Focus search</td></tr>
                        <tr><td><kbd>Alt</kbd> + <kbd>Space</kbd></td><td>Open apps menu</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd></td><td>Quick Actions</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>N</kbd></td><td>New task</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd></td><td>New note</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>AI Assistant</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd></td><td>Clipboard history</td></tr>
                        <tr><td><kbd>Esc</kbd></td><td>Close menus and overlays</td></tr>
                    </tbody>
                </table>`
        },
        {
            id: 'themes',
            title: 'Themes',
            group: 'Reference',
            body: `
                <p>Appearance lives in Settings. Light and dark Aegis themes persist in this browser under the existing theme preference key.</p>
                <p>Reduced motion is respected when the operating system requests it, and Settings can also reduce animation.</p>`
        },
        {
            id: 'accessibility',
            title: 'Accessibility',
            group: 'Reference',
            body: `
                <p>AegisDesk aims for keyboard use, visible focus, labeled controls, and contrast that follows the design system.</p>
                <ul>
                    <li>Tab through launcher, taskbar, and window chrome.</li>
                    <li>Dialogs should announce errors in status regions where implemented.</li>
                    <li>Prefer reduced motion if animation is distracting.</li>
                </ul>`
        },
        {
            id: 'troubleshooting',
            title: 'Troubleshooting',
            group: 'Reference',
            body: `
                <ul>
                    <li><strong>Mail will not send</strong> — the server needs a configured mail provider. The app should show Sent or Failed, never a fake delivered state.</li>
                    <li><strong>Music or News is empty</strong> — those apps need their server API keys. The UI should remain usable and explain the provider error.</li>
                    <li><strong>AI Assistant errors</strong> — OpenAI is configured on the server, not in the browser.</li>
                    <li><strong>A site will not load in Browser</strong> — many sites refuse iframe embedding. AegisDesk opens them in a new tab instead of bypassing security.</li>
                    <li><strong>Stale UI after an update</strong> — the service worker cache version is bumped on releases; a refresh should load the new shell.</li>
                </ul>`
        },
        {
            id: 'about',
            title: 'About AegisDesk',
            group: 'Reference',
            body: `
                <p>AegisDesk is a web operating environment created by <strong>Monish Tijil</strong>, Founder &amp; CEO.</p>
                <p>It runs in the browser, keeps provider secrets on the server, and stores personal workspace data locally unless an integration is explicitly configured.</p>`
        }
    ];

    global.AEGIS_DOCS = SECTIONS;
})(typeof window !== 'undefined' ? window : globalThis);
