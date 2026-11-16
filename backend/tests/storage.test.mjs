import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';

// Never contact configured production services while running tests.
Object.assign(process.env, {
  R2_ACCOUNT_ID: 'test-account', R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key', R2_BUCKET_NAME: 'test-bucket', VERCEL: '1',
});
const { default: Info } = await import('../models/info.model.js');
const { default: StorageObject, StorageLock } = await import('../models/storageObject.model.js');
const { default: r2 } = await import('../config/r2.js');
const { default: fileRoutes } = await import('../routes/file.route.js');
const { getPresignedUploadUrl, getPresignedDownloadUrl, deleteFileFromStorage } = await import('../controller/file.controller.js');
const { cleanupExpiredNotes } = await import('../services/noteCleanup.js');
const { createInfo, updateInfo, deleteInfo, deleteAllInfos } = await import('../controller/info.controller.js');
const { ensureNoteCleanupIndexes } = await import('../config/storageIndexes.js');
const { MAX_STORAGE_BYTES, MAX_FILE_BYTES, isValidStoragePath, prepareInfoAttachments } = await import('../services/storage.js');

const restores = [];
const stub = (target, name, implementation) => {
  const original = target[name];
  target[name] = implementation;
  restores.push(() => { target[name] = original; });
};
const lean = (value) => ({ lean: async () => value });
const response = () => ({ statusCode: 200, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } });
const uploadRequest = (changes = {}) => ({
  auth: { userId: 'alice' },
  body: { storagePath: 'uploads/opaque.bin', byteSize: 42, contentType: 'application/octet-stream', ...changes },
});
let objects;
let calls;
beforeEach(() => {
  objects = new Map();
  calls = [];
  stub(Info, 'aggregate', async () => []);
  stub(Info, 'exists', async () => null);
  stub(StorageLock, 'updateOne', async () => ({}));
  stub(StorageLock, 'findOneAndUpdate', async () => ({}));
  stub(StorageObject, 'aggregate', async () => [{ total: [...objects.values()].reduce((sum, object) => sum + object.byteSize, 0) }]);
  stub(StorageObject, 'exists', async ({ _id }) => objects.has(_id));
  stub(StorageObject, 'create', async (object) => { objects.set(object._id, object); return object; });
  stub(StorageObject, 'findById', (id) => lean(objects.get(id) || null));
  stub(StorageObject, 'find', () => lean([]));
  stub(StorageObject, 'deleteOne', async ({ _id }) => { objects.delete(_id); return {}; });
  stub(StorageObject, 'updateOne', async ({ _id }, update) => { Object.assign(objects.get(_id), update.$set); });
  stub(StorageObject, 'updateMany', async () => ({}));
  stub(StorageObject, 'findOneAndUpdate', async ({ _id }, update) => Object.assign(objects.get(_id), update.$set));
  stub(r2, 'send', async (command) => { calls.push(command); return { ContentLength: 42 }; });
});
afterEach(() => { restores.splice(0).reverse().forEach((restore) => restore()); });

test('storage paths reject traversal, URLs, nested folders and non-string values', () => {
  for (const path of ['../secret', 'images/../x', 'images/..', 'images/.', 'documents/x/y', 'uploads/x?z', 'https://host/a', 4, null]) {
    assert.equal(isValidStoragePath(path), false, String(path));
  }
  assert.equal(isValidStoragePath('images/random-uuid_1.jpg'), true);
});

test('upload rejects invalid sizes, plaintext content types and the per-file limit', async () => {
  for (const byteSize of [-1, 0, '42', 1.5, null, NaN, MAX_FILE_BYTES + 1]) {
    const res = response();
    await getPresignedUploadUrl(uploadRequest({ byteSize }), res);
    assert.equal(res.statusCode, 400);
  }
  const res = response();
  await getPresignedUploadUrl(uploadRequest({ contentType: 'image/jpeg' }), res);
  assert.equal(res.statusCode, 400);
  assert.equal(objects.size, 0);
});

