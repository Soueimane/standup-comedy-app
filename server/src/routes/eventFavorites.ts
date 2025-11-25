import express from 'express';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import {
  addEventFavorite,
  removeEventFavorite,
  getEventFavorites,
  checkIsEventFavorite
} from '../controllers/eventFavorites';

const router = express.Router();

// ============================================================================
// PROTECTED ROUTES - COMEDIAN ONLY
// ============================================================================

/**
 * POST /
 * Ajoute un événement aux favoris du comédien
 * Body: { eventId: string }
 * Response: { message: string, favoriteEvents: ObjectId[] }
 */
router.post('/', authMiddleware, authorizeRoles('COMEDIAN'), addEventFavorite);

/**
 * DELETE /:eventId
 * Retire un événement des favoris du comédien
 * Params: eventId
 * Response: { message: string, favoriteEvents: ObjectId[] }
 */
router.delete('/:eventId', authMiddleware, authorizeRoles('COMEDIAN'), removeEventFavorite);

/**
 * GET /
 * Récupère la liste des événements favoris du comédien
 * Response: { favorites: Event[] }
 */
router.get('/', authMiddleware, authorizeRoles('COMEDIAN'), getEventFavorites);

/**
 * GET /check/:eventId
 * Vérifie si un événement est dans les favoris du comédien
 * Params: eventId
 * Response: { isFavorite: boolean }
 */
router.get('/check/:eventId', authMiddleware, authorizeRoles('COMEDIAN'), checkIsEventFavorite);

export default router;
