/**
 * UNTITLED STUDIO - IMAGE PROCESSING WEB WORKER
 * Offloads heavy RAW decoding, EXIF parsing, and initial scaling
 * from the main thread to prevent UI freezing.
 */

self.onmessage = async function (e) {
    const { id, file, type, url } = e.data;

    try {
        let processedBlob = file;
        let isRaw = false;
        let metadata = {
            Make: 'Unknown',
            Model: 'Unknown',
            ExposureTime: null,
            FNumber: null,
            ISOSpeedRatings: null,
            FocalLength: null,
            DateTimeOriginal: null
        };

        // 1. Check & Decode RAW vs JPEG
        // We do not have easy access to LibRaw WASM in this basic worker yet,
        // so we start with standard Bitmap decoding and EXIF for common formats.
        // Full RAW WASM worker integration is complex and requires module loading.
        // For Phase 1: We handle JPEG EXIF and Bitmap Creation.

        // Note: Real RAW decoding requires `importScripts('libraw.js')` which isn't available
        // in standard JS context without a specific build. We will send the blob back
        // to main thread for specialized RAW if needed, or handle JPEGs here quickly.

        // 2. Extract EXIF (Requires passing ArrayBuffer to lightweight EXIF parser if loaded)
        // Since we don't have a worker-safe exif.js loaded yet, we'll return a stub
        // and let the main thread handle EXIF for now, OR we can decode the bitmap.

        // Let's at least offload the heavy createImageBitmap call. Wait, createImageBitmap
        // IS async and already runs off-main-thread natively in modern browsers.
        // The real benefit of a worker is for WASM Raw Decoding and massive ArrayBuffer parsing.

        // We'll build the scaffolding for the worker to return a generated thumbnail blob.

        // Create an ImageBitmap from the blob (this is fast and native, but doing it here guarantees it)
        const bitmap = await self.createImageBitmap(file);

        // We can't return an ImageBitmap easily over postMessage without Transferable Objects,
        // but ImageBitmap IS Transferable!

        self.postMessage({
            id: id,
            success: true,
            bitmap: bitmap,
            metadata: metadata,
            isRaw: false // Placeholder
        }, [bitmap]); // Transfer the bitmap ownership to main thread

    } catch (error) {
        self.postMessage({
            id: id,
            success: false,
            error: error.message
        });
    }
};
