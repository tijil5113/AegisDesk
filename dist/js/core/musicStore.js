// Music Store - Single Source of Truth
class MusicStore {
    constructor() {
        this.state = {
            sections: {},
            currentTrack: null,
            queue: [],
            currentIndex: -1,
            isPlaying: false,
            volume: 70,
            shuffle: false,
            repeat: 'off', // 'off', 'one', 'all'
            history: []
        };
        
        this.listeners = [];
        this.subscribeId = 0;
    }
    
    // Subscribe to state changes
    subscribe(listener) {
        const id = ++this.subscribeId;
        this.listeners.push({ id, listener });
        
        // Immediately notify with current state
        listener(this.state);
        
        // Return unsubscribe function
        return () => {
            this.listeners = this.listeners.filter(l => l.id !== id);
        };
    }
    
    // Notify all listeners
    notify() {
        this.listeners.forEach(({ listener }) => {
            try {
                listener(this.state);
            } catch (error) {
                console.error('Store listener error:', error);
            }
        });
    }
    
    // Get current state (immutable copy)
    getState() {
        return { ...this.state };
    }
    
    // Set sections (Trending, Tamil, Hindi, etc.)
    setSections(sections) {
        this.state.sections = { ...this.state.sections, ...sections };
        this.notify();
    }
    
    // Set a single section
    setSection(name, tracks) {
        this.state.sections[name] = tracks || [];
        this.notify();
    }
    
    // Play a track
    playTrack(track) {
        if (!track || !track.videoId) {
            console.error('Invalid track:', track);
            return;
        }
        
        this.state.currentTrack = track;
        this.state.isPlaying = true;
        
        // Add to history
        if (this.state.history.length === 0 || 
            this.state.history[this.state.history.length - 1].videoId !== track.videoId) {
            this.state.history.push(track);
            // Keep only last 50
            if (this.state.history.length > 50) {
                this.state.history = this.state.history.slice(-50);
            }
        }
        
        this.notify();
    }
    
    // Pause playback
    pause() {
        this.state.isPlaying = false;
        this.notify();
    }
    
    // Resume playback
    resume() {
        if (this.state.currentTrack) {
            this.state.isPlaying = true;
            this.notify();
        }
    }
    
    // Set playing state
    setPlaying(playing) {
        this.state.isPlaying = playing;
        this.notify();
    }
    
    // Add track to queue
    addToQueue(track) {
        if (!this.state.queue.find(t => t.videoId === track.videoId)) {
            this.state.queue.push(track);
            this.notify();
        }
    }
    
    // Replace entire queue
    setQueue(tracks) {
        this.state.queue = [...tracks];
        this.state.currentIndex = tracks.length > 0 ? 0 : -1;
        this.notify();
    }
    
    // Play next track
    nextTrack() {
        if (this.state.queue.length === 0) return null;
        
        let nextIndex;
        
        if (this.state.shuffle) {
            // Random track
            nextIndex = Math.floor(Math.random() * this.state.queue.length);
        } else {
            // Next in queue
            nextIndex = this.state.currentIndex + 1;
            if (nextIndex >= this.state.queue.length) {
                if (this.state.repeat === 'all') {
                    nextIndex = 0;
                } else {
                    return null; // End of queue
                }
            }
        }
        
        this.state.currentIndex = nextIndex;
        const track = this.state.queue[nextIndex];
        this.playTrack(track);
        return track;
    }
    
    // Play previous track
    previousTrack() {
        if (this.state.queue.length === 0) return null;
        
        let prevIndex = this.state.currentIndex - 1;
        if (prevIndex < 0) {
            if (this.state.repeat === 'all') {
                prevIndex = this.state.queue.length - 1;
            } else {
                prevIndex = 0;
            }
        }
        
        this.state.currentIndex = prevIndex;
        const track = this.state.queue[prevIndex];
        this.playTrack(track);
        return track;
    }
    
    // Toggle shuffle
    toggleShuffle() {
        this.state.shuffle = !this.state.shuffle;
        this.notify();
        return this.state.shuffle;
    }
    
    // Toggle repeat
    toggleRepeat() {
        const modes = ['off', 'one', 'all'];
        const currentIndex = modes.indexOf(this.state.repeat);
        this.state.repeat = modes[(currentIndex + 1) % modes.length];
        this.notify();
        return this.state.repeat;
    }
    
    // Set volume
    setVolume(volume) {
        this.state.volume = Math.max(0, Math.min(100, volume));
        this.notify();
    }
    
    // Clear state (for reset)
    clear() {
        this.state = {
            sections: {},
            currentTrack: null,
            queue: [],
            currentIndex: -1,
            isPlaying: false,
            volume: 70,
            shuffle: false,
            repeat: 'off',
            history: []
        };
        this.notify();
    }
}

// Create singleton instance
const musicStore = new MusicStore();
window.musicStore = musicStore; // Make globally available
