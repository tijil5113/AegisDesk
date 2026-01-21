// Music Engine - Core playback and state management
class MusicEngine {
    constructor() {
        this.player = null;
        this.playerReady = false;
        this.currentTrack = null;
        this.queue = [];
        this.currentIndex = -1;
        this.isPlaying = false;
        this.volume = 70;
        this.shuffle = false;
        this.repeat = 'off'; // 'off', 'one', 'all'
        this.currentTime = 0;
        this.duration = 0;
        
        this.onStateChangeCallbacks = [];
        this.onTimeUpdateCallbacks = [];
        this.onTrackChangeCallbacks = [];
        
        this.loadYouTubeAPI();
    }
    
    loadYouTubeAPI() {
        console.log('📥 MusicEngine: Checking YouTube API...');
        
        // Check if already loaded
        if (window.YT && window.YT.Player) {
            console.log('✅ YouTube API already loaded, initializing player...');
            setTimeout(() => this.initializePlayer(), 100);
            return;
        }
        
        // Check if script is already in DOM
        const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
        if (existingScript) {
            console.log('📥 YouTube API script in DOM, waiting for callback...');
            
            // Set up callback
            const originalCallback = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                console.log('✅ YouTube API ready callback received in MusicEngine');
                if (originalCallback) originalCallback();
                setTimeout(() => this.initializePlayer(), 100);
            };
            
            // Also check periodically
            let attempts = 0;
            const checkInterval = setInterval(() => {
                attempts++;
                if (window.YT && window.YT.Player) {
                    clearInterval(checkInterval);
                    console.log('✅ YouTube API detected, initializing player...');
                    setTimeout(() => this.initializePlayer(), 100);
                } else if (attempts >= 30) {
                    clearInterval(checkInterval);
                    console.warn('⚠️ YouTube API still not loaded after 3 seconds');
                }
            }, 100);
            return;
        }
        
