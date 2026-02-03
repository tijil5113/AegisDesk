// System Monitor App - Performance and system metrics
class SystemMonitorApp {
    constructor() {
        this.windowId = 'system-monitor';
        this.updateInterval = null;
        this.chartData = {
            cpu: [],
            memory: [],
            network: []
        };
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'System Monitor',
            width: 900,
            height: 700,
            class: 'app-system-monitor',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                <line x1="8" y1="21" x2="16" y2="21"></line>
                <line x1="12" y1="17" x2="12" y2="21"></line>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
        this.startMonitoring(window);
    }

    render() {
        return `
            <div class="system-monitor-container">
                <div class="system-monitor-header">
                    <h2>System Performance</h2>
                    <button class="system-btn" id="refresh-btn">Refresh</button>
                </div>
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
                                <line x1="20" y1="9" x2="23" y2="9"></line>
                                <line x1="20" y1="14" x2="23" y2="14"></line>
                                <line x1="1" y1="9" x2="4" y2="9"></line>
                                <line x1="1" y1="14" x2="4" y2="14"></line>
                            </svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-label">CPU Usage</div>
                            <div class="stat-value" id="cpu-value">0%</div>
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
                            <div class="stat-value" id="memory-value">0%</div>
                            <div class="stat-bar">
                                <div class="stat-bar-fill" id="memory-bar" style="width: 0%"></div>
                            </div>
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
                                <line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line>
                                <line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line>
                            </svg>
                        </div>
                        <div class="stat-info">
                            <div class="stat-label">Network</div>
                            <div class="stat-value" id="network-value">Active</div>
                            <div class="stat-bar">
                                <div class="stat-bar-fill" id="network-bar" style="width: 50%"></div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="system-charts">
                    <div class="system-chart">
                        <h3>CPU Usage Over Time</h3>
                        <canvas id="cpu-chart" width="800" height="200"></canvas>
                    </div>
                    <div class="system-chart">
                        <h3>Memory Usage Over Time</h3>
                        <canvas id="memory-chart" width="800" height="200"></canvas>
                    </div>
                </div>
                <div class="system-info">
                    <div class="info-item">
                        <span class="info-label">Browser:</span>
                        <span class="info-value" id="browser-info">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Platform:</span>
                        <span class="info-value" id="platform-info">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Screen:</span>
                        <span class="info-value" id="screen-info">-</span>
                    </div>
                    <div class="info-item">
                        <span class="info-label">Timezone:</span>
                        <span class="info-value" id="timezone-info">-</span>
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const refreshBtn = window.querySelector('#refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                this.updateStats(window);
            });
        }
    }

    startMonitoring(window) {
        this.updateStats(window);
        // Reduce update frequency from 1s to 3s for better performance
        this.updateInterval = setInterval(() => {
            this.updateStats(window);
        }, 3000);

        // Update system info
        this.updateSystemInfo(window);
    }

    updateStats(window) {
        // Simulate CPU usage (in real app, would use Performance API)
        const cpuUsage = 20 + Math.random() * 60;
        const memoryUsage = 30 + Math.random() * 40;

        const cpuValue = window.querySelector('#cpu-value');
        const cpuBar = window.querySelector('#cpu-bar');
        const memoryValue = window.querySelector('#memory-value');
        const memoryBar = window.querySelector('#memory-bar');

        if (cpuValue) cpuValue.textContent = `${cpuUsage.toFixed(1)}%`;
        if (cpuBar) cpuBar.style.width = `${cpuUsage}%`;
        if (memoryValue) memoryValue.textContent = `${memoryUsage.toFixed(1)}%`;
        if (memoryBar) memoryBar.style.width = `${memoryUsage}%`;

        // Update charts
        this.updateChart(window, 'cpu-chart', cpuUsage, '#ef4444');
        this.updateChart(window, 'memory-chart', memoryUsage, '#10b981');

        // Store data
        this.chartData.cpu.push(cpuUsage);
        this.chartData.memory.push(memoryUsage);
        if (this.chartData.cpu.length > 50) {
            this.chartData.cpu.shift();
            this.chartData.memory.shift();
        }
    }

    updateChart(window, canvasId, value, color) {
        const canvas = window.querySelector(`#${canvasId}`);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Draw background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.3)';
        ctx.fillRect(0, 0, width, height);

        // Draw grid
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.2)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 10; i++) {
            const y = (height / 10) * i;
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
            ctx.stroke();
        }

        // Draw line
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        
        const data = canvasId === 'cpu-chart' ? this.chartData.cpu : this.chartData.memory;
        data.forEach((val, index) => {
            const x = (width / 50) * index;
            const y = height - (val / 100) * height;
            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Draw current value
        if (data.length > 0) {
            const lastVal = data[data.length - 1];
            const x = (width / 50) * (data.length - 1);
            const y = height - (lastVal / 100) * height;
            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    updateSystemInfo(window) {
        const browserInfo = window.querySelector('#browser-info');
        const platformInfo = window.querySelector('#platform-info');
        const screenInfo = window.querySelector('#screen-info');
        const timezoneInfo = window.querySelector('#timezone-info');

        if (browserInfo) {
            browserInfo.textContent = navigator.userAgent.split(' ').slice(-2).join(' ');
        }
        if (platformInfo) {
            platformInfo.textContent = navigator.platform;
        }
        if (screenInfo) {
            screenInfo.textContent = `${screen.width}x${screen.height}`;
        }
        if (timezoneInfo) {
            timezoneInfo.textContent = Intl.DateTimeFormat().resolvedOptions().timeZone;
        }
    }
}

const systemMonitorApp = new SystemMonitorApp();
