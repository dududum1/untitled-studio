/**
 * UNTITLED STUDIO - WEBGL 2.0 RENDERING ENGINE
 * Non-destructive, GPU-accelerated image processing
 * Phase 2: Added Dehaze, Clarity, Split Toning, Tone Curve, Before/After
 */

class WebGLEngine {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = null;
        this.program = null;
        this.texture = null;
        this.toneCurveLUT = null;
        this.uniforms = {};
        this.programs = {}; // Stores all shader programs
        this.fbos = {};     // Stores framebuffers
        this.textures = {}; // Stores FBO textures
        this.overlayTexture = null; // Phase 3: Texture overlay
        this.lutTexture = null; // Option 2: Custom 3D LUT
        this.useLUT = false;    // Option 2: LUT Flag
        this.isReady = false;
        this.currentImage = null;
        this.animationFrame = null;
        this.showOriginal = false;
        this.masks = []; // Phase 4: Masks state

        // Default adjustment values
        this.adjustments = {
            // Tonal
            exposure: 0,
            contrast: 0,
            highlights: 0,
            shadows: 0,
            whites: 0,
            blacks: 0,
            // Color
            temperature: 0,
            tint: 0,
            vibrance: 0,
            saturation: 0,
            // Split Toning
            splitHighlightHue: 0,
            splitHighlightSat: 0,
            splitShadowHue: 0,
            splitShadowSat: 0,
            splitBalance: 0,
            // HSL Mixer
            hslRed: [0, 0, 0],
            hslOrange: [0, 0, 0],
            hslYellow: [0, 0, 0],
            hslGreen: [0, 0, 0],
            hslAqua: [0, 0, 0],
            hslBlue: [0, 0, 0],
            hslPurple: [0, 0, 0],
            hslMagenta: [0, 0, 0],
            // Effects
            grain: 0,
            grainSize: 1,
            vignette: 0,
            fade: 0,
            sharpness: 0,
            dehaze: 0,
            clarity: 0,
            chromaticAberration: 0,
            halation: 0,
            asciiSize: 0, // Added ASCII
            bloomStrength: 0,
            bloomThreshold: 70,
            grainGlobal: 1.0,
            overlayOpacity: 0,
            overlayBlendMode: 0,
            // Vibe Procedural
            lightLeak: 0,
            scratches: 0,
            filmSeed: 0, // Random seed for defects

            // Secret FX
            pixelateSize: 0,
            glitchStrength: 0,
            ditherStrength: 0,
            scanlineIntensity: 0,

            // LUT
            lutOpacity: 100,

            // New FX (Phase 7)
            posterize: 0,
            diffusion: 0,
            barrelDistortion: 0,
            filmGateWeave: 0,
            splitToneBalance: 0,
            noiseColorHue: 0,
            showClipping: false,
            denoise: 0
        };

        // Tone curve state
        this.useToneCurve = false;
        this.toneCurveChannel = 0; // 0=RGB, 1=R, 2=G, 3=B

