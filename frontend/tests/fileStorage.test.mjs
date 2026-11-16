import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  uploadToStorage, getDecryptedFileUrl, deleteFromStorage, createOpaqueStoragePath,
  normalizeStoragePath, validateFileSize, MAX_FILE_BYTES, uploadToSupabase, deleteFromSupabase,
} from '../src/utils/fileStorage.js';
import { encryptFile, decryptFile } from '../src/utils/encryption.js';

const originalFetch = globalThis.fetch;
const originalWindow = globalThis.window;
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
let key;
beforeEach(async () => {
  globalThis.window = { Clerk: { session: { getToken: async () => 'clerk-session-token' } } };
  key = await crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
});
afterEach(() => {
  globalThis.fetch = originalFetch;
  if (originalWindow === undefined) delete globalThis.window;
  else globalThis.window = originalWindow;
});

test('upload sends authenticated metadata and only AES-GCM ciphertext to R2', async () => {
  const plaintext = 'Private vault data that must never be uploaded as plaintext';
  const file = new File([plaintext], 'secret-original-filename.txt', { type: 'text/plain' });
  const calls = [];
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    if (options.method === 'POST') {
      const metadata = JSON.parse(options.body);
      assert.deepEqual(metadata, { storagePath: 'documents/opaque.txt', byteSize: file.size + 28, contentType: 'application/octet-stream' });
      assert.equal(options.headers.Authorization, 'Bearer clerk-session-token');
      return json({ success: true, uploadUrl: 'https://r2.example/signed-put' });
    }
    assert.equal(url, 'https://r2.example/signed-put');
    assert.equal(options.method, 'PUT');
    assert.equal(options.headers['Content-Type'], 'application/octet-stream');
    assert.equal(options.headers['If-None-Match'], '*');
    assert.equal(options.headers.Authorization, undefined);
    assert.equal(options.body.type, 'application/octet-stream');
    assert.notEqual(await options.body.text(), plaintext);
    assert.equal(await (await decryptFile(options.body, key, 'text/plain')).text(), plaintext);
    return new Response(null, { status: 200 });
  };
  assert.deepEqual(await uploadToStorage(file, 'documents/opaque.txt', key), { storagePath: 'documents/opaque.txt', byteSize: file.size + 28 });
  assert.equal(calls.length, 2);
});

test('oversized files, encryption overhead and locked vaults fail before network traffic', async () => {
  let networkCalls = 0;
  globalThis.fetch = async () => { networkCalls++; throw new Error('Unexpected network traffic'); };
  await assert.rejects(uploadToStorage({ size: MAX_FILE_BYTES + 1 }, 'uploads/x.bin', key), /100MB/);
  assert.throws(() => validateFileSize({ size: MAX_FILE_BYTES }), /encryption/);
  validateFileSize({ size: MAX_FILE_BYTES - 28 });
  await assert.rejects(uploadToStorage(new Blob(['private']), 'uploads/x.bin', null), /Unlock/);
  assert.equal(networkCalls, 0);
});

test('quota errors reach the caller and no PUT follows a rejected presign request', async () => {
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return json({ success: false, message: 'Storage quota exceeded (9GB global limit reached). Vault is full.' }, 403);
  };
  await assert.rejects(uploadToStorage(new File(['private'], 'file.txt'), 'uploads/x.bin', key), /Storage quota exceeded/);
  assert.equal(calls, 1);
});

test('missing Clerk session prevents storage access', async () => {
  window.Clerk.session = null;
  globalThis.fetch = async () => { throw new Error('Network must not be reached'); };
  await assert.rejects(deleteFromStorage('uploads/x.bin'), /sign in again/);
});

test('failed PUT attempts cleanup and reports the upload failure', async () => {
  const methods = [];
  globalThis.fetch = async (url, options) => {
    methods.push(options.method);
    if (options.method === 'POST') return json({ success: true, uploadUrl: 'https://r2.example/signed-put' });
    if (options.method === 'PUT') return new Response(null, { status: 500 });
    assert.deepEqual(JSON.parse(options.body), { storagePath: 'uploads/x.bin' });
    return json({ success: true });
  };
  await assert.rejects(uploadToStorage(new File(['private'], 'file.txt'), 'uploads/x.bin', key), /upload failed/);
  assert.deepEqual(methods, ['POST', 'PUT', 'DELETE']);
});

test('download fetches ciphertext with a presigned URL and decrypts only in memory', async () => {
  const plaintext = 'Existing ciphertext still decrypts after migration';
  const encryptedBlob = await encryptFile(new Blob([plaintext]), key);
  let requests = 0;
  globalThis.fetch = async (url, options) => {
    requests++;
    if (options) {
      assert.equal(options.headers.Authorization, 'Bearer clerk-session-token');
      assert.deepEqual(JSON.parse(options.body), { storagePath: 'documents/opaque.txt' });
      return json({ success: true, downloadUrl: 'https://r2.example/signed-get' });
    }
    assert.equal(url, 'https://r2.example/signed-get');
    return new Response(encryptedBlob);
  };
  const url = await getDecryptedFileUrl('documents/opaque.txt', key, 'text/plain');
  try {
    assert.equal(await (await originalFetch(url)).text(), plaintext);
    assert.equal(requests, 2);
  } finally {
    URL.revokeObjectURL(url);
  }
});

test('opaque paths conceal filenames and legacy URLs normalize without changing their object key', () => {
  const path = createOpaqueStoragePath(new File(['x'], 'private-name.PDF'), 'documents');
  assert.match(path, /^documents\/[a-f0-9-]{36}\.pdf$/);
  assert.equal(path.includes('private-name'), false);
  assert.equal(normalizeStoragePath('https://old.example/storage/v1/object/sign/infostuffsende/documents/original.pdf?token=old'), 'documents/original.pdf');
  assert.throws(() => normalizeStoragePath('uploads/../private'), /Invalid/);
  assert.equal(uploadToSupabase, uploadToStorage);
  assert.equal(deleteFromSupabase, deleteFromStorage);
});
