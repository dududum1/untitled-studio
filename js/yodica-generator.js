/**
 * Yodica Procedural Texture Generator
 * Generates brand-accurate film overlays on-the-fly.
 */
class YodicaGenerator {
    static generate(textureName) {
        console.log(`[Yodica] Procedurally generating: ${textureName}`);
        switch (textureName) {
            case 'gradient_antares':
                return this.generateAntares();
            case 'gradient_vega':
                return this.generateVega();
            case 'gradient_rainbow_horizontal':
                return this.generateRainbowHorizontal();
            case 'patchwork_rainbow':
                return this.generatePatchwork();
            default:
                return null;
        }
    }

    static svgToBase64(svgString) {
        return 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgString)));
    }

    static generateAntares() {
        // Sunset Split: Warm Top, Cool Bottom
        // Improved: Soft linear gradient with smoother transition
        const svg = `
            <svg width="2048" height="2048" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#FF4500" stop-opacity="0.6" />
                        <stop offset="40%" stop-color="#FF8C00" stop-opacity="0.3" />
                        <stop offset="60%" stop-color="#4B0082" stop-opacity="0.3" />
                        <stop offset="100%" stop-color="#00008B" stop-opacity="0.6" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#g)" />
            </svg>
        `;
        return this.svgToBase64(svg);
    }

    static generateVega() {
        // Sunrise Split: Cool Top, Warm Bottom
        // Improved: Soft linear gradient
        const svg = `
            <svg width="2048" height="2048" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#00BFFF" stop-opacity="0.6" />
                        <stop offset="40%" stop-color="#1E90FF" stop-opacity="0.3" />
                        <stop offset="60%" stop-color="#FFD700" stop-opacity="0.3" />
                        <stop offset="100%" stop-color="#FF4500" stop-opacity="0.6" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#g)" />
            </svg>
        `;
        return this.svgToBase64(svg);
    }

    static generateRainbowHorizontal() {
        // Rainbow Horizon
        const svg = `
            <svg width="2048" height="2048" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stop-color="#FF0000" stop-opacity="0.3" />
                        <stop offset="16%" stop-color="#FF7F00" stop-opacity="0.3" />
                        <stop offset="33%" stop-color="#FFFF00" stop-opacity="0.3" />
                        <stop offset="50%" stop-color="#00FF00" stop-opacity="0.3" />
                        <stop offset="66%" stop-color="#0000FF" stop-opacity="0.3" />
                        <stop offset="83%" stop-color="#4B0082" stop-opacity="0.3" />
                        <stop offset="100%" stop-color="#9400D3" stop-opacity="0.3" />
                    </linearGradient>
                </defs>
                <rect width="100%" height="100%" fill="url(#g)" />
            </svg>
        `;
        return this.svgToBase64(svg);
    }

    static generatePatchwork() {
        // Glitch Patchwork (Randomly generated on each load for uniqueness)
        const canvas = document.createElement('canvas');
        canvas.width = 2048;
        canvas.height = 2048;
        const ctx = canvas.getContext('2d');

        const colors = ['#FF00FF', '#00FFFF', '#FFFF00', '#FF4500', '#7FFF00', '#8A2BE2', '#00FA9A'];

        // Background - slight noise
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, 2048, 2048);

        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < 30; i++) {
            ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
            ctx.globalAlpha = Math.random() * 0.2 + 0.1;
            const w = Math.random() * 1600 + 200; // Scaled up
            const h = Math.random() * 600 + 100; // Scaled up
            const x = Math.random() * 2048 - 800;
            const y = Math.random() * 2048 - 300;

            // Random slant or straight
            if (Math.random() > 0.5) {
                ctx.save();
                ctx.translate(x, y);
                ctx.rotate(Math.random() * 0.5 - 0.25);
                ctx.fillRect(0, 0, w, h);
                ctx.restore();
            } else {
                ctx.fillRect(x, y, w, h);
            }
        }

        // Add some "scanlines" or static to the patchwork
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = '#FFF';
        for (let j = 0; j < 2048; j += 4) { // Still 4px scanlines? Or scale? Keep 4px, relative density increases.
            if (Math.random() > 0.5) ctx.fillRect(0, j, 2048, 1);
        }

        return canvas.toDataURL('image/png');
    }


}

// Export for window
window.YodicaGenerator = YodicaGenerator;
