import { openDB } from 'idb';

const STORE_NAME = 'encrypted_notes';
const META_STORE = 'vault_meta';
let generation = 0;
const ensureGeneration = (expected) => {
  if (expected !== generation) throw new DOMException('Offline cache was cleared.', 'AbortError');
};

// Retain the v2 stores so existing offline ciphertext remains recoverable.
export const initDB = () => openDB('InfoStuffsDB', 2, {
  upgrade(db) {
    if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: '_id' });
    if (!db.objectStoreNames.contains(META_STORE)) db.createObjectStore(META_STORE);
  },
});

const prepareOwner = async (tx, userId) => {
  if (!userId) throw new Error('An account is required for offline caching.');
  const meta = tx.objectStore(META_STORE);
  const previousOwner = await meta.get('salt');
  if (previousOwner && previousOwner !== userId) {
    await tx.objectStore(STORE_NAME).clear();
    await meta.clear();
  }
  await meta.put(userId, 'salt');
};

export const saveOfflineVaults = async (vaults, userId) => {
  const expected = generation;
  const db = await initDB();
  ensureGeneration(expected);
  const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
  await prepareOwner(tx, userId);
  await tx.objectStore(META_STORE).put(vaults, 'vaults');
  await tx.done;
};

export const saveOfflineNotes = async (notes, userId, vaultId = null) => {
  if (!Array.isArray(notes) || notes.some((note) => note.userId !== userId || (note.vaultId || null) !== vaultId)) {
    throw new Error('Offline cache scope does not match.');
  }
  const expected = generation;
  const db = await initDB();
  ensureGeneration(expected);
  const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
  await prepareOwner(tx, userId);
  const store = tx.objectStore(STORE_NAME);
  const previous = await store.getAll();
  await Promise.all(previous.filter((note) => note.userId === userId && (note.vaultId || null) === vaultId)
    .map((note) => store.delete(note._id)));
  await Promise.all(notes.map((note) => store.put(note)));
  await tx.done;
};

export const cacheOfflineNote = async (note, userId, vaultId) => {
  if (note.userId !== userId || note.vaultId !== vaultId) throw new Error('Offline cache scope does not match.');
  const expected = generation;
  const db = await initDB();
  ensureGeneration(expected);
  const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
  await prepareOwner(tx, userId);
  await tx.objectStore(STORE_NAME).put(note);
  await tx.done;
};

export const removeOfflineNote = async (id, userId) => {
  const db = await initDB();
  const tx = db.transaction(STORE_NAME, 'readwrite');
  const note = await tx.store.get(id);
  if (note?.userId === userId) await tx.store.delete(id);
  await tx.done;
};

export const getOfflineSnapshot = async () => {
  const db = await initDB();
  const tx = db.transaction([STORE_NAME, META_STORE], 'readonly');
  const [userId, vaults, allNotes] = await Promise.all([tx.objectStore(META_STORE).get('salt'),
    tx.objectStore(META_STORE).get('vaults'), tx.objectStore(STORE_NAME).getAll()]);
  await tx.done;
  const owner = userId || allNotes[0]?.userId || null;
  return { userId: owner, vaults: vaults || [], notes: allNotes.filter((note) => note.userId === owner) };
};

export const getOfflineNotes = async (userId, vaultId = null) => {
  const snapshot = await getOfflineSnapshot();
  if (!userId) return snapshot.notes;
  return snapshot.userId === userId ? snapshot.notes.filter((note) => (note.vaultId || null) === vaultId) : [];
};
export const getOfflineSalt = async () => (await getOfflineSnapshot()).userId;

export const clearOfflineVault = async () => {
  generation += 1;
  const db = await initDB();
  const tx = db.transaction([STORE_NAME, META_STORE], 'readwrite');
  await tx.objectStore(STORE_NAME).clear();
  await tx.objectStore(META_STORE).clear();
  await tx.done;
};
