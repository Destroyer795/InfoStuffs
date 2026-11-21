import mongoose from 'mongoose';

const envelopeSchema = new mongoose.Schema({
  iv: { type: String, required: true },
  ciphertext: { type: String, required: true },
}, { _id: false });

// Only encrypted names and authenticated, password-wrapped data keys leave the browser.
const vaultSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  userId: { type: String, required: true, index: true },
  version: { type: Number, required: true, enum: [1] },
  kdf: {
    name: { type: String, required: true, enum: ['PBKDF2'] },
    hash: { type: String, required: true, enum: ['SHA-256'] },
    iterations: { type: Number, required: true, enum: [600000] },
    salt: { type: String, required: true },
  },
  wrappedKey: { type: envelopeSchema, required: true },
  encryptedName: { type: envelopeSchema, required: true },
}, { timestamps: true });

export default mongoose.model('Vault', vaultSchema);
