import 'dotenv/config';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';
import { createClient } from '@supabase/supabase-js';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import r2 from '../config/r2.js';
import Info from '../models/info.model.js';
import StorageObject from '../models/storageObject.model.js';
import { ensureNoteCleanupIndexes } from '../config/storageIndexes.js';

const SOURCE_BUCKET = 'infostuffsende';
const isMissingObject = (error) => error?.$metadata?.httpStatusCode === 404
  || error?.name === 'NoSuchKey' || error?.name === 'NotFound';

export async function* listStorageFiles(storage, prefix = '', pageSize = 1000) {
  for (let offset = 0; ; offset += pageSize) {
    const { data, error } = await storage.list(prefix, {
      limit: pageSize, offset, sortBy: { column: 'name', order: 'asc' },
    });
    if (error) throw new Error(`Cannot list source directory ${prefix || '/'}: ${error.message}`);
    if (!Array.isArray(data)) throw new Error(`Invalid source listing for ${prefix || '/'}`);
    for (const entry of data) {
      const filePath = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.id == null && entry.metadata == null) {
        yield* listStorageFiles(storage, filePath, pageSize);
      } else {
        yield filePath;
      }
    }
    if (data.length < pageSize) return;
  }
}

const digestBody = async (body) => {
  if (!body) throw new Error('Destination returned an empty response body');
  const hash = createHash('sha256');
  let byteSize = 0;
  for await (const chunk of body) {
    hash.update(chunk);
    byteSize += chunk.byteLength;
  }
  return { hash: hash.digest('hex'), byteSize };
};

const verifyDestination = async (s3, bucketName, filePath, expected) => {
  const result = await s3.send(new GetObjectCommand({ Bucket: bucketName, Key: filePath }));
  const actual = await digestBody(result.Body);
  if (actual.hash !== expected.hash || actual.byteSize !== expected.byteSize) {
    throw new Error('Destination ciphertext differs from source. Existing objects are never overwritten.');
  }
};

const backfillReferences = async (InfoModel, StorageModel, filePath, backfilledIds) => {
  const notes = await InfoModel.find({
    $or: [{ imageURL: filePath }, { file: filePath }, { storagePaths: filePath }],
  }).lean();
  const owners = [...new Set(notes.map((note) => note.userId))];
  const ledger = await StorageModel.findById(filePath).lean();
  if (owners.length > 1 || (ledger.userId && owners.some((userId) => userId !== ledger.userId))) {
    throw new Error('Conflicting note owners reference the same object. Ownership requires manual reconciliation.');
  }
  for (const note of notes) {
    const storagePaths = [...new Set([...(note.storagePaths || []), filePath])];
    const objects = await StorageModel.find({ _id: { $in: storagePaths } }).lean();
    const byteSize = objects.reduce((total, object) => total + object.byteSize, 0);
    const result = await InfoModel.updateOne({ _id: note._id, userId: note.userId }, {
      $set: { byteSize, storagePaths },
    });
    if (result.modifiedCount) backfilledIds.add(String(note._id));
  }
  if (owners.length === 1) {
    await StorageModel.updateOne({ _id: filePath, userId: ledger.userId }, {
      $set: { userId: owners[0], status: 'ready' },
    });
  }
};

