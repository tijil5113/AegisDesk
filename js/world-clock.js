// World Clock - Fixed Timezone Logic with IANA Timezones
class WorldClock {
    constructor() {
        this.timezones = [
            { city: 'New York', tz: 'America/New_York' },
            { city: 'London', tz: 'Europe/London' },
            { city: 'Tokyo', tz: 'Asia/Tokyo' },
            { city: 'Sydney', tz: 'Australia/Sydney' },
            { city: 'Dubai', tz: 'Asia/Dubai' },
            { city: 'Mumbai', tz: 'Asia/Kolkata' },
            { city: 'Paris', tz: 'Europe/Paris' },
            { city: 'Singapore', tz: 'Asia/Singapore' },
            { city: 'Los Angeles', tz: 'America/Los_Angeles' },
            { city: 'Beijing', tz: 'Asia/Shanghai' },
            { city: 'Moscow', tz: 'Europe/Moscow' },
            { city: 'Toronto', tz: 'America/Toronto' }
        ];
        this.lastUpdateTime = 0;
        this.init();
    }

    // Get time in specific timezone using Intl.DateTimeFormat
    getTimeInTimezone(timezone) {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            hour: 'numeric',
            minute: 'numeric',
            second: 'numeric',
            hour12: false
        });
        
        const parts = formatter.formatToParts(now);
        const hours = parseInt(parts.find(p => p.type === 'hour').value);
        const minutes = parseInt(parts.find(p => p.type === 'minute').value);
        const seconds = parseInt(parts.find(p => p.type === 'second').value);
        
        return { hours, minutes, seconds, date: now };
    }

    init() {
        const grid = document.getElementById('world-clock-grid');
        if (!grid) return;

        this.timezones.forEach((tz, index) => {
            const clockItem = this.createClock(tz, index);
            grid.appendChild(clockItem);
        });

        // Update clocks every 30 seconds (was every second) for better performance
        this.updateClocks();
        this.lastUpdateTime = Date.now();
        setInterval(() => {
            const now = Date.now();
            // Update every 30 seconds instead of every second
            if (now - this.lastUpdateTime >= 30000) {
                this.updateClocks();
                this.lastUpdateTime = now;
            }
        }, 30000);
        
        // But update time display every minute for accuracy
        setInterval(() => {
            this.updateClocks();
        }, 60000);
    }

    createClock(timezone, index) {
        const item = document.createElement('div');
        item.className = 'world-clock-item';
        item.dataset.timezone = timezone.tz;
        item.style.opacity = '0';
        item.style.transform = 'translateY(20px)';
        
        // Stagger animation based on boot completion
        const delay = 2000 + (index * 100); // Start after boot sequence
        item.style.transition = `opacity 0.6s ease ${delay}ms, transform 0.6s ease ${delay}ms`;
        
        setTimeout(() => {
            item.style.opacity = '1';
            item.style.transform = 'translateY(0)';
        }, delay + 100);

        item.innerHTML = `
            <div class="world-clock-face">
                <div class="world-clock-numbers-12"></div>
                <div class="world-clock-hour-hand" data-hand="hour"></div>
                <div class="world-clock-minute-hand" data-hand="minute"></div>
                <div class="world-clock-center"></div>
            </div>
            <div class="world-clock-city">${timezone.city}</div>
            <div class="world-clock-time-display">
                <div class="world-clock-time-12" data-time-12>12:00:00 AM</div>
            </div>
            <div class="world-clock-date" data-date>Mon, Jan 1</div>
            <div class="world-clock-timezone">${timezone.tz.replace('_', ' ')}</div>
        `;

        // Add 12-hour numbers (1-12) - centered on clock face
        const numbers12 = item.querySelector('.world-clock-numbers-12');
        for (let i = 1; i <= 12; i++) {
            const number = document.createElement('div');
            number.className = 'world-clock-number world-clock-number-12';
            number.textContent = i;
            const angle = (i * 30) - 90;
            const radius = 57; // Centered radius for 140px clock face (70px radius)
            const x = Math.cos(angle * Math.PI / 180) * radius;
            const y = Math.sin(angle * Math.PI / 180) * radius;
            number.style.left = `calc(50% + ${x}px)`;
            number.style.top = `calc(50% + ${y}px)`;
            number.style.transform = 'translate(-50%, -50%)';
            number.style.zIndex = '15';
            numbers12.appendChild(number);
        }

        return item;
    }

    updateClocks() {
        // Calculate time once per update cycle
        const now = new Date();
        
        document.querySelectorAll('.world-clock-item').forEach(item => {
            const timezone = item.dataset.timezone;
            const timeData = this.getTimeInTimezone(timezone);
            const { hours, minutes, seconds, date } = timeData;
            
            const hourHand = item.querySelector('[data-hand="hour"]');
            const minuteHand = item.querySelector('[data-hand="minute"]');
            const timeDisplay12 = item.querySelector('[data-time-12]');
            const dateDisplay = item.querySelector('[data-date]');
            
            // Update hands - hour hand uses 12-hour format for analog display
            const hours12 = hours % 12 || 12; // Convert to 12-hour format
            const hourAngle = (hours12 * 30) + (minutes * 0.5); // 30 degrees per hour, 0.5 degrees per minute
            const minuteAngle = (minutes * 6) + (seconds * 0.1); // 360/60 = 6 degrees per minute, 0.1 degrees per second
            
            if (hourHand) {
                hourHand.style.transform = `rotate(${hourAngle}deg)`;
            }
            if (minuteHand) {
                minuteHand.style.transform = `rotate(${minuteAngle}deg)`;
            }
            
            // Update 12-hour time display
            if (timeDisplay12) {
                const ampm = hours >= 12 ? 'PM' : 'AM';
                const timeString12 = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
                timeDisplay12.textContent = timeString12;
            }
            
            // Update date display
            if (dateDisplay) {
                const dateFormatter = new Intl.DateTimeFormat('en-US', {
                    timeZone: timezone,
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric'
                });
                dateDisplay.textContent = dateFormatter.format(date);
            }
        });
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new WorldClock();
});
