import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getOrganizerEvents
} from '../controllers/event';

const router = Router();

// Routes publiques
router.get('/', getEvents);
router.get('/:id', getEventById);

// Routes protégées
router.post('/', authMiddleware, createEvent);
router.put('/:id', authMiddleware, updateEvent);
router.delete('/:id', authMiddleware, deleteEvent);
router.get('/organizer/events', authMiddleware, getOrganizerEvents);

export default router; 