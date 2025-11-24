import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import {
  addFavorite,
  removeFavorite,
  getFavorites,
  checkIsFavorite
} from '../controllers/favorite';

const router = express.Router();

// ============================================================================
// PROTECTED ROUTES - ORGANIZER ONLY
// ============================================================================

/**
 * POST /
 * Ajoute un humoriste aux favoris de l'organisateur
 * Body: { comedianId: string }
 * Response: { message: string, favoriteComedians: ObjectId[] }
 */
router.post('/', authMiddleware, authorizeRoles('ORGANIZER'), addFavorite);

/**
 * DELETE /:comedianId
 * Retire un humoriste des favoris de l'organisateur
 * Params: comedianId
 * Response: { message: string, favoriteComedians: ObjectId[] }
 */
router.delete('/:comedianId', authMiddleware, authorizeRoles('ORGANIZER'), removeFavorite);

/**
 * GET /
 * Récupère la liste des humoristes favoris de l'organisateur
 * Response: { favorites: User[] }
 */
router.get('/', authMiddleware, authorizeRoles('ORGANIZER'), getFavorites);

/**
 * GET /check/:comedianId
 * Vérifie si un humoriste est dans les favoris de l'organisateur
 * Params: comedianId
 * Response: { isFavorite: boolean }
 */
router.get('/check/:comedianId', authMiddleware, authorizeRoles('ORGANIZER'), checkIsFavorite);

export default router;
