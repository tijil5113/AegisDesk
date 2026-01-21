// HTML5 Audio Player (for Jamendo)
class AudioPlayer {
    constructor() {
        this.audio = null;
        this.currentTrack = null;
        this.isPlaying = false;
        this.volume = 70;
        
        this.onPlayCallbacks = [];
        this.onPauseCallbacks = [];
        this.onEndCallbacks = [];
        this.onErrorCallbacks = [];
        this.onTimeUpdateCallbacks = [];
        this.onLoadCallbacks = [];
        
        this.timeUpdateInterval = null;
        
        this.init();
    }
    
    init() {
        // Create audio element
        this.audio = new Audio();
        this.audio.preload = 'metadata';
        this.audio.volume = this.volume / 100;
        
        // Event listeners
        this.audio.addEventListener('play', () => {
            this.isPlaying = true;
            this.onPlayCallbacks.forEach(cb => cb());
            this.startTimeUpdate();
        });
        
        this.audio.addEventListener('pause', () => {
            this.isPlaying = false;
            this.onPauseCallbacks.forEach(cb => cb());
            this.stopTimeUpdate();
        });
        
        this.audio.addEventListener('ended', () => {
            this.isPlaying = false;
            this.onEndCallbacks.forEach(cb => cb());
            this.stopTimeUpdate();
        });
        
        this.audio.addEventListener('error', (e) => {
            console.error('❌ Audio error:', e);
            this.onErrorCallbacks.forEach(cb => cb(e));
        });
        
        this.audio.addEventListener('loadedmetadata', () => {
            this.onLoadCallbacks.forEach(cb => cb());
        });
        
        this.audio.addEventListener('timeupdate', () => {
            this.onTimeUpdateCallbacks.forEach(cb => cb({
                currentTime: this.audio.currentTime,
                duration: this.audio.duration || 0
            }));
        });
    }
    
    // Load and play track
    async play(track) {
        if (!track) {
            console.error('❌ Invalid track:', track);
            return;
        }
        
        // If track has videoId (YouTube), use YouTube player
        if (track.videoId && track.audioUrl === track.videoId) {
            // This is a YouTube video ID - we need YouTube IFrame API
            if (window.youtubePlayer) {
                window.youtubePlayer.play(track.videoId);
                this.currentTrack = track;
                return;
            } else {
                console.error('❌ YouTube player not available');
                return;
            }
        }
        
        // Otherwise, use HTML5 audio
        if (!track.audioUrl) {
            console.error('❌ Invalid track or missing audioUrl:', track);
            return;
        }
        
        console.log('▶️ Loading track:', track.title, track.audioUrl);
        
        // If same track, just resume
        if (this.currentTrack && this.currentTrack.videoId === track.videoId) {
            if (this.audio.paused) {
                await this.audio.play();
            }
            return;
        }
        
        // Load new track
        this.currentTrack = track;
        this.audio.src = track.audioUrl;
        this.audio.load();
        
        // Wait for metadata, then play
        try {
            await new Promise((resolve, reject) => {
                const onLoaded = () => {
                    this.audio.removeEventListener('loadedmetadata', onLoaded);
                    this.audio.removeEventListener('error', onError);
                    resolve();
                };
                const onError = (e) => {
                    this.audio.removeEventListener('loadedmetadata', onLoaded);
                    this.audio.removeEventListener('error', onError);
                    reject(e);
                };
                this.audio.addEventListener('loadedmetadata', onLoaded);
                this.audio.addEventListener('error', onError);
            });
            
            // Play after user interaction (browser requirement)
            await this.audio.play();
            console.log('✅ Track playing');
        } catch (error) {
            console.error('❌ Playback error:', error);
            this.onErrorCallbacks.forEach(cb => cb(error));
        }
    }
    
    // Pause
    pause() {
        if (this.audio) {
            this.audio.pause();
        }
    }
    
    // Resume
    async resume() {
        if (this.audio && this.currentTrack) {
            try {
                await this.audio.play();
            } catch (error) {
                console.error('❌ Resume error:', error);
            }
        }
    }
    
    // Seek
    seekTo(seconds) {
        if (this.audio && !isNaN(seconds)) {
            this.audio.currentTime = seconds;
        }
    }
    
    // Set volume (0-100)
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(100, volume));
        if (this.audio) {
            this.audio.volume = this.volume / 100;
        }
    }
    
    // Start time update interval
    startTimeUpdate() {
        if (this.timeUpdateInterval) return;
        
        this.timeUpdateInterval = setInterval(() => {
            if (this.audio) {
                this.onTimeUpdateCallbacks.forEach(cb => cb({
                    currentTime: this.audio.currentTime,
                    duration: this.audio.duration || 0
                }));
            }
        }, 100);
    }
    
    // Stop time update
    stopTimeUpdate() {
        if (this.timeUpdateInterval) {
            clearInterval(this.timeUpdateInterval);
            this.timeUpdateInterval = null;
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
    
    onLoad(callback) {
        this.onLoadCallbacks.push(callback);
    }
    
    // Check if ready
    isReady() {
        return this.audio !== null;
    }
    
    // Get current time
    getCurrentTime() {
        return this.audio ? this.audio.currentTime : 0;
    }
    
    // Get duration
    getDuration() {
        return this.audio ? (this.audio.duration || 0) : 0;
    }
}

// Create singleton
const audioPlayer = new AudioPlayer();
window.audioPlayer = audioPlayer;
