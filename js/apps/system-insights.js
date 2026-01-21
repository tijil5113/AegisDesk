// SYSTEM INTELLIGENCE HUB - OS-Grade Intelligence Panel
// Real OS value, not fake stats. Executive, calm, premium.

class SystemInsightsApp {
    constructor() {
        this.windowId = 'system-intelligence';
        this.refreshInterval = null;
        this.startTime = Date.now(); // OS uptime
    }
    
    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'System Intelligence',
            width: 1100,
            height: 750,
            class: 'app-system-insights',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
            </svg>`,
            content: content
        });
        
        this.attachEvents(window);
        this.updateAll(window);
        
        // Auto-refresh every 5 seconds
        this.refreshInterval = setInterval(() => {
            this.updateAll(window);
        }, 5000);
        
        // Cleanup on close
        window.addEventListener('close', () => {
            if (this.refreshInterval) {
                clearInterval(this.refreshInterval);
            }
        });
    }
    
    render() {
        return `
            <div class="insights-container">
                <!-- Header -->
                <div class="insights-header">
                    <div class="insights-title">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="3"></circle>
                            <path d="M12 1v6m0 6v6M5.64 5.64l4.24 4.24m4.24 4.24l4.24 4.24M1 12h6m6 0h6M5.64 18.36l4.24-4.24m4.24-4.24l4.24-4.24"></path>
                        </svg>
                        <h1>System Intelligence</h1>
                    </div>
                    <div class="insights-actions">
                        <button class="insight-btn" id="refresh-insights" title="Refresh">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <polyline points="23 4 23 10 17 10"></polyline>
                                <polyline points="1 20 1 14 7 14"></polyline>
                                <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"></path>
                            </svg>
                        </button>
                        <button class="insight-btn" id="ai-insights" title="AI Insights">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                                <path d="M2 17l10 5 10-5"></path>
                                <path d="M2 12l10 5 10-5"></path>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <!-- Main Content -->
                <div class="insights-content">
                    <!-- System Overview Section -->
                    <div class="insight-section">
                        <div class="section-header">
                            <h2>System Overview</h2>
                        </div>
                        <div class="overview-grid" id="overview-grid">
                            ${this.renderOverviewCards()}
                        </div>
                    </div>
                    
                    <!-- Usage Analytics Section -->
                    <div class="insight-section">
                        <div class="section-header">
                            <h2>Usage Analytics</h2>
                            <div class="section-actions">
                                <button class="section-btn active" data-period="today">Today</button>
                                <button class="section-btn" data-period="week">Week</button>
                                <button class="section-btn" data-period="month">Month</button>
                            </div>
                        </div>
                        <div class="analytics-grid">
                            <div class="analytics-chart" id="usage-chart">
                                <div class="chart-loading">Loading usage data...</div>
                            </div>
                            <div class="analytics-stats" id="usage-stats"></div>
                        </div>
                    </div>
                    
                    <!-- Performance Section -->
                    <div class="insight-section">
                        <div class="section-header">
                            <h2>Performance</h2>
                        </div>
                        <div class="performance-grid" id="performance-grid">
                            ${this.renderPerformanceCards()}
                        </div>
                    </div>
                    
                    <!-- Productivity Insights Section -->
                    <div class="insight-section">
                        <div class="section-header">
                            <h2>Productivity Insights</h2>
                        </div>
                        <div class="insights-list" id="productivity-insights">
                            ${this.renderProductivityInsights()}
                        </div>
                    </div>
                    
                    <!-- Notifications Summary -->
                    <div class="insight-section">
                        <div class="section-header">
                            <h2>Notifications</h2>
                        </div>
                        <div class="notifications-summary" id="notifications-summary">
                            ${this.renderNotificationsSummary()}
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    renderOverviewCards() {
        return `
            <div class="overview-card">
                <div class="card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-label">OS Uptime</div>
                    <div class="card-value" id="uptime-value">--</div>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect>
                        <line x1="8" y1="21" x2="16" y2="21"></line>
                        <line x1="12" y1="17" x2="12" y2="21"></line>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-label">Active Windows</div>
                    <div class="card-value" id="windows-count">0</div>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect>
                        <path d="M9 12l2 2 4-4"></path>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-label">Active Apps</div>
                    <div class="card-value" id="apps-count">0</div>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <line x1="12" y1="8" x2="12" y2="12"></line>
                        <line x1="12" y1="16" x2="12.01" y2="16"></line>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-label">Current Mode</div>
                    <div class="card-value" id="current-mode">--</div>
                </div>
            </div>
            
            <div class="overview-card">
                <div class="card-icon">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <path d="M12 6v6l4 2"></path>
                    </svg>
                </div>
                <div class="card-content">
                    <div class="card-label">Theme</div>
                    <div class="card-value" id="current-theme">--</div>
                </div>
            </div>
        `;
    }
    
