import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import {
  getRecommendedEvents,
  getRecommendationPreferences as getPrefs,
  updateRecommendationPreferences as updatePrefs
} from '../services/recommendationService';
import { RecommendationPriority } from '../types/recommendation';
import {
  updateRecommendationPreferencesSchema,
  getRecommendationsQuerySchema
} from '../validation/schemas';

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
 * Récupère les préférences de recommandation de l'humoriste connecté
 * GET /api/recommendations/preferences
 */
export const getPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Seuls les humoristes peuvent accéder à leurs préférences de recommandation'
      });
      return;
    }

    const preferences = await getPrefs(comedianId);

    res.json(preferences);
  } catch (error) {
    console.error('Erreur lors de la récupération des préférences:', error);
    res.status(500).json({
      message: 'Erreur lors de la récupération des préférences'
    });
  }
};

/**
 * Met à jour les préférences de recommandation de l'humoriste connecté
 * PUT /api/recommendations/preferences
 */
export const updatePreferences = async (req: AuthRequest, res: Response): Promise<void> => {
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
        message: 'Seuls les humoristes peuvent modifier leurs préférences de recommandation'
      });
      return;
    }

    // Valider le corps de la requête
    const bodyValidation = updateRecommendationPreferencesSchema.safeParse(req.body);
    if (!bodyValidation.success) {
      res.status(400).json({
        message: 'Données invalides',
        errors: bodyValidation.error.errors
      });
      return;
    }

    const { priorities } = bodyValidation.data;

    // Mettre à jour les préférences (toujours activées)
    const updatedPreferences = await updatePrefs(comedianId, {
      enabled: true,
      priorities: priorities as RecommendationPriority[] | undefined
    });

    res.json({
      message: 'Préférences mises à jour avec succès',
      preferences: updatedPreferences
    });
  } catch (error) {
    console.error('Erreur lors de la mise à jour des préférences:', error);
    res.status(500).json({
      message: 'Erreur lors de la mise à jour des préférences'
    });
  }
};
