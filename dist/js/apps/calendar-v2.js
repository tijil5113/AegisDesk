// CALENDAR V2 - World-Class OS Calendar System
// Beautiful, powerful, intelligent calendar for AegisDesk

class CalendarApp {
    constructor() {
        this.windowId = 'calendar';
        this.engine = new CalendarEngine();
        this.currentView = 'month';
        this.selectedDate = new Date();
        this.currentEvent = null;
        this.init();
    }

    init() {
        console.log('[Calendar] Initializing...');
        this.setupEventListeners();
        this.setupEngineCallbacks();
        this.render();
    }

    setupEngineCallbacks() {
        // Hook into engine callbacks
        this.engine.onDateChange = (date) => {
            this.selectedDate = date;
            this.updateDateDisplay();
            this.render();
        };

        this.engine.onViewChange = (view) => {
            this.currentView = view;
            this.switchView(view);
        };

        this.engine.onTimeUpdate = () => {
            if (this.currentView === 'day' || this.currentView === 'week') {
                this.render();
            }
        };
    }

    setupEventListeners() {
        // Navigation
        const prevBtn = document.getElementById('calendar-prev');
        const nextBtn = document.getElementById('calendar-next');
        const todayBtn = document.getElementById('calendar-today');
        const createBtn = document.getElementById('calendar-create-btn');
        const syncBtn = document.getElementById('calendar-sync-btn');

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigatePrev());
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateNext());
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());
        if (createBtn) createBtn.addEventListener('click', () => this.showEventEditor());
        if (syncBtn) syncBtn.addEventListener('click', () => this.syncWithGoogle());

        // View switcher
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.calendar-view-btn').dataset.view;
                this.switchView(view);
            });
        });

        // Modal overlay - close on click outside
        const modal = document.getElementById('calendar-event-modal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.hideEventEditor();
                }
            });
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            if (e.key === 'ArrowLeft') this.navigatePrev();
            if (e.key === 'ArrowRight') this.navigateNext();
            if (e.key === 't' || e.key === 'T') this.goToToday();
            if (e.key === 'n' || e.key === 'N') this.showEventEditor();
            if (e.key === 'Escape') this.hideEventEditor();
        });
    }

    render() {
        this.updateDateDisplay();
        
        switch (this.currentView) {
            case 'month':
                this.renderMonthView();
                break;
            case 'week':
                this.renderWeekView();
                break;
            case 'day':
                this.renderDayView();
                break;
            case 'agenda':
                this.renderAgendaView();
                break;
            case 'timeline':
                this.renderTimelineView();
                break;
        }
    }

    switchView(view) {
        this.currentView = view;
        this.engine.setView(view);
        
        // Update active button
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        // Hide all views
        document.querySelectorAll('.calendar-view').forEach(v => {
            v.style.display = 'none';
        });

        // Show active view
        const activeView = document.getElementById(`calendar-${view}-view`);
        if (activeView) {
            activeView.style.display = 'block';
        }

        // Update subtitle
        const subtitle = document.getElementById('calendar-subtitle');
        if (subtitle) {
            const viewNames = {
                month: 'Month View',
                week: 'Week View',
                day: 'Day View',
                agenda: 'Agenda View',
                timeline: 'Timeline View'
            };
            subtitle.textContent = viewNames[view] || 'Your Schedule';
        }

        this.render();
    }

    updateDateDisplay() {
        const display = document.getElementById('calendar-date-display');
        if (!display) return;

        const date = this.engine.currentDate;
        const options = { year: 'numeric', month: 'long' };
        
        if (this.currentView === 'day') {
            options.weekday = 'long';
            options.day = 'numeric';
        } else if (this.currentView === 'week') {
            // Show week range
            const weekStart = this.getWeekStart(date);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            
            display.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
            return;
        }
        
        display.textContent = date.toLocaleDateString('en-US', options);
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const diff = d.getDate() - day;
        return new Date(d.setDate(diff));
    }

    // Month View
    renderMonthView() {
        const container = document.getElementById('calendar-month-grid');
        if (!container) return;

        const date = this.engine.currentDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = this.engine.getMonthDays(year, month);
        const events = this.engine.getEventsForMonth(year, month);

        container.innerHTML = days.map(day => {
            const dayEvents = events.filter(e => {
                const eventDate = new Date(e.start);
                return eventDate.getFullYear() === day.date.getFullYear() &&
                       eventDate.getMonth() === day.date.getMonth() &&
                       eventDate.getDate() === day.date.getDate();
            });

            return `
                <div class="calendar-day-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" 
                     onclick="calendarApp.openDay('${day.date.toISOString()}')">
                    <div class="calendar-day-number">${day.date.getDate()}</div>
                    <div class="calendar-day-events">
                        ${dayEvents.slice(0, 3).map(event => `
                            <div class="calendar-event-mini" 
                                 style="background: ${event.color};"
                                 onclick="event.stopPropagation(); calendarApp.openEvent('${event.id}')">
                                ${this.escapeHtml(event.title)}
                            </div>
                        `).join('')}
                        ${dayEvents.length > 3 ? `
                            <div class="calendar-event-dot" style="background: ${dayEvents[3].color};"></div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    // Week View
    renderWeekView() {
        const header = document.getElementById('calendar-week-header');
        const timeline = document.getElementById('calendar-week-timeline');
        if (!header || !timeline) return;

        const date = this.engine.currentDate;
        const weekStart = this.getWeekStart(date);
        const weekDays = [];
        
        for (let i = 0; i < 7; i++) {
            const day = new Date(weekStart);
            day.setDate(weekStart.getDate() + i);
            weekDays.push(day);
        }

        const events = this.engine.getEventsForWeek(date.getFullYear(), date.getMonth(), date.getDate());

        // Header
        header.innerHTML = `
            <div></div>
            ${weekDays.map(day => `
                <div class="calendar-week-day-header ${this.isToday(day) ? 'today' : ''}">
                    <div class="calendar-week-day-name">${day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="calendar-week-day-number">${day.getDate()}</div>
                </div>
            `).join('')}
        `;

        // Timeline
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimePosition = (currentHour + currentMinute / 60) * 60;

        timeline.innerHTML = `
            <div class="calendar-time-column">
                ${hours.map(hour => `
                    <div class="calendar-time-slot">${this.formatHour(hour)}</div>
                `).join('')}
            </div>
            ${weekDays.map((day, dayIndex) => {
                const dayEvents = events.filter(e => this.isSameDay(new Date(e.start), day));
                
                return `
                    <div class="calendar-week-column" style="position: relative;">
                        ${hours.map(hour => `
                            <div class="calendar-week-hour ${this.isToday(day) && hour === currentHour ? 'current-hour' : ''}"></div>
                        `).join('')}
                        ${dayEvents.map(event => {
                            const start = new Date(event.start);
                            const end = new Date(event.end);
                            const startMinutes = start.getHours() * 60 + start.getMinutes();
                            const endMinutes = end.getHours() * 60 + end.getMinutes();
                            const duration = endMinutes - startMinutes;
                            const top = (startMinutes / 60) * 60;
                            const height = (duration / 60) * 60;

                            return `
                                <div class="calendar-event-block" 
                                     style="top: ${top}px; height: ${height}px; background: ${event.color};"
                                     onclick="calendarApp.openEvent('${event.id}')">
                                    ${this.escapeHtml(event.title)}
                                    ${event.location ? `<div style="font-size: 10px; opacity: 0.9;">📍 ${this.escapeHtml(event.location)}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('')}
        `;
    }

    // Day View
    renderDayView() {
        const header = document.getElementById('calendar-day-header');
        const timeline = document.getElementById('calendar-day-timeline');
        if (!header || !timeline) return;

        const date = this.engine.currentDate;
        const events = this.engine.getEventsForDay(date.getFullYear(), date.getMonth(), date.getDate());

        header.innerHTML = `
            <div class="calendar-agenda-date">
                ${date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </div>
        `;

        const hours = Array.from({ length: 24 }, (_, i) => i);
        const now = new Date();
        const isToday = this.isToday(date);
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimePosition = (currentHour + currentMinute / 60) * 60;

        timeline.innerHTML = `
            <div class="calendar-time-column">
                ${hours.map(hour => `
                    <div class="calendar-time-slot">${this.formatHour(hour)}</div>
                `).join('')}
            </div>
            <div class="calendar-day-column" style="position: relative;">
                ${hours.map(hour => `
                    <div class="calendar-week-hour ${isToday && hour === currentHour ? 'current-hour' : ''}"></div>
                `).join('')}
                ${isToday ? `
                    <div class="calendar-current-time" style="top: ${currentTimePosition}px;"></div>
                ` : ''}
                ${events.map(event => {
                    const start = new Date(event.start);
                    const end = new Date(event.end);
                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const endMinutes = end.getHours() * 60 + end.getMinutes();
                    const duration = endMinutes - startMinutes;
                    const top = (startMinutes / 60) * 60;
                    const height = (duration / 60) * 60;

                    return `
                        <div class="calendar-event-block" 
                             style="top: ${top}px; height: ${height}px; background: ${event.color}; z-index: 5;"
                             onclick="calendarApp.openEvent('${event.id}')">
                            <div style="font-weight: 600;">${this.escapeHtml(event.title)}</div>
                            <div style="font-size: 11px; opacity: 0.9;">${this.formatTime(event.start)} - ${this.formatTime(event.end)}</div>
                            ${event.location ? `<div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">📍 ${this.escapeHtml(event.location)}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    // Agenda View
    renderAgendaView() {
        const container = document.getElementById('calendar-agenda-list');
        if (!container) return;

        const now = new Date();
        const futureDate = new Date(now);
        futureDate.setDate(futureDate.getDate() + 30);
        const events = this.engine.getEventsForDateRange(now, futureDate)
            .filter(e => new Date(e.start).getTime() >= now.getTime())
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

        if (events.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 80px 20px; color: var(--calendar-text-muted);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" style="margin-bottom: 16px;">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: var(--calendar-text);">No Upcoming Events</h3>
                    <p>Create your first event to get started!</p>
                </div>
            `;
            return;
        }

        // Group by date
        const grouped = {};
        events.forEach(event => {
            const dateKey = this.engine.formatDateKey(event.start);
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(event);
        });

        container.innerHTML = Object.keys(grouped).map(dateKey => {
            const date = new Date(dateKey + 'T00:00:00');
            return `
                <div class="calendar-agenda-group">
                    <div class="calendar-agenda-date">${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</div>
                    ${grouped[dateKey].map(event => `
                        <div class="calendar-agenda-item" onclick="calendarApp.openEvent('${event.id}')">
                            <div class="calendar-agenda-item-time">${this.formatTime(event.start)} - ${this.formatTime(event.end)}</div>
                            <div class="calendar-agenda-item-title">${this.escapeHtml(event.title)}</div>
                            ${event.location ? `<div class="calendar-agenda-item-meta">📍 ${this.escapeHtml(event.location)}</div>` : ''}
                            ${event.description ? `<div class="calendar-agenda-item-meta" style="margin-top: 4px;">${this.escapeHtml(event.description.substring(0, 100))}${event.description.length > 100 ? '...' : ''}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            `;
        }).join('');
    }

    // Timeline View
    renderTimelineView() {
        const container = document.getElementById('calendar-timeline-container');
        if (!container) return;

        container.innerHTML = `
            <div style="text-align: center; padding: 80px 20px; color: var(--calendar-text-muted);">
                <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" style="margin-bottom: 16px;">
                    <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
                </svg>
                <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: var(--calendar-text);">Timeline View</h3>
                <p>Coming soon! This view will show a horizontal timeline for semester planning.</p>
            </div>
        `;
    }

    // Navigation
    navigatePrev() {
        switch (this.currentView) {
            case 'month':
                this.engine.navigateMonth(-1);
                break;
            case 'week':
                this.engine.navigateWeek(-1);
                break;
            case 'day':
                this.engine.navigateDay(-1);
                break;
        }
    }

    navigateNext() {
        switch (this.currentView) {
            case 'month':
                this.engine.navigateMonth(1);
                break;
            case 'week':
                this.engine.navigateWeek(1);
                break;
            case 'day':
                this.engine.navigateDay(1);
                break;
        }
    }

    goToToday() {
        this.engine.goToToday();
    }

    openDay(dateString) {
        const date = new Date(dateString);
        this.engine.navigateToDate(date);
        this.switchView('day');
    }

    openEvent(eventId) {
        const event = this.engine.getEvent(eventId);
        if (event) {
            this.currentEvent = event;
            this.showEventEditor(event);
        }
    }

    // Event Editor
    showEventEditor(event = null) {
        const modal = document.getElementById('calendar-event-modal');
        const editor = document.getElementById('calendar-event-editor');
        const title = document.getElementById('calendar-event-modal-title');
        if (!modal || !editor || !title) return;

        this.currentEvent = event;

        if (event) {
            title.textContent = 'Edit Event';
        } else {
            title.textContent = 'New Event';
            event = {
                title: '',
                description: '',
                start: new Date(this.selectedDate),
                end: new Date(this.selectedDate),
                allDay: false,
                color: '#6366f1',
                category: 'personal',
                location: '',
                reminders: []
            };
        }

        const startDate = new Date(event.start);
        const endDate = new Date(event.end);

        editor.innerHTML = `
            <div class="calendar-form-group">
                <label>Title * (or use natural language: "Math exam tomorrow 10am")</label>
                <input type="text" class="calendar-input" id="event-title" value="${this.escapeHtml(event.title)}" 
                       placeholder='e.g., "Math Exam" or "Meeting tomorrow at 2pm"' 
                       onkeypress="if(event.key==='Enter' && !event.shiftKey) { calendarApp.parseNaturalLanguageInput(); }">
                <div style="font-size: 12px; color: var(--calendar-text-muted); margin-top: 4px;">
                    💡 Tip: Type "Math exam tomorrow 10am" and press Enter to auto-fill
                </div>
            </div>
            <div class="calendar-form-row">
                <div class="calendar-form-group">
                    <label>Start Date *</label>
                    <input type="date" class="calendar-input" id="event-start-date" value="${startDate.toISOString().split('T')[0]}">
                </div>
                <div class="calendar-form-group">
                    <label>Start Time</label>
                    <input type="time" class="calendar-input" id="event-start-time" value="${this.formatTimeForInput(startDate)}">
                </div>
            </div>
            <div class="calendar-form-row">
                <div class="calendar-form-group">
                    <label>End Date *</label>
                    <input type="date" class="calendar-input" id="event-end-date" value="${endDate.toISOString().split('T')[0]}">
                </div>
                <div class="calendar-form-group">
                    <label>End Time</label>
                    <input type="time" class="calendar-input" id="event-end-time" value="${this.formatTimeForInput(endDate)}">
                </div>
            </div>
            <div class="calendar-form-group">
                <label>
                    <input type="checkbox" id="event-all-day" ${event.allDay ? 'checked' : ''} style="margin-right: 8px;">
                    All Day
                </label>
            </div>
            <div class="calendar-form-row">
                <div class="calendar-form-group">
                    <label>Color</label>
                    <input type="color" class="calendar-input" id="event-color" value="${event.color}" style="height: 40px; padding: 4px;">
                </div>
                <div class="calendar-form-group">
                    <label>Category</label>
                    <select class="calendar-select" id="event-category">
                        <option value="personal" ${event.category === 'personal' ? 'selected' : ''}>Personal</option>
                        <option value="class" ${event.category === 'class' ? 'selected' : ''}>Class</option>
                        <option value="exam" ${event.category === 'exam' ? 'selected' : ''}>Exam</option>
                        <option value="assignment" ${event.category === 'assignment' ? 'selected' : ''}>Assignment</option>
                        <option value="meeting" ${event.category === 'meeting' ? 'selected' : ''}>Meeting</option>
                    </select>
                </div>
            </div>
            <div class="calendar-form-group">
                <label>Location</label>
                <input type="text" class="calendar-input" id="event-location" value="${this.escapeHtml(event.location)}" placeholder="e.g., Room 301">
            </div>
            <div class="calendar-form-group">
                <label>Description</label>
                <textarea class="calendar-textarea" id="event-description" placeholder="Add notes...">${this.escapeHtml(event.description)}</textarea>
            </div>
            <div class="calendar-modal-actions">
                <button class="calendar-btn calendar-btn-secondary" onclick="calendarApp.hideEventEditor()">Cancel</button>
                ${event.id ? `<button class="calendar-btn calendar-btn-secondary" onclick="calendarApp.deleteEvent('${event.id}')" style="background: var(--calendar-error);">Delete</button>` : ''}
                <button class="calendar-btn calendar-btn-primary" onclick="calendarApp.saveEvent()">${event.id ? 'Update' : 'Create'} Event</button>
            </div>
        `;

        modal.style.display = 'flex';
        
        // Focus title input
        setTimeout(() => {
            const titleInput = document.getElementById('event-title');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    parseNaturalLanguageInput() {
        const titleInput = document.getElementById('event-title');
        if (!titleInput) return;

        const text = titleInput.value.trim();
        if (!text) return;

        // Simple natural language parser
        const parsed = this.parseNaturalLanguage(text);
        
        if (parsed) {
            const startDateInput = document.getElementById('event-start-date');
            const startTimeInput = document.getElementById('event-start-time');
            const endDateInput = document.getElementById('event-end-date');
            const endTimeInput = document.getElementById('event-end-time');

            if (startDateInput) {
                startDateInput.value = parsed.start.toISOString().split('T')[0];
            }
            if (startTimeInput) {
                startTimeInput.value = this.formatTimeForInput(parsed.start);
            }
            if (endDateInput) {
                endDateInput.value = parsed.end ? parsed.end.toISOString().split('T')[0] : parsed.start.toISOString().split('T')[0];
            }
            if (endTimeInput) {
                endTimeInput.value = parsed.end ? this.formatTimeForInput(parsed.end) : this.formatTimeForInput(new Date(parsed.start.getTime() + 3600000)); // +1 hour default
            }

            // Extract title (remove time/date keywords)
            const title = text.replace(/\b(tomorrow|today|next week|at|on|am|pm|\d{1,2}:\d{2}|\d{1,2}\/\d{1,2})\b/gi, '').trim();
            if (title && titleInput) {
                titleInput.value = title;
            }

            // Show confirmation
            if (window.notificationSystem) {
                window.notificationSystem.success('Event Parsed', 'Date and time extracted from your input!');
            }
        }
    }

    parseNaturalLanguage(text) {
        const lowerText = text.toLowerCase();
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const result = {
            start: new Date(now),
            end: null
        };

        // Parse "tomorrow"
        if (lowerText.includes('tomorrow')) {
            result.start = new Date(tomorrow);
            result.end = new Date(tomorrow);
        }

        // Parse time (e.g., "10am", "2pm", "14:30")
        const timePatterns = [
            /(\d{1,2}):(\d{2})/g,
            /(\d{1,2})\s*(am|pm)/gi
        ];

        timePatterns.forEach(pattern => {
            const match = text.match(pattern);
            if (match) {
                const timeStr = match[0];
                let hour, minute = 0;

                if (timeStr.includes(':')) {
                    const [h, m] = timeStr.split(':');
                    hour = parseInt(h);
                    minute = parseInt(m);
                } else {
                    const ampmMatch = timeStr.match(/(\d{1,2})\s*(am|pm)/i);
                    if (ampmMatch) {
                        hour = parseInt(ampmMatch[1]);
                        const ampm = ampmMatch[2].toLowerCase();
                        if (ampm === 'pm' && hour !== 12) hour += 12;
                        if (ampm === 'am' && hour === 12) hour = 0;
                    }
                }

                result.start.setHours(hour, minute, 0, 0);
                result.end = new Date(result.start);
                result.end.setHours(result.start.getHours() + 1); // Default 1 hour duration
            }
        });

        return result;
    }

    hideEventEditor() {
        const modal = document.getElementById('calendar-event-modal');
        if (modal) {
            modal.style.display = 'none';
            this.currentEvent = null;
        }
    }

    saveEvent() {
        const titleInput = document.getElementById('event-title');
        const startDateInput = document.getElementById('event-start-date');
        const startTimeInput = document.getElementById('event-start-time');
        const endDateInput = document.getElementById('event-end-date');
        const endTimeInput = document.getElementById('event-end-time');
        const allDayCheckbox = document.getElementById('event-all-day');
        const colorInput = document.getElementById('event-color');
        const categoryInput = document.getElementById('event-category');
        const locationInput = document.getElementById('event-location');
        const descriptionInput = document.getElementById('event-description');

        if (!titleInput || !startDateInput || !endDateInput) return;

        const title = titleInput.value.trim();
        if (!title) {
            alert('Please enter a title');
            return;
        }

        const allDay = allDayCheckbox?.checked || false;
        
        let start = new Date(startDateInput.value);
        if (!allDay && startTimeInput) {
            const [hours, minutes] = startTimeInput.value.split(':');
            start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            start.setHours(0, 0, 0, 0);
        }

        let end = new Date(endDateInput.value);
        if (!allDay && endTimeInput) {
            const [hours, minutes] = endTimeInput.value.split(':');
            end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            end.setHours(23, 59, 59, 999);
        }

        const eventData = {
            title: title,
            description: descriptionInput?.value.trim() || '',
            start: start,
            end: end,
            allDay: allDay,
            color: colorInput?.value || '#6366f1',
            category: categoryInput?.value || 'personal',
            location: locationInput?.value.trim() || '',
            reminders: []
        };

        if (this.currentEvent && this.currentEvent.id) {
            this.engine.updateEvent(this.currentEvent.id, eventData);
        } else {
            this.engine.addEvent(eventData);
        }

        this.hideEventEditor();
        this.render();
    }

    deleteEvent(eventId) {
        if (confirm('Are you sure you want to delete this event?')) {
            this.engine.deleteEvent(eventId);
            this.hideEventEditor();
            this.render();
        }
    }

    syncWithGoogle() {
        console.log('[Calendar] Syncing with Google Calendar...');
        // TODO: Implement Google OAuth and Calendar API integration
        alert('Google Calendar sync will be implemented soon!\n\nThis will:\n- Authenticate with Google\n- Sync events two-way\n- Show "Synced from Google" badge\n- Handle conflicts');
    }

    // Utility Methods
    formatHour(hour) {
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:00 ${ampm}`;
    }

    formatTime(date) {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    formatTimeForInput(date) {
        const d = new Date(date);
        const hours = String(d.getHours()).padStart(2, '0');
        const minutes = String(d.getMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    }

    isToday(date) {
        return this.engine.isSameDay(date, new Date());
    }

    isSameDay(date1, date2) {
        return this.engine.isSameDay(date1, date2);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
let calendarApp;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        calendarApp = new CalendarApp();
        window.calendarApp = calendarApp;
    });
} else {
    calendarApp = new CalendarApp();
    window.calendarApp = calendarApp;
}
