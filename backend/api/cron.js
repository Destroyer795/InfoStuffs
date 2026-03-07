import { connectDB } from '../config/db.js';
import Info from '../models/info.model.js';

export default async function handler(req, res) {
  // Security Check: Ensure only Vercel's Cron scheduler can trigger this route
  const authHeader = req.headers['authorization'];
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  try {
    await connectDB();
    
    // Logic: Delete notes older than 30 days marked as temporary
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const result = await Info.deleteMany({ 
      createdAt: { $lt: thirtyDaysAgo },
      isTemporary: true 
    });

    console.log(`Cron execution successful. Scrubbed ${result.deletedCount} records.`);
    return res.status(200).json({ success: true, deletedCount: result.deletedCount });
    
  } catch (error) {
    console.error("Cron Job Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
}
