/**
 * UNTITLED STUDIO - BATCH PROCESSING WEB WORKER
 * Background processing for multiple images
 */

// Worker state
let isProcessing = false;
let processQueue = [];

/**
 * Handle messages from main thread
 */
self.onmessage = function (e) {
    const { type, payload } = e.data;

    switch (type) {
        case 'PROCESS_IMAGE':
            processImage(payload);
            break;

        case 'PROCESS_BATCH':
            processBatch(payload);
            break;

        case 'SYNC_ADJUSTMENTS':
            syncAdjustments(payload);
            break;

        case 'CANCEL':
            cancelProcessing();
            break;

        default:
            console.warn('Unknown message type:', type);
    }
};

/**
 * Process a single image with adjustments
 */
async function processImage(data) {
    const { id, imageData, adjustments } = data;

    try {
        self.postMessage({
            type: 'PROGRESS',
            payload: { id, progress: 0 }
        });

        // Simulate processing time (actual processing happens on main thread with WebGL)
        // This worker prepares data and coordinates batch operations

        self.postMessage({
            type: 'PROGRESS',
            payload: { id, progress: 50 }
        });

        // Prepare processed data package
        const result = {
            id,
            adjustments,
            processedAt: Date.now()
        };

        self.postMessage({
            type: 'PROGRESS',
            payload: { id, progress: 100 }
        });

        self.postMessage({
            type: 'COMPLETE',
            payload: result
        });

    } catch (error) {
        self.postMessage({
            type: 'ERROR',
            payload: { id, error: error.message }
        });
    }
}

/**
 * Process multiple images in batch
 */
async function processBatch(data) {
    const { images, adjustments } = data;

    isProcessing = true;
    processQueue = [...images];

    const total = images.length;
    let completed = 0;

    self.postMessage({
        type: 'BATCH_START',
        payload: { total }
    });

    for (let i = 0; i < images.length; i++) {
        if (!isProcessing) {
            self.postMessage({
                type: 'BATCH_CANCELLED',
                payload: { completed, total }
            });
            return;
        }

        const image = images[i];

        try {
            // Process each image
            await new Promise(resolve => setTimeout(resolve, 50)); // Throttle for UI responsiveness

            self.postMessage({
                type: 'BATCH_ITEM_COMPLETE',
                payload: {
                    id: image.id,
                    index: i,
                    adjustments,
                    progress: Math.round(((i + 1) / total) * 100)
                }
            });

            completed++;

        } catch (error) {
            self.postMessage({
                type: 'BATCH_ITEM_ERROR',
                payload: { id: image.id, error: error.message }
            });
        }
    }

    isProcessing = false;
    processQueue = [];

    self.postMessage({
        type: 'BATCH_COMPLETE',
        payload: { completed, total }
    });
}

/**
 * Sync adjustments across all images in queue
 */
function syncAdjustments(data) {
    const { imageIds, adjustments } = data;

    self.postMessage({
        type: 'SYNC_START',
        payload: { count: imageIds.length }
    });

    // Send adjustment updates for each image
    imageIds.forEach((id, index) => {
        self.postMessage({
            type: 'SYNC_ITEM',
            payload: {
                id,
                adjustments,
                index,
                progress: Math.round(((index + 1) / imageIds.length) * 100)
            }
        });
    });

    self.postMessage({
        type: 'SYNC_COMPLETE',
        payload: { count: imageIds.length }
    });
}

/**
 * Cancel current processing
 */
function cancelProcessing() {
    isProcessing = false;
    processQueue = [];

    self.postMessage({
        type: 'CANCELLED',
        payload: {}
    });
}

/**
 * Utility: Apply adjustments to pixel data (for OffscreenCanvas support)
 * Note: This is a simplified version - full processing uses WebGL on main thread
 */
function applyAdjustmentsToPixels(imageData, adjustments) {
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        let r = data[i];
        let g = data[i + 1];
        let b = data[i + 2];

        // Exposure
        const exposureMult = Math.pow(2, adjustments.exposure || 0);
        r *= exposureMult;
        g *= exposureMult;
        b *= exposureMult;

        // Contrast
        const contrast = (adjustments.contrast || 0) / 100;
        r = (r - 128) * (1 + contrast) + 128;
        g = (g - 128) * (1 + contrast) + 128;
        b = (b - 128) * (1 + contrast) + 128;

        // Saturation
        const saturation = 1 + (adjustments.saturation || 0) / 100;
        const gray = 0.2126 * r + 0.7152 * g + 0.0722 * b;
        r = gray + (r - gray) * saturation;
        g = gray + (g - gray) * saturation;
        b = gray + (b - gray) * saturation;

        // Temperature
        const temp = (adjustments.temperature || 0) / 100;
        r += temp * 25.5;
        b -= temp * 25.5;

        // Clamp
        data[i] = Math.max(0, Math.min(255, r));
        data[i + 1] = Math.max(0, Math.min(255, g));
        data[i + 2] = Math.max(0, Math.min(255, b));
    }

    return imageData;
}
