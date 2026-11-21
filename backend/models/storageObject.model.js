import mongoose from 'mongoose';

// These are opaque object keys and ciphertext sizes, never encryption keys or filenames.
const storageObjectSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: String, default: null, index: true },
  vaultId: { type: String, default: null },
  byteSize: { type: Number, required: true, min: 0 },
  status: { type: String, enum: ['pending', 'ready', 'legacy', 'deleting'], required: true },
  uploadExpiresAt: { type: Date, default: () => new Date(0) },
}, { timestamps: true });

storageObjectSchema.index({ userId: 1, status: 1, uploadExpiresAt: 1 });

// A database lease serializes quota reservations across API processes and serverless instances.
const storageLockSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  owner: String,
  lockedUntil: { type: Date, required: true },
});

export const StorageLock = mongoose.model('StorageLock', storageLockSchema);
const StorageObject = mongoose.model('StorageObject', storageObjectSchema);
export default StorageObject;
