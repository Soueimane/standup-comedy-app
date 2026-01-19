import { z } from 'zod';

// ============================================================================
// SCHÉMAS D'AUTHENTIFICATION
// ============================================================================

export const registerSchema = z.object({
  email: z.string()
    .email('Format d\'email invalide (ex: nom@domaine.com)')
    .refine((email) => {
      // Validation stricte de l'email
      const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
      if (!emailRegex.test(email.trim())) return false;
      
      // Vérification supplémentaire pour les emails évidents invalides
      const invalidPatterns = [
        /^[^@]*$/, // Pas de @
        /@$/, // @ à la fin
        /^@/, // @ au début
        /\.$/, // Point à la fin
        /^\./, // Point au début
        /\.{2,}/, // Points multiples
        /@{2,}/, // @ multiples
        /[^a-zA-Z0-9.!#$%&'*+/=?^_`{|}~@-]/, // Caractères non autorisés
      ];
      
      return !invalidPatterns.some(pattern => pattern.test(email.trim()));
    }, 'Format d\'email invalide (ex: nom@domaine.com)'),
  phone: z.string()
    .refine((phone) => {
      // Nettoyer le numéro (supprimer espaces, tirets, parenthèses, +)
      const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
      
      // Validation pour numéros français (mobiles + fixes)
      // Mobiles: 06, 07
      // Fixes: 01, 02, 03, 04, 05, 08, 09 (selon région)
      const frenchPhoneRegex = /^(0[1-9])[0-9]{8}$/;
      
      // Validation pour numéros belges (mobiles + fixes)
      // Mobiles: 04
      // Fixes: 02, 03, 04, 09, 010, 011, 012, 013, 014, 015, 016, 019, 050, 051, 052, 053, 054, 055, 056, 057, 058, 059, 060, 061, 062, 063, 064, 065, 067, 068, 069, 071, 080, 081, 082, 083, 084, 085, 086, 087, 089
      const belgianPhoneRegex = /^(0[1-9][0-9]{7,8})$/;
      
      return frenchPhoneRegex.test(cleanPhone) || belgianPhoneRegex.test(cleanPhone);
    }, 'Numéro de téléphone invalide (format français: 0XXXXXXXXX, format belge: 0XXXXXXXX ou 0XXXXXXXXX)'),
  password: z.string()
    .min(8, 'Le mot de passe doit contenir au moins 8 caractères')
    .regex(/[A-Z]/, 'Le mot de passe doit contenir au moins une majuscule')
    .regex(/[0-9]/, 'Le mot de passe doit contenir au moins un chiffre'),
  firstName: z.string()
    .min(2, 'Le prénom doit contenir au moins 2 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le prénom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  lastName: z.string()
    .min(2, 'Le nom doit contenir au moins 2 caractères')
    .regex(/^[a-zA-ZÀ-ÿ\s'-]+$/, 'Le nom ne peut contenir que des lettres, espaces, apostrophes et tirets'),
  role: z.enum(['COMEDIAN', 'ORGANIZER', 'SUPER_ADMIN']),
  city: z.string().optional(),
  profile: z.object({
    bio: z.string()
      .min(10, 'La biographie doit contenir au moins 10 caractères')
      .max(500, 'La biographie ne peut pas dépasser 500 caractères'),
    experience: z.preprocess(
      (val) => {
        if (typeof val === 'string') {
          const parsed = parseInt(val, 10);
          return isNaN(parsed) ? 0 : parsed;
        }
        return typeof val === 'number' ? val : 0;
      },
      z.number()
        .min(0, 'L\'expérience doit être un nombre positif')
        .max(50, 'L\'expérience ne peut pas dépasser 50 ans')
    )
  }).optional()
}).refine((data) => {
  // Si le rôle est COMEDIAN, le profile est requis
  if (data.role === 'COMEDIAN') {
    if (!data.profile || data.profile === null || data.profile === undefined) {
      return false;
    }
    // Vérifier que bio et experience sont présents
    if (!data.profile.bio || data.profile.bio.trim().length < 10) {
      return false;
    }
    if (data.profile.experience === undefined || data.profile.experience === null) {
      return false;
    }
    return true;
  }
  return true;
}, {
  message: 'Le profil est requis pour les humoristes avec une biographie d\'au moins 10 caractères et une expérience',
  path: ['profile']
});

export const loginSchema = z.object({
  email: z.string()
    .min(1, { message: 'Email est requis' })
    .email('Invalid email format')
    .transform((val) => val.trim().toLowerCase()),
  password: z.string()
    .min(1, { message: 'Le mot de passe est requis' })
});

// ============================================================================
// SCHÉMAS D'ÉVÈNEMENT
// ============================================================================

export const locationSchema = z.object({
  venue: z.string()
    .min(1, { message: 'Event location is incomplete or invalid' })
    .max(100, { message: 'Le nom du lieu est trop long' })
    .transform((val) => val.trim()),
  address: z.string()
    .min(1, { message: 'Event location is incomplete or invalid' })
    .max(200, { message: 'L\'adresse est trop longue' })
    .transform((val) => val.trim()),
  city: z.string()
    .min(1, { message: 'Event location is incomplete or invalid' })
    .max(50, { message: 'Le nom de la ville est trop long' })
    .transform((val) => val.trim()),
  country: z.string()
    .min(1, { message: 'Event location is incomplete or invalid' })
    .max(50, { message: 'Le nom du pays est trop long' })
    .transform((val) => val.trim())
});

export const updateLocationSchema = z.object({
  venue: z.string().max(100).optional().transform((val) => val?.trim()),
  address: z.string().max(200).optional().transform((val) => val?.trim()),
  city: z.string().max(50).optional().transform((val) => val?.trim()),
  country: z.string().max(50).optional().transform((val) => val?.trim()),
  postalCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).strict().partial();

export const requirementsSchema = z.object({
  minExperience: z.number()
    .min(0, { message: 'Invalid event requirements' })
    .max(100, { message: 'Invalid event requirements' })
    .optional(),
  maxPerformers: z.number()
    .min(1, { message: 'Invalid event requirements' })
    .max(100, { message: 'Invalid event requirements' })
    .optional(),
  duration: z.number()
    .min(1, { message: 'Invalid event requirements' })
    .max(480, { message: 'Invalid event requirements' })
    .optional(),
  requiredExperienceLevel: z.enum(['all', '0-50', '50-200', '200+']).optional()
});

export const createEventSchema = z.object({
  title: z.string()
    .min(3, { message: 'Event title is invalid or missing' })
    .max(100, { message: 'Event title is invalid or missing' })
    .transform((val) => val.trim()),
  description: z.string()
    .min(10, { message: 'La description doit contenir au moins 10 caractères' })
    .max(2000, { message: 'La description ne peut pas dépasser 2000 caractères' })
    .transform((val) => val.trim()),
  date: z.string()
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, { message: 'Event date is invalid or in the past' })
    .refine((str) => {
      const date = new Date(str);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, { message: 'Event date is invalid or in the past' })
    .transform((str) => new Date(str)),
  location: locationSchema,
  requirements: requirementsSchema,
  startTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Invalid start time'
    }),
  endTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Invalid end time'
    }),
  budget: z.number()
    .min(0, { message: 'Event budget is invalid' })
    .optional(),
  maxPerformers: z.number()
    .min(1, { message: 'Invalid maximum number of performers' })
    .max(100, { message: 'Invalid maximum number of performers' })
    .optional(),
}).refine((data) => {
  const startParts = data.startTime.split(':');
  const endParts = data.endTime.split(':');
  const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
  const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
  return endMinutes > startMinutes;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

export const updateEventSchema = z.object({
  title: z.string()
    .min(3, { message: 'Event title is invalid or missing' })
    .max(100, { message: 'Event title is invalid or missing' })
    .optional(),
  description: z.string()
    .min(10, { message: 'La description doit contenir au moins 10 caractères' })
    .max(2000, { message: 'La description ne peut pas dépasser 2000 caractères' })
    .optional(),
  date: z.string()
    .refine((str) => {
      const date = new Date(str);
      return !isNaN(date.getTime());
    }, { message: 'Event date is invalid or in the past' })
    .refine((str) => {
      const date = new Date(str);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return date >= today;
    }, { message: 'Event date is invalid or in the past' })
    .optional(),
  location: updateLocationSchema.optional(),
  requirements: requirementsSchema.optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed', 'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED'], {
    errorMap: () => ({ message: 'Invalid enum value' })
  }).optional(),
  cancellationReason: z.string().max(1000).optional(),
  startTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Invalid start time'
    })
    .optional(),
  endTime: z.string()
    .regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/, {
      message: 'Invalid end time'
    })
    .optional(),
  budget: z.number()
    .min(0, { message: 'Event budget is invalid' })
    .optional(),
  maxPerformers: z.number()
    .min(1, { message: 'Invalid maximum number of performers' })
    .max(100, { message: 'Invalid maximum number of performers' })
    .optional(),
}).partial().refine((data) => {
  // Si les deux heures sont fournies, validez que la fin est après le début
  if (data.startTime && data.endTime) {
    const startParts = data.startTime.split(':');
    const endParts = data.endTime.split(':');
    const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
    const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
    return endMinutes > startMinutes;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['endTime']
});

// ============================================================================
// SCHÉMAS D'APPLICATION
// ============================================================================

export const performanceDetailsSchema = z.object({
  duration: z.number()
    .min(1, { message: 'Invalid performance details' })
    .max(480, { message: 'Invalid performance details' }),
  description: z.string()
    .min(10, { message: 'La description doit contenir au moins 10 caractères' })
    .max(500, { message: 'La description ne peut pas dépasser 500 caractères' })
    .optional(),
  videoLink: z.string()
    .url('Invalid URL format')
    .optional()
});

export const createApplicationSchema = z.object({
  eventId: z.string()
    .min(24, { message: 'Invalid event ID format' })
    .regex(/^[0-9a-fA-F]{24}$/, { message: 'Invalid event ID format' }),
  performanceDetails: performanceDetailsSchema.optional(),
  message: z.string()
    .max(1000, { message: 'Message exceeds maximum length' })
    .optional()
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED'], {
    errorMap: () => ({ message: 'Invalid application status' })
  }),
  organizerMessage: z.string()
    .max(1000, { message: 'Message exceeds maximum length' })
    .optional()
});

