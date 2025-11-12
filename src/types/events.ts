import { Location } from './auth';

export interface EventRequirements {
  minExperience: number;
  maxPerformers: number;
  duration: number;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  location: Location;
  date: string;
  startTime: string;
  endTime: string;
  venue: string;
  budget: {
    min: number;
    max: number;
  };
  organizerId: string;
  organizerName: string;
  organizerEmail?: string;
  createdAt: string;
  updatedAt?: string;
  applications: Application[];
  participants: any[];
  withdrawnComedians?: string[]; // Humoristes qui se sont désinscrits
  status: 'draft' | 'published' | 'cancelled' | 'full' | 'completed';
  requirements: EventRequirements;
  eventType?: 'open-mic' | 'show' | 'private' | 'festival';
}

export interface Application {
  id: string;
  eventId: string;
  humoristId: string;
  humoristName?: string;
  stageName?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'viewed';
  appliedAt: string;
  updatedAt?: string;
  message?: string;
  organizerMessage?: string; // Message de l'organisateur lors de l'acceptation/refus
} 