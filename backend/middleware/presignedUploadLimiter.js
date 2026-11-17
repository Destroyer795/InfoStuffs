import PresignRequestWindow from '../models/presignRequestWindow.model.js';

export const PRESIGN_REQUEST_LIMIT = 15;
export const PRESIGN_REQUEST_WINDOW_MS = 60_000;

export const presignedUploadLimiter = async (req, res, next) => {
  const userId = req.auth?.userId;
  if (!userId) return res.status(401).json({ success: false, message: 'Authentication required.' });
  const now = Date.now();
  const windowStart = Math.floor(now / PRESIGN_REQUEST_WINDOW_MS) * PRESIGN_REQUEST_WINDOW_MS;
  const expiresAt = new Date(windowStart + PRESIGN_REQUEST_WINDOW_MS);
  const filter = { _id: `${userId}:${windowStart}` };
  const update = { $inc: { count: 1 }, $setOnInsert: { expiresAt } };
  const increment = () => PresignRequestWindow.findOneAndUpdate(filter, update, {
    upsert: true, returnDocument: 'after',
  }).lean();
  try {
    let window;
    try {
      window = await increment();
    } catch (error) {
      if (error.code !== 11000) throw error;
      // Another instance may have inserted this user's first request in the same window.
      window = await increment();
    }
    if (!window) throw new Error('Upload rate counter was not returned');
    if (window.count > PRESIGN_REQUEST_LIMIT) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((expiresAt.getTime() - Date.now()) / 1000))));
      return res.status(429).json({ success: false, message: 'Too many upload requests. Please try again in a minute.' });
    }
  } catch (error) {
    console.error('[R2] Upload rate limit check failed:', error.message);
    return res.status(503).json({ success: false, message: 'Upload requests are temporarily unavailable. Please try again.' });
  }
  return next();
};