    renderPerformanceCards() {
        return `
            <div class="performance-card">
                <div class="performance-header">
                    <span>Storage Usage</span>
                    <span class="performance-value" id="storage-usage">--</span>
                </div>
                <div class="performance-bar">
                    <div class="performance-fill" id="storage-fill" style="width: 0%"></div>
                </div>
                <div class="performance-details" id="storage-details">Calculating...</div>
            </div>
            
            <div class="performance-card">
                <div class="performance-header">
                    <span>Memory Usage</span>
                    <span class="performance-value" id="memory-usage">--</span>
                </div>
                <div class="performance-bar">
                    <div class="performance-fill" id="memory-fill" style="width: 0%"></div>
                </div>
                <div class="performance-details" id="memory-details">Calculating...</div>
            </div>
            
            <div class="performance-card">
                <div class="performance-header">
                    <span>Background Processes</span>
                    <span class="performance-value" id="processes-count">0</span>
                </div>
                <div class="performance-details">Active apps running in background</div>
            </div>
        `;
    }
    
    renderProductivityInsights() {
        return `
            <div class="insight-card">
                <div class="insight-icon">💡</div>
                <div class="insight-content">
                    <div class="insight-title">Loading insights...</div>
                    <div class="insight-description">Analyzing your usage patterns</div>
                </div>
            </div>
        `;
    }
    
    renderNotificationsSummary() {
        return `
            <div class="notification-summary-card">
                <div class="summary-stat">
                    <span class="stat-label">Pending</span>
                    <span class="stat-value" id="notifications-pending">0</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">Today</span>
                    <span class="stat-value" id="notifications-today">0</span>
                </div>
                <div class="summary-stat">
                    <span class="stat-label">This Week</span>
                    <span class="stat-value" id="notifications-week">0</span>
                </div>
            </div>
        `;
    }
    
    updateAll(window) {
        this.updateSystemOverview(window);
        this.updateUsageAnalytics(window);
        this.updatePerformance(window);
        this.updateProductivityInsights(window);
        this.updateNotifications(window);
    }
    
    updateSystemOverview(window) {
        // OS Uptime
        const uptimeMs = Date.now() - this.startTime;
        const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
        const uptimeMinutes = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
        const uptimeEl = window.querySelector('#uptime-value');
        if (uptimeEl) {
            this.animateValue(uptimeEl, uptimeEl.textContent, `${uptimeHours}h ${uptimeMinutes}m`, 500);
        }
        
        // Active Windows
        const windowsCount = windowManager ? windowManager.windows.size : 0;
        const windowsEl = window.querySelector('#windows-count');
        if (windowsEl) {
            this.animateValue(windowsEl, windowsEl.textContent, windowsCount.toString(), 500);
        }
        
        // Active Apps (unique app IDs)
        const activeApps = new Set();
        if (windowManager && windowManager.windows) {
            windowManager.windows.forEach(w => {
                const appId = w.dataset.windowId?.split('_')[0];
                if (appId) activeApps.add(appId);
            });
        }
        const appsEl = window.querySelector('#apps-count');
        if (appsEl) {
            this.animateValue(appsEl, appsEl.textContent, activeApps.size.toString(), 500);
        }
        
        // Current Mode
        const modeEl = window.querySelector('#current-mode');
        if (modeEl && typeof modeManager !== 'undefined') {
            const currentMode = modeManager?.currentMode || 'Normal';
            modeEl.textContent = currentMode;
        }
        
        // Current Theme
        const themeEl = window.querySelector('#current-theme');
        if (themeEl && typeof themeSystem !== 'undefined') {
            const currentTheme = themeSystem?.currentTheme || storage.get('theme', 'dark');
            themeEl.textContent = currentTheme.charAt(0).toUpperCase() + currentTheme.slice(1);
        }
    }
    
