import mongoose, { Schema, Document, Types } from 'mongoose';

export interface LateCancellationAlertDocument extends Document {
  comedian: Types.ObjectId;
  event: Types.ObjectId;
  application: Types.ObjectId;
  cancellationDate: Date;
  eventDate: Date;
  hoursBeforeEvent: number;
  totalLateCancellations: number;
  alertSentAt: Date;
  acknowledgedAt?: Date;
  acknowledgedBy?: Types.ObjectId;
  isActive: boolean;
}

const lateCancellationAlertSchema = new Schema<LateCancellationAlertDocument>({
  comedian: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  event: {
    type: Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true
  },
  application: {
    type: Schema.Types.ObjectId,
    ref: 'Application',
    required: true
  },
  cancellationDate: {
    type: Date,
    default: Date.now,
    required: true
  },
  eventDate: {
    type: Date,
    required: true
  },
  hoursBeforeEvent: {
    type: Number,
    required: true
  },
  totalLateCancellations: {
    type: Number,
    required: true,
    default: 0
  },
  alertSentAt: {
    type: Date,
    default: Date.now,
    required: true
  },
  acknowledgedAt: {
    type: Date
  },
  acknowledgedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  isActive: {
    type: Boolean,
    default: true,
    index: true
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
lateCancellationAlertSchema.index({ comedian: 1, isActive: 1 });
lateCancellationAlertSchema.index({ isActive: 1, alertSentAt: -1 });
lateCancellationAlertSchema.index({ event: 1 });

export const LateCancellationAlertModel = mongoose.model<LateCancellationAlertDocument>('LateCancellationAlert', lateCancellationAlertSchema);
