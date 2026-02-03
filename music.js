// AegisDesk Music System - Premium YouTube Music Experience
class MusicSystem {
    constructor() {
        this.apiKey = this.getAPIKey();
        this.baseURL = 'https://www.googleapis.com/youtube/v3';
        this.currentTrack = null;
        this.queue = [];
        this.currentQueueIndex = -1;
        this.shuffle = false;
        this.repeat = 'off'; // 'off', 'one', 'all'
        this.playlists = [];
        this.likedSongs = [];
        this.recentSearches = [];
        this.listeningHistory = [];
        this.currentLanguage = 'all';
        this.isInitialized = false;
        
        // Discovery sections
        this.sections = {
            trending: [],
            topCharts: [],
            newReleases: [],
            playlists: [],
            artists: []
        };
        
        // Initialize
        this.init();
    }
    
    async init() {
        // Load saved data
        await this.loadData();
        
        // Initialize audio engine
        if (typeof audioEngine !== 'undefined') {
            audioEngine.onStateChange((event) => {
                this.handlePlayerStateChange(event);
            });
            
            audioEngine.onTimeUpdate((data) => {
                this.handleTimeUpdate(data);
            });
        }
        
        // Setup UI
        this.setupEventListeners();
        
        // Load initial content
        this.loadDiscoveryContent();
        
        this.isInitialized = true;
    }
    
    getAPIKey() {
        // Try to get from storage
        if (typeof storage !== 'undefined') {
            return storage.get('youtube_api_key', '');
        }
        // Fallback: user should add their own key
        return '';
    }
    
    async loadData() {
        if (typeof storage === 'undefined') return;
        
        this.queue = storage.get('music_queue', []);
        this.currentQueueIndex = storage.get('music_queue_index', -1);
        this.shuffle = storage.get('music_shuffle', false);
        this.repeat = storage.get('music_repeat', 'off');
        this.playlists = storage.get('music_playlists', []);
        this.likedSongs = storage.get('music_liked', []);
        this.recentSearches = storage.get('music_recent_searches', []);
        this.listeningHistory = storage.get('music_history', []);
        this.currentLanguage = storage.get('music_language', 'all');
        
        // Load from IndexedDB if available
        if (typeof indexedDB !== 'undefined') {
            try {
                const db = await this.openDB();
                if (db) {
                    const playlists = await this.getFromDB(db, 'playlists');
                    if (playlists && playlists.length > 0) {
                        this.playlists = playlists;
                    }
                }
            } catch (error) {
                console.error('Error loading from IndexedDB:', error);
            }
        }
    }
    
    async saveData() {
        if (typeof storage === 'undefined') return;
        
        storage.set('music_queue', this.queue);
        storage.set('music_queue_index', this.currentQueueIndex);
        storage.set('music_shuffle', this.shuffle);
        storage.set('music_repeat', this.repeat);
        storage.set('music_playlists', this.playlists);
        storage.set('music_liked', this.likedSongs);
        storage.set('music_recent_searches', this.recentSearches);
        storage.set('music_history', this.listeningHistory);
        storage.set('music_language', this.currentLanguage);
        
        // Save to IndexedDB
        if (typeof indexedDB !== 'undefined') {
            try {
                const db = await this.openDB();
                if (db) {
                    await this.saveToDB(db, 'playlists', this.playlists);
                }
            } catch (error) {
                console.error('Error saving to IndexedDB:', error);
            }
        }
    }
    
