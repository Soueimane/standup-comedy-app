import path from 'path';
import fs from 'fs';
import express, { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { v4 as uuidv4 } from 'uuid';
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
import { createVenue, listVenues, getVenue, updateVenue, deleteVenue, uploadVenuePhoto } from '../controllers/venue';
import { createBooking, listVenueBookings, myBookings, updateBookingStatus, cancelBooking, cancelBookingByOwner, blockDate, listBlockedDates, unblockDate } from '../controllers/venueBooking';

const uploadsVenuesDir = path.join(process.cwd(), 'uploads', 'venues');
if (!fs.existsSync(uploadsVenuesDir)) {
  fs.mkdirSync(uploadsVenuesDir, { recursive: true });
}

const uploadVenuePhotoMulter = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadsVenuesDir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname) || '.jpg';
      const safe = /^\.(jpe?g|png|gif)$/i.test(ext) ? ext : '.jpg';
      cb(null, `${uuidv4()}${safe}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (['image/jpeg', 'image/png', 'image/gif'].includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Format non accepté. Utilisez JPG, PNG ou GIF.'));
    }
  },
});

const router = express.Router();

const asyncHandler = (fn: Function) => (req: Request, res: Response, next: NextFunction) => {
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

/** Draine le body de la requête pour éviter le ECONNRESET quand on rejette tôt */
const drainAndReject = (status: number, message: string) =>
  (req: Request, res: Response) => {
    req.resume();
    req.on('end', () => res.status(status).json({ message }));
  };

router.post(
  '/upload-photo',
  (req: Request, res: Response, next: NextFunction) => {
    // Vérifie auth avant de lire le body multipart
    authMiddleware(req as any, res, (err?: any) => {
      if (err) return next(err);
      if (!(req as any).user) return drainAndReject(401, 'Non authentifié')(req, res);
      next();
    });
  },
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user || user.role !== 'ORGANIZER') return drainAndReject(403, 'Accès réservé aux organisateurs')(req, res);
    next();
  },
  (req: Request, res: Response, next: NextFunction) => {
    uploadVenuePhotoMulter.single('photo')(req, res, (err: any) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE' ? 'Fichier trop volumineux (max 5MB).' : (err.message || 'Erreur upload.');
        // Drainer le body pour éviter ECONNRESET côté client
        req.resume();
        req.on('end', () => res.status(400).json({ message: msg }));
        req.on('error', () => res.status(400).json({ message: msg }));
        return;
      }
      next();
    });
  },
  asyncHandler(uploadVenuePhoto)
);

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

// ── Dates bloquées ────────────────────────────────────────────────────────────
router.post('/:venueId/blocked-dates', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, validate(blockDateSchema), asyncHandler(blockDate));
router.get('/:venueId/blocked-dates', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(listBlockedDates));
router.delete('/:venueId/blocked-dates/:blockedDateId', authMiddleware, authorizeRoles('ORGANIZER'), validateVenueId, asyncHandler(unblockDate));

export default router;
