// AI-Powered News Intelligence System
// Handles all AI features: summaries, briefing, topic intelligence, Q&A

class NewsAISystem {
    constructor(newsHub) {
        this.newsHub = newsHub;
        this.aiEndpoint = (typeof window !== 'undefined' && window.location?.origin) ? `${window.location.origin}/api/chat` : '/api/chat';
        this.cache = new Map();
        this.init();
    }
    
    init() {
        // Check if AI is available (requires server)
        this.checkAIAvailability();
    }
    
    async checkAIAvailability() {
        try {
            const test = await fetch(this.aiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: [{ role: 'user', content: 'test' }] })
            });
            this.aiAvailable = test.ok;
        } catch {
            this.aiAvailable = false;
        }
        return this.aiAvailable;
    }
    
    // Generate AI Summary for Article
    async generateArticleSummary(article) {
        const cacheKey = `summary_${article.url}`;
        if (this.cache.has(cacheKey)) {
            return this.cache.get(cacheKey);
        }
        
        if (!await this.checkAIAvailability()) {
            return this.fallbackSummary(article);
        }
        
        try {
            const prompt = `Summarize this news article in three formats:
1. One-line TL;DR (max 20 words)
2. Three bullet points
3. "Why this matters" (2-3 sentences)

Article Title: ${article.title}
Article Description: ${article.description || 'No description'}
Article Content: ${(article.content || '').substring(0, 1000)}

Format your response as JSON:
{
  "tldr": "...",
  "bullets": ["...", "...", "..."],
  "whyItMatters": "..."
}`;
            
            const response = await fetch(this.aiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a news summarization expert. Always respond with valid JSON only.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                try {
                    const summary = JSON.parse(content);
                    this.cache.set(cacheKey, summary);
                    return summary;
                } catch {
                    // If not JSON, parse manually
                    return this.parseSummary(content);
                }
            }
        } catch (error) {
            console.error('AI Summary error:', error);
        }
        
        return this.fallbackSummary(article);
    }
    
    fallbackSummary(article) {
        const desc = article.description || article.content || '';
        const sentences = desc.split(/[.!?]+/).filter(s => s.trim().length > 20);
        
        return {
            tldr: article.title || 'No summary available',
            bullets: [
                sentences[0]?.trim() || 'Read the full article for details.',
                sentences[1]?.trim() || 'This story continues to develop.',
                sentences[2]?.trim() || 'Stay updated for more information.'
            ].filter(b => b),
            whyItMatters: desc.substring(0, 200) || 'This news is important for staying informed about current events.'
        };
    }
    
    parseSummary(text) {
        const lines = text.split('\n').filter(l => l.trim());
        const tldr = lines.find(l => l.toLowerCase().includes('tldr') || l.includes('1.'))?.replace(/^.*?:/, '').trim() || '';
        const bullets = lines.filter(l => l.trim().startsWith('-') || l.trim().startsWith('•')).slice(0, 3).map(b => b.replace(/^[-\•]\s*/, '').trim());
        const why = lines.find(l => l.toLowerCase().includes('matters'))?.replace(/^.*?:/, '').trim() || '';
        
        return { tldr, bullets, whyItMatters: why };
    }
    
    // Generate Daily AI Briefing
    async generateDailyBriefing(articles) {
        const hour = new Date().getHours();
        const greeting = hour < 12 ? 'Good Morning' : hour < 18 ? 'Good Afternoon' : 'Good Evening';
        const top5 = articles.slice(0, 5);
        
        if (!await this.checkAIAvailability()) {
            return {
                greeting,
                summary: 'Top stories of the day',
                stories: top5.map(a => ({ title: a.title, why: a.description?.substring(0, 150) || '' }))
            };
        }
        
        try {
            const prompt = `Create a daily news briefing for ${greeting}.

Top 5 stories:
${top5.map((a, i) => `${i + 1}. ${a.title}\n   ${a.description?.substring(0, 200) || ''}`).join('\n\n')}

Format as JSON:
{
  "greeting": "${greeting}",
  "summary": "One sentence overview",
  "stories": [
    {"title": "...", "why": "Why this matters in simple language"}
  ]
}`;
            
            const response = await fetch(this.aiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a news briefing expert. Respond with valid JSON only.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = data.choices?.[0]?.message?.content || '';
                try {
                    return JSON.parse(content);
                } catch {
                    return { greeting, summary: 'Top stories of the day', stories: top5.map(a => ({ title: a.title, why: a.description?.substring(0, 150) || '' })) };
                }
            }
        } catch (error) {
            console.error('AI Briefing error:', error);
        }
        
        return {
            greeting,
            summary: 'Top stories of the day',
            stories: top5.map(a => ({ title: a.title, why: a.description?.substring(0, 150) || '' }))
        };
    }
    
    // Ask AI About News
    async askAboutNews(question, article = null) {
        if (!await this.checkAIAvailability()) {
            return 'AI features require the server to be running with OpenAI API configured.';
        }
        
        try {
            let context = '';
            if (article) {
                context = `Context: ${article.title}\n${article.description || ''}\n${(article.content || '').substring(0, 1000)}`;
            } else {
                context = 'Current news context: General news discussion.';
            }
            
            const prompt = `${context}

Question: ${question}

Please provide a helpful, accurate response based on the news context.`;
            
            const response = await fetch(this.aiEndpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [
                        { role: 'system', content: 'You are a helpful news analyst. Explain things clearly and simply.' },
                        { role: 'user', content: prompt }
                    ]
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                return data.choices?.[0]?.message?.content || 'Unable to generate response.';
            }
        } catch (error) {
            console.error('AI Q&A error:', error);
            return 'Error connecting to AI. Please check your server configuration.';
        }
        
        return 'Unable to process your question at this time.';
    }
    
    // Topic Intelligence - Group Related Articles
    groupRelatedArticles(articles) {
        const groups = new Map();
        
        // Simple keyword-based grouping
        articles.forEach(article => {
            const keywords = this.extractKeywords(article);
            const key = keywords.slice(0, 2).join('_');
            
            if (!groups.has(key)) {
                groups.set(key, {
                    topic: keywords[0],
                    articles: [],
                    perspectives: []
                });
            }
            
            groups.get(key).articles.push(article);
        });
        
        // Determine perspectives (simplified)
        groups.forEach(group => {
            group.perspectives = this.analyzePerspectives(group.articles);
        });
        
        return Array.from(groups.values()).filter(g => g.articles.length > 1);
    }
    
    extractKeywords(article) {
        const text = `${article.title} ${article.description}`.toLowerCase();
        const common = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
        const words = text.split(/\s+/).filter(w => w.length > 4 && !common.includes(w));
        return [...new Set(words)].slice(0, 5);
    }
    
    analyzePerspectives(articles) {
        // Simplified perspective detection
        const sources = articles.map(a => a.source?.name || '').filter(s => s);
        const uniqueSources = [...new Set(sources)];
        return uniqueSources.length > 1 ? ['Multiple perspectives'] : ['Single source'];
    }
}
