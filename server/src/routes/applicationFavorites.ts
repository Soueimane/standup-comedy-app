import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import {
  addApplicationFavorite,
  removeApplicationFavorite,
  getApplicationFavorites,
  checkIsApplicationFavorite
} from '../controllers/applicationFavorites';

const router = express.Router();

// ============================================================================
// PROTECTED ROUTES - ORGANIZER ONLY
// ============================================================================

/**
 * POST /
 * Ajoute une candidature aux favoris de l'organisateur
 * Body: { applicationId: string }
 * Response: { message: string, favoriteApplications: ObjectId[] }
 */
router.post('/', authMiddleware, authorizeRoles('ORGANIZER'), addApplicationFavorite);

/**
 * DELETE /:applicationId
 * Retire une candidature des favoris de l'organisateur
 * Params: applicationId
 * Response: { message: string, favoriteApplications: ObjectId[] }
 */
router.delete('/:applicationId', authMiddleware, authorizeRoles('ORGANIZER'), removeApplicationFavorite);

/**
 * GET /
 * Récupère la liste des candidatures favorites de l'organisateur
 * Response: { favorites: Application[] }
 */
router.get('/', authMiddleware, authorizeRoles('ORGANIZER'), getApplicationFavorites);

/**
 * GET /check/:applicationId
 * Vérifie si une candidature est dans les favoris de l'organisateur
 * Params: applicationId
 * Response: { isFavorite: boolean }
 */
router.get('/check/:applicationId', authMiddleware, authorizeRoles('ORGANIZER'), checkIsApplicationFavorite);

export default router;

