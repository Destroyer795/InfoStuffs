import { randomUUID } from 'node:crypto';
import { DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import r2 from '../config/r2.js';
import Info from '../models/info.model.js';
import StorageObject, { StorageLock } from '../models/storageObject.model.js';

export const MAX_FILE_BYTES = 100 * 1024 * 1024;
export const MAX_STORAGE_BYTES = 9 * 1024 * 1024 * 1024;
export const MAX_PENDING_UPLOADS = 3;
export const MAX_PENDING_UPLOAD_BYTES = 300 * 1024 * 1024;
export const STORAGE_PATH_PATTERN = /^(images|documents|uploads)\/[a-zA-Z0-9._-]+$/;

export class StorageError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const isValidStoragePath = (value) => typeof value === 'string'
  && value.length <= 1024 && STORAGE_PATH_PATTERN.test(value)
  && !['.', '..'].includes(value.split('/')[1]);

export const requireStorage = () => {
  if (!r2) throw new StorageError(503, 'File storage is not configured. Please try again later.');
  return r2;
};

export const withStorageLock = async (lockId, operation) => {
  const owner = randomUUID();
  try {
    await StorageLock.updateOne({ _id: lockId }, {
      $setOnInsert: { lockedUntil: new Date(0) },
    }, { upsert: true });
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  const lease = await StorageLock.findOneAndUpdate({
    _id: lockId, lockedUntil: { $lte: new Date() },
  }, { $set: { owner, lockedUntil: new Date(Date.now() + 120_000) } }, { new: true });
  if (!lease) throw new StorageError(503, 'Storage is busy. Please try again.');
  try {
    return await operation();
  } finally {
    try {
      await StorageLock.updateOne({ _id: lockId, owner }, { $set: { lockedUntil: new Date(0) } });
    } catch (error) {
      console.error('[R2] Storage lease release deferred until expiry:', error.message);
    }
  }
};

export const withStorageQuotaLock = (operation) => withStorageLock('uploads', operation);

export const getInfoStoragePaths = (info) => [...new Set([
  ...(info.storagePaths || []),
  ...[info.imageURL, info.file].filter(isValidStoragePath),
])];

export const assertAttachmentMapping = (info) => {
  const paths = getInfoStoragePaths(info);
  if ((info.imageURL || info.file) && !paths.length) {
    throw new StorageError(409, 'Unlock and sync this vault before deleting or replacing legacy attachments.');
  }
  return paths;
};

export const getOwnedStorageObject = async (storagePath, userId) => {
  const object = await StorageObject.findById(storagePath).lean();
  if (!object || object.userId !== userId || object.status === 'deleting') {
    throw new StorageError(404, 'File not found or you do not have permission to access it.');
  }
  return object;
};

// Legacy keys are secret capabilities obtained only after local path decryption.
// A user may associate an unclaimed migration object with their own existing note.
export const prepareInfoAttachments = async (info, requestedPaths, userId, existingInfo = null) => {
  const paths = requestedPaths === undefined ? getInfoStoragePaths(existingInfo || info) : requestedPaths;
  if (!Array.isArray(paths) || paths.length > 2 || paths.some((path) => !isValidStoragePath(path))) {
    throw new StorageError(400, 'Invalid attachment storage paths.');
  }
  const uniquePaths = [...new Set(paths)];
  if (!(info.imageURL || info.file)) {
    if (uniquePaths.length) throw new StorageError(400, 'Text notes cannot reference stored files.');
    return { storagePaths: [], byteSize: 0 };
  }
  if (!uniquePaths.length) throw new StorageError(400, 'Attachment storage paths are required.');
  const client = requireStorage();
  let byteSize = 0;
  for (const storagePath of uniquePaths) {
    let object = await StorageObject.findById(storagePath).lean();
    if (!object || object.status === 'deleting'
      || (object.userId !== userId && !(existingInfo && object.status === 'legacy' && !object.userId))) {
      throw new StorageError(403, 'You do not have permission to attach this file.');
    }
    if (object.status !== 'legacy' && object.uploadExpiresAt <= new Date()
      && !getInfoStoragePaths(existingInfo || {}).includes(storagePath)) {
      throw new StorageError(409, 'This upload expired before it was saved. Please upload the file again.');
    }
    const otherInfo = await Info.exists({
      storagePaths: storagePath,
      ...(existingInfo ? { _id: { $ne: existingInfo._id } } : {}),
    });
    if (otherInfo) throw new StorageError(409, 'This file is already attached to another note.');
    const head = await client.send(new HeadObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: storagePath }));
    if (!Number.isSafeInteger(head.ContentLength) || head.ContentLength < 0
      || (object.status === 'pending' && head.ContentLength !== object.byteSize)) {
      throw new StorageError(400, 'Uploaded ciphertext size does not match the reserved file size.');
    }
    object = await StorageObject.findOneAndUpdate({
      _id: storagePath, userId: object.userId, status: object.status,
    }, { $set: { userId, byteSize: head.ContentLength, status: object.status === 'legacy' ? 'legacy' : 'ready' } }, { new: true });
    if (!object) throw new StorageError(409, 'File ownership changed. Please sync the vault and retry.');
    byteSize += head.ContentLength;
  }
  return { storagePaths: uniquePaths, byteSize };
};

