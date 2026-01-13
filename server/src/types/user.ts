import { Types } from 'mongoose';

export interface ILocation {
  city: string;
  postalCode: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface Performance {
  eventId: Types.ObjectId;
  date: Date;
  duration: number;
  videoLink?: string;
  feedback?: string;
}

export interface MobilityZone {
  type: 'ville' | 'departement' | 'region';
  value: string; // Nom de la ville, département ou région
}

export interface UserProfile {
  bio?: string;
  experience?: number;
  speciality?: string;
  numberOfScenes?: '0-50' | '50-200' | '200+';
  comedyStyle?: ('stand-up' | 'improvisation' | 'plateau' | 'sketch')[];
  performanceLanguages?: ('francais' | 'arabe' | 'anglais' | 'italien' | 'espagnol')[];
  mobilityZone?: MobilityZone[]; // Zone de mobilité : villes, départements ou régions
  socialLinks?: {
    youtube?: string;
    instagram?: string;
    facebook?: string;
    twitter?: string;
  };
  performances?: Performance[];
}

export interface IOrganisateurProfile {
  companyName?: string;
  location?: ILocation;
  description?: string;
  website?: string;
  venueTypes?: string[];
  averageBudget?: {
    min?: number;
    max?: number;
  };
  eventFrequency?: 'weekly' | 'monthly' | 'occasional';
  phone?: string;
}

export interface User {
  email: string;
  password?: string;
  firstName: string;
  lastName: string;
  city?: string;
  role: 'COMEDIAN' | 'ORGANIZER' | 'SUPER_ADMIN';
  profile?: UserProfile;
  organizerProfile?: IOrganisateurProfile;
  stats?: any;
  onboardingCompleted?: boolean;
  emailVerified?: boolean;
  avatarUrl?: string | null;
  avatar?: {
    data?: Buffer;
    contentType?: string;
    uploadedAt?: Date;
  };
  favoriteComedians?: Types.ObjectId[];
  favoriteEvents?: Types.ObjectId[];
  createdAt?: Date;
  updatedAt?: Date;
  lastLoginAt?: Date;
  phone?: string;
  address?: string;
  gender?: 'femme' | 'homme';
  emailSubscriptions?: {
    globalSubscribed: boolean;
    unsubscribedAt?: Date;
    unsubscribeToken?: string;
  };
  keycloakId?: string;
  // Champs de gestion de desactivation de compte
  isActive?: boolean;
  deactivatedAt?: Date;
  deactivatedBy?: Types.ObjectId;
  deactivationReason?: string;
}

// Interface for a user document after being populated
export interface IPopulatedUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  role: 'COMEDIAN' | 'ORGANIZER' | 'SUPER_ADMIN';
  // Add other fields that might be populated and needed, e.g., companyName, city
  companyName?: string;
  city?: string;
  organizerProfile?: IOrganisateurProfile;
  profile?: UserProfile;
} 