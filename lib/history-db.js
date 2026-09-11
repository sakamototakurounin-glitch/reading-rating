const DB_NAME = 'reading-rating-history-v1';
const STORES = ['longSessions', 'quickSessions', 'passageStock'];

function openDb() {
  if (typeof indexedDB === 'undefined') return Promise.resolve(null);
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      STORES.forEach((name) => {
        if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: 'id' });
      });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  }).catch(() => null);
}

export async function putSession(mode, record) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(mode === 'long' ? 'longSessions' : 'quickSessions', 'readwrite');
    tx.objectStore(mode === 'long' ? 'longSessions' : 'quickSessions').put(record);
    tx.oncomplete = () => { db.close(); resolve(true); };
    tx.onerror = () => { db.close(); resolve(false); };
  });
}

export async function getSessions(mode) {
  const db = await openDb();
  if (!db) return [];
  return new Promise((resolve) => {
    const tx = db.transaction(mode === 'long' ? 'longSessions' : 'quickSessions', 'readonly');
    const request = tx.objectStore(mode === 'long' ? 'longSessions' : 'quickSessions').getAll();
    request.onsuccess = () => resolve((request.result || []).sort((a, b) => String(b.date).localeCompare(String(a.date))));
    request.onerror = () => resolve([]);
    tx.oncomplete = () => db.close();
  });
}

export async function deleteSession(mode, id) {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const store = mode === 'long' ? 'longSessions' : 'quickSessions';
    const tx = db.transaction(store, 'readwrite'); tx.objectStore(store).delete(id);
    tx.oncomplete = () => { db.close(); resolve(true); }; tx.onerror = () => { db.close(); resolve(false); };
  });
}

export async function clearSessions() {
  const db = await openDb();
  if (!db) return false;
  return new Promise((resolve) => {
    const tx = db.transaction(['longSessions', 'quickSessions', 'passageStock'], 'readwrite');
    ['longSessions', 'quickSessions', 'passageStock'].forEach((name) => tx.objectStore(name).clear());
    tx.oncomplete = () => { db.close(); resolve(true); }; tx.onerror = () => { db.close(); resolve(false); };
  });
}

export async function hydrateHistory(state) {
  const [longHistory, quickHistory] = await Promise.all([getSessions('long'), getSessions('quick')]);
  if (!longHistory.length && state.longHistory?.length) await Promise.all(state.longHistory.map((record) => putSession('long', record)));
  if (!quickHistory.length && state.quickHistory?.length) await Promise.all(state.quickHistory.map((record) => putSession('quick', record)));
  return { ...state, longHistory: longHistory.length ? longHistory : state.longHistory, quickHistory: quickHistory.length ? quickHistory : state.quickHistory };
}