test('quota checks Info totals, pending reservations and migrated ciphertext', async () => {
  stub(Info, 'aggregate', async () => [{ total: MAX_STORAGE_BYTES - 41 }]);
  const blocked = response();
  await getPresignedUploadUrl(uploadRequest(), blocked);
  assert.equal(blocked.statusCode, 403);
  assert.equal(blocked.body.message, 'Storage quota exceeded (9GB global limit reached). Vault is full.');
  stub(Info, 'aggregate', async () => []);
  objects.set('legacy', { byteSize: MAX_STORAGE_BYTES - 41, status: 'legacy' });
  const legacyBlocked = response();
  await getPresignedUploadUrl(uploadRequest(), legacyBlocked);
  assert.equal(legacyBlocked.statusCode, 403);
});

test('exact quota boundary succeeds and signs ciphertext size, content type and conditional PUT', async () => {
  stub(Info, 'aggregate', async () => [{ total: MAX_STORAGE_BYTES - 42 }]);
  const res = response();
  await getPresignedUploadUrl(uploadRequest(), res);
  assert.equal(res.statusCode, 200);
  const url = new URL(res.body.uploadUrl);
  assert.equal(url.searchParams.get('X-Amz-Expires'), '900');
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /content-length/);
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /content-type/);
  assert.match(url.searchParams.get('X-Amz-SignedHeaders'), /if-none-match/);
  assert.equal(res.body.storagePath, 'uploads/opaque.bin');
  assert.equal(objects.get('uploads/opaque.bin').byteSize, 42);
  assert.equal(JSON.stringify(res.body).includes('test-secret-key'), false);
  const duplicate = response();
  await getPresignedUploadUrl(uploadRequest(), duplicate);
  assert.equal(duplicate.statusCode, 409);
});

