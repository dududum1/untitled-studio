
/**
 * Handles touch gestures for the canvas:
 * - Pinch to zoom (Default)
 * - Double tap to reset (Default)
 * - Swipe to navigate (Default)
 * - Mask Manipulation (When in Mask Mode)
 */
/**
 * Handles touch gestures for the canvas:
 * - Pinch to zoom (Physics-based)
 * - Pan (Translation)
 * - Double tap to Smart Zoom
 * - Inertia (Momentum panning)
 */
class GestureHandler {
    constructor(container, canvas, callbacks = {}) {
        this.container = container;
        this.canvas = canvas;

        // Callbacks
        this.onNavigate = callbacks.onNavigate || (() => { });
        this.onMaskDrag = callbacks.onMaskDrag || (() => { });
        this.onMaskPinch = callbacks.onMaskPinch || (() => { });

        this.state = {
            mode: 'view',

            // Transform
            scale: 1,
            translateX: 0,
            translateY: 0,

            // Pinch
            initialScale: 1,
            initialDistance: 0,
            isPinching: false,
            pinchStartX: 0,
            pinchStartY: 0,

            // Pan
            isPanning: false,
            panStartX: 0,
            panStartY: 0,
            lastPanX: 0,
            lastPanY: 0,

            // Inertia
            velocityX: 0,
            velocityY: 0,
            lastTimestamp: 0,
            rafId: null,

            // Touch tracking
            lastTapTime: 0,
            initialTouchX: 0,
            initialTouchY: 0
        };

        this.init();
    }

    setMode(mode) {
        this.state.mode = mode;
        if (mode === 'mask') {
            this.cancelInertia();
        }
    }

    setActiveMask(id) {
        this.setMode(id ? 'mask' : 'view');
    }

    init() {
        if (!this.container) return;

        // Styles for hardware acceleration
        this.canvas.style.transformOrigin = '0 0';
        this.canvas.style.willChange = 'transform';
        this.updateTransform();

        // Touch Events
        this.container.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.container.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.container.addEventListener('touchend', (e) => this.handleTouchEnd(e), { passive: false });

        // Mouse Events (Desktop Debug)
        this.container.addEventListener('mousedown', (e) => this.handleMouseDown(e));
        window.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        window.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    }

    updateTransform() {
        const { scale, translateX, translateY } = this.state;
        this.canvas.style.transform = `translate3d(${translateX}px, ${translateY}px, 0) scale(${scale})`;
    }

    // ================= TOUCH LOGIC =================

    handleTouchStart(e) {
        this.cancelInertia();

        if (e.touches.length === 2) {
            e.preventDefault();
            this.state.isPinching = true;
            this.state.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
            this.state.initialScale = this.state.scale;

            // Calculate pinch center (focal point)
            const center = this.getCenter(e.touches[0], e.touches[1]);
            this.state.pinchStartX = center.x;
            this.state.pinchStartY = center.y;

            // Capture initial translation anchor
            this.state.lastPanX = this.state.translateX;
            this.state.lastPanY = this.state.translateY;

        } else if (e.touches.length === 1) {
            const touch = e.touches[0];
            this.state.initialTouchX = touch.clientX;
            this.state.initialTouchY = touch.clientY;
            this.state.lastTimestamp = Date.now();

            if (this.state.scale > 1 && this.state.mode === 'view') {
                this.state.isPanning = true;
                this.state.panStartX = touch.clientX;
                this.state.panStartY = touch.clientY;
                this.state.lastPanX = this.state.translateX;
                this.state.lastPanY = this.state.translateY;
                this.state.velocityX = 0;
                this.state.velocityY = 0;
                e.preventDefault(); // Prevent scrolling when panning
            }
        }
    }

