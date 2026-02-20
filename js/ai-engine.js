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
     * Load a model from CDN
     * @param {string} modelType - 'segmentation' | 'inpainting'
     */
    async loadModel(modelType, manualFile = null) {
        if (this.modelState.isLoading) return;
        this.modelState.isLoading = true;

        const modelConfig = {
            segmentation: {
                // MODNet is robust for portrait/object segmentation
                path: 'https://huggingface.co/Xenova/modnet/resolve/main/onnx/model_quantized.onnx?download=true',
                name: 'MODNet (Quantized)'
            },
            inpainting: {
                // LaMa (Carve/LaMa-ONNX) - Publicly accessible
                path: 'https://huggingface.co/Carve/LaMa-ONNX/resolve/main/lama_fp32.onnx?download=true',
                name: 'LaMa (FP32)'
            }
        };

        const config = modelConfig[modelType];
        if (!config) {
            console.error(`❌ [AI Engine] Unknown model type: ${modelType}`);
            return;
        }

        console.log(`⏳ [AI Engine] Loading ${config.name}...`);

        // Notify UI of start
        window.dispatchEvent(new CustomEvent('ai-model-loading', { detail: { model: modelType } }));

        try {
            const sessionOption = { executionProviders: ['wasm'] }; // Fallback to Wasm for stability

            // 1. Try Manual File if provided
            if (manualFile) {
                console.log(`📂 [AI Engine] Loading from local file: ${manualFile.name}`);
                const buffer = await manualFile.arrayBuffer();
                this.session = await ort.InferenceSession.create(buffer, sessionOption);
            }
            // 2. Try URL Download
            else {
                this.session = await ort.InferenceSession.create(config.path, sessionOption);
            }

            this.modelState.isLoaded = true;
            this.modelState.currentModel = modelType;
            console.log(`✅ [AI Engine] ${config.name} Ready`);

            // Notify UI Success
            window.dispatchEvent(new CustomEvent('ai-model-loaded', { detail: { model: modelType } }));

        } catch (e) {
            console.error(`❌ [AI Engine] Failed to load model:`, e);

            // Notify UI Failure (so we can show manual upload button)
            window.dispatchEvent(new CustomEvent('ai-model-error', {
                detail: {
                    model: modelType,
                    error: e.message,
                    downloadUrl: config.path
                }
            }));

            this.showToast("Failed to load AI Model. Try manual upload.");
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
            const feeds = { input: tensor }; // Note: specific model input names vary (e.g. 'input', 'img', etc.)

            const results = await this.session.run(feeds);
            return results;
        } catch (e) {
            console.error("❌ [AI Engine] Inference failed:", e);
            return null;
        }
    }
}

// Global Instance
window.aiEngine = new AIEngine();