// ============================================================================
// SCHÉMAS DE PROFIL UTILISATEUR
// ============================================================================

export const updateProfileSchema = z.object({
  firstName: z.string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .optional(),
  lastName: z.string()
    .min(2, { message: 'Name must be at least 2 characters' })
    .optional(),
  email: z.string()
    .email('Invalid email format')
    .optional(),
  city: z.string()
    .max(50, { message: 'Invalid city' })
    .optional(),
  phone: z.string()
    .refine((phone) => {
      const cleanPhone = phone.replace(/[\s\-\(\)\+]/g, '');
      const frenchPhoneRegex = /^(0[1-9])[0-9]{8}$/;
      const belgianPhoneRegex = /^(0[1-9][0-9]{7,8})$/;
      return frenchPhoneRegex.test(cleanPhone) || belgianPhoneRegex.test(cleanPhone);
    }, { message: 'Invalid phone number format' })
    .optional(),
  address: z.string().optional(),
  gender: z.enum(['femme', 'homme'], {
    errorMap: () => ({ message: 'Le genre doit être "femme" ou "homme"' })
  }).optional(),
  avatarUrl: z.union([
    z.string().refine(
      (val) => !val || val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://'),
      { message: 'URL d\'avatar ou format base64 invalide' }
    ),
    z.null()
  ]).optional(),
  profile: z.object({
    bio: z.string().max(500).optional(),
    experience: z.number()
      .min(0, { message: 'L\'expérience doit être 0 ou plus' })
      .max(100, { message: 'L\'expérience ne peut pas dépasser 100 ans' })
      .optional(),
    speciality: z.string().optional(),
    numberOfScenes: z.enum(['0-50', '50-200', '200+']).optional(),
    comedyStyle: z.array(z.enum(['stand-up', 'improvisation', 'plateau', 'sketch'])).optional(),
    performanceLanguages: z.array(z.enum(['francais', 'arabe', 'anglais', 'italien', 'espagnol'])).optional(),
    mobilityZone: z.array(z.object({
      type: z.enum(['ville', 'departement', 'region']),
      value: z.string().min(1, { message: 'La valeur de la zone ne peut pas être vide' }),
    })).optional(),
    socialLinks: z.object({
      youtube: z.string().url().optional().or(z.string().length(0)),
      instagram: z.string().url().optional().or(z.string().length(0)),
      facebook: z.string().url().optional().or(z.string().length(0)),
      twitter: z.string().url().optional().or(z.string().length(0)),
    }).optional(),
  }).optional(),
  organizerProfile: z.object({
    companyName: z.string().optional(),
    description: z.string().max(1000).optional(),
    website: z.string()
      .url('URL du site invalide')
      .optional()
      .or(z.string().length(0)), // Allow empty string
    venueTypes: z.array(z.string()).optional(),
    eventFrequency: z.enum(['weekly', 'monthly', 'occasional']).optional(),
    location: updateLocationSchema.optional(),
    phone: z.string().optional(),
  }).optional(),
}).partial();

// ============================================================================
// SCHÉMAS DE RECOMMANDATION
// ============================================================================

export const getRecommendationsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(500).default(10), // Augmenté pour charger tous les événements
  minScore: z.coerce.number().min(0).max(100).default(0)
});

// Schéma pour les recommandations intelligentes (basées sur l'historique)
export const getSmartRecommendationsQuerySchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(50)
}); 