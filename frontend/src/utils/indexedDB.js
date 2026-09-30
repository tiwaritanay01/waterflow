// ============================================================
// WaterFlow OS — Phase 2 & Sprint 3 IndexedDB Utility
// Offline Storage, Versioned Mission Cache & Durable Sync Queue
// ============================================================

const DB_NAME = 'WaterFlowWorkerDB';
const DB_VERSION = 2;

export const STORES = {
  LEGACY_DELIVERIES: 'pending_deliveries',
  MISSIONS: 'missions',
  SYNC_QUEUE: 'sync_queue',
};

/**
 * Initializes and upgrades the IndexedDB database instance to version 2
 */
export function initDB() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      console.warn('⚠️ IndexedDB is not supported in this environment.');
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

      // 1. Legacy Store (V1): pending_deliveries (preserved for backward compatibility)
      if (!db.objectStoreNames.contains(STORES.LEGACY_DELIVERIES)) {
        const legacyStore = db.createObjectStore(STORES.LEGACY_DELIVERIES, {
          keyPath: 'id',
          autoIncrement: true,
        });
        legacyStore.createIndex('status', 'status', { unique: false });
        legacyStore.createIndex('timestamp', 'timestamp', { unique: false });
        legacyStore.createIndex('dispatchId', 'dispatchId', { unique: false });
        console.log('✅ IndexedDB store "pending_deliveries" (v1) created.');
      }

      // 2. Mission Cache Store (V2): missions (keyed by mission_id)
      if (!db.objectStoreNames.contains(STORES.MISSIONS)) {
        const missionStore = db.createObjectStore(STORES.MISSIONS, {
          keyPath: 'mission_id',
        });
        missionStore.createIndex('tanker_id', 'tanker_id', { unique: false });
        missionStore.createIndex('status', 'status', { unique: false });
        missionStore.createIndex('cached_at', 'cached_at', { unique: false });
        missionStore.createIndex('version', 'version', { unique: false });
        console.log('✅ IndexedDB store "missions" (v2) created.');
      }

      // 3. Durable Action Queue Store (V2): sync_queue (keyed by globally unique operation_id)
      if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
        const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, {
          keyPath: 'operation_id',
        });
        queueStore.createIndex('mission_id', 'mission_id', { unique: false });
        queueStore.createIndex('status', 'status', { unique: false });
        queueStore.createIndex('created_at', 'created_at', { unique: false });
        queueStore.createIndex('action_type', 'action_type', { unique: false });
        console.log('✅ IndexedDB store "sync_queue" (v2) created.');
      }
    };
  });
}

// =============================================================================
// MISSION CACHE API
// =============================================================================

/**
 * Caches an assigned mission snapshot locally in IndexedDB.
 * Strips executive PINs and privileged credentials to preserve security.
 */
export async function cacheMission(missionData) {
  const db = await initDB();
  if (!db || !missionData) return null;

  const missionId = String(missionData.mission_id || missionData.id || '501');

  // Sanitize: never store executive PINs or auth tokens locally
  const sanitized = { ...missionData };
  delete sanitized.executive_pin;
  delete sanitized.password;
  delete sanitized.token;
  delete sanitized.secret;

  const record = {
    ...sanitized,
    mission_id: missionId,
    cached_at: Date.now(),
    cached_at_iso: new Date().toISOString(),
    is_cached_snapshot: true,
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MISSIONS], 'readwrite');
    const store = tx.objectStore(STORES.MISSIONS);
    const req = store.put(record);

    req.onsuccess = () => resolve(record);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves a cached mission snapshot from IndexedDB.
 * Annotates the record with staleness calculation (> 15 minutes = stale).
 */
export async function getCachedMission(missionId = '501') {
  const db = await initDB();
  if (!db) return null;

  const targetId = String(missionId);

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MISSIONS], 'readonly');
    const store = tx.objectStore(STORES.MISSIONS);
    const req = store.get(targetId);

    req.onsuccess = () => {
      const record = req.result;
      if (!record) return resolve(null);

      // Check staleness (older than 15 minutes considered stale)
      const ageMs = Date.now() - (record.cached_at || 0);
      const isStale = ageMs > 15 * 60 * 1000;

      resolve({
        ...record,
        is_stale: isStale,
        cache_age_seconds: Math.floor(ageMs / 1000),
      });
    };
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves all cached missions from IndexedDB.
 */
