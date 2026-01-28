/**
 * UNTITLED STUDIO - TONE CURVE
 * Interactive bezier curve for RGB tonal adjustments
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized LUT generation (only regenerates when points change)
 * - Cached point hashes for change detection
 * - Event listener cleanup via destroy()
 * 
 * TV GIRL POLISH:
 * - Hot Pink glow on dragged nodes
 */

/**
 * UNTITLED STUDIO - TONE CURVE
 * Interactive bezier curve for RGB tonal adjustments
 * 
 * PERFORMANCE OPTIMIZATIONS:
 * - Memoized LUT generation (only regenerates when points change)
 * - Cached point hashes for change detection
 * - Event listener cleanup via destroy()
 * 
 * TV GIRL POLISH:
 * - Hot Pink glow on dragged nodes
 * - Selection ring for active point
 */

class ToneCurve {
    constructor(svgElement, onChange, onSelectionChange) {
        this.svg = svgElement;
        this.onChange = onChange;
        this.onSelectionChange = onSelectionChange; // Callback for UI updates

        // Curve dimensions
        this.width = 256;
        this.height = 256;
        this.padding = 8;

        // Control points for each channel
        this.channels = {
            rgb: [
                { x: 0, y: 0 },
                { x: 0.25, y: 0.25 },
                { x: 0.75, y: 0.75 },
                { x: 1, y: 1 }
            ],
            r: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            g: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
            b: [{ x: 0, y: 0 }, { x: 1, y: 1 }]
        };

        // Current active channel
        this.activeChannel = 'rgb';

        // State
        this.dragging = null;
        this.selectedPointIndex = -1;
        this.dragOffset = { x: 0, y: 0 };

        // LUT texture data and memoization
        this.lutData = new Uint8Array(256);
        this.lastPointsHash = null;

        // Bound event handlers
        this._boundMouseDown = this.handleMouseDown.bind(this);
        this._boundMouseMove = this.handleMouseMove.bind(this);
        this._boundMouseUp = this.handleMouseUp.bind(this);
        this._boundMouseLeave = this.handleMouseUp.bind(this);
        this._boundTouchStart = this.handleTouchStart.bind(this);
        this._boundTouchMove = this.handleTouchMove.bind(this);
        this._boundTouchEnd = this.handleMouseUp.bind(this);

        // Initialize
        this.init();
    }

    /**
     * Initialize the curve editor
     */
    init() {
        this.svg.setAttribute('viewBox', `0 0 ${this.width} ${this.height}`);

        // Create groups
        this.gridGroup = this.createSVGElement('g', { class: 'curve-grid' });
        this.curveGroup = this.createSVGElement('g', { class: 'curve-path' });
        this.pointsGroup = this.createSVGElement('g', { class: 'curve-points' });

        this.svg.appendChild(this.gridGroup);
        this.svg.appendChild(this.curveGroup);
        this.svg.appendChild(this.pointsGroup);

        // Draw grid
        this.drawGrid();

        // Draw initial curve
        this.draw();
        this.generateLUT(); // Initial LUT

        // Event listeners with bound handlers
        this.svg.addEventListener('mousedown', this._boundMouseDown);
        this.svg.addEventListener('mousemove', this._boundMouseMove);
        this.svg.addEventListener('mouseup', this._boundMouseUp);
        this.svg.addEventListener('mouseleave', this._boundMouseLeave);
        // Note: dblclick listener removed

        // Touch support
        this.svg.addEventListener('touchstart', this._boundTouchStart, { passive: false });
        this.svg.addEventListener('touchmove', this._boundTouchMove, { passive: false });
        this.svg.addEventListener('touchend', this._boundTouchEnd);
    }

    /**
     * Create SVG element helper
     */
    createSVGElement(type, attrs = {}) {
        const el = document.createElementNS('http://www.w3.org/2000/svg', type);
        Object.entries(attrs).forEach(([key, value]) => el.setAttribute(key, value));
        return el;
    }

