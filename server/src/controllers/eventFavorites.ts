import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { UserModel } from '../models/User';
import { EventModel } from '../models/Event';
import { Types } from 'mongoose';
import { emitEventFavoriteAdded, emitEventFavoriteRemoved } from '../services/eventEmitter';

/**
 * Ajoute un événement aux favoris du comédien
 */
export const addEventFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.body;
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'événement
    if (!eventId || !Types.ObjectId.isValid(eventId)) {
      res.status(400).json({
        message: 'ID d\'événement invalide'
      });
      return;
    }

    const eventObjectId = new Types.ObjectId(eventId);
    const comedianObjectId = new Types.ObjectId(comedianId);

    // Vérifier que le comédien existe et est bien un COMEDIAN
    const comedian = await UserModel.findById(comedianObjectId);
    if (!comedian || comedian.role !== 'COMEDIAN') {
      res.status(403).json({
        message: 'Seuls les comédiens peuvent ajouter des événements aux favoris'
      });
      return;
    }

    // Vérifier que l'événement existe
    const event = await EventModel.findById(eventObjectId);
    if (!event) {
      res.status(404).json({
        message: 'Événement non trouvé'
      });
      return;
    }

    // Empêcher un comédien d'ajouter ses propres événements (si jamais il est aussi organizer)
    if (event.organizer.toString() === comedianObjectId.toString()) {
      res.status(400).json({
        message: 'Vous ne pouvez pas ajouter vos propres événements aux favoris'
      });
      return;
    }

    // Vérifier si l'événement est déjà dans les favoris
    const alreadyFavorite = comedian.favoriteEvents?.some(
      id => id.toString() === eventObjectId.toString()
    );

    if (alreadyFavorite) {
      res.status(409).json({
        message: 'Cet événement est déjà dans vos favoris'
      });
      return;
    }

    // Ajouter l'événement aux favoris
    if (!comedian.favoriteEvents) {
      comedian.favoriteEvents = [];
    }
    comedian.favoriteEvents.push(eventObjectId);
    await comedian.save();

    // Émettre un événement SSE pour notifier tous les clients
    emitEventFavoriteAdded(comedianId, eventId);

    res.status(201).json({
      message: 'Événement ajouté aux favoris avec succès',
      favoriteEvents: comedian.favoriteEvents
    });
  } catch (error) {
    console.error('Erreur lors de l\'ajout aux favoris:', error);
    res.status(500).json({ message: 'Erreur lors de l\'ajout aux favoris' });
  }
};

/**
 * Retire un événement des favoris du comédien
 */
export const removeEventFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'événement
    if (!Types.ObjectId.isValid(eventId)) {
      res.status(400).json({
        message: 'ID d\'événement invalide'
      });
      return;
    }

    const eventObjectId = new Types.ObjectId(eventId);
    const comedianObjectId = new Types.ObjectId(comedianId);

    // Récupérer le comédien
    const comedian = await UserModel.findById(comedianObjectId);
    if (!comedian || comedian.role !== 'COMEDIAN') {
      res.status(403).json({
        message: 'Seuls les comédiens peuvent gérer leurs favoris'
      });
      return;
    }

    // Vérifier si l'événement est dans les favoris
    const favoriteIndex = comedian.favoriteEvents?.findIndex(
      id => id.toString() === eventObjectId.toString()
    );

    if (favoriteIndex === undefined || favoriteIndex === -1) {
      res.status(404).json({
        message: 'Cet événement n\'est pas dans vos favoris'
      });
      return;
    }

    // Retirer l'événement des favoris
    comedian.favoriteEvents?.splice(favoriteIndex, 1);
    await comedian.save();

    // Émettre un événement SSE pour notifier tous les clients
    emitEventFavoriteRemoved(comedianId, eventId);

    res.json({
      message: 'Événement retiré des favoris avec succès',
      favoriteEvents: comedian.favoriteEvents
    });
  } catch (error) {
    console.error('Erreur lors du retrait des favoris:', error);
    res.status(500).json({ message: 'Erreur lors du retrait des favoris' });
  }
};

/**
 * Récupère la liste des événements favoris du comédien
 */
export const getEventFavorites = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Récupérer le comédien avec les favoris populés
    const comedian = await UserModel.findById(comedianId)
      .populate({
        path: 'favoriteEvents',
        select: 'title description date location organizer status requirements budget startTime endTime venue',
        populate: {
          path: 'organizer',
          select: 'firstName lastName email organizerProfile'
        }
      });

    if (!comedian || comedian.role !== 'COMEDIAN') {
      res.status(403).json({
        message: 'Seuls les comédiens peuvent consulter leurs favoris'
      });
      return;
    }

    // Filtrer les favoris pour supprimer les références null (événements supprimés)
    const transformedFavorites = (comedian.favoriteEvents || [])
      .filter((event: any) => event !== null)
      .map((event: any) => {
        const eventObj = event.toObject ? event.toObject() : event;
        return eventObj;
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
 * Vérifie si un événement est dans les favoris du comédien
 */
export const checkIsEventFavorite = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { eventId } = req.params;
    const comedianId = req.user?.id;

    if (!comedianId) {
      res.status(401).json({
        message: 'Non autorisé'
      });
      return;
    }

    // Valider l'ID de l'événement
    if (!Types.ObjectId.isValid(eventId)) {
      res.status(400).json({
        message: 'ID d\'événement invalide'
      });
      return;
    }

    const eventObjectId = new Types.ObjectId(eventId);
    const comedianObjectId = new Types.ObjectId(comedianId);

    // Récupérer le comédien
    const comedian = await UserModel.findById(comedianObjectId);
    if (!comedian || comedian.role !== 'COMEDIAN') {
      res.status(403).json({
        message: 'Seuls les comédiens peuvent consulter leurs favoris'
      });
      return;
    }

    // Vérifier si l'événement est dans les favoris
    const isFavorite = comedian.favoriteEvents?.some(
      id => id.toString() === eventObjectId.toString()
    ) || false;

    res.json({ isFavorite });
  } catch (error) {
    console.error('Erreur lors de la vérification du favori:', error);
    res.status(500).json({ message: 'Erreur lors de la vérification du favori' });
  }
};
