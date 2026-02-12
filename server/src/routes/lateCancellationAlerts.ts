import express from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  getLateCancellationAlerts,
  acknowledgeAlert,
  getComedianHistory
} from '../controllers/lateCancellationAlert';

const router = express.Router();

// GET /api/late-cancellation-alerts - Liste des alertes (Super Admin)
router.get('/', authMiddleware, getLateCancellationAlerts);

// POST /api/late-cancellation-alerts/:alertId/acknowledge - Acquitter une alerte (Super Admin)
router.post('/:alertId/acknowledge', authMiddleware, acknowledgeAlert);

// GET /api/late-cancellation-alerts/comedian/:comedianId - Historique d'un humoriste (Super Admin)
router.get('/comedian/:comedianId', authMiddleware, getComedianHistory);

export default router;