    /**
     * Draw background grid
     */
    drawGrid() {
        const step = this.width / 4;

        // Vertical lines
        for (let i = 0; i <= 4; i++) {
            const line = this.createSVGElement('line', {
                x1: i * step,
                y1: 0,
                x2: i * step,
                y2: this.height,
                stroke: 'rgba(255,255,255,0.1)',
                'stroke-width': 1
            });
            this.gridGroup.appendChild(line);
        }

        // Horizontal lines
        for (let i = 0; i <= 4; i++) {
            const line = this.createSVGElement('line', {
                x1: 0,
                y1: i * step,
                x2: this.width,
                y2: i * step,
                stroke: 'rgba(255,255,255,0.1)',
                'stroke-width': 1
            });
            this.gridGroup.appendChild(line);
        }

        // Diagonal reference line
        const diagonal = this.createSVGElement('line', {
            x1: 0,
            y1: this.height,
            x2: this.width,
            y2: 0,
            stroke: 'rgba(255,255,255,0.2)',
            'stroke-width': 1,
            'stroke-dasharray': '4,4'
        });
        this.gridGroup.appendChild(diagonal);
    }

    /**
     * Generate hash of current points for memoization
     */
    getPointsHash() {
        const points = this.channels[this.activeChannel];
        return points.map(p => `${p.x.toFixed(4)},${p.y.toFixed(4)}`).join('|');
    }

    /**
     * Draw the curve and control points
     */
    draw() {
        // Clear previous
        this.curveGroup.innerHTML = '';
        this.pointsGroup.innerHTML = '';

        const points = this.channels[this.activeChannel];

        // Generate smooth curve path
        const pathData = this.generateCurvePath(points);

        // Curve color based on channel
        const colors = {
            rgb: '#ffffff',
            r: '#ed2788',
            g: '#4ade80',
            b: '#3CA2C8'
        };

        const curve = this.createSVGElement('path', {
            d: pathData,
            fill: 'none',
            stroke: colors[this.activeChannel],
            'stroke-width': 2,
            'stroke-linecap': 'round'
        });
        this.curveGroup.appendChild(curve);

        // Draw control points
        points.forEach((point, index) => {
            const cx = point.x * this.width;
            const cy = (1 - point.y) * this.height;
            const isEndpoint = index === 0 || index === points.length - 1;
            const isDragged = this.dragging === index;
            const isSelected = this.selectedPointIndex === index;

            // Halo for selected point
            if (isSelected) {
                const halo = this.createSVGElement('circle', {
                    cx,
                    cy,
                    r: 12,
                    fill: 'none',
                    stroke: colors[this.activeChannel],
                    'stroke-width': 1,
                    class: 'animate-pulse opacity-50'
                });
                this.pointsGroup.appendChild(halo);
            }

            const circle = this.createSVGElement('circle', {
                cx,
                cy,
                r: isSelected ? 8 : (isEndpoint ? 4 : 6),
                fill: isSelected ? colors[this.activeChannel] : '#121212',
                stroke: colors[this.activeChannel],
                'stroke-width': 2,
                'data-index': index,
                class: 'curve-point',
                style: `cursor: pointer; ${isDragged ? 'filter: drop-shadow(0 0 8px #ed2788) drop-shadow(0 0 12px #ed2788);' : ''}`
            });

            this.pointsGroup.appendChild(circle);
        });

        this.notifySelection();
    }

    /**
     * Generate smooth bezier curve path through points
     */
    generateCurvePath(points) {
        if (points.length < 2) return '';

        const scaled = points.map(p => ({
            x: p.x * this.width,
            y: (1 - p.y) * this.height
        }));

        let path = `M ${scaled[0].x} ${scaled[0].y}`;

        if (scaled.length === 2) {
            path += ` L ${scaled[1].x} ${scaled[1].y}`;
        } else {
            // Catmull-Rom to Bezier conversion for smooth curve
            for (let i = 0; i < scaled.length - 1; i++) {
                const p0 = scaled[Math.max(0, i - 1)];
                const p1 = scaled[i];
                const p2 = scaled[i + 1];
                const p3 = scaled[Math.min(scaled.length - 1, i + 2)];

                // Control points
                const cp1x = p1.x + (p2.x - p0.x) / 6;
                const cp1y = p1.y + (p2.y - p0.y) / 6;
                const cp2x = p2.x - (p3.x - p1.x) / 6;
                const cp2y = p2.y - (p3.y - p1.y) / 6;

                path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
            }
        }

        return path;
    }

