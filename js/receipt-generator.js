/**
 * THERMAL RECEIPT GENERATOR
 * Generates a visual receipt of current edits using HTML5 Canvas.
 * V2: Added QR Save Code
 */
class ReceiptGenerator {
    constructor() {
        this.width = 576; // Standard thermal printer width
        this.padding = 40;
        this.fontFamily = "'VT323', monospace"; // Fallback to monospace if not loaded
        this.lineHeight = 32;
        this.fontSize = 24;

        // Load font
        const link = document.createElement('link');
        link.href = 'https://fonts.googleapis.com/css2?family=VT323&display=swap';
        link.rel = 'stylesheet';
        document.head.appendChild(link);
    }

    async generate(editState) {
        // 1. Calculate Content Height
        const validEdits = this.processEdits(editState);
        const headerHeight = 200; // Logo + Divider
        const bodyHeight = validEdits.length * this.lineHeight + 50;
        const qrHeight = 180; // QR (128) + Title + Margin
        const footerHeight = 250 + qrHeight; // Barcode + Fortune + QR
        const totalHeight = headerHeight + bodyHeight + footerHeight;

        // 2. Setup Canvas
        const canvas = document.createElement('canvas');
        canvas.width = this.width;
        canvas.height = totalHeight;
        const ctx = canvas.getContext('2d');

        // 3. Background (Paper White)
        ctx.fillStyle = '#F4F4F6';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 4. Config Font
        await document.fonts.load(`${this.fontSize}px VT323`);
        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.fillStyle = '#2A2B2E'; // Ink Color
        ctx.textBaseline = 'middle';

        // 5. Draw Header
        this.drawHeader(ctx);

        // 6. Draw Body (Edits)
        let y = headerHeight;
        validEdits.forEach(item => {
            this.drawLine(ctx, item.label, item.value, y);
            y += this.lineHeight;
        });

        // 7. Draw Footer (Barcode, Fortune)
        this.drawFooter(ctx, y + 20);

        // 8. Visual Polish (Noise) - Apply to paper BEFORE QR
        this.applyEffects(ctx, canvas);

        // 9. Draw QR Code (Sharp - No Noise)
        try {
            if (window.QRCode && window.LZString) {
                const json = JSON.stringify(editState);
                const compressed = window.LZString.compressToEncodedURIComponent(json);
                const qrY = totalHeight - 200; // Position above zig-zag
                await this.drawQRCode(ctx, compressed, qrY);
            }
        } catch (e) {
            console.warn('QR Generation Failed:', e);
        }

        // 10. Zig Zag Edge (ensure it cuts everything)
        this.drawZigZag(ctx, canvas);

        return canvas.toDataURL('image/png');
    }

    processEdits(state) {
        const edits = [];
        if (!state) return [{ label: 'NO EDITS', value: '---' }];

        for (const [key, value] of Object.entries(state)) {
            if (value === 0 || value === null || value === undefined) continue;
            if (typeof value === 'boolean' && !value) continue;

            let displayValue = typeof value === 'number' ? value.toFixed(2) : String(value);
            if (value > 0 && typeof value === 'number') displayValue = '+' + displayValue;

            edits.push({
                label: key.toUpperCase().replace(/([A-Z])([A-Z])([a-z])|([a-z])([A-Z])/g, '$1$4 $2$3$5'),
                value: displayValue
            });
        }

        if (edits.length === 0) edits.push({ label: 'NO VISIBLE EDITS', value: 'RAW' });
        edits.push({ label: 'TIMESTAMP', value: new Date().toLocaleTimeString() });

        return edits;
    }

    drawHeader(ctx) {
        ctx.textAlign = 'center';
        ctx.font = `bold 36px ${this.fontFamily}`;
        ctx.fillText('UNTITLED STUDIO', this.width / 2, 60);

        ctx.font = `${this.fontSize}px ${this.fontFamily}`;
        ctx.fillText('================================', this.width / 2, 100);

        ctx.textAlign = 'left';
        ctx.fillText(`ID: ${Math.random().toString(36).substr(2, 9).toUpperCase()}`, this.padding, 140);
    }

