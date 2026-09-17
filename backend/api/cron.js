import crypto from 'crypto';
import { connectDB } from '../config/db.js';
import Info from '../models/info.model.js';

export default async function handler(req, res) {
  // Security Check: Ensure only Vercel's Cron scheduler can trigger this route
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || typeof cronSecret !== 'string' || cronSecret.trim().length === 0) {
    console.error("Cron Error: CRON_SECRET environment variable is not configured.");
    return res.status(500).json({ success: false, message: 'Server configuration error' });
  }

  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const providedToken = authHeader.slice(7);
  const providedBuffer = Buffer.from(providedToken);
  const expectedBuffer = Buffer.from(cronSecret);

  if (
    providedBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(providedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await connectDB();
    
    // Logic: Delete expired notes and legacy temporary notes older than 30 days
    const now = new Date();
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Info.deleteMany({
      $or: [
        { expiresAt: { $ne: null, $lte: now } },
        { isTemporary: true, expiresAt: null, createdAt: { $lt: thirtyDaysAgo } }
      ]
    });

    console.log(`Cron execution successful. Scrubbed ${result.deletedCount} records.`);
    return res.status(200).json({ success: true, deletedCount: result.deletedCount });
    
  } catch (error) {
    console.error("Cron Job Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
