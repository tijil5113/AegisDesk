// YouTube Search API — browser calls POST /api/music (YOUTUBE_API_KEY stays on the server).
// Legacy: older builds called YouTube Data API from the browser with a localStorage key.
// That path is unused in production; do not put YOUTUBE_API_KEY in frontend source.

class YouTubeSearchAPI {
    constructor() {
        this.baseURL = '/api/music';
        this.lastError = null;
    }

    mapError(status, data) {
        const code = data && data.code;
        const msg = String((data && (data.error || data.message)) || '');
        if (status === 401) return 'Sign in required';
        if (status === 503 || code === 'not_configured' || code === 'invalid_key' || code === 'api_disabled') return 'API is not configured';
        if (status === 429 || code === 'quota_exceeded') return 'Quota reached';
        if (code === 'network_error' || msg.toLowerCase().includes('failed to fetch')) return 'Network error';
        if (status >= 400) return 'Service temporarily unavailable';
        return msg || 'Service temporarily unavailable';
    }

    async request(payload) {
        this.lastError = null;
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            });
            const data = await response.json().catch(() => ({}));
            if (!response.ok) {
                this.lastError = this.mapError(response.status, data);
                return { items: [], error: this.lastError };
            }
            const items = Array.isArray(data.items) ? data.items : [];
            if (items.length === 0) {
                this.lastError = 'No results found';
            }
            return { items, nextPageToken: data.nextPageToken || null, error: null };
        } catch (error) {
            this.lastError = 'Network error';
            console.error('YouTube search error:', error?.name || 'network');
            return { items: [], error: this.lastError };
        }
    }

    async searchVideo(title, artist) {
        const query = `${title || ''} ${artist || ''}`.trim();
        const { items } = await this.request({ type: 'search', query, maxResults: 1 });
        if (items && items.length > 0) {
            const video = items[0];
            return {
                videoId: video.videoId,
                title: video.title,
                thumbnail: video.thumbnail,
                audioUrl: video.videoId
            };
        }
        return null;
    }

    async search(query, options = {}) {
        return this.request({
            type: 'search',
            query: String(query || '').slice(0, 200),
            language: options.language,
            maxResults: options.maxResults || 20,
            pageToken: options.pageToken
        });
    }

    getAudioUrlFromVideoId(videoId) {
        return videoId;
    }
}

const youtubeSearchAPI = new YouTubeSearchAPI();
window.youtubeSearchAPI = youtubeSearchAPI;
