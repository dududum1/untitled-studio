/**
 * UNTITLED STUDIO - CROP TOOL
 * Crop, rotate, and flip functionality
 * 
 * MEMORY LEAK FIXES:
 * - Bound event handlers stored as properties
 * - destroy() method removes all document-level listeners
 */

class CropTool {
    constructor(container, onChange) {
        this.container = container;
        this.onChange = onChange;

        // Crop state
        this.isActive = false;
        this.cropRect = { x: 0, y: 0, width: 1, height: 1 }; // Normalized 0-1
        this.rotation = 0; // Degrees
        this.flipH = false;
        this.flipV = false;

        // Original image dimensions
        this.imageWidth = 0;
        this.imageHeight = 0;

        // Aspect ratio presets
        this.aspectRatios = {
            'free': null,
            'original': 'original',
            '1:1': 1,
            '4:3': 4 / 3,
            '3:2': 3 / 2,
            '16:9': 16 / 9,
            '9:16': 9 / 16,
            '3:4': 3 / 4,
            '2:3': 2 / 3
        };

        this.currentAspect = 'free';

        // Dragging state
        this.dragging = null;
        this.dragStart = { x: 0, y: 0 };
        this.cropStart = { ...this.cropRect };

        // Bound event handlers (CRITICAL for cleanup)
        this._boundCropBoxMouseDown = this.handleMouseDown.bind(this);
        this._boundDocumentMouseMove = this.handleMouseMove.bind(this);
        this._boundDocumentMouseUp = this.handleMouseUp.bind(this);
        this._boundCropBoxTouchStart = this.handleTouchStart.bind(this);
        this._boundDocumentTouchMove = this.handleTouchMove.bind(this);
        this._boundDocumentTouchEnd = this.handleMouseUp.bind(this);

        // Create overlay elements
        this.createOverlay();
    }

