// Photo Gallery App
class GalleryApp {
    constructor() {
        this.windowId = 'gallery';
        this.photos = storage.get('galleryPhotos', []);
        this.currentIndex = 0;
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Photo Gallery',
            width: 900,
            height: 700,
            class: 'app-gallery',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                <circle cx="8.5" cy="8.5" r="1.5"></circle>
                <polyline points="21 15 16 10 5 21"></polyline>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
    }

    render() {
        return `
            <div class="gallery-container">
                <div class="gallery-toolbar">
                    <button class="gallery-btn" id="upload-photo">Upload Photo</button>
                    <button class="gallery-btn" id="delete-photo" ${this.photos.length === 0 ? 'disabled' : ''}>Delete</button>
                    <div class="gallery-info">${this.photos.length} photos</div>
                </div>
                <div class="gallery-main">
                    <div class="gallery-sidebar">
                        <div class="gallery-thumbnails" id="gallery-thumbnails">
                            ${this.photos.length > 0 ? this.photos.map((photo, index) => `
                                <div class="gallery-thumbnail ${index === this.currentIndex ? 'active' : ''}" 
                                     data-index="${index}">
                                    <img src="${photo.url}" alt="${photo.name}" />
                                    <div class="thumbnail-overlay">
                                        <span>${this.escapeHtml(photo.name)}</span>
                                    </div>
                                </div>
                            `).join('') : '<div class="gallery-empty">No photos yet. Upload some!</div>'}
                        </div>
                    </div>
                    <div class="gallery-viewer">
                        ${this.photos.length > 0 ? `
                            <div class="gallery-viewer-nav">
                                <button class="gallery-nav-btn" id="prev-photo" ${this.currentIndex === 0 ? 'disabled' : ''}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="15 18 9 12 15 6"></polyline>
                                    </svg>
                                </button>
                                <button class="gallery-nav-btn" id="next-photo" ${this.currentIndex === this.photos.length - 1 ? 'disabled' : ''}>
                                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <polyline points="9 18 15 12 9 6"></polyline>
                                    </svg>
                                </button>
                            </div>
                            <div class="gallery-image-container">
                                <img src="${this.photos[this.currentIndex].url}" 
                                     alt="${this.photos[this.currentIndex].name}" 
                                     class="gallery-image" 
                                     id="gallery-image" />
                                <div class="gallery-image-info">
                                    <h3>${this.escapeHtml(this.photos[this.currentIndex].name)}</h3>
                                    <p>Photo ${this.currentIndex + 1} of ${this.photos.length}</p>
                                </div>
                            </div>
                        ` : `
                            <div class="gallery-empty-viewer">
                                <svg width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                                    <circle cx="8.5" cy="8.5" r="1.5"></circle>
                                    <polyline points="21 15 16 10 5 21"></polyline>
                                </svg>
                                <h2>No Photos</h2>
                                <p>Upload photos to get started</p>
                            </div>
                        `}
                    </div>
                </div>
            </div>
        `;
    }

    attachEvents(window) {
        const uploadBtn = window.querySelector('#upload-photo');
        const deleteBtn = window.querySelector('#delete-photo');
        const prevBtn = window.querySelector('#prev-photo');
        const nextBtn = window.querySelector('#next-photo');
        const thumbnails = window.querySelectorAll('.gallery-thumbnail');

        if (uploadBtn) {
            uploadBtn.addEventListener('click', () => {
                this.uploadPhoto(window);
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                this.deletePhoto(window);
            });
        }

        if (prevBtn) {
            prevBtn.addEventListener('click', () => {
                if (this.currentIndex > 0) {
                    this.currentIndex--;
                    this.refresh(window);
                }
            });
        }

        if (nextBtn) {
            nextBtn.addEventListener('click', () => {
                if (this.currentIndex < this.photos.length - 1) {
                    this.currentIndex++;
                    this.refresh(window);
                }
            });
        }

        thumbnails.forEach(thumb => {
            thumb.addEventListener('click', () => {
                const index = parseInt(thumb.dataset.index);
                this.currentIndex = index;
                this.refresh(window);
            });
        });

        // Keyboard navigation
        window.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft' && this.currentIndex > 0) {
                this.currentIndex--;
                this.refresh(window);
            } else if (e.key === 'ArrowRight' && this.currentIndex < this.photos.length - 1) {
                this.currentIndex++;
                this.refresh(window);
            } else if (e.key === 'Delete') {
                this.deletePhoto(window);
            }
        });
    }

    uploadPhoto(window) {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = true;

        input.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            files.forEach(file => {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const photo = {
                        name: file.name,
                        url: event.target.result,
                        date: new Date().toISOString(),
                        id: Date.now().toString() + Math.random()
                    };
                    this.photos.push(photo);
                    this.currentIndex = this.photos.length - 1;
                    this.save();
                    this.refresh(window);
                };
                reader.readAsDataURL(file);
            });
        });

        input.click();
    }

    deletePhoto(window) {
        if (this.photos.length === 0) return;

        if (confirm(`Delete "${this.photos[this.currentIndex].name}"?`)) {
            this.photos.splice(this.currentIndex, 1);
            if (this.currentIndex >= this.photos.length) {
                this.currentIndex = Math.max(0, this.photos.length - 1);
            }
            this.save();
            this.refresh(window);
        }
    }

    refresh(window) {
        const content = window.querySelector('.window-content');
        content.innerHTML = this.render();
        this.attachEvents(window);
    }

    save() {
        storage.set('galleryPhotos', this.photos);
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

const galleryApp = new GalleryApp();
