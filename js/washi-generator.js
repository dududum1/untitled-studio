/**
 * Washi Procedural Texture Generator
 * Simulates organic paper fibers and technical film base defects.
 */
class WashiGenerator {
    static generate(textureName) {
        console.log(`[Washi] Procedurally generating: ${textureName}`);
        switch (textureName) {
            case 'w_paper':
                return this.generateWPaper();
            case 'd_leaks':
                return this.generateDLeaks();
            default:
                return null;
        }
    }

    static generateWPaper() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Base color (slightly off-white/cream paper tint)
        ctx.fillStyle = '#fdfaf5';
        ctx.fillRect(0, 0, 1024, 1024);

        // Organic Fibers (Kozo/Mulberry bark)
        ctx.strokeStyle = '#e0d8cc';
        ctx.lineCap = 'round';

        for (let i = 0; i < 400; i++) {
            ctx.beginPath();
            const x = Math.random() * 1024;
            const y = Math.random() * 1024;
            const length = Math.random() * 80 + 20;
            const angle = Math.random() * Math.PI * 2;

            ctx.lineWidth = Math.random() * 1.5 + 0.5;
            ctx.globalAlpha = Math.random() * 0.4 + 0.1;

            // Draw slightly curved fibers
            ctx.moveTo(x, y);
            const cp1x = x + Math.cos(angle) * (length / 2) + (Math.random() - 0.5) * 20;
            const cp1y = y + Math.sin(angle) * (length / 2) + (Math.random() - 0.5) * 20;
            const ex = x + Math.cos(angle) * length;
            const ey = y + Math.sin(angle) * length;

            ctx.quadraticCurveTo(cp1x, cp1y, ex, ey);
            ctx.stroke();
        }

        // Texture pulp spots
        for (let j = 0; j < 200; j++) {
            ctx.fillStyle = Math.random() > 0.5 ? '#dcd2c4' : '#ffffff';
            ctx.globalAlpha = Math.random() * 0.2;
            const size = Math.random() * 4 + 1;
            ctx.beginPath();
            ctx.arc(Math.random() * 1024, Math.random() * 1024, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Subtle noise for paper grain
        ctx.globalAlpha = 0.05;
        for (let k = 0; k < 1000; k++) {
            ctx.fillStyle = '#000';
            ctx.fillRect(Math.random() * 1024, Math.random() * 1024, 1, 1);
        }

        return canvas.toDataURL('image/png');
    }

    static generateDLeaks() {
        // Aerial stocks have unique light piping from the thin polyester base
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#00000000';
        ctx.clearRect(0, 0, 1024, 1024);

        // Warm light piping at edges
        const gradient = ctx.createLinearGradient(0, 0, 150, 0);
        gradient.addColorStop(0, 'rgba(255, 100, 50, 0.4)');
        gradient.addColorStop(1, 'rgba(255, 100, 50, 0)');

        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 150, 1024);

        const gradientRight = ctx.createLinearGradient(1024, 0, 874, 0);
        gradientRight.addColorStop(0, 'rgba(255, 50, 20, 0.3)');
        gradientRight.addColorStop(1, 'rgba(255, 50, 20, 0)');

        ctx.fillStyle = gradientRight;
        ctx.fillRect(874, 0, 150, 1024);

        return canvas.toDataURL('image/png');
    }
}

window.WashiGenerator = WashiGenerator;
