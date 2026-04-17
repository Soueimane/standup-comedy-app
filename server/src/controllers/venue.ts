import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { VenueModel } from '../models/Venue';
import { VenueBookingModel } from '../models/VenueBooking';
import { VenueBlockedDateModel } from '../models/VenueBlockedDate';
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
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ message: Object.values(error.errors).map((e) => e.message).join(', ') });
      return;
    }
    console.error('Erreur createVenue:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const listVenues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { city, venueType, minCapacity, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1) {
      res.status(400).json({ message: 'page doit être un entier valide (≥ 1)' });
      return;
    }
    if (isNaN(limitNum) || limitNum < 1) {
      res.status(400).json({ message: 'limit doit être un entier valide (≥ 1)' });
      return;
    }
    const safeLimit = Math.min(limitNum, 50);

    const filter: Record<string, unknown> = { isActive: true };
    if (venueType) filter.venueType = venueType;
    if (minCapacity) {
      const capacityNum = parseInt(minCapacity, 10);
      if (isNaN(capacityNum)) {
        res.status(400).json({ message: 'minCapacity doit être un entier valide' });
        return;
      }
      filter.capacity = { $gte: capacityNum };
    }
    if (city) {
      const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.city = new RegExp(escaped, 'i');
    }

    const skip = (pageNum - 1) * safeLimit;
    const collation = { locale: 'fr', strength: 1 };

    const [venues, total] = await Promise.all([
      VenueModel.find(filter)
        .collation(collation)
        .populate('owner', 'firstName lastName organizerProfile.companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      VenueModel.countDocuments(filter).collation(collation),
    ]);

    res.status(200).json({ venues, total, page: pageNum, limit: safeLimit });
  } catch (error) {
    console.error('Erreur listVenues:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

export const listMyVenues = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    if (!ownerId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    const { page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    if (isNaN(pageNum) || pageNum < 1 || pageNum > 1000) {
      res.status(400).json({ message: 'page doit être un entier valide (≥ 1, ≤ 1000)' });
      return;
    }
    if (isNaN(limitNum) || limitNum < 1) {
      res.status(400).json({ message: 'limit doit être un entier valide' });
      return;
    }
    const safeLimit = Math.min(limitNum, 50);

    const filter: Record<string, unknown> = { owner: ownerId };

    const skip = (pageNum - 1) * safeLimit;
    const collation = { locale: 'fr', strength: 1 };

    const [venues, total] = await Promise.all([
      VenueModel.find(filter)
        .collation(collation)
        .populate('owner', 'firstName lastName organizerProfile.companyName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(safeLimit),
      VenueModel.countDocuments(filter).collation(collation),
    ]);

    res.status(200).json({ venues, total, page: pageNum, limit: safeLimit });
  } catch (error) {
    console.error('Erreur listMyVenues:', error);
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
    const todayMidnight = new Date();
    todayMidnight.setHours(0, 0, 0, 0);
    const acceptedBookings = await VenueBookingModel.find({
      venue: venueId,
      status: 'ACCEPTED',
      requestedDate: { $gte: todayMidnight },
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

    if (!ownerId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      res.status(400).json({ message: 'ID de salle invalide' });
      return;
    }

    const { name, description, address, city, postalCode, country, capacity, pricePerEvent, venueType, equipment, isActive, photos, latitude, longitude } = req.body;
    const updated = await VenueModel.findOneAndUpdate(
      { _id: venueId, owner: ownerId },
      { name, description, address, city, postalCode, country, capacity, pricePerEvent, venueType, equipment, isActive, photos, latitude, longitude },
      { new: true, runValidators: true }
    );

    if (!updated) {
      const exists = await VenueModel.exists({ _id: venueId });
      res.status(exists ? 403 : 404).json({ message: exists ? 'Non autorisé à modifier cette salle' : 'Salle introuvable' });
      return;
    }
    res.status(200).json({ venue: updated });
  } catch (error) {
    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ message: Object.values(error.errors).map((e) => e.message).join(', ') });
      return;
    }
    console.error('Erreur updateVenue:', error);
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

    // Atomic deletion with transaction to prevent orphaned documents
    // Requires MongoDB replica set (always true on Atlas, not on standalone local dev)
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      await VenueBookingModel.deleteMany({ venue: venueId }, { session });
      await VenueBlockedDateModel.deleteMany({ venue: venueId }, { session });
      await VenueModel.findByIdAndDelete(venueId, { session });
      await session.commitTransaction();
      res.status(204).send();
    } catch (error) {
      await session.abortTransaction();
      throw error;
    } finally {
      session.endSession();
    }
  } catch (error) {
    console.error('Erreur deleteVenue:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