    /**
     * Create crop overlay elements
     */
    createOverlay() {
        // Main overlay container
        this.overlay = document.createElement('div');
        this.overlay.className = 'crop-overlay';
        this.overlay.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: none;
            display: none;
            z-index: 10;
        `;

        // Dark areas outside crop
        this.darkAreas = document.createElement('div');
        this.darkAreas.className = 'crop-dark-areas';
        this.darkAreas.style.cssText = `
            position: absolute;
            inset: 0;
            pointer-events: auto;
        `;

        // Crop box
        this.cropBox = document.createElement('div');
        this.cropBox.className = 'crop-box';
        this.cropBox.style.cssText = `
            position: absolute;
            border: 2px solid #ed2788;
            box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.6);
            pointer-events: auto;
            cursor: move;
        `;

        // Grid lines (rule of thirds)
        this.grid = document.createElement('div');
        this.grid.className = 'crop-grid';
        this.grid.innerHTML = `
            <div style="position:absolute;left:33.33%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.3)"></div>
            <div style="position:absolute;left:66.66%;top:0;bottom:0;width:1px;background:rgba(255,255,255,0.3)"></div>
            <div style="position:absolute;top:33.33%;left:0;right:0;height:1px;background:rgba(255,255,255,0.3)"></div>
            <div style="position:absolute;top:66.66%;left:0;right:0;height:1px;background:rgba(255,255,255,0.3)"></div>
        `;
        this.grid.style.cssText = 'position:absolute;inset:0;pointer-events:none;';
        this.cropBox.appendChild(this.grid);

        // Resize handles
        const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
        handlePositions.forEach(pos => {
            const handle = document.createElement('div');
            handle.className = `crop-handle crop-handle-${pos}`;
            handle.dataset.position = pos;
            handle.style.cssText = `
                position: absolute;
                width: 16px;
                height: 16px;
                background: #ed2788;
                border: 2px solid #fff;
                border-radius: 2px;
                pointer-events: auto;
            `;

            // Position the handle
            const styles = {
                nw: 'top:-8px;left:-8px;cursor:nw-resize;',
                n: 'top:-8px;left:50%;transform:translateX(-50%);cursor:n-resize;',
                ne: 'top:-8px;right:-8px;cursor:ne-resize;',
                e: 'top:50%;right:-8px;transform:translateY(-50%);cursor:e-resize;',
                se: 'bottom:-8px;right:-8px;cursor:se-resize;',
                s: 'bottom:-8px;left:50%;transform:translateX(-50%);cursor:s-resize;',
                sw: 'bottom:-8px;left:-8px;cursor:sw-resize;',
                w: 'top:50%;left:-8px;transform:translateY(-50%);cursor:w-resize;'
            };
            handle.style.cssText += styles[pos];

            this.cropBox.appendChild(handle);
        });

        this.overlay.appendChild(this.darkAreas);
        this.overlay.appendChild(this.cropBox);
        this.container.appendChild(this.overlay);

        // Attach event listeners
        this._attachEventListeners();
    }

    /**
     * Attach all event listeners (separated for clarity)
     */
    _attachEventListeners() {
        // Crop box events
        this.cropBox.addEventListener('mousedown', this._boundCropBoxMouseDown);
        this.cropBox.addEventListener('touchstart', this._boundCropBoxTouchStart, { passive: false });

        // Document-level events (MUST be removed on destroy!)
        document.addEventListener('mousemove', this._boundDocumentMouseMove);
        document.addEventListener('mouseup', this._boundDocumentMouseUp);
        document.addEventListener('touchmove', this._boundDocumentTouchMove, { passive: false });
        document.addEventListener('touchend', this._boundDocumentTouchEnd);
    }

    /**
     * Show crop overlay
     */
    show(imageWidth, imageHeight) {
        this.imageWidth = imageWidth;
        this.imageHeight = imageHeight;
        this.isActive = true;
        this.overlay.style.display = 'block';
        this.resetCrop();
        this.updateOverlay();
    }

    /**
     * Hide crop overlay
     */
    hide() {
        this.isActive = false;
        this.overlay.style.display = 'none';
    }

    /**
     * Reset crop to full image
     */
    resetCrop() {
        this.cropRect = { x: 0, y: 0, width: 1, height: 1 };
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.updateOverlay();
    }

    /**
     * Update overlay position and size
     */
    updateOverlay() {
        if (!this.isActive) return;

        const containerRect = this.container.getBoundingClientRect();
        const canvas = this.container.querySelector('canvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();

        // Calculate crop box position relative to canvas
        const offsetX = canvasRect.left - containerRect.left;
        const offsetY = canvasRect.top - containerRect.top;

        const left = offsetX + this.cropRect.x * canvasRect.width;
        const top = offsetY + this.cropRect.y * canvasRect.height;
        const width = this.cropRect.width * canvasRect.width;
        const height = this.cropRect.height * canvasRect.height;

        this.cropBox.style.left = `${left}px`;
        this.cropBox.style.top = `${top}px`;
        this.cropBox.style.width = `${width}px`;
        this.cropBox.style.height = `${height}px`;
    }

    /**
     * Set aspect ratio
     */
    setAspectRatio(ratio) {
        this.currentAspect = ratio;
        const aspect = this.aspectRatios[ratio];

        if (!aspect) {
            // Free aspect
            return;
        }

        let targetRatio;
        if (aspect === 'original') {
            targetRatio = this.imageWidth / this.imageHeight;
        } else {
            targetRatio = aspect;
        }

        // Adjust crop to match aspect ratio
        const currentRatio = this.cropRect.width / this.cropRect.height;

        if (currentRatio > targetRatio) {
            // Too wide, reduce width
            const newWidth = this.cropRect.height * targetRatio;
            const diff = this.cropRect.width - newWidth;
            this.cropRect.x += diff / 2;
            this.cropRect.width = newWidth;
        } else {
            // Too tall, reduce height
            const newHeight = this.cropRect.width / targetRatio;
            const diff = this.cropRect.height - newHeight;
            this.cropRect.y += diff / 2;
            this.cropRect.height = newHeight;
        }

        this.constrainCrop();
        this.updateOverlay();
    }

    /**
     * Set rotation
     */
    setRotation(degrees) {
        this.rotation = degrees;
        this._notifyChange();
    }

    /**
     * Rotate 90 degrees
     */
    rotate90(clockwise = true) {
        this.rotation += clockwise ? 90 : -90;
        this.rotation = ((this.rotation % 360) + 360) % 360;

        // Swap crop dimensions for 90° rotations
        if (this.rotation % 180 !== 0) {
            const temp = this.cropRect.width;
            this.cropRect.width = this.cropRect.height;
            this.cropRect.height = temp;
        }

        this.constrainCrop();
        this._notifyChange();
    }

    /**
     * Flip horizontal
     */
    flipHorizontal() {
        this.flipH = !this.flipH;
        this._notifyChange();
    }

    /**
     * Flip vertical
     */
    flipVertical() {
        this.flipV = !this.flipV;
        this._notifyChange();
    }

    /**
     * Constrain crop to valid bounds
     */
    constrainCrop() {
        // Minimum size
        const minSize = 0.1;
        this.cropRect.width = Math.max(minSize, this.cropRect.width);
        this.cropRect.height = Math.max(minSize, this.cropRect.height);

        // Keep within bounds
        this.cropRect.x = Math.max(0, Math.min(1 - this.cropRect.width, this.cropRect.x));
        this.cropRect.y = Math.max(0, Math.min(1 - this.cropRect.height, this.cropRect.y));
    }

    /**
     * Handle mouse down
     */
    handleMouseDown(e) {
        const target = e.target;

        if (target.classList.contains('crop-handle')) {
            this.dragging = {
                type: 'resize',
                position: target.dataset.position
            };
        } else if (target === this.cropBox || target.closest('.crop-box')) {
            this.dragging = { type: 'move' };
        }

        if (this.dragging) {
            this.dragStart = { x: e.clientX, y: e.clientY };
            this.cropStart = { ...this.cropRect };
            e.preventDefault();
        }
    }

    /**
     * Handle mouse move
     */
    handleMouseMove(e) {
        if (!this.dragging) return;

        const canvas = this.container.querySelector('canvas');
        if (!canvas) return;

        const canvasRect = canvas.getBoundingClientRect();

        const deltaX = (e.clientX - this.dragStart.x) / canvasRect.width;
        const deltaY = (e.clientY - this.dragStart.y) / canvasRect.height;

        if (this.dragging.type === 'move') {
            this.cropRect.x = this.cropStart.x + deltaX;
            this.cropRect.y = this.cropStart.y + deltaY;
        } else if (this.dragging.type === 'resize') {
            this.handleResize(this.dragging.position, deltaX, deltaY);
        }

        this.constrainCrop();
        this.updateOverlay();

        e.preventDefault();
    }

    /**
     * Handle resize based on handle position
     */
    handleResize(position, deltaX, deltaY) {
        const aspect = this.aspectRatios[this.currentAspect];

        switch (position) {
            case 'e':
                this.cropRect.width = this.cropStart.width + deltaX;
                break;
            case 'w':
                this.cropRect.x = this.cropStart.x + deltaX;
                this.cropRect.width = this.cropStart.width - deltaX;
                break;
            case 's':
                this.cropRect.height = this.cropStart.height + deltaY;
                break;
            case 'n':
                this.cropRect.y = this.cropStart.y + deltaY;
                this.cropRect.height = this.cropStart.height - deltaY;
                break;
            case 'se':
                this.cropRect.width = this.cropStart.width + deltaX;
                this.cropRect.height = this.cropStart.height + deltaY;
                break;
            case 'sw':
                this.cropRect.x = this.cropStart.x + deltaX;
                this.cropRect.width = this.cropStart.width - deltaX;
                this.cropRect.height = this.cropStart.height + deltaY;
                break;
            case 'ne':
                this.cropRect.width = this.cropStart.width + deltaX;
                this.cropRect.y = this.cropStart.y + deltaY;
                this.cropRect.height = this.cropStart.height - deltaY;
                break;
            case 'nw':
                this.cropRect.x = this.cropStart.x + deltaX;
                this.cropRect.y = this.cropStart.y + deltaY;
                this.cropRect.width = this.cropStart.width - deltaX;
                this.cropRect.height = this.cropStart.height - deltaY;
                break;
        }

        // Enforce aspect ratio if set
        if (aspect && aspect !== 'original') {
            if (['e', 'w', 'ne', 'nw', 'se', 'sw'].includes(position)) {
                this.cropRect.height = this.cropRect.width / aspect;
            } else {
                this.cropRect.width = this.cropRect.height * aspect;
            }
        }
    }

    /**
     * Handle mouse up
     */
    handleMouseUp() {
        if (this.dragging) {
            this.dragging = null;
            this._notifyChange();
        }
    }

    /**
     * Handle touch start
     */
    handleTouchStart(e) {
        if (e.touches.length === 1) {
            const touch = e.touches[0];
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
        if (e.touches.length === 1 && this.dragging) {
            const touch = e.touches[0];
            this.handleMouseMove({
                clientX: touch.clientX,
                clientY: touch.clientY,
                preventDefault: () => e.preventDefault()
            });
        }
    }

    /**
     * Get crop settings for export
     */
    getCropSettings() {
        return {
            rect: { ...this.cropRect },
            rotation: this.rotation,
            flipH: this.flipH,
            flipV: this.flipV
        };
    }

    /**
     * Apply crop to canvas and return cropped image data
     */
    applyCrop(sourceCanvas) {
        const settings = this.getCropSettings();

        // Calculate actual pixel values
        const sx = Math.round(settings.rect.x * sourceCanvas.width);
        const sy = Math.round(settings.rect.y * sourceCanvas.height);
        const sw = Math.round(settings.rect.width * sourceCanvas.width);
        const sh = Math.round(settings.rect.height * sourceCanvas.height);

        // Create output canvas
        const outputCanvas = document.createElement('canvas');

        // Handle rotation dimensions
        if (settings.rotation % 180 === 0) {
            outputCanvas.width = sw;
            outputCanvas.height = sh;
        } else {
            outputCanvas.width = sh;
            outputCanvas.height = sw;
        }

        const ctx = outputCanvas.getContext('2d');

        // Apply transformations
        ctx.translate(outputCanvas.width / 2, outputCanvas.height / 2);
        ctx.rotate(settings.rotation * Math.PI / 180);
        ctx.scale(settings.flipH ? -1 : 1, settings.flipV ? -1 : 1);

        // Draw cropped area
        ctx.drawImage(
            sourceCanvas,
            sx, sy, sw, sh,
            -sw / 2, -sh / 2, sw, sh
        );

        return outputCanvas;
    }

    /**
     * Notify change callback
     */
    _notifyChange() {
        if (this.onChange) {
            this.onChange(this.getCropSettings());
        }
    }

    /**
     * Cleanup all event listeners (CRITICAL - prevents memory leaks)
     */
    destroy() {
        // Remove crop box listeners
        this.cropBox.removeEventListener('mousedown', this._boundCropBoxMouseDown);
        this.cropBox.removeEventListener('touchstart', this._boundCropBoxTouchStart);

        // Remove document-level listeners (THE LEAK FIX)
        document.removeEventListener('mousemove', this._boundDocumentMouseMove);
        document.removeEventListener('mouseup', this._boundDocumentMouseUp);
        document.removeEventListener('touchmove', this._boundDocumentTouchMove);
        document.removeEventListener('touchend', this._boundDocumentTouchEnd);

        // Remove overlay from DOM
        if (this.overlay && this.overlay.parentNode) {
            this.overlay.parentNode.removeChild(this.overlay);
        }

        // Clear references
        this.onChange = null;
        this.container = null;
        this.overlay = null;
        this.cropBox = null;
    }
}

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CropTool;
}
