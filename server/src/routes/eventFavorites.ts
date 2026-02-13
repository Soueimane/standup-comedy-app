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
 * Ajoute un évènement aux favoris du comédien
 * Body: { eventId: string }
 * Response: { message: string, favoriteEvents: ObjectId[] }
 */
router.post('/', authMiddleware, authorizeRoles('COMEDIAN', 'SPECTATOR'), addEventFavorite);

/**
 * DELETE /:eventId
 * Retire un évènement des favoris du comédien
 * Params: eventId
 * Response: { message: string, favoriteEvents: ObjectId[] }
 */
router.delete('/:eventId', authMiddleware, authorizeRoles('COMEDIAN', 'SPECTATOR'), removeEventFavorite);

/**
 * GET /
 * Récupère la liste des évènements favoris du comédien
 * Response: { favorites: Event[] }
 */
router.get('/', authMiddleware, authorizeRoles('COMEDIAN', 'SPECTATOR'), getEventFavorites);

/**
 * GET /check/:eventId
 * Vérifie si un évènement est dans les favoris du comédien
 * Params: eventId
 * Response: { isFavorite: boolean }
 */
router.get('/check/:eventId', authMiddleware, authorizeRoles('COMEDIAN', 'SPECTATOR'), checkIsEventFavorite);

export default router;
