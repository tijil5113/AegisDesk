// Jamendo API Service
class JamendoAPI {
    constructor() {
        // Jamendo API client_id (public, no secret needed)
        this.clientId = '66e9e843'; // Your client ID
        this.baseURL = 'https://api.jamendo.com/v3.0';
    }
    
    // Fetch tracks
    async getTracks(params = {}) {
        const {
            limit = 20,
            offset = 0,
            format = 'json',
            order = 'popularity_total',
            tags = '',
            license = 'cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa' // Free licenses only
        } = params;
        
        const url = new URL(`${this.baseURL}/tracks`);
        url.searchParams.append('client_id', this.clientId);
        url.searchParams.append('format', format);
        url.searchParams.append('limit', limit);
        url.searchParams.append('offset', offset);
        url.searchParams.append('order', order);
        url.searchParams.append('license', license);
        url.searchParams.append('audioformat', 'mp31'); // MP3 format
        url.searchParams.append('imagesize', '200'); // Thumbnail size
        
        if (tags) {
            url.searchParams.append('tags', tags);
        }
        
        try {
            console.log('📡 Fetching from Jamendo:', url.toString());
            const response = await fetch(url.toString());
            
            if (!response.ok) {
                throw new Error(`Jamendo API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.headers && data.headers.status === 'success' && data.results) {
                // Transform Jamendo format to our track format
                return data.results.map(track => this.transformTrack(track));
            }
            
            return [];
        } catch (error) {
            console.error('❌ Jamendo API error:', error);
            return [];
        }
    }
    
    // Search tracks
    async searchTracks(query, params = {}) {
        const {
            limit = 20,
            format = 'json',
            license = 'cc-by,cc-by-sa,cc-by-nc,cc-by-nc-sa'
        } = params;
        
        const url = new URL(`${this.baseURL}/tracks`);
        url.searchParams.append('client_id', this.clientId);
        url.searchParams.append('format', format);
        url.searchParams.append('limit', limit);
        url.searchParams.append('search', query);
        url.searchParams.append('license', license);
        url.searchParams.append('audioformat', 'mp31');
        url.searchParams.append('imagesize', '200');
        
        try {
            const response = await fetch(url.toString());
            if (!response.ok) {
                throw new Error(`Jamendo API error: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.headers && data.headers.status === 'success' && data.results) {
                return data.results.map(track => this.transformTrack(track));
            }
            
            return [];
        } catch (error) {
            console.error('❌ Jamendo search error:', error);
            return [];
        }
    }
    
    // Get tracks by tag/genre
    async getTracksByTag(tag, limit = 20) {
        return this.getTracks({
            tags: tag,
            limit: limit
        });
    }
    
    // Transform Jamendo track to our format
    transformTrack(jamendoTrack) {
        return {
            videoId: jamendoTrack.id.toString(), // Use Jamendo ID as identifier
            jamendoId: jamendoTrack.id,
            title: jamendoTrack.name || 'Unknown Title',
            artist: jamendoTrack.artist_name || 'Unknown Artist',
            thumbnail: jamendoTrack.image || jamendoTrack.album_image || '',
            audioUrl: jamendoTrack.audio || '', // Direct audio stream URL
            duration: jamendoTrack.duration || 0,
            language: this.detectLanguage(jamendoTrack.name, jamendoTrack.tags || ''),
            tags: jamendoTrack.tags || '',
            license: jamendoTrack.license_ccurl || ''
        };
    }
    
    // Detect language from name/tags
    detectLanguage(name, tags) {
        const text = (name + ' ' + tags).toLowerCase();
        if (text.includes('tamil') || text.includes('ta')) return 'tamil';
        if (text.includes('hindi') || text.includes('hi')) return 'hindi';
        if (text.includes('telugu') || text.includes('te')) return 'telugu';
        if (text.includes('malayalam') || text.includes('ml')) return 'malayalam';
        if (text.includes('kannada') || text.includes('kn')) return 'kannada';
        return 'english';
    }
}

// Create singleton
const jamendoAPI = new JamendoAPI();
window.jamendoAPI = jamendoAPI;