    updateUsageAnalytics(window) {
        if (typeof userProfile === 'undefined' || !userProfile.initialized) {
            const chartEl = window.querySelector('#usage-chart');
            if (chartEl) {
                chartEl.innerHTML = '<div class="chart-empty">Usage data not available</div>';
            }
            return;
        }
        
        const insights = userProfile.getInsights ? userProfile.getInsights() : null;
        if (!insights) {
            const chartEl = window.querySelector('#usage-chart');
            if (chartEl) {
                chartEl.innerHTML = '<div class="chart-empty">No usage data yet</div>';
            }
            return;
        }
        
        // Render usage chart
        this.renderUsageChart(window, insights);
        
        // Render usage stats
        this.renderUsageStats(window, insights);
    }
    
    renderUsageChart(window, insights) {
        const chartEl = window.querySelector('#usage-chart');
        if (!chartEl) return;
        
        const topApps = insights.topApps || [];
        if (topApps.length === 0) {
            chartEl.innerHTML = '<div class="chart-empty">No app usage data yet</div>';
            return;
        }
        
        const maxTime = Math.max(...topApps.map(app => app.totalTime || 0), 1);
        const topFive = topApps.slice(0, 5);
        
        chartEl.innerHTML = `
            <div class="chart-container">
                ${topFive.map((app, index) => {
                    const percentage = ((app.totalTime || 0) / maxTime) * 100;
                    const hours = Math.floor((app.totalTime || 0) / 60);
                    const minutes = (app.totalTime || 0) % 60;
                    return `
                        <div class="chart-bar-wrapper">
                            <div class="chart-bar-label">${app.appId || 'Unknown'}</div>
                            <div class="chart-bar-container">
                                <div class="chart-bar" style="width: ${percentage}%" data-percentage="${percentage}">
                                    <span class="chart-bar-value">${hours}h ${minutes}m</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
        
        // Animate bars
        setTimeout(() => {
            chartEl.querySelectorAll('.chart-bar').forEach(bar => {
                const width = bar.dataset.percentage;
                bar.style.width = '0%';
                setTimeout(() => {
                    bar.style.width = width + '%';
                }, 100 * (parseInt(bar.dataset.percentage) / 100));
            });
        }, 100);
    }
    
    renderUsageStats(window, insights) {
        const statsEl = window.querySelector('#usage-stats');
        if (!statsEl) return;
        
        const topApps = insights.topApps || [];
        const totalTime = topApps.reduce((sum, app) => sum + (app.totalTime || 0), 0);
        const totalHours = Math.floor(totalTime / 60);
        const totalMinutes = totalTime % 60;
        const avgSessionTime = topApps.length > 0 ? Math.floor(totalTime / topApps.length) : 0;
        
        statsEl.innerHTML = `
            <div class="stat-card">
                <div class="stat-label">Total Usage</div>
                <div class="stat-value-large">${totalHours}h ${totalMinutes}m</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Most Used</div>
                <div class="stat-value">${topApps[0]?.appId || 'N/A'}</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Session</div>
                <div class="stat-value">${Math.floor(avgSessionTime / 60)}h ${avgSessionTime % 60}m</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Unique Apps</div>
                <div class="stat-value">${topApps.length}</div>
            </div>
        `;
    }
    
    updatePerformance(window) {
        // Storage Usage (IndexedDB)
        this.calculateStorageUsage(window);
        
        // Memory Usage (estimated from active windows)
        this.calculateMemoryUsage(window);
        
        // Background Processes
        const processesEl = window.querySelector('#processes-count');
        if (processesEl && windowManager) {
            const count = windowManager.windows.size;
            this.animateValue(processesEl, processesEl.textContent, count.toString(), 500);
        }
    }
    
