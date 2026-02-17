/**
 * Hanalogital Procedural Texture Generator
 * Simulates pre-exposed "Soup" and "Galaxy" effects.
 * 
 * - Solaris: Galaxy/Nebula overlays
 * - Renegade: Lightning bolts / Red static
 * - Fuel: Toxic green/yellow leaks
 * - Flux: Purple/Blue motion streaks
 */
class HanalogitalGenerator {
    static generate(textureName) {
        console.log(`[Hanalogital] Procedurally generating: ${textureName}`);
        switch (textureName) {
            case 'solaris':
                return this.generateSolaris();
            case 'renegade':
                return this.generateRenegade();
            case 'fuel':
                return this.generateFuel();
            case 'flux':
                return this.generateFlux();
            default:
                return null;
        }
    }

    static generateSolaris() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        // Deep Space Background
        ctx.fillStyle = '#050010'; // Very dark purple/black
        ctx.fillRect(0, 0, 1024, 1024);

        // Stars
        for (let i = 0; i < 300; i++) {
            ctx.fillStyle = Math.random() > 0.9 ? '#fff' : 'rgba(255, 255, 255, 0.5)';
            const size = Math.random() * 2;
            ctx.beginPath();
            ctx.arc(Math.random() * 1024, Math.random() * 1024, size, 0, Math.PI * 2);
            ctx.fill();
        }

        // Nebula Clouds (Multiple passes)
        function drawNebula(color, x, y, radius) {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
            grad.addColorStop(0, color);
            grad.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = grad;
            ctx.globalCompositeOperation = 'screen';
            ctx.beginPath();
            ctx.arc(x, y, radius, 0, Math.PI * 2);
            ctx.fill();
        }

        // Randomize nebula positions
        drawNebula('rgba(255, 0, 100, 0.4)', Math.random() * 800 + 100, Math.random() * 800 + 100, 400);
        drawNebula('rgba(100, 0, 255, 0.3)', Math.random() * 800 + 100, Math.random() * 800 + 100, 500);
        drawNebula('rgba(0, 255, 200, 0.2)', Math.random() * 800 + 100, Math.random() * 800 + 100, 300);

        return canvas.toDataURL('image/png');
    }

    static generateRenegade() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000000'; // Black background (will be Screen blended)
        ctx.fillRect(0, 0, 1024, 1024);

        // Lightning Function
        function drawLightning(x, y, length, angle, branchWidth) {
            if (length < 10) return;

            ctx.beginPath();
            ctx.moveTo(x, y);
            const endX = x + Math.cos(angle) * length;
            const endY = y + Math.sin(angle) * length;

            // Jitter the line
            let currX = x;
            let currY = y;
            const segments = 10;

            ctx.strokeStyle = '#ff3030'; // Red lightning
            ctx.lineWidth = branchWidth;
            ctx.shadowBlur = 10;
            ctx.shadowColor = '#ff0000';

            for (let i = 0; i < segments; i++) {
                currX += (Math.cos(angle) * length / segments) + (Math.random() - 0.5) * 50;
                currY += (Math.sin(angle) * length / segments) + (Math.random() - 0.5) * 50;
                ctx.lineTo(currX, currY);
            }
            ctx.stroke();

            // Recursion
            if (Math.random() > 0.5) {
                drawLightning(currX, currY, length * 0.6, angle + 0.3, branchWidth * 0.7);
            }
            if (Math.random() > 0.5) {
                drawLightning(currX, currY, length * 0.6, angle - 0.3, branchWidth * 0.7);
            }
        }

        // 2-3 Bolts
        for (let i = 0; i < 3; i++) {
            drawLightning(Math.random() * 1024, 0, 800, Math.PI / 2 + (Math.random() - 0.5), 3);
        }

        return canvas.toDataURL('image/png');
    }

    static generateFuel() {
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        ctx.clearRect(0, 0, 1024, 1024);

        // Toxic Green/Yellow Leaks
        const colors = ['rgba(173, 255, 47, 0.5)', 'rgba(50, 205, 50, 0.4)', 'rgba(255, 255, 0, 0.3)'];

        ctx.filter = 'blur(60px)';
        ctx.globalCompositeOperation = 'screen';

        for (let i = 0; i < 5; i++) {
            ctx.fillStyle = colors[i % 3];
            ctx.beginPath();
            ctx.arc(
                Math.random() * 1024, // x
                1024,                 // y (bottom up)
                Math.random() * 300 + 200, // radius
                0, Math.PI * 2
            );
            ctx.fill();
        }

        return canvas.toDataURL('image/png');
    }

    static generateFlux() {
        // Purple/Blue streaks
        const canvas = document.createElement('canvas');
        canvas.width = 1024;
        canvas.height = 1024;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 1024, 1024);

        ctx.lineWidth = 100;
        ctx.filter = 'blur(40px)';
        ctx.globalCompositeOperation = 'screen';

        // Draw streaks
        for (let i = 0; i < 4; i++) {
            const grad = ctx.createLinearGradient(0, 0, 1024, 1024);
            grad.addColorStop(0, 'rgba(75, 0, 130, 0)');
            grad.addColorStop(0.5, 'rgba(138, 43, 226, 0.6)');
            grad.addColorStop(1, 'rgba(0, 0, 255, 0)');

            ctx.strokeStyle = grad;
            ctx.beginPath();
            ctx.moveTo(Math.random() * -200, Math.random() * 1024);
            ctx.lineTo(Math.random() * 1200, Math.random() * 1024);
            ctx.stroke();
        }

        return canvas.toDataURL('image/png');
    }
}

window.HanalogitalGenerator = HanalogitalGenerator;
