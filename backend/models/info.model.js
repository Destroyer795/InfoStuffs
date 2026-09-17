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
});

// MongoDB TTL Index: automatically purge documents when expiresAt timestamp is reached
infoSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const Info = mongoose.model('Info', infoSchema);
export default Info;
