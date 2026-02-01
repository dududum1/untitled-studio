
class Vectorscope {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d', { willReadFrequently: true });
        this.width = canvas.width;
        this.height = canvas.height;
        this.cx = this.width / 2;
        this.cy = this.height / 2;
        this.radius = Math.min(this.cx, this.cy) - 2;

        // Performance subsampling
        const isMobile = window.innerWidth < 800;
        this.skip = isMobile ? 8 : 4; // Check every Nth pixel to save CPU

        // Background cache
        this.bgCanvas = document.createElement('canvas');
        this.bgCanvas.width = this.width;
        this.bgCanvas.height = this.height;
        this.drawBackground(this.bgCanvas.getContext('2d'));
    }

    drawBackground(ctx) {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, this.width, this.height);

        // Graticule
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Crosshairs
        ctx.beginPath();
        ctx.moveTo(this.cx - this.radius, this.cy);
        ctx.lineTo(this.cx + this.radius, this.cy);
        ctx.moveTo(this.cx, this.cy - this.radius);
        ctx.lineTo(this.cx, this.cy + this.radius);
        ctx.stroke();

        // Color Targets (Standard Rec.709 targets)
        const targets = [
            { label: 'R', hue: 0 },
            { label: 'Y', hue: 60 },
            { label: 'G', hue: 120 },
            { label: 'C', hue: 180 },
            { label: 'B', hue: 240 },
            { label: 'M', hue: 300 }
        ];

        ctx.font = '10px monospace';
        ctx.fillStyle = '#555';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        targets.forEach(t => {
            const rad = (t.hue - 90) * (Math.PI / 180); // -90 because 0 is Top in standard math? No, 0 is right. Hue 0 is Red. Vectorscope R is usually Top-Left? 
            // Standard Vectorscope: Red is roughly 103 degrees. 
            // Let's stick to standard Hue angles for simplicity first: Red=0 (Right).
            // Actually, let's just make it a Hue wheel.

            const r = this.radius * 0.75;
            const x = this.cx + Math.cos(t.hue * Math.PI / 180) * r;
            const y = this.cy + Math.sin(t.hue * Math.PI / 180) * r; // In canvas Y is down, so +sin is down.

            // Note: Standard hue wheel: Red (0) is Right. Yellow (60) is Down-Right. 
            // In usual vectorscope, Red is around 11 o'clock. 
            // We will plot standard CbCr which correlates to:
            // Cb (Blue difference) X axis, Cr (Red difference) Y axis.

            // Let's draw standard "I" and "Q" lines later if needed. For now just grid.
        });
    }

    update(data, width, height) {
        // Fade out previous frame (trail effect)
        this.ctx.globalCompositeOperation = 'source-over';
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Graticule
        this.ctx.drawImage(this.bgCanvas, 0, 0);

        // Plot points using GPU-accelerated drawing instead of slow pixel manipulation
        this.ctx.globalCompositeOperation = 'lighter';
        this.ctx.fillStyle = 'rgba(74, 222, 128, 0.4)'; // Green Phosphor

        const len = data.length;
        const skip = this.skip * 4;

        for (let i = 0; i < len; i += skip) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to CbCr
            const cb = -0.168736 * r - 0.331264 * g + 0.500000 * b;
            const cr = 0.500000 * r - 0.418688 * g - 0.081312 * b;

            // Map to canvas
            const x = this.cx + cb;
            const y = this.cy - cr;

            // Drawing 1x1 rects is much faster than getImageData/putImageData on mobile
            this.ctx.fillRect(x, y, 1, 1);
        }

        this.ctx.globalCompositeOperation = 'source-over';
    }
}
