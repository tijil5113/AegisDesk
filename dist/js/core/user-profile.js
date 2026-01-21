// User Profile System - Core OS Intelligence
// Tracks user habits, preferences, and provides insights
class UserProfile {
    constructor() {
        this.profile = null;
        this.events = [];
        this.initialized = false;
        this.maxEvents = 1000; // Keep last 1000 events
    }

    async init() {
        if (this.initialized) return;
        
        // Load profile from storage
        this.profile = storage.get('user_profile', this.getDefaultProfile());
        
        // Load events
        this.events = storage.get('user_profile_events', []);
        
        // Clean old events (keep last 30 days)
        this.cleanOldEvents();
        
        this.initialized = true;
        console.log('[UserProfile] Initialized');
    }

    getDefaultProfile() {
        return {
            // Preferences
            preferredApps: [],
            preferredTheme: 'dark',
            language: 'en',
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            
            // Active hours (when user is most active)
            activeHours: {
                start: 9, // 9 AM
                end: 18,   // 6 PM
                days: [1, 2, 3, 4, 5] // Monday-Friday
            },
            
            // News preferences
            newsCategories: [],
            newsSources: [],
            newsReadingTime: 0, // Total minutes spent reading news
            
            // Commands
            frequentCommands: [],
            
            // Productivity
            focusSessions: [],
            productivityScore: 0,
            
            // Habits (passive tracking)
            habits: {
                appUsage: {}, // { appId: { count, totalTime, lastUsed } }
                features: {}, // { feature: count }
                patterns: {}  // { pattern: data }
            },
            
            // AI memory
            aiMemory: [],
            
            // Metadata
            createdAt: new Date().toISOString(),
            lastUpdated: new Date().toISOString(),
            version: 1
        };
    }

    // Get full profile
    getUserProfile() {
        if (!this.initialized) {
            console.warn('[UserProfile] Not initialized, returning default');
            return this.getDefaultProfile();
        }
        return { ...this.profile };
    }

    // Update profile (partial)
    updateUserProfile(partial) {
        if (!this.initialized) {
            console.warn('[UserProfile] Not initialized, initializing now');
            this.init();
        }
        
        this.profile = {
            ...this.profile,
            ...partial,
            lastUpdated: new Date().toISOString()
        };
        
        // Persist
        storage.set('user_profile', this.profile);
        
        // Record event
        this.recordEvent('profile_updated', { changes: Object.keys(partial) });
    }

    // Record an event (passive tracking)
    recordEvent(type, metadata = {}) {
        if (!this.initialized) {
            this.init();
        }
        
        const event = {
            type,
            metadata,
            timestamp: new Date().toISOString(),
            id: Date.now() + Math.random()
        };
        
        this.events.push(event);
        
        // Keep only recent events
        if (this.events.length > this.maxEvents) {
            this.events = this.events.slice(-this.maxEvents);
        }
        
        // Update habits based on event
        this.updateHabitsFromEvent(event);
        
        // Persist events (throttled - save every 10 events)
        if (this.events.length % 10 === 0) {
            storage.set('user_profile_events', this.events);
        }
    }

    // Update habits from events
    updateHabitsFromEvent(event) {
        const { type, metadata } = event;
        
        switch (type) {
            case 'app_opened':
                const appId = metadata.appId;
                if (appId) {
                    if (!this.profile.habits.appUsage[appId]) {
                        this.profile.habits.appUsage[appId] = {
                            count: 0,
                            totalTime: 0,
                            lastUsed: null
                        };
                    }
                    this.profile.habits.appUsage[appId].count++;
                    this.profile.habits.appUsage[appId].lastUsed = event.timestamp;
                }
                break;
                
            case 'app_closed':
                if (metadata.appId && metadata.duration) {
                    const appId = metadata.appId;
                    if (this.profile.habits.appUsage[appId]) {
                        this.profile.habits.appUsage[appId].totalTime += metadata.duration;
                    }
                }
                break;
                
            case 'feature_used':
                const feature = metadata.feature;
                if (feature) {
                    if (!this.profile.habits.features[feature]) {
                        this.profile.habits.features[feature] = 0;
                    }
                    this.profile.habits.features[feature]++;
                }
                break;
                
            case 'command_executed':
                const command = metadata.command;
                if (command) {
                    const existing = this.profile.frequentCommands.find(c => c.command === command);
                    if (existing) {
                        existing.count++;
                        existing.lastUsed = event.timestamp;
                    } else {
                        this.profile.frequentCommands.push({
                            command,
                            count: 1,
                            lastUsed: event.timestamp
                        });
                    }
                    // Sort by count
                    this.profile.frequentCommands.sort((a, b) => b.count - a.count);
                    // Keep top 20
                    this.profile.frequentCommands = this.profile.frequentCommands.slice(0, 20);
                }
                break;
                
            case 'news_read':
                if (metadata.category) {
                    if (!this.profile.newsCategories.includes(metadata.category)) {
                        this.profile.newsCategories.push(metadata.category);
                    }
                }
                if (metadata.source) {
                    if (!this.profile.newsSources.includes(metadata.source)) {
                        this.profile.newsSources.push(metadata.source);
                    }
                }
                if (metadata.readingTime) {
                    this.profile.newsReadingTime += metadata.readingTime;
                }
                break;
                
            case 'theme_changed':
                this.profile.preferredTheme = metadata.theme;
                break;
                
            case 'language_changed':
                this.profile.language = metadata.language;
                break;
        }
        
        // Auto-save profile periodically
        if (this.events.length % 50 === 0) {
            storage.set('user_profile', this.profile);
        }
    }

