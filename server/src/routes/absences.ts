import express, { Request, Response, NextFunction } from 'express';
import { AbsenceModel, AbsenceDocument } from '../models/Absence';
import { EventModel } from '../models/Event';
import { UserModel } from '../models/User';
import { authMiddleware, AuthRequest } from '../middleware/auth';
import { Types } from 'mongoose';

const router = express.Router();

// Async handler wrapper
const asyncHandler = (fn: (req: Request | AuthRequest, res: Response) => Promise<any>) => {
  return (req: Request | AuthRequest, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res)).catch(next);
  };
};

// Route pour marquer un participant comme absent (protégée - organisateur seulement)
router.post('/', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId, comedianId, reason } = req.body;
  const organizerId = req.user?.id;

  if (!organizerId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  if (!eventId || !comedianId) {
    return res.status(400).json({ message: 'eventId et comedianId sont requis.' });
  }

  // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
  const event = await EventModel.findById(eventId);
  if (!event) {
    return res.status(404).json({ message: 'Événement non trouvé.' });
  }

  if (event.organizer.toString() !== organizerId) {
    return res.status(403).json({ message: 'Non autorisé. Seul l\'organisateur peut marquer les absences.' });
  }

  // Vérifier que le humoriste est bien participant à l'événement
  const isParticipant = event.participants.some(p => p.toString() === comedianId);
  if (!isParticipant) {
    return res.status(400).json({ message: 'Ce humoriste n\'est pas participant à cet événement.' });
  }

  // Vérifier si une absence existe déjà
  const existingAbsence = await AbsenceModel.findOne({
    event: eventId,
    comedian: comedianId
  });

  if (existingAbsence) {
    // Mettre à jour l'absence existante
    existingAbsence.reason = reason || '';
    existingAbsence.markedAt = new Date();
    await existingAbsence.save();
    
    // Incrémenter les statistiques d'absence du humoriste
    const comedian = await UserModel.findById(comedianId);
    if (comedian) {
      if (!comedian.stats) {
        comedian.stats = {};
      }
      // Pas besoin d'incrémenter si c'était déjà marqué comme absent
    }
    
    return res.json({ 
      message: 'Absence mise à jour avec succès',
      absence: existingAbsence
    });
  }

  // Créer une nouvelle absence
  const absence = new AbsenceModel({
    event: eventId,
    comedian: comedianId,
    organizer: organizerId,
    reason: reason || '',
    markedAt: new Date()
  });

  await absence.save();

  // Incrémenter les statistiques d'absence du humoriste
  const comedian = await UserModel.findById(comedianId);
  if (comedian) {
    if (!comedian.stats) {
      comedian.stats = {};
    }
    comedian.stats.absences = (comedian.stats.absences || 0) + 1;
    comedian.markModified('stats');
    await comedian.save();
  }

  res.status(201).json({
    message: 'Absence marquée avec succès',
    absence
  });
}));

// Route pour annuler/supprimer une absence (protégée - organisateur seulement)
router.delete('/:eventId/:comedianId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId, comedianId } = req.params;
  const organizerId = req.user?.id;

  if (!organizerId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
  const event = await EventModel.findById(eventId);
  if (!event) {
    return res.status(404).json({ message: 'Événement non trouvé.' });
  }

  if (event.organizer.toString() !== organizerId) {
    return res.status(403).json({ message: 'Non autorisé. Seul l\'organisateur peut gérer les absences.' });
  }

  // Trouver et supprimer l'absence
  const absence = await AbsenceModel.findOneAndDelete({
    event: eventId,
    comedian: comedianId
  });

  if (!absence) {
    return res.status(404).json({ message: 'Aucune absence trouvée pour ce participant.' });
  }

  // Décrémenter les statistiques d'absence du humoriste
  const comedian = await UserModel.findById(comedianId);
  if (comedian && comedian.stats && comedian.stats.absences && comedian.stats.absences > 0) {
    comedian.stats.absences -= 1;
    comedian.markModified('stats');
    await comedian.save();
  }

  res.json({ message: 'Absence annulée avec succès' });
}));

