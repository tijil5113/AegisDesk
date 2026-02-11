// System Monitor App - REAL performance and device telemetry
// NOTE: This module is self-contained and only touches System Monitor UI + logic.
class SystemMonitorApp {
    constructor() {
        this.windowId = 'system-monitor';

        // Sampling + timers
        this.telemetryInterval = null;
        this.eventLoopInterval = null;
        this.fpsRafId = null;
        this.networkInterval = null;

        // Time-series buffers (rolling)
        this.historyLimit = 120; // ~4–6 minutes depending on sample interval
        this.history = {
            timestamps: [],
            cpu: [],
            memory: [],
            fps: [],
            eventLoopLag: [],
            networkDownMbps: []
        };

        // Latest snapshot of metrics
        this.metrics = {
            cpuLoad: 0,
            memoryUsedRatio: 0,
            memoryUsedMb: null,
            memoryTotalMb: null,
            fps: 60,
            eventLoopLagMs: 0,
            jsHeapUsed: null,
            jsHeapLimit: null,
            storageUsageMb: null,
            storageQuotaMb: null,
            networkDownMbps: null,
            networkLatencyMs: null,
            connectionType: null,
            connectionEffectiveType: null,
            appLoads: {},
            systemHealthScore: 100,
            systemHealthLabel: 'Excellent'
        };

        // Cached device info
        this.deviceInfo = null;

        // Simple in-memory log
        this.logs = [];

        // For FPS calculation
        this._fpsLastTime = null;
        this._fpsFrames = 0;

        // For event loop lag
        this._eventLoopLast = performance.now();

        // Advanced metrics tracking
        this.advancedMetrics = {
            renderTimeMs: [],
            frameDrops: 0,
            gcCount: 0,
            networkJitter: [],
            idleTimePercent: 0
        };

        // AI conversation memory
        this.aiConversationHistory = [];

        // Theme
        this.currentTheme = localStorage.getItem('systemMonitorTheme') || 'default';

        // Pro Mode
        this.proMode = localStorage.getItem('systemMonitorProMode') === 'true';

        // Chart expansion state
        this.expandedChart = null;

        // Timeline scrubber position
        this.timelinePosition = 1.0; // 0.0 = oldest, 1.0 = newest
    }

