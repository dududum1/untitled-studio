/**
 * UNTITLED STUDIO - TERMINAL VIEWER
 * Cinematic retro-terminal overlay for image metadata
 * Phase VII Aesthetic: Green/Amber monochrome, scanlines, typing effects
 */

class TerminalViewer {
    constructor(container) {
        this.container = container;
        this.isActive = false;
        this.contentEl = null;
        this.canvas = null;
        this.ctx = null;

        this.typingQueue = [];
        this.isTyping = false;

        this.exifData = null;
        this.metrics = {
            processingTime: 0,
            vramUsage: 'Unknown',
            clipping: '0.0%'
        };

        this.init();
    }

    init() {
        // Create the UI structure if it doesn't exist
        this.container.innerHTML = `
            <div id="terminal-content" class="absolute inset-0 p-8 font-mono text-[#4ADE80] pointer-events-none flex flex-col gap-6 overflow-hidden">
                <!-- Header Stats -->
                <div class="flex justify-between items-start border-b border-[#4ADE80]/30 pb-4">
                    <div class="flex items-center gap-4">
                        <button id="term-back-btn" class="pointer-events-auto hover:bg-[#4ADE80]/20 text-[#4ADE80] border border-[#4ADE80]/50 px-3 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-all active:scale-95">
                            &lt; RETURN
                        </button>
                        <div class="flex flex-col">
                            <span class="text-[10px] opacity-60 uppercase tracking-widest">System Status</span>
                            <span class="text-xs font-bold [text-shadow:0_0_8px_#4ADE80]">UNTITLED_OS v2.6.0_STABLE</span>
                        </div>
                    </div>
                    <div class="flex gap-8 text-[10px] opacity-80 uppercase pt-2">
                        <div>VRAM: <span id="term-vram">...</span></div>
                        <div>LATENCY: <span id="term-latency">...</span>ms</div>
                        <div>CLIPPING: <span id="term-clipping">...</span></div>
                    </div>
                </div>

                <!-- Main Grid -->
                <div class="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1">
                    <!-- Left: Metadata -->
                    <div id="term-metadata" class="space-y-4 text-sm whitespace-pre-wrap">
                        <div class="typing-active">INITIATING SCAN...</div>
                    </div>

                    <!-- Right: Waveform/Scanning -->
                    <div class="relative flex flex-col gap-4">
                        <div class="border border-[#4ADE80]/20 bg-black/40 h-48 relative overflow-hidden">
                            <canvas id="terminal-waveform" class="w-full h-full"></canvas>
                            <!-- Scanning Line -->
                            <div class="absolute inset-x-0 h-px bg-[#4ADE80] shadow-[0_0_15px_#4ADE80] scan-line"></div>
                        </div>
                        <div class="text-[10px] opacity-40 uppercase tracking-tighter">
                            Real-time Photosphere Analysis // Signal Flow 0xFF
                        </div>
                    </div>
                </div>

                <!-- Footer: Diagnostics -->
                <div class="mt-auto border-t border-[#4ADE80]/20 pt-4 flex justify-between items-end grayscale opacity-50">
                    <div class="text-[8px] leading-tight">
                        WARNING: UNSAFE VOLTAGE DETECTED IN VERTICAL DEFLECTION CIRCUIT.<br>
                        DO NOT ATTEMPT TO ADJUST WHILE POWER IS APPLIED.<br>
                        © 1994 UNTITLED EXPERIMENTAL SENSORS.
                    </div>
                    <div class="text-xs font-bold italic tracking-tighter cursor-default">
                        PHASE_VII_LICENCED
                    </div>
                </div>
            </div>
        `;

        this.contentEl = document.getElementById('term-metadata');
        this.canvas = document.getElementById('terminal-waveform');
        if (this.canvas) {
            this.ctx = this.canvas.getContext('2d');
            this.resizeCanvas();
        }

        // Event Listener for Back Button
        const backBtn = document.getElementById('term-back-btn');
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                this.hide();
                // We should also trigger the histogram to go back to normal mode if we access app via global
                // But typically the app controller handles the toggle logic. 
                // However, since we are hiding it directly here, we might need a callback or dispatch an event.
                // For now, let's just dispatch a custom event that app.js can listen to, or rely on app.js to handle state?
                // Actually, app.js handles the toggle button. If we close from here, app.js might not know to switch histogram back.
                // Let's toggle the class and maybe emit an event.

                // Better approach: dispatch event
                const event = new CustomEvent('terminal-closed');
                window.dispatchEvent(event);
            });
        }

        // Add scan-line animation style if not exists
        if (!document.getElementById('terminal-viewer-styles')) {
            const style = document.createElement('style');
            style.id = 'terminal-viewer-styles';
            style.innerHTML = `
                @keyframes scanlineMove {
                    0% { top: 0%; opacity: 0; }
                    5% { opacity: 1; }
                    95% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
                .scan-line {
                    animation: scanlineMove 4s linear infinite;
                }
                .typing-cursor::after {
                    content: '▋';
                    animation: blink 1s step-end infinite;
                }
                @keyframes blink { 50% { opacity: 0; } }
            `;
            document.head.appendChild(style);
        }
    }

    resizeCanvas() {
        if (!this.canvas) return;
        const rect = this.canvas.parentElement.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }

    toggle() {
        this.isActive = !this.isActive;
        this.container.classList.toggle('hidden', !this.isActive);
        if (this.isActive) {
            this.resizeCanvas();
            this.refresh();
        }
    }

    show() {
        this.isActive = true;
        this.container.classList.remove('hidden');
        this.resizeCanvas();
        this.refresh();
    }

    hide() {
        this.isActive = false;
        this.container.classList.add('hidden');
    }

    setExif(data) {
        this.exifData = data;
        if (this.isActive) this.refresh();
    }

    setMetrics(metrics) {
        this.metrics = { ...this.metrics, ...metrics };
        this.updateHeader();
    }

    updateHeader() {
        const vram = document.getElementById('term-vram');
        const latency = document.getElementById('term-latency');
        const clipping = document.getElementById('term-clipping');

        if (vram) vram.textContent = this.metrics.vramUsage;
        if (latency) latency.textContent = this.metrics.processingTime;
        if (clipping) clipping.textContent = this.metrics.clipping;
    }

    async refresh() {
        if (!this.contentEl) return;

        this.updateHeader();

        // Clear and type new content
        this.contentEl.innerHTML = '';
        this.typingQueue = [];

        const lines = [
            `> TARGET: ${this.exifData?.name || 'UNKNOWN_OBJECT'}`,
            `> FORMAT: ${this.exifData?.format || 'GENERIC_PIXEL_BUFFER'}`,
            `----------------------------------------`,
            `EXIF_DATA_RESTORED:`,
            `  CAMERA: ${this.exifData?.Make || 'N/A'} ${this.exifData?.Model || ''}`,
            `  LENS:   ${this.exifData?.LensModel || 'UNKNOWN_OPTICS'}`,
            `  ISO:    ${this.exifData?.ISO || '??'}`,
            `  SHUTTER: ${this.exifData?.ExposureTime || '??'}`,
            `  APERTURE: f/${this.exifData?.FNumber || '??'}`,
            `  FOCAL: ${this.exifData?.FocalLength || '??'}mm`,
            `----------------------------------------`,
            `SIGNAL_ANALYTICS:`,
            `  LUMINANCE_FLOW: DETECTED`,
            `  NOISE_FLOOR: NOMINAL`,
            `  CHROMINANCE: LOCKED`,
            `----------------------------------------`,
            `READY_FOR_MODIFICATION.`
        ];

        this.typeLines(lines);
    }

    async typeLines(lines) {
        if (this.isTyping) return;
        this.isTyping = true;

        for (const line of lines) {
            if (!this.isActive) break;
            const lineEl = document.createElement('div');
            lineEl.className = 'typing-cursor';
            this.contentEl.appendChild(lineEl);

            for (let i = 0; i < line.length; i++) {
                if (!this.isActive) break;
                lineEl.textContent += line[i];
                await new Promise(r => setTimeout(r, 5 + Math.random() * 10));
            }
            lineEl.classList.remove('typing-cursor');
            await new Promise(r => setTimeout(r, 20));
        }

        this.isTyping = false;
    }

    updateWaveform(histogram) {
        if (!this.isActive || !this.ctx || !histogram) return;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        ctx.clearRect(0, 0, w, h);

        // Draw standard green waveform monitor look
        const data = histogram.data.l; // Use luminance for now
        const max = Math.max(...data, 1);
        const step = w / 256;

        ctx.strokeStyle = '#4ADE80';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i < 256; i++) {
            const x = i * step;
            const val = (data[i] / max) * h;
            if (i === 0) ctx.moveTo(x, h - val);
            else ctx.lineTo(x, h - val);
        }
        ctx.stroke();

        // Waveform is actually better handled by the Histogram class's drawWaveform
        // But for the terminal, we might want a simplified version or just call that.
    }
}
