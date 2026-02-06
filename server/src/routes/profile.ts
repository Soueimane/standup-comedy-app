import express, { Request, Response, NextFunction } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { updateProfileSchema } from '../validation/schemas';
import { getMyProfile, getUserProfile, updateUserProfile, deleteMyAccount, exportMyData } from '../controllers/profile';

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
 * DELETE /me
 * Supprime le compte de l'utilisateur authentifié (RGPD - Droit à l'effacement)
 */
router.delete('/me', authMiddleware, asyncHandler(deleteMyAccount));

/**
 * GET /me/export
 * Exporte toutes les données personnelles de l'utilisateur (RGPD - Droit à la portabilité)
 */
router.get('/me/export', authMiddleware, asyncHandler(exportMyData));

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