// System-Level AI Assistant
// Context-aware AI that understands the entire OS state
class AISystem {
    constructor() {
        this.apiKey = storage.get('openai_api_key', '') || storage.get('openaiApiKey', '');
        this.context = {
            tasks: [],
            notes: [],
            weather: null,
            recentActions: []
        };
        this.updateContext();
    }

    // Update context from all apps
    updateContext() {
        this.context.tasks = storage.get('tasks', []);
        this.context.notes = storage.get('notes', []);
        this.context.weather = storage.get('lastWeather', null);
        this.context.recentActions = storage.get('recentActions', []).slice(-10);
    }

    // Get system context for AI
    getSystemContext() {
        this.updateContext();
        
        const activeTasks = this.context.tasks.filter(t => !t.completed).length;
        const completedTasks = this.context.tasks.filter(t => t.completed).length;
        const totalNotes = this.context.notes.length;
        const recentNote = this.context.notes[0];
        
        // Get user profile data if available
        let userProfileData = null;
        if (typeof userProfile !== 'undefined' && userProfile.initialized) {
            const profile = userProfile.getUserProfile();
            const insights = userProfile.getInsights();
            userProfileData = {
                preferredApps: profile.preferredApps,
                preferredTheme: profile.preferredTheme,
                language: profile.language,
                newsCategories: profile.newsCategories,
                topApps: insights?.topApps?.slice(0, 3) || [],
                topCommands: insights?.topCommands?.slice(0, 3) || [],
                aiMemory: profile.aiMemory?.slice(-5) || [] // Last 5 memories
            };
        }
        
        return {
            tasks: {
                active: activeTasks,
                completed: completedTasks,
                total: this.context.tasks.length,
                recent: this.context.tasks.slice(0, 3).map(t => ({
                    text: t.text,
                    completed: t.completed,
                    priority: t.priority || 'normal',
                    dueDate: t.dueDate || null
                }))
            },
            notes: {
                total: totalNotes,
                recent: recentNote ? {
                    title: recentNote.title,
                    preview: recentNote.content?.substring(0, 100)
                } : null
            },
            weather: this.context.weather,
            userProfile: userProfileData,
            timestamp: new Date().toISOString()
        };
    }

    // Enhanced AI response with system context
    async getAIResponse(userMessage, includeContext = true) {
        const systemContext = includeContext ? this.getSystemContext() : null;
        
        const userProfileInfo = systemContext?.userProfile ? `
USER PROFILE:
- Preferred apps: ${systemContext.userProfile.preferredApps.join(', ') || 'None yet'}
- Preferred theme: ${systemContext.userProfile.preferredTheme}
- Language: ${systemContext.userProfile.language}
- News interests: ${systemContext.userProfile.newsCategories.join(', ') || 'None yet'}
- Most used apps: ${systemContext.userProfile.topApps.map(a => a.appId).join(', ') || 'None yet'}
- Recent AI memories: ${systemContext.userProfile.aiMemory.length} memories stored
` : '';

        const systemPrompt = `You are AegisDesk AI, the intelligent operating system assistant. You are embedded into the OS itself, not a separate app.

SYSTEM CONTEXT:
${systemContext ? JSON.stringify(systemContext, null, 2) : 'No context available'}
${userProfileInfo}

YOUR CAPABILITIES:
- Access and modify Tasks (create, complete, prioritize, set due dates, categorize)
- Access and modify Notes (create, edit, summarize, cross-link)
- Check Weather information
- Open applications
- Provide intelligent suggestions based on user's workflow and habits
- Understand context from user's tasks, notes, and usage patterns
- Reference user's preferences and habits when making suggestions

BEHAVIOR:
- Be proactive and helpful
- Suggest actions based on context and user's habits
- When user mentions tasks, offer to create or manage them
- When user asks about notes, reference actual note content
- Use natural, conversational language
- Be concise but helpful
- Think step-by-step before responding
- Reference user's preferred apps and patterns when relevant
- Remember important information in AI memory for future conversations

When the user asks you to do something, acknowledge it and the system will handle the action automatically.`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...this.getRecentHistory().slice(-15),
            { role: 'user', content: userMessage }
        ];

