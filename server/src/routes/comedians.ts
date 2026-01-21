import { Router } from 'express';
import { searchComediansByZone } from '../controllers/comedians';
import { authMiddleware, authorizeRoles } from '../middleware/auth';

const router = Router();

/**
 * @route GET /api/comedians/search-by-zone
 * @desc Recherche d'humoristes par zone géographique (ville, département, région)
 * @access Organisateurs uniquement
 * @query zone - Zone de recherche (ville, département ou région)
 * @query experienceLevel - Niveau d'expérience (0-50, 50-200, 200+)
 * @query page - Numéro de page (défaut: 1)
 * @query limit - Nombre de résultats par page (défaut: 20)
 */
router.get(
  '/search-by-zone',
  authMiddleware,
  authorizeRoles('ORGANIZER', 'SUPER_ADMIN'),
  searchComediansByZone
);

export default router;
