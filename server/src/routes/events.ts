import express, { Request, Response, NextFunction } from 'express';
import { validate } from '../middleware/validation';
import { createEventSchema, updateEventSchema } from '../validation/schemas';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import {
  getEventStats,
  createEvent,
  updateEvent,
  getEventsList,
  getEvents,
  getEventById,
  deleteEvent,
  getOrganizerEvents,
  notifyHumorists,
  processCompletedEvents,
  resetParticipations,
  markEventsAsCompletedCron
} from '../controllers/event';

const router = express.Router();

// ============================================================================
// ASYNC HANDLER WRAPPER
// ============================================================================
const asyncHandler = (fn: (req: Request | AuthRequest, res: Response) => Promise<any>) => {
  return (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    console.log('🔀 AsyncHandler appelé pour:', req.method, req.path);
    Promise.resolve(fn(req, res))
      .catch((error) => {
        console.error('❌ AsyncHandler caught error:', error);
        next(error);
      });
  };
};

// ============================================================================
// EVENT STATISTICS & MANAGEMENT ROUTES
// ============================================================================

// GET /api/events/stats - Récupérer les statistiques d'évènements
router.get('/stats', authMiddleware, asyncHandler(getEventStats));

// ============================================================================
// EVENT CRUD ROUTES
// ============================================================================

// POST /api/events - Créer un nouvel évènement
router.post('/', authMiddleware, validate(createEventSchema), asyncHandler(createEvent));

// GET /api/events - Récupérer tous les évènements (avec filtrage par rôle)
router.get('/', authMiddleware, asyncHandler(getEventsList));

// GET /api/events/user/my-events - Récupérer les évènements de l'organisateur connecté
router.get('/user/my-events', authMiddleware, asyncHandler(getOrganizerEvents));

// GET /api/events/:eventId - Récupérer un évènement par son ID
router.get('/:eventId', asyncHandler(getEventById));

// PUT /api/events/:eventId - Mettre à jour un évènement
router.put('/:eventId', authMiddleware, validate(updateEventSchema), asyncHandler(updateEvent));

// DELETE /api/events/:eventId - Supprimer un évènement
router.delete('/:eventId', authMiddleware, asyncHandler(deleteEvent));

// ============================================================================
// ADMINISTRATIVE & NOTIFICATION ROUTES
// ============================================================================

// POST /api/events/:id/notify - Envoyer des notifications manuelles aux humoristes
router.post('/:id/notify', authMiddleware, asyncHandler(notifyHumorists));

// POST /api/events/process-completed-events - Traiter automatiquement les évènements terminés (SUPER_ADMIN uniquement)
router.post('/process-completed-events', authMiddleware, asyncHandler(processCompletedEvents));

// POST /api/events/reset-participations - Réinitialiser les participations (SUPER_ADMIN uniquement)
router.post('/reset-participations', authMiddleware, asyncHandler(resetParticipations));

// ============================================================================
// CRON JOB ROUTES
// ============================================================================

// POST /api/events/jobs/mark-completed - Cron job pour marquer les évènements passés comme completed
router.post('/jobs/mark-completed', asyncHandler(markEventsAsCompletedCron));

export default router;
