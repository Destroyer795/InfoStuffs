import { openDB } from 'idb';

const DB_NAME = 'InfoStuffsDB';
const STORE_NAME = 'encrypted_notes';
const META_STORE = 'vault_meta';

// Initialize the database (version 2 adds metadata store)
export const initDB = async () => {
  return openDB(DB_NAME, 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains(META_STORE)) {
        db.createObjectStore(META_STORE);
      }
    },
  });
};

// Save the array of encrypted notes and cache user salt (The Online Sync)
export const saveOfflineNotes = async (notesArray, userId = null) => {
  if (!notesArray || !Array.isArray(notesArray)) return;
  
  try {
    const db = await initDB();
    const storeList = [STORE_NAME];
    if (db.objectStoreNames.contains(META_STORE)) {
      storeList.push(META_STORE);
    }
    
    const tx = db.transaction(storeList, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Clear old cache and save fresh data
    await store.clear();
    await Promise.all(notesArray.map(note => store.put(note)));

    // Save salt for offline key derivation
    const salt = userId || (notesArray[0] && notesArray[0].userId) || null;
    if (salt && db.objectStoreNames.contains(META_STORE)) {
      const metaStore = tx.objectStore(META_STORE);
      await metaStore.put(salt, 'salt');
    }
    
    await tx.done;
    console.log('Zero-Knowledge payload cached for offline use.');
  } catch (error) {
    console.error('Failed to cache notes offline:', error);
  }
};

// Retrieve salt for offline decryption
export const getOfflineSalt = async () => {
  try {
    const db = await initDB();
    if (db.objectStoreNames.contains(META_STORE)) {
      return await db.get(META_STORE, 'salt');
    }
    return null;
  } catch (error) {
    console.error('Failed to retrieve offline salt:', error);
    return null;
  }
};

// Retrieve the encrypted notes (The Offline Boot)
export const getOfflineNotes = async () => {
  try {
    const db = await initDB();
    return await db.getAll(STORE_NAME);
  } catch (error) {
    console.error('Failed to retrieve offline notes:', error);
    return [];
  }
};

// Clear the vault (For Logout / Nuclear Reset)
export const clearOfflineVault = async () => {
  try {
    const db = await initDB();
    const storeList = [STORE_NAME];
    if (db.objectStoreNames.contains(META_STORE)) {
      storeList.push(META_STORE);
    }
    const tx = db.transaction(storeList, 'readwrite');
    await tx.objectStore(STORE_NAME).clear();
    if (db.objectStoreNames.contains(META_STORE)) {
      await tx.objectStore(META_STORE).clear();
    }
    await tx.done;
  } catch (error) {
    console.error('Failed to clear offline vault:', error);
  }
};
