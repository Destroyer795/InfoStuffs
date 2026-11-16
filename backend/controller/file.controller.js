import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import Info from '../models/info.model.js';
import StorageObject from '../models/storageObject.model.js';
import {
  MAX_FILE_BYTES, MAX_STORAGE_BYTES, StorageError, isValidStoragePath, requireStorage,
  withStorageQuotaLock, getOwnedStorageObject, deleteStorageObject,
} from '../services/storage.js';

const handleError = (res, error) => {
  if (!(error instanceof StorageError)) console.error('[R2] File request failed:', error.message);
  return res.status(error.status || 500).json({
    success: false, message: error.status ? error.message : 'File storage request failed. Please try again.',
  });
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
    const uploadUrl = await withStorageQuotaLock(async () => {
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
      await StorageObject.create({
        _id: storagePath, userId: req.auth.userId, byteSize, status: 'pending',
        uploadExpiresAt: new Date(Date.now() + 900_000),
      });
      try {
        return await getSignedUrl(client, new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME, Key: storagePath,
          ContentLength: byteSize, ContentType: contentType, IfNoneMatch: '*',
        }), { expiresIn: 900, signableHeaders: new Set(['content-type', 'content-length', 'if-none-match']) });
      } catch (error) {
        await StorageObject.deleteOne({ _id: storagePath, userId: req.auth.userId });
        throw error;
      }
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
    await getOwnedStorageObject(storagePath, req.auth.userId);
    await deleteStorageObject(storagePath, req.auth.userId);
    return res.status(200).json({ success: true, message: 'File deleted successfully' });
  } catch (error) {
    return handleError(res, error);
  }
};
