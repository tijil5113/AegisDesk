// Calendar App - Premium Calendar System
// Opens the full-featured calendar.html page
class CalendarApp {
    constructor() {
        this.windowId = 'calendar';
    }

    open() {
        // Open the premium calendar in a full window
        const content = `
            <iframe 
                src="calendar.html" 
                style="width: 100%; height: 100%; border: none; display: block;"
                frameborder="0"
                allowfullscreen>
            </iframe>
        `;
        
        const window = windowManager.createWindow(this.windowId, {
            title: 'Calendar',
            width: 1400,
            height: 900,
            class: 'app-calendar',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>`,
            content: content,
            resizable: true,
            maximizable: true
        });
    }
}

const calendarApp = new CalendarApp();