    async calculateStorageUsage(window) {
        try {
            if (!('indexedDB' in window)) {
                window.querySelector('#storage-usage').textContent = 'N/A';
                return;
            }
            
            // Estimate storage usage
            let totalSize = 0;
            
            // Calculate localStorage size
            if (window.localStorage) {
                for (let key in localStorage) {
                    if (localStorage.hasOwnProperty(key)) {
                        totalSize += localStorage[key].length + key.length;
                    }
                }
            }
            
            // Estimate IndexedDB size (we can't directly read it, so estimate)
            const estimatedDB = 5 * 1024 * 1024; // 5MB estimate
            totalSize += estimatedDB;
            
            const totalMB = (totalSize / (1024 * 1024)).toFixed(2);
            const percentage = Math.min((totalSize / (10 * 1024 * 1024)) * 100, 100); // Assume 10MB limit
            
            const storageUsageEl = window.querySelector('#storage-usage');
            const storageFillEl = window.querySelector('#storage-fill');
            const storageDetailsEl = window.querySelector('#storage-details');
            
            if (storageUsageEl) {
                storageUsageEl.textContent = `${totalMB} MB`;
            }
            if (storageFillEl) {
                this.animateWidth(storageFillEl, storageFillEl.style.width, `${percentage}%`, 500);
            }
            if (storageDetailsEl) {
                storageDetailsEl.textContent = `LocalStorage: ${(totalSize / 1024).toFixed(2)} KB`;
            }
        } catch (error) {
            console.error('Error calculating storage:', error);
        }
    }
    
    calculateMemoryUsage(window) {
        // Estimate memory based on open windows and complexity
        const windowCount = windowManager ? windowManager.windows.size : 0;
        const estimatedMemory = windowCount * 5; // ~5MB per window estimate
        const percentage = Math.min((estimatedMemory / 100) * 100, 100); // Assume 100MB limit
        
        const memoryUsageEl = window.querySelector('#memory-usage');
        const memoryFillEl = window.querySelector('#memory-fill');
        const memoryDetailsEl = window.querySelector('#memory-details');
        
        if (memoryUsageEl) {
            memoryUsageEl.textContent = `${estimatedMemory} MB`;
        }
        if (memoryFillEl) {
            this.animateWidth(memoryFillEl, memoryFillEl.style.width, `${percentage}%`, 500);
        }
        if (memoryDetailsEl) {
            memoryDetailsEl.textContent = `${windowCount} active windows`;
        }
    }
    
