import mongoose from 'mongoose';
import Vault from '../models/vault.model.js';
import Info from '../models/info.model.js';
import { StorageError } from './storage.js';

export const VAULT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validBase64 = (value, minimum, maximum = minimum) => {
  if (typeof value !== 'string' || value.length > Math.ceil(maximum / 3) * 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(value)) return false;
  const bytes = Buffer.from(value, 'base64');
  return bytes.length >= minimum && bytes.length <= maximum && bytes.toString('base64') === value;
};

export const validateVaultMetadata = (body = {}) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new StorageError(400, 'Invalid encrypted vault metadata.');
  const { id, version, kdf, wrappedKey, encryptedName } = body;
  if (typeof id !== 'string' || !VAULT_ID_PATTERN.test(id) || version !== 1 || kdf?.name !== 'PBKDF2' ||
      kdf.hash !== 'SHA-256' || kdf.iterations !== 600000 || !validBase64(kdf.salt, 32) ||
      !validBase64(wrappedKey?.iv, 12) || !validBase64(wrappedKey?.ciphertext, 48) ||
      !validBase64(encryptedName?.iv, 12) || !validBase64(encryptedName?.ciphertext, 17, 496)) {
    throw new StorageError(400, 'Invalid encrypted vault metadata.');
  }
  // Explicit projection prevents accidental storage of passwords or raw keys.
  return { _id: id, version, kdf: { name: kdf.name, hash: kdf.hash, iterations: kdf.iterations, salt: kdf.salt },
    wrappedKey: { iv: wrappedKey.iv, ciphertext: wrappedKey.ciphertext },
    encryptedName: { iv: encryptedName.iv, ciphertext: encryptedName.ciphertext } };
};

export const publicVault = (vault) => ({ id: vault._id, version: vault.version,
  kdf: { name: vault.kdf.name, hash: vault.kdf.hash, iterations: vault.kdf.iterations, salt: vault.kdf.salt },
  wrappedKey: { iv: vault.wrappedKey.iv, ciphertext: vault.wrappedKey.ciphertext },
  encryptedName: { iv: vault.encryptedName.iv, ciphertext: vault.encryptedName.ciphertext } });

export const requireOwnedVault = async (userId, vaultId) => {
  if (typeof vaultId !== 'string' || !VAULT_ID_PATTERN.test(vaultId)) throw new StorageError(400, 'Invalid vault ID.');
  if (!await Vault.exists({ _id: vaultId, userId })) throw new StorageError(404, 'Vault not found.');
  return vaultId;
};

export const resolveWritableVault = async (userId, vaultId) => {
  if (vaultId != null) return requireOwnedVault(userId, vaultId);
  if (await Vault.exists({ userId })) throw new StorageError(409, 'Unlock a vault before saving content.');
  return null;
};

export const assertInfoVault = async (userId, info, requestedVaultId) => {
  if (info.vaultId) {
    if (requestedVaultId !== info.vaultId) throw new StorageError(409, 'The note belongs to a different vault.');
    await requireOwnedVault(userId, requestedVaultId);
  } else {
    if (requestedVaultId != null) throw new StorageError(409, 'Recover this legacy note before editing it.');
    await resolveWritableVault(userId, null);
  }
};

export const validateLegacyIds = async (userId, vaultId, ids = []) => {
  if (!Array.isArray(ids) || ids.length > 1000 || ids.some((id) => typeof id !== 'string' || !mongoose.Types.ObjectId.isValid(id))) {
    throw new StorageError(400, 'Invalid legacy note IDs. Recover up to 1000 notes at a time.');
  }
  const unique = [...new Set(ids)];
  if (unique.length) {
    const count = await Info.countDocuments({ _id: { $in: unique }, userId, $or: [{ vaultId: null }, { vaultId }] });
    if (count !== unique.length) throw new StorageError(409, 'Some legacy notes changed or belong to another vault. Refresh and try again.');
  }
  return unique;
};

export const adoptLegacyNotes = async (userId, vaultId, ids) => {
  if (!ids.length) return;
  // Ciphertext and attachment paths stay unchanged. Only the compartment association is added.
  await Info.updateMany({ _id: { $in: ids }, userId, vaultId: null }, { $set: { vaultId } });
};