export const deleteStorageObject = async (storagePath, userId, excludedInfoIds = []) => {
  const client = requireStorage();
  const object = await StorageObject.findById(storagePath).lean();
  if (object && object.userId !== userId) throw new StorageError(403, 'You do not have permission to delete this file.');
  const reference = await Info.exists({
    $or: [{ storagePaths: storagePath }, { imageURL: storagePath }, { file: storagePath }],
    ...(excludedInfoIds.length ? { _id: { $nin: excludedInfoIds } } : {}),
  });
  if (reference) throw new StorageError(409, 'Delete or update the attached note to remove this file.');
  await client.send(new DeleteObjectCommand({ Bucket: process.env.R2_BUCKET_NAME, Key: storagePath }));
  // Retain the reservation while a previously issued PUT URL can still recreate the object.
  if (object?.uploadExpiresAt > new Date()) {
    await StorageObject.updateOne({ _id: storagePath, userId }, { $set: { status: 'deleting' } });
  } else {
    await StorageObject.deleteOne({ _id: storagePath, userId });
  }
};

export const deleteInfoAttachments = async (info, excludedInfoIds = [info._id]) => {
  for (const storagePath of assertAttachmentMapping(info)) {
    await deleteStorageObject(storagePath, info.userId, excludedInfoIds);
  }
};

// The caller holds the user's storage lock. Never discard reservations on expiry alone.
export const cleanupExpiredUserUploadReservations = async (userId) => {
  const objects = await StorageObject.find({
    userId, status: { $in: ['pending', 'deleting'] }, uploadExpiresAt: { $lte: new Date() },
  }).limit(MAX_PENDING_UPLOADS).lean();
  for (const object of objects) {
    try {
      await deleteStorageObject(object._id, userId);
    } catch (error) {
      console.error('[R2 Cleanup] Upload reservation retained for retry:', object._id, error.message);
    }
  }
};

export const cleanupUnreferencedUploads = async () => {
  if (!r2) return;
  const objects = await StorageObject.find({
    userId: { $ne: null }, status: { $ne: 'legacy' }, uploadExpiresAt: { $lte: new Date() },
  }).lean();
  for (const object of objects) {
    try {
      await withStorageLock(`user:${object.userId}`, async () => {
        if (!await Info.exists({ storagePaths: object._id })) {
          await deleteStorageObject(object._id, object.userId);
        }
      });
    } catch (error) {
      console.error('[R2 Cleanup] Object retained for retry:', object._id, error.message);
    }
  }
};