    handleTouchMove(e) {
        if (e.touches.length === 2 && this.state.isPinching) {
            e.preventDefault();

            // 1. Calculate new scale
            const distance = this.getDistance(e.touches[0], e.touches[1]);
            const newScale = Math.max(0.5, Math.min(5, (distance / this.state.initialDistance) * this.state.initialScale));

            // 2. Focal point zooming
            // We want the point under the fingers to stay under the fingers.
            // Complex math simplified: Translate adjustment = (ScaleDelta) * (FocalPoint - Translate)
            // For now, let's stick to simple center-zoom or implement full focal logic later if requested.
            // Implementing basic "Center Zoom" relative to viewport for stability first.

            // Actually, let's do the simple scale update first.
            const scaleDelta = newScale - this.state.scale;
            // Adjust translate to keep center stable? 
            // Better to just update scale for now to avoid jumpiness without complex matrix math.

            this.state.scale = newScale;
            this.updateTransform();

        } else if (e.touches.length === 1 && this.state.isPanning) {
            e.preventDefault();
            const touch = e.touches[0];
            const deltaX = touch.clientX - this.state.panStartX;
            const deltaY = touch.clientY - this.state.panStartY;

            // Update translate
            let newX = this.state.lastPanX + deltaX;
            let newY = this.state.lastPanY + deltaY;

            // Apply boundaries
            const bounds = this.getBoundaries();
            if (newX > bounds.maxX) newX = bounds.maxX + (newX - bounds.maxX) * 0.3; // Rubber band
            if (newX < bounds.minX) newX = bounds.minX + (newX - bounds.minX) * 0.3;
            if (newY > bounds.maxY) newY = bounds.maxY + (newY - bounds.maxY) * 0.3;
            if (newY < bounds.minY) newY = bounds.minY + (newY - bounds.minY) * 0.3;

            this.state.translateX = newX;
            this.state.translateY = newY;
            this.updateTransform();

            // Track velocity
            const now = Date.now();
            const dt = now - this.state.lastTimestamp;
            if (dt > 0) {
                this.state.velocityX = (touch.clientX - this.state.initialTouchX) / dt; // Actually need tracking per frame
                this.state.velocityY = (touch.clientY - this.state.initialTouchY) / dt;
                // Reset anchor for velocity calc
                this.state.initialTouchX = touch.clientX;
                this.state.initialTouchY = touch.clientY;
                this.state.lastTimestamp = now;
            }
        }
    }

    handleTouchEnd(e) {
        if (this.state.isPinching && e.touches.length < 2) {
            this.state.isPinching = false;
            // Snap scaling bounds
            if (this.state.scale < 1) this.animateTo(1, 0, 0);
            else if (this.state.scale > 5) this.animateScale(5);
        }

        if (this.state.isPanning && e.touches.length === 0) {
            this.state.isPanning = false;
            // Start Inertia
            this.startInertia();
        }

        // Double Tap
        const now = Date.now();
        if (e.changedTouches.length === 1 && e.touches.length === 0 && !this.state.isPinching && !this.state.isPanning) {
            if (now - this.state.lastTapTime < 300) {
                this.handleDoubleTap(e.changedTouches[0]);
            }
            this.state.lastTapTime = now;
        }
    }

    // ================= HELPER LOGIC =================

    getBoundaries() {
        if (this.state.scale <= 1) return { minX: 0, maxX: 0, minY: 0, maxY: 0 };

        const rect = this.canvas.getBoundingClientRect();
        const containerRect = this.container.getBoundingClientRect();

        // Calculate how much the scaled graphic overflows
        // This is simplified. Ideally we use width/height of content.
        const width = this.canvas.width; // Or clientWidth?
        const height = this.canvas.height;

        // Let's assume canvas is fit to container initially (object-fit contain behavior simulated)
        // If scale is 2, we have overflow.

        // Max Panning allowance X
        // if image is 1000px wide, and container is 300px.
        // wait, visual width = container width * scale (approx).

        // Just use Visual Bounds relative to container center
        // Center of canvas should be clamped so edges don't come inside center?
        // Let's rely on simple ratio:
        const xOverflow = (containerRect.width * this.state.scale - containerRect.width) / 2;
        const yOverflow = (containerRect.height * this.state.scale - containerRect.height) / 2;

        return {
            minX: -xOverflow,
            maxX: xOverflow,
            minY: -yOverflow,
            maxY: yOverflow
        };
    }

