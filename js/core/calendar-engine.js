// CALENDAR ENGINE - Premium calendar logic and data management
// Enhanced with IndexedDB, recurrence, reminders, import/export

class CalendarEngine {
    constructor() {
        this.storageKey = 'aegis_calendar_data';
        this.dbName = 'AegisDeskCalendar';
        this.dbVersion = 1;
        this.db = null;
        this.events = [];
        this.reminders = [];
        this.scheduledReminders = new Map(); // Track reminder timeouts
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.view = 'month';
        this.settings = {
            weekStartsOn: 'monday', // 'monday' | 'sunday'
            timeFormat: '12h', // '12h' | '24h'
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            defaultReminder: 15, // minutes
            defaultCalendar: 'personal',
            theme: 'default'
        };
        this.calendars = [
            { id: 'personal', name: 'Personal', color: '#6366f1', visible: true },
            { id: 'work', name: 'Work', color: '#10b981', visible: true },
            { id: 'study', name: 'Study', color: '#f59e0b', visible: true }
        ];
        this.history = []; // For undo/redo
        this.historyIndex = -1;
        this.maxHistory = 50;
        this.init();
    }

    async init() {
        await this.initIndexedDB();
        await this.loadData();
        this.loadSettings();
        this.setupIntervals();
        this.checkReminders();
    }

    async initIndexedDB() {
        if (!('indexedDB' in window)) {
            console.warn('[Calendar Engine] IndexedDB not available, using localStorage');
            return;
        }

        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);
            
            request.onerror = () => {
                console.warn('[Calendar Engine] IndexedDB failed, using localStorage');
                resolve();
            };
            
