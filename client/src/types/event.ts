import type { IUserData } from './user';

export interface IEvent {
  _id: string;
  title: string;
  description: string;
  date: string;
  time?: string;
  startTime?: string;
  endTime?: string;
  location: { venue?: string; address: string; city: string; country: string; };
  organizer: IUserData;
  status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED' | 'COMPLETED' | 'draft' | 'published' | 'cancelled' | 'completed';
  requirements: { 
    minExperience: number; 
    maxPerformers: number; 
    duration: number;
    requiredExperienceLevel?: 'all' | '0-50' | '50-200' | '200+';
  };
  applications: string[];
  participants: IUserData[];
  maxParticipants: number;
  cancellationReason?: string;
  /** Groupe de récurrence (événements créés ensemble) */
  recurrenceGroupId?: string;
} 