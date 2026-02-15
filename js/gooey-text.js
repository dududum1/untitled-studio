/**
 * GOOEY TEXT EFFECT v2
 * Applies velocity-based SVG blur distortion to text.
 * Enhanced to remove filter when idle for perfect sharpness.
 */
class GooeyText {
    constructor(selector = '.logo') {
        this.element = document.querySelector(selector);
        this.svgBlur = document.querySelector('#gooey feGaussianBlur');
        this.maxDeviation = 10;
        this.currentDeviation = 0;
        this.targetDeviation = 0;

        this.lastX = 0;
        this.lastY = 0;
        this.lastTime = performance.now();

        this.velocityScale = 2; // Sensitivity
        this.decay = 0.15; // Smoothness

        if (this.svgBlur && this.element) {
            this.init();
        } else {
            console.warn('GooeyText: Elements not found', { svg: !!this.svgBlur, el: !!this.element });
        }
    }

    init() {
        document.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.animate();
    }

    handleMouseMove(e) {
        const now = performance.now();
        const dt = now - this.lastTime;

        if (dt > 0) {
            const dx = e.clientX - this.lastX;
            const dy = e.clientY - this.lastY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Velocity in pixels per ms
            const velocity = dist / dt;

            this.targetDeviation = Math.min(velocity * this.velocityScale, this.maxDeviation);

            this.lastX = e.clientX;
            this.lastY = e.clientY;
            this.lastTime = now;
        }
    }

    animate() {
        // Decay targetDeviation
        this.targetDeviation *= 0.85;

        // LERP current towards target
        this.currentDeviation += (this.targetDeviation - this.currentDeviation) * this.decay;

        // Clamp small values and manage filter
        if (this.currentDeviation < 0.1) {
            this.currentDeviation = 0;
            this.element.style.filter = 'none'; // Ensure sharpness
        } else {
            this.element.style.filter = 'url(#gooey)';
        }

        // Apply to SVG
        this.svgBlur.setAttribute('stdDeviation', this.currentDeviation);

        requestAnimationFrame(() => this.animate());
    }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
    // Target .logo (inside header)
    new GooeyText('.logo');
});
