// Music Data Bootstrap - Load from MusicBrainz + YouTube
let bootstrapAttempts = 0;
const MAX_BOOTSTRAP_ATTEMPTS = 10;
let bootstrapInitialized = false;

async function bootstrapMusicData() {
    // Prevent multiple initializations
    if (bootstrapInitialized) {
        console.log('⚠️ Bootstrap already initialized, skipping...');
        return;
    }
    
    bootstrapAttempts++;
    
    if (bootstrapAttempts > MAX_BOOTSTRAP_ATTEMPTS) {
        console.error('❌ Max bootstrap attempts reached, giving up');
        if (window.musicStore) {
            window.musicStore.setSections({
                trending: [],
                tamil: [],
                hindi: [],
                english: []
            });
        }
        return;
    }
    
    console.log(`📦 Bootstrapping music data from MusicBrainz (attempt ${bootstrapAttempts})...`);
    
    if (!window.musicStore) {
        console.log('⏳ Music store not ready yet, waiting...');
        setTimeout(bootstrapMusicData, 200);
        return;
    }
    
    if (!window.musicbrainzAPI) {
        console.log('⏳ MusicBrainz API not ready yet, waiting...');
        setTimeout(bootstrapMusicData, 200);
        return;
    }
    
    if (!window.youtubeSearchAPI) {
        console.log('⏳ YouTube Search API not ready yet, waiting...');
        setTimeout(bootstrapMusicData, 200);
        return;
    }
    
    // Mark as initialized
    bootstrapInitialized = true;
    
    try {
        console.log('📡 Fetching tracks from MusicBrainz...');
        
        const sections = {
            trending: [],
            tamil: [],
            hindi: [],
            english: []
        };
        
        // Fetch popular recordings from MusicBrainz
        try {
            const recordings = await window.musicbrainzAPI.getPopularRecordings(10);
            
            // For each recording, get YouTube video
            for (const recording of recordings) {
                if (!recording.audioUrl) {
                    const youtubeData = await window.youtubeSearchAPI.searchVideo(
                        recording.title,
                        recording.artist
                    );
                    if (youtubeData) {
                        recording.videoId = youtubeData.videoId;
                        recording.audioUrl = youtubeData.videoId; // Use video ID for YouTube player
                        if (!recording.thumbnail && youtubeData.thumbnail) {
                            recording.thumbnail = youtubeData.thumbnail;
                        }
                    }
                }
            }
            
            sections.trending = recordings.filter(r => r.videoId);
            sections.english = [...recordings.filter(r => r.videoId)];
            console.log('✅ Trending loaded:', sections.trending.length);
        } catch (e) {
            console.error('❌ Failed to load trending:', e);
        }
        
        // Search for Tamil music
        try {
            const tamilRecordings = await window.musicbrainzAPI.searchRecordings('tag:tamil', 10);
            for (const recording of tamilRecordings) {
                if (!recording.audioUrl) {
                    const youtubeData = await window.youtubeSearchAPI.searchVideo(
                        recording.title,
                        recording.artist
                    );
                    if (youtubeData) {
                        recording.videoId = youtubeData.videoId;
                        recording.audioUrl = youtubeData.videoId;
                        if (!recording.thumbnail && youtubeData.thumbnail) {
                            recording.thumbnail = youtubeData.thumbnail;
                        }
                    }
                }
            }
            sections.tamil = tamilRecordings.filter(r => r.videoId);
            console.log('✅ Tamil loaded:', sections.tamil.length);
        } catch (e) {
            console.warn('⚠️ Failed to load Tamil:', e);
        }
        
        // Search for Hindi music
        try {
            const hindiRecordings = await window.musicbrainzAPI.searchRecordings('tag:hindi OR tag:bollywood', 10);
            for (const recording of hindiRecordings) {
                if (!recording.audioUrl) {
                    const youtubeData = await window.youtubeSearchAPI.searchVideo(
                        recording.title,
                        recording.artist
                    );
                    if (youtubeData) {
                        recording.videoId = youtubeData.videoId;
                        recording.audioUrl = youtubeData.videoId;
                        if (!recording.thumbnail && youtubeData.thumbnail) {
                            recording.thumbnail = youtubeData.thumbnail;
                        }
                    }
                }
            }
            sections.hindi = hindiRecordings.filter(r => r.videoId);
            console.log('✅ Hindi loaded:', sections.hindi.length);
        } catch (e) {
            console.warn('⚠️ Failed to load Hindi:', e);
        }
        
        // Set sections in store
        window.musicStore.setSections(sections);
        
        console.log('✅ Music data bootstrapped:', {
            trending: sections.trending.length,
            tamil: sections.tamil.length,
            hindi: sections.hindi.length,
            english: sections.english.length
        });
    } catch (error) {
        console.error('❌ Failed to bootstrap music data:', error);
        window.musicStore.setSections({
            trending: [],
            tamil: [],
            hindi: [],
            english: []
        });
    }
}

// Auto-bootstrap when loaded (only once)
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            setTimeout(bootstrapMusicData, 500); // Wait a bit for scripts to load
        });
    } else {
        setTimeout(bootstrapMusicData, 500);
    }
})();
