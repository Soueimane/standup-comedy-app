import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { authMiddleware, authorizeRoles } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  createVenueSchema,
  updateVenueSchema,
  createBookingSchema,
  updateBookingStatusSchema,
  cancelBookingByOwnerSchema,
  blockDateSchema,
} from '../validation/schemas';
import { createVenue, listVenues, getVenue, updateVenue, deleteVenue } from '../controllers/venue';
import { createBooking, listVenueBookings, myBookings, updateBookingStatus, cancelBooking, cancelBookingByOwner, blockDate, listBlockedDates, unblockDate, takenSlots } from '../controllers/venueBooking';

const router = express.Router();

const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => unknown) => (req: Request, res: Response, next: NextFunction) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

const validateVenueId = asyncHandler((req: Request, res: Response, next: NextFunction) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.venueId)) {
    return res.status(400).json({ message: 'ID de salle invalide' });
  }
  next();
});

const validateBookingId = asyncHandler((req: Request, res: Response, next: NextFunction) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.bookingId)) {
    return res.status(400).json({ message: 'ID de réservation invalide' });
  }
  next();
});

// ── Venues ───────────────────────────────────────────────────────────────────

router.post('/', authMiddleware, authorizeRoles('ORGANIZER'), validate(createVenueSchema), asyncHandler(createVenue));
router.get('/', authMiddleware, authorizeRoles('ORGANIZER'), asyncHandler(listVenues));
router.get('/bookings/mine', authMiddleware, authorizeRoles('ORGANIZER'), asyncHandler(myBookings));
router.get('/:venueId', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(getVenue));
router.put('/:venueId', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, validate(updateVenueSchema), asyncHandler(updateVenue));
router.delete('/:venueId', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(deleteVenue));

// ── Bookings ─────────────────────────────────────────────────────────────────
router.post('/:venueId/bookings', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, validate(createBookingSchema), asyncHandler(createBooking));
router.get('/:venueId/bookings', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(listVenueBookings));
router.patch('/bookings/:bookingId', authMiddleware, authorizeRoles('ORGANIZER'), validateBookingId, validate(updateBookingStatusSchema), asyncHandler(updateBookingStatus));
router.delete('/bookings/:bookingId', authMiddleware, authorizeRoles('ORGANIZER'), validateBookingId, asyncHandler(cancelBooking));
// Annulation d'une réservation ACCEPTED par le propriétaire
router.patch('/bookings/:bookingId/cancel', authMiddleware, authorizeRoles('ORGANIZER'), validateBookingId, validate(cancelBookingByOwnerSchema), asyncHandler(cancelBookingByOwner));

router.get('/:venueId/taken-slots', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(takenSlots));

// ── Dates bloquées ────────────────────────────────────────────────────────────
router.post('/:venueId/blocked-dates', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, validate(blockDateSchema), asyncHandler(blockDate));
router.get('/:venueId/blocked-dates', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(listBlockedDates));
router.delete('/:venueId/blocked-dates/:blockedDateId', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(unblockDate));

export default router;
