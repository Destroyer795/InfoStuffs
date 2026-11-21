import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

Object.assign(process.env, { MONGO_URI: 'mongodb://127.0.0.1:1/isolated-vault-tests',
  R2_ACCOUNT_ID: 'test-account', R2_ACCESS_KEY_ID: 'test-key', R2_SECRET_ACCESS_KEY: 'test-secret', R2_BUCKET_NAME: 'test-bucket' });
const { default: Vault } = await import('../models/vault.model.js');
const { default: Info } = await import('../models/info.model.js');
const { default: StorageObject, StorageLock } = await import('../models/storageObject.model.js');
const { default: r2 } = await import('../config/r2.js');
const { default: vaultRoutes } = await import('../routes/vault.route.js');
const { getVaults, createVault, recoverLegacyNotes } = await import('../controller/vault.controller.js');
const { getInfos, createInfo, updateInfo, deleteInfo, deleteAllInfos } = await import('../controller/info.controller.js');
const { getPresignedUploadUrl } = await import('../controller/file.controller.js');
const { validateVaultMetadata, resolveWritableVault } = await import('../services/vaults.js');
const { prepareInfoAttachments } = await import('../services/storage.js');

const firstId = 'ce12a5cc-7d49-481e-a1d0-00b42d976641';
const secondId = '6e0ffcb5-9ea0-4e80-8cef-1bf224c9e5d8';
const legacyId = '6a7c98c46eaaa04223a86286';
const bytes = (count) => Buffer.alloc(count, 7).toString('base64');
const metadata = (id = firstId) => ({ id, version: 1, kdf: { name: 'PBKDF2', hash: 'SHA-256', iterations: 600000, salt: bytes(32) },
  wrappedKey: { iv: bytes(12), ciphertext: bytes(48) }, encryptedName: { iv: bytes(12), ciphertext: bytes(30) } });
const res = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const lean = (value) => ({ lean: async () => value });
const req = (body = {}, extra = {}) => ({ auth: { userId: 'alice' }, body, query: {}, ...extra });
const restores = [];
const stub = (target, name, value) => { const original = target[name]; target[name] = value; restores.push(() => { target[name] = original; }); };
let vaults;
let notes;
beforeEach(() => {
  vaults = new Map(); notes = new Map();
  stub(StorageLock, 'updateOne', async () => ({}));
  stub(StorageLock, 'findOneAndUpdate', async () => ({}));
  stub(Vault, 'exists', async (filter) => [...vaults.values()].find((vault) => vault.userId === filter.userId && (!filter._id || vault._id === filter._id)) || null);
  stub(Vault, 'findById', (id) => lean(vaults.get(id)));
  stub(Vault, 'countDocuments', async ({ userId }) => [...vaults.values()].filter((vault) => vault.userId === userId).length);
  stub(Vault, 'create', async (vault) => { vaults.set(vault._id, structuredClone(vault)); return vault; });
  stub(Vault, 'deleteMany', async ({ userId }) => { for (const [id, vault] of vaults) if (vault.userId === userId) vaults.delete(id); });
  stub(Vault, 'find', ({ userId }) => ({ sort: () => lean([...vaults.values()].filter((vault) => vault.userId === userId)) }));
  stub(Info, 'countDocuments', async (filter) => filter._id.$in.filter((id) => {
    const note = notes.get(id);
    return note?.userId === filter.userId && (!note.vaultId || note.vaultId === filter.$or[1].vaultId);
  }).length);
  stub(Info, 'updateMany', async (filter, update) => { for (const id of filter._id.$in) { const note = notes.get(id); if (note?.userId === filter.userId && !note.vaultId) Object.assign(note, update.$set); } });
  stub(Info, 'findOne', ({ _id, userId }) => lean(notes.get(_id)?.userId === userId ? notes.get(_id) : null));
  stub(Info, 'find', (filter) => ({ sort: async () => [...notes.values()].filter((note) => note.userId === filter.userId && (note.vaultId || null) === filter.vaultId),
    lean: async () => [...notes.values()].filter((note) => note.userId === filter.userId) }));
  stub(StorageObject, 'updateMany', async () => ({}));
  stub(StorageObject, 'find', () => lean([]));
});
afterEach(() => restores.splice(0).reverse().forEach((restore) => restore()));

test('vault metadata accepts only bounded cryptographic envelopes and strips sensitive extra fields', async () => {
  const input = { ...metadata(), password: 'never store this', key: 'raw secret', name: 'Private name', userId: 'bob' };
  const result = res();
  await createVault(req(input), result);
  assert.equal(result.statusCode, 201);
  const stored = vaults.get(firstId);
  assert.equal(stored.userId, 'alice');
  for (const field of ['password', 'key', 'name']) assert.equal(stored[field], undefined);
  const list = res();
  await getVaults(req(), list);
  assert.equal(list.body.data[0].userId, undefined);
  assert.deepEqual(list.body.data[0], metadata());
  for (const input of [null, [], { ...metadata(), id: [firstId] }, { ...metadata(), id: '../vault' }, { ...metadata(), version: 2 }, { ...metadata(), kdf: { ...metadata().kdf, iterations: 1 } },
    { ...metadata(), wrappedKey: { iv: bytes(12), ciphertext: bytes(32) } }]) assert.throws(() => validateVaultMetadata(input));
});

