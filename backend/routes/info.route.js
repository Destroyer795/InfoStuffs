import express from 'express';
import rateLimit from 'express-rate-limit';
import { createInfo, deleteInfo, getInfos, updateInfo, deleteAllInfos } from '../controller/info.controller.js';
import { requireAuth } from '../middleware/requireAuth.js';

const router = express.Router();

// Strict rate limiter for destructive vault reset (max 5 requests per hour)
const nukeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Vault reset limit exceeded. Please wait before trying again.' }
});

router.use(requireAuth);

router.get('/', getInfos);
router.post('/', createInfo);
router.delete('/nuke', nukeLimiter, deleteAllInfos);
router.patch('/:id', updateInfo);
router.delete('/:id', deleteInfo);

export default router;
