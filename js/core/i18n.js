// Internationalization (i18n) System
// Multi-language support for the entire OS
class I18n {
    constructor() {
        this.currentLanguage = 'en';
        this.translations = {};
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;
        
        // Load language preference
        const savedLanguage = storage.get('user_language', null);
        if (savedLanguage && this.supportsLanguage(savedLanguage)) {
            this.currentLanguage = savedLanguage;
        } else {
            // Try to detect from browser
            const browserLang = navigator.language.split('-')[0];
            if (this.supportsLanguage(browserLang)) {
                this.currentLanguage = browserLang;
            }
        }
        
        // Load translations
        await this.loadTranslations();
        
        this.initialized = true;
        console.log(`[I18n] Initialized with language: ${this.currentLanguage}`);
    }

    supportsLanguage(lang) {
        return ['en', 'ta', 'hi'].includes(lang);
    }

    async loadTranslations() {
        this.translations = {
            en: this.getEnglishTranslations(),
            ta: this.getTamilTranslations(),
            hi: this.getHindiTranslations()
        };
    }

    getEnglishTranslations() {
        return {
            // Common
            'common.ok': 'OK',
            'common.cancel': 'Cancel',
            'common.close': 'Close',
            'common.save': 'Save',
            'common.delete': 'Delete',
            'common.edit': 'Edit',
            'common.search': 'Search',
            'common.loading': 'Loading...',
            'common.error': 'Error',
            'common.success': 'Success',
            
            // Time
            'time.goodMorning': 'Good Morning',
            'time.goodAfternoon': 'Good Afternoon',
            'time.goodEvening': 'Good Evening',
            'time.goodNight': 'Good Night',
            
            // Apps
            'app.tasks': 'Tasks',
            'app.notes': 'Notes',
            'app.weather': 'Weather',
            'app.news': 'News',
            'app.calculator': 'Calculator',
            'app.calendar': 'Calendar',
            'app.settings': 'Settings',
            'app.aiAssistant': 'AI Assistant',
            'app.browser': 'Browser',
            'app.files': 'Files',
            'app.music': 'Music Player',
            'app.gallery': 'Gallery',
            'app.email': 'Email',
            'app.codeEditor': 'Code Editor',
            'app.terminal': 'Terminal',
            'app.drawing': 'Drawing',
            'app.bookmarks': 'Bookmarks',
            'app.help': 'Help',
            'app.systemMonitor': 'System Monitor',
            'app.systemIntelligence': 'System Intelligence',
            'app.playground': 'Playground',
            
            // Dashboard
            'dashboard.title': 'Dashboard',
            'dashboard.welcome': 'Welcome',
            'dashboard.todayTasks': 'Today\'s Tasks',
            'dashboard.topNews': 'Top News',
            'dashboard.weather': 'Weather',
            'dashboard.focusSuggestion': 'Focus Suggestion',
            'dashboard.noTasks': 'No tasks for today',
            'dashboard.noNews': 'No news available',
            
            // Settings
            'settings.title': 'Settings',
            'settings.appearance': 'Appearance',
            'settings.theme': 'Theme',
            'settings.language': 'Language',
            'settings.notifications': 'Notifications',
            'settings.privacy': 'Privacy',
            'settings.storage': 'Storage',
            'settings.accessibility': 'Accessibility',
            'settings.reset': 'Reset System Intelligence',
            'settings.resetConfirm': 'Are you sure you want to reset all system intelligence data?',
            
            // Modes
            'mode.work': 'Work',
            'mode.study': 'Study',
            'mode.focus': 'Focus',
            'mode.chill': 'Chill',
            
            // Notifications
            'notification.newTask': 'New Task',
            'notification.taskCompleted': 'Task Completed',
            'notification.newNote': 'New Note',
            'notification.system': 'System',
            
            // Search
            'search.placeholder': 'Search apps, notes, tasks...',
            'search.noResults': 'No results found',
            'search.apps': 'Apps',
            'search.notes': 'Notes',
            'search.tasks': 'Tasks',
            'search.news': 'News',
            'search.commands': 'Commands',
            
            // Privacy
            'privacy.title': 'Privacy & Transparency',
            'privacy.whatOSKnows': 'What the OS knows about you',
            'privacy.habits': 'Habits',
            'privacy.preferences': 'Preferences',
            'privacy.aiMemory': 'AI Memory',
            'privacy.localOnly': 'All data is stored locally on your device',
            'privacy.resetData': 'Reset All Data',
            
            // Insights
            'insights.title': 'System Insights',
            'insights.timeSpent': 'Time Spent',
            'insights.mostUsed': 'Most Used',
            'insights.weeklySummary': 'Weekly Summary',
            'insights.focusScore': 'Focus Score',
            'insights.productivity': 'Productivity Patterns'
        };
    }

