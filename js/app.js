window.onerror = function (msg, url, line, col, error) {
    alert(`Error: ${msg}\nLine: ${line}\nCol: ${col}`);
    console.error(error);
};
/**
 * UNTITLED STUDIO - MAIN APPLICATION CONTROLLER
 * Orchestrates UI, WebGL engine, storage, batch processing, and all features
 * Phase 2: All 10 advanced features integrated
 */

class UntitledStudio {
    constructor() {
        // Core components
        this.engine = null;
        this.worker = null;
        this.histogram = null;
        this.toneCurve = null;
        this.history = null;
        this.cropTool = null;

        // State
        this.images = [];
        this.activeIndex = -1;
        this.currentAdjustments = null;
        this.currentPreset = null;
        this.customPresets = [];
        this.museMode = localStorage.getItem('museMode') === 'true';

        // Initialize Startup Toast
        setTimeout(() => {
            const toast = document.getElementById('ascii-toast');
            if (toast) {
                toast.classList.add('hidden');
                // Remove from DOM after fade out to clean up
                setTimeout(() => toast.remove(), 1000);
            }
        }, 5000); // 5 seconds

        // HOLOGRAPHIC PRISM TILT EFFECT
        const placeholderContainer = document.getElementById('placeholder-container');
        const heroBtn = document.getElementById('import-hero-btn');

        if (placeholderContainer && heroBtn) {
            placeholderContainer.addEventListener('mousemove', (e) => {
                if (this.currentPreset) return; // Disable if editing an image (sanity check)

                const rect = heroBtn.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;

                // Calculate rotation (max +/- 15 degrees)
                const xPct = x / rect.width;
                const yPct = y / rect.height;

                const rotateX = (0.5 - yPct) * 30; // Tilt UP/DOWN
                const rotateY = (xPct - 0.5) * 30; // Tilt LEFT/RIGHT

                heroBtn.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
            });

            placeholderContainer.addEventListener('mouseleave', () => {
                heroBtn.style.transform = `rotateX(0deg) rotateY(0deg)`;
            });
        }

        // DOM Elements
        this.elements = {};

        // HSL State
        this.hslChannel = 'hue';

        // Export settings
        this.exportSettings = {
            resolution: 'original',
            customWidth: 1920,
            quality: 95,
            preserveExif: true
        };

        // Preset strength system
        this.presetStrength = 100;
        this.beforePresetAdjustments = null;
        this.currentPresetAdjustments = null;

        // Gesture state
        this.gestureState = {
            initialDistance: 0,
            initialScale: 1,
            currentScale: 1,
            isPinching: false
        };

        // Session Cache
        this.blobCache = new Map();
        this.saveTimeout = null;

        // Initialize Haptics
        this.haptics = {
            light: 10,
            medium: 20,
            success: [10, 30, 10]
        };

        // Long Press Logic
        this.longPressTimer = null;
        this.isLongPressing = false;
        this.setupLongPress();

        // Initialize
        this.init();
        this.initSecretMode();
    }

    hapticFeedback(type = 'light') {
        if (navigator.vibrate) {
            navigator.vibrate(this.haptics[type] || 10);
        }
    }

    setupLongPress() {
        const container = document.getElementById('main-stage');
        if (!container) return;

        const startPress = (e) => {
            if (this.currentPreset) return;
            if (e.target.closest('.studio-slider') || e.target.closest('button')) return;

            this.longPressTimer = setTimeout(() => {
                this.isLongPressing = true;
                this.hapticFeedback('medium');
                document.body.classList.add('ui-hidden');
                this.showOriginal(true);
            }, 300);
        };

        const endPress = () => {
            clearTimeout(this.longPressTimer);
            if (this.isLongPressing) {
                this.isLongPressing = false;
                document.body.classList.remove('ui-hidden');
                this.showOriginal(false);
                this.hapticFeedback('light');
            }
        };

        // Touch
        container.addEventListener('touchstart', startPress, { passive: true });
        container.addEventListener('touchend', endPress);
        container.addEventListener('touchcancel', endPress);

        // Mouse (for testing)
        container.addEventListener('mousedown', startPress);
        container.addEventListener('mouseup', endPress);
        container.addEventListener('mouseleave', endPress);
    }

    initScrubbing() {
        // Invisible Dial: Scrub anywhere on control group to adjust slider
        const groups = document.querySelectorAll('.slider-group');

        groups.forEach(group => {
            let startX = 0;
            let startValue = 0;
            let currentSlider = null;
            let sensitivity = 1;

            const handleTouchStart = (e) => {
                // Don't interfere with actual slider handle
                if (e.target.classList.contains('studio-slider')) return;

                currentSlider = group.querySelector('.studio-slider');
                if (!currentSlider) return;

                startX = e.touches[0].clientX;
                startValue = parseFloat(currentSlider.value);

                const range = parseFloat(currentSlider.max) - parseFloat(currentSlider.min);
                sensitivity = range / 1000; // pixels to value ratio
            };

            const handleTouchMove = (e) => {
                if (!currentSlider) return;
                // e.preventDefault(); // Prevent scrolling while scrubbing? 
                // Maybe better to only prevent if movement is horizontal?

                const deltaX = e.touches[0].clientX - startX;

                // Threshold to start scrubbing vs scrolling
                if (Math.abs(deltaX) < 10) return;
                e.preventDefault();

                let newValue = startValue + (deltaX * sensitivity);

                // Clamp
                const min = parseFloat(currentSlider.min);
                const max = parseFloat(currentSlider.max);
                newValue = Math.max(min, Math.min(max, newValue));

                // Update
                if (currentSlider.value != newValue) {
                    currentSlider.value = newValue;
                    currentSlider.dispatchEvent(new Event('input')); // Trigger engine update
                }
            };

            const handleTouchEnd = () => {
                currentSlider = null;
            };

            group.addEventListener('touchstart', handleTouchStart, { passive: false });
            group.addEventListener('touchmove', handleTouchMove, { passive: false });
            group.addEventListener('touchend', handleTouchEnd);
        });
    }

