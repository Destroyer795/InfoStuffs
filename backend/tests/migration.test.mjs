import test from 'node:test';
import assert from 'node:assert/strict';
import { Readable } from 'node:stream';

Object.assign(process.env, {
  R2_ACCOUNT_ID: 'test-account', R2_ACCESS_KEY_ID: 'test-access-key',
  R2_SECRET_ACCESS_KEY: 'test-secret-key', R2_BUCKET_NAME: 'test-bucket',
});
const { listStorageFiles, migrateSupabaseToR2 } = await import('../scripts/migrate-supabase-to-r2.mjs');
const { encryptFile, decryptFile } = await import('../../frontend/src/utils/encryption.js');

const file = (name) => ({ name, id: `object:${name}`, metadata: {} });
const folder = (name) => ({ name, id: null, metadata: null });
const lean = (value) => ({ lean: async () => value });

const fixture = ({ files, notes = [], existing = new Map(), corruptWrite = false, listingError = null }) => {
  const destination = new Map(existing);
  const ledger = new Map();
  const puts = [];
  const logs = [];
  const source = {
    list: async (prefix, { offset, limit }) => {
      if (listingError) return { error: { message: listingError } };
      const entries = new Map();
      for (const key of files.keys()) {
        if (prefix && !key.startsWith(`${prefix}/`)) continue;
        const relative = prefix ? key.slice(prefix.length + 1) : key;
        const [name, ...rest] = relative.split('/');
        entries.set(name, rest.length ? folder(name) : file(name));
      }
      return { data: [...entries.values()].sort((a, b) => a.name.localeCompare(b.name)).slice(offset, offset + limit), error: null };
    },
    download: async (key) => ({ data: new Blob([files.get(key)]), error: null }),
  };
  const supabase = { storage: { from: (bucket) => { assert.equal(bucket, 'infostuffsende'); return source; } } };
  const s3 = {
    send: async (command) => {
      const { Key, Body } = command.input;
      if (command.constructor.name === 'GetObjectCommand') {
        if (!destination.has(Key)) throw Object.assign(new Error('Not found'), { name: 'NoSuchKey' });
        return { Body: Readable.from([destination.get(Key)]) };
      }
      assert.equal(command.constructor.name, 'PutObjectCommand');
      assert.equal(command.input.ContentType, 'application/octet-stream');
      assert.equal(command.input.IfNoneMatch, '*');
      puts.push(Key);
      destination.set(Key, corruptWrite ? Buffer.from('corrupt ciphertext') : Buffer.from(Body));
      return {};
    },
  };
  const StorageModel = {
    findById: (id) => lean(ledger.get(id)),
    find: ({ _id }) => lean(_id.$in.map((id) => ledger.get(id)).filter(Boolean)),
    updateOne: async ({ _id }, update) => {
      if (!ledger.has(_id)) ledger.set(_id, { _id, ...update.$setOnInsert });
      Object.assign(ledger.get(_id), update.$set);
      return { modifiedCount: 1 };
    },
  };
  const InfoModel = {
    find: ({ $or }) => {
      const key = $or[0].imageURL;
      return lean(notes.filter((note) => note.imageURL === key || note.file === key || note.storagePaths?.includes(key)));
    },
    updateOne: async ({ _id }, update) => {
      const note = notes.find((candidate) => candidate._id === _id);
      Object.assign(note, update.$set);
      return { modifiedCount: 1 };
    },
    countDocuments: async () => notes.filter((note) => (note.file || note.imageURL) && !note.storagePaths?.length).length,
  };
  const logger = Object.fromEntries(['log', 'warn', 'error'].map((level) => [level, (message) => logs.push([level, message])]));
  return { destination, ledger, puts, logs, notes, source, options: { supabase, s3, bucketName: 'test-bucket', InfoModel, StorageModel, logger } };
};

test('recursive listing paginates every directory and includes root objects', async () => {
  const calls = [];
  const tree = {
    '': [folder('documents'), folder('images'), file('root.bin')],
    documents: [file('a.bin'), folder('nested'), file('z.bin')],
    'documents/nested': [file('deep.bin')],
    images: [file('a.png'), file('b.png'), file('c.png')],
  };
  const source = { list: async (prefix, { offset, limit }) => {
    calls.push([prefix, offset]);
    return { data: tree[prefix].slice(offset, offset + limit), error: null };
  } };
  const paths = [];
  for await (const path of listStorageFiles(source, '', 2)) paths.push(path);
  assert.deepEqual(paths.sort(), ['documents/a.bin', 'documents/nested/deep.bin', 'documents/z.bin', 'images/a.png', 'images/b.png', 'images/c.png', 'root.bin']);
  assert.ok(calls.some(([prefix, offset]) => prefix === '' && offset === 2));
  assert.ok(calls.some(([prefix, offset]) => prefix === 'images' && offset === 2));
});

