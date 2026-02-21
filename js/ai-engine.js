/**
 * AI Engine v1.0
 * Powered by ONNX Runtime Web
 * 
 * Handles loading and inference of quantized models for:
 * - Smart Selection (Segment Anything / U2Net)
 * - Magic Eraser (LaMa / ZITS)
 */

class AIEngine {
    constructor() {
        this.session = null;
        this.modelState = {
            isLoaded: false,
            isLoading: false,
            currentModel: null
        };

        console.log("🦾 [AI Engine] Initialized");
    }

    /**
     * Load a model from CDN using ReadableStream for progress tracking.
     * Dispatches ai-model-progress events with { phase, percent }:
     *   phase='downloading'  — percent: 0-99 (or null if Content-Length missing)
     *   phase='initializing' — WASM compilation is about to start
     * @param {string} modelType - 'segmentation' | 'inpainting'
     */
    async loadModel(modelType, manualFile = null) {
        if (this.modelState.isLoading) return;
        this.modelState.isLoading = true;

        const modelConfig = {
            segmentation: {
                path: 'https://huggingface.co/Xenova/modnet/resolve/main/onnx/model_quantized.onnx?download=true',
                name: 'MODNet (Quantized)'
            },
            inpainting: {
                path: 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx?download=true',
                name: 'LaMa (FP32)'
            }
        };

        const config = modelConfig[modelType];
        if (!config) {
            console.error(`[AI Engine] Unknown model type: ${modelType}`);
            this.modelState.isLoading = false;
            return;
        }

        // Helper: dispatch progress events
        const dispatch = (phase, percent = null) =>
            window.dispatchEvent(new CustomEvent('ai-model-progress', {
                detail: { model: modelType, phase, percent }
            }));

        console.log(`[AI Engine] Loading ${config.name}...`);
        window.dispatchEvent(new CustomEvent('ai-model-loading', { detail: { model: modelType } }));

        try {
            const sessionOption = { executionProviders: ['wasm'] };

            // ── Path A: Local file ────────────────────────────────────────────
            if (manualFile) {
                console.log(`[AI Engine] Loading from local file: ${manualFile.name}`);
                dispatch('downloading', 100);
                dispatch('initializing');
                await new Promise(r => setTimeout(r, 50)); // yield one paint frame
                const buffer = await manualFile.arrayBuffer();
                this.session = await ort.InferenceSession.create(buffer, sessionOption);

                // ── Path B: Streaming CDN download ────────────────────────────────
            } else {
                const response = await fetch(config.path);
                if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);

                const contentLength = parseInt(response.headers.get('Content-Length') || '0', 10);
                const reader = response.body.getReader();
                const chunks = [];
                let downloaded = 0;

                // Phase 1: stream + report
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                    downloaded += value.byteLength;
                    // Cap at 99 so 100% only shows after init
                    const pct = contentLength
                        ? Math.min(Math.round((downloaded / contentLength) * 100), 99)
                        : null;
                    dispatch('downloading', pct);
                }

                // Merge chunks into a single buffer
                const merged = new Uint8Array(downloaded);
                let pos = 0;
                for (const chunk of chunks) { merged.set(chunk, pos); pos += chunk.byteLength; }

                // Phase 2: WASM compilation
                dispatch('initializing');
                await new Promise(r => setTimeout(r, 50)); // yield repaint
                this.session = await ort.InferenceSession.create(merged.buffer, sessionOption);
            }

