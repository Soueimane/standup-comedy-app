import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { Types } from 'mongoose';

/**
 * Ajoute un humoriste aux favoris de l'organisateur
 */
export const addFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { comedianId } = req.body;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'humoriste
    if (!comedianId || !Types.ObjectId.isValid(comedianId)) {
      res.status(400).json({
        message: 'ID d\'humoriste invalide'
      });
      return;
    }

    const comedianObjectId = new Types.ObjectId(comedianId);
    const organizerObjectId = new Types.ObjectId(organizerId);

    // Vérifier que l'organisateur existe et est bien un ORGANIZER
    const organizer = await UserModel.findById(organizerObjectId);
    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent ajouter des favoris'
      });
      return;
    }

    // Vérifier que l'humoriste existe et est bien un COMEDIAN
    const comedian = await UserModel.findById(comedianObjectId);
    if (!comedian) {
      res.status(404).json({
        message: 'Humoriste non trouvé'
      });
      return;
    }

    if (comedian.role !== 'COMEDIAN') {
      res.status(400).json({
        message: 'L\'utilisateur spécifié n\'est pas un humoriste'
      });
      return;
    }

    // Empêcher l'auto-ajout aux favoris
    if (comedianObjectId.toString() === organizerObjectId.toString()) {
      res.status(400).json({
        message: 'Vous ne pouvez pas vous ajouter à vos propres favoris'
      });
      return;
    }

    // Vérifier si l'humoriste est déjà dans les favoris
    const alreadyFavorite = organizer.favoriteComedians?.some(
      id => id.toString() === comedianObjectId.toString()
    );

    if (alreadyFavorite) {
      res.status(409).json({
        message: 'Cet humoriste est déjà dans vos favoris'
      });
      return;
    }

    // Ajouter l'humoriste aux favoris
    if (!organizer.favoriteComedians) {
      organizer.favoriteComedians = [];
    }
    organizer.favoriteComedians.push(comedianObjectId);
    await organizer.save();

    res.status(201).json({
      message: 'Humoriste ajouté aux favoris avec succès',
      favoriteComedians: organizer.favoriteComedians
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout aux favoris:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout aux favoris' });
  }
};

/**
 * Retire un humoriste des favoris de l'organisateur
 */
export const removeFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { comedianId } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'humoriste
    if (!Types.ObjectId.isValid(comedianId)) {
      res.status(400).json({
        message: 'ID d\'humoriste invalide'
      });
      return;
    }

    const comedianObjectId = new Types.ObjectId(comedianId);
    const organizerObjectId = new Types.ObjectId(organizerId);

    // Récupérer l'organisateur
    const organizer = await UserModel.findById(organizerObjectId);
    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent gérer leurs favoris'
      });
      return;
    }

    // Vérifier si l'humoriste est dans les favoris
    const favoriteIndex = organizer.favoriteComedians?.findIndex(
      id => id.toString() === comedianObjectId.toString()
    );

    if (favoriteIndex === undefined || favoriteIndex === -1) {
      res.status(404).json({
        message: 'Cet humoriste n\'est pas dans vos favoris'
      });
      return;
    }

    // Retirer l'humoriste des favoris
    organizer.favoriteComedians?.splice(favoriteIndex, 1);
    await organizer.save();

    res.json({
      message: 'Humoriste retiré des favoris avec succès',
      favoriteComedians: organizer.favoriteComedians
    });
  } catch (error) {
    console.error('Erreur lors du retrait des favoris:', error);
    res.status(500).json({ message: 'Erreur lors du retrait des favoris' });
  }
};

/**
 * Récupère la liste des humoristes favoris de l'organisateur
 */
export const getFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Récupérer l'organisateur avec les favoris populés
    const organizer = await UserModel.findById(organizerId)
      .populate({
        path: 'favoriteComedians',
        select: 'firstName lastName email phone profile avatarUrl avatar city stats'
      });

    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent consulter leurs favoris'
      });
      return;
    }

    // Transformer les favoris pour ajouter avatarUrl si nécessaire
    const transformedFavorites = (organizer.favoriteComedians || [])
      .filter((comedian: any) => comedian !== null) // Filtrer les références orphelines
      .map((comedian: any) => {
        const comedianObj = comedian.toObject ? comedian.toObject() : comedian;

        // Construire avatarUrl à partir de avatar.data si disponible
        try {
          if (comedianObj.avatar?.data) {
            const contentType = comedianObj.avatar.contentType || 'image/png';
            const base64 = comedianObj.avatar.data.toString('base64');
            comedianObj.avatarUrl = `data:${contentType};base64,${base64}`;
          }
        } catch (error) {
          console.error(`Erreur transformation avatar pour ${comedianObj._id}:`, error);
          // Continue sans avatarUrl - dégradation gracieuse
        }

        // Supprimer le champ avatar pour ne pas l'envoyer au client
        if ('avatar' in comedianObj) {
          delete comedianObj.avatar;
        }

        return comedianObj;
      });

    res.json({
      favorites: transformedFavorites
    });
  } catch (error) {
    console.error('Erreur lors de la récupération des favoris:', error);
    res.status(500).json({ message: 'Erreur lors de la récupération des favoris' });
  }
};

/**
 * Vérifie si un humoriste est dans les favoris de l'organisateur
 */
export const checkIsFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { comedianId } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'humoriste
    if (!Types.ObjectId.isValid(comedianId)) {
      res.status(400).json({
        message: 'ID d\'humoriste invalide'
      });
      return;
    }

    const comedianObjectId = new Types.ObjectId(comedianId);
    const organizerObjectId = new Types.ObjectId(organizerId);

    // Récupérer l'organisateur
    const organizer = await UserModel.findById(organizerObjectId);
    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent consulter leurs favoris'
      });
      return;
    }

    // Vérifier si l'humoriste est dans les favoris
    const isFavorite = organizer.favoriteComedians?.some(
      id => id.toString() === comedianObjectId.toString()
    ) || false;

    res.json({ isFavorite });
  } catch (error) {
    console.error('Erreur lors de la vérification du favori:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification du favori' });
  }
};