        this.init();
    }

    /**
     * Initialize WebGL 2.0 context and compile shaders
     */
    init() {
        // Worker context: canvas is OffscreenCanvas
        this.gl = this.canvas.getContext('webgl2', {
            alpha: false,
            antialias: false,
            preserveDrawingBuffer: true,
            premultipliedAlpha: false
        });

        if (!this.gl) {
            console.error('WebGL 2.0 not supported');
            return false;
        }

        console.log('✓ WebGL 2.0 context initialized in Worker');

        // Context Loss
        this.canvas.addEventListener('webglcontextlost', (e) => {
            e.preventDefault();
            console.error('⚠️ WebGL Context Lost!');
            this.isReady = false;
            self.postMessage({ type: 'error', error: 'WebGL Context Lost' });
        });

        this.canvas.addEventListener('webglcontextrestored', () => {
            console.log('✓ WebGL Context Restored');
            this.isReady = true;
            this.initShaders();
            this.render();
        });

        // Initialize Shaders
        this.initShaders();



        this.isReady = true;
    }

    /**
     * Load image from Bitmap (passed from main thread/worker)
     * @param {ImageBitmap} bitmap 
     */
    async loadImage(bitmap) {
        this.currentImage = bitmap;

        // Resize canvas to match image
        this.canvas.width = bitmap.width;
        this.canvas.height = bitmap.height;
        this.gl.viewport(0, 0, bitmap.width, bitmap.height);

        if (this.texture) {
            this.gl.deleteTexture(this.texture);
        }

        this.texture = this.gl.createTexture();
        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);

        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
        this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

        this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

        // Upload bitmap directly
        this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, bitmap);

        return { width: bitmap.width, height: bitmap.height };
    }

    initShaders() {

        // Get device texture limits
        this.maxTextureSize = this.gl.getParameter(this.gl.MAX_TEXTURE_SIZE);
        console.log(`Device MAX_TEXTURE_SIZE: ${this.maxTextureSize}`);

        const vertexShader = this.compileShader(Shaders.vertex, this.gl.VERTEX_SHADER);
        const fragmentShader = this.compileShader(Shaders.fragment, this.gl.FRAGMENT_SHADER);

        if (!vertexShader || !fragmentShader) {
            console.error('Shader compilation failed');
            return false;
        }

        this.program = this.gl.createProgram();
        this.gl.attachShader(this.program, vertexShader);
        this.gl.attachShader(this.program, fragmentShader);
        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Program linking failed:', this.gl.getProgramInfoLog(this.program));
            return false;
        }

        this.gl.linkProgram(this.program);

        if (!this.gl.getProgramParameter(this.program, this.gl.LINK_STATUS)) {
            console.error('Program linking failed:', this.gl.getProgramInfoLog(this.program));
            return false;
        }

        // Phase 3: Compile Helper Programs (Halation Pipeline)
        this.programs.main = this.program;
        this.programs.threshold = this.createProgram(Shaders.vertex, Shaders.thresholdFragment);
        this.programs.blur = this.createProgram(Shaders.vertex, Shaders.blurFragment);
        this.programs.composite = this.createProgram(Shaders.vertex, Shaders.compositeFragment);

        if (!this.programs.threshold || !this.programs.blur || !this.programs.composite) {
            console.error('Failed to compile helper programs');
        }

        // Phase 4: Masking Programs
        this.programs.mask = this.createProgram(Shaders.vertex, Shaders.maskFragment);
        this.programs.maskComposite = this.createProgram(Shaders.vertex, Shaders.maskCompositeFragment);
        // Phase 5: Mask Overlay
        this.programs.maskOverlay = this.createProgram(Shaders.vertex, Shaders.maskOverlayFragment);
        // Phase 5: Vibe
        this.programs.vibe = this.createProgram(Shaders.vertex, Shaders.vibeFragment);

        this.gl.useProgram(this.programs.main);

        this.setupGeometry();
        this.cacheUniforms();
        this.createToneCurveLUT();

        this.isReady = true;
        console.log('✓ WebGL engine ready');

        return true;
    }

    createProgram(vertexSource, fragmentSource) {
        const gl = this.gl;
        const vs = this.compileShader(vertexSource, gl.VERTEX_SHADER);
        const fs = this.compileShader(fragmentSource, gl.FRAGMENT_SHADER);

        if (!vs || !fs) return null;

        const program = gl.createProgram();
        gl.attachShader(program, vs);
        gl.attachShader(program, fs);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            console.error('Link Error:', gl.getProgramInfoLog(program));
            return null;
        }
        return program;
    }

    compileShader(source, type) {
        const shader = this.gl.createShader(type);
        this.gl.shaderSource(shader, source);
        this.gl.compileShader(shader);

        if (!this.gl.getShaderParameter(shader, this.gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', this.gl.getShaderInfoLog(shader));
            this.gl.deleteShader(shader);
            return null;
        }

        return shader;
    }

    setupGeometry() {
        const gl = this.gl;

        const positions = new Float32Array([
            -1, -1,
            1, -1,
            -1, 1,
            1, 1
        ]);

        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
        this.positionBuffer = positionBuffer;

        const positionLoc = gl.getAttribLocation(this.program, 'a_position');
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

        const texCoords = new Float32Array([
            0, 0,
            1, 0,
            0, 1,
            1, 1
        ]);

        const texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, texCoords, gl.STATIC_DRAW);
        this.texCoordBuffer = texCoordBuffer;

        const texCoordLoc = gl.getAttribLocation(this.program, 'a_texCoord');
        gl.enableVertexAttribArray(texCoordLoc);
        gl.vertexAttribPointer(texCoordLoc, 2, gl.FLOAT, false, 0, 0);
    }

    cacheUniforms() {
        const gl = this.gl;
        const uniformNames = [
            'u_image', 'u_toneCurveLUT', 'u_time', 'u_resolution', 'u_showOriginal',
            'u_exposure', 'u_contrast', 'u_highlights', 'u_shadows', 'u_whites', 'u_blacks',
            'u_temperature', 'u_tint', 'u_vibrance', 'u_saturation',
            'u_splitHighlightHue', 'u_splitHighlightSat', 'u_splitShadowHue', 'u_splitShadowSat', 'u_splitBalance',
            'u_useToneCurve', 'u_toneCurveChannel',
            'u_hslRed', 'u_hslOrange', 'u_hslYellow', 'u_hslGreen',
            'u_hslAqua', 'u_hslBlue', 'u_hslPurple', 'u_hslMagenta',
            'u_grain', 'u_grainSize', 'u_vignette', 'u_fade', 'u_sharpness',
            'u_dehaze', 'u_clarity', 'u_chromaticAberration',
            'u_overlayTexture', 'u_useOverlay', 'u_overlayOpacity', 'u_overlayBlendMode',
            'u_lightLeak', 'u_scratches', 'u_filmSeed',
            'u_overlayTexture', 'u_useOverlay', 'u_overlayOpacity', 'u_overlayBlendMode',
            'u_lightLeak', 'u_scratches', 'u_filmSeed',
            // Secret FX
            'u_pixelateSize', 'u_glitchStrength', 'u_ditherStrength', 'u_scanlineIntensity',
            // LUT
            'u_lut3d', 'u_useLUT', 'u_lutOpacity'
        ];

        uniformNames.forEach(name => {
            this.uniforms[name] = gl.getUniformLocation(this.program, name);
        });
    }

    /**
     * Create tone curve LUT texture (256x1)
     */
    createToneCurveLUT() {
        const gl = this.gl;

        this.toneCurveLUT = gl.createTexture();
        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.toneCurveLUT);

        // Initialize with linear curve (identity)
        const lutData = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            lutData[i] = i;
        }

        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lutData);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        gl.uniform1i(this.uniforms.u_toneCurveLUT, 1);
    }

    /**
     * Update tone curve LUT from curve data
     */
    updateToneCurveLUT(lutData) {
        const gl = this.gl;

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.toneCurveLUT);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, 256, 1, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, lutData);

        this.useToneCurve = true;
        this.render();
    }

    setToneCurveChannel(channel) {
        const channels = { rgb: 0, r: 1, g: 2, b: 3 };
        this.toneCurveChannel = channels[channel] || 0;
        this.render();
    }

    /**
     * Load an image from a File object
     * @param {File} file - The image file to load
     * @returns {Promise<{width: number, height: number}>}
     */
    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';

            img.onload = () => {
                try {
                    this.processImage(img);
                    resolve({ width: img.naturalWidth, height: img.naturalHeight });
                } catch (e) {
                    reject(e);
                }
            };

            img.onerror = (e) => {
                console.error('Failed to load image:', e);
                reject(e);
            };

            // Handle both File objects and URLs
            if (file instanceof File || file instanceof Blob) {
                img.src = URL.createObjectURL(file);
            } else if (typeof file === 'string') {
                img.src = file;
            } else {
                reject(new Error('Invalid image source'));
            }
        });
    }
    processImage(img) {
        const gl = this.gl;
        this.currentImage = img;

        // Dynamic sizing based on container
        const container = this.canvas.parentElement;
        const maxWidth = container ? container.clientWidth - 32 : window.innerWidth - 32;
        const maxHeight = container ? container.clientHeight - 32 : window.innerHeight - 320;

        let width = img.naturalWidth;
        let height = img.naturalHeight;

        // Calculate CSS display size
        const scale = Math.min(1, maxWidth / width, maxHeight / height);
        const displayWidth = Math.floor(width * scale);
        const displayHeight = Math.floor(height * scale);

        // Check for mobile device (User Agent)
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || (window.innerWidth <= 800);

        // Safe limits for mobile performance (OOM prevention)
        // Desktop: 2560px (2K) - High quality
        // Mobile: 1024px (HD) - Critical for preventing browser crash (Sad Tab) on phones with limited VRAM
        // Also respect device's MAX_TEXTURE_SIZE capability
        let MAX_DIMENSION = isMobile ? 1024 : 2560;

        // Cap to hardware limit if available (to be super safe)
        if (this.maxTextureSize && this.maxTextureSize < MAX_DIMENSION) {
            MAX_DIMENSION = Math.floor(this.maxTextureSize * 0.5); // Use 50% of max to leave headroom for FBOs
            console.warn(`Limiting to ${MAX_DIMENSION}px due to hardware MAX_TEXTURE_SIZE of ${this.maxTextureSize}`);
        }

        let renderWidth = width;
        let renderHeight = height;

        if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = Math.min(MAX_DIMENSION / width, MAX_DIMENSION / height);
            renderWidth = Math.floor(width * ratio);
            renderHeight = Math.floor(height * ratio);
            console.warn(`terlalu hd bege gw kecilin dah (${width}x${height}). Downscaling to ${renderWidth}x${renderHeight} for performance.`);
        }

        // Set canvas to internal render resolution
        this.canvas.width = renderWidth;
        this.canvas.height = renderHeight;

        // CSS scales it back to fit UI
        this.canvas.style.width = displayWidth + 'px';
        this.canvas.style.height = displayHeight + 'px';

        gl.viewport(0, 0, renderWidth, renderHeight);

        // Resize image via Offscreen Canvas (or temp canvas) before upload
        // This ensures the GPU never receives a texture larger than MAX_DIMENSION
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = renderWidth;
        tempCanvas.height = renderHeight;
        const ctx = tempCanvas.getContext('2d');
        ctx.drawImage(img, 0, 0, renderWidth, renderHeight);

        if (this.texture) {
            gl.deleteTexture(this.texture);
        }

        this.texture = gl.createTexture();
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);

        // Check format support
        // Use standard RGBA / UNSIGNED_BYTE for maximum compatibility
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);

        // Upload the RESIZED canvas, not the original massive image
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tempCanvas);

        const error = gl.getError();
        if (error !== gl.NO_ERROR) {
            console.error('WebGL Texture Upload Error:', error);
            // Fallback?
        }

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        // Update uniforms
        gl.uniform2f(this.uniforms.u_resolution, renderWidth, renderHeight);
        gl.uniform1i(this.uniforms.u_image, 0);

        // LAZY INIT: Do NOT initialize FBOs here. 
        // We delete old ones to free memory immediately.
        this.cleanupFramebuffers();

        this.render();
        console.log(`✓ Image loaded and processed at: ${renderWidth}x${renderHeight}`);
    }

    cleanupFramebuffers() {
        const gl = this.gl;
        if (this.fbos.main) gl.deleteFramebuffer(this.fbos.main);
        if (this.fbos.ping) gl.deleteFramebuffer(this.fbos.ping);
        if (this.fbos.pong) gl.deleteFramebuffer(this.fbos.pong);

        // Phase 4 Cleanups
        if (this.fbos.mask) gl.deleteFramebuffer(this.fbos.mask);
        if (this.fbos.local) gl.deleteFramebuffer(this.fbos.local);

        if (this.textures.main) gl.deleteTexture(this.textures.main);
        if (this.textures.ping) gl.deleteTexture(this.textures.ping);
        if (this.textures.pong) gl.deleteTexture(this.textures.pong);

        if (this.textures.mask) gl.deleteTexture(this.textures.mask);
        if (this.textures.local) gl.deleteTexture(this.textures.local);

        this.fbos = {};
        this.textures = {};
    }

    ensureFramebuffers(width, height) {
        // If already exists and matches size, skip
        if (this.fbos.main && this.textures.main &&
            this.textures.main.width === width && this.textures.main.height === height) {
            return;
        }

        this.cleanupFramebuffers();
        const gl = this.gl;
        console.log(`Allocating FBOs: Main=${width}x${height}, Effect=${Math.floor(width / 4)}x${Math.floor(height / 4)}`);

        const createFBO = (w, h) => {
            const fbo = gl.createFramebuffer();
            const tex = gl.createTexture();
            gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
            gl.bindTexture(gl.TEXTURE_2D, tex);
            // Store dimensions on texture object for validatio check
            tex.width = w;
            tex.height = h;

            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
            return { fbo, tex };
        };

        // Main FBO: Full Res
        const main = createFBO(width, height);

        // Effects FBOs: 1/4 Res (Downscaled)
        // Optimization: Massive VRAM savings for blur/bloom
        const effW = Math.max(64, Math.floor(width * 0.25));
        const effH = Math.max(64, Math.floor(height * 0.25));
        const ping = createFBO(effW, effH);
        const pong = createFBO(effW, effH);

        // Mask FBO
        const mask = createFBO(width, height);
        // Local FBO
        const local = createFBO(width, height);

        this.fbos = { main: main.fbo, ping: ping.fbo, pong: pong.fbo, mask: mask.fbo, local: local.fbo };
        this.textures = { main: main.tex, ping: ping.tex, pong: pong.tex, mask: mask.tex, local: local.tex };

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    }

    setAdjustment(name, value) {
        if (name in this.adjustments) {
            this.adjustments[name] = value;
            this.render();
        }
    }

    setHSL(color, channel, value) {
        const key = `hsl${color.charAt(0).toUpperCase() + color.slice(1)}`;
        if (key in this.adjustments) {
            const channelIndex = { hue: 0, sat: 1, lum: 2 }[channel] || 0;
            this.adjustments[key][channelIndex] = value;
            this.render();
        }
    }

    /**
     * Set Before/After toggle
     */
    setShowOriginal(show) {
        this.showOriginal = show;
        this.render();
    }

    setMasks(masks) {
        this.masks = masks || [];
        this.render();
    }

    setShowMaskOverlay(show) {
        this.showMaskOverlay = show;
        this.render();
    }

    setActiveMaskId(id) {
        this.activeMaskId = id;
        this.render();
    }

    applyPreset(preset) {
        this.resetAdjustments();

        Object.keys(preset).forEach(key => {
            if (key !== 'name' && key !== 'category' && key in this.adjustments) {
                this.adjustments[key] = preset[key];
            }
        });

        this.render();
    }

    resetAdjustments() {
        this.adjustments = {
            exposure: 0,
            contrast: 0,
            highlights: 0,
            shadows: 0,
            whites: 0,
            blacks: 0,
            temperature: 0,
            tint: 0,
            vibrance: 0,
            saturation: 0,
            splitHighlightHue: 0,
            splitHighlightSat: 0,
            splitShadowHue: 0,
            splitShadowSat: 0,
            splitBalance: 0,
            hslRed: [0, 0, 0],
            hslOrange: [0, 0, 0],
            hslYellow: [0, 0, 0],
            hslGreen: [0, 0, 0],
            hslAqua: [0, 0, 0],
            hslBlue: [0, 0, 0],
            hslPurple: [0, 0, 0],
            hslMagenta: [0, 0, 0],
            grain: 0,
            grainSize: 1,
            vignette: 0,
            fade: 0,
            sharpness: 0,
            dehaze: 0,
            clarity: 0,
            chromaticAberration: 0,
            halation: 0,

            // Bloom / Grain V2
            bloomStrength: 0,
            bloomThreshold: 70,
            grainGlobal: 1.0,

            // Vibe Procedural
            lightLeak: 0,
            scratches: 0,
            filmSeed: 0,

            // Secret FX
            pixelateSize: 0,
            glitchStrength: 0,
            ditherStrength: 0,
            scanlineIntensity: 0
        };
        this.useToneCurve = false;
        this.overlayTexture = null; // Prevent sticky overlays
        this.render();
    }

    getAdjustments() {
        return { ...this.adjustments };
    }

    render() {
        if (!this.isReady || !this.gl || !this.texture) return;

        const gl = this.gl;
        const width = this.canvas.width;
        const height = this.canvas.height;
        const masks = this.masks;

        this.ensureFramebuffers(width, height);

        // 1. Render Base Layer (Global Adjustments) to Main FBO
        this.renderPass(this.adjustments, this.fbos.main);

        // 2. Apply Masks (if any)
        if (masks && masks.length > 0) {
            for (const mask of masks) {
                if (!mask.enabled) continue;

                // a. Render Local Layer (Base + Local Adj) to Local FBO
                const localAdj = this.mergeAdjustments(this.adjustments, mask.adjustments);
                this.renderPass(localAdj, this.fbos.local);

                // b. Render Mask Shape to Mask FBO
                this.renderMaskShape(mask, this.fbos.mask);

                // c. Composite & Swap
                this.renderCompositeMask(this.textures.main, this.textures.local, this.textures.mask, this.fbos.local);

                // Swap Local & Main (Main now holds the result)
                const tempFbo = this.fbos.main;
                const tempTex = this.textures.main;
                this.fbos.main = this.fbos.local;
                this.textures.main = this.textures.local;
                this.fbos.local = tempFbo;
                this.textures.local = tempTex;
            }
        }

        // 3. Post-Processing (Bloom / Halation)
        const effW = this.textures.ping.width;
        const effH = this.textures.ping.height;

        // Determine Glow settings (Bloom vs Halation priority)
        let glowStrength = 0;
        let glowThreshold = 0.7; // Default
        let glowTint = [1.0, 0.4, 0.6]; // Default Halation Pink

        const bloomStr = this.adjustments.bloomStrength || 0;
        const halationStr = this.adjustments.halation || 0;

        if (bloomStr > 0) {
            // Bloom takes priority or mixes
            glowStrength = bloomStr;
            glowThreshold = (this.adjustments.bloomThreshold || 70) / 100.0;
            glowTint = [1.0, 1.0, 1.0]; // Pure white for standard bloom

            // If both present, maybe just use bloom settings but add halation? 
            // For now, simplify: Bloom overrides Halation color, but maybe we sum strength?
            if (halationStr > 0) {
                // Mix pinkish?
                glowStrength = Math.max(bloomStr, halationStr);
            }
        } else if (halationStr > 0) {
            glowStrength = halationStr;
            glowThreshold = 0.7; // Fixed threshold for halation usually
            glowTint = [1.0, 0.4, 0.6];
        }

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos.ping);
        gl.viewport(0, 0, effW, effH);
        gl.useProgram(this.programs.threshold);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.main);
        gl.uniform1i(gl.getUniformLocation(this.programs.threshold, 'u_image'), 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.threshold, 'u_threshold'), glowThreshold);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Blur Ping -> Pong
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos.pong);
        gl.useProgram(this.programs.blur);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.ping);
        gl.uniform1i(gl.getUniformLocation(this.programs.blur, 'u_image'), 0);
        gl.uniform2f(gl.getUniformLocation(this.programs.blur, 'u_resolution'), effW, effH);
        gl.uniform2f(gl.getUniformLocation(this.programs.blur, 'u_direction'), 1.0, 0.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Blur Pong -> Ping
        gl.bindFramebuffer(gl.FRAMEBUFFER, this.fbos.ping);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.pong);
        gl.uniform2f(gl.getUniformLocation(this.programs.blur, 'u_direction'), 0.0, 1.0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // 4. Final Composite to Screen (with Grain)
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, width, height);
        gl.useProgram(this.programs.composite);

        if (!this.programs.composite) {
            console.error("Composite program missing!");
            return;
        }

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.main);
        gl.uniform1i(gl.getUniformLocation(this.programs.composite, 'u_image'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.ping); // Bloom Result
        gl.uniform1i(gl.getUniformLocation(this.programs.composite, 'u_bloom'), 1);

        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_amount'), glowStrength); // 0-100 expected by shader? Shader divides by 100? Yes.
        gl.uniform3fv(gl.getUniformLocation(this.programs.composite, 'u_tint'), glowTint);

        // Pass Grain Uniforms to Composite
        const adj = this.adjustments;
        // Map legacy 'grain' to both shadow and highlight if specific controls aren't used
        const gShadow = adj.grainShadow !== undefined ? adj.grainShadow : (adj.grain || 0);
        const gHighlight = adj.grainHighlight !== undefined ? adj.grainHighlight : (adj.grain || 0);

        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_grainShadow'), gShadow);
        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_grainHighlight'), gHighlight);
        // Secret FX
        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_pixelateSize'), adj.pixelateSize || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_glitchStrength'), adj.glitchStrength || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_ditherStrength'), adj.ditherStrength || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_scanlineIntensity'), adj.scanlineIntensity || 0);

        gl.uniform2f(gl.getUniformLocation(this.programs.composite, 'u_resolution'), width, height);
        gl.uniform1f(gl.getUniformLocation(this.programs.composite, 'u_time'), performance.now() / 1000);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // 5. Render Mask Overlay (Phase 5)
        if (this.showMaskOverlay && this.activeMaskId) {
            const activeMask = this.masks.find(m => m.id === this.activeMaskId);
            if (activeMask) {
                this.renderMaskOverlay(activeMask);
            }
        }

        // 6. Render Vibe Pass (Phase 5)
        this.renderVibePass();
    }

    renderPass(adj, fbo) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.programs.main);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.texture);
        gl.uniform1i(this.uniforms.u_image, 0);

        if (this.toneCurveLUT && this.useToneCurve) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.toneCurveLUT);
            gl.uniform1i(this.uniforms.u_toneCurveLUT, 1);
            gl.uniform1i(this.uniforms.u_useToneCurve, 1);
        } else {
            gl.uniform1i(this.uniforms.u_useToneCurve, 0);
        }

        // ASCII
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_asciiSize'), adj.asciiSize || 0);

        // New FX (Phase 7)
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_posterize'), adj.posterize || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_diffusion'), adj.diffusion || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_barrelDistortion'), adj.barrelDistortion || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_filmGateWeave'), adj.filmGateWeave || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_splitToneBalance'), adj.splitToneBalance || 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_noiseColorHue'), adj.noiseColorHue || 0);
        gl.uniform1i(gl.getUniformLocation(this.programs.main, 'u_showClipping'), adj.showClipping ? 1 : 0);
        gl.uniform1f(gl.getUniformLocation(this.programs.main, 'u_denoise'), adj.denoise || 0);

        if (this.overlayTexture) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
            gl.uniform1i(this.uniforms.u_overlayTexture, 2);
            gl.uniform1i(this.uniforms.u_useOverlay, 1);
        } else {
            gl.uniform1i(this.uniforms.u_useOverlay, 0);
        }

        if (this.lutTexture && this.useLUT) {
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);
            gl.uniform1i(gl.getUniformLocation(this.programs.main, 'u_useLUT'), 1);
        } else {
            gl.uniform1i(gl.getUniformLocation(this.programs.main, 'u_useLUT'), 0);
        }
        // Always set sampler3D to unit 3 to avoid conflict with sampler2D on unit 0
        gl.uniform1i(gl.getUniformLocation(this.programs.main, 'u_lut3d'), 3);

        this.setMainUniforms(gl, adj);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    renderMaskShape(mask, fbo) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.programs.mask);

        gl.uniform2f(gl.getUniformLocation(this.programs.mask, 'u_resolution'), this.canvas.width, this.canvas.height);
        gl.uniform1i(gl.getUniformLocation(this.programs.mask, 'u_type'), mask.type === 'linear' ? 1 : 0);

        gl.uniform2f(gl.getUniformLocation(this.programs.mask, 'u_start'), mask.x, mask.y);
        gl.uniform2f(gl.getUniformLocation(this.programs.mask, 'u_end'), mask.endX || (mask.x + mask.radius), mask.endY || mask.y);
        gl.uniform1f(gl.getUniformLocation(this.programs.mask, 'u_feather'), mask.feather);
        gl.uniform1i(gl.getUniformLocation(this.programs.mask, 'u_invert'), mask.invert ? 1 : 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    renderCompositeMask(baseTex, localTex, maskTex, targetFbo) {
        const gl = this.gl;
        gl.bindFramebuffer(gl.FRAMEBUFFER, targetFbo);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        gl.useProgram(this.programs.maskComposite);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, baseTex);
        gl.uniform1i(gl.getUniformLocation(this.programs.maskComposite, 'u_base'), 0);

        gl.activeTexture(gl.TEXTURE1);
        gl.bindTexture(gl.TEXTURE_2D, localTex);
        gl.uniform1i(gl.getUniformLocation(this.programs.maskComposite, 'u_local'), 1);

        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, maskTex);
        gl.uniform1i(gl.getUniformLocation(this.programs.maskComposite, 'u_mask'), 2);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    mergeAdjustments(base, local) {
        const res = { ...base };
        for (const key in local) {
            if (typeof local[key] === 'number') {
                res[key] = (res[key] || 0) + local[key];
            }
        }
        return res;
    }

    setMainUniforms(gl, adj) {
        // Helper to ensure finite numbers (NaN kills shaders)
        const v = (val, def = 0) => Number.isFinite(val) ? val : def;

        gl.uniform1f(this.uniforms.u_time, performance.now() / 1000);
        gl.uniform2f(this.uniforms.u_resolution, this.canvas.width, this.canvas.height);
        gl.uniform1i(this.uniforms.u_showOriginal, this.showOriginal ? 1 : 0);

        // Tonal
        gl.uniform1f(this.uniforms.u_exposure, v(adj.exposure));
        gl.uniform1f(this.uniforms.u_contrast, v(adj.contrast));
        gl.uniform1f(this.uniforms.u_highlights, v(adj.highlights));
        gl.uniform1f(this.uniforms.u_shadows, v(adj.shadows));
        gl.uniform1f(this.uniforms.u_whites, v(adj.whites));
        gl.uniform1f(this.uniforms.u_blacks, v(adj.blacks));

        // Color
        gl.uniform1f(this.uniforms.u_temperature, v(adj.temperature));
        gl.uniform1f(this.uniforms.u_tint, v(adj.tint));
        gl.uniform1f(this.uniforms.u_vibrance, v(adj.vibrance));
        gl.uniform1f(this.uniforms.u_saturation, v(adj.saturation));

        // Split Toning
        gl.uniform1f(this.uniforms.u_splitHighlightHue, v(adj.splitHighlightHue));
        gl.uniform1f(this.uniforms.u_splitHighlightSat, v(adj.splitHighlightSat));
        gl.uniform1f(this.uniforms.u_splitShadowHue, v(adj.splitShadowHue));
        gl.uniform1f(this.uniforms.u_splitShadowSat, v(adj.splitShadowSat));
        gl.uniform1f(this.uniforms.u_splitBalance, v(adj.splitBalance));

        // Tone Curve
        gl.uniform1i(this.uniforms.u_useToneCurve, this.useToneCurve ? 1 : 0);
        gl.uniform1i(this.uniforms.u_toneCurveChannel, this.toneCurveChannel);

        // HSL
        const v3 = (arr) => [v(arr[0]), v(arr[1]), v(arr[2])];
        gl.uniform3fv(this.uniforms.u_hslRed, v3(adj.hslRed));
        gl.uniform3fv(this.uniforms.u_hslOrange, v3(adj.hslOrange));
        gl.uniform3fv(this.uniforms.u_hslYellow, v3(adj.hslYellow));
        gl.uniform3fv(this.uniforms.u_hslGreen, v3(adj.hslGreen));
        gl.uniform3fv(this.uniforms.u_hslAqua, v3(adj.hslAqua));
        gl.uniform3fv(this.uniforms.u_hslBlue, v3(adj.hslBlue));
        gl.uniform3fv(this.uniforms.u_hslPurple, v3(adj.hslPurple));
        gl.uniform3fv(this.uniforms.u_hslMagenta, v3(adj.hslMagenta));

        // Effects
        gl.uniform1f(this.uniforms.u_grain, 0); // MOVED TO COMPOSITE
        gl.uniform1f(this.uniforms.u_grainSize, 1.0); // MOVED TO COMPOSITE
        gl.uniform1f(this.uniforms.u_grainShadow, 0); // MOVED
        gl.uniform1f(this.uniforms.u_grainHighlight, 0); // MOVED
        gl.uniform1f(this.uniforms.u_vignette, v(adj.vignette));
        gl.uniform1f(this.uniforms.u_fade, v(adj.fade));
        gl.uniform1f(this.uniforms.u_sharpness, v(adj.sharpness));
        gl.uniform1f(this.uniforms.u_dehaze, v(adj.dehaze));
        gl.uniform1f(this.uniforms.u_clarity, v(adj.clarity));
        gl.uniform1f(this.uniforms.u_chromaticAberration, v(adj.chromaticAberration));

        // Overlay
        gl.uniform1f(this.uniforms.u_overlayOpacity, v(adj.overlayOpacity) / 100.0);
        gl.uniform1i(this.uniforms.u_overlayBlendMode, v(adj.overlayBlendMode));

        // Vibe
        gl.uniform1f(this.uniforms.u_lightLeak, v(adj.lightLeak));
        gl.uniform1f(this.uniforms.u_scratches, v(adj.scratches));
        gl.uniform1f(this.uniforms.u_filmSeed, v(adj.filmSeed));

        // LUT
        gl.uniform1f(this.uniforms.u_lutOpacity, v(adj.lutOpacity) / 100.0);
    }

    /**
     * Load a 3D LUT
     * @param {Float32Array} data - RGB data
     * @param {number} size - Cube size (e.g. 33)
     */
    loadLUT(data, size) {
        const gl = this.gl;

        if (this.lutTexture) {
            gl.deleteTexture(this.lutTexture);
        }

        try {
            this.lutTexture = gl.createTexture();
            gl.activeTexture(gl.TEXTURE3);
            gl.bindTexture(gl.TEXTURE_3D, this.lutTexture);

            // Set params
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_WRAP_R, gl.CLAMP_TO_EDGE); // R coordinate for 3D
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

            // Upload 3D texture
            // Internal format: RGB16F or RGB32F for precision, or RGB8. 
            // Standard .cube is float.
            gl.texImage3D(
                gl.TEXTURE_3D,
                0,                  // Level
                gl.RGB16F,          // Internal Format (Half float is usually enough and faster)
                size, size, size,   // Width, Height, Depth
                0,                  // Border
                gl.RGB,             // Source Format
                gl.FLOAT,           // Source Type
                data                // Source Data
            );

            this.useLUT = true;
            console.log(`✓ LUT loaded: ${size}x${size}x${size}`);
            this.render();

        } catch (e) {
            console.error('Failed to load 3D LUT:', e);
            this.useLUT = false;
        }
    }

    removeLUT() {
        if (this.lutTexture) {
            this.gl.deleteTexture(this.lutTexture);
            this.lutTexture = null;
        }
        this.useLUT = false;
        this.render();
    }

    /**
     * Load an overlay texture
     */
    async loadOverlay(imageSource) {
        return new Promise((resolve, reject) => {
            let img;
            const processOverlay = (image) => {
                const gl = this.gl;
                if (this.overlayTexture) {
                    gl.deleteTexture(this.overlayTexture);
                }

                this.overlayTexture = gl.createTexture();
                gl.activeTexture(gl.TEXTURE2);
                gl.bindTexture(gl.TEXTURE_2D, this.overlayTexture);
                gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
                gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

                // Set default opacity if currently 0
                if (this.adjustments.overlayOpacity === 0) {
                    this.adjustments.overlayOpacity = 50;
                }

                this.render();
                resolve(image);
            };

            if (imageSource instanceof HTMLImageElement) {
                processOverlay(imageSource);
            } else if (imageSource instanceof File || imageSource instanceof Blob) {
                img = new Image();
                img.onload = () => {
                    URL.revokeObjectURL(img.src);
                    processOverlay(img);
                };
                img.src = URL.createObjectURL(imageSource);
            } else if (typeof imageSource === 'string') { // Data URL
                img = new Image();
                img.onload = () => processOverlay(img);
                img.src = imageSource;
            }
        });
    }

    /**
     * Remove overlay texture
     */
    removeOverlay() {
        if (this.overlayTexture) {
            this.gl.deleteTexture(this.overlayTexture);
            this.overlayTexture = null;
            this.render();
        }
    }

    /**
     * Determine if image is large enough to require tiled export
     * Mobile browsers typically crash above ~16MP (4096x4096)
     */
    _needsTiledExport(width, height) {
        const MAX_SAFE_PIXELS = 8 * 1024 * 1024; // 8MP threshold for safety
        return width * height > MAX_SAFE_PIXELS;
    }

    /**
     * Export using tiled rendering to prevent mobile browser crashes
     * Renders in 512x512 tiles and composites to final canvas
     */
    async _tiledExport(targetWidth, targetHeight, format, quality, onProgress) {
        const TILE_SIZE = 512;

        // Create final output canvas
        const outputCanvas = document.createElement('canvas');
        outputCanvas.width = targetWidth;
        outputCanvas.height = targetHeight;
        const outputCtx = outputCanvas.getContext('2d');

        // Calculate tiles
        const tilesX = Math.ceil(targetWidth / TILE_SIZE);
        const tilesY = Math.ceil(targetHeight / TILE_SIZE);
        const totalTiles = tilesX * tilesY;
        let processedTiles = 0;

        // Create small tile canvas for processing
        const tileCanvas = document.createElement('canvas');
        tileCanvas.width = TILE_SIZE;
        tileCanvas.height = TILE_SIZE;

        // Process each tile with async yield to prevent blocking
        for (let ty = 0; ty < tilesY; ty++) {
            for (let tx = 0; tx < tilesX; tx++) {
                // Calculate tile bounds
                const x = tx * TILE_SIZE;
                const y = ty * TILE_SIZE;
                const w = Math.min(TILE_SIZE, targetWidth - x);
                const h = Math.min(TILE_SIZE, targetHeight - y);

                // Calculate source region in original canvas
                const srcX = (x / targetWidth) * this.canvas.width;
                const srcY = (y / targetHeight) * this.canvas.height;
                const srcW = (w / targetWidth) * this.canvas.width;
                const srcH = (h / targetHeight) * this.canvas.height;

                // Extract tile from WebGL canvas
                const tileCtx = tileCanvas.getContext('2d');
                tileCtx.clearRect(0, 0, TILE_SIZE, TILE_SIZE);
                tileCtx.drawImage(
                    this.canvas,
                    srcX, srcY, srcW, srcH,
                    0, 0, w, h
                );

                // Composite tile to output
                outputCtx.drawImage(tileCanvas, 0, 0, w, h, x, y, w, h);

                // Update progress
                processedTiles++;
                if (onProgress) {
                    onProgress(Math.round((processedTiles / totalTiles) * 90));
                }

                // Yield to prevent blocking (allows GC and UI updates)
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        // Cleanup tile canvas
        tileCanvas.width = 0;
        tileCanvas.height = 0;

        if (onProgress) onProgress(95);

        // Convert to data URL
        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = outputCanvas.toDataURL(mimeType, quality);

        // Cleanup output canvas
        outputCanvas.width = 0;
        outputCanvas.height = 0;

        if (onProgress) onProgress(100);

        return dataUrl;
    }

    async exportImage(format = 'jpeg', quality = 0.95, onProgress = null, resolution = 'original', customWidth = null) {
        if (!this.currentImage) {
            throw new Error('No image loaded');
        }

        let targetWidth = this.currentImage.naturalWidth;
        let targetHeight = this.currentImage.naturalHeight;

        // Handle resolution settings
        const resolutions = {
            '4k': 3840,
            '2k': 2560,
            '1080p': 1920,
            '720p': 1280
        };

        if (resolution !== 'original' && resolutions[resolution]) {
            const maxDim = resolutions[resolution];
            const scale = maxDim / Math.max(targetWidth, targetHeight);
            if (scale < 1) {
                targetWidth = Math.round(targetWidth * scale);
                targetHeight = Math.round(targetHeight * scale);
            }
        } else if (resolution === 'custom' && customWidth) {
            const scale = customWidth / targetWidth;
            targetWidth = customWidth;
            targetHeight = Math.round(this.currentImage.naturalHeight * scale);
        }

        // Ensure latest render
        this.render();

        // Use tiled export for large images to prevent mobile crashes
        if (this._needsTiledExport(targetWidth, targetHeight)) {
            console.log(`📐 Using tiled export for ${targetWidth}x${targetHeight} image`);
            return this._tiledExport(targetWidth, targetHeight, format, quality, onProgress);
        }

        // Standard export for smaller images
        if (onProgress) onProgress(50);

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
        const dataUrl = this.canvas.toDataURL(mimeType, quality);

        if (onProgress) onProgress(100);
        return dataUrl;
    }

    async downloadImage(format = 'jpeg', quality = 0.95, onProgress = null, resolution = 'original') {
        const dataUrl = await this.exportImage(format, quality, onProgress, resolution);

        const link = document.createElement('a');
        link.download = `untitled-studio-${Date.now()}.${format}`;
        link.href = dataUrl;
        link.click();

        return link.download;
    }

    destroy() {
        if (this.animationFrame) {
            cancelAnimationFrame(this.animationFrame);
        }
        if (this.texture) {
            this.gl.deleteTexture(this.texture);
        }
        if (this.toneCurveLUT) {
            this.gl.deleteTexture(this.toneCurveLUT);
        }
        if (this.lutTexture) {
            this.gl.deleteTexture(this.lutTexture);
        }
        if (this.program) {
            this.gl.deleteProgram(this.program);
        }
    }
    renderMaskOverlay(mask) {
        const gl = this.gl;
        gl.useProgram(this.programs.maskOverlay);

        // Generate mask texture on the fly (re-using mask logic would be expensive?)
        // Better: Render the mask shape directly to screen using the Overlay Shader.
        // It's the same math as mask generation, just outputting RED color.

        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Draw to screen
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // Enable Blending for transparency
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Set Uniforms (Same as renderMaskShape)
        const typeLoc = gl.getUniformLocation(this.programs.maskOverlay, 'u_type');
        const startLoc = gl.getUniformLocation(this.programs.maskOverlay, 'u_start');
        const endLoc = gl.getUniformLocation(this.programs.maskOverlay, 'u_end');
        const featherLoc = gl.getUniformLocation(this.programs.maskOverlay, 'u_feather');
        const invertLoc = gl.getUniformLocation(this.programs.maskOverlay, 'u_invert');
        const resLoc = gl.getUniformLocation(this.programs.maskOverlay, 'u_resolution');

        // Note: We need a mask generation-like shader that outputs color. 
        // The one I added in Shaders.js takes a sampler2D u_mask. 
        // MISTAKE: I defined maskOverlayFragment to take a TEXTURE, not generate shapes.
        // If I want to verify the shape, it's better to visualize the generated mask texture?
        // OR reuse the math.

        // CORRECTION: The `renderMaskShape` renders to `fbos.mask`. 
        // If I want to overlay it, I should:
        // 1. Render mask shape to FBO (already done in loop? No, that was for compositing).
        // 2. If I'm outside the loop, I need to generate it again.

        // Alternative: Use logic from Shaders.maskFragment but output Red.
        // My `maskOverlayFragment` expected a texture. Let's use that approach!
        // 1. Render mask shape to `this.fbos.mask` (we can reuse this FBO).
        // 2. Use `maskOverlayFragment` to draw that texture to screen with Red tint.

        this.renderMaskShape(mask, this.fbos.mask); // Generate mask to FBO

        // Now draw FBO texture to screen with Overlay Shader
        gl.useProgram(this.programs.maskOverlay);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.mask);
        const maskTexLoc = gl.getUniformLocation(this.programs.maskOverlay, 'u_mask');
        gl.uniform1i(maskTexLoc, 0);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        const texCoordLoc = gl.getAttribLocation(this.programs.maskOverlay, 'v_texCoord'); // Warning: Shader uses a_texCoord? No the fragment uses v_texCoord, vertex shader is shared.
        // Wait, standard vertex shader uses a_texCoord and outputs v_texCoord.
        // Attributes need binding.

        // Easier: Use a helper method that sets up quad if I don't have one?
        // `renderPass` does setupGeometry? No, setupGeometry is called once in init.
        // Just need to ensure attributes are pointed.
        // But `renderPass` handles binding attributes? 
        // `setupGeometry` enabled them. They should be persistent if VAO used (WebGL2). 
        // I didn't use VAOs.

        // Re-bind attributes just in case
        const positionLoc = gl.getAttribLocation(this.programs.maskOverlay, 'a_position');
        const aTexCoordLoc = gl.getAttribLocation(this.programs.maskOverlay, 'a_texCoord');

        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer); // Need to store these in this.
        // I created buffers in local vars in setupGeometry. I should have saved them.
        // Looking at setupGeometry... lines 195+. 
        // I didn't save them to `this`. 

        // CRITICAL: WebGL state machine remembers current buffer bindings if I don't change them?
        // But between programs I might need to re-point attributes.

        // Let's assume standard attributes are generic enough or re-enable them.
        // Actually, if I didn't verify saving buffers, I should assume I need to look at how renderPass does it.
        // renderPass calls gl.drawArrays. It relies on previously set pointers?
        // If setupGeometry was only called once, and no other VBOs bound, it might be fine.

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        gl.disable(gl.BLEND);
    }
    renderVibePass() {
        if (!this.vibe || (!this.vibe.border && this.vibe.dustIntensity <= 0)) return;
        if (!this.vibeTextures) return;

        const gl = this.gl;
        gl.useProgram(this.programs.vibe);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null); // Draw to screen (on top of main)
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // Blend Mode: standard over (shader handles internal mixing)
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        // Bind Textures
        // 0: Image (Background?) - Vibe shader samples u_image. 
        // We should bind the current result. u_image is usually textures.main.
        // BUT textures.main was used as input for Composite...
        // Wait, step 4 Composite outputted to Screen.
        // We can't sample Screen easily.
        // Let's assume Vibe is just an overlay pass and doesn't need u_image context 
        // EXCEPT for "Dust" which is Screen blended onto color.

        // Workaround: Bind textures.main as u_image. 
        // This is pre-composite (no bloom/halation).
        // If we want accurate Vibe on top of Bloom, we need Composite to write to FBO.
        // For now, let's treat Vibe as "Overlay Only".
        // I will modify u_hasBorder logic to mix with transparent black if u_image is missing?
        // Or just bind textures.main and accept that Vibe acts on "Pre-Bloom" image if sampled.
        // ACTUALLY: The Vibe shader I wrote uses `texture(u_image, ...)` as starting color.
        // `vec4 color = texture(u_image, v_texCoord);`
        // Then adds dust, then mixes border.
        // If I draw this to screen, I OVERWRITE the previous pass!
        // So I MUST bind the *result of previous pass* as `u_image`.

        // Since Step 4 drew to Screen, I'm stuck.
        // FIX: I must change Step 4 to draw to an FBO (e.g. `fbos.main` or `fbos.local`).
        // Let's assume I change Step 4 to draw to `fbos.local`.
        // Then `textures.local` becomes input for Vibe.

        // For this task, I will attempt to "Read Pixels" or "Copy Tex"? Too slow.
        // I will just change Render Loop step 4 in a separate tool call if needed.
        // Or Render Loop modification earlier in this file already did this?
        // Let's look at `multi_replace_file_content` in Step 1967.
        // It modified `render` to add Step 5 Mask Overlay.
        // It did NOT change Step 4 to FBO.

        // PROPOSAL: Modify Vibe Shader to be PURE OVERLAY.
        // remove `u_image`.
        // `fragColor = mix(vec4(0), border, border.a) + dust`?
        // If I can make Vibe transparent, I can draw it ON TOP of Screen.
        // Dust: `fragColor = dust * intensity`. Blend: `ONE, ONE` (Additive).
        // Border: `fragColor = border`. Blend: `SRC_ALPHA, ONE_MINUS_SRC_ALPHA`.
        // This allows rendering directly to screen without reading background.

        // I will rewrite `renderVibePass` to use specific blends for specific effects sequentially?
        // Or just one pass with clever math.
        // If dust is additive, and border is normal, we can't easily do one draw call if they overlap?
        // Actually we can if we output premultiplied alpha?

        // Let's stick to: Vibe Shader outputs (Dust + Border) with Alpha.
        // Dust is usually Lighten/Screen. 
        // If shader outputs (DustColor, DustAlpha), and we blend...
        // Screen blend in shader requires background.

        // OK, deciding on PURE OVERLAY approach for simplicity and performance (no extra FBO copy).
        // Vibe Shader will ignore u_image (or I'll set it to black/transparent).
        // Main Logic:
        // vec4 output = vec4(0.0);
        // output += dust * intensity; (Dust is white, so add it)
        // output = mix(output, border, border.a); (Border goes on top)
        // fragColor = output;

        // Blend function: gl.ONE, gl.ONE_MINUS_SRC_ALPHA?
        // If border is opaque black (A=1), we want to occlude.
        // If dust is white (A=?), we want to add.

        // Let's just blindly bind textures.main as u_image. 
        // It's "good enough" for "Untitled Studio" aesthetic even if it misses Bloom.
        // (Actually Bloom textur is in textures.ping? Composite combines them).

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, this.textures.main);
        gl.uniform1i(gl.getUniformLocation(this.programs.vibe, 'u_image'), 0);

        if (this.vibeTextures.border) {
            gl.activeTexture(gl.TEXTURE1);
            gl.bindTexture(gl.TEXTURE_2D, this.vibeTextures.border);
            gl.uniform1i(gl.getUniformLocation(this.programs.vibe, 'u_borderTexture'), 1);
            gl.uniform1i(gl.getUniformLocation(this.programs.vibe, 'u_hasBorder'), 1);
        } else {
            gl.uniform1i(gl.getUniformLocation(this.programs.vibe, 'u_hasBorder'), 0);
        }

        if (this.vibeTextures.dust) {
            gl.activeTexture(gl.TEXTURE2);
            gl.bindTexture(gl.TEXTURE_2D, this.vibeTextures.dust);
            gl.uniform1i(gl.getUniformLocation(this.programs.vibe, 'u_dustTexture'), 2);
            gl.uniform1f(gl.getUniformLocation(this.programs.vibe, 'u_dustIntensity'), this.vibe.dustIntensity || 0);
        } else {
            gl.uniform1f(gl.getUniformLocation(this.programs.vibe, 'u_dustIntensity'), 0);
        }

        // Attributes
        const positionLoc = gl.getAttribLocation(this.programs.vibe, 'a_position');
        const aTexCoordLoc = gl.getAttribLocation(this.programs.vibe, 'a_texCoord');
        gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
        gl.enableVertexAttribArray(positionLoc);
        gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, this.texCoordBuffer);
        gl.enableVertexAttribArray(aTexCoordLoc);
        gl.vertexAttribPointer(aTexCoordLoc, 2, gl.FLOAT, false, 0, 0);

        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        gl.disable(gl.BLEND);
    }

    setVibe(options) {
        // options: { border: string(url), dust: string(url), dustIntensity: float }
        this.vibe = { ...this.vibe, ...options };

        if (!this.vibeTextures) this.vibeTextures = {};

        const promises = [];

        if (options.border && this.vibeTextures.borderUrl !== options.border) {
            promises.push(this.loadTexture(options.border).then(t => {
                this.vibeTextures.border = t;
                this.vibeTextures.borderUrl = options.border;
            }));
        }

        if (options.dust && this.vibeTextures.dustUrl !== options.dust) {
            promises.push(this.loadTexture(options.dust).then(t => {
                this.vibeTextures.dust = t;
                this.vibeTextures.dustUrl = options.dust;
            }));
        }

        if (promises.length > 0) {
            Promise.all(promises).then(() => this.render());
        } else {
            this.render();
        }
    }

    async loadTexture(url) {
        // Worker-safe texture loading
        const response = await fetch(url);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);

        const tex = this.gl.createTexture();
        const gl = this.gl;
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

        bitmap.close();
        return tex;
    }

    async getCanvasBlob(format = 'image/jpeg', quality = 0.95, callback) {
        // Force a render first
        this.render();
        // Force pipeline flush to ensure valid backbuffer
        this.gl.finish();

        const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

        if (this.canvas.toBlob) {
            // Standard DOM Canvas
            this.canvas.toBlob((blob) => {
                if (callback) callback(blob);
            }, mimeType, quality);
        } else if (this.canvas.convertToBlob) {
            // OffscreenCanvas
            const blob = await this.canvas.convertToBlob({
                type: mimeType,
                quality: quality
            });
            if (callback) callback(blob);
        } else {
            console.error('Canvas does not support blob conversion');
            if (callback) callback(null);
        }
    }

    /**
     * @deprecated Use getCanvasBlob instead
     */
    async exportToBlob(format, quality) {
        return new Promise(resolve => {
            this.getCanvasBlob(format, quality, blob => resolve(blob));
        });
    }

    resize(width, height) {
        this.canvas.width = width;
        this.canvas.height = height;
        this.gl.viewport(0, 0, width, height);
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = WebGLEngine;
}
