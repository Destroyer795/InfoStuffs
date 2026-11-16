import Info from '../models/info.model.js';
import { cleanupUnreferencedUploads, deleteInfoAttachments, withStorageLock } from './storage.js';

export const expiredNoteFilter = (now = new Date()) => ({
  $or: [
    { expiresAt: { $ne: null, $lte: now } },
    { isTemporary: true, expiresAt: null, createdAt: { $lt: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000) } },
  ],
});

export const cleanupExpiredNotes = async () => {
  const notes = await Info.find(expiredNoteFilter()).lean();
  let deletedCount = 0;
  for (const note of notes) {
    try {
      await withStorageLock(`note:${note._id}`, async () => {
        const currentNote = await Info.findOne({ _id: note._id, ...expiredNoteFilter() }).lean();
        if (!currentNote) return;
        await deleteInfoAttachments(currentNote);
        const result = await Info.deleteOne({ _id: note._id, ...expiredNoteFilter() });
        deletedCount += result.deletedCount;
      });
    } catch (error) {
      // Keep the note and its accounting until storage deletion or legacy reconciliation succeeds.
      console.error('[Auto-Cleanup] Note retained for retry:', note._id, error.message);
    }
  }
  await cleanupUnreferencedUploads();
  return deletedCount;
};