    // Get insights
    getInsights() {
        if (!this.initialized) {
            return null;
        }
        
        const insights = {
            // Most used apps
            topApps: Object.entries(this.profile.habits.appUsage)
                .sort((a, b) => b[1].count - a[1].count)
                .slice(0, 5)
                .map(([appId, data]) => ({
                    appId,
                    count: data.count,
                    totalTime: data.totalTime,
                    lastUsed: data.lastUsed
                })),
            
            // Most used features
            topFeatures: Object.entries(this.profile.habits.features)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5)
                .map(([feature, count]) => ({ feature, count })),
            
            // Frequent commands
            topCommands: this.profile.frequentCommands.slice(0, 5),
            
            // News preferences
            preferredNewsCategories: this.profile.newsCategories.slice(0, 5),
            preferredNewsSources: this.profile.newsSources.slice(0, 5),
            totalNewsReadingTime: this.profile.newsReadingTime,
            
            // Activity patterns
            activeHours: this.profile.activeHours,
            
            // Productivity
            productivityScore: this.profile.productivityScore,
            
            // Recent activity
            recentEvents: this.events.slice(-10).reverse(),
            
            // Statistics
            stats: {
                totalAppSessions: Object.values(this.profile.habits.appUsage)
                    .reduce((sum, app) => sum + app.count, 0),
                totalFeaturesUsed: Object.values(this.profile.habits.features)
                    .reduce((sum, count) => sum + count, 0),
                profileAge: Math.floor((Date.now() - new Date(this.profile.createdAt).getTime()) / (1000 * 60 * 60 * 24)) // days
            }
        };
        
        return insights;
    }

    // Clean old events (keep last 30 days)
    cleanOldEvents() {
        const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
        this.events = this.events.filter(event => {
            const eventTime = new Date(event.timestamp).getTime();
            return eventTime > thirtyDaysAgo;
        });
        storage.set('user_profile_events', this.events);
    }

    // Get user's preferred theme
    getPreferredTheme() {
        return this.profile?.preferredTheme || 'dark';
    }

    // Get user's language
    getLanguage() {
        return this.profile?.language || 'en';
    }

    // Get preferred apps
    getPreferredApps() {
        return this.profile?.preferredApps || [];
    }

    // Get news preferences
    getNewsPreferences() {
        return {
            categories: this.profile?.newsCategories || [],
            sources: this.profile?.newsSources || []
        };
    }

    // Add AI memory
    addAIMemory(memory) {
        if (!this.profile.aiMemory) {
            this.profile.aiMemory = [];
        }
        this.profile.aiMemory.push({
            ...memory,
            timestamp: new Date().toISOString()
        });
        // Keep last 100 memories
        if (this.profile.aiMemory.length > 100) {
            this.profile.aiMemory = this.profile.aiMemory.slice(-100);
        }
        storage.set('user_profile', this.profile);
    }

    // Get AI memory
    getAIMemory() {
        return this.profile?.aiMemory || [];
    }

    // Reset profile (keep structure, clear data)
    resetProfile() {
        this.profile = this.getDefaultProfile();
        this.events = [];
        storage.set('user_profile', this.profile);
        storage.set('user_profile_events', this.events);
        this.recordEvent('profile_reset', {});
    }

    // Export profile data (for privacy panel)
    exportProfileData() {
        return {
            profile: this.profile,
            eventsCount: this.events.length,
            insights: this.getInsights()
        };
    }
}

// Create singleton instance
const userProfile = new UserProfile();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => userProfile.init());
} else {
    userProfile.init();
}

// Make globally accessible
window.userProfile = userProfile;