        console.error('❌ YouTube API script not found in DOM!');
        this.onStateChangeCallbacks.forEach(cb => cb({ 
            type: 'error', 
            error: 'YouTube API script not loaded. Please refresh the page.' 
        }));
    }
    
    initializePlayer() {
        console.log('🎬 Initializing YouTube player...');
        
        // Check if YT API is available
        if (!window.YT || !window.YT.Player) {
            console.error('❌ YouTube API not available yet');
            // Retry after a delay
            setTimeout(() => {
                if (window.YT && window.YT.Player) {
                    this.initializePlayer();
                } else {
                    console.error('❌ YouTube API still not available after retry');
                    this.onStateChangeCallbacks.forEach(cb => cb({ 
                        type: 'error', 
                        error: 'YouTube API not loaded. Please refresh the page.' 
                    }));
                }
            }, 1000);
            return;
        }
        
        // Ensure container exists
        let container = document.getElementById('youtube-player-container');
        if (!container) {
            console.log('📦 Creating player container...');
            container = document.createElement('div');
            container.id = 'youtube-player-container';
            container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
            if (!document.body) {
                document.addEventListener('DOMContentLoaded', () => {
                    document.body.appendChild(container);
                    this.initializePlayer();
                });
                return;
            }
            document.body.appendChild(container);
        }
        
        // Check if player already exists
        if (this.player) {
            console.log('⚠️ Player already exists, skipping initialization');
            return;
        }
        
        try {
            console.log('🎵 Creating YT.Player instance...');
            this.player = new YT.Player('youtube-player-container', {
                height: '1',
                width: '1',
                playerVars: {
                    autoplay: 1, // Enable autoplay (works after user interaction)
                    controls: 0,
                    disablekb: 1,
                    enablejsapi: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    playsinline: 1,
                    rel: 0,
                    origin: window.location.origin || 'http://localhost'
                },
                events: {
                    onReady: (event) => {
                        console.log('✅ YouTube player ready!');
                        this.playerReady = true;
                        // Set volume immediately
                        try {
                            this.player.setVolume(this.volume);
                            console.log('🔊 Volume set to:', this.volume);
                        } catch (e) {
                            console.error('Failed to set volume:', e);
                        }
                        this.onStateChangeCallbacks.forEach(cb => cb({ type: 'ready' }));
                    },
                    onStateChange: (event) => {
                        this.handleStateChange(event);
                    },
                    onError: (event) => {
                        console.error('❌ YouTube player error:', event.data, {
                            '2': 'Invalid parameter value',
                            '5': 'HTML5 player error',
                            '100': 'Video not found',
                            '101': 'Video not allowed in embedded players',
                            '150': 'Video not allowed in embedded players'
                        }[event.data] || 'Unknown error');
                        this.onStateChangeCallbacks.forEach(cb => cb({ type: 'error', error: event.data }));
                    }
                }
            });
        } catch (error) {
            console.error('❌ Failed to initialize YouTube player:', error);
            this.onStateChangeCallbacks.forEach(cb => cb({ 
                type: 'error', 
                error: `Player initialization failed: ${error.message || error}` 
            }));
            
            // Retry once after 2 seconds
            setTimeout(() => {
                if (!this.playerReady && window.YT && window.YT.Player) {
                    console.log('🔄 Retrying player initialization...');
                    try {
                        // Remove old container if exists
                        const oldContainer = document.getElementById('youtube-player-container');
                        if (oldContainer && oldContainer.parentNode) {
                            oldContainer.parentNode.removeChild(oldContainer);
                        }
                        
                        // Create new container
                        const container = document.createElement('div');
                        container.id = 'youtube-player-container';
                        container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
                        document.body.appendChild(container);
                        
                        // Create new player
                        this.player = new YT.Player('youtube-player-container', {
                            height: '1',
                            width: '1',
                            playerVars: {
                                autoplay: 1,
                                controls: 0,
                                disablekb: 1,
                                enablejsapi: 1,
                                fs: 0,
                                iv_load_policy: 3,
                                modestbranding: 1,
                                playsinline: 1,
                                rel: 0,
                                origin: window.location.origin || 'http://localhost'
                            },
                            events: {
                                onReady: (event) => {
                                    console.log('✅ YouTube player ready (retry)!');
                                    this.playerReady = true;
                                    try {
                                        this.player.setVolume(this.volume);
                                        console.log('🔊 Volume set to:', this.volume);
                                    } catch (e) {
                                        console.error('Failed to set volume:', e);
                                    }
                                    this.onStateChangeCallbacks.forEach(cb => cb({ type: 'ready' }));
                                },
                                onStateChange: (event) => {
                                    this.handleStateChange(event);
                                },
                                onError: (event) => {
                                    console.error('❌ YouTube player error:', event.data);
                                    this.onStateChangeCallbacks.forEach(cb => cb({ type: 'error', error: event.data }));
                                }
                            }
                        });
                    } catch (retryError) {
                        console.error('❌ Retry also failed:', retryError);
                        this.onStateChangeCallbacks.forEach(cb => cb({ 
                            type: 'error', 
                            error: 'Player initialization failed. Please refresh the page.' 
                        }));
                    }
                }
            }, 2000);
        }
    }
    
    handleStateChange(event) {
        const state = event.data;
        
        console.log('🎵 Player state changed:', state, {
            '-1': 'UNSTARTED',
            '0': 'ENDED',
            '1': 'PLAYING',
            '2': 'PAUSED',
            '3': 'BUFFERING',
            '5': 'CUED'
        }[state] || 'UNKNOWN');
        
        if (state === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.startTimeUpdate();
            console.log('✅ Music is now playing!');
        } else if (state === YT.PlayerState.PAUSED) {
            this.isPlaying = false;
            this.stopTimeUpdate();
        } else if (state === YT.PlayerState.ENDED) {
            this.isPlaying = false;
            this.stopTimeUpdate();
            this.handleTrackEnd();
        } else if (state === YT.PlayerState.CUED) {
            // Video is loaded and ready, try to play
            console.log('📥 Video cued, attempting to play...');
            setTimeout(() => {
                try {
                    if (this.player && this.playerReady) {
                        this.player.playVideo();
                    }
                } catch (e) {
                    console.error('Failed to play after cue:', e);
                }
            }, 100);
        }
        
        this.onStateChangeCallbacks.forEach(cb => cb({ type: 'stateChange', state }));
    }
    
    startTimeUpdate() {
        if (this.timeUpdateInterval) return;
        
        this.timeUpdateInterval = setInterval(() => {
            if (this.player && this.playerReady) {
                try {
                    this.currentTime = this.player.getCurrentTime();
                    this.duration = this.player.getDuration();
                    this.onTimeUpdateCallbacks.forEach(cb => cb({
                        currentTime: this.currentTime,
                        duration: this.duration
                    }));
                } catch (error) {
                    // Player might not be ready
                }
            }
        }, 100);
    }
    
    stopTimeUpdate() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
        }
    }
    
    play(track) {
        if (!track || !track.videoId) {
            console.error('Invalid track:', track);
            return;
        }
        
        console.log('▶️ Playing track:', track.title, track.videoId);
        
        this.currentTrack = track;
        this.onTrackChangeCallbacks.forEach(cb => cb(track));
        
        if (!this.player || !this.playerReady) {
            console.log('⏳ Player not ready, waiting...');
            const checkReady = setInterval(() => {
                if (this.playerReady) {
                    clearInterval(checkReady);
                    console.log('✅ Player ready, playing now');
                    this.play(track);
                }
            }, 100);
            
            // Timeout after 10 seconds
            setTimeout(() => {
                clearInterval(checkReady);
                if (!this.playerReady) {
                    console.error('❌ Player failed to initialize');
                }
            }, 10000);
            return;
        }
        
        try {
            let currentVideoId = null;
            try {
                currentVideoId = this.player.getVideoData()?.video_id;
            } catch (e) {
                // getVideoData might fail if no video loaded yet
            }
            
            if (currentVideoId !== track.videoId) {
                console.log('📥 Loading video:', track.videoId);
                // Load video - use object format for better compatibility
                this.player.loadVideoById(track.videoId);
                
                // Wait for video to load, then play
                let attempts = 0;
                const maxAttempts = 50; // 5 seconds
                const playAfterLoad = setInterval(() => {
                    attempts++;
                    try {
                        const playerState = this.player.getPlayerState();
                        console.log(`🎵 Player state ${attempts}:`, playerState, {
                            '-1': 'UNSTARTED',
                            '0': 'ENDED',
                            '1': 'PLAYING',
                            '2': 'PAUSED',
                            '3': 'BUFFERING',
                            '5': 'CUED'
                        }[playerState] || 'UNKNOWN');
                        
                        // State -1 = unstarted, 3 = buffering, 5 = cued
                        if (playerState === YT.PlayerState.CUED || playerState === YT.PlayerState.UNSTARTED) {
                            console.log('▶️ Video cued/unstarted, starting playback...');
                            this.player.playVideo();
                            clearInterval(playAfterLoad);
                        } else if (playerState === YT.PlayerState.PLAYING) {
                            console.log('✅ Already playing!');
                            clearInterval(playAfterLoad);
                        } else if (playerState === YT.PlayerState.BUFFERING) {
                            console.log('⏳ Buffering...');
                        }
                    } catch (e) {
                        console.error('Error checking player state:', e);
                    }
                    
                    if (attempts >= maxAttempts) {
                        console.log('⏱️ Timeout reached, forcing play...');
                        try {
                            this.player.playVideo();
                        } catch (e) {
                            console.error('Failed to force play:', e);
                        }
                        clearInterval(playAfterLoad);
                    }
                }, 100);
            } else {
                console.log('▶️ Resuming current video');
                this.player.playVideo();
            }
        } catch (error) {
            console.error('❌ Error playing video:', error);
            // Try to load anyway
            try {
                this.player.loadVideoById(track.videoId);
                setTimeout(() => {
                    try {
                        this.player.playVideo();
                    } catch (e) {
                        console.error('Failed to play after load:', e);
                    }
                }, 500);
            } catch (e) {
                console.error('Failed to load video:', e);
            }
        }
    }
    
    pause() {
        if (this.player && this.playerReady) {
            this.player.pauseVideo();
        }
    }
    
    resume() {
        if (this.player && this.playerReady) {
            this.player.playVideo();
        }
    }
    
    stop() {
        if (this.player && this.playerReady) {
            this.player.stopVideo();
        }
        this.isPlaying = false;
        this.currentTrack = null;
        this.stopTimeUpdate();
    }
    
    seekTo(seconds) {
        if (this.player && this.playerReady) {
            this.player.seekTo(seconds, true);
        }
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        if (this.player && this.playerReady) {
            this.player.setVolume(this.volume);
        }
    }
    
    getVolume() {
        return this.volume;
    }
    
    addToQueue(track) {
        this.queue.push(track);
    }
    
    removeFromQueue(index) {
        if (index >= 0 && index < this.queue.length) {
            this.queue.splice(index, 1);
            if (this.currentIndex >= index) {
                this.currentIndex--;
            }
        }
    }
    
    playNext() {
        if (this.queue.length === 0) return;
        
        if (this.shuffle) {
            this.currentIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentIndex = (this.currentIndex + 1) % this.queue.length;
        }
        
        const track = this.queue[this.currentIndex];
        if (track) {
            this.play(track);
        }
    }
    
    playPrevious() {
        if (this.queue.length === 0) return;
        
        if (this.shuffle) {
            this.currentIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentIndex = (this.currentIndex - 1 + this.queue.length) % this.queue.length;
        }
        
        const track = this.queue[this.currentIndex];
        if (track) {
            this.play(track);
        }
    }
    
    handleTrackEnd() {
        if (this.repeat === 'one') {
            if (this.currentTrack) {
                this.play(this.currentTrack);
            }
        } else if (this.repeat === 'all' && this.queue.length > 0) {
            this.playNext();
        } else {
            this.playNext();
        }
    }
    
    toggleShuffle() {
        this.shuffle = !this.shuffle;
    }
    
    toggleRepeat() {
        const modes = ['off', 'all', 'one'];
        const currentIndex = modes.indexOf(this.repeat);
        this.repeat = modes[(currentIndex + 1) % modes.length];
        return this.repeat;
    }
    
    onStateChange(callback) {
        this.onStateChangeCallbacks.push(callback);
    }
    
    onTimeUpdate(callback) {
        this.onTimeUpdateCallbacks.push(callback);
    }
    
    onTrackChange(callback) {
        this.onTrackChangeCallbacks.push(callback);
    }
    
    isReady() {
        return this.playerReady;
    }
}

// Create singleton instance
// Create music engine instance immediately (will wait for YouTube API internally)
let musicEngine;

function createMusicEngine() {
    if (!musicEngine) {
        console.log('🎵 Creating MusicEngine instance...');
        musicEngine = new MusicEngine();
        window.musicEngine = musicEngine; // Make it globally available
    }
    return musicEngine;
}

// Initialize immediately
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        createMusicEngine();
    });
} else {
    createMusicEngine();
}

// Also try after a short delay (fallback)
setTimeout(() => {
    if (!musicEngine) {
        console.log('🔄 Fallback: Creating MusicEngine...');
        createMusicEngine();
    }
}, 1000);
