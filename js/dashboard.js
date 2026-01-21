// Dashboard - Daily AI Briefing
class Dashboard {
    constructor() {
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // Wait for dependencies
        await this.waitForDependencies();
        
        // Setup UI
        this.setupUI();
        
        // Load data
        await this.loadData();
        
        // Generate briefing
        await this.generateBriefing();
        
        this.initialized = true;
    }

    async waitForDependencies() {
        // Wait for userProfile, osStore, etc.
        let attempts = 0;
        while ((typeof userProfile === 'undefined' || !userProfile.initialized) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
    }

    setupUI() {
        // Update greeting based on time
        this.updateGreeting();
        
        // Update date
        this.updateDate();
        
        // Setup refresh button
        document.getElementById('dashboard-refresh-briefing').addEventListener('click', () => {
            this.generateBriefing();
        });
        
        // Setup close button
        document.getElementById('dashboard-close-btn').addEventListener('click', () => {
            window.close();
        });
        
        // Setup settings button
        document.getElementById('dashboard-settings-btn').addEventListener('click', () => {
            if (typeof windowManager !== 'undefined' && typeof settingsApp !== 'undefined') {
                settingsApp.open();
            } else {
                window.open('settings.html', '_blank');
            }
        });
        
        // Setup view all tasks link
        document.getElementById('dashboard-view-all-tasks').addEventListener('click', (e) => {
            e.preventDefault();
            if (typeof tasksApp !== 'undefined') {
                tasksApp.open();
            }
        });
    }

    updateGreeting() {
        const hour = new Date().getHours();
        let greeting;
        
        if (hour < 12) {
            greeting = typeof i18n !== 'undefined' ? i18n.t('time.goodMorning') : 'Good Morning';
        } else if (hour < 17) {
            greeting = typeof i18n !== 'undefined' ? i18n.t('time.goodAfternoon') : 'Good Afternoon';
        } else if (hour < 21) {
            greeting = typeof i18n !== 'undefined' ? i18n.t('time.goodEvening') : 'Good Evening';
        } else {
            greeting = typeof i18n !== 'undefined' ? i18n.t('time.goodNight') : 'Good Night';
        }
        
        document.getElementById('dashboard-greeting').textContent = greeting;
    }

    updateDate() {
        const date = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        document.getElementById('dashboard-date').textContent = date.toLocaleDateString('en-US', options);
    }

    async loadData() {
        // Load tasks
        this.loadTasks();
        
        // Load stats
        this.loadStats();
        
        // Load news
        this.loadNews();
        
        // Load weather
        this.loadWeather();
        
        // Load focus suggestion
        this.loadFocusSuggestion();
    }

    loadTasks() {
        const tasks = osStore?.getStateSlice('tasks') || storage.get('tasks', []);
        const today = new Date().toDateString();
        
        const todayTasks = tasks.filter(task => {
            if (task.completed) return false;
            if (!task.dueDate) return true;
            return new Date(task.dueDate).toDateString() === today;
        }).slice(0, 5);
        
        const container = document.getElementById('dashboard-tasks');
        if (todayTasks.length === 0) {
            container.innerHTML = '<div class="dashboard-empty">No tasks for today</div>';
            return;
        }
        
        container.innerHTML = todayTasks.map(task => `
            <div class="dashboard-task-item ${task.completed ? 'completed' : ''}" data-task-id="${task.id || ''}">
                <div class="dashboard-task-checkbox ${task.completed ? 'completed' : ''}">
                    ${task.completed ? '✓' : ''}
                </div>
                <div class="dashboard-task-text">${this.escapeHtml(task.text || 'Untitled Task')}</div>
            </div>
        `).join('');
    }

    loadStats() {
        const tasks = osStore?.getStateSlice('tasks') || storage.get('tasks', []);
        const notes = osStore?.getStateSlice('notes') || storage.get('notes', []);
        
        const today = new Date().toDateString();
        const completedToday = tasks.filter(t => 
            t.completed && new Date(t.completedAt || t.updatedAt).toDateString() === today
        ).length;
        
        document.getElementById('dashboard-tasks-completed').textContent = completedToday;
        document.getElementById('dashboard-notes-count').textContent = notes.length;
        
        // News read today (from user profile)
        if (typeof userProfile !== 'undefined') {
            const insights = userProfile.getInsights();
            if (insights) {
                document.getElementById('dashboard-news-read').textContent = 
                    insights.totalNewsReadingTime || 0;
            }
        }
        
        // Focus score (placeholder)
        document.getElementById('dashboard-focus-score').textContent = '--';
    }

    async loadNews() {
        const container = document.getElementById('dashboard-news');
        
        try {
            // Try to get news from news hub if available
            if (typeof window.newsHub !== 'undefined' && window.newsHub.allArticles) {
                const articles = window.newsHub.allArticles.slice(0, 3);
                if (articles.length > 0) {
                    container.innerHTML = articles.map(article => `
                        <div class="dashboard-news-item" onclick="window.open('${article.url || '#'}', '_blank')">
                            <div class="dashboard-news-title">${this.escapeHtml(article.title || 'Untitled')}</div>
                            <div class="dashboard-news-source">${this.escapeHtml(article.source?.name || 'Unknown')}</div>
                        </div>
                    `).join('');
                    return;
                }
            }
            
            // Fallback: show empty state
            container.innerHTML = '<div class="dashboard-empty">No news available. <a href="news.html">Browse news</a></div>';
        } catch (error) {
            console.error('[Dashboard] Error loading news:', error);
            container.innerHTML = '<div class="dashboard-empty">Unable to load news</div>';
        }
    }

    async loadWeather() {
        const container = document.getElementById('dashboard-weather');
        
        try {
            const weather = osStore?.getStateSlice('weather') || storage.get('lastWeather', null);
            
            if (weather) {
                container.innerHTML = `
                    <div class="dashboard-weather-main">
                        <div class="dashboard-weather-icon">${this.getWeatherIcon(weather.condition)}</div>
                        <div>
                            <div class="dashboard-weather-temp">${Math.round(weather.temp || 0)}°</div>
                            <div class="dashboard-weather-desc">${weather.description || 'Clear'}</div>
                        </div>
                    </div>
                `;
            } else {
                container.innerHTML = '<div class="dashboard-empty">Weather data not available</div>';
            }
        } catch (error) {
            console.error('[Dashboard] Error loading weather:', error);
            container.innerHTML = '<div class="dashboard-empty">Unable to load weather</div>';
        }
    }

    getWeatherIcon(condition) {
        const icons = {
            'clear': '☀️',
            'cloudy': '☁️',
            'rain': '🌧️',
            'snow': '❄️',
            'storm': '⛈️',
            'wind': '💨'
        };
        return icons[condition?.toLowerCase()] || '☀️';
    }

    async loadFocusSuggestion() {
        const container = document.getElementById('dashboard-focus');
        
        if (typeof userProfile === 'undefined' || !userProfile.initialized) {
            container.innerHTML = '<div class="dashboard-focus-text">Focus on completing your tasks today.</div>';
            return;
        }
        
        const insights = userProfile.getInsights();
        if (!insights) {
            container.innerHTML = '<div class="dashboard-focus-text">Focus on completing your tasks today.</div>';
            return;
        }
        
        // Generate simple focus suggestion based on insights
        const topApp = insights.topApps[0];
        const suggestion = topApp 
            ? `You've been using ${topApp.appId} frequently. Consider focusing on related tasks.`
            : 'Focus on completing your most important tasks today.';
        
        container.innerHTML = `<div class="dashboard-focus-text">${suggestion}</div>`;
    }

    async generateBriefing() {
        const container = document.getElementById('dashboard-briefing-content');
        container.innerHTML = '<div class="dashboard-loading">Generating your briefing...</div>';
        
        try {
            // Get context
            const tasks = osStore?.getStateSlice('tasks') || storage.get('tasks', []);
            const notes = osStore?.getStateSlice('notes') || storage.get('notes', []);
            const weather = osStore?.getStateSlice('weather') || storage.get('lastWeather', null);
            
            const activeTasks = tasks.filter(t => !t.completed).length;
            const completedToday = tasks.filter(t => 
                t.completed && new Date(t.completedAt || t.updatedAt).toDateString() === new Date().toDateString()
            ).length;
            
            // Build briefing text
            let briefing = `You have ${activeTasks} active task${activeTasks !== 1 ? 's' : ''} in your list. `;
            
            if (completedToday > 0) {
                briefing += `Great job completing ${completedToday} task${completedToday !== 1 ? 's' : ''} today! `;
            }
            
            if (notes.length > 0) {
                briefing += `You have ${notes.length} note${notes.length !== 1 ? 's' : ''} saved. `;
            }
            
            if (weather) {
                briefing += `The weather is ${weather.description || 'clear'} with a temperature of ${Math.round(weather.temp || 0)}°. `;
            }
            
            // Add AI-generated insight if available
            if (typeof userProfile !== 'undefined' && userProfile.initialized) {
                const insights = userProfile.getInsights();
                if (insights && insights.topApps.length > 0) {
                    const topApp = insights.topApps[0];
                    briefing += `Your most used app is ${topApp.appId}. `;
                }
            }
            
            briefing += 'Have a productive day!';
            
            // Use AI to enhance if available
            if (typeof aiSystem !== 'undefined' && aiSystem.apiKey) {
                try {
                    const enhanced = await this.enhanceBriefing(briefing, { tasks, notes, weather });
                    container.innerHTML = `<div class="dashboard-briefing-text">${enhanced}</div>`;
                } catch (error) {
                    console.error('[Dashboard] AI enhancement failed:', error);
                    container.innerHTML = `<div class="dashboard-briefing-text">${briefing}</div>`;
                }
            } else {
                container.innerHTML = `<div class="dashboard-briefing-text">${briefing}</div>`;
            }
        } catch (error) {
            console.error('[Dashboard] Error generating briefing:', error);
            container.innerHTML = '<div class="dashboard-empty">Unable to generate briefing</div>';
        }
    }

    async enhanceBriefing(briefing, context) {
        if (!aiSystem || !aiSystem.apiKey) return briefing;
        
        const prompt = `Generate a brief, friendly daily briefing based on this information: ${briefing}. Make it natural and encouraging. Keep it under 150 words.`;
        
        try {
            const response = await aiSystem.getAIResponse(prompt, false);
            return response || briefing;
        } catch (error) {
            return briefing;
        }
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize dashboard
const dashboard = new Dashboard();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => dashboard.init());
} else {
    dashboard.init();
}
