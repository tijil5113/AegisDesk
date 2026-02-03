// System Insights - Analytics and Productivity Patterns
class Insights {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // Wait for dependencies
        await this.waitForDependencies();
        
        // Setup UI
        this.setupUI();
        
        // Load insights
        this.loadInsights();
        
        this.initialized = true;
    }

    async waitForDependencies() {
        let attempts = 0;
        while ((typeof userProfile === 'undefined' || !userProfile.initialized) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    setupUI() {
        // Close button
        document.getElementById('insights-close-btn').addEventListener('click', () => {
            window.close();
        });
    }

    loadInsights() {
        if (typeof userProfile === 'undefined' || !userProfile.initialized) {
            this.showError('User profile not available');
            return;
        }

        const insights = userProfile.getInsights();
        if (!insights) {
            this.showError('No insights available yet');
            return;
        }

        // Time Spent
        this.renderTimeSpent(insights);
        
        // Top Apps
        this.renderTopApps(insights);
        
        // Top Features
        this.renderTopFeatures(insights);
        
        // Focus Score
        this.renderFocusScore(insights);
        
        // Weekly Summary
        this.renderWeeklySummary(insights);
        
        // Patterns
        this.renderPatterns(insights);
    }

    renderTimeSpent(insights) {
        const container = document.getElementById('insights-time-spent');
        const totalTime = insights.topApps.reduce((sum, app) => sum + (app.totalTime || 0), 0);
        const hours = Math.floor(totalTime / 60);
        const minutes = totalTime % 60;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 3rem; font-weight: 700; color: var(--text-primary); margin-bottom: 0.5rem;">
                    ${hours}h ${minutes}m
                </div>
                <div style="color: var(--text-muted);">Total app usage time</div>
            </div>
        `;
    }

    renderTopApps(insights) {
        const container = document.getElementById('insights-top-apps');
        
        if (insights.topApps.length === 0) {
            container.innerHTML = '<div class="dashboard-empty">No app usage data yet</div>';
            return;
        }
        
        container.innerHTML = insights.topApps.map((app, index) => {
            const hours = Math.floor((app.totalTime || 0) / 60);
            const minutes = (app.totalTime || 0) % 60;
            return `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(148, 163, 184, 0.05); border-radius: 8px; margin-bottom: 0.5rem;">
                    <div>
                        <div style="font-weight: 600; color: var(--text-primary);">${index + 1}. ${app.appId}</div>
                        <div style="font-size: 0.875rem; color: var(--text-muted);">${app.count} uses • ${hours}h ${minutes}m</div>
                    </div>
                </div>
            `;
        }).join('');
    }

    renderTopFeatures(insights) {
        const container = document.getElementById('insights-top-features');
        
        if (insights.topFeatures.length === 0) {
            container.innerHTML = '<div class="dashboard-empty">No feature usage data yet</div>';
            return;
        }
        
        container.innerHTML = insights.topFeatures.map((feature, index) => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 1rem; background: rgba(148, 163, 184, 0.05); border-radius: 8px; margin-bottom: 0.5rem;">
                <div>
                    <div style="font-weight: 600; color: var(--text-primary);">${index + 1}. ${feature.feature}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">${feature.count} uses</div>
                </div>
            </div>
        `).join('');
    }

    renderFocusScore(insights) {
        const container = document.getElementById('insights-focus-score');
        const score = insights.productivityScore || 0;
        
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem;">
                <div style="font-size: 4rem; font-weight: 700; background: linear-gradient(135deg, #6366f1, #8b5cf6); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin-bottom: 0.5rem;">
                    ${score}%
                </div>
                <div style="color: var(--text-muted);">Focus Score</div>
            </div>
        `;
    }

    renderWeeklySummary(insights) {
        const container = document.getElementById('insights-weekly-summary');
        const stats = insights.stats || {};
        
        container.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 1rem;">
                <div style="text-align: center; padding: 1rem; background: rgba(148, 163, 184, 0.05); border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${stats.totalAppSessions || 0}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">App Sessions</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(148, 163, 184, 0.05); border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${stats.totalFeaturesUsed || 0}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">Features Used</div>
                </div>
                <div style="text-align: center; padding: 1rem; background: rgba(148, 163, 184, 0.05); border-radius: 8px;">
                    <div style="font-size: 2rem; font-weight: 700; color: var(--text-primary);">${stats.profileAge || 0}</div>
                    <div style="font-size: 0.875rem; color: var(--text-muted);">Days Active</div>
                </div>
            </div>
        `;
    }

    renderPatterns(insights) {
        const container = document.getElementById('insights-patterns');
        
        const patterns = [];
        
        if (insights.activeHours) {
            patterns.push({
                title: 'Active Hours',
                description: `${insights.activeHours.start}:00 - ${insights.activeHours.end}:00`
            });
        }
        
        if (insights.topCommands.length > 0) {
            patterns.push({
                title: 'Most Used Command',
                description: insights.topCommands[0].command
            });
        }
        
        if (insights.preferredNewsCategories.length > 0) {
            patterns.push({
                title: 'Preferred News',
                description: insights.preferredNewsCategories.slice(0, 3).join(', ')
            });
        }
        
        if (patterns.length === 0) {
            container.innerHTML = '<div class="dashboard-empty">No patterns detected yet</div>';
            return;
        }
        
        container.innerHTML = patterns.map(pattern => `
            <div style="padding: 1rem; background: rgba(148, 163, 184, 0.05); border-radius: 8px; margin-bottom: 0.5rem;">
                <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 0.25rem;">${pattern.title}</div>
                <div style="font-size: 0.875rem; color: var(--text-muted);">${pattern.description}</div>
            </div>
        `).join('');
    }

    showError(message) {
        document.querySelectorAll('.dashboard-loading').forEach(el => {
            el.innerHTML = `<div class="dashboard-empty">${message}</div>`;
        });
    }
}

// Initialize insights
const insights = new Insights();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => insights.init());
} else {
    insights.init();
}