test('legacy adoption preserves ciphertext, verifies ownership and remains idempotent after an interrupted request', async () => {
  notes.set(legacyId, { _id: legacyId, userId: 'alice', name: 'encrypted-name', file: 'encrypted-path', vaultId: null });
  const input = { ...metadata(), legacyInfoIds: [legacyId] };
  const original = Info.updateMany;
  stub(Info, 'updateMany', async () => { throw new Error('simulated interruption'); });
  const failed = res();
  await createVault(req(input), failed);
  assert.equal(failed.statusCode, 500);
  assert.ok(vaults.has(firstId));
  assert.equal(notes.get(legacyId).vaultId, null);
  Info.updateMany = original;
  const retried = res();
  await createVault(req(input), retried);
  assert.equal(retried.statusCode, 201);
  assert.deepEqual(notes.get(legacyId), { _id: legacyId, userId: 'alice', name: 'encrypted-name', file: 'encrypted-path', vaultId: firstId });
  const again = res(); await createVault(req(input), again); assert.equal(again.statusCode, 201);
  const other = res(); await createVault(req({ ...metadata(secondId), legacyInfoIds: [legacyId] }), other); assert.equal(other.statusCode, 409);
  assert.equal(vaults.has(secondId), false);
});

test('foreign accounts cannot list, adopt, use or overwrite another account vault', async () => {
  vaults.set(firstId, { ...validateVaultMetadata(metadata()), userId: 'bob' });
  notes.set(legacyId, { _id: legacyId, userId: 'bob', vaultId: null });
  const list = res(); await getVaults(req(), list); assert.deepEqual(list.body.data, []);
  const create = res(); await createVault(req(metadata()), create); assert.equal(create.statusCode, 409);
  const adopt = res(); await recoverLegacyNotes(req({ legacyInfoIds: [legacyId] }, { params: { id: firstId } }), adopt); assert.equal(adopt.statusCode, 404);
  await assert.rejects(resolveWritableVault('alice', firstId), { status: 404 });
  const newForeign = res(); await createVault(req({ ...metadata(secondId), legacyInfoIds: [legacyId] }), newForeign); assert.equal(newForeign.statusCode, 409);
});

test('note reads are scoped and normal edits cannot move notes between vaults', async () => {
  vaults.set(firstId, { ...validateVaultMetadata(metadata()), userId: 'alice' });
  vaults.set(secondId, { ...validateVaultMetadata(metadata(secondId)), userId: 'alice' });
  notes.set(legacyId, { _id: legacyId, userId: 'alice', vaultId: firstId });
  notes.set('other', { _id: 'other', userId: 'alice', vaultId: secondId });
  notes.set('legacy', { _id: 'legacy', userId: 'alice', vaultId: null });
  const scoped = res(); await getInfos(req({}, { query: { vaultId: firstId } }), scoped); assert.deepEqual(scoped.body.data.map((note) => note._id), [legacyId]);
  const legacy = res(); await getInfos(req(), legacy); assert.deepEqual(legacy.body.data.map((note) => note._id), ['legacy']);
  const edit = res(); await updateInfo(req({ vaultId: secondId }, { params: { id: legacyId } }), edit); assert.equal(edit.statusCode, 409);
  const remove = res(); await deleteInfo(req({}, { params: { id: legacyId }, query: { vaultId: secondId } }), remove); assert.equal(remove.statusCode, 409);
  const missing = res(); await createInfo(req({ name: 'encrypted', category: 'encrypted', importance: 'High', type: 'text', content: 'encrypted' }), missing); assert.equal(missing.statusCode, 409);
  assert.equal(notes.get(legacyId).vaultId, firstId);
});

test('uploads and attachment associations require the correct vault scope', async () => {
  vaults.set(firstId, { ...validateVaultMetadata(metadata()), userId: 'alice' });
  const presign = res();
  await getPresignedUploadUrl(req({ storagePath: 'uploads/opaque.bin', byteSize: 42, contentType: 'application/octet-stream' }), presign);
  assert.equal(presign.statusCode, 409);
  let heads = 0;
  stub(r2, 'send', async () => { heads += 1; return { ContentLength: 42 }; });
  stub(StorageObject, 'findById', () => lean({ _id: 'uploads/opaque.bin', userId: 'alice', vaultId: secondId, status: 'pending' }));
  await assert.rejects(prepareInfoAttachments({ vaultId: firstId, type: 'file', file: 'encrypted' }, ['uploads/opaque.bin'], 'alice'), { status: 403 });
  assert.equal(heads, 0);
});

test('account-wide reset also removes encrypted vault metadata after content cleanup', async () => {
  vaults.set(firstId, { ...validateVaultMetadata(metadata()), userId: 'alice' });
  const result = res(); await deleteAllInfos(req(), result);
  assert.equal(result.statusCode, 200);
  assert.equal(vaults.size, 0);
});

test('vault count is bounded and malformed legacy recovery requests are rejected', async () => {
  stub(Vault, 'countDocuments', async () => 20);
  const full = res(); await createVault(req(metadata()), full); assert.equal(full.statusCode, 400);
  const malformed = res(); await createVault(req({ ...metadata(), legacyInfoIds: ['not-an-object-id'] }), malformed); assert.equal(malformed.statusCode, 400);
  assert.equal(vaults.size, 0);
});

test('all vault endpoints reject requests without a Clerk session', async () => {
  const app = express(); app.use(express.json()); app.use('/api/vaults', vaultRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    for (const [method, path] of [['GET', ''], ['POST', ''], ['POST', `/${firstId}/adopt-legacy`]]) {
      const result = await fetch(`http://127.0.0.1:${server.address().port}/api/vaults${path}`, { method });
      assert.equal(result.status, 401);
    }
  } finally { server.closeAllConnections(); await new Promise((resolve) => server.close(resolve)); }
});
