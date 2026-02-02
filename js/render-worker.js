/**
 * UNTITLED STUDIO - RENDER WORKER
 * Handles WebGL rendering in a background thread to keep UI responsive.
 * Phase 7: Film Emulation Architecture
 */

importScripts('shaders.js', 'webgl-engine.js');

let engine = null;

self.onmessage = async function (e) {
    const { type, payload, id } = e.data;

    try {
        switch (type) {
            case 'init':
                initEngine(payload.canvas, payload.width, payload.height);
                self.postMessage({ type: 'ready', id });
                break;

            case 'loadImage':
                // Payload is an ImageBitmap
                await engine.loadImage(payload.bitmap);
                self.postMessage({ type: 'imageLoaded', id });
                // We typically render immediately after loading
                engine.render();
                break;

            case 'updateParams':
                if (engine) {
                    engine.setAdjustments(payload.adjustments);
                    // engine.render() is called inside setAdjustments usually, 
                    // or we can call it explicitly if we want to throttle.
                    // For now, let WebGLEngine handle the render call
                    engine.render();
                }
                break;

            case 'resize':
                if (engine) {
                    engine.resize(payload.width, payload.height);
                    engine.render();
                }
                break;

            case 'export':
                if (engine) {
                    const blob = await engine.exportToBlob(payload.format, payload.quality);
                    self.postMessage({ type: 'exportComplete', result: blob, id });
                }
                break;

            case 'debug':
                console.log('Worker Debug:', payload);
                break;
        }
    } catch (error) {
        console.error('Render Worker Error:', error);
        self.postMessage({
            type: 'error',
            error: error.message || 'Unknown worker error',
            stack: error.stack,
            id
        });
    }
};

function initEngine(canvas, width, height) {
    // OffscreenCanvas is passed as 'canvas'
    engine = new WebGLEngine(canvas);

    // Override engine's resize to just update viewport, not style
    engine.resize(width, height);

    console.log('🎥 Render Worker Initialized');
}
