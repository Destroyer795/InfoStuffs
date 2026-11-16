import Info from '../models/info.model.js';

export const ensureNoteCleanupIndexes = async () => {
  let indexes;
  try {
    indexes = await Info.collection.indexes();
  } catch (error) {
    if (error.code !== 26 && error.codeName !== 'NamespaceNotFound') throw error;
    indexes = [];
  }
  for (const index of indexes) {
    if (Object.keys(index.key).length === 1 && index.key.expiresAt === 1 && index.expireAfterSeconds !== undefined) {
      try {
        await Info.collection.dropIndex(index.name);
      } catch (error) {
        // Another server instance may already have removed the same obsolete TTL index.
        if (error.code !== 27 && error.codeName !== 'IndexNotFound') throw error;
      }
    }
  }
  await Info.collection.createIndex({ expiresAt: 1 });
};