    /**
     * Generate LUT from curve with memoization
     * Only regenerates if points have changed
     */
    generateLUT() {
        const currentHash = this.getPointsHash();

        // Skip if points haven't changed (memoization)
        if (currentHash === this.lastPointsHash) {
            return;
        }

        this.lastPointsHash = currentHash;

        const points = this.channels[this.activeChannel];

        // Sort points by x
        const sorted = [...points].sort((a, b) => a.x - b.x);

        // Interpolate for each of 256 values
        for (let i = 0; i < 256; i++) {
            const x = i / 255;
            let y = this.interpolateCurve(sorted, x);
            y = Math.max(0, Math.min(1, y));
            this.lutData[i] = Math.round(y * 255);
        }

        // Notify change
        if (this.onChange) {
            this.onChange(this.lutData, this.activeChannel);
        }
    }

    /**
     * Catmull-Rom interpolation
     */
    interpolateCurve(points, x) {
        if (points.length < 2) return x;

        // Find surrounding points
        let i = 0;
        while (i < points.length - 1 && points[i + 1].x < x) i++;

        if (i >= points.length - 1) return points[points.length - 1].y;

        const p0 = points[Math.max(0, i - 1)];
        const p1 = points[i];
        const p2 = points[i + 1];
        const p3 = points[Math.min(points.length - 1, i + 2)];

        // Catmull-Rom interpolation
        const t = (x - p1.x) / (p2.x - p1.x);
        const t2 = t * t;
        const t3 = t2 * t;

        const y = 0.5 * (
            (2 * p1.y) +
            (-p0.y + p2.y) * t +
            (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 +
            (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3
        );

        return y;
    }

    /**
     * Get SVG coordinates from mouse event
     */
    getSVGCoords(e) {
        const rect = this.svg.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = 1 - (e.clientY - rect.top) / rect.height;
        return { x: Math.max(0, Math.min(1, x)), y: Math.max(0, Math.min(1, y)) };
    }

    /**
     * Handle mouse down
     */
    handleMouseDown(e) {
        // Find if we clicked a point
        let targetIndex = -1;

        if (e.target.classList.contains('curve-point')) {
            targetIndex = parseInt(e.target.getAttribute('data-index'));
        } else {
            // Proximity check for easier selection
            const coords = this.getSVGCoords(e);
            const points = this.channels[this.activeChannel];
            let minDist = 0.1; // ~25px threshold

            points.forEach((point, index) => {
                const dx = point.x - coords.x;
                const dy = point.y - coords.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < minDist) {
                    minDist = dist;
                    targetIndex = index;
                }
            });
        }

        if (targetIndex !== -1) {
            this.dragging = targetIndex;
            this.selectedPointIndex = targetIndex;

            const coords = this.getSVGCoords(e);
            const point = this.channels[this.activeChannel][targetIndex];
            this.dragOffset = { x: point.x - coords.x, y: point.y - coords.y };

            this.draw(); // Update visuals
            e.preventDefault();
        } else {
            // Deselect if clicking background
            if (this.selectedPointIndex !== -1) {
                this.selectedPointIndex = -1;
                this.draw();
            }
        }
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        if (this.dragging === null) return;

        const coords = this.getSVGCoords(e);
        const points = this.channels[this.activeChannel];
        const index = this.dragging;

        // First and last points can only move vertically
        if (index === 0) {
            points[index].y = Math.max(0, Math.min(1, coords.y + this.dragOffset.y));
        } else if (index === points.length - 1) {
            points[index].y = Math.max(0, Math.min(1, coords.y + this.dragOffset.y));
        } else {
            // Constrain x between neighbors
            const minX = points[index - 1].x + 0.01;
            const maxX = points[index + 1].x - 0.01;

            points[index].x = Math.max(minX, Math.min(maxX, coords.x + this.dragOffset.x));
            points[index].y = Math.max(0, Math.min(1, coords.y + this.dragOffset.y));
        }

        this.draw();
        this.generateLUT(); // Will be skipped if hash unchanged

        e.preventDefault();
    }

    /**
     * Handle mouse up
     */
    handleMouseUp() {
        if (this.dragging !== null) {
            this.dragging = null;
            // Don't deselect on mouse up, keep it selected for deletion
            this.draw();
        }
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            e.preventDefault(); // Stop scrolling/selection
            const touch = e.touches[0];

            // Delegate logic to mouse down handler
            this.handleMouseDown({
                clientX: touch.clientX,
                clientY: touch.clientY,
                target: e.target,
                preventDefault: () => e.preventDefault()
            });
        }
    }

