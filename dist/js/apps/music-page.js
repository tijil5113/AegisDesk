// Music Page - UI Layer (Subscribes to MusicStore)
class MusicPage {
    constructor() {
        this.unsubscribe = null;
        this.debugMode = false;
        
        // Wait for DOM
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.init());
        } else {
            this.init();
        }
    }
    
    async init() {
        console.log('🎵 Music Page initializing (NEW ARCHITECTURE)...');
        
        // Wait for store
        if (!window.musicStore) {
            console.error('❌ Music store not available');
            setTimeout(() => this.init(), 100);
            return;
        }
        
        // Setup UI
        this.setupEventListeners();
        this.setupPlayerControls();
        this.connectToStore();
        this.connectToPlayer();
        
        // Initial render
        this.renderAll();
        
        console.log('✅ Music Page initialized');
    }
    
    connectToStore() {
        // Subscribe to store changes
        this.unsubscribe = window.musicStore.subscribe((state) => {
            this.updateUI(state);
        });
    }
    
    connectToPlayer() {
        // Connect to YouTube player
        if (window.youtubePlayer) {
            window.youtubePlayer.onPlay(() => {
                window.musicStore.setPlaying(true);
            });
            
            window.youtubePlayer.onPause(() => {
                window.musicStore.setPlaying(false);
            });
            
            window.youtubePlayer.onEnd(() => {
                const state = window.musicStore.getState();
                if (state.repeat === 'one') {
                    if (state.currentTrack) {
                        window.youtubePlayer.play(state.currentTrack.videoId);
                    }
                } else {
                    const track = window.musicStore.nextTrack();
                    if (track && track.videoId) {
                        window.youtubePlayer.play(track.videoId);
                    }
                }
            });
            
            window.youtubePlayer.onTimeUpdate((data) => {
                this.updateProgressBar(data);
            });
        }
        
        // Connect to audio player
        if (window.audioPlayer) {
            window.audioPlayer.onPlay(() => {
                window.musicStore.setPlaying(true);
            });
            
            window.audioPlayer.onPause(() => {
                window.musicStore.setPlaying(false);
            });
            
            window.audioPlayer.onEnd(() => {
                const state = window.musicStore.getState();
                if (state.repeat === 'one') {
                    if (state.currentTrack) {
                        window.audioPlayer.play(state.currentTrack);
                    }
                } else {
                    const track = window.musicStore.nextTrack();
                    if (track) {
                        window.audioPlayer.play(track);
                    }
                }
            });
            
            window.audioPlayer.onTimeUpdate((data) => {
                this.updateProgressBar(data);
            });
        }
    }
    
    updateProgressBar(data) {
        const progressBar = document.querySelector('.player-progress-bar');
        if (progressBar && data.duration > 0) {
            const progress = (data.currentTime / data.duration) * 100;
            progressBar.value = progress;
            
            const currentTimeEl = document.querySelector('.player-current-time');
            const totalTimeEl = document.querySelector('.player-total-time');
            if (currentTimeEl) currentTimeEl.textContent = this.formatTime(data.currentTime);
            if (totalTimeEl) totalTimeEl.textContent = this.formatTime(data.duration);
        }
    }
    
    setupEventListeners() {
        // Track card clicks (delegation)
        document.addEventListener('click', (e) => {
            const card = e.target.closest('.track-card');
            if (card) {
                e.preventDefault();
                e.stopPropagation();
                const videoId = card.dataset.videoId;
                const title = card.dataset.trackTitle || card.querySelector('.track-card-title')?.textContent;
                const artist = card.dataset.trackArtist || card.querySelector('.track-card-artist')?.textContent;
                const thumbnail = card.querySelector('img')?.src;
                
                if (videoId) {
                    const track = { videoId, title, artist, thumbnail };
                    this.handleTrackClick(track, card);
                }
            }
        });
        
        // Search
        const searchInput = document.querySelector('.music-search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                if (query.length > 2) {
                    searchTimeout = setTimeout(() => {
                        // TODO: Implement search
                        console.log('Search:', query);
                    }, 500);
                }
            });
        }
        
        // Language tabs
        document.querySelectorAll('.language-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                document.querySelectorAll('.language-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                const lang = tab.dataset.language;
                this.switchLanguage(lang);
            });
        });
    }
    
    setupPlayerControls() {
        // Play/Pause
        document.querySelector('.player-play-btn')?.addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        // Next
        document.querySelector('.player-next-btn')?.addEventListener('click', () => {
            const track = window.musicStore.nextTrack();
            if (track) {
                if (track.videoId && track.audioUrl === track.videoId && window.youtubePlayer) {
                    window.youtubePlayer.play(track.videoId);
                } else if (window.audioPlayer) {
                    window.audioPlayer.play(track);
                }
            }
        });
        
        // Previous
        document.querySelector('.player-prev-btn')?.addEventListener('click', () => {
            const track = window.musicStore.previousTrack();
            if (track) {
                if (track.videoId && track.audioUrl === track.videoId && window.youtubePlayer) {
                    window.youtubePlayer.play(track.videoId);
                } else if (window.audioPlayer) {
                    window.audioPlayer.play(track);
                }
            }
        });
        
        // Shuffle
        document.querySelector('.player-shuffle-btn')?.addEventListener('click', () => {
            const shuffle = window.musicStore.toggleShuffle();
            document.querySelector('.player-shuffle-btn')?.classList.toggle('active', shuffle);
        });
        
        // Repeat
        document.querySelector('.player-repeat-btn')?.addEventListener('click', () => {
            const mode = window.musicStore.toggleRepeat();
            const btn = document.querySelector('.player-repeat-btn');
            if (btn) {
                btn.classList.toggle('active', mode !== 'off');
                btn.dataset.mode = mode;
            }
        });
        
        // Progress bar
        const progressBar = document.querySelector('.player-progress-bar');
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                const state = window.musicStore.getState();
                if (state.currentTrack && window.audioPlayer) {
                    const progress = parseFloat(e.target.value);
                    const duration = window.audioPlayer.getDuration() || 0;
                    if (duration > 0) {
                        window.audioPlayer.seekTo((progress / 100) * duration);
                    }
                }
            });
        }
        
        // Volume
        const volumeBar = document.querySelector('.player-volume-bar');
        if (volumeBar) {
            volumeBar.addEventListener('input', (e) => {
                const volume = parseFloat(e.target.value);
                window.musicStore.setVolume(volume);
                if (window.audioPlayer) {
                    window.audioPlayer.setVolume(volume);
                }
            });
        }
    }
    
    handleTrackClick(track, cardElement) {
        console.log('▶️ Track clicked:', track);
        
        // Update store
        window.musicStore.playTrack(track);
        window.musicStore.addToQueue(track);
        
        // Play in appropriate player
        if (track.videoId && track.audioUrl === track.videoId && window.youtubePlayer) {
            // YouTube video
            window.youtubePlayer.play(track.videoId);
        } else if (window.audioPlayer) {
            // Direct audio URL
            window.audioPlayer.play(track);
        }
    }
    
    togglePlayPause() {
        const state = window.musicStore.getState();
        
        if (state.isPlaying) {
            window.musicStore.pause();
            if (window.youtubePlayer && state.currentTrack?.videoId) {
                window.youtubePlayer.pause();
            }
            if (window.audioPlayer) {
                window.audioPlayer.pause();
            }
        } else {
            if (state.currentTrack) {
                window.musicStore.resume();
                if (state.currentTrack.videoId && state.currentTrack.audioUrl === state.currentTrack.videoId && window.youtubePlayer) {
                    window.youtubePlayer.resume();
                } else if (window.audioPlayer) {
                    window.audioPlayer.resume();
                }
            } else if (state.queue.length > 0) {
                window.musicStore.currentIndex = 0;
                const track = state.queue[0];
                window.musicStore.playTrack(track);
                if (track.videoId && track.audioUrl === track.videoId && window.youtubePlayer) {
                    window.youtubePlayer.play(track.videoId);
                } else if (window.audioPlayer) {
                    window.audioPlayer.play(track);
                }
            }
        }
    }
    
    switchLanguage(language) {
        // Hide all sections
        document.querySelectorAll('[data-section]').forEach(section => {
            section.style.display = 'none';
        });
        
        // Show selected language sections
        if (language === 'all') {
            document.querySelectorAll('[data-section]').forEach(section => {
                section.style.display = 'block';
            });
        } else {
            const section = document.querySelector(`[data-section="${language}"]`);
            if (section) section.style.display = 'block';
        }
    }
    
    renderAll() {
        const state = window.musicStore.getState();
        this.renderSections(state.sections);
        this.updatePlayerUI(state);
    }
    
    renderSections(sections) {
        // Render each section
        Object.entries(sections).forEach(([sectionName, tracks]) => {
            const section = document.querySelector(`[data-section="${sectionName}"]`);
            if (!section) return;
            
            const trackList = section.querySelector('.track-list');
            if (!trackList) return;
            
            if (!tracks || tracks.length === 0) {
                trackList.innerHTML = '<div class="empty-state">No songs available</div>';
                return;
            }
            
            // Render track cards
            trackList.innerHTML = tracks.map(track => this.renderTrackCard(track)).join('');
        });
    }
    
    renderTrackCard(track) {
        if (!track || (!track.videoId && !track.jamendoId)) return '';
        
        const trackId = track.videoId || track.jamendoId?.toString() || '';
        const title = this.escapeHtml(track.title || 'Unknown Title');
        const artist = this.escapeHtml(track.artist || 'Unknown Artist');
        const thumbnail = track.thumbnail || 'https://via.placeholder.com/200';
        
        return `
            <div class="track-card" data-video-id="${trackId}" data-track-title="${title}" data-track-artist="${artist}">
                <div class="track-card-thumbnail">
                    <img src="${thumbnail}" alt="${title}" loading="lazy" onerror="this.src='https://via.placeholder.com/200?text=Music'">
                    <div class="track-card-overlay">
                        <button class="track-play-btn" data-action="play">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="track-card-info">
                    <div class="track-card-title" title="${title}">${title}</div>
                    <div class="track-card-artist" title="${artist}">${artist}</div>
                </div>
            </div>
        `;
    }
    
    updateUI(state) {
        this.updatePlayerUI(state);
        this.highlightActiveTrack(state.currentTrack);
    }
    
    updatePlayerUI(state) {
        const { currentTrack, isPlaying } = state;
        
        // Player info
        const thumbnail = document.querySelector('.player-thumbnail img');
        const placeholder = document.querySelector('.player-placeholder');
        const titleEl = document.querySelector('.player-track-title');
        const artistEl = document.querySelector('.player-track-artist');
        
        if (currentTrack) {
            if (placeholder) placeholder.style.display = 'none';
            if (thumbnail) {
                thumbnail.src = currentTrack.thumbnail || '';
                thumbnail.style.display = 'block';
            }
            if (titleEl) titleEl.textContent = currentTrack.title || 'Unknown Title';
            if (artistEl) artistEl.textContent = currentTrack.artist || 'Unknown Artist';
        } else {
            if (placeholder) placeholder.style.display = 'flex';
            if (thumbnail) thumbnail.style.display = 'none';
            if (titleEl) titleEl.textContent = 'No track selected';
            if (artistEl) artistEl.textContent = 'Select a song to play';
        }
        
        // Play/Pause button
        const playBtn = document.querySelector('.player-play-btn');
        if (playBtn) {
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');
            if (isPlaying) {
                if (playIcon) playIcon.style.display = 'none';
                if (pauseIcon) pauseIcon.style.display = 'block';
            } else {
                if (playIcon) playIcon.style.display = 'block';
                if (pauseIcon) pauseIcon.style.display = 'none';
            }
        }
    }
    
    highlightActiveTrack(track) {
        // Remove all highlights
        document.querySelectorAll('.track-card').forEach(card => {
            card.classList.remove('active');
        });
        
        // Highlight current track
        if (track && track.videoId) {
            const activeCard = document.querySelector(`[data-video-id="${track.videoId}"]`);
            if (activeCard) {
                activeCard.classList.add('active');
            }
        }
    }
    
    formatTime(seconds) {
        if (!seconds || !isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize
let musicPage;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        musicPage = new MusicPage();
    });
} else {
    musicPage = new MusicPage();
}
