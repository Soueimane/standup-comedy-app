import { Response } from 'express';
import mongoose from 'mongoose';
import { AuthRequest } from '../middleware/auth';
import { VenueModel } from '../models/Venue';
import { VenueBookingModel } from '../models/VenueBooking';
import { VenueBlockedDateModel } from '../models/VenueBlockedDate';
import { NotificationModel } from '../models/Notification';

// Vérifie si deux plages horaires se chevauchent (même date)
function timesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string): boolean {
  const toMinutes = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  };
  return toMinutes(aStart) < toMinutes(bEnd) && toMinutes(bStart) < toMinutes(aEnd);
}

// ─── Créer une demande de réservation ────────────────────────────────────────

export const createBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    const { venueId } = req.params;

    if (!requesterId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      res.status(400).json({ message: 'ID de salle invalide' });
      return;
    }

    const venue = await VenueModel.findById(venueId);
    if (!venue || !venue.isActive) {
      res.status(404).json({ message: 'Salle introuvable ou indisponible' });
      return;
    }

    // Le propriétaire ne peut pas réserver sa propre salle
    if (venue.owner.toString() === requesterId) {
      res.status(403).json({ message: 'Vous ne pouvez pas réserver votre propre salle' });
      return;
    }

    const { requestedDate, startTime, endTime, message } = req.body;
    const date = new Date(requestedDate);

    if (isNaN(date.getTime())) {
      res.status(400).json({ message: 'Date de réservation invalide' });
      return;
    }

    // Vérifier que la date/créneau n'est pas bloqué par le propriétaire
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const blockedDates = await VenueBlockedDateModel.find({
      venue: venueId,
      date: { $gte: dayStart, $lte: dayEnd },
    });

    const isBlocked = blockedDates.some((b) => {
      // Blocage journée entière
      if (!b.startTime || !b.endTime) return true;
      // Blocage créneau partiel
      return timesOverlap(b.startTime, b.endTime, startTime, endTime);
    });

    if (isBlocked) {
      res.status(409).json({ message: 'La salle est indisponible à cette date ou sur ce créneau' });
      return;
    }

    // Vérifier qu'il n'y a pas de réservation ACCEPTED qui chevauche le créneau demandé
    const acceptedBookings = await VenueBookingModel.find({
      venue: venueId,
      status: 'ACCEPTED',
      requestedDate: { $gte: dayStart, $lte: dayEnd },
    });

    const hasConflict = acceptedBookings.some((b) =>
      timesOverlap(b.startTime, b.endTime, startTime, endTime)
    );

    if (hasConflict) {
      res.status(409).json({ message: 'La salle est déjà réservée sur ce créneau' });
      return;
    }

    const booking = await VenueBookingModel.create({
      venue: venueId,
      requester: requesterId,
      requestedDate: date,
      startTime,
      endTime,
      message,
      status: 'PENDING',
    });

    // Notifier le propriétaire de la salle (découplé)
    try {
      await NotificationModel.create({
        user: venue.owner,
        type: 'venue_booking_request',
        title: 'Nouvelle demande de réservation',
        message: `Une demande de réservation a été faite pour votre salle "${venue.name}".`,
        relatedVenue: venue._id,
        read: false,
      });
    } catch (notifError) {
      console.error('Erreur création notification createBooking:', notifError, { venueId });
    }

    res.status(201).json({ booking });
  } catch (error) {
    console.error('Erreur createBooking:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Lister les réservations d'une salle (pour le propriétaire) ───────────────

export const listVenueBookings = async (req: AuthRequest, res: Response): Promise<void> => {
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

    const venue = await VenueModel.findById(venueId);
    if (!venue) {
      res.status(404).json({ message: 'Salle introuvable' });
      return;
    }

    if (venue.owner.toString() !== ownerId) {
      res.status(403).json({ message: 'Non autorisé à consulter ces réservations' });
      return;
    }

    const bookings = await VenueBookingModel.find({ venue: venueId })
      .populate('requester', 'firstName lastName email organizerProfile.companyName')
      .sort({ requestedDate: 1 });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Erreur listVenueBookings:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Mes réservations envoyées ───────────────────────────────────────────────

export const myBookings = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    if (!requesterId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    const bookings = await VenueBookingModel.find({ requester: requesterId })
      .populate('venue', 'name city address venueType')
      .sort({ createdAt: -1 });

    res.status(200).json({ bookings });
  } catch (error) {
    console.error('Erreur myBookings:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Accepter / Refuser une réservation (propriétaire) ───────────────────────

export const updateBookingStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { bookingId } = req.params;
    const { status, ownerResponse } = req.body as { status: 'ACCEPTED' | 'REFUSED'; ownerResponse?: string };

    if (!ownerId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      res.status(400).json({ message: 'ID de réservation invalide' });
      return;
    }

    const booking = await VenueBookingModel.findById(bookingId).populate<{ venue: { _id: mongoose.Types.ObjectId; owner: mongoose.Types.ObjectId; name: string } }>('venue', 'owner name');
    if (!booking) {
      res.status(404).json({ message: 'Réservation introuvable' });
      return;
    }

    if (booking.venue.owner.toString() !== ownerId) {
      res.status(403).json({ message: 'Non autorisé à modifier cette réservation' });
      return;
    }

    if (booking.status !== 'PENDING') {
      res.status(400).json({ message: 'Cette réservation a déjà été traitée' });
      return;
    }

    // Vérifier les conflits uniquement si on accepte
    if (status === 'ACCEPTED') {
      const dateStart = new Date(booking.requestedDate);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(booking.requestedDate);
      dateEnd.setHours(23, 59, 59, 999);

      const existingAccepted = await VenueBookingModel.find({
        venue: booking.venue._id,
        status: 'ACCEPTED',
        requestedDate: { $gte: dateStart, $lte: dateEnd },
        _id: { $ne: bookingId },
      });

      const hasConflict = existingAccepted.some((b) =>
        timesOverlap(booking.startTime, booking.endTime, b.startTime, b.endTime)
      );

      if (hasConflict) {
        res.status(409).json({ message: 'Un conflit de plage horaire existe pour cette date' });
        return;
      }
    }

    booking.status = status;
    if (ownerResponse) booking.ownerResponse = ownerResponse;
    await booking.save();

    // Notifier le demandeur (découplé : un échec de notif ne doit pas faire échouer la réponse)
    const notifMessage =
      status === 'ACCEPTED'
        ? `Votre demande de réservation pour "${booking.venue.name}" a été acceptée.`
        : `Votre demande de réservation pour "${booking.venue.name}" a été refusée.`;

    try {
      await NotificationModel.create({
        user: booking.requester,
        type: 'venue_booking_response',
        title: status === 'ACCEPTED' ? 'Réservation acceptée' : 'Réservation refusée',
        message: notifMessage,
        relatedVenue: booking.venue._id,
        read: false,
      });
    } catch (notifError) {
      console.error('Erreur création notification updateBookingStatus:', notifError, { bookingId, status });
    }

    res.status(200).json({ booking });
  } catch (error) {
    console.error('Erreur updateBookingStatus:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Annuler une réservation (demandeur) ─────────────────────────────────────

export const cancelBooking = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const requesterId = req.user?.id;
    const { bookingId } = req.params;

    if (!requesterId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      res.status(400).json({ message: 'ID de réservation invalide' });
      return;
    }

    const booking = await VenueBookingModel.findById(bookingId);
    if (!booking) {
      res.status(404).json({ message: 'Réservation introuvable' });
      return;
    }

    if (booking.requester.toString() !== requesterId) {
      res.status(403).json({ message: 'Non autorisé à annuler cette réservation' });
      return;
    }

    if (booking.status !== 'PENDING') {
      res.status(400).json({ message: 'Seules les réservations en attente peuvent être annulées' });
      return;
    }

    booking.status = 'CANCELLED_BY_REQUESTER';
    await booking.save();

    res.status(200).json({ message: 'Réservation annulée', booking });
  } catch (error) {
    console.error('Erreur cancelBooking:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Annuler une réservation ACCEPTED par le propriétaire ────────────────────

export const cancelBookingByOwner = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { bookingId } = req.params;
    const { reason } = req.body as { reason?: string };

    if (!ownerId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(bookingId)) {
      res.status(400).json({ message: 'ID de réservation invalide' });
      return;
    }

    const booking = await VenueBookingModel.findById(bookingId)
      .populate<{ venue: { _id: mongoose.Types.ObjectId; owner: mongoose.Types.ObjectId; name: string } }>(
        'venue', 'owner name'
      );

    if (!booking) {
      res.status(404).json({ message: 'Réservation introuvable' });
      return;
    }

    if (booking.venue.owner.toString() !== ownerId) {
      res.status(403).json({ message: 'Non autorisé à annuler cette réservation' });
      return;
    }

    if (booking.status !== 'ACCEPTED') {
      res.status(400).json({ message: 'Seules les réservations acceptées peuvent être annulées par le propriétaire' });
      return;
    }

    booking.status = 'CANCELLED_BY_OWNER';
    if (reason) booking.ownerResponse = reason;
    await booking.save();

    try {
      await NotificationModel.create({
        user: booking.requester,
        type: 'venue_booking_cancelled_by_owner',
        title: 'Réservation annulée par le propriétaire',
        message: reason
          ? `Votre réservation pour "${booking.venue.name}" a été annulée par le propriétaire. Motif : ${reason}`
          : `Votre réservation pour "${booking.venue.name}" a été annulée par le propriétaire.`,
        relatedVenue: booking.venue._id,
        read: false,
      });
    } catch (notifError) {
      console.error('Erreur création notification cancelBookingByOwner:', notifError, { bookingId });
    }

    res.status(200).json({ booking });
  } catch (error) {
    console.error('Erreur cancelBookingByOwner:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Bloquer une date (propriétaire) ─────────────────────────────────────────

export const blockDate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { venueId } = req.params;
    const { date, startTime, endTime, reason } = req.body;

    if (!ownerId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

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
      res.status(403).json({ message: 'Non autorisé à bloquer des dates pour cette salle' });
      return;
    }

    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      res.status(400).json({ message: 'Date invalide' });
      return;
    }

    const blockedDate = await VenueBlockedDateModel.create({
      venue: venueId,
      date: parsedDate,
      startTime,
      endTime,
      reason,
    });

    // Trouver les réservations impactées sur cette date
    const dayStart = new Date(parsedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(parsedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const impactedBookings = await VenueBookingModel.find({
      venue: venueId,
      requestedDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['PENDING', 'ACCEPTED'] },
    });

    // Filtrer celles qui chevauchent le créneau bloqué (si créneau partiel)
    const toCancel = startTime && endTime
      ? impactedBookings.filter((b) => timesOverlap(startTime, endTime, b.startTime, b.endTime))
      : impactedBookings;

    // Annuler chaque réservation impactée — les échecs de sauvegarde sont loggés
    const saveResults = await Promise.allSettled(
      toCancel.map(async (booking) => {
        booking.status = 'CANCELLED_BY_OWNER';
        booking.ownerResponse = reason
          ? `Salle indisponible ce jour-là. Motif : ${reason}`
          : 'Salle indisponible ce jour-là.';
        await booking.save();
        return booking;
      })
    );

    const saveFailures = saveResults.filter((r) => r.status === 'rejected');
    if (saveFailures.length > 0) {
      console.error('blockDate — échecs partiels lors des annulations:', saveFailures.map((f) => (f as PromiseRejectedResult).reason), { venueId });
    }

    const cancelledCount = toCancel.length - saveFailures.length;
    const savedBookings = saveResults
      .filter((r): r is PromiseFulfilledResult<(typeof toCancel)[number]> => r.status === 'fulfilled')
      .map((r) => r.value);

    // Notifications découplées — un échec de notif n'affecte pas le compteur
    await Promise.allSettled(
      savedBookings.map((booking) =>
        NotificationModel.create({
          user: booking.requester,
          type: 'venue_date_blocked',
          title: 'Réservation annulée — salle indisponible',
          message: reason
            ? `Votre réservation pour "${venue.name}" a été annulée car la salle est indisponible ce jour-là. Motif : ${reason}`
            : `Votre réservation pour "${venue.name}" a été annulée car la salle est indisponible ce jour-là.`,
          relatedVenue: venue._id,
          read: false,
        }).catch((notifError) => {
          console.error('blockDate — échec notification:', notifError, { bookingId: booking._id });
        })
      )
    );

    res.status(201).json({ blockedDate, cancelledBookings: cancelledCount, failedCancellations: saveFailures.length });
  } catch (error) {
    console.error('Erreur blockDate:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Lister les dates bloquées d'une salle ───────────────────────────────────

export const listBlockedDates = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { venueId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      res.status(400).json({ message: 'ID de salle invalide' });
      return;
    }

    const blockedDates = await VenueBlockedDateModel.find({
      venue: venueId,
      date: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) },
    }).sort({ date: 1 });

    res.status(200).json({ blockedDates });
  } catch (error) {
    console.error('Erreur listBlockedDates:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Supprimer un blocage de date (propriétaire) ─────────────────────────────

export const unblockDate = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const ownerId = req.user?.id;
    const { venueId, blockedDateId } = req.params;

    if (!ownerId) {
      res.status(401).json({ message: 'Non authentifié' });
      return;
    }

    if (!mongoose.Types.ObjectId.isValid(venueId) || !mongoose.Types.ObjectId.isValid(blockedDateId)) {
      res.status(400).json({ message: 'ID invalide' });
      return;
    }

    const venue = await VenueModel.findById(venueId);
    if (!venue) {
      res.status(404).json({ message: 'Salle introuvable' });
      return;
    }

    if (venue.owner.toString() !== ownerId) {
      res.status(403).json({ message: 'Non autorisé' });
      return;
    }

    const blockedDate = await VenueBlockedDateModel.findOneAndDelete({
      _id: blockedDateId,
      venue: venueId,
    });

    if (!blockedDate) {
      res.status(404).json({ message: 'Blocage introuvable' });
      return;
    }

    res.status(204).send();
  } catch (error) {
    console.error('Erreur unblockDate:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};

// ─── Créneaux déjà pris sur une date (pour le formulaire de réservation) ──────

export const takenSlots = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { venueId } = req.params;
    const { date } = req.query;

    if (!mongoose.Types.ObjectId.isValid(venueId)) {
      res.status(400).json({ message: 'ID de salle invalide' });
      return;
    }

    if (!date || typeof date !== 'string') {
      res.status(400).json({ message: 'Paramètre date requis (YYYY-MM-DD)' });
      return;
    }

    const parsed = new Date(date);
    if (isNaN(parsed.getTime())) {
      res.status(400).json({ message: 'Date invalide' });
      return;
    }

    const dayStart = new Date(parsed);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(parsed);
    dayEnd.setHours(23, 59, 59, 999);

    const accepted = await VenueBookingModel.find({
      venue: venueId,
      status: 'ACCEPTED',
      requestedDate: { $gte: dayStart, $lte: dayEnd },
    }).select('startTime endTime');

    res.status(200).json({ slots: accepted.map((b) => ({ startTime: b.startTime, endTime: b.endTime })) });
  } catch (error) {
    console.error('Erreur takenSlots:', error);
    res.status(500).json({ message: 'Erreur interne du serveur' });
  }
};
