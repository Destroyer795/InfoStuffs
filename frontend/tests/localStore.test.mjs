import 'fake-indexeddb/auto';
import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { initDB, saveOfflineVaults, saveOfflineNotes, getOfflineSnapshot, getOfflineNotes, cacheOfflineNote, removeOfflineNote, clearOfflineVault } from '../src/utils/localStore.js';

const note = (id, vaultId, userId = 'alice') => ({ _id: id, userId, vaultId, name: 'opaque ciphertext', content: 'opaque ciphertext' });
beforeEach(async () => { await clearOfflineVault(); });

test('syncing a vault preserves the other vaults and legacy cache', async () => {
  await saveOfflineVaults([{ id: 'first', encryptedName: 'opaque' }, { id: 'empty', encryptedName: 'opaque' }], 'alice');
  await saveOfflineNotes([note('legacy', null)], 'alice');
  await saveOfflineNotes([note('one', 'first')], 'alice', 'first');
  await saveOfflineNotes([note('two', 'second')], 'alice', 'second');
  await saveOfflineNotes([note('replacement', 'first')], 'alice', 'first');
  assert.deepEqual((await getOfflineNotes('alice', 'first')).map((item) => item._id), ['replacement']);
  assert.deepEqual((await getOfflineNotes('alice', 'second')).map((item) => item._id), ['two']);
  assert.equal((await getOfflineNotes('alice')).length, 1);
  assert.equal((await getOfflineSnapshot()).vaults.length, 2);
  assert.deepEqual(await getOfflineNotes('bob', 'first'), []);
});

test('local mutations and legacy adoption update only the affected encrypted record', async () => {
  await saveOfflineNotes([note('legacy', null)], 'alice');
  await cacheOfflineNote(note('legacy', 'recovered'), 'alice', 'recovered');
  assert.equal((await getOfflineNotes('alice')).length, 0);
  await removeOfflineNote('legacy', 'bob');
  assert.equal((await getOfflineNotes('alice', 'recovered')).length, 1);
  await removeOfflineNote('legacy', 'alice');
  assert.equal((await getOfflineSnapshot()).notes.length, 0);
});

test('account changes and reset clear all previous account metadata and ciphertext', async () => {
  await saveOfflineVaults([{ id: 'alice-vault' }], 'alice');
  await saveOfflineNotes([note('one', 'first')], 'alice', 'first');
  await saveOfflineVaults([{ id: 'bob-vault' }], 'bob');
  const snapshot = await getOfflineSnapshot();
  assert.equal(snapshot.userId, 'bob');
  assert.deepEqual(snapshot.vaults, [{ id: 'bob-vault' }]);
  assert.deepEqual(snapshot.notes, []);
  await assert.rejects(saveOfflineNotes([note('wrong', 'first', 'alice')], 'bob', 'first'), /scope/);
  await clearOfflineVault();
  assert.deepEqual(await getOfflineSnapshot(), { userId: null, notes: [], vaults: [] });
});

test('old v2 cache survives and remains available for verified legacy recovery', async () => {
  const db = await initDB();
  await db.put('encrypted_notes', note('old', null));
  await db.put('vault_meta', 'alice', 'salt');
  assert.deepEqual((await getOfflineSnapshot()).notes, [note('old', null)]);
});

test('clearing the cache fences pending writes before they can repopulate it', async () => {
  const pendingWrite = saveOfflineVaults([{ id: 'stale' }], 'alice');
  const cleared = clearOfflineVault();
  const [write] = await Promise.allSettled([pendingWrite, cleared]);
  assert.equal(write.status, 'rejected');
  assert.equal(write.reason.name, 'AbortError');
  assert.deepEqual((await getOfflineSnapshot()).vaults, []);
});
