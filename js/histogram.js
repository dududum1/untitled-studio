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
        this.mode = 'histogram'; // 'histogram' or 'waveform'
        this.waveformData = null;

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

        if (this.mode === 'waveform') {
            this.processWaveformData(this.pixelBuffer, sampledWidth, sampledHeight);
        } else {
            this.processPixelData(this.pixelBuffer, sampledWidth * sampledHeight * 4);
        }
    }

    /**
     * Process pixel data for Waveform (Oscilloscope) view
     * Intensity vs Horizontal Position
     */
    processWaveformData(pixels, width, height) {
        // Initialize waveform map [x][intensity]
        // Normalize to 128 or 256 columns for display
        const cols = 256;
        if (!this.waveformData || this.waveformData.length !== cols * 256) {
            this.waveformData = new Uint32Array(cols * 256);
        } else {
            this.waveformData.fill(0);
        }

        const data = this.waveformData;
        const xStep = width / cols;

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < cols; x++) {
                const srcX = Math.floor(x * xStep);
                const i = (y * width + srcX) * 4;

                const r = pixels[i];
                const g = pixels[i + 1];
                const b = pixels[i + 2];
                const l = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);

                // Map to 256 vertical bins
                data[x * 256 + l]++;
            }
        }

        this.draw();
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
     * Draw to canvas
     */
    draw() {
        if (this.mode === 'waveform') {
            this.drawWaveform();
        } else {
            this.drawHistogram();
        }
    }

    drawHistogram() {
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

    drawWaveform() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;

        ctx.clearRect(0, 0, w, h);
        ctx.fillStyle = 'rgba(10, 15, 12, 0.9)'; // Darker, techier bg
        ctx.fillRect(0, 0, w, h);

        if (!this.waveformData) return;

        // Draw grid
        ctx.strokeStyle = 'rgba(74, 222, 128, 0.05)';
        ctx.lineWidth = 1;
        for (let i = 0; i <= 4; i++) {
            const y = (i / 4) * h;
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
        }

        const imageData = ctx.createImageData(w, h);
        const pixels = imageData.data;
        const data = this.waveformData;

        // Find max density for normalized brightness
        let maxD = 1;
        for (let i = 0; i < data.length; i++) if (data[i] > maxD) maxD = data[i];

        const xFactor = 256 / w;
        const yFactor = 256 / h;

        for (let x = 0; x < w; x++) {
            const dataX = Math.floor(x * xFactor);
            for (let y = 0; y < h; y++) {
                const intensity = 255 - Math.floor(y * yFactor);
                const density = data[dataX * 256 + intensity];

                if (density > 0) {
                    const idx = (y * w + x) * 4;
                    const b = Math.min(255, (density / maxD) * 512); // Brightness boost
                    pixels[idx] = 74;     // R
                    pixels[idx + 1] = 222; // G
                    pixels[idx + 2] = 128; // B
                    pixels[idx + 3] = b;   // A
                }
            }
        }

        ctx.putImageData(imageData, 0, 0);

        // Scanline effect
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        for (let y = 0; y < h; y += 2) ctx.fillRect(0, y, w, 1);

        // Glow
        ctx.shadowBlur = 10;
        ctx.shadowColor = 'rgba(74, 222, 128, 0.5)';

        // Border
        ctx.strokeStyle = '#4ADE80';
        ctx.globalAlpha = 0.2;
        ctx.strokeRect(0, 0, w, h);
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
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

    setMode(mode) {
        this.mode = mode; // 'histogram' or 'waveform'
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