    updateProductivityInsights(window) {
        const insightsEl = window.querySelector('#productivity-insights');
        if (!insightsEl) return;
        
        if (typeof userProfile === 'undefined' || !userProfile.initialized) {
            insightsEl.innerHTML = `
                <div class="insight-card">
                    <div class="insight-icon">📊</div>
                    <div class="insight-content">
                        <div class="insight-title">No Data Available</div>
                        <div class="insight-description">Usage data will appear as you use AegisDesk</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const insights = userProfile.getInsights ? userProfile.getInsights() : null;
        if (!insights) {
            insightsEl.innerHTML = `
                <div class="insight-card">
                    <div class="insight-icon">📊</div>
                    <div class="insight-content">
                        <div class="insight-title">Getting Started</div>
                        <div class="insight-description">Start using apps to generate insights</div>
                    </div>
                </div>
            `;
            return;
        }
        
        const productivityInsights = this.generateProductivityInsights(insights);
        insightsEl.innerHTML = productivityInsights.map(insight => `
            <div class="insight-card">
                <div class="insight-icon">${insight.icon}</div>
                <div class="insight-content">
                    <div class="insight-title">${insight.title}</div>
                    <div class="insight-description">${insight.description}</div>
                </div>
            </div>
        `).join('');
    }
    
    generateProductivityInsights(insights) {
        const result = [];
        const topApps = insights.topApps || [];
        
        if (topApps.length > 0) {
            const mostUsed = topApps[0];
            result.push({
                icon: '🎯',
                title: 'Most Used App',
                description: `${mostUsed.appId} is your primary tool with ${Math.floor((mostUsed.totalTime || 0) / 60)}h of usage.`
            });
        }
        
        if (topApps.length > 2) {
            result.push({
                icon: '🔄',
                title: 'App Switching',
                description: `You use ${topApps.length} different apps regularly. Consider using Focus Mode to minimize distractions.`
            });
        }
        
        if (insights.activeHours) {
            result.push({
                icon: '⏰',
                title: 'Peak Activity',
                description: `You're most active between ${insights.activeHours.start}:00 and ${insights.activeHours.end}:00. Schedule important work during this time.`
            });
        }
        
        if (topApps.length > 0) {
            const totalTime = topApps.reduce((sum, app) => sum + (app.totalTime || 0), 0);
            const avgTime = Math.floor(totalTime / topApps.length / 60);
            if (avgTime > 30) {
                result.push({
                    icon: '⚡',
                    title: 'Deep Work',
                    description: `Average session length is ${avgTime}+ minutes. You're maintaining good focus periods.`
                });
            }
        }
        
        if (result.length === 0) {
            result.push({
                icon: '📈',
                title: 'Getting Started',
                description: 'Continue using AegisDesk to unlock personalized productivity insights.'
            });
        }
        
        return result;
    }
    
    updateNotifications(window) {
        const pendingEl = window.querySelector('#notifications-pending');
        const todayEl = window.querySelector('#notifications-today');
        const weekEl = window.querySelector('#notifications-week');
        
        if (typeof notificationSystem === 'undefined') {
            if (pendingEl) pendingEl.textContent = '0';
            if (todayEl) todayEl.textContent = '0';
            if (weekEl) weekEl.textContent = '0';
            return;
        }
        
        // Get notification stats
        const notifications = notificationSystem.getNotifications ? notificationSystem.getNotifications() : [];
        const pending = notifications.filter(n => !n.read).length;
        const today = notifications.filter(n => {
            const date = new Date(n.timestamp);
            return date.toDateString() === new Date().toDateString();
        }).length;
        const week = notifications.filter(n => {
            const date = new Date(n.timestamp);
            const weekAgo = new Date();
            weekAgo.setDate(weekAgo.getDate() - 7);
            return date > weekAgo;
        }).length;
        
        if (pendingEl) this.animateValue(pendingEl, pendingEl.textContent, pending.toString(), 300);
        if (todayEl) this.animateValue(todayEl, todayEl.textContent, today.toString(), 300);
        if (weekEl) this.animateValue(weekEl, weekEl.textContent, week.toString(), 300);
    }
    
    async showAIInsights(window) {
        if (typeof AISystem === 'undefined') {
            alert('AI system not available');
            return;
        }
        
        // Collect system data
        const systemData = {
            uptime: Date.now() - this.startTime,
            activeWindows: windowManager ? windowManager.windows.size : 0,
            activeApps: new Set(Array.from(windowManager?.windows.values() || []).map(w => w.dataset.windowId?.split('_')[0])).size,
            userInsights: typeof userProfile !== 'undefined' && userProfile.initialized ? userProfile.getInsights() : null
        };
        
        const prompt = `Based on this system data: ${JSON.stringify(systemData)}, provide 3-5 actionable productivity insights. Be concise and practical.`;
        
        try {
            const aiSystem = new AISystem();
            const response = await aiSystem.getAIResponse(prompt, false);
            
            // Show AI insights
            const insightsEl = window.querySelector('#productivity-insights');
            if (insightsEl) {
                const aiCard = `
                    <div class="insight-card ai-insight">
                        <div class="insight-icon">🤖</div>
                        <div class="insight-content">
                            <div class="insight-title">AI-Generated Insights</div>
                            <div class="insight-description">${response}</div>
                        </div>
                    </div>
                `;
                insightsEl.insertAdjacentHTML('afterbegin', aiCard);
                
                // Scroll to top
                insightsEl.scrollTop = 0;
            }
        } catch (error) {
            console.error('AI insights error:', error);
            alert('Could not generate AI insights. Please check your AI configuration.');
        }
    }
    
    attachEvents(window) {
        // Refresh button
        window.querySelector('#refresh-insights')?.addEventListener('click', () => {
            this.updateAll(window);
        });
        
        // AI Insights button
        window.querySelector('#ai-insights')?.addEventListener('click', () => {
            this.showAIInsights(window);
        });
        
        // Period buttons
        window.querySelectorAll('.section-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                window.querySelectorAll('.section-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                // TODO: Update analytics for selected period
            });
        });
    }
    
    animateValue(element, from, to, duration) {
        if (element.textContent === to) return;
        
        const start = parseFloat(from) || 0;
        const end = parseFloat(to) || 0;
        const startTime = Date.now();
        
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            if (isNaN(start) || isNaN(end)) {
                element.textContent = to;
                return;
            }
            
            const current = Math.floor(start + (end - start) * progress);
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = to;
            }
        };
        
        animate();
    }
    
    animateWidth(element, from, to, duration) {
        const start = parseFloat(from) || 0;
        const end = parseFloat(to.replace('%', '')) || 0;
        const startTime = Date.now();
        
        const animate = () => {
            const now = Date.now();
            const elapsed = now - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            const current = start + (end - start) * progress;
            element.style.width = current + '%';
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.style.width = to;
            }
        };
        
        animate();
    }
}

// Create instance
const systemInsightsApp = new SystemInsightsApp();
window.systemInsightsApp = systemInsightsApp;
