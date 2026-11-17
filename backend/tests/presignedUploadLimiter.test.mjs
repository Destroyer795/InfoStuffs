import test, { beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import PresignRequestWindow from '../models/presignRequestWindow.model.js';
import { presignedUploadLimiter, PRESIGN_REQUEST_LIMIT, PRESIGN_REQUEST_WINDOW_MS } from '../middleware/presignedUploadLimiter.js';

const originalFindOneAndUpdate = PresignRequestWindow.findOneAndUpdate;
const originalNow = Date.now;
let windows;
let now;
const response = () => ({
  statusCode: 200, headers: {},
  status(code) { this.statusCode = code; return this; },
  set(name, value) { this.headers[name] = value; return this; },
  json(body) { this.body = body; return this; },
});
const request = (userId = 'alice') => ({ auth: { userId }, body: { userId: 'forged-other-user' } });
const increment = ({ _id }, update) => ({ lean: async () => {
  const count = (windows.get(_id)?.count || 0) + update.$inc.count;
  const window = { _id, count, expiresAt: update.$setOnInsert.expiresAt };
  windows.set(_id, window);
  return { ...window };
} });

beforeEach(() => {
  windows = new Map();
  now = 125_000;
  Date.now = () => now;
  PresignRequestWindow.findOneAndUpdate = increment;
});
afterEach(() => {
  Date.now = originalNow;
  PresignRequestWindow.findOneAndUpdate = originalFindOneAndUpdate;
});

test('presign requests are limited by the authenticated user, independently of other accounts', async () => {
  let allowed = 0;
  for (let index = 0; index < PRESIGN_REQUEST_LIMIT; index++) {
    await presignedUploadLimiter(request(), response(), () => { allowed++; });
  }
  const blocked = response();
  await presignedUploadLimiter(request(), blocked, () => { allowed++; });
  assert.equal(blocked.statusCode, 429);
  assert.equal(blocked.headers['Retry-After'], '55');
  assert.equal(allowed, PRESIGN_REQUEST_LIMIT);
  const bob = response();
  await presignedUploadLimiter(request('bob'), bob, () => { allowed++; });
  assert.equal(bob.statusCode, 200);
  assert.equal(allowed, PRESIGN_REQUEST_LIMIT + 1);
  assert.deepEqual([...windows.keys()].sort(), ['alice:120000', 'bob:120000']);
});

test('a new time window works even before MongoDB deletes expired counters', async () => {
  for (let index = 0; index <= PRESIGN_REQUEST_LIMIT; index++) {
    await presignedUploadLimiter(request(), response(), () => {});
  }
  now = 180_000;
  let allowed = false;
  await presignedUploadLimiter(request(), response(), () => { allowed = true; });
  assert.equal(allowed, true);
  assert.equal(windows.size, 2);
  assert.equal(windows.get('alice:180000').count, 1);
  assert.equal(windows.get('alice:180000').expiresAt.getTime(), now + PRESIGN_REQUEST_WINDOW_MS);
});

test('independent middleware instances share one atomic rate budget', async () => {
  const { presignedUploadLimiter: secondInstance } = await import('../middleware/presignedUploadLimiter.js?second-test-instance');
  let allowed = 0;
  const statuses = await Promise.all(Array.from({ length: PRESIGN_REQUEST_LIMIT * 2 }, async (_, index) => {
    const res = response();
    const limiter = index % 2 ? presignedUploadLimiter : secondInstance;
    await limiter(request(), res, () => { allowed++; });
    return res.statusCode;
  }));
  assert.equal(allowed, PRESIGN_REQUEST_LIMIT);
  assert.equal(statuses.filter((status) => status === 429).length, PRESIGN_REQUEST_LIMIT);
  assert.equal(windows.size, 1);
});

test('racing first inserts retry the existing shared counter', async () => {
  let attempts = 0;
  PresignRequestWindow.findOneAndUpdate = (...args) => {
    if (attempts++ === 0) return { lean: async () => { throw Object.assign(new Error('Concurrent insert'), { code: 11000 }); } };
    return increment(...args);
  };
  let allowed = false;
  await presignedUploadLimiter(request(), response(), () => { allowed = true; });
  assert.equal(allowed, true);
  assert.equal(attempts, 2);
  assert.equal(windows.get('alice:120000').count, 1);
});

test('counter failures fail closed without calling the upload controller', async () => {
  PresignRequestWindow.findOneAndUpdate = () => ({ lean: async () => { throw new Error('Database unavailable'); } });
  const res = response();
  let called = false;
  await presignedUploadLimiter(request(), res, () => { called = true; });
  assert.equal(res.statusCode, 503);
  assert.equal(called, false);
});

test('unauthenticated requests never increment upload counters', async () => {
  const res = response();
  let called = false;
  await presignedUploadLimiter({}, res, () => { called = true; });
  assert.equal(res.statusCode, 401);
  assert.equal(called, false);
  assert.equal(windows.size, 0);
});
