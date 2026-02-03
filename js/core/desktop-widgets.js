// Desktop Widgets System
class DesktopWidgets {
    constructor() {
        this.widgets = [];
        this.container = null;
        this.init();
    }

    init() {
        this.createContainer();
        this.createDefaultWidgets();
    }

    createContainer() {
        this.container = document.createElement('div');
        this.container.className = 'desktop-widgets';
        this.container.id = 'desktop-widgets';
        document.querySelector('.desktop-background').appendChild(this.container);
    }

    createDefaultWidgets() {
        // Clock Widget
        this.addWidget({
            id: 'clock',
            title: 'Clock',
            position: { x: 20, y: 20 },
            content: this.createClockWidget()
        });

        // Quick Stats Widget
        this.addWidget({
            id: 'stats',
            title: 'Quick Stats',
            position: { x: 20, y: 200 },
            content: this.createStatsWidget()
        });
    }

    /**
     * PERF: Widget clock updates only cached time/date nodes inside this widget.
     * No desktop or launcher re-render; refs cached to avoid querySelector every tick.
     */
    createClockWidget() {
        const widget = document.createElement('div');
        widget.className = 'widget-clock';
        widget.innerHTML = `
            <div class="widget-clock-time" id="widget-clock-time">00:00:00</div>
            <div class="widget-clock-date" id="widget-clock-date">Monday, January 1, 2024</div>
        `;

        const timeEl = widget.querySelector('.widget-clock-time');
        const dateEl = widget.querySelector('.widget-clock-date');
        const updateClock = () => {
            const now = new Date();
            if (timeEl) {
                timeEl.textContent = now.toLocaleTimeString('en-US', {
                    hour12: false,
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit'
                });
            }
            if (dateEl) {
                dateEl.textContent = now.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                });
            }
        };

        updateClock();
        setInterval(updateClock, 1000);
        return widget;
    }

    createStatsWidget() {
        const widget = document.createElement('div');
        widget.className = 'widget-stats';
        
        // Get stats from storage
        const tasks = storage.get('tasks', []);
        const notes = storage.get('notes', []);
        const completedTasks = tasks.filter(t => t.completed).length;
        
        widget.innerHTML = `
            <div class="widget-stat-item">
                <div class="widget-stat-icon">✅</div>
                <div class="widget-stat-content">
                    <div class="widget-stat-value">${completedTasks}/${tasks.length}</div>
                    <div class="widget-stat-label">Tasks Completed</div>
                </div>
            </div>
            <div class="widget-stat-item">
                <div class="widget-stat-icon">📝</div>
                <div class="widget-stat-content">
                    <div class="widget-stat-value">${notes.length}</div>
                    <div class="widget-stat-label">Notes</div>
                </div>
            </div>
        `;
        
        return widget;
    }

    addWidget(config) {
        const widget = document.createElement('div');
        widget.className = 'desktop-widget';
        widget.dataset.widgetId = config.id;
        widget.style.left = config.position.x + 'px';
        widget.style.top = config.position.y + 'px';
        
        widget.innerHTML = `
            <div class="widget-header">
                <span class="widget-title">${config.title}</span>
                <button class="widget-close">&times;</button>
            </div>
            <div class="widget-content">
                ${config.content.outerHTML || config.content}
            </div>
        `;
        
        this.container.appendChild(widget);
        this.widgets.push({ ...config, element: widget });
        
        // Close button
        widget.querySelector('.widget-close').addEventListener('click', () => {
            this.removeWidget(config.id);
        });
        
        // Make draggable
        this.makeDraggable(widget);
    }

    makeDraggable(widget) {
        const header = widget.querySelector('.widget-header');
        let isDragging = false;
        let startX, startY, startLeft, startTop;
        
        header.addEventListener('mousedown', (e) => {
            isDragging = true;
            startX = e.clientX;
            startY = e.clientY;
            startLeft = parseInt(widget.style.left);
            startTop = parseInt(widget.style.top);
            widget.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - startX;
            const deltaY = e.clientY - startY;
            
            widget.style.left = Math.max(0, Math.min(window.innerWidth - 200, startLeft + deltaX)) + 'px';
            widget.style.top = Math.max(0, Math.min(window.innerHeight - 100, startTop + deltaY)) + 'px';
        });
        
        document.addEventListener('mouseup', () => {
            isDragging = false;
            widget.style.cursor = 'grab';
        });
    }

    removeWidget(id) {
        const widget = this.widgets.find(w => w.id === id);
        if (widget && widget.element) {
            widget.element.remove();
            this.widgets = this.widgets.filter(w => w.id !== id);
        }
    }
}

// Initialize when desktop is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof storage !== 'undefined') {
                const widgetsEnabled = storage.get('desktopWidgets', true);
                if (widgetsEnabled) {
                    new DesktopWidgets();
                }
            }
        }, 2000);
    });
} else {
    setTimeout(() => {
        if (typeof storage !== 'undefined') {
            const widgetsEnabled = storage.get('desktopWidgets', true);
            if (widgetsEnabled) {
                new DesktopWidgets();
            }
        }
    }, 2000);
}