export async function getAllCachedMissions() {
  const db = await initDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MISSIONS], 'readonly');
    const store = tx.objectStore(STORES.MISSIONS);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Clears the missions cache store.
 */
export async function clearCachedMissions() {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.MISSIONS], 'readwrite');
    const store = tx.objectStore(STORES.MISSIONS);
    const req = store.clear();

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

// =============================================================================
// DURABLE OFFLINE ACTION QUEUE API
// =============================================================================

/**
 * Durably saves an offline action in IndexedDB BEFORE reporting local success.
 * Enforces unique operation_id, ordered queuing, and initial 'pending' status.
 */
export async function queueOfflineAction(action) {
  const db = await initDB();
  if (!db) return null;

  if (!action.mission_id) {
    throw new Error('mission_id is required to queue an action');
  }
  if (!action.action_type) {
    throw new Error('action_type is required to queue an action');
  }

  // Generate unique operation ID if missing
  const operationId = action.operation_id || `op-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9)}`;

  const record = {
    operation_id: operationId,
    mission_id: String(action.mission_id),
    action_type: action.action_type,
    payload: action.payload || {},
    local_timestamp: action.local_timestamp || new Date().toISOString(),
    mission_version: action.mission_version !== undefined ? Number(action.mission_version) : 1,
    worker_name: action.worker_name || 'Rajesh Patil',
    status: 'pending', // 'pending' | 'syncing' | 'synced' | 'conflict' | 'rejected' | 'retry'
    retry_count: 0,
    created_at: Date.now(),
    last_error: null,
    server_result: null,
    sync_stage: 'SAVED_LOCALLY_PENDING_SYNC', // Explicit UI status indicator
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const req = store.add(record);

    req.onsuccess = () => {
      console.log(`📦 Action ${operationId} durably queued in IndexedDB: [${record.action_type}]`);
      registerBackgroundSync();
      resolve(record);
    };

    req.onerror = (e) => {
      console.error(`❌ Failed to durably queue action ${operationId}:`, e.target.error);
      reject(e.target.error);
    };
  });
}

/**
 * Retrieves all pending actions awaiting server synchronization, sorted chronologically.
 */
export async function getPendingActions() {
  const db = await initDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_QUEUE], 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      // Filter for actions that need synchronization
      const pending = all.filter((item) => item.status === 'pending' || item.status === 'retry');
      // Sort chronologically ascending to preserve well-defined order
      pending.sort((a, b) => (a.created_at || 0) - (b.created_at || 0));
      resolve(pending);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Retrieves all items in the sync queue (pending, synced, rejected, conflict).
 */
export async function getAllQueuedActions() {
  const db = await initDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_QUEUE], 'readonly');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const req = store.getAll();

    req.onsuccess = () => {
      const all = req.result || [];
      all.sort((a, b) => (b.created_at || 0) - (a.created_at || 0)); // Most recent first for UI inspection
      resolve(all);
    };

    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Updates the status and metadata of an action in the queue.
 */
export async function updateActionStatus(operationId, status, metadata = {}) {
  const db = await initDB();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const getReq = store.get(operationId);

    getReq.onsuccess = () => {
      const item = getReq.result;
      if (!item) return resolve(null);

      const updated = {
        ...item,
        ...metadata,
        status,
        updated_at: Date.now(),
      };

      const putReq = store.put(updated);
      putReq.onsuccess = () => resolve(updated);
      putReq.onerror = (e) => reject(e.target.error);
    };

    getReq.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Deletes an action from the queue once permanently archived or dismissed.
 */
export async function deleteQueuedAction(operationId) {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const req = store.delete(operationId);

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

/**
 * Clears the entire sync queue store.
 */
export async function clearAllQueuedActions() {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORES.SYNC_QUEUE], 'readwrite');
    const store = tx.objectStore(STORES.SYNC_QUEUE);
    const req = store.clear();

    req.onsuccess = () => resolve(true);
    req.onerror = (e) => reject(e.target.error);
  });
}

