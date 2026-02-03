// CLASSROOM - Google Classroom-style Module
// Full Classroom clone inside AegisDesk

class ClassroomApp {
    constructor() {
        this.windowId = 'classroom';
        this.storageKey = 'aegis_classroom_data';
        this.currentCourse = null;
        this.data = this.loadData();
        this.init();
    }

    init() {
        console.log('[Classroom] Initializing...');
        this.setupEventListeners();
        this.renderCourses();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                return JSON.parse(stored);
            }
        } catch (e) {
            console.error('[Classroom] Failed to load data:', e);
        }
        
        // Default data structure
        return {
            courses: [],
            students: [],
            instructors: []
        };
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.data));
        } catch (e) {
            console.error('[Classroom] Failed to save data:', e);
        }
    }

    setupEventListeners() {
        // Join button
        const joinBtn = document.getElementById('classroom-join-btn');
        if (joinBtn) {
            joinBtn.addEventListener('click', () => this.showJoinDialog());
        }

        // Create button
        const createBtn = document.getElementById('classroom-create-btn');
        if (createBtn) {
            createBtn.addEventListener('click', () => this.showCreateDialog());
        }

        // Sync button
        const syncBtn = document.getElementById('classroom-sync-btn');
        if (syncBtn) {
            syncBtn.addEventListener('click', () => this.syncWithGoogleClassroom());
        }

        // Modal overlays - close on click outside
        document.querySelectorAll('.classroom-modal-overlay').forEach(overlay => {
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) {
                    overlay.style.display = 'none';
                }
            });
        });

        // Join code input - auto-uppercase
        const joinCodeInput = document.getElementById('classroom-join-code');
        if (joinCodeInput) {
            joinCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }
    }

    renderCourses() {
        const container = document.getElementById('classroom-courses-grid');
        const emptyState = document.getElementById('classroom-empty-state');
        
        if (!container) return;

        if (this.data.courses.length === 0) {
            container.style.display = 'none';
            if (emptyState) emptyState.style.display = 'block';
            return;
        }

        container.style.display = 'grid';
        if (emptyState) emptyState.style.display = 'none';

        container.innerHTML = this.data.courses.map(course => this.createCourseCard(course)).join('');
        
        // Add click handlers to course cards
        container.querySelectorAll('.classroom-course-card').forEach((card, index) => {
            card.addEventListener('click', () => {
                this.openCourse(this.data.courses[index]);
            });
        });
    }

    createCourseCard(course) {
        const colors = [
            'linear-gradient(135deg, #4285f4 0%, #1967d2 100%)',
            'linear-gradient(135deg, #34a853 0%, #137333 100%)',
            'linear-gradient(135deg, #fbbc04 0%, #ea8600 100%)',
            'linear-gradient(135deg, #ea4335 0%, #c5221f 100%)',
            'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
            'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
        ];
        const colorIndex = course.id ? (course.id % colors.length) : 0;
        const bgColor = course.bgColor || colors[colorIndex];

        return `
            <div class="classroom-course-card" data-course-id="${course.id}">
                <div class="classroom-course-header" style="background: ${bgColor};">
                    <div class="classroom-course-title">${this.escapeHtml(course.name)}</div>
                </div>
                <div class="classroom-course-body">
                    <div class="classroom-course-info">
                        ${course.section ? `<div class="classroom-course-section">${this.escapeHtml(course.section)}</div>` : ''}
                        ${course.subject ? `<div class="classroom-course-subject">${this.escapeHtml(course.subject)}</div>` : ''}
                        ${course.room ? `<div class="classroom-course-section" style="margin-top: 8px;">📍 ${this.escapeHtml(course.room)}</div>` : ''}
                    </div>
                </div>
                <div class="classroom-course-footer">
                    <div class="classroom-course-code">${course.code || 'N/A'}</div>
                    <button class="classroom-course-menu" onclick="event.stopPropagation(); classroomApp.showCourseMenu('${course.id}')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <circle cx="12" cy="12" r="1"></circle>
                            <circle cx="12" cy="5" r="1"></circle>
                            <circle cx="12" cy="19" r="1"></circle>
                        </svg>
                    </button>
                </div>
            </div>
        `;
    }

    // Dialog Methods
    showJoinDialog() {
        const modal = document.getElementById('classroom-join-modal');
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('classroom-join-code');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }

    hideJoinDialog() {
        const modal = document.getElementById('classroom-join-modal');
        if (modal) {
            modal.style.display = 'none';
            const input = document.getElementById('classroom-join-code');
            if (input) input.value = '';
        }
    }

    showCreateDialog() {
        const modal = document.getElementById('classroom-create-modal');
        if (modal) {
            modal.style.display = 'flex';
            const input = document.getElementById('classroom-create-name');
            if (input) {
                setTimeout(() => input.focus(), 100);
            }
        }
    }

    hideCreateDialog() {
        const modal = document.getElementById('classroom-create-modal');
        if (modal) {
            modal.style.display = 'none';
            // Clear form
            ['classroom-create-name', 'classroom-create-section', 'classroom-create-subject', 'classroom-create-room'].forEach(id => {
                const input = document.getElementById(id);
                if (input) input.value = '';
            });
        }
    }

    // Action Methods
    joinClass() {
        const codeInput = document.getElementById('classroom-join-code');
        if (!codeInput) return;

        const code = codeInput.value.trim().toUpperCase();
        if (!code || code.length < 4) {
            alert('Please enter a valid class code');
            return;
        }

        // TODO: Actually join class via API or local search
        // For now, show success message
        console.log('[Classroom] Joining class with code:', code);
        alert(`Attempting to join class with code: ${code}\n\nNote: This will be connected to Google Classroom sync when implemented.`);
        
        this.hideJoinDialog();
    }

    createClass() {
        const nameInput = document.getElementById('classroom-create-name');
        const sectionInput = document.getElementById('classroom-create-section');
        const subjectInput = document.getElementById('classroom-create-subject');
        const roomInput = document.getElementById('classroom-create-room');

        if (!nameInput) return;

        const name = nameInput.value.trim();
        if (!name) {
            alert('Please enter a class name');
            return;
        }

        const newCourse = {
            id: Date.now().toString(),
            name: name,
            section: sectionInput?.value.trim() || '',
            subject: subjectInput?.value.trim() || '',
            room: roomInput?.value.trim() || '',
            code: this.generateClassCode(),
            bgColor: this.getRandomColor(),
            createdAt: Date.now(),
            assignments: [],
            materials: [],
            announcements: [],
            students: [],
            instructors: []
        };

        this.data.courses.push(newCourse);
        this.saveData();
        this.renderCourses();
        this.hideCreateDialog();

        console.log('[Classroom] Created new class:', newCourse);
    }

    generateClassCode() {
        // Generate a 6-character alphanumeric code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }

    getRandomColor() {
        const colors = [
            'linear-gradient(135deg, #4285f4 0%, #1967d2 100%)',
            'linear-gradient(135deg, #34a853 0%, #137333 100%)',
            'linear-gradient(135deg, #fbbc04 0%, #ea8600 100%)',
            'linear-gradient(135deg, #ea4335 0%, #c5221f 100%)',
            'linear-gradient(135deg, #9c27b0 0%, #7b1fa2 100%)',
            'linear-gradient(135deg, #00bcd4 0%, #0097a7 100%)',
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    openCourse(course) {
        console.log('[Classroom] Opening course:', course);
        this.currentCourse = course;
        // TODO: Open course detail view with Stream, Assignments, Materials, People
        // For now, show alert
        alert(`Opening course: ${course.name}\n\nCourse detail view will show:\n- Stream (announcements)\n- Assignments\n- Materials\n- People (students/instructors)\n\nThis will be fully implemented next.`);
    }

    showCourseMenu(courseId) {
        console.log('[Classroom] Showing menu for course:', courseId);
        // TODO: Show context menu with options like Archive, Delete, Settings
    }

    syncWithGoogleClassroom() {
        console.log('[Classroom] Syncing with Google Classroom...');
        // TODO: Implement Google OAuth and Classroom API integration
        alert('Google Classroom sync will be implemented soon!\n\nThis will:\n- Authenticate with Google\n- Fetch all your courses\n- Sync assignments and announcements\n- Keep everything in sync');
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
let classroomApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        classroomApp = new ClassroomApp();
        window.classroomApp = classroomApp;
    });
} else {
    classroomApp = new ClassroomApp();
    window.classroomApp = classroomApp;
}
