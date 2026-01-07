import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ComedianReportDocument extends Document {
  comedian: Types.ObjectId; // Humoriste signalé
  reporter: Types.ObjectId; // Organisateur qui signale
  reason: 'troll' | 'fake_account' | 'inappropriate_content' | 'spam' | 'other'; // Raison du signalement
  description?: string; // Description détaillée (optionnel)
  status: 'pending' | 'reviewed' | 'resolved' | 'dismissed'; // Statut du signalement
  reviewedBy?: Types.ObjectId; // Super Admin qui a examiné
  reviewedAt?: Date; // Date d'examen
  resolution?: string; // Résolution/action prise
  createdAt: Date;
  updatedAt: Date;
}

const comedianReportSchema = new Schema<ComedianReportDocument>({
  comedian: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reporter: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  reason: {
    type: String,
    enum: ['troll', 'fake_account', 'inappropriate_content', 'spam', 'other'],
    required: true
  },
  description: {
    type: String,
    trim: true,
    maxlength: 1000
  },
  status: {
    type: String,
    enum: ['pending', 'reviewed', 'resolved', 'dismissed'],
    default: 'pending',
    index: true
  },
  reviewedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  reviewedAt: {
    type: Date
  },
  resolution: {
    type: String,
    trim: true,
    maxlength: 500
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances
comedianReportSchema.index({ comedian: 1, status: 1 });
comedianReportSchema.index({ reporter: 1 });
comedianReportSchema.index({ status: 1, createdAt: -1 });
// Index unique pour éviter les doublons (un organisateur ne peut signaler qu'une fois le même humoriste)
comedianReportSchema.index({ comedian: 1, reporter: 1 }, { unique: true });

export const ComedianReportModel = mongoose.model<ComedianReportDocument>('ComedianReport', comedianReportSchema);

