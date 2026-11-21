import Vault from '../models/vault.model.js';
import { StorageError, withStorageLock } from '../services/storage.js';
import { validateVaultMetadata, publicVault, requireOwnedVault, validateLegacyIds, adoptLegacyNotes } from '../services/vaults.js';

const fail = (res, error) => {
  const status = error.status || 500;
  if (status === 500) console.error('[Vault] Operation failed:', error.message);
  return res.status(status).json({ success: false, message: status === 500 ? 'Unable to save encrypted vault metadata. Please retry.' : error.message });
};

export const getVaults = async (req, res) => {
  try {
    const vaults = await Vault.find({ userId: req.auth.userId }).sort({ createdAt: 1 }).lean();
    return res.json({ success: true, data: vaults.map(publicVault) });
  } catch (error) { return fail(res, error); }
};

export const createVault = async (req, res) => {
  try {
    const metadata = validateVaultMetadata(req.body);
    const userId = req.auth.userId;
    const vault = await withStorageLock(`user:${userId}`, async () => {
      const ids = await validateLegacyIds(userId, metadata._id, req.body.legacyInfoIds);
      const existing = await Vault.findById(metadata._id).lean();
      if (existing) {
        if (existing.userId !== userId || JSON.stringify(publicVault(existing)) !== JSON.stringify(publicVault(metadata))) {
          throw new StorageError(409, 'Vault ID already exists.');
        }
      } else {
        if (await Vault.countDocuments({ userId }) >= 20) throw new StorageError(400, 'You can create up to 20 vaults.');
        // Persist the wrapped key first, so interrupted recovery never strands existing notes.
        await Vault.create({ ...metadata, userId });
      }
      await adoptLegacyNotes(userId, metadata._id, ids);
      return metadata;
    });
    return res.status(201).json({ success: true, data: publicVault(vault) });
  } catch (error) { return fail(res, error); }
};

export const recoverLegacyNotes = async (req, res) => {
  try {
    const userId = req.auth.userId;
    await withStorageLock(`user:${userId}`, async () => {
      await requireOwnedVault(userId, req.params.id);
      const ids = await validateLegacyIds(userId, req.params.id, req.body.legacyInfoIds);
      await adoptLegacyNotes(userId, req.params.id, ids);
    });
    return res.json({ success: true });
  } catch (error) { return fail(res, error); }
};
