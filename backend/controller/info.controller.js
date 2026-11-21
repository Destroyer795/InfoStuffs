import mongoose from 'mongoose';
import Info from '../models/info.model.js';
import StorageObject from '../models/storageObject.model.js';
import Vault from '../models/vault.model.js';
import { requireOwnedVault, resolveWritableVault, assertInfoVault } from '../services/vaults.js';
import {
  StorageError, assertAttachmentMapping, getInfoStoragePaths, prepareInfoAttachments,
  deleteInfoAttachments, deleteStorageObject, withStorageLock,
} from '../services/storage.js';

const pickAllowedInfoFields = (body = {}) => {
  const allowedFields = ['name', 'content', 'category', 'importance', 'type', 'file', 'imageURL', 'byteSize', 'storagePaths', 'isTemporary', 'expiresAt'];
  return Object.fromEntries(allowedFields.filter((field) => body[field] !== undefined).map((field) => [field, body[field]]));
};

const validateInfo = (info, validateExpiration = true) => {
  if (!info.name || !info.category || !info.importance || !info.type) throw new StorageError(400, 'Missing base fields');
  if (!['text', 'image', 'file'].includes(info.type)) throw new StorageError(400, 'Invalid note type');
  if (info.byteSize !== undefined && (!Number.isSafeInteger(info.byteSize) || info.byteSize < 0)) {
    throw new StorageError(400, 'byteSize must be a non-negative integer');
  }
  if (info.type === 'text' && !info.content) throw new StorageError(400, 'Text content is required');
  if (info.type === 'image' && !info.imageURL) throw new StorageError(400, 'Image URL is required');
  if (info.type === 'file' && !info.file) throw new StorageError(400, 'File URL is required');
  if (info.type !== 'image') info.imageURL = '';
  if (info.type !== 'file') info.file = '';
  if (!info.isTemporary) {
    info.expiresAt = null;
  } else if (validateExpiration) {
    if (!info.expiresAt) throw new StorageError(400, 'Expiration date is required for temporary notes');
    const expiresAt = new Date(info.expiresAt);
    if (isNaN(expiresAt.getTime())) throw new StorageError(400, 'Invalid expiration date format');
    if (expiresAt.getTime() <= Date.now() + 30_000) {
      throw new StorageError(400, 'Expiration date must be at least 30 seconds in the future');
    }
  }
};

const handleError = (res, error, operation) => {
  const status = error.status || (error.name === 'ValidationError' ? 400 : 500);
  if (status === 500) console.error(`Error ${operation}:`, error.message);
  return res.status(status).json({ success: false, message: status === 500 ? 'Server error' : error.message });
};

const markAttachmentsReady = async (info) => {
  try {
    await StorageObject.updateMany({ _id: { $in: getInfoStoragePaths(info) }, userId: info.userId }, { $set: { status: 'ready' } });
  } catch (error) {
    console.error('[R2] Attachment status update deferred:', error.message);
  }
};

export const getInfos = async (req, res) => {
  try {
    const vaultId = req.query?.vaultId !== undefined ? await requireOwnedVault(req.auth.userId, req.query.vaultId) : null;
    const infos = await Info.find({ userId: req.auth.userId, vaultId }).sort({ createdAt: -1 });
    return res.status(200).json({ success: true, data: infos });
  } catch (error) {
    return handleError(res, error, 'fetching infos');
  }
};

export const createInfo = async (req, res) => {
  try {
    const info = { ...pickAllowedInfoFields(req.body), userId: req.auth.userId };
    validateInfo(info);
    const newInfo = await withStorageLock(`user:${info.userId}`, async () => {
      info.vaultId = await resolveWritableVault(info.userId, req.body.vaultId);
      const attachments = await prepareInfoAttachments(info, info.storagePaths, info.userId);
      if (info.byteSize !== undefined && info.byteSize !== attachments.byteSize) {
        throw new StorageError(400, 'byteSize does not match the uploaded ciphertext.');
      }
      const document = new Info({ ...info, ...attachments });
      await document.save();
      await markAttachmentsReady(document);
      return document;
    });
    return res.status(201).json({ success: true, data: newInfo });
  } catch (error) {
    return handleError(res, error, 'creating info');
  }
};

