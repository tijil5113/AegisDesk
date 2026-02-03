// YouTube Search API - Get audio URLs from YouTube using MusicBrainz metadata
class YouTubeSearchAPI {
    constructor() {
        this.apiKey = 'AIzaSyC3nFF2-7I9lnHF9zZpeQj7guPEw6y-pHQ';
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
    }
    
    // Search for video by title and artist
    async searchVideo(title, artist) {
        const query = `${title} ${artist}`;
        
        try {
            const url = new URL(`${this.baseURL}/search`);
            url.searchParams.append('part', 'snippet');
            url.searchParams.append('q', query);
            url.searchParams.append('type', 'video');
            url.searchParams.append('maxResults', '1');
            url.searchParams.append('key', this.apiKey);
            
            const response = await fetch(url.toString());
            const data = await response.json();
            
            if (data.items && data.items.length > 0) {
                const video = data.items[0];
                return {
                    videoId: video.id.videoId,
                    title: video.snippet.title,
                    thumbnail: video.snippet.thumbnails?.medium?.url || video.snippet.thumbnails?.default?.url,
                    // Use YouTube embed URL as audio source (via proxy or direct)
                    audioUrl: `https://www.youtube.com/watch?v=${video.id.videoId}`
                };
            }
            
            return null;
        } catch (error) {
            console.error('❌ YouTube search error:', error);
            return null;
        }
    }
    
    // Get audio stream URL (this would need a backend proxy for actual streaming)
    // For now, we'll use the video ID and handle playback via YouTube IFrame API
    getAudioUrlFromVideoId(videoId) {
        // Return video ID - we'll use YouTube IFrame API for playback
        return videoId;
    }
}

// Create singleton
const youtubeSearchAPI = new YouTubeSearchAPI();
window.youtubeSearchAPI = youtubeSearchAPI;