    /**
     * Handle touch move
     */
    handleTouchMove(e) {
        if (e.touches.length === 1) {
            e.preventDefault(); // critical to prevent scrolling while dragging
            const touch = e.touches[0];
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => { }
            });
        }
    }

    /**
     * Add a new point at the center center/interpolated
     */
    addPoint() {
        const points = this.channels[this.activeChannel];

        // Find largest gap in X
        let maxGap = 0;
        let insertIndex = 1;

        for (let i = 0; i < points.length - 1; i++) {
            const gap = points[i + 1].x - points[i].x;
            if (gap > maxGap) {
                maxGap = gap;
                insertIndex = i + 1;
            }
        }

        const newX = points[insertIndex - 1].x + (maxGap / 2);
        // Calculate Y on the current curve at this X
        // We use our own interpolation to place it exactly on the line
        const newY = this.interpolateCurve(points, newX);

        const newPoint = { x: newX, y: Math.max(0, Math.min(1, newY)) };

        points.splice(insertIndex, 0, newPoint);
        this.selectedPointIndex = insertIndex;

        this.lastPointsHash = null;
        this.draw();
        this.generateLUT();
    }

    /**
     * Delete the currently selected point
     */
    deletePoint() {
        if (this.selectedPointIndex === -1) return;

        const points = this.channels[this.activeChannel];

        // Cannot delete start/end points
        if (this.selectedPointIndex === 0 || this.selectedPointIndex === points.length - 1) return;

        points.splice(this.selectedPointIndex, 1);
        this.selectedPointIndex = -1;

        this.lastPointsHash = null;
        this.draw();
        this.generateLUT();
    }

    /**
     * Notify external UI about selection state
     */
    notifySelection() {
        if (this.onSelectionChange) {
            const points = this.channels[this.activeChannel];
            const isSelected = this.selectedPointIndex !== -1;
            const isDeletable = isSelected && this.selectedPointIndex > 0 && this.selectedPointIndex < points.length - 1;

            this.onSelectionChange({
                hasSelection: isSelected,
                canDelete: isDeletable
            });
        }
    }

    /**
     * Set active channel
     */
    setChannel(channel) {
        this.activeChannel = channel;
        this.selectedPointIndex = -1;
        this.lastPointsHash = null; // Channel change invalidates cache
        this.draw();
        this.generateLUT();
    }

    /**
     * Reset current channel to linear
     */
    reset() {
        if (this.activeChannel === 'rgb') {
            this.channels.rgb = [
                { x: 0, y: 0 },
                { x: 0.25, y: 0.25 },
                { x: 0.75, y: 0.75 },
                { x: 1, y: 1 }
            ];
        } else {
            this.channels[this.activeChannel] = [
                { x: 0, y: 0 },
                { x: 1, y: 1 }
            ];
        }
        this.selectedPointIndex = -1;
        this.lastPointsHash = null;
        this.draw();
        this.generateLUT();
    }

    /**
     * Reset all channels
     */
    resetAll() {
        ['rgb', 'r', 'g', 'b'].forEach(ch => {
            this.activeChannel = ch;
            this.reset();
        });
        this.activeChannel = 'rgb';
        this.lastPointsHash = null;
        this.draw();
        this.generateLUT();
    }

    /**
     * Get LUT data for WebGL texture
     */
    getLUTData() {
        return this.lutData;
    }

    /**
     * Cleanup event listeners (prevents memory leaks)
     */
    destroy() {
        this.svg.removeEventListener('mousedown', this._boundMouseDown);
        this.svg.removeEventListener('mousemove', this._boundMouseMove);
        this.svg.removeEventListener('mouseup', this._boundMouseUp);
        this.svg.removeEventListener('mouseleave', this._boundMouseLeave);
        this.svg.removeEventListener('touchstart', this._boundTouchStart);
        this.svg.removeEventListener('touchmove', this._boundTouchMove);
        this.svg.removeEventListener('touchend', this._boundTouchEnd);

        // Clear references
        this.onChange = null;
        this.svg = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ToneCurve;
}
