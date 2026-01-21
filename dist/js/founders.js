// Founders Page - World-Class Interactive Experience

document.addEventListener('DOMContentLoaded', () => {
    initParticleSystem();
    initSmoothScroll();
    initIntersectionObserver();
    initNavbarEffects();
    initParallaxEffects();
    initCounterAnimations();
    initCardInteractions();
    initButtonRipples();
    initMouseTracking();
    initDetailAnimations();
    initScrollProgress();
    initFloatingCards();
    initSparkleEffects();
    initMagneticButtons();
    setTimeout(initTypingEffect, 500);
});

// Particle System for Hero Section
function initParticleSystem() {
    const container = document.getElementById('hero-particles');
    if (!container) return;
    
    const particleCount = 50;
    const particles = [];
    
    for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'hero-particle';
        const size = Math.random() * 4 + 2;
        const opacity = Math.random() * 0.5 + 0.3;
        const glow = Math.random() * 10 + 5;
        
        particle.style.cssText = `
            position: absolute;
            width: ${size}px;
            height: ${size}px;
            background: rgba(99, 102, 241, ${opacity});
            border-radius: 50%;
            pointer-events: none;
            box-shadow: 0 0 ${glow}px rgba(99, 102, 241, 0.8);
        `;
        
        const x = Math.random() * 100;
        const y = Math.random() * 100;
        const duration = Math.random() * 20 + 10;
        const delay = Math.random() * 5;
        
        particle.style.left = x + '%';
        particle.style.top = y + '%';
        particle.style.animation = `particleFloat ${duration}s ease-in-out ${delay}s infinite`;
        
        container.appendChild(particle);
        particles.push({ element: particle, x, y, speed: Math.random() * 0.5 + 0.2 });
    }
    
    if (!document.getElementById('particle-styles')) {
        const style = document.createElement('style');
        style.id = 'particle-styles';
        style.textContent = `
            @keyframes particleFloat {
                0%, 100% {
                    transform: translate(0, 0) scale(1);
                    opacity: 0.3;
                }
                25% {
                    transform: translate(20px, -20px) scale(1.2);
                    opacity: 0.8;
                }
                50% {
                    transform: translate(-15px, 15px) scale(0.8);
                    opacity: 0.5;
                }
                75% {
                    transform: translate(10px, 10px) scale(1.1);
                    opacity: 0.7;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    document.addEventListener('mousemove', (e) => {
        const mouseX = (e.clientX / window.innerWidth) * 100;
        const mouseY = (e.clientY / window.innerHeight) * 100;
        
        particles.forEach((particle) => {
            const dx = mouseX - particle.x;
            const dy = mouseY - particle.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            const force = Math.min(50 / (distance + 1), 20);
            
            const moveX = (dx / (distance + 1)) * force * particle.speed;
            const moveY = (dy / (distance + 1)) * force * particle.speed;
            
            particle.element.style.transform = `translate(${moveX}px, ${moveY}px)`;
        });
    });
}

function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const target = document.querySelector(this.getAttribute('href'));
            if (target) {
                target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
        });
    });
}

function initIntersectionObserver() {
    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -50px 0px' };
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                if (entry.target.classList.contains('founder-card')) {
                    const detailItems = entry.target.querySelectorAll('.detail-item[data-animate]');
                    detailItems.forEach((item, index) => {
                        setTimeout(() => item.classList.add('visible'), index * 100);
                    });
                }
                if (entry.target.classList.contains('stat-card')) {
                    entry.target.classList.add('animated');
                }
            }
        });
    }, observerOptions);

    document.querySelectorAll('.founder-card, .stat-card, .about-project').forEach(el => {
        observer.observe(el);
    });
}

function initNavbarEffects() {
    const navbar = document.querySelector('.navbar');
    if (!navbar) return;
    
    window.addEventListener('scroll', () => {
        const currentScroll = window.pageYOffset;
        if (currentScroll > 100) {
            navbar.style.background = 'rgba(15, 23, 42, 0.98)';
            navbar.style.backdropFilter = 'blur(30px)';
            navbar.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.3)';
            navbar.style.borderBottom = '1px solid rgba(99, 102, 241, 0.2)';
        } else {
            navbar.style.background = 'rgba(15, 23, 42, 0.8)';
            navbar.style.backdropFilter = 'blur(20px)';
            navbar.style.boxShadow = 'none';
            navbar.style.borderBottom = 'none';
        }
    });
}

function initParallaxEffects() {
    const orbs = document.querySelectorAll('.gradient-orb');
    window.addEventListener('mousemove', (e) => {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        orbs.forEach((orb, index) => {
            const speed = (index + 1) * 0.8;
            const x = (mouseX - 0.5) * 80 * speed;
            const y = (mouseY - 0.5) * 80 * speed;
            orb.style.transform = `translate(${x}px, ${y}px)`;
        });
    });
    
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const hero = document.querySelector('.founders-hero');
        if (hero) {
            hero.style.transform = `translateY(${scrolled * 0.3}px)`;
            hero.style.opacity = Math.max(0, 1 - (scrolled / 500));
        }
    });
}

function initCounterAnimations() {
    const counters = document.querySelectorAll('.stat-value[data-target], .stat-number[data-target]');
    
    const animateCounter = (counter) => {
        const target = parseInt(counter.getAttribute('data-target'));
        if (isNaN(target)) return;
        
        const duration = 2000;
        const startTime = Date.now();
        const startValue = 0;
        
        const updateCounter = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const current = Math.floor(startValue + (target - startValue) * easeOutQuart);
            
            if (progress < 1) {
                // Check if parent has label indicating percentage
                const parent = counter.closest('.hero-stat, .stat-card');
                const label = parent ? parent.querySelector('.stat-label') : null;
                const isPercentage = label && label.textContent.toLowerCase().includes('%');
                
                if (isPercentage || (target === 100 && counter.closest('.hero-stat'))) {
                    counter.textContent = current + '%';
                } else if (target >= 1000) {
                    counter.textContent = current;
                } else if (target > 10) {
                    counter.textContent = current + '+';
                } else {
                    counter.textContent = current;
                }
                requestAnimationFrame(updateCounter);
            } else {
                // Final value
                const parent = counter.closest('.hero-stat, .stat-card');
                const label = parent ? parent.querySelector('.stat-label') : null;
                const isPercentage = label && label.textContent.toLowerCase().includes('%');
                
                if (isPercentage || (target === 100 && counter.closest('.hero-stat'))) {
                    counter.textContent = target + '%';
                } else if (target >= 1000) {
                    counter.textContent = target;
                } else if (target > 10) {
                    counter.textContent = target + '+';
                } else {
                    counter.textContent = target;
                }
            }
        };
        updateCounter();
    };
    
    const checkAndAnimate = (counter) => {
        if (!counter.classList.contains('counted')) {
            counter.classList.add('counted');
            // Small delay to ensure visibility
            setTimeout(() => animateCounter(counter), 100);
        }
    };
    
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                checkAndAnimate(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '50px' });
    
    // Observe all counters
    counters.forEach(counter => {
        counterObserver.observe(counter);
        
        // If already in view, animate immediately
        const rect = counter.getBoundingClientRect();
        const isVisible = rect.top < window.innerHeight && rect.bottom > 0;
        if (isVisible) {
            setTimeout(() => checkAndAnimate(counter), 500);
        }
    });
}

function initCardInteractions() {
    const cards = document.querySelectorAll('.founder-card');
    cards.forEach(card => {
        const inner = card.querySelector('.founder-card-inner');
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const centerX = rect.width / 2;
            const centerY = rect.height / 2;
            const rotateX = (y - centerY) / 20;
            const rotateY = (centerX - x) / 20;
            inner.style.transform = `perspective(1200px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-16px)`;
        });
        card.addEventListener('mouseleave', () => {
            inner.style.transform = 'perspective(1200px) rotateX(0) rotateY(0) translateY(0)';
        });
    });
}

function initButtonRipples() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('click', function(e) {
            const ripple = this.querySelector('.btn-ripple');
            if (!ripple) return;
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            ripple.style.left = x + 'px';
            ripple.style.top = y + 'px';
            ripple.style.width = '0';
            ripple.style.height = '0';
            setTimeout(() => {
                ripple.style.width = '200px';
                ripple.style.height = '200px';
                ripple.style.left = (x - 100) + 'px';
                ripple.style.top = (y - 100) + 'px';
            }, 10);
        });
    });
}

function initMouseTracking() {
    const cards = document.querySelectorAll('.founder-card-inner, .stat-card');
    cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            const glow = card.querySelector('.card-glow');
            if (glow) {
                glow.style.background = `radial-gradient(circle 300px at ${x}% ${y}%, rgba(99, 102, 241, 0.2) 0%, rgba(139, 92, 246, 0.15) 30%, transparent 70%)`;
            }
        });
    });
}

function initDetailAnimations() {
    document.querySelectorAll('.detail-item[data-animate]').forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.1}s`;
    });
}

const heroStatsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.5 });

document.querySelectorAll('.hero-stat').forEach(stat => {
    stat.style.opacity = '1';
    stat.style.transform = 'translateY(0)';
    stat.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    heroStatsObserver.observe(stat);
});

function initTypingEffect() {
    const words = document.querySelectorAll('.title-word');
    // Only apply typing effect if words are empty, otherwise keep them visible
    words.forEach((word, index) => {
        const text = word.textContent || word.getAttribute('data-word') || '';
        if (!text) return;
        
        // Only clear if we want typing effect, otherwise keep visible
        // For now, keep text visible and just animate
        word.style.opacity = '1';
        if (word.textContent === '') {
            word.textContent = text;
        }
    });
}

function initScrollProgress() {
    const progressBar = document.createElement('div');
    progressBar.className = 'scroll-progress';
    progressBar.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        height: 3px;
        background: linear-gradient(90deg, var(--primary), var(--secondary));
        z-index: 10000;
        transform-origin: left;
        transform: scaleX(0);
        transition: transform 0.1s ease;
        width: 100%;
    `;
    document.body.appendChild(progressBar);
    
    window.addEventListener('scroll', () => {
        const windowHeight = document.documentElement.scrollHeight - window.innerHeight;
        const scrolled = window.pageYOffset;
        const progress = Math.min(scrolled / windowHeight, 1);
        progressBar.style.transform = `scaleX(${progress})`;
    });
}

function initFloatingCards() {
    const cards = document.querySelectorAll('.founder-card');
    cards.forEach((card, index) => {
        const delay = index * 0.5;
        card.style.animation = `cardFloat 6s ease-in-out ${delay}s infinite`;
    });
    
    if (!document.getElementById('card-float-styles')) {
        const style = document.createElement('style');
        style.id = 'card-float-styles';
        style.textContent = `
            @keyframes cardFloat {
                0%, 100% { transform: translateY(0) rotate(0deg); }
                25% { transform: translateY(-10px) rotate(0.5deg); }
                75% { transform: translateY(-5px) rotate(-0.5deg); }
            }
        `;
        document.head.appendChild(style);
    }
}

function initSparkleEffects() {
    const cards = document.querySelectorAll('.founder-card-inner, .stat-card');
    cards.forEach(card => {
        card.addEventListener('mouseenter', function(e) {
            for (let i = 0; i < 5; i++) {
                setTimeout(() => createSparkle(this, e), i * 100);
            }
        });
    });
}

function createSparkle(element, event) {
    const sparkle = document.createElement('div');
    sparkle.style.cssText = `
        position: absolute;
        width: 6px;
        height: 6px;
        background: radial-gradient(circle, rgba(255, 255, 255, 0.9) 0%, rgba(99, 102, 241, 0.8) 100%);
        border-radius: 50%;
        pointer-events: none;
        z-index: 1000;
        box-shadow: 0 0 10px rgba(99, 102, 241, 1), 0 0 20px rgba(139, 92, 246, 0.8);
    `;
    
    const rect = element.getBoundingClientRect();
    const x = (event?.clientX || Math.random() * rect.width) - rect.left;
    const y = (event?.clientY || Math.random() * rect.height) - rect.top;
    
    sparkle.style.left = x + 'px';
    sparkle.style.top = y + 'px';
    
    element.style.position = 'relative';
    element.appendChild(sparkle);
    
    const angle = Math.random() * Math.PI * 2;
    const distance = 40 + Math.random() * 40;
    const duration = 800 + Math.random() * 400;
    
    sparkle.animate([
        { transform: `translate(0, 0) scale(1)`, opacity: 1 },
        { transform: `translate(${Math.cos(angle) * distance}px, ${Math.sin(angle) * distance}px) scale(0)`, opacity: 0 }
    ], {
        duration: duration,
        easing: 'ease-out'
    }).onfinish = () => sparkle.remove();
}

function initMagneticButtons() {
    const buttons = document.querySelectorAll('.btn');
    buttons.forEach(button => {
        button.addEventListener('mousemove', function(e) {
            const rect = this.getBoundingClientRect();
            const x = e.clientX - rect.left - rect.width / 2;
            const y = e.clientY - rect.top - rect.height / 2;
            this.style.transform = `translate(${x * 0.1}px, ${y * 0.1}px) scale(1.05)`;
        });
        button.addEventListener('mouseleave', function() {
            this.style.transform = 'translate(0, 0) scale(1)';
        });
    });
}

console.log('✨ Founders page initialized with world-class features!');
