/**
 * UNTITLED STUDIO - INDEXEDDB STORAGE
 * Offline-first storage for images and presets
 */

const DB_NAME = 'UntitledStudioDB';
const DB_VERSION = 2;

class StorageManager {
    constructor() {
        this.db = null;
        this.isReady = false;
        this._readyPromise = this.init();
    }

    async ensuringReady() {
        if (this.isReady) return;
        await this._readyPromise;
    }

    /**
     * Initialize IndexedDB connection
     */
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB error:', request.error);
                reject(request.error);
            };

            request.onsuccess = () => {
                this.db = request.result;
                this.isReady = true;
                console.log('✓ IndexedDB ready');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Images store - stores image blobs with metadata
                if (!db.objectStoreNames.contains('images')) {
                    const imageStore = db.createObjectStore('images', { keyPath: 'id', autoIncrement: true });
                    imageStore.createIndex('name', 'name', { unique: false });
                    imageStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // Presets store - user-created presets
                if (!db.objectStoreNames.contains('presets')) {
                    const presetStore = db.createObjectStore('presets', { keyPath: 'id', autoIncrement: true });
                    presetStore.createIndex('name', 'name', { unique: true });
                    presetStore.createIndex('category', 'category', { unique: false });
                }

                // Settings store - app preferences
                if (!db.objectStoreNames.contains('settings')) {
                    db.createObjectStore('settings', { keyPath: 'key' });
                }

                // Edit history store - for undo/redo
                if (!db.objectStoreNames.contains('history')) {
                    const historyStore = db.createObjectStore('history', { keyPath: 'id', autoIncrement: true });
                    historyStore.createIndex('imageId', 'imageId', { unique: false });
                }

                // v2: Textures store - for overlays
                if (!db.objectStoreNames.contains('textures')) {
                    const textureStore = db.createObjectStore('textures', { keyPath: 'id', autoIncrement: true });
                    textureStore.createIndex('name', 'name', { unique: true });
                }

                // v3: LUTs store - for user uploaded .cube files
                if (!db.objectStoreNames.contains('luts')) {
                    const lutStore = db.createObjectStore('luts', { keyPath: 'id', autoIncrement: true });
                    lutStore.createIndex('name', 'name', { unique: true });
                }

                console.log('✓ IndexedDB schema created/updated');
            };
        });
    }

    /**
     * Save an image with its adjustments
     */
    async saveImage(imageData) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');

            const record = {
                ...imageData,
                createdAt: imageData.createdAt || Date.now(),
                updatedAt: Date.now()
            };

            const request = imageData.id ? store.put(record) : store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Load an image by ID
     */
    async loadImage(id) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all stored images
     */
    async getAllImages() {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readonly');
            const store = transaction.objectStore('images');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete an image by ID
     */
    async deleteImage(id) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a custom preset
     */
    async savePreset(preset) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['presets'], 'readwrite');
            const store = transaction.objectStore('presets');

            const record = {
                ...preset,
                createdAt: preset.createdAt || Date.now()
            };

            const request = preset.id ? store.put(record) : store.add(record);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all custom presets
     */
    async getAllPresets() {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['presets'], 'readonly');
            const store = transaction.objectStore('presets');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a custom preset
     */
    async deletePreset(id) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['presets'], 'readwrite');
            const store = transaction.objectStore('presets');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a setting
     */
    async saveSetting(key, value) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readwrite');
            const store = transaction.objectStore('settings');
            const request = store.put({ key, value });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get a setting
     */
    async getSetting(key) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['settings'], 'readonly');
            const store = transaction.objectStore('settings');
            const request = store.get(key);

            request.onsuccess = () => {
                resolve(request.result ? request.result.value : null);
            };
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Convert File/Blob to base64 for storage
     */
    async fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }

    /**
     * Convert base64 to Blob
     */
    base64ToBlob(base64, mimeType = 'image/jpeg') {
        const byteString = atob(base64.split(',')[1]);
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);

        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }

        return new Blob([ab], { type: mimeType });
    }

    /**
     * Clear all data (for debugging)
     */
    async clearAll() {
        await this.ensuringReady();
        const stores = ['images', 'presets', 'settings', 'history', 'textures'];

        for (const storeName of stores) {
            await new Promise((resolve, reject) => {
                const transaction = this.db.transaction([storeName], 'readwrite');
                const store = transaction.objectStore(storeName);
                const request = store.clear();

                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }

        console.log('✓ All data cleared');
    }

    /**
     * Save a texture overlay
     */
    async saveTexture(file, name) {
        return new Promise(async (resolve, reject) => {
            try {
                const base64 = await this.fileToBase64(file);

                const transaction = this.db.transaction(['textures'], 'readwrite');
                const store = transaction.objectStore('textures');

                const record = {
                    name: name || file.name,
                    data: base64,
                    type: file.type,
                    createdAt: Date.now()
                };

                const request = store.add(record);

                request.onsuccess = () => resolve(request.result);
                request.onerror = () => reject(request.error);
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * Get all custom textures
     */
    async getAllTextures() {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['textures'], 'readonly');
            const store = transaction.objectStore('textures');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Delete a texture
     */
    async deleteTexture(id) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['textures'], 'readwrite');
            const store = transaction.objectStore('textures');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save a custom LUT
     */
    async saveLUT(name, data) {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['luts'], 'readwrite');
            const store = transaction.objectStore('luts');
            const request = store.add({ name, data, createdAt: Date.now() });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all custom LUTs
     */
    async getAllLUTs() {
        await this.ensuringReady();
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['luts'], 'readonly');
            const store = transaction.objectStore('luts');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }
}

// Singleton instance
const storage = new StorageManager();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { StorageManager, storage };
}
