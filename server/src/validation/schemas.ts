import { z } from 'zod';

// Schéma de validation pour l'authentification
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
  role: z.enum(['COMEDIAN', 'ORGANIZER', 'ADMIN']),
  profile: z.object({
    bio: z.string()
      .min(10, 'La biographie doit contenir au moins 10 caractères')
      .max(500, 'La biographie ne peut pas dépasser 500 caractères'),
    experience: z.number()
      .min(0, 'L\'expérience doit être un nombre positif')
      .max(50, 'L\'expérience ne peut pas dépasser 50 ans')
  })
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

// Schéma de validation pour les événements
export const locationSchema = z.object({
  venue: z.string().min(1, 'Le lieu (nom de la salle) est requis'),
  address: z.string().min(1, 'L\'adresse est requise'),
  city: z.string().min(1, 'La ville est requise'),
  country: z.string().min(1, 'Le pays est requis')
});

// Nouveau schéma pour la mise à jour partielle de la localisation
export const updateLocationSchema = z.object({
  city: z.string().min(1, 'City is required').optional(),
  postalCode: z.string().optional(),
  address: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
}).partial();

export const requirementsSchema = z.object({
  minExperience: z.number().min(0, 'Minimum experience must be 0 or greater'),
  maxPerformers: z.number().min(1, 'Maximum performers must be at least 1').optional(),
  duration: z.number().min(1, 'Duration must be at least 1 minute')
});

export const createEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  date: z.string().refine((str) => {
    const date = new Date(str);
    return !isNaN(date.getTime());
  }, 'Invalid date format').transform(str => new Date(str)),
  location: locationSchema,
  requirements: requirementsSchema,
  // Champs obligatoires pour la création
  startTime: z.string().min(1, 'L\'heure de début est requise'),
  endTime: z.string().min(1, 'L\'heure de fin est requise'),
  budget: z.object({
    min: z.number().min(0, 'Budget minimum must be 0 or greater').optional(),
    max: z.number().min(0, 'Budget maximum must be 0 or greater').optional(),
  }).optional(),
  maxPerformers: z.number().min(1, 'Maximum performers must be at least 1').optional(),
});

// Schéma de mise à jour: permettre des champs optionnels, y compris sous-objets
export const updateEventSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters').optional(),
  description: z.string().min(10, 'Description must be at least 10 characters').optional(),
  date: z.preprocess((val) => {
    if (typeof val === 'string') {
      const d = new Date(val);
      return isNaN(d.getTime()) ? val : d;
    }
    return val;
  }, z.date()).optional(),
  location: updateLocationSchema.optional(),
  requirements: requirementsSchema.partial().optional(),
  status: z.enum(['draft', 'published', 'cancelled', 'completed', 'DRAFT', 'PUBLISHED', 'CANCELLED', 'COMPLETED']).optional(),
  cancellationReason: z.string().max(1000).optional(),
  // Ajout des champs manquants pour la mise à jour
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  venue: z.string().optional(),
  budget: z.object({
    min: z.number().min(0, 'Budget minimum must be 0 or greater').optional(),
    max: z.number().min(0, 'Budget maximum must be 0 or greater').optional(),
  }).optional(),
  maxPerformers: z.number().min(1, 'Maximum performers must be at least 1').optional(),
}).partial();

// Schéma de validation pour les candidatures
export const performanceDetailsSchema = z.object({
  duration: z.number().min(1, 'Duration must be at least 1 minute'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  videoLink: z.string().url('Invalid video URL').optional()
});

export const createApplicationSchema = z.object({
  eventId: z.string().min(1, 'Event ID is required'),
  performanceDetails: performanceDetailsSchema.optional(),
  message: z.string().optional()
});

export const updateApplicationStatusSchema = z.object({
  status: z.enum(['PENDING', 'ACCEPTED', 'REJECTED']),
  organizerMessage: z.string().optional()
});

// Schéma de validation pour la mise à jour du profil (mis à jour)
export const updateProfileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  email: z.string().email('Invalid email format').optional(),
  city: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  gender: z.enum(['femme', 'homme']).optional(),
  avatarUrl: z.string().optional().refine(
    (val) => !val || val.startsWith('data:image/') || val.startsWith('http://') || val.startsWith('https://'),
    { message: 'avatarUrl doit être une URL valide ou une image base64' }
  ),
  profile: z.object({
    bio: z.string().optional(),
    experience: z.number().min(0).optional(),
    speciality: z.string().optional(),
    numberOfScenes: z.number().min(0).optional(),
    comedyStyle: z.array(z.enum(['stand-up', 'improvisation', 'plateau', 'sketch'])).optional(),
    performanceLanguages: z.array(z.enum(['francais', 'arabe', 'anglais', 'italien', 'espagnol'])).optional(),
    socialLinks: z.object({
      youtube: z.string().url('URL YouTube invalide').optional().or(z.string().length(0)),
      instagram: z.string().url('URL Instagram invalide').optional().or(z.string().length(0)),
      facebook: z.string().url('URL Facebook invalide').optional().or(z.string().length(0)),
      twitter: z.string().url('URL Twitter invalide').optional().or(z.string().length(0)),
    }).optional(),
  }).optional(),
  organizerProfile: z.object({
    companyName: z.string().optional(),
    description: z.string().optional(),
    website: z.string().url('Invalid website URL').optional(),
    venueTypes: z.array(z.string()).optional(),
    eventFrequency: z.enum(['weekly', 'monthly', 'occasional']).optional(),
    location: updateLocationSchema.optional(), // Intégrer le schéma de localisation ici
    phone: z.string().optional(),
  }).optional(),
}).partial(); 