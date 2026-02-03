// COLLEGE HUB - Academic Operating System
// Central dashboard for student academic life

class CollegeHub {
    constructor() {
        this.windowId = 'college-hub';
        this.storageKey = 'aegis_college_data';
        this.data = this.loadData();
        this.init();
    }

    init() {
        console.log('[College Hub] Initializing...');
        this.setupEventListeners();
        this.render();
        this.updateStats();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[College Hub] Failed to load data:', e);
        }
        
        // Default data structure
        return {
            courses: [],
            assignments: [],
            classes: [],
            announcements: [],
            activity: []
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('[College Hub] Failed to save data:', e);
        }
    }

    setupEventListeners() {
        // Sync button
        const syncBtn = document.getElementById('college-sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncWithGoogleClassroom());
        }

        // Settings button
        const settingsBtn = document.getElementById('college-settings-btn');
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.openSettings());
        }
    }

    render() {
        this.renderTodayClasses();
        this.renderUpcomingAssignments();
        this.renderAnnouncements();
        this.renderActivity();
    }

    renderTodayClasses() {
        const container = document.getElementById('college-today-classes');
        if (!container) return;

        const todayClasses = this.getTodayClasses();

        if (todayClasses.length === 0) {
            container.innerHTML = `
                <div class="college-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3>No Classes Today</h3>
                    <p>Enjoy your free day!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = todayClasses.map(classItem => `
            <div class="college-class-item" onclick="collegeApp.openClassDetails('${classItem.id}')">
                <div class="college-class-header">
                    <div>
                        <div class="college-class-title">${this.escapeHtml(classItem.title)}</div>
                        <div class="college-class-course">${this.escapeHtml(classItem.course)}</div>
                    </div>
                    <div class="college-class-time">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        ${this.formatTime(classItem.startTime)} - ${this.formatTime(classItem.endTime)}
                    </div>
                </div>
                ${classItem.location ? `<div class="college-class-location">📍 ${this.escapeHtml(classItem.location)}</div>` : ''}
            </div>
        `).join('');
    }

    renderUpcomingAssignments() {
        const container = document.getElementById('college-upcoming-assignments');
        if (!container) return;

        const upcoming = this.getUpcomingAssignments(5);

        if (upcoming.length === 0) {
            container.innerHTML = `
                <div class="college-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 20h9"></path>
                        <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                    </svg>
                    <h3>All Caught Up!</h3>
                    <p>No upcoming assignments</p>
                </div>
            `;
            return;
        }

        container.innerHTML = upcoming.map(assignment => `
            <div class="college-assignment-item" onclick="collegeApp.openAssignment('${assignment.id}')">
                <div class="college-assignment-header">
                    <div>
                        <div class="college-assignment-title">${this.escapeHtml(assignment.title)}</div>
                        <div class="college-assignment-course">${this.escapeHtml(assignment.course)}</div>
                    </div>
                    <div class="college-assignment-status ${assignment.status}">${assignment.status}</div>
                </div>
                <div class="college-assignment-due">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <circle cx="12" cy="12" r="10"></circle>
                        <polyline points="12 6 12 12 16 14"></polyline>
                    </svg>
                    Due: ${this.formatDueDate(assignment.dueDate)}
                </div>
            </div>
        `).join('');
    }

    renderAnnouncements() {
        const container = document.getElementById('college-announcements');
        if (!container) return;

        const announcements = this.getRecentAnnouncements(3);

        if (announcements.length === 0) {
            container.innerHTML = `
                <div class="college-empty-state">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    </svg>
                    <h3>No Announcements</h3>
                    <p>Check back later</p>
                </div>
            `;
            return;
        }

        container.innerHTML = announcements.map(announcement => `
            <div class="college-announcement-item" onclick="collegeApp.openAnnouncement('${announcement.id}')">
                <div class="college-assignment-header">
                    <div>
                        <div class="college-assignment-title">${this.escapeHtml(announcement.title)}</div>
                        <div class="college-assignment-course">${this.escapeHtml(announcement.course)}</div>
                    </div>
                </div>
                <div style="font-size: 13px; color: var(--college-text-muted); margin-top: 8px;">
                    ${this.escapeHtml(announcement.preview || '').substring(0, 100)}${announcement.preview && announcement.preview.length > 100 ? '...' : ''}
                </div>
                <div class="college-assignment-due" style="margin-top: 8px;">
                    ${this.formatTimeAgo(announcement.timestamp)}
                </div>
            </div>
        `).join('');
    }

    renderActivity() {
        const container = document.getElementById('college-activity');
        if (!container) return;

        const activity = this.getRecentActivity(5);

        if (activity.length === 0) {
            container.innerHTML = `
                <div class="college-empty-state">
                    <p>No recent activity</p>
                </div>
            `;
            return;
        }

        container.innerHTML = activity.map(item => `
            <div class="college-activity-item">
                <div class="college-assignment-header">
                    <div>
                        <div class="college-assignment-title" style="font-size: 14px;">${this.escapeHtml(item.description)}</div>
                        <div class="college-assignment-due">${this.formatTimeAgo(item.timestamp)}</div>
                    </div>
                </div>
            </div>
        `).join('');
    }

    updateStats() {
        // Assignments due soon
        const dueSoon = this.getAssignmentsDueSoon(7).length;
        const dueEl = document.getElementById('college-assignments-count');
        if (dueEl) dueEl.textContent = dueSoon;

        // Today's classes
        const todayClasses = this.getTodayClasses().length;
        const classesEl = document.getElementById('college-classes-count');
        if (classesEl) classesEl.textContent = todayClasses;

        // Completion rate
        const completion = this.getCompletionRate();
        const completionEl = document.getElementById('college-completion-rate');
        if (completionEl) completionEl.textContent = `${completion}%`;

        // Attendance rate
        const attendance = this.getAttendanceRate();
        const attendanceEl = document.getElementById('college-attendance-rate');
        if (attendanceEl) attendanceEl.textContent = `${attendance}%`;
    }

    // Data Methods
    getTodayClasses() {
        const today = new Date();
        const dayOfWeek = today.getDay();
        
        return this.data.classes.filter(classItem => {
            const classDay = this.getDayOfWeek(classItem.dayOfWeek);
            return classDay === dayOfWeek && !classItem.isCancelled;
        }).sort((a, b) => {
            const timeA = this.timeToMinutes(a.startTime);
            const timeB = this.timeToMinutes(b.startTime);
            return timeA - timeB;
        });
    }

    getUpcomingAssignments(limit = 10) {
        const now = Date.now();
        return this.data.assignments
            .filter(a => !a.isCompleted)
            .filter(a => new Date(a.dueDate).getTime() >= now)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, limit);
    }

    getAssignmentsDueSoon(days = 7) {
        const now = Date.now();
        const daysFromNow = days * 24 * 60 * 60 * 1000;
        return this.data.assignments.filter(a => {
            const dueTime = new Date(a.dueDate).getTime();
            return !a.isCompleted && dueTime >= now && dueTime <= now + daysFromNow;
        });
    }

    getRecentAnnouncements(limit = 5) {
        return this.data.announcements
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    getRecentActivity(limit = 10) {
        return this.data.activity
            .sort((a, b) => b.timestamp - a.timestamp)
            .slice(0, limit);
    }

    getCompletionRate() {
        const total = this.data.assignments.length;
        if (total === 0) return 0;
        const completed = this.data.assignments.filter(a => a.isCompleted).length;
        return Math.round((completed / total) * 100);
    }

    getAttendanceRate() {
        return 85; // Placeholder - would integrate with actual attendance data
    }

    // Navigation Methods
    openClassroom() {
        if (window.appRegistry && window.appRegistry.open) {
            window.appRegistry.open('classroom');
        } else {
            window.open('classroom.html', '_blank');
        }
    }

    openAssignments() {
        if (window.appRegistry && window.appRegistry.open) {
            window.appRegistry.open('assignments');
        } else {
            window.open('assignments.html', '_blank');
        }
    }

    openCalendar() {
        if (window.appRegistry && window.appRegistry.open) {
            window.appRegistry.open('academic-calendar');
        } else {
            window.open('calendar.html', '_blank');
        }
    }

    openAnnouncements() {
        if (window.appRegistry && window.appRegistry.open) {
            window.appRegistry.open('announcements');
        } else {
            window.open('announcements.html', '_blank');
        }
    }

    openNotes() {
        if (window.appRegistry && window.appRegistry.open) {
            window.appRegistry.open('notes');
        } else {
            window.open('notes.html', '_blank');
        }
    }

    openAI() {
        if (window.appRegistry && window.appRegistry.open) {
            window.appRegistry.open('ai-chat');
        } else {
            window.open('ai-chat.html', '_blank');
        }
    }

    openClassDetails(classId) {
        console.log('[College Hub] Opening class:', classId);
    }

    openAssignment(assignmentId) {
        console.log('[College Hub] Opening assignment:', assignmentId);
        this.openAssignments();
    }

    openAnnouncement(announcementId) {
        console.log('[College Hub] Opening announcement:', announcementId);
        this.openAnnouncements();
    }

    syncWithGoogleClassroom() {
        console.log('[College Hub] Syncing with Google Classroom...');
        // TODO: Implement Google OAuth and Classroom API integration
        alert('Google Classroom sync will be implemented soon!');
    }

    openSettings() {
        console.log('[College Hub] Opening settings...');
    }

    // Utility Methods
    formatTime(timeString) {
        const [hours, minutes] = timeString.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    }

    formatDueDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return `${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''} ago`;
        } else if (diffDays === 0) {
            return 'Today';
        } else if (diffDays === 1) {
            return 'Tomorrow';
        } else if (diffDays <= 7) {
            return `In ${diffDays} days`;
        } else {
            return date.toLocaleDateString();
        }
    }

    formatTimeAgo(timestamp) {
        const now = Date.now();
        const diff = now - timestamp;
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (seconds < 60) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return new Date(timestamp).toLocaleDateString();
    }

    timeToMinutes(timeString) {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 + minutes;
    }

    getDayOfWeek(dayName) {
        const days = { 'sunday': 0, 'monday': 1, 'tuesday': 2, 'wednesday': 3, 'thursday': 4, 'friday': 5, 'saturday': 6 };
        return days[dayName.toLowerCase()] ?? 0;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
let collegeApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        collegeApp = new CollegeHub();
        window.collegeApp = collegeApp;
    });
} else {
    collegeApp = new CollegeHub();
    window.collegeApp = collegeApp;
}
