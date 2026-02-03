// YouTube Player Wrapper - Handles YouTube IFrame API
class YouTubePlayer {
    constructor() {
        this.player = null;
        this.playerReady = false;
        this.currentVideoId = null;
        
        this.onPlayCallbacks = [];
        this.onPauseCallbacks = [];
        this.onEndCallbacks = [];
        this.onErrorCallbacks = [];
        this.onTimeUpdateCallbacks = [];
        
        this.currentTime = 0;
        this.duration = 0;
        this.timeUpdateInterval = null;
        
        this.init();
    }
    
    init() {
        console.log('🎬 YouTube Player initializing...');
        this.loadYouTubeAPI();
    }
    
    loadYouTubeAPI() {
        // Check if already loaded
        if (window.YT && window.YT.Player) {
            console.log('✅ YouTube API already loaded');
            this.initializePlayer();
            return;
        }
        
        // Check if script exists
        const existingScript = document.querySelector('script[src*="youtube.com/iframe_api"]');
        if (!existingScript) {
            console.error('❌ YouTube IFrame API script not found in DOM');
            return;
        }
        
        // Set up callback
        const originalCallback = window.onYouTubeIframeAPIReady;
        window.onYouTubeIframeAPIReady = () => {
            console.log('✅ YouTube API ready callback');
            if (originalCallback) originalCallback();
            this.initializePlayer();
        };
        
        // Fallback: check periodically
        let attempts = 0;
        const checkInterval = setInterval(() => {
            attempts++;
            if (window.YT && window.YT.Player) {
                clearInterval(checkInterval);
                this.initializePlayer();
            } else if (attempts >= 30) {
                clearInterval(checkInterval);
                console.error('❌ YouTube API failed to load');
            }
        }, 100);
    }
    
    initializePlayer() {
        if (this.player || !window.YT || !window.YT.Player) {
            return;
        }
        
        console.log('🎵 Creating YouTube player...');
        
        // Ensure container exists
        let container = document.getElementById('youtube-player-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'youtube-player-container';
            container.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
            document.body.appendChild(container);
        }
        
        try {
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
                    onReady: () => {
                        console.log('✅ YouTube player ready!');
                        this.playerReady = true;
                    },
                    onStateChange: (event) => {
                        this.handleStateChange(event);
                    },
                    onError: (event) => {
                        console.error('❌ YouTube player error:', event.data);
                        this.onErrorCallbacks.forEach(cb => cb(event.data));
                    }
                }
            });
        } catch (error) {
            console.error('❌ Failed to create YouTube player:', error);
        }
    }
    
    handleStateChange(event) {
        const state = event.data;
        
        if (state === YT.PlayerState.PLAYING) {
            this.onPlayCallbacks.forEach(cb => cb());
            this.startTimeUpdate();
        } else if (state === YT.PlayerState.PAUSED) {
            this.onPauseCallbacks.forEach(cb => cb());
            this.stopTimeUpdate();
        } else if (state === YT.PlayerState.ENDED) {
            this.onEndCallbacks.forEach(cb => cb());
            this.stopTimeUpdate();
        }
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
    
    // Load and play video
    play(videoId) {
        if (!this.player || !this.playerReady) {
            console.log('⏳ Player not ready, waiting...');
            const waitForReady = setInterval(() => {
                if (this.playerReady) {
                    clearInterval(waitForReady);
                    this.play(videoId);
                }
            }, 100);
            
            setTimeout(() => clearInterval(waitForReady), 5000);
            return;
        }
        
        if (this.currentVideoId === videoId) {
            // Same video, just resume
            this.player.playVideo();
            return;
        }
        
        console.log('▶️ Loading video:', videoId);
        this.currentVideoId = videoId;
        this.player.loadVideoById(videoId);
    }
    
    // Pause
    pause() {
        if (this.player && this.playerReady) {
            this.player.pauseVideo();
        }
    }
    
    // Resume
    resume() {
        if (this.player && this.playerReady) {
            this.player.playVideo();
        }
    }
    
    // Seek
    seekTo(seconds) {
        if (this.player && this.playerReady) {
            this.player.seekTo(seconds, true);
        }
    }
    
    // Set volume (0-100)
    setVolume(volume) {
        if (this.player && this.playerReady) {
            const ytVolume = Math.max(0, Math.min(100, volume));
            this.player.setVolume(ytVolume);
        }
    }
    
    // Event listeners
    onPlay(callback) {
        this.onPlayCallbacks.push(callback);
    }
    
    onPause(callback) {
        this.onPauseCallbacks.push(callback);
    }
    
    onEnd(callback) {
        this.onEndCallbacks.push(callback);
    }
    
    onError(callback) {
        this.onErrorCallbacks.push(callback);
    }
    
    onTimeUpdate(callback) {
        this.onTimeUpdateCallbacks.push(callback);
    }
    
    // Check if ready
    isReady() {
        return this.playerReady && this.player !== null;
    }
}

// Create singleton instance
const youtubePlayer = new YouTubePlayer();
window.youtubePlayer = youtubePlayer; // Make globally available
