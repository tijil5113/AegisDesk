// MusicBrainz API Service
class MusicBrainzAPI {
    constructor() {
        this.baseURL = 'https://musicbrainz.org/ws/2';
        this.userAgent = 'AegisDesk/1.0.0 (https://github.com/yourusername/aegisdesk)';
    }
    
    // Make request with proper headers
    async request(endpoint, params = {}) {
        const url = new URL(`${this.baseURL}${endpoint}`);
        
        // Add query parameters
        Object.entries(params).forEach(([key, value]) => {
            if (value !== null && value !== undefined) {
                url.searchParams.append(key, value);
            }
        });
        
        try {
            const response = await fetch(url.toString(), {
                headers: {
                    'User-Agent': this.userAgent,
                    'Accept': 'application/json'
                }
            });
            
            if (!response.ok) {
                throw new Error(`MusicBrainz API error: ${response.status}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ MusicBrainz API error:', error);
            throw error;
        }
    }
    
    // Search for recordings (songs)
    async searchRecordings(query, limit = 20, offset = 0) {
        try {
            const data = await this.request('/recording', {
                query: query,
                limit: limit,
                offset: offset,
                fmt: 'json'
            });
            
            if (data.recordings) {
                return data.recordings.map(recording => this.transformRecording(recording));
            }
            
            return [];
        } catch (error) {
            console.error('❌ Search recordings error:', error);
            return [];
        }
    }
    
    // Search for artists
    async searchArtists(query, limit = 20) {
        try {
            const data = await this.request('/artist', {
                query: query,
                limit: limit,
                fmt: 'json'
            });
            
            return data.artists || [];
        } catch (error) {
            console.error('❌ Search artists error:', error);
            return [];
        }
    }
    
    // Get recordings by artist
    async getRecordingsByArtist(artistMBID, limit = 20) {
        try {
            const data = await this.request(`/recording`, {
                artist: artistMBID,
                limit: limit,
                fmt: 'json'
            });
            
            if (data.recordings) {
                return data.recordings.map(recording => this.transformRecording(recording));
            }
            
            return [];
        } catch (error) {
            console.error('❌ Get recordings by artist error:', error);
            return [];
        }
    }
    
    // Get popular recordings (using search with popularity)
    async getPopularRecordings(limit = 20) {
        // MusicBrainz doesn't have a direct "popular" endpoint
        // We'll search for well-known artists and get their recordings
        const popularArtists = [
            'The Beatles',
            'Michael Jackson',
            'Madonna',
            'Elvis Presley',
            'Queen'
        ];
        
        const allRecordings = [];
        
        for (const artist of popularArtists.slice(0, 5)) {
            try {
                const recordings = await this.searchRecordings(`artist:"${artist}"`, Math.ceil(limit / 5));
                allRecordings.push(...recordings);
                if (allRecordings.length >= limit) break;
            } catch (e) {
                console.warn(`Failed to get recordings for ${artist}:`, e);
            }
        }
        
        return allRecordings.slice(0, limit);
    }
    
    // Transform MusicBrainz recording to our track format
    transformRecording(recording) {
        // Get first release for thumbnail
        const release = recording.releases?.[0];
        const releaseGroup = release?.release-group;
        
        // Try to get audio URL from relationships (YouTube, Spotify, etc.)
        let audioUrl = '';
        if (recording.relations) {
            const youtubeRel = recording.relations.find(r => 
                r.type === 'youtube' || r['target-type'] === 'url'
            );
            if (youtubeRel?.url?.resource) {
                audioUrl = youtubeRel.url.resource;
            }
        }
        
        return {
            videoId: recording.id, // Use MusicBrainz ID
            mbid: recording.id,
            title: recording.title || 'Unknown Title',
            artist: recording['artist-credit']?.[0]?.artist?.name || 'Unknown Artist',
            artistMBID: recording['artist-credit']?.[0]?.artist?.id,
            thumbnail: releaseGroup?.['cover-art-archive']?.front ? 
                `https://coverartarchive.org/release-group/${releaseGroup.id}/front-250` : '',
            audioUrl: audioUrl, // May be empty - we'll need to find audio elsewhere
            duration: recording.length ? Math.floor(recording.length / 1000) : 0, // Convert ms to seconds
            language: this.detectLanguage(recording.title || ''),
            tags: recording.tags?.map(t => t.name).join(', ') || ''
        };
    }
    
    // Detect language from title
    detectLanguage(title) {
        const text = title.toLowerCase();
        if (text.includes('tamil') || text.includes('ta')) return 'tamil';
        if (text.includes('hindi') || text.includes('hi')) return 'hindi';
        if (text.includes('telugu') || text.includes('te')) return 'telugu';
        if (text.includes('malayalam') || text.includes('ml')) return 'malayalam';
        if (text.includes('kannada') || text.includes('kn')) return 'kannada';
        return 'english';
    }
    
    // Get audio URL from YouTube using MusicBrainz metadata
    async getYouTubeAudioUrl(recording) {
        // Use recording title and artist to search YouTube
        const searchQuery = `${recording.title} ${recording.artist}`;
        
        // We'll need to integrate with YouTube API or use a proxy
        // For now, return empty - this would need YouTube API integration
        return '';
    }
}

// Create singleton
const musicbrainzAPI = new MusicBrainzAPI();
window.musicbrainzAPI = musicbrainzAPI;
