import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { getRecommendedEvents, getSmartRecommendedEvents } from '../services/recommendationService';
import { getRecommendationsQuerySchema, getSmartRecommendationsQuerySchema } from '../validation/schemas';

/**
 * Récupère les événements recommandés pour l'humoriste connecté
 * GET /api/recommendations
 */
export const getRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Vérifier que c'est bien un humoriste
    if (req.user?.role !== 'COMEDIAN') {
      res.status(403).json({
        message: 'Seuls les humoristes peuvent accéder aux recommandations'
      });
      return;
    }

    // Valider les paramètres de requête
    const queryValidation = getRecommendationsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        message: 'Paramètres de requête invalides',
        errors: queryValidation.error.errors
      });
      return;
    }

    const { page, limit, minScore } = queryValidation.data;

    // Récupérer les recommandations
    const recommendations = await getRecommendedEvents(comedianId, {
      page,
      limit,
      minScore
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Erreur lors de la récupération des recommandations:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des recommandations'
    });
  }
};

/**
 * Récupère les recommandations intelligentes basées sur l'historique
 * GET /api/recommendations/smart
 *
 * Retourne les événements à venir qui correspondent à:
 * - Des événements avec le même nom que ceux auxquels l'utilisateur a déjà postulé/participé
 * - Des événements du même organisateur que ceux auxquels l'utilisateur a déjà postulé/participé
 */
export const getSmartRecommendations = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Vérifier que c'est bien un humoriste
    if (req.user?.role !== 'COMEDIAN') {
      res.status(403).json({
        message: 'Seuls les humoristes peuvent accéder aux recommandations'
      });
      return;
    }

    // Valider les paramètres de requête
    const queryValidation = getSmartRecommendationsQuerySchema.safeParse(req.query);
    if (!queryValidation.success) {
      res.status(400).json({
        message: 'Paramètres de requête invalides',
        errors: queryValidation.error.errors
      });
      return;
    }

    const { page, limit } = queryValidation.data;

    // Récupérer les recommandations intelligentes
    const recommendations = await getSmartRecommendedEvents(comedianId, {
      page,
      limit
    });

    res.json(recommendations);
  } catch (error) {
    console.error('Erreur lors de la récupération des recommandations intelligentes:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des recommandations intelligentes'
    });
  }
};