    openDB() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open('AegisDeskMusic', 1);
            
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains('playlists')) {
                    db.createObjectStore('playlists', { keyPath: 'id' });
                }
                if (!db.objectStoreNames.contains('history')) {
                    db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                }
            };
        });
    }
    
    async getFromDB(db, storeName) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readonly');
            const store = transaction.objectStore(storeName);
            const request = store.getAll();
            
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
    
    async saveToDB(db, storeName, data) {
        return new Promise((resolve, reject) => {
            const transaction = db.transaction([storeName], 'readwrite');
            const store = transaction.objectStore(storeName);
            
            // Clear and add all
            store.clear();
            data.forEach(item => {
                store.add(item);
            });
            
            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }
    
    async searchYouTube(query, maxResults = 20, type = 'video') {
        if (!this.apiKey) {
            console.warn('YouTube API key not set');
            return [];
        }
        
        try {
            const response = await fetch(
                `${this.baseURL}/search?part=snippet&q=${encodeURIComponent(query)}&type=${type}&maxResults=${maxResults}&key=${this.apiKey}`
            );
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatSearchResults(data.items || []);
        } catch (error) {
            console.error('YouTube search error:', error);
            return [];
        }
    }
    
    async getTrendingMusic(regionCode = 'IN', maxResults = 20) {
        if (!this.apiKey) return [];
        
        try {
            const response = await fetch(
                `${this.baseURL}/videos?part=snippet,contentDetails,statistics&chart=mostPopular&regionCode=${regionCode}&videoCategoryId=10&maxResults=${maxResults}&key=${this.apiKey}`
            );
            
            if (!response.ok) {
                throw new Error(`API error: ${response.status}`);
            }
            
            const data = await response.json();
            return this.formatVideoResults(data.items || []);
        } catch (error) {
            console.error('Trending music error:', error);
            return [];
        }
    }
    
    async getMusicByLanguage(language, maxResults = 20) {
        const queries = {
            'tamil': 'tamil songs 2024',
            'hindi': 'hindi songs 2024',
            'telugu': 'telugu songs 2024',
            'malayalam': 'malayalam songs 2024',
            'kannada': 'kannada songs 2024',
            'english': 'latest english songs 2024'
        };
        
        const query = queries[language.toLowerCase()] || 'latest songs 2024';
        return await this.searchYouTube(query, maxResults);
    }
    
    formatSearchResults(items) {
        return items.map(item => ({
            id: item.id.videoId || item.id,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            duration: null, // Would need additional API call
            publishedAt: item.snippet.publishedAt,
            description: item.snippet.description
        }));
    }
    
    formatVideoResults(items) {
        return items.map(item => ({
            id: item.id,
            title: item.snippet.title,
            artist: item.snippet.channelTitle,
            thumbnail: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url,
            duration: this.parseDuration(item.contentDetails?.duration),
            publishedAt: item.snippet.publishedAt,
            viewCount: item.statistics?.viewCount,
            likeCount: item.statistics?.likeCount
        }));
    }
    
    parseDuration(duration) {
        if (!duration) return null;
        const match = duration.match(/PT(\d+H)?(\d+M)?(\d+S)?/);
        if (!match) return null;
        
        const hours = (match[1] || '').replace('H', '') || '0';
        const minutes = (match[2] || '').replace('M', '') || '0';
        const seconds = (match[3] || '').replace('S', '') || '0';
        
        const totalSeconds = parseInt(hours) * 3600 + parseInt(minutes) * 60 + parseInt(seconds);
        return totalSeconds;
    }
    
    async loadDiscoveryContent() {
        // Load trending
        this.sections.trending = await this.getTrendingMusic('IN', 20);
        this.renderSection('trending', this.sections.trending);
        
        // Load by language if selected
        if (this.currentLanguage !== 'all') {
            const languageSongs = await this.getMusicByLanguage(this.currentLanguage, 20);
            this.renderSection('language', languageSongs);
        }
        
        // Load user playlists
        this.renderPlaylists();
    }
    
    renderSection(sectionId, tracks) {
        const container = document.querySelector(`[data-section="${sectionId}"]`);
        if (!container) return;
        
        const trackList = container.querySelector('.track-list') || container;
        trackList.innerHTML = tracks.map(track => this.renderTrackCard(track)).join('');
        
        // Attach event listeners
        this.attachTrackListeners(trackList);
    }
    
    renderTrackCard(track) {
        const isLiked = this.likedSongs.some(s => s.id === track.id);
        const duration = track.duration ? this.formatDuration(track.duration) : '';
        
        return `
            <div class="track-card" data-track-id="${track.id}">
                <div class="track-card-thumbnail">
                    <img src="${track.thumbnail}" alt="${this.escapeHtml(track.title)}" loading="lazy">
                    <div class="track-card-overlay">
                        <button class="track-play-btn" data-action="play" title="Play">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                                <polygon points="5 3 19 12 5 21 5 3"></polygon>
                            </svg>
                        </button>
                        <button class="track-add-btn" data-action="add-to-queue" title="Add to Queue">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="12" y1="5" x2="12" y2="19"></line>
                                <line x1="5" y1="12" x2="19" y2="12"></line>
                            </svg>
                        </button>
                    </div>
                </div>
                <div class="track-card-info">
                    <div class="track-card-title">${this.escapeHtml(track.title)}</div>
                    <div class="track-card-artist">${this.escapeHtml(track.artist)}</div>
                    ${duration ? `<div class="track-card-duration">${duration}</div>` : ''}
                </div>
                <button class="track-like-btn ${isLiked ? 'liked' : ''}" data-action="like" title="${isLiked ? 'Unlike' : 'Like'}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="${isLiked ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
                        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path>
                    </svg>
                </button>
            </div>
        `;
    }
    
    attachTrackListeners(container) {
        container.querySelectorAll('.track-card').forEach(card => {
            const trackId = card.dataset.trackId;
            const track = this.findTrackById(trackId);
            if (!track) return;
            
            // Play button
            card.querySelector('[data-action="play"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.playTrack(track);
            });
            
            // Add to queue
            card.querySelector('[data-action="add-to-queue"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.addToQueue(track);
            });
            
            // Like button
            card.querySelector('[data-action="like"]')?.addEventListener('click', (e) => {
                e.stopPropagation();
                this.toggleLike(track);
            });
            
            // Card click - play track
            card.addEventListener('click', () => {
                this.playTrack(track);
            });
        });
    }
    
    findTrackById(trackId) {
        // Search in all sections
        for (const section of Object.values(this.sections)) {
            const track = section.find(t => t.id === trackId);
            if (track) return track;
        }
        
        // Search in queue
        return this.queue.find(t => t.id === trackId);
    }
    
    playTrack(track) {
        this.currentTrack = track;
        this.addToHistory(track);
        
        if (typeof audioEngine !== 'undefined' && audioEngine.isPlayerReady()) {
            audioEngine.play(track.id);
        }
        
        this.updatePlayerUI();
        this.updateTaskbarInfo();
        this.notifyOS(track);
        
        // Update play button
        const playBtn = document.querySelector('.player-play-btn');
        if (playBtn) {
            const playIcon = playBtn.querySelector('.play-icon');
            const pauseIcon = playBtn.querySelector('.pause-icon');
            if (playIcon) playIcon.style.display = 'none';
            if (pauseIcon) pauseIcon.style.display = 'block';
        }
    }
    
    addToQueue(track) {
        this.queue.push(track);
        this.saveData();
        this.showNotification('Added to queue', track.title);
    }
    
    toggleLike(track) {
        const index = this.likedSongs.findIndex(s => s.id === track.id);
        if (index >= 0) {
            this.likedSongs.splice(index, 1);
        } else {
            this.likedSongs.push(track);
        }
        this.saveData();
        this.updateTrackCard(track.id);
    }
    
    addToHistory(track) {
        // Add to history (keep last 100)
        this.listeningHistory.unshift({
            ...track,
            playedAt: new Date().toISOString()
        });
        this.listeningHistory = this.listeningHistory.slice(0, 100);
        this.saveData();
    }
    
    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }
    
    handlePlayerStateChange(event) {
        if (event.state === YT.PlayerState.ENDED) {
            this.handleTrackEnd();
        }
    }
    
    handleTimeUpdate(data) {
        this.updateProgressBar(data.currentTime, data.duration);
    }
    
    handleTrackEnd() {
        if (this.repeat === 'one') {
            // Repeat current track
            if (this.currentTrack && typeof audioEngine !== 'undefined') {
                audioEngine.play(this.currentTrack.id);
            }
        } else if (this.repeat === 'all' && this.queue.length > 0) {
            // Repeat queue
            this.nextTrack();
        } else {
            // Play next
            this.nextTrack();
        }
    }
    
    nextTrack() {
        if (this.queue.length === 0) return;
        
        if (this.shuffle) {
            this.currentQueueIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentQueueIndex = (this.currentQueueIndex + 1) % this.queue.length;
        }
        
        const track = this.queue[this.currentQueueIndex];
        if (track) {
            this.playTrack(track);
        }
    }
    
    previousTrack() {
        if (this.queue.length === 0) return;
        
        if (this.shuffle) {
            this.currentQueueIndex = Math.floor(Math.random() * this.queue.length);
        } else {
            this.currentQueueIndex = (this.currentQueueIndex - 1 + this.queue.length) % this.queue.length;
        }
        
        const track = this.queue[this.currentQueueIndex];
        if (track) {
            this.playTrack(track);
        }
    }
    
    updatePlayerUI() {
        if (!this.currentTrack) return;
        
        const player = document.querySelector('.music-player-bar');
        if (!player) return;
        
        const titleEl = player.querySelector('.player-track-title');
        const artistEl = player.querySelector('.player-track-artist');
        const thumbnailEl = player.querySelector('.player-thumbnail img');
        
        if (titleEl) titleEl.textContent = this.currentTrack.title;
        if (artistEl) artistEl.textContent = this.currentTrack.artist;
        if (thumbnailEl) thumbnailEl.src = this.currentTrack.thumbnail;
    }
    
    updateProgressBar(currentTime, duration) {
        const progressBar = document.querySelector('.player-progress-bar');
        const currentTimeEl = document.querySelector('.player-time-current');
        const totalTimeEl = document.querySelector('.player-time-total');
        
        if (progressBar) {
            const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
            progressBar.value = progress;
            progressBar.style.setProperty('--progress', `${progress}%`);
        }
        
        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatDuration(currentTime);
        }
        
        if (totalTimeEl) {
            totalTimeEl.textContent = this.formatDuration(duration);
        }
    }
    
    updateTaskbarInfo() {
        if (typeof windowManager !== 'undefined' && this.currentTrack) {
            // Update taskbar with current track info
            const taskbarIcon = document.querySelector('.taskbar-icon[data-app="music-player"]');
            if (taskbarIcon) {
                taskbarIcon.title = `Music: ${this.currentTrack.title} - ${this.currentTrack.artist}`;
            }
        }
    }
    
    updateTrackCard(trackId) {
        const card = document.querySelector(`[data-track-id="${trackId}"]`);
        if (!card) return;
        
        const isLiked = this.likedSongs.some(s => s.id === trackId);
        const likeBtn = card.querySelector('.track-like-btn');
        if (likeBtn) {
            likeBtn.classList.toggle('liked', isLiked);
        }
    }
    
    showNotification(title, message) {
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.info(title, message);
        }
    }
    
    setupEventListeners() {
        // Player controls
        document.querySelector('.player-play-btn')?.addEventListener('click', () => {
            this.togglePlayPause();
        });
        
        document.querySelector('.player-next-btn')?.addEventListener('click', () => {
            this.nextTrack();
        });
        
        document.querySelector('.player-prev-btn')?.addEventListener('click', () => {
            this.previousTrack();
        });
        
        document.querySelector('.player-shuffle-btn')?.addEventListener('click', () => {
            this.toggleShuffle();
        });
        
        document.querySelector('.player-repeat-btn')?.addEventListener('click', () => {
            this.toggleRepeat();
        });
        
        // Progress bar
        const progressBar = document.querySelector('.player-progress-bar');
        if (progressBar) {
            progressBar.addEventListener('input', (e) => {
                const progress = parseFloat(e.target.value);
                const duration = audioEngine.getDuration();
                if (duration > 0) {
                    audioEngine.seekTo((progress / 100) * duration);
                }
            });
        }
        
        // Volume control
        const volumeBar = document.querySelector('.player-volume-bar');
        if (volumeBar) {
            volumeBar.addEventListener('input', (e) => {
                audioEngine.setVolume(parseFloat(e.target.value));
            });
        }
        
        // Search
        const searchInput = document.querySelector('.music-search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                const query = e.target.value.trim();
                if (query.length >= 2) {
                    searchTimeout = setTimeout(() => {
                        this.performSearch(query);
                    }, 500);
                }
            });
        }
        
        // Language tabs
        document.querySelectorAll('.language-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const language = tab.dataset.language;
                this.switchLanguage(language);
            });
        });
    }
    
    togglePlayPause() {
        if (!this.currentTrack) return;
        
        if (typeof audioEngine !== 'undefined') {
            if (audioEngine.isPlaying) {
                audioEngine.pause();
                const playBtn = document.querySelector('.player-play-btn');
                if (playBtn) {
                    const playIcon = playBtn.querySelector('.play-icon');
                    const pauseIcon = playBtn.querySelector('.pause-icon');
                    if (playIcon) playIcon.style.display = 'block';
                    if (pauseIcon) pauseIcon.style.display = 'none';
                }
            } else {
                audioEngine.resume();
                const playBtn = document.querySelector('.player-play-btn');
                if (playBtn) {
                    const playIcon = playBtn.querySelector('.play-icon');
                    const pauseIcon = playBtn.querySelector('.pause-icon');
                    if (playIcon) playIcon.style.display = 'none';
                    if (pauseIcon) pauseIcon.style.display = 'block';
                }
            }
        }
    }
    
    toggleShuffle() {
        this.shuffle = !this.shuffle;
        this.saveData();
        const btn = document.querySelector('.player-shuffle-btn');
        if (btn) {
            btn.classList.toggle('active', this.shuffle);
        }
    }
    
    toggleRepeat() {
        const modes = ['off', 'all', 'one'];
        const currentIndex = modes.indexOf(this.repeat);
        this.repeat = modes[(currentIndex + 1) % modes.length];
        this.saveData();
        
        const btn = document.querySelector('.player-repeat-btn');
        if (btn) {
            btn.classList.toggle('active', this.repeat !== 'off');
            btn.dataset.mode = this.repeat;
        }
    }
    
    async performSearch(query) {
        const results = await this.searchYouTube(query, 20);
        this.renderSearchResults(results);
        
        // Save to recent searches
        if (!this.recentSearches.includes(query)) {
            this.recentSearches.unshift(query);
            this.recentSearches = this.recentSearches.slice(0, 10);
            this.saveData();
        }
    }
    
    renderSearchResults(results) {
        const container = document.querySelector('.search-results');
        if (!container) return;
        
        container.innerHTML = results.map(track => this.renderTrackCard(track)).join('');
        this.attachTrackListeners(container);
    }
    
    async switchLanguage(language) {
        this.currentLanguage = language;
        this.saveData();
        
        // Update active tab
        document.querySelectorAll('.language-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.language === language);
        });
        
        // Load language-specific content
        if (language === 'all') {
            this.loadDiscoveryContent();
        } else {
            const songs = await this.getMusicByLanguage(language, 20);
            this.renderSection('language', songs);
        }
    }
    
    renderPlaylists() {
        const container = document.querySelector('.playlists-section .playlist-grid');
        if (!container) return;
        
        if (this.playlists.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <p>No playlists yet. Create one to get started!</p>
                </div>
            `;
            return;
        }
        
        container.innerHTML = this.playlists.map(playlist => `
            <div class="playlist-card" data-playlist-id="${playlist.id}">
                <div class="playlist-thumbnail">
                    ${playlist.tracks.length > 0 ? 
                        `<img src="${playlist.tracks[0].thumbnail}" alt="${this.escapeHtml(playlist.name)}">` :
                        '<div class="playlist-placeholder">🎵</div>'
                    }
                </div>
                <div class="playlist-info">
                    <div class="playlist-name">${this.escapeHtml(playlist.name)}</div>
                    <div class="playlist-count">${playlist.tracks.length} tracks</div>
                </div>
            </div>
        `).join('');
        
        // Re-attach event listeners
        container.querySelectorAll('.playlist-card').forEach(card => {
            card.addEventListener('click', () => {
                const playlistId = card.dataset.playlistId;
                const playlist = this.playlists.find(p => p.id === playlistId);
                if (playlist && playlist.tracks.length > 0) {
                    this.playTrack(playlist.tracks[0]);
                    playlist.tracks.slice(1).forEach(track => {
                        this.addToQueue(track);
                    });
                }
            });
        });
    }
    
    renderRecentlyPlayed() {
        if (this.listeningHistory.length === 0) return;
        
        const section = document.querySelector('[data-section="recent"]');
        if (!section) return;
        
        const trackList = section.querySelector('.track-list');
        if (!trackList) return;
        
        const recentTracks = this.listeningHistory.slice(0, 20);
        trackList.innerHTML = recentTracks.map(track => this.renderTrackCard(track)).join('');
        this.attachTrackListeners(trackList);
    }
    
    renderLikedSongs() {
        if (this.likedSongs.length === 0) return;
        
        const section = document.querySelector('[data-section="liked"]');
        if (!section) return;
        
        const trackList = section.querySelector('.track-list');
        if (!trackList) return;
        
        trackList.innerHTML = this.likedSongs.slice(0, 20).map(track => this.renderTrackCard(track)).join('');
        this.attachTrackListeners(trackList);
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Playlist Management
    createPlaylist(name, tracks = []) {
        const playlist = {
            id: 'playlist_' + Date.now(),
            name: name,
            tracks: tracks,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        this.playlists.push(playlist);
        this.saveData();
        this.renderPlaylists();
        return playlist;
    }
    
    addToPlaylist(playlistId, track) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (playlist) {
            if (!playlist.tracks.find(t => t.id === track.id)) {
                playlist.tracks.push(track);
                playlist.updatedAt = new Date().toISOString();
                this.saveData();
                this.renderPlaylists();
            }
        }
    }
    
    removeFromPlaylist(playlistId, trackId) {
        const playlist = this.playlists.find(p => p.id === playlistId);
        if (playlist) {
            playlist.tracks = playlist.tracks.filter(t => t.id !== trackId);
            playlist.updatedAt = new Date().toISOString();
            this.saveData();
            this.renderPlaylists();
        }
    }
    
    deletePlaylist(playlistId) {
        this.playlists = this.playlists.filter(p => p.id !== playlistId);
        this.saveData();
        this.renderPlaylists();
    }
    
    // AI Recommendations
    async getAIRecommendations() {
        if (typeof aiSystem === 'undefined') {
            return this.getFallbackRecommendations();
        }
        
        try {
            // Analyze listening history
            const recentGenres = this.analyzeListeningHistory();
            const mood = this.detectMood();
            const timeOfDay = this.getTimeOfDay();
            
            // Get OS mode if available
            let osMode = 'normal';
            if (typeof modeManager !== 'undefined') {
                osMode = modeManager.getMode() || 'normal';
            }
            
            // Build recommendation query
            let query = 'latest songs';
            if (recentGenres.length > 0) {
                query = recentGenres[0] + ' songs';
            }
            
            // Adjust for mood and mode
            if (osMode === 'focus' || mood === 'calm') {
                query += ' instrumental calm';
            } else if (osMode === 'chill' || mood === 'relaxed') {
                query += ' chill relaxing';
            } else if (mood === 'energetic') {
                query += ' upbeat energetic';
            }
            
            // Time-based adjustments
            if (timeOfDay === 'morning') {
                query += ' morning motivation';
            } else if (timeOfDay === 'night') {
                query += ' night calm';
            }
            
            const recommendations = await this.searchYouTube(query, 15);
            return recommendations;
        } catch (error) {
            console.error('AI recommendations error:', error);
            return this.getFallbackRecommendations();
        }
    }
    
    analyzeListeningHistory() {
        if (this.listeningHistory.length === 0) return [];
        
        // Simple genre detection based on titles
        const genres = [];
        this.listeningHistory.slice(0, 10).forEach(track => {
            const title = track.title.toLowerCase();
            if (title.includes('tamil')) genres.push('tamil');
            if (title.includes('hindi')) genres.push('hindi');
            if (title.includes('telugu')) genres.push('telugu');
            if (title.includes('english')) genres.push('english');
        });
        
        return [...new Set(genres)];
    }
    
    detectMood() {
        // Simple mood detection based on recent activity
        if (this.listeningHistory.length === 0) return 'neutral';
        
        // Could be enhanced with actual audio analysis
        return 'neutral';
    }
    
    getTimeOfDay() {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return 'morning';
        if (hour >= 12 && hour < 17) return 'afternoon';
        if (hour >= 17 && hour < 21) return 'evening';
        return 'night';
    }
    
    async getFallbackRecommendations() {
        // Fallback to trending if AI is not available
        return await this.getTrendingMusic('IN', 15);
    }
    
    async loadAIRecommendations() {
        const recommendations = await this.getAIRecommendations();
        this.sections.aiRecommendations = recommendations;
        this.renderSection('ai-recommendations', recommendations);
    }
    
    // Auto-generate playlists
    async generatePlaylist(type) {
        let query = '';
        const playlists = {
            'workout': 'workout gym exercise energetic',
            'focus': 'focus study concentration instrumental',
            'chill': 'chill relaxing calm ambient',
            'night': 'night calm sleep peaceful',
            'coding': 'coding programming focus lofi'
        };
        
        query = playlists[type] || 'latest songs';
        const tracks = await this.searchYouTube(query, 20);
        
        if (tracks.length > 0) {
            const playlist = this.createPlaylist(type.charAt(0).toUpperCase() + type.slice(1), tracks);
            this.showNotification('Playlist Created', `${playlist.name} playlist created with ${tracks.length} tracks`);
            return playlist;
        }
    }
    
    // OS Integration
    notifyOS(track) {
        // Notify parent window if in iframe
        if (window.parent !== window) {
            window.parent.postMessage({
                type: 'music-track-change',
                track: track
            }, '*');
        }
        
        // Update taskbar
        this.updateTaskbarInfo();
        
        // Show notification
        if (typeof notificationSystem !== 'undefined') {
            notificationSystem.info('Now Playing', `${track.title} - ${track.artist}`);
        }
    }
    
    // Global Commands Support
    handleCommand(command) {
        const lowerCommand = command.toLowerCase();
        
        if (lowerCommand.includes('play') && lowerCommand.includes('tamil')) {
            this.switchLanguage('tamil');
            return true;
        }
        
        if (lowerCommand.includes('play') && lowerCommand.includes('hindi')) {
            this.switchLanguage('hindi');
            return true;
        }
        
        if (lowerCommand.includes('play') && lowerCommand.includes('focus')) {
            this.generatePlaylist('focus').then(playlist => {
                if (playlist && playlist.tracks.length > 0) {
                    this.playTrack(playlist.tracks[0]);
                }
            });
            return true;
        }
        
        if (lowerCommand.includes('play') && lowerCommand.includes('chill')) {
            this.generatePlaylist('chill').then(playlist => {
                if (playlist && playlist.tracks.length > 0) {
                    this.playTrack(playlist.tracks[0]);
                }
            });
            return true;
        }
        
        return false;
    }
}

// Initialize when DOM is ready
let musicSystem;
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        musicSystem = new MusicSystem();
        
        // Load AI recommendations after a delay
        setTimeout(() => {
            if (musicSystem) {
                musicSystem.loadAIRecommendations();
            }
        }, 2000);
    });
} else {
    musicSystem = new MusicSystem();
    
    // Load AI recommendations after a delay
    setTimeout(() => {
        if (musicSystem) {
            musicSystem.loadAIRecommendations();
        }
    }, 2000);
}

// Expose for global commands
if (typeof window !== 'undefined') {
    window.musicSystem = musicSystem;
}
