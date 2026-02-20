/**
 * MaskEditor v1.0
 * Handles painting of grayscale masks for Local Adjustments.
 * 
 * Features:
 * - Offscreen canvas for mask data
 * - Brush tool (Size, Hardness, Flow)
 * - Radial/Linear Gradient generation
 * - Compositing onto WebGL textures
 */

class MaskEditor {
    constructor(width, height) {
        this.width = width;
        this.height = height;

        // The mask data (grayscale)
        this.canvas = document.createElement('canvas');
        this.canvas.width = width;
        this.canvas.height = height;
        this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

        // State
        this.isPainting = false;
        this.brushConfig = {
            size: 100,
            hardness: 0.5,
            flow: 0.5,
            isEraser: false
        };

        this.clearMask();
    }

    resize(w, h) {
        // Simple resize - clears mask for now. 
        // Ideal: Scale existing mask.
        const temp = document.createElement('canvas');
        temp.width = this.width;
        temp.height = this.height;
        temp.getContext('2d').drawImage(this.canvas, 0, 0);

        this.width = w;
        this.height = h;
        this.canvas.width = w;
        this.canvas.height = h;

        this.ctx.drawImage(temp, 0, 0, w, h);
    }

    clearMask() {
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    fillMask() {
        this.ctx.fillStyle = 'white';
        this.ctx.fillRect(0, 0, this.width, this.height);
    }

    invertMask() {
        const imageData = this.ctx.getImageData(0, 0, this.width, this.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            data[i] = 255 - data[i];     // R
            data[i + 1] = 255 - data[i + 1]; // G
            data[i + 2] = 255 - data[i + 2]; // B
        }
        this.ctx.putImageData(imageData, 0, 0);
    }

    // Input coordinates are 0.0 - 1.0 (UV)
    paint(u, v) {
        const x = u * this.width;
        const y = v * this.height;

        const { size, hardness, flow, isEraser } = this.brushConfig;

        // Create gradient brush
        const rad = size / 2;
        const grad = this.ctx.createRadialGradient(x, y, rad * hardness, x, y, rad);

        const alpha = flow;
        const color = isEraser ? `rgba(0,0,0,${alpha})` : `rgba(255,255,255,${alpha})`;
        const fade = isEraser ? `rgba(0,0,0,0)` : `rgba(255,255,255,0)`;

        grad.addColorStop(0, color);
        grad.addColorStop(1, fade);

        this.ctx.globalCompositeOperation = isEraser ? 'source-over' : 'screen'; // Screen for additive white
        if (isEraser) this.ctx.globalCompositeOperation = 'source-over'; // Eraser paints black? 
        // Actually for mask: White = Selected, Black = Not Selected.
        // Painting White = Adding to selection.
        // Painting Black (Eraser) = Removing.

        this.ctx.fillStyle = grad;
        this.ctx.beginPath();
        this.ctx.arc(x, y, rad, 0, Math.PI * 2);
        this.ctx.fill();
    }

    getMaskTexture() {
        return this.canvas;
    }
}
