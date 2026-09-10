// YouTube Search API — browser calls the server proxy (YOUTUBE_API_KEY stays on the server)
class YouTubeSearchAPI {
    constructor() {
        this.baseURL = '/api/music';
    }
    
    async searchVideo(title, artist) {
        const query = `${title} ${artist}`;
        
        try {
            const response = await fetch(this.baseURL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify({ type: 'search', query, maxResults: 1 })
            });
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                const video = data.items[0];
                return {
                    videoId: video.videoId,
                    title: video.title,
                    thumbnail: video.thumbnail,
                    audioUrl: `https://www.youtube.com/watch?v=${video.videoId}`
                };
            }
            
            return null;
        } catch (error) {
            console.error('YouTube search error:', error);
            return null;
        }
    }
    
    getAudioUrlFromVideoId(videoId) {
        return videoId;
    }
}

const youtubeSearchAPI = new YouTubeSearchAPI();
window.youtubeSearchAPI = youtubeSearchAPI;