    initOLED() {
        const toggleBtn = document.getElementById('oled-toggle-btn');
        const isOLED = localStorage.getItem('oledMode') === 'true';

        if (isOLED) {
            document.body.classList.add('oled-mode');
        }

        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                document.body.classList.toggle('oled-mode');
                const active = document.body.classList.contains('oled-mode');
                localStorage.setItem('oledMode', active);

                // Haptic feedback
                this.hapticFeedback('medium');
            });
        }
    }

    async init() {
        this.printSignature();

        this.cacheElements();

        // Critical: specific Rendering Pattern Check - Setup listeners immediately so UI is alive
        this.setupEventListeners();

        try {
            try {
                this.initEngine();
            } catch (e) {
                console.error('WebGL Engine init failed:', e);
                // Don't halt the app; allow presets to load
            }
            // Wrap critical async paths to prevent UI blocking
            await storage.init().catch(err => console.error('Storage init failed:', err));

            this.initWorker();
            this.initHistogram();
            this.initToneCurve();
            this.initHistory();
            this.initCropTool();
            this.initGestures();
            this.initScrubbing(); // Mobile Extra 1
            this.initOLED();      // Mobile Extra 2
            this.initMasks();     // Masking System
            this.initVibePack();  // Retro Vibe Pack

            await this.loadSavedImages().catch(err => console.warn('Failed to load saved images:', err));
            await this.loadCustomPresets().catch(err => console.warn('Failed to load presets:', err));
            this.populatePresets('all');

            console.log('✓ Untitled Studio ready');
        } catch (error) {
            console.error('Critical initialization error:', error);
            alert('Some features may not work correctly. Check console for details.');
        }
    }

    initVibePack() {
        this.vibeSettings = {
            dateStamp: false,
            dateColor: '#ff9900',
            watermark: false,
            watermarkText: 'Untitled Studio'
        };

        const dateToggle = document.getElementById('date-toggle');
        const dateColor = document.getElementById('date-color');
        const watermarkToggle = document.getElementById('watermark-toggle');
        const watermarkText = document.getElementById('watermark-text');

        const update = () => {
            this.vibeSettings.dateStamp = dateToggle.checked;
            this.vibeSettings.dateColor = dateColor.value;
            this.vibeSettings.watermark = watermarkToggle.checked;
            this.vibeSettings.watermarkText = watermarkText.value || 'Untitled Studio';
            this.updateVibePreview();
        };

        if (dateToggle) dateToggle.addEventListener('change', update);
        if (dateColor) dateColor.addEventListener('input', update);
        if (watermarkToggle) watermarkToggle.addEventListener('change', update);
        if (watermarkText) watermarkText.addEventListener('input', update);
    }

    updateVibePreview() {
        const container = document.getElementById('vibe-overlay-container');
        const datePreview = document.getElementById('date-stamp-preview');
        const watermarkPreview = document.getElementById('watermark-preview');

        if (!container || !datePreview || !watermarkPreview) return;

        const showAny = this.vibeSettings.dateStamp || this.vibeSettings.watermark;
        container.classList.toggle('hidden', !showAny);

        // Date Stamp
        if (this.vibeSettings.dateStamp) {
            datePreview.classList.remove('hidden');
            datePreview.style.color = this.vibeSettings.dateColor;
            datePreview.style.textShadow = `0 0 5px ${this.vibeSettings.dateColor}`; // Neon glow match

            // Format: 'YY MM DD
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            datePreview.textContent = `'${yy} ${mm} ${dd}`;
        } else {
            datePreview.classList.add('hidden');
        }

        // Watermark
        if (this.vibeSettings.watermark) {
            watermarkPreview.classList.remove('hidden');
            watermarkPreview.textContent = this.vibeSettings.watermarkText;
        } else {
            watermarkPreview.classList.add('hidden');
        }
    }

    /**
     * Draw Vibe Elements onto a 2D context
     */
    drawVibeOverlays(ctx, width, height) {
        if (!this.vibeSettings) return;

        // 1. Date Stamp
        if (this.vibeSettings.dateStamp) {
            const now = new Date();
            const yy = String(now.getFullYear()).slice(-2);
            const mm = String(now.getMonth() + 1).padStart(2, '0');
            const dd = String(now.getDate()).padStart(2, '0');
            const text = `'${yy} ${mm} ${dd}`;

            // Scale font size based on height (e.g., 3.5% of height)
            const fontSize = Math.max(16, height * 0.035);
            ctx.font = `${fontSize}px "Share Tech Mono", monospace`;
            ctx.fillStyle = this.vibeSettings.dateColor;

            // Layout (bottom right with padding)
            const paddingX = width * 0.05;
            const paddingY = height * 0.05;

            // Measure to align right
            const metrics = ctx.measureText(text);
            const x = width - metrics.width - paddingX;
            const y = height - paddingY;

            // Glow effect
            ctx.shadowColor = this.vibeSettings.dateColor;
            ctx.shadowBlur = fontSize * 0.4;

            ctx.fillText(text, x, y);

            // Reset shadow
            ctx.shadowBlur = 0;
        }

        // 2. Watermark
        if (this.vibeSettings.watermark) {
            const text = this.vibeSettings.watermarkText.toUpperCase();

            // Minimal style
            const fontSize = Math.max(12, height * 0.015);
            ctx.font = `600 ${fontSize}px "Outfit", sans-serif`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.letterSpacing = '2px'; // simplistic approach, ctx doesn't support letter-spacing well in all browsers canvas
            // We can fake spacing or just assume font supports it. 
            // Better: use explicit letter spacing if possible or default.

            const paddingX = width * 0.05;
            const paddingY = height * 0.02; // Below date if both exist?

            const metrics = ctx.measureText(text);
            const x = width - metrics.width - paddingX;
            // If date exists, move watermark up or further down?
            // Usually date is biggest element. Let's put watermark slightly above bottom, 
            // or if date is there, maybe watermark goes to bottom-left or simply below date (might clip).
            // Let's put Watermark at VERY bottom right, and Date slightly above it if both present.

            let y = height - paddingY;

            if (this.vibeSettings.dateStamp) {
                // Date is at 5% padding. Watermark should be below/different?
                // Let's put Watermark at bottom right (2%), Date above it (8%).
                y = height - (height * 0.02);
            }

            ctx.fillText(text, x, y);
        }
    }

    printSignature() {
        const logo = `
%c  ____  _   _ ____  
 |  _ \\| \\ | |  _ \\ 
 | | | |  \\| | | | |
 | |_| | |\\  | |_| |
 |____/|_| \\_|____/ 
`;
        const credit = '%c Handcrafted in West Java. Built by MHS. © 2026';

        // Style 1: Neon Cyan/Purple Blocky Look
        const logoStyle = `
            font-family: monospace;
            font-weight: bold;
            font-size: 14px;
            color: #00ffcc;
            text-shadow: 2px 2px 0px #6b21a8;
            line-height: 1.2;
        `;

        // Style 2: Subtle Gray
        const creditStyle = `
            font-family: sans-serif;
            font-size: 11px;
            color: #888888;
            margin-top: 5px;
        `;

        console.log(logo, logoStyle);
        console.log(credit, creditStyle);
    }

    cacheElements() {
        this.elements = {
            canvas: document.getElementById('gl-canvas'),
            canvasContainer: document.getElementById('canvas-container'),
            placeholderContainer: document.getElementById('placeholder-container'),

            // Batch bar
            thumbnailQueue: document.getElementById('thumbnail-queue'),
            importBtn: document.getElementById('import-btn'),
            importHeroBtn: document.getElementById('import-hero-btn'),
            syncAllBtn: document.getElementById('sync-all-btn'),
            batchCount: document.getElementById('batch-count'),
            fileInput: document.getElementById('file-input'),

            // Toolbar
            toggleUIBtn: document.getElementById('toggle-ui-btn'),
            magicWandBtn: document.getElementById('magic-wand-btn'),
            shareBtn: document.getElementById('share-btn'),
            exportBtn: document.getElementById('export-btn'),
            beforeLabel: document.getElementById('before-label'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn'),
            redoBtn: document.getElementById('redo-btn'),


            // Tabs
            tabBtns: document.querySelectorAll('.tab-btn'),
            panels: document.querySelectorAll('.panel'),

            // Panels
            tonePanel: document.getElementById('tone-panel'),
            curvePanel: document.getElementById('curve-panel'),
            colorPanel: document.getElementById('color-panel'),
            effectsPanel: document.getElementById('effects-panel'),
            cropPanel: document.getElementById('crop-panel'),
            presetsPanel: document.getElementById('presets-panel'),

            // Curve
            toneCurveSvg: document.getElementById('tone-curve-svg'),
            curveChannelBtns: document.querySelectorAll('.curve-channel'),
            resetCurveBtn: document.getElementById('reset-curve-btn'),

            // HSL
            hslChannelBtns: document.querySelectorAll('.hsl-channel'),
            hslSliders: document.querySelectorAll('.hsl-slider'),

            // Crop
            aspectBtns: document.querySelectorAll('.aspect-btn'),
            rotationSlider: document.getElementById('rotation'),
            rotateCcwBtn: document.getElementById('rotate-ccw-btn'),
            rotateCwBtn: document.getElementById('rotate-cw-btn'),
            flipHBtn: document.getElementById('flip-h-btn'),
            flipVBtn: document.getElementById('flip-v-btn'),
            cropResetBtn: document.getElementById('crop-reset-btn'),
            cropApplyBtn: document.getElementById('crop-apply-btn'),

            // Presets
            presetCategories: document.querySelectorAll('.preset-category'),
            presetsGrid: document.getElementById('presets-grid'),
            savePresetBtn: document.getElementById('save-preset-btn'),

            // Histogram
            histogramContainer: document.getElementById('histogram-container'),
            histogramCanvas: document.getElementById('histogram-canvas'),
            toggleHistogramBtn: document.getElementById('toggle-histogram-btn'),

            // History
            historySidebar: document.getElementById('history-sidebar'),
            historyList: document.getElementById('history-list'),
            closeHistoryBtn: document.getElementById('close-history-btn'),
            toggleHistoryBtn: document.getElementById('toggle-history-btn'),

            // Effects - Texture Overlay
            textureInput: document.getElementById('texture-input'),
            importTextureBtn: document.getElementById('import-texture-btn'),
            removeTextureBtn: document.getElementById('remove-texture-btn'),
            blendModeBtns: document.querySelectorAll('.blend-mode-btn'),

            // Export
            resetBtn: document.getElementById('reset-btn'),
            exportFormat: document.getElementById('export-format'),
            exportBtn: document.getElementById('export-btn'),
            exportModal: document.getElementById('export-modal'),
            exportSettingsBtn: document.getElementById('export-settings-btn'),
            exportSettingsModal: document.getElementById('export-settings-modal'),
            exportResolution: document.getElementById('export-resolution'),
            exportCustomWidth: document.getElementById('export-custom-width'),
            customResolutionGroup: document.getElementById('custom-resolution-group'),
            exportQuality: document.getElementById('export-quality'),
            exportQualityValue: document.getElementById('export-quality-value'),
            exportExif: document.getElementById('export-exif'),
            exportSettingsCancel: document.getElementById('export-settings-cancel'),
            exportSettingsSave: document.getElementById('export-settings-save'),
            progressRingFill: document.querySelector('.progress-ring-fill'),
            progressText: document.querySelector('.progress-text'),

            // Save Preset Modal
            savePresetModal: document.getElementById('save-preset-modal'),
            presetNameInput: document.getElementById('preset-name-input'),
            savePresetCancel: document.getElementById('save-preset-cancel'),
            savePresetConfirm: document.getElementById('save-preset-confirm'),

            // Masking
            maskPanel: document.getElementById('mask-panel'),
            addMaskBtn: document.getElementById('add-mask-btn'),
            maskList: document.getElementById('mask-list'),
            maskControls: document.getElementById('mask-controls'),
            deleteMaskBtn: document.getElementById('delete-mask-btn'),
            maskOverlayToggle: document.getElementById('mask-overlay-toggle'),
            maskInvert: document.getElementById('mask-invert'),
            maskSliders: document.querySelectorAll('.mask-slider'),


            // LQIP Export Overlay
            lqipOverlay: document.getElementById('lqip-overlay'),
            lqipImage: document.getElementById('lqip-image'),
            lqipProgressFill: document.getElementById('lqip-progress-fill'),
            lqipProgressText: document.getElementById('lqip-progress-text'),

            // Preset Strength
            presetStrengthContainer: document.getElementById('preset-strength-container'),
            presetStrength: document.getElementById('preset-strength'),
            presetStrengthValue: document.getElementById('preset-strength-value'),

            // Share & Social Export
            shareBtn: document.getElementById('share-btn'),
            socialExportBtn: document.getElementById('social-export-btn'),
            socialExportMenu: document.getElementById('social-export-menu')
        };
    }

    initEngine() {
        this.engine = new WebGLEngine(this.elements.canvas);
        this.currentAdjustments = this.engine.getAdjustments();
    }

    initWorker() {
        try {
            this.worker = new Worker('js/batch-worker.js');
            this.worker.onmessage = (e) => this.handleWorkerMessage(e.data);
            this.worker.onerror = (error) => console.error('Worker error:', error);
            console.log('✓ Batch Worker initialized');
        } catch (error) {
            console.warn('Web Worker not available:', error);
        }
    }

    initHistogram() {
        if (this.elements.histogramCanvas) {
            this.histogram = new Histogram(this.elements.histogramCanvas);
        }
    }

    initToneCurve() {
        if (this.elements.toneCurveSvg) {
            this.toneCurve = new ToneCurve(
                this.elements.toneCurveSvg,
                // 1. onChange callback
                (lutData, channel) => {
                    if (this.engine) {
                        this.engine.updateToneCurveLUT(lutData);
                        this.engine.setToneCurveChannel(channel);
                        this.updateHistogram();
                    }
                },
                // 2. onSelectionChange callback
                (state) => {
                    const deleteBtn = document.getElementById('curve-delete-point-btn');
                    if (deleteBtn) {
                        deleteBtn.disabled = !state.canDelete;
                        deleteBtn.classList.toggle('opacity-50', !state.canDelete);
                        deleteBtn.classList.toggle('cursor-not-allowed', !state.canDelete);

                        // Haptic tick on selection change?
                        if (state.hasSelection && navigator.vibrate) navigator.vibrate(5);
                    }
                }
            );
        }
    }

    initHistory() {
        this.history = new HistoryManager(50);
        this.history.onStateChange = (state) => {
            this.elements.undoBtn.disabled = !state.canUndo;
            this.elements.redoBtn.disabled = !state.canRedo;
            this.updateHistoryPanel(state.states);
        };
    }

    initCropTool() {
        if (this.elements.canvasContainer) {
            this.cropTool = new CropTool(this.elements.canvasContainer, (settings) => {
                console.log('Crop settings changed:', settings);
            });
        }
    }

    handleWorkerMessage(data) {
        const { type, payload } = data;

        switch (type) {
            case 'BATCH_START':
                console.log(`Batch processing started: ${payload.total} images`);
                break;
            case 'BATCH_ITEM_COMPLETE':
                if (payload.index < this.images.length) {
                    this.images[payload.index].adjustments = { ...payload.adjustments };
                }
                break;
            case 'BATCH_COMPLETE':
                console.log(`Batch complete: ${payload.completed}/${payload.total}`);
                break;
            case 'SYNC_ITEM':
                const img = this.images.find(i => i.id === payload.id);
                if (img) {
                    img.adjustments = { ...payload.adjustments };
                }
                break;
            case 'SYNC_COMPLETE':
                console.log(`Sync complete: ${payload.count} images`);
                break;
        }
    }

    setupEventListeners() {
        const on = (el, event, handler) => {
            if (el) el.addEventListener(event, handler);
        };

        // Secret Muse Mode Trigger
        const logo = document.getElementById('studio-logo');
        if (logo) {
            logo.addEventListener('dblclick', () => {
                this.museMode = !this.museMode;
                localStorage.setItem('museMode', this.museMode);
                const msg = this.museMode ? 'Muse Mode Unlocked 🤍' : 'Muse Mode Locked';

                // Show toast
                const toast = document.createElement('div');
                toast.textContent = msg;
                toast.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 bg-white/10 backdrop-blur-md border border-white/20 text-white px-6 py-3 rounded-full shadow-2xl z-50 animate-fade-in-down font-medium tracking-wide';
                document.body.appendChild(toast);
                setTimeout(() => toast.remove(), 2500);

                // Refresh presets
                if (document.querySelector('.preset-category.active')) {
                    const activeCat = document.querySelector('.preset-category.active').dataset.category;
                    this.populatePresets(activeCat);
                }
            });
        }

        // File import
        on(this.elements.importBtn, 'click', () => this.openFilePicker());
        on(this.elements.importHeroBtn, 'click', () => this.openFilePicker());
        on(this.elements.fileInput, 'change', (e) => this.handleFileSelect(e));

        // Drag and drop
        if (this.elements.canvasContainer) {
            const el = this.elements.canvasContainer;
            on(el, 'dragover', (e) => {
                e.preventDefault();
                e.currentTarget.classList.add('ring-2', 'ring-hot-pink');
            });
            on(el, 'dragleave', (e) => {
                e.currentTarget.classList.remove('ring-2', 'ring-hot-pink');
            });
            on(el, 'drop', (e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('ring-2', 'ring-hot-pink');
                this.handleFileDrop(e);
            });
        }

        // Before/After toggle (hold to show original)
        if (this.elements.beforeBtn) {
            const btn = this.elements.beforeBtn;
            on(btn, 'mousedown', () => this.showOriginal(true));
            on(btn, 'mouseup', () => this.showOriginal(false));
            on(btn, 'mouseleave', () => this.showOriginal(false));
            on(btn, 'touchstart', (e) => { e.preventDefault(); this.showOriginal(true); });
            on(btn, 'touchend', () => this.showOriginal(false));
        }

        // Undo/Redo
        on(this.elements.undoBtn, 'click', () => this.undo());
        on(this.elements.redoBtn, 'click', () => this.redo());

        // Tab navigation
        this.elements.tabBtns.forEach(btn => {
            on(btn, 'click', () => this.switchTab(btn.dataset.tab));
        });

        // Slider inputs (all studio-sliders)
        document.querySelectorAll('.studio-slider').forEach(slider => {
            on(slider, 'input', (e) => this.handleSliderChange(e));
        });

        // Curve channel buttons
        this.elements.curveChannelBtns.forEach(btn => {
            on(btn, 'click', () => {
                this.elements.curveChannelBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.toneCurve) {
                    this.toneCurve.setChannel(btn.dataset.channel);
                }
            });
        });

        // Reset curve
        on(this.elements.resetCurveBtn, 'click', () => {
            if (this.toneCurve) this.toneCurve.reset();
        });

        // Curve Point Controls (Mobile Refactor)
        on(document.getElementById('curve-add-point-btn'), 'click', () => {
            if (this.toneCurve) this.toneCurve.addPoint();
        });

        on(document.getElementById('curve-delete-point-btn'), 'click', () => {
            if (this.toneCurve) this.toneCurve.deletePoint();
        });

        // HSL channel buttons
        this.elements.hslChannelBtns.forEach(btn => {
            on(btn, 'click', () => this.switchHSLChannel(btn.dataset.channel));
        });

        // HSL sliders
        this.elements.hslSliders.forEach(slider => {
            on(slider, 'input', (e) => this.handleHSLSliderChange(e));
        });

        // Aspect ratio buttons
        this.elements.aspectBtns.forEach(btn => {
            on(btn, 'click', () => {
                this.elements.aspectBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.cropTool) {
                    this.cropTool.setAspectRatio(btn.dataset.aspect);
                }
            });
        });

        // Crop controls
        on(this.elements.rotateCcwBtn, 'click', () => this.cropTool?.rotate90(false));
        on(this.elements.rotateCwBtn, 'click', () => this.cropTool?.rotate90(true));
        on(this.elements.flipHBtn, 'click', () => this.cropTool?.flipHorizontal());
        on(this.elements.flipVBtn, 'click', () => this.cropTool?.flipVertical());
        on(this.elements.cropResetBtn, 'click', () => this.cropTool?.resetCrop());
        on(this.elements.cropApplyBtn, 'click', () => this.applyCrop());

        // Rotation slider
        on(this.elements.rotationSlider, 'input', (e) => {
            if (this.cropTool) {
                this.cropTool.setRotation(parseFloat(e.target.value));
            }
        });

        // Preset categories
        this.elements.presetCategories.forEach(btn => {
            on(btn, 'click', () => {
                this.elements.presetCategories.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.populatePresets(btn.dataset.category);
            });
        });

        // Save preset
        on(this.elements.savePresetBtn, 'click', () => this.showSavePresetModal());
        on(this.elements.savePresetCancel, 'click', () => this.hideSavePresetModal());
        on(this.elements.savePresetConfirm, 'click', () => this.saveCustomPreset());

        // Masking Listeners
        on(this.elements.addMaskBtn, 'click', () => this.addMask('linear')); // Default to linear
        on(this.elements.deleteMaskBtn, 'click', () => this.deleteMask());

        on(this.elements.maskOverlayToggle, 'change', (e) => {
            if (this.engine) this.engine.setShowMaskOverlay(e.target.checked);
        });

        on(this.elements.maskInvert, 'change', (e) => {
            this.updateMask({ invert: e.target.checked });
        });

        // Mask Sliders
        if (this.elements.maskSliders) {
            this.elements.maskSliders.forEach(slider => {
                on(slider, 'input', (e) => {
                    const prop = e.target.id.replace('mask-', '');
                    this.updateMask({ [prop]: parseFloat(e.target.value) });

                    // Update display
                    const disp = document.querySelector(`.slider-value[data-for="${e.target.id}"]`);
                    if (disp) disp.textContent = parseFloat(e.target.value).toFixed(2);
                });
            });
        }

        // Mask List Delegation
        if (this.elements.maskList) {
            on(this.elements.maskList, 'click', (e) => {
                const item = e.target.closest('.mask-item');
                if (!item) return;

                const id = item.dataset.id;

                // Toggle Button
                if (e.target.closest('.mask-toggle-btn')) {
                    e.stopPropagation();
                    this.toggleMask(id);
                    return;
                }

                // Activate
                this.activateMask(id);
            });
        }

        // Toggle UI
        if (this.elements.toggleUIBtn) {
            on(this.elements.toggleUIBtn, 'click', () => this.toggleUI());
        }

        if (this.elements.magicWandBtn) {
            console.log('[App] Attaching Magic Wand Listener');
            on(this.elements.magicWandBtn, 'click', () => {
                console.log('[App] Magic Wand Clicked');
                this.autoEnhance();
            });
        } else {
            console.error('[App] Magic Wand Button NOT FOUND in DOM');
        }

        // Histogram toggle
        on(this.elements.toggleHistogramBtn, 'click', () => this.toggleHistogram());

        // History toggle
        on(this.elements.toggleHistoryBtn, 'click', () => this.toggleHistory());
        on(this.elements.closeHistoryBtn, 'click', () => this.toggleHistory(false));

        // Export settings
        on(this.elements.exportSettingsBtn, 'click', () => this.showExportSettings());
        on(this.elements.exportSettingsCancel, 'click', () => this.hideExportSettings());
        on(this.elements.exportSettingsSave, 'click', () => this.saveExportSettings());

        if (this.elements.exportResolution) {
            on(this.elements.exportResolution, 'change', (e) => {
                if (this.elements.customResolutionGroup) {
                    this.elements.customResolutionGroup.classList.toggle('hidden', e.target.value !== 'custom');
                }
            });
        }
        if (this.elements.exportQuality) {
            on(this.elements.exportQuality, 'input', (e) => {
                if (this.elements.exportQualityValue) {
                    this.elements.exportQualityValue.textContent = e.target.value + '%';
                }
            });
        }

        // Sync All
        on(this.elements.syncAllBtn, 'click', () => this.syncAllImages());

        // Reset
        on(this.elements.resetBtn, 'click', () => this.resetAdjustments());

        // Export
        on(this.elements.exportBtn, 'click', () => this.exportImage());

        // Preset Strength Slider
        if (this.elements.presetStrength) {
            on(this.elements.presetStrength, 'input', (e) => {
                this.updatePresetStrength(parseInt(e.target.value));
            });
        }

        // Share Button
        on(this.elements.shareBtn, 'click', () => this.shareImage());

        // Texture Overlay Listeners
        on(this.elements.importTextureBtn, 'click', () => this.elements.textureInput?.click());
        on(this.elements.removeTextureBtn, 'click', () => this.handleRemoveTexture());
        on(this.elements.textureInput, 'change', (e) => this.handleTextureImport(e));

        // --- BATCH UI ---
        const batchBtn = document.getElementById('batch-export-btn');
        if (batchBtn) {
            on(batchBtn, 'click', () => this.showBatchExportModal());
        }

        on(document.getElementById('batch-modal-close'), 'click', () => this.hideBatchExportModal());

        on(document.getElementById('batch-mode-zip'), 'click', () => this.processBatch('zip'));
        on(document.getElementById('batch-mode-waterfall'), 'click', () => this.processBatch('waterfall'));

        // --- VIBE ---

        // --- VIBE ---
        // Sliders
        ['lightLeak', 'scratches'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                on(el, 'input', (e) => {
                    const val = parseInt(e.target.value);
                    this.engine.setAdjustment(id, val);
                    // Update numeric display if exists
                    const display = document.querySelector(`.slider-value[data-for="${id}"]`);
                    if (display) display.textContent = val;
                });
            }
        });

        // Randomize
        const rndBtn = document.getElementById('randomize-seed-btn');
        if (rndBtn) {
            on(rndBtn, 'click', () => {
                const seed = Math.random() * 100.0;
                this.engine.setAdjustment('filmSeed', seed);
                // Animate button slightly?
                rndBtn.classList.add('scale-95');
                setTimeout(() => rndBtn.classList.remove('scale-95'), 100);
            });
        }


        if (this.elements.blendModeBtns) {
            this.elements.blendModeBtns.forEach(btn => {
                on(btn, 'click', (e) => {
                    // Update UI
                    this.elements.blendModeBtns.forEach(b => {
                        b.classList.remove('active', 'bg-moonstone/20', 'text-moonstone');
                        b.classList.add('hover:bg-white/10');
                    });
                    const target = e.target.closest('.blend-mode-btn');
                    target.classList.add('active', 'bg-moonstone/20', 'text-moonstone');
                    target.classList.remove('hover:bg-white/10');

                    // Update Engine
                    const mode = parseInt(target.dataset.mode);
                    this.engine.setAdjustment('overlayBlendMode', mode);
                    this.updateHistogram();
                });
            });
        }

        // Social Export Menu
        if (this.elements.socialExportBtn && this.elements.socialExportMenu) {
            on(this.elements.socialExportBtn, 'click', (e) => {
                e.stopPropagation();
                this.elements.socialExportMenu.classList.toggle('hidden');
            });

            this.elements.socialExportMenu.querySelectorAll('.social-export-option').forEach(btn => {
                on(btn, 'click', () => {
                    this.exportForSocial(btn.dataset.size);
                    this.elements.socialExportMenu.classList.add('hidden');
                });
            });

            document.addEventListener('click', () => {
                if (this.elements.socialExportMenu) this.elements.socialExportMenu.classList.add('hidden');
            });
        }

        // Double-tap to reset sliders
        document.querySelectorAll('.studio-slider').forEach(slider => {
            const initialValue = slider.getAttribute('value') || slider.defaultValue || '0';
            slider.dataset.default = initialValue;

            let lastTap = 0;
            on(slider, 'touchend', (e) => {
                const now = Date.now();
                if (now - lastTap < 300) {
                    slider.value = slider.dataset.default;
                    slider.dispatchEvent(new Event('input', { bubbles: true }));
                    if (navigator.vibrate) navigator.vibrate(10);
                    e.preventDefault();
                }
                lastTap = now;
            });

            on(slider, 'dblclick', () => {
                slider.value = slider.dataset.default;
                slider.dispatchEvent(new Event('input', { bubbles: true }));
                if (navigator.vibrate) navigator.vibrate(10);
            });
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
    }

    openFilePicker() {
        this.elements.fileInput.click();
    }

    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        await this.importFiles(files);
        e.target.value = '';
    }

    async handleFileDrop(e) {
        const files = Array.from(e.dataTransfer.files);
        await this.importFiles(files);
    }

    async importFiles(files) {
        // Separate JSON project files from Images
        const projectFile = files.find(f => f.type === 'application/json' || f.name.endsWith('.json'));
        if (projectFile) {
            await this.importProject(projectFile);
            // If project loaded, do we stop? Or continue loading images?
            // Usually project import is exclusive operation.
            return;
        }

        const imageFiles = files.filter(f => f.type.startsWith('image/'));
        if (imageFiles.length === 0) return;

        const maxImages = 10;
        const remaining = maxImages - this.images.length;

        if (remaining <= 0) {
            alert('Maximum 10 images allowed');
            return;
        }

        const filesToImport = imageFiles.slice(0, remaining);

        for (const file of filesToImport) {
            await this.addImage(file);
        }

        if (this.activeIndex === -1 && this.images.length > 0) {
            this.selectImage(0);
        }

        this.updateBatchCount();
        this.updateUIState();
    }

    async loadSavedSessions() {
        try {
            const savedImages = await storage.getAllImages();
            if (savedImages.length === 0) return;

            console.log(`Restoring ${savedImages.length} images from session...`);

            // Sort by createdAt
            savedImages.sort((a, b) => a.createdAt - b.createdAt);

            for (const imgData of savedImages) {
                // Reconstruct Blob from Base64
                // imgData.fileData is base64 string
                const blob = storage.base64ToBlob(imgData.fileData, 'image/jpeg'); // Assuming jpeg or sniffing type?
                // Actually fileData includes data:image/png;base64,... so base64ToBlob handles it?
                // storage.base64ToBlob expects pure base64? Let's check storage.js.
                // It splits by comma: `atob(base64.split(',')[1])`. Correct.

                // Construct fake File object for compatibility
                const file = new File([blob], imgData.name, { type: blob.type });

                // Cache URL
                const url = URL.createObjectURL(blob);
                this.blobCache.set(imgData.id, url);

                // Add to state (without fileData to save memory in memory)
                this.images.push({
                    ...imgData,
                    file: file, // Rehydrated file
                    fileData: undefined // clear heavy string from memory
                });

                await this.addThumbnailToQueue(this.images[this.images.length - 1]);
            }

            if (this.images.length > 0) {
                // Restore last active? Or just first.
                this.selectImage(this.images.length - 1);
            }

        } catch (e) {
            console.error('Failed to load session:', e);
        }
    }

    async addImage(file) {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);
        const thumbnailUrl = await this.createThumbnail(file);

        // Cache URL immediately
        const url = URL.createObjectURL(file);
        this.blobCache.set(id, url);

        const imageData = {
            id,
            name: file.name,
            file,
            thumbnailUrl,
            adjustments: { ...this.currentAdjustments },
            createdAt: Date.now()
        };

        this.images.push(imageData);
        this.addThumbnailToQueue(imageData);

        // Async Save to DB
        // Don't await this to keep UI responsive
        storage.fileToBase64(file).then(base64 => {
            storage.saveImage({
                ...imageData,
                fileData: base64, // Save the heavy data
                file: undefined   // Don't save the File object (IDB can't clone it easily exactly? Actually IDB can store Blobs directly in modern browsers.)
                // But storage.js is using base64. Stick to that for now to avoid major refactor.
            }).catch(err => console.error('Auto-save failed:', err));
        });

        return imageData;
    }

    async removeImage(index) {
        if (index < 0 || index >= this.images.length) return;

        const img = this.images[index];

        // 1. Remove from DB
        await storage.deleteImage(img.id);

        // 2. Revoke URL
        if (this.blobCache.has(img.id)) {
            URL.revokeObjectURL(this.blobCache.get(img.id));
            this.blobCache.delete(img.id);
        }

        // 3. Update State
        this.images.splice(index, 1);

        // 4. Update UI
        // Remove thumbnail
        const thumb = document.querySelector(`.thumbnail-item[data-id="${img.id}"]`);
        if (thumb) thumb.remove();

        this.updateBatchCount();

        // 5. Select new image if active was removed
        if (this.images.length === 0) {
            this.activeIndex = -1;
            // Clear canvas/show placeholder
            this.loadPlaceholder();
        } else if (index === this.activeIndex) {
            this.selectImage(Math.max(0, index - 1));
        } else if (index < this.activeIndex) {
            this.activeIndex--; // Shift index
        }

        this.updateUIState();
    }

    loadPlaceholder() {
        // Code to show placeholder
        document.getElementById('placeholder-container').style.opacity = '1';
        document.getElementById('canvas-container').style.opacity = '0';
        this.engine.currentImage = null;
    }

    // --- GALLERY MODE ---
    initGalleryFrame() {
        const toggle = document.getElementById('gallery-frame-toggle');
        const themeBtn = document.getElementById('gallery-theme-btn');
        const preview = document.getElementById('gallery-frame-preview');
        const options = document.getElementById('gallery-options');

        if (toggle) {
            toggle.addEventListener('change', (e) => {
                this.isGalleryMode = e.target.checked;
                preview.classList.toggle('hidden', !this.isGalleryMode);
                options.classList.toggle('hidden', !this.isGalleryMode);

                if (this.isGalleryMode) {
                    this.updateGalleryPreview();
                    // Add listener for canvas resize
                    if (!this.resizeObserver) {
                        this.resizeObserver = new ResizeObserver(() => this.updateGalleryPreview());
                        this.resizeObserver.observe(this.engine.canvas);
                    }
                } else {
                    if (this.resizeObserver) {
                        this.resizeObserver.disconnect();
                        this.resizeObserver = null;
                    }
                }
            });
        }

        if (themeBtn) {
            themeBtn.addEventListener('click', () => {
                const isDark = themeBtn.textContent === 'White';
                themeBtn.textContent = isDark ? 'Black' : 'White';
                themeBtn.classList.toggle('bg-white', !isDark);
                themeBtn.classList.toggle('text-black', !isDark);
                themeBtn.classList.toggle('bg-black', isDark);
                themeBtn.classList.toggle('text-white', isDark);

                preview.classList.toggle('theme-dark', isDark);
                // Also update border bg
                document.getElementById('gallery-border').classList.toggle('bg-white', !isDark);
                document.getElementById('gallery-border').classList.toggle('bg-[#121212]', isDark);
                document.getElementById('gallery-info').classList.toggle('text-black', !isDark);
                document.getElementById('gallery-info').classList.toggle('text-[#666]', isDark);

                this.galleryTheme = isDark ? 'dark' : 'light';
            });
        }
    }

    updateGalleryPreview() {
        if (!this.isGalleryMode || this.activeIndex < 0) return;

        const canvas = this.engine.canvas;
        const preview = document.getElementById('gallery-frame-preview');
        const exifData = this.images[this.activeIndex].exif;

        // Position preview over canvas
        // Canvas is object-contain, so it might be smaller than container.
        // We need the ACTUAL rendered dimensions.
        // Since canvas element is styled max-w/max-h, offsetWidth/Height gives logical size.
        // We match that.

        preview.style.width = canvas.offsetWidth + 'px';
        preview.style.height = canvas.offsetHeight + 'px';
        preview.style.left = canvas.offsetLeft + 'px';
        preview.style.top = canvas.offsetTop + 'px';

        // Update Text
        document.getElementById('exif-model').textContent = exifData.model || '-';
        document.getElementById('exif-focal').textContent = exifData.focal || '-';
        document.getElementById('exif-aperture').textContent = exifData.aperture || '-';
        document.getElementById('exif-shutter').textContent = exifData.shutter || '-';
        document.getElementById('exif-iso').textContent = exifData.iso || '-';

        document.getElementById('gallery-info').classList.remove('opacity-0');
    }


    createThumbnail(file) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                const size = 112;
                canvas.width = size;
                canvas.height = size;

                const scale = Math.max(size / img.width, size / img.height);
                const w = img.width * scale;
                const h = img.height * scale;
                const x = (size - w) / 2;
                const y = (size - h) / 2;

                ctx.drawImage(img, x, y, w, h);
                URL.revokeObjectURL(img.src);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            };
            img.src = URL.createObjectURL(file);
        });
    }

    addThumbnailToQueue(imageData) {
        const thumb = document.createElement('div');
        thumb.className = 'thumbnail';
        thumb.dataset.id = imageData.id;
        thumb.innerHTML = `
            <img src="${imageData.thumbnailUrl}" alt="${imageData.name}">
            <button class="thumbnail-remove">×</button>
        `;

        thumb.addEventListener('click', (e) => {
            if (!e.target.classList.contains('thumbnail-remove')) {
                const index = this.images.findIndex(i => i.id === imageData.id);
                this.selectImage(index);
            }
        });

        thumb.querySelector('.thumbnail-remove').addEventListener('click', (e) => {
            e.stopPropagation();
            this.removeImage(imageData.id);
        });

        this.elements.thumbnailQueue.insertBefore(thumb, this.elements.importBtn);
    }

    async selectImage(index) {
        if (index < 0 || index >= this.images.length) return;

        // Save current adjustments
        if (this.engine && this.activeIndex >= 0 && this.activeIndex < this.images.length) {
            this.images[this.activeIndex].adjustments = this.engine.getAdjustments();
        }

        this.activeIndex = index;
        const imageData = this.images[index];

        // Update UI
        document.querySelectorAll('.thumbnail').forEach((t, i) => {
            t.classList.toggle('active', i === index);
        });

        // Load image into engine
        if (this.engine) {
            await this.engine.loadImage(imageData.file);

            // Apply stored adjustments
            Object.entries(imageData.adjustments).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    this.engine.setAdjustment(key, value);
                } else if (Array.isArray(value)) {
                    const color = key.replace('hsl', '').toLowerCase();
                    value.forEach((v, i) => {
                        const channel = ['hue', 'sat', 'lum'][i];
                        this.engine.setHSL(color, channel, v);
                    });
                }
            });
        }

        // Update sliders
        this.updateSlidersFromAdjustments(imageData.adjustments);

        // Update histogram
        this.updateHistogram();

        // Push initial state to history
        this.history.pushImmediate(imageData.adjustments, 'Load Image');

        // Hide crop tool
        if (this.cropTool) {
            this.cropTool.hide();
        }

        // Update Ambience
        this.updateAmbience(imageData.file);

        this.updateUIState();
    }

    async removeImage(id) {
        const index = this.images.findIndex(i => i.id === id);
        if (index === -1) return;

        this.images.splice(index, 1);

        const thumb = this.elements.thumbnailQueue.querySelector(`[data-id="${id}"]`);
        if (thumb) thumb.remove();

        await storage.deleteImage(id);

        if (this.images.length === 0) {
            this.activeIndex = -1;
            this.clearCanvas();
        } else if (index <= this.activeIndex) {
            this.selectImage(Math.max(0, this.activeIndex - 1));
        }

        this.updateBatchCount();
        this.updateUIState();
    }

    clearCanvas() {
        if (!this.engine) return;
        const gl = this.engine.gl;
        gl.clearColor(0.118, 0.118, 0.118, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    switchTab(tabName) {
        this.elements.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        let found = false;
        this.elements.panels.forEach(panel => {
            const isActive = panel.id === `${tabName}-panel`;
            if (isActive) found = true;
            panel.classList.toggle('active', isActive);
            panel.classList.toggle('hidden', !isActive);
        });

        if (!found) {
            console.warn(`Tab panel not found: ${tabName}-panel`);
        }

        // Show/hide crop overlay
        if (tabName === 'crop' && this.cropTool && this.activeIndex >= 0 && this.engine && this.engine.canvas) {
            this.cropTool.show(this.engine.canvas.width, this.engine.canvas.height);
        } else if (this.cropTool) {
            this.cropTool.hide();
        }
    }

    handleSliderChange(e) {
        const slider = e.target;
        const name = slider.id;
        const value = parseFloat(slider.value);

        // Update display value
        const valueDisplay = document.querySelector(`.slider-value[data-for="${name}"]`);
        if (valueDisplay) {
            valueDisplay.textContent = name === 'exposure' ? value.toFixed(2) :
                (name === 'grainSize' || name === 'grainGlobal') ? value.toFixed(1) : value;
        }

        // Apply to engine
        this.engine.setAdjustment(name, value);
        this.currentAdjustments[name] = value;

        // Haptic Detents
        if (navigator.vibrate) {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (value === 0 || value === min || value === max) {
                this.hapticFeedback('light');
            }
        }

        // Update histogramic Detents
        if (navigator.vibrate) {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (value === 0 || value === min || value === max) {
                this.hapticFeedback('light');
            }
        }

        // Update histogram
        this.updateHistogram();

        // Push to history (debounced)
        const labelMap = {
            exposure: 'Exposure',
            contrast: 'Contrast',
            highlights: 'Highlights',
            shadows: 'Shadows',
            dehaze: 'Dehaze',
            clarity: 'Clarity',
            chromaticAberration: 'Lens Fringing',
            halation: 'Halation',
            overlayOpacity: 'Texture Opacity',
            lightLeak: 'Light Leak',
            scratches: 'Scratches',
            filmSeed: 'Film Seed'
        };
        this.history.push(this.engine.getAdjustments(), labelMap[name] || 'Adjustment');
    }

    /**
     * Handle texture overlay import
     */
    async handleTextureImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // save to DB
            // await this.storage.saveTexture(file); // Optional persistence

            // Load into engine
            await this.engine.loadOverlay(file);

            // Update UI state
            const textureControls = document.getElementById('texture-controls');
            const removeBtn = document.getElementById('remove-texture-btn');

            textureControls.classList.remove('opacity-50', 'pointer-events-none');
            removeBtn.classList.remove('hidden');

            // Set default opacity slider if needed
            const opacitySlider = document.getElementById('overlayOpacity');
            if (opacitySlider.value == 0) {
                opacitySlider.value = 50;
                document.querySelector('.slider-value[data-for="overlayOpacity"]').textContent = '50';
            }

            this.updateHistogram();

        } catch (err) {
            console.error('Failed to load texture:', err);
            alert('Failed to load texture overlay');
        }
    }

    /**
     * Remove texture overlay
     */
    handleRemoveTexture() {
        this.engine.removeOverlay();

        // Reset inputs
        document.getElementById('texture-input').value = '';

        // Update UI
        const textureControls = document.getElementById('texture-controls');
        const removeBtn = document.getElementById('remove-texture-btn');

        textureControls.classList.add('opacity-50', 'pointer-events-none');
        removeBtn.classList.add('hidden');

        this.engine.setAdjustment('overlayOpacity', 0);
        document.getElementById('overlayOpacity').value = 0;
        document.querySelector('.slider-value[data-for="overlayOpacity"]').textContent = '0';

        this.updateHistogram();
    }

    switchHSLChannel(channel) {
        this.hslChannel = channel;

        this.elements.hslChannelBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.channel === channel);
        });

        const adjustments = this.engine.getAdjustments();
        this.elements.hslSliders.forEach(slider => {
            const color = slider.dataset.color;
            const key = `hsl${color.charAt(0).toUpperCase() + color.slice(1)}`;
            const channelIndex = { hue: 0, sat: 1, lum: 2 }[channel];

            if (adjustments[key]) {
                slider.value = adjustments[key][channelIndex];
            }
        });
    }

    handleHSLSliderChange(e) {
        const slider = e.target;
        const color = slider.dataset.color;
        const value = parseFloat(slider.value);

        this.engine.setHSL(color, this.hslChannel, value);
        this.updateHistogram();
        this.history.push(this.engine.getAdjustments(), `HSL ${color}`);
    }

    showOriginal(show) {
        if (this.engine) {
            this.engine.setShowOriginal(show);
        }
        this.elements.beforeLabel.classList.toggle('hidden', !show);
    }

    undo() {
        const state = this.history.undo();
        if (state) {
            this.applyState(state);
        }
    }

    redo() {
        const state = this.history.redo();
        if (state) {
            this.applyState(state);
        }
    }

    applyState(state) {
        this.history.pause();
        Object.entries(state).forEach(([key, value]) => {
            if (typeof value === 'number') {
                this.engine.setAdjustment(key, value);
            } else if (Array.isArray(value)) {
                const color = key.replace('hsl', '').toLowerCase();
                value.forEach((v, i) => {
                    const channel = ['hue', 'sat', 'lum'][i];
                    this.engine.setHSL(color, channel, v);
                });
            }
        });
        this.updateSlidersFromAdjustments(state);
        this.updateHistogram();
        this.history.resume();
    }

    updateHistoryPanel(states) {
        if (!this.elements.historyList) return;

        this.elements.historyList.innerHTML = states.map(state => `
            <div class="history-item ${state.isCurrent ? 'active' : ''}" data-index="${state.index}">
                <span class="history-label">${state.label}</span>
                <span class="history-time">${HistoryManager.formatTime(state.timestamp)}</span>
            </div>
        `).join('');

        this.elements.historyList.querySelectorAll('.history-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.dataset.index);
                const state = this.history.jumpTo(index);
                if (state) {
                    this.applyState(state);
                }
            });
        });
    }

    toggleHistogram() {
        if (this.elements.histogramContainer) {
            this.elements.histogramContainer.classList.toggle('hidden');
            if (!this.elements.histogramContainer.classList.contains('hidden')) {
                this.updateHistogram();
            }
        }
    }

    toggleHistory(show = null) {
        if (this.elements.historySidebar) {
            const isOpen = !this.elements.historySidebar.classList.contains('translate-x-full');
            const shouldShow = show !== null ? show : !isOpen;
            this.elements.historySidebar.classList.toggle('translate-x-full', !shouldShow);
        }
    }

    updateHistogram() {
        if (this.engine && this.histogram && this.engine.canvas) {
            // Use setTimeout to allow WebGL to finish rendering
            setTimeout(() => {
                this.histogram.calculate(this.engine.canvas);
            }, 50);
        }
    }

    applyCrop() {
        if (!this.cropTool || this.activeIndex < 0 || !this.engine) return;

        // Apply crop and get new canvas
        const croppedCanvas = this.cropTool.applyCrop(this.engine.canvas);

        // Convert to blob and reload
        croppedCanvas.toBlob(async (blob) => {
            const file = new File([blob], this.images[this.activeIndex].name, { type: 'image/jpeg' });
            this.images[this.activeIndex].file = file;

            // Reload into engine
            await this.engine.loadImage(file);

            // Update thumbnail
            const thumbnailUrl = await this.createThumbnail(file);
            this.images[this.activeIndex].thumbnailUrl = thumbnailUrl;

            const thumb = this.elements.thumbnailQueue.querySelector(`[data-id="${this.images[this.activeIndex].id}"] img`);
            if (thumb) {
                thumb.src = thumbnailUrl;
            }

            // Reset crop tool
            this.cropTool.resetCrop();
            this.cropTool.hide();

            // Push to history
            this.history.pushImmediate(this.engine.getAdjustments(), 'Crop Applied');
        }, 'image/jpeg', 0.95);
    }

    populatePresets(category) {
        const wheel = document.getElementById('preset-wheel');
        const nameDisplay = document.getElementById('active-preset-name');

        // Alias globals
        const FilmPresets = window.FilmPresets;
        const getPresetsByCategory = window.getPresetsByCategory;

        if (!wheel) {
            console.error('Preset wheel element not found');
            return;
        }

        // Cleanup old observer
        if (this.wheelObserver) {
            this.wheelObserver.disconnect();
        }

        if (!FilmPresets) {
            console.error('FilmPresets database missing');
            wheel.innerHTML = '<div class="text-red-500 text-xs p-4">Error: DB missing</div>';
            return;
        }

        try {
        // 1. Get List of Presets
        let presetsToRender = [];

        if (category === 'custom') {
            presetsToRender = this.customPresets;
        } else if (category === 'all') {
            // Flatten all categories for the wheel
            const allCats = ['kodak', 'fuji', 'ilford', 'cinestill', 'disposable', 'bw', 'slide', 'instant', 'cinema', 'experimental', 'cinematic', 'vintage', 'modern', 'moody', 'dreamy'];
            if (this.museMode) allCats.push('muse');

            allCats.forEach(cat => {
                if (FilmPresets[cat]) {
                    const catPresets = FilmPresets[cat].filter(p => !p.hidden || this.museMode);
                    presetsToRender = presetsToRender.concat(catPresets);
                }
            });
        } else {
            console.log(`[Presets] Loading category: ${category}`);
            // If category is the secret one, only show if unlocked
            if (category === 'muse' && !this.museMode) {
                presetsToRender = [];
            } else {
                const rawPresets = getPresetsByCategory(category) || [];
                presetsToRender = rawPresets.filter(p => !p.hidden || this.museMode);
            }
        }

        if (presetsToRender.length === 0) {
            wheel.innerHTML = `<div class="text-gray-500 text-xs text-center w-full">No presets found</div>`;
            return;
        }

        // 2. Render Wheel Cards with Color Swatch Grid
        console.log(`[Wheel] Rendering ${presetsToRender.length} presets`);

        // Helper to generate CSS filter from preset values
        const generatePresetFilter = (p) => {
            const sat = 100 + (p.saturation || 0);
            const bright = 100 + ((p.exposure || 0) * 50);
            const contrast = 100 + (p.contrast || 0);
            const hueRotate = (p.temperature || 0) * 0.5; // Approximate hue shift from temp
            return `saturate(${sat}%) brightness(${bright}%) contrast(${contrast}%) hue-rotate(${hueRotate}deg)`;
        };

        // Base color swatches (red, orange, yellow, green, cyan, blue, magenta, skin)
        const swatchColors = ['#e74c3c', '#e67e22', '#f1c40f', '#2ecc71', '#1abc9c', '#3498db', '#9b59b6', '#deb887'];

        wheel.innerHTML = presetsToRender.map(preset => {
            const filter = generatePresetFilter(preset);
            const swatchesHtml = swatchColors.map(color =>
                `<div style="background-color: ${color}; filter: ${filter};"></div>`
            ).join('');

            return `
            <div class="wheel-card" data-preset="${preset.name}">
                <div class="wheel-card-preview preset-swatch-grid">
                    ${swatchesHtml}
                </div>
                <div class="wheel-card-label">${preset.name}</div>
            </div>
        `}).join('');

        // 3. Initialize IntersectionObserver for Center Detection
        const options = {
            root: wheel,
            rootMargin: '0px -45% 0px -45%', // Narrow detection zone in center (10% width)
            threshold: 0.1
        };

        this.wheelObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Item is in center
                    const card = entry.target;
                    const presetName = card.dataset.preset;

                    // Visual updates
                    wheel.querySelectorAll('.wheel-card').forEach(c => c.classList.remove('active'));
                    card.classList.add('active');

                    // Name updates
                    if (nameDisplay) {
                        nameDisplay.textContent = presetName;
                        nameDisplay.classList.remove('opacity-0');
                    }

                    // Apply Preset (Debounce could be added here if needed, but direct apply feels snappier if performant)
                    if (this.currentPresetName !== presetName) {
                        this.applyPreset(presetName);
                        // Haptic feedback
                        if (navigator.vibrate) navigator.vibrate(5);
                    }
                }
            });
        }, options);

        // Observe all cards
        wheel.querySelectorAll('.wheel-card').forEach(card => this.wheelObserver.observe(card));

        // 4. Click to scroll to item
        wheel.querySelectorAll('.wheel-card').forEach(card => {
            card.addEventListener('click', () => {
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
        });
        } catch (error) {
            console.error('Error populating presets:', error);
            wheel.innerHTML = '<div class="text-red-500 text-xs p-4">Error loading presets</div>';
        }
    }

    applyPreset(name) {
        this.currentPresetName = name;
        // Check custom presets first
        let preset = this.customPresets.find(p => p.name === name);
        if (!preset) {
            preset = window.findPreset ? window.findPreset(name) : null;
        }
        if (!preset) return;

        // Store current adjustments before applying preset (for strength blending)
        this.beforePresetAdjustments = JSON.parse(JSON.stringify(this.engine.getAdjustments()));

        this.currentPreset = name;
        this.engine.applyPreset(preset);

        // Store the full preset adjustments
        this.currentPresetAdjustments = JSON.parse(JSON.stringify(this.engine.getAdjustments()));

        // Reset strength to 100%
        this.presetStrength = 100;
        if (this.elements.presetStrength) {
            this.elements.presetStrength.value = 100;
            this.elements.presetStrengthValue.textContent = '100%';
        }

        // Show strength slider
        if (this.elements.presetStrengthContainer) {
            this.elements.presetStrengthContainer.classList.remove('hidden');
        }

        const adjustments = this.engine.getAdjustments();
        this.updateSlidersFromAdjustments(adjustments);
        this.updateHistogram();

        this.history.pushImmediate(adjustments, `Preset: ${name}`);
    }

    /**
     * Update preset strength - blends between original and preset
     */
    updatePresetStrength(strength) {
        if (!this.beforePresetAdjustments || !this.currentPresetAdjustments) return;

        this.presetStrength = strength;
        if (this.elements.presetStrengthValue) {
            this.elements.presetStrengthValue.textContent = strength + '%';
        }

        const t = strength / 100;
        const blended = {};

        // Blend each numeric adjustment
        Object.keys(this.currentPresetAdjustments).forEach(key => {
            const before = this.beforePresetAdjustments[key];
            const after = this.currentPresetAdjustments[key];

            if (typeof before === 'number' && typeof after === 'number') {
                blended[key] = before + (after - before) * t;
            } else if (Array.isArray(before) && Array.isArray(after)) {
                blended[key] = before.map((v, i) => v + (after[i] - v) * t);
            } else {
                blended[key] = after;
            }
        });

        // Apply blended adjustments
        Object.entries(blended).forEach(([key, value]) => {
            if (typeof value === 'number') {
                this.engine.setAdjustment(key, value);
            }
        });

        this.engine.render();
        this.updateSlidersFromAdjustments(blended);
        this.updateHistogram();
    }


    showSavePresetModal() {
        if (this.elements.savePresetModal) {
            this.elements.savePresetModal.classList.remove('hidden');
            this.elements.presetNameInput.value = '';
            this.elements.presetNameInput.focus();
        }
    }

    hideSavePresetModal() {
        if (this.elements.savePresetModal) {
            this.elements.savePresetModal.classList.add('hidden');
        }
    }

    async saveCustomPreset() {
        const name = this.elements.presetNameInput.value.trim();
        if (!name) {
            alert('Please enter a preset name');
            return;
        }

        const preset = {
            name,
            category: 'custom',
            ...this.engine.getAdjustments()
        };

        this.customPresets.push(preset);

        // Save to IndexedDB
        await storage.savePreset(preset);

        this.hideSavePresetModal();

        // Refresh presets if viewing custom
        if (document.querySelector('.preset-category.active')?.dataset.category === 'custom') {
            this.populatePresets('custom');
        }

        console.log(`✓ Preset "${name}" saved`);
    }

    async loadCustomPresets() {
        try {
            this.customPresets = await storage.getAllPresets();
        } catch (error) {
            console.warn('Could not load custom presets:', error);
        }
    }

    showExportSettings() {
        if (this.elements.exportSettingsModal) {
            this.elements.exportSettingsModal.classList.remove('hidden');
            this.elements.exportResolution.value = this.exportSettings.resolution;
            this.elements.exportCustomWidth.value = this.exportSettings.customWidth;
            this.elements.exportQuality.value = this.exportSettings.quality;
            this.elements.exportQualityValue.textContent = this.exportSettings.quality + '%';
            this.elements.exportExif.checked = this.exportSettings.preserveExif;
            this.elements.customResolutionGroup.classList.toggle('hidden', this.exportSettings.resolution !== 'custom');
        }
    }

    updateBatchExportButton() {
        // Now handled by CSS (hidden/flex) or manual toggle?
        // Actually, the footer is always visible on mobile, or should it hide if 0 images?
        // Requirement: "Impossible to miss". Usually always there eventually.
        // But original logic hid the button if count < 2 or similar.

        const btn = document.getElementById('batch-export-btn');
        const syncBtn = document.getElementById('sync-all-btn');
        const count = this.images.length;

        if (btn) {
            const countDisplay = btn.querySelector('#batch-count');
            if (countDisplay) countDisplay.textContent = count;

            // Enable/disable based on count
            btn.disabled = count === 0;
            // Original logic hid it. Let's keep it visible but disabled if empty? 
            // Or toggle hidden class.
            // If footer wraps it, hiding button might leave empty footer on mobile.
            // Let's assume footer is permanent UI now.
            btn.classList.toggle('opacity-50', count === 0);
        }

        if (syncBtn) {
            syncBtn.disabled = count < 2;
        }

        // Update footer visibility itself?
        // User didn't ask to hide it.
        // Just update the batch count text.
        const batchCountSpan = document.getElementById('batch-count'); // The span inside button
        if (batchCountSpan) batchCountSpan.textContent = count;
    }

    hideExportSettings() {
        if (this.elements.exportSettingsModal) {
            this.elements.exportSettingsModal.classList.add('hidden');
        }
    }

    saveExportSettings() {
        this.exportSettings = {
            resolution: this.elements.exportResolution.value,
            customWidth: parseInt(this.elements.exportCustomWidth.value) || 1920,
            quality: parseInt(this.elements.exportQuality.value),
            preserveExif: this.elements.exportExif.checked
        };
        this.hideExportSettings();
    }

    updateSlidersFromAdjustments(adjustments) {
        document.querySelectorAll('.studio-slider').forEach(slider => {
            const name = slider.id;
            if (name in adjustments && typeof adjustments[name] === 'number') {
                slider.value = adjustments[name];

                const valueDisplay = document.querySelector(`.slider-value[data-for="${name}"]`);
                if (valueDisplay) {
                    valueDisplay.textContent = name === 'exposure' ? adjustments[name].toFixed(2) :
                        name === 'grainSize' ? adjustments[name].toFixed(1) :
                            adjustments[name];
                }
            }
        });
    }

    syncAllImages() {
        if (this.images.length <= 1) return;

        const adjustments = this.engine.getAdjustments();

        if (this.worker) {
            this.worker.postMessage({
                type: 'SYNC_ADJUSTMENTS',
                payload: {
                    imageIds: this.images.map(i => i.id),
                    adjustments
                }
            });
        }

        this.images.forEach(img => {
            img.adjustments = { ...adjustments };
        });

        console.log(`Synced adjustments to ${this.images.length} images`);
    }

    resetAdjustments() {
        this.engine.resetAdjustments();
        this.currentPreset = null;

        const adjustments = this.engine.getAdjustments();
        this.updateSlidersFromAdjustments(adjustments);
        this.updateHistogram();

        if (this.toneCurve) {
            this.toneCurve.resetAll();
        }

        document.querySelectorAll('.preset-card').forEach(c => c.classList.remove('active'));

        this.history.pushImmediate(adjustments, 'Reset All');
    }

    async exportImage() {
        if (this.activeIndex < 0) return;

        const format = this.elements.exportFormat.value;
        const quality = this.exportSettings.quality / 100;

        this.elements.exportModal.classList.remove('hidden');
        this.updateExportProgress(0);

        const updateProgress = (progress) => {
            this.updateExportProgress(progress);
        };

        try {
            // Try Native Share first on mobile
            let shared = false;
            // Callback for Vibes
            const drawCallback = (ctx, w, h) => this.drawVibeOverlays(ctx, w, h);

            // Native Share Check
            if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) && navigator.share) {
                // Pass callback
                shared = await this.exportManager.shareImage(format, quality, drawCallback);
            }

            // Fallback to download if not shared
            if (!shared) {
                await this.exportManager.exportImage(format, quality, null, updateProgress, drawCallback);
            }

            this.hapticFeedback('success');

        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed. Please try again.');
        } finally {
            this.isExporting = false;
            btn.disabled = false;
            btn.innerHTML = originalText;
            modal.classList.add('hidden');
        }
    }
    updateExportProgress(percent) {
        const circumference = 2 * Math.PI * 56;
        const offset = circumference - (percent / 100) * circumference;

        this.elements.progressRingFill.style.strokeDashoffset = offset;
        this.elements.progressText.textContent = `${Math.round(percent)}%`;
    }

    updateBatchCount() {
        this.elements.batchCount.textContent = `${this.images.length} / 10`;
    }

    updateUIState() {
        const hasImages = this.images.length > 0;
        const hasActiveImage = this.activeIndex >= 0;

        // Toggle empty state visibility
        // Toggle empty state visibility
        this.elements.canvasContainer.classList.toggle('has-image', hasImages);

        if (this.elements.placeholderContainer) {
            // Explicitly handle visibility for robustness
            if (hasImages) {
                this.elements.placeholderContainer.classList.add('opacity-0', 'pointer-events-none');
                // Small delay to allow transition before fully hiding if desired, 
                // but strictly adding the class is enough as styles.css handles it too.
            } else {
                this.elements.placeholderContainer.classList.remove('opacity-0', 'pointer-events-none');
            }
        }

        this.elements.syncAllBtn.disabled = this.images.length <= 1;
        this.elements.exportBtn.disabled = !hasActiveImage;
        const batchBtn = document.getElementById('batch-export-btn');
        if (batchBtn) {
            // Show only if we have images
            if (hasImages) batchBtn.classList.remove('hidden');
            else batchBtn.classList.add('hidden');
        }
        this.elements.resetBtn.disabled = !hasActiveImage;

        // Share button
        if (this.elements.shareBtn) {
            this.elements.shareBtn.disabled = !hasActiveImage;
        }
    }

    async loadSavedImages() {
        try {
            const savedImages = await storage.getAllImages();

            for (const imageData of savedImages) {
                const blob = storage.base64ToBlob(imageData.fileData);
                const file = new File([blob], imageData.name, { type: blob.type });

                const restored = {
                    ...imageData,
                    file,
                    thumbnailUrl: imageData.thumbnailUrl
                };

                this.images.push(restored);
                this.addThumbnailToQueue(restored);
            }

            if (this.images.length > 0) {
                this.selectImage(0);
            }

            this.updateBatchCount();
            this.updateUIState();
        } catch (error) {
            console.warn('Could not load saved images:', error);
        }
    }

    // --- ADAPTIVE AMBIENCE ---
    async updateAmbience(imageSource) {
        try {
            const canvas = new OffscreenCanvas(10, 10);
            const ctx = canvas.getContext('2d');

            let img;
            if (imageSource instanceof File || imageSource instanceof Blob) {
                img = await createImageBitmap(imageSource);
            } else {
                img = imageSource;
            }

            ctx.drawImage(img, 0, 0, 10, 10);
            const data = ctx.getImageData(0, 0, 10, 10).data;

            let r = 0, g = 0, b = 0;
            for (let i = 0; i < data.length; i += 4) {
                r += data[i];
                g += data[i + 1];
                b += data[i + 2];
            }

            const pixelCount = data.length / 4;
            r = Math.round(r / pixelCount);
            g = Math.round(g / pixelCount);
            b = Math.round(b / pixelCount);

            const color = `rgb(${r}, ${g}, ${b})`;
            document.documentElement.style.setProperty('--adaptive-bg', color);

            // Luminance Check
            const lum = (0.299 * r + 0.587 * g + 0.114 * b);
            const isDark = lum < 128; // Not used for now, but ready for logic

        } catch (e) {
            // silent fail
        }
    }

    toggleUI() {
        // Toggle the entire studio dock
        const dock = document.getElementById('studio-dock');
        const isHidden = dock.classList.contains('hidden');

        if (isHidden) {
            dock.classList.remove('hidden');
            this.elements.toggleUIBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>`;
        } else {
            dock.classList.add('hidden');
            this.elements.toggleUIBtn.innerHTML = `
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 15l7-7 7 7" />
                </svg>`;
        }
    }

    exportProject() {
        if (this.activeIndex < 0) return;

        const state = {
            version: 1,
            timestamp: Date.now(),
            images: this.images.map(img => ({
                name: img.name,
                adjustments: img.adjustments,
                presets: img.presets || [] // usage if any
            })),
            activeIndex: this.activeIndex,
            customPresets: this.customPresets
        };

        const exportManager = new ExportManager(this.engine);
        if (exportManager.exportState(state)) {
            console.log('✓ Project exported');
        } else {
            alert('Failed to export project');
        }
    }

    async importProject(file) {
        try {
            const text = await file.text();
            const state = JSON.parse(text);

            if (!state.images || !Array.isArray(state.images)) {
                throw new Error('Invalid project file');
            }

            console.log('Importing project...', state);

            // Restore custom presets first
            if (state.customPresets) {
                // Logic to merge or restore presets
            }

            // Note: This simple import only restores metadata/adjustments. 
            // It CANNOT restore the actual image files unless they were base64 embedded (huge size)
            // or if we match by name (fragile). 
            // For now, assuming user re-uploads images or this is for "applying settings to current images".

            // If the goal is "Repair Data Persistence", we should check if the user intended 
            // strict 1:1 project restore. Without the source images, we can only restore settings.

            if (this.images.length > 0 && state.images.length > 0) {
                // Try to apply functionality to current images? 
                // Or just alert the user.
                alert('Project settings loaded. Please ensure corresponding images are open.');
            }

        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import project file');
        }
    }

    handleKeyboard(e) {
        // Cmd/Ctrl + Z - Undo
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'z') {
            e.preventDefault();
            this.undo();
        }

        // Cmd/Ctrl + Shift + Z - Redo
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'z') {
            e.preventDefault();
            this.redo();
        }

        // Cmd/Ctrl + E - Export Image
        if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === 'e') {
            e.preventDefault();
            this.exportImage();
        }

        // Cmd/Ctrl + Shift + E - Export Project (JSON)
        if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 'e') {
            e.preventDefault();
            this.exportProject();
        }

        // Cmd/Ctrl + R - Reset
        if ((e.metaKey || e.ctrlKey) && e.key === 'r') {
            e.preventDefault();
            this.resetAdjustments();
        }

        // B - Before/After toggle
        if (e.key === 'b' || e.key === 'B') {
            if (e.type === 'keydown') {
                this.showOriginal(true);
            }
        }

        // Arrow keys - Navigate images
        if (e.key === 'ArrowLeft' && this.activeIndex > 0) {
            this.selectImage(this.activeIndex - 1);
        }
        if (e.key === 'ArrowRight' && this.activeIndex < this.images.length - 1) {
            this.selectImage(this.activeIndex + 1);
        }

        // Number keys 1-6 - Switch tabs
        if (['1', '2', '3', '4', '5', '6'].includes(e.key) && !e.metaKey && !e.ctrlKey) {
            const tabs = ['tone', 'curve', 'color', 'effects', 'crop', 'presets'];
            this.switchTab(tabs[parseInt(e.key) - 1]);
        }

        // H - Toggle histogram
        if (e.key === 'h' || e.key === 'H') {
            this.toggleHistogram();
        }
    }

    /**
     * Initialize gesture controls for mobile
     */
    initGestures() {
        const container = this.elements.canvasContainer;
        if (!container) return;

        let touchStartX = 0;
        let touchStartY = 0;
        let touchStartTime = 0;

        // Pinch-to-zoom
        container.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                this.gestureState.isPinching = true;
                this.gestureState.initialDistance = this.getDistance(e.touches[0], e.touches[1]);
                this.gestureState.initialScale = this.gestureState.currentScale;
            } else if (e.touches.length === 1) {
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchStartTime = Date.now();
            }
        }, { passive: true });

        container.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && this.gestureState.isPinching) {
                const distance = this.getDistance(e.touches[0], e.touches[1]);
                const scale = (distance / this.gestureState.initialDistance) * this.gestureState.initialScale;
                this.gestureState.currentScale = Math.max(0.5, Math.min(3, scale));
                this.elements.canvas.style.transform = `scale(${this.gestureState.currentScale})`;
            }
        }, { passive: true });

        container.addEventListener('touchend', (e) => {
            if (this.gestureState.isPinching && e.touches.length < 2) {
                this.gestureState.isPinching = false;
            }

            // Swipe detection for image navigation
            if (e.changedTouches.length === 1 && !this.gestureState.isPinching) {
                const touch = e.changedTouches[0];
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;
                const deltaTime = Date.now() - touchStartTime;

                // Horizontal swipe threshold
                if (Math.abs(deltaX) > 100 && Math.abs(deltaY) < 50 && deltaTime < 300) {
                    if (deltaX > 0 && this.activeIndex > 0) {
                        // Swipe right - previous image
                        this.selectImage(this.activeIndex - 1);
                    } else if (deltaX < 0 && this.activeIndex < this.images.length - 1) {
                        // Swipe left - next image
                        this.selectImage(this.activeIndex + 1);
                    }
                }
            }
        }, { passive: true });

        // Double-tap to reset zoom
        let lastTapTime = 0;
        container.addEventListener('touchend', (e) => {
            if (e.touches.length > 0) return;

            const now = Date.now();
            if (now - lastTapTime < 300) {
                // Double tap - reset zoom
                this.gestureState.currentScale = 1;
                this.elements.canvas.style.transform = 'scale(1)';
            }
            lastTapTime = now;
        }, { passive: true });
    }

    /**
     * Get distance between two touch points
     */
    getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    /**
     * Share image using native share API
     */
    async shareImage() {
        if (this.activeIndex < 0) return;

        try {
            const format = this.elements.exportFormat.value;
            const dataUrl = await this.engine.exportImage(format, 0.95);

            // Convert data URL to blob
            const response = await fetch(dataUrl);
            const blob = await response.blob();
            const file = new File([blob], `untitled-studio-${Date.now()}.${format}`, { type: blob.type });

            if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                await navigator.share({
                    files: [file],
                    title: 'Untitled Studio Export',
                    text: 'Edited with Untitled Studio'
                });
                console.log('✓ Shared successfully');
            } else if (navigator.share) {
                // Fallback: share just the URL/text
                await navigator.share({
                    title: 'Untitled Studio Export',
                    text: 'Check out my photo edited with Untitled Studio!'
                });
            } else {
                // No share API - fallback to download
                this.exportImage();
            }
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Share failed:', error);
                // Fallback to download
                this.exportImage();
            }
        }
    }

    /**
     * Export for social media with specific dimensions
     */
    async exportForSocial(sizePreset) {
        if (this.activeIndex < 0) return;

        const sizes = {
            'instagram-square': { width: 1080, height: 1080 },
            'instagram-story': { width: 1080, height: 1920 },
            'twitter': { width: 1200, height: 675 },
            'facebook': { width: 1200, height: 630 }
        };

        const size = sizes[sizePreset];
        if (!size) return;

        // Show progress modal
        this.elements.exportModal.classList.remove('hidden');
        this.updateExportProgress(0);

        try {
            // Get current canvas
            this.engine.render();
            const sourceCanvas = this.elements.canvas;

            // Create output canvas at target size
            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = size.width;
            outputCanvas.height = size.height;
            const ctx = outputCanvas.getContext('2d');

            // Calculate crop to fill (center crop)
            const sourceAspect = sourceCanvas.width / sourceCanvas.height;
            const targetAspect = size.width / size.height;

            let sx = 0, sy = 0, sw = sourceCanvas.width, sh = sourceCanvas.height;

            if (sourceAspect > targetAspect) {
                // Source is wider - crop sides
                sw = sourceCanvas.height * targetAspect;
                sx = (sourceCanvas.width - sw) / 2;
            } else {
                // Source is taller - crop top/bottom
                sh = sourceCanvas.width / targetAspect;
                sy = (sourceCanvas.height - sh) / 2;
            }

            this.updateExportProgress(50);

            // Draw cropped and scaled
            ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, size.width, size.height);

            // Vibe Overlays
            if (this.drawVibeOverlays) {
                this.drawVibeOverlays(ctx, size.width, size.height);
            }

            this.updateExportProgress(80);

            // Export
            const mimeType = this.elements.exportFormat.value === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = outputCanvas.toDataURL(mimeType, 0.95);

            // Download
            const link = document.createElement('a');
            link.download = `untitled-studio-${sizePreset}-${Date.now()}.${this.elements.exportFormat.value}`;
            link.href = dataUrl;
            link.click();

            this.updateExportProgress(100);
            await new Promise(r => setTimeout(r, 500));

        } catch (error) {
            console.error('Social export failed:', error);
            alert('Export failed. Please try again.');
        }

        this.elements.exportModal.classList.add('hidden');
    }

    // --- BATCH EXPORT ---

    showBatchExportModal() {
        const modal = document.getElementById('batch-export-modal');
        if (modal) modal.classList.remove('hidden');
    }

    hideBatchExportModal() {
        const modal = document.getElementById('batch-export-modal');
        if (modal) modal.classList.add('hidden');
    }

    async processBatch(mode) {
        this.hideBatchExportModal();
        if (this.images.length === 0) return;

        this.elements.exportModal.classList.remove('hidden');
        this.updateExportProgress(0);

        try {
            const blobs = [];
            const filenames = [];

            // 1. RENDER PHASE
            // Need to save current state first to avoid losing edits on current image
            if (this.activeIndex >= 0) {
                this.images[this.activeIndex].adjustments = this.engine.getAdjustments();
            }

            for (let i = 0; i < this.images.length; i++) {
                const imgData = this.images[i];
                const progress = (i / this.images.length) * 50;
                this.updateExportProgress(progress);

                // Load original
                await this.engine.loadImage(imgData.file);

                // Apply adjustments
                const adjustments = imgData.adjustments;
                Object.entries(adjustments).forEach(([key, value]) => {
                    if (typeof value === 'number') {
                        this.engine.setAdjustment(key, value);
                    } else if (Array.isArray(value)) {
                        const color = key.replace('hsl', '').toLowerCase();
                        value.forEach((v, idx) => {
                            const channel = ['hue', 'sat', 'lum'][idx];
                            this.engine.setHSL(color, channel, v);
                        });
                    }
                });

                // Render High Quality
                this.engine.render();

                // Export Blob
                const format = this.elements.exportFormat.value; // Use global selection
                const quality = this.exportSettings.quality / 100;

                const blob = await new Promise(resolve => {
                    this.elements.canvas.toBlob(resolve, format === 'png' ? 'image/png' : 'image/jpeg', quality);
                });

                blobs.push(blob);
                filenames.push(`untitled-studio-batch-${i + 1}.${format}`);
            }

            this.updateExportProgress(60);

            // 2. SAVE PHASE
            if (mode === 'zip') {
                if (window.JSZip) {
                    const zip = new JSZip();
                    blobs.forEach((blob, i) => {
                        zip.file(filenames[i], blob);
                    });

                    this.updateExportProgress(80);
                    const content = await zip.generateAsync({ type: 'blob' });

                    const link = document.createElement('a');
                    link.download = `Untitled_Studio_Batch_${Date.now()}.zip`;
                    link.href = URL.createObjectURL(content);
                    link.click();
                } else {
                    alert('JSZip library not active');
                }
            } else {
                // Waterfall
                for (let i = 0; i < blobs.length; i++) {
                    const link = document.createElement('a');
                    link.download = filenames[i];
                    link.href = URL.createObjectURL(blobs[i]);
                    link.click();

                    this.updateExportProgress(60 + ((i + 1) / blobs.length) * 40);
                    // Delay to prevent browser blocking
                    await new Promise(r => setTimeout(r, 600));
                }
            }

            this.updateExportProgress(100);
            await new Promise(r => setTimeout(r, 500));

            // Restore Original Active Image
            if (this.activeIndex >= 0) {
                this.selectImage(this.activeIndex);
            }

        } catch (e) {
            console.error('Batch failed', e);
            alert('Batch export failed.');
        }

        this.elements.exportModal.classList.add('hidden');
    }
    // --- MASKING SYSTEM (Phase 4) ---

    initMasks() {
        this.masks = [];
        this.activeMaskId = null;
        this.renderMaskList();
    }

    addMask(type = 'linear') {
        const id = Date.now().toString(36);
        const newMask = {
            id,
            name: `${type.charAt(0).toUpperCase() + type.slice(1)} Mask ${this.masks.length + 1}`,
            type, // 'linear' or 'radial'
            enabled: true,
            x: 0.5,
            y: 0.5,
            radius: 0.3,    // For radial
            rotation: 0,    // For linear
            feather: 0.2,
            invert: false,
            // Each mask has its own local adjustments
            adjustments: {
                exposure: 0,
                contrast: 0,
                saturation: 0,
                temperature: 0,
                tint: 0
            }
        };

        this.masks.push(newMask);
        this.activateMask(id);
        this.updateEngineMasks();
        this.renderMaskList();
    }

    deleteMask() {
        if (!this.activeMaskId) return;
        this.masks = this.masks.filter(m => m.id !== this.activeMaskId);
        this.activeMaskId = null;
        this.updateEngineMasks();
        this.renderMaskList();
        this.updateMaskUI();
    }

    activateMask(id) {
        this.activeMaskId = id;
        if (this.engine) this.engine.setActiveMaskId(id);
        this.renderMaskList();
        this.updateMaskUI();
    }

    toggleMask(id) {
        const mask = this.masks.find(m => m.id === id);
        if (mask) {
            mask.enabled = !mask.enabled;
            this.updateEngineMasks();
            this.renderMaskList();
        }
    }

    updateMask(updates) {
        if (!this.activeMaskId) return;
        const mask = this.masks.find(m => m.id === this.activeMaskId);
        if (!mask) return;

        Object.assign(mask, updates);
        this.updateEngineMasks();
    }

    updateEngineMasks() {
        if (this.engine) {
            this.engine.setMasks(this.masks);
        }
    }

    renderMaskList() {
        if (!this.elements.maskList) return;

        if (this.masks.length === 0) {
            this.elements.maskList.innerHTML = '<div class="text-center text-xs text-gray-500 py-4">No masks created</div>';
            this.elements.maskControls?.classList.add('hidden');
            return;
        }

        this.elements.maskList.innerHTML = this.masks.map(mask => `
            <div class="mask-item flex items-center justify-between p-2 rounded bg-white/5 hover:bg-white/10 cursor-pointer ${mask.id === this.activeMaskId ? 'ring-1 ring-hot-pink bg-white/10' : ''}"
                 data-id="${mask.id}">
                <span class="text-xs font-mono pointer-events-none">${mask.name}</span>
                <div class="flex gap-2 pointer-events-none">
                    <button class="mask-toggle-btn text-xs text-gray-400 hover:text-white pointer-events-auto" data-id="${mask.id}">
                        ${mask.enabled ? '👁️' : '🚫'}
                    </button>
                </div>
            </div>
        `).join('');

        // Show controls if mask active
        if (this.activeMaskId) {
            this.elements.maskControls?.classList.remove('hidden');
        } else {
            this.elements.maskControls?.classList.add('hidden');
        }
    }

    updateMaskUI() {
        if (!this.activeMaskId) return;
        const mask = this.masks.find(m => m.id === this.activeMaskId);
        if (!mask) return;

        // Update Transform Sliders
        const setVal = (id, val) => {
            const el = document.getElementById('mask-' + id);
            if (el) el.value = val;
            const disp = document.querySelector(`.slider-value[data-for="mask-${id}"]`);
            if (disp) disp.textContent = typeof val === 'number' ? val.toFixed(2) : val;
        };

        setVal('x', mask.x);
        setVal('y', mask.y);
        setVal('radius', mask.radius);
        setVal('rotation', mask.rotation);
        setVal('feather', mask.feather);

        if (this.elements.maskInvert) this.elements.maskInvert.checked = mask.invert;

        // Also update the main adjustment sliders to reflect this mask's settings
        if (mask.adjustments) {
            this.updateSlidersFromAdjustments(mask.adjustments);
        }
    }

    autoEnhance() {
        console.log('[App] autoEnhance triggered');
        if (!this.histogram) console.error('[App] No Histogram');
        if (!this.engine) console.error('[App] No Engine');

        if (!this.histogram || !this.engine) return;

        const stats = this.histogram.getStats();
        console.log('[App] Auto Enhance Stats:', stats);


        const targetAvg = 127;
        const diff = targetAvg - stats.avgL;
        let exposure = diff / 100;
        exposure = Math.max(-1.5, Math.min(1.5, exposure));

        const range = stats.maxL - stats.minL;
        let contrast = 0;
        if (range < 200) {
            contrast = (200 - range) / 4;
        }
        contrast = Math.min(30, contrast);

        let shadows = 0;
        let highlights = 0;

        if (stats.minL < 10) shadows = 15;
        if (stats.maxL > 245) highlights = -15;

        const adjustments = {
            exposure,
            contrast,
            shadows,
            highlights,
            temperature: 0,
            tint: 0
        };

        this.history.push(this.engine.getAdjustments(), 'Before Auto');

        Object.entries(adjustments).forEach(([key, val]) => {
            this.engine.setAdjustment(key, val);
        });

        this.updateSlidersFromAdjustments(this.engine.getAdjustments());
        this.updateHistogram();
        this.history.push(this.engine.getAdjustments(), 'Auto Enhance ✨');
        this.hapticFeedback('success');
    }
    showToast(message, duration = 3000) {
        let toast = document.getElementById('studio-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'studio-toast';
            toast.className = 'fixed top-4 left-1/2 transform -translate-x-1/2 bg-black/80 border border-glass-border text-white px-6 py-3 rounded-full text-sm font-medium shadow-2xl backdrop-blur-md z-50 transition-all duration-300 opacity-0 -translate-y-4 pointer-events-none flex items-center gap-2';
            // Add icon
            toast.innerHTML = `<span class="text-hot-pink">✨</span> <span id="toast-msg"></span>`;
            document.body.appendChild(toast);
        }

        const msgEl = toast.querySelector('#toast-msg') || toast;
        msgEl.textContent = message;

        // Show
        requestAnimationFrame(() => {
            toast.classList.remove('opacity-0', '-translate-y-4');
        });

        // Hide
        if (this.toastTimer) clearTimeout(this.toastTimer);
        this.toastTimer = setTimeout(() => {
            toast.classList.add('opacity-0', '-translate-y-4');
        }, duration);
    }

    initSecretMode() {
        // Triple-click on credit shows dedication
        const credit = document.querySelector('.brand-credit-author');
        if (!credit) return;

        this.secretClicks = 0;
        this.secretTimer = null;

        credit.addEventListener('click', (e) => {
            e.preventDefault();
            this.secretClicks++;

            if (this.secretClicks === 1) {
                this.secretTimer = setTimeout(() => {
                    this.secretClicks = 0;
                }, 2000); // 2 seconds to click 3 times
            }

            if (this.secretClicks === 3) {
                clearTimeout(this.secretTimer);
                this.secretClicks = 0;

                // Show Dedication Toast
                this.showToast('buat my istri dinda ❤️');
            }
        });
    }

    injectSecretCategory() {
        const grid = this.elements.presetsPanel.querySelector('.flex.overflow-x-auto');
        if (grid && !grid.querySelector('[data-category="secret"]')) {
            const btn = document.createElement('button');
            btn.className = 'preset-category px-3 py-1 bg-glass border border-glass-border rounded-lg text-xs text-emerald-400 font-mono';
            btn.dataset.category = 'secret';
            btn.textContent = 'SECRET';
            grid.appendChild(btn);

            // Re-attach listeners? 
            // We used delegation in some places, but preset categories might be direct.
            // checking renderMaskList vs presets...
            // initPresets() uses querySelectorAll. We might need to manually attach.
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-category').forEach(b => {
                    b.classList.remove('bg-white', 'text-black');
                    b.classList.add('bg-glass', 'text-white');
                });
                btn.classList.remove('bg-glass', 'text-white');
                btn.classList.add('bg-emerald-500', 'text-black');
                this.populatePresets('secret');
            });
        }
    }
}
// Handle B key release for Before/After
document.addEventListener('keyup', (e) => {
    if ((e.key === 'b' || e.key === 'B') && window.app) {
        window.app.showOriginal(false);
    }
});

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new UntitledStudio();
});
