import { Types } from 'mongoose';
import { IPopulatedUser } from './user';

export interface Location {
  venue?: string;
  address: string;
  city: string;
  country: string;
}

export interface EventRequirements {
  minExperience: number;
  maxPerformers?: number;
  duration: number;
}

export interface IPopulatedEvent extends Event {
  organizer: IPopulatedUser;
}

export interface Event {
  title: string;
  description: string;
  date: Date;
  location: Location;
  organizer: Types.ObjectId | IPopulatedUser;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  requirements: EventRequirements;
  applications: Types.ObjectId[];
  participants: Types.ObjectId[] | IPopulatedUser[];
}

export interface PerformanceDetails {
  duration: number;
  description: string;
  videoLink?: string;
}

export interface IPopulatedApplication extends Application {
  event: IPopulatedEvent;
  comedian: IPopulatedUser;
}

export interface Application {
  event: Types.ObjectId | IPopulatedEvent;
  comedian: Types.ObjectId | IPopulatedUser;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  performanceDetails: PerformanceDetails;
} 