            request.onsuccess = () => {
                this.db = request.result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                
                if (!db.objectStoreNames.contains('events')) {
                    const eventStore = db.createObjectStore('events', { keyPath: 'id' });
                    eventStore.createIndex('start', 'start', { unique: false });
                    eventStore.createIndex('end', 'end', { unique: false });
                }
                
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings');
                }
            };
        });
    }

    async loadData() {
        try {
            if (this.db) {
                // Load from IndexedDB
                return new Promise((resolve) => {
                    const transaction = this.db.transaction(['events'], 'readonly');
                    const store = transaction.objectStore('events');
                    const request = store.getAll();
                    
                    request.onsuccess = () => {
                        this.events = (request.result || []).map(e => this.normalizeEvent(e));
                        this.scheduleAllReminders();
                        resolve();
                    };
                    
                    request.onerror = () => {
                        // Fallback to localStorage
                        this.loadDataFromLocalStorage();
                        resolve();
                    };
                });
            } else {
                this.loadDataFromLocalStorage();
            }
        } catch (e) {
            console.error('[Calendar Engine] Failed to load data:', e);
            this.events = [];
            this.reminders = [];
        }
    }

    loadDataFromLocalStorage() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.events = (data.events || []).map(e => this.normalizeEvent(e));
                this.reminders = data.reminders || [];
                this.scheduleAllReminders();
            }
        } catch (e) {
            console.error('[Calendar Engine] Failed to load from localStorage:', e);
        }
    }

    async saveData() {
        try {
            if (this.db) {
                const transaction = this.db.transaction(['events'], 'readwrite');
                const store = transaction.objectStore('events');
                
                // Clear and repopulate
                await store.clear();
                for (const event of this.events) {
                    await store.add(event);
                }
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify({
                    events: this.events,
                    reminders: this.reminders
                }));
            }
        } catch (e) {
            console.error('[Calendar Engine] Failed to save data:', e);
        }
    }

    async loadSettings() {
        try {
            const stored = localStorage.getItem('aegis_calendar_settings');
            if (stored) {
                this.settings = { ...this.settings, ...JSON.parse(stored) };
            }
            
            const storedCalendars = localStorage.getItem('aegis_calendar_calendars');
            if (storedCalendars) {
                this.calendars = JSON.parse(storedCalendars);
            }
        } catch (e) {
            console.error('[Calendar Engine] Failed to load settings:', e);
        }
    }

    async saveSettings() {
        try {
            localStorage.setItem('aegis_calendar_settings', JSON.stringify(this.settings));
            localStorage.setItem('aegis_calendar_calendars', JSON.stringify(this.calendars));
        } catch (e) {
            console.error('[Calendar Engine] Failed to save settings:', e);
        }
    }

    normalizeEvent(event) {
        const normalized = {
            id: event.id || this.generateId(),
            title: event.title || '',
            description: event.description || '',
            start: new Date(event.start),
            end: new Date(event.end),
            allDay: event.allDay || false,
            color: event.color || '#6366f1',
            calendarId: event.calendarId || 'personal',
            location: event.location || '',
            attendees: event.attendees || [],
            reminders: event.reminders || [],
            recurrence: event.recurrence || null,
            attachments: event.attachments || [],
            notes: event.notes || '',
            tags: event.tags || [],
            createdAt: event.createdAt || Date.now(),
            updatedAt: event.updatedAt || Date.now()
        };
        
        // Ensure dates are valid
        if (isNaN(normalized.start.getTime())) normalized.start = new Date();
        if (isNaN(normalized.end.getTime())) normalized.end = new Date(normalized.start.getTime() + 3600000);
        
        return normalized;
    }

    generateId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // History Management (Undo/Redo)
    saveToHistory(action, data) {
        this.history = this.history.slice(0, this.historyIndex + 1);
        this.history.push({ action, data: JSON.parse(JSON.stringify(data)), timestamp: Date.now() });
        this.historyIndex++;
        
        if (this.history.length > this.maxHistory) {
            this.history.shift();
            this.historyIndex--;
        }
    }

    undo() {
        if (this.historyIndex < 0) return null;
        
        const historyItem = this.history[this.historyIndex];
        this.historyIndex--;
        
        return historyItem;
    }

    redo() {
        if (this.historyIndex >= this.history.length - 1) return null;
        
        this.historyIndex++;
        const historyItem = this.history[this.historyIndex];
        
        return historyItem;
    }

    // Event Management
    addEvent(eventData) {
        const event = this.normalizeEvent(eventData);
        this.saveToHistory('add', { events: [...this.events] });
        this.events.push(event);
        this.saveData();
        this.scheduleReminders(event);
        
        if (this.onEventChange) {
            this.onEventChange('add', event);
        }
        
        return event;
    }

    updateEvent(eventId, updates) {
        const index = this.events.findIndex(e => e.id === eventId);
        if (index === -1) return null;
        
        this.saveToHistory('update', { events: [...this.events] });
        
        const oldEvent = { ...this.events[index] };
        this.cancelReminders(oldEvent);
        
        this.events[index] = {
            ...this.events[index],
            ...updates,
            start: updates.start ? new Date(updates.start) : this.events[index].start,
            end: updates.end ? new Date(updates.end) : this.events[index].end,
            updatedAt: Date.now()
        };
        
        this.saveData();
        this.scheduleReminders(this.events[index]);
        
        if (this.onEventChange) {
            this.onEventChange('update', this.events[index], oldEvent);
        }
        
        return this.events[index];
    }

    deleteEvent(eventId) {
        const index = this.events.findIndex(e => e.id === eventId);
        if (index === -1) return false;
        
        this.saveToHistory('delete', { events: [...this.events] });
        
        const event = this.events[index];
        this.cancelReminders(event);
        this.events.splice(index, 1);
        this.saveData();
        
        if (this.onEventChange) {
            this.onEventChange('delete', event);
        }
        
        return true;
    }

    duplicateEvent(eventId) {
        const event = this.events.find(e => e.id === eventId);
        if (!event) return null;
        
        const duplicated = {
            ...event,
            id: this.generateId(),
            title: `${event.title} (Copy)`,
            start: new Date(event.start.getTime() + 86400000), // +1 day
            end: new Date(event.end.getTime() + 86400000),
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
        
        return this.addEvent(duplicated);
    }

    getEvent(eventId) {
        return this.events.find(e => e.id === eventId);
    }

    // Event Queries
    getEventsForDate(date) {
        const dateStr = this.formatDateKey(date);
        return this.events.filter(event => {
            if (!event.start) return false;
            const startStr = this.formatDateKey(event.start);
            const endStr = this.formatDateKey(event.end);
            return dateStr >= startStr && dateStr <= endStr;
        });
    }

    getEventsForDateRange(startDate, endDate) {
        const start = new Date(startDate).getTime();
        const end = new Date(endDate).getTime();
        
        return this.events.filter(event => {
            if (!event.start || !event.end) return false;
            const eventStart = new Date(event.start).getTime();
            const eventEnd = new Date(event.end).getTime();
            
            // Handle recurrence
            if (event.recurrence) {
                return this.isRecurringEventInRange(event, start, end);
            }
            
            return eventStart <= end && eventEnd >= start;
        });
    }

    isRecurringEventInRange(event, rangeStart, rangeEnd) {
        if (!event.recurrence) return false;
        
        const eventStart = new Date(event.start).getTime();
        const recurrence = event.recurrence;
        
        // Simple recurrence check (can be enhanced)
        if (recurrence.frequency === 'daily') {
            let current = eventStart;
            while (current <= rangeEnd) {
                if (current >= rangeStart && current <= rangeEnd) return true;
                current += 86400000; // +1 day
            }
        } else if (recurrence.frequency === 'weekly') {
            let current = eventStart;
            while (current <= rangeEnd) {
                if (current >= rangeStart && current <= rangeEnd) return true;
                current += 604800000; // +1 week
            }
        } else if (recurrence.frequency === 'monthly') {
            let current = new Date(eventStart);
            while (current.getTime() <= rangeEnd) {
                if (current.getTime() >= rangeStart && current.getTime() <= rangeEnd) return true;
                current.setMonth(current.getMonth() + 1);
            }
        }
        
        return false;
    }

    getEventsForMonth(year, month) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
        return this.getEventsForDateRange(start, end);
    }

    getEventsForWeek(year, month, day) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const weekStartOffset = this.settings.weekStartsOn === 'monday' 
            ? (dayOfWeek === 0 ? -6 : 1 - dayOfWeek) 
            : -dayOfWeek;
        
        const start = new Date(date);
        start.setDate(date.getDate() + weekStartOffset);
        start.setHours(0, 0, 0, 0);
        
        const end = new Date(start);
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        
        return this.getEventsForDateRange(start, end);
    }

    getEventsForDay(year, month, day) {
        const start = new Date(year, month, day, 0, 0, 0, 0);
        const end = new Date(year, month, day, 23, 59, 59, 999);
        return this.getEventsForDateRange(start, end);
    }

    getUpcomingEvents(limit = 10) {
        const now = Date.now();
        return this.events
            .filter(e => {
                if (!e.start) return false;
                const startTime = new Date(e.start).getTime();
                return startTime >= now;
            })
            .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime())
            .slice(0, limit);
    }

    // Date Utilities
    formatDateKey(date) {
        const d = new Date(date);
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    getMonthDays(year, month) {
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();
        
        // Adjust for week start setting
        const weekStartOffset = this.settings.weekStartsOn === 'monday' 
            ? (startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1)
            : startingDayOfWeek;
        
        const days = [];
        
        // Previous month's trailing days
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
        
        for (let i = weekStartOffset - 1; i >= 0; i--) {
            days.push({
                date: new Date(prevYear, prevMonth, prevMonthLastDay - i),
                isCurrentMonth: false,
                isToday: false
            });
        }
        
        // Current month's days
        const today = new Date();
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month, day);
            days.push({
                date: date,
                isCurrentMonth: true,
                isToday: this.isSameDay(date, today)
            });
        }
        
        // Next month's leading days to fill grid
        const totalDays = days.length;
        const remainingDays = 42 - totalDays; // 6 rows × 7 days = 42
        for (let day = 1; day <= remainingDays; day++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            days.push({
                date: new Date(nextYear, nextMonth, day),
                isCurrentMonth: false,
                isToday: false
            });
        }
        
        return days;
    }

    isSameDay(date1, date2) {
        const d1 = new Date(date1);
        const d2 = new Date(date2);
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    }

    // Reminders
    scheduleAllReminders() {
        this.events.forEach(event => {
            this.scheduleReminders(event);
        });
    }

    scheduleReminders(event) {
        if (!event.reminders || event.reminders.length === 0) return;
        
        // Cancel existing reminders for this event
        this.cancelReminders(event);
        
        event.reminders.forEach(reminder => {
            const reminderTime = new Date(event.start);
            reminderTime.setMinutes(reminderTime.getMinutes() - reminder.minutes);
            
            if (reminderTime > Date.now()) {
                const timeoutId = setTimeout(() => {
                    this.triggerReminder(event, reminder);
                }, reminderTime.getTime() - Date.now());
                
                this.scheduledReminders.set(`${event.id}_${reminder.minutes}`, timeoutId);
            }
        });
    }

    cancelReminders(event) {
        if (!event.reminders) return;
        
        event.reminders.forEach(reminder => {
            const key = `${event.id}_${reminder.minutes}`;
            const timeoutId = this.scheduledReminders.get(key);
            if (timeoutId) {
                clearTimeout(timeoutId);
                this.scheduledReminders.delete(key);
            }
        });
    }

    triggerReminder(event, reminder) {
        const reminderKey = `${event.id}_${reminder.minutes}`;
        this.scheduledReminders.delete(reminderKey);
        
        if (window.notificationSystem) {
            const timeStr = this.formatTime(event.start);
            const locationStr = event.location ? ` at ${event.location}` : '';
            
            window.notificationSystem.show(
                `Reminder: ${event.title}`,
                `${timeStr}${locationStr}`,
                {
                    type: 'info',
                    duration: 10000,
                    persistent: true,
                    action: {
                        label: 'View',
                        callback: () => {
                            if (window.calendarApp) {
                                window.calendarApp.openEvent(event.id);
                            }
                        }
                    }
                }
            );
        }
        
        // Play sound if enabled
        if (reminder.sound) {
            this.playReminderSound();
        }
    }

    playReminderSound() {
        // Simple beep sound
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + 0.5);
    }

    checkReminders() {
        // Check for reminders every minute
        setInterval(() => {
            const now = Date.now();
            this.events.forEach(event => {
                if (!event.reminders || event.reminders.length === 0) return;
                
                event.reminders.forEach(reminder => {
                    const reminderTime = new Date(event.start);
                    reminderTime.setMinutes(reminderTime.getMinutes() - reminder.minutes);
                    
                    // Check if reminder should trigger (within 1 minute window)
                    if (Math.abs(reminderTime.getTime() - now) < 60000) {
                        const key = `${event.id}_${reminder.minutes}`;
                        if (!this.scheduledReminders.has(key)) {
                            this.triggerReminder(event, reminder);
                        }
                    }
                });
            });
        }, 60000);
    }

    formatTime(date) {
        const d = new Date(date);
        if (this.settings.timeFormat === '24h') {
            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
        }
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    setupIntervals() {
        // Update current time indicator every minute
        setInterval(() => {
            if (this.onTimeUpdate) {
                this.onTimeUpdate();
            }
        }, 60000);
    }

    // View Management
    setView(view) {
        this.view = view;
        if (this.onViewChange) {
            this.onViewChange(view);
        }
    }

    navigateToDate(date) {
        this.currentDate = new Date(date);
        if (this.onDateChange) {
            this.onDateChange(this.currentDate);
        }
    }

    navigateMonth(offset) {
        const newDate = new Date(this.currentDate);
        newDate.setMonth(newDate.getMonth() + offset);
        this.navigateToDate(newDate);
    }

    navigateWeek(offset) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + (offset * 7));
        this.navigateToDate(newDate);
    }

    navigateDay(offset) {
        const newDate = new Date(this.currentDate);
        newDate.setDate(newDate.getDate() + offset);
        this.navigateToDate(newDate);
    }

    goToToday() {
        this.navigateToDate(new Date());
    }

    // Import/Export
    exportToJSON() {
        return JSON.stringify({
            events: this.events,
            calendars: this.calendars,
            settings: this.settings,
            version: '1.0',
            exportedAt: new Date().toISOString()
        }, null, 2);
    }

    exportToICS() {
        let ics = 'BEGIN:VCALENDAR\r\n';
        ics += 'VERSION:2.0\r\n';
        ics += 'PRODID:-//AegisDesk//Calendar//EN\r\n';
        ics += 'CALSCALE:GREGORIAN\r\n';
        
        this.events.forEach(event => {
            ics += 'BEGIN:VEVENT\r\n';
            ics += `UID:${event.id}\r\n`;
            ics += `DTSTART:${this.formatICSDate(event.start)}\r\n`;
            ics += `DTEND:${this.formatICSDate(event.end)}\r\n`;
            ics += `SUMMARY:${this.escapeICS(event.title)}\r\n`;
            if (event.description) {
                ics += `DESCRIPTION:${this.escapeICS(event.description)}\r\n`;
            }
            if (event.location) {
                ics += `LOCATION:${this.escapeICS(event.location)}\r\n`;
            }
            ics += 'END:VEVENT\r\n';
        });
        
        ics += 'END:VCALENDAR\r\n';
        return ics;
    }

    formatICSDate(date) {
        const d = new Date(date);
        return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    }

    escapeICS(text) {
        return String(text).replace(/[,;\\]/g, '\\$&').replace(/\n/g, '\\n');
    }

    async importFromICS(icsContent) {
        try {
            const lines = icsContent.split(/\r?\n/);
            const events = [];
            let currentEvent = null;
            
            for (const line of lines) {
                const trimmed = line.trim();
                if (trimmed === 'BEGIN:VEVENT') {
                    currentEvent = {};
                } else if (trimmed === 'END:VEVENT' && currentEvent) {
                    if (currentEvent.start && currentEvent.title) {
                        events.push(this.normalizeEvent({
                            title: currentEvent.title,
                            start: currentEvent.start,
                            end: currentEvent.end || new Date(currentEvent.start.getTime() + 3600000),
                            description: currentEvent.description,
                            location: currentEvent.location
                        }));
                    }
                    currentEvent = null;
                } else if (currentEvent) {
                    const [key, ...valueParts] = trimmed.split(':');
                    const value = valueParts.join(':');
                    
                    if (key === 'DTSTART') {
                        currentEvent.start = this.parseICSDate(value);
                    } else if (key === 'DTEND') {
                        currentEvent.end = this.parseICSDate(value);
                    } else if (key === 'SUMMARY') {
                        currentEvent.title = this.unescapeICS(value);
                    } else if (key === 'DESCRIPTION') {
                        currentEvent.description = this.unescapeICS(value);
                    } else if (key === 'LOCATION') {
                        currentEvent.location = this.unescapeICS(value);
                    }
                }
            }
            
            // Add imported events
            events.forEach(event => {
                this.addEvent(event);
            });
            
            return { success: true, count: events.length };
        } catch (e) {
            console.error('[Calendar Engine] Import failed:', e);
            return { success: false, error: e.message };
        }
    }

    parseICSDate(icsDate) {
        // Format: YYYYMMDDTHHMMSSZ or YYYYMMDD
        const dateStr = icsDate.replace(/Z$/, '');
        if (dateStr.length === 8) {
            // Date only
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            return new Date(year, parseInt(month) - 1, day);
        } else if (dateStr.length >= 15) {
            // Date and time
            const year = dateStr.substring(0, 4);
            const month = dateStr.substring(4, 6);
            const day = dateStr.substring(6, 8);
            const hour = dateStr.substring(9, 11) || '0';
            const minute = dateStr.substring(11, 13) || '0';
            const second = dateStr.substring(13, 15) || '0';
            return new Date(year, parseInt(month) - 1, day, parseInt(hour), parseInt(minute), parseInt(second));
        }
        return new Date();
    }

    unescapeICS(text) {
        return String(text).replace(/\\(.)/g, '$1');
    }

    // AI Analysis
    analyzeSchedule() {
        const now = Date.now();
        const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
        const upcoming = this.getEventsForDateRange(new Date(now), new Date(weekFromNow));
        
        return {
            totalEvents: upcoming.length,
            busyDays: this.findBusyDays(upcoming),
            freeTime: this.findFreeTime(upcoming),
            conflicts: this.findConflicts(upcoming),
            gaps: this.findGaps(upcoming)
        };
    }

    findBusyDays(events) {
        const dayCounts = {};
        events.forEach(event => {
            const key = this.formatDateKey(event.start);
            dayCounts[key] = (dayCounts[key] || 0) + 1;
        });
        
        return Object.entries(dayCounts)
            .filter(([_, count]) => count >= 5)
            .map(([date, count]) => ({ date, count }));
    }

    findFreeTime(events) {
        const gaps = [];
        const sorted = [...events].sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
        
        for (let i = 0; i < sorted.length - 1; i++) {
            const currentEnd = new Date(sorted[i].end).getTime();
            const nextStart = new Date(sorted[i + 1].start).getTime();
            const gap = nextStart - currentEnd;
            
            if (gap > 3600000) { // More than 1 hour
                gaps.push({
                    start: new Date(currentEnd),
                    end: new Date(nextStart),
                    duration: gap
                });
            }
        }
        
        return gaps;
    }

    findGaps(events) {
        return this.findFreeTime(events);
    }

    findConflicts(events) {
        const conflicts = [];
        for (let i = 0; i < events.length; i++) {
            for (let j = i + 1; j < events.length; j++) {
                const e1 = events[i];
                const e2 = events[j];
                if (this.eventsOverlap(e1, e2)) {
                    conflicts.push([e1, e2]);
                }
            }
        }
        return conflicts;
    }

    eventsOverlap(event1, event2) {
        const start1 = new Date(event1.start).getTime();
        const end1 = new Date(event1.end).getTime();
        const start2 = new Date(event2.start).getTime();
        const end2 = new Date(event2.end).getTime();
        return start1 < end2 && start2 < end1;
    }

    suggestBestTime(durationMinutes, preferredStart = null, preferredEnd = null) {
        const now = new Date();
        const start = preferredStart || now;
        const end = preferredEnd || new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
        
        const events = this.getEventsForDateRange(start, end);
        const gaps = this.findFreeTime(events);
        
        // Find first gap that fits duration
        const durationMs = durationMinutes * 60 * 1000;
        for (const gap of gaps) {
            if (gap.duration >= durationMs) {
                return {
                    start: gap.start,
                    end: new Date(gap.start.getTime() + durationMs),
                    confidence: 'high'
                };
            }
        }
        
        // If no gap found, suggest end of last event
        if (events.length > 0) {
            const lastEvent = events.sort((a, b) => new Date(b.end).getTime() - new Date(a.end).getTime())[0];
            return {
                start: new Date(lastEvent.end),
                end: new Date(new Date(lastEvent.end).getTime() + durationMs),
                confidence: 'medium'
            };
        }
        
        // Default: suggest now + 1 hour
        return {
            start: new Date(now.getTime() + 3600000),
            end: new Date(now.getTime() + 3600000 + durationMs),
            confidence: 'low'
        };
    }
}

// Global instance
if (typeof window !== 'undefined') {
    window.CalendarEngine = CalendarEngine;
}