    drawLine(ctx, label, value, y) {
        const dotsWidth = ctx.measureText('.').width;
        const labelWidth = ctx.measureText(label).width;
        const valueWidth = ctx.measureText(value).width;

        const availableWidth = this.width - (this.padding * 2) - labelWidth - valueWidth;
        const dotsCount = Math.max(0, Math.floor(availableWidth / dotsWidth) - 2);
        const dots = '.'.repeat(dotsCount);

        ctx.textAlign = 'left';
        ctx.fillText(`${label} ${dots} ${value}`, this.padding, y);
    }

    drawFooter(ctx, y) {
        // Barcode
        const barcodeHeight = 60;
        const barcodeY = y + 20;

        ctx.fillStyle = '#2A2B2E';
        for (let x = this.padding; x < this.width - this.padding; x += 2) {
            if (Math.random() > 0.5) {
                const w = Math.random() * 3 + 1;
                ctx.fillRect(x, barcodeY, w, barcodeHeight);
                x += w;
            }
        }

        // Fortune
        const fortunes = [
            'NO REFUNDS ON LOST TIME.',
            'THE GRAIN IS NOT A MISTAKE.',
            'DEVELOPED IN DARKNESS.',
            'KEEP DRY. AVOID DIRECT SUNLIGHT.',
            'DATA HAS NO WEIGHT.',
            'MEMORY FULL. INSERT COIN.',
            'YOUR VIBE IS CALIBRATED correctly.'
        ];
        const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];

        ctx.textAlign = 'center';
        ctx.font = `20px ${this.fontFamily}`;
        ctx.fillText(fortune, this.width / 2, barcodeY + barcodeHeight + 40);

        ctx.fillText('*** THANK YOU FOR EDITING ***', this.width / 2, barcodeY + barcodeHeight + 70);
    }

    async drawQRCode(ctx, text, y) {
        const size = 128;
        const x = (this.width - size) / 2;

        // 1. Clear Area (White Background) to remove Noise
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(x - 10, y - 10, size + 20, size + 40);

        // 2. Generate Data URL
        const opts = {
            margin: 1,
            color: {
                dark: '#2A2B2E',
                light: '#FFFFFF'
            },
            width: size,
            errorCorrectionLevel: 'L'
        };

        return new Promise((resolve) => {
            if (!window.QRCode || !window.QRCode.toDataURL) {
                console.warn('QRCode library not loaded properly');
                resolve();
                return;
            }
            window.QRCode.toDataURL(text, opts, (err, url) => {
                if (err) {
                    console.error('QR Error:', err);
                    resolve();
                    return;
                }
                const img = new Image();
                img.onload = () => {
                    ctx.drawImage(img, x, y, size, size);
                    ctx.fillStyle = '#2A2B2E';
                    ctx.font = `16px monospace`;
                    ctx.textAlign = 'center';
                    ctx.fillText('SCAN_TO_LOAD', this.width / 2, y + size + 20);
                    resolve();
                };
                img.onerror = () => {
                    console.error('QR Image Load Failed');
                    resolve();
                };
                img.src = url;
            });
        });
    }

    drawZigZag(ctx, canvas) {
        ctx.globalCompositeOperation = 'destination-out';
        ctx.beginPath();
        const zagSize = 10;
        ctx.moveTo(0, canvas.height - zagSize);
        for (let x = 0; x < canvas.width; x += zagSize) {
            ctx.lineTo(x + zagSize / 2, canvas.height);
            ctx.lineTo(x + zagSize, canvas.height - zagSize);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
    }

    applyEffects(ctx, canvas) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        for (let i = 0; i < data.length; i += 4) {
            if (Math.random() < 0.05) {
                data[i] -= 20;
                data[i + 1] -= 20;
                data[i + 2] -= 20;
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }
}

// Attach to Window
window.ReceiptGenerator = new ReceiptGenerator();
