import express from 'express';
import {
  createComedianReport,
  getComedianReports,
  getComedianReport,
  updateComedianReport,
  checkComedianReport
} from '../controllers/comedianReport';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * POST /api/comedian-reports
 * Créer un signalement d'un humoriste (Organisateur uniquement)
 */
router.post('/', authMiddleware, createComedianReport);

/**
 * GET /api/comedian-reports
 * Récupérer tous les signalements (Super Admin uniquement)
 */
router.get('/', authMiddleware, getComedianReports);

/**
 * GET /api/comedian-reports/comedian/:comedianId
 * Vérifier si un humoriste a déjà été signalé par l'organisateur actuel
 */
router.get('/comedian/:comedianId', authMiddleware, checkComedianReport);

/**
 * GET /api/comedian-reports/:reportId
 * Récupérer un signalement spécifique (Super Admin uniquement)
 */
router.get('/:reportId', authMiddleware, getComedianReport);

/**
 * PATCH /api/comedian-reports/:reportId
 * Mettre à jour le statut d'un signalement (Super Admin uniquement)
 */
router.patch('/:reportId', authMiddleware, updateComedianReport);

export default router;