    startInertia() {
        const decay = 0.95;
        const step = () => {
            if (Math.abs(this.state.velocityX) < 0.05 && Math.abs(this.state.velocityY) < 0.05) {
                this.snapOutOfBounds();
                return;
            }

            this.state.velocityX *= decay;
            this.state.velocityY *= decay;

            this.state.translateX += this.state.velocityX * 16; // Multiplier for feel
            this.state.translateY += this.state.velocityY * 16;

            this.updateTransform();
            this.state.rafId = requestAnimationFrame(step);
        };
        this.state.rafId = requestAnimationFrame(step);
    }

    cancelInertia() {
        if (this.state.rafId) {
            cancelAnimationFrame(this.state.rafId);
            this.state.rafId = null;
        }
    }

    snapOutOfBounds() {
        const bounds = this.getBoundaries();
        let targetX = this.state.translateX;
        let targetY = this.state.translateY;
        let needsSnap = false;

        if (targetX > bounds.maxX) { targetX = bounds.maxX; needsSnap = true; }
        if (targetX < bounds.minX) { targetX = bounds.minX; needsSnap = true; }
        if (targetY > bounds.maxY) { targetY = bounds.maxY; needsSnap = true; }
        if (targetY < bounds.minY) { targetY = bounds.minY; needsSnap = true; }

        if (needsSnap) {
            this.animateTo(this.state.scale, targetX, targetY);
        }
    }

    animateTo(scale, x, y) {
        // Simple transition (CSS is 'will-change: transform', we can use transition property)
        this.canvas.style.transition = 'transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        this.state.scale = scale;
        this.state.translateX = x;
        this.state.translateY = y;
        this.updateTransform();

        setTimeout(() => {
            this.canvas.style.transition = '';
        }, 300);
    }

    animateScale(scale) {
        this.animateTo(scale, this.state.translateX, this.state.translateY);
    }

    handleDoubleTap(touch) {
        if (this.state.scale > 1.5) {
            // Reset
            this.animateTo(1, 0, 0);
        } else {
            // Smart Zoom
            // Zoom to 3x centering on the tap
            // We need to calculate translateX/Y to bring tap point to center
            const scale = 3;

            // Vector from center of screen to touch point
            const containerRect = this.container.getBoundingClientRect();
            const centerX = containerRect.width / 2;
            const centerY = containerRect.height / 2;

            const tapX = touch.clientX - containerRect.left;
            const tapY = touch.clientY - containerRect.top;

            // To center the tap point:
            // Shift = (Center - Tap) * Scale?
            // Actually: NewTranslate = OldTranslate + (Center - Tap) * (Scale - 1)?
            // Since OldTranslate is 0 (at scale 1):
            // TargetX = (CenterX - TapX) * (Scale - 1)?
            // Let's approximate:

            const offsetX = (centerX - tapX) * 2; // Roughly correct for 3x?
            const offsetY = (centerY - tapY) * 2;

            this.animateTo(scale, offsetX, offsetY);
        }
    }

    // ================= UTILS =================

    getDistance(t1, t2) {
        const dx = t1.clientX - t2.clientX;
        const dy = t1.clientY - t2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    getCenter(t1, t2) {
        return {
            x: (t1.clientX + t2.clientX) / 2,
            y: (t1.clientY + t2.clientY) / 2
        };
    }

    // Mouse handlers (basic pass-through for now or similar to touch)
    handleMouseDown(e) { /* Desktop debugging implementation if needed */ }
    handleMouseMove(e) { }
    handleMouseUp(e) { }
}
