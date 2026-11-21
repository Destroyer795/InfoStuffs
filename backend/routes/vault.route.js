import express from 'express';
import { requireAuth } from '../middleware/requireAuth.js';
import { getVaults, createVault, recoverLegacyNotes } from '../controller/vault.controller.js';

const router = express.Router();
router.use(requireAuth);
router.get('/', getVaults);
router.post('/', createVault);
router.post('/:id/adopt-legacy', recoverLegacyNotes);
export default router;
