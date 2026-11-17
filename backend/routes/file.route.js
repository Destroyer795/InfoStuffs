import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { presignedUploadLimiter } from '../middleware/presignedUploadLimiter.js';
import { getPresignedUploadUrl, getPresignedDownloadUrl, deleteFileFromStorage } from '../controller/file.controller.js';

const router = express.Router();
router.use(requireAuth);
router.post('/presigned-upload', presignedUploadLimiter, getPresignedUploadUrl);
router.post('/presigned-download', getPresignedDownloadUrl);
router.delete('/', deleteFileFromStorage);

export default router;
