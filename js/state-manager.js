
class StateManager {
    constructor(historyManager) {
        this.images = [];
        this.activeIndex = -1;
        this.currentPreset = null;
        this.customPresets = [];
        this.history = historyManager; // Dependency injection
        this.activeMaskId = null; // ID of the currently selected mask for editing
    }

    get activeImage() {
        return this.activeIndex >= 0 ? this.images[this.activeIndex] : null;
    }

    get hasImages() {
        return this.images.length > 0;
    }

    addImage(imageData) {
        // Ensure masks array exists
        if (!imageData.masks) {
            imageData.masks = [];
        }
        this.images.push(imageData);
    }

    removeImage(id) {
        const index = this.images.findIndex(i => i.id === id);
        if (index === -1) return -1;

        this.images.splice(index, 1);

        // Adjust active index
        if (this.activeIndex >= this.images.length) {
            this.activeIndex = this.images.length - 1;
        }

        this.activeMaskId = null; // Reset mask selection on image removal
        return index;
    }

    setActiveIndex(index) {
        if (index < -1 || index >= this.images.length) return false;
        this.activeIndex = index;
        this.activeMaskId = null; // Reset mask selection on image switch
        return true;
    }

    updateActiveImageAdjustments(adjustments) {
        if (!this.activeImage) return;

        // Context-aware update: If a mask is selected, update the mask's adjustments
        if (this.activeMaskId) {
            const mask = this.activeImage.masks.find(m => m.id === this.activeMaskId);
            if (mask) {
                // Determine if we are updating mask PROPS (feather, opacity) or ADJUSTMENTS (exposure, etc)
                // We'll separate them by key check?
                // Or simply: Adjustments passed here ARE adjustments. 
                // Mask props (Feather) should be handled by updateMaskProps?
                // For simplicity, let's assume 'adjustments' object contains adjustment keys.
                mask.adjustments = { ...adjustments };
            }
        } else {
            // Global adjustments
            this.activeImage.adjustments = { ...adjustments };
        }
    }

    // === MASK MANAGEMENT ===

    addMask(type = 'radial') {
        if (!this.activeImage) return null;

        const id = Date.now().toString();
        const newMask = {
            id: id,
            type: type, // 'radial', 'linear'
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Mask`,
            enabled: true,
            invert: false,
            feather: 0.2, // Default feather (0-1)
            x: 0.5, y: 0.5, // Center or Start
            endX: 0.5, endY: 0.2, // Radius point (for radial) or End (for linear)
            radius: 0.3, // Derived or explicit? Let's use x,y and radius/angle?
            // Shader uses u_start and u_end.
            // For Radial: Start=Center, End=RadiusHandle.
            // For Linear: Start=LineStart, End=LineEnd.
            adjustments: { ...this.getZeroAdjustments() }
        };

        if (type === 'radial') {
            newMask.endX = 0.5;
            newMask.endY = 0.2; // Vertical radius defaults
        } else {
            newMask.x = 0.5; newMask.y = 0.8;
            newMask.endX = 0.5; newMask.endY = 0.2;
        }

        if (!this.activeImage.masks) {
            this.activeImage.masks = [];
        }
        this.activeImage.masks.push(newMask);
        this.activeMaskId = id;
        return newMask;
    }

    updateMask(id, updates) {
        if (!this.activeImage) return;
        const mask = this.activeImage.masks.find(m => m.id === id);
        if (mask) {
            Object.assign(mask, updates);
        }
    }

    deleteMask(id) {
        if (!this.activeImage) return;
        const index = this.activeImage.masks.findIndex(m => m.id === id);
        if (index > -1) {
            this.activeImage.masks.splice(index, 1);
            if (this.activeMaskId === id) {
                this.activeMaskId = null;
            }
        }
    }

    setActiveMask(id) {
        this.activeMaskId = id;
    }

    getActiveMask() {
        if (!this.activeImage || !this.activeMaskId) return null;
        return this.activeImage.masks.find(m => m.id === this.activeMaskId) || null;
    }

    getZeroAdjustments() {
        return {
            exposure: 0, contrast: 0, highlights: 0, shadows: 0,
            whites: 0, blacks: 0, temperature: 0, tint: 0,
            vibrance: 0, saturation: 0,
            clarity: 0, dehaze: 0, sharpness: 0,
            // Exclude grain/vignette from local adjustments strictly?
            // Or allow them?
            // Local grain/sharpness is cool.
            // Vignette is usually global.
        };
    }
}
