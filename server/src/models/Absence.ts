import mongoose, { Schema, Document, Types } from 'mongoose';

export interface AbsenceDocument extends Document {
  event: Types.ObjectId;
  comedian: Types.ObjectId;
  organizer: Types.ObjectId;
  reason?: string;
  markedAt: Date;
}

const absenceSchema = new Schema<AbsenceDocument>({
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true
  },
  comedian: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  organizer: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  reason: {
    type: String,
    required: false,
    trim: true
  },
  markedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index pour éviter les doublons et améliorer les performances
absenceSchema.index({ event: 1, comedian: 1 }, { unique: true });
absenceSchema.index({ event: 1 });
absenceSchema.index({ comedian: 1 });

export const AbsenceModel = mongoose.model<AbsenceDocument>('Absence', absenceSchema); 