/**
 * RECEIPT SCANNER
 * Handles QR Code scanning via Camera or Image File to restore edit sessions.
 * Dependencies: html5-qrcode, lz-string
 */
class ReceiptScanner {
    constructor(app) {
        this.app = app;
        this.isScanning = false;
        this.html5QrCode = null;
        this.elements = {
            modal: document.getElementById('receipt-scanner-modal'),
            backdrop: document.getElementById('scanner-backdrop'),
            content: document.getElementById('scanner-content'),
            closeBtn: document.getElementById('close-scanner-btn'),
            reader: document.getElementById('reader'),
            fileInput: document.getElementById('scanner-file-input'),
            uploadBtn: document.getElementById('scanner-upload-btn'),
            laser: document.getElementById('scanner-laser')
        };
    }

    init() {
        if (!this.elements.modal) return;

        // Events
        this.elements.closeBtn.addEventListener('click', () => this.close());
        this.elements.backdrop.addEventListener('click', () => this.close());

        // File Upload
        this.elements.uploadBtn.addEventListener('click', () => this.elements.fileInput.click());
        this.elements.fileInput.addEventListener('change', (e) => this.handleFile(e.target.files[0]));

        // Global Paste Listener (Ctrl+V)
        document.addEventListener('paste', (e) => this.handlePaste(e));

        // Drag & Drop on Modal
        this.elements.modal.addEventListener('dragover', (e) => {
            e.preventDefault();
            this.elements.content.classList.add('border-hot-pink');
        });
        this.elements.modal.addEventListener('dragleave', (e) => {
            e.preventDefault();
            this.elements.content.classList.remove('border-hot-pink');
        });
        this.elements.modal.addEventListener('drop', (e) => {
            e.preventDefault();
            this.elements.content.classList.remove('border-hot-pink');
            if (e.dataTransfer.files.length > 0) {
                this.handleFile(e.dataTransfer.files[0]);
            }
        });
    }

    async open() {
        this.elements.modal.classList.remove('hidden');
        // Animate in
        requestAnimationFrame(() => {
            this.elements.backdrop.classList.remove('opacity-0');
            this.elements.content.classList.remove('opacity-0', 'scale-95');
        });

        // Focus on file input immediately? 
        // Or just show the drop zone.
        // Let's show the drop zone clearly.
        this.elements.reader.innerHTML = `
            <div class="h-full flex flex-col items-center justify-center text-gray-400">
                <svg class="w-16 h-16 mb-4 text-hot-pink opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
                </svg>
                <p class="text-sm font-mono">DROP IMAGE HERE</p>
                <p class="text-xs opacity-50 mt-2">or Paste (Ctrl+V)</p>
            </div>
        `;
        this.elements.laser.classList.add('hidden'); // No scanning animation needed for static
    }

    close() {
        // Animate out
        this.elements.backdrop.classList.add('opacity-0');
        this.elements.content.classList.add('opacity-0', 'scale-95');

        setTimeout(() => {
            this.elements.modal.classList.add('hidden');
            // No camera to stop
        }, 300);
    }

    // Camera methods removed as per user request to use Gallery only.

    handleScanSuccess(decodedText) {
        // Stop scanning immediately
        // this.stopCamera(); // Removed as camera is disabled
        this.close();

        // Audio Feedback
        this.playBeep();

        // Decode Logic
        try {
            // 1. Decompress
            const jsonString = window.LZString.decompressFromEncodedURIComponent(decodedText);
            if (!jsonString) throw new Error('Decompression failed');

            // 2. Parse
            const state = JSON.parse(jsonString);

            // 3. Apply to App
            if (this.app.applyState) {
                this.app.applyState(state);
                this.app.showToast(`Recipe Loaded: ${state.TIMESTAMP || 'Receipt'}`, 3000);
            }

        } catch (err) {
            console.error('Receipt Decode Failed:', err);
            this.app.showToast('Invalid Receipt Code', 'error');
        }
    }

    async handleFile(file) {
        if (!file) return;

        try {
            if (!window.Html5Qrcode) return;

            const html5QrCode = new Html5Qrcode("reader");
            const decodedText = await html5QrCode.scanFile(file, true);

            this.handleScanSuccess(decodedText);

        } catch (err) {
            console.error('File Scan Error:', err);
            this.app.showToast('No QR Code found in image', 'error');
        }
    }

    handlePaste(e) {
        // Look for image items in paste event
        const items = (e.clipboardData || e.originalEvent.clipboardData).items;
        for (const item of items) {
            if (item.type.indexOf('image') === 0) {
                const blob = item.getAsFile();
                this.handleFile(blob);
                // If scanner modal is open, maybe visual feedback?
                // If closed, this "Global Paste" feature is super cool.
                return;
            }
        }
    }

    playBeep() {
        // Simple Beep
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.type = 'square';
        osc.frequency.setValueAtTime(1200, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.1);

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);

        osc.start();
        osc.stop(ctx.currentTime + 0.1);
    }
}

// Attach to Window but don't init yet (wait for app)
window.ReceiptScannerClass = ReceiptScanner;
