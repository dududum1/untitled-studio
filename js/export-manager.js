
class ExportManager {
    constructor(engine) {
        this.engine = engine;
    }

    /**
     * Standard Image Export
     */
    /**
     * Standard Image Export (Refactored for Blob usage)
     */
    async exportImage(format, quality, resolution = 'original', onProgress, drawCallback, customWidth = null) {
        try {
            if (onProgress) onProgress(0);

            let blob;

            // 1. Get High-Res Base Image from Engine
            if (resolution === 'original' && this.engine.renderHighRes) {
                // Use new High-Res Pipeline
                blob = await this.engine.renderHighRes(format, quality);
            } else {
                // Fallback for custom widths or if renderHighRes is missing
                // For now, let's assume we use the current canvas state (preview res)
                // TODO: Implement custom resizing
                blob = await new Promise(resolve => this.engine.getCanvasBlob(format, quality, resolve));
            }

            if (onProgress) onProgress(85);

            if (!blob) throw new Error('Render failed');

            // 2. Apply Overlays if needed
            if (drawCallback) {
                const dataUrl = URL.createObjectURL(blob);
                return new Promise((resolve, reject) => {
                    const img = new Image();
                    img.onload = () => {
                        const canvas = document.createElement('canvas');
                        canvas.width = img.width;
                        canvas.height = img.height;
                        const ctx = canvas.getContext('2d');

                        // Draw base high-res image
                        ctx.drawImage(img, 0, 0);

                        // Apply Overlays (Vibes)
                        drawCallback(ctx, canvas.width, canvas.height);

                        if (onProgress) onProgress(95);

                        // Export final to blob
                        const mime = format === 'png' ? 'image/png' : 'image/jpeg';
                        canvas.toBlob((finalBlob) => {
                            URL.revokeObjectURL(dataUrl); // Cleanup
                            if (!finalBlob) {
                                reject(new Error('Overlay composition failed'));
                                return;
                            }
                            this.triggerDownload(finalBlob, format);
                            if (onProgress) onProgress(100);
                            resolve();
                        }, mime, quality);
                    };
                    img.onerror = () => {
                        URL.revokeObjectURL(dataUrl);
                        reject(new Error('Failed to load base image for overlay'));
                    }
                    img.src = dataUrl;
                });
            } else {
                // No overlays, just download
                this.triggerDownload(blob, format);
                if (onProgress) onProgress(100);
                return;
            }

        } catch (error) {
            console.error('ExportManager error:', error);
            throw error;
        }
    }

    triggerDownload(blob, format) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `untitled-studio-export-${Date.now()}.${format}`;
        link.href = url;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }

    /**
     * Social Media Export (Cropped/Resized)
     */
    async exportForSocial(sizePreset, format, onProgress, drawCallback) {
        const sizes = {
            'instagram-square': { width: 1080, height: 1080 },
            'instagram-story': { width: 1080, height: 1920 },
            'twitter': { width: 1200, height: 675 },
            'facebook': { width: 1200, height: 630 }
        };

        const size = sizes[sizePreset];
        if (!size) throw new Error('Invalid size preset');

        if (onProgress) onProgress(0);

        try {
            this.engine.render();
            const sourceCanvas = this.engine.gl.canvas;

            const outputCanvas = document.createElement('canvas');
            outputCanvas.width = size.width;
            outputCanvas.height = size.height;
            const ctx = outputCanvas.getContext('2d');

            const sourceAspect = sourceCanvas.width / sourceCanvas.height;
            const targetAspect = size.width / size.height;

            let sx = 0, sy = 0, sw = sourceCanvas.width, sh = sourceCanvas.height;

            if (sourceAspect > targetAspect) {
                sw = sourceCanvas.height * targetAspect;
                sx = (sourceCanvas.width - sw) / 2;
            } else {
                sh = sourceCanvas.width / targetAspect;
                sy = (sourceCanvas.height - sh) / 2;
            }

            if (onProgress) onProgress(50);

            // Draw cropped
            ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, size.width, size.height);

            // Apply Callbacks (Vibe Pack)
            if (drawCallback) {
                drawCallback(ctx, size.width, size.height);
            }

            if (onProgress) onProgress(80);

            const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';

            return new Promise((resolve, reject) => {
                outputCanvas.toBlob((blob) => {
                    if (!blob) {
                        reject(new Error('Canvas to Blob failed'));
                        return;
                    }
                    this.triggerDownload(blob, format);
                    if (onProgress) onProgress(100);
                    resolve(URL.createObjectURL(blob)); // Return URL if needed by caller
                }, mimeType, 0.95);
            });

        } catch (error) {
            console.error('Social export failed:', error);
            throw error;
        }
    }

    /**
     * Share Image using Native API
     */
    async shareImage(format, quality, drawCallback) {
        try {
            return new Promise((resolve, reject) => {
                const handleBlob = async (blob) => {
                    if (!blob) {
                        reject(new Error('Failed to create blob for sharing'));
                        return;
                    }

                    const file = new File([blob], `untitled-studio-${Date.now()}.${format}`, { type: blob.type });

                    try {
                        if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
                            await navigator.share({
                                files: [file],
                                title: 'Untitled Studio Export',
                                text: 'Edited with Untitled Studio'
                            });
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } catch (err) {
                        if (err.name !== 'AbortError') reject(err);
                        else resolve(false);
                    }
                };

                if (drawCallback) {
                    this.engine.render();
                    const source = this.engine.gl.canvas;
                    const canvas = document.createElement('canvas');
                    canvas.width = source.width; canvas.height = source.height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(source, 0, 0);
                    drawCallback(ctx, canvas.width, canvas.height);

                    canvas.toBlob(handleBlob, format === 'png' ? 'image/png' : 'image/jpeg', quality);
                } else {
                    this.engine.getCanvasBlob(format, quality, handleBlob);
                }
            });
        } catch (error) {
            console.error('Share failed', error);
            return false;
        }
    }

    /**
     * Export Project State (JSON)
     */
    exportState(state) {
        try {
            const json = JSON.stringify(state, null, 2);
            const blob = new Blob([json], { type: 'application/json' });
            const url = URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.download = `untitled-studio-project-${Date.now()}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            // Cleanup matches the requirement: create -> click -> revoke
            setTimeout(() => URL.revokeObjectURL(url), 100);
            return true;
        } catch (e) {
            console.error('Export state failed:', e);
            return false;
        }
    }
}
