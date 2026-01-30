
class ColorWheel {
    constructor(canvas, options = {}) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.size = Math.min(canvas.width, canvas.height);
        this.cx = canvas.width / 2;
        this.cy = canvas.height / 2;
        this.radius = (this.size / 2) - 10;

        this.hue = options.hue || 0;
        this.sat = options.sat || 0; // 0-100
        this.color = options.color || 'white';

        this.onChange = options.onChange || null;

        this.isDragging = false;

        this.bindEvents();
        this.draw();
    }

    bindEvents() {
        const start = (e) => {
            if (e.type === 'mousedown' || e.type === 'touchstart') {
                this.isDragging = true;
                this.handleInput(e);
            }
        };

        const move = (e) => {
            if (this.isDragging) {
                e.preventDefault();
                this.handleInput(e);
            }
        };

        const end = () => {
            this.isDragging = false;
        };

        this.canvas.addEventListener('mousedown', start);
        window.addEventListener('mousemove', move);
        window.addEventListener('mouseup', end);

        this.canvas.addEventListener('touchstart', start, { passive: false });
        window.addEventListener('touchmove', move, { passive: false });
        window.addEventListener('touchend', end);
    }

    handleInput(e) {
        const rect = this.canvas.getBoundingClientRect();
        let clientX = e.clientX;
        let clientY = e.clientY;

        if (e.touches && e.touches.length > 0) {
            clientX = e.touches[0].clientX;
            clientY = e.touches[0].clientY;
        }

        const dx = clientX - rect.left - this.cx;
        const dy = clientY - rect.top - this.cy;

        // Calculate Angle (Hue)
        let angle = Math.atan2(dy, dx) * (180 / Math.PI);
        if (angle < 0) angle += 360;
        this.hue = angle;

        // Calculate Distance (Saturation)
        const dist = Math.sqrt(dx * dx + dy * dy);
        this.sat = Math.min(100, (dist / this.radius) * 100);

        this.draw();

        if (this.onChange) {
            this.onChange({ hue: this.hue, sat: this.sat });
        }
    }

    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw Wheel Gradient
        for (let i = 0; i < 360; i++) {
            const startAngle = (i - 2) * (Math.PI / 180);
            const endAngle = (i + 2) * (Math.PI / 180);

            this.ctx.beginPath();
            this.ctx.moveTo(this.cx, this.cy);
            this.ctx.arc(this.cx, this.cy, this.radius, startAngle, endAngle);
            this.ctx.closePath();
            this.ctx.fillStyle = `hsl(${i}, 100%, 50%)`;
            this.ctx.fill();
        }

        // Overlay Gradient (White center to transparent) for Saturation
        const grad = this.ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, this.radius);
        grad.addColorStop(0, 'rgba(128, 128, 128, 1)'); // Start at mid-grey (neutral)
        grad.addColorStop(1, 'rgba(128, 128, 128, 0)');
        // Actually, for color grading, center is usually neutral (no tint). 
        // 0 saturation = no effect.

        // Draw Inner Circle (Visual Backdrop)
        this.ctx.globalCompositeOperation = 'destination-in';
        this.ctx.beginPath();
        this.ctx.arc(this.cx, this.cy, this.radius, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.globalCompositeOperation = 'source-over';

        // Draw Puck
        const rad = this.hue * (Math.PI / 180);
        const dist = (this.sat / 100) * this.radius;
        const px = this.cx + Math.cos(rad) * dist;
        const py = this.cy + Math.sin(rad) * dist;

        // Puck body
        this.ctx.beginPath();
        this.ctx.arc(px, py, 6, 0, Math.PI * 2);
        this.ctx.strokeStyle = '#fff';
        this.ctx.lineWidth = 2;
        this.ctx.stroke();

        // Fill puck with current color
        this.ctx.fillStyle = `hsl(${this.hue}, ${this.sat}%, 50%)`;
        this.ctx.fill();
    }

    setValue(hue, sat) {
        this.hue = hue || 0;
        this.sat = sat || 0;
        this.draw();
    }

    reset() {
        this.hue = 0;
        this.sat = 0;
        this.draw();
        if (this.onChange) this.onChange({ hue: 0, sat: 0 });
    }
}
