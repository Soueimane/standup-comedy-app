import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import {
  getRecommendations,
  getPreferences,
  updatePreferences
} from '../controllers/recommendations';

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
 * GET /preferences
 * Récupère les préférences de recommandation de l'humoriste connecté
 * Response: { enabled: boolean, priorities: RecommendationPriority[] }
 */
router.get('/preferences', authMiddleware, authorizeRoles('COMEDIAN'), getPreferences);

/**
 * PUT /preferences
 * Met à jour les préférences de recommandation de l'humoriste connecté
 * Body: { enabled?: boolean, priorities?: RecommendationPriority[] }
 * Response: { message: string, preferences: RecommendationPreferences }
 */
router.put('/preferences', authMiddleware, authorizeRoles('COMEDIAN'), updatePreferences);

export default router;