test('concurrent quota lease rejects a request without issuing a URL', async () => {
  stub(StorageLock, 'findOneAndUpdate', async () => null);
  const res = response();
  await getPresignedUploadUrl(uploadRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(objects.size, 0);
});

test('download and delete enforce object ownership', async () => {
  objects.set('uploads/opaque.bin', { userId: 'bob', status: 'ready', byteSize: 42 });
  for (const controller of [getPresignedDownloadUrl, deleteFileFromStorage]) {
    const res = response();
    await controller(uploadRequest(), res);
    assert.equal(res.statusCode, 404);
  }
  assert.equal(calls.length, 0);
});

test('owned downloads expire after one hour', async () => {
  objects.set('uploads/opaque.bin', { userId: 'alice', status: 'ready', byteSize: 42 });
  const res = response();
  await getPresignedDownloadUrl(uploadRequest(), res);
  assert.equal(new URL(res.body.downloadUrl).searchParams.get('X-Amz-Expires'), '3600');
});

test('direct deletion cannot remove attached files and pending PUT reservations remain counted', async () => {
  objects.set('uploads/opaque.bin', { userId: 'alice', byteSize: 42, status: 'pending', uploadExpiresAt: new Date(Date.now() + 900_000) });
  stub(Info, 'exists', async () => ({ _id: 'note' }));
  const linked = response();
  await deleteFileFromStorage(uploadRequest(), linked);
  assert.equal(linked.statusCode, 409);
  assert.equal(calls.length, 0);
  stub(Info, 'exists', async () => null);
  const res = response();
  await deleteFileFromStorage(uploadRequest(), res);
  assert.equal(res.statusCode, 200);
  assert.equal(objects.get('uploads/opaque.bin').status, 'deleting');
  assert.equal(calls[0].constructor.name, 'DeleteObjectCommand');
});

test('direct file deletion cannot race a note save holding the user storage lock', async () => {
  objects.set('uploads/opaque.bin', { userId: 'alice', byteSize: 42, status: 'ready' });
  stub(StorageLock, 'findOneAndUpdate', async () => null);
  const res = response();
  await deleteFileFromStorage(uploadRequest(), res);
  assert.equal(res.statusCode, 503);
  assert.equal(calls.length, 0);
  assert.equal(objects.has('uploads/opaque.bin'), true);
});

test('attachment accounting uses R2 ContentLength and rejects under-reported ciphertext', async () => {
  objects.set('uploads/opaque.bin', { userId: 'alice', byteSize: 12, status: 'pending' });
  await assert.rejects(prepareInfoAttachments({ file: 'encrypted:path' }, ['uploads/opaque.bin'], 'alice'), /does not match/);
  objects.get('uploads/opaque.bin').byteSize = 42;
  assert.deepEqual(await prepareInfoAttachments({ file: 'encrypted:path' }, ['uploads/opaque.bin'], 'alice'), { storagePaths: ['uploads/opaque.bin'], byteSize: 42 });
});

test('expired note remains in MongoDB when R2 deletion fails', async () => {
  const note = { _id: 'note', userId: 'alice', file: 'uploads/opaque.bin' };
  stub(Info, 'find', () => lean([note]));
  stub(Info, 'findOne', () => lean(note));
  let databaseDeletes = 0;
  stub(Info, 'deleteOne', async () => { databaseDeletes++; return { deletedCount: 1 }; });
  stub(r2, 'send', async () => { throw new Error('R2 unavailable'); });
  assert.equal(await cleanupExpiredNotes(), 0);
  assert.equal(databaseDeletes, 0);
});

test('unmapped encrypted legacy notes are retained for reconciliation', async () => {
  const note = { _id: 'legacy', userId: 'alice', file: 'iv:ciphertext' };
  stub(Info, 'find', () => lean([note]));
  stub(Info, 'findOne', () => lean(note));
  let deleted = false;
  stub(Info, 'deleteOne', async () => { deleted = true; });
  assert.equal(await cleanupExpiredNotes(), 0);
  assert.equal(deleted, false);
  assert.equal(calls.length, 0);
});

test('all file routes require Clerk authentication', async () => {
  const app = express();
  app.use(express.json());
  app.use('/api/files', fileRoutes);
  const server = app.listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  try {
    for (const [method, path] of [['POST', '/presigned-upload'], ['POST', '/presigned-download'], ['DELETE', '']]) {
      const res = await fetch(`http://127.0.0.1:${server.address().port}/api/files${path}`, { method });
      assert.equal(res.status, 401);
    }
  } finally {
    await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test('backend app, routes, cron and schema load without starting a server or connecting to MongoDB', async () => {
  const { default: app } = await import('../api/info.js');
  const { default: cron } = await import('../api/cron.js');
  assert.equal(typeof app, 'function');
  assert.equal(typeof cron, 'function');
  assert.equal(Info.modelName, 'Info');
});

test('missing R2 configuration disables storage without crashing', async () => {
  const names = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const previous = names.map((name) => process.env[name]);
  names.forEach((name) => { delete process.env[name]; });
  try {
    const config = await import('../config/r2.js?missing-config-test');
    assert.equal(config.default, null);
  } finally {
    names.forEach((name, index) => { process.env[name] = previous[index]; });
  }
});

const noteId = '507f1f77bcf86cd799439011';
const fileNote = (extra = {}) => ({
  _id: noteId, userId: 'alice', name: 'iv:name', category: 'iv:category', importance: 'High',
  type: 'file', file: 'iv:path', imageURL: '', byteSize: 42, storagePaths: ['uploads/old.bin'], ...extra,
});

test('Info validates byteSize and uses an ordinary expiry index', () => {
  assert.equal(new Info({ userId: 'alice', name: 'encrypted', category: 'encrypted', importance: 'High' }).byteSize, 0);
  const invalid = new Info({ ...fileNote(), byteSize: -1 }).validateSync();
  assert.ok(invalid.errors.byteSize);
  assert.equal(Info.schema.indexes().some(([, options]) => options.expireAfterSeconds !== undefined), false);
});

test('startup replaces the deployed TTL index before serving data', async () => {
  const operations = [];
  stub(Info.collection, 'indexes', async () => [{ name: 'expiresAt_1', key: { expiresAt: 1 }, expireAfterSeconds: 0 }, { name: '_id_', key: { _id: 1 } }]);
  stub(Info.collection, 'dropIndex', async (name) => operations.push(['drop', name]));
  stub(Info.collection, 'createIndex', async (key) => operations.push(['create', key]));
  await ensureNoteCleanupIndexes();
  assert.deepEqual(operations, [['drop', 'expiresAt_1'], ['create', { expiresAt: 1 }]]);
});

test('create stores server-verified ciphertext bytes and only the authenticated user ID', async () => {
  objects.set('uploads/opaque.bin', { userId: 'alice', status: 'pending', byteSize: 42 });
  stub(Info.prototype, 'save', async function () { return this; });
  const res = response();
  await createInfo({ auth: { userId: 'alice' }, body: {
    ...fileNote({ storagePaths: ['uploads/opaque.bin'] }), userId: 'bob', byteSize: 42,
  } }, res);
  assert.equal(res.statusCode, 201);
  assert.equal(res.body.data.userId, 'alice');
  assert.equal(res.body.data.byteSize, 42);
  assert.deepEqual([...res.body.data.storagePaths], ['uploads/opaque.bin']);
});

test('failed replacement upload keeps the original database reference and ciphertext', async () => {
  const existing = fileNote();
  stub(Info, 'findOne', () => lean(existing));
  objects.set('uploads/new.bin', { userId: 'alice', status: 'pending', byteSize: 42 });
  let saved = false;
  stub(Info, 'findOneAndUpdate', async () => { saved = true; });
  stub(r2, 'send', async (command) => {
    calls.push(command);
    if (command.constructor.name === 'HeadObjectCommand') throw new Error('Upload missing');
  });
  const res = response();
  await updateInfo({ params: { id: noteId }, auth: { userId: 'alice' }, body: { file: 'new:encrypted', storagePaths: ['uploads/new.bin'], byteSize: 42 } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(saved, false);
  assert.equal(calls.some((command) => command.constructor.name === 'DeleteObjectCommand'), false);
});

test('successful replacement saves the new reference before deleting the old ciphertext', async () => {
  const existing = fileNote();
  stub(Info, 'findOne', () => lean(existing));
  objects.set('uploads/new.bin', { userId: 'alice', status: 'pending', byteSize: 42 });
  objects.set('uploads/old.bin', { userId: 'alice', status: 'ready', byteSize: 42 });
  const operations = [];
  stub(Info, 'findOneAndUpdate', async (filter, updates) => { operations.push('save'); return { ...existing, ...updates }; });
  stub(r2, 'send', async (command) => { operations.push(command.constructor.name); return { ContentLength: 42 }; });
  const res = response();
  await updateInfo({ params: { id: noteId }, auth: { userId: 'alice' }, body: { file: 'new:encrypted', storagePaths: ['uploads/new.bin'], byteSize: 42 } }, res);
  assert.equal(res.statusCode, 200);
  assert.deepEqual(operations, ['HeadObjectCommand', 'save', 'DeleteObjectCommand']);
  assert.equal(res.body.data.byteSize, 42);
});

test('legacy reconciliation backfills a note without changing its encrypted reference', async () => {
  const existing = fileNote({ storagePaths: undefined, byteSize: 0 });
  stub(Info, 'findOne', () => lean(existing));
  objects.set('uploads/old.bin', { userId: null, status: 'legacy', byteSize: 42 });
  stub(Info, 'findOneAndUpdate', async (filter, updates) => ({ ...existing, ...updates }));
  const res = response();
  await updateInfo({ params: { id: noteId }, auth: { userId: 'alice' }, body: { storagePaths: ['uploads/old.bin'] } }, res);
  assert.equal(res.statusCode, 200);
  assert.equal(res.body.data.file, existing.file);
  assert.equal(res.body.data.byteSize, 42);
  assert.equal(objects.get('uploads/old.bin').userId, 'alice');
});

test('note deletion removes ciphertext before MongoDB and leaves the record on R2 errors', async () => {
  const existing = fileNote();
  stub(Info, 'findOne', () => lean(existing));
  let deleted = false;
  stub(Info, 'deleteOne', async () => { deleted = true; });
  stub(r2, 'send', async () => { throw new Error('R2 unavailable'); });
  const res = response();
  await deleteInfo({ params: { id: noteId }, auth: { userId: 'alice' } }, res);
  assert.equal(res.statusCode, 500);
  assert.equal(deleted, false);
});

test('vault reset preflight prevents deletion while legacy attachment mappings are unknown', async () => {
  stub(Info, 'find', () => lean([fileNote(), fileNote({ _id: 'legacy', storagePaths: undefined })]));
  let deleted = false;
  stub(Info, 'deleteOne', async () => { deleted = true; });
  const res = response();
  await deleteAllInfos({ auth: { userId: 'alice' } }, res);
  assert.equal(res.statusCode, 409);
  assert.equal(deleted, false);
  assert.equal(calls.length, 0);
});
