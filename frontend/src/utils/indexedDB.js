// ============================================================
// WaterFlow OS — Phase 2 IndexedDB Utility
// Offline Storage & Background Sync Queue for Worker PWA
// ============================================================

const DB_NAME = 'WaterFlowWorkerDB';
const DB_VERSION = 1;
const STORE_NAME = 'pending_deliveries';

/**
 * Initializes and upgrades the IndexedDB database instance
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) {
      console.warn('⚠️ IndexedDB is not supported in this browser environment.');
      return resolve(null);
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = (event) => {
      console.error('❌ IndexedDB open error:', event.target.error);
      reject(event.target.error);
    };

    request.onsuccess = (event) => {
      resolve(event.target.result);
    };

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: 'id',
          autoIncrement: true
        });
        store.createIndex('status', 'status', { unique: false });
        store.createIndex('timestamp', 'timestamp', { unique: false });
        store.createIndex('dispatchId', 'dispatchId', { unique: false });
        console.log('✅ IndexedDB store "pending_deliveries" created successfully.');
      }
    };
  });
}

/**
 * Saves an offline delivery payload (OTP, TDS, pH, Base64 Image, GPS) into IndexedDB
 */
export async function savePendingDelivery(deliveryData) {
  const db = await initDB();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const record = {
      ...deliveryData,
      status: 'pending_sync',
      savedAt: new Date().toISOString(),
      timestamp: deliveryData.timestamp || Date.now()
    };

    const request = store.add(record);

    request.onsuccess = (event) => {
      const generatedId = event.target.result;
      console.log(`📦 Delivery saved offline to IndexedDB (Record ID: #${generatedId})`);
      
      // Attempt to schedule Background Sync
      registerBackgroundSync();
      resolve({ id: generatedId, ...record });
    };

    request.onerror = (event) => {
      console.error('❌ Error saving to IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Retrieves all pending offline delivery records awaiting network sync
 */
export async function getPendingDeliveries() {
  const db = await initDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = request.result || [];
      const pendingOnly = items.filter((item) => item.status === 'pending_sync');
      resolve(pendingOnly);
    };

    request.onerror = (event) => {
      console.error('❌ Error reading from IndexedDB:', event.target.error);
      reject(event.target.error);
    };
  });
}

/**
 * Deletes a synced delivery record from IndexedDB once confirmed by the server
 */
export async function deletePendingDelivery(id) {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Clears all delivery records from IndexedDB
 */
export async function clearAllPendingDeliveries() {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

/**
 * Requests the browser Background Sync API to trigger synchronization when online
 */
export async function registerBackgroundSync() {
  if ('serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-pending-deliveries');
      console.log('🔄 Background Sync registered: "sync-pending-deliveries"');
      return true;
    } catch (err) {
      console.warn('⚠️ Background Sync registration failed (will rely on online event):', err);
    }
  }
  return false;
}

/**
 * Directly flushes pending offline items to the backend (Fallback for when Background Sync isn't supported)
 */
export async function syncPendingDeliveriesDirectly(endpoint = '/api/worker/verify-delivery') {
  const pending = await getPendingDeliveries();
  if (!pending || pending.length === 0) {
    return { syncedCount: 0, remaining: 0 };
  }

  console.log(`🌐 Network active: Directly flushing ${pending.length} offline deliveries...`);
  let synced = 0;

  for (const item of pending) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        })
      });

      if (response.ok || response.status === 200) {
        await deletePendingDelivery(item.id);
        synced++;
      }
    } catch (netErr) {
      console.warn(`⚠️ Direct sync failed for item #${item.id}:`, netErr);
    }
  }

  return { syncedCount: synced, remaining: pending.length - synced };
}

// Automatic online event listener to trigger direct sync upon network reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    console.log('📶 Device back ONLINE. Synchronizing cached worker deliveries...');
    syncPendingDeliveriesDirectly();
  });
}