    getTamilTranslations() {
        return {
            // Common
            'common.ok': 'சரி',
            'common.cancel': 'ரத்துசெய்',
            'common.close': 'மூடு',
            'common.save': 'சேமி',
            'common.delete': 'நீக்கு',
            'common.edit': 'திருத்து',
            'common.search': 'தேடு',
            'common.loading': 'ஏற்றுகிறது...',
            'common.error': 'பிழை',
            'common.success': 'வெற்றி',
            
            // Time
            'time.goodMorning': 'காலை வணக்கம்',
            'time.goodAfternoon': 'மதிய வணக்கம்',
            'time.goodEvening': 'மாலை வணக்கம்',
            'time.goodNight': 'இரவு வணக்கம்',
            
            // Apps
            'app.tasks': 'பணிகள்',
            'app.notes': 'குறிப்புகள்',
            'app.weather': 'வானிலை',
            'app.news': 'செய்திகள்',
            'app.calculator': 'கணிப்பான்',
            'app.calendar': 'நாட்காட்டி',
            'app.settings': 'அமைப்புகள்',
            'app.aiAssistant': 'AI உதவியாளர்',
            'app.browser': 'உலாவி',
            'app.files': 'கோப்புகள்',
            'app.music': 'இசை இயக்கி',
            'app.gallery': 'கேலரி',
            'app.email': 'மின்னஞ்சல்',
            'app.codeEditor': 'குறியீடு திருத்தி',
            'app.terminal': 'டெர்மினல்',
            'app.drawing': 'வரைதல்',
            'app.bookmarks': 'புத்தகக்குறிகள்',
            'app.help': 'உதவி',
            'app.systemMonitor': 'கணினி கண்காணிப்பு',
            'app.cryptoTracker': 'கிரிப்டோ கண்காணிப்பு',
            'app.playground': 'விளையாட்டு மைதானம்',
            
            // Dashboard
            'dashboard.title': 'டாஷ்போர்டு',
            'dashboard.welcome': 'வரவேற்பு',
            'dashboard.todayTasks': 'இன்றைய பணிகள்',
            'dashboard.topNews': 'முக்கிய செய்திகள்',
            'dashboard.weather': 'வானிலை',
            'dashboard.focusSuggestion': 'கவனம் பரிந்துரை',
            'dashboard.noTasks': 'இன்றைக்கு பணிகள் இல்லை',
            'dashboard.noNews': 'செய்திகள் இல்லை',
            
            // Settings
            'settings.title': 'அமைப்புகள்',
            'settings.appearance': 'தோற்றம்',
            'settings.theme': 'தீம்',
            'settings.language': 'மொழி',
            'settings.notifications': 'அறிவிப்புகள்',
            'settings.privacy': 'தனியுரிமை',
            'settings.storage': 'சேமிப்பு',
            'settings.accessibility': 'அணுகல்தன்மை',
            'settings.reset': 'கணினி நுண்ணறிவை மீட்டமை',
            'settings.resetConfirm': 'அனைத்து கணினி நுண்ணறிவு தரவையும் மீட்டமைக்க விரும்புகிறீர்களா?',
            
            // Modes
            'mode.work': 'வேலை',
            'mode.study': 'படிப்பு',
            'mode.focus': 'கவனம்',
            'mode.chill': 'ஓய்வு',
            
            // Notifications
            'notification.newTask': 'புதிய பணி',
            'notification.taskCompleted': 'பணி முடிந்தது',
            'notification.newNote': 'புதிய குறிப்பு',
            'notification.system': 'கணினி',
            
            // Search
            'search.placeholder': 'ஆப்ஸ், குறிப்புகள், பணிகள் தேடு...',
            'search.noResults': 'முடிவுகள் இல்லை',
            'search.apps': 'ஆப்ஸ்',
            'search.notes': 'குறிப்புகள்',
            'search.tasks': 'பணிகள்',
            'search.news': 'செய்திகள்',
            'search.commands': 'கட்டளைகள்',
            
            // Privacy
            'privacy.title': 'தனியுரிமை மற்றும் வெளிப்படைத்தன்மை',
            'privacy.whatOSKnows': 'OS உங்களைப் பற்றி என்ன தெரியும்',
            'privacy.habits': 'பழக்கங்கள்',
            'privacy.preferences': 'விருப்பங்கள்',
            'privacy.aiMemory': 'AI நினைவகம்',
            'privacy.localOnly': 'அனைத்து தரவும் உங்கள் சாதனத்தில் உள்ளூரில் சேமிக்கப்படுகிறது',
            'privacy.resetData': 'அனைத்து தரவையும் மீட்டமை'
        };
    }

