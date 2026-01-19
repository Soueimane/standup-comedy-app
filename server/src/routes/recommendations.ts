import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import { getRecommendations, getSmartRecommendations } from '../controllers/recommendations';

const router = express.Router();

// ============================================================================
// PROTECTED ROUTES - COMEDIAN ONLY
// ============================================================================

/**
 * GET /
 * Récupère les événements recommandés pour l'humoriste connecté
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 10, max 50)
 *   - minScore: number (default 0, 0-100)
 * Response: { recommendations: RecommendationResult[], total: number, page: number, limit: number }
 */
router.get('/', authMiddleware, authorizeRoles('COMEDIAN'), getRecommendations);

/**
 * GET /smart
 * Récupère les recommandations intelligentes basées sur l'historique
 *
 * Retourne les événements à venir qui correspondent à:
 * - Des événements avec le même nom que ceux auxquels l'utilisateur a déjà postulé/participé
 * - Des événements du même organisateur que ceux auxquels l'utilisateur a déjà postulé/participé
 *
 * Query params:
 *   - page: number (default 1)
 *   - limit: number (default 50, max 100)
 * Response: { recommendations: SmartRecommendation[], total: number, page: number, limit: number }
 */
router.get('/smart', authMiddleware, authorizeRoles('COMEDIAN'), getSmartRecommendations);

export default router;
