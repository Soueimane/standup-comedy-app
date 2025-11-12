export interface User {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  userType: 'humoriste' | 'organisateur' | 'admin';
  profile: HumoristeProfile | OrganisateurProfile;
  stats: UserStats;
  onboardingCompleted: boolean;
  emailVerified: boolean;
  avatarUrl?: string;
  createdAt: string;
  lastLoginAt: string;
  role?: string; // Rôle backend (SUPER_ADMIN, COMEDIAN, ORGANIZER)
}

export interface Location {
  city: string;
  postalCode: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface HumoristeProfile {
  stageName?: string;
  location: Location;
  bio?: string;
  mobilityZone: {
    radius: number; // en kilomètres
    preferredCities?: string[]; // villes préférées pour les performances
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

export interface OrganisateurProfile {
  companyName?: string;
  location: Location;
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

export interface UserStats {
  totalEvents: number;
  totalRevenue: number;
  averageRating: number;
  viralScore: number;
  profileViews: number;
  lastActivity: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  userType: 'humoriste' | 'organisateur' | 'admin';
  location: Location;
  stageName?: string;
  companyName?: string;
}
