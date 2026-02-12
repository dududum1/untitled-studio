/**
 * SCRUBBER — Virtual Potentiometer Engine
 * Turns numeric displays into draggable inputs with pointer lock.
 * Features:
 * - Click & Drag to adjust value
 * - Pointer Lock (hides cursor, infinite scroll)
 * - Modifiers: Shift (10x), Alt (0.1x)
 * - Floating delta label
 */
class Scrubber {
    constructor() {
        this.active = false;
        this.targetInput = null;
        this.startX = 0;
        this.currentValue = 0;
        this.sensitivity = 1;
        this.step = 0.01; // Default
        this.label = null;

        this.initLabel();
        this.bindEvents();
    }

    initLabel() {
        this.label = document.createElement('div');
        this.label.id = 'scrub-label';
        this.label.className = 'fixed hidden pointer-events-none z-[1000] px-2 py-1 rounded bg-glass backdrop-blur text-xs font-bold font-mono text-accent border border-glass-border shadow-lg transform -translate-x-1/2 -translate-y-full mt-[-10px]';
        document.body.appendChild(this.label);
    }

    bindEvents() {
        // Delegate mousedown for any [data-scrub] element
        document.addEventListener('mousedown', (e) => {
            const scrubber = e.target.closest('[data-scrub]');
            if (!scrubber) return;

            const inputId = scrubber.dataset.scrub;
            const input = document.getElementById(inputId);
            if (!input) return;

            e.preventDefault();
            this.startScub(scrubber, input, e);
        });

        document.addEventListener('mousemove', (e) => this.onMove(e));
        document.addEventListener('mouseup', () => this.stopScrub());

        // Handle pointer lock errors/release
        document.addEventListener('pointerlockchange', () => {
            if (!document.pointerLockElement && this.active) {
                this.stopScrub();
            }
        });
    }

    startScub(el, input, e) {
        this.active = true;
        this.targetInput = input;
        this.currentValue = parseFloat(input.value);

        // Determine step/sensitivity from input attributes
        this.step = parseFloat(input.step) || 0.1;
        this.sensitivity = 1; // Base sensitivity

        // Request Pointer Lock for infinite drag & hidden cursor
        el.requestPointerLock = el.requestPointerLock || el.mozRequestPointerLock;
        el.requestPointerLock();

        // Show Label
        this.updateLabel(0, e.clientX, e.clientY);
        this.label.classList.remove('hidden');
        document.body.classList.add('scrubbing');
        el.classList.add('text-accent');
    }

    onMove(e) {
        if (!this.active || !this.targetInput) return;

        let deltaX = e.movementX;

        // Modifiers
        let multiplier = 1;
        if (e.shiftKey) multiplier = 10;
        if (e.altKey) multiplier = 0.1;

        // Calculate new value
        // Adjusted sensitivity: 1px = 1 step * multiplier
        // May need tuning based on feel
        const change = deltaX * this.step * multiplier;

        let newValue = this.currentValue + change;

        // Constraints
        const min = parseFloat(this.targetInput.min);
        const max = parseFloat(this.targetInput.max);

        if (!isNaN(min)) newValue = Math.max(min, newValue);
        if (!isNaN(max)) newValue = Math.min(max, newValue);

        // Update Input
        this.targetInput.value = newValue;
        this.currentValue = newValue;

        // Dispatch Event for App Logic
        this.targetInput.dispatchEvent(new Event('input', { bubbles: true }));

        // Update Label
        this.updateLabel(change > 0 ? `+${change.toFixed(2)}` : change.toFixed(2));
    }

    updateLabel(text, x, y) {
        // If pointer blocked, we might not get x/y in move event easily without caching
        // But with pointer lock, the cursor stays in place visually (or hidden).
        // Actually, with pointer lock, the cursor is hidden, so label position should probably be fixed 
        // at the start position or center of screen?
        // Let's keep it simple: Show label at the ELEMENT position

        if (x !== undefined && y !== undefined) {
            this.label.style.left = x + 'px';
            this.label.style.top = y + 'px';
        }

        this.label.textContent = text;
    }

    stopScrub() {
        if (!this.active) return;

        this.active = false;
        document.exitPointerLock = document.exitPointerLock || document.mozExitPointerLock;
        document.exitPointerLock();

        this.label.classList.add('hidden');
        document.body.classList.remove('scrubbing');

        // Remove text-accent from all scrubbers (lazy cleanup)
        document.querySelectorAll('[data-scrub]').forEach(el => el.classList.remove('text-accent'));

        this.targetInput = null;
    }
}

// Init
window.Scrubber = new Scrubber();
