import mongoose from 'mongoose';

const presignRequestWindowSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  count: { type: Number, required: true, min: 0 },
  expiresAt: { type: Date, required: true },
});

// These counters may expire automatically. Storage reservations have a separate lifecycle.
presignRequestWindowSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.model('PresignRequestWindow', presignRequestWindowSchema);
