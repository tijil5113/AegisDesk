// App Registry - Centralized app definitions
const APP_REGISTRY = {
    'tasks': {
        title: 'Tasks',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="tasksGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="checkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#34d399;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#10b981;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Notepad background -->
            <rect x="5" y="3" width="14" height="18" rx="1.5" fill="url(#tasksGradient)" opacity="0.9"/>
            <rect x="5" y="3" width="14" height="18" rx="1.5" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
            <!-- Spiral binding -->
            <circle cx="7" cy="5" r="0.8" fill="rgba(255,255,255,0.3)"/>
            <circle cx="7" cy="8" r="0.8" fill="rgba(255,255,255,0.3)"/>
            <circle cx="7" cy="11" r="0.8" fill="rgba(255,255,255,0.3)"/>
            <!-- Checkmark -->
            <path d="M9 12l2 2 4-4" stroke="url(#checkGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- Lines -->
            <line x1="10" y1="16" x2="16" y2="16" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="10" y1="18.5" x2="14" y2="18.5" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Highlight -->
            <ellipse cx="12" cy="5" rx="3" ry="1.5" fill="white" opacity="0.2"/>
        </svg>`,
        open: function() {
            if (typeof tasksApp !== 'undefined') {
                tasksApp.open();
            }
        }
    },
    'notes': {
        title: 'Notes',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="notesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="paperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#fef3c7;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#fde68a;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Notebook cover -->
            <rect x="4" y="2" width="16" height="20" rx="1" fill="url(#notesGradient)"/>
            <rect x="4" y="2" width="16" height="20" rx="1" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
            <!-- Binding -->
            <rect x="4" y="2" width="3" height="20" rx="1" fill="rgba(0,0,0,0.2)"/>
            <!-- Paper pages -->
            <rect x="8" y="4" width="10" height="16" rx="0.5" fill="url(#paperGradient)"/>
            <rect x="8.5" y="4.5" width="9" height="15" rx="0.5" fill="url(#paperGradient)" opacity="0.8"/>
            <!-- Lines on paper -->
            <line x1="10" y1="7" x2="16" y2="7" stroke="rgba(217,119,6,0.2)" stroke-width="1" stroke-linecap="round"/>
            <line x1="10" y1="9.5" x2="16" y2="9.5" stroke="rgba(217,119,6,0.2)" stroke-width="1" stroke-linecap="round"/>
            <line x1="10" y1="12" x2="15" y2="12" stroke="rgba(217,119,6,0.2)" stroke-width="1" stroke-linecap="round"/>
            <!-- Corner fold -->
            <path d="M18 4 L18 6 L16 4 Z" fill="rgba(0,0,0,0.1)"/>
            <!-- Highlight -->
            <ellipse cx="10" cy="5" rx="2" ry="1" fill="white" opacity="0.3"/>
        </svg>`,
        open: function() {
            if (typeof notesApp !== 'undefined') {
                notesApp.open();
            }
        }
    },
    'weather': {
        title: 'Weather',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="weatherGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="sunGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#fbbf24;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#f59e0b;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Sun rays -->
            <circle cx="7" cy="7" r="3.5" fill="url(#sunGradient)" opacity="0.9"/>
            <line x1="7" y1="2" x2="7" y2="4" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="7" y1="10" x2="7" y2="12" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="2" y1="7" x2="4" y2="7" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="10" y1="7" x2="12" y2="7" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="4.24" y1="4.24" x2="5.66" y2="5.66" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8.34" y1="8.34" x2="9.76" y2="9.76" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="9.76" y1="4.24" x2="8.34" y2="5.66" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="5.66" y1="8.34" x2="4.24" y2="9.76" stroke="url(#sunGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Cloud -->
            <path d="M18 16.5c0 1.38-1.12 2.5-2.5 2.5h-9c-1.38 0-2.5-1.12-2.5-2.5 0-1.04.64-1.93 1.54-2.3-.15-.5-.24-1.02-.24-1.55 0-2.76 2.24-5 5-5 1.2 0 2.3.43 3.16 1.14C14.5 6.5 15.88 7.5 17.5 7.5c1.38 0 2.5 1.12 2.5 2.5 0 .53-.17 1.02-.45 1.43.8.37 1.45 1.26 1.45 2.07z" fill="url(#weatherGradient)" opacity="0.95"/>
            <!-- Cloud highlight -->
            <ellipse cx="15.5" cy="15" rx="2" ry="1.2" fill="white" opacity="0.3"/>
        </svg>`,
        open: function() {
            if (typeof weatherApp !== 'undefined') {
                weatherApp.open();
            }
        }
    },
    'ai-chat': {
        title: 'AI Assistant',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="aiGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                    <stop offset="50%" style="stop-color:#7c3aed;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#6d28d9;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="aiGlow">
                    <stop offset="0%" style="stop-color:#a78bfa;stop-opacity:0.8" />
                    <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- Neural network nodes -->
            <circle cx="8" cy="8" r="2.5" fill="url(#aiGradient)"/>
            <circle cx="16" cy="8" r="2.5" fill="url(#aiGradient)"/>
            <circle cx="12" cy="16" r="2.5" fill="url(#aiGradient)"/>
            <!-- Connections -->
            <line x1="8" y1="8" x2="12" y2="16" stroke="url(#aiGradient)" stroke-width="2" opacity="0.6"/>
            <line x1="16" y1="8" x2="12" y2="16" stroke="url(#aiGradient)" stroke-width="2" opacity="0.6"/>
            <line x1="8" y1="8" x2="16" y2="8" stroke="url(#aiGradient)" stroke-width="2" opacity="0.4"/>
            <!-- Glow effect -->
            <circle cx="12" cy="12" r="8" fill="url(#aiGlow)"/>
            <!-- Sparkles -->
            <circle cx="6" cy="6" r="0.8" fill="#c4b5fd" opacity="0.8"/>
            <circle cx="18" cy="6" r="0.8" fill="#c4b5fd" opacity="0.8"/>
            <circle cx="10" cy="18" r="0.8" fill="#c4b5fd" opacity="0.8"/>
        </svg>`,
        open: function(url) {
            // Always open ai-chat.html - use provided URL or default
            const aiChatUrl = url || 'ai-chat.html';
            console.log('AI Assistant opening:', aiChatUrl);
            window.open(aiChatUrl, '_blank');
        }
    },
    'browser': {
        title: 'Browser',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="browserGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="globeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Browser window -->
            <rect x="3" y="4" width="18" height="16" rx="2" fill="url(#browserGradient)" opacity="0.9"/>
            <rect x="3" y="4" width="18" height="4" rx="2" fill="rgba(255,255,255,0.2)"/>
            <!-- Address bar -->
            <rect x="5" y="5.5" width="14" height="2" rx="1" fill="rgba(255,255,255,0.3)"/>
            <!-- Globe -->
            <circle cx="12" cy="13" r="5" fill="url(#globeGradient)" opacity="0.8"/>
            <path d="M7 13 A5 3 0 0 1 17 13" stroke="rgba(255,255,255,0.4)" stroke-width="1.5" fill="none"/>
            <path d="M7 13 A5 3 0 0 0 17 13" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none"/>
            <line x1="12" y1="8" x2="12" y2="18" stroke="rgba(255,255,255,0.4)" stroke-width="1.5"/>
            <!-- Web nodes -->
            <circle cx="10" cy="11" r="0.8" fill="white" opacity="0.6"/>
            <circle cx="14" cy="11" r="0.8" fill="white" opacity="0.6"/>
            <circle cx="12" cy="15" r="0.8" fill="white" opacity="0.6"/>
        </svg>`,
        open: function(url) {
            if (typeof browserApp !== 'undefined') {
                const targetUrl = url || 'https://www.google.com';
                browserApp.open(targetUrl, 'Browser');
            }
        }
    },
    'code-editor': {
        title: 'Code Editor',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="codeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Code brackets -->
            <path d="M8 6 L4 12 L8 18" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <path d="M16 6 L20 12 L16 18" stroke="#10b981" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <!-- Syntax highlighting -->
            <rect x="6" y="9" width="12" height="6" rx="1" fill="url(#codeGradient)" opacity="0.3"/>
            <line x1="8" y1="11" x2="10" y2="11" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="8" y1="13" x2="14" y2="13" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Glow -->
            <path d="M8 6 L4 12 L8 18" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.3"/>
            <path d="M16 6 L20 12 L16 18" stroke="#34d399" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.3"/>
        </svg>`,
        open: function() {
            // Use new VS Code-like editor
            if (typeof codeEditorApp !== 'undefined' && codeEditorApp.open) {
                codeEditorApp.open();
            } else if (window.codeEditorApp) {
                window.codeEditorApp.open();
            }
        }
    },
    'terminal': {
        title: 'Terminal',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="terminalGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#020617;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Terminal window -->
            <rect x="3" y="4" width="18" height="16" rx="1.5" fill="url(#terminalGradient)"/>
            <rect x="3" y="4" width="18" height="3" rx="1.5" fill="rgba(255,255,255,0.1)"/>
            <!-- Window controls -->
            <circle cx="6" cy="5.5" r="0.6" fill="#ef4444"/>
            <circle cx="8.5" cy="5.5" r="0.6" fill="#f59e0b"/>
            <circle cx="11" cy="5.5" r="0.6" fill="#10b981"/>
            <!-- Command prompt -->
            <line x1="5" y1="10" x2="8" y2="10" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="5" y1="13" x2="19" y2="13" stroke="#60a5fa" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="5" y1="16" x2="15" y2="16" stroke="#fbbf24" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Cursor -->
            <rect x="15" y="15" width="1.5" height="2" fill="#10b981" opacity="0.8"/>
        </svg>`,
        open: function() {
            if (typeof terminalApp !== 'undefined') {
                terminalApp.open();
            }
        },
        openInNewPage: function() {
            window.open('terminal.html', '_blank');
        }
    },
    'music-player': {
        title: 'Music Player',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="vinylGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1f2937;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#111827;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="vinylRadial">
                    <stop offset="0%" style="stop-color:#374151;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1f2937;stop-opacity:1" />
                </radialGradient>
            </defs>
            <!-- Vinyl record -->
            <circle cx="12" cy="12" r="8" fill="url(#vinylRadial)"/>
            <circle cx="12" cy="12" r="6" fill="url(#vinylGradient)"/>
            <circle cx="12" cy="12" r="2.5" fill="#111827"/>
            <circle cx="12" cy="12" r="1" fill="#374151"/>
            <!-- Grooves -->
            <circle cx="12" cy="12" r="4" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
            <circle cx="12" cy="12" r="5" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="0.5"/>
            <!-- Music note -->
            <path d="M16 6 L16 14 M16 6 L19 4 M19 4 L19 10" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <circle cx="16" cy="14" r="1.5" fill="#8b5cf6"/>
            <!-- Glow -->
            <circle cx="12" cy="12" r="8" fill="#8b5cf6" opacity="0.1"/>
        </svg>`,
        open: function() {
            if (typeof musicPlayerApp !== 'undefined') {
                musicPlayerApp.open();
            }
        }
    },
    'drawing': {
        title: 'Drawing',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="brushGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="paletteGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Paintbrush -->
            <path d="M18 4 L20 6 L12 14 L10 12 Z" fill="url(#brushGradient)"/>
            <path d="M18 4 L20 6 L12 14 L10 12 Z" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
            <!-- Brush tip -->
            <ellipse cx="11" cy="13" rx="1.5" ry="2" fill="#d97706" transform="rotate(-45 11 13)"/>
            <!-- Palette -->
            <ellipse cx="7" cy="18" rx="4" ry="3" fill="url(#paletteGradient)"/>
            <ellipse cx="7" cy="18" rx="4" ry="3" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
            <!-- Color dots -->
            <circle cx="6" cy="17" r="0.8" fill="#ef4444"/>
            <circle cx="8" cy="17" r="0.8" fill="#10b981"/>
            <circle cx="7" cy="19" r="0.8" fill="#fbbf24"/>
            <!-- Paint stroke -->
            <path d="M12 12 Q14 10 16 12" stroke="#8b5cf6" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.7"/>
        </svg>`,
        open: function() {
            if (typeof drawingApp !== 'undefined') {
                drawingApp.open();
            }
        }
    },
    'system-monitor': {
        title: 'System Monitor',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="monitorGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="screenGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#0f172a;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#020617;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Monitor frame -->
            <rect x="3" y="4" width="18" height="12" rx="1" fill="url(#monitorGradient)"/>
            <rect x="4" y="5" width="16" height="10" rx="0.5" fill="url(#screenGradient)"/>
            <!-- Graph lines -->
            <polyline points="6,12 8,9 10,11 12,7 14,10 16,8 18,11" stroke="#10b981" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <polyline points="6,14 8,13 10,14 12,12 14,13 16,12 18,14" stroke="#3b82f6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
            <!-- Base -->
            <rect x="10" y="16" width="4" height="2" rx="0.5" fill="url(#monitorGradient)"/>
            <rect x="8" y="18" width="8" height="1.5" rx="0.5" fill="url(#monitorGradient)"/>
            <!-- Indicator light -->
            <circle cx="19" cy="6" r="0.8" fill="#10b981" opacity="0.8"/>
        </svg>`,
        open: function() {
            if (typeof systemMonitorApp !== 'undefined') {
                systemMonitorApp.open();
            }
        }
    },
    'gallery': {
        title: 'Photo Gallery',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="photo1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="photo2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="photo3Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Photo frames -->
            <rect x="4" y="5" width="6" height="6" rx="0.5" fill="white" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
            <rect x="4.5" y="5.5" width="5" height="5" rx="0.3" fill="url(#photo1Gradient)"/>
            <circle cx="6" cy="7" r="1" fill="rgba(255,255,255,0.3)"/>
            
            <rect x="12" y="7" width="6" height="6" rx="0.5" fill="white" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
            <rect x="12.5" y="7.5" width="5" height="5" rx="0.3" fill="url(#photo2Gradient)"/>
            <rect x="13.5" y="8.5" width="3" height="3" rx="0.2" fill="rgba(255,255,255,0.3)"/>
            
            <rect x="6" y="13" width="6" height="6" rx="0.5" fill="white" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
            <rect x="6.5" y="13.5" width="5" height="5" rx="0.3" fill="url(#photo3Gradient)"/>
            <line x1="7" y1="15" x2="11" y2="18" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`,
        open: function() {
            if (typeof galleryApp !== 'undefined') {
                galleryApp.open();
            }
        }
    },
    'playground': {
        title: 'Code Playground',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="pane1Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="pane2Gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#1e293b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#0f172a;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Split panes -->
            <rect x="3" y="3" width="8" height="18" rx="1" fill="url(#pane1Gradient)"/>
            <rect x="13" y="3" width="8" height="18" rx="1" fill="url(#pane2Gradient)"/>
            <!-- Divider -->
            <line x1="11.5" y1="3" x2="11.5" y2="21" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
            <!-- Code lines -->
            <line x1="5" y1="7" x2="9" y2="7" stroke="#10b981" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="5" y1="10" x2="8" y2="10" stroke="#3b82f6" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="5" y1="13" x2="9" y2="13" stroke="#f59e0b" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="15" y1="7" x2="19" y2="7" stroke="#8b5cf6" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="15" y1="10" x2="18" y2="10" stroke="#ef4444" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="15" y1="13" x2="19" y2="13" stroke="#06b6d4" stroke-width="1.5" stroke-linecap="round"/>
        </svg>`,
        open: function() {
            if (typeof playgroundApp !== 'undefined') {
                playgroundApp.open();
            }
        }
    },
    'bookmarks': {
        title: 'Bookmarks',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="bookmarkGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f59e0b;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#d97706;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Bookmark -->
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" fill="url(#bookmarkGradient)"/>
            <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2v16z" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
            <!-- Ribbon -->
            <path d="M12 16 L10 18 L12 20 L14 18 Z" fill="#ef4444"/>
            <!-- Highlight -->
            <ellipse cx="12" cy="8" rx="3" ry="2" fill="white" opacity="0.2"/>
        </svg>`,
        open: function() {
            if (typeof bookmarksApp !== 'undefined') {
                bookmarksApp.open();
            }
        }
    },
    'calculator': {
        title: 'Calculator',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="calcGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6b7280;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4b5563;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Calculator body -->
            <rect x="4" y="2" width="16" height="20" rx="2" fill="url(#calcGradient)"/>
            <rect x="4" y="2" width="16" height="20" rx="2" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
            <!-- Screen -->
            <rect x="6" y="4" width="12" height="5" rx="1" fill="#0f172a"/>
            <rect x="6.5" y="4.5" width="11" height="4" rx="0.5" fill="#1e293b"/>
            <text x="17" y="8" font-family="monospace" font-size="3" fill="#10b981" text-anchor="end">123</text>
            <!-- Buttons -->
            <rect x="6" y="11" width="3" height="2.5" rx="0.5" fill="rgba(255,255,255,0.1)"/>
            <rect x="10.5" y="11" width="3" height="2.5" rx="0.5" fill="rgba(255,255,255,0.1)"/>
            <rect x="15" y="11" width="3" height="2.5" rx="0.5" fill="#3b82f6" opacity="0.8"/>
            <rect x="6" y="14.5" width="3" height="2.5" rx="0.5" fill="rgba(255,255,255,0.1)"/>
            <rect x="10.5" y="14.5" width="3" height="2.5" rx="0.5" fill="rgba(255,255,255,0.1)"/>
            <rect x="15" y="14.5" width="3" height="2.5" rx="0.5" fill="#3b82f6" opacity="0.8"/>
            <rect x="6" y="18" width="3" height="2.5" rx="0.5" fill="rgba(255,255,255,0.1)"/>
            <rect x="10.5" y="18" width="3" height="2.5" rx="0.5" fill="rgba(255,255,255,0.1)"/>
            <rect x="15" y="18" width="3" height="2.5" rx="0.5" fill="#10b981" opacity="0.8"/>
        </svg>`,
        open: function() {
            if (typeof calculatorApp !== 'undefined') {
                calculatorApp.open();
            }
        }
    },
    'calendar': {
        title: 'Calendar',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="calGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="calPaperGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#fef2f2;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#fee2e2;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Calendar -->
            <rect x="3" y="4" width="18" height="18" rx="2" fill="url(#calPaperGradient)"/>
            <rect x="3" y="4" width="18" height="18" rx="2" fill="none" stroke="rgba(0,0,0,0.1)" stroke-width="0.5"/>
            <!-- Header -->
            <rect x="3" y="4" width="18" height="5" rx="2" fill="url(#calGradient)"/>
            <!-- Rings -->
            <circle cx="7" cy="6.5" r="0.6" fill="rgba(255,255,255,0.3)"/>
            <circle cx="17" cy="6.5" r="0.6" fill="rgba(255,255,255,0.3)"/>
            <!-- Grid lines -->
            <line x1="3" y1="10" x2="21" y2="10" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
            <line x1="8" y1="4" x2="8" y2="22" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
            <line x1="13" y1="4" x2="13" y2="22" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
            <line x1="18" y1="4" x2="18" y2="22" stroke="rgba(0,0,0,0.1)" stroke-width="1"/>
            <!-- Highlighted date -->
            <circle cx="10.5" cy="14" r="1.5" fill="url(#calGradient)" opacity="0.8"/>
        </svg>`,
        open: function() {
            if (window.windowManager) {
                window.windowManager.openWindow({
                    id: 'calendar',
                    title: 'Calendar',
                    url: 'calendar.html',
                    width: 1600,
                    height: 1000,
                    resizable: true
                });
            } else {
                window.open('calendar.html', '_blank');
            }
        }
    },
    'files': {
        title: 'Files',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="folderGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4f46e5;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="fileGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#818cf8;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#6366f1;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Folder -->
            <path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 004.43 2H4a2 2 0 00-2 2v14a2 2 0 002 2z" fill="url(#folderGradient)"/>
            <path d="M4 20h16a2 2 0 002-2V8a2 2 0 00-2-2h-7.93a2 2 0 01-1.66-.9l-.82-1.2A2 2 0 004.43 2H4a2 2 0 00-2 2v14a2 2 0 002 2z" fill="none" stroke="rgba(255,255,255,0.2)" stroke-width="0.5"/>
            <!-- Tab -->
            <path d="M4.43 2 L8 6 L4.43 2 Z" fill="rgba(255,255,255,0.1)"/>
            <!-- Files inside -->
            <rect x="7" y="10" width="5" height="7" rx="0.5" fill="url(#fileGradient)"/>
            <rect x="7.5" y="10.5" width="4" height="6" rx="0.3" fill="white" opacity="0.8"/>
            <line x1="8.5" y1="12" x2="11" y2="12" stroke="rgba(217,119,6,0.3)" stroke-width="0.8" stroke-linecap="round"/>
            <line x1="8.5" y1="13.5" x2="10.5" y2="13.5" stroke="rgba(217,119,6,0.3)" stroke-width="0.8" stroke-linecap="round"/>
            
            <rect x="13" y="11" width="5" height="7" rx="0.5" fill="url(#fileGradient)"/>
            <rect x="13.5" y="11.5" width="4" height="6" rx="0.3" fill="white" opacity="0.8"/>
            <line x1="14.5" y1="13" x2="17" y2="13" stroke="rgba(217,119,6,0.3)" stroke-width="0.8" stroke-linecap="round"/>
        </svg>`,
        open: function() {
            if (typeof filesAppV2 !== 'undefined') {
                filesAppV2.open();
            } else if (typeof filesApp !== 'undefined') {
                filesApp.open();
            } else {
                window.open('files.html', '_blank');
            }
        }
    },
    'settings': {
        title: 'Settings',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="gearGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6b7280;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#4b5563;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="gearGlow">
                    <stop offset="0%" style="stop-color:#9ca3af;stop-opacity:0.5" />
                    <stop offset="100%" style="stop-color:#6b7280;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- Gear -->
            <circle cx="12" cy="12" r="8" fill="url(#gearGlow)"/>
            <path d="M12 2 L13 6 L17 7 L13 8 L12 12 L11 8 L7 7 L11 6 Z" fill="url(#gearGradient)" transform="rotate(0 12 12)"/>
            <path d="M12 2 L13 6 L17 7 L13 8 L12 12 L11 8 L7 7 L11 6 Z" fill="url(#gearGradient)" transform="rotate(45 12 12)"/>
            <path d="M12 2 L13 6 L17 7 L13 8 L12 12 L11 8 L7 7 L11 6 Z" fill="url(#gearGradient)" transform="rotate(90 12 12)"/>
            <path d="M12 2 L13 6 L17 7 L13 8 L12 12 L11 8 L7 7 L11 6 Z" fill="url(#gearGradient)" transform="rotate(135 12 12)"/>
            <!-- Center circle -->
            <circle cx="12" cy="12" r="3" fill="url(#gearGradient)"/>
            <circle cx="12" cy="12" r="2" fill="rgba(255,255,255,0.1)"/>
        </svg>`,
        open: function() {
            if (typeof settingsApp !== 'undefined') {
                settingsApp.open();
            }
        }
    },
    'email': {
        title: 'Email',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="envelopeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
                <linearGradient id="mailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Envelope -->
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="url(#envelopeGradient)"/>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
            <!-- Flap -->
            <path d="M22 6 L12 13 L2 6" fill="url(#mailGradient)" opacity="0.9"/>
            <!-- Letter inside -->
            <rect x="6" y="9" width="12" height="8" rx="0.5" fill="white" opacity="0.9"/>
            <line x1="8" y1="11" x2="16" y2="11" stroke="rgba(37,99,235,0.3)" stroke-width="1" stroke-linecap="round"/>
            <line x1="8" y1="13.5" x2="14" y2="13.5" stroke="rgba(37,99,235,0.3)" stroke-width="1" stroke-linecap="round"/>
            <line x1="8" y1="16" x2="16" y2="16" stroke="rgba(37,99,235,0.3)" stroke-width="1" stroke-linecap="round"/>
        </svg>`,
        open: function() {
            if (typeof emailApp !== 'undefined') {
                emailApp.createWindow();
            }
        }
    },
    'system-intelligence': {
        title: 'System Intelligence',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="intelligenceGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="intelligenceGlow">
                    <stop offset="0%" style="stop-color:#818cf8;stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:#6366f1;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- Central node -->
            <circle cx="12" cy="12" r="4" fill="url(#intelligenceGradient)"/>
            <circle cx="12" cy="12" r="3.5" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
            <circle cx="12" cy="12" r="5" fill="url(#intelligenceGlow)"/>
            <!-- Outer nodes -->
            <circle cx="12" cy="4" r="2" fill="url(#intelligenceGradient)" opacity="0.8"/>
            <circle cx="20" cy="12" r="2" fill="url(#intelligenceGradient)" opacity="0.8"/>
            <circle cx="12" cy="20" r="2" fill="url(#intelligenceGradient)" opacity="0.8"/>
            <circle cx="4" cy="12" r="2" fill="url(#intelligenceGradient)" opacity="0.8"/>
            <!-- Connections -->
            <line x1="12" y1="6" x2="12" y2="8" stroke="url(#intelligenceGradient)" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>
            <line x1="18" y1="12" x2="16" y2="12" stroke="url(#intelligenceGradient)" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>
            <line x1="12" y1="18" x2="12" y2="16" stroke="url(#intelligenceGradient)" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>
            <line x1="6" y1="12" x2="8" y2="12" stroke="url(#intelligenceGradient)" stroke-width="1.5" opacity="0.5" stroke-linecap="round"/>
            <!-- Pulse indicator -->
            <circle cx="12" cy="12" r="2" fill="white" opacity="0.6">
                <animate attributeName="r" values="2;4;2" dur="2s" repeatCount="indefinite"/>
                <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
            </circle>
        </svg>`,
        open: function() {
            if (typeof systemInsightsApp !== 'undefined') {
                systemInsightsApp.open();
            } else {
                window.open('insights.html', '_blank');
            }
        }
    },
    'news-hub': {
        title: 'Premium News Hub',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="newsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#ef4444;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#dc2626;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Newspaper -->
            <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" fill="url(#newsGradient)" opacity="0.9"/>
            <path d="M4 22h16a2 2 0 002-2V4a2 2 0 00-2-2H8a2 2 0 00-2 2v16a2 2 0 01-2 2zm0 0a2 2 0 01-2-2v-9c0-1.1.9-2 2-2h2" fill="none" stroke="rgba(0,0,0,0.2)" stroke-width="0.5"/>
            <!-- Headlines -->
            <rect x="6" y="6" width="8" height="3" rx="0.3" fill="white" opacity="0.9"/>
            <line x1="6" y1="11" x2="14" y2="11" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
            <line x1="6" y1="13.5" x2="12" y2="13.5" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
            <line x1="6" y1="16" x2="14" y2="16" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
            <!-- Fold corner -->
            <path d="M20 4 L20 6 L18 4 Z" fill="rgba(0,0,0,0.2)"/>
        </svg>`,
        open: function() {
            // Always use server URL to ensure API works
            const serverUrl = window.location.protocol === 'file:' 
                ? 'http://localhost:3000/news.html' 
                : (window.location.origin + '/news.html');
            window.open(serverUrl, '_blank');
        }
    },
    'news-reader': {
        title: 'News Reader',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="readerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Reading glasses -->
            <ellipse cx="9" cy="12" rx="3.5" ry="3" fill="none" stroke="url(#readerGradient)" stroke-width="2.5"/>
            <ellipse cx="15" cy="12" rx="3.5" ry="3" fill="none" stroke="url(#readerGradient)" stroke-width="2.5"/>
            <line x1="12.5" y1="12" x2="11.5" y2="12" stroke="url(#readerGradient)" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Bridge -->
            <path d="M9 10 L15 10" stroke="url(#readerGradient)" stroke-width="2" stroke-linecap="round"/>
            <!-- News lines -->
            <line x1="6" y1="16" x2="18" y2="16" stroke="url(#readerGradient)" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
            <line x1="6" y1="18.5" x2="15" y2="18.5" stroke="url(#readerGradient)" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
        </svg>`,
        open: function() {
            // Always use server URL to ensure API works
            const serverUrl = window.location.protocol === 'file:' 
                ? 'http://localhost:3000/news.html' 
                : (window.location.origin + '/news.html');
            window.open(serverUrl, '_blank');
        }
    },
    'user': {
        title: 'User Profile',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="userGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#818cf8;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#a78bfa;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="userGlow">
                    <stop offset="0%" style="stop-color:#a78bfa;stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:#818cf8;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- User head -->
            <circle cx="12" cy="8" r="4" fill="url(#userGradient)" opacity="0.9"/>
            <circle cx="12" cy="8" r="4" fill="url(#userGlow)"/>
            <!-- User body -->
            <path d="M6 20c0-4 2.7-6 6-6s6 2 6 6" stroke="url(#userGradient)" stroke-width="2.5" stroke-linecap="round" fill="none"/>
            <!-- Subtle glow -->
            <circle cx="12" cy="12" r="8" fill="url(#userGlow)" opacity="0.3"/>
        </svg>`,
        open: function() {
            window.open('user.html', '_blank');
        }
    },
    'help': {
        title: 'Help & Instructions',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="helpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
                <radialGradient id="helpGlow">
                    <stop offset="0%" style="stop-color:#60a5fa;stop-opacity:0.4" />
                    <stop offset="100%" style="stop-color:#3b82f6;stop-opacity:0" />
                </radialGradient>
            </defs>
            <!-- Circle background -->
            <circle cx="12" cy="12" r="10" fill="url(#helpGlow)"/>
            <circle cx="12" cy="12" r="10" fill="none" stroke="url(#helpGradient)" stroke-width="2.5"/>
            <!-- Question mark -->
            <path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" stroke="url(#helpGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
            <line x1="12" y1="17" x2="12.01" y2="17" stroke="url(#helpGradient)" stroke-width="2.5" stroke-linecap="round"/>
            <!-- Glow effect -->
            <circle cx="12" cy="12" r="10" fill="url(#helpGlow)"/>
        </svg>`,
        open: function() {
            if (typeof helpApp !== 'undefined') {
                helpApp.open();
            }
        }
    },
    'college-hub': {
        title: 'College Hub',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="collegeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#6366f1;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Graduation cap -->
            <path d="M12 3L2 8l10 5 10-5-10-5z" fill="url(#collegeGradient)"/>
            <path d="M2 8l10 5 10-5M2 13l10 5 10-5M2 18l10 5 10-5" stroke="url(#collegeGradient)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.6"/>
            <!-- Book -->
            <rect x="6" y="12" width="12" height="8" rx="1" fill="url(#collegeGradient)" opacity="0.3"/>
            <path d="M6 12h12M6 16h12" stroke="url(#collegeGradient)" stroke-width="1.5" stroke-linecap="round"/>
            <!-- Highlight -->
            <ellipse cx="12" cy="5" rx="3" ry="1.5" fill="white" opacity="0.3"/>
        </svg>`,
        open: function() {
            if (window.windowManager) {
                window.windowManager.openWindow({
                    id: 'college-hub',
                    title: 'College Hub',
                    url: 'college.html',
                    width: 1400,
                    height: 900,
                    resizable: true
                });
            } else {
                window.open('college.html', '_blank');
            }
        }
    },
    'classroom': {
        title: 'Classroom',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="classroomGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#4285f4;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#1967d2;stop-opacity:1" />
                </linearGradient>
            </defs>
            <!-- Book/Classroom -->
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" stroke="url(#classroomGradient)" stroke-width="2" stroke-linecap="round"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" fill="url(#classroomGradient)" opacity="0.9"/>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" stroke="rgba(0,0,0,0.1)" stroke-width="0.5" fill="none"/>
            <!-- Pages -->
            <line x1="9" y1="6" x2="18" y2="6" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
            <line x1="9" y1="10" x2="18" y2="10" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
            <line x1="9" y1="14" x2="15" y2="14" stroke="white" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
        </svg>`,
        open: function() {
            if (window.windowManager) {
                window.windowManager.openWindow({
                    id: 'classroom',
                    title: 'Classroom',
                    url: 'classroom.html',
                    width: 1400,
                    height: 900,
                    resizable: true
                });
            } else {
                window.open('classroom.html', '_blank');
            }
        }
    },
    'assignments': {
        title: 'Assignments',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="assignmentsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#f093fb;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#f5576c;stop-opacity:1" />
                </linearGradient>
            </defs>
            <path d="M12 20h9" stroke="url(#assignmentsGradient)" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" fill="url(#assignmentsGradient)" opacity="0.9"/>
            <line x1="10" y1="12" x2="18" y2="12" stroke="url(#assignmentsGradient)" stroke-width="1.5" stroke-linecap="round" opacity="0.6"/>
        </svg>`,
        open: function() {
            if (window.windowManager) {
                window.windowManager.openWindow({
                    id: 'assignments',
                    title: 'Assignments',
                    url: 'assignments.html',
                    width: 1200,
                    height: 800,
                    resizable: true
                });
            } else {
                window.open('assignments.html', '_blank');
            }
        }
    },
    'announcements': {
        title: 'Announcements',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="announcementsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#8b5cf6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#7c3aed;stop-opacity:1" />
                </linearGradient>
            </defs>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" fill="url(#announcementsGradient)" opacity="0.9"/>
            <line x1="9" y1="9" x2="15" y2="9" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
            <line x1="9" y1="13" x2="13" y2="13" stroke="white" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
        </svg>`,
        open: function() {
            if (window.windowManager) {
                window.windowManager.openWindow({
                    id: 'announcements',
                    title: 'Announcements',
                    url: 'announcements.html',
                    width: 1400,
                    height: 900,
                    resizable: true
                });
            } else {
                window.open('announcements.html', '_blank');
            }
        }
    },
    'student-progress': {
        title: 'Progress & Analytics',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#059669;stop-opacity:1" />
                </linearGradient>
            </defs>
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" stroke="url(#progressGradient)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        </svg>`,
        open: function() {
            if (window.windowManager) {
                window.windowManager.openWindow({
                    id: 'student-progress',
                    title: 'Progress & Analytics',
                    url: 'progress.html',
                    width: 1600,
                    height: 1000,
                    resizable: true
                });
            } else {
                window.open('progress.html', '_blank');
            }
        }
    },
    'mail': {
        title: 'Mail',
        iconSVG: `<svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="mailGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style="stop-color:#3b82f6;stop-opacity:1" />
                    <stop offset="100%" style="stop-color:#2563eb;stop-opacity:1" />
                </linearGradient>
            </defs>
            <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="url(#mailGradient)" opacity="0.9"/>
            <polyline points="22,6 12,13 2,6" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none" opacity="0.9"/>
        </svg>`,
        open: function() {
            if (window.windowManager) {
                window.windowManager.openWindow({
                    id: 'mail',
                    title: 'Mail',
                    url: 'mail.html',
                    width: 1400,
                    height: 900,
                    resizable: true
                });
            } else {
                window.open('mail.html', '_blank');
            }
        }
    }
};

// Attach to window for global access
if (typeof window !== 'undefined') {
    window.APP_REGISTRY = APP_REGISTRY;
}