// =============================================================================
// SYNCHRONIZATION ENGINE & SERVER REACHABILITY
// =============================================================================

/**
 * Tests live server reachability with a fast timeout (prevents false online assumption).
 */
export async function checkServerReachability(apiBase = 'http://localhost:3001') {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000);
    const res = await fetch(`${apiBase}/api/field/missions?limit=1`, {
      method: 'GET',
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return res.ok;
  } catch (err) {
    return false;
  }
}

/**
 * Synchronizes pending offline actions with backend `/api/field/sync`.
 * - Preserves order of actions
 * - Retains original operation_id on retries (idempotency safety)
 * - Retains unacknowledged or conflicting operations (never silent discards)
 * - Updates local mission version upon server acceptance
 */
export async function syncOfflineQueue(apiBase = 'http://localhost:3001') {
  const pending = await getPendingActions();
  if (!pending || pending.length === 0) {
    return {
      success: true,
      total: 0,
      accepted: 0,
      duplicate: 0,
      rejected: 0,
      conflict: 0,
      results: [],
    };
  }

  console.log(`🔄 Synchronizing ${pending.length} pending offline actions to ${apiBase}/api/field/sync...`);

  // Mark all pending as 'syncing'
  for (const item of pending) {
    await updateActionStatus(item.operation_id, 'syncing');
  }

  // Format operations according to backend field_sync.js contract
  const operations = pending.map((item) => ({
    operation_id: item.operation_id,
    mission_id: item.mission_id,
    action_type: item.action_type,
    local_timestamp: item.local_timestamp,
    mission_version: item.mission_version,
    payload: item.payload,
    worker_name: item.worker_name,
  }));

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const res = await fetch(`${apiBase}/api/field/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ operations }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}: ${res.statusText}`);
    }

    const data = await res.json();
    const resultsMap = new Map();
    for (const r of data.results || []) {
      resultsMap.set(r.operation_id, r);
    }

    let acceptedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;
    let conflictCount = 0;

    for (const item of pending) {
      const serverResult = resultsMap.get(item.operation_id);

      if (!serverResult) {
        // If server omitted operation in response, mark as retry
        await updateActionStatus(item.operation_id, 'retry', {
          retry_count: (item.retry_count || 0) + 1,
          last_error: 'Server omitted operation result in sync response',
        });
        continue;
      }

      if (serverResult.status === 'ACCEPTED') {
        acceptedCount++;
        await updateActionStatus(item.operation_id, 'synced', {
          server_result: serverResult,
          sync_stage: 'SERVER_ACCEPTED',
          synced_at: new Date().toISOString(),
        });

        // Update local mission cache if new version was confirmed
        if (serverResult.new_mission_version) {
          const cached = await getCachedMission(item.mission_id);
          if (cached) {
            cached.version = serverResult.new_mission_version;
            if (serverResult.applied?.new_status) {
              cached.delivery_status = serverResult.applied.new_status;
              cached.status = serverResult.applied.new_status;
            }
            if (serverResult.applied?.verification_state) {
              cached.verification_state = serverResult.applied.verification_state;
            }
            await cacheMission(cached);
          }
        }
      } else if (serverResult.status === 'DUPLICATE') {
        duplicateCount++;
        await updateActionStatus(item.operation_id, 'synced', {
          server_result: serverResult,
          sync_stage: 'IDEMPOTENT_DUPLICATE_ACCEPTED',
          synced_at: new Date().toISOString(),
        });
      } else if (serverResult.status === 'REJECTED') {
        // Check if conflict requiring review
        if (serverResult.conflict_type || serverResult.requires_manual_review) {
          conflictCount++;
          await updateActionStatus(item.operation_id, 'conflict', {
            server_result: serverResult,
            conflict_type: serverResult.conflict_type || 'SERVER_CONFLICT',
            reason: serverResult.reason || 'Safety conflict requiring manual review',
            sync_stage: 'CONFLICT_REVIEW_REQUIRED',
          });
        } else {
          rejectedCount++;
          await updateActionStatus(item.operation_id, 'rejected', {
            server_result: serverResult,
            reason: serverResult.reason || 'Server rejected action',
            sync_stage: 'SERVER_REJECTED',
          });
        }
      }
    }

    // Also attempt legacy delivery sync if any legacy records remain
    try {
      await syncPendingDeliveriesDirectly();
    } catch (_) {}

    return {
      success: true,
      total: pending.length,
      accepted: acceptedCount,
      duplicate: duplicateCount,
      rejected: rejectedCount,
      conflict: conflictCount,
      results: data.results || [],
    };
  } catch (err) {
    console.warn('⚠️ Synchronization request failed / network timeout:', err.message);

    // CRITICAL: A network timeout is NEVER interpreted as a server rejection!
    // We mark each operation as 'retry', bump retry_count, and retain the original operation_id.
    for (const item of pending) {
      await updateActionStatus(item.operation_id, 'retry', {
        retry_count: (item.retry_count || 0) + 1,
        last_error: err.message,
        sync_stage: 'SAVED_LOCALLY_PENDING_SYNC',
      });
    }

    return {
      success: false,
      error: err.message,
      total: pending.length,
      accepted: 0,
      duplicate: 0,
      rejected: 0,
      conflict: 0,
    };
  }
}

