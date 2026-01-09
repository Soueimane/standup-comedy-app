import mongoose, { Schema, Document, Types } from 'mongoose';
import { Location, EventRequirements } from '../types';

export interface EventDocument extends Document {
  title: string;
  description: string;
  date: Date;
  location: Location;
  organizer: Types.ObjectId;
  status: 'draft' | 'published' | 'cancelled' | 'completed';
  requirements: EventRequirements;
  applications: Types.ObjectId[];
  participants: Types.ObjectId[];
  withdrawnComedians: Types.ObjectId[]; // Nouveaux: humoristes qui se sont désinscrits
  startTime?: string;
  endTime?: string;
  venue?: string;
  budget?: {
    min: number;
    max: number;
  };
  modifiedByOrganizer?: boolean;
  cancellationReason?: string;
  // Tracking des relances envoyées à l'organisateur
  organizerReminders?: {
    j10Sent?: boolean; // Relance 10 jours avant
    j7Sent?: boolean;  // Relance 7 jours avant
    j5Sent?: boolean;  // Relance 5 jours avant
    j3Sent?: boolean;  // Relance 3 jours avant
    j2Sent?: boolean;  // Relance 2 jours avant
    j1Sent?: boolean;  // Relance 1 jour avant
  };
  createdAt?: Date;
  updatedAt?: Date;
}

const locationSchema = new Schema<Location>({
  venue: { type: String, required: false },
  address: { type: String, required: true },
  city: { type: String, required: true },
  country: { type: String, required: true }
});

const requirementsSchema = new Schema<EventRequirements>({
  minExperience: { type: Number, required: true },
  maxPerformers: { type: Number, required: false },
  duration: { type: Number, required: true },
  requiredExperienceLevel: { 
    type: String, 
    enum: ['all', '0-50', '50-200', '200+'],
    required: false,
    default: 'all'
  }
});

const eventSchema = new Schema<EventDocument>({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  date: {
    type: Date,
    required: true
  },
  location: {
    type: locationSchema,
    required: true
  },
  organizer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'cancelled', 'completed'],
    default: 'draft'
  },
  requirements: {
    type: requirementsSchema,
    required: true
  },
  applications: [{
    type: Schema.Types.ObjectId,
    ref: 'Application'
  }],
  participants: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  withdrawnComedians: [{
    type: Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  startTime: {
    type: String,
    required: false
  },
  endTime: {
    type: String,
    required: false
  },
  venue: {
    type: String,
    required: false
  },
  budget: {
    min: { type: Number, required: false },
    max: { type: Number, required: false }
  },
  modifiedByOrganizer: {
    type: Boolean,
    default: false
  },
  cancellationReason: {
    type: String,
    required: false
  },
  // Schéma pour le tracking des relances organisateur
  organizerReminders: {
    j10Sent: { type: Boolean, default: false },
    j7Sent: { type: Boolean, default: false },
    j5Sent: { type: Boolean, default: false },
    j3Sent: { type: Boolean, default: false },
    j2Sent: { type: Boolean, default: false },
    j1Sent: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances des requêtes
eventSchema.index({ date: 1 });
eventSchema.index({ organizer: 1 });
eventSchema.index({ status: 1 });

export const EventModel = mongoose.model<EventDocument>('Event', eventSchema); 