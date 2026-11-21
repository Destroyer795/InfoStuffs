import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Info from '../models/info.model.js';
import StorageObject from '../models/storageObject.model.js';
import { resolveWritableVault } from '../services/vaults.js';
import {
  MAX_FILE_BYTES, MAX_STORAGE_BYTES, MAX_PENDING_UPLOADS, MAX_PENDING_UPLOAD_BYTES,
  StorageError, isValidStoragePath, requireStorage, cleanupExpiredUserUploadReservations,
  withStorageQuotaLock, withStorageLock, getOwnedStorageObject, deleteStorageObject,
} from '../services/storage.js';

const handleError = (res, error) => {
  if (!(error instanceof StorageError)) console.error('[R2] File request failed:', error.message);
  return res.status(error.status || 500).json({
    success: false, message: error.status ? error.message : 'File storage request failed. Please try again.',
  });
};

const checkPendingUploadBudget = async (userId, byteSize, cleanupExpired = false) => {
  const getUsage = async () => {
    const usage = await StorageObject.aggregate([
      { $match: { userId, status: { $in: ['pending', 'deleting'] } } },
      { $group: { _id: null, count: { $sum: 1 }, total: { $sum: '$byteSize' } } },
    ]);
    return usage[0] || { count: 0, total: 0 };
  };
  const exceedsBudget = (usage) => usage.count >= MAX_PENDING_UPLOADS
    || usage.total + byteSize > MAX_PENDING_UPLOAD_BYTES;
  let usage = await getUsage();
  if (cleanupExpired && exceedsBudget(usage)) {
    // Cleanup happens before taking the global quota lock so R2 retries cannot stall other users.
    await cleanupExpiredUserUploadReservations(userId);
    usage = await getUsage();
  }
  if (exceedsBudget(usage)) {
    throw new StorageError(429, 'Pending uploads are limited to 3 files and 300MB per user. Finish your uploads or try again later.');
  }
};

export const getPresignedUploadUrl = async (req, res) => {
  const { storagePath, byteSize, contentType } = req.body || {};
  if (!isValidStoragePath(storagePath)) return res.status(400).json({ success: false, message: 'Invalid storage path.' });
  if (!Number.isSafeInteger(byteSize) || byteSize <= 0) {
    return res.status(400).json({ success: false, message: 'byteSize must be a positive integer.' });
  }
  if (byteSize > MAX_FILE_BYTES) {
    return res.status(400).json({ success: false, message: 'File exceeds maximum size limit of 100MB.' });
  }
  if (contentType !== 'application/octet-stream') {
    return res.status(400).json({ success: false, message: 'Encrypted files must use application/octet-stream.' });
  }
  try {
    const client = requireStorage();
    const uploadUrl = await withStorageLock(`user:${req.auth.userId}`, async () => {
      const vaultId = await resolveWritableVault(req.auth.userId, req.body.vaultId);
      await checkPendingUploadBudget(req.auth.userId, byteSize, true);
      return withStorageQuotaLock(async () => {
        await checkPendingUploadBudget(req.auth.userId, byteSize);
        const totalUsage = await Info.aggregate([{ $group: { _id: null, total: { $sum: '$byteSize' } } }]);
        const objectUsage = await StorageObject.aggregate([{ $group: { _id: null, total: { $sum: '$byteSize' } } }]);
        // The object ledger also covers migration files, outstanding PUT URLs and abandoned uploads.
        const currentTotal = Math.max(totalUsage[0]?.total || 0, objectUsage[0]?.total || 0);
        if (currentTotal + byteSize > MAX_STORAGE_BYTES) {
          throw new StorageError(403, 'Storage quota exceeded (9GB global limit reached). Vault is full.');
        }
        if (await StorageObject.exists({ _id: storagePath })) {
          throw new StorageError(409, 'This storage path already exists. Choose a new opaque path.');
        }
        const signingDate = new Date();
        await StorageObject.create({
          _id: storagePath, userId: req.auth.userId, vaultId, byteSize, status: 'pending',
          uploadExpiresAt: new Date(signingDate.getTime() + 900_000),
        });
        try {
          return await getSignedUrl(client, new PutObjectCommand({
            Bucket: process.env.R2_BUCKET_NAME, Key: storagePath,
            ContentLength: byteSize, ContentType: contentType, IfNoneMatch: '*',
          }), { expiresIn: 900, signingDate, signableHeaders: new Set(['content-type', 'content-length', 'if-none-match']) });
        } catch (error) {
          await StorageObject.deleteOne({ _id: storagePath, userId: req.auth.userId });
          throw error;
        }
      });
    });
    return res.status(200).json({ success: true, uploadUrl, storagePath });
  } catch (error) {
    return handleError(res, error);
  }
};

export const getPresignedDownloadUrl = async (req, res) => {
  const storagePath = req.body?.storagePath ?? req.query?.storagePath;
  if (!isValidStoragePath(storagePath)) return res.status(400).json({ success: false, message: 'Invalid storage path.' });
  try {
    const client = requireStorage();
    await getOwnedStorageObject(storagePath, req.auth.userId);
    const downloadUrl = await getSignedUrl(client, new GetObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME, Key: storagePath,
    }), { expiresIn: 3600 });
    return res.status(200).json({ success: true, downloadUrl });
  } catch (error) {
    return handleError(res, error);
  }
};

export const deleteFileFromStorage = async (req, res) => {
  const storagePath = req.body?.storagePath;
  if (!isValidStoragePath(storagePath)) return res.status(400).json({ success: false, message: 'Invalid storage path.' });
  try {
    requireStorage();
    await withStorageLock(`user:${req.auth.userId}`, async () => {
      await getOwnedStorageObject(storagePath, req.auth.userId);
      await deleteStorageObject(storagePath, req.auth.userId);
    });
    return res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    return handleError(res, error);
  }
};
