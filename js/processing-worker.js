
// processing-worker.js
// Handles heavy image processing tasks off the main thread

self.onmessage = async function(e) {
    const { type, payload, id } = e.data;

    try {
        if (type === 'processImage') {
            const result = await processImage(payload.file, payload.maxSize);
            self.postMessage({ type: 'processImageComplete', result, id });
        }
    } catch (error) {
        self.postMessage({ type: 'error', error: error.message, id });
    }
};

async function processImage(file, maxSize) {
    // 1. Decode image
    let bitmap;
    try {
        bitmap = await createImageBitmap(file);
    } catch (err) {
        throw new Error("Failed to decode image");
    }

    // 2. Calculate new dimensions
    let width = bitmap.width;
    let height = bitmap.height;

    if (width > maxSize || height > maxSize) {
        const ratio = Math.min(maxSize / width, maxSize / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
    }

    // 3. Resize using OffscreenCanvas
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    
    // High quality scaling
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close(); // Release original bitmap memory

    // 4. Convert to Blob (or transfer buffer)
    // We can transfer the OffscreenCanvas's bitmap directly using transferToImageBitmap?
    // Or just return the blob. Returning Blob is safer for generic use.
    
    const blob = await canvas.convertToBlob({
        type: file.type || 'image/jpeg', 
        quality: 0.95 
    });

    // Also return metadata
    return {
        blob,
        width,
        height,
        originalName: file.name,
        type: file.type
    };
}
