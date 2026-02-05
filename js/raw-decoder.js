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
            '.pef',          // Pentax
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

        // For DNG files (and many TIFF-based RAWs), try to parse TIFF structure 
        // to find embedded JPEG/Preview efficiently
        if (ext === '.dng' || ext === '.cr2' || ext === '.nef' || ext === '.arw' || ext === '.orf') {
            try {
                const preview = await this.extractPreviewViaTiff(file);
                if (preview) {
                    console.log(`[RawDecoder] extracted preview via TIFF parser`);
                    return preview;
                }
            } catch (e) {
                console.warn('[RawDecoder] TIFF parser failed, falling back to scan:', e);
            }
        }

        // Try WASM decoder if available
        if (this.wasmLoaded && this.wasmModule) {
            try {
                return await this.decodeWithWasm(file);
            } catch (e) {
                console.warn('[RawDecoder] WASM decode failed, trying fallback:', e);
            }
        }

        // Fallback: Scan full file for embedded JPEG preview
        const preview = await this.extractEmbeddedPreviewScan(file);
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
     * Robust TIFF/DNG Parser to find embedded previews
     */
    async extractPreviewViaTiff(file) {
        // Read header first (larger chunk to cover IFD0)
        // 128KB should be enough to find IFD0 and maybe SubIFDs pointers
        const headerBuffer = await file.slice(0, 131072).arrayBuffer();
        const view = new DataView(headerBuffer);

        // 1. Validate TIFF Header
        const byteOrder = view.getUint16(0);
        const isLE = byteOrder === 0x4949; // II (Little Endian)
        if (byteOrder !== 0x4949 && byteOrder !== 0x4D4D) return null; // Not TIFF

        if (view.getUint16(2, isLE) !== 42) return null; // Not TIFF 42

        const ifd0Offset = view.getUint32(4, isLE);
        if (ifd0Offset < 8 || ifd0Offset > headerBuffer.byteLength) {
            // IFD0 is too far to read in this chunk, or invalid
            // We could fetch more, but usually IFD0 is early.
            return null;
        }

        // Helper to read entries
        const readIFD = (offset) => {
            if (offset + 2 > view.byteLength) return null;
            const count = view.getUint16(offset, isLE);
            if (offset + 2 + count * 12 > view.byteLength) return null;

            const entries = {};
            for (let i = 0; i < count; i++) {
                const entryOffset = offset + 2 + i * 12;
                const tag = view.getUint16(entryOffset, isLE);
                const type = view.getUint16(entryOffset + 2, isLE);
                const numValues = view.getUint32(entryOffset + 4, isLE);
                const valueOffset = view.getUint32(entryOffset + 8, isLE); // Value or Offset to Value

                // For small values (fits in 4 bytes), the value IS the offset field
                let value = valueOffset;

                // Tags of interest:
                // 0x0111: StripOffsets (Image Data Start)
                // 0x0117: StripByteCounts (Image Data size)
                // 0x0201: JPEGInterchangeFormat (Start of JPEG)
                // 0x0202: JPEGInterchangeFormatLength (Size of JPEG)
                // 0x0103: Compression (6=old JPEG, 7=JPEG)
                // 0x014a: SubIFDs (Array of pointers to other IFDs)

                entries[tag] = { type, count: numValues, value };
            }
            return entries;
        };

        const ifd0 = readIFD(ifd0Offset);
        if (!ifd0) return null;

        // Check for direct JPEG in IFD0
        if (ifd0[0x0201] && ifd0[0x0202]) {
            const offset = ifd0[0x0201].value;
            const length = ifd0[0x0202].value;
            return await this.extractBlob(file, offset, length);
        }

        // Check SubIFDs (often where the actual image or full preview lies)
        if (ifd0[0x014a]) {
            const subIfdEntry = ifd0[0x014a];
            // SubIFDs values are offsets. 
            // If count > 1, we need to read the array of offsets.
            // If data fits in 4 bytes (count=1, type=4/3), it's in value.
            // Otherwise it's an offset to the array.

            let subIfdOffsets = [];
            if (subIfdEntry.count === 1) {
                subIfdOffsets.push(subIfdEntry.value);
            } else {
                // The array of offsets is at `subIfdEntry.value`
                const arrayOffset = subIfdEntry.value;
                // Ensure we have this data
                if (arrayOffset + subIfdEntry.count * 4 <= view.byteLength) {
                    for (let i = 0; i < subIfdEntry.count; i++) {
                        subIfdOffsets.push(view.getUint32(arrayOffset + i * 4, isLE));
                    }
                }
            }

            // Iterate SubIFDs to find largest JPEG
            let bestCandidate = null; // { offset, length, size }

            // Note: We might need to read more file data if SubIFDs are far
            // But let's assume IFD headers are somewhat packed or we re-fetch.
            // For simplicity, we only check SubIFDs that structure is within our initial 128kb header read
            // OR we do a specific fetch for strictly the IFD structure if needed.
            // Given constraint, let's keep it simple: if IFD offset is > 128kb, skip or try efficient fetch?
            // Efficient fetch is better.

            for (const offset of subIfdOffsets) {
                // We need to fetch the IFD header (count + entries)
                // Just fetch a 4KB chunk around the offset
                // NOTE: This could be slow if many SubIFDs. usually 1-3.
                const chunk = await file.slice(offset, offset + 4096).arrayBuffer();
                const subChunk = new DataView(chunk);
                const subCount = subChunk.getUint16(0, isLE);

                // Basic parse of this IFD
                let compression = 0;
                let jpegOffset = 0;
                let jpegLength = 0;
                let stripOffset = 0;
                let stripByteCounts = 0;
                let width = 0;

                for (let i = 0; i < subCount; i++) {
                    const idx = 2 + i * 12;
                    if (idx + 12 > chunk.byteLength) break;

                    const tag = subChunk.getUint16(idx, isLE);
                    const val = subChunk.getUint32(idx + 8, isLE); // Basic 4-byte read

                    if (tag === 0x0100) width = val; // ImageWidth
                    if (tag === 0x0103) compression = val;
                    if (tag === 0x0201) jpegOffset = val;
                    if (tag === 0x0202) jpegLength = val;
                    if (tag === 0x0111) stripOffset = val; // For single strip
                    if (tag === 0x0117) stripByteCounts = val;
                }

                // Check candidate
                if (jpegOffset > 0 && jpegLength > 0) {
                    if (!bestCandidate || jpegLength > bestCandidate.length) {
                        bestCandidate = { offset: jpegOffset, length: jpegLength };
                    }
                } else if (compression === 7 || compression === 6) { // JPEG Compressed Strips
                    // Assuming single strip for preview
                    if (stripOffset > 0 && stripByteCounts > 0) {
                        if (!bestCandidate || stripByteCounts > bestCandidate.length) {
                            bestCandidate = { offset: stripOffset, length: stripByteCounts };
                        }
                    }
                }
            }

            if (bestCandidate) {
                return await this.extractBlob(file, bestCandidate.offset, bestCandidate.length);
            }
        }

        return null;
    }

    async extractBlob(file, offset, length) {
        const slice = file.slice(offset, offset + length);
        // Verify standard JPEG header (SOI)
        // const check = new Uint8Array(await slice.slice(0, 2).arrayBuffer());
        // if (check[0] === 0xFF && check[1] === 0xD8) {
        return new Blob([slice], { type: 'image/jpeg' });
        // }
        // return null;
    }

    /**
     * Legacy: Scan entire file (slow fallback)
     */
    async extractEmbeddedPreviewScan(file) {
        const buffer = await file.arrayBuffer();
        const data = new Uint8Array(buffer);

        // Look for JPEG markers (FFD8 start, FFD9 end)
        // Logic: Find largest block between FFD8 and FFD9

        // This is slow for 20MB+ files.
        // Optimization: Scan in chunks or only first/last N bytes?
        // Embeds are usually at start or end.

        const jpegStart = this.findJpegStart(data);
        if (jpegStart === -1) return null;

        const jpegEnd = this.findJpegEnd(data, jpegStart);
        if (jpegEnd === -1) return null;

        const jpegData = data.slice(jpegStart, jpegEnd + 2);
        if (jpegData[0] !== 0xFF || jpegData[1] !== 0xD8) return null;

        console.log(`[RawDecoder] Found embedded JPEG preview via SCAN (${jpegData.length} bytes)`);
        return new Blob([jpegData], { type: 'image/jpeg' });
    }

    // Helper: Find JPEG start marker (0xFFD8)
    findJpegStart(data) {
        let lastStart = -1;
        let largestSize = 0;
        let largestStart = -1;

        // Skip massive files, only check first 5MB and last 5MB? 
        // Or stride?
        const stride = 1;

        for (let i = 0; i < data.length - 10; i += stride) {
            if (data[i] === 0xFF && data[i + 1] === 0xD8) {
                // Heuristic: check if this looks like a preview (not thumbnail)
                // Just return the first valid start found?
                // Old logic tried to find "largest".

                // Let's try to be smart: usually preview is the second or third Jpeg (thumb, then preview)
                // Or checking size. 
                const end = this.findJpegEnd(data, i);
                if (end > i) {
                    const size = end - i;
                    if (size > largestSize && size > 50000) { // Min 50KB
                        largestSize = size;
                        largestStart = i;
                    }
                }
            }
        }
        return largestStart;
    }

    findJpegEnd(data, startPos) {
        // Search forward from startPos
        // Limit search to prevent hanging
        const limit = startPos + 10000000; // 10MB limit for preview
        const max = Math.min(data.length - 1, limit);

        for (let i = startPos + 2; i < max; i++) {
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
            'CR2': 'Canon RAW', 'CR3': 'Canon RAW',
            'NEF': 'Nikon RAW', 'NRW': 'Nikon RAW',
            'ARW': 'Sony RAW', 'SRF': 'Sony RAW', 'SR2': 'Sony RAW',
            'DNG': 'Adobe DNG',
            'ORF': 'Olympus RAW',
            'RAF': 'Fujifilm RAW',
            'RW2': 'Panasonic RAW',
            'PEF': 'Pentax RAW',
            'SRW': 'Samsung RAW',
            '3FR': 'Hasselblad RAW',
            'RAW': 'RAW Image', 'RWL': 'Leica RAW',
            'ERF': 'Epson RAW',
            'KDC': 'Kodak RAW', 'DCR': 'Kodak RAW',
            'IIQ': 'Phase One RAW'
        };
        return brands[ext] || 'RAW Image';
    }
}

// Export singleton
window.RawDecoder = new RawDecoder();