test('migration copies identical ciphertext, preserves paths and backfills every match without passwords', async () => {
  const key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
  const encrypted = Buffer.from(await (await encryptFile(new Blob(['Existing private attachment']), key)).arrayBuffer());
  const files = new Map([['documents/original.enc', encrypted], ['images/a.enc', encrypted], ['root.enc', encrypted], ['uploads/nested/deep.enc', encrypted]]);
  const notes = [
    { _id: 'file-note', userId: 'alice', type: 'file', file: 'documents/original.enc' },
    { _id: 'image-note', userId: 'bob', type: 'image', imageURL: 'images/a.enc' },
    { _id: 'encrypted-note', userId: 'carol', type: 'file', file: 'iv:ciphertext', byteSize: 0 },
  ];
  const state = fixture({ files, notes });
  const summary = await migrateSupabaseToR2(state.options);
  assert.equal(summary.filesMigrated, 4);
  assert.equal(summary.bytesCopied, encrypted.length * 4);
  assert.equal(summary.recordsBackfilled, 2);
  assert.equal(summary.legacyNotesPending, 1);
  assert.equal(summary.failures, 0);
  assert.deepEqual([...state.destination.keys()].sort(), [...files.keys()].sort());
  for (const [path, bytes] of state.destination) assert.deepEqual(bytes, files.get(path));
  assert.equal(await (await decryptFile(new Blob([state.destination.get('documents/original.enc')]), key)).text(), 'Existing private attachment');
  assert.equal(notes[0].byteSize, encrypted.length);
  assert.equal(notes[0].file, 'documents/original.enc');
  assert.equal(notes[2].file, 'iv:ciphertext');
  assert.equal(notes[2].byteSize, 0);
  assert.equal(state.ledger.get('documents/original.enc').userId, 'alice');
  assert.equal(state.ledger.get('root.enc').status, 'legacy');
  assert.equal(state.ledger.get('root.enc').byteSize, encrypted.length);
  assert.equal(files.size, 4);
});

test('rerunning verifies identical destination objects without uploading again', async () => {
  const files = new Map([['uploads/existing.enc', Buffer.from('opaque ciphertext bytes')]]);
  const state = fixture({ files, existing: files });
  const summary = await migrateSupabaseToR2(state.options);
  assert.equal(summary.filesMigrated, 0);
  assert.equal(summary.existingFilesVerified, 1);
  assert.equal(summary.bytesCopied, 0);
  assert.equal(summary.failures, 0);
  assert.deepEqual(state.puts, []);
});

test('a different destination object is preserved and counted as a migration failure', async () => {
  const files = new Map([['uploads/collision.enc', Buffer.from('source ciphertext')]]);
  const original = Buffer.from('different existing destination');
  const state = fixture({ files, existing: new Map([['uploads/collision.enc', original]]) });
  const summary = await migrateSupabaseToR2(state.options);
  assert.equal(summary.failures, 1);
  assert.equal(summary.filesMigrated, 0);
  assert.deepEqual(state.puts, []);
  assert.deepEqual(state.destination.get('uploads/collision.enc'), original);
  assert.equal(state.ledger.size, 0);
  assert.deepEqual(files.get('uploads/collision.enc'), Buffer.from('source ciphertext'));
});

test('destination integrity failure never backfills MongoDB', async () => {
  const files = new Map([['uploads/a.enc', Buffer.from('source ciphertext')]]);
  const note = { _id: 'note', userId: 'alice', type: 'file', file: 'uploads/a.enc', byteSize: 0 };
  const state = fixture({ files, notes: [note], corruptWrite: true });
  const summary = await migrateSupabaseToR2(state.options);
  assert.equal(summary.failures, 1);
  assert.equal(summary.recordsBackfilled, 0);
  assert.equal(note.byteSize, 0);
  assert.equal(state.ledger.size, 0);
  assert.equal(files.size, 1);
});

test('source listing failures cannot be reported as successful migrations', async () => {
  const state = fixture({ files: new Map(), listingError: 'Permission denied' });
  const summary = await migrateSupabaseToR2(state.options);
  assert.equal(summary.failures, 1);
  assert.equal(summary.filesMigrated, 0);
  assert.ok(state.logs.some(([level, message]) => level === 'error' && message.includes('Permission denied')));
});

test('an empty source listing cannot silently skip existing encrypted attachments', async () => {
  const state = fixture({ files: new Map(), notes: [{ _id: 'note', userId: 'alice', type: 'file', file: 'iv:ciphertext' }] });
  const summary = await migrateSupabaseToR2(state.options);
  assert.equal(summary.failures, 1);
  assert.equal(summary.legacyNotesPending, 1);
});

test('a final database error still prints the migration summary and reports failure', async () => {
  const state = fixture({ files: new Map() });
  state.options.InfoModel.countDocuments = async () => { throw new Error('Database unavailable'); };
  const summary = await migrateSupabaseToR2(state.options);
  assert.equal(summary.failures, 1);
  assert.equal(summary.legacyNotesPending, null);
  assert.ok(state.logs.some(([level, message]) => level === 'log' && message.startsWith('Migration summary:')));
});
