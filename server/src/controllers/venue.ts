import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { VenueModel } from '../models/Venue';
import { VenueBookingModel } from '../models/VenueBooking';
import { config } from '../config/env';

// ─── CRUD Venues ─────────────────────────────────────────────────────────────

export const createVenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    const venue = await VenueModel.create({ ...req.body, owner: ownerId });
    res.status(201).json({ venue });
  } catch (error) {
    console.error('Erreur createVenue:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const listVenues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { city, venueType, minCapacity, page = '1', limit = '20' } = req.query as Record<string, string>;

    const filter: Record<string, unknown> = { isActive: true };
    if (city) filter.city = new RegExp(city, 'i');
    if (venueType) filter.venueType = venueType;
    if (minCapacity) filter.capacity = { $gte: parseInt(minCapacity) };

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    const [venues, total] = await Promise.all([
      VenueModel.find(filter)
        .populate('owner', 'firstName lastName organizerProfile.companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),
      VenueModel.countDocuments(filter),
    ]);

    res.status(200).json({ venues, total, page: pageNum, limit: limitNum });
  } catch (error) {
    console.error('Erreur listVenues:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const getVenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { venueId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      res.status(400).json({ message: 'ID de salle invalide' });
      return;
    }

    const venue = await VenueModel.findById(venueId).populate('owner', 'firstName lastName organizerProfile.companyName');
    if (!venue) {
      res.status(404).json({ message: 'Salle introuvable' });
      return;
    }

    // Récupérer les réservations ACCEPTED pour le calendrier de disponibilité
    const acceptedBookings = await VenueBookingModel.find({
      venue: venueId,
      status: 'ACCEPTED',
      requestedDate: { $gte: new Date() },
    }).select('requestedDate startTime endTime');

    res.status(200).json({ venue, acceptedBookings });
  } catch (error) {
    console.error('Erreur getVenue:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const updateVenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { venueId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      res.status(400).json({ message: 'ID de salle invalide' });
      return;
    }

    const venue = await VenueModel.findById(venueId);
    if (!venue) {
      res.status(404).json({ message: 'Salle introuvable' });
      return;
    }

    if (venue.owner.toString() !== ownerId) {
      res.status(403).json({ message: 'Non autorisé à modifier cette salle' });
      return;
    }

    const updated = await VenueModel.findByIdAndUpdate(venueId, req.body, { new: true });
    res.status(200).json({ venue: updated });
  } catch (error) {
    console.error('Erreur updateVenue:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const uploadVenuePhoto = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const file = (req as any).file;
    if (!file) {
      res.status(400).json({ message: 'Aucun fichier reçu. Formats acceptés : JPG, PNG, GIF (max 5MB).' });
      return;
    }
    const baseUrl = config.api.url.replace(/\/$/, '');
    const photoUrl = `${baseUrl}/uploads/venues/${file.filename}`;
    res.status(200).json({ photoUrl });
  } catch (error) {
    console.error('Erreur uploadVenuePhoto:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const deleteVenue = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { venueId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      res.status(400).json({ message: 'ID de salle invalide' });
      return;
    }

    const venue = await VenueModel.findById(venueId);
    if (!venue) {
      res.status(404).json({ message: 'Salle introuvable' });
      return;
    }

    if (venue.owner.toString() !== ownerId) {
      res.status(403).json({ message: 'Non autorisé à supprimer cette salle' });
      return;
    }

    await VenueModel.findByIdAndDelete(venueId);
    await VenueBookingModel.deleteMany({ venue: venueId });

    res.status(200).json({ message: 'Salle supprimée avec succès' });
  } catch (error) {
    console.error('Erreur deleteVenue:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
