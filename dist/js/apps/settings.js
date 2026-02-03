// Settings App
class SettingsApp {
    constructor() {
        this.windowId = 'settings';
        this.settings = storage.get('settings', {
            theme: 'dark',
            animations: true,
            autoSave: true,
            openaiApiKey: '' // DO NOT hardcode API keys - user must enter their own
        });
        
        // Note: API key should be entered by user through the settings UI
        // We don't set a default key for security reasons
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Settings',
            width: 700,
            height: 600,
            class: 'app-settings',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        return `
            <div class="settings-container">
                <div class="settings-header">
                    <h2>Settings</h2>
                </div>
                
                <div class="settings-section">
                    <div class="settings-section-title">Appearance</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Theme</div>
                            <div class="settings-item-desc">Choose your preferred color theme</div>
                            <div class="theme-selector" style="margin-top: 12px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;">
                                ${this.renderThemeOptions()}
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="settings-section">
                    <div class="settings-section-title">Language</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Interface Language</div>
                            <div class="settings-item-desc">Choose your preferred language</div>
                            <select id="language-select" style="margin-top: 8px; width: 100%; padding: 8px 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 13px;">
                                <option value="en">English</option>
                                <option value="ta">தமிழ் (Tamil)</option>
                                <option value="hi">हिन्दी (Hindi)</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">OS Mode</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Current Mode</div>
                            <div class="settings-item-desc">Switch between Work, Study, Focus, or Chill modes</div>
                            <div class="mode-selector" style="margin-top: 12px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;">
                                ${this.renderModeOptions()}
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">General</div>
                    <div class="settings-item">
                        <div class="settings-item-label">
                            <div class="settings-item-title">Enable Animations</div>
                            <div class="settings-item-desc">Smooth transitions and animations throughout the interface</div>
                        </div>
                        <div class="settings-toggle ${this.settings.animations ? 'active' : ''}" data-setting="animations">
                            <div class="settings-toggle-slider"></div>
                        </div>
                    </div>
                    
                    <div class="settings-item">
                        <div class="settings-item-label">
                            <div class="settings-item-title">Auto-save</div>
                            <div class="settings-item-desc">Automatically save your work as you type</div>
                        </div>
                        <div class="settings-toggle ${this.settings.autoSave ? 'active' : ''}" data-setting="autoSave">
                            <div class="settings-toggle-slider"></div>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Notifications</div>
                    <div class="settings-item">
                        <div class="settings-item-label">
                            <div class="settings-item-title">Silent Mode</div>
                            <div class="settings-item-desc">Only show critical notifications</div>
                        </div>
                        <div class="settings-toggle ${storage.get('notification_silent_mode', false) ? 'active' : ''}" data-setting="silentMode">
                            <div class="settings-toggle-slider"></div>
                        </div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Notification Center</div>
                            <div class="settings-item-desc">View and manage all notifications</div>
                            <button id="open-notification-center-btn" style="margin-top: 12px; padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 13px;">
                                Open Notification Center
                            </button>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">AI Assistant</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">OpenAI API Key</div>
                            <div class="settings-item-desc">Enter your OpenAI API key to enable AI Assistant features</div>
                            <input type="password" 
                                   id="openai-api-key" 
                                   value="${this.escapeHtml(storage.get('openai_api_key', this.settings.openaiApiKey))}" 
                                   placeholder="sk-..."
                                   style="margin-top: 8px; width: 100%; padding: 8px 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 13px; font-family: 'JetBrains Mono', monospace;">
                            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
                                🔒 Your API key is stored locally in your browser and never sent anywhere except OpenAI's servers.<br>
                                📝 Get your API key at: <a href="https://platform.openai.com/api-keys" target="_blank" style="color: var(--primary-light); text-decoration: underline;">platform.openai.com/api-keys</a>
                            </small>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Music</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">YouTube API Key</div>
                            <div class="settings-item-desc">Enter your YouTube Data API v3 key to enable music features</div>
                            <input type="password" 
                                   id="youtube-api-key" 
                                   value="${this.escapeHtml(storage.get('youtube_api_key', ''))}" 
                                   placeholder="AIza..."
                                   style="margin-top: 8px; width: 100%; padding: 8px 12px; background: rgba(15, 23, 42, 0.6); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); font-size: 13px; font-family: 'JetBrains Mono', monospace;">
                            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
                                🔒 Your API key is stored locally in your browser.<br>
                                📝 Get your API key at: <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: var(--primary-light); text-decoration: underline;">Google Cloud Console</a><br>
                                📚 Enable "YouTube Data API v3" in your project
                            </small>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Advanced</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Virtual Desktops</div>
                            <div class="settings-item-desc">Switch between multiple desktop workspaces</div>
                            <button id="desktop-switcher-btn" style="margin-top: 12px; padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 13px;">
                                Open Desktop Switcher
                            </button>
                            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
                                Use Ctrl+Alt+Left/Right to switch desktops
                            </small>
                        </div>
                    </div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Clipboard History</div>
                            <div class="settings-item-desc">View and manage your clipboard history</div>
                            <button id="clipboard-history-btn" style="margin-top: 12px; padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 13px;">
                                Open Clipboard History
                            </button>
                            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
                                Use Ctrl+Shift+V to open clipboard history
                            </small>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Privacy & Transparency</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">What the OS Knows About You</div>
                            <div class="settings-item-desc">View and manage your data stored locally</div>
                            <button id="privacy-panel-btn" style="margin-top: 12px; padding: 8px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 6px; color: var(--text-primary); cursor: pointer; font-size: 13px;">
                                Open Privacy Panel
                            </button>
                            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
                                🔒 All data is stored locally on your device. Nothing is sent to external servers.
                            </small>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">System Intelligence</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Reset System Intelligence</div>
                            <div class="settings-item-desc">Clear all learned habits, preferences, and AI memory</div>
                            <button id="reset-intelligence-btn" style="margin-top: 12px; padding: 8px 16px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; color: #ef4444; cursor: pointer; font-size: 13px;">
                                Reset Intelligence
                            </button>
                            <small style="color: var(--text-muted); font-size: 11px; margin-top: 4px; display: block;">
                                This will clear your user profile, habits, and AI memory. Your tasks and notes will remain.
                            </small>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Data</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Clear All Data</div>
                            <div class="settings-item-desc">Remove all saved data including tasks, notes, and preferences</div>
                            <button id="clear-data-btn" style="margin-top: 12px; padding: 8px 16px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; color: #ef4444; cursor: pointer; font-size: 13px;">
                                Clear All Data
                            </button>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">Installation</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">Install AegisDesk</div>
                            <div class="settings-item-desc">Install AegisDesk as a desktop app for offline access and better performance</div>
                            <button id="install-pwa-btn" style="margin-top: 12px; padding: 10px 20px; background: linear-gradient(135deg, var(--primary), var(--secondary)); border: none; border-radius: 8px; color: white; cursor: pointer; font-size: 14px; font-weight: 500; display: none;">
                                Install AegisDesk
                            </button>
                            <div id="pwa-install-status" style="margin-top: 8px; font-size: 12px; color: var(--text-muted);"></div>
                        </div>
                    </div>
                </div>

                <div class="settings-section">
                    <div class="settings-section-title">About</div>
                    <div class="settings-item">
                        <div class="settings-item-label" style="flex: 1;">
                            <div class="settings-item-title">AegisDesk</div>
                            <div class="settings-item-desc" style="margin-top: 8px;">
                                Version 1.0.0<br>
                                AI-Powered Unified Desktop Operating System for Personal Productivity<br><br>
                                Built with ❤️ for organizing your digital life.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        
        // Toggle switches
        content.querySelectorAll('.settings-toggle').forEach(toggle => {
            toggle.addEventListener('click', () => {
                const setting = toggle.dataset.setting;
                const isActive = toggle.classList.contains('active');
                
                toggle.classList.toggle('active');
                this.settings[setting] = !isActive;
                this.save();
                
                // Apply settings
                if (setting === 'animations') {
                    document.body.style.setProperty('--animations', this.settings.animations ? '1' : '0');
                }
            });
        });

        // API Key input
        const apiKeyInput = content.querySelector('#openai-api-key');
        let saveTimeout;
        apiKeyInput.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.settings.openaiApiKey = apiKeyInput.value.trim();
                storage.set('openai_api_key', this.settings.openaiApiKey);
                this.save();
            }, 1000);
        });
        
        // YouTube API key
        const youtubeApiKeyInput = content.querySelector('#youtube-api-key');
        if (youtubeApiKeyInput) {
            let youtubeSaveTimeout;
            youtubeApiKeyInput.addEventListener('input', () => {
                clearTimeout(youtubeSaveTimeout);
                youtubeSaveTimeout = setTimeout(() => {
                    const key = youtubeApiKeyInput.value.trim();
                    storage.set('youtube_api_key', key);
                    // Reload music system if available
                    if (typeof window.musicSystem !== 'undefined' && window.musicSystem) {
                        window.musicSystem.apiKey = key;
                    }
                }, 1000);
            });
        }

        // Clear data button
        const clearDataBtn = content.querySelector('#clear-data-btn');
        clearDataBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all data? This cannot be undone.')) {
                storage.clear();
                this.settings = { theme: 'dark', animations: true, autoSave: true, openaiApiKey: '' };
                this.save();
                alert('All data has been cleared. The page will reload.');
                location.reload();
            }
        });

        // PWA Install button
        this.setupPWAInstall(content);

        // Theme selector
        content.querySelectorAll('.theme-option').forEach(option => {
            option.addEventListener('click', () => {
                const theme = option.dataset.theme;
                if (typeof themeSystem !== 'undefined') {
                    themeSystem.setTheme(theme);
                    this.settings.theme = theme;
                    this.save();
                    if (typeof notificationSystem !== 'undefined') {
                        notificationSystem.success('Settings', `Theme changed to ${themeSystem.themes[theme].name}`);
                    }
                }
            });
        });

        // Desktop switcher
        const desktopSwitcherBtn = content.querySelector('#desktop-switcher-btn');
        desktopSwitcherBtn?.addEventListener('click', () => {
            if (typeof virtualDesktops !== 'undefined') {
                virtualDesktops.showDesktopSwitcher();
            }
        });

        // Clipboard history
        const clipboardHistoryBtn = content.querySelector('#clipboard-history-btn');
        clipboardHistoryBtn?.addEventListener('click', () => {
            if (typeof clipboardManager !== 'undefined') {
                clipboardManager.showHistory();
            }
        });

        // Language selector
        const languageSelect = content.querySelector('#language-select');
        if (languageSelect && typeof i18n !== 'undefined') {
            languageSelect.value = i18n.getLanguage();
            languageSelect.addEventListener('change', (e) => {
                i18n.setLanguage(e.target.value);
            });
        }

        // Mode selector
        content.querySelectorAll('.mode-option').forEach(option => {
            option.addEventListener('click', () => {
                const mode = option.dataset.mode;
                if (typeof modeManager !== 'undefined') {
                    modeManager.setMode(mode);
                    // Refresh mode options
                    const modeSelector = content.querySelector('.mode-selector');
                    if (modeSelector) {
                        modeSelector.innerHTML = this.renderModeOptions();
                        // Re-attach events
                        content.querySelectorAll('.mode-option').forEach(opt => {
                            opt.addEventListener('click', () => {
                                const m = opt.dataset.mode;
                                if (typeof modeManager !== 'undefined') {
                                    modeManager.setMode(m);
                                    // Refresh again
                                    modeSelector.innerHTML = this.renderModeOptions();
                                }
                            });
                        });
                    }
                }
            });
        });

        // Silent mode toggle
        const silentModeToggle = content.querySelector('[data-setting="silentMode"]');
        if (silentModeToggle) {
            silentModeToggle.addEventListener('click', () => {
                const isActive = silentModeToggle.classList.contains('active');
                silentModeToggle.classList.toggle('active');
                if (typeof notificationCenter !== 'undefined') {
                    notificationCenter.setSilentMode(!isActive);
                }
            });
        }

        // Notification center button
        const notificationCenterBtn = content.querySelector('#open-notification-center-btn');
        notificationCenterBtn?.addEventListener('click', () => {
            if (typeof notificationCenter !== 'undefined') {
                notificationCenter.show();
            }
        });

        // Privacy panel button
        const privacyPanelBtn = content.querySelector('#privacy-panel-btn');
        privacyPanelBtn?.addEventListener('click', () => {
            this.showPrivacyPanel(content);
        });

        // Reset intelligence button
        const resetIntelligenceBtn = content.querySelector('#reset-intelligence-btn');
        resetIntelligenceBtn?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all system intelligence? This will clear your user profile, habits, and AI memory. Your tasks and notes will remain.')) {
                if (typeof userProfile !== 'undefined') {
                    userProfile.resetProfile();
                    alert('System intelligence has been reset.');
                }
            }
        });
    }

    showPrivacyPanel(content) {
        if (typeof userProfile === 'undefined' || !userProfile.initialized) {
            alert('User profile not available');
            return;
        }

        const profileData = userProfile.exportProfileData();
        const insights = userProfile.getInsights();

        const panel = document.createElement('div');
        panel.className = 'settings-privacy-panel';
        panel.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: var(--bg-primary, #0f172a);
            border: 1px solid var(--border, rgba(148, 163, 184, 0.2));
            border-radius: 12px;
            padding: 2rem;
            max-width: 600px;
            max-height: 80vh;
            overflow-y: auto;
            z-index: 10000;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
        `;

        panel.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem;">
                <h3 style="margin: 0;">Privacy & Transparency</h3>
                <button id="privacy-panel-close" style="background: transparent; border: none; color: var(--text-primary); cursor: pointer; font-size: 1.5rem;">×</button>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>What the OS knows about you:</strong>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                    All data is stored locally on your device. Nothing is sent to external servers.
                </p>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Habits:</strong>
                <ul style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                    <li>App usage: ${Object.keys(profileData.profile.habits.appUsage || {}).length} apps tracked</li>
                    <li>Features used: ${Object.keys(profileData.profile.habits.features || {}).length} features</li>
                    <li>Total events: ${profileData.eventsCount} events recorded</li>
                </ul>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>Preferences:</strong>
                <ul style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                    <li>Theme: ${profileData.profile.preferredTheme}</li>
                    <li>Language: ${profileData.profile.language}</li>
                    <li>News categories: ${profileData.profile.newsCategories.length}</li>
                </ul>
            </div>
            <div style="margin-bottom: 1rem;">
                <strong>AI Memory:</strong>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                    ${profileData.profile.aiMemory?.length || 0} memories stored
                </p>
            </div>
            ${insights ? `
            <div style="margin-bottom: 1rem;">
                <strong>Top Apps:</strong>
                <ul style="color: var(--text-muted); font-size: 0.875rem; margin-top: 0.5rem;">
                    ${insights.topApps.slice(0, 5).map(app => `<li>${app.appId}: ${app.count} uses</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            <div style="margin-top: 1.5rem; padding-top: 1.5rem; border-top: 1px solid var(--border);">
                <button id="privacy-reset-data" style="padding: 8px 16px; background: rgba(239, 68, 68, 0.2); border: 1px solid rgba(239, 68, 68, 0.5); border-radius: 6px; color: #ef4444; cursor: pointer; font-size: 13px;">
                    Reset All Data
                </button>
            </div>
        `;

        document.body.appendChild(panel);

        panel.querySelector('#privacy-panel-close').addEventListener('click', () => {
            panel.remove();
        });

        panel.querySelector('#privacy-reset-data').addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                if (typeof userProfile !== 'undefined') {
                    userProfile.resetProfile();
                }
                storage.clear();
                alert('All data has been reset. The page will reload.');
                location.reload();
            }
        });
    }

    renderThemeOptions() {
        if (typeof themeSystem === 'undefined') {
            return '<div>Theme system not available</div>';
        }

        const themes = themeSystem.getAvailableThemes();
        const currentTheme = themeSystem.getTheme();

        return themes.map(theme => `
            <div class="theme-option ${theme.id === currentTheme ? 'active' : ''}" 
                 data-theme="${theme.id}"
                 style="
                    padding: 16px;
                    border: 2px solid ${theme.id === currentTheme ? 'var(--primary)' : 'var(--border)'};
                    border-radius: 8px;
                    cursor: pointer;
                    text-align: center;
                    background: var(--bg-card);
                    transition: all 0.2s;
                 ">
                <div style="font-weight: 600; margin-bottom: 4px;">${theme.name}</div>
                <div style="font-size: 11px; color: var(--text-muted);">${theme.id}</div>
            </div>
        `).join('');
    }

    renderModeOptions() {
        if (typeof modeManager === 'undefined') {
            return '<div>Mode manager not available</div>';
        }

        const modes = modeManager.getAvailableModes();
        const currentMode = modeManager.getCurrentMode();

        return modes.map(mode => `
            <div class="mode-option ${mode.current ? 'active' : ''}" 
                 data-mode="${mode.id}"
                 style="
                    padding: 12px;
                    border: 2px solid ${mode.current ? 'var(--primary)' : 'var(--border)'};
                    border-radius: 8px;
                    cursor: pointer;
                    text-align: center;
                    background: var(--bg-card);
                    transition: all 0.2s;
                 ">
                <div style="font-weight: 600; font-size: 14px;">${mode.name}</div>
            </div>
        `).join('');
    }

    setupPWAInstall(content) {
        const installBtn = content.querySelector('#install-pwa-btn');
        const statusEl = content.querySelector('#pwa-install-status');
        
        if (!installBtn) return;

        let deferredPrompt = null;

        // Listen for beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;
            installBtn.style.display = 'block';
            if (statusEl) statusEl.textContent = 'AegisDesk can be installed on your device.';
        });

        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone) {
            installBtn.style.display = 'none';
            if (statusEl) statusEl.textContent = '✓ AegisDesk is installed.';
        }

        // Install button click
        installBtn.addEventListener('click', async () => {
            if (!deferredPrompt) {
                if (statusEl) statusEl.textContent = 'Installation not available. Please use your browser\'s install option.';
                return;
            }

            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                if (statusEl) statusEl.textContent = '✓ Installation started!';
                installBtn.style.display = 'none';
            } else {
                if (statusEl) statusEl.textContent = 'Installation cancelled.';
            }
            
            deferredPrompt = null;
        });
    }

    save() {
        storage.set('settings', this.settings);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const settingsApp = new SettingsApp();