        try {
            const response = await fetch('https://api.openai.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'gpt-4o-mini',
                    messages: messages,
                    max_tokens: 2000,
                    temperature: 0.8,
                    top_p: 0.9
                })
            });

            if (!response.ok) {
                // Fallback to gpt-3.5-turbo
                const fallbackResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.apiKey}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: 'gpt-3.5-turbo',
                        messages: messages,
                        max_tokens: 2000,
                        temperature: 0.8
                    })
                });
                
                if (fallbackResponse.ok) {
                    const data = await fallbackResponse.json();
                    return data.choices[0].message.content;
                }
                
                throw new Error(`API error: ${response.status}`);
            }

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('AI System error:', error);
            throw error;
        }
    }

    getRecentHistory() {
        return storage.get('aiChatHistory', []).slice(-20).map(msg => ({
            role: msg.role,
            content: msg.content
        }));
    }

    // Detect and handle system actions
    detectSystemAction(userMessage) {
        const lower = userMessage.toLowerCase();
        
        // Task creation patterns
        if (lower.match(/(create|add|new|make|remind me to|i need to|i should|i must|i have to).*task/i)) {
            return this.extractTaskInfo(userMessage);
        }
        
        // Note creation
        if (lower.match(/(create|add|new|make|write|note|remember).*note/i)) {
            return this.extractNoteInfo(userMessage);
        }
        
        // Task queries
        if (lower.match(/(show|list|what are|tell me about).*task/i)) {
            return { type: 'query_tasks' };
        }
        
        // Note queries
        if (lower.match(/(show|list|what are|tell me about|find).*note/i)) {
            return { type: 'query_notes' };
        }
        
        return null;
    }

    extractTaskInfo(message) {
        const patterns = [
            /(?:create|add|new|make|remind me to|i need to|i should|i must|i have to)\s+(?:a\s+)?task\s+(?:to\s+)?(?:about\s+)?(?:that\s+)?(.+)/i,
            /task\s+(?:to\s+)?(.+)/i,
            /(.+?)(?:\s+as\s+a\s+task|\s+task)/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                let taskText = match[1].trim();
                taskText = taskText.replace(/^["']|["']$/g, '');
                
                // Extract priority
                let priority = 'normal';
                if (taskText.match(/\b(urgent|high|important|critical)\b/i)) {
                    priority = 'high';
                } else if (taskText.match(/\b(low|minor)\b/i)) {
                    priority = 'low';
                }
                
                // Extract due date mentions
                let dueDate = null;
                const dateMatch = taskText.match(/\b(today|tomorrow|next week|in \d+ days?)\b/i);
                if (dateMatch) {
                    dueDate = this.parseDate(dateMatch[1]);
                }
                
                // Extract category
                let category = 'general';
                const categoryMatch = taskText.match(/\b(work|personal|shopping|health|study|home)\b/i);
                if (categoryMatch) {
                    category = categoryMatch[1].toLowerCase();
                }
                
                // Clean task text
                taskText = taskText.replace(/\b(urgent|high|low|important|critical|minor|today|tomorrow|next week|in \d+ days?|work|personal|shopping|health|study|home)\b/gi, '').trim();
                
                return {
                    type: 'create_task',
                    text: taskText,
                    priority,
                    dueDate,
                    category
                };
            }
        }
        
        return { type: 'create_task', text: message.replace(/\b(create|add|new|make|task|to|about|that)\b/gi, '').trim() };
    }

    extractNoteInfo(message) {
        const patterns = [
            /(?:create|add|new|make|write|remember)\s+(?:a\s+)?note\s+(?:about\s+)?(?:that\s+)?(.+)/i,
            /note\s+(?:about\s+)?(.+)/i
        ];
        
        for (const pattern of patterns) {
            const match = message.match(pattern);
            if (match && match[1]) {
                const content = match[1].trim().replace(/^["']|["']$/g, '');
                const titleMatch = content.match(/^(.+?)[:\.]/);
                return {
                    type: 'create_note',
                    title: titleMatch ? titleMatch[1] : content.substring(0, 50),
                    content: content
                };
            }
        }
        
        return { type: 'create_note', title: 'New Note', content: message };
    }

    parseDate(dateStr) {
        const today = new Date();
        const lower = dateStr.toLowerCase();
        
        if (lower.includes('today')) {
            return today.getTime();
        } else if (lower.includes('tomorrow')) {
            return today.getTime() + 86400000;
        } else if (lower.includes('next week')) {
            return today.getTime() + 604800000;
        } else {
            const daysMatch = dateStr.match(/(\d+)\s*days?/i);
            if (daysMatch) {
                return today.getTime() + (parseInt(daysMatch[1]) * 86400000);
            }
        }
        
        return null;
    }

    // Execute system actions
    async executeAction(action) {
        this.updateContext();
        
        switch (action.type) {
            case 'create_task':
                const tasks = storage.get('tasks', []);
                tasks.push({
                    text: action.text,
                    completed: false,
                    priority: action.priority || 'normal',
                    dueDate: action.dueDate || null,
                    category: action.category || 'general',
                    createdAt: Date.now()
                });
                storage.set('tasks', tasks);
                
                // Refresh tasks app if open
                if (windowManager.windows.has('tasks')) {
                    const tasksWindow = windowManager.windows.get('tasks');
                    if (tasksWindow && typeof tasksApp !== 'undefined') {
                        const content = tasksWindow.querySelector('.window-content');
                        tasksApp.refresh(content);
                    }
                }
                return `Task created: "${action.text}"`;
                
            case 'create_note':
                const notes = storage.get('notes', []);
                notes.unshift({
                    id: 'note_' + Date.now(),
                    title: action.title || 'Untitled',
                    content: action.content || '',
                    createdAt: Date.now(),
                    updatedAt: Date.now()
                });
                storage.set('notes', notes);
                
                // Refresh notes app if open
                if (windowManager.windows.has('notes')) {
                    const notesWindow = windowManager.windows.get('notes');
                    if (notesWindow && typeof notesApp !== 'undefined') {
                        const content = notesWindow.querySelector('.window-content');
                        notesApp.refreshList(content);
                    }
                }
                return `Note created: "${action.title}"`;
                
            case 'query_tasks':
                const allTasks = storage.get('tasks', []);
                const active = allTasks.filter(t => !t.completed);
                return `You have ${active.length} active task${active.length !== 1 ? 's' : ''} and ${allTasks.length - active.length} completed.`;
                
            case 'query_notes':
                const allNotes = storage.get('notes', []);
                return `You have ${allNotes.length} note${allNotes.length !== 1 ? 's' : ''}.`;
                
            default:
                return null;
        }
    }
}

const aiSystem = new AISystem();
