
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
        this.skip = 4; // Check every 4th pixel to save CPU

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
        // Fade out previous frame
        this.ctx.fillStyle = 'rgba(10, 10, 10, 0.2)'; // Trail effect
        this.ctx.fillRect(0, 0, this.width, this.height);

        // Draw Graticule Overlay if needed or just clear?
        // Let's re-draw grid lightly or just clear. 
        // For "Scope" look, usually we clear black.
        this.ctx.drawImage(this.bgCanvas, 0, 0);

        const imgData = this.ctx.getImageData(0, 0, this.width, this.height);
        const pixels = imgData.data;

        // Plot points
        // data is RGBA Uint8Array
        const len = data.length;
        const skip = this.skip * 4;

        for (let i = 0; i < len; i += skip) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // Convert to CbCr
            // Y  =  0.299R + 0.587G + 0.114B
            // Cb = -0.169R - 0.331G + 0.500B
            // Cr =  0.500R - 0.419G - 0.081B

            const cb = -0.168736 * r - 0.331264 * g + 0.500000 * b;
            const cr = 0.500000 * r - 0.418688 * g - 0.081312 * b;

            // Map to canvas
            // Cb/Cr range is roughly -128 to 128
            const x = this.cx + cb;
            const y = this.cy - cr; // Flip Y because canvas Y is down

            // Draw pixel (Green phosphor look)
            const idx = (Math.floor(x) + Math.floor(y) * this.width) * 4;
            if (idx >= 0 && idx < pixels.length) {
                // Additive blending manually
                pixels[idx] = Math.min(255, pixels[idx] + 0);   // R
                pixels[idx + 1] = Math.min(255, pixels[idx + 1] + 200); // G (Phosphor)
                pixels[idx + 2] = Math.min(255, pixels[idx + 2] + 100); // B
                pixels[idx + 3] = 255; // Alpha
            }
        }

        this.ctx.putImageData(imgData, 0, 0);
    }
}
