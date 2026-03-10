import express from 'express';
import {
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  deleteNotification
} from '../controllers/notification';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

/**
 * GET /api/notifications
 * Récupérer toutes les notifications de l'utilisateur connecté
 */
router.get('/', authMiddleware, getNotifications);

/**
 * PATCH /api/notifications/:notificationId/read
 * Marquer une notification comme lue
 */
router.patch('/:notificationId/read', authMiddleware, markNotificationAsRead);

/**
 * PATCH /api/notifications/read-all
 * Marquer toutes les notifications comme lues
 */
router.patch('/read-all', authMiddleware, markAllNotificationsAsRead);

/**
 * DELETE /api/notifications/:notificationId
 * Supprimer une notification
 */
router.delete('/:notificationId', authMiddleware, deleteNotification);

export default router;

