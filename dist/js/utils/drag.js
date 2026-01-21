// Drag and Drop Utility
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
        this.resizeHandle = null;
    }

    initDrag(element, handle) {
        if (!element || !handle) return;

        handle.addEventListener('mousedown', (e) => {
            if (e.button !== 0) return; // Only left mouse button
            e.preventDefault();
            e.stopPropagation();

            this.isDragging = true;
            this.currentElement = element;
            this.startX = e.clientX;
            this.startY = e.clientY;

            const rect = element.getBoundingClientRect();
            this.startLeft = rect.left;
            this.startTop = rect.top;

            document.addEventListener('mousemove', this.handleDrag);
            document.addEventListener('mouseup', this.stopDrag);

            element.style.transition = 'none';
            element.classList.add('dragging');
        });
    }

    initResize(element, handles) {
        if (!element || !handles) return;

        handles.forEach(handle => {
            handle.addEventListener('mousedown', (e) => {
                if (e.button !== 0) return;
                e.preventDefault();
                e.stopPropagation();

                this.isResizing = true;
                this.currentElement = element;
                const handleClasses = handle.className.split(' ');
                this.resizeHandle = handleClasses.find(cls => cls.includes('nw') || cls.includes('ne') || cls.includes('sw') || cls.includes('se') || cls.includes('n') || cls.includes('s') || cls.includes('e') || cls.includes('w')) || '';
                this.startX = e.clientX;
                this.startY = e.clientY;

                const rect = element.getBoundingClientRect();
                this.startLeft = rect.left;
                this.startTop = rect.top;
                this.startWidth = rect.width;
                this.startHeight = rect.height;

                document.addEventListener('mousemove', this.handleResize);
                document.addEventListener('mouseup', this.stopResize);

                element.style.transition = 'none';
            });
        });
    }

    handleDrag = (e) => {
        if (!this.isDragging || !this.currentElement) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        let newLeft = this.startLeft + deltaX;
        let newTop = this.startTop + deltaY;

        // Keep window within viewport
        const maxLeft = window.innerWidth - this.currentElement.offsetWidth;
        const maxTop = window.innerHeight - this.currentElement.offsetHeight - 48; // Taskbar height

        newLeft = Math.max(0, Math.min(newLeft, maxLeft));
        newTop = Math.max(0, Math.min(newTop, maxTop));

        this.currentElement.style.left = newLeft + 'px';
        this.currentElement.style.top = newTop + 'px';
    };

    handleResize = (e) => {
        if (!this.isResizing || !this.currentElement) return;

        const deltaX = e.clientX - this.startX;
        const deltaY = e.clientY - this.startY;

        let newWidth = this.startWidth;
        let newHeight = this.startHeight;
        let newLeft = this.startLeft;
        let newTop = this.startTop;

        const handle = this.resizeHandle;

        if (handle.includes('e')) {
            newWidth = this.startWidth + deltaX;
        }
        if (handle.includes('w')) {
            newWidth = this.startWidth - deltaX;
            newLeft = this.startLeft + deltaX;
        }
        if (handle.includes('s')) {
            newHeight = this.startHeight + deltaY;
        }
        if (handle.includes('n')) {
            newHeight = this.startHeight - deltaY;
            newTop = this.startTop + deltaY;
        }

        // Minimum size constraints
        const minWidth = 300;
        const minHeight = 200;

        if (newWidth < minWidth) {
            if (handle.includes('w')) {
                newLeft += (newWidth - minWidth);
            }
            newWidth = minWidth;
        }

        if (newHeight < minHeight) {
            if (handle.includes('n')) {
                newTop += (newHeight - minHeight);
            }
            newHeight = minHeight;
        }

        // Maximum size constraints (viewport bounds)
        const maxWidth = window.innerWidth - newLeft;
        const maxHeight = window.innerHeight - newTop - 48;

        newWidth = Math.min(newWidth, maxWidth);
        newHeight = Math.min(newHeight, maxHeight);

        this.currentElement.style.width = newWidth + 'px';
        this.currentElement.style.height = newHeight + 'px';
        this.currentElement.style.left = newLeft + 'px';
        this.currentElement.style.top = newTop + 'px';
    };

    stopDrag = () => {
        if (this.isDragging && this.currentElement) {
            this.currentElement.style.transition = '';
            this.currentElement.classList.remove('dragging');
            
            // Save window position if it's a window
            if (this.currentElement.classList.contains('window') && typeof windowManager !== 'undefined') {
                windowManager.saveWindowPosition(this.currentElement);
            }
        }
        this.isDragging = false;
        this.currentElement = null;
        document.removeEventListener('mousemove', this.handleDrag);
        document.removeEventListener('mouseup', this.stopDrag);
    };

    stopResize = () => {
        if (this.isResizing && this.currentElement) {
            this.currentElement.style.transition = '';
            
            // Save window position if it's a window
            if (this.currentElement.classList.contains('window') && typeof windowManager !== 'undefined') {
                windowManager.saveWindowPosition(this.currentElement);
            }
        }
        this.isResizing = false;
        this.currentElement = null;
        this.resizeHandle = null;
        document.removeEventListener('mousemove', this.handleResize);
        document.removeEventListener('mouseup', this.stopResize);
    };
}

const dragManager = new DragManager();

