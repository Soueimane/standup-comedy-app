import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import { User, UserProfile, Performance } from '../types/user';

// 1. Interfaces pour les types de données

interface ILocation {
  city: string;
  postalCode: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

interface IUserStats {
  totalEvents?: number;
  totalRevenue?: number;
  averageRating?: number;
  viralScore?: number;
  profileViews?: number;
  lastActivity?: Date;
  applicationsSent?: number;
  applicationsAccepted?: number;
  applicationsRejected?: number;
  applicationsPending?: number;
  netPromoterScore?: number;
  absences?: number;
  processedEvents?: string[]; // Array d'IDs des évènements déjà traités
}

interface IHumoristeProfile {
  stageName?: string;
  location: ILocation;
  bio?: string;
  mobilityZone: {
    radius: number;
    preferredCities?: string[];
  };
  experienceLevel: 'debutant' | 'intermediaire' | 'expert';
  socialLinks?: {
    instagram?: string;
    tiktok?: string;
  };
  genres?: string[];
  availability?: {
    weekdays: boolean;
    weekends: boolean;
    evenings: boolean;
  };
  phone?: string;
}

interface IOrganisateurProfile {
  companyName?: string;
  location: ILocation;
  description?: string;
  website?: string;
  venueTypes: string[];
  averageBudget?: {
    min: number;
    max: number;
  };
  eventFrequency?: 'weekly' | 'monthly' | 'occasional';
  phone?: string;
}

interface UserDocument extends User, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// 2. Schémas Mongoose

const LocationSchema = new Schema<ILocation>({
  city: { type: String, required: false },
  postalCode: { type: String, required: false },
  address: { type: String },
  latitude: { type: Number },
  longitude: { type: Number },
});

const UserStatsSchema = new Schema<IUserStats>({
  totalEvents: { type: Number, default: 0 },
  totalRevenue: { type: Number, default: 0 },
  averageRating: { type: Number, default: 0 },
  viralScore: { type: Number, default: 0 },
  profileViews: { type: Number, default: 0 },
  lastActivity: { type: Date, default: Date.now },
  applicationsSent: { type: Number, default: 0 },
  applicationsAccepted: { type: Number, default: 0 },
  applicationsRejected: { type: Number, default: 0 },
  applicationsPending: { type: Number, default: 0 },
  netPromoterScore: { type: Number, default: 0 },
  absences: { type: Number, default: 0 },
  processedEvents: [{ type: Schema.Types.ObjectId, ref: 'Event' }]
});

const HumoristeProfileSchema = new Schema<IHumoristeProfile>({
  stageName: { type: String },
  location: { type: LocationSchema, required: true },
  bio: { type: String },
  mobilityZone: {
    radius: { type: Number, default: 30 },
    preferredCities: [{ type: String }],
  },
  experienceLevel: { type: String, enum: ['debutant', 'intermediaire', 'expert'], default: 'debutant' },
  socialLinks: {
    instagram: { type: String },
    tiktok: { type: String },
  },
  genres: [{ type: String }],
  availability: {
    weekdays: { type: Boolean, default: false },
    weekends: { type: Boolean, default: false },
    evenings: { type: Boolean, default: false },
  },
  phone: { type: String },
});

const OrganisateurProfileSchema = new Schema<IOrganisateurProfile>({
  companyName: { type: String },
  location: { type: LocationSchema, required: true },
  description: { type: String },
  website: { type: String },
  venueTypes: [{ type: String }],
  averageBudget: {
    min: { type: Number },
    max: { type: Number },
  },
  eventFrequency: { type: String, enum: ['weekly', 'monthly', 'occasional'] },
  phone: { type: String },
});

const performanceSchema = new Schema<Performance>({
  eventId: { type: Schema.Types.ObjectId, ref: 'Event', required: true },
  date: { type: Date, required: true },
  duration: { type: Number, required: true },
  videoLink: { type: String },
  feedback: { type: String }
});

const userProfileSchema = new Schema<UserProfile>({
  bio: { type: String },
  experience: { type: Number },
  speciality: { type: String },
  numberOfScenes: { type: String, enum: ['0-50', '50-200', '200+'], default: '0-50' }, // Nombre de scènes jouées
  comedyStyle: [{ 
    type: String, 
    enum: ['stand-up', 'improvisation', 'plateau', 'sketch'] 
  }], // Styles de comédie
  performanceLanguages: [{ 
    type: String, 
    enum: ['francais', 'arabe', 'anglais', 'italien', 'espagnol'] 
  }], // Langues du spectacle
  socialLinks: {
    youtube: { type: String },
    instagram: { type: String },
    facebook: { type: String },
    twitter: { type: String }
  },
  performances: [performanceSchema]
});

const AvatarSchema = new Schema({
  data: { type: Buffer },
  contentType: { type: String },
  uploadedAt: { type: Date, default: Date.now },
}, { _id: false });

const EmailSubscriptionsSchema = new Schema({
  globalSubscribed: { type: Boolean, default: true },
  unsubscribedAt: { type: Date },
  unsubscribeToken: { type: String }
}, { _id: false });

const userSchema = new Schema<UserDocument>({
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  city: {
    type: String,
    required: false,
    trim: true,
  },
  phone: {
    type: String,
    required: false,
    trim: true,
  },
  address: {
    type: String,
    required: false,
    trim: true,
  },
  gender: {
    type: String,
    enum: ['femme', 'homme'],
    required: false,
    trim: true,
  },
  role: {
    type: String,
    enum: ['COMEDIAN', 'ORGANIZER', 'SUPER_ADMIN'],
    required: true
  },
  profile: {
    type: userProfileSchema,
    required: false
  },
  organizerProfile: {
    type: OrganisateurProfileSchema,
    required: false,
  },
  stats: { type: UserStatsSchema, default: {} },
  onboardingCompleted: { type: Boolean, default: false },
  emailVerified: { type: Boolean, default: false },
  avatarUrl: { type: String },
  avatar: { type: AvatarSchema, required: false },
  favoriteComedians: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
  favoriteEvents: [{
    type: Schema.Types.ObjectId,
    ref: 'Event'
  }],
  emailSubscriptions: {
    type: EmailSubscriptionsSchema,
    default: () => ({ globalSubscribed: true })
  },
  keycloakId: {
    type: String,
    unique: true,
    sparse: true, // Allow null values while maintaining uniqueness
  },
  createdAt: { type: Schema.Types.Date, default: Date.now },
  lastLoginAt: { type: Schema.Types.Date, default: Date.now },
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await bcrypt.hash(this.password!, 10);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  const user = this as UserDocument;
  return bcrypt.compare(candidatePassword, user.password!);
};

// Middleware pour gérer les profils en fonction du userType avant la sauvegarde
userSchema.pre('save', function(next) {
  if (this.isModified('role') || this.isNew) {
    // Ne créer un profil par défaut que si aucun profil n'existe déjà
    if (this.role === 'COMEDIAN' && !this.profile) {
      this.profile = { 
        bio: '', 
        experience: 0, 
        speciality: '',
        numberOfScenes: '0-50',
        comedyStyle: [],
        performanceLanguages: [],
        socialLinks: {},
        performances: []
      };
    }
    if (this.role === 'ORGANIZER' && !this.organizerProfile) {
        this.organizerProfile = { companyName: '', location: { city: '', postalCode: '' }, venueTypes: [] };
    }
  }
  next();
});

export const UserModel = mongoose.model<UserDocument>('User', userSchema); 