            this.modelState.isLoaded = true;
            this.modelState.currentModel = modelType;
            console.log(`[AI Engine] ${config.name} Ready`);
            window.dispatchEvent(new CustomEvent('ai-model-loaded', { detail: { model: modelType } }));

        } catch (e) {
            console.error(`[AI Engine] Model load failed:`, e);
            window.dispatchEvent(new CustomEvent('ai-model-error', {
                detail: { model: modelType, error: e.message, downloadUrl: config?.path }
            }));
        } finally {
            this.modelState.isLoading = false;
        }
    }

    showToast(msg) {
        if (window.app && window.app.showToast) {
            window.app.showToast(msg);
        } else {
            console.log(msg);
        }
    }

    /**
     * Run inference on the current image data
     * @param {Float32Array} inputTensorData 
     * @param {Array} dims 
     */
    async runInference(inputTensorData, dims) {
        if (!this.session) return null;

        try {
            const tensor = new ort.Tensor('float32', inputTensorData, dims);
            let feeds = {};

            // Handle different model input names
            if (this.modelState.currentModel === 'segmentation') {
                feeds = { 'input': tensor }; // MODNet expects 'input'
            } else if (this.modelState.currentModel === 'inpainting') {
                feeds = { 'image': tensor }; // LaMa expects 'image'
            }

            const results = await this.session.run(feeds);
            return results;
        } catch (e) {
            console.error("❌ [AI Engine] Inference failed:", e);
            return null;
        }
    }

    /**
     * Converts an image/canvas to a normalized Float32 Tensor
     * Shape: [1, 3, H, W] (Standard for ONNX Vision Models)
     */
    async imageToTensor(imageSource, targetSize = 512) {
        // 1. Draw to offscreen canvas to resize
        const canvas = document.createElement('canvas');
        canvas.width = targetSize;
        canvas.height = targetSize;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        ctx.drawImage(imageSource, 0, 0, targetSize, targetSize);
        const imageData = ctx.getImageData(0, 0, targetSize, targetSize);
        const data = imageData.data;

        // 2. Normalize and Reformat to [1, 3, H, W]
        const floatData = new Float32Array(3 * targetSize * targetSize);

        const mean = [0.5, 0.5, 0.5];
        const std = [0.5, 0.5, 0.5];

        for (let i = 0; i < targetSize * targetSize; i++) {
            // Normalizing to -1 to 1 (Common for GANs / Segmentation)
            floatData[i] = ((data[i * 4] / 255.0) - mean[0]) / std[0]; // R
            floatData[targetSize * targetSize + i] = ((data[i * 4 + 1] / 255.0) - mean[1]) / std[1]; // G
            floatData[2 * targetSize * targetSize + i] = ((data[i * 4 + 2] / 255.0) - mean[2]) / std[2]; // B
        }

        return {
            tensorData: floatData,
            dims: [1, 3, targetSize, targetSize],
            originalWidth: imageSource.width || imageSource.videoWidth,
            originalHeight: imageSource.height || imageSource.videoHeight
        };
    }

    /**
     * Converts a single-channel alpha matte tensor back to an ImageBitmap
     */
    async matteTensorToBitmap(tensor, width, height, targetWidth, targetHeight) {
        const data = tensor.data;
        const size = width * height;
        const imageData = new ImageData(width, height);

        for (let i = 0; i < size; i++) {
            // For MODNet, output is mask probability (0-1)
            const val = data[i] * 255.0;

            imageData.data[i * 4] = 255;       // R (White)
            imageData.data[i * 4 + 1] = 255;   // G (White)
            imageData.data[i * 4 + 2] = 255;   // B (White)
            imageData.data[i * 4 + 3] = val;   // A (Prob)
        }

        // Upscale back to original canvas size via intermediate canvas
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

        const upscaledCanvas = document.createElement('canvas');
        upscaledCanvas.width = targetWidth;
        upscaledCanvas.height = targetHeight;
        const ctx = upscaledCanvas.getContext('2d');
        // Disable smoothing for sharp mask edges if desired, or leave it for soft masks
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);

        return await createImageBitmap(upscaledCanvas);
    }

    /**
     * Run the Smart Select (Segmentation) pipeline
     */
    async runSmartSelect(sourceCanvas) {
        if (!this.session || this.modelState.currentModel !== 'segmentation') {
            this.showToast('Segmentation model not loaded');
            return null;
        }

        this.showToast('Analyzing Image...');
        document.body.classList.add('cursor-wait');

        try {
            // 1. Prepare Tensor (MODNet uses 512x512)
            const prep = await this.imageToTensor(sourceCanvas, 512);

            // 2. Run Inference
            const results = await this.runInference(prep.tensorData, prep.dims);
            if (!results) throw new Error("Inference failed");

            // Extract output (Usually 'output' or 'out' depending on export)
            const outputKey = Object.keys(results)[0];
            const outputTensor = results[outputKey];

            // 3. Post-process to map
            const maskBitmap = await this.matteTensorToBitmap(
                outputTensor, 512, 512,
                prep.originalWidth, prep.originalHeight
            );

            this.showToast('✅ Subject Selected');
            return maskBitmap;

        } catch (e) {
            console.error("Smart Select Error:", e);
            this.showToast('⚠️ Smart Select Failed');
            return null;
        } finally {
            document.body.classList.remove('cursor-wait');
        }
    }

    /**
     * Converts an RGB float32 tensor back to an ImageBitmap
     */
    async rgbTensorToBitmap(tensor, width, height, targetWidth, targetHeight) {
        const data = tensor.data;
        const size = width * height;
        const imageData = new ImageData(width, height);

        for (let i = 0; i < size; i++) {
            // Un-normalize from -1 to 1 back to 0-255
            const r = (data[i] * 0.5 + 0.5) * 255.0;
            const g = (data[size + i] * 0.5 + 0.5) * 255.0;
            const b = (data[2 * size + i] * 0.5 + 0.5) * 255.0;

            imageData.data[i * 4] = r;
            imageData.data[i * 4 + 1] = g;
            imageData.data[i * 4 + 2] = b;
            imageData.data[i * 4 + 3] = 255; // Solid alpha
        }

        // Upscale
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = width;
        tempCanvas.height = height;
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

        const upscaledCanvas = document.createElement('canvas');
        upscaledCanvas.width = targetWidth;
        upscaledCanvas.height = targetHeight;
        const ctx = upscaledCanvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(tempCanvas, 0, 0, targetWidth, targetHeight);

        return await createImageBitmap(upscaledCanvas);
    }

    /**
     * Run the Magic Eraser (Inpainting) pipeline
     * LaMa uses a concatenated [image, mask] tensor input but for simplicity 
     * in our generic runner, we handle it natively here.
     */
    async runMagicEraser(sourceCanvas, maskCanvas) {
        if (!this.session || this.modelState.currentModel !== 'inpainting') {
            this.showToast('Inpainting model not loaded');
            return null;
        }

        this.showToast('Erasing Object...');
        document.body.classList.add('cursor-wait');

        const targetSize = 512;

        try {
            // 1. Prepare Base Image Tensor
            const imgPrep = await this.imageToTensor(sourceCanvas, targetSize);

            // 2. Prepare Mask Tensor (1 channel, 0 or 1)
            const maskContext = document.createElement('canvas');
            maskContext.width = targetSize;
            maskContext.height = targetSize;
            const mCtx = maskContext.getContext('2d', { willReadFrequently: true });
            mCtx.drawImage(maskCanvas, 0, 0, targetSize, targetSize);
            const mData = mCtx.getImageData(0, 0, targetSize, targetSize).data;

            const maskFloatData = new Float32Array(1 * targetSize * targetSize);
            for (let i = 0; i < targetSize * targetSize; i++) {
                // Assuming mask is drawing as white (A > 0) or black.
                // We normalize A/255 to get 0.0 or 1.0 mask float
                maskFloatData[i] = mData[i * 4 + 3] > 128 ? 1.0 : 0.0;
            }
            const maskTensor = new ort.Tensor('float32', maskFloatData, [1, 1, targetSize, targetSize]);

            // 3. Run Inference (LaMa specifically requires 'image' and 'mask')
            const feeds = {
                'image': new ort.Tensor('float32', imgPrep.tensorData, imgPrep.dims),
                'mask': maskTensor
            };

            const results = await this.session.run(feeds);
            if (!results) throw new Error("Inference failed");

            const outputKey = Object.keys(results)[0]; // Often 'output' or 'inpainted_image'
            const outputTensor = results[outputKey];

            // 4. Post-process to map (RGB)
            const inpaintedBitmap = await this.rgbTensorToBitmap(
                outputTensor, targetSize, targetSize,
                imgPrep.originalWidth, imgPrep.originalHeight
            );

            this.showToast('✅ Object Erased');
            return inpaintedBitmap;

        } catch (e) {
            console.error("Magic Eraser Error:", e);
            this.showToast('⚠️ Magic Eraser Failed');
            return null;
        } finally {
            document.body.classList.remove('cursor-wait');
        }
    }
}

// Global Instance
window.aiEngine = new AIEngine();