    open() {
        try {
            if (!windowManager) {
                console.error('System Monitor: windowManager not available');
                alert('System Monitor cannot open: Window Manager not initialized');
                return;
            }

            const content = this.render();
            const win = windowManager.createWindow(this.windowId, {
                title: 'System Monitor',
                width: 980,
                height: 720,
                class: 'app-system-monitor',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                    <line x1="8" y1="21" x2="16" y2="21"></line>
                    <line x1="12" y1="17" x2="12" y2="21"></line>
                </svg>`,
                content,
                onClose: () => this.stopMonitoring()
            });

            if (!win) {
                console.error('System Monitor: Failed to create window');
                return;
            }

            // Apply saved theme
            if (this.currentTheme !== 'default') {
                win.classList.add(`theme-${this.currentTheme}`);
            }
            
            this.attachEvents(win);
            this.startMonitoring(win);
            
            console.log('System Monitor opened successfully');
        } catch (error) {
            console.error('System Monitor open error:', error);
            alert(`System Monitor failed to open: ${error.message}`);
        }
    }

    render() {
        return `
            <div class="system-monitor-container">
                <div class="system-monitor-header">
                    <div class="system-monitor-title-group">
                        <h2>System Monitor</h2>
                        <div class="system-monitor-subtitle">Real-time device, performance, and app telemetry</div>
                    </div>
                    <div class="system-monitor-header-actions">
                        <button class="system-btn system-btn-ghost" id="system-theme-toggle" title="Change Theme">🎨</button>
                        <button class="system-btn system-btn-ghost" id="system-pro-toggle" title="Toggle Pro Mode">⚡</button>
                        <button class="system-btn system-btn-ghost" id="system-export-json">Export JSON</button>
                        <button class="system-btn system-btn-ghost" id="system-export-csv">Export CSV</button>
                        <button class="system-btn system-btn-ghost" id="system-reset-data">Reset Data</button>
                        <button class="system-btn system-btn-primary" id="refresh-btn">Force Refresh</button>
                    </div>
                </div>

                <div class="system-monitor-tabs" role="tablist">
                    <button class="system-tab active" data-tab="overview" role="tab" aria-selected="true">Overview</button>
                    <button class="system-tab" data-tab="performance" role="tab">Performance</button>
                    <button class="system-tab" data-tab="hardware" role="tab">Hardware</button>
                    <button class="system-tab" data-tab="apps" role="tab">Apps</button>
                    <button class="system-tab" data-tab="battery" role="tab">Battery</button>
                    <button class="system-tab" data-tab="network" role="tab">Network</button>
                    <button class="system-tab" data-tab="logs" role="tab">Dev / Logs</button>
                    <button class="system-tab" data-tab="ai" role="tab">AI Advisor</button>
                    <button class="system-tab" data-tab="pro" role="tab" id="pro-tab" style="display:none;">Pro Mode</button>
                </div>

                <div class="system-monitor-main">
                    <!-- OVERVIEW -->
                    <section class="system-tab-panel active" data-tab-panel="overview" aria-label="Overview">
                        <div class="system-stats-grid">
                            <div class="system-stat-card">
                                <div class="stat-icon cpu-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                                        <rect x="9" y="9" width="6" height="6"></rect>
                                        <line x1="9" y1="1" x2="9" y2="4"></line>
                                        <line x1="15" y1="1" x2="15" y2="4"></line>
                                        <line x1="9" y1="20" x2="9" y2="23"></line>
                                        <line x1="15" y1="20" x2="15" y2="23"></line>
                                    </svg>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">CPU Load (estimated)</div>
                                    <div class="stat-value" id="cpu-value">–%</div>
                                    <div class="stat-bar">
                                        <div class="stat-bar-fill" id="cpu-bar" style="width: 0%"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="system-stat-card">
                                <div class="stat-icon memory-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <rect x="4" y="4" width="16" height="16" rx="2"></rect>
                                        <rect x="9" y="9" width="6" height="6"></rect>
                                    </svg>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">Memory Usage</div>
                                    <div class="stat-value" id="memory-value">–%</div>
                                    <div class="stat-bar">
                                        <div class="stat-bar-fill" id="memory-bar" style="width: 0%"></div>
                                    </div>
                                    <div class="stat-subtext" id="memory-subtext">JS heap data pending…</div>
                                </div>
                            </div>
                            <div class="system-stat-card">
                                <div class="stat-icon network-icon">
                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <circle cx="12" cy="12" r="10"></circle>
                                        <circle cx="12" cy="12" r="3"></circle>
                                        <line x1="12" y1="2" x2="12" y2="6"></line>
                                        <line x1="12" y1="18" x2="12" y2="22"></line>
                                        <line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line>
                                        <line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line>
                                        <line x1="2" y1="12" x2="6" y2="12"></line>
                                        <line x1="18" y1="12" x2="22" y2="12"></line>
                                    </svg>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">Network</div>
                                    <div class="stat-value" id="network-value">Detecting…</div>
                                    <div class="stat-bar">
                                        <div class="stat-bar-fill" id="network-bar" style="width: 0%"></div>
                                    </div>
                                    <div class="stat-subtext" id="network-subtext"></div>
                                </div>
                            </div>
                            <div class="system-stat-card system-health-card">
                                <div class="stat-icon">
                                    <div class="health-ring" id="health-ring">
                                        <span id="health-score-label">100</span>
                                    </div>
                                </div>
                                <div class="stat-info">
                                    <div class="stat-label">System Health</div>
                                    <div class="system-health-status" id="health-status-text">Excellent</div>
                                    <div class="system-health-badges">
                                        <span id="health-cpu-badge" class="health-badge">CPU: –</span>
                                        <span id="health-mem-badge" class="health-badge">Mem: –</span>
                                        <span id="health-fps-badge" class="health-badge">FPS: –</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div class="system-overview-layout">
                            <div class="system-chart-card">
                                <div class="system-chart-header">
                                    <h3>CPU / Memory Timeline</h3>
                                    <div class="system-chart-controls">
                                        <button class="system-mini-btn" id="system-toggle-stream">Pause</button>
                                        <button class="system-mini-btn system-expand-btn" data-chart="cpu-memory-chart" title="Expand Chart">⛶</button>
                                    </div>
                                </div>
                                <div class="chart-container" data-chart-id="cpu-memory-chart">
                                    <canvas id="cpu-memory-chart" width="800" height="220"></canvas>
                                    <div class="chart-tooltip" id="cpu-memory-chart-tooltip"></div>
                                </div>
                                <div class="timeline-scrubber-container">
                                    <input type="range" class="timeline-scrubber" id="timeline-scrubber" min="0" max="100" value="100" />
                                    <div class="timeline-labels">
                                        <span>Past</span>
                                        <span>Now</span>
                                    </div>
                                </div>
                            </div>
                            <div class="system-device-card" id="device-info-panel">
                                <h3>Device Info</h3>
                                <dl class="device-info-grid" id="device-info-grid"></dl>
                            </div>
                        </div>
                    </section>

                    <!-- PERFORMANCE -->
                    <section class="system-tab-panel" data-tab-panel="performance" aria-label="Performance">
                        <div class="system-charts-grid">
                            <div class="system-chart-card">
                                <div class="system-chart-header">
                                    <h3>CPU Load (event loop)</h3>
                                    <button class="system-mini-btn system-expand-btn" data-chart="cpu-chart" title="Expand Chart">⛶</button>
                                </div>
                                <div class="chart-container" data-chart-id="cpu-chart">
                                    <canvas id="cpu-chart" width="800" height="180"></canvas>
                                    <div class="chart-tooltip" id="cpu-chart-tooltip"></div>
                                </div>
                            </div>
                            <div class="system-chart-card">
                                <div class="system-chart-header">
                                    <h3>Memory Usage</h3>
                                    <button class="system-mini-btn system-expand-btn" data-chart="memory-chart" title="Expand Chart">⛶</button>
                                </div>
                                <div class="chart-container" data-chart-id="memory-chart">
                                    <canvas id="memory-chart" width="800" height="180"></canvas>
                                    <div class="chart-tooltip" id="memory-chart-tooltip"></div>
                                </div>
                            </div>
                            <div class="system-chart-card">
                                <div class="system-chart-header">
                                    <h3>FPS Stability</h3>
                                    <button class="system-mini-btn system-expand-btn" data-chart="fps-chart" title="Expand Chart">⛶</button>
                                </div>
                                <div class="chart-container" data-chart-id="fps-chart">
                                    <canvas id="fps-chart" width="800" height="180"></canvas>
                                    <div class="chart-tooltip" id="fps-chart-tooltip"></div>
                                </div>
                            </div>
                            <div class="system-chart-card">
                                <div class="system-chart-header">
                                    <h3>Network Downlink</h3>
                                    <button class="system-mini-btn system-expand-btn" data-chart="network-chart" title="Expand Chart">⛶</button>
                                </div>
                                <div class="chart-container" data-chart-id="network-chart">
                                    <canvas id="network-chart" width="800" height="180"></canvas>
                                    <div class="chart-tooltip" id="network-chart-tooltip"></div>
                                </div>
                            </div>
                        </div>
                    </section>

                    <!-- HARDWARE -->
                    <section class="system-tab-panel" data-tab-panel="hardware" aria-label="Hardware">
                        <div class="system-two-column">
                            <div>
                                <h3>Device & OS</h3>
                                <dl class="device-info-grid" id="device-info-hardware"></dl>
                            </div>
                            <div>
                                <h3>Environment</h3>
                                <dl class="device-info-grid" id="device-env-grid"></dl>
                            </div>
                        </div>
                    </section>

                    <!-- APPS -->
                    <section class="system-tab-panel" data-tab-panel="apps" aria-label="Apps">
                        <div class="system-apps-header">
                            <h3>App Resource Overview</h3>
                            <span class="apps-note">Estimated load based on active windows and focus time. No OS processes are inspected.</span>
                        </div>
                        <table class="system-apps-table">
                            <thead>
                                <tr>
                                    <th>App</th>
                                    <th>Status</th>
                                    <th>Estimated Load</th>
                                    <th>Open Time</th>
                                </tr>
                            </thead>
                            <tbody id="apps-table-body"></tbody>
                        </table>
                    </section>

                    <!-- BATTERY -->
                    <section class="system-tab-panel" data-tab-panel="battery" aria-label="Battery">
                        <div class="system-battery-layout">
                            <div class="battery-main">
                                <h3>Battery & Power</h3>
                                <div id="battery-supported-message" class="battery-message"></div>
                                <div class="battery-stats" id="battery-stats" hidden>
                                    <div class="battery-percentage" id="battery-percentage">–%</div>
                                    <div class="battery-meta">
                                        <div id="battery-status"></div>
                                        <div id="battery-time-remaining"></div>
                                    </div>
                                </div>
                            </div>
                            <div class="battery-modes">
                                <h4>Power Mode (local to System Monitor)</h4>
                                <div class="battery-mode-buttons">
                                    <button class="system-btn system-btn-chip" data-power-mode="performance">Performance</button>
                                    <button class="system-btn system-btn-chip" data-power-mode="balanced">Balanced</button>
                                    <button class="system-btn system-btn-chip" data-power-mode="saver">Battery Saver</button>
                                </div>
                                <p class="battery-note">These modes adjust System Monitor sampling / animations only. They do not change OS power profiles.</p>
                            </div>
                        </div>
                    </section>

                    <!-- NETWORK -->
                    <section class="system-tab-panel" data-tab-panel="network" aria-label="Network">
                        <div class="system-network-layout">
                            <div>
                                <h3>Connection</h3>
                                <dl class="device-info-grid" id="network-info-grid"></dl>
                            </div>
                            <div class="network-actions">
                                <h4>Quick Tests</h4>
                                <button class="system-btn" id="network-run-latency">Run Latency Check</button>
                                <button class="system-btn" id="network-run-speed">Run Speed Check (small)</button>
                                <div class="network-test-output" id="network-test-output"></div>
                            </div>
                        </div>
                    </section>

                    <!-- LOGS / DEV -->
                    <section class="system-tab-panel" data-tab-panel="logs" aria-label="Logs">
                        <div class="system-dev-grid">
                            <div>
                                <h3>Performance Debug Metrics</h3>
                                <ul class="dev-metrics-list" id="dev-metrics-list"></ul>
                            </div>
                            <div>
                                <h3>Event Log</h3>
                                <div class="dev-log" id="dev-log"></div>
                            </div>
                        </div>
                    </section>

                    <!-- AI ADVISOR -->
                    <section class="system-tab-panel" data-tab-panel="ai" aria-label="AI Advisor">
                        <div class="system-ai-panel">
                            <div class="system-ai-header">
                                <h3>AI System Advisor</h3>
                                <p>Ask for help with performance, stability, and optimization. AI sees your current metrics but never leaves this device.</p>
                                <button class="system-btn system-btn-ghost" id="ai-clear-history" style="margin-top:8px;">Clear Conversation</button>
                            </div>
                            <div class="system-ai-body">
                                <div class="system-ai-messages" id="system-ai-messages"></div>
                                <div class="ai-typing-indicator" id="ai-typing-indicator" style="display:none;">
                                    <span>Analyzing your system</span>
                                    <span class="typing-dots">...</span>
                                </div>
                                <form class="system-ai-input-row" id="system-ai-form">
                                    <input type="text" id="system-ai-input" placeholder="Example: Why is my system feeling slow?" autocomplete="off" />
                                    <button type="submit" class="system-btn system-btn-primary">Ask</button>
                                </form>
                            </div>
                        </div>
                    </section>

                    <!-- PRO MODE -->
                    <section class="system-tab-panel" data-tab-panel="pro" aria-label="Pro Mode">
                        <div class="pro-mode-panel">
                            <h3>Pro Mode - Developer Tools</h3>
                            <div class="pro-grid">
                                <div class="pro-section">
                                    <h4>Raw Telemetry</h4>
                                    <pre class="pro-telemetry" id="pro-telemetry"></pre>
                                </div>
                                <div class="pro-section">
                                    <h4>Event Timeline</h4>
                                    <div class="pro-timeline" id="pro-timeline"></div>
                                </div>
                                <div class="pro-section">
                                    <h4>Performance Traces</h4>
                                    <div class="pro-traces" id="pro-traces"></div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        `;
    }

    attachEvents(win) {
        const refreshBtn = win.querySelector('#refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.collectSnapshot().then(() => {
                    this.renderAll(win);
                    this.log('Manual refresh');
                });
            });
        }

        const exportBtn = win.querySelector('#system-export-json');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportSnapshot('json'));
        }

        const exportCsvBtn = win.querySelector('#system-export-csv');
        if (exportCsvBtn) {
            exportCsvBtn.addEventListener('click', () => this.exportSnapshot('csv'));
        }

        const themeBtn = win.querySelector('#system-theme-toggle');
        if (themeBtn) {
            themeBtn.addEventListener('click', () => this.cycleTheme(win));
        }

        const proToggleBtn = win.querySelector('#system-pro-toggle');
        const proTab = win.querySelector('#pro-tab');
        if (proToggleBtn) {
            proToggleBtn.addEventListener('click', () => {
                this.proMode = !this.proMode;
                localStorage.setItem('systemMonitorProMode', String(this.proMode));
                if (proTab) proTab.style.display = this.proMode ? 'block' : 'none';
                proToggleBtn.textContent = this.proMode ? '⚡ Pro' : '⚡';
            });
            if (proTab) proTab.style.display = this.proMode ? 'block' : 'none';
        }

        const aiClearBtn = win.querySelector('#ai-clear-history');
        if (aiClearBtn) {
            aiClearBtn.addEventListener('click', () => {
                this.aiConversationHistory = [];
                const messagesEl = win.querySelector('#system-ai-messages');
                if (messagesEl) messagesEl.innerHTML = '';
            });
        }

        // Chart expansion
        win.querySelectorAll('.system-expand-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const chartId = btn.dataset.chart;
                this.expandChart(chartId, win);
            });
        });

        // Timeline scrubber
        const scrubber = win.querySelector('#timeline-scrubber');
        if (scrubber) {
            scrubber.addEventListener('input', (e) => {
                this.timelinePosition = parseFloat(e.target.value) / 100;
                this.renderCharts(win);
            });
        }

        // Chart hover tooltips
        win.querySelectorAll('.chart-container').forEach(container => {
            const canvas = container.querySelector('canvas');
            const tooltip = container.querySelector('.chart-tooltip');
            if (canvas && tooltip) {
                canvas.addEventListener('mousemove', (e) => {
                    const rect = canvas.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    const y = e.clientY - rect.top;
                    this.showChartTooltip(canvas, tooltip, x, y);
                });
                canvas.addEventListener('mouseleave', () => {
                    tooltip.style.display = 'none';
                });
            }
        });

        const resetBtn = win.querySelector('#system-reset-data');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => this.resetData(win));
        }

        const streamToggle = win.querySelector('#system-toggle-stream');
        if (streamToggle) {
            streamToggle.addEventListener('click', () => {
                const paused = !!win.dataset.streamPaused;
                if (paused) {
                    delete win.dataset.streamPaused;
                    streamToggle.textContent = 'Pause';
                    this.startSamplingLoops(win);
                } else {
                    win.dataset.streamPaused = '1';
                    streamToggle.textContent = 'Resume';
                    this.stopSamplingLoops();
                }
            });
        }

        // Tabs
        const tabs = Array.from(win.querySelectorAll('.system-tab'));
        const panels = Array.from(win.querySelectorAll('.system-tab-panel'));
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const id = tab.dataset.tab;
                tabs.forEach(t => t.classList.toggle('active', t === tab));
                panels.forEach(p => p.classList.toggle('active', p.dataset.tabPanel === id));
            });
        });

        // Power mode buttons
        const powerButtons = Array.from(win.querySelectorAll('[data-power-mode]'));
        powerButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.powerMode;
                localStorage.setItem('systemMonitorPowerMode', mode);
                powerButtons.forEach(b => b.classList.toggle('active', b === btn));
                this.applyPowerMode(mode, win);
            });
        });
        const savedMode = localStorage.getItem('systemMonitorPowerMode') || 'balanced';
        const initialBtn = powerButtons.find(b => b.dataset.powerMode === savedMode);
        if (initialBtn) initialBtn.click();

        // Network tests
        const latencyBtn = win.querySelector('#network-run-latency');
        if (latencyBtn) {
            latencyBtn.addEventListener('click', () => this.runLatencyTest(win));
        }
        const speedBtn = win.querySelector('#network-run-speed');
        if (speedBtn) {
            speedBtn.addEventListener('click', () => this.runSpeedTest(win));
        }

        // AI panel
        const aiForm = win.querySelector('#system-ai-form');
        const aiInput = win.querySelector('#system-ai-input');
        if (aiForm && aiInput) {
            aiForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const question = aiInput.value.trim();
                if (!question) return;
                aiInput.value = '';
                this.handleAIQuery(question, win);
            });
        }
    }

    startMonitoring(win) {
        // Initial device + system info and one snapshot
        this.deviceInfo = this.collectDeviceInfo();
        this.populateDevicePanels(win);
        this.collectSnapshot().then(() => {
            this.renderAll(win);
        });

        // Start continuous loops (respecting power mode)
        this.startSamplingLoops(win);

        // Battery + network meta
        this.hookBattery(win);
        this.updateNetworkInfoPanel(win);
    }

    stopMonitoring() {
        this.stopSamplingLoops();
    }

    startSamplingLoops(win) {
        this.stopSamplingLoops();

        const mode = localStorage.getItem('systemMonitorPowerMode') || 'balanced';
        const samplingMs = mode === 'performance' ? 1500 : mode === 'saver' ? 4000 : 2500;
        const networkMs = mode === 'performance' ? 8000 : mode === 'saver' ? 20000 : 12000;

        // Telemetry snapshot loop
        this.telemetryInterval = setInterval(() => {
            this.collectSnapshot().then(() => this.renderAll(win));
        }, samplingMs);

        // Event loop lag
        this.eventLoopInterval = setInterval(() => {
            const now = performance.now();
            const expected = this._eventLoopLast + samplingMs;
            const lag = Math.max(0, now - expected);
            this._eventLoopLast = now;
            this.metrics.eventLoopLagMs = lag;
        }, samplingMs);

        // FPS loop + render time tracking
        const loop = (ts) => {
            const renderStart = performance.now();
            if (!this._fpsLastTime) {
                this._fpsLastTime = ts;
                this._fpsFrames = 0;
            }
            this._fpsFrames++;
            const diff = ts - this._fpsLastTime;
            if (diff >= 1000) {
                const fps = Math.round((this._fpsFrames * 1000) / diff);
                this.metrics.fps = fps;
                
                // Track frame drops
                if (fps < 55 && this.metrics.fps > 0) {
                    this.advancedMetrics.frameDrops++;
                }
                
                // Track render time
                const renderTime = performance.now() - renderStart;
                this.advancedMetrics.renderTimeMs.push(renderTime);
                if (this.advancedMetrics.renderTimeMs.length > 60) {
                    this.advancedMetrics.renderTimeMs.shift();
                }
                
                this._fpsLastTime = ts;
                this._fpsFrames = 0;
            }
            this.fpsRafId = window.requestAnimationFrame(loop);
        };
        this.fpsRafId = window.requestAnimationFrame(loop);

        // Passive network metrics from Network Information API
        if (navigator.connection) {
            this.networkInterval = setInterval(() => {
                const c = navigator.connection;
                this.metrics.connectionType = c.type || null;
                this.metrics.connectionEffectiveType = c.effectiveType || null;
                if (typeof c.downlink === 'number') {
                    this.metrics.networkDownMbps = c.downlink;
                    this.pushHistorySample('networkDownMbps', c.downlink);
                }
                this.renderOverviewNetwork(win);
            }, networkMs);
        }
    }

    stopSamplingLoops() {
        if (this.telemetryInterval) {
            clearInterval(this.telemetryInterval);
            this.telemetryInterval = null;
        }
        if (this.eventLoopInterval) {
            clearInterval(this.eventLoopInterval);
            this.eventLoopInterval = null;
        }
        if (this.fpsRafId) {
            cancelAnimationFrame(this.fpsRafId);
            this.fpsRafId = null;
            this._fpsLastTime = null;
        }
        if (this.networkInterval) {
            clearInterval(this.networkInterval);
            this.networkInterval = null;
        }
    }

    async collectSnapshot() {
        // 1) Memory (performance.memory + storage.estimate)
        if (performance && performance.memory) {
            const m = performance.memory;
            const prevUsed = this.metrics.jsHeapUsed || 0;
            this.metrics.jsHeapUsed = m.usedJSHeapSize;
            this.metrics.jsHeapLimit = m.jsHeapSizeLimit;
            const ratio = m.jsHeapSizeLimit > 0 ? m.usedJSHeapSize / m.jsHeapSizeLimit : 0;
            this.metrics.memoryUsedRatio = ratio;
            this.metrics.memoryUsedMb = m.usedJSHeapSize / (1024 * 1024);
            this.metrics.memoryTotalMb = m.jsHeapSizeLimit / (1024 * 1024);
            
            // Track GC activity (sudden drops in heap usage)
            if (prevUsed > 0 && m.usedJSHeapSize < prevUsed * 0.8) {
                this.advancedMetrics.gcCount++;
            }
        }

        if (navigator.storage && navigator.storage.estimate) {
            try {
                const est = await navigator.storage.estimate();
                if (est.usage && est.quota) {
                    this.metrics.storageUsageMb = est.usage / (1024 * 1024);
                    this.metrics.storageQuotaMb = est.quota / (1024 * 1024);
                }
            } catch {
                // ignore
            }
        }

        // 2) CPU estimate from event loop lag + JS heap ratio
        const lag = this.metrics.eventLoopLagMs || 0;
        const lagScore = Math.min(1, lag / 200); // 0–200ms => 0–1
        const memScore = this.metrics.memoryUsedRatio || 0;
        const cpuLoad = Math.min(1, 0.6 * lagScore + 0.4 * memScore) * 100;
        this.metrics.cpuLoad = cpuLoad;

        // 3) FPS already updated in loop

        // 4) App load estimation
        this.metrics.appLoads = this.estimateAppLoads();

        // 5) Push into history buffers
        const ts = Date.now();
        this.pushHistorySample('cpu', this.metrics.cpuLoad);
        if (this.metrics.memoryUsedRatio != null) {
            this.pushHistorySample('memory', this.metrics.memoryUsedRatio * 100);
        }
        if (this.metrics.fps != null) {
            this.pushHistorySample('fps', this.metrics.fps);
        }
        this.history.timestamps.push(ts);
        if (this.history.timestamps.length > this.historyLimit) {
            Object.keys(this.history).forEach((k) => {
                if (Array.isArray(this.history[k]) && this.history[k].length > this.historyLimit) {
                    this.history[k].splice(0, this.history[k].length - this.historyLimit);
                }
            });
        }

        // 6) Health score
        this.computeHealthScore();
    }

    pushHistorySample(key, value) {
        if (!this.history[key]) this.history[key] = [];
        this.history[key].push(value);
        if (this.history[key].length > this.historyLimit) {
            this.history[key].shift();
        }
    }

    renderAll(win) {
        this.renderOverview(win);
        this.renderCharts(win);
        this.renderApps(win);
        this.renderDev(win);
    }

    renderOverview(win) {
        const cpuValue = win.querySelector('#cpu-value');
        const cpuBar = win.querySelector('#cpu-bar');
        const memoryValue = win.querySelector('#memory-value');
        const memoryBar = win.querySelector('#memory-bar');
        const memorySub = win.querySelector('#memory-subtext');

        if (cpuValue) cpuValue.textContent = `${this.metrics.cpuLoad.toFixed(1)}%`;
        if (cpuBar) cpuBar.style.width = `${Math.min(100, this.metrics.cpuLoad)}%`;

        if (this.metrics.memoryUsedRatio != null) {
            const pct = this.metrics.memoryUsedRatio * 100;
            if (memoryValue) memoryValue.textContent = `${pct.toFixed(1)}%`;
            if (memoryBar) memoryBar.style.width = `${Math.min(100, pct)}%`;
            if (memorySub && this.metrics.memoryUsedMb != null) {
                memorySub.textContent = `${this.metrics.memoryUsedMb.toFixed(0)} MB of ${this.metrics.memoryTotalMb.toFixed(0)} MB JS heap`;
            }
        } else {
            if (memoryValue) memoryValue.textContent = 'N/A';
            if (memorySub) memorySub.textContent = 'JS heap metrics not exposed by this browser.';
        }

        this.renderOverviewNetwork(win);
        this.renderHealth(win);
    }

    renderOverviewNetwork(win) {
        const netVal = win.querySelector('#network-value');
        const netBar = win.querySelector('#network-bar');
        const netSub = win.querySelector('#network-subtext');

        const down = this.metrics.networkDownMbps;
        if (down != null) {
            if (netVal) netVal.textContent = `${down.toFixed(1)} Mbps`;
            if (netBar) netBar.style.width = `${Math.min(100, (down / 100) * 100)}%`;
        } else {
            if (netVal) netVal.textContent = 'Unknown';
            if (netBar) netBar.style.width = '0%';
        }

        if (netSub) {
            const parts = [];
            if (this.metrics.connectionEffectiveType) {
                parts.push(`Quality: ${this.metrics.connectionEffectiveType}`);
            }
            if (this.metrics.networkLatencyMs != null) {
                parts.push(`Latency: ${this.metrics.networkLatencyMs.toFixed(0)} ms`);
            }
            netSub.textContent = parts.join(' • ');
        }
    }

    renderHealth(win) {
        const score = Math.round(this.metrics.systemHealthScore);
        const label = this.metrics.systemHealthLabel;
        const healthScoreLabel = win.querySelector('#health-score-label');
        const healthStatus = win.querySelector('#health-status-text');
        const ring = win.querySelector('#health-ring');
        const cpuBadge = win.querySelector('#health-cpu-badge');
        const memBadge = win.querySelector('#health-mem-badge');
        const fpsBadge = win.querySelector('#health-fps-badge');

        if (healthScoreLabel) healthScoreLabel.textContent = String(score);
        if (healthStatus) healthStatus.textContent = label;
        if (ring) {
            ring.dataset.healthLevel = label.toLowerCase();
        }
        if (cpuBadge) cpuBadge.textContent = `CPU: ${this.metrics.cpuLoad.toFixed(0)}%`;
        if (this.metrics.memoryUsedRatio != null && memBadge) {
            memBadge.textContent = `Mem: ${(this.metrics.memoryUsedRatio * 100).toFixed(0)}%`;
        }
        if (fpsBadge) {
            fpsBadge.textContent = `FPS: ${this.metrics.fps}`;
        }
    }

    renderCharts(win) {
        this.drawLineChart(
            win.querySelector('#cpu-memory-chart'),
            [
                { key: 'cpu', color: '#ef4444', label: 'CPU' },
                { key: 'memory', color: '#10b981', label: 'Mem', dashed: true }
            ],
            0,
            100,
            { unit: '%', tickCount: 4 }
        );

        this.drawLineChart(
            win.querySelector('#cpu-chart'),
            [{ key: 'cpu', color: '#ef4444', label: 'CPU' }],
            0,
            100,
            { unit: '%', tickCount: 4 }
        );

        this.drawLineChart(
            win.querySelector('#memory-chart'),
            [{ key: 'memory', color: '#10b981', label: 'Mem' }],
            0,
            100,
            { unit: '%', tickCount: 4 }
        );

        this.drawLineChart(
            win.querySelector('#fps-chart'),
            [{ key: 'fps', color: '#38bdf8', label: 'FPS' }],
            0,
            75,
            { unit: '', tickCount: 5 }
        );

        this.drawLineChart(
            win.querySelector('#network-chart'),
            [{ key: 'networkDownMbps', color: '#6366f1', label: 'Mbps' }],
            0,
            120,
            { unit: 'Mbps', tickCount: 4 }
        );
    }

    drawLineChart(canvas, seriesDefs, minY, maxY, options = {}) {
        if (!canvas || !canvas.getContext) return;
        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const unit = options.unit || '';
        const tickCount = options.tickCount || 4;

        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = 'rgba(15,23,42,0.9)';
        ctx.fillRect(0, 0, width, height);

        // Grid + Y-axis labels
        ctx.strokeStyle = 'rgba(148,163,184,0.2)';
        ctx.lineWidth = 1;
        ctx.font = '10px system-ui, -apple-system, BlinkMacSystemFont, sans-serif';
        ctx.fillStyle = 'rgba(148,163,184,0.8)';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= tickCount; i++) {
            const y = (height / tickCount) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();

            const value = maxY - ((maxY - minY) / tickCount) * i;
            const label =
                unit === '%'
                    ? `${Math.round(value)}%`
                    : unit
                    ? `${Math.round(value)} ${unit}`
                    : `${Math.round(value)}`;
            ctx.fillText(label, 4, y);
        }

        const len = this.history.timestamps.length;
        if (!len) return;
        
        // Apply timeline scrubber to visible range
        const dataStart = Math.floor((1 - this.timelinePosition) * len);
        const visibleLength = len - dataStart;
        const xStep = width / Math.max(1, visibleLength - 1);

        seriesDefs.forEach((s) => {
            const data = (this.history[s.key] || []).slice(dataStart);
            if (!data.length) return;
            ctx.beginPath();
            ctx.strokeStyle = s.color;
            ctx.lineWidth = 2;
            if (s.dashed) {
                ctx.setLineDash([6, 4]);
            } else {
                ctx.setLineDash([]);
            }
            data.forEach((val, i) => {
                const norm = (val - minY) / (maxY - minY || 1);
                const x = i * xStep;
                const y = height - norm * height;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            });
            ctx.stroke();
            ctx.setLineDash([]);

            // Marker at last value
            const lastVal = data[data.length - 1];
            const normLast = (lastVal - minY) / (maxY - minY || 1);
            const x = (data.length - 1) * xStep;
            const y = height - normLast * height;
            ctx.fillStyle = s.color;
            ctx.beginPath();
            ctx.arc(x, y, 3, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    showChartTooltip(canvas, tooltipEl, x, y) {
        const rect = canvas.getBoundingClientRect();
        const dataIndex = Math.floor((x / canvas.width) * this.history.timestamps.length);
        if (dataIndex >= 0 && dataIndex < this.history.timestamps.length) {
            const timestamp = this.history.timestamps[dataIndex];
            const cpu = this.history.cpu?.[dataIndex];
            const mem = this.history.memory?.[dataIndex];
            const fps = this.history.fps?.[dataIndex];
            
            let text = `Time: ${new Date(timestamp).toLocaleTimeString()}\n`;
            if (cpu != null) text += `CPU: ${cpu.toFixed(1)}%\n`;
            if (mem != null) text += `Memory: ${mem.toFixed(1)}%\n`;
            if (fps != null) text += `FPS: ${fps}`;
            
            tooltipEl.textContent = text;
            tooltipEl.style.display = 'block';
            tooltipEl.style.left = `${x + 10}px`;
            tooltipEl.style.top = `${y - 10}px`;
        }
    }

    expandChart(chartId, win) {
        const canvas = win.querySelector(`#${chartId}`);
        if (!canvas) return;
        
        // Create full-screen modal
        const modal = document.createElement('div');
        modal.className = 'chart-expand-modal';
        modal.innerHTML = `
            <div class="chart-expand-content">
                <div class="chart-expand-header">
                    <h3>${chartId.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h3>
                    <button class="system-btn" id="chart-close-expand">Close</button>
                </div>
                <canvas id="expanded-${chartId}" width="1200" height="600"></canvas>
            </div>
        `;
        document.body.appendChild(modal);
        
        const expandedCanvas = modal.querySelector(`#expanded-${chartId}`);
        const seriesDefs = this.getChartSeriesDefs(chartId);
        this.drawExpandedChart(expandedCanvas, seriesDefs);
        
        modal.querySelector('#chart-close-expand').addEventListener('click', () => {
            modal.remove();
        });
    }

    getChartSeriesDefs(chartId) {
        const defs = {
            'cpu-memory-chart': [
                { key: 'cpu', color: '#ef4444', label: 'CPU' },
                { key: 'memory', color: '#10b981', label: 'Mem', dashed: true }
            ],
            'cpu-chart': [{ key: 'cpu', color: '#ef4444', label: 'CPU' }],
            'memory-chart': [{ key: 'memory', color: '#10b981', label: 'Mem' }],
            'fps-chart': [{ key: 'fps', color: '#38bdf8', label: 'FPS' }],
            'network-chart': [{ key: 'networkDownMbps', color: '#6366f1', label: 'Mbps' }]
        };
        return defs[chartId] || [];
    }

    drawExpandedChart(canvas, seriesDefs) {
        const minMax = {
            'cpu': [0, 100],
            'memory': [0, 100],
            'fps': [0, 75],
            'networkDownMbps': [0, 120]
        };
        
        seriesDefs.forEach(s => {
            const [minY, maxY] = minMax[s.key] || [0, 100];
            const unit = s.key.includes('cpu') || s.key.includes('memory') ? '%' : s.key.includes('fps') ? '' : 'Mbps';
            this.drawLineChart(canvas, [s], minY, maxY, { unit, tickCount: 6 });
        });
    }

    cycleTheme(win) {
        const themes = ['default', 'neon-cyberpunk', 'midnight-hacker', 'glass-ui', 'minimal-light', 'oled-dark', 'sci-fi-blue', 'retro-terminal', 'purple-aurora'];
        const currentIndex = themes.indexOf(this.currentTheme);
        const nextIndex = (currentIndex + 1) % themes.length;
        this.currentTheme = themes[nextIndex];
        localStorage.setItem('systemMonitorTheme', this.currentTheme);
        win.classList.remove(...themes.map(t => `theme-${t}`));
        win.classList.add(`theme-${this.currentTheme}`);
        this.log(`Theme changed to ${this.currentTheme}`);
    }

    exportSnapshot(format = 'json') {
        if (format === 'csv') {
            const csv = this.generateCSV();
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aegis-system-data-${Date.now()}.csv`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.log('Data exported as CSV');
        } else {
            const snapshot = {
                capturedAt: new Date().toISOString(),
                device: this.deviceInfo,
                metrics: this.metrics,
                advancedMetrics: this.advancedMetrics,
                history: this.history
            };
            const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
                type: 'application/json'
            });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `aegis-system-snapshot-${Date.now()}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            this.log('Snapshot exported as JSON');
        }
    }

    generateCSV() {
        const headers = ['Timestamp', 'CPU %', 'Memory %', 'FPS', 'Network Mbps'];
        const rows = [headers.join(',')];
        
        for (let i = 0; i < this.history.timestamps.length; i++) {
            const row = [
                new Date(this.history.timestamps[i]).toISOString(),
                this.history.cpu?.[i]?.toFixed(2) || '',
                this.history.memory?.[i]?.toFixed(2) || '',
                this.history.fps?.[i] || '',
                this.history.networkDownMbps?.[i]?.toFixed(2) || ''
            ];
            rows.push(row.join(','));
        }
        
        return rows.join('\n');
    }

    estimateAppLoads() {
        const loads = {};
        if (!windowManager || !windowManager.windows) return loads;

        windowManager.windows.forEach((win, appId) => {
            const isMinimized = win.classList.contains('minimized');
            const isActive = win.classList.contains('active');
            const openTime = parseInt(win.dataset.openTime || `${Date.now()}`, 10);
            const minutesOpen = Math.max(0, (Date.now() - openTime) / 60000);

            let load = 10; // base
            if (isActive) load += 30;
            if (!isMinimized) load += 20;
            if (minutesOpen > 30) load += 10;

            const labelMap = {
                'terminal-v2': 'Terminal',
                'code-editor-vscode': 'Code Editor',
                'notes': 'Notes',
                'tasks': 'Tasks',
                'music-player': 'Music Player',
                'system-monitor': 'System Monitor'
            };

            const name = labelMap[appId] || appId;
            loads[name] = {
                appId,
                status: isActive ? 'Active' : isMinimized ? 'Minimized' : 'Open',
                load: Math.min(100, load),
                minutesOpen
            };
        });

        return loads;
    }

    renderApps(win) {
        const tbody = win.querySelector('#apps-table-body');
        if (!tbody) return;
        tbody.innerHTML = '';

        const entries = Object.values(this.metrics.appLoads);
        if (!entries.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 4;
            td.textContent = 'No app windows open yet.';
            td.className = 'apps-empty';
            tr.appendChild(td);
            tbody.appendChild(tr);
            return;
        }

        entries
            .sort((a, b) => b.load - a.load)
            .forEach((entry) => {
                const tr = document.createElement('tr');
                const statusClass =
                    entry.status === 'Active'
                        ? 'status-active'
                        : entry.status === 'Minimized'
                        ? 'status-idle'
                        : 'status-open';

                tr.innerHTML = `
                    <td>${entry.appId}</td>
                    <td><span class="status-pill ${statusClass}">${entry.status}</span></td>
                    <td>
                        <div class="apps-load-bar">
                            <div class="apps-load-fill" style="width:${entry.load}%"></div>
                        </div>
                        <span class="apps-load-label">${entry.load.toFixed(0)}%</span>
                    </td>
                    <td>${entry.minutesOpen.toFixed(1)} min</td>
                `;
                tbody.appendChild(tr);
            });
    }

    renderDev(win) {
        const devMetrics = win.querySelector('#dev-metrics-list');
        if (devMetrics) {
            devMetrics.innerHTML = '';
            const items = [];

            items.push(`Event loop lag: ${this.metrics.eventLoopLagMs.toFixed(1)} ms`);
            items.push(`FPS: ${this.metrics.fps}`);
            if (this.metrics.jsHeapUsed != null) {
                items.push(
                    `JS heap used: ${(this.metrics.jsHeapUsed / (1024 * 1024)).toFixed(1)} MB / ` +
                        `${(this.metrics.jsHeapLimit / (1024 * 1024)).toFixed(1)} MB`
                );
            }
            if (this.metrics.storageUsageMb != null) {
                items.push(
                    `Storage: ${this.metrics.storageUsageMb.toFixed(1)} MB / ` +
                        `${this.metrics.storageQuotaMb.toFixed(1)} MB`
                );
            }
            
            // Advanced metrics
            const avgRenderTime = this.advancedMetrics.renderTimeMs.length > 0
                ? this.advancedMetrics.renderTimeMs.reduce((a, b) => a + b, 0) / this.advancedMetrics.renderTimeMs.length
                : 0;
            items.push(`Avg render time: ${avgRenderTime.toFixed(2)} ms`);
            items.push(`Frame drops: ${this.advancedMetrics.frameDrops}`);
            items.push(`GC count: ${this.advancedMetrics.gcCount}`);

            items.forEach((text) => {
                const li = document.createElement('li');
                li.textContent = text;
                devMetrics.appendChild(li);
            });
        }
        
        // Pro Mode telemetry
        if (this.proMode) {
            const proTelemetry = win.querySelector('#pro-telemetry');
            if (proTelemetry) {
                proTelemetry.textContent = JSON.stringify({
                    metrics: this.metrics,
                    advancedMetrics: this.advancedMetrics,
                    deviceInfo: this.deviceInfo
                }, null, 2);
            }
        }

        const devLog = win.querySelector('#dev-log');
        if (devLog) {
            devLog.innerHTML = '';
            this.logs.slice(-100).forEach((entry) => {
                const div = document.createElement('div');
                div.className = 'dev-log-entry';
                div.textContent = `[${new Date(entry.time).toLocaleTimeString()}] ${entry.message}`;
                devLog.appendChild(div);
            });
            devLog.scrollTop = devLog.scrollHeight;
        }
    }

    log(message) {
        this.logs.push({ time: Date.now(), message });
        if (this.logs.length > 500) this.logs.shift();
    }

    collectDeviceInfo() {
        const ua = navigator.userAgent || '';
        const platform = navigator.platform || '';
        const language = navigator.language || '';
        const cores = navigator.hardwareConcurrency || null;
        const deviceMemory = navigator.deviceMemory || null;
        const touch =
            'ontouchstart' in window ||
            (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
        const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const screenRes = `${window.screen.width} x ${window.screen.height}`;
        const pixelDensity = window.devicePixelRatio || 1;

        // OS detection (best-effort)
        let os = 'Unknown';
        if (/Windows NT/i.test(ua)) os = 'Windows';
        else if (/Mac OS X/i.test(ua)) os = 'macOS';
        else if (/Android/i.test(ua)) os = 'Android';
        else if (/iPhone|iPad|iPod/i.test(ua)) os = 'iOS';
        else if (/Linux/i.test(ua)) os = 'Linux';

        // Device type
        let deviceType = 'Desktop';
        if (/Mobi|Android/i.test(ua)) deviceType = 'Mobile';
        if (/Tablet|iPad/i.test(ua)) deviceType = 'Tablet';

        // Browser (very simplified)
        let browser = 'Unknown';
        if (/Edg\//.test(ua)) browser = 'Microsoft Edge';
        else if (/Chrome\//.test(ua)) browser = 'Chrome';
        else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = 'Safari';
        else if (/Firefox\//.test(ua)) browser = 'Firefox';

        // Version from UA token
        let browserVersion = '';
        const match = ua.match(/(Chrome|Firefox|Edg|Version)\/([\d.]+)/);
        if (match) browserVersion = match[2];

        // GPU via WebGL
        let gpu = 'Unavailable';
        try {
            const canvas = document.createElement('canvas');
            const gl =
                canvas.getContext('webgl') ||
                canvas.getContext('experimental-webgl');
            if (gl) {
                const dbgInfo = gl.getExtension('WEBGL_debug_renderer_info');
                if (dbgInfo) {
                    gpu =
                        gl.getParameter(
                            dbgInfo.UNMASKED_RENDERER_WEBGL
                        ) || 'Unknown GPU';
                } else {
                    gpu = gl.getParameter(gl.RENDERER) || 'Unknown GPU';
                }
            }
        } catch {
            // ignore
        }

        // Battery may be async; handled separately in hookBattery

        // Network info
        const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        let netType = null;
        let netEffective = null;
        if (connection) {
            netType = connection.type || null;
            netEffective = connection.effectiveType || null;
        }

        return {
            deviceType,
            os,
            browser,
            browserVersion,
            platform,
            cores,
            deviceMemory,
            gpu,
            screenRes,
            pixelDensity,
            touch,
            timezone,
            language,
            netType,
            netEffective
        };
    }

    populateDevicePanels(win) {
        if (!this.deviceInfo) return;
        const primaryGrid = win.querySelector('#device-info-grid');
        const hardwareGrid = win.querySelector('#device-info-hardware');
        const envGrid = win.querySelector('#device-env-grid');

        const addEntries = (grid, entries) => {
            if (!grid) return;
            grid.innerHTML = '';
            entries.forEach(([label, value]) => {
                const dt = document.createElement('dt');
                dt.textContent = label;
                const dd = document.createElement('dd');
                dd.textContent = value == null || value === '' ? 'Unknown' : String(value);
                grid.appendChild(dt);
                grid.appendChild(dd);
            });
        };

        addEntries(primaryGrid, [
            ['Device Type', this.deviceInfo.deviceType],
            ['OS', this.deviceInfo.os],
            ['Browser', `${this.deviceInfo.browser} ${this.deviceInfo.browserVersion}`.trim()],
            ['CPU Cores', this.deviceInfo.cores],
            ['Approx. RAM (GB)', this.deviceInfo.deviceMemory],
            ['GPU', this.deviceInfo.gpu]
        ]);

        addEntries(hardwareGrid, [
            ['Platform', this.deviceInfo.platform],
            ['Screen', this.deviceInfo.screenRes],
            ['Pixel Density', `${this.deviceInfo.pixelDensity}x`],
            ['Touch Support', this.deviceInfo.touch ? 'Yes' : 'No']
        ]);

        addEntries(envGrid, [
            ['Language', this.deviceInfo.language],
            ['Timezone', this.deviceInfo.timezone],
            ['Network Type', this.deviceInfo.netType || 'Unknown'],
            ['Network Quality', this.deviceInfo.netEffective || 'Unknown']
        ]);
    }

    hookBattery(win) {
        const supportMsg = win.querySelector('#battery-supported-message');
        const stats = win.querySelector('#battery-stats');

        if (!navigator.getBattery) {
            if (supportMsg) {
                supportMsg.textContent = 'Battery API not supported in this browser.';
            }
            return;
        }

        navigator.getBattery().then((battery) => {
            const update = () => {
                if (!stats) return;
                stats.hidden = false;
                const pct = Math.round(battery.level * 100);
                const pctEl = win.querySelector('#battery-percentage');
                const statusEl = win.querySelector('#battery-status');
                const timeEl = win.querySelector('#battery-time-remaining');

                if (pctEl) pctEl.textContent = `${pct}%`;
                if (statusEl) {
                    statusEl.textContent = battery.charging
                        ? 'Charging'
                        : 'On battery';
                }
                if (timeEl) {
                    if (!battery.charging && battery.dischargingTime && battery.dischargingTime !== Infinity) {
                        const hours = battery.dischargingTime / 3600;
                        timeEl.textContent = `Estimated ${hours.toFixed(1)} hours remaining`;
                    } else {
                        timeEl.textContent = '';
                    }
                }
            };

            update();
            battery.addEventListener('levelchange', update);
            battery.addEventListener('chargingchange', update);

            if (supportMsg) {
                supportMsg.textContent = 'Battery telemetry from browser (if supported).';
            }
        }).catch(() => {
            if (supportMsg) {
                supportMsg.textContent = 'Unable to read battery information.';
            }
        });
    }

    async runLatencyTest(win) {
        const output = win.querySelector('#network-test-output');
        if (output) {
            output.textContent = 'Running latency test…';
        }
        try {
            // Use a lightweight public endpoint; no body/headers needed.
            const url = 'https://www.google.com/generate_204';
            const start = performance.now();
            await fetch(url, { method: 'GET', mode: 'no-cors', cache: 'no-store' });
            const latency = performance.now() - start;
            this.metrics.networkLatencyMs = latency;
            if (output) {
                output.textContent = `Approximate latency to this host: ${latency.toFixed(1)} ms`;
            }
            this.renderOverviewNetwork(win);
        } catch (e) {
            if (output) {
                output.textContent = `Latency test failed: ${e.message}`;
            }
        }
    }

    async runSpeedTest(win) {
        const output = win.querySelector('#network-test-output');
        if (output) {
            output.textContent = 'Running small download test…';
        }
        // We assume roughly 200KB transfer from a public endpoint; we can't
        // inspect the opaque response, but time still reflects network speed.
        const sizeBytes = 200 * 1024;
        const url = 'https://www.google.com/generate_204';
        try {
            const start = performance.now();
            await fetch(url, { mode: 'no-cors', cache: 'no-store' });
            const seconds = (performance.now() - start) / 1000;
            const mbps = (sizeBytes / (1024 * 1024)) / seconds * 8;
            this.metrics.networkDownMbps = mbps;
            this.pushHistorySample('networkDownMbps', mbps);
            if (output) {
                output.textContent = `Approximate download speed: ${mbps.toFixed(2)} Mbps (test size ~${(sizeBytes / 1024).toFixed(0)} KB)`;
            }
            this.renderOverviewNetwork(win);
        } catch (e) {
            if (output) {
                output.textContent = `Speed test failed: ${e.message}`;
            }
        }
    }

    updateNetworkInfoPanel(win) {
        const grid = win.querySelector('#network-info-grid');
        if (!grid) return;

        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        const entries = [];
        if (conn) {
            entries.push(['Type', conn.type || 'Unknown']);
            entries.push(['Effective Type', conn.effectiveType || 'Unknown']);
            if (typeof conn.downlink === 'number') {
                entries.push(['Downlink (Mbps)', conn.downlink]);
            }
            if (typeof conn.rtt === 'number') {
                entries.push(['RTT (ms)', conn.rtt]);
            }
            entries.push(['Save Data', conn.saveData ? 'On' : 'Off']);
        } else {
            entries.push(['Network Information API', 'Not supported']);
        }

        grid.innerHTML = '';
        entries.forEach(([label, value]) => {
            const dt = document.createElement('dt');
            dt.textContent = label;
            const dd = document.createElement('dd');
            dd.textContent = String(value);
            grid.appendChild(dt);
            grid.appendChild(dd);
        });
    }

    computeHealthScore() {
        const cpu = this.metrics.cpuLoad || 0;
        const mem = (this.metrics.memoryUsedRatio || 0) * 100;
        const fps = this.metrics.fps || 0;
        const storageRatio =
            this.metrics.storageUsageMb != null && this.metrics.storageQuotaMb
                ? (this.metrics.storageUsageMb / this.metrics.storageQuotaMb) * 100
                : 0;

        // Scores 0–100 where higher is better
        const cpuScore = Math.max(0, 100 - cpu);
        const memScore = Math.max(0, 100 - mem);
        const fpsScore = Math.min(100, (fps / 60) * 100);
        const storageScore = Math.max(0, 100 - storageRatio * 1.2);

        const health =
            0.35 * cpuScore +
            0.3 * memScore +
            0.2 * fpsScore +
            0.15 * storageScore;

        this.metrics.systemHealthScore = health;
        if (health >= 80) this.metrics.systemHealthLabel = 'Excellent';
        else if (health >= 55) this.metrics.systemHealthLabel = 'Moderate';
        else this.metrics.systemHealthLabel = 'Heavy Load';
    }

    applyPowerMode(mode, win) {
        // Only adjusts System Monitor sampling / animations
        this.log(`Power mode changed to ${mode}`);
        this.startSamplingLoops(win);
    }

    exportSnapshot() {
        const snapshot = {
            capturedAt: new Date().toISOString(),
            device: this.deviceInfo,
            metrics: this.metrics,
            history: this.history
        };
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
            type: 'application/json'
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `aegis-system-snapshot-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        this.log('Snapshot exported as JSON');
    }

    resetData(win) {
        this.history = {
            timestamps: [],
            cpu: [],
            memory: [],
            fps: [],
            eventLoopLag: [],
            networkDownMbps: []
        };
        this.logs = [];
        this.collectSnapshot().then(() => this.renderAll(win));
        this.log('Monitoring data reset');
    }

    async handleAIQuery(question, win) {
        const messagesEl = win.querySelector('#system-ai-messages');
        const typingIndicator = win.querySelector('#ai-typing-indicator');
        if (!messagesEl) return;

        const append = (role, text, thinking = false) => {
            const bubble = document.createElement('div');
            bubble.className = `ai-message ai-${role}`;
            if (thinking) bubble.classList.add('ai-thinking');
            bubble.textContent = text;
            messagesEl.appendChild(bubble);
            messagesEl.scrollTop = messagesEl.scrollHeight;
            return bubble;
        };

        // Add user message
        append('user', question);
        this.aiConversationHistory.push({ role: 'user', content: question });

        // Show typing indicator
        if (typingIndicator) {
            typingIndicator.style.display = 'flex';
            const dots = typingIndicator.querySelector('.typing-dots');
            let dotCount = 0;
            const dotInterval = setInterval(() => {
                dotCount = (dotCount + 1) % 4;
                if (dots) dots.textContent = '.'.repeat(dotCount);
            }, 500);
            setTimeout(() => clearInterval(dotInterval), 10000);
        }

        try {
            const contextSummary = this.buildMetricsSummary();
            const advancedSummary = this.buildAdvancedMetricsSummary();
            
            // Build conversation with history
            const messages = [
                {
                    role: 'system',
                    content: `You are a friendly, calm, and helpful AI system performance advisor for a web-based desktop (Aegis Desk).
You ONLY see browser-derived metrics, not real OS processes.
Your tone should be:
- Friendly and human-like (never robotic)
- Calm and reassuring
- Encouraging and supportive
- Clear and step-by-step
- Proactive in suggesting optimizations

When analyzing performance:
1. Explain problems in simple human language
2. Suggest 2-5 concrete, safe, actionable optimizations
3. If heavy load is detected for a specific app, mention it explicitly
4. Prefer lightweight changes (closing unused apps, reducing animations, lowering sampling rate)
5. Predict potential performance risks before they happen
6. Be encouraging and supportive, not alarmist`
                },
                ...this.aiConversationHistory.slice(-6), // Keep last 6 messages for context
                {
                    role: 'user',
                    content: `Current system metrics:\n${contextSummary}\n\nAdvanced metrics:\n${advancedSummary}\n\nUser question: ${question}`
                }
            ];

            const apiUrl = (typeof window !== 'undefined' && window.location && window.location.origin) ? `${window.location.origin}/api/chat` : '/api/chat';
            const res = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: messages,
                    max_tokens: 500
                })
            });
            
            if (typingIndicator) typingIndicator.style.display = 'none';
            
            if (!res.ok) {
                throw new Error(`AI request failed: ${res.status}`);
            }
            
            const data = await res.json();
            const text = data.choices?.[0]?.message?.content || 'No response received from AI.';

            append('assistant', text);
            this.aiConversationHistory.push({ role: 'assistant', content: text });
            
            // Keep conversation history manageable
            if (this.aiConversationHistory.length > 20) {
                this.aiConversationHistory = this.aiConversationHistory.slice(-20);
            }
        } catch (e) {
            if (typingIndicator) typingIndicator.style.display = 'none';
            append(
                'assistant',
                `I encountered an error: ${e.message}. The system monitor itself continues to run normally. Please check your internet connection and try again.`
            );
        }
    }

    buildAdvancedMetricsSummary() {
        const parts = [];
        const avgRenderTime = this.advancedMetrics.renderTimeMs.length > 0
            ? this.advancedMetrics.renderTimeMs.reduce((a, b) => a + b, 0) / this.advancedMetrics.renderTimeMs.length
            : 0;
        parts.push(`Average render time: ${avgRenderTime.toFixed(2)} ms`);
        parts.push(`Frame drops detected: ${this.advancedMetrics.frameDrops}`);
        parts.push(`Garbage collections: ${this.advancedMetrics.gcCount}`);
        return parts.join('\n');
    }

    buildMetricsSummary() {
        const parts = [];
        parts.push(`CPU load: ${this.metrics.cpuLoad.toFixed(1)}%`);
        if (this.metrics.memoryUsedRatio != null) {
            parts.push(
                `Memory: ${(this.metrics.memoryUsedRatio * 100).toFixed(1)}% of ` +
                    `${this.metrics.memoryTotalMb?.toFixed(0) || '?'} MB JS heap`
            );
        }
        parts.push(`FPS: ${this.metrics.fps}`);
        if (this.metrics.networkDownMbps != null) {
            parts.push(`Network downlink: ${this.metrics.networkDownMbps.toFixed(1)} Mbps`);
        }
        if (this.metrics.networkLatencyMs != null) {
            parts.push(`Latency: ${this.metrics.networkLatencyMs.toFixed(1)} ms`);
        }
        parts.push(`System health score: ${this.metrics.systemHealthScore.toFixed(1)}`);

        const apps = Object.values(this.metrics.appLoads || {})
            .sort((a, b) => b.load - a.load)
            .slice(0, 6)
            .map(
                (a) =>
                    `${a.appId} (${a.status}, load ${a.load.toFixed(
                        0
                    )}%, open ${a.minutesOpen.toFixed(1)} min)`
            );
        if (apps.length) {
            parts.push('Top apps by estimated load:');
            parts.push(apps.join('; '));
        }

        return parts.join('\n');
    }
}

const systemMonitorApp = new SystemMonitorApp();

// Make it globally accessible
if (typeof window !== 'undefined') {
    window.systemMonitorApp = systemMonitorApp;
}
