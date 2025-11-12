import { Router } from 'express';
import { authMiddleware } from '../middleware/auth';
import {
  createApplication,
  getEventApplications,
  updateApplicationStatus,
  getComedianApplications
} from '../controllers/application';

const router = Router();

// Routes protégées
router.post('/', authMiddleware, createApplication);
router.get('/event/:eventId', authMiddleware, getEventApplications);
router.put('/:applicationId/status', authMiddleware, updateApplicationStatus);
router.get('/comedian', authMiddleware, getComedianApplications);

export default router; 