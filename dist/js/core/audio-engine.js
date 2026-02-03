// Audio Engine - YouTube iframe API wrapper and audio management
class AudioEngine {
    constructor() {
        this.player = null;
        this.playerReady = false;
        this.currentVideoId = null;
        this.isPlaying = false;
        this.currentTime = 0;
        this.duration = 0;
        this.volume = 70;
        this.onStateChangeCallbacks = [];
        this.onTimeUpdateCallbacks = [];
        this.onReadyCallbacks = [];
        
        // Load YouTube iframe API
        this.loadYouTubeAPI();
    }
    
    loadYouTubeAPI() {
        if (window.YT && window.YT.Player) {
            this.initializePlayer();
            return;
        }
        
        // Load YouTube iframe API script
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
        
        // Set up global callback
        window.onYouTubeIframeAPIReady = () => {
            this.initializePlayer();
        };
    }
    
    initializePlayer() {
        // Create hidden iframe container
        let container = document.getElementById('youtube-player-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'youtube-player-container';
            container.style.position = 'fixed';
            container.style.top = '-9999px';
            container.style.left = '-9999px';
            container.style.width = '1px';
            container.style.height = '1px';
            container.style.opacity = '0';
            container.style.pointerEvents = 'none';
            document.body.appendChild(container);
        }
        
        try {
            this.player = new YT.Player('youtube-player-container', {
                height: '1',
                width: '1',
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    disablekb: 1,
                    enablejsapi: 1,
                    fs: 0,
                    iv_load_policy: 3,
                    modestbranding: 1,
                    playsinline: 1,
                    rel: 0
                },
                events: {
                    onReady: (event) => {
                        this.playerReady = true;
                        this.player.setVolume(this.volume);
                        this.onReadyCallbacks.forEach(cb => cb(event));
                    },
                    onStateChange: (event) => {
                        this.handleStateChange(event);
                    },
                    onError: (event) => {
                        console.error('YouTube player error:', event.data);
                        this.onStateChangeCallbacks.forEach(cb => cb({ state: -1, error: event.data }));
                    }
                }
            });
        } catch (error) {
            console.error('Failed to initialize YouTube player:', error);
        }
    }
    
    handleStateChange(event) {
        const state = event.data;
        
        // Update playing state
        if (state === YT.PlayerState.PLAYING) {
            this.isPlaying = true;
            this.startTimeUpdate();
        } else if (state === YT.PlayerState.PAUSED) {
            this.isPlaying = false;
            this.stopTimeUpdate();
        } else if (state === YT.PlayerState.ENDED) {
            this.isPlaying = false;
            this.stopTimeUpdate();
        }
        
        // Notify callbacks
        this.onStateChangeCallbacks.forEach(cb => cb(event));
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
    
    play(videoId) {
        if (!this.player || !this.playerReady) {
            // Wait for player to be ready
            const checkReady = setInterval(() => {
                if (this.playerReady) {
                    clearInterval(checkReady);
                    this.play(videoId);
                }
            }, 100);
            return;
        }
        
        if (this.currentVideoId !== videoId) {
            this.currentVideoId = videoId;
            this.player.loadVideoById(videoId);
        } else {
            this.player.playVideo();
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
        this.currentVideoId = null;
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
    
    getCurrentTime() {
        return this.currentTime;
    }
    
    getDuration() {
        return this.duration;
    }
    
    isPlayerReady() {
        return this.playerReady;
    }
    
    onStateChange(callback) {
        this.onStateChangeCallbacks.push(callback);
    }
    
    onTimeUpdate(callback) {
        this.onTimeUpdateCallbacks.push(callback);
    }
    
    onReady(callback) {
        if (this.playerReady) {
            callback({ target: this.player });
        } else {
            this.onReadyCallbacks.push(callback);
        }
    }
    
    destroy() {
        this.stop();
        this.stopTimeUpdate();
        if (this.player) {
            try {
                this.player.destroy();
            } catch (error) {
                console.error('Error destroying player:', error);
            }
        }
        this.player = null;
        this.playerReady = false;
    }
}

// Create singleton instance
const audioEngine = new AudioEngine();