export const migrateSupabaseToR2 = async ({
  supabase, s3, bucketName, InfoModel = Info, StorageModel = StorageObject, logger = console,
}) => {
  const summary = {
    filesMigrated: 0, existingFilesVerified: 0, bytesCopied: 0, totalBytesVerified: 0,
    recordsBackfilled: 0, legacyNotesPending: 0, failures: 0,
  };
  const backfilledIds = new Set();
  const source = supabase.storage.from(SOURCE_BUCKET);
  try {
    for await (const filePath of listStorageFiles(source)) {
      try {
        const { data: blob, error } = await source.download(filePath);
        if (error || !blob) throw new Error(`Source download failed: ${error?.message || 'Missing blob'}`);
        // Supabase returns one ciphertext Blob at a time. No passwords, decryption or re-encryption are involved.
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const expected = { hash: createHash('sha256').update(bytes).digest('hex'), byteSize: bytes.byteLength };
        let exists = true;
        try {
          await verifyDestination(s3, bucketName, filePath, expected);
        } catch (error) {
          if (!isMissingObject(error)) throw error;
          exists = false;
        }
        if (!exists) {
          try {
            await s3.send(new PutObjectCommand({
              Bucket: bucketName, Key: filePath, Body: bytes, ContentLength: expected.byteSize,
              ContentType: 'application/octet-stream', IfNoneMatch: '*',
            }));
          } catch (error) {
            // An interrupted or concurrent run may already have created this key. Verify it before accepting it.
            if (error?.$metadata?.httpStatusCode !== 412) throw error;
            exists = true;
          }
          await verifyDestination(s3, bucketName, filePath, expected);
        }
        if (exists) summary.existingFilesVerified++;
        else {
          summary.filesMigrated++;
          summary.bytesCopied += expected.byteSize;
        }
        summary.totalBytesVerified += expected.byteSize;
        // Unmatched encrypted references still count toward the global quota via this object ledger.
        await StorageModel.updateOne({ _id: filePath }, {
          $set: { byteSize: expected.byteSize },
          $setOnInsert: { userId: null, status: 'legacy', uploadExpiresAt: new Date(0) },
        }, { upsert: true });
        await backfillReferences(InfoModel, StorageModel, filePath, backfilledIds);
        logger.log(`[${exists ? 'Verified' : 'Migrated'}] ${filePath} (${expected.byteSize} bytes) -> Cloudflare R2`);
      } catch (error) {
        summary.failures++;
        logger.error(`[Failed] ${filePath}: ${error.message}`);
      }
    }
  } catch (error) {
    summary.failures++;
    logger.error(`[Listing failed] ${error.message}`);
  }
  summary.recordsBackfilled = backfilledIds.size;
  summary.legacyNotesPending = await InfoModel.countDocuments({
    $or: [
      { type: 'image', imageURL: { $exists: true, $nin: ['', null] } },
      { type: 'file', file: { $exists: true, $nin: ['', null] } },
    ],
    'storagePaths.0': { $exists: false },
  });
  logger.log(`Migration summary: ${JSON.stringify(summary)}`);
  if (summary.legacyNotesPending) {
    logger.warn(`${summary.legacyNotesPending} encrypted note references require a vault unlock to backfill ownership and note byteSize. All copied objects already count toward quota.`);
  }
  if (!summary.filesMigrated && !summary.existingFilesVerified && !summary.failures) {
    logger.warn('No source objects were found. Verify the bucket and service-role permissions before switching storage.');
  }
  return summary;
};

const main = async () => {
  if (process.argv.includes('--help')) {
    console.log('Usage: node backend/scripts/migrate-supabase-to-r2.mjs');
    console.log('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY), MONGO_URI, and all four R2 variables.');
    console.log('Pause application writes, back up MongoDB, and keep Supabase as a read-only backup.');
    console.log('Copies and SHA-256 verifies every ciphertext object with its original path. Never deletes source files or overwrites differing R2 objects.');
    return;
  }
  const required = ['SUPABASE_URL', 'MONGO_URI', 'R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
  const missing = required.filter((name) => !process.env[name]?.trim());
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
  if (!supabaseKey?.trim()) missing.push('SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY)');
  if (missing.length) throw new Error(`Missing migration environment variables: ${missing.join(', ')}`);
  const supabase = createClient(process.env.SUPABASE_URL, supabaseKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  try {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15_000 });
    await ensureNoteCleanupIndexes();
    const summary = await migrateSupabaseToR2({ supabase, s3: r2, bucketName: process.env.R2_BUCKET_NAME });
    if (summary.failures) process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
    r2?.destroy();
  }
};

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(`Migration failed: ${error.message}`);
    process.exitCode = 1;
  });
}
