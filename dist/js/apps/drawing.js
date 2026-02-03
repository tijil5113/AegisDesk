// Drawing App - Canvas drawing application
class DrawingApp {
    constructor() {
        this.windowId = 'drawing';
        this.isDrawing = false;
        this.currentColor = '#6366f1';
        this.currentSize = 5;
        this.tool = 'pen';
    }

    open() {
        const content = this.render();
        const window = windowManager.createWindow(this.windowId, {
            title: 'Drawing',
            width: 900,
            height: 700,
            class: 'app-drawing',
            icon: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
            </svg>`,
            content: content
        });

        this.attachEvents(window);
        this.initCanvas(window);
    }

    render() {
        return `
            <div class="drawing-container">
                <div class="drawing-toolbar">
                    <div class="drawing-tools">
                        <button class="drawing-tool-btn active" data-tool="pen" title="Pen">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 19l7-7 3 3-7 7-3-3z"></path>
                                <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"></path>
                                <path d="M2 2l7.586 7.586"></path>
                                <circle cx="11" cy="11" r="2"></circle>
                            </svg>
                        </button>
                        <button class="drawing-tool-btn" data-tool="eraser" title="Eraser">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                            </svg>
                        </button>
                        <button class="drawing-tool-btn" data-tool="fill" title="Fill">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M12 2.69l5.66 5.66a8 8 0 11-11.31 0z"></path>
                            </svg>
                        </button>
                    </div>
                    <div class="drawing-colors">
                        <input type="color" id="color-picker" value="${this.currentColor}" class="drawing-color-picker">
                        <div class="drawing-color-palette">
                            ${['#6366f1', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#000000', '#ffffff'].map(color => `
                                <button class="drawing-color-btn ${color === this.currentColor ? 'active' : ''}" 
                                        data-color="${color}" 
                                        style="background: ${color}; border: 1px solid ${color === '#ffffff' ? '#ccc' : 'transparent'}"></button>
                            `).join('')}
                        </div>
                    </div>
                    <div class="drawing-size">
                        <label>Size:</label>
                        <input type="range" id="size-slider" min="1" max="50" value="${this.currentSize}">
                        <span id="size-value">${this.currentSize}</span>
                    </div>
                    <div class="drawing-actions">
                        <button class="drawing-btn" id="clear-btn">Clear</button>
                        <button class="drawing-btn" id="save-btn">Save</button>
                    </div>
                </div>
                <div class="drawing-canvas-container">
                    <canvas id="drawing-canvas" width="800" height="600"></canvas>
                </div>
            </div>
        `;
    }

    initCanvas(window) {
        const canvas = window.querySelector('#drawing-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Resize canvas to fit container
        const container = window.querySelector('.drawing-canvas-container');
        if (container) {
            const resizeCanvas = () => {
                const rect = container.getBoundingClientRect();
                canvas.style.width = rect.width + 'px';
                canvas.style.height = rect.height + 'px';
            };
            resizeCanvas();
            window.addEventListener('resize', resizeCanvas);
        }
    }

    attachEvents(window) {
        const canvas = window.querySelector('#drawing-canvas');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const toolButtons = window.querySelectorAll('.drawing-tool-btn');
        const colorButtons = window.querySelectorAll('.drawing-color-btn');
        const colorPicker = window.querySelector('#color-picker');
        const sizeSlider = window.querySelector('#size-slider');
        const sizeValue = window.querySelector('#size-value');
        const clearBtn = window.querySelector('#clear-btn');
        const saveBtn = window.querySelector('#save-btn');

        // Tool selection
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.tool = btn.dataset.tool;
            });
        });

        // Color selection
        colorButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                colorButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentColor = btn.dataset.color;
                if (colorPicker) colorPicker.value = this.currentColor;
            });
        });

        if (colorPicker) {
            colorPicker.addEventListener('change', (e) => {
                this.currentColor = e.target.value;
                colorButtons.forEach(b => {
                    if (b.dataset.color === this.currentColor) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            });
        }

        if (sizeSlider) {
            sizeSlider.addEventListener('input', (e) => {
                this.currentSize = parseInt(e.target.value);
                if (sizeValue) sizeValue.textContent = this.currentSize;
            });
        }

        // Canvas drawing
        const startDrawing = (e) => {
            this.isDrawing = true;
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;
            
            ctx.beginPath();
            ctx.moveTo(x, y);
        };

        const draw = (e) => {
            if (!this.isDrawing) return;

            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const x = (e.clientX - rect.left) * scaleX;
            const y = (e.clientY - rect.top) * scaleY;

            ctx.lineWidth = this.currentSize;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';

            if (this.tool === 'pen') {
                ctx.globalCompositeOperation = 'source-over';
                ctx.strokeStyle = this.currentColor;
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);
            } else if (this.tool === 'eraser') {
                ctx.globalCompositeOperation = 'destination-out';
                ctx.lineTo(x, y);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(x, y);
            }
        };

        const stopDrawing = () => {
            if (this.isDrawing) {
                ctx.beginPath();
                this.isDrawing = false;
            }
        };

        canvas.addEventListener('mousedown', startDrawing);
        canvas.addEventListener('mousemove', draw);
        canvas.addEventListener('mouseup', stopDrawing);
        canvas.addEventListener('mouseout', stopDrawing);

        // Touch support
        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousedown', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent('mousemove', {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            canvas.dispatchEvent(mouseEvent);
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent('mouseup', {});
            canvas.dispatchEvent(mouseEvent);
        });

        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Clear the entire canvas?')) {
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                const dataURL = canvas.toDataURL('image/png');
                const a = document.createElement('a');
                a.href = dataURL;
                a.download = `drawing-${Date.now()}.png`;
                a.click();
            });
        }
    }
}

const drawingApp = new DrawingApp();
