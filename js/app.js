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
        this.terminalViewer = null;



        // State
        this.images = [];
        this.rolls = []; // Multi-roll support
        this.activeRollId = null;
        this.activeIndex = -1;
        this.currentAdjustments = null;
        this.currentPreset = null;
        this.customPresets = [];
        this.favoritePresets = JSON.parse(localStorage.getItem('favoritePresets') || '[]');
        this.museMode = localStorage.getItem('museMode') === 'true';
        this.isMobile = window.innerWidth < 800;
        this.exportSettings = {
            resolution: 'original',
            customWidth: 1920,
            quality: 95,
            preserveExif: true
        };




        // PWA Install State
        this.deferredPrompt = null;
        this.initPWA();

        // Theme Engine initialization moved to init() method to avoid duplication

        // Initialize Startup Toast (Random)
        const toastContainer = document.getElementById('startup-toast');
        if (toastContainer) {
            // 1. Define Message Pools
            const normalMessages = [
                "Calibrating scanner lens...",
                "Replenishing C-41 chemistry...",
                "Spooling film to take-up reel...",
                "Agitating developer tank...",
                "Scanning resolution: 4000 DPI...",
                "Developing chemicals... please wait.",
                "When yah kamera fuji"
            ];

            const warningMessages = [
                "WARN: Developer temp critical (39°C)...",
                "Stabilizer exhausted. Replenish immediately.",
                "Scanner drum imbalance detected.",
                "Halation matrix desync. Retrying...",
                "WARN: Silver retention high in bleach bypass.",
                "Dust removal algorithm failing...",
                "Memory low: Unable to cache grain structure."
            ];

            const errorMessages = [
                "FATAL: Film jammed in transport gate.",
                "ERR_LIGHT_LEAK: Massive fogging detected.",
                "CRITICAL: Emulsion melting. Process halted.",
                "ERR_CORRUPT: Negative density unreadable.",
                "SYSTEM FAILURE: Scanner bulb blowout.",
                "ERR_404: Film stock profile not found.",
                "BUFFER_OVERFLOW: Grain engine crash.",
                "FATAL: Shutter curtain stuck open."
            ];

            const asciiDND = `
██████╗ ███╗   ██╗██████╗
██╔══██╗████╗  ██║██╔══██╗
██║  ██║██╔██╗ ██║██║  ██║
██║  ██║██║╚██╗██║██║  ██║
██████╔╝██║ ╚████║██████╔╝
╚═════╝ ╚═╝  ╚═══╝╚═════╝`;

            // 15% chance for ASCII DND, else random text
            const rand = Math.random();
            let contentHTML = '';

            if (rand < 0.15) {
                contentHTML = `<div class="ascii-content">${asciiDND}</div>`;
            } else if (rand < 0.75) {
                // 60% Normal (Green HUD)
                const msg = normalMessages[Math.floor(Math.random() * normalMessages.length)];
                contentHTML = `<div class="viewfinder-hud">${msg}</div>`;
            } else if (rand < 0.90) {
                // 15% Warning (Yellow Flicker)
                const msg = warningMessages[Math.floor(Math.random() * warningMessages.length)];
                contentHTML = `<div class="viewfinder-hud toast-warning">${msg}</div>`;
                // CRT Glitch Trigger (Warning)
                const overlay = document.getElementById('crt-overlay');
                if (overlay) {
                    overlay.classList.add('crt-glitch');
                    setTimeout(() => overlay.classList.remove('crt-glitch'), 500);
                }
            } else {
                // 10% Critical Error (Red Shake)
                const msg = errorMessages[Math.floor(Math.random() * errorMessages.length)];
                contentHTML = `<div class="viewfinder-hud toast-error">${msg}</div>`;
                // CRT Glitch Trigger (Error)
                const overlay = document.getElementById('crt-overlay');
                if (overlay) {
                    overlay.classList.add('crt-glitch');
                    setTimeout(() => overlay.classList.remove('crt-glitch'), 1200);
                }
            }

            // 3. Inject and Animate
            toastContainer.innerHTML = contentHTML;



            // Fade out
            setTimeout(() => {
                toastContainer.classList.add('opacity-0');
                setTimeout(() => toastContainer.remove(), 1000);
            }, 4000);
        }

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
        // initMasks is called inside init() typically, but initSecretMode is new.
        // Let's call them here to be safe or check init()
        this.initSecretMode();
        // this.initWasm(); // Wasm Disabled for Static Lite

        // Texture Lazy Loading logic
        this.textureLoadPromise = null;

        // LUT Parser
        this.lutParser = new LUTParser();

        // Global Audio Listener
        this.audio = window.Sonic; // Initialize from global
        document.addEventListener('click', (e) => {
            if (this.audio && (e.target.tagName === 'BUTTON' || e.target.closest('button') || e.target.classList.contains('studio-slider'))) {
                this.audio.playClick(); // Ensure playClick exists if checking audio
            }
        });

        // Initialize Floating Scopes
        this.scopesVisible = localStorage.getItem('scopesVisible') !== 'false'; // Default true
        this.initScopes();
    }



    initScopes() {
        const hud = document.getElementById('scopes-hud');
        const toggleBtn = document.getElementById('toggle-scopes-btn');

        if (hud && toggleBtn) {
            // Set initial state
            hud.classList.toggle('hidden', !this.scopesVisible);
            toggleBtn.classList.toggle('text-white', this.scopesVisible);
            toggleBtn.classList.toggle('text-gray-400', !this.scopesVisible);

            if (this.scopesVisible) {
                toggleBtn.classList.add('bg-glass');
            }

            // Toggle Listener
            toggleBtn.addEventListener('click', () => {
                this.scopesVisible = !this.scopesVisible;
                localStorage.setItem('scopesVisible', this.scopesVisible);

                // Animate
                if (this.scopesVisible) {
                    hud.classList.remove('hidden');
                    // Small delay to allow transition if we were using opacity
                    toggleBtn.classList.remove('text-gray-400');
                    toggleBtn.classList.add('text-white', 'bg-glass');
                } else {
                    hud.classList.add('hidden');
                    toggleBtn.classList.add('text-gray-400');
                    toggleBtn.classList.remove('text-white', 'bg-glass');
                }

                if (this.audio) this.audio.playClick();
            });
        }
    }

    initPWA() {
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevent Chrome 67 and earlier from automatically showing the prompt
            e.preventDefault();
            // Stash the event so it can be triggered later.
            this.deferredPrompt = e;

            // Show the install button
            const installBtn = document.getElementById('install-btn');
            if (installBtn) {
                installBtn.classList.remove('hidden');
                installBtn.addEventListener('click', () => {
                    this.installPWA();
                });
            }
        });

        window.addEventListener('appinstalled', () => {
            this.deferredPrompt = null;
            const installBtn = document.getElementById('install-btn');
            if (installBtn) installBtn.classList.add('hidden');
            this.showToast('App installed successfully! 🎉');
        });
    }

    async installPWA() {
        if (!this.deferredPrompt) return;

        // Show the prompt
        this.deferredPrompt.prompt();

        // Wait for the user to respond to the prompt
        const { outcome } = await this.deferredPrompt.userChoice;
        console.log(`User response to the install prompt: ${outcome}`);

        // We've used the prompt, and can't use it again, throw it away
        this.deferredPrompt = null;

        // Hide button regardless of outcome
        const installBtn = document.getElementById('install-btn');
        if (installBtn) installBtn.classList.add('hidden');
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
                // Initialize Export Manager
                this.exportManager = new ExportManager(this.engine);
            } catch (e) {
                console.error('WebGL Engine init failed:', e);
                // Don't halt the app; allow presets to load
            }
            // storage.init() is now auto-called in StorageManager constructor
            // ensuringReady() in storage methods handle concurrency.

            this.initWorker();
            this.initHistogram();
            this.initToneCurve();
            this.initHSL(); // Selective Color
            this.initColorWheels(); // Color Grading
            this.initVectorscope(); // Analysis
            this.initHistory();
            this.initAtmosphereControls();
            this.initDigitalControls();
            this.initFrameControls();
            this.initGalleryFrame();
            this.initSplitViewControls();
            this.initCropTool();
            this.initGestures();
            this.initScrubbing(); // Mobile Extra 1
            this.initOLED();      // Mobile Extra 2
            this.initVibePack();  // Retro Vibe Pack
            this.initPresetAccordion(); // New: Collapsible Menu
            this.initRailNavigation();  // Phase 2: Sidebar Rail
            this.initCRT();         // CRT Visualization Mode

            this.initThemeEngine();    // Restoration
            this.initTerminalViewer(); // Phase VII
            this.initSpectral();        // Initialize Receipt Scanner
            if (window.ReceiptScannerClass) {
                this.receiptScanner = new window.ReceiptScannerClass(this);
                this.receiptScanner.init();
            }

            // Initialize Receipt Printer logic
            this.initReceiptPrinter(); // Thermal Printer

            await this.loadSavedSessions().catch(err => console.warn('Failed to load saved sessions:', err));
            await this.loadCustomPresets().catch(err => console.warn('Failed to load presets:', err));
            this.populatePresets('all');

            console.log('✓ Untitled Studio ready');
        } catch (error) {
            console.error('Critical initialization error:', error);
            alert('Some features may not work correctly. Check console for details.');
        }
    }

    initReceiptPrinter() {
        const btn = document.getElementById('export-receipt-btn');
        const modal = document.getElementById('receipt-modal');
        const container = document.getElementById('receipt-container');
        const img = document.getElementById('receipt-image');
        const closeBtn = document.getElementById('close-receipt');
        const downloadLink = document.getElementById('download-receipt');

        if (!btn || !modal) return;

        btn.addEventListener('click', async () => {
            // 1. Play Sound
            if (window.Sonic) window.Sonic.playPrinter();

            // 2. Generate Receipt
            if (window.ReceiptGenerator) {
                // Use current engine adjustments
                // If using 'presets', we might need to resolve effective adjustments
                // For now, use engine.adjustments
                const state = this.engine.adjustments;
                const dataUrl = await window.ReceiptGenerator.generate(state);

                img.src = dataUrl;
                downloadLink.href = dataUrl;

                // 3. Show Modal with Animation
                modal.classList.remove('hidden');
                // Trigger reflow
                void modal.offsetWidth;
                modal.classList.remove('opacity-0', 'pointer-events-none');

                // Slide Down
                setTimeout(() => {
                    container.classList.remove('translate-y-[-100vh]');
                    container.classList.add('translate-y-0');
                }, 100);
            }
        });

        const close = () => {
            container.classList.remove('translate-y-0');
            container.classList.add('translate-y-[-100vh]');
            modal.classList.add('opacity-0', 'pointer-events-none');
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 500); // 0.3s opacity + buffer
        };

        if (closeBtn) closeBtn.addEventListener('click', close);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) close();
        });
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

    initSpectral() {
        // Mode buttons
        const modeButtons = document.querySelectorAll('.spectral-mode-btn');
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => {
                    b.classList.remove('active', 'bg-hot-pink/20', 'text-hot-pink', 'font-semibold');
                    b.classList.add('text-gray-400');
                });
                btn.classList.add('active', 'bg-hot-pink/20', 'text-hot-pink', 'font-semibold');
                btn.classList.remove('text-gray-400');

                const mode = parseInt(btn.dataset.mode);
                this.engine.setAdjustment('thermalMode', mode);

                // Auto-enable intensity if mode > 0
                if (mode > 0) {
                    const slider = document.getElementById('thermalIntensity');
                    if (slider && parseFloat(slider.value) === 0) {
                        slider.value = 80;
                        this.engine.setAdjustment('thermalIntensity', 80);
                        const label = document.querySelector('.slider-value[data-for="thermalIntensity"]');
                        if (label) label.textContent = '80';
                    }
                }

                this.hapticFeedback('medium');
            });
        });

        // Intensity slider
        const intensitySlider = document.getElementById('thermalIntensity');
        if (intensitySlider) {
            intensitySlider.addEventListener('input', () => {
                const val = parseFloat(intensitySlider.value);
                this.engine.setAdjustment('thermalIntensity', val);
                const label = document.querySelector('.slider-value[data-for="thermalIntensity"]');
                if (label) label.textContent = val.toFixed(0);
            });
        }
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



    initCRT() {
        const toggle = document.getElementById('crt-toggle-btn');
        const overlay = document.getElementById('crt-overlay');

        // Default to OFF or load from local storage
        const isCRT = localStorage.getItem('crtMode') === 'true';
        if (isCRT) {
            document.body.classList.add('crt-active');
            overlay?.classList.add('active');
            toggle?.classList.add('text-hot-pink');
        }

        if (toggle && overlay) {
            toggle.addEventListener('click', () => {
                const isActive = overlay.classList.toggle('active');
                document.body.classList.toggle('crt-active', isActive);

                // Visual feedback on button
                if (isActive) {
                    toggle.classList.add('text-hot-pink');
                    toggle.classList.remove('text-gray-400');
                    localStorage.setItem('crtMode', 'true');
                    this.hapticFeedback('success');
                } else {
                    toggle.classList.remove('text-hot-pink');
                    toggle.classList.add('text-gray-400');
                    localStorage.setItem('crtMode', 'false');
                    this.hapticFeedback('light');
                }
            });
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
            dockImportBtn: document.getElementById('dock-import-btn'), // New
            syncAllBtn: document.getElementById('sync-all-btn'),
            newRollBtn: document.getElementById('new-roll-btn'),
            batchCount: document.getElementById('batch-count'),
            fileInput: document.getElementById('file-input'),

            // Toolbar
            toggleUIBtn: document.getElementById('toggle-ui-btn'),
            magicWandBtn: document.getElementById('magic-wand-btn'),
            shareBtn: document.getElementById('share-btn'),
            exportBtn: document.getElementById('main-export-btn'),
            beforeLabel: document.getElementById('before-label'),
            undoBtn: document.getElementById('undo-btn'),
            redoBtn: document.getElementById('redo-btn'),


            // Accordion (Replaces Tabs)
            accordionItems: document.querySelectorAll('.accordion-item'),
            accordionHeaders: document.querySelectorAll('.accordion-header'),

            // Panels
            tonePanel: document.getElementById('tone-panel'),
            curvePanel: document.getElementById('curve-panel'),
            colorPanel: document.getElementById('color-panel'),
            effectsPanel: document.getElementById('effects-panel'),
            fxSubTabBtns: document.querySelectorAll('.fx-subtab-btn'), // New
            fxSubPanels: document.querySelectorAll('.fx-subpanel'),    // New
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
            presetsPanel: document.getElementById('presets-panel'),
            presetBrowser: document.getElementById('preset-browser'),
            presetGroups: document.querySelectorAll('.preset-group'),

            // Histogram
            histogramContainer: document.getElementById('histogram-container'),
            histogramCanvas: document.getElementById('histogram-canvas'),
            toggleHistogramBtn: document.getElementById('toggle-histogram-btn'),
            toggleHistogramMobileBtn: document.getElementById('toggle-histogram-mobile-btn'),
            autoEnhanceBtn: document.getElementById('auto-enhance-btn'),
            clippingToggle: document.getElementById('clipping-toggle'),

            // History
            historySidebar: document.getElementById('history-sidebar'),
            historyList: document.getElementById('history-list'),
            closeHistoryBtn: document.getElementById('close-history-btn'),
            toggleHistoryBtn: document.getElementById('toggle-history-btn'),

            // Custom LUT
            lutInput: document.getElementById('lut-input'),
            lutControls: document.getElementById('lut-controls'),
            lutName: document.getElementById('lut-name'),
            removeLutBtn: document.getElementById('remove-lut-btn'),
            importLutBtn: document.getElementById('import-lut-btn'),

            // Effects - Texture Overlay
            textureInput: document.getElementById('texture-input'),
            importTextureBtn: document.getElementById('import-texture-btn'),
            removeTextureBtn: document.getElementById('remove-texture-btn'),
            blendModeBtns: document.querySelectorAll('.blend-mode-btn'),
            printStockBtns: document.querySelectorAll('.print-stock-btn'),

            // Export
            resetBtn: document.getElementById('reset-btn'),
            exportFormat: document.getElementById('export-format'),
            exportBtn: document.getElementById('main-export-btn'),
            exportModal: document.getElementById('export-modal'),
            exportSettingsBtn: document.getElementById('settings-btn'),
            exportSettingsModal: document.getElementById('export-settings-modal'),
            modalExportActionBtn: document.getElementById('modal-export-action-btn'), // New export trigger inside modal
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
            savePresetBtn: document.querySelectorAll('#save-preset-btn'),

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

            // Split View
            splitSliderContainer: document.getElementById('split-slider-container'),
            splitSlider: document.getElementById('split-slider'),
            splitLine: document.getElementById('split-line'),

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
        // Mobile Optimization: Limit render size on smaller screens
        // Desktop: 4K (4096), Mobile: 2K (2048) or even 1080p if very small
        const isMobile = window.innerWidth < 800;
        const config = {
            maxRenderSize: isMobile ? 2048 : 4096
        };
        console.log(`[App] Initializing Engine (Mobile=${isMobile}, MaxSize=${config.maxRenderSize})`);

        this.engine = new WebGLEngine(this.elements.canvas, config);
        this.currentAdjustments = this.engine.getAdjustments();
    }

    async ensureTexturesLoaded() {
        if (window.TextureAssets) return true;

        if (this.textureLoadPromise) return this.textureLoadPromise;

        console.log('[App] Lazy loading textures...');
        this.textureLoadPromise = new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'js/textures.js?v=14';
            script.onload = () => {
                console.log('[App] Textures loaded.');
                resolve(true);
            };
            script.onerror = (e) => {
                console.error('[App] Failed to load textures', e);
                reject(e);
            };
            document.body.appendChild(script);
        });
        return this.textureLoadPromise;
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
                // Apply rotation and flip from Crop Tool
                if (settings.rotation !== undefined) this.engine.setAdjustment('rotation', settings.rotation);
                if (settings.flipH !== undefined) this.engine.setAdjustment('flipX', settings.flipH ? 1 : 0);
                if (settings.flipV !== undefined) this.engine.setAdjustment('flipY', settings.flipV ? 1 : 0);
            });
        }

        // Rotation Controls
        const rotateSlider = document.getElementById('rotation');
        const rotateCCW = document.getElementById('rotate-ccw-btn');
        const rotateCW = document.getElementById('rotate-cw-btn');

        if (rotateSlider) {
            rotateSlider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.engine.setAdjustment('rotation', val);
            });
            // Double click to reset
            rotateSlider.addEventListener('dblclick', () => {
                rotateSlider.value = 0;
                this.engine.setAdjustment('rotation', 0);
            });
        }

        if (rotateCCW && rotateSlider) {
            rotateCCW.addEventListener('click', () => {
                let val = parseFloat(rotateSlider.value) - 5;
                rotateSlider.value = val;
                this.engine.setAdjustment('rotation', val);
            });
        }

        if (rotateCW && rotateSlider) {
            rotateCW.addEventListener('click', () => {
                let val = parseFloat(rotateSlider.value) + 5;
                rotateSlider.value = val;
                this.engine.setAdjustment('rotation', val);
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

    initFrameControls() {
        const toggle = document.getElementById('border-toggle');
        const controls = document.getElementById('border-controls');
        const widthSlider = document.getElementById('borderWidth');
        const colorInput = document.getElementById('borderColor');
        const presets = document.querySelectorAll('.border-color-preset');

        const hexToRgb = (hex) => {
            const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
            return result ? [
                parseInt(result[1], 16) / 255,
                parseInt(result[2], 16) / 255,
                parseInt(result[3], 16) / 255
            ] : [1, 1, 1];
        };

        if (toggle) {
            toggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                this.engine.setAdjustment('borderEnabled', enabled);
                if (controls) {
                    controls.style.opacity = enabled ? '1' : '0.5';
                    controls.style.pointerEvents = enabled ? 'auto' : 'none';
                }
            });
        }

        if (widthSlider) {
            widthSlider.addEventListener('input', (e) => {
                this.engine.setAdjustment('borderWidth', parseFloat(e.target.value));
            });
        }

        if (colorInput) {
            colorInput.addEventListener('input', (e) => {
                this.engine.setAdjustment('borderColor', hexToRgb(e.target.value));
            });
        }

        presets.forEach(btn => {
            btn.addEventListener('click', () => {
                const color = btn.dataset.color;
                if (colorInput) colorInput.value = color;
                this.engine.setAdjustment('borderColor', hexToRgb(color));
            });
        });
    }

    initSplitViewControls() {
        const toggle = document.getElementById('split-view-toggle');
        const sliderContainer = document.getElementById('split-slider-container');
        const slider = document.getElementById('split-slider');
        const splitLine = document.getElementById('split-line');

        if (toggle) {
            toggle.addEventListener('change', (e) => {
                const enabled = e.target.checked;
                if (sliderContainer) {
                    sliderContainer.classList.toggle('hidden', !enabled);
                }
                if (enabled) {
                    // Start at center
                    if (slider) slider.value = 0.5;
                    this.engine.setAdjustment('splitPos', 0.5);
                    if (splitLine) splitLine.style.left = '50%';
                } else {
                    this.engine.setAdjustment('splitPos', -1.0);
                }
            });
        }

        if (slider) {
            slider.addEventListener('input', (e) => {
                const val = parseFloat(e.target.value);
                this.engine.setAdjustment('splitPos', val);
                if (splitLine) splitLine.style.left = `${val * 100}%`;
            });
        }
    }

    initLightLeakControls() {
        const colorPicker = document.getElementById('lightLeakColor');
        if (colorPicker) {
            colorPicker.addEventListener('input', (e) => {
                const hex = e.target.value;
                const rgb = this.hexToRgb(hex);
                this.engine.setAdjustment('lightLeakColor', rgb);
            });
        }
    }

    initDigitalControls() {
        const asciiMode = document.getElementById('asciiMode');
        const asciiColor = document.getElementById('asciiColor');

        if (asciiMode) {
            asciiMode.addEventListener('change', (e) => {
                const mode = parseInt(e.target.value);
                this.engine.setAdjustment('asciiMode', mode);
                if (asciiColor) {
                    asciiColor.classList.toggle('hidden', mode !== 4);
                }
            });
        }

        if (asciiColor) {
            asciiColor.addEventListener('input', (e) => {
                this.engine.setAdjustment('asciiColor', this.hexToRgb(e.target.value));
            });
        }
    }

    initAtmosphereControls() {
        const glowColorEl = document.getElementById('glowColor');
        if (glowColorEl) {
            glowColorEl.addEventListener('input', (e) => {
                const rgb = this.hexToRgb(e.target.value);
                this.engine.setAdjustment('glowColor', rgb);
                this.updateHistogram();
                if (this.history) {
                    this.history.push(this.engine.getAdjustments(), 'Glow Tint');
                }
            });
        }

        document.querySelectorAll('.glow-color-preset').forEach(btn => {
            btn.addEventListener('click', () => {
                const hex = btn.dataset.color;
                if (glowColorEl) glowColorEl.value = hex;
                const rgb = this.hexToRgb(hex);
                this.engine.setAdjustment('glowColor', rgb);
                this.updateHistogram();
                if (this.history) {
                    this.history.push(this.engine.getAdjustments(), 'Glow Tint');
                }
                this.hapticFeedback('light');
            });
        });

        // Other Atmosphere controls (Border select)
        const borderSelect = document.getElementById('vibe-border-select');
        if (borderSelect) {
            borderSelect.addEventListener('change', (e) => {
                const url = e.target.value;
                if (url) {
                    this.engine.setAdjustment('borderEnabled', true);
                    this.engine.loadOverlay(url);
                } else {
                    this.engine.setAdjustment('borderEnabled', false);
                }
            });
        }
    }

    hexToRgb(hex) {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? [
            parseInt(result[1], 16) / 255,
            parseInt(result[2], 16) / 255,
            parseInt(result[3], 16) / 255
        ] : [1, 1, 1];
    }

    rgbToHex(rgb) {
        if (!rgb || rgb.length < 3) return '#ffffff';
        const toHex = (n) => {
            const hex = Math.round(n * 255).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        };
        return `#${toHex(rgb[0])}${toHex(rgb[1])}${toHex(rgb[2])}`;
    }

    initUniversalSliders() {
        // Generic handler for ALL sliders to catch missing connections (like Digital FX)
        document.querySelectorAll('.studio-slider').forEach(slider => {
            slider.addEventListener('input', (e) => {
                let name = e.target.dataset.name || e.target.dataset.for || e.target.id;

                // Map ID/Name to Engine Key
                const map = {
                    'pixelate': 'pixelateSize',
                    'glitch': 'glitchStrength',
                    'ascii': 'asciiSize',
                    'dither': 'ditherStrength',
                    // Add matches for other potential mismatches
                    'scanline': 'scanlineIntensity'
                };

                if (map[name]) name = map[name];

                // If specific listeners exist, this runs twice (harmless)
                // If NO listener exists, this saves the day
                if (name) {
                    if (!this.engine) return;
                    const value = parseFloat(e.target.value);
                    this.engine.setAdjustment(name, value);

                    // Update label if sibling exists
                    const label = e.target.parentElement?.querySelector('.slider-value');
                    if (label) label.textContent = value;
                }
            });
        });
        console.log('✓ Universal Sliders Initialized');
    }

    setupEventListeners() {
        console.log('[App] Setting up event listeners...');
        this.initUniversalSliders(); // Fix Missing FX
        const on = (el, event, handler) => {
            if (!el) return;
            if (el instanceof NodeList || Array.isArray(el)) {
                el.forEach(e => { if (e) e.addEventListener(event, handler); });
            } else if (el instanceof HTMLCollection) {
                Array.from(el).forEach(e => { if (e) e.addEventListener(event, handler); });
            } else {
                el.addEventListener(event, handler);
            }
        };

        // FX Sub-tab navigation
        if (this.elements.fxSubTabBtns) {
            this.elements.fxSubTabBtns.forEach(btn => {
                on(btn, 'click', (e) => {
                    e.preventDefault();
                    this.switchFxSubTab(btn.dataset.subtab);
                });
            });
        }

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
        on(this.elements.dockImportBtn, 'click', () => this.openFilePicker());
        on(this.elements.newRollBtn, 'click', () => this.createNewRoll());
        on(this.elements.fileInput, 'change', (e) => this.handleFileSelect(e));

        // LUT Import
        // (Assuming these elements exist in this.elements)
        if (this.elements.importLutBtn) {
            on(this.elements.importLutBtn, 'click', () => this.elements.lutInput?.click());
            on(this.elements.lutInput, 'change', (e) => this.handleLutSelect(e));
            on(this.elements.removeLutBtn, 'click', () => this.removeLUT());
        }

        // Texture Import
        if (this.elements.importTextureBtn) {
            on(this.elements.importTextureBtn, 'click', () => this.elements.textureInput?.click());
            on(this.elements.importTextureBtnAlt, 'click', () => this.elements.textureInput?.click());
            on(this.elements.textureInput, 'change', (e) => this.handleTextureSelect(e));
            on(this.elements.removeTextureBtn, 'click', () => this.removeTexture());
        }

        if (this.elements.lutInput) {
            on(this.elements.lutInput, 'change', (e) => this.handleLUTUpload(e));
        }
        if (this.elements.removeLutBtn) {
            on(this.elements.removeLutBtn, 'click', () => this.removeLUT());
        }

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

        // Before/After toggle
        if (this.elements.beforeBtn || document.getElementById('before-btn')) {
            const btn = this.elements.beforeBtn || document.getElementById('before-btn');
            on(btn, 'mousedown', () => this.showOriginal(true));
            on(btn, 'mouseup', () => this.showOriginal(false));
            on(btn, 'mouseleave', () => this.showOriginal(false));
            on(btn, 'touchstart', (e) => { e.preventDefault(); this.showOriginal(true); });
            on(btn, 'touchend', () => this.showOriginal(false));
        }


        // Undo/Redo
        on(this.elements.undoBtn, 'click', () => this.undo());
        on(this.elements.redoBtn, 'click', () => this.redo());

        // Accordion Navigation
        this.elements.accordionHeaders.forEach(header => {
            on(header, 'click', (e) => {
                const section = header.parentElement.dataset.section;
                this.toggleSection(section);
            });
        });

        // Initialize Default Section (Tone)
        setTimeout(() => this.toggleSection('tone'), 100);

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

        // Curve Point Controls
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
                this.elements.aspectBtns.forEach(b => b.classList.remove('active', 'bg-moonstone/20', 'text-moonstone'));
                btn.classList.add('active', 'bg-moonstone/20', 'text-moonstone');
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

        // Preset categories (Delegated or updated)
        this.elements.presetBrowser.addEventListener('click', (e) => {
            const btn = e.target.closest('.preset-category');
            if (btn) {
                document.querySelectorAll('.preset-category').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.populatePresets(btn.dataset.category);

                // On mobile, maybe auto-collapse current group to show wheel?
                // For now, just apply.
            }
        });

        // Save preset
        on(this.elements.savePresetBtn, 'click', () => this.showSavePresetModal());
        on(this.elements.savePresetCancel, 'click', () => this.hideSavePresetModal());
        on(this.elements.savePresetConfirm, 'click', () => this.saveCustomPreset());

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

        // Auto-Enhance button (Magic Wand in histogram)
        on(this.elements.autoEnhanceBtn, 'click', () => {
            this.autoEnhance();
            this.showToast('Auto-Enhance applied ✨');
        });

        // Clipping warnings toggle
        on(this.elements.clippingToggle, 'change', (e) => {
            if (this.engine) {
                this.engine.setAdjustment('showClipping', e.target.checked);
            }
        });

        // Mobile histogram toggle
        on(this.elements.toggleHistogramMobileBtn, 'click', () => this.toggleHistogram());

        // History toggle
        on(this.elements.toggleHistoryBtn, 'click', () => this.toggleHistory());
        on(this.elements.closeHistoryBtn, 'click', () => this.toggleHistory(false));

        // Export settings (Settings Button in Command Bar)
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

        // Export (Main Button in Command Bar opens Modal)
        on(this.elements.exportBtn, 'click', () => this.showExportSettings());

        // Actual Export Action (Inside Modal)
        on(this.elements.modalExportActionBtn, 'click', () => {
            this.saveExportSettings(); // Ensure settings are up to date
            this.exportImage();
        });

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

        // Shuffle Defects
        const shuffleBtn = document.getElementById('randomize-seed-btn');
        if (shuffleBtn) {
            on(shuffleBtn, 'click', () => {
                const seed = Math.random() * 1000;
                if (this.engine) this.engine.setAdjustment('filmSeed', seed);
                // Also update any texture defect offsets if needed
            });
        }

        // Built-in Textures
        document.querySelectorAll('.texture-btn').forEach(btn => {
            on(btn, 'click', async () => {
                // Ensure assets are loaded
                await this.ensureTexturesLoaded();

                // UI Feedback
                document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('ring-2', 'ring-hot-pink', 'border-hot-pink'));
                btn.classList.add('ring-2', 'ring-hot-pink', 'border-hot-pink');

                let url = btn.dataset.texture;
                // Lookup Base64 data if available (fixes CORS on file://)
                if (window.TextureAssets && window.TextureAssets[url]) {
                    url = window.TextureAssets[url];
                }

                const mode = parseInt(btn.dataset.mode);

                try {
                    await this.engine.loadOverlay(url);

                    // Set sensible defaults if not set
                    this.engine.setAdjustment('overlayOpacity', 80);
                    const opSlider = document.getElementById('overlayOpacity');
                    if (opSlider) opSlider.value = 80;
                    const opDisplay = document.querySelector('.slider-value[data-for="overlayOpacity"]');
                    if (opDisplay) opDisplay.textContent = '80';

                    // Set blend mode
                    this.engine.setAdjustment('overlayBlendMode', mode);

                    // Update blend mode UI
                    document.querySelectorAll('.blend-mode-btn').forEach(b => {
                        b.classList.remove('active', 'bg-moonstone/20', 'text-moonstone');
                        b.classList.add('hover:bg-white/10');
                        if (parseInt(b.dataset.mode) === mode) {
                            b.classList.add('active', 'bg-moonstone/20', 'text-moonstone');
                            b.classList.remove('hover:bg-white/10');
                        }
                    });

                    this.updateHistogram();

                } catch (err) {
                    console.error('Texture load failed', err);
                    alert('Failed to load texture');
                }
            });
        });

        // --- BATCH UI ---
        const batchBtn = document.getElementById('batch-export-btn');
        if (batchBtn) {
            on(batchBtn, 'click', () => this.showBatchExportModal());
        }

        on(document.getElementById('batch-modal-close'), 'click', () => this.hideBatchExportModal());

        on(document.getElementById('batch-mode-zip'), 'click', () => this.processBatch('zip'));
        on(document.getElementById('batch-mode-waterfall'), 'click', () => this.processBatch('waterfall'));

        // --- ASCII COPY ---
        const copyAsciiBtn = document.getElementById('copy-ascii-btn');
        if (copyAsciiBtn) {
            on(copyAsciiBtn, 'click', async () => {
                if (!this.engine) return;

                // Visual Feedback
                const originalText = copyAsciiBtn.innerHTML;

                try {
                    const text = this.engine.generateAsciiText();
                    if (!text) {
                        this.showToast('Enable ASCII effect first! 👾');
                        return;
                    }

                    await navigator.clipboard.writeText(text);
                    this.showToast('ASCII Copied to Clipboard! 📋');

                    // Success animation
                    copyAsciiBtn.innerHTML = `<svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>`;
                    setTimeout(() => {
                        copyAsciiBtn.innerHTML = originalText;
                    }, 2000);

                } catch (err) {
                    console.error('Clipboard failed', err);
                    this.showToast('Failed to copy ❌');
                }
            });
        }

        // --- VIBE ---

        // --- VIBE ---
        // Sliders
        ['lightLeak', 'scratches', 'lightLeakIntensity', 'lightLeakEntropy', 'lightLeakScale'].forEach(id => {
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

        // --- CREATIVE (Selective Color) ---
        ['selColorHue', 'selColorRange', 'selColorSat', 'selColorLum', 'selColorFeather'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                on(el, 'input', (e) => this.handleSliderChange(e));
            }
        });

        // --- TILT SHIFT ---
        ['tiltShiftBlur', 'tiltShiftPos', 'tiltShiftFocusWidth', 'tiltShiftGradient'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                on(el, 'input', (e) => this.handleSliderChange(e));
            }
        });

        // --- DITHERING ---
        const ditherTypeSelect = document.getElementById('ditherType');
        if (ditherTypeSelect) {
            on(ditherTypeSelect, 'change', (e) => {
                const val = parseInt(e.target.value);
                this.engine.setAdjustment('ditherType', val);
                // If turning on, auto-set strength to 100
                if (val > 0 && this.engine.adjustments.ditherStrength === 0) {
                    this.engine.setAdjustment('ditherStrength', 100);
                    const strengthSlider = document.getElementById('ditherStrength');
                    if (strengthSlider) strengthSlider.value = 100;
                    const strengthDisplay = document.querySelector('.slider-value[data-for="ditherStrength"]');
                    if (strengthDisplay) strengthDisplay.textContent = '100';
                }
                this.updateHistogram();
            });
        }

        ['ditherDepth', 'ditherStrength'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                on(el, 'input', (e) => {
                    const val = parseFloat(e.target.value);
                    this.engine.setAdjustment(id, val);
                    const display = document.querySelector(`.slider-value[data-for="${id}"]`);
                    if (display) display.textContent = val;
                    this.updateHistogram();
                });
            }
        });

        // --- GRAIN 2.0 ---
        const grainTypeSelect = document.getElementById('grainType');
        if (grainTypeSelect) {
            on(grainTypeSelect, 'change', (e) => {
                const val = parseInt(e.target.value);
                this.engine.setAdjustment('grainType', val);
                // If type 3 (Analog), ensure Global Grain is active
                if (val === 3 && this.engine.adjustments.grainGlobal === 0) {
                    this.engine.setAdjustment('grainGlobal', 1.0);
                    const globalSlider = document.getElementById('grainGlobal');
                    if (globalSlider) globalSlider.value = 1;
                }
                this.updateHistogram();
            });
        }

        // --- LUT EXPORT ---
        const exportLutBtn = document.getElementById('export-lut-btn');
        if (exportLutBtn) {
            on(exportLutBtn, 'click', () => this.exportLUT());
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

        // Output Transform (Print Stock)
        if (this.elements.printStockBtns) {
            this.elements.printStockBtns.forEach(btn => {
                on(btn, 'click', (e) => {
                    // Update UI
                    this.elements.printStockBtns.forEach(b => {
                        b.classList.remove('active', 'bg-hot-pink/20', 'text-hot-pink', 'font-semibold', 'shadow-[0_0_10px_rgba(237,39,136,0.2)]');
                        b.classList.add('text-gray-400', 'hover:bg-white/10');
                    });
                    const target = e.target.closest('.print-stock-btn');
                    target.classList.add('active', 'bg-hot-pink/20', 'text-hot-pink', 'font-semibold', 'shadow-[0_0_10px_rgba(237,39,136,0.2)]');
                    target.classList.remove('text-gray-400', 'hover:bg-white/10');

                    // Update Engine
                    const stockIndex = parseInt(target.dataset.stock);

                    if (this.engine) {
                        // 1. Set Uniform for Shader Logic (if any)
                        // Note: Shader only supports 0, 1, 2 currently. 
                        // If Cineon (3) is selected, we might want to set it to 0 (Linear) and let adjustments do the work,
                        // or add a shader mode for it later. For now, passing the index.
                        this.engine.setAdjustment('outputTransform', stockIndex);

                        // 2. Apply Profile Adjustments (Contrast, Saturation, etc.)
                        const profiles = window.print_profiles;
                        if (profiles && profiles[stockIndex]) {
                            const profile = profiles[stockIndex];

                            // Apply specific adjustments from profile
                            // We need to be careful not to overwrite USER adjustments entirely, 
                            // but Print Profiles act as a "Base State". 
                            // Strategy: specific adjustments defined in profile override current settings?
                            // Or should they add to them? 
                            // Standard behavior for "Looks" is to set the values.

                            ['contrast', 'saturation', 'temperature', 'tint', 'highlights', 'shadows', 'gamma'].forEach(key => {
                                if (profile[key] !== undefined) {
                                    this.engine.setAdjustment(key, profile[key]);
                                }
                            });

                            // Split Tone handling
                            if (profile.splitShadowHue !== undefined) this.engine.setAdjustment('splitShadowHue', profile.splitShadowHue);
                            if (profile.splitShadowSat !== undefined) this.engine.setAdjustment('splitShadowSat', profile.splitShadowSat);
                            if (profile.splitHighlightHue !== undefined) this.engine.setAdjustment('splitHighlightHue', profile.splitHighlightHue);
                            if (profile.splitHighlightSat !== undefined) this.engine.setAdjustment('splitHighlightSat', profile.splitHighlightSat);

                            // Update UI Sliders to reflect these changes
                            const currentAdjustments = this.engine.getAdjustments();
                            this.updateSlidersFromAdjustments(currentAdjustments);
                        }

                        this.updateHistogram();
                    }
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

    switchFxSubTab(tabName) {
        // validate tabName
        if (!tabName) return;

        // Update Buttons
        if (this.elements.fxSubTabBtns) {
            this.elements.fxSubTabBtns.forEach(btn => {
                const isActive = btn.dataset.subtab === tabName;
                btn.classList.toggle('active', isActive);
                // Tailwind classes for active state
                if (isActive) {
                    btn.classList.remove('text-gray-400');
                    btn.classList.add('bg-white/10', 'text-white');
                } else {
                    btn.classList.add('text-gray-400');
                    btn.classList.remove('bg-white/10', 'text-white');
                }
            });
        }

        // Update Panels
        if (this.elements.fxSubPanels) {
            this.elements.fxSubPanels.forEach(panel => {
                const isTarget = panel.id === `fx-${tabName}`;
                if (isTarget) {
                    panel.classList.remove('hidden');
                    // Trigger reflow/animation if needed
                    panel.classList.add('active');
                } else {
                    panel.classList.add('hidden');
                    panel.classList.remove('active');
                }
            });
        }

        // Haptic Feedback
        this.hapticFeedback('light');
    }

    openFilePicker() {
        if (this.elements.fileInput) {
            this.elements.fileInput.click();
        } else {
            console.error('File Input element not found');
        }
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

        // Filter for regular images AND RAW files
        const imageFiles = files.filter(f => {
            // Regular images
            if (f.type.startsWith('image/')) return true;
            // RAW files (check by extension using RawDecoder)
            if (window.RawDecoder && window.RawDecoder.isRawFile(f)) return true;
            return false;
        });

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

    createNewRoll() {
        const rollId = 'roll_' + Date.now();
        const roll = {
            id: rollId,
            name: `ROLL ${this.rolls.length + 1}`,
            imageIds: [],
            maxExposures: 36,
            isDeveloped: false,
            createdAt: Date.now()
        };

        this.rolls.push(roll);
        this.activeRollId = rollId;

        // Visual Feedback
        this.showToast(`🎞️ ${roll.name} LOADED (36 exp)`);
        if (this.audio) this.audio.playShutter(); // Winding sound (reuse shutter for now)

        // UI Update: Add a roll separator to the queue
        const rollDivider = document.createElement('div');
        rollDivider.className = 'roll-divider group flex-shrink-0 flex flex-col items-center justify-center px-4 border-l border-white/10 ml-2';
        rollDivider.dataset.rollId = rollId;
        rollDivider.innerHTML = `
            <div class="text-[10px] font-bold text-moonstone/40 group-hover:text-moonstone mb-1 uppercase tracking-tighter">${roll.name}</div>
            <button class="develop-roll-btn hidden group-hover:flex items-center gap-1 px-2 py-0.5 rounded bg-moonstone/20 text-moonstone text-[8px] font-bold border border-moonstone/30 transition-all active:scale-95" data-roll-id="${rollId}">
                DEVELOP
            </button>
        `;

        // Insert before import button
        this.elements.thumbnailQueue.insertBefore(rollDivider, this.elements.importBtn);

        // Attach listener
        rollDivider.querySelector('.develop-roll-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            this.showBatchExportModal(rollId);
        });

        return roll;
    }

    async addImage(file) {
        const id = Date.now() + Math.random().toString(36).substr(2, 9);

        // Check if this is a RAW file and decode it
        let processedFile = file;
        let isRaw = false;

        if (window.RawDecoder && window.RawDecoder.isRawFile(file)) {
            isRaw = true;
            const formatName = window.RawDecoder.getFormatName(file.name);
            this.showToast(`Decoding ${formatName}...`);

            try {
                const decodedBlob = await window.RawDecoder.decode(file);
                // Create a new File object from the decoded blob
                const baseName = file.name.replace(/\.[^.]+$/, '');
                processedFile = new File([decodedBlob], `${baseName}.jpg`, { type: 'image/jpeg' });
                this.showToast(`✓ ${formatName} decoded successfully`);
            } catch (error) {
                console.error('[addImage] RAW decode failed:', error);
                this.showToast(`⚠️ Failed to decode ${file.name}`, 'error');
                return null;
            }
        }

        const thumbnailUrl = await this.createThumbnail(processedFile);

        // Cache URL immediately
        const url = URL.createObjectURL(processedFile);
        this.blobCache.set(id, url);

        const imageData = {
            id,
            name: file.name, // Keep original name for display
            file: processedFile,
            originalFile: isRaw ? file : null, // Keep reference to original RAW if applicable
            isRaw,
            thumbnailUrl,
            adjustments: { ...this.currentAdjustments },
            rollId: this.activeRollId, // Track which roll this belongs to
            createdAt: Date.now()
        };

        // If we have an active roll, add to it
        if (this.activeRollId) {
            const roll = this.rolls.find(r => r.id === this.activeRollId);
            if (roll) {
                if (roll.imageIds.length >= roll.maxExposures) {
                    this.showToast(`⚠️ ${roll.name} is FULL (36/36). Start a new roll?`, 'warning');
                    // Stop or keep as loose? Let's keep as loose for now.
                    imageData.rollId = null;
                } else {
                    roll.imageIds.push(id);
                }
            }
        }

        this.images.push(imageData);
        this.addThumbnailToQueue(imageData);

        // Async Save to DB
        // Don't await this to keep UI responsive
        storage.fileToBase64(processedFile).then(base64 => {
            storage.saveImage({
                ...imageData,
                fileData: base64, // Save the heavy data
                file: undefined,   // Don't save the File object
                originalFile: undefined // Don't save original RAW to DB (too large)
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
        if (this.engine) {
            this.engine.currentImage = null;
        }
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
                if (this.engine) this.engine.setAdjustment('galleryFrame', this.isGalleryMode);
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

        // Smart placement: if it has a roll, place it after that roll's divider
        if (imageData.rollId) {
            const divider = document.querySelector(`.roll-divider[data-roll-id="${imageData.rollId}"]`);
            if (divider) {
                // Find last member of this roll
                const rollMembers = document.querySelectorAll(`.thumbnail[data-roll-id="${imageData.rollId}"]`);
                if (rollMembers.length > 0) {
                    const lastMember = rollMembers[rollMembers.length - 1];
                    lastMember.after(thumb);
                } else {
                    divider.after(thumb);
                }
                thumb.dataset.rollId = imageData.rollId;
                return;
            }
        }

        // Ensure we have a queue container
        if (!this.elements.thumbnailQueue) {
            this.elements.thumbnailQueue = document.getElementById('thumbnail-queue');
            this.elements.importBtn = document.getElementById('dock-import-btn');

            // Fallback if still missing (shouldn't happen with HTML fix)
            if (!this.elements.thumbnailQueue) return;

            // Bind import button if found
            if (this.elements.importBtn) {
                this.elements.importBtn.addEventListener('click', () => document.getElementById('file-input').click());
            }
        }

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
        if (this.history) {
            this.history.pushImmediate(imageData.adjustments, 'Load Image');
        }

        // Hide crop tool
        if (this.cropTool) {
            this.cropTool.hide();
        }

        // Update Ambience
        this.updateAmbience(imageData.file);
        this.updateUIState();

        // Terminal Update
        if (this.terminalViewer && this.terminalViewer.isActive) {
            this.refreshTerminal();
        }
    }

    async refreshTerminal() {
        if (!this.terminalViewer || this.activeIndex < 0) return;
        const img = this.images[this.activeIndex];

        // Extract EXIF if not already done
        if (!img.exif) {
            await this.extractExif(img);
        }

        this.terminalViewer.setExif({
            ...img.exif,
            name: img.name,
            format: img.file.type.split('/')[1].toUpperCase()
        });

        // Set live metrics (simulated for now, could be real WebGL timing)
        this.terminalViewer.setMetrics({
            processingTime: Math.floor(Math.random() * 50 + 10),
            vramUsage: '1.2GB/8GB',
            clipping: '0.4%'
        });
    }

    async extractExif(imageData) {
        if (typeof ExifReader === 'undefined') return;
        try {
            const tags = await ExifReader.load(imageData.file);
            // Flatten for easier use
            const exif = {};
            const keys = ['Make', 'Model', 'FNumber', 'ExposureTime', 'ISO', 'FocalLength', 'LensModel'];
            keys.forEach(key => {
                if (tags[key]) {
                    exif[key] = tags[key].description || tags[key].value;
                }
            });
            imageData.exif = exif;
        } catch (e) {
            console.warn('EXIF extraction failed:', e);
            imageData.exif = { status: 'NO_METADATA_FOUND' };
        }
    }

    initTerminalViewer() {
        const container = document.getElementById('terminal-viewer-overlay');
        if (!container) return;

        this.terminalViewer = new TerminalViewer(container);

        const toggleBtn = document.getElementById('toggle-terminal-btn');
        if (toggleBtn) {
            toggleBtn.addEventListener('click', () => {
                this.terminalViewer.toggle();

                // Toggle Histogram mode if terminal is active
                if (this.terminalViewer.isActive) {
                    if (this.histogram) this.histogram.setMode('waveform');
                } else {
                    if (this.histogram) this.histogram.setMode('histogram');
                }

                this.hapticFeedback('medium');
            });
        }

        // Listen for close from internal back button
        window.addEventListener('terminal-closed', () => {
            if (this.histogram) this.histogram.setMode('histogram');
            this.hapticFeedback('light');
        });
    }

    async removeImage(id) {
        const index = this.images.findIndex(i => i.id === id);
        if (index === -1) return;

        this.images.splice(index, 1);

        // Update rolls
        this.rolls.forEach(roll => {
            roll.imageIds = roll.imageIds.filter(imgId => imgId !== id);
        });

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

    switchFxSubTab(subTabId) {
        console.log(`[App] Switching FX Sub-tab to: ${subTabId}`);

        // 1. Toggle Buttons UI
        if (this.elements.fxSubTabBtns) {
            this.elements.fxSubTabBtns.forEach(btn => {
                const isActive = btn.dataset.subtab === subTabId;
                btn.classList.toggle('active', isActive);
                btn.classList.toggle('bg-white/10', isActive);
                btn.classList.toggle('text-white', isActive);
                btn.classList.toggle('text-gray-400', !isActive);
                // Also update ARIA or state if needed
                btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
            });
        }

        // 2. Toggle Panels Visibility
        let activePanel = null;
        if (this.elements.fxSubPanels) {
            this.elements.fxSubPanels.forEach(panel => {
                // IDs match "fx-" + subTabId (e.g., fx-texture, fx-creative, etc.)
                if (panel.id === `fx-${subTabId}`) {
                    panel.classList.remove('hidden');
                    activePanel = panel;
                } else {
                    panel.classList.add('hidden');
                }
            });
        }

        // 3. Recalculate Accordion Height (Crucial for visibility)
        if (activePanel) {
            const accordionContent = activePanel.closest('.accordion-content');
            if (accordionContent) {
                // Even if not currently active, we want the next open to have correct scrollHeight
                // But specifically if the parent .accordion-item is active, we must update max-height
                if (accordionContent.parentElement.classList.contains('active')) {
                    // Small delay ensures Browser layout calc is complete after removing 'hidden'
                    setTimeout(() => {
                        const newHeight = accordionContent.scrollHeight;
                        accordionContent.style.maxHeight = newHeight + "px";
                        console.log(`[App] FX Accordion Height updated to: ${newHeight}px`);
                    }, 50);
                }
            }
        }
    }

    toggleSection(sectionName) {
        const targetItem = document.querySelector(`.accordion-item[data-section="${sectionName}"]`);
        if (!targetItem) return;

        const isAlreadyActive = targetItem.classList.contains('active');

        // 1. Close ALL sections first (Exclusive behavior)
        document.querySelectorAll('.accordion-item').forEach(item => {
            item.classList.remove('active');
            const content = item.querySelector('.accordion-content');
            if (content) content.style.maxHeight = null;

            // Reset Indicator to [ + ]
            const indicator = item.querySelector('.indicator');
            if (indicator) {
                indicator.textContent = '[ + ]';
                indicator.style.color = ''; // Reset color
                indicator.style.textShadow = ''; // Reset glow
            }
        });

        // 2. Open Target if not already active
        if (!isAlreadyActive) {
            targetItem.classList.add('active');
            const content = targetItem.querySelector('.accordion-content');
            if (content) {
                content.style.maxHeight = content.scrollHeight + "px";
            }

            // Set Indicator to [ — ]
            const indicator = targetItem.querySelector('.indicator');
            if (indicator) {
                indicator.textContent = '[ — ]';
                indicator.style.color = 'var(--hot-pink)';
                indicator.style.textShadow = '0 0 8px var(--hot-pink-glow)';
            }

            // Handle Transform Tool (formerly Crop)
            if (sectionName === 'transform') {
                if (this.cropTool && this.engine && this.engine.canvas && this.images.length > 0) {
                    setTimeout(() => {
                        this.cropTool.show(this.engine.canvas.width, this.engine.canvas.height);
                    }, 300);
                }
            } else {
                if (this.cropTool) this.cropTool.hide();
            }

            // Handle FX (ensure correct subpanel and height)
            if (sectionName === 'fx') {
                const activeBtn = document.querySelector('.fx-subtab-btn.active');
                if (activeBtn) {
                    this.switchFxSubTab(activeBtn.dataset.subtab);
                } else {
                    this.switchFxSubTab('optics');
                }
            }
        } else {
            if (this.cropTool) this.cropTool.hide();
        }
    }

    handleSliderChange(e) {
        const slider = e.target;
        const name = slider.id;
        const value = parseFloat(slider.value);

        // Update display value
        const valueDisplay = document.querySelector(`.slider-value[data-for="${name}"]`);
        if (valueDisplay) {
            // Special formatting for floats
            if (['tiltShiftPos', 'tiltShiftFocusWidth', 'tiltShiftGradient', 'selColorFeather'].includes(name)) {
                valueDisplay.textContent = value.toFixed(2);
            } else if (name === 'borderWidth') {
                valueDisplay.textContent = Math.round((value / 25) * 100) + '%';
            } else {
                valueDisplay.textContent = name === 'exposure' ? value.toFixed(2) :
                    (name === 'grainSize' || name === 'grainGlobal') ? value.toFixed(1) : value;
            }
        }

        // Apply to engine
        if (this.engine) {
            this.engine.setAdjustment(name, value);

            // Trigger Wasm Grain update if applicable
            // if (this.wasmLoader && this.wasmLoader.isReady && (name === 'grainGlobal' || name === 'grainShadow' || name === 'grainHighlight')) {
            //     this.updateWasmGrain();
            // }
        }
        if (this.currentAdjustments) {
            this.currentAdjustments[name] = value;
        }

        // Haptic Detents
        if (navigator.vibrate) {
            const min = parseFloat(slider.min);
            const max = parseFloat(slider.max);
            if (value === 0 || value === min || value === max) {
                navigator.vibrate(10);
            }
        }

        // Selective Color Preview
        if (name === 'selColorHue') {
            const preview = document.getElementById('sel-color-preview');
            if (preview) {
                preview.style.backgroundColor = `hsl(${value}, 100%, 50%)`;
            }
        }

        // Update histogram
        this.updateHistogram();

        // Push to history (debounced)



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
        if (this.history) {
            this.history.push(this.engine.getAdjustments(), labelMap[name] || 'Adjustment');
        }
    }

    /**
     * Handle texture overlay import
     */
    async handleTextureImport(e) {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // Deselect built-in buttons
            document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('ring-2', 'ring-hot-pink', 'border-hot-pink'));

            // Load into engine
            await this.engine.loadOverlay(file);

            // Set default opacity slider if needed
            const opacitySlider = document.getElementById('overlayOpacity');
            if (opacitySlider && opacitySlider.value == 0) {
                this.engine.setAdjustment('overlayOpacity', 50);
                opacitySlider.value = 50;
                const disp = document.querySelector('.slider-value[data-for="overlayOpacity"]');
                if (disp) disp.textContent = '50';
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
        if (document.getElementById('texture-input')) document.getElementById('texture-input').value = '';

        // Deselect buttons
        document.querySelectorAll('.texture-btn').forEach(b => b.classList.remove('ring-2', 'ring-hot-pink', 'border-hot-pink'));

        // Reset Opacity
        this.engine.setAdjustment('overlayOpacity', 0);
        const sl = document.getElementById('overlayOpacity');
        const disp = document.querySelector('.slider-value[data-for="overlayOpacity"]');
        if (sl) sl.value = 0;
        if (disp) disp.textContent = '0';

        this.updateHistogram();
    }

    switchHSLChannel(channel, passedAdjustments = null) {
        this.hslChannel = channel;

        if (this.elements.hslChannelBtns) {
            this.elements.hslChannelBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.channel === channel);
            });
        }

        const adjustments = passedAdjustments || (this.engine ? this.engine.getAdjustments() : null);

        if (!adjustments || !this.elements.hslSliders) return;

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
        if (!this.history) return;
        const state = this.history.undo();
        if (state) {
            this.applyState(state);
        }
    }

    redo() {
        if (!this.history) return;
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
        if (!this.engine || !this.histogram || !this.engine.canvas) return;

        // Throttling: Histogram is heavy.
        // Desktop: ~30fps (32ms), Mobile: ~10fps (100ms) - balance between responsiveness and battery
        const throttle = this.isMobile ? 100 : 32;
        const now = performance.now();

        if (this.lastHistogramUpdate && (now - this.lastHistogramUpdate < throttle)) {
            return;
        }
        this.lastHistogramUpdate = now;

        // Optimization: Use the 256x256 analysis buffer instead of reading from a 4K canvas!
        // This makes histogram calculation nearly "free" for the CPU/GPU readback.
        const size = 256;
        const pixels = this.engine.getAnalysisData(size);

        if (pixels) {
            // New method name: calculateFromBuffer
            this.histogram.calculateFromBuffer(pixels, size, size);

            // Sync Terminal Waveform if active
            if (this.terminalViewer && this.terminalViewer.isActive) {
                this.terminalViewer.updateWaveform(this.histogram);
                this.refreshTerminal(); // Refresh metrics too
            }
        }
    }

    toggleClipping() {
        if (!this.engine) return;
        const current = this.engine.adjustments.showClipping || false;
        this.engine.setAdjustment('showClipping', !current);
        if (this.elements.clippingToggle) {
            this.elements.clippingToggle.checked = !current;
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
            if (this.history) {
                this.history.pushImmediate(this.engine.getAdjustments(), 'Crop Applied');
            }
        }, 'image/jpeg', 0.95);
    }

    populatePresets(category) {
        const wheel = document.getElementById('preset-wheel');
        const nameDisplay = document.getElementById('active-preset-name');

        // Alias globals
        const FilmPresets = window.FilmPresets;
        const getAllPresets = window.getAllPresets;

        if (!wheel) return;

        // Cleanup old observer
        if (this.wheelObserver) {
            this.wheelObserver.disconnect();
        }

        if (!FilmPresets) {
            wheel.innerHTML = '<div class="text-red-500 text-xs p-4">Error: DB missing</div>';
            return;
        }

        // 1. Get List of Presets
        let presetsToRender = [];

        if (category === 'custom') {
            presetsToRender = this.customPresets;
        } else if (category === 'favorites') {
            // Get all presets that are in favorites
            const all = getAllPresets();
            presetsToRender = all.filter(p => this.favoritePresets.includes(p.name));

            // Also check custom presets (if not already included by getAllPresets return?)
            // Custom presets are separate in this.customPresets
            presetsToRender = presetsToRender.concat(this.customPresets.filter(p => this.favoritePresets.includes(p.name)));
        } else if (category === 'all') {
            // Flatten all categories for the wheel
            const all = getAllPresets();
            presetsToRender = all.filter(p => !p.hidden || this.museMode);
        } else {
            console.log(`[Presets] Loading category: ${category}`);
            const rawPresets = getPresetsByCategory(category) || [];
            presetsToRender = rawPresets.filter(p => !p.hidden);
        }

        if (presetsToRender.length === 0) {
            wheel.innerHTML = `<div class="text-gray-500 text-xs text-center w-full">No presets found</div>`;
            return;
        }

        // 2. Render Wheel Cards with Color Swatch Grid
        console.log(`[Wheel] Rendering ${presetsToRender.length} presets`);

        // Helper to generate CSS filter from preset values
        const generatePresetFilter = (p) => {
            // Amplify values for visible preview
            const sat = 100 + ((p.saturation || 0) * 1.5);
            const bright = 100 + ((p.exposure || 0) * 50);
            const contrast = 100 + ((p.contrast || 0) * 1.2);

            // Temperature & Tint APPROXIMATION
            // We need to exaggerate these to show "Warm vs Cool" on small swatches

            let sepia = 0;
            let hueRotate = (p.tint || 0) * 2.0; // Boost tint visibility

            if (p.temperature > 0) {
                // Warm
                sepia = p.temperature * 1.5;
                hueRotate += p.temperature * 0.5;
            } else if (p.temperature < 0) {
                // Cool (Blueish shift via hue rotate)
                hueRotate += p.temperature * 0.5;
                // Slight saturation boost to make blue pop?
            }

            // Split Toning (Check different naming keys if any)
            // It seems presets use 'splitHighlightHue' but grep failed?
            // Checking standard 'hslRed', etc might be better?
            // For now, let's trust the standard temp/tint are dominant.

            // CLAMP values
            return `saturate(${Math.max(0, sat)}%) brightness(${Math.max(0, bright)}%) contrast(${Math.max(0, contrast)}%) sepia(${Math.max(0, Math.min(100, sepia))}%) hue-rotate(${hueRotate}deg)`;
        };

        // Render Simplified Wheel Cards (2 swatches instead of 8 for performance)
        wheel.innerHTML = presetsToRender.map(preset => {
            // Simplified preview: Just red and blue to show contrast/tone shift
            // This reduces DOM elements per card from 9 to 3
            const filter = generatePresetFilter(preset);
            const isFavorite = this.favoritePresets.includes(preset.name);
            const starClass = isFavorite ? 'text-yellow-400' : 'text-gray-500 opacity-0 group-hover:opacity-100';

            return `
            <div class="wheel-card group" data-preset="${preset.name}">
                <button class="favorite-star absolute top-1 right-1 z-10 p-1 rounded-full bg-black/30 hover:bg-black/50 ${starClass} transition-all" 
                    data-preset-name="${preset.name}" title="Toggle Favorite">
                    <svg class="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                </button>
                <div class="wheel-card-preview preset-swatch-grid simple">
                   <div style="background-color: #e74c3c; filter: ${filter};"></div>
                   <div style="background-color: #3498db; filter: ${filter};"></div>
                </div>
                <div class="wheel-card-label flex items-center justify-center gap-1">
                    ${preset.name}
                    ${category === 'custom' ? `<button class="delete-preset text-red-500 hover:text-red-400 ml-1" data-preset-name="${preset.name}" title="Delete Preset">×</button>` : ''}
                </div>
            </div>
        `}).join('');

        // Add "New Preset" Card if Custom
        if (category === 'custom') {
            const newCardHtml = `
            <div class="wheel-card group border-dashed border-2 border-white/20 hover:border-emerald-500/50" id="create-preset-card">
                <div class="wheel-card-preview flex items-center justify-center bg-black/20">
                    <svg class="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
                </div>
                <div class="wheel-card-label text-emerald-500">New Preset</div>
            </div>`;
            wheel.innerHTML = newCardHtml + wheel.innerHTML;
        }

        // Add "Scan Receipt" Card if Custom or All
        if (category === 'custom' || category === 'all') {
            const scanCardHtml = `
            <div class="wheel-card group border-dashed border-2 border-white/20 hover:border-hot-pink/50" id="scan-receipt-card">
                <div class="wheel-card-preview flex items-center justify-center bg-black/20">
                    <svg class="w-8 h-8 text-hot-pink" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
                </div>
                <div class="wheel-card-label text-hot-pink">Scan Receipt</div>
            </div>`;
            // Insert at the very beginning (before New Preset if it exists)
            wheel.innerHTML = scanCardHtml + wheel.innerHTML;
        }

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

                    // DEBOUNCED PRESET APPLICATION
                    // Clear pending timeout
                    if (this.presetDebounceTimer) clearTimeout(this.presetDebounceTimer);

                    if (this.currentPresetName !== presetName) {
                        // Apply immediately if not scrolling fast/first load (simulated check)? 
                        // No, always debounce slightly to prevent "machine gun" effect
                        this.presetDebounceTimer = setTimeout(() => {
                            this.applyPreset(presetName);
                            // Haptic feedback
                            if (navigator.vibrate) navigator.vibrate(5);
                        }, 150); // 150ms debounce
                    }
                }
            });
        }, options);

        // Observe all cards
        wheel.querySelectorAll('.wheel-card').forEach(card => this.wheelObserver.observe(card));

        // 4. Click to scroll to item
        wheel.querySelectorAll('.wheel-card').forEach(card => {
            card.addEventListener('click', (e) => {
                // Don't scroll if clicking the star button
                if (e.target.closest('.favorite-star')) return;
                card.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
            });
        });

        // 5. Favorite star click handlers
        wheel.querySelectorAll('.favorite-star').forEach(star => {
            star.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetName = star.dataset.presetName;
                this.toggleFavorite(presetName, star);
            });
        });

        // 6. Handle "New Preset" Click
        const createCard = wheel.querySelector('#create-preset-card');
        if (createCard) {
            createCard.addEventListener('click', () => {
                this.showSavePresetModal();
            });
        }

        // 7. Handle "Scan Receipt" Click
        const scanCard = wheel.querySelector('#scan-receipt-card');
        if (scanCard) {
            scanCard.addEventListener('click', () => {
                if (this.receiptScanner) this.receiptScanner.open();
            });
        }

        // 7. Handle Delete Preset
        wheel.querySelectorAll('.delete-preset').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetName = btn.dataset.presetName;
                if (confirm(`Delete preset "${presetName}"?`)) {
                    this.deleteCustomPreset(presetName);
                }
            });
        });
    }

    async deleteCustomPreset(name) {
        const preset = this.customPresets.find(p => p.name === name);
        if (!preset) return;

        try {
            if (preset.id) {
                await storage.deletePreset(preset.id);
            }
            this.customPresets = this.customPresets.filter(p => p.name !== name);
            this.populatePresets('custom');
            this.showToast('Preset deleted');
        } catch (error) {
            console.error('Failed to delete preset:', error);
            this.showToast('Failed to delete preset', 'error');
        }
    }

    toggleFavorite(presetName, starElement = null) {
        const index = this.favoritePresets.indexOf(presetName);
        if (index > -1) {
            // Remove from favorites
            this.favoritePresets.splice(index, 1);
            if (starElement) {
                starElement.classList.remove('text-yellow-400');
                starElement.classList.add('text-gray-500', 'opacity-0', 'group-hover:opacity-100');
            }
            this.showToast(`Removed "${presetName}" from favorites`);
        } else {
            // Add to favorites
            this.favoritePresets.push(presetName);
            if (starElement) {
                starElement.classList.add('text-yellow-400');
                starElement.classList.remove('text-gray-500', 'opacity-0', 'group-hover:opacity-100');
            }
            this.showToast(`Added "${presetName}" to favorites ⭐`);
        }

        // Persist to localStorage
        localStorage.setItem('favoritePresets', JSON.stringify(this.favoritePresets));
    }

    /**
     * Auto-detect grain physics based on film name
     * 1 = Negative (Shadows/Mids), 2 = Slide (Mids), 0 = Digital
     */
    detectGrainType(name) {
        const lower = name.toLowerCase();

        // Exceptions: LomoChrome is C-41 (Negative) despite name
        if (lower.includes('lomochrome')) return 1;

        // Known Slide Films
        if (lower.includes('velvia') ||
            lower.includes('provia') ||
            lower.includes('astia') ||
            lower.includes('ektachrome') ||
            lower.includes('fortia') ||
            lower.includes('sensia') ||
            lower.includes('ct prec') ||
            lower.includes('slide') ||
            lower.includes('chrome')) { // Aerochrome, Ektachrome, Chrome
            return 2;
        }
        // Default to Negative (Portra, Gold, B&W, etc.)
        return 1;
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

        // Clone and inject Grain Type if missing
        const presetToApply = { ...preset };
        if (presetToApply.grainType === undefined) {
            presetToApply.grainType = this.detectGrainType(preset.name);
        }

        this.engine.applyPreset(presetToApply);

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

        if (this.history) {
            this.history.pushImmediate(adjustments, `Preset: ${name}`);
        }
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
        console.log('[App] Opening Save Preset Modal');
        if (this.elements.savePresetModal) {
            this.elements.savePresetModal.classList.remove('hidden');
            this.elements.presetNameInput.value = '';
            this.elements.presetNameInput.focus();
        } else {
            console.error('[App] Save Preset Modal not found in DOM');
        }
    }

    hideSavePresetModal() {
        console.log('[App] Closing Save Preset Modal');
        if (this.elements.savePresetModal) {
            this.elements.savePresetModal.classList.add('hidden');
        }
    }

    async saveCustomPreset() {
        console.log('[App] saveCustomPreset triggered');
        const name = this.elements.presetNameInput.value.trim();
        if (!name) {
            alert('Please enter a preset name');
            return;
        }

        // 1. Check against catalog (FilmPresets)
        if (window.findPreset && window.findPreset(name)) {
            alert(`"${name}" is a protected catalog preset name. Please choose a different name.`);
            return;
        }

        // 2. Check for duplicates in local array
        if (this.customPresets.some(p => p.name.toLowerCase() === name.toLowerCase())) {
            alert('A user preset with this name already exists');
            return;
        }

        const preset = {
            name,
            category: 'custom',
            ...this.engine.getAdjustments()
        };

        try {
            // Save to IndexedDB (returns the generated id)
            const id = await storage.savePreset(preset);
            preset.id = id;

            this.customPresets.push(preset);
            this.hideSavePresetModal();

            // Refresh presets if viewing custom
            if (document.querySelector('.preset-category.active')?.dataset.category === 'custom') {
                this.populatePresets('custom');
            }

            this.showToast(`✓ Preset "${name}" saved`);
        } catch (error) {
            console.error('Failed to save preset:', error);

            // Handle unique constraint error specifically if it somehow bypassed our check
            if (error.name === 'ConstraintError') {
                alert(`Error: A preset named "${name}" already exists in the database. Please use a unique name.`);
            } else {
                this.showToast('Failed to save preset', 'error');
            }
        }
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
        }
    }

    hideExportSettings() {
        if (this.elements.exportSettingsModal) {
            this.elements.exportSettingsModal.classList.add('hidden');
        }
    }

    saveExportSettings() {
        if (!this.elements.exportSettingsModal) return;

        this.exportSettings = {
            resolution: this.elements.exportResolution.value,
            customWidth: parseInt(this.elements.exportCustomWidth.value) || 1920,
            quality: parseInt(this.elements.exportQuality.value) || 95,
            preserveExif: this.elements.exportExif.checked
        };

        this.hideExportSettings();
        this.showToast('Export settings saved');

        console.log('[App] Export settings updated:', this.exportSettings);
    }

    updateBatchExportButton() {
        const btn = document.getElementById('batch-export-btn');
        const syncBtn = document.getElementById('sync-all-btn');
        const count = this.images.length;

        if (btn) {
            const countDisplay = btn.querySelector('#batch-count');
            if (countDisplay) countDisplay.textContent = count;
            btn.disabled = count === 0;
            btn.classList.toggle('opacity-50', count === 0);
        }

        if (syncBtn) {
            syncBtn.disabled = count < 2;
        }

        const batchCountSpan = document.getElementById('batch-count');
        if (batchCountSpan) batchCountSpan.textContent = count;
    }

    updateSlidersFromAdjustments(adjustments) {
        if (!adjustments) return;

        // 1. Standard Sliders
        document.querySelectorAll('.studio-slider').forEach(slider => {
            const name = slider.id;
            if (name in adjustments) {
                const val = adjustments[name];
                if (typeof val === 'number') {
                    slider.value = val;
                    const valueDisplay = document.querySelector(`.slider-value[data-for="${name}"]`);
                    if (valueDisplay) {
                        valueDisplay.textContent = name === 'exposure' ? val.toFixed(2) :
                            name === 'grainSize' ? val.toFixed(1) :
                                Math.round(val);
                    }
                }
            }
        });

        // 2. HSL Mixer (Update currently active channel sliders)
        if (this.hslChannel) {
            this.switchHSLChannel(this.hslChannel, adjustments);
        }

        // 3. Color Wheels (Shadows/Midtones/Highlights)
        if (this.shadowWheel) {
            this.shadowWheel.hue = adjustments.splitShadowHue || 0;
            this.shadowWheel.sat = adjustments.splitShadowSat || 0;
            this.shadowWheel.draw();
        }
        if (this.midtoneWheel) {
            this.midtoneWheel.hue = adjustments.splitMidtoneHue || 0;
            this.midtoneWheel.sat = adjustments.splitMidtoneSat || 0;
            this.midtoneWheel.draw();
        }
        if (this.highlightWheel) {
            this.highlightWheel.hue = adjustments.splitHighlightHue || 0;
            this.highlightWheel.sat = adjustments.splitHighlightSat || 0;
            this.highlightWheel.draw();
        }

        // 4. Output Transform Buttons
        if (this.elements.printStockBtns && adjustments.outputTransform !== undefined) {
            this.elements.printStockBtns.forEach(btn => {
                const mode = parseInt(btn.dataset.mode);
                const isActive = mode === adjustments.outputTransform;
                btn.classList.toggle('active', isActive);
                btn.classList.toggle('bg-hot-pink/20', isActive);
                btn.classList.toggle('text-hot-pink', isActive);
                btn.classList.toggle('font-semibold', isActive);
            });
        }

        // 5. Checkboxes (Toggles)
        const toggles = {
            'border-toggle': 'borderEnabled',
            'gallery-frame-toggle': 'galleryFrame',
            'clipping-toggle': 'showClipping'
        };
        for (const [id, adjKey] of Object.entries(toggles)) {
            const el = document.getElementById(id);
            if (el && adjustments[adjKey] !== undefined) {
                el.checked = !!adjustments[adjKey];
            }
        }

        // 6. Selects & Color Pickers
        const asciiMode = document.getElementById('asciiMode');
        if (asciiMode && adjustments.asciiMode !== undefined) {
            asciiMode.value = adjustments.asciiMode;
            const asciiColor = document.getElementById('asciiColor');
            if (asciiColor) {
                asciiColor.classList.toggle('hidden', adjustments.asciiMode !== 4);
                if (adjustments.asciiColor) {
                    asciiColor.value = this.rgbToHex(adjustments.asciiColor);
                }
            }
        }

        // 7. Glow Color
        const glowColorEl = document.getElementById('glowColor');
        if (glowColorEl && adjustments.glowColor) {
            glowColorEl.value = this.rgbToHex(adjustments.glowColor);
        }

        // 8. Light Leak Color
        const lightLeakColorEl = document.getElementById('lightLeakColor');
        if (lightLeakColorEl && adjustments.lightLeakColor) {
            lightLeakColorEl.value = this.rgbToHex(adjustments.lightLeakColor);
        }
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

        // Reset Output Transform UI
        if (this.elements.printStockBtns) {
            this.elements.printStockBtns.forEach(b => {
                b.classList.remove('active', 'bg-hot-pink/20', 'text-hot-pink', 'font-semibold', 'shadow-[0_0_10px_rgba(237,39,136,0.2)]');
                b.classList.add('text-gray-400', 'hover:bg-white/10');
            });
            // Select first one (Standard/None)
            const first = this.elements.printStockBtns[0];
            if (first) {
                first.classList.add('active', 'bg-hot-pink/20', 'text-hot-pink', 'font-semibold', 'shadow-[0_0_10px_rgba(237,39,136,0.2)]');
                first.classList.remove('text-gray-400', 'hover:bg-white/10');
            }
        }

        if (this.history) {
            this.history.pushImmediate(adjustments, 'Reset All');
        }
    }

    async exportImage() {
        if (this.activeIndex < 0) return;

        const format = this.elements.exportFormat.value;
        const quality = this.exportSettings.quality / 100;

        const btn = this.elements.exportBtn;
        const originalText = btn.innerHTML;
        const modal = this.elements.exportModal;

        modal.classList.remove('hidden');
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
                const res = this.exportSettings.resolution;
                const customW = res === 'custom' ? this.exportSettings.customWidth : null;
                await this.exportManager.exportImage(format, quality, res, updateProgress, drawCallback, customW);
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
        // Linear Progress Bar (New Film Strip)
        const bar = document.getElementById('export-overall-bar');
        if (bar) bar.style.width = `${percent}%`;

        // Circular Progress Ring (Legacy/Mobile)
        if (this.elements.progressRingFill) {
            const circumference = 2 * Math.PI * 56;
            const offset = circumference - (percent / 100) * circumference;
            this.elements.progressRingFill.style.strokeDashoffset = offset;
        }

        if (this.elements.progressText) {
            this.elements.progressText.textContent = `${Math.round(percent)}%`;
        }
    }

    /**
     * Export current color grade as .cube LUT file
     */
    async exportLUT() {
        if (!this.engine) {
            alert('No adjustments to export');
            return;
        }

        const btn = document.getElementById('export-lut-btn');
        const originalText = btn?.innerHTML;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="animate-pulse">Generating...</span>';
            }

            // Get current adjustments
            const adjustments = this.engine.getAdjustments();

            // Create LUT exporter
            const exporter = new LUTExporter(this.engine);

            // Generate filename from current time
            const date = new Date();
            const filename = `untitled_grade_${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}_${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;

            // Download LUT
            await exporter.downloadLUT(adjustments, filename);

            // Show success toast
            const toast = document.createElement('div');
            toast.textContent = '✓ LUT exported successfully';
            toast.className = 'fixed top-24 left-1/2 transform -translate-x-1/2 bg-moonstone/20 backdrop-blur-md border border-moonstone/40 text-moonstone px-6 py-3 rounded-full shadow-2xl z-50 animate-fade-in-down font-medium tracking-wide';
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3000);

        } catch (error) {
            console.error('LUT export failed:', error);
            alert('Failed to export LUT: ' + error.message);
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
        btn.innerHTML = originalText;
    }

    initHSL() {
        const channels = document.querySelectorAll('.hsl-channel');
        const sliders = document.querySelectorAll('.hsl-slider');

        let activeMode = 'hue'; // hue, sat, lum

        const updateSliders = () => {
            sliders.forEach(slider => {
                const color = slider.dataset.color;
                const key = `hsl${color.charAt(0).toUpperCase() + color.slice(1)}`;

                // Get current value from engine adjustments
                // adjustments.hslRed is [h, s, l]
                if (this.engine && this.engine.adjustments && this.engine.adjustments[key]) {
                    const idx = { hue: 0, sat: 1, lum: 2 }[activeMode];
                    slider.value = this.engine.adjustments[key][idx];
                }

                // Update track gradient visual (optional polish)
                // this.updateSliderVisual(slider); 
            });
        };

        // Channel Tabs (Hue / Saturation / Luminance)
        channels.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update UI
                channels.forEach(b => b.classList.remove('active', 'text-hot-pink', 'font-bold'));
                btn.classList.add('active', 'text-hot-pink', 'font-bold');

                activeMode = btn.dataset.channel;
                updateSliders();
            });
        });

        // Sliders
        sliders.forEach(slider => {
            const handleInput = (e) => {
                const val = parseFloat(e.target.value);
                const color = e.target.dataset.color;

                this.engine.setHSL(color, activeMode, val);
            };

            slider.addEventListener('input', handleInput);
        });

        // Initial update
        updateSliders();
    }

    initColorWheels() {
        // Shadows
        this.shadowWheel = new ColorWheel(document.getElementById('wheel-shadows'), {
            onChange: (v) => {
                this.engine.setAdjustment('splitShadowHue', v.hue);
                this.engine.setAdjustment('splitShadowSat', v.sat);
                document.getElementById('splitShadowSat').value = v.sat;
            }
        });

        // Midtones
        this.midtoneWheel = new ColorWheel(document.getElementById('wheel-midtones'), {
            onChange: (v) => {
                this.engine.setAdjustment('splitMidtoneHue', v.hue);
                this.engine.setAdjustment('splitMidtoneSat', v.sat);
                document.getElementById('splitMidtoneSat').value = v.sat;
            }
        });

        // Highlights
        this.highlightWheel = new ColorWheel(document.getElementById('wheel-highlights'), {
            onChange: (v) => {
                this.engine.setAdjustment('splitHighlightHue', v.hue);
                this.engine.setAdjustment('splitHighlightSat', v.sat);
                document.getElementById('splitHighlightSat').value = v.sat;
            }
        });

        // Link Saturation Sliders back to Wheels
        // Shadows
        const sSat = document.getElementById('splitShadowSat');
        sSat.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.shadowWheel.sat = val;
            this.shadowWheel.draw();
            this.engine.setAdjustment('splitShadowSat', val);
        });

        // Mids
        const mSat = document.getElementById('splitMidtoneSat');
        mSat.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.midtoneWheel.sat = val;
            this.midtoneWheel.draw();
            this.engine.setAdjustment('splitMidtoneSat', val);
        });

        // Highlights
        const hSat = document.getElementById('splitHighlightSat');
        hSat.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.highlightWheel.sat = val;
            this.highlightWheel.draw();
            this.engine.setAdjustment('splitHighlightSat', val);
        });

        // Balance Slider
        const balance = document.getElementById('splitBalance');
        balance.addEventListener('input', (e) => {
            this.engine.setAdjustment('splitBalance', parseFloat(e.target.value));
        });
    }


    initHistory() {
        this.history = new HistoryManager();

        // Listen for history changes
        this.history.onStateChange = (state) => {
            // Update Undo/Redo buttons
            if (this.elements.undoBtn) this.elements.undoBtn.disabled = !state.canUndo;
            if (this.elements.redoBtn) this.elements.redoBtn.disabled = !state.canRedo;

            // Note: We don't automatically restore config here. 
            // Undo/Redo actions call restoreState manually.
        };

        // Setup Button Listeners
        if (this.elements.undoBtn) {
            this.elements.undoBtn.addEventListener('click', () => {
                const state = this.history.undo();
                if (state) this.restoreState(state);
            });
        }

        if (this.elements.redoBtn) {
            this.elements.redoBtn.addEventListener('click', () => {
                const state = this.history.redo();
                if (state) this.restoreState(state);
            });
        }
    }

    initVectorscope() {
        const canvas = document.getElementById('vectorscope-canvas');
        if (!canvas) return;

        this.vectorscope = new Vectorscope(canvas);
        this.isVectorscopeVisible = false;

        const toggle = document.getElementById('toggle-vectorscope');
        const container = document.getElementById('vectorscope-container');

        toggle.addEventListener('click', () => {
            this.isVectorscopeVisible = !this.isVectorscopeVisible;
            if (this.isVectorscopeVisible) {
                container.classList.remove('hidden');
                this.updateVectorscope();
            } else {
                container.classList.add('hidden');
            }
        });

        // Hook into engine render to update scope
        // Simple override of engine.render to inject callback
        const originalRender = this.engine.render.bind(this.engine);
        this.engine.render = () => {
            originalRender();
            if (this.isVectorscopeVisible) {
                // Defer to next frame to allow UI update
                requestAnimationFrame(() => this.updateVectorscope());
            }
        };
    }

    updateVectorscope() {
        if (!this.vectorscope || !this.isVectorscopeVisible) return;

        // Throttling to protect battery/CPU. Desktop: 30fps (32ms), Mobile: 15fps (64ms)
        const isMobile = window.innerWidth < 800; // Recalculate or use this.isMobile
        const throttle = isMobile ? 64 : 32;

        const now = performance.now();
        if (this.lastVectorscopeUpdate && (now - this.lastVectorscopeUpdate < throttle)) {
            return;
        }
        this.lastVectorscopeUpdate = now;

        // Use efficient GPU downsampling. Mobile uses even smaller buffer for speed.
        const size = isMobile ? 128 : 256;
        const pixels = this.engine.getAnalysisData(size);

        if (pixels) {
            this.vectorscope.update(pixels, size, size);
        }
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

        // S - Sync All
        if (e.key === 's' || e.key === 'S') {
            if (e.type === 'keydown' && !e.metaKey && !e.ctrlKey) {
                this.syncAllImages();
            }
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

    showBatchExportModal(targetRollId = null) {
        this.targetRollId = targetRollId;
        const modal = document.getElementById('batch-export-modal');
        if (modal) {
            modal.classList.remove('hidden');
            // Update UI context
            const title = modal.querySelector('h3');
            const desc = modal.querySelector('p');
            if (targetRollId) {
                const roll = this.rolls.find(r => r.id === targetRollId);
                if (title) title.textContent = roll ? `DEVELOP ${roll.name}` : 'DEVELOP ROLL';
                if (desc) desc.textContent = 'Agitating chemicals... How do you want to save this roll?';
            } else {
                if (title) title.textContent = 'Batch Export';
                if (desc) desc.textContent = 'How do you want to save your edited photos?';
            }
        }
    }

    hideBatchExportModal() {
        const modal = document.getElementById('batch-export-modal');
        if (modal) modal.classList.add('hidden');
        this.targetRollId = null;
    }

    async processBatch(mode) {
        this.hideBatchExportModal();

        const imagesToProcess = this.targetRollId
            ? this.images.filter(img => img.rollId === this.targetRollId)
            : this.images;

        if (imagesToProcess.length === 0) return;

        this.elements.exportModal.classList.remove('hidden');
        this.updateExportProgress(0);

        const progressText = document.getElementById('export-overall-text');
        if (progressText) progressText.textContent = `0 / ${imagesToProcess.length}`;

        try {
            const blobs = [];
            const filenames = [];

            // 1. RENDER PHASE
            // Need to save current state first to avoid losing edits on current image
            if (this.activeIndex >= 0) {
                this.images[this.activeIndex].adjustments = this.engine.getAdjustments();
            }

            for (let i = 0; i < imagesToProcess.length; i++) {
                const imgData = imagesToProcess[i];
                const progress = (i / imagesToProcess.length) * 50;
                this.updateExportProgress(progress);
                if (progressText) progressText.textContent = `${i + 1} / ${imagesToProcess.length}`;

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
                const prefix = this.targetRollId ? 'roll-dev' : 'batch';
                filenames.push(`untitled-studio-${prefix}-${i + 1}.${format}`);
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
                    const rollName = this.targetRollId ? this.rolls.find(r => r.id === this.targetRollId)?.name : 'Batch';
                    link.download = `Untitled_Studio_${rollName.replace(/\s+/g, '_')}_${Date.now()}.zip`;
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

    async handleLUTUpload(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            try {
                const lut = this.lutParser.parse(text);

                // Update Engine
                this.engine.loadLUT(lut.data, lut.size);

                // Update UI
                if (this.engine.useLUT) {
                    this.state = this.state || {}; // Safety
                    if (!this.state.adjustments) this.state.adjustments = this.engine.getAdjustments();
                    this.state.adjustments.lutOpacity = 100;

                    this.elements.lutControls.classList.remove('hidden');
                    this.elements.removeLutBtn.classList.remove('hidden');
                    if (this.elements.lutName) this.elements.lutName.textContent = lut.title || file.name;

                    // Update Slider UI
                    const opSlider = document.getElementById('lutOpacity');
                    const opVal = document.querySelector('[data-for="lutOpacity"]');
                    if (opSlider) opSlider.value = 100;
                    if (opVal) opVal.textContent = "1.00";
                }

            } catch (err) {
                console.error("LUT Parse Error", err);
                alert("Failed to parse .cube file. Ensure it is a valid 3D LUT.");
            }
        };
        reader.readAsText(file);
        // Reset input
        e.target.value = '';
    }

    showExportSettings() {
        if (this.elements.exportSettingsModal) {
            this.elements.exportSettingsModal.classList.remove('hidden');
            // Sync UI with state
            if (this.elements.exportResolution) this.elements.exportResolution.value = this.exportSettings.resolution;
            if (this.elements.exportCustomWidth) this.elements.exportCustomWidth.value = this.exportSettings.customWidth;
            if (this.elements.exportQuality) this.elements.exportQuality.value = this.exportSettings.quality;
            if (this.elements.exportQualityValue) this.elements.exportQualityValue.textContent = this.exportSettings.quality + '%';
            if (this.elements.exportExif) this.elements.exportExif.checked = this.exportSettings.preserveExif;

            // Toggle custom width visibility
            if (this.elements.customResolutionGroup) {
                this.elements.customResolutionGroup.classList.toggle('hidden', this.exportSettings.resolution !== 'custom');
            }
        }
    }

    hideExportSettings() {
        if (this.elements.exportSettingsModal) {
            this.elements.exportSettingsModal.classList.add('hidden');
        }
    }

    saveExportSettings() {
        if (this.elements.exportResolution) this.exportSettings.resolution = this.elements.exportResolution.value;
        if (this.elements.exportCustomWidth) this.exportSettings.customWidth = parseInt(this.elements.exportCustomWidth.value) || 1920;
        if (this.elements.exportQuality) this.exportSettings.quality = parseInt(this.elements.exportQuality.value) || 95;
        if (this.elements.exportExif) this.exportSettings.preserveExif = this.elements.exportExif.checked;

        this.hideExportSettings();
        this.showToast('Export settings saved');
    }

    initPresetAccordion() {
        if (!this.elements.presetGroups) return;

        this.elements.presetGroups.forEach(group => {
            const header = group.querySelector('.group-header');
            const content = group.querySelector('.group-content');
            const chevron = header.querySelector('svg');

            header.addEventListener('click', () => {
                const isExpanded = group.classList.toggle('expanded');
                content.classList.toggle('hidden', !isExpanded);
                if (chevron) chevron.classList.toggle('rotate-180', isExpanded);

                // Optional: Accordion behavior (one at a time)
                if (isExpanded) {
                    this.elements.presetGroups.forEach(g => {
                        if (g !== group) {
                            g.classList.remove('expanded');
                            g.querySelector('.group-content')?.classList.add('hidden');
                            g.querySelector('.group-header svg')?.classList.remove('rotate-180');
                        }
                    });
                }
            });
        });

        // Ensure save preset btn element ref is updated for the listener
        this.elements.savePresetBtn = document.getElementById('save-preset-btn');
    }

    // ============ DYNAMIC THEME ENGINE (v2 — 6 Themes + Drawer) ============
    initThemeEngine() {
        try {
            const THEMES = ['kodak', 'braun', 'phosphor', 'safelight', 'cyanotype', 'vapor'];
            const saved = localStorage.getItem('untitled-theme') || 'kodak';
            this.currentTheme = THEMES.includes(saved) ? saved : 'kodak';

            console.log(`[Theme] System ready. Initial: ${this.currentTheme.toUpperCase()}`);

            if (window.CipherReveal) {
                window.CipherReveal.init('[data-cipher]');
            }

            this._applyTheme(this.currentTheme);

            // Robust Delegated Listener attached to document
            document.addEventListener('click', (e) => {
                const pickerBtn = document.getElementById('theme-picker-btn');
                const drawer = document.getElementById('theme-drawer');

                if (!pickerBtn || !drawer) return;

                const isTrigger = e.target === pickerBtn || pickerBtn.contains(e.target);
                const isInsideDrawer = drawer.contains(e.target);

                if (isTrigger) {
                    console.log('[Theme] Toggle clicked');
                    e.preventDefault();
                    e.stopPropagation();
                    drawer.classList.toggle('open');
                    if (this.hapticFeedback) this.hapticFeedback('light');
                    if (window.Sonic && window.Sonic.playClick) window.Sonic.playClick();
                } else if (isInsideDrawer) {
                    const swatch = e.target.closest('.theme-swatch');
                    if (swatch) {
                        const theme = swatch.dataset.theme;
                        if (theme && THEMES.includes(theme)) {
                            console.warn(`[Theme] Switching to: ${theme.toUpperCase()}`);
                            this._applyTheme(theme);
                            localStorage.setItem('untitled-theme', theme);
                            if (this.hapticFeedback) this.hapticFeedback('medium');
                        }
                    }
                    // Keep drawer open if they clicked inside but didn't hit a swatch?
                    // Actually, let's stop propagation if inside drawer so outside click doesn't close it
                    e.stopPropagation();
                } else {
                    // Outside click - Close
                    if (drawer.classList.contains('open')) {
                        console.log('[Theme] Closing drawer (outside click)');
                        drawer.classList.remove('open');
                    }
                }
            });

            this._updateActiveSwatches();

            // Developer Fallback
            window.untitledTheme = {
                apply: (t) => this._applyTheme(t),
                current: () => this.currentTheme,
                list: () => THEMES
            };
        } catch (e) {
            console.error('[Theme] Init failed:', e);
        }
    }

    /** Apply a theme — sets data-theme, updates swatches, syncs meta, applies manifesto touches */
    _applyTheme(theme) {
        this.currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        this._updateActiveSwatches();
        this._syncMetaThemeColor();


        // Trigger Cipher Reveal Animation
        if (window.CipherReveal) {
            window.CipherReveal.fireAll();
        }
    }

    /** Update active ring on swatches */
    _updateActiveSwatches() {
        document.querySelectorAll('.theme-swatch').forEach(s => {
            s.classList.toggle('active', s.dataset.theme === this.currentTheme);
        });
    }



    /** Sync <meta name="theme-color"> with the active theme's --bg-main */
    _syncMetaThemeColor() {
        const meta = document.querySelector('meta[name="theme-color"]');
        if (meta) {
            requestAnimationFrame(() => {
                const bgMain = getComputedStyle(document.documentElement)
                    .getPropertyValue('--bg-main').trim();
                if (bgMain) meta.setAttribute('content', bgMain);
            });
        }
    }
    initRailNavigation() {
        // New Sidebar Rail Logic (Phase 2 Refactor & Restoration)
        const railButtons = document.querySelectorAll('.rail-icon');

        // Map Tabs to Container IDs
        const map = {
            'tone': 'group-tone',
            'curve': 'group-curve',
            'color': 'group-color',
            'fx': 'group-fx',
            'transform': 'group-transform',
            'presets': 'group-presets'
        };

        // Tool Bindings
        const toolMap = {
            'rail-undo-btn': () => this.history.undo(),
            'rail-redo-btn': () => this.history.redo(),
            'rail-history-btn': () => {
                const historySidebar = document.getElementById('history-sidebar');
                if (historySidebar) {
                    // Toggle translate-x-full to slide in/out
                    if (historySidebar.classList.contains('translate-x-full')) {
                        historySidebar.classList.remove('translate-x-full');
                    } else {
                        historySidebar.classList.add('translate-x-full');
                    }
                }
            },
            'rail-split-btn': () => this.toggleSplitView(),
            'rail-histogram-btn': () => {
                const hud = document.getElementById('scopes-hud');
                if (hud) hud.classList.toggle('hidden');
                console.log('Toggle Histogram/Scopes');
            },
            'rail-receipt-btn': () => {
                const modal = document.getElementById('receipt-scanner-modal');
                if (modal) {
                    modal.classList.remove('hidden');
                    setTimeout(() => modal.querySelector('#scanner-content').classList.remove('opacity-0', 'scale-95'), 10);
                    setTimeout(() => modal.querySelector('#scanner-backdrop').classList.remove('opacity-0'), 10);
                    if (window.ReceiptScanner) window.ReceiptScanner.startCamera();
                }
            },
            'rail-settings-btn': () => this.showExportSettings(),
            'rail-export-btn': () => this.showExportSettings()
        };

        railButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.currentTarget;

                // 1. Tool Logic
                if (button.id && toolMap[button.id]) {
                    // Visual Feedback
                    button.classList.add('text-hot-pink');
                    setTimeout(() => button.classList.remove('text-hot-pink'), 200);
                    toolMap[button.id]();
                    return;
                }

                // 2. Tab Logic
                const tab = button.dataset.tab;
                if (!tab) return;

                const targetId = map[tab];
                if (!targetId) return;

                // Update Subtitle
                const subtitleMap = {
                    'tone': 'LIGHT & TONE',
                    'curve': 'TONE CURVE',
                    'color': 'COLOR GRADING',
                    'fx': 'EFFECTS & OPTICS',
                    'transform': 'GEOMETRY',
                    'presets': 'FILM LOOKS'
                };
                const subtitleEl = document.getElementById('panel-subtitle');
                if (subtitleEl && subtitleMap[tab]) {
                    subtitleEl.textContent = subtitleMap[tab];
                    // Optional: trigger animation
                    subtitleEl.style.opacity = '0.5';
                    setTimeout(() => subtitleEl.style.opacity = '1', 50);
                }

                // Update Rail UI
                document.querySelectorAll('.rail-icon[data-tab]').forEach(b => b.classList.remove('active'));
                button.classList.add('active');

                // Toggle visibility
                Object.values(map).forEach(id => {
                    const el = document.getElementById(id);
                    if (el) {
                        if (id === targetId) {
                            el.classList.add('active');
                            el.classList.remove('hidden');
                            if (targetId === 'group-presets') {
                                // refresh?
                            }
                        } else {
                            el.classList.remove('active');
                            el.classList.add('hidden');
                        }
                    }
                });

                // Mobile Drawer
                const panel = document.getElementById('control-panel');
                if (window.innerWidth < 768 && panel) {
                    panel.classList.add('active');
                }
            });
        });

        this.initExportLogic();
    }

    initHistory() {
        if (typeof HistoryManager !== 'undefined') {
            this.history = new HistoryManager();
            this.history.onStateChange = (state) => this.renderHistoryPanel(state);
            console.log('✓ History Initialized');
        } else {
            console.warn('HistoryManager not loaded');
            this.history = { undo: () => { }, redo: () => { }, push: () => { } };
        }
    }

    renderHistoryPanel(state) {
        const list = document.getElementById('history-list');
        if (!list) return;

        list.innerHTML = ''; // Clear

        if (!state || !state.states) return;

        // Show newest at top
        const reversed = [...state.states].reverse();

        reversed.forEach(item => {
            const el = document.createElement('div');
            el.className = `p-2 mb-1 rounded cursor-pointer text-xs flex justify-between items-center ${item.isCurrent ? 'bg-hot-pink/20 text-hot-pink font-bold border-l-2 border-hot-pink' : 'hover:bg-white/10 text-gray-400'}`;
            el.innerHTML = `
                <span>${item.label || 'Adjustment'}</span>
                <span class="text-[10px] opacity-50">${new Date(item.timestamp).toLocaleTimeString()}</span>
            `;
            el.addEventListener('click', () => {
                this.history.jumpTo(item.index);
            });
            list.appendChild(el);
        });
    }

    initExportLogic() {
        const confirmBtn = document.getElementById('confirm-export-btn');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.exportImage());
        }

        document.querySelectorAll('.export-format-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.export-format-btn').forEach(b => {
                    b.classList.remove('active', 'bg-hot-pink/20', 'border-hot-pink', 'text-white');
                    b.classList.add('bg-white/5', 'border-white/10', 'text-gray-400');
                });
                btn.classList.add('active', 'bg-hot-pink/20', 'border-hot-pink', 'text-white');
                btn.classList.remove('bg-white/5', 'border-white/10', 'text-gray-400');
            });
        });

        const qSlider = document.getElementById('export-quality');
        const qVal = document.getElementById('export-quality-val');
        if (qSlider && qVal) {
            qSlider.addEventListener('input', (e) => {
                qVal.textContent = e.target.value + '%';
            });
        }
    }

    exportImage() {
        const formatBtn = document.querySelector('.export-format-btn.active');
        const format = formatBtn ? formatBtn.dataset.format : 'jpeg';
        const quality = document.getElementById('export-quality').value / 100;

        if (!this.engine || !this.engine.gl) return;

        const canvas = this.engine.gl.canvas;
        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataURL = canvas.toDataURL(mime, quality);

        const link = document.createElement('a');
        link.download = `untitled_edit_${Date.now()}.${format}`;
        link.href = dataURL;
        link.click();

        this.showToast('Image Exported Successfully');
        document.getElementById('export-settings-modal').classList.add('hidden');
    }

    toggleSplitView() {
        if (!this.elements.splitSliderContainer) return;

        const isHidden = this.elements.splitSliderContainer.classList.contains('hidden');
        if (isHidden) {
            // Enable
            this.elements.splitSliderContainer.classList.remove('hidden');
            if (this.engine) {
                // Initialize split position
                const val = this.elements.splitSlider ? parseFloat(this.elements.splitSlider.value) : 0.5;
                this.engine.setAdjustment('splitPos', val);
                // Force a render
                this.engine.requestRender();
            }
            this.showToast('Split View Enabled ◐');
        } else {
            // Disable
            this.elements.splitSliderContainer.classList.add('hidden');
            if (this.engine) {
                this.engine.setAdjustment('splitPos', -1.0); // Disable in shader
                this.engine.requestRender();
            }
            this.showToast('Split View Disabled');
        }
    }

    initSplitViewControls() {
        if (!this.elements.splitSlider) return;

        // Listen for slider changes
        this.elements.splitSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);

            // 1. Update Engine
            if (this.engine) {
                this.engine.setAdjustment('splitPos', val);
                // Only request render if necessary (e.g. if not animating)
                // But since it's a drag, we want smooth updates. 
                // Engine loop might handle it, or we force it.
                // Let's assume engine handles it via loop if playing, or we might need to trigger.
                // For now, let's trigger it.
                // this.engine.render(); // If render exposes it
            }

            // 2. Update Visual Line Position
            if (this.elements.splitLine) {
                this.elements.splitLine.style.left = (val * 100) + '%';
            }
        });

        // Ensure line is initially positioned correctly
        if (this.elements.splitLine && this.elements.splitSlider) {
            const val = parseFloat(this.elements.splitSlider.value);
            this.elements.splitLine.style.left = (val * 100) + '%';
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
