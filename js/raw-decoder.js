/**
 * RAW IMAGE DECODER MODULE
 * Provides browser-based RAW file decoding support for common camera formats
 * Uses a lightweight JavaScript-based approach with WASM fallback option
 * 
 * Supported formats: .CR2, .NEF, .ARW, .DNG, .ORF, .RAF, .RW2, .PEF, .SRW, .3FR
 */

class RawDecoder {
    constructor() {
        this.supportedExtensions = [
            '.cr2', '.cr3',  // Canon
            '.nef', '.nrw',  // Nikon
            '.arw', '.srf', '.sr2',  // Sony
            '.dng',          // Adobe DNG (universal)
            '.orf',          // Olympus
            '.raf',          // Fujifilm
            '.rw2',          // Panasonic
            '.pef', '.dng',  // Pentax
            '.srw',          // Samsung
            '.3fr',          // Hasselblad
            '.raw', '.rwl',  // Leica
            '.erf',          // Epson
            '.kdc', '.dcr',  // Kodak
            '.iiq'           // Phase One
        ];

        this.wasmLoaded = false;
        this.wasmModule = null;

        // Check for libraw.js availability
        this.initWasm();
    }

    /**
     * Initialize WASM module if available
     */
    async initWasm() {
        // Try to load libraw-wasm if available
        try {
            if (window.LibRaw) {
                this.wasmModule = window.LibRaw;
                this.wasmLoaded = true;
                console.log('[RawDecoder] LibRaw WASM module loaded');
            }
        } catch (e) {
            console.log('[RawDecoder] WASM not available, using fallback decoder');
        }
    }

    /**
     * Check if a file is a RAW image based on extension
     */
    isRawFile(file) {
        if (!file || !file.name) return false;
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        return this.supportedExtensions.includes(ext);
    }

    /**
     * Get file extension
     */
    getExtension(filename) {
        return '.' + filename.split('.').pop().toLowerCase();
    }

    /**
     * Main decode function - returns a Blob containing the decoded image
     */
    async decode(file) {
        console.log(`[RawDecoder] Decoding ${file.name}...`);

        const ext = this.getExtension(file.name);

        // For DNG files, try to use embedded preview first
        // Most DNGs contain a full-resolution JPEG preview
        if (ext === '.dng') {
            const preview = await this.extractDngPreview(file);
            if (preview) return preview;
        }

        // Try WASM decoder if available
        if (this.wasmLoaded && this.wasmModule) {
            try {
                return await this.decodeWithWasm(file);
            } catch (e) {
                console.warn('[RawDecoder] WASM decode failed, trying fallback:', e);
            }
        }

        // Fallback: Extract embedded JPEG preview (most RAW files have one)
        const preview = await this.extractEmbeddedPreview(file);
        if (preview) return preview;

        // If all else fails, show error
        throw new Error(`Unable to decode RAW file: ${file.name}. Try installing a RAW codec or converting to DNG.`);
    }

    /**
     * Decode using WASM LibRaw module
     */
    async decodeWithWasm(file) {
        const arrayBuffer = await file.arrayBuffer();
        const result = await this.wasmModule.decodeRaw(new Uint8Array(arrayBuffer));

        // Convert raw pixel data to canvas then to Blob
        const canvas = document.createElement('canvas');
        canvas.width = result.width;
        canvas.height = result.height;
        const ctx = canvas.getContext('2d');

        const imageData = new ImageData(
            new Uint8ClampedArray(result.data),
            result.width,
            result.height
        );
        ctx.putImageData(imageData, 0, 0);

        return new Promise(resolve => {
            canvas.toBlob(resolve, 'image/jpeg', 0.95);
        });
    }

    /**
     * Extract embedded JPEG preview from RAW file
     * Most camera RAW files embed a JPEG thumbnail/preview
     */
    async extractEmbeddedPreview(file) {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);

        // Look for JPEG markers (FFD8 start, FFD9 end)
        const jpegStart = this.findJpegStart(data);
        if (jpegStart === -1) return null;

        const jpegEnd = this.findJpegEnd(data, jpegStart);
        if (jpegEnd === -1) return null;

        // Extract the largest JPEG found (usually the preview, not thumbnail)
        const jpegData = data.slice(jpegStart, jpegEnd + 2);

        // Verify it's a valid JPEG
        if (jpegData[0] !== 0xFF || jpegData[1] !== 0xD8) return null;

        console.log(`[RawDecoder] Found embedded JPEG preview (${jpegData.length} bytes)`);

        return new Blob([jpegData], { type: 'image/jpeg' });
    }

    /**
     * Extract preview from DNG file (Adobe format)
     * DNG files typically have a JPEG preview in a well-defined location
     */
    async extractDngPreview(file) {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);

        // DNG uses TIFF structure - find the preview SubIFD
        // For simplicity, we'll just look for the largest embedded JPEG
        return this.extractEmbeddedPreview(file);
    }

    /**
     * Find JPEG start marker (0xFFD8)
     * Skips small thumbnails (< 50KB offset) to find the main preview
     */
    findJpegStart(data) {
        let lastStart = -1;
        let largestSize = 0;
        let largestStart = -1;

        // Find all JPEG starts and pick the largest one
        for (let i = 0; i < data.length - 10; i++) {
            if (data[i] === 0xFF && data[i + 1] === 0xD8) {
                // Found a JPEG start
                const end = this.findJpegEnd(data, i);
                if (end > i) {
                    const size = end - i;
                    // Prefer larger JPEGs (the preview, not thumbnail)
                    if (size > largestSize && size > 50000) {
                        largestSize = size;
                        largestStart = i;
                    }
                }
            }
        }

        return largestStart;
    }

    /**
     * Find JPEG end marker (0xFFD9)
     */
    findJpegEnd(data, startPos) {
        for (let i = startPos + 2; i < data.length - 1; i++) {
            if (data[i] === 0xFF && data[i + 1] === 0xD9) {
                return i;
            }
        }
        return -1;
    }

    /**
     * Get a user-friendly format name
     */
    getFormatName(filename) {
        const ext = this.getExtension(filename).toUpperCase().replace('.', '');
        const brands = {
            'CR2': 'Canon RAW',
            'CR3': 'Canon RAW',
            'NEF': 'Nikon RAW',
            'NRW': 'Nikon RAW',
            'ARW': 'Sony RAW',
            'SRF': 'Sony RAW',
            'SR2': 'Sony RAW',
            'DNG': 'Adobe DNG',
            'ORF': 'Olympus RAW',
            'RAF': 'Fujifilm RAW',
            'RW2': 'Panasonic RAW',
            'PEF': 'Pentax RAW',
            'SRW': 'Samsung RAW',
            '3FR': 'Hasselblad RAW',
            'RAW': 'RAW Image',
            'RWL': 'Leica RAW',
            'ERF': 'Epson RAW',
            'KDC': 'Kodak RAW',
            'DCR': 'Kodak RAW',
            'IIQ': 'Phase One RAW'
        };
        return brands[ext] || 'RAW Image';
    }
}

// Export singleton
window.RawDecoder = new RawDecoder();
