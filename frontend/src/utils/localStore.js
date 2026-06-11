import { openDB } from 'idb';

const DB_NAME = 'InfoStuffsDB';
const STORE_NAME = 'encrypted_notes';

// Initialize the database
export const initDB = async () => {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // We use the MongoDB _id as the local key as well
        db.createObjectStore(STORE_NAME, { keyPath: '_id' });
      }
    },
  });
};

// Save the entire array of encrypted notes (The Online Sync)
export const saveOfflineNotes = async (notesArray) => {
  if (!notesArray || !Array.isArray(notesArray)) return;
  
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    // Clear old cache and save fresh data
    await store.clear();
    for (const note of notesArray) {
      await store.put(note);
    }
    
    await tx.done;
    console.log('Zero-Knowledge payload cached for offline use.');
  } catch (error) {
    console.error('Failed to cache notes offline:', error);
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
    const tx = db.transaction(STORE_NAME, 'readwrite');
    await tx.objectStore(STORE_NAME).clear();
    await tx.done;
  } catch (error) {
    console.error('Failed to clear offline vault:', error);
  }
};
