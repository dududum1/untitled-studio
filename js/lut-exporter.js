/**
 * UNTITLED STUDIO - LUT EXPORTER
 * Generates .cube LUT files from current color grade
 */

class LUTExporter {
    constructor(engine) {
        this.engine = engine;
        this.lutSize = 33; // Industry standard (17, 33, or 65)
    }

    /**
     * Generate a .cube LUT file from current adjustments
     * @param {Object} adjustments - Current adjustment values
     * @param {string} filename - Name for the LUT file
     * @returns {Promise<Blob>} - The .cube file as a Blob
     */
    async generateLUT(adjustments, filename = 'Untitled_Grade') {
        const size = this.lutSize;
        const lutData = [];

        // Create offscreen canvas for processing
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size * size; // Stack all blue slices vertically
        const gl = canvas.getContext('webgl2', { preserveDrawingBuffer: true });

        if (!gl) {
            throw new Error('WebGL2 not supported');
        }

        // Generate identity LUT texture (input colors)
        const identityData = this.generateIdentityLUT(size);

        // Process through engine shader
        const processedData = await this.processLUTThroughShader(identityData, size, adjustments);

        // Format as .cube file
        const cubeContent = this.formatCubeFile(processedData, size, filename);

        return new Blob([cubeContent], { type: 'text/plain' });
    }

    /**
     * Generate identity LUT data (input = output)
     */
    generateIdentityLUT(size) {
        const data = [];

        for (let b = 0; b < size; b++) {
            for (let g = 0; g < size; g++) {
                for (let r = 0; r < size; r++) {
                    data.push({
                        r: r / (size - 1),
                        g: g / (size - 1),
                        b: b / (size - 1)
                    });
                }
            }
        }

        return data;
    }

    /**
     * Process LUT colors through the shader pipeline
     * Uses a simplified CPU-based color transform for reliability
     */
    async processLUTThroughShader(inputColors, size, adj) {
        const output = [];

        for (const color of inputColors) {
            let r = color.r;
            let g = color.g;
            let b = color.b;

            // Apply adjustments (simplified pipeline matching shader)

            // Exposure
            const exposure = Math.pow(2, adj.exposure || 0);
            r *= exposure;
            g *= exposure;
            b *= exposure;

            // Temperature & Tint
            const temp = (adj.temperature || 0) / 100;
            const tint = (adj.tint || 0) / 100;
            r += temp * 0.1;
            b -= temp * 0.1;
            g += tint * 0.05;

            // Contrast
            const contrast = 1 + (adj.contrast || 0) / 100;
            r = (r - 0.5) * contrast + 0.5;
            g = (g - 0.5) * contrast + 0.5;
            b = (b - 0.5) * contrast + 0.5;

            // Saturation
            const sat = 1 + (adj.saturation || 0) / 100;
            const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
            r = gray + (r - gray) * sat;
            g = gray + (g - gray) * sat;
            b = gray + (b - gray) * sat;

            // Vibrance (affects less saturated colors more)
            const vib = (adj.vibrance || 0) / 100;
            const maxC = Math.max(r, g, b);
            const minC = Math.min(r, g, b);
            const satLevel = (maxC - minC) / (maxC + 0.001);
            const vibFactor = 1 + vib * (1 - satLevel);
            r = gray + (r - gray) * vibFactor;
            g = gray + (g - gray) * vibFactor;
            b = gray + (b - gray) * vibFactor;

            // Shadows/Highlights (tone curve approximation)
            const shadows = (adj.shadows || 0) / 100;
            const highlights = (adj.highlights || 0) / 100;
            const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;

            // Shadows affect darks
            const shadowMask = 1 - Math.min(lum * 2, 1);
            r += shadows * 0.2 * shadowMask;
            g += shadows * 0.2 * shadowMask;
            b += shadows * 0.2 * shadowMask;

            // Highlights affect brights
            const highlightMask = Math.max(lum * 2 - 1, 0);
            r += highlights * 0.2 * highlightMask;
            g += highlights * 0.2 * highlightMask;
            b += highlights * 0.2 * highlightMask;

            // Fade (lift blacks)
            const fade = (adj.fade || 0) / 100;
            r = r * (1 - fade * 0.3) + fade * 0.1;
            g = g * (1 - fade * 0.3) + fade * 0.1;
            b = b * (1 - fade * 0.3) + fade * 0.1;

            // Clamp
            r = Math.max(0, Math.min(1, r));
            g = Math.max(0, Math.min(1, g));
            b = Math.max(0, Math.min(1, b));

            output.push({ r, g, b });
        }

        return output;
    }

    /**
     * Format LUT data as Adobe/Resolve compatible .cube file
     */
    formatCubeFile(data, size, title) {
        let cube = `# Created by Untitled Studio\n`;
        cube += `# https://untitled.studio\n\n`;
        cube += `TITLE "${title}"\n`;
        cube += `LUT_3D_SIZE ${size}\n\n`;
        cube += `# Domain min/max\n`;
        cube += `DOMAIN_MIN 0.0 0.0 0.0\n`;
        cube += `DOMAIN_MAX 1.0 1.0 1.0\n\n`;

        for (const color of data) {
            cube += `${color.r.toFixed(6)} ${color.g.toFixed(6)} ${color.b.toFixed(6)}\n`;
        }

        return cube;
    }

    /**
     * Download the LUT file
     */
    async downloadLUT(adjustments, filename = 'Untitled_Grade') {
        try {
            const blob = await this.generateLUT(adjustments, filename);
            const url = URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.href = url;
            a.download = `${filename}.cube`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);

            return true;
        } catch (error) {
            console.error('LUT Export failed:', error);
            throw error;
        }
    }
}

// Browser global export
if (typeof window !== 'undefined') {
    window.LUTExporter = LUTExporter;
}
