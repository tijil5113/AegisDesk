// Calendar App
class CalendarApp {
    constructor() {
        this.windowId = 'calendar';
        this.currentDate = new Date();
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Calendar',
            width: 600,
            height: 550,
            class: 'app-calendar',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                <line x1="16" y1="2" x2="16" y2="6"></line>
                <line x1="8" y1="2" x2="8" y2="6"></line>
                <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        const year = this.currentDate.getFullYear();
        const month = this.currentDate.getMonth();
        const monthName = this.currentDate.toLocaleString('en-US', { month: 'long' });
        
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const today = new Date();
        
        let calendarHTML = `
            <div class="calendar-container">
                <div class="calendar-header">
                    <button class="calendar-nav-btn" id="prev-month">‹</button>
                    <h2 class="calendar-month-year">${monthName} ${year}</h2>
                    <button class="calendar-nav-btn" id="next-month">›</button>
                </div>
                <div class="calendar-weekdays">
                    <div class="calendar-weekday">Sun</div>
                    <div class="calendar-weekday">Mon</div>
                    <div class="calendar-weekday">Tue</div>
                    <div class="calendar-weekday">Wed</div>
                    <div class="calendar-weekday">Thu</div>
                    <div class="calendar-weekday">Fri</div>
                    <div class="calendar-weekday">Sat</div>
                </div>
                <div class="calendar-days" id="calendar-days">
        `;

        // Empty cells for days before month starts
        for (let i = 0; i < firstDay; i++) {
            calendarHTML += `<div class="calendar-day calendar-day-empty"></div>`;
        }

        // Days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const isToday = year === today.getFullYear() && 
                           month === today.getMonth() && 
                           day === today.getDate();
            calendarHTML += `
                <div class="calendar-day ${isToday ? 'calendar-day-today' : ''}" data-day="${day}">
                    ${day}
                </div>
            `;
        }

        calendarHTML += `
                </div>
            </div>
        `;

        return calendarHTML;
    }

    attachEvents(window) {
        const content = window.querySelector('.window-content');
        const prevBtn = content.querySelector('#prev-month');
        const nextBtn = content.querySelector('#next-month');

        prevBtn.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() - 1);
            this.refresh(window);
        });

        nextBtn.addEventListener('click', () => {
            this.currentDate.setMonth(this.currentDate.getMonth() + 1);
            this.refresh(window);
        });
    }

    refresh(window) {
        const content = window.querySelector('.window-content');
        content.innerHTML = this.render();
        this.attachEvents(window);
    }
}

const calendarApp = new CalendarApp();
