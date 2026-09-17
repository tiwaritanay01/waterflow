// ============================================================
// WaterFlow OS — Phase 2 Service Worker
// Offline Resilience & Background Sync for Field Worker Deliveries
// ============================================================

const CACHE_NAME = 'waterflow-worker-cache-v2';
const STATIC_ASSETS = [
  '/',
  '/worker',
  '/citizen',
  '/manifest.json',
  '/worker-manifest.json',
  '/favicon.svg',
  '/mumbai_wards.geojson'
];

const DB_NAME = 'WaterFlowWorkerDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_deliveries';

// ---------------------------------------------------------------------------
// 1. Lifecycle: Install & Activate
// ---------------------------------------------------------------------------
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Pre-caching offline application shell...');
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[ServiceWorker] Non-critical pre-cache warning:', err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => self.clients.claim())
  );
});

// ---------------------------------------------------------------------------
// 2. Network Interception (Stale-While-Revalidate for Static Assets)
// ---------------------------------------------------------------------------
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass service worker for external APIs or background sync endpoints
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        // Fetch background update for cache freshness
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then((cache) => cache.put(request, networkResponse));
          }
        }).catch(() => {});
        return cachedResponse;
      }

      return fetch(request).catch(() => {
        // Return offline fallback if navigating to HTML pages
        if (request.headers.get('accept')?.includes('text/html')) {
          return caches.match('/worker') || caches.match('/');
        }
      });
    })
  );
});

// ---------------------------------------------------------------------------
// 3. IndexedDB Helper in Service Worker Context
// ---------------------------------------------------------------------------
function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };
  });
}

function getPendingDeliveriesFromDB() {
  return openIndexedDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => {
        const allItems = req.result || [];
        const pending = allItems.filter(item => item.status === 'pending_sync');
        resolve(pending);
      };
      req.onerror = () => reject(req.error);
    });
  });
}

function deleteDeliveryFromDB(id) {
  return openIndexedDB().then((db) => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(id);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  });
}

// ---------------------------------------------------------------------------
// 4. Background Sync API Handler
// ---------------------------------------------------------------------------
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pending-deliveries' || event.tag === 'sync-water-dispatches') {
    console.log('[ServiceWorker] Background Sync event triggered for pending deliveries...');
    event.waitUntil(processPendingDeliveries());
  }
});

async function processPendingDeliveries() {
  try {
    const pendingList = await getPendingDeliveriesFromDB();
    if (!pendingList || pendingList.length === 0) {
      console.log('[ServiceWorker] No pending offline deliveries to sync.');
      return;
    }

    console.log(`[ServiceWorker] Found ${pendingList.length} offline deliveries to upload.`);
    let successCount = 0;

    for (const item of pendingList) {
      try {
        const payload = {
          dispatch_id: item.dispatchId || 1,
          ward_id: item.wardId || 'M/East',
          otp_code: item.otpCode,
          tds_level: item.tdsLevel,
          ph_level: item.phLevel,
          latitude: item.latitude,
          longitude: item.longitude,
          image_base64: item.imageBase64,
          offline_timestamp: item.timestamp,
          is_offline_sync: true
        };

        // Post to backend verification endpoint
        const response = await fetch('/api/worker/verify-delivery', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (response.ok || response.status === 200) {
          console.log(`[ServiceWorker] Successfully synced delivery #${item.id} for Dispatch ${item.dispatchId}`);
          await deleteDeliveryFromDB(item.id);
          successCount++;
        } else {
          console.warn(`[ServiceWorker] Server responded with status ${response.status} for item #${item.id}`);
        }
      } catch (postErr) {
        console.warn(`[ServiceWorker] Network error during delivery sync #${item.id}:`, postErr);
        // Retain in IndexedDB; browser Background Sync will retry on next online cycle
      }
    }

    // Broadcast sync results to all active open tabs
    const clients = await self.clients.matchAll({ includeUncontrolled: true, type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'SYNC_COMPLETED',
        syncedCount: successCount,
        remainingCount: pendingList.length - successCount,
        timestamp: new Date().toISOString()
      });
    });

  } catch (err) {
    console.error('[ServiceWorker] Critical error inside processPendingDeliveries:', err);
  }
}
