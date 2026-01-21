// ASSIGNMENTS - Assignments & Submissions System
// Track, submit, and manage assignments

class AssignmentsApp {
    constructor() {
        this.windowId = 'assignments';
        this.storageKey = 'aegis_assignments_data';
        this.currentFilter = 'all';
        this.data = this.loadData();
        this.init();
    }

    init() {
        console.log('[Assignments] Initializing...');
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
            console.error('[Assignments] Failed to load data:', e);
        }
        
        return {
            assignments: []
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('[Assignments] Failed to save data:', e);
        }
    }

    setupEventListeners() {
        // Filter buttons
        document.querySelectorAll('.assignments-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.dataset.filter;
                this.setFilter(filter);
            });
        });

        // Modal overlay - close on click outside
        const modal = document.getElementById('assignments-detail-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideDetailModal();
                }
            });
        }
    }

    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active button
        document.querySelectorAll('.assignments-filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.render();
    }

    render() {
        const filteredAssignments = this.getFilteredAssignments();
        this.renderTimeline(filteredAssignments);
    }

    getFilteredAssignments() {
        let assignments = [...this.data.assignments];
        
        // Sort by due date
        assignments.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
        
        // Filter by status
        if (this.currentFilter !== 'all') {
            assignments = assignments.filter(a => {
                if (this.currentFilter === 'pending') return !a.isSubmitted && !a.isGraded;
                if (this.currentFilter === 'submitted') return a.isSubmitted && !a.isGraded;
                if (this.currentFilter === 'graded') return a.isGraded;
                if (this.currentFilter === 'late') {
                    const dueTime = new Date(a.dueDate).getTime();
                    const now = Date.now();
                    return now > dueTime && !a.isSubmitted;
                }
                return true;
            });
        }
        
        return assignments;
    }

    renderTimeline(assignments) {
        const container = document.getElementById('assignments-timeline');
        const emptyState = document.getElementById('assignments-empty-state');
        
        if (!container) return;

        if (assignments.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'block';
        if (emptyState) emptyState.style.display = 'none';

        // Group by date
        const grouped = this.groupAssignmentsByDate(assignments);
        
        container.innerHTML = Object.keys(grouped).map(date => `
            <div class="assignments-timeline-group">
                <div class="assignments-timeline-date">${this.formatDateHeader(date)}</div>
                ${grouped[date].map(assignment => this.createAssignmentItem(assignment)).join('')}
            </div>
        `).join('');

        // Add click handlers
        container.querySelectorAll('.assignments-timeline-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                const assignmentId = item.dataset.assignmentId;
                const assignment = this.data.assignments.find(a => a.id === assignmentId);
                if (assignment) {
                    this.showAssignmentDetail(assignment);
                }
            });
        });
    }

    createAssignmentItem(assignment) {
        const status = this.getAssignmentStatus(assignment);
        const dueDate = new Date(assignment.dueDate);
        const now = Date.now();
        const isOverdue = now > dueDate.getTime() && !assignment.isSubmitted;
        
        return `
            <div class="assignments-timeline-item" data-assignment-id="${assignment.id}">
                <div class="assignments-item-header">
                    <div>
                        <div class="assignments-item-title">${this.escapeHtml(assignment.title)}</div>
                        <div class="assignments-item-course">${this.escapeHtml(assignment.course)}</div>
                    </div>
                    <div class="assignments-item-status ${status}">${status}</div>
                </div>
                ${assignment.description ? `<p style="font-size: 14px; color: var(--assignments-text-muted); margin: 8px 0;">${this.escapeHtml(assignment.description.substring(0, 150))}${assignment.description.length > 150 ? '...' : ''}</p>` : ''}
                <div class="assignments-item-meta">
                    <div class="assignments-item-due">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        Due: ${this.formatDueDate(assignment.dueDate)}${isOverdue ? ' (Overdue)' : ''}
                    </div>
                    ${assignment.points ? `
                        <div class="assignments-item-points">
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            ${assignment.points} points
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    getAssignmentStatus(assignment) {
        if (assignment.isGraded) return 'graded';
        if (assignment.isSubmitted) return 'submitted';
        const dueTime = new Date(assignment.dueDate).getTime();
        const now = Date.now();
        if (now > dueTime) return 'late';
        return 'pending';
    }

    groupAssignmentsByDate(assignments) {
        const grouped = {};
        
        assignments.forEach(assignment => {
            const date = new Date(assignment.dueDate);
            const dateKey = date.toDateString();
            
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            
            grouped[dateKey].push(assignment);
        });
        
        return grouped;
    }

    showAssignmentDetail(assignment) {
        const modal = document.getElementById('assignments-detail-modal');
        if (!modal) return;

        const status = this.getAssignmentStatus(assignment);
        const dueDate = new Date(assignment.dueDate);
        const now = Date.now();
        const isOverdue = now > dueDate.getTime() && !assignment.isSubmitted;

        modal.querySelector('.assignments-detail-modal').innerHTML = `
            <div style="padding: 24px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                    <div>
                        <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">${this.escapeHtml(assignment.title)}</h2>
                        <div style="font-size: 16px; color: var(--assignments-primary); font-weight: 500;">${this.escapeHtml(assignment.course)}</div>
                    </div>
                    <div class="assignments-item-status ${status}">${status}</div>
                </div>
                
                ${assignment.description ? `
                    <div style="margin-bottom: 24px;">
                        <h3 style="font-size: 16px; font-weight: 600; margin-bottom: 12px;">Description</h3>
                        <p style="font-size: 14px; line-height: 1.6; color: var(--assignments-text-muted); white-space: pre-wrap;">${this.escapeHtml(assignment.description)}</p>
                    </div>
                ` : ''}
                
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 24px;">
                    <div style="background: var(--assignments-bg-secondary); padding: 16px; border-radius: 8px; border: 1px solid var(--assignments-border);">
                        <div style="font-size: 12px; color: var(--assignments-text-muted); margin-bottom: 4px;">Due Date</div>
                        <div style="font-size: 16px; font-weight: 600;">${this.formatDueDate(assignment.dueDate)}</div>
                        ${isOverdue ? `<div style="font-size: 12px; color: var(--assignments-error); margin-top: 4px;">⚠️ Overdue</div>` : ''}
                    </div>
                    ${assignment.points ? `
                        <div style="background: var(--assignments-bg-secondary); padding: 16px; border-radius: 8px; border: 1px solid var(--assignments-border);">
                            <div style="font-size: 12px; color: var(--assignments-text-muted); margin-bottom: 4px;">Points</div>
                            <div style="font-size: 16px; font-weight: 600;">${assignment.points}</div>
                        </div>
                    ` : ''}
                    ${assignment.isGraded && assignment.grade ? `
                        <div style="background: var(--assignments-bg-secondary); padding: 16px; border-radius: 8px; border: 1px solid var(--assignments-border);">
                            <div style="font-size: 12px; color: var(--assignments-text-muted); margin-bottom: 4px;">Grade</div>
                            <div style="font-size: 16px; font-weight: 600; color: var(--assignments-success);">${assignment.grade}</div>
                        </div>
                    ` : ''}
                </div>
                
                ${!assignment.isSubmitted ? `
                    <div style="margin-top: 24px; padding-top: 24px; border-top: 1px solid var(--assignments-border);">
                        <button class="assignments-submit-btn" onclick="assignmentsApp.submitAssignment('${assignment.id}')">
                            Submit Assignment
                        </button>
                    </div>
                ` : ''}
                
                <div style="margin-top: 24px;">
                    <button class="assignments-secondary-btn" onclick="assignmentsApp.hideDetailModal()">Close</button>
                </div>
            </div>
        `;

        modal.style.display = 'flex';
    }

    hideDetailModal() {
        const modal = document.getElementById('assignments-detail-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    submitAssignment(assignmentId) {
        console.log('[Assignments] Submitting assignment:', assignmentId);
        // TODO: Open file picker and handle submission
        alert(`Submitting assignment...\n\nThis will:\n- Open file picker\n- Allow file upload\n- Link to Files app\n- Mark as submitted\n\nWill be fully implemented next.`);
    }

    // Utility Methods
    formatDateHeader(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        if (date.toDateString() === today.toDateString()) {
            return 'Today';
        } else if (date.toDateString() === tomorrow.toDateString()) {
            return 'Tomorrow';
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        }
    }

    formatDueDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return date.toLocaleDateString() + ` (${Math.abs(diffDays)} days ago)`;
        } else if (diffDays === 0) {
            return 'Today at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays === 1) {
            return 'Tomorrow at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else if (diffDays <= 7) {
            return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        } else {
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) + ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        }
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
let assignmentsApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        assignmentsApp = new AssignmentsApp();
        window.assignmentsApp = assignmentsApp;
    });
} else {
    assignmentsApp = new AssignmentsApp();
    window.assignmentsApp = assignmentsApp;
}
