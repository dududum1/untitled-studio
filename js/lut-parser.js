/**
 * UNTITLED STUDIO - LUT PARSER
 * Parses Adobe .cube files for 3D LUT support
 */

class LUTParser {
    constructor() {
        this.defaultSize = 33;
    }

    /**
     * Parses a .cube file string
     * @param {string} text - The content of the .cube file
     * @returns {Object} { size: number, data: Float32Array, title: string, domainMin: vec3, domainMax: vec3 }
     */
    parse(text) {
        const lines = text.split(/\r?\n/);
        let title = 'Untitled LUT';
        let size = 0;
        let data = [];
        let domainMin = [0, 0, 0];
        let domainMax = [1, 1, 1];

        // First pass: Parse metadata
        let datastartIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            let line = lines[i].trim();

            // Skip comments and empty lines
            if (line.startsWith('#') || line === '') continue;

            // Header Parsing
            if (line.startsWith('TITLE')) {
                title = line.substring(6).replace(/"/g, '').trim();
            } else if (line.startsWith('LUT_3D_SIZE')) {
                size = parseInt(line.substring(12).trim());
            } else if (line.startsWith('DOMAIN_MIN')) {
                const parts = line.substring(11).trim().split(/\s+/).map(parseFloat);
                if (parts.length === 3) domainMin = parts;
            } else if (line.startsWith('DOMAIN_MAX')) {
                const parts = line.substring(11).trim().split(/\s+/).map(parseFloat);
                if (parts.length === 3) domainMax = parts;
            } else {
                // Assuming data starts here if it matches number pattern
                if (/^[0-9.+-]+\s+[0-9.+-]+\s+[0-9.+-]+$/.test(line)) {
                    datastartIndex = i;
                    break;
                }
            }
        }

        if (size === 0) {
            console.warn('LUTParser: No LUT_3D_SIZE found, assuming default 33');
            size = 33; // Fallback
        }

        // Pre-allocate buffer
        // standard .cube is RGB (3 values)
        const totalPoints = size * size * size;
        const resultData = new Float32Array(totalPoints * 3); // RGB
        // WebGL 3D textures need RGBA usually for alignment, or we can use RGB internal format.
        // WebGL2 supports RGB32F or RGB8. Let's stick to RGB data and let WebGL unpack it.
        // Actually, alignment can be tricky. RGB is fine if UNPACK_ALIGNMENT is handled.

        let resultIndex = 0;

        // Second pass: Parse data
        for (let i = datastartIndex; i < lines.length; i++) {
            let line = lines[i].trim();
            if (line.startsWith('#') || line === '') continue;

            const parts = line.split(/\s+/);
            if (parts.length >= 3) {
                const r = parseFloat(parts[0]);
                const g = parseFloat(parts[1]);
                const b = parseFloat(parts[2]);

                // Normalize if domains are weird? usually 0-1.
                // We'll trust the values.

                if (resultIndex < resultData.length) {
                    resultData[resultIndex++] = r;
                    resultData[resultIndex++] = g;
                    resultData[resultIndex++] = b;
                }
            }
        }

        if (resultIndex !== resultData.length) {
            console.warn(`LUTParser: Expected ${resultData.length / 3} points, found ${resultIndex / 3}. Data may be incomplete.`);
        }

        return {
            title,
            size,
            data: resultData,
            domainMin,
            domainMax
        };
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LUTParser;
} else {
    window.LUTParser = LUTParser;
}
