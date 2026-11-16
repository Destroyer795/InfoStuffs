import 'dotenv/config';
import { S3Client } from '@aws-sdk/client-s3';

const requiredVariables = ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY', 'R2_BUCKET_NAME'];
const missingVariables = requiredVariables.filter((name) => !process.env[name]?.trim());

if (missingVariables.length) {
  console.warn(`[R2] Storage disabled. Missing environment variables: ${missingVariables.join(', ')}`);
}

export const createR2Client = (overrides = {}) => missingVariables.length ? null : new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  maxAttempts: 2,
  requestHandler: { connectionTimeout: 5000, requestTimeout: 10_000, throwOnRequestTimeout: true },
  ...overrides,
});

export const r2 = createR2Client();
export default r2;
