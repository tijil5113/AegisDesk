// Help & Instructions App
class HelpApp {
    constructor() {
        this.windowId = 'help';
    }

    createWindow() {
        const content = `
            <div class="help-app">
                <div class="help-header">
                    <h2>📚 AegisDesk Help & Instructions</h2>
                    <p class="help-subtitle">Everything you need to know to master AegisDesk</p>
                </div>

                <div class="help-content">
                    <div class="help-section">
                        <div class="help-section-header">
                            <div class="help-icon">⌨️</div>
                            <h3>Keyboard Shortcuts</h3>
                        </div>
                        <div class="help-grid">
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Alt</kbd> + <kbd>Space</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Open/Close Apps Menu</strong>
                                    <p>Quick access to all applications</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>T</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Cycle Themes</strong>
                                    <p>Switch between 6 beautiful themes</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>V</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Clipboard History</strong>
                                    <p>View your copied items</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>←</kbd>/<kbd>→</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Switch Virtual Desktops</strong>
                                    <p>Navigate between workspaces</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Ctrl</kbd> + <kbd>Alt</kbd> + <kbd>1-4</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Jump to Desktop</strong>
                                    <p>Quick switch to specific desktop</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Alt</kbd> + <kbd>Tab</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Switch Windows</strong>
                                    <p>Cycle through open windows</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Ctrl</kbd> + <kbd>W</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Close Window</strong>
                                    <p>Close the active window</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Ctrl</kbd> + <kbd>F</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Focus Search</strong>
                                    <p>Quick search for apps or web</p>
                                </div>
                            </div>
                            <div class="help-card">
                                <div class="help-shortcut">
                                    <kbd>Esc</kbd>
                                </div>
                                <div class="help-description">
                                    <strong>Close Menu/Window</strong>
                                    <p>Close apps menu or active window</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="help-section">
                        <div class="help-section-header">
                            <div class="help-icon">🎨</div>
                            <h3>Themes</h3>
                        </div>
                        <div class="help-themes">
                            <div class="help-theme-card">
                                <div class="theme-preview dark-preview"></div>
                                <div class="theme-info">
                                    <strong>Dark</strong>
                                    <span>Classic dark theme</span>
                                </div>
                            </div>
                            <div class="help-theme-card">
                                <div class="theme-preview light-preview"></div>
                                <div class="theme-info">
                                    <strong>Light</strong>
                                    <span>Bright and clean</span>
                                </div>
                            </div>
                            <div class="help-theme-card">
                                <div class="theme-preview cyberpunk-preview"></div>
                                <div class="theme-info">
                                    <strong>Cyberpunk</strong>
                                    <span>Neon green aesthetic</span>
                                </div>
                            </div>
                            <div class="help-theme-card">
                                <div class="theme-preview ocean-preview"></div>
                                <div class="theme-info">
                                    <strong>Ocean</strong>
                                    <span>Blue ocean vibes</span>
                                </div>
                            </div>
                            <div class="help-theme-card">
                                <div class="theme-preview sunset-preview"></div>
                                <div class="theme-info">
                                    <strong>Sunset</strong>
                                    <span>Warm orange tones</span>
                                </div>
                            </div>
                            <div class="help-theme-card">
                                <div class="theme-preview matrix-preview"></div>
                                <div class="theme-info">
                                    <strong>Matrix</strong>
                                    <span>Classic green terminal</span>
                                </div>
                            </div>
                        </div>
                        <p class="help-note">💡 Press <kbd>T</kbd> or click the theme icon in taskbar to cycle themes</p>
                    </div>

                    <div class="help-section">
                        <div class="help-section-header">
                            <div class="help-icon">🚀</div>
                            <h3>New Features</h3>
                        </div>
                        <div class="help-features">
                            <div class="help-feature-item">
                                <div class="feature-icon">🔔</div>
                                <div>
                                    <strong>Notification System</strong>
                                    <p>Beautiful toast notifications for all app events</p>
                                </div>
                            </div>
                            <div class="help-feature-item">
                                <div class="feature-icon">📋</div>
                                <div>
                                    <strong>Clipboard History</strong>
                                    <p>Never lose your copied text - access with Ctrl+Shift+V</p>
                                </div>
                            </div>
                            <div class="help-feature-item">
                                <div class="feature-icon">🖥️</div>
                                <div>
                                    <strong>Virtual Desktops</strong>
                                    <p>4 workspaces to organize your apps - Ctrl+Alt+Left/Right</p>
                                </div>
                            </div>
                            <div class="help-feature-item">
                                <div class="feature-icon">📧</div>
                                <div>
                                    <strong>Email App</strong>
                                    <p>Full-featured email client built-in</p>
                                </div>
                            </div>
                            <div class="help-feature-item">
                                <div class="feature-icon">🧠</div>
                                <div>
                                    <strong>System Intelligence</strong>
                                    <p>OS analytics and productivity insights</p>
                                </div>
                            </div>
                            <div class="help-feature-item">
                                <div class="feature-icon">📰</div>
                                <div>
                                    <strong>News Reader</strong>
                                    <p>Stay informed with latest news</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="help-section">
                        <div class="help-section-header">
                            <div class="help-icon">💡</div>
                            <h3>Quick Tips</h3>
                        </div>
                        <div class="help-tips">
                            <div class="help-tip">
                                <span class="tip-number">1</span>
                                <p><strong>Drag windows</strong> by clicking and holding the title bar</p>
                            </div>
                            <div class="help-tip">
                                <span class="tip-number">2</span>
                                <p><strong>Resize windows</strong> by dragging the edges or corners</p>
                            </div>
                            <div class="help-tip">
                                <span class="tip-number">3</span>
                                <p><strong>Pin apps</strong> to taskbar for quick access</p>
                            </div>
                            <div class="help-tip">
                                <span class="tip-number">4</span>
                                <p><strong>Search bar</strong> can search Google, open apps, or ask AI</p>
                            </div>
                            <div class="help-tip">
                                <span class="tip-number">5</span>
                                <p><strong>All data</strong> is saved locally in your browser</p>
                            </div>
                            <div class="help-tip">
                                <span class="tip-number">6</span>
                                <p><strong>Settings app</strong> has all customization options</p>
                            </div>
                        </div>
                    </div>

                    <div class="help-footer">
                        <p>💚 Made with love for productivity</p>
                        <p class="help-version">AegisDesk v2.0 - Enhanced Edition</p>
                    </div>
                </div>
            </div>
        `;

        const window = windowManager.createWindow(this.windowId, {
            title: 'Help & Instructions',
            width: 900,
            height: 750,
            content,
            class: 'help-window'
        });

        return window;
    }

    open() {
        return this.createWindow();
    }
}

// Create global instance
const helpApp = new HelpApp();
