/**
 * UNTITLED STUDIO - SERVICE WORKER
 * Offline-first caching strategy for PWA
 * v2: Added Phase 2 modules and placeholder assets
 */

const CACHE_NAME = 'untitled-studio-v18';
const STATIC_ASSETS = [
    '/',
    '/index.html',
    '/css/styles.css',
    '/js/shaders.js',
    '/js/presets.js',
    '/js/storage.js',
    '/js/webgl-engine.js',
    '/js/histogram.js',
    '/js/tone-curve.js',
    '/js/history.js',
    '/js/crop-tool.js',
    '/js/state-manager.js',
    '/js/ui-manager.js',
    '/js/audio-engine.js',
    '/js/app.js',
    '/manifest.json'
];

// External resources to cache
const EXTERNAL_ASSETS = [
    'https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800&display=swap',
    'https://cdn.tailwindcss.com'
];

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
    console.log('[SW] Installing service worker...');

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('[SW] Caching static assets');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('[SW] Static assets cached');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('[SW] Cache failed:', error);
            })
    );
});

/**
 * Activate event - cleanup old caches
 */
self.addEventListener('activate', (event) => {
    console.log('[SW] Activating service worker...');

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== CACHE_NAME) {
                            console.log('[SW] Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            })
            .then(() => {
                console.log('[SW] Service worker activated');
                return self.clients.claim();
            })
    );
});

/**
 * Fetch event - serve from cache, fallback to network
 */
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip chrome-extension and other non-http(s) requests
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Cache-first strategy for static assets
    if (isStaticAsset(url)) {
        event.respondWith(cacheFirst(request));
        return;
    }

    // Network-first for external resources
    if (isExternalAsset(url)) {
        event.respondWith(networkFirst(request));
        return;
    }

    // Stale-while-revalidate for everything else
    event.respondWith(staleWhileRevalidate(request));
});

/**
 * Check if URL is a static asset
 */
function isStaticAsset(url) {
    return STATIC_ASSETS.some(asset => {
        const assetUrl = new URL(asset, self.location.origin);
        return url.pathname === assetUrl.pathname;
    });
}

/**
 * Check if URL is an external asset
 */
function isExternalAsset(url) {
    return EXTERNAL_ASSETS.some(asset => url.href.startsWith(asset));
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        console.error('[SW] Fetch failed:', error);

        // Return offline fallback if available
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
    try {
        const networkResponse = await fetch(request);

        if (networkResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(request, networkResponse.clone());
        }

        return networkResponse;
    } catch (error) {
        const cachedResponse = await caches.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        console.error('[SW] Network and cache both failed:', error);
        return new Response('Offline', {
            status: 503,
            statusText: 'Service Unavailable'
        });
    }
}

/**
 * Stale-while-revalidate strategy
 */
async function staleWhileRevalidate(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);

    // Fetch fresh version in background
    const fetchPromise = fetch(request)
        .then((networkResponse) => {
            if (networkResponse.ok) {
                cache.put(request, networkResponse.clone());
            }
            return networkResponse;
        })
        .catch((error) => {
            console.warn('[SW] Background fetch failed:', error);
            return null;
        });

    // Return cached version immediately, or wait for network
    return cachedResponse || fetchPromise;
}

/**
 * Handle messages from main thread
 */
self.addEventListener('message', (event) => {
    const { type } = event.data;

    switch (type) {
        case 'SKIP_WAITING':
            self.skipWaiting();
            break;

        case 'CLEAR_CACHE':
            caches.delete(CACHE_NAME)
                .then(() => {
                    console.log('[SW] Cache cleared');
                });
            break;
    }
});

/**
 * Handle background sync (for future batch export)
 */
self.addEventListener('sync', (event) => {
    if (event.tag === 'batch-export') {
        event.waitUntil(handleBatchExport());
    }
});

async function handleBatchExport() {
    console.log('[SW] Processing batch export...');
    // Placeholder for batch export logic
}
