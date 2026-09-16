// Drag and Drop Utility — compositor-friendly pointer tracking.
class DragManager {
    constructor() {
        this.isDragging = false;
        this.isResizing = false;
        this.currentElement = null;
        this.startX = 0;
        this.startY = 0;
        this.startLeft = 0;
        this.startTop = 0;
        this.startWidth = 0;
        this.startHeight = 0;
        this.elWidth = 0;
        this.elHeight = 0;
        this.resizeHandle = null;
        this._raf = 0;
        this._pendingX = 0;
        this._pendingY = 0;
        this._onMove = this._onMove.bind(this);
        this._onUp = this._onUp.bind(this);
        this._onResizeMove = this._onResizeMove.bind(this);
        this._onResizeUp = this._onResizeUp.bind(this);
    }

    _bind(el, type, handler) {
        el.addEventListener(type, handler);
    }

    _unbind(el, type, handler) {
        el.removeEventListener(type, handler);
    }

    initDrag(element, handle) {
        if (!element || !handle) return;

        handle.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            if (e.target.closest && e.target.closest('.window-button')) return;
            e.preventDefault();
            e.stopPropagation();

            if (element.classList.contains('maximized') && typeof windowManager !== 'undefined') {
                windowManager.maximizeWindow(element);
                element.classList.remove('aegis-geometry-animating');
                element.style.transition = 'none';
                const restored = element.getBoundingClientRect();
                const left = Math.max(0, Math.min(e.clientX - restored.width / 2, window.innerWidth - restored.width));
                element.style.left = left + 'px';
                element.style.top = '12px';
            }

            this.isDragging = true;
            this.currentElement = element;
            this._pointerId = e.pointerId;
            this._captureEl = handle;
            this.startX = e.clientX;
            this.startY = e.clientY;

            const rect = element.getBoundingClientRect();
            this.startLeft = rect.left;
            this.startTop = rect.top;
            this.elWidth = rect.width;
            this.elHeight = rect.height;
            this._pendingX = e.clientX;
            this._pendingY = e.clientY;

            element.style.transition = 'none';
            element.classList.add('dragging');
            document.body.classList.add('aegis-dragging');
            handle.setPointerCapture?.(e.pointerId);

            this._bind(document, 'pointermove', this._onMove);
            this._bind(document, 'pointerup', this._onUp);
            this._bind(document, 'pointercancel', this._onUp);
        });
    }

    initResize(element, handles) {
        if (!element || !handles) return;

        handles.forEach(handle => {
            handle.addEventListener('pointerdown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();

                this.isResizing = true;
                this.currentElement = element;
                const handleClasses = handle.className.split(' ');
                this.resizeHandle = handleClasses.find(cls =>
                    ['nw', 'ne', 'sw', 'se', 'n', 's', 'e', 'w'].includes(cls)
                ) || '';
                this.startX = e.clientX;
                this.startY = e.clientY;

                const rect = element.getBoundingClientRect();
                this.startLeft = rect.left;
                this.startTop = rect.top;
                this.startWidth = rect.width;
                this.startHeight = rect.height;
                this._pendingX = e.clientX;
                this._pendingY = e.clientY;

                element.style.transition = 'none';
                element.classList.add('resizing');
                document.body.classList.add('aegis-resizing');
                this._pointerId = e.pointerId;
                this._captureEl = handle;
                handle.setPointerCapture?.(e.pointerId);

                this._bind(document, 'pointermove', this._onResizeMove);
                this._bind(document, 'pointerup', this._onResizeUp);
                this._bind(document, 'pointercancel', this._onResizeUp);
            });
        });
    }

    _onMove(e) {
        if (!this.isDragging) return;
        this._pendingX = e.clientX;
        this._pendingY = e.clientY;
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = 0;
            this._applyDrag();
        });
    }

    _applyDrag() {
        if (!this.isDragging || !this.currentElement) return;
        const deltaX = this._pendingX - this.startX;
        const deltaY = this._pendingY - this.startY;
        const maxLeft = window.innerWidth - this.elWidth;
        const maxTop = window.innerHeight - this.elHeight - 56;
        const newLeft = Math.max(0, Math.min(this.startLeft + deltaX, maxLeft));
        const newTop = Math.max(0, Math.min(this.startTop + deltaY, maxTop));
        this.currentElement.style.left = newLeft + 'px';
        this.currentElement.style.top = newTop + 'px';

        if (typeof windowManager !== 'undefined' && this.currentElement.classList.contains('window')) {
            const zone = windowManager.getSnapZone(this._pendingX, this._pendingY);
            windowManager.showSnapPreview(zone);
            this._snapZone = zone;
        }
    }

    _releasePointer() {
        if (this._captureEl && this._pointerId != null) {
            try { this._captureEl.releasePointerCapture?.(this._pointerId); } catch (e) { /* already released */ }
        }
        this._captureEl = null;
        this._pointerId = null;
    }

    _onUp() {
        if (this._raf) {
            cancelAnimationFrame(this._raf);
            this._raf = 0;
        }
        if (this.isDragging && this.currentElement) {
            this._applyDrag();
            this.currentElement.style.transition = '';
            this.currentElement.classList.remove('dragging');
            if (typeof windowManager !== 'undefined' && this.currentElement.classList.contains('window')) {
                windowManager.showSnapPreview(null);
                if (this._snapZone) {
                    windowManager.applySnap(this.currentElement, this._snapZone);
                    this._snapZone = null;
                } else {
                    windowManager.saveWindowPosition(this.currentElement);
                }
            }
        }
        document.body.classList.remove('aegis-dragging');
        this._releasePointer();
        this.isDragging = false;
        this.currentElement = null;
        this._unbind(document, 'pointermove', this._onMove);
        this._unbind(document, 'pointerup', this._onUp);
        this._unbind(document, 'pointercancel', this._onUp);
    }

    _onResizeMove(e) {
        if (!this.isResizing) return;
        this._pendingX = e.clientX;
        this._pendingY = e.clientY;
        if (this._raf) return;
        this._raf = requestAnimationFrame(() => {
            this._raf = 0;
            this._applyResize();
        });
    }

    _applyResize() {
        if (!this.isResizing || !this.currentElement) return;
        const deltaX = this._pendingX - this.startX;
        const deltaY = this._pendingY - this.startY;
        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newLeft = this.startLeft;
        let newTop = this.startTop;
        const handle = this.resizeHandle || '';

        if (handle.includes('e')) newWidth = this.startWidth + deltaX;
        if (handle.includes('w')) {
            newWidth = this.startWidth - deltaX;
            newLeft = this.startLeft + deltaX;
        }
        if (handle.includes('s')) newHeight = this.startHeight + deltaY;
        if (handle.includes('n')) {
            newHeight = this.startHeight - deltaY;
            newTop = this.startTop + deltaY;
        }

        const minWidth = parseInt(this.currentElement.dataset.minWidth, 10) || 300;
        const minHeight = parseInt(this.currentElement.dataset.minHeight, 10) || 200;

        if (newWidth < minWidth) {
            if (handle.includes('w')) newLeft += (newWidth - minWidth);
            newWidth = minWidth;
        }
        if (newHeight < minHeight) {
            if (handle.includes('n')) newTop += (newHeight - minHeight);
            newHeight = minHeight;
        }

        const maxWidth = window.innerWidth - newLeft;
        const maxHeight = window.innerHeight - newTop - 56;
        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);
        newLeft = Math.max(0, newLeft);
        newTop = Math.max(0, newTop);

        this.currentElement.style.width = newWidth + 'px';
        this.currentElement.style.height = newHeight + 'px';
        this.currentElement.style.left = newLeft + 'px';
        this.currentElement.style.top = newTop + 'px';
    }

    _onResizeUp() {
        if (this._raf) {
            cancelAnimationFrame(this._raf);
            this._raf = 0;
        }
        if (this.isResizing && this.currentElement) {
            this._applyResize();
            this.currentElement.style.transition = '';
            this.currentElement.classList.remove('resizing');
            if (this.currentElement.classList.contains('window') && typeof windowManager !== 'undefined') {
                windowManager.saveWindowPosition(this.currentElement);
            }
        }
        document.body.classList.remove('aegis-resizing');
        this._releasePointer();
        this.isResizing = false;
        this.currentElement = null;
        this.resizeHandle = null;
        this._unbind(document, 'pointermove', this._onResizeMove);
        this._unbind(document, 'pointerup', this._onResizeUp);
        this._unbind(document, 'pointercancel', this._onResizeUp);
    }
}

const dragManager = new DragManager();
if (typeof window !== 'undefined') window.dragManager = dragManager;