    getHindiTranslations() {
        return {
            // Common
            'common.ok': 'ठीक',
            'common.cancel': 'रद्द करें',
            'common.close': 'बंद करें',
            'common.save': 'सहेजें',
            'common.delete': 'हटाएं',
            'common.edit': 'संपादित करें',
            'common.search': 'खोजें',
            'common.loading': 'लोड हो रहा है...',
            'common.error': 'त्रुटि',
            'common.success': 'सफल',
            
            // Time
            'time.goodMorning': 'सुप्रभात',
            'time.goodAfternoon': 'नमस्कार',
            'time.goodEvening': 'शुभ संध्या',
            'time.goodNight': 'शुभ रात्रि',
            
            // Apps
            'app.tasks': 'कार्य',
            'app.notes': 'नोट्स',
            'app.weather': 'मौसम',
            'app.news': 'समाचार',
            'app.calculator': 'कैलकुलेटर',
            'app.calendar': 'कैलेंडर',
            'app.settings': 'सेटिंग्स',
            'app.aiAssistant': 'AI सहायक',
            'app.browser': 'ब्राउज़र',
            'app.files': 'फ़ाइलें',
            'app.music': 'संगीत प्लेयर',
            'app.gallery': 'गैलरी',
            'app.email': 'ईमेल',
            'app.codeEditor': 'कोड एडिटर',
            'app.terminal': 'टर्मिनल',
            'app.drawing': 'ड्राइंग',
            'app.bookmarks': 'बुकमार्क',
            'app.help': 'मदद',
            'app.systemMonitor': 'सिस्टम मॉनिटर',
            'app.cryptoTracker': 'क्रिप्टो ट्रैकर',
            'app.playground': 'प्लेग्राउंड',
            
            // Dashboard
            'dashboard.title': 'डैशबोर्ड',
            'dashboard.welcome': 'स्वागत है',
            'dashboard.todayTasks': 'आज के कार्य',
            'dashboard.topNews': 'शीर्ष समाचार',
            'dashboard.weather': 'मौसम',
            'dashboard.focusSuggestion': 'फोकस सुझाव',
            'dashboard.noTasks': 'आज के लिए कोई कार्य नहीं',
            'dashboard.noNews': 'समाचार उपलब्ध नहीं',
            
            // Settings
            'settings.title': 'सेटिंग्स',
            'settings.appearance': 'दिखावट',
            'settings.theme': 'थीम',
            'settings.language': 'भाषा',
            'settings.notifications': 'सूचनाएं',
            'settings.privacy': 'गोपनीयता',
            'settings.storage': 'स्टोरेज',
            'settings.accessibility': 'पहुंच',
            'settings.reset': 'सिस्टम इंटेलिजेंस रीसेट करें',
            'settings.resetConfirm': 'क्या आप वाकई सभी सिस्टम इंटेलिजेंस डेटा रीसेट करना चाहते हैं?',
            
            // Modes
            'mode.work': 'काम',
            'mode.study': 'अध्ययन',
            'mode.focus': 'फोकस',
            'mode.chill': 'आराम',
            
            // Notifications
            'notification.newTask': 'नया कार्य',
            'notification.taskCompleted': 'कार्य पूर्ण',
            'notification.newNote': 'नया नोट',
            'notification.system': 'सिस्टम',
            
            // Search
            'search.placeholder': 'ऐप्स, नोट्स, कार्य खोजें...',
            'search.noResults': 'कोई परिणाम नहीं मिला',
            'search.apps': 'ऐप्स',
            'search.notes': 'नोट्स',
            'search.tasks': 'कार्य',
            'search.news': 'समाचार',
            'search.commands': 'कमांड',
            
            // Privacy
            'privacy.title': 'गोपनीयता और पारदर्शिता',
            'privacy.whatOSKnows': 'OS आपके बारे में क्या जानता है',
            'privacy.habits': 'आदतें',
            'privacy.preferences': 'प्राथमिकताएं',
            'privacy.aiMemory': 'AI मेमोरी',
            'privacy.localOnly': 'सभी डेटा आपके डिवाइस पर स्थानीय रूप से संग्रहीत है',
            'privacy.resetData': 'सभी डेटा रीसेट करें'
        };
    }

    // Translate a key
    t(key, params = {}) {
        const translation = this.translations[this.currentLanguage]?.[key] || 
                          this.translations['en']?.[key] || 
                          key;
        
        // Replace params
        let result = translation;
        Object.keys(params).forEach(param => {
            result = result.replace(`{{${param}}}`, params[param]);
        });
        
        return result;
    }

    // Set language
    setLanguage(lang) {
        if (!this.supportsLanguage(lang)) {
            console.warn(`[I18n] Language ${lang} not supported`);
            return false;
        }
        
        this.currentLanguage = lang;
        storage.set('user_language', lang);
        
        // Update user profile
        if (typeof userProfile !== 'undefined') {
            userProfile.updateUserProfile({ language: lang });
            userProfile.recordEvent('language_changed', { language: lang });
        }
        
        // Trigger language change event
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: lang } 
        }));
        
        // Re-translate all elements
        this.translatePage();
        
        return true;
    }

    // Get current language
    getLanguage() {
        return this.currentLanguage;
    }

    // Translate all elements with data-i18n attribute
    translatePage() {
        document.querySelectorAll('[data-i18n]').forEach(el => {
            const key = el.getAttribute('data-i18n');
            const text = this.t(key);
            if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                el.placeholder = text;
            } else {
                el.textContent = text;
            }
        });
    }

    // Get available languages
    getAvailableLanguages() {
        return [
            { code: 'en', name: 'English', nativeName: 'English' },
            { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
            { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' }
        ];
    }
}

// Create singleton instance
const i18n = new I18n();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => i18n.init());
} else {
    i18n.init();
}

// Make globally accessible
window.i18n = i18n;
