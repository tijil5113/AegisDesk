// Welcome Page Interactions - Fixed Timezone Logic
document.addEventListener('DOMContentLoaded', () => {
    // Boot sequence state
    let bootComplete = false;
    
    // Initialize boot sequence
    function initBootSequence() {
        document.body.classList.add('boot-loading');
        
        // Show boot text
        const bootText = document.createElement('div');
        bootText.className = 'boot-text-overlay';
        bootText.innerHTML = '<div class="boot-text-line">Synchronizing time...</div>';
        document.body.appendChild(bootText);
        
        // Complete boot after delay
        setTimeout(() => {
            bootText.classList.add('fade-out');
            setTimeout(() => {
                bootText.remove();
                document.body.classList.remove('boot-loading');
                document.body.classList.add('boot-complete');
                bootComplete = true;
                
                // Fade in clocks
                const clockContainer = document.querySelector('.hero-clock-container');
                if (clockContainer) {
                    clockContainer.style.opacity = '0';
                    clockContainer.style.transform = 'translateY(20px)';
                    setTimeout(() => {
                        clockContainer.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
                        clockContainer.style.opacity = '1';
                        clockContainer.style.transform = 'translateY(0)';
                    }, 300);
                }
            }, 500);
        }, 1800);
    }
    
    // Initialize clock numbers
    function initClockNumbers() {
        const numbers12 = document.getElementById('clock-numbers-12');
        
        if (numbers12) {
            // Create 12-hour numbers (1-12) - centered on clock face
            for (let i = 1; i <= 12; i++) {
                const number = document.createElement('div');
                number.className = 'clock-number clock-number-12';
                number.textContent = i;
                const angle = (i * 30) - 90; // -90 to start at top
                const radius = 115; // Centered radius for better visibility
                const x = Math.cos(angle * Math.PI / 180) * radius;
                const y = Math.sin(angle * Math.PI / 180) * radius;
                number.style.left = `calc(50% + ${x}px)`;
                number.style.top = `calc(50% + ${y}px)`;
                number.style.transform = 'translate(-50%, -50%)';
                number.style.zIndex = '10';
                numbers12.appendChild(number);
            }
        }
    }
    
    // Get time in specific timezone using Intl.DateTimeFormat
    function getTimeInTimezone(timezone) {
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
    
    // Clock functionality - India time (Asia/Kolkata)
    function updateClock() {
        // Get time once per update cycle
        const timeData = getTimeInTimezone('Asia/Kolkata');
        const { hours, minutes, seconds, date } = timeData;
        
        // Update clock hands - using 12-hour format for analog display
        const hoursHand = document.getElementById('clock-hours');
        const minutesHand = document.getElementById('clock-minutes');
        const secondsHand = document.getElementById('clock-seconds');
        const timeText12 = document.getElementById('clock-time-12');
        const dateText = document.getElementById('clock-date-text');
        
        // Hour hand: 12-hour format (360/12 = 30 degrees per hour)
        // Also account for minutes (hour hand moves between hours)
        if (hoursHand) {
            const hours12 = hours % 12 || 12; // Convert to 12-hour format
            const hourAngle = (hours12 * 30) + (minutes * 0.5); // 30 degrees per hour, 0.5 degrees per minute
            hoursHand.style.transform = `rotate(${hourAngle}deg)`;
        }
        
        // Minute hand: rotates 360 degrees per hour
        if (minutesHand) {
            const minuteAngle = (minutes * 6) + (seconds * 0.1); // 360/60 = 6 degrees per minute, 0.1 degrees per second
            minutesHand.style.transform = `rotate(${minuteAngle}deg)`;
        }
        
        // Second hand: rotates 360 degrees per minute
        if (secondsHand) {
            const secondAngle = seconds * 6; // 360/60 = 6 degrees per second
            secondsHand.style.transform = `rotate(${secondAngle}deg)`;
        }
        
        // Update 12-hour time display
        if (timeText12) {
            const hours12 = hours % 12 || 12;
            const ampm = hours >= 12 ? 'PM' : 'AM';
            const timeString12 = `${String(hours12).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')} ${ampm}`;
            timeText12.textContent = timeString12;
        }
        
        // Update date display
        if (dateText) {
            const dateFormatter = new Intl.DateTimeFormat('en-US', {
                timeZone: 'Asia/Kolkata',
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            dateText.textContent = dateFormatter.format(date);
        }
    }
    
    // Initialize numbers on page load
    initClockNumbers();
    
    // Start boot sequence
    initBootSequence();
    
    // Update clock immediately and then every 30 seconds for better performance
    updateClock();
    
    // Update on the minute for accuracy (less frequent updates)
    const secondsUntilNextMinute = 60000 - (new Date().getSeconds() * 1000 + new Date().getMilliseconds());
    setTimeout(() => {
        if (bootComplete) {
            updateClock();
        }
        setInterval(() => {
            if (bootComplete) {
                updateClock();
            }
        }, 60000); // Every minute instead of every second
    }, secondsUntilNextMinute);
    
    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });

    // Intersection Observer for fade-in animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && bootComplete) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);

    // Observe feature cards
    document.querySelectorAll('.feature-card').forEach(card => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        card.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(card);
    });

    // Navbar scroll effect
    let lastScroll = 0;
    const navbar = document.querySelector('.navbar');
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        
        if (currentScroll > 100) {
            navbar.style.background = 'rgba(15, 23, 42, 0.95)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.8)';
            navbar.style.boxShadow = 'none';
        }
        
        lastScroll = currentScroll;
    });

    // Add parallax effect to orbs
    window.addEventListener('mousemove', (e) => {
        if (!bootComplete) return;
        
        const orbs = document.querySelectorAll('.gradient-orb');
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 0.5;
            const x = (mouseX - 0.5) * 50 * speed;
            const y = (mouseY - 0.5) * 50 * speed;
            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
});
