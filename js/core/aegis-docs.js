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
                <p>Desktop search and the command palette share <kbd>Ctrl</kbd> + <kbd>K</kbd> (also <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd>). Search is local: apps, commands, notes, tasks, virtual files, and help. An explicit “Ask Aegis” result can send that query for AI interpretation — ordinary keystrokes do not.</p>
                <p>Aegis Intelligence (<kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd>) resolves known commands on-device first. Unknown natural language is mapped only to the action registry.</p>`
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
                    <li><strong>AI Assistant</strong> — conversation with the server OpenAI integration. System-wide actions use Aegis Intelligence, not this chat thread.</li>
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
                        <tr><td><kbd>Ctrl</kbd> + <kbd>K</kbd></td><td>Command palette / search</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>P</kbd></td><td>Command palette</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Space</kbd></td><td>Aegis Intelligence</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Space</kbd></td><td>Focus taskbar search</td></tr>
                        <tr><td><kbd>Alt</kbd> + <kbd>Space</kbd></td><td>Open apps menu</td></tr>
                        <tr><td><kbd>Space</kbd></td><td>Quick Look when an item is selected</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>A</kbd></td><td>Quick Actions</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>N</kbd></td><td>New task</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>N</kbd></td><td>New note</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd></td><td>Clipboard history (AegisDesk copies)</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>←/→</kbd></td><td>Switch Spaces</td></tr>
                        <tr><td><kbd>Ctrl</kbd> + <kbd>Z</kbd></td><td>Undo last reversible local action when available</td></tr>
                        <tr><td><kbd>Esc</kbd></td><td>Close menus and overlays</td></tr>
                    </tbody>
                </table>`
        },
        {
            id: 'intelligence',
            title: 'Aegis Intelligence',
            group: 'System',
            body: `
                <p>Aegis Intelligence is the system command surface. Known phrases such as “open calculator” or “switch to dark theme” run locally. Natural language is mapped only to registered actions. The model cannot execute JavaScript, open arbitrary endpoints, or send mail by itself.</p>
                <p>Compose-email requests open Mail with a draft. You send it. Destructive local deletes are not exposed as AI actions.</p>`
        },
        {
            id: 'quick-look',
            title: 'Quick Look',
            group: 'System',
            body: `
                <p>Select a note, task, or virtual file and press <kbd>Space</kbd> to preview without fully focusing the app. Escape or Space closes the preview. Unsupported types say so instead of faking a renderer.</p>`
        },
        {
            id: 'activity',
            title: 'Activity Center',
            group: 'System',
            body: `
                <p>Activity Center records recent apps and actions in this browser, with a bounded history. Immediate toasts stay in Notification Center. Passwords, API keys, and access codes are not logged.</p>`
        },
        {
            id: 'clipboard',
            title: 'Clipboard History',
            group: 'System',
            body: `
                <p>Clipboard History lists text copied through AegisDesk. Browsers do not provide the computer’s full clipboard history. You can clear items, clear all, or disable the feature in Settings.</p>`
        },
        {
            id: 'focus',
            title: 'Focus Mode',
            group: 'System',
            body: `
                <p>Focus Mode quiets non-critical notifications and reduces desktop visual noise. Start a timer from Aegis Intelligence (“enter focus 25 minutes”). Pause or resume with “pause focus” / “resume focus”, or exit with “exit focus”. Critical errors still appear.</p>`
        },
        {
            id: 'spaces',
            title: 'Spaces and session restore',
            group: 'System',
            body: `
                <p>Spaces are named workspaces. Windows belong to a Space. Switch with <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + arrows or the overview. Overview lists windows in each Space and can move them. Session restore reopens apps and geometry after reload, clamped to the current viewport. Corrupt session data is ignored so the desktop can still boot.</p>
                <p>Window layouts (Focus, Two columns, Main + side) arrange currently open windows. Drag to move them afterward.</p>`
        },
        {
            id: 'privacy-ai',
            title: 'AI permissions and privacy',
            group: 'Reference',
            body: `
                <p>Local search never uploads your library. AI interpretation sends the typed request, an optional selected snippet, and the public action catalog. Ask Aegis transformations send only the selected text. Provider keys stay on the server. You can turn AI interpretation off in Settings; deterministic commands remain available.</p>`
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
