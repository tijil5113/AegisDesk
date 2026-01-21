// STUDENT PROGRESS - Student Analytics & Progress System
// Track performance, productivity, and AI insights

class StudentProgressApp {
    constructor() {
        this.windowId = 'student-progress';
        this.storageKey = 'aegis_progress_data';
        this.currentRange = 'week';
        this.data = this.loadData();
        this.init();
    }

    init() {
        console.log('[Student Progress] Initializing...');
        this.setupEventListeners();
        this.render();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Student Progress] Failed to load data:', e);
        }
        
        return {
            assignments: [],
            attendance: [],
            studyTime: [],
            completionRate: 0,
            lastUpdated: Date.now()
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('[Student Progress] Failed to save data:', e);
        }
    }

    setupEventListeners() {
        // Time range buttons
        document.querySelectorAll('.progress-range-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const range = e.target.dataset.range;
                this.setTimeRange(range);
            });
        });
    }

    setTimeRange(range) {
        this.currentRange = range;
        
        // Update active button
        document.querySelectorAll('.progress-range-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        this.render();
    }

    render() {
        this.renderStats();
        this.renderCharts();
        this.renderInsights();
    }

    renderStats() {
        const container = document.getElementById('progress-stats-grid');
        if (!container) return;

        // Calculate stats
        const stats = this.calculateStats();
        
        container.innerHTML = `
            <div class="progress-stat-card">
                <div class="progress-stat-header">
                    <div class="progress-stat-label">Completion Rate</div>
                    <div class="progress-stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="progress-stat-value">${stats.completionRate}%</div>
                <div class="progress-stat-change ${stats.completionChange >= 0 ? 'positive' : 'negative'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="${stats.completionChange >= 0 ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"></polyline>
                    </svg>
                    ${Math.abs(stats.completionChange)}% from last period
                </div>
            </div>
            <div class="progress-stat-card">
                <div class="progress-stat-header">
                    <div class="progress-stat-label">Total Assignments</div>
                    <div class="progress-stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 20h9"></path>
                            <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                    </div>
                </div>
                <div class="progress-stat-value">${stats.totalAssignments}</div>
                <div class="progress-stat-change">
                    ${stats.completedAssignments} completed, ${stats.pendingAssignments} pending
                </div>
            </div>
            <div class="progress-stat-card">
                <div class="progress-stat-header">
                    <div class="progress-stat-label">Study Time</div>
                    <div class="progress-stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                    </div>
                </div>
                <div class="progress-stat-value">${stats.totalStudyHours}h</div>
                <div class="progress-stat-change positive">
                    ${stats.avgStudyHoursPerDay}h average per day
                </div>
            </div>
            <div class="progress-stat-card">
                <div class="progress-stat-header">
                    <div class="progress-stat-label">Attendance</div>
                    <div class="progress-stat-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                            <circle cx="8.5" cy="7" r="4"></circle>
                            <line x1="20" y1="8" x2="20" y2="14"></line>
                            <line x1="23" y1="11" x2="17" y2="11"></line>
                        </svg>
                    </div>
                </div>
                <div class="progress-stat-value">${stats.attendanceRate}%</div>
                <div class="progress-stat-change ${stats.attendanceChange >= 0 ? 'positive' : 'negative'}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="${stats.attendanceChange >= 0 ? '18 15 12 9 6 15' : '6 9 12 15 18 9'}"></polyline>
                    </svg>
                    ${Math.abs(stats.attendanceChange)}% from last period
                </div>
            </div>
        `;
    }

    renderCharts() {
        const completionChart = document.getElementById('progress-completion-chart');
        const studyChart = document.getElementById('progress-study-chart');
        
        if (completionChart) {
            const stats = this.calculateStats();
            completionChart.innerHTML = `
                <div style="width: 100%; display: flex; flex-direction: column; gap: 16px;">
                    <div class="progress-ring">
                        <svg width="120" height="120" viewBox="0 0 120 120">
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--progress-border)" stroke-width="8"/>
                            <circle cx="60" cy="60" r="54" fill="none" stroke="var(--progress-primary)" stroke-width="8"
                                    stroke-dasharray="${2 * Math.PI * 54}"
                                    stroke-dashoffset="${2 * Math.PI * 54 * (1 - stats.completionRate / 100)}"
                                    stroke-linecap="round"
                                    transform="rotate(-90 60 60)"/>
                        </svg>
                        <div class="progress-ring-value">${stats.completionRate}%</div>
                    </div>
                    <div style="text-align: center; font-size: 14px; color: var(--progress-text-muted);">
                        ${stats.completedAssignments} of ${stats.totalAssignments} assignments completed
                    </div>
                </div>
            `;
        }

        if (studyChart) {
            const studyData = this.getStudyTimeData();
            studyChart.innerHTML = `
                <div style="width: 100%; padding: 20px;">
                    <div style="display: flex; align-items: flex-end; justify-content: space-around; height: 150px; gap: 8px;">
                        ${studyData.map((day, index) => `
                            <div style="flex: 1; display: flex; flex-direction: column; align-items: center; gap: 8px;">
                                <div style="width: 100%; background: var(--progress-border); border-radius: 4px 4px 0 0; height: 100%; position: relative; min-height: 4px;">
                                    <div style="position: absolute; bottom: 0; left: 0; right: 0; background: var(--progress-primary); border-radius: 4px 4px 0 0; height: ${(day.hours / studyData.reduce((max, d) => Math.max(max, d.hours), 0)) * 100}%; transition: height 0.3s ease;"></div>
                                </div>
                                <div style="font-size: 11px; color: var(--progress-text-muted);">${day.label}</div>
                                <div style="font-size: 12px; font-weight: 600; color: var(--progress-text);">${day.hours}h</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }

    renderInsights() {
        const container = document.getElementById('progress-insights-list');
        if (!container) return;

        const insights = this.generateAIInsights();
        
        if (insights.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; color: var(--progress-text-muted);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" style="margin-bottom: 16px;">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                    </svg>
                    <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: var(--progress-text);">No Insights Yet</h3>
                    <p>Complete more assignments and track your study time to get AI-powered insights!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = insights.map(insight => `
            <div class="progress-insight-card">
                <div class="progress-insight-header">
                    <div class="progress-insight-icon">
                        ${insight.icon || `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                        </svg>`}
                    </div>
                    <div class="progress-insight-title">${this.escapeHtml(insight.title)}</div>
                </div>
                <div class="progress-insight-content">${this.escapeHtml(insight.content)}</div>
                ${insight.action ? `
                    <div class="progress-insight-action">
                        <button class="progress-btn progress-btn-primary" onclick="studentProgressApp.${insight.action}()">
                            ${insight.actionLabel || 'Learn More'}
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    calculateStats() {
        // Load from College Hub if available
        const collegeData = this.loadCollegeHubData();
        
        const assignments = collegeData.assignments || [];
        const completed = assignments.filter(a => a.isCompleted).length;
        const total = assignments.length;
        const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
        
        const attendance = collegeData.attendance || [];
        const attendanceRate = attendance.length > 0 
            ? Math.round((attendance.filter(a => a.present).length / attendance.length) * 100)
            : 85; // Default
        
        const studyTime = collegeData.studyTime || [];
        const totalStudyHours = studyTime.reduce((sum, day) => sum + (day.hours || 0), 0);
        const days = studyTime.length || 1;
        const avgStudyHoursPerDay = Math.round((totalStudyHours / days) * 10) / 10;
        
        return {
            completionRate: completionRate,
            completionChange: Math.floor(Math.random() * 10) - 5, // Placeholder
            totalAssignments: total,
            completedAssignments: completed,
            pendingAssignments: total - completed,
            totalStudyHours: Math.round(totalStudyHours * 10) / 10,
            avgStudyHoursPerDay: avgStudyHoursPerDay,
            attendanceRate: attendanceRate,
            attendanceChange: Math.floor(Math.random() * 10) - 5 // Placeholder
        };
    }

    getStudyTimeData() {
        const collegeData = this.loadCollegeHubData();
        const studyTime = collegeData.studyTime || [];
        
        // Default data if empty
        if (studyTime.length === 0) {
            const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
            return days.map((label, i) => ({
                label: label,
                hours: Math.floor(Math.random() * 4) + 1
            }));
        }
        
        return studyTime.slice(-7).map((day, i) => ({
            label: day.date || `Day ${i + 1}`,
            hours: day.hours || 0
        }));
    }

    generateAIInsights() {
        const stats = this.calculateStats();
        const insights = [];
        
        // Completion rate insight
        if (stats.completionRate < 70) {
            insights.push({
                title: '⚠️ Falling Behind',
                content: `Your completion rate is ${stats.completionRate}%. Consider focusing on completing pending assignments. Prioritize based on due dates.`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>`
            });
        } else if (stats.completionRate >= 90) {
            insights.push({
                title: '🎉 Excellent Progress',
                content: `Great job! You've completed ${stats.completionRate}% of your assignments. Keep up the momentum!`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                    <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>`
            });
        }
        
        // Study time insight
        if (stats.avgStudyHoursPerDay < 2) {
            insights.push({
                title: '📚 Increase Study Time',
                content: `You're averaging ${stats.avgStudyHoursPerDay} hours per day. Try to aim for at least 2-3 hours daily for better results.`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
                    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
                </svg>`
            });
        }
        
        // Attendance insight
        if (stats.attendanceRate < 75) {
            insights.push({
                title: '📅 Improve Attendance',
                content: `Your attendance rate is ${stats.attendanceRate}%. Regular attendance is crucial for academic success.`,
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>`
            });
        }
        
        // Default insight if none generated
        if (insights.length === 0) {
            insights.push({
                title: '💡 Keep Going!',
                content: 'You\'re doing well! Continue tracking your progress and stay consistent with your study schedule.',
                icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>`
            });
        }
        
        return insights;
    }

    loadCollegeHubData() {
        try {
            const stored = localStorage.getItem('aegis_college_hub_data');
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Student Progress] Failed to load College Hub data:', e);
        }
        return {
            assignments: [],
            attendance: [],
            studyTime: []
        };
    }

    // Utility Methods
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
let studentProgressApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        studentProgressApp = new StudentProgressApp();
        window.studentProgressApp = studentProgressApp;
    });
} else {
    studentProgressApp = new StudentProgressApp();
    window.studentProgressApp = studentProgressApp;
}
