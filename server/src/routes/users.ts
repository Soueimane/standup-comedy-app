import express from 'express';
import { cleanupDeactivatedAccountsCron } from '../controllers/users';

const router = express.Router();

/**
 * POST /api/users/jobs/cleanup-deactivated
 * Cron job pour supprimer les comptes désactivés depuis plus de 30 jours (RGPD)
 * Protégé par X-CRON-KEY header
 */
router.post('/jobs/cleanup-deactivated', cleanupDeactivatedAccountsCron);

export default router;