// Route pour récupérer les absences d'un événement (protégée - organisateur seulement)
router.get('/event/:eventId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { eventId } = req.params;
  const organizerId = req.user?.id;

  if (!organizerId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  // Vérifier que l'événement existe et que l'utilisateur est l'organisateur
  const event = await EventModel.findById(eventId);
  if (!event) {
    return res.status(404).json({ message: 'Événement non trouvé.' });
  }

  if (event.organizer.toString() !== organizerId) {
    return res.status(403).json({ message: 'Non autorisé.' });
  }

  const absences = await AbsenceModel.find({ event: eventId })
    .populate('comedian', 'firstName lastName email')
    .populate('organizer', 'firstName lastName')
    .sort({ markedAt: -1 });

  res.json(absences);
}));

// Route pour récupérer toutes les absences d'un humoriste (pour stats)
router.get('/comedian/:comedianId', authMiddleware, asyncHandler(async (req: AuthRequest, res: Response) => {
  const { comedianId } = req.params;
  const userId = req.user?.id;
  const userRole = req.user?.role;

  if (!userId) {
    return res.status(401).json({ message: 'Utilisateur non authentifié.' });
  }

  // SUPER_ADMIN a accès à tout
  if (userRole === 'SUPER_ADMIN') {
    const absences = await AbsenceModel.find({ comedian: comedianId })
      .populate('event', 'title date location')
      .populate('organizer', 'firstName lastName')
      .sort({ markedAt: -1 });
    return res.json(absences);
  }

  // Le humoriste lui-même peut voir ses absences
  if (comedianId === userId) {
    const absences = await AbsenceModel.find({ comedian: comedianId })
      .populate('event', 'title date location')
      .populate('organizer', 'firstName lastName')
      .sort({ markedAt: -1 });
    return res.json(absences);
  }

  // L'organisateur peut voir les absences d'un humoriste s'il est organisateur d'un événement où ce humoriste est participant
  if (userRole === 'ORGANIZER') {
    // Vérifier si l'organisateur a des événements où ce humoriste est participant
    const eventsWithComedian = await EventModel.find({
      organizer: userId,
      participants: comedianId
    });

    if (eventsWithComedian.length > 0) {
      // Récupérer les absences pour ces événements spécifiques
      const eventIds = eventsWithComedian.map(event => event._id);
      const absences = await AbsenceModel.find({
        comedian: comedianId,
        event: { $in: eventIds }
      })
        .populate('event', 'title date location')
        .populate('organizer', 'firstName lastName')
        .sort({ markedAt: -1 });
      
      return res.json(absences);
    }
  }

  return res.status(403).json({ message: 'Non autorisé.' });
}));

// Route ADMIN pour synchroniser les compteurs d'absences de tous les humoristes
router.post('/sync-absences', asyncHandler(async (req: Request, res: Response) => {
  // Optionnel : sécuriser l'accès à cette route (par exemple, SUPER_ADMIN uniquement)
  // if (!req.user || req.user.role !== 'SUPER_ADMIN') {
  //   return res.status(403).json({ message: 'Accès refusé' });
  // }

  // 1. Récupérer tous les humoristes
  const comedians = await UserModel.find({ role: 'COMEDIAN' });

  let updated = 0;
  for (const comedian of comedians) {
    const absCount = await AbsenceModel.countDocuments({ comedian: comedian._id });
    console.log(`SYNC: ${comedian.email} - absences trouvées: ${absCount}`);
    await UserModel.updateOne(
      { _id: comedian._id },
      { $set: { "stats.absences": absCount } }
    );
    updated++;
  }

  res.json({ message: `Synchronisation terminée pour ${updated} humoristes.` });
}));

export default router; 