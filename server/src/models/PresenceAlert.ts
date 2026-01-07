import mongoose, { Schema, Document, Types } from 'mongoose';

export interface PresenceAlertDocument extends Document {
  comedian: Types.ObjectId;
  presenceScore: number; // Score de présence en pourcentage (0-100)
  totalEvents: number; // Nombre total d'événements acceptés
  absences: number; // Nombre d'absences
  alertSentAt: Date; // Date d'envoi de l'alerte
  acknowledgedAt?: Date; // Date de prise en compte par le Super Admin
  acknowledgedBy?: Types.ObjectId; // Super Admin qui a pris en compte l'alerte
  isActive: boolean; // Si l'alerte est toujours active (score toujours < 50%)
}

const presenceAlertSchema = new Schema<PresenceAlertDocument>({
  comedian: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  presenceScore: {
    type: Number,
    required: true,
    min: 0,
    max: 100
  },
  totalEvents: {
    type: Number,
    required: true,
    default: 0
  },
  absences: {
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
presenceAlertSchema.index({ comedian: 1, isActive: 1 });
presenceAlertSchema.index({ isActive: 1, alertSentAt: -1 });

export const PresenceAlertModel = mongoose.model<PresenceAlertDocument>('PresenceAlert', presenceAlertSchema);

