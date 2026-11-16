import mongoose from 'mongoose';

const infoSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  content: {
    type: String,
  },
  category: {
    type: String,
    required: true,
  },
  importance: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },
  file: {
    type: String, // for file URLs
  },
  imageURL: {
    type: String, // for image URLs
  },
  byteSize: {
    type: Number,
    default: 0,
    min: 0,
    validate: { validator: Number.isSafeInteger, message: 'byteSize must be a non-negative integer' },
  },
  // Opaque ciphertext object keys allow cleanup without decrypting imageURL or file.
  storagePaths: {
    type: [String],
    default: undefined,
  },
  isTemporary: {
    type: Boolean,
    default: false,
  },
  expiresAt: {
    type: Date,
    default: null,
  }
}, {
  timestamps: true,
  autoIndex: false,
});

// Application cleanup must delete stored ciphertext before removing its note and accounting.
infoSchema.index({ expiresAt: 1 });

const Info = mongoose.model('Info', infoSchema);
export default Info;
