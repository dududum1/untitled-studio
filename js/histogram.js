/**
 * UNTITLED STUDIO - HISTOGRAM
 * Real-time RGB/Luminance histogram display
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Uses requestAnimationFrame wrapper for 120Hz displays
 * - Samples every Nth pixel for WebGL canvas reads
 * - Offscreen processing with typed arrays
 */

class Histogram {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;

        // Histogram data (256 bins for each channel)
        this.data = {
            r: new Uint32Array(256),
            g: new Uint32Array(256),
            b: new Uint32Array(256),
            l: new Uint32Array(256)
        };

        // Display settings
        this.showRGB = true;
        this.showLuminance = true;

        // RAF-based throttling (ensures max 1 update per frame)
        this.rafId = null;
        this.pendingSource = null;
        this.isProcessing = false;

        // Reusable pixel buffer (avoid allocation per frame)
        this.pixelBuffer = null;
        this.pixelBufferSize = 0;
    }

    /**
     * Schedule histogram calculation with RAF throttling
     * Ensures we never update more than once per frame (120Hz safe)
     */
    calculate(sourceCanvas) {
        this.pendingSource = sourceCanvas;

        // Only schedule if not already pending
        if (this.rafId === null) {
            this.rafId = requestAnimationFrame(() => {
                this.rafId = null;
                if (this.pendingSource) {
                    this._processFrame(this.pendingSource);
                    this.pendingSource = null;
                }
            });
        }
    }

    /**
     * Internal: Process a single frame
     */
    _processFrame(sourceCanvas) {
        if (this.isProcessing) return;
        this.isProcessing = true;

        // For WebGL canvas, use readPixels approach
        const gl = sourceCanvas.getContext('webgl2');
        if (gl) {
            this.calculateFromWebGL(sourceCanvas, gl);
        } else {
            const ctx = sourceCanvas.getContext('2d', { willReadFrequently: true });
            if (ctx) {
                const imageData = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
                this.processPixelData(imageData.data);
            }
        }

        this.isProcessing = false;
    }

    /**
     * Calculate histogram from WebGL canvas with optimized sampling
     */
    calculateFromBuffer(pixels) {
        if (!pixels) return;
        this.processPixelData(pixels);
        this.draw();
    }

    calculateFromWebGL(glCanvas, gl) {
        const width = glCanvas.width;
        const height = glCanvas.height;

        // Mobile Optimization: Increase skip rate for faster readPixels
        const isMobile = window.innerWidth < 800;
        const sampleRate = isMobile ? 8 : 4;

        const sampledWidth = Math.floor(width / sampleRate);
        const sampledHeight = Math.floor(height / sampleRate);
        const requiredSize = sampledWidth * sampledHeight * 4;

        // Reuse buffer if possible (avoid GC churn)
        if (this.pixelBufferSize < requiredSize) {
            this.pixelBuffer = new Uint8Array(requiredSize);
            this.pixelBufferSize = requiredSize;
        }

        gl.readPixels(0, 0, sampledWidth, sampledHeight, gl.RGBA, gl.UNSIGNED_BYTE, this.pixelBuffer);
        this.processPixelData(this.pixelBuffer, sampledWidth * sampledHeight * 4);
    }

    /**
     * Process raw pixel data into histogram bins
     * Optimized with loop unrolling hints
     */
    processPixelData(pixels, length = pixels.length) {
        // Reset bins using fill (faster than loop)
        this.data.r.fill(0);
        this.data.g.fill(0);
        this.data.b.fill(0);
        this.data.l.fill(0);

        // Cache data references for tighter inner loop
        const dataR = this.data.r;
        const dataG = this.data.g;
        const dataB = this.data.b;
        const dataL = this.data.l;

        // Process 4 pixels at a time for better cache utilization
        for (let i = 0; i < length; i += 16) {
            // Pixel 1
            let r = pixels[i];
            let g = pixels[i + 1];
            let b = pixels[i + 2];
            dataR[r]++;
            dataG[g]++;
            dataB[b]++;
            dataL[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]++;

            // Pixel 2
            if (i + 4 < length) {
                r = pixels[i + 4];
                g = pixels[i + 5];
                b = pixels[i + 6];
                dataR[r]++;
                dataG[g]++;
                dataB[b]++;
                dataL[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]++;
            }

            // Pixel 3
            if (i + 8 < length) {
                r = pixels[i + 8];
                g = pixels[i + 9];
                b = pixels[i + 10];
                dataR[r]++;
                dataG[g]++;
                dataB[b]++;
                dataL[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]++;
            }

            // Pixel 4
            if (i + 12 < length) {
                r = pixels[i + 12];
                g = pixels[i + 13];
                b = pixels[i + 14];
                dataR[r]++;
                dataG[g]++;
                dataB[b]++;
                dataL[Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b)]++;
            }
        }

        this.draw();
    }

    /**
     * Draw histogram to canvas
     */
    draw() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(18, 18, 18, 0.8)';
        ctx.fillRect(0, 0, w, h);

        // Find max value for normalization
        let maxVal = 1;
        for (let i = 0; i < 256; i++) {
            if (this.showRGB) {
                maxVal = Math.max(maxVal, this.data.r[i], this.data.g[i], this.data.b[i]);
            }
            if (this.showLuminance) {
                maxVal = Math.max(maxVal, this.data.l[i]);
            }
        }

        const barWidth = w / 256;

        // Draw luminance (behind)
        if (this.showLuminance) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.beginPath();
            ctx.moveTo(0, h);

            for (let i = 0; i < 256; i++) {
                const barHeight = (this.data.l[i] / maxVal) * h;
                ctx.lineTo(i * barWidth, h - barHeight);
            }

            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();
        }

        // Draw RGB channels with blend mode
        if (this.showRGB) {
            ctx.globalCompositeOperation = 'screen';

            // Red channel
            ctx.fillStyle = 'rgba(237, 39, 136, 0.6)';
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let i = 0; i < 256; i++) {
                const barHeight = (this.data.r[i] / maxVal) * h;
                ctx.lineTo(i * barWidth, h - barHeight);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();

            // Green channel
            ctx.fillStyle = 'rgba(74, 222, 128, 0.6)';
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let i = 0; i < 256; i++) {
                const barHeight = (this.data.g[i] / maxVal) * h;
                ctx.lineTo(i * barWidth, h - barHeight);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();

            // Blue channel
            ctx.fillStyle = 'rgba(60, 162, 200, 0.6)';
            ctx.beginPath();
            ctx.moveTo(0, h);
            for (let i = 0; i < 256; i++) {
                const barHeight = (this.data.b[i] / maxVal) * h;
                ctx.lineTo(i * barWidth, h - barHeight);
            }
            ctx.lineTo(w, h);
            ctx.closePath();
            ctx.fill();

            ctx.globalCompositeOperation = 'source-over';
        }

        // Border
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 1;
        ctx.strokeRect(0, 0, w, h);
    }

    /**
     * Toggle RGB display
     */
    toggleRGB() {
        this.showRGB = !this.showRGB;
        this.draw();
    }

    /**
     * Toggle luminance display
     */
    toggleLuminance() {
        this.showLuminance = !this.showLuminance;
        this.draw();
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.rafId !== null) {
            cancelAnimationFrame(this.rafId);
            this.rafId = null;
        }
        this.pixelBuffer = null;
        this.pendingSource = null;
    }

    /**
     * Get histogram statistics for Auto-Enhance
     */
    getStats() {
        // Calculate min/max/avg for Luminance
        let minL = 0, maxL = 255;
        let sumL = 0, totalPixels = 0;

        // Find min (ignore bottom 0.1% noise)
        let count = 0;
        const threshold = this.width * this.height * 0.001;
        for (let i = 0; i < 256; i++) {
            count += this.data.l[i];
            if (count > threshold) {
                minL = i;
                break;
            }
        }

        // Find max (ignore top 0.1% noise)
        count = 0;
        for (let i = 255; i >= 0; i--) {
            count += this.data.l[i];
            if (count > threshold) {
                maxL = i;
                break;
            }
        }

        // Calculate average
        for (let i = 0; i < 256; i++) {
            sumL += i * this.data.l[i];
            totalPixels += this.data.l[i];
        }
        const avgL = totalPixels ? sumL / totalPixels : 128;

        return { minL, maxL, avgL };
    }

}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Histogram;
}