export const updateInfo = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID format' });
  const userId = req.auth.userId;
  try {
    const updatedInfo = await withStorageLock(`user:${userId}`, () => withStorageLock(`note:${id}`, async () => {
      const existing = await Info.findOne({ _id: id, userId }).lean();
      if (!existing) throw new StorageError(404, 'Info not found or you do not have permission to update it');
      await assertInfoVault(userId, existing, req.body.vaultId);
      const updates = pickAllowedInfoFields(req.body);
      const info = { ...existing, ...updates };
      validateInfo(info, updates.isTemporary !== undefined || updates.expiresAt !== undefined);
      const replacingAttachment = ['file', 'imageURL', 'type'].some((field) => updates[field] !== undefined && updates[field] !== existing[field]);
      if (replacingAttachment) assertAttachmentMapping(existing);
      const attachments = await prepareInfoAttachments(info,
        updates.storagePaths ?? (info.type === 'text' ? [] : undefined), userId, existing);
      if (updates.byteSize !== undefined && updates.byteSize !== attachments.byteSize) {
        throw new StorageError(400, 'byteSize does not match the uploaded ciphertext.');
      }
      const document = await Info.findOneAndUpdate({ _id: id, userId }, {
        ...pickAllowedInfoFields(info), ...attachments,
      }, { new: true, runValidators: true });
      if (!document) throw new StorageError(404, 'Info not found');
      await markAttachmentsReady(document);
      // Commit the new reference before removing the old ciphertext, so failed uploads cannot destroy it.
      for (const path of getInfoStoragePaths(existing).filter((path) => !attachments.storagePaths.includes(path))) {
        try {
          await StorageObject.updateOne({ _id: path, userId }, { $set: { status: 'ready' } });
          await deleteStorageObject(path, userId);
        } catch (error) {
          console.error('[R2] Replaced attachment retained for cleanup retry:', path, error.message);
        }
      }
      return document;
    }));
    return res.status(200).json({ success: true, data: updatedInfo });
  } catch (error) {
    return handleError(res, error, 'updating info');
  }
};

export const deleteInfo = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ success: false, message: 'Invalid ID format' });
  const userId = req.auth.userId;
  try {
    await withStorageLock(`user:${userId}`, () => withStorageLock(`note:${id}`, async () => {
      const info = await Info.findOne({ _id: id, userId }).lean();
      if (!info) throw new StorageError(404, 'Info not found or you do not have permission to delete it');
      await assertInfoVault(userId, info, req.query?.vaultId);
      await deleteInfoAttachments(info);
      await Info.deleteOne({ _id: id, userId });
    }));
    return res.status(200).json({ success: true, message: 'Info deleted successfully' });
  } catch (error) {
    return handleError(res, error, 'deleting info');
  }
};

export const deleteAllInfos = async (req, res) => {
  const userId = req.auth.userId;
  try {
    await withStorageLock(`user:${userId}`, async () => {
      const infos = await Info.find({ userId }).lean();
      // Preflight every legacy mapping before carrying out the destructive reset.
      infos.forEach(assertAttachmentMapping);
      for (const info of infos) {
        await withStorageLock(`note:${info._id}`, async () => {
          const current = await Info.findOne({ _id: info._id, userId }).lean();
          if (!current) return;
          await deleteInfoAttachments(current);
          await Info.deleteOne({ _id: current._id, userId });
        });
      }
      const remainingObjects = await StorageObject.find({ userId }).lean();
      for (const object of remainingObjects) await deleteStorageObject(object._id, userId);
      await Vault.deleteMany({ userId });
    });
    return res.status(200).json({ success: true, message: 'Vault reset successfully.' });
  } catch (error) {
    return handleError(res, error, 'resetting vault');
  }
};
