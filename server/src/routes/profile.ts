import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileSchema } from '../validation/schemas';
import { getMyProfile, getUserProfile, updateUserProfile } from '../controllers/profile';

const router = express.Router();

// Async handler wrapper
const asyncHandler = (fn: (req: Request | AuthRequest, res: Response) => Promise<any>) => {
  return (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
};

// ============================================================================
// PROFIL DES UTILISATEURS
// ============================================================================

/**
 * GET /me
 * Récupère le profil de l'utilisateur authentifié
 */
router.get('/me', authMiddleware, asyncHandler(getMyProfile));

/**
 * GET /:userId
 * Récupère le profil d'un utilisateur par son ID
 */
router.get('/:userId', authMiddleware, asyncHandler(getUserProfile));

/**
 * PUT /:userId
 * Met à jour le profil d'un utilisateur avec gestion des profils secondaires
 */
router.put('/:userId', authMiddleware, validate(updateProfileSchema), asyncHandler(updateUserProfile));

export default router; 