// =============================================================================
// LEGACY COMPATIBILITY API (Phase 2 Store)
// =============================================================================

export async function savePendingDelivery(deliveryData) {
  const db = await initDB();
  if (!db) return null;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.LEGACY_DELIVERIES], 'readwrite');
    const store = transaction.objectStore(STORES.LEGACY_DELIVERIES);

    const record = {
      ...deliveryData,
      status: 'pending_sync',
      savedAt: new Date().toISOString(),
      timestamp: deliveryData.timestamp || Date.now(),
    };

    const request = store.add(record);

    request.onsuccess = (event) => {
      const generatedId = event.target.result;
      console.log(`📦 Legacy delivery saved offline (Record ID: #${generatedId})`);
      registerBackgroundSync();
      resolve({ id: generatedId, ...record });
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}

export async function getPendingDeliveries() {
  const db = await initDB();
  if (!db) return [];

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.LEGACY_DELIVERIES], 'readonly');
    const store = transaction.objectStore(STORES.LEGACY_DELIVERIES);
    const request = store.getAll();

    request.onsuccess = () => {
      const items = request.result || [];
      const pendingOnly = items.filter((item) => item.status === 'pending_sync');
      resolve(pendingOnly);
    };

    request.onerror = (event) => reject(event.target.error);
  });
}

export async function deletePendingDelivery(id) {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.LEGACY_DELIVERIES], 'readwrite');
    const store = transaction.objectStore(STORES.LEGACY_DELIVERIES);
    const request = store.delete(id);

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function clearAllPendingDeliveries() {
  const db = await initDB();
  if (!db) return false;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORES.LEGACY_DELIVERIES], 'readwrite');
    const store = transaction.objectStore(STORES.LEGACY_DELIVERIES);
    const request = store.clear();

    request.onsuccess = () => resolve(true);
    request.onerror = (event) => reject(event.target.error);
  });
}

export async function registerBackgroundSync() {
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator && 'SyncManager' in window) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-pending-deliveries');
      console.log('🔄 Background Sync registered');
      return true;
    } catch (err) {
      console.warn('⚠️ Background Sync registration skipped:', err);
    }
  }
  return false;
}

export async function syncPendingDeliveriesDirectly(endpoint = '/api/worker/verify-delivery') {
  const pending = await getPendingDeliveries();
  if (!pending || pending.length === 0) {
    return { syncedCount: 0, remaining: 0 };
  }

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
          is_offline_sync: true,
        }),
      });

      if (response.ok || response.status === 200) {
        await deletePendingDelivery(item.id);
        synced++;
      }
    } catch (netErr) {
      console.warn(`⚠️ Direct sync failed for legacy item #${item.id}:`, netErr);
    }
  }

  return { syncedCount: synced, remaining: pending.length - synced };
}

// Automatic online event listener to trigger synchronization upon network reconnection
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('📶 Device back ONLINE. Checking reachability and synchronizing queue...');
    const reachable = await checkServerReachability();
    if (reachable) {
      await syncOfflineQueue();
    }
  });
}
