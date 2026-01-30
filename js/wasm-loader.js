/**
 * WasmLoader - Bridge between JavaScript and Rust/Wasm Core
 */
export class WasmLoader {
    constructor() {
        this.wasm = null;
        this.isReady = false;
        this.memory = null;
    }

    async init() {
        try {
            // Check if wasm pkg exists (user must have built it)
            // We expect the build output to be in js/pkg/wasm_core_bg.wasm
            // Note: In a real bundler setup, we'd import this. 
            // For this raw setup, we fetch the binary.

            // Wait, standard wasm-pack with --target web generates an ES module generic wrapper.
            // Let's try to import that if possible, or manually instantiate.
            // Manual instantiation is safer for a raw setup without a bundler like Webpack.

            console.log('[Wasm] Initializing Wasm Core...');

            // Attempt to load the glue code if using ES modules
            // import init, { generate_grain } from './pkg/wasm_core.js';
            // But we can't use static imports inside a class easily without dynamic import.

            const { default: initWasm, generate_grain, greet } = await import('./pkg/wasm_core.js');
            await initWasm(); // Initialize the module

            this.wasm = { generate_grain, greet };
            this.isReady = true;

            console.log(`[Wasm] ✓ Core Loaded: ${this.wasm.greet()}`);
            return true;
        } catch (e) {
            console.warn('[Wasm] Failed to load Wasm Core. Falling back to JS implementation.', e);
            this.isReady = false;
            return false;
        }
    }

    /**
     * Generate film grain using Rust LCG
     * @param {number} width 
     * @param {number} height 
     * @param {number} intensity (0-255)
     * @param {number} seed 
     * @returns {Uint8Array|null} Raw RGBA buffer or null if failed
     */
    generateGrain(width, height, intensity, seed = Math.random() * 10000) {
        if (!this.isReady) return null;

        try {
            const buffer = this.wasm.generate_grain(width, height, intensity, seed);
            return buffer;
        } catch (e) {
            console.error('[Wasm] Error generating grain:', e);
            return null;
        }
    }
}
