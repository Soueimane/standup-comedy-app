import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { ApplicationModel } from '../models/Application';
import { Types } from 'mongoose';

/**
 * Ajoute une candidature aux favoris de l'organisateur
 */
export const addApplicationFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.body;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de la candidature
    if (!applicationId || !Types.ObjectId.isValid(applicationId)) {
      res.status(400).json({
        message: 'ID de candidature invalide'
      });
      return;
    }

    const applicationObjectId = new Types.ObjectId(applicationId);
    const organizerObjectId = new Types.ObjectId(organizerId);

    // Vérifier que l'organisateur existe et est bien un ORGANIZER
    const organizer = await UserModel.findById(organizerObjectId);
    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent ajouter des candidatures aux favoris'
      });
      return;
    }

    // Vérifier que la candidature existe et appartient à un événement de l'organisateur
    const application = await ApplicationModel.findById(applicationObjectId).populate('event');
    if (!application) {
      res.status(404).json({
        message: 'Candidature non trouvée'
      });
      return;
    }

    const event = (application as any).event;
    if (!event || event.organizer.toString() !== organizerObjectId.toString()) {
      res.status(403).json({
        message: 'Cette candidature ne vous appartient pas'
      });
      return;
    }

    // Vérifier si la candidature est déjà dans les favoris
    const alreadyFavorite = organizer.favoriteApplications?.some(
      id => id.toString() === applicationObjectId.toString()
    );

    if (alreadyFavorite) {
      res.status(409).json({
        message: 'Cette candidature est déjà dans vos favoris'
      });
      return;
    }

    // Ajouter la candidature aux favoris
    if (!organizer.favoriteApplications) {
      organizer.favoriteApplications = [];
    }
    organizer.favoriteApplications.push(applicationObjectId);
    await organizer.save();

    res.status(201).json({
      message: 'Candidature ajoutée aux favoris avec succès',
      favoriteApplications: organizer.favoriteApplications
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout aux favoris:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout aux favoris' });
  }
};

/**
 * Retire une candidature des favoris de l'organisateur
 */
export const removeApplicationFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de la candidature
    if (!Types.ObjectId.isValid(applicationId)) {
      res.status(400).json({
        message: 'ID de candidature invalide'
      });
      return;
    }

    const applicationObjectId = new Types.ObjectId(applicationId);
    const organizerObjectId = new Types.ObjectId(organizerId);

    // Récupérer l'organisateur
    const organizer = await UserModel.findById(organizerObjectId);
    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent gérer leurs favoris'
      });
      return;
    }

    // Vérifier si la candidature est dans les favoris
    const favoriteIndex = organizer.favoriteApplications?.findIndex(
      id => id.toString() === applicationObjectId.toString()
    );

    if (favoriteIndex === undefined || favoriteIndex === -1) {
      res.status(404).json({
        message: 'Cette candidature n\'est pas dans vos favoris'
      });
      return;
    }

    // Retirer la candidature des favoris
    organizer.favoriteApplications?.splice(favoriteIndex, 1);
    await organizer.save();

    res.json({
      message: 'Candidature retirée des favoris avec succès',
      favoriteApplications: organizer.favoriteApplications
    });
  } catch (error) {
    console.error('Erreur lors du retrait des favoris:', error);
    res.status(500).json({ message: 'Erreur lors du retrait des favoris' });
  }
};

/**
 * Récupère la liste des candidatures favorites de l'organisateur
 */
export const getApplicationFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
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
        path: 'favoriteApplications',
        populate: [
          {
            path: 'event',
            select: 'title description date location organizer status requirements budget startTime endTime venue'
          },
          {
            path: 'comedian',
            select: 'firstName lastName email phone profile avatarUrl avatar city stats'
          }
        ]
      });

    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent consulter leurs favoris'
      });
      return;
    }

    // Filtrer les favoris pour supprimer les références null (candidatures supprimées)
    const transformedFavorites = (organizer.favoriteApplications || [])
      .filter((application: any) => application !== null)
      .map((application: any) => {
        const appObj = application.toObject ? application.toObject() : application;
        return appObj;
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
 * Vérifie si une candidature est dans les favoris de l'organisateur
 */
export const checkIsApplicationFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { applicationId } = req.params;
    const organizerId = req.user?.id;

    if (!organizerId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de la candidature
    if (!Types.ObjectId.isValid(applicationId)) {
      res.status(400).json({
        message: 'ID de candidature invalide'
      });
      return;
    }

    const applicationObjectId = new Types.ObjectId(applicationId);
    const organizerObjectId = new Types.ObjectId(organizerId);

    // Récupérer l'organisateur
    const organizer = await UserModel.findById(organizerObjectId);
    if (!organizer || organizer.role !== 'ORGANIZER') {
      res.status(403).json({
        message: 'Seuls les organisateurs peuvent consulter leurs favoris'
      });
      return;
    }

    // Vérifier si la candidature est dans les favoris
    const isFavorite = organizer.favoriteApplications?.some(
      id => id.toString() === applicationObjectId.toString()
    ) || false;

    res.json({ isFavorite });
  } catch (error) {
    console.error('Erreur lors de la vérification du favori:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification du favori' });
  }
};

