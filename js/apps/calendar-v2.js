// CALENDAR V2 - Premium Calendar System
// Full-featured calendar with AI assistant, drag/drop, themes, and more

class CalendarApp {
    constructor() {
        this.windowId = 'calendar';
        this.engine = null;
        this.currentView = 'month';
        this.selectedDate = new Date();
        this.currentEvent = null;
        this.draggedEvent = null;
        this.dragStartPos = null;
        this.searchQuery = '';
        this.sidebarCollapsed = false;
        this.aiPanelCollapsed = true;
        this.contextMenuEvent = null;
        this.init();
    }

    async init() {
        console.log('[Calendar] Initializing premium calendar...');
        this.engine = new CalendarEngine();
        
        // Wait for engine initialization
        await this.engine.init();
        
        this.setupEventListeners();
        this.setupEngineCallbacks();
        this.setupDragAndDrop();
        this.setupContextMenu();
        this.renderSidebar();
        this.render();
        
        // Load theme
        this.applyTheme(this.engine.settings.theme || 'default');
    }

    setupEngineCallbacks() {
        this.engine.onDateChange = (date) => {
            this.selectedDate = date;
            this.updateDateDisplay();
            this.render();
            this.renderSidebar();
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

        this.engine.onEventChange = (action, event, oldEvent) => {
            this.render();
            this.renderSidebar();
        };
    }

    setupEventListeners() {
        // Navigation
        const prevBtn = document.getElementById('calendar-prev');
        const nextBtn = document.getElementById('calendar-next');
        const todayBtn = document.getElementById('calendar-today');
        const createBtn = document.getElementById('calendar-create-btn');
        const quickCreateBtn = document.getElementById('calendar-quick-create');
        const settingsBtn = document.getElementById('calendar-settings-btn');
        const helpBtn = document.getElementById('calendar-help-btn');
        const searchInput = document.getElementById('calendar-search');
        const sidebarToggle = document.getElementById('calendar-sidebar-toggle');
        const aiToggle = document.getElementById('calendar-ai-toggle');

        if (prevBtn) prevBtn.addEventListener('click', () => this.navigatePrev());
        if (nextBtn) nextBtn.addEventListener('click', () => this.navigateNext());
        if (todayBtn) todayBtn.addEventListener('click', () => this.goToToday());
        if (createBtn) createBtn.addEventListener('click', () => this.showEventEditor());
        if (quickCreateBtn) quickCreateBtn.addEventListener('click', () => this.showEventEditor());
        if (settingsBtn) settingsBtn.addEventListener('click', () => this.showSettings());
        if (helpBtn) helpBtn.addEventListener('click', () => this.showHelp());
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchQuery = e.target.value.toLowerCase();
                this.render();
            });
        }
        if (sidebarToggle) {
            sidebarToggle.addEventListener('click', () => this.toggleSidebar());
        }
        if (aiToggle) {
            aiToggle.addEventListener('click', () => this.toggleAIPanel());
        }

        // View switcher
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const view = e.target.closest('.calendar-view-btn').dataset.view;
                this.switchView(view);
            });
        });

        // AI action buttons
        document.querySelectorAll('.calendar-ai-action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const action = e.target.dataset.action;
                this.handleAIAction(action);
            });
        });

        // Modal overlays
        document.querySelectorAll('.calendar-modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    if (modal.id === 'calendar-event-modal') this.hideEventEditor();
                    if (modal.id === 'calendar-settings-modal') this.hideSettings();
                    if (modal.id === 'calendar-help-modal') this.hideHelp();
                }
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                // Allow shortcuts in search
                if (e.target.id === 'calendar-search' && e.key === 'Escape') {
                    e.target.value = '';
                    this.searchQuery = '';
                    this.render();
                }
                return;
            }
            
            if (e.ctrlKey || e.metaKey) {
                if (e.key === 'z' && !e.shiftKey) {
                    e.preventDefault();
                    this.undo();
                } else if ((e.key === 'z' && e.shiftKey) || (e.key === 'y')) {
                    e.preventDefault();
                    this.redo();
                } else if (e.key === 'n') {
                    e.preventDefault();
                    this.showEventEditor();
                } else if (e.key === 'e') {
                    e.preventDefault();
                    this.exportCalendar();
                } else if (e.key === 'i') {
                    e.preventDefault();
                    this.importCalendar();
                }
            } else {
                if (e.key === 'ArrowLeft') this.navigatePrev();
                if (e.key === 'ArrowRight') this.navigateNext();
                if (e.key === 't' || e.key === 'T') this.goToToday();
                if (e.key === 'n' || e.key === 'N') this.showEventEditor();
                if (e.key === 'Escape') {
                    this.hideEventEditor();
                    this.hideSettings();
                    this.hideHelp();
                    this.hideContextMenu();
                }
            }
        });

        // Click outside to close context menu
        document.addEventListener('click', (e) => {
            const contextMenu = document.getElementById('calendar-context-menu');
            if (contextMenu && !contextMenu.contains(e.target) && !e.target.closest('.calendar-event-block, .calendar-event-mini, .calendar-agenda-item')) {
                this.hideContextMenu();
            }
        });
    }

    setupDragAndDrop() {
        // Drag and drop is set up in render methods
    }

    setupContextMenu() {
        // Context menu is handled in showContextMenu method
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
        }
    }

    switchView(view) {
        this.currentView = view;
        this.engine.setView(view);
        
        document.querySelectorAll('.calendar-view-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.view === view);
        });

        document.querySelectorAll('.calendar-view').forEach(v => {
            v.style.display = 'none';
        });

        const activeView = document.getElementById(`calendar-${view}-view`);
        if (activeView) {
            activeView.style.display = 'block';
        }

        const subtitle = document.getElementById('calendar-subtitle');
        if (subtitle) {
            const viewNames = {
                month: 'Month View',
                week: 'Week View',
                day: 'Day View',
                agenda: 'Agenda View'
            };
            subtitle.textContent = viewNames[view] || 'Your Schedule';
        }

        this.render();
    }

    updateDateDisplay() {
        const display = document.getElementById('calendar-date-display');
        if (!display) return;

        const date = this.engine.currentDate;
        
        if (this.currentView === 'day') {
            display.textContent = date.toLocaleDateString('en-US', { 
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' 
            });
        } else if (this.currentView === 'week') {
            const weekStart = this.getWeekStart(date);
            const weekEnd = new Date(weekStart);
            weekEnd.setDate(weekStart.getDate() + 6);
            display.textContent = `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        } else {
            display.textContent = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
        }
    }

    getWeekStart(date) {
        const d = new Date(date);
        const day = d.getDay();
        const weekStartOffset = this.engine.settings.weekStartsOn === 'monday' 
            ? (day === 0 ? -6 : 1 - day) 
            : -day;
        d.setDate(d.getDate() + weekStartOffset);
        d.setHours(0, 0, 0, 0);
        return d;
    }

    // Month View
    renderMonthView() {
        const container = document.getElementById('calendar-month-grid');
        const weekdayHeader = document.getElementById('calendar-weekday-header');
        if (!container || !weekdayHeader) return;

        const date = this.engine.currentDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = this.engine.getMonthDays(year, month);
        const events = this.engine.getEventsForMonth(year, month);

        // Render weekday headers
        const weekdays = this.engine.settings.weekStartsOn === 'monday' 
            ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
            : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        weekdayHeader.innerHTML = weekdays.map(day => 
            `<div class="calendar-weekday">${day}</div>`
        ).join('');

        // Render month grid
        container.innerHTML = days.map(day => {
            const dayEvents = this.getFilteredEvents(events.filter(e => {
                const eventDate = new Date(e.start);
                return this.engine.isSameDay(eventDate, day.date);
            }));

            const visibleEvents = dayEvents.slice(0, 3);
            const overflowCount = dayEvents.length - 3;

            return `
                <div class="calendar-day-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${day.isToday ? 'today' : ''}" 
                     data-date="${day.date.toISOString()}"
                     onclick="calendarApp.openDay('${day.date.toISOString()}')">
                    <div class="calendar-day-number">${day.date.getDate()}</div>
                    <div class="calendar-day-events">
                        ${visibleEvents.map(event => `
                            <div class="calendar-event-mini" 
                                 style="background: ${event.color};"
                                 data-event-id="${event.id}"
                                 draggable="true"
                                 onclick="event.stopPropagation(); calendarApp.openEvent('${event.id}')"
                                 oncontextmenu="event.preventDefault(); calendarApp.showContextMenu(event, '${event.id}')">
                                ${this.escapeHtml(event.title)}
                            </div>
                        `).join('')}
                        ${overflowCount > 0 ? `
                            <div class="calendar-event-overflow" onclick="event.stopPropagation(); calendarApp.openDay('${day.date.toISOString()}')">
                                +${overflowCount} more
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

        this.setupDayCellDragAndDrop();
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

        header.innerHTML = `
            <div></div>
            ${weekDays.map(day => `
                <div class="calendar-week-day-header ${this.isToday(day) ? 'today' : ''}">
                    <div class="calendar-week-day-name">${day.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                    <div class="calendar-week-day-number">${day.getDate()}</div>
                </div>
            `).join('')}
        `;

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
                const dayEvents = this.getFilteredEvents(events.filter(e => this.isSameDay(new Date(e.start), day)));
                
                return `
                    <div class="calendar-week-column" data-date="${day.toISOString()}" style="position: relative;">
                        ${hours.map(hour => `
                            <div class="calendar-week-hour ${this.isToday(day) && hour === currentHour ? 'current-hour' : ''}"
                                 onclick="calendarApp.createEventAtTime('${day.toISOString()}', ${hour})"></div>
                        `).join('')}
                        ${this.isToday(day) ? `
                            <div class="calendar-current-time" style="top: ${currentTimePosition}px;"></div>
                        ` : ''}
                        ${dayEvents.map(event => {
                            const start = new Date(event.start);
                            const end = new Date(event.end);
                            const startMinutes = start.getHours() * 60 + start.getMinutes();
                            const endMinutes = end.getHours() * 60 + end.getMinutes();
                            const duration = endMinutes - startMinutes;
                            const top = (startMinutes / 60) * 60;
                            const height = Math.max((duration / 60) * 60, 20);

                            return `
                                <div class="calendar-event-block" 
                                     style="top: ${top}px; height: ${height}px; background: ${event.color};"
                                     data-event-id="${event.id}"
                                     draggable="true"
                                     onclick="calendarApp.openEvent('${event.id}')"
                                     oncontextmenu="event.preventDefault(); calendarApp.showContextMenu(event, '${event.id}')">
                                    <div style="font-weight: 600; font-size: 12px;">${this.escapeHtml(event.title)}</div>
                                    <div style="font-size: 10px; opacity: 0.9;">${this.formatTime(event.start)} - ${this.formatTime(event.end)}</div>
                                    ${event.location ? `<div style="font-size: 9px; opacity: 0.8; margin-top: 2px;">📍 ${this.escapeHtml(event.location)}</div>` : ''}
                                </div>
                            `;
                        }).join('')}
                    </div>
                `;
            }).join('')}
        `;

        this.setupEventBlockDragAndDrop();
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

        const filteredEvents = this.getFilteredEvents(events);

        timeline.innerHTML = `
            <div class="calendar-time-column">
                ${hours.map(hour => `
                    <div class="calendar-time-slot">${this.formatHour(hour)}</div>
                `).join('')}
            </div>
            <div class="calendar-day-column" data-date="${date.toISOString()}" style="position: relative;">
                ${hours.map(hour => `
                    <div class="calendar-week-hour ${isToday && hour === currentHour ? 'current-hour' : ''}"
                         onclick="calendarApp.createEventAtTime('${date.toISOString()}', ${hour})"></div>
                `).join('')}
                ${isToday ? `
                    <div class="calendar-current-time" style="top: ${currentTimePosition}px;"></div>
                ` : ''}
                ${filteredEvents.map(event => {
                    const start = new Date(event.start);
                    const end = new Date(event.end);
                    const startMinutes = start.getHours() * 60 + start.getMinutes();
                    const endMinutes = end.getHours() * 60 + end.getMinutes();
                    const duration = endMinutes - startMinutes;
                    const top = (startMinutes / 60) * 60;
                    const height = Math.max((duration / 60) * 60, 30);

                    return `
                        <div class="calendar-event-block calendar-event-block-detailed" 
                             style="top: ${top}px; height: ${height}px; background: ${event.color}; z-index: 5;"
                             data-event-id="${event.id}"
                             draggable="true"
                             onclick="calendarApp.openEvent('${event.id}')"
                             oncontextmenu="event.preventDefault(); calendarApp.showContextMenu(event, '${event.id}')">
                            <div style="font-weight: 600;">${this.escapeHtml(event.title)}</div>
                            <div style="font-size: 11px; opacity: 0.9;">${this.formatTime(event.start)} - ${this.formatTime(event.end)}</div>
                            ${event.location ? `<div style="font-size: 10px; opacity: 0.8; margin-top: 4px;">📍 ${this.escapeHtml(event.location)}</div>` : ''}
                            ${event.description ? `<div style="font-size: 10px; opacity: 0.7; margin-top: 4px; max-height: 40px; overflow: hidden;">${this.escapeHtml(event.description.substring(0, 60))}${event.description.length > 60 ? '...' : ''}</div>` : ''}
                        </div>
                    `;
                }).join('')}
            </div>
        `;

        this.setupEventBlockDragAndDrop();
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

        const filteredEvents = this.getFilteredEvents(events);

        if (filteredEvents.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 80px 20px; color: var(--calendar-text-muted);">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" opacity="0.3" style="margin-bottom: 16px;">
                        <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="16" y1="2" x2="16" y2="6"></line>
                        <line x1="8" y1="2" x2="8" y2="6"></line>
                        <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                    <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 8px 0; color: var(--calendar-text);">No Upcoming Events</h3>
                    <p>${this.searchQuery ? 'No events match your search.' : 'Create your first event to get started!'}</p>
                </div>
            `;
            return;
        }

        const grouped = {};
        filteredEvents.forEach(event => {
            const dateKey = this.engine.formatDateKey(event.start);
            if (!grouped[dateKey]) {
                grouped[dateKey] = [];
            }
            grouped[dateKey].push(event);
        });

        container.innerHTML = Object.keys(grouped).map(dateKey => {
            const date = new Date(dateKey + 'T00:00:00');
            const isToday = this.isToday(date);
            
            return `
                <div class="calendar-agenda-group">
                    <div class="calendar-agenda-date ${isToday ? 'today' : ''}">
                        ${date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        ${isToday ? '<span style="font-size: 12px; opacity: 0.7;"> (Today)</span>' : ''}
                    </div>
                    ${grouped[dateKey].map(event => {
                        const highlight = this.searchQuery ? this.highlightSearch(event.title, this.searchQuery) : this.escapeHtml(event.title);
                        return `
                            <div class="calendar-agenda-item" 
                                 data-event-id="${event.id}"
                                 onclick="calendarApp.openEvent('${event.id}')"
                                 oncontextmenu="event.preventDefault(); calendarApp.showContextMenu(event, '${event.id}')">
                                <div class="calendar-agenda-item-time">${this.formatTime(event.start)} - ${this.formatTime(event.end)}</div>
                                <div class="calendar-agenda-item-title">${highlight}</div>
                                ${event.location ? `<div class="calendar-agenda-item-meta">📍 ${this.escapeHtml(event.location)}</div>` : ''}
                                ${event.description ? `<div class="calendar-agenda-item-meta" style="margin-top: 4px;">${this.escapeHtml(event.description.substring(0, 100))}${event.description.length > 100 ? '...' : ''}</div>` : ''}
                                <div class="calendar-agenda-item-tags">
                                    ${event.tags && event.tags.length > 0 ? event.tags.map(tag => 
                                        `<span class="calendar-tag" style="background: ${event.color}20; color: ${event.color};">${this.escapeHtml(tag)}</span>`
                                    ).join('') : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        }).join('');
    }

    getFilteredEvents(events) {
        let filtered = events;
        
        // Filter by search query
        if (this.searchQuery) {
            filtered = filtered.filter(event => 
                event.title.toLowerCase().includes(this.searchQuery) ||
                (event.description && event.description.toLowerCase().includes(this.searchQuery)) ||
                (event.location && event.location.toLowerCase().includes(this.searchQuery)) ||
                (event.tags && event.tags.some(tag => tag.toLowerCase().includes(this.searchQuery)))
            );
        }
        
        // Filter by visible calendars
        const visibleCalendars = this.engine.calendars.filter(c => c.visible).map(c => c.id);
        filtered = filtered.filter(event => visibleCalendars.includes(event.calendarId));
        
        return filtered;
    }

    highlightSearch(text, query) {
        if (!query) return this.escapeHtml(text);
        const regex = new RegExp(`(${this.escapeRegex(query)})`, 'gi');
        return this.escapeHtml(text).replace(regex, '<mark>$1</mark>');
    }

    escapeRegex(str) {
        return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    createEventAtTime(dateString, hour) {
        const date = new Date(dateString);
        date.setHours(hour, 0, 0, 0);
        const endDate = new Date(date);
        endDate.setHours(hour + 1, 0, 0, 0);
        
        this.showEventEditor(null, {
            start: date,
            end: endDate
        });
    }

    // Event Editor
    showEventEditor(event = null, defaults = {}) {
        const modal = document.getElementById('calendar-event-modal');
        const editor = document.getElementById('calendar-event-editor');
        const title = document.getElementById('calendar-event-modal-title');
        if (!modal || !editor || !title) return;

        this.currentEvent = event;

        if (event) {
            title.textContent = 'Edit Event';
        } else {
            title.textContent = 'New Event';
            const startDate = defaults.start || new Date(this.selectedDate);
            const endDate = defaults.end || new Date(startDate.getTime() + 3600000);
            event = {
                title: '',
                description: '',
                start: startDate,
                end: endDate,
                allDay: false,
                color: this.engine.calendars.find(c => c.id === this.engine.settings.defaultCalendar)?.color || '#6366f1',
                calendarId: this.engine.settings.defaultCalendar,
                location: '',
                reminders: [],
                recurrence: null,
                tags: [],
                attachments: [],
                notes: ''
            };
        }

        const startDate = new Date(event.start);
        const endDate = new Date(event.end);

        editor.innerHTML = `
            <div class="calendar-form-group">
                <label>Title *</label>
                <input type="text" class="calendar-input" id="event-title" value="${this.escapeHtml(event.title)}" 
                       placeholder='e.g., "Math Exam" or "Meeting tomorrow at 2pm"' 
                       autofocus>
                <div style="font-size: 12px; color: var(--calendar-text-muted); margin-top: 4px;">
                    💡 Tip: Use natural language like "CS lab Mon 12:30-1:50 at Temple, remind 30m"
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
                    <label>Calendar</label>
                    <select class="calendar-select" id="event-calendar">
                        ${this.engine.calendars.map(cal => `
                            <option value="${cal.id}" ${event.calendarId === cal.id ? 'selected' : ''}>${cal.name}</option>
                        `).join('')}
                    </select>
                </div>
                <div class="calendar-form-group">
                    <label>Color</label>
                    <input type="color" class="calendar-input" id="event-color" value="${event.color}" style="height: 40px; padding: 4px;">
                </div>
            </div>
            <div class="calendar-form-group">
                <label>Location</label>
                <input type="text" class="calendar-input" id="event-location" value="${this.escapeHtml(event.location)}" placeholder="e.g., Room 301, Temple">
            </div>
            <div class="calendar-form-group">
                <label>Description / Notes</label>
                <textarea class="calendar-textarea" id="event-description" placeholder="Add notes, markdown supported..." rows="4">${this.escapeHtml(event.description)}</textarea>
            </div>
            <div class="calendar-form-group">
                <label>Tags (comma-separated)</label>
                <input type="text" class="calendar-input" id="event-tags" value="${event.tags ? event.tags.join(', ') : ''}" placeholder="e.g., exam, important, study">
            </div>
            <div class="calendar-form-group">
                <label>Reminders</label>
                <div id="event-reminders-list" style="margin-bottom: 8px;">
                    ${event.reminders && event.reminders.length > 0 ? event.reminders.map((r, i) => `
                        <div class="calendar-reminder-item" style="display: flex; gap: 8px; margin-bottom: 4px;">
                            <select class="calendar-select" style="flex: 1;" data-reminder-index="${i}">
                                <option value="5" ${r.minutes === 5 ? 'selected' : ''}>5 minutes before</option>
                                <option value="10" ${r.minutes === 10 ? 'selected' : ''}>10 minutes before</option>
                                <option value="15" ${r.minutes === 15 ? 'selected' : ''}>15 minutes before</option>
                                <option value="30" ${r.minutes === 30 ? 'selected' : ''}>30 minutes before</option>
                                <option value="60" ${r.minutes === 60 ? 'selected' : ''}>1 hour before</option>
                                <option value="1440" ${r.minutes === 1440 ? 'selected' : ''}>1 day before</option>
                            </select>
                            <button type="button" class="calendar-btn calendar-btn-secondary" onclick="this.parentElement.remove()" style="padding: 8px 12px;">Remove</button>
                        </div>
                    `).join('') : ''}
                </div>
                <button type="button" class="calendar-btn calendar-btn-secondary" onclick="calendarApp.addReminderField()" style="width: 100%;">+ Add Reminder</button>
            </div>
            <div class="calendar-form-group">
                <label>Recurrence</label>
                <select class="calendar-select" id="event-recurrence">
                    <option value="">None</option>
                    <option value="daily" ${event.recurrence?.frequency === 'daily' ? 'selected' : ''}>Daily</option>
                    <option value="weekly" ${event.recurrence?.frequency === 'weekly' ? 'selected' : ''}>Weekly</option>
                    <option value="monthly" ${event.recurrence?.frequency === 'monthly' ? 'selected' : ''}>Monthly</option>
                </select>
            </div>
            <div class="calendar-modal-actions">
                <button class="calendar-btn calendar-btn-secondary" onclick="calendarApp.hideEventEditor()">Cancel</button>
                ${event.id ? `
                    <button class="calendar-btn calendar-btn-secondary" onclick="calendarApp.duplicateEvent('${event.id}')">Duplicate</button>
                    <button class="calendar-btn calendar-btn-secondary" onclick="calendarApp.deleteEvent('${event.id}')" style="background: var(--calendar-error);">Delete</button>
                ` : ''}
                <button class="calendar-btn calendar-btn-primary" onclick="calendarApp.saveEvent()">${event.id ? 'Update' : 'Create'} Event</button>
            </div>
        `;

        // Setup all-day toggle
        const allDayCheckbox = document.getElementById('event-all-day');
        if (allDayCheckbox) {
            allDayCheckbox.addEventListener('change', (e) => {
                const startTime = document.getElementById('event-start-time');
                const endTime = document.getElementById('event-end-time');
                if (e.target.checked) {
                    if (startTime) startTime.disabled = true;
                    if (endTime) endTime.disabled = true;
                } else {
                    if (startTime) startTime.disabled = false;
                    if (endTime) endTime.disabled = false;
                }
            });
            if (allDayCheckbox.checked) {
                const startTime = document.getElementById('event-start-time');
                const endTime = document.getElementById('event-end-time');
                if (startTime) startTime.disabled = true;
                if (endTime) endTime.disabled = true;
            }
        }

        modal.style.display = 'flex';
        
        setTimeout(() => {
            const titleInput = document.getElementById('event-title');
            if (titleInput) titleInput.focus();
        }, 100);
    }

    addReminderField() {
        const list = document.getElementById('event-reminders-list');
        if (!list) return;
        
        const index = list.children.length;
        const div = document.createElement('div');
        div.className = 'calendar-reminder-item';
        div.style.cssText = 'display: flex; gap: 8px; margin-bottom: 4px;';
        div.innerHTML = `
            <select class="calendar-select" style="flex: 1;" data-reminder-index="${index}">
                <option value="5">5 minutes before</option>
                <option value="10">10 minutes before</option>
                <option value="15" selected>15 minutes before</option>
                <option value="30">30 minutes before</option>
                <option value="60">1 hour before</option>
                <option value="1440">1 day before</option>
            </select>
            <button type="button" class="calendar-btn calendar-btn-secondary" onclick="this.parentElement.remove()" style="padding: 8px 12px;">Remove</button>
        `;
        list.appendChild(div);
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
        const calendarInput = document.getElementById('event-calendar');
        const locationInput = document.getElementById('event-location');
        const descriptionInput = document.getElementById('event-description');
        const tagsInput = document.getElementById('event-tags');
        const remindersList = document.getElementById('event-reminders-list');
        const recurrenceInput = document.getElementById('event-recurrence');

        if (!titleInput || !startDateInput || !endDateInput) return;

        const title = titleInput.value.trim();
        if (!title) {
            if (window.notificationSystem) {
                window.notificationSystem.error('Calendar', 'Please enter a title');
            }
            return;
        }

        const allDay = allDayCheckbox?.checked || false;
        
        let start = new Date(startDateInput.value);
        if (!allDay && startTimeInput && !startTimeInput.disabled) {
            const [hours, minutes] = startTimeInput.value.split(':');
            start.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            start.setHours(0, 0, 0, 0);
        }

        let end = new Date(endDateInput.value);
        if (!allDay && endTimeInput && !endTimeInput.disabled) {
            const [hours, minutes] = endTimeInput.value.split(':');
            end.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        } else {
            end.setHours(23, 59, 59, 999);
        }

        // Parse reminders
        const reminders = [];
        if (remindersList) {
            remindersList.querySelectorAll('select').forEach(select => {
                const minutes = parseInt(select.value);
                reminders.push({ minutes, sound: false });
            });
        }

        // Parse tags
        const tags = tagsInput?.value ? tagsInput.value.split(',').map(t => t.trim()).filter(t => t) : [];

        // Parse recurrence
        const recurrence = recurrenceInput?.value ? { frequency: recurrenceInput.value } : null;

        const eventData = {
            title: title,
            description: descriptionInput?.value.trim() || '',
            start: start,
            end: end,
            allDay: allDay,
            color: colorInput?.value || '#6366f1',
            calendarId: calendarInput?.value || 'personal',
            location: locationInput?.value.trim() || '',
            reminders: reminders,
            recurrence: recurrence,
            tags: tags,
            notes: descriptionInput?.value.trim() || ''
        };

        if (this.currentEvent && this.currentEvent.id) {
            this.engine.updateEvent(this.currentEvent.id, eventData);
            if (window.notificationSystem) {
                window.notificationSystem.success('Calendar', 'Event updated');
            }
        } else {
            this.engine.addEvent(eventData);
            if (window.notificationSystem) {
                window.notificationSystem.success('Calendar', 'Event created');
            }
        }

        this.hideEventEditor();
        this.render();
        this.renderSidebar();
    }

    deleteEvent(eventId) {
        if (confirm('Are you sure you want to delete this event?')) {
            this.engine.deleteEvent(eventId);
            if (window.notificationSystem) {
                window.notificationSystem.success('Calendar', 'Event deleted');
            }
            this.hideEventEditor();
            this.render();
            this.renderSidebar();
        }
    }

    duplicateEvent(eventId) {
        const duplicated = this.engine.duplicateEvent(eventId);
        if (duplicated && window.notificationSystem) {
            window.notificationSystem.success('Calendar', 'Event duplicated');
        }
        this.render();
        this.renderSidebar();
    }

    // Context Menu
    showContextMenu(e, eventId) {
        const menu = document.getElementById('calendar-context-menu');
        if (!menu) return;

        const event = this.engine.getEvent(eventId);
        if (!event) return;

        this.contextMenuEvent = event;

        menu.innerHTML = `
            <div class="calendar-context-menu-item" onclick="calendarApp.openEvent('${eventId}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                Edit
            </div>
            <div class="calendar-context-menu-item" onclick="calendarApp.duplicateEvent('${eventId}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Duplicate
            </div>
            <div class="calendar-context-menu-item" onclick="calendarApp.deleteEvent('${eventId}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                Delete
            </div>
            <div class="calendar-context-menu-divider"></div>
            <div class="calendar-context-menu-item" onclick="calendarApp.copyEventDetails('${eventId}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                Copy Details
            </div>
        `;

        menu.style.display = 'block';
        menu.style.left = `${e.pageX}px`;
        menu.style.top = `${e.pageY}px`;
    }

    hideContextMenu() {
        const menu = document.getElementById('calendar-context-menu');
        if (menu) {
            menu.style.display = 'none';
        }
        this.contextMenuEvent = null;
    }

    copyEventDetails(eventId) {
        const event = this.engine.getEvent(eventId);
        if (!event) return;

        const details = `${event.title}\n${this.formatTime(event.start)} - ${this.formatTime(event.end)}\n${event.location || ''}\n${event.description || ''}`;
        
        navigator.clipboard.writeText(details).then(() => {
            if (window.notificationSystem) {
                window.notificationSystem.success('Calendar', 'Event details copied');
            }
        });
        
        this.hideContextMenu();
    }

    // Drag and Drop
    setupDayCellDragAndDrop() {
        const cells = document.querySelectorAll('.calendar-day-cell');
        cells.forEach(cell => {
            cell.addEventListener('dragover', (e) => {
                e.preventDefault();
                cell.classList.add('calendar-drag-over');
            });
            
            cell.addEventListener('dragleave', () => {
                cell.classList.remove('calendar-drag-over');
            });
            
            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                cell.classList.remove('calendar-drag-over');
                
                const eventId = e.dataTransfer.getData('text/plain');
                const dateStr = cell.dataset.date;
                if (eventId && dateStr) {
                    this.moveEventToDate(eventId, dateStr);
                }
            });
        });
    }

    setupEventBlockDragAndDrop() {
        const eventBlocks = document.querySelectorAll('.calendar-event-block, .calendar-event-mini');
        eventBlocks.forEach(block => {
            block.addEventListener('dragstart', (e) => {
                this.draggedEvent = block.dataset.eventId;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', block.dataset.eventId);
                block.style.opacity = '0.5';
            });
            
            block.addEventListener('dragend', (e) => {
                e.target.style.opacity = '1';
                this.draggedEvent = null;
            });
        });
    }

    moveEventToDate(eventId, dateString) {
        const event = this.engine.getEvent(eventId);
        if (!event) return;

        const newDate = new Date(dateString);
        const oldStart = new Date(event.start);
        const duration = new Date(event.end).getTime() - oldStart.getTime();
        
        newDate.setHours(oldStart.getHours(), oldStart.getMinutes(), 0, 0);
        const newEnd = new Date(newDate.getTime() + duration);

        this.engine.updateEvent(eventId, {
            start: newDate,
            end: newEnd
        });
        
        if (window.notificationSystem) {
            window.notificationSystem.success('Calendar', 'Event moved');
        }
    }

    // Sidebar
    renderSidebar() {
        this.renderMiniMonth();
        this.renderCalendarsList();
        this.renderTagsList();
    }

    renderMiniMonth() {
        const container = document.getElementById('calendar-mini-month');
        if (!container) return;

        const date = this.engine.currentDate;
        const year = date.getFullYear();
        const month = date.getMonth();
        const days = this.engine.getMonthDays(year, month);

        container.innerHTML = `
            <div class="calendar-mini-month-header">
                <button onclick="calendarApp.engine.navigateMonth(-1); calendarApp.renderSidebar(); calendarApp.render();" style="background: none; border: none; color: var(--calendar-text); cursor: pointer;">‹</button>
                <div style="font-weight: 600; font-size: 14px;">${date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}</div>
                <button onclick="calendarApp.engine.navigateMonth(1); calendarApp.renderSidebar(); calendarApp.render();" style="background: none; border: none; color: var(--calendar-text); cursor: pointer;">›</button>
            </div>
            <div class="calendar-mini-month-grid">
                ${days.slice(0, 7).map(day => 
                    `<div class="calendar-mini-weekday">${day.date.toLocaleDateString('en-US', { weekday: 'narrow' })}</div>`
                ).join('')}
                ${days.map(day => `
                    <div class="calendar-mini-day ${day.isToday ? 'today' : ''} ${!day.isCurrentMonth ? 'other-month' : ''}"
                         onclick="calendarApp.openDay('${day.date.toISOString()}')">
                        ${day.date.getDate()}
                    </div>
                `).join('')}
            </div>
        `;
    }

    renderCalendarsList() {
        const container = document.getElementById('calendar-calendars-list');
        if (!container) return;

        container.innerHTML = this.engine.calendars.map(cal => `
            <div class="calendar-calendar-item">
                <label style="display: flex; align-items: center; gap: 8px; cursor: pointer;">
                    <input type="checkbox" ${cal.visible ? 'checked' : ''} 
                           onchange="calendarApp.toggleCalendarVisibility('${cal.id}', this.checked)">
                    <span class="calendar-calendar-color" style="background: ${cal.color};"></span>
                    <span>${cal.name}</span>
                </label>
            </div>
        `).join('');
    }

    toggleCalendarVisibility(calendarId, visible) {
        const cal = this.engine.calendars.find(c => c.id === calendarId);
        if (cal) {
            cal.visible = visible;
            this.engine.saveSettings();
            this.render();
        }
    }

    renderTagsList() {
        const container = document.getElementById('calendar-tags-list');
        if (!container) return;

        const allTags = new Set();
        this.engine.events.forEach(event => {
            if (event.tags) {
                event.tags.forEach(tag => allTags.add(tag));
            }
        });

        if (allTags.size === 0) {
            container.innerHTML = '<div style="font-size: 12px; color: var(--calendar-text-muted);">No tags yet</div>';
            return;
        }

        container.innerHTML = Array.from(allTags).map(tag => `
            <div class="calendar-tag-item">
                <span class="calendar-tag">${this.escapeHtml(tag)}</span>
            </div>
        `).join('');
    }

    toggleSidebar() {
        this.sidebarCollapsed = !this.sidebarCollapsed;
        const sidebar = document.getElementById('calendar-sidebar');
        if (sidebar) {
            sidebar.classList.toggle('collapsed', this.sidebarCollapsed);
        }
    }

    toggleAIPanel() {
        this.aiPanelCollapsed = !this.aiPanelCollapsed;
        const panel = document.getElementById('calendar-ai-panel');
        if (panel) {
            panel.classList.toggle('collapsed', this.aiPanelCollapsed);
        }
    }

    // AI Assistant
    async handleAIAction(action) {
        const responseDiv = document.getElementById('calendar-ai-response');
        if (!responseDiv) return;

        responseDiv.innerHTML = '<div class="calendar-ai-loading">Processing...</div>';

        try {
            let response = '';
            
            switch (action) {
                case 'schedule':
                    response = await this.aiScheduleForMe();
                    break;
                case 'conflicts':
                    response = await this.aiFindConflicts();
                    break;
                case 'optimize':
                    response = await this.aiOptimizeDay();
                    break;
                case 'auto-plan':
                    response = await this.aiAutoPlan();
                    break;
                case 'explain':
                    response = await this.aiExplainWeek();
                    break;
            }

            responseDiv.innerHTML = `<div class="calendar-ai-message">${response}</div>`;
        } catch (error) {
            responseDiv.innerHTML = `<div class="calendar-ai-error">Error: ${error.message}</div>`;
        }
    }

    async aiScheduleForMe() {
        const analysis = this.engine.analyzeSchedule();
        const gaps = analysis.gaps;
        
        if (gaps.length === 0) {
            return "Your schedule is packed! No free time blocks found in the next week.";
        }
        
        const bestGap = gaps[0];
        return `I found ${gaps.length} free time blocks. Best available slot: ${bestGap.start.toLocaleDateString()} ${this.formatTime(bestGap.start)} - ${this.formatTime(bestGap.end)}. Would you like to create an event here?`;
    }

    async aiFindConflicts() {
        const conflicts = this.engine.findConflicts(this.engine.getEventsForDateRange(
            new Date(),
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        ));
        
        if (conflicts.length === 0) {
            return "✅ No conflicts found! Your schedule looks good.";
        }
        
        return `⚠️ Found ${conflicts.length} conflict(s):\n${conflicts.map(([e1, e2]) => 
            `• "${e1.title}" overlaps with "${e2.title}"`
        ).join('\n')}`;
    }

    async aiOptimizeDay() {
        const today = new Date();
        const events = this.engine.getEventsForDay(today.getFullYear(), today.getMonth(), today.getDate());
        
        if (events.length === 0) {
            return "You have no events scheduled for today. Perfect time to plan!";
        }
        
        const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        const gaps = this.engine.findFreeTime(sorted);
        
        let response = `Today's schedule (${events.length} events):\n`;
        sorted.forEach((e, i) => {
            response += `${i + 1}. ${this.formatTime(e.start)} - ${e.title}\n`;
        });
        
        if (gaps.length > 0) {
            response += `\n💡 Free time blocks: ${gaps.length} available for breaks or tasks.`;
        }
        
        return response;
    }

    async aiAutoPlan() {
        return "Auto-planning feature: I'll analyze your study patterns and suggest optimal study blocks. (Coming soon - will use your preferences and past events)";
    }

    async aiExplainWeek() {
        const analysis = this.engine.analyzeSchedule();
        const events = this.engine.getEventsForDateRange(
            new Date(),
            new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        );
        
        return `📅 Week Summary:\n• Total events: ${analysis.totalEvents}\n• Busy days: ${analysis.busyDays.length}\n• Conflicts: ${analysis.conflicts.length}\n• Free time blocks: ${analysis.gaps.length}\n\n${analysis.busyDays.length > 0 ? `Busiest day: ${analysis.busyDays[0].date} with ${analysis.busyDays[0].count} events` : 'Schedule looks balanced!'}`;
    }

    // Settings
    showSettings() {
        const modal = document.getElementById('calendar-settings-modal');
        const content = document.getElementById('calendar-settings-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div class="calendar-form-group">
                <label>Week Starts On</label>
                <select class="calendar-select" id="setting-week-start">
                    <option value="monday" ${this.engine.settings.weekStartsOn === 'monday' ? 'selected' : ''}>Monday</option>
                    <option value="sunday" ${this.engine.settings.weekStartsOn === 'sunday' ? 'selected' : ''}>Sunday</option>
                </select>
            </div>
            <div class="calendar-form-group">
                <label>Time Format</label>
                <select class="calendar-select" id="setting-time-format">
                    <option value="12h" ${this.engine.settings.timeFormat === '12h' ? 'selected' : ''}>12-hour</option>
                    <option value="24h" ${this.engine.settings.timeFormat === '24h' ? 'selected' : ''}>24-hour</option>
                </select>
            </div>
            <div class="calendar-form-group">
                <label>Timezone</label>
                <select class="calendar-select" id="setting-timezone">
                    <option value="${this.engine.settings.timezone}" selected>${this.engine.settings.timezone}</option>
                </select>
            </div>
            <div class="calendar-form-group">
                <label>Default Reminder</label>
                <select class="calendar-select" id="setting-default-reminder">
                    <option value="5" ${this.engine.settings.defaultReminder === 5 ? 'selected' : ''}>5 minutes</option>
                    <option value="10" ${this.engine.settings.defaultReminder === 10 ? 'selected' : ''}>10 minutes</option>
                    <option value="15" ${this.engine.settings.defaultReminder === 15 ? 'selected' : ''}>15 minutes</option>
                    <option value="30" ${this.engine.settings.defaultReminder === 30 ? 'selected' : ''}>30 minutes</option>
                    <option value="60" ${this.engine.settings.defaultReminder === 60 ? 'selected' : ''}>1 hour</option>
                </select>
            </div>
            <div class="calendar-form-group">
                <label>Theme</label>
                <select class="calendar-select" id="setting-theme">
                    <option value="default" ${this.engine.settings.theme === 'default' ? 'selected' : ''}>Default</option>
                    <option value="neon-aurora" ${this.engine.settings.theme === 'neon-aurora' ? 'selected' : ''}>Neon Aurora</option>
                    <option value="midnight-glass" ${this.engine.settings.theme === 'midnight-glass' ? 'selected' : ''}>Midnight Glass</option>
                    <option value="amoled-black" ${this.engine.settings.theme === 'amoled-black' ? 'selected' : ''}>AMOLED Pure Black</option>
                    <option value="solarized-night" ${this.engine.settings.theme === 'solarized-night' ? 'selected' : ''}>Solarized Night</option>
                    <option value="retro-terminal" ${this.engine.settings.theme === 'retro-terminal' ? 'selected' : ''}>Retro Terminal</option>
                    <option value="soft-pastel" ${this.engine.settings.theme === 'soft-pastel' ? 'selected' : ''}>Soft Pastel</option>
                </select>
            </div>
            <div class="calendar-form-group">
                <label>Google Calendar Sync</label>
                <button class="calendar-btn calendar-btn-secondary" onclick="calendarApp.syncWithGoogle()" style="width: 100%;">
                    Connect Google Calendar
                </button>
                <div style="font-size: 12px; color: var(--calendar-text-muted); margin-top: 4px;">
                    Coming soon - Two-way sync with Google Calendar
                </div>
            </div>
            <div class="calendar-modal-actions">
                <button class="calendar-btn calendar-btn-secondary" onclick="calendarApp.hideSettings()">Cancel</button>
                <button class="calendar-btn calendar-btn-primary" onclick="calendarApp.saveSettings()">Save Settings</button>
            </div>
        `;

        modal.style.display = 'flex';
    }

    saveSettings() {
        const weekStart = document.getElementById('setting-week-start');
        const timeFormat = document.getElementById('setting-time-format');
        const timezone = document.getElementById('setting-timezone');
        const defaultReminder = document.getElementById('setting-default-reminder');
        const theme = document.getElementById('setting-theme');

        this.engine.settings.weekStartsOn = weekStart?.value || 'monday';
        this.engine.settings.timeFormat = timeFormat?.value || '12h';
        this.engine.settings.timezone = timezone?.value || Intl.DateTimeFormat().resolvedOptions().timeZone;
        this.engine.settings.defaultReminder = parseInt(defaultReminder?.value) || 15;
        this.engine.settings.theme = theme?.value || 'default';

        this.engine.saveSettings();
        this.applyTheme(this.engine.settings.theme);
        this.hideSettings();
        this.render();
        
        if (window.notificationSystem) {
            window.notificationSystem.success('Calendar', 'Settings saved');
        }
    }

    hideSettings() {
        const modal = document.getElementById('calendar-settings-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    applyTheme(themeName) {
        document.body.className = `calendar-page calendar-theme-${themeName}`;
    }

    syncWithGoogle() {
        if (window.notificationSystem) {
            window.notificationSystem.info('Calendar', 'Google Calendar sync coming soon! This will enable two-way synchronization.');
        }
    }

    // Help
    showHelp() {
        const modal = document.getElementById('calendar-help-modal');
        const content = document.getElementById('calendar-help-content');
        if (!modal || !content) return;

        content.innerHTML = `
            <div style="line-height: 1.8;">
                <h3 style="margin-top: 0;">Keyboard Shortcuts</h3>
                <ul style="list-style: none; padding: 0;">
                    <li><kbd>←</kbd> / <kbd>→</kbd> - Navigate previous/next</li>
                    <li><kbd>T</kbd> - Go to today</li>
                    <li><kbd>N</kbd> - Create new event</li>
                    <li><kbd>Ctrl+Z</kbd> - Undo</li>
                    <li><kbd>Ctrl+Shift+Z</kbd> - Redo</li>
                    <li><kbd>Ctrl+E</kbd> - Export calendar</li>
                    <li><kbd>Ctrl+I</kbd> - Import calendar</li>
                    <li><kbd>Esc</kbd> - Close modals</li>
                </ul>
                
                <h3>Features</h3>
                <ul style="list-style: none; padding: 0;">
                    <li>📅 Multiple views: Month, Week, Day, Agenda</li>
                    <li>🎨 Calendar-specific themes</li>
                    <li>🔔 Reminders with notifications</li>
                    <li>🔄 Recurring events</li>
                    <li>🏷️ Tags and color coding</li>
                    <li>🔍 Search events</li>
                    <li>📤 Import/Export (JSON, ICS)</li>
                    <li>🤖 AI scheduling assistant</li>
                    <li>📱 Responsive design</li>
                </ul>
                
                <h3>Tips</h3>
                <ul style="list-style: none; padding: 0;">
                    <li>• Drag events to reschedule</li>
                    <li>• Right-click events for quick actions</li>
                    <li>• Use natural language in event title</li>
                    <li>• Click empty time slots to create events</li>
                    <li>• Use search to find events quickly</li>
                </ul>
            </div>
        `;

        modal.style.display = 'flex';
    }

    hideHelp() {
        const modal = document.getElementById('calendar-help-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Export/Import
    exportCalendar() {
        const json = this.engine.exportToJSON();
        const blob = new Blob([json], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `calendar-export-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        if (window.notificationSystem) {
            window.notificationSystem.success('Calendar', 'Calendar exported');
        }
    }

    async importCalendar() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,.ics';
        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const text = await file.text();
            let result;

            if (file.name.endsWith('.ics')) {
                result = await this.engine.importFromICS(text);
            } else {
                try {
                    const data = JSON.parse(text);
                    if (data.events) {
                        data.events.forEach(event => {
                            this.engine.addEvent(event);
                        });
                        result = { success: true, count: data.events.length };
                    } else {
                        result = { success: false, error: 'Invalid format' };
                    }
                } catch (err) {
                    result = { success: false, error: err.message };
                }
            }

            if (result.success) {
                if (window.notificationSystem) {
                    window.notificationSystem.success('Calendar', `Imported ${result.count} events`);
                }
                this.render();
                this.renderSidebar();
            } else {
                if (window.notificationSystem) {
                    window.notificationSystem.error('Calendar', `Import failed: ${result.error}`);
                }
            }
        };
        input.click();
    }

    // Undo/Redo
    undo() {
        const historyItem = this.engine.undo();
        if (historyItem) {
            this.engine.events = historyItem.data.events;
            this.engine.saveData();
            this.render();
            this.renderSidebar();
            if (window.notificationSystem) {
                window.notificationSystem.info('Calendar', 'Undone');
            }
        }
    }

    redo() {
        const historyItem = this.engine.redo();
        if (historyItem) {
            this.engine.events = historyItem.data.events;
            this.engine.saveData();
            this.render();
            this.renderSidebar();
            if (window.notificationSystem) {
                window.notificationSystem.info('Calendar', 'Redone');
            }
        }
    }

    // Utility Methods
    formatHour(hour) {
        if (this.engine.settings.timeFormat === '24h') {
            return `${hour}:00`;
        }
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:00 ${ampm}`;
    }

    formatTime(date) {
        return this.engine.formatTime(date);
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
