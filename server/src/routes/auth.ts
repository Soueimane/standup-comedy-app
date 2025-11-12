import { Router } from 'express';
import { register, login, getProfile, getAllUsers } from '../controllers/auth';
import { authMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { registerSchema, loginSchema } from '../validation/schemas';

const router = Router();

// Routes publiques
router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);

// Routes protégées
router.get('/profile', authMiddleware, getProfile);
router.get('/users', authMiddleware, getAllUsers); // Nouvelle route pour le répertoire

export default router; 