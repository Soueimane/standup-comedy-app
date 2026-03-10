import express from 'express';
import {
  getPresenceAlerts,
  getComedianPresenceScore,
  acknowledgePresenceAlert,
  triggerPresenceCheck,
  cronCheckPresenceAlerts
} from '../controllers/presenceAlert';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/presence-alerts
 * Récupère toutes les alertes de présence active (Super Admin uniquement)
 */
router.get('/', authMiddleware, getPresenceAlerts);

/**
 * GET /api/presence-alerts/:comedianId
 * Récupère le score de présence d'un humoriste spécifique (Super Admin uniquement)
 */
router.get('/:comedianId', authMiddleware, getComedianPresenceScore);

/**
 * POST /api/presence-alerts/:alertId/acknowledge
 * Marque une alerte comme prise en compte (Super Admin uniquement)
 */
router.post('/:alertId/acknowledge', authMiddleware, acknowledgePresenceAlert);

/**
 * POST /api/presence-alerts/check
 * Déclenche manuellement la vérification des scores de présence (Super Admin uniquement)
 */
router.post('/check', authMiddleware, triggerPresenceCheck);

/**
 * POST /api/presence-alerts/jobs/check
 * Endpoint pour le cron job (protégé par CRON_SECRET)
 */
router.post('/jobs/check', cronCheckPresenceAlerts);

export default router;

