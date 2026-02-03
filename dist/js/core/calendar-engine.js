// CALENDAR ENGINE - Core calendar logic and data management
// Abstraction layer for calendar operations

class CalendarEngine {
    constructor() {
        this.storageKey = 'aegis_calendar_data';
        this.events = [];
        this.reminders = [];
        this.currentDate = new Date();
        this.selectedDate = new Date();
        this.view = 'month'; // 'month' | 'week' | 'day' | 'agenda' | 'timeline'
        this.loadData();
        this.setupIntervals();
    }

    loadData() {
        try {
            const stored = localStorage.getItem(this.storageKey);
            if (stored) {
                const data = JSON.parse(stored);
                this.events = (data.events || []).map(e => this.normalizeEvent(e));
                this.reminders = data.reminders || [];
            }
        } catch (e) {
            console.error('[Calendar Engine] Failed to load data:', e);
            this.events = [];
            this.reminders = [];
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify({
                events: this.events,
                reminders: this.reminders
            }));
        } catch (e) {
            console.error('[Calendar Engine] Failed to save data:', e);
        }
    }

    normalizeEvent(event) {
        return {
            id: event.id || this.generateId(),
            title: event.title || '',
            description: event.description || '',
            start: new Date(event.start),
            end: new Date(event.end),
            allDay: event.allDay || false,
            color: event.color || '#6366f1',
            category: event.category || 'personal',
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
    }

    generateId() {
        return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    // Event Management
    addEvent(eventData) {
        const event = this.normalizeEvent(eventData);
        this.events.push(event);
        this.saveData();
        this.scheduleReminders(event);
        return event;
    }

    updateEvent(eventId, updates) {
        const index = this.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            this.events[index] = {
                ...this.events[index],
                ...updates,
                updatedAt: Date.now()
            };
            this.saveData();
            this.scheduleReminders(this.events[index]);
            return this.events[index];
        }
        return null;
    }

    deleteEvent(eventId) {
        const index = this.events.findIndex(e => e.id === eventId);
        if (index !== -1) {
            this.cancelReminders(this.events[index]);
            this.events.splice(index, 1);
            this.saveData();
            return true;
        }
        return false;
    }

    getEvent(eventId) {
        return this.events.find(e => e.id === eventId);
    }

    // Event Queries
    getEventsForDate(date) {
        const dateStr = this.formatDateKey(date);
        return this.events.filter(event => {
            const startStr = this.formatDateKey(event.start);
            const endStr = this.formatDateKey(event.end);
            return dateStr >= startStr && dateStr <= endStr;
        });
    }

    getEventsForDateRange(startDate, endDate) {
        return this.events.filter(event => {
            const eventStart = new Date(event.start).getTime();
            const eventEnd = new Date(event.end).getTime();
            const rangeStart = new Date(startDate).getTime();
            const rangeEnd = new Date(endDate).getTime();
            return eventStart <= rangeEnd && eventEnd >= rangeStart;
        });
    }

    getEventsForMonth(year, month) {
        const start = new Date(year, month, 1);
        const end = new Date(year, month + 1, 0);
        return this.getEventsForDateRange(start, end);
    }

    getEventsForWeek(year, month, day) {
        const date = new Date(year, month, day);
        const dayOfWeek = date.getDay();
        const start = new Date(date);
        start.setDate(date.getDate() - dayOfWeek);
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
            .filter(e => new Date(e.start).getTime() >= now)
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
        
        const days = [];
        
        // Previous month's trailing days
        const prevMonth = month === 0 ? 11 : month - 1;
        const prevYear = month === 0 ? year - 1 : year;
        const prevMonthLastDay = new Date(prevYear, prevMonth + 1, 0).getDate();
        
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
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
        
        // Next month's leading days
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

    // Natural Language Parsing (Simple)
    parseNaturalLanguage(text) {
        // Simple parser - can be enhanced with AI
        const now = new Date();
        const tomorrow = new Date(now);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        // Patterns
        if (text.match(/tomorrow/i)) {
            const match = text.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
            if (match) {
                let hour = parseInt(match[1]);
                const minute = match[2] ? parseInt(match[2]) : 0;
                const ampm = match[3] ? match[3].toLowerCase() : '';
                
                if (ampm === 'pm' && hour !== 12) hour += 12;
                if (ampm === 'am' && hour === 12) hour = 0;
                
                tomorrow.setHours(hour, minute, 0, 0);
                return tomorrow;
            }
            return tomorrow;
        }
        
        // Default to today at current time + 1 hour
        const defaultTime = new Date(now);
        defaultTime.setHours(now.getHours() + 1, 0, 0, 0);
        return defaultTime;
    }

    // Reminders
    scheduleReminders(event) {
        if (!event.reminders || event.reminders.length === 0) return;
        
        event.reminders.forEach(reminder => {
            const reminderTime = new Date(event.start);
            reminderTime.setMinutes(reminderTime.getMinutes() - reminder.minutes);
            
            if (reminderTime > Date.now()) {
                // Schedule notification
                setTimeout(() => {
                    this.triggerReminder(event, reminder);
                }, reminderTime.getTime() - Date.now());
            }
        });
    }

    cancelReminders(event) {
        // Cancel scheduled reminders for this event
        // In a real implementation, you'd track timeout IDs
    }

    triggerReminder(event, reminder) {
        if (window.notificationSystem) {
            window.notificationSystem.info(
                `Reminder: ${event.title}`,
                `${this.formatTime(event.start)} - ${event.location || 'No location'}`
            );
        }
    }

    formatTime(date) {
        const d = new Date(date);
        return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    }

    setupIntervals() {
        // Update current time indicator every minute
        setInterval(() => {
            // Trigger update for day/week views if needed
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

    // AI Analysis (Placeholder)
    analyzeSchedule() {
        const now = Date.now();
        const weekFromNow = now + (7 * 24 * 60 * 60 * 1000);
        const upcoming = this.getEventsForDateRange(new Date(now), new Date(weekFromNow));
        
        return {
            totalEvents: upcoming.length,
            busyDays: this.findBusyDays(upcoming),
            freeTime: this.findFreeTime(upcoming),
            conflicts: this.findConflicts(upcoming)
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
        // Find gaps in schedule
        return [];
    }

    findConflicts(events) {
        // Find overlapping events
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
}

// Global instance
if (typeof window !== 'undefined') {
    window.CalendarEngine = CalendarEngine;
}
