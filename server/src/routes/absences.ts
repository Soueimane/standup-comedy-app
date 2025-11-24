import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { markAbsence, deleteAbsence, getEventAbsences, getComedianAbsences, syncAbsences } from '../controllers/absence';

const router = express.Router();

// Async handler wrapper
const asyncHandler = (fn: (req: Request | AuthRequest, res: Response) => Promise<any>) => {
  return (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
};

// ============================================================================
// ROUTES POUR LA GESTION DES ABSENCES
// ============================================================================

/**
 * POST /
 * Marque un participant comme absent (protégée - organisateur seulement)
 * Body: { eventId, comedianId, reason? }
 */
router.post('/', authMiddleware, asyncHandler(markAbsence));

/**
 * DELETE /:eventId/:comedianId
 * Annule une absence (protégée - organisateur seulement)
 */
router.delete('/:eventId/:comedianId', authMiddleware, asyncHandler(deleteAbsence));

/**
 * GET /event/:eventId
 * Récupère les absences d'un événement (protégée - organisateur seulement)
 */
router.get('/event/:eventId', authMiddleware, asyncHandler(getEventAbsences));

/**
 * GET /comedian/:comedianId
 * Récupère les absences d'un humoriste avec filtrage par rôle
 */
router.get('/comedian/:comedianId', authMiddleware, asyncHandler(getComedianAbsences));

/**
 * POST /sync-absences
 * Synchronise les compteurs d'absences de tous les humoristes (SUPER_ADMIN uniquement)
 */
router.post('/sync-absences', authMiddleware, asyncHandler(syncAbsences));

export default router; 