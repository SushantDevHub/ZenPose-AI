/* ============================================================
   ZenPose AI — db.js
   BACKEND LAYER: IndexedDB database operations & password hashing
   ============================================================

   Responsibilities:
   - Open / upgrade the IndexedDB database
   - CRUD helpers (get, put) wrapped in Promises
   - FNV-1a password hashing (never store plaintext)
   ============================================================ */

const DB_NAME = 'ZenPoseDB';
const DB_VER  = 1;

// Shared db handle — populated once by openDB()
let db;

/**
 * openDB()
 * Opens (or creates) the ZenPoseDB IndexedDB database.
 * Creates the 'users' object store on first run.
 * @returns {Promise<IDBDatabase>}
 */
function openDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(DB_NAME, DB_VER);

    // Runs on first open or version upgrade
    req.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('users')) {
        // Primary key: username (unique per user)
        const store = d.createObjectStore('users', { keyPath: 'username' });
        // Secondary index on email for uniqueness checks
        store.createIndex('email', 'email', { unique: true });
      }
    };

    req.onsuccess = e => { db = e.target.result; res(db); };
    req.onerror   = e => rej(e.target.error);
  });
}

/**
 * dbGet(store, key)
 * Read a single record by primary key.
 * @param {string} store  - Object store name (e.g. 'users')
 * @param {string} key    - Primary key value
 * @returns {Promise<object|undefined>}
 */
function dbGet(store, key) {
  return new Promise((res, rej) => {
    const tx  = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

/**
 * dbPut(store, obj)
 * Insert or update a record (upsert).
 * @param {string} store  - Object store name
 * @param {object} obj    - Record to save (must contain keyPath field)
 * @returns {Promise<IDBValidKey>}
 */
function dbPut(store, obj) {
  return new Promise((res, rej) => {
    const tx  = db.transaction(store, 'readwrite');
    const req = tx.objectStore(store).put(obj);
    req.onsuccess = () => res(req.result);
    req.onerror   = () => rej(req.error);
  });
}

/**
 * hashPass(str)
 * FNV-1a 32-bit non-cryptographic hash.
 * Suitable for local demo storage — never transmit over network.
 * For production, upgrade to PBKDF2 via window.crypto.subtle.
 *
 * @param  {string} str - Plaintext password
 * @returns {string}     Hex digest string
 */
function hashPass(str) {
  let h = 2166136261; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h  = Math.imul(h, 16777619); // FNV prime
  }
  return (h >>> 0).toString(16);
}
