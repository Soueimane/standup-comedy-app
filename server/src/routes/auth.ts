import { Router } from 'express';
import { 
  register, 
  login, 
  getProfile, 
  getAllUsers,
  forgotPassword,
  resetPassword,
  getPasswordResetRequests,
  adminResetPassword
} from '../controllers/auth';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema } from '../validation/schemas';

const router = Router();

// Routes publiques
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

// Routes protégées
router.get('/profile', authMiddleware, getProfile);
router.get('/users', authMiddleware, authorizeRoles('SUPER_ADMIN'), getAllUsers);

// Routes Super Admin pour gestion des réinitialisations
router.get('/admin/password-reset-requests', authMiddleware, authorizeRoles('SUPER_ADMIN'), getPasswordResetRequests);
router.post('/admin/reset-password', authMiddleware, authorizeRoles('SUPER_ADMIN'), adminResetPassword);

export default